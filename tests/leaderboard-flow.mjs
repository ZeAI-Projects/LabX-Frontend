import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { AUTH_STORAGE_KEYS, DEMO_CREDENTIALS } from '../src/features/authentication/services/mock_auth.js'
import { getLeaderboardSnapshot, LEADERBOARD_DOMAINS } from '../src/features/leaderboard/services/mock_leaderboard.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = fileURLToPath(new URL('../test-results/leaderboard/', import.meta.url))
const origin = 'http://127.0.0.1:5189'
const demoUser = {
  id: 'demo-founder',
  full_name: 'Founder',
  username: 'founder',
  email: 'founder@labx.demo',
  role: 'founder',
  total_points: 0,
}
const executablePath = process.env.LABX_BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
await mkdir(output, { recursive: true })
const server = await preview({ root, envDir: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 5189, strictPort: true } })
let browser
let page

try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    timezoneId: 'Asia/Kolkata',
  })
  const runtimeErrors = []
  const httpErrors = []
  const externalRequests = []
  const backendRequests = []
  await context.route('**/*', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) {
      externalRequests.push(request.url())
      return route.abort()
    }
    if (['fetch', 'xhr'].includes(request.resourceType()) || /\/api(?:\/|$)/.test(url.pathname)) backendRequests.push(request.url())
    return route.continue()
  })
  context.on('page', (openedPage) => {
    openedPage.on('pageerror', (error) => runtimeErrors.push(error.message))
    openedPage.on('response', (response) => {
      if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`)
    })
  })
  page = await context.newPage()
  page.setDefaultTimeout(10000)

  const go = (path) => page.goto(`${origin}${path}`)
  const at = (path) => page.waitForURL(`${origin}${path}`)
  const heading = () => page.getByRole('heading', { name: 'LabX Leaderboard', exact: true, level: 1 })
  const rankings = () => page.getByRole('table', { name: 'Founder rankings', exact: true })
  const row = (name) => rankings().getByRole('row', { name, exact: true })
  const search = () => page.getByLabel('Search founders by name', { exact: true })
  const standing = () => page.getByRole('region', { name: 'Your standing', exact: true })
  const submit = () => page.locator('button[type="submit"]').click()
  const snapshot = (user = demoUser, options = {}) => getLeaderboardSnapshot({ user, projects: [], scope: 'global', ...options })
  const numberFrom = (text) => Number(text.replace(/[^\d]/g, ''))
  const assertMetrics = async (expected) => {
    const metrics = page.getByRole('region', { name: `${expected.scope === 'global' ? 'Global' : 'Domain'} leaderboard metrics`, exact: true })
    await metrics.waitFor()
    for (const [label, key] of [['founders', 'totalFounders'], ['points', 'totalPoints'], ['badges', 'totalBadges'], ['leading', 'leadingPoints']]) {
      assert.equal(numberFrom(await metrics.locator(`[data-metric="${label}"]`).innerText()), expected.metrics[key], `${expected.scope}: ${key}`)
    }
  }

  const assertRows = async (expected, description) => {
    assert.ok(expected.length > 0, `${description} has expected rows`)
    await row(expected[0].full_name).waitFor()
    const rendered = await rankings().locator('tbody > tr').evaluateAll((rows) => rows.map((entry) => {
      const labelledBy = (entry.getAttribute('aria-labelledby') || '').split(/\s+/)
      return {
        name: labelledBy.map((id) => document.getElementById(id)?.textContent.trim() || '').join(' ').trim(),
        rank: entry.querySelector('td')?.textContent.trim(),
        points: entry.querySelector('[data-label="LabX Points"]')?.textContent.trim(),
      }
    }))
    assert.equal(rendered.length, expected.length, `${description}: row count`)
    assert.deepEqual(rendered.map((entry) => entry.name), expected.map((entry) => entry.full_name), `${description}: founder order`)
    for (let index = 0; index < expected.length; index += 1) {
      assert.equal(rendered[index].rank, `#${expected[index].rank}`, `${description}: ${expected[index].full_name} retains scope rank`)
      assert.equal(numberFrom(rendered[index].points), expected[index].total_points, `${description}: ${expected[index].full_name} points`)
      const founderRow = row(expected[index].full_name)
      const domainLabel = LEADERBOARD_DOMAINS.find((domain) => domain.name === expected[index].domain)?.shortName || expected[index].domain
      assert.equal((await founderRow.locator('[data-label="Domain"]').innerText()).trim(), domainLabel, `${description}: founder domain`)
      assert.equal(numberFrom(await founderRow.locator('[data-label="Badges"]').innerText()), expected[index].badges_count, `${description}: founder badge count`)
      assert.equal((await founderRow.locator('[data-label="Global Rank"]').innerText()).trim(), `#${expected[index].global_rank}`, `${description}: global rank stays comparable`)
      assert.equal((await founderRow.locator('[data-label="Domain Rank"]').innerText()).trim(), expected[index].domain_rank === null ? 'Not ranked' : `#${expected[index].domain_rank}`, `${description}: domain rank uses the displayed domain`)
      await founderRow.getByRole('button', { name: `View founder: ${expected[index].full_name}`, exact: true }).waitFor()
    }
  }

  const openDetails = async (trigger, founder, { screenshot = false } = {}) => {
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: founder.full_name, exact: true })
    await dialog.waitFor()
    await dialog.getByRole('button', { name: 'Close founder details', exact: true }).waitFor()
    const rankPair = dialog.locator('.lb-rank-pair')
    assert.match(await rankPair.innerText(), new RegExp(`Global Rank\\s+#${founder.global_rank}\\b`))
    assert.match(await rankPair.innerText(), new RegExp(`Domain Rank\\s+${founder.domain_rank === null ? 'Not ranked' : '#' + founder.domain_rank}\\b`))
    assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true, 'Opening founder details moves focus into the dialog')
    for (let index = 0; index < 4; index += 1) {
      await page.keyboard.press('Tab')
      assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true, 'Tab stays inside founder details')
    }
    if (screenshot) {
      await page.setViewportSize({ width: 320, height: 844 })
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Founder details fits 320px')
      await page.screenshot({ path: `${output}founder-details-320.png`, fullPage: true, animations: 'disabled' })
      await page.setViewportSize({ width: 1440, height: 1000 })
    }
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(await trigger.evaluate((element) => element === document.activeElement), true, 'Escape restores focus to the founder trigger')
  }

  const checkLayout = async (name) => {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
      await page.evaluate(() => document.fonts.ready)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name} has no page overflow at ${width}px`)
      const tableRegion = page.getByRole('region', { name: 'Founder rankings table', exact: true })
      const tableLayout = await tableRegion.evaluate((element) => ({
        overflowX: getComputedStyle(element).overflowX,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        right: element.getBoundingClientRect().right,
      }))
      assert.ok(['auto', 'scroll'].includes(tableLayout.overflowX), `${name} table owns horizontal scrolling`)
      assert.ok(tableLayout.right <= width + 1, `${name} table scroll container fits ${width}px`)
      if (width < 600) assert.ok(tableLayout.scrollWidth > tableLayout.clientWidth, `${name} wide rows scroll inside the table at ${width}px`)
      await page.screenshot({ path: `${output}${name}-${width}.png`, fullPage: true, animations: 'disabled' })
    }
  }

  const signOut = async () => {
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await at('/login')
  }

  const registerAndVerify = async ({ name, email, role }) => {
    await go(`/register?role=${role}`)
    await page.getByLabel('Full Name', { exact: true }).fill(name)
    await page.getByLabel('Email Address', { exact: true }).fill(email)
    assert.equal(await page.getByLabel('Role', { exact: true }).inputValue(), role)
    await page.getByLabel('Password', { exact: true }).fill('LeaderboardPass1!')
    await page.getByLabel('Confirm Password', { exact: true }).fill('LeaderboardPass1!')
    await submit()
    await at('/verify-email')
    const code = (await page.getByTestId('demo-signup-code').innerText()).trim()
    assert.match(code, /^\d{6}$/)
    await page.getByLabel('Digit 1 of 6', { exact: true }).fill(code)
    await page.getByRole('button', { name: 'Verify email', exact: true }).click()
    await at(role === 'founder' ? '/roadmap/new' : `/onboarding/${role}`)
    return page.evaluate(({ key, emailAddress }) => JSON.parse(localStorage.getItem(key) || '[]').find((account) => account.user.email === emailAddress)?.user, {
      key: AUTH_STORAGE_KEYS.profiles,
      emailAddress: email,
    })
  }

  // Founders are authenticated before they can see the shared ranking source.
  await go('/leaderboard')
  await at('/login')
  await page.getByLabel('Email Address', { exact: true }).fill(DEMO_CREDENTIALS.email)
  await page.getByLabel('Password', { exact: true }).fill(DEMO_CREDENTIALS.password)
  await submit()
  await at('/dashboard')
  await go('/leaderboard')
  await heading().waitFor()
  const global = snapshot()
  assert.equal(global.leader.full_name, 'Amara Okafor')
  assert.deepEqual(global.podium.map((founder) => founder.rank), [1, 2, 3], 'The highest three founders fill the podium')
  const tiedFounders = global.allRankings.filter(founder => founder.total_points === 450)
  assert.equal(tiedFounders.length, 2)
  assert.equal(tiedFounders[0].rank, tiedFounders[1].rank, 'Equal points share competition ranks')
  assert.equal(global.totalFounders, 25, 'Global board includes 24 sample founders and the current founder once')
  assert.equal(global.userStanding.total_points, 450)
  await assertMetrics(global)
  assert.match(await standing().innerText(), /Global Rank\s+#\d+/)
  assert.match(await standing().innerText(), /Domain Rank\s+Not ranked/)
  assert.doesNotMatch(await page.locator('.lb-page').innerText(), /All[- ]Time Rank/i)
  await assertRows(global.rankings.slice(3), 'Global page 1')
  assert.equal(await page.getByRole('navigation', { name: 'Leaderboard pages' }).count(), 0)
  for (const founder of global.podium) {
    const podium = page.getByRole('button', { name: `Rank ${founder.rank}: ${founder.full_name}. View founder details`, exact: true })
    await podium.waitFor()
    assert.equal(await podium.evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length), 0, 'Reduced motion disables podium animation')
  }
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true)
  await page.getByRole('button', { name: '450 LabX Coins', exact: true }).waitFor()
  assert.match(await standing().innerText(), /\b450\b/, 'Leaderboard points agree with the Navbar')
  await checkLayout('global')

  await openDetails(page.getByRole('button', { name: 'View top founder', exact: true }), global.leader, { screenshot: true })
  const tableTrigger = row(global.rankings[3].full_name).getByRole('button', { name: `View founder: ${global.rankings[3].full_name}`, exact: true })
  await openDetails(tableTrigger, global.rankings[3])
  await tableTrigger.click()
  const leaderDialog = page.getByRole('dialog', { name: global.rankings[3].full_name, exact: true })
  await leaderDialog.getByRole('button', { name: 'Close founder details', exact: true }).click()
  await leaderDialog.waitFor({ state: 'hidden' })
  assert.equal(await tableTrigger.evaluate((element) => element === document.activeElement), true, 'Close button restores trigger focus')

  // The full list follows the podium without duplicating the top three.
  await assertRows(global.rankings.slice(3), 'All remaining founders')
  await page.getByRole('button', { name: 'Find my rank', exact: true }).click()
  await row('Founder').waitFor()
  assert.match(await row('Founder').locator('[data-label="Domain"]').innerText(), /Domain not set/i)
  await assertRows(global.rankings.slice(3), 'Find my rank keeps all rows available')

  // Search applies only on submission and does not recalculate a matching founder's rank.
  const target = global.rankings.find((entry) => entry.rank > 3 && entry.rank < 10)
  const beforeSearch = await rankings().locator('tbody > tr').count()
  await search().fill(target.full_name)
  assert.equal(await rankings().locator('tbody > tr').count(), beforeSearch, 'Typing a search does not replace submitted results')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await assertRows(snapshot(demoUser, { search: target.full_name }).rankings, 'Submitted global search')
  await assertMetrics(global)
  assert.equal(await page.getByRole('button', { name: /^Rank \d+: .*\. View founder details$/ }).count(), 0, 'Search hides the podium')
  await search().fill('NoSuchFounder-987654321')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('heading', { name: 'No founders found', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  assert.equal(await search().inputValue(), '')
  await assertRows(global.rankings.slice(3), 'Clearing search resets page and results')

  // A domain selection is explicit; each arena gets its own leaders and ranks.
  await page.getByRole('button', { name: 'Domain', exact: true }).click()
  await page.getByRole('heading', { name: 'Choose your arena', exact: true }).waitFor()
  assert.equal(await rankings().count(), 0)
  const domainSelect = page.getByLabel('Domain', { exact: true })
  assert.equal(await domainSelect.inputValue(), '')
  assert.equal(await domainSelect.locator('option').count(), LEADERBOARD_DOMAINS.length + 1)
  assert.doesNotMatch(await domainSelect.innerText(), /Other|Not sure/i)
  for (const domain of LEADERBOARD_DOMAINS) {
    await domainSelect.selectOption(String(domain.id))
    const scoped = snapshot(demoUser, { scope: 'domain', domainId: String(domain.id) })
    await assertMetrics(scoped)
    if (Number(domain.id) > 12) {
      assert.equal(scoped.totalFounders, 0, 'New domains do not fabricate sample founders')
      await page.getByRole('heading', { name: 'No founders found', exact: true }).waitFor()
      continue
    }
    assert.equal(scoped.totalFounders, 2, `Domain ${domain.id} has its two sample founders`)
    assert.equal(await rankings().locator('tbody > tr').count(), 0, 'Two founders are already on the podium')
    await openDetails(page.getByRole('button', { name: 'View top founder', exact: true }), scoped.leader)
  }
  const lastDomain = LEADERBOARD_DOMAINS[11]
  await go(`/leaderboard?scope=domain&domain=${lastDomain.id}`)
  await heading().waitFor()
  assert.equal(await domainSelect.inputValue(), lastDomain.id, 'Dashboard domain links select the matching board')
  const scoped = snapshot(demoUser, { scope: 'domain', domainId: String(lastDomain.id) })
  assert.equal(await page.locator('.lb-podium-card').count(), 2)
  const scopedTarget = scoped.rankings.at(-1)
  await search().fill(scopedTarget.full_name)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await assertRows(snapshot(demoUser, { scope: 'domain', domainId: String(lastDomain.id), search: scopedTarget.full_name }).rankings, 'Domain search preserves domain rank')
  await assertMetrics(scoped)
  await checkLayout('domain-search')
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await domainSelect.selectOption('')
  await page.getByRole('heading', { name: 'Choose your arena', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Global', exact: true }).click()
  await assertRows(global.rankings.slice(3), 'Returning to global restores all founders')
  await page.reload()
  await heading().waitFor()
  await page.getByRole('button', { name: '450 LabX Coins', exact: true }).waitFor()
  await signOut()

  // Fresh verified founders start at zero and do not inherit a sample domain or demo points.
  const newFounder = await registerAndVerify({ name: 'New Leaderboard Founder', email: 'leaderboard-founder@example.com', role: 'founder' })
  assert.ok(newFounder?.id)
  await go('/leaderboard')
  await heading().waitFor()
  const fresh = snapshot(newFounder)
  assert.equal(fresh.userStanding.total_points, 0)
  assert.equal(fresh.totalFounders, 25)
  assert.equal(fresh.rankings.filter((founder) => founder.id === newFounder.id).length, 1)
  await page.getByRole('button', { name: '0 LabX Coins', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Find my rank', exact: true }).click()
  await row(newFounder.full_name).waitFor()
  assert.match(await row(newFounder.full_name).locator('[data-label="Domain"]').innerText(), /Domain not set/i)
  assert.equal(numberFrom(await row(newFounder.full_name).locator('[data-label="LabX Points"]').innerText()), 0)
  assert.equal(await row(newFounder.full_name).locator('td').first().innerText(), `#${fresh.userStanding.rank}`)
  await page.getByRole('button', { name: 'Domain', exact: true }).click()
  await page.getByRole('heading', { name: 'Choose your arena', exact: true }).waitFor()
  await page.getByLabel('Domain', { exact: true }).selectOption(String(LEADERBOARD_DOMAINS[0].id))
  assert.equal(await page.locator('.lb-podium-card').count(), 2, 'New founder can browse an arena without joining it')
  assert.equal(await row(newFounder.full_name).count(), 0)
  await signOut()

  // Existing role guards continue to hide and block the founder-only leaderboard.
  for (const role of ['mentor', 'investor']) {
    await registerAndVerify({ name: `Leaderboard ${role}`, email: `leaderboard-${role}@example.com`, role })
    await go('/dashboard')
    await page.getByRole('heading', { name: 'Dashboard', exact: true, level: 1 }).waitFor()
    assert.equal(await page.locator('.labx-sidebar-nav').getByRole('link', { name: 'Leaderboard', exact: true }).count(), 0)
    await go('/leaderboard')
    await at('/dashboard')
    assert.equal(await heading().count(), 0)
    await signOut()
  }

  assert.deepEqual(runtimeErrors, [], 'No browser runtime errors')
  assert.deepEqual(httpErrors, [], 'All local assets are available')
  assert.deepEqual(externalRequests, [], 'No remote requests')
  assert.deepEqual(backendRequests, [], 'No backend requests')
  console.log('PASS: global and all supported domain rankings, shared ties, scoped search, empty/reset states, founder details and focus, continuous rankings/find rank, zero-point founder, role guards, responsive tables, reduced motion and local-only assets.')
} catch (error) {
  await page?.screenshot({ path: `${output}failure.png`, fullPage: true, animations: 'disabled' }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()))
}
