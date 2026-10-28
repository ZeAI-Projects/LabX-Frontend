import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { DEMO_CREDENTIALS } from '../src/features/authentication/services/mock_auth.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = fileURLToPath(new URL('../test-results/events-workflow/', import.meta.url))
const origin = 'http://127.0.0.1:5193'
const executablePath = process.env.LABX_BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
const certificate = Buffer.from('%PDF-1.4\nLabX local participation certificate preview\n%%EOF')
await mkdir(output, { recursive: true })
const server = await preview({ root, envDir: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 5193, strictPort: true } })
let browser
let page

try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', timezoneId: 'Asia/Kolkata',
    acceptDownloads: true,
  })
  const errors = []
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
    openedPage.on('pageerror', (error) => errors.push(error.message))
    openedPage.on('response', (response) => { if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`) })
  })
  page = await context.newPage()
  page.setDefaultTimeout(10000)
  await page.clock.setFixedTime(new Date('2026-10-14T04:30:00Z'))
  const go = (path) => page.goto(`${origin}${path}`)
  const button = (name) => page.getByRole('button', { name: name === 'Filters' ? /^Filters/ : name, exact: true }).last()
  const dialog = (name) => page.getByRole('dialog', { name, exact: true })
  const details = (title) => button(`View details: ${title}`)
  const saveToast = () => page.locator('.events-save-toast')
  const checkSaveToast = async (message) => {
    const toast = saveToast()
    await toast.filter({ hasText: message }).waitFor()
    assert.equal(await toast.count(), 1, 'Only the latest bookmark notification is shown')
    assert.equal(await toast.getAttribute('role'), 'status', 'Bookmark feedback is announced without interrupting focus')
    const geometry = await toast.evaluate((element) => {
      const box = element.getBoundingClientRect()
      return {
        fixed: getComputedStyle(element).position === 'fixed',
        centered: Math.abs(box.left + box.width / 2 - innerWidth / 2) < 2,
        atTop: box.top >= 0 && box.top < 80,
        fits: box.left >= 0 && box.right <= innerWidth,
      }
    })
    assert.ok(geometry.fixed && geometry.centered && geometry.atTop && geometry.fits, 'Bookmark notification stays small and centered at the top of the viewport')
    assert.equal(await page.locator('.events-feedback:not(.events-feedback--error)').filter({ hasText: /(?:Added to|Removed from|added to|removed from) Saved Events/ }).count(), 0, 'Bookmark success does not leave an inline banner')
  }
  const closeDialog = async () => {
    while (await page.locator('dialog[open]').count()) {
      const top = await page.locator('dialog[open]').last().elementHandle()
      await page.keyboard.press('Escape')
      await top.waitForElementState('hidden')
    }
  }
  const checkLayout = async (name, widths = [320, 390, 768, 1440]) => {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
      await page.evaluate(() => document.fonts.ready)
      const geometry = await page.evaluate(() => {
        const modal = document.querySelector('dialog[open]')
        const box = modal?.getBoundingClientRect()
        return {
          fits: document.documentElement.scrollWidth <= innerWidth + 1,
          modalFits: !box || box.left >= -1 && box.right <= innerWidth + 1 && modal.scrollWidth <= modal.clientWidth + 1,
        }
      })
      assert.ok(geometry.fits && geometry.modalFits, `${name} fits ${width}px without horizontal scrolling`)
      if ([390, 1440].includes(width)) await page.screenshot({ path: `${output}${name}-${width}.png`, animations: 'disabled' })
    }
  }

  await go('/login')
  await page.getByLabel('Email Address', { exact: true }).fill(DEMO_CREDENTIALS.email)
  await page.getByLabel('Password', { exact: true }).fill(DEMO_CREDENTIALS.password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(`${origin}/dashboard`)
  await go('/events')
  await page.getByRole('heading', { name: 'Events & Opportunities', exact: true, level: 1 }).waitFor()

  // Bookmarks are separate from registration, and can be revisited or removed.
  assert.equal(await button('Transmissions').count(), 0)
  assert.equal(await details('October Community Transmission').count(), 0)
  await button('Filters').click()
  assert.equal(await page.getByLabel('Category', { exact: true }).getByRole('option', { name: 'Announcement', exact: true }).count(), 0)
  await button('Filters').click()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const discoveryTop = await page.locator('.events-discovery-toolbar').evaluate((element) => element.getBoundingClientRect().top + scrollY)
  await button('Save event: Customer Discovery Masterclass').click()
  await checkSaveToast(/Saved Events/i)
  assert.equal(await saveToast().evaluate((element) => getComputedStyle(element).animationName), 'events-save-toast-in', 'Save notification animates into view')
  assert.equal(await page.locator('.events-discovery-toolbar').evaluate((element) => element.getBoundingClientRect().top + scrollY), discoveryTop, 'Saving does not push the discovery controls down')
  await page.screenshot({ path: `${output}save-toast-main-1440.png` })
  await page.setViewportSize({ width: 390, height: 844 })
  await checkSaveToast(/Saved Events/i)
  await page.screenshot({ path: `${output}save-toast-main-390.png` })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.locator('.events-save-toast--exiting').waitFor()
  assert.equal(await saveToast().evaluate((element) => getComputedStyle(element).animationName), 'events-save-toast-out', 'Save notification animates away before dismissal')
  await saveToast().waitFor({ state: 'hidden', timeout: 6000 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await button('Saved Events (1)').click()
  await dialog('Saved Events').waitFor()
  await details('Customer Discovery Masterclass').waitFor()
  assert.equal(await dialog('Saved Events').locator('.events-list-row').count(), 1)
  await page.reload()
  await details('Customer Discovery Masterclass').click()
  const savedWorkshop = dialog('Customer Discovery Masterclass')
  await savedWorkshop.getByRole('button', { name: 'Remove saved event: Customer Discovery Masterclass', exact: true }).click()
  await checkSaveToast(/Removed from Saved Events/i)
  assert.equal(await saveToast().evaluate((element) => getComputedStyle(element).animationName), 'none', 'Reduced motion preference suppresses toast animation')
  await page.waitForTimeout(1600)
  await savedWorkshop.getByRole('button', { name: 'Save event: Customer Discovery Masterclass', exact: true }).click()
  await checkSaveToast(/Saved Events/i)
  await page.screenshot({ path: `${output}save-toast-popup-1440.png` })
  await page.waitForTimeout(1600)
  assert.equal(await saveToast().isVisible(), true, 'Saving again restarts the toast lifetime instead of using the previous expiry')
  await page.setViewportSize({ width: 390, height: 844 })
  await checkSaveToast(/Saved Events/i)
  await page.screenshot({ path: `${output}save-toast-popup-390.png` })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await saveToast().waitFor({ state: 'hidden', timeout: 6000 })
  await savedWorkshop.getByRole('button', { name: 'Remove saved event: Customer Discovery Masterclass', exact: true }).waitFor()
  await closeDialog()

  await go('/events')
  await page.getByLabel('Search events', { exact: true }).fill('Climate Sprint')
  await button('Save event: Climate Sprint: Cohort Full').click()
  await page.getByLabel('Search events', { exact: true }).fill('')
  await button('Saved Events (2)').click()
  await details('Climate Sprint: Cohort Full').waitFor()
  await checkLayout('saved-broadcasts')

  // Storage failure leaves the bookmark and count intact until a successful retry.
  await page.evaluate(() => {
    window.__eventSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('labx.demo.events.v1:')) throw new DOMException('Storage is full', 'QuotaExceededError')
      return window.__eventSetItem.call(this, key, value)
    }
  })
  await button('Remove saved event: Climate Sprint: Cohort Full').click()
  await dialog('Saved Events').getByRole('alert').filter({ hasText: 'Unable to save in this browser' }).waitFor()
  assert.equal(await dialog('Saved Events').locator('.events-list-row').count(), 2)
  await button('Remove saved event: Climate Sprint: Cohort Full').waitFor()
  await page.evaluate(() => { Storage.prototype.setItem = window.__eventSetItem; delete window.__eventSetItem })
  await button('Remove saved event: Climate Sprint: Cohort Full').click()
  assert.equal(await dialog('Saved Events').locator('.events-list-row').count(), 1)
  assert.equal(await dialog('Saved Events').getByRole('button', { name: 'View details: Climate Sprint: Cohort Full', exact: true }).count(), 0)
  await closeDialog()
  await button('Past Events').click()
  await button('Save event: Pitch Practice: October Edition').click()
  await closeDialog()
  await button('Saved Events (2)').click()
  await details('Pitch Practice: October Edition').waitFor()
  await details('Customer Discovery Masterclass').waitFor()
  await page.reload()
  await dialog('Saved Events').waitFor()
  await closeDialog()
  await button('My Events (0)').click()
  await page.getByRole('heading', { name: 'No registrations match this view', exact: true }).waitFor()
  await go('/events')

  await button('Filters').click()
  await checkLayout('discovery-filters')
  await page.getByLabel('Starts from', { exact: true }).fill('2026-10-24')
  await page.getByLabel('Starts by', { exact: true }).fill('2026-10-24')
  await button('Filters').click()
  await details('Mentor Exchange Circle').waitFor()
  await button('Filters').click()
  await page.getByLabel('Eligibility', { exact: true }).selectOption('eligible')
  await button('Filters').click()
  await page.getByRole('heading', { name: 'No events found', exact: true }).waitFor()
  await button('Filters').click()
  await page.getByLabel('Starts from', { exact: true }).fill('2026-10-18')
  await page.getByLabel('Starts by', { exact: true }).fill('2026-10-20')
  await button('Filters').click()
  await details('Customer Discovery Masterclass').waitFor()
  await details('Build for Impact Hackathon').waitFor()
  await button('Filters').click()
  await page.getByLabel('Sponsorship', { exact: true }).selectOption('sponsored')
  await button('Filters').click()
  assert.equal(await details('Customer Discovery Masterclass').count(), 0)
  await details('Build for Impact Hackathon').waitFor()
  await button('Filters').click()
  await page.getByLabel('Prizes & benefits', { exact: true }).selectOption('with-prizes')
  await page.getByLabel('Fee', { exact: true }).selectOption('free')
  await page.getByLabel('Location', { exact: true }).selectOption('Bengaluru')
  await button('Filters').click()
  await details('Build for Impact Hackathon').waitFor()

  // Opening an external application creates only a pending tracker entry.
  await go('/events')
  await page.getByLabel('Search events', { exact: true }).fill('Launchpad Accelerator Preview')
  await details('Launchpad Accelerator Preview').click()
  await dialog('Launchpad Accelerator Preview').getByRole('button', { name: 'Register externally', exact: true }).click()
  const external = dialog('External registration')
  await external.waitFor()
  assert.equal(await external.locator('.events-required').evaluate((star) => getComputedStyle(star).color), 'rgb(255, 0, 0)', 'Mandatory fields use the requested red star')
  assert.equal(await external.getByRole('button', { name: 'Save external confirmation', exact: true }).isDisabled(), true, 'A preview cannot confirm registration without a reference')
  const outbound = external.getByRole('link', { name: /^Open External Link/ })
  assert.equal(await outbound.getAttribute('href'), 'https://example.org/?labx-demo=accelerator')
  assert.equal(await outbound.getAttribute('target'), '_blank')
  assert.deepEqual(externalRequests, [], 'Preparing external registration does not open the organizer automatically')
  await closeDialog()
  await go('/events?view=my')
  await details('Launchpad Accelerator Preview').waitFor()
  await page.getByText('Registration pending', { exact: true }).waitFor()
  await page.reload()
  await details('Launchpad Accelerator Preview').click()
  await dialog('Launchpad Accelerator Preview').getByRole('button', { name: 'Continue registration', exact: true }).click()
  await external.getByLabel('Confirmation reference', { exact: true }).fill('PREVIEW-ACCELERATOR-142')
  await external.getByRole('button', { name: 'Save external confirmation', exact: true }).click()
  const accelerator = dialog('Launchpad Accelerator Preview')
  await accelerator.getByText(/self.reported/i).first().waitFor()
  await closeDialog()
  await page.reload()
  await details('Launchpad Accelerator Preview').click()
  await accelerator.getByText('PREVIEW-ACCELERATOR-142', { exact: true }).waitFor()
  await closeDialog()

  // A paid example offers a validated preview link and never charges or fetches.
  await go('/events')
  await button('Filters').click()
  await page.getByLabel('Fee', { exact: true }).selectOption('paid')
  await button('Filters').click()
  await details('From Research to Product Decisions').click()
  const training = dialog('From Research to Product Decisions')
  await training.getByText(/499/).first().waitFor()
  await training.getByRole('button', { name: 'Register externally', exact: true }).click()
  const payment = external.getByRole('link', { name: /^Open payment preview/ })
  assert.equal(await payment.getAttribute('href'), 'https://example.org/?labx-demo=payment')
  assert.equal(await payment.getAttribute('target'), '_blank')
  assert.deepEqual(externalRequests, [], 'Paid preview requires an explicit outbound link action')
  await closeDialog()

  // Register internally before the event, then advance into its actual schedule.
  await go('/events')
  await page.getByLabel('Search events', { exact: true }).fill('Customer Discovery Masterclass')
  await details('Customer Discovery Masterclass').click()
  await dialog('Customer Discovery Masterclass').getByRole('button', { name: 'Register', exact: true }).click()
  await dialog('Confirm registration').getByRole('button', { name: 'Confirm registration', exact: true }).click()
  await dialog('Customer Discovery Masterclass').getByRole('status').filter({ hasText: 'Your event is saved in My Events.' }).waitFor()
  await closeDialog()
  await page.clock.setFixedTime(new Date('2026-10-18T05:15:00Z'))
  await go('/events?view=my')
  await page.getByLabel('My Events period', { exact: true }).selectOption('ongoing')
  await details('Customer Discovery Masterclass').click()
  const workshop = dialog('Customer Discovery Masterclass')
  await workshop.getByRole('button', { name: 'Record participation', exact: true }).click()
  const participation = dialog('Record participation')
  await participation.getByLabel('Participation', { exact: true }).selectOption('attended')
  const originalNotes = 'Attended the workshop, practiced customer interviews and created a plan for five discovery conversations.'
  await participation.getByLabel('Notes', { exact: true }).fill(originalNotes)
  await participation.getByLabel('Award / result (optional)', { exact: true }).fill('Completed the customer interview exercise')
  await participation.getByLabel('Certificate (optional)', { exact: true }).setInputFiles({
    name: 'customer-discovery-certificate.pdf', mimeType: 'application/pdf', buffer: certificate,
  })
  await participation.getByLabel('Rating (optional)', { exact: true }).selectOption('5')
  await participation.getByLabel('Feedback (optional)', { exact: true }).fill('The paired practice made the interview questions clearer.')
  await checkLayout('record-participation')
  await participation.getByRole('button', { name: 'Save participation', exact: true }).click()
  await workshop.getByText(originalNotes, { exact: true }).waitFor()
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin })
  await workshop.getByRole('button', { name: 'Copy participation summary', exact: true }).click()
  await workshop.getByRole('status').filter({ hasText: 'Participation summary copied' }).waitFor()
  const copiedSummary = await page.evaluate(() => navigator.clipboard.readText())
  assert.ok(copiedSummary.includes('Customer Discovery Masterclass') && copiedSummary.includes(originalNotes))
  assert.ok(copiedSummary.includes('Completed the customer interview exercise'))
  assert.equal(copiedSummary.includes('The paired practice made the interview questions clearer.'), false, 'Sharing omits private feedback')
  assert.equal(copiedSummary.includes('data:application/pdf'), false, 'Sharing omits certificate bytes')
  const downloadLink = workshop.getByRole('link', { name: /^Download certificate/ })
  const downloadReady = page.waitForEvent('download')
  await downloadLink.click()
  const download = await downloadReady
  assert.equal(download.suggestedFilename(), 'customer-discovery-certificate.pdf')
  assert.deepEqual(await readFile(await download.path()), certificate, 'Saved certificate download preserves uploaded bytes')

  // Editing preserves the attachment and the completed state survives refresh.
  await workshop.getByRole('button', { name: 'Edit participation', exact: true }).click()
  const editedNotes = `${originalNotes} Follow-up interviews are now scheduled.`
  const edit = dialog('Edit participation')
  await edit.getByLabel('Notes', { exact: true }).fill(editedNotes)
  await edit.getByRole('button', { name: 'Save participation', exact: true }).click()
  await workshop.getByText(editedNotes, { exact: true }).waitFor()
  await closeDialog()
  await button('Completed').click()
  await details('Customer Discovery Masterclass').waitFor()
  assert.equal(await dialog('Completed participation').getByRole('button', { name: 'View details: Launchpad Accelerator Preview', exact: true }).count(), 0)

  await go('/events?view=saved')
  await button('Remove saved event: Customer Discovery Masterclass').click()
  await closeDialog()
  await button('Saved Events (1)').waitFor()
  await button('My Events (3)').click()
  await details('Customer Discovery Masterclass').click()
  await workshop.getByRole('heading', { name: 'Participation completed', exact: true }).waitFor()
  await closeDialog()
  await page.reload()
  await details('Customer Discovery Masterclass').click()
  await workshop.getByText(editedNotes, { exact: true }).waitFor()
  await workshop.getByRole('link', { name: /^Download certificate/ }).waitFor()
  await checkLayout('completed-outcome')
  await closeDialog()
  await go('/events?view=my')
  await page.getByLabel('My Events period', { exact: true }).selectOption('completed')
  await details('Customer Discovery Masterclass').waitFor()
  assert.equal(await details('Launchpad Accelerator Preview').count(), 0)

  assert.deepEqual(errors, [], 'No browser runtime errors')
  assert.deepEqual(httpErrors, [], 'No failed local assets')
  assert.deepEqual(backendRequests, [], 'Frontend workflows do not call a backend')
  assert.deepEqual(externalRequests, [], 'Previewing and tracking do not contact external organizers or payment services')
  console.log('Events discovery, external confirmation and participation workflow passed.')
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: `${output}failure.png`, fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
