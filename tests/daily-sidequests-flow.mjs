import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { DEMO_CREDENTIALS } from '../src/features/authentication/services/mock_auth.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = fileURLToPath(new URL('../test-results/daily-sidequests/', import.meta.url))
const origin = 'http://127.0.0.1:5205'
const executablePath = process.env.LABX_BROWSER_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
await mkdir(output, { recursive: true })
const server = await createServer({ root, envDir: false, logLevel: 'error', server: { host: '127.0.0.1', port: 5205, strictPort: true } })
await server.listen()
let browser
let page

try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', timezoneId: 'Asia/Kolkata' })
  const runtimeErrors = []
  const networkErrors = []
  const unexpectedRequests = []
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) { unexpectedRequests.push(url.href); return route.abort() }
    if (/\/api(?:\/|$)/.test(url.pathname)) unexpectedRequests.push(url.href)
    return route.continue()
  })
  page = await context.newPage()
  page.setDefaultTimeout(10_000)
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('response', (response) => { if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`) })
  await page.clock.setFixedTime(new Date('2026-10-23T18:29:00Z'))
  const button = (name) => page.getByRole('button', { name, exact: true })
  const popup = () => page.getByRole('dialog', { name: 'Daily Quests', exact: true })
  const response = () => popup().getByRole('textbox', { name: 'Your quest response', exact: true })
  const questStat = () => page.locator('.db-statistics [data-dashboard-stat="Daily Quests"]')
  const assertQuestStat = async completed => {
    assert.equal(await button('Open daily quests').count(), 1, 'Dashboard has one Daily Quests entry point')
    assert.equal(await page.locator('.db-statistics').getByRole('button', { name: 'Open daily quests', exact: true }).count(), 1, 'The statistics card opens Daily Quests')
    assert.equal(await page.locator('[data-dashboard-stat="LabX Points"]').count(), 0, 'Daily Quests replaces the LabX Points statistic')
    assert.equal(await page.locator('.db-dashboard-columns .sq-card').count(), 0, 'There is no duplicate lower Daily Quests card')
    assert.equal(await questStat().innerText(), `${completed} / 3`, 'The statistics card reflects saved daily completion')
  }
  const open = async () => { await page.locator('.db-statistics').getByRole('button', { name: 'Open daily quests', exact: true }).click(); await popup().waitFor() }
  const close = async () => {
    await page.keyboard.press('Escape')
    await popup().waitFor({ state: 'hidden' })
    assert.equal(await button('Open daily quests').evaluate((element) => element === document.activeElement), true, 'Escape restores keyboard focus to the popup opener')
  }
  const signIn = async (email = DEMO_CREDENTIALS.email, password = DEMO_CREDENTIALS.password) => {
    await page.goto(`${origin}/login`)
    await page.getByLabel('Email Address', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${origin}/dashboard`)
    await page.getByRole('heading', { name: 'Dashboard', exact: true, level: 1 }).waitFor()
  }
  const coinAmount = () => page.locator('.floating-xp').getAttribute('aria-label').then((label) => Number(label.replace(/[^0-9]/g, '')))
  const expectCoins = async (value) => {
    const label = `${value.toLocaleString()} LabX Coins`
    await button(label).waitFor()
    assert.equal(await coinAmount(), value)
    await button(label).focus()
    assert.equal(await page.locator('.floating-xp__amount strong').innerText(), value.toLocaleString(), 'Visible coins and accessible coin label stay in sync under reduced motion')
  }
  const unrelatedStorage = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((key) => !key.startsWith('labx.side-quests.')).sort().map((key) => {
    const value = localStorage.getItem(key)
    try { return [key, JSON.parse(value)] } catch { return [key, value] }
  })))
  const pointsBalance = () => page.evaluate(async () => {
    const { getMockPointsBalance } = await import('/src/features/achievements/services/mock_achievements.js')
    return getMockPointsBalance({ id: 'demo-founder', role: 'founder' })
  })

  await signIn()
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true)
  const baseCoins = await coinAmount()
  const pointsBefore = await pointsBalance()
  const unrelatedBefore = await unrelatedStorage()
  await assertQuestStat(0)
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
    await page.evaluate(() => document.fonts.ready)
    const card = page.locator('.db-statistics .db-daily-quest')
    await card.scrollIntoViewIfNeeded()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Daily Quests statistic fits ${width}px`)
    assert.equal(await card.evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, 'Quest statistic content stays inside its card')
    await card.click({ trial: true })
    await page.screenshot({ path: `${output}daily-quest-stat-${width}.png`, animations: 'disabled' })
  }
  await open()
  assert.equal(await popup().locator('a[href]').count(), 0, 'Side quests stay in their popup with no redirects')
  await popup().getByText('0 / 3 completed today', { exact: true }).waitFor()
  await popup().getByText('Sample quests and rewards · saved in this browser.', { exact: true }).waitFor()
  assert.equal(await popup().getByRole('button', { pressed: true }).count(), 1)

  // Modal focus loops in both directions.
  await button('Close daily quests').focus()
  await page.keyboard.press('Shift+Tab')
  assert.equal(await button('Complete & earn 5 coins').evaluate((element) => element === document.activeElement), true)
  await page.keyboard.press('Tab')
  assert.equal(await button('Close daily quests').evaluate((element) => element === document.activeElement), true)
  await button('Complete & earn 5 coins').click()
  await popup().getByRole('alert').filter({ hasText: 'Add your response' }).waitFor()
  assert.equal(await response().getAttribute('aria-invalid'), 'true')
  assert.equal(await response().evaluate((element) => element === document.activeElement), true)
  const firstWork = 'I learned to ask about real experiences. I will use this in my next customer conversation.'
  await response().fill(firstWork)
  await button('Complete & earn 5 coins').click()
  await popup().getByText('Completed · reward claimed', { exact: true }).waitFor()
  await popup().getByRole('status').filter({ hasText: '5 sample LabX coins added' }).waitFor()
  await close()
  await expectCoins(baseCoins + 5)
  await assertQuestStat(1)
  assert.equal(await pointsBalance(), pointsBefore, 'Coin rewards do not change LabX Points')
  assert.deepEqual(await unrelatedStorage(), unrelatedBefore, 'Side quests do not alter roadmap, achievement, profile, or other app storage')

  await open()
  await popup().getByRole('button', { name: /Capture one useful insight/ }).click()
  assert.equal(await popup().getByRole('button', { name: /Complete & earn/ }).count(), 0, 'Completed quest cannot be claimed again from its UI')
  assert.equal(await popup().locator('.sq-saved-work').innerText(), firstWork)
  const duplicate = await page.evaluate(async () => {
    const { dailySideQuestStore } = await import('/src/features/dashboard/services/daily_side_quests.js')
    const user = { id: 'demo-founder' }
    return dailySideQuestStore.complete(user, 'learning-note', 'A duplicate attempt', dailySideQuestStore.read(user).day)
  })
  assert.equal(duplicate.claimed, false)
  assert.equal(duplicate.earnedCoins, 5)
  await close()
  await page.reload()
  await button('Open daily quests').waitFor()
  await expectCoins(baseCoins + 5)
  await assertQuestStat(1)

  // A browser storage failure leaves both the response and balance intact.
  await open()
  await popup().getByRole('button', { name: /Ask a better customer question/ }).click()
  const secondWork = 'Tell me about the last time you tried to solve this problem. I want to learn where the current process breaks.'
  await response().fill(secondWork)
  await page.evaluate(() => {
    window.__sideQuestSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('labx.side-quests.')) throw new DOMException('Simulated storage full', 'QuotaExceededError')
      return window.__sideQuestSetItem.call(this, key, value)
    }
  })
  await button('Complete & earn 5 coins').click()
  await popup().getByRole('alert').filter({ hasText: 'Unable to save' }).waitFor()
  assert.equal(await response().inputValue(), secondWork)
  assert.equal(await coinAmount(), baseCoins + 5)
  await page.evaluate(() => { Storage.prototype.setItem = window.__sideQuestSetItem; delete window.__sideQuestSetItem })
  await button('Complete & earn 5 coins').click()
  await popup().getByText('Completed · reward claimed', { exact: true }).waitFor()
  await close()
  await expectCoins(baseCoins + 10)
  await assertQuestStat(2)
  assert.deepEqual(await unrelatedStorage(), unrelatedBefore)

  // Midnight in India refreshes the three missions without taking earned coins away.
  await page.clock.setFixedTime(new Date('2026-10-23T18:30:00Z'))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await open()
  await popup().getByText('0 / 3 completed today', { exact: true }).waitFor()
  await popup().getByText('0 coins earned today', { exact: true }).waitFor()
  assert.equal(await response().inputValue(), '', 'The next day begins with a fresh quest response')
  await close()
  await expectCoins(baseCoins + 10)
  await assertQuestStat(0)
  await page.reload()
  await button('Open daily quests').waitFor()
  await expectCoins(baseCoins + 10)
  await assertQuestStat(0)

  // All missions and input fit narrow phones, including long response content.
  await open()
  await response().fill('A useful insight '.repeat(80))
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
    await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Page fits ${width}px`)
    assert.equal(await popup().evaluate((element) => element.scrollWidth <= element.clientWidth + 1 && element.getBoundingClientRect().left >= 0 && element.getBoundingClientRect().right <= innerWidth + 1), true, `Daily Quests popup fits ${width}px`)
    const geometry = await popup().evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const backdrop = getComputedStyle(element, '::backdrop')
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight, position: getComputedStyle(element).position, backdropPosition: backdrop.position, backdropInset: backdrop.inset }
    })
    console.log(`Daily Quests geometry at ${width}px: ${JSON.stringify(geometry)}`)
    await page.screenshot({ path: `${output}daily-quests-${width}.png`, fullPage: false, animations: 'disabled' })
    assert.ok(Math.abs(geometry.x + geometry.width / 2 - geometry.viewportWidth / 2) <= 1, `Daily Quests popup is horizontally centered at ${width}px`)
    assert.ok(Math.abs(geometry.y + geometry.height / 2 - geometry.viewportHeight / 2) <= 1, `Daily Quests popup is vertically centered at ${width}px`)
    assert.equal(geometry.backdropPosition, 'fixed')
    assert.equal(geometry.backdropInset, '0px', 'Backdrop spans the viewport')
    await close()
    await open()
  }
  await close()

  // Signing into a different account reveals no responses or reward balance.
  await button('Sign out').click()
  await page.waitForURL(`${origin}/login`)
  await page.goto(`${origin}/register?role=founder`)
  await page.getByLabel('Full Name', { exact: true }).fill('Side Quest Member')
  await page.getByLabel('Email Address', { exact: true }).fill('sidequest-member@example.com')
  await page.getByLabel('Password', { exact: true }).fill('SideQuestPass1!')
  await page.getByLabel('Confirm Password', { exact: true }).fill('SideQuestPass1!')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(`${origin}/verify-email`)
  const code = (await page.getByTestId('demo-signup-code').innerText()).trim()
  await page.getByLabel('Digit 1 of 6', { exact: true }).fill(code)
  await button('Verify email').click()
  await page.waitForURL(`${origin}/roadmap/new`)
  await page.goto(`${origin}/dashboard`)
  await button('Open daily quests').waitFor()
  await expectCoins(0)
  await assertQuestStat(0)
  await open()
  await popup().getByText('0 / 3 completed today', { exact: true }).waitFor()
  assert.equal(await response().inputValue(), '')
  assert.equal(await popup().locator('.sq-saved-work').count(), 0)
  await response().fill('I will schedule a conversation to understand one real customer problem.')
  await button('Complete & earn 5 coins').click()
  await popup().getByText('Completed · reward claimed', { exact: true }).waitFor()
  await close()
  await expectCoins(5)
  await assertQuestStat(1)
  await button('Sign out').click()
  await page.waitForURL(`${origin}/login`)
  await signIn()
  await expectCoins(baseCoins + 10)
  await assertQuestStat(0)
  await open()
  await popup().getByText('0 / 3 completed today', { exact: true }).waitFor()
  await close()

  assert.deepEqual(runtimeErrors, [])
  assert.deepEqual(networkErrors, [])
  assert.deepEqual(unexpectedRequests, [])
  console.log('Daily side quests browser checks passed: popup, keyboard focus, rewards, duplicate protection, reload, storage failure/retry, midnight IST reset, account isolation, unchanged points/roadmap/achievements, and 320/390/1440px layouts.')
} catch (error) {
  if (page) await page.screenshot({ path: `${output}failure.png`, fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await server.close()
}
