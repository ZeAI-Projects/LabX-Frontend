import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { AUTH_STORAGE_KEYS } from '../src/features/authentication/services/mock_auth.js'

const origin = new URL(process.env.LABX_PREVIEW_URL || 'http://127.0.0.1:5173').origin
const output = fileURLToPath(new URL('../test-results/events-lists/', import.meta.url))
const executablePath = process.env.LABX_BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
const fixtureUser = {
  id: 'events-lists-founder', email: 'events-lists@example.com', full_name: 'Events Preview',
  username: 'eventspreview', role: 'founder', avatar_url: '', total_points: 0,
  assessment_completed: false, assessment_skipped: false, assessment_result: null,
  assessment_answers: null, onboarding_completed: false, onboarding_profile: null,
}
const workshopTitle = 'Customer Discovery Masterclass'
const hackathonTitle = 'Build for Impact Hackathon'
const pastTitle = 'Pitch Practice: October Edition'
await mkdir(output, { recursive: true })
let browser
let page

try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', timezoneId: 'Asia/Kolkata',
  })
  const errors = []
  const assetErrors = []
  const externalRequests = []
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) {
      externalRequests.push(url.href)
      return route.abort()
    }
    return route.continue()
  })
  await context.addInitScript(({ user, keys }) => {
    // The browser starts with an empty account; all saves and registrations use the UI.
    if (localStorage.getItem('labx.events-lists.fixture')) return
    localStorage.setItem(keys.profiles, JSON.stringify([{
      user, password_salt: 'events-lists-test', password_verifier: '0'.repeat(64), auth_version: 0,
    }]))
    sessionStorage.setItem(keys.session, JSON.stringify({
      version: 1, userId: user.id, authVersion: 0, expiresAt: null,
    }))
    localStorage.setItem('labx.events-lists.fixture', 'ready')
  }, { user: fixtureUser, keys: AUTH_STORAGE_KEYS })
  page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) assetErrors.push(`${response.status()} ${response.url()}`)
  })
  await page.clock.setFixedTime(new Date('2026-10-14T04:30:00Z'))
  const button = (name) => page.getByRole('button', { name, exact: true })
  const heading = (name) => page.getByRole('heading', { name, exact: true })
  const details = (title) => button(`View details: ${title}`)
  const dialog = (title) => page.getByRole('dialog', { name: title, exact: true })
  const rows = page.locator('ul.events-list > li > article.events-list-row')
  const row = (title) => rows.filter({ has: heading(title) })
  const savedPeriod = page.getByLabel('Saved Events period', { exact: true })
  const myPeriod = page.getByLabel('My Events period', { exact: true })
  const expectRows = async (count) => {
    await page.waitForFunction((expected) =>
      document.querySelectorAll('ul.events-list > li > article.events-list-row').length === expected, count)
    assert.equal(await rows.count(), count, 'Results use semantic list items containing event articles')
    assert.equal(await page.locator('.events-card').count(), 0, 'List views have no discovery cards')
  }
  const layout = async (name) => {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
      await page.evaluate(() => document.fonts.ready)
      const fits = await page.evaluate(() => {
        const modal = document.querySelector('dialog[open]')
        const bounds = modal?.getBoundingClientRect()
        return document.documentElement.scrollWidth <= innerWidth + 1
          && (!modal || bounds.left >= -1 && bounds.right <= innerWidth + 1 && modal.scrollWidth <= modal.clientWidth + 1)
      })
      assert.ok(fits, `${name} fits ${width}px without horizontal overflow`)
      await page.screenshot({ path: `${output}${name}-${width}.png`, fullPage: true, animations: 'disabled' })
    }
  }
  const closeDetails = async (title, restore = true) => {
    await page.keyboard.press('Escape')
    await dialog(title).waitFor({ state: 'hidden' })
    assert.equal(new URL(page.url()).searchParams.has('event'), false, 'Closing clears the event URL parameter')
    if (restore) assert.ok(await details(title).evaluate((element) => element === document.activeElement), 'Escape restores focus to View Details')
  }
  const openDetails = async (title, id, view) => {
    await details(title).click()
    await dialog(title).waitFor()
    assert.equal(new URL(page.url()).searchParams.get('event'), id)
    assert.equal(new URL(page.url()).searchParams.get('view'), view, 'Details preserve the selected event view')
    assert.ok(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog'))), 'Details receive keyboard focus')
    await page.keyboard.press('Tab')
    assert.ok(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog'))), 'Keyboard focus remains inside details')
  }

  await page.goto(`${origin}/events`)
  await heading('Events & Opportunities').waitFor()
  await button('Saved Events (0)').waitFor()
  await button('My Events (0)').waitFor()
  assert.equal(await page.locator('.events-card').count() > 0, true, 'Upcoming discovery still uses cards')
  await button(`Save event: ${workshopTitle}`).click()
  await button(`Save event: ${hackathonTitle}`).click()
  await button('Saved Events (2)').click()
  await heading('Saved Events').waitFor()
  await expectRows(2)
  await row(workshopTitle).waitFor()
  await row(hackathonTitle).waitFor()
  await button('My Events (0)').waitFor()
  assert.equal(await button('Saved Events (2)').getAttribute('aria-pressed'), 'true')
  assert.equal(await button('Saved Events (2)').locator('svg').count(), 1, 'Saved Events has a bookmark icon')
  await layout('saved-events')

  await openDetails(workshopTitle, 'customer-workshop', 'saved')
  await dialog(workshopTitle).getByText('LabX Learning Studio', { exact: true }).waitFor()
  await layout('saved-event-details')
  await closeDetails(workshopTitle)
  await openDetails(workshopTitle, 'customer-workshop', 'saved')
  await page.goBack()
  await dialog(workshopTitle).waitFor({ state: 'hidden' })
  assert.equal(new URL(page.url()).searchParams.get('view'), 'saved')
  await page.goForward()
  await dialog(workshopTitle).waitFor()
  await page.reload()
  await dialog(workshopTitle).waitFor()
  await closeDetails(workshopTitle, false)

  // Searching and date/category filters change results without changing saved totals.
  await page.getByLabel('Category', { exact: true }).selectOption('Workshop')
  await expectRows(1)
  await row(workshopTitle).waitFor()
  await page.getByLabel('Search events', { exact: true }).fill('no matching saved event')
  await heading('No saved events match your filters').waitFor()
  await expectRows(0)
  await button('Saved Events (2)').waitFor()
  await button('Clear filters').click()
  await expectRows(2)
  await savedPeriod.selectOption('ongoing')
  await heading('No saved events match your filters').waitFor()
  await savedPeriod.selectOption('all')
  await expectRows(2)

  await button('Past Events').click()
  await heading('Past-event history').waitFor()
  await expectRows(1)
  assert.equal(await button('Past Events').locator('svg').count(), 1, 'Past Events has a history icon')
  await row(pastTitle).waitFor()
  await layout('past-event-history')
  await openDetails(pastTitle, 'past-pitch-workshop', 'past')
  assert.ok(await dialog(pastTitle).getByRole('button', { name: 'Event ended', exact: true }).isDisabled())
  await layout('past-event-details')
  await closeDetails(pastTitle)
  await button(`Save event: ${pastTitle}`).click()
  await button('Saved Events (3)').click()
  await expectRows(3)
  await savedPeriod.selectOption('past')
  await expectRows(1)
  await row(pastTitle).waitFor()
  await savedPeriod.selectOption('upcoming')
  await expectRows(2)
  await row(workshopTitle).waitFor()
  await savedPeriod.selectOption('all')
  await expectRows(3)
  await button(`Remove saved event: ${pastTitle}`).click()
  await button('Saved Events (2)').waitFor()
  await expectRows(2)
  assert.equal(await row(pastTitle).count(), 0, 'Removing a saved row removes it immediately')
  await page.reload()
  await heading('Saved Events').waitFor()
  await expectRows(2)
  await button('Saved Events (2)').waitFor()
  assert.equal(await row(pastTitle).count(), 0, 'Removed saves remain removed after reloading')

  // Registrations stay separate from saved events and remain in past history after completion.
  await openDetails(workshopTitle, 'customer-workshop', 'saved')
  await dialog(workshopTitle).getByRole('button', { name: 'Register', exact: true }).click()
  await dialog('Confirm registration').getByRole('button', { name: 'Confirm registration', exact: true }).click()
  await dialog(workshopTitle).getByRole('status').filter({ hasText: 'Your event is saved in My Events.' }).waitFor()
  await closeDetails(workshopTitle)
  await button('My Events (1)').click()
  await heading('My Events').waitFor()
  await expectRows(1)
  await myPeriod.selectOption('upcoming')
  await expectRows(1)
  await myPeriod.selectOption('past')
  await heading('No registrations match this view').waitFor()
  await expectRows(0)
  await myPeriod.selectOption('all')
  await expectRows(1)
  await layout('my-events')

  await page.clock.setFixedTime(new Date('2026-10-18T05:15:00Z'))
  await page.reload()
  await myPeriod.selectOption('ongoing')
  await expectRows(1)
  await openDetails(workshopTitle, 'customer-workshop', 'my')
  await dialog(workshopTitle).getByRole('button', { name: 'Record participation', exact: true }).click()
  await dialog('Record participation').getByLabel('Notes', { exact: true }).fill('Practiced interviews with the LabX community.')
  await dialog('Record participation').getByRole('button', { name: 'Save participation', exact: true }).click()
  await dialog(workshopTitle).getByRole('heading', { name: 'Participation completed', exact: true }).waitFor()
  await closeDetails(workshopTitle, false)
  await myPeriod.selectOption('completed')
  await expectRows(1)
  await button('Completed').click()
  await expectRows(1)

  await page.clock.setFixedTime(new Date('2026-10-19T04:30:00Z'))
  await page.goto(`${origin}/events?view=my`)
  await myPeriod.selectOption('past')
  await expectRows(1)
  await row(workshopTitle).getByText('Completed', { exact: true }).waitFor()
  await button('Past Events').click()
  await heading('Past-event history').waitFor()
  await expectRows(2)
  await page.getByLabel('Search events', { exact: true }).fill('Customer Discovery')
  await expectRows(1)
  await openDetails(workshopTitle, 'customer-workshop', 'past')
  await dialog(workshopTitle).getByRole('heading', { name: 'Participation completed', exact: true }).waitFor()
  await closeDetails(workshopTitle)
  await button('Clear filters').click()
  await button('Saved Events (2)').click()
  await savedPeriod.selectOption('past')
  await expectRows(1)
  await button(`Remove saved event: ${workshopTitle}`).click()
  await button('Saved Events (1)').waitFor()
  await heading('No saved events match your filters').waitFor()
  await button('My Events (1)').click()
  await expectRows(1)
  await page.reload()
  await expectRows(1)
  await button('Saved Events (1)').waitFor()
  await row(workshopTitle).waitFor()

  assert.deepEqual(errors, [], 'No browser runtime errors')
  assert.deepEqual(assetErrors, [], 'No failed local responses')
  assert.deepEqual(externalRequests, [], 'Event lists and details do not contact external services')
  console.log('PASS: saved and past-event lists; period/category/search filters; real save/remove persistence and independent counts; My Events completed history; details focus/Escape and URL history; 320/390/1440px layouts.')
} catch (error) {
  await page?.screenshot({ path: `${output}failure.png`, fullPage: true, animations: 'disabled' }).catch(() => {})
  throw error
} finally {
  await browser?.close()
}
