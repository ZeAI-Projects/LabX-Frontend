import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { AUTH_STORAGE_KEYS } from '../src/features/authentication/services/mock_auth.js'
import { platformAchievementKey } from '../src/features/achievements/services/mock_achievements.js'
import { profileKey } from '../src/features/profile/services/profile_store.js'

const origin = new URL(process.env.LABX_PREVIEW_URL || 'http://127.0.0.1:5173').origin
const output = fileURLToPath(new URL('../test-results/achievements-refresh/', import.meta.url))
const executablePath = process.env.LABX_BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
const fixtureUser = {
  id: 'achievements-refresh-founder',
  email: 'achievements-refresh@example.com',
  full_name: 'Achievement Preview',
  username: 'achievementpreview',
  role: 'founder',
  avatar_url: '',
  total_points: 0,
  assessment_completed: false,
  assessment_skipped: false,
  assessment_result: null,
  assessment_answers: null,
  onboarding_completed: false,
  onboarding_profile: null,
}
await mkdir(output, { recursive: true })
let browser
let page

try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    timezoneId: 'Asia/Kolkata',
  })
  const errors = []
  const assetErrors = []
  await context.addInitScript(({ user, keys }) => {
    // Each isolated browser context starts with its own empty founder account.
    // No project, guild, roadmap, or achievement activity is seeded.
    if (localStorage.getItem('labx.achievements-refresh.fixture')) return
    localStorage.setItem(keys.profiles, JSON.stringify([{
      user,
      password_salt: 'achievements-refresh-test',
      password_verifier: '0'.repeat(64),
      auth_version: 0,
    }]))
    sessionStorage.setItem(keys.session, JSON.stringify({
      version: 1, userId: user.id, authVersion: 0, expiresAt: null,
    }))
    localStorage.setItem('labx.achievements-refresh.fixture', 'ready')
  }, { user: fixtureUser, keys: AUTH_STORAGE_KEYS })
  page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) assetErrors.push(`${response.status()} ${response.url()}`)
  })
  await page.goto(`${origin}/achievements`)
  await page.getByRole('heading', { name: 'Achievements', exact: true, level: 1 }).waitFor()
  const content = page.locator('.achievements-page')
  const filters = page.locator('.achievements-filters')
  const unlocked = filters.getByRole('button', { name: /^Earned/ })
  const pending = filters.getByRole('button', { name: /^Unearned/ })
  const search = page.getByRole('searchbox', { name: 'Search achievements', exact: true })
  const cards = page.locator('.achievement-card')
  const pagination = page.getByRole('navigation', { name: 'Achievement pages', exact: true })
  const previous = pagination.getByRole('button', { name: 'Previous page', exact: true })
  const next = pagination.getByRole('button', { name: 'Next page', exact: true })
  const first = pagination.getByRole('button', { name: 'First page', exact: true })
  const last = pagination.getByRole('button', { name: 'Last page', exact: true })
  const pageButton = (number) => pagination.getByRole('button', { name: `Page ${number}`, exact: true })
  const names = () => cards.locator('h3').allTextContents()
  const assertPage = async (number, count) => {
    await pageButton(number).waitFor()
    assert.equal(await pageButton(number).getAttribute('aria-current'), 'page', `Page ${number} is active`)
    assert.equal(await cards.count(), count, `Page ${number} contains ${count} cards`)
    assert.equal(await previous.isDisabled(), number === 1, 'Previous page boundary is correct')
    assert.equal(await next.isDisabled(), number === 3, 'Next page boundary is correct')
    assert.equal(await first.isDisabled(), number === 1, 'First page boundary is correct')
    assert.equal(await last.isDisabled(), number === 3, 'Last page boundary is correct')
  }
  const layout = async (name, width) => {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
    await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name} fits ${width}px`)
    await page.screenshot({ path: `${output}${name}-${width}.png`, fullPage: true, animations: 'disabled' })
  }

  const text = await content.innerText()
  for (const removed of [/your trophy collection/i, /LabX Points balance/i, /points overview/i, /keep moving forward/i, /your next unlock/i]) {
    assert.doesNotMatch(text, removed, `${removed} has been removed`)
  }
  await content.getByText('LabX Points', { exact: true }).waitFor()
  assert.equal(await content.locator('.achievements-hero').count(), 0, 'The trophy hero is removed')
  assert.equal(await content.locator('.achievements-summary > div').count(), 3, 'Only the requested three KPIs remain')
  await content.getByText('Total earned badges', { exact: true }).waitFor()
  await content.getByText('Unearned badges', { exact: true }).waitFor()
  assert.doesNotMatch(await content.locator('.achievements-collection-heading').innerText(), /of 30 unlocked/)
  const headingBox = await content.getByRole('heading', { name: 'Your achievements', exact: true }).boundingBox()
  const searchBox = await search.boundingBox()
  assert.ok(Math.abs((headingBox.y + headingBox.height / 2) - (searchBox.y + searchBox.height / 2)) < 20, 'Desktop search aligns with the collection heading')
  assert.equal(await filters.getByRole('button').count(), 2, 'Only the two status filters remain')
  assert.equal(await pending.getAttribute('aria-pressed'), 'true', 'The unearned collection is selected initially')
  assert.equal(await unlocked.getAttribute('aria-pressed'), 'false')
  assert.match(await pending.innerText(), /30/, 'The collection has 30 unearned achievements')
  assert.match(await unlocked.innerText(), /0/, 'A founder without platform activity has no earned badges')
  assert.equal(await page.locator('.achievement-card__category').getByText('MISSION', { exact: true }).count(), 0)
  assert.equal(await cards.filter({ has: page.getByText('MISSION', { exact: true }) }).count(), 0, 'Cards have no MISSION category text')

  const collected = []
  for (let number = 1; number <= 3; number += 1) {
    if (number > 1) await next.click()
    await assertPage(number, 10)
    assert.equal(await page.locator('.achievement-card.is-locked').count(), 10)
    collected.push(...await names())
  }
  assert.deepEqual(collected.slice(0, 10), [
    'First Step', 'Mission Master', 'Event Explorer', 'Event Champion', 'Roadmap Builder',
    'Roadmap Champion', 'Consistency Champion', 'Community Connect', 'Conversation Starter', 'Community Contributor',
  ], 'The first page follows the requested achievement order')
  assert.equal(new Set(collected).size, 30, 'The three pages contain 30 unique achievements')
  assert.equal(await pagination.getByRole('button', { name: /^Page \d+$/ }).count(), 3, 'There are exactly three page buttons')
  await layout('page-3', 1440)
  await first.click()
  await assertPage(1, 10)
  await last.click()
  await assertPage(3, 10)

  // Changing status on the final page must not leave the new result set blank
  // because its old page index was retained.
  await unlocked.click()
  assert.equal(await unlocked.getAttribute('aria-pressed'), 'true')
  assert.equal(await cards.count(), 0, 'The empty earned collection is honest')
  await content.getByRole('heading', { name: 'Your first achievement is ahead', exact: true }).waitFor()
  assert.equal(await pagination.count(), 0, 'An empty result set has no pagination')
  await layout('unlocked-empty', 390)
  await pending.click()
  await assertPage(1, 10)
  assert.deepEqual(await names(), collected.slice(0, 10), 'Switching filters resets to the first page')
  await layout('page-1', 390)
  await layout('page-1', 1440)

  const firstName = collected[0]
  const badgeTrigger = page.getByRole('button', { name: `View ${firstName} badge`, exact: true })
  await badgeTrigger.click()
  const dialog = page.getByRole('dialog', { name: firstName, exact: true })
  await dialog.waitFor()
  assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog'))), true, 'Opening badge details moves focus into the dialog')
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog'))), true, 'Keyboard focus stays inside badge details')
  await layout('badge-details', 390)
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(await badgeTrigger.evaluate((element) => element === document.activeElement), true, 'Escape restores focus to the badge trigger')
  assert.equal(new URL(page.url()).searchParams.has('badge'), false, 'Closing removes the badge URL parameter')

  // The seeded demo has one existing unlock: filtering happens before
  // pagination, so its remaining collection occupies 10 + 10 + 9 slots.
  await page.evaluate((keys) => {
    sessionStorage.setItem(keys.session, JSON.stringify({
      version: 1, userId: 'demo-founder', authVersion: 0, expiresAt: null,
    }))
  }, AUTH_STORAGE_KEYS)
  await page.reload()
  await page.getByRole('heading', { name: 'Achievements', exact: true, level: 1 }).waitFor()
  assert.match(await pending.innerText(), /29/)
  const totalStats = await content.locator('.achievements-summary').innerText()
  await search.fill('mission')
  assert.match(await unlocked.innerText(), /1$/, 'Search counts the matching earned badge')
  assert.equal(Number((await pending.innerText()).match(/\d+$/)[0]), 11, 'Search counts only the matching unearned badges')
  assert.equal(await content.locator('.achievements-summary').innerText(), totalStats, 'Search leaves account-wide KPIs unchanged')
  await unlocked.click()
  assert.deepEqual(await names(), ['First Step'])
  await search.fill('COMMUNITY')
  assert.match(await unlocked.innerText(), /0$/)
  assert.ok(Number((await pending.innerText()).match(/\d+$/)[0]) > 0, 'Counts for the other status remain visible')
  await pending.click()
  assert.ok(await cards.count() > 0)
  await search.fill('zzzz no matching achievement')
  assert.equal(await cards.count(), 0)
  assert.match(await unlocked.innerText(), /0$/)
  assert.match(await pending.innerText(), /0$/)
  assert.equal(await pagination.count(), 0)
  await search.fill('')
  await assertPage(1, 10)
  await pageButton(3).click()
  await assertPage(3, 9)
  await unlocked.click()
  assert.equal(await cards.count(), 1, 'The seeded account shows its one unlocked badge')
  assert.equal(await page.locator('.achievement-card.is-earned').count(), 1)
  if (await pagination.count()) {
    assert.equal(await pageButton(1).getAttribute('aria-current'), 'page')
    assert.equal(await previous.isDisabled(), true)
    assert.equal(await next.isDisabled(), true)
  }
  await pending.click()
  await assertPage(1, 10)
  await layout('demo-page-1', 390)

  // A real profile save must be observed while the user is still on Profile,
  // before visiting the achievement collection. Later edits cannot revoke an
  // earned badge or rewrite the date on which it was originally unlocked.
  await page.evaluate(({ keys, userId }) => {
    sessionStorage.setItem(keys.session, JSON.stringify({
      version: 1, userId, authVersion: 0, expiresAt: null,
    }))
  }, { keys: AUTH_STORAGE_KEYS, userId: fixtureUser.id })
  await page.clock.setFixedTime(new Date('2026-10-27T04:30:00Z'))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`${origin}/profile`)
  await page.getByRole('heading', { name: 'Profile', exact: true, level: 1 }).waitFor()
  const profileEditor = page.getByRole('dialog', { name: 'Edit profile', exact: true })
  const editProfile = async (field, value) => {
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click()
    await profileEditor.getByLabel(field, { exact: true }).fill(value)
    await profileEditor.getByRole('button', { name: 'Save profile', exact: true }).click()
    await profileEditor.waitFor({ state: 'hidden' })
  }
  const ledgerKey = platformAchievementKey(fixtureUser.id)
  const savedProfileKey = profileKey(fixtureUser.id)
  const bioAward = () => page.evaluate((key) =>
    JSON.parse(localStorage.getItem(key) || 'null')?.records?.find((record) => record.metric === 'profileBio'), ledgerKey)
  await editProfile('Bio', 'Building useful tools and learning with the LabX community.')
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || 'null')?.records?.some((record) => record.metric === 'profileBio'), ledgerKey)
  assert.equal(new URL(page.url()).pathname, '/profile', 'The observer records the award before visiting Achievements')
  const firstBioAward = await bioAward()
  assert.equal(firstBioAward.date, '2026-10-27T04:30:00.000Z')
  const assertBioBadge = async () => {
    await page.goto(`${origin}/achievements`)
    await unlocked.click()
    assert.equal(await cards.count(), 1, 'The real profile save unlocks exactly one achievement')
    const story = page.getByRole('article', { name: 'Tell Your Story', exact: true })
    await story.waitFor()
    assert.match(await story.getAttribute('class'), /is-earned/)
    assert.equal(await story.locator('time').getAttribute('datetime'), firstBioAward.date, 'The card retains its original unlock date')
  }
  await assertBioBadge()
  await page.clock.setFixedTime(new Date('2026-10-28T04:30:00Z'))
  await page.goto(`${origin}/profile`)
  await editProfile('City', 'Bengaluru')
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || 'null')?.details?.updatedAt === '2026-10-28T04:30:00.000Z', savedProfileKey)
  assert.deepEqual(await bioAward(), firstBioAward, 'An unrelated profile edit preserves the original award')
  await assertBioBadge()
  await page.clock.setFixedTime(new Date('2026-10-29T04:30:00Z'))
  await page.goto(`${origin}/profile`)
  await editProfile('Bio', '')
  await page.waitForFunction((key) => {
    const details = JSON.parse(localStorage.getItem(key) || 'null')?.details
    return details?.bio === '' && details?.updatedAt === '2026-10-29T04:30:00.000Z'
  }, savedProfileKey)
  await page.reload()
  await page.getByRole('heading', { name: 'Profile', exact: true, level: 1 }).waitFor()
  assert.deepEqual(await bioAward(), firstBioAward, 'Removing the bio and reloading preserves its earned badge and original date')
  await assertBioBadge()
  await layout('profile-badge-retained', 390)
  assert.deepEqual(errors, [], 'No browser runtime errors')
  assert.deepEqual(assetErrors, [], 'No failed page or asset responses')
  console.log('PASS: 30 unique platform achievements; 10-card pagination; filter reset, empty and populated states; removed sections; badge dialog focus/Escape; persistent real-profile unlock observed before visiting Achievements; desktop/mobile layouts; no browser errors.')
} catch (error) {
  await page?.screenshot({ path: `${output}failure.png`, fullPage: true, animations: 'disabled' }).catch(() => {})
  throw error
} finally {
  await browser?.close()
}
