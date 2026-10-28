import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { AUTH_STORAGE_KEYS } from '../src/features/authentication/services/mock_auth.js'
import { MOCK_EVENTS } from '../src/features/events/services/mock_events.js'

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
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', timezoneId: 'Asia/Kolkata' })
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
    if (localStorage.getItem('labx.events-lists.fixture')) return
    localStorage.setItem(keys.profiles, JSON.stringify([{ user, password_salt: 'events-lists-test', password_verifier: '0'.repeat(64), auth_version: 0 }]))
    sessionStorage.setItem(keys.session, JSON.stringify({ version: 1, userId: user.id, authVersion: 0, expiresAt: null }))
    localStorage.setItem('labx.events-lists.fixture', 'ready')
  }, { user: fixtureUser, keys: AUTH_STORAGE_KEYS })
  page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => { if (response.status() >= 400) assetErrors.push(`${response.status()} ${response.url()}`) })
  await page.clock.setFixedTime(new Date('2026-10-14T04:30:00Z'))
  const button = (name) => page.getByRole('button', { name: name === 'Filters' ? /^Filters/ : name, exact: true }).last()
  const heading = (name) => page.getByRole('heading', { name, exact: true })
  const details = (title) => button(`View details: ${title}`)
  const dialog = (title) => page.getByRole('dialog', { name: title, exact: true })
  const cards = page.locator('.events-grid .events-card')
  const pager = page.getByRole('navigation', { name: 'Event pages', exact: true })
  const pagerButton = (name) => pager.getByRole('button', { name, exact: true })
  const search = page.getByLabel('Search events', { exact: true })
  const close = async (title) => {
    await dialog(title).waitFor()
    await page.keyboard.press('Escape')
    await page.locator('dialog[open]').waitFor({ state: 'hidden' })
  }
  const assertSamePopup = async (handle, title) => {
    await dialog(title).waitFor()
    assert.equal(await page.locator('dialog[open]').count(), 1, 'Only one event popup is open')
    assert.ok(await handle.evaluate((element) => element === document.querySelector('dialog[open]')), 'Navigation reuses the same dialog element')
  }
  const backTo = async (title, label = title) => {
    await button(`Back to ${label}`).click()
    await dialog(title).waitFor()
  }
  const layout = async (name) => {
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
      await page.evaluate(() => document.fonts.ready)
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1
        && [...document.querySelectorAll('dialog[open]')].every((modal) => {
          const box = modal.getBoundingClientRect()
          return box.left >= -1 && box.right <= innerWidth + 1 && modal.scrollWidth <= modal.clientWidth + 1
        }))
      assert.ok(fits, `${name} fits ${width}px without horizontal overflow`)
      if (name === 'discovery-pagination') {
        const controls = await page.locator('.events-discovery-toolbar').evaluate((toolbar) => {
          const box = toolbar.getBoundingClientRect()
          const content = toolbar.closest('.events-page').getBoundingClientRect()
          const searchBox = toolbar.querySelector('.events-search-field').getBoundingClientRect()
          const filterBox = toolbar.querySelector('.events-filter-toggle').getBoundingClientRect()
          return { width: box.width, contentWidth: content.width, rightGap: content.right - box.right, rowGap: Math.abs(searchBox.top - filterBox.top), horizontalGap: filterBox.left - searchBox.right }
        })
        assert.ok(controls.width <= 421 && controls.width <= controls.contentWidth + 1, 'Search and filters remain compact and fit the viewport')
        assert.ok(Math.abs(controls.rightGap) <= 1, 'Search and filters align to the right edge')
        assert.ok(controls.rowGap <= 1 && controls.horizontalGap >= 0, 'The filter button sits beside the search bar')
        if (width === 1440) assert.ok(controls.width < controls.contentWidth / 2, 'Desktop search occupies less than half the content width')
        for (const tab of await page.locator('.events-secondary-views button').all()) assert.ok(await tab.locator('svg').isVisible(), `Collection icons remain visible at ${width}px`)
      }
      await page.screenshot({ path: `${output}${name}-${width}.png`, fullPage: true, animations: 'disabled' })
    }
  }
  const collectionRows = (name) => dialog(name).locator('ul.events-list > li > article.events-list-row')
  const assertRows = async (name, count) => {
    await dialog(name).waitFor()
    await page.waitForFunction(({ title, expected }) => [...document.querySelectorAll('dialog[open]')].some((modal) =>
      modal.querySelector('h2')?.textContent === title && modal.querySelectorAll('ul.events-list > li > article.events-list-row').length === expected), { title: name, expected: count })
    assert.equal(await collectionRows(name).count(), count, `${name} uses compact semantic list rows`)
    assert.equal(await dialog(name).locator('.events-card').count(), 0)
  }

  await page.goto(`${origin}/events`)
  await heading('Events & Opportunities').waitFor()
  assert.equal(await page.locator('.events-hero').count(), 0)
  assert.equal(await page.locator('.events-metrics > div').count(), 4, 'Event KPIs remain')
  const primaryTabs = page.getByRole('navigation', { name: 'Event views', exact: true }).getByRole('button')
  assert.equal(await primaryTabs.count(), 3)
  assert.deepEqual(await primaryTabs.locator('span:not(.events-view-count)').allTextContents(), ['Upcoming', 'Ongoing', 'My Events'], 'The three left tabs display their labels')
  for (const label of await primaryTabs.locator('span:not(.events-view-count)').all()) assert.ok(await label.isVisible())
  for (const name of ['Upcoming', 'Ongoing', 'My Events (0)']) await page.getByRole('button', { name, exact: true }).waitFor()
  const collectionTabs = page.getByRole('navigation', { name: 'Event collections', exact: true }).getByRole('button')
  assert.equal(await collectionTabs.count(), 3)
  assert.deepEqual(await collectionTabs.allTextContents(), ['', '', ''], 'The three right tabs show only icons')
  for (const name of ['Saved Events (0)', 'Past Events', 'Completed']) {
    const tab = page.getByRole('button', { name, exact: true })
    assert.equal(await tab.getAttribute('title'), name, 'Icon tabs retain descriptive tooltips and accessible names')
  }
  assert.equal(await cards.count(), 10, 'The first page has ten events')
  const positions = await cards.evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)))
  assert.equal(new Set(positions).size, 2, 'Desktop shows exactly two rows')
  assert.equal(positions.filter((top) => top === positions[0]).length, 5, 'Desktop shows five cards per row')
  const firstPage = await cards.locator('h3').allTextContents()
  assert.ok(await pagerButton('First page').isDisabled())
  assert.ok(await pagerButton('Previous page').isDisabled())
  await pagerButton('Last page').click()
  assert.equal(await cards.count(), 8, 'The last page has the remaining eight events')
  assert.ok(await pagerButton('Last page').isDisabled())
  assert.ok(await pagerButton('Next page').isDisabled())
  const lastPage = await cards.locator('h3').allTextContents()
  assert.equal(new Set([...firstPage, ...lastPage]).size, 18, 'Pagination never repeats or drops events')
  await search.fill('Customer Discovery')
  await button('Submit event search').click()
  await search.press('Enter')
  assert.equal(await cards.count(), 1)
  assert.equal(await pagerButton('Page 1').getAttribute('aria-current'), 'page', 'Search resets pagination')
  await search.fill('')
  assert.equal(await cards.count(), 10)
  await layout('discovery-pagination')

  await button('Filters').click()
  const filters = page.getByRole('region', { name: 'Event filters', exact: true })
  await filters.waitFor()
  assert.equal(await page.locator('dialog[open]').count(), 0, 'Filters expand as a dropdown, not a popup')
  assert.equal(await filters.getByLabel('Sort by', { exact: true }).locator('option').count(), 2)
  assert.equal(await filters.getByRole('button', { name: /More filters/ }).count(), 0)
  assert.equal(await filters.getByLabel('Area or venue', { exact: true }).count(), 0)
  for (const name of ['Category', 'Format', 'Starts from', 'Starts by', 'Location', 'Eligibility', 'Fee', 'Prizes & benefits', 'Sponsorship']) assert.ok(await filters.getByLabel(name, { exact: true }).isVisible(), `${name} is available without expanding another section`)
  await filters.getByLabel('Category', { exact: true }).selectOption('Workshop')
  const locationOptions = await filters.getByLabel('Location', { exact: true }).locator('option').allTextContents()
  assert.deepEqual(locationOptions.slice(1).sort(), ['Bengaluru', 'Chennai'], 'Location options contain only distinct cities')
  await filters.getByLabel('Location', { exact: true }).selectOption('Bengaluru')
  await layout('event-filters')
  await page.keyboard.press('Escape')
  await filters.waitFor({ state: 'hidden' })
  assert.equal(await button('Filters').getAttribute('aria-expanded'), 'false')
  assert.ok(await button('Filters').evaluate((element) => element === document.activeElement), 'Escape returns focus to the dropdown toggle')
  assert.equal(await cards.count(), 0, 'Combined category and city filters apply')
  await button('Filters').click()
  await filters.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await filters.getByLabel('Location', { exact: true }).selectOption('Bengaluru')
  await button('Filters').click()
  const cityResults = await cards.locator('h3').allTextContents()
  assert.ok(cityResults.includes('Founder Residency Open House') && cityResults.includes(hackathonTitle), 'One city includes all matching venues')
  assert.equal(cityResults.includes(workshopTitle), false, 'Online-only listings do not acquire an invented city')
  await button('Filters').click()
  await heading('Events & Opportunities').click()
  await filters.waitFor({ state: 'hidden' })
  await page.goto(`${origin}/events`)

  await button(`Save event: ${workshopTitle}`).click()
  await button(`Save event: ${hackathonTitle}`).click()
  const savedTrigger = button('Saved Events (2)')
  await savedTrigger.click()
  await assertRows('Saved Events', 2)
  const savedPopup = await dialog('Saved Events').elementHandle()
  assert.equal(await dialog('Saved Events').getByRole('button', { name: /^Filters/ }).count(), 0)
  assert.equal(await dialog('Saved Events').getByLabel('Saved Events period', { exact: true }).count(), 0)
  assert.equal(await dialog('Saved Events').getByRole('navigation').count(), 0, 'Collections do not contain numbered pagination')
  assert.equal(await dialog('Saved Events').locator('.events-list-date, .events-list-row__organizer').count(), 0, 'Compact rows omit date boxes and organizer text')
  assert.deepEqual(await dialog('Saved Events').locator('.events-list-row__format').allTextContents(), ['Online', 'Hybrid'])
  assert.equal(new URL(page.url()).searchParams.get('view') || 'upcoming', 'upcoming', 'A secondary collection preserves the primary view')
  await layout('saved-events')
  await page.getByLabel('Search saved events', { exact: true }).fill('Customer')
  await assertRows('Saved Events', 1)
  await details(workshopTitle).click()
  await assertSamePopup(savedPopup, workshopTitle)
  await page.goBack()
  await assertSamePopup(savedPopup, 'Saved Events')
  await assertRows('Saved Events', 1)
  await details(workshopTitle).click()
  await assertSamePopup(savedPopup, workshopTitle)
  await dialog(workshopTitle).getByRole('button', { name: 'Report listing', exact: true }).click()
  await assertSamePopup(savedPopup, 'Report listing')
  await backTo(workshopTitle, 'event details')
  await assertSamePopup(savedPopup, workshopTitle)
  await backTo('Saved Events')
  await assertSamePopup(savedPopup, 'Saved Events')
  await page.waitForFunction((title) => document.activeElement?.getAttribute('aria-label') === `View details: ${title}`, workshopTitle)
  assert.equal(await page.getByLabel('Search saved events', { exact: true }).inputValue(), 'Customer', 'Back preserves the collection search')
  await assertRows('Saved Events', 1)
  await page.getByLabel('Search saved events', { exact: true }).fill('no matching saved event')
  await heading('No saved events match your search').waitFor()
  await assertRows('Saved Events', 0)
  await page.getByLabel('Search saved events', { exact: true }).fill('')
  await assertRows('Saved Events', 2)
  await close('Saved Events')
  assert.ok(await savedTrigger.evaluate((element) => element === document.activeElement), 'Closing collection restores its tab')

  await button('Past Events').click()
  await assertRows('Past-event history', 1)
  await details(pastTitle).click()
  assert.ok(await dialog(pastTitle).getByRole('button', { name: 'Event ended', exact: true }).isDisabled())
  await backTo('Past-event history')
  await button(`Save event: ${pastTitle}`).click()
  await layout('past-event-history')
  await close('Past-event history')
  await button('Saved Events (3)').click()
  await page.getByLabel('Search saved events', { exact: true }).fill('Pitch Practice')
  await assertRows('Saved Events', 1)
  await button(`Remove saved event: ${pastTitle}`).click()
  await assertRows('Saved Events', 0)
  await page.waitForFunction(() => document.activeElement === document.querySelector('#events-collection-title'))
  assert.ok(await dialog('Saved Events').getByRole('heading', { name: 'Saved Events', exact: true }).evaluate((element) => element === document.activeElement), 'Removing a focused row keeps focus in the collection')
  await close('Saved Events')
  await page.reload()
  await button('Saved Events (2)').click()
  await assertRows('Saved Events', 2)

  const registrationPopup = await dialog('Saved Events').elementHandle()
  await details(workshopTitle).click()
  await assertSamePopup(registrationPopup, workshopTitle)
  await dialog(workshopTitle).getByRole('button', { name: 'Register', exact: true }).click()
  await assertSamePopup(registrationPopup, 'Confirm registration')
  await button('Back to event details').click()
  await assertSamePopup(registrationPopup, workshopTitle)
  await dialog(workshopTitle).getByRole('button', { name: 'Register', exact: true }).click()
  await dialog('Confirm registration').getByRole('button', { name: 'Confirm registration', exact: true }).click()
  await dialog(workshopTitle).getByRole('status').filter({ hasText: 'Your event is saved in My Events.' }).waitFor()
  await dialog(workshopTitle).getByRole('button', { name: 'View My Events', exact: true }).click()
  await heading('My Events').waitFor()
  assert.equal(await page.locator('dialog[open]').count(), 0)
  await page.waitForFunction(() => document.activeElement === document.querySelector('.events-results-heading h3'))
  assert.ok(await heading('My Events').evaluate((element) => element === document.activeElement), 'Moving from nested details to My Events focuses the main collection')
  assert.equal(await cards.count(), 1, 'My Events also uses the main card grid')
  await page.getByLabel('My Events period', { exact: true }).selectOption('past')
  assert.equal(await cards.count(), 0)
  await page.getByLabel('My Events period', { exact: true }).selectOption('all')
  await layout('my-events')
  await page.clock.setFixedTime(new Date('2026-10-18T05:15:00Z'))
  await page.reload()
  await details(workshopTitle).click()
  await dialog(workshopTitle).getByRole('button', { name: 'Record participation', exact: true }).click()
  await dialog('Record participation').getByLabel('Notes', { exact: true }).fill('Practiced interviews with the LabX community.')
  await dialog('Record participation').getByRole('button', { name: 'Save participation', exact: true }).click()
  await close(workshopTitle)
  await button('Completed').click()
  await assertRows('Completed participation', 1)
  await page.reload()
  await assertRows('Completed participation', 1)
  await details(workshopTitle).click()
  await dialog(workshopTitle).getByRole('heading', { name: 'Participation completed', exact: true }).waitFor()
  await backTo('Completed participation')
  await layout('completed-participation')
  await details(workshopTitle).click()
  await dialog(workshopTitle).getByRole('button', { name: 'Close events popup', exact: true }).click()
  await page.locator('dialog[open]').waitFor({ state: 'hidden' })
  assert.equal(new URL(page.url()).searchParams.has('collection'), false, 'Close clears the entire collection popup')
  assert.equal(new URL(page.url()).searchParams.has('event'), false)

  // A long real collection starts with ten and expands in place, retaining its
  // loaded rows when details and forms are opened and then navigated back.
  await page.clock.setFixedTime(new Date('2027-01-01T04:30:00Z'))
  await page.goto(`${origin}/events?view=past`)
  await assertRows('Past-event history', 10)
  const historyPopup = await dialog('Past-event history').elementHandle()
  assert.equal(await dialog('Past-event history').getByRole('navigation').count(), 0)
  await dialog('Past-event history').getByRole('button', { name: /^Show more/ }).click()
  await assertRows('Past-event history', MOCK_EVENTS.length)
  assert.equal(await dialog('Past-event history').getByRole('button', { name: /^Show more/ }).count(), 0)
  const historyRows = collectionRows('Past-event history')
  const finalTitle = await historyRows.last().locator('h3').innerText()
  await historyRows.last().getByRole('button', { name: `View details: ${finalTitle}`, exact: true }).click()
  await assertSamePopup(historyPopup, finalTitle)
  await backTo('Past-event history')
  await assertRows('Past-event history', MOCK_EVENTS.length)
  await assertSamePopup(historyPopup, 'Past-event history')
  await historyRows.last().getByRole('button', { name: `View details: ${finalTitle}`, exact: true }).click()
  await close(finalTitle)
  assert.equal(await page.locator('dialog[open]').count(), 0, 'Escape closes the entire popup from event details')
  assert.equal(new URL(page.url()).searchParams.has('collection'), false)
  assert.equal(new URL(page.url()).searchParams.has('event'), false)
  assert.deepEqual(errors, [])
  assert.deepEqual(assetErrors, [])
  assert.deepEqual(externalRequests, [])
  console.log('PASS: labeled main tabs, icon collection tabs, compact right-aligned search, search/reset, city dropdown filters, main 5x2 pagination, compact collection rows, same-popup detail/form navigation, Back/Close/Escape, show-more history, persistent registration and participation, responsive layouts.')
} catch (error) {
  await page?.screenshot({ path: `${output}failure.png`, fullPage: true, animations: 'disabled' }).catch(() => {})
  throw error
} finally {
  await browser?.close()
}
