import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = fileURLToPath(new URL('../test-results/profile/', import.meta.url))
const origin = 'http://127.0.0.1:5196'
const executablePath = process.env.LABX_BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
const password = 'ProfilePreview1!'
const founderEmail = 'profile-founder@example.com'
const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMQCsj7DwADGAHQEUfrBgAAAABJRU5ErkJggg==', 'base64')
const evidenceBytes = Buffer.from('%PDF-1.4\nSample founder portfolio evidence\n%%EOF')
await mkdir(output, { recursive: true })
const server = await preview({ root, envDir: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 5196, strictPort: true } })
let browser
let page

try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', timezoneId: 'Asia/Kolkata',
    acceptDownloads: true,
  })
  const runtimeErrors = []
  const assetErrors = []
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
    openedPage.on('response', (response) => { if (response.status() >= 400) assetErrors.push(`${response.status()} ${response.url()}`) })
  })
  page = await context.newPage()
  page.setDefaultTimeout(10000)
  await page.clock.setFixedTime(new Date('2026-10-20T05:00:00Z'))
  const go = (path) => page.goto(`${origin}${path}`)
  const button = (name) => page.getByRole('button', { name, exact: true })
  const dialog = (name) => page.getByRole('dialog', { name, exact: true })
  const edit = () => dialog('Edit profile')
  const closeDialog = async () => {
    await page.keyboard.press('Escape')
    await page.locator('dialog[open]').waitFor({ state: 'hidden' })
  }
  const signOut = async () => { await button('Sign out').click(); await page.waitForURL(`${origin}/login`) }
  const checkLayout = async (name, widths = [320, 390, 768, 1440]) => {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => { if (!document.querySelector('dialog[open]')) window.scrollTo(0, 0) })
      const geometry = await page.evaluate(() => {
        const modal = document.querySelector('dialog[open]')
        const box = modal?.getBoundingClientRect()
        return {
          fits: document.documentElement.scrollWidth <= innerWidth + 1,
          modalFits: !box || box.left >= -1 && box.right <= innerWidth + 1 && modal.scrollWidth <= modal.clientWidth + 1,
        }
      })
      assert.ok(geometry.fits && geometry.modalFits, `${name} fits ${width}px without horizontal overflow`)
      if ([390, 1440].includes(width)) await page.screenshot({ path: `${output}${name}-${width}.png`, animations: 'disabled' })
    }
  }
  const signUp = async ({ email, name, role = 'founder' }) => {
    await go(`/register?role=${role}`)
    await page.getByLabel('Full Name', { exact: true }).fill(name)
    await page.getByLabel('Email Address', { exact: true }).fill(email)
    await page.getByLabel('Role', { exact: true }).selectOption(role)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByLabel('Confirm Password', { exact: true }).fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${origin}/verify-email`)
    const code = (await page.getByTestId('demo-signup-code').innerText()).trim()
    await page.getByLabel('Six-digit code', { exact: true }).fill(code)
    await button('Verify email').click()
    await page.waitForURL(`${origin}${role === 'founder' ? '/roadmap/new' : `/onboarding/${role}`}`)
  }
  const signIn = async (email, pass = password) => {
    await go('/login')
    await page.getByLabel('Email Address', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(pass)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${origin}/dashboard`)
  }

  await go('/profile')
  await page.waitForURL(`${origin}/login`)
  await signUp({ email: founderEmail, name: 'Riley Builder' })
  await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Private Research Venture')
  await button('Start assessment').click()
  await page.waitForURL(/\/roadmap\/[^/]+\/assessment$/)
  await go('/profile')
  await button('Edit profile').waitFor()
  await checkLayout('founder-profile')

  // Identity and uploads are saved only after validation, then shared with the shell.
  await button('Edit profile').click()
  await edit().getByLabel('Display name', { exact: true }).fill('')
  await edit().getByRole('button', { name: 'Save profile', exact: true }).click()
  assert.equal(await edit().isVisible(), true, 'An empty display name cannot be saved')
  await edit().getByLabel('Display name', { exact: true }).fill('Riley Venture')
  await edit().getByLabel('Username', { exact: true }).fill('founder')
  await edit().getByRole('button', { name: 'Save profile', exact: true }).click()
  await edit().getByRole('alert').filter({ hasText: /username|taken|already/i }).waitFor()
  await edit().getByLabel('Username', { exact: true }).fill('riley_builds')
  await edit().getByLabel('Bio', { exact: true }).fill('Building practical tools with founders and their communities.')
  await edit().getByLabel('City', { exact: true }).fill('Bengaluru')
  await edit().getByLabel('Country', { exact: true }).fill('India')
  await edit().getByLabel('Profile photo', { exact: true }).setInputFiles({ name: 'profile-photo.png', mimeType: 'image/png', buffer: imageBytes })
  await edit().getByLabel('Profile banner', { exact: true }).setInputFiles({ name: 'profile-banner.png', mimeType: 'image/png', buffer: imageBytes })
  await checkLayout('edit-basics')

  await edit().getByRole('button', { name: 'Details', exact: true }).click()
  const privateGoal = 'Validate the private enterprise pilot before announcing the venture.'
  const publicEmail = 'riley.public@example.com'
  await edit().getByLabel('Skills (comma separated)', { exact: true }).fill('Research, Product design')
  await edit().getByLabel('Interests (comma separated)', { exact: true }).fill('Education, Accessible technology')
  await edit().getByLabel('Goals', { exact: true }).fill(privateGoal)
  await edit().getByLabel('Public contact email', { exact: true }).fill(publicEmail)
  await edit().getByLabel('Portfolio', { exact: true }).fill('https://example.com/riley-portfolio')
  await edit().getByRole('button', { name: 'Venture', exact: true }).click()
  await edit().getByLabel('Venture name', { exact: true }).fill('Research Ventures')
  await edit().getByLabel('Venture description', { exact: true }).fill('A founder-led research studio building practical learning tools.')
  await edit().getByRole('button', { name: 'Visibility', exact: true }).click()
  await edit().getByRole('checkbox', { name: 'Show public contact email on public profile', exact: true }).check()
  await edit().getByRole('checkbox', { name: 'Show goals on public profile', exact: true }).check()
  await edit().getByRole('checkbox', { name: 'Show projects on public profile', exact: true }).check()
  await edit().getByRole('button', { name: 'Save profile', exact: true }).click()
  await edit().waitFor({ state: 'hidden' })
  await page.getByRole('link', { name: 'Open profile for Riley Venture', exact: true }).waitFor()
  await page.reload()
  await page.getByRole('link', { name: 'Open profile for Riley Venture', exact: true }).waitFor()
  await page.getByText('@riley_builds', { exact: true }).first().waitFor()
  const uploadedImages = page.locator('img[src^="data:image/png;base64,"]')
  assert.ok(await uploadedImages.count() >= 2, 'Profile photo and banner survive a refresh')
  await uploadedImages.evaluateAll((images) => Promise.all(images.map((image) => image.decode())))
  assert.equal(await uploadedImages.evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)), true, 'Uploaded images decode correctly')

  // A second same-origin tab produces real storage events without replacing this page.
  const otherTab = await context.newPage()
  await otherTab.goto(`${origin}/login`)
  await page.bringToFront()
  await button('Public preview').click()
  const publicProfile = dialog('Public profile preview')
  await publicProfile.getByText(publicEmail, { exact: true }).waitFor()
  await publicProfile.getByText(privateGoal, { exact: true }).waitFor()
  await publicProfile.getByText('Private Research Venture', { exact: true }).waitFor()
  assert.equal(await publicProfile.getByText(founderEmail, { exact: true }).count(), 0, 'Account sign-in email is never a public contact by default')
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('dialog'))), true, 'Public preview traps keyboard focus')
  await otherTab.evaluate((email) => {
    const key = Object.keys(localStorage).find((item) => item.startsWith('labx:profile:v1:') && JSON.parse(localStorage.getItem(item))?.details?.public_email === email)
    if (!key) throw new Error('The profile fixture was not saved.')
    const saved = JSON.parse(localStorage.getItem(key))
    saved.details.privacy.public_email = false
    saved.details.privacy.goals = false
    localStorage.setItem(key, JSON.stringify(saved))
  }, publicEmail)
  await publicProfile.waitFor({ state: 'hidden' })
  await button('Public preview').click()
  for (const value of [publicEmail, privateGoal]) {
    assert.equal(await publicProfile.getByText(value, { exact: true }).count(), 0, 'A privacy change in another tab cannot leave stale public details visible')
  }
  await publicProfile.getByText('Private Research Venture', { exact: true }).waitFor()
  await closeDialog()
  await button('Manage visibility').click()
  await edit().getByRole('checkbox', { name: 'Show public contact email on public profile', exact: true }).uncheck()
  await edit().getByRole('checkbox', { name: 'Show goals on public profile', exact: true }).uncheck()
  await edit().getByRole('checkbox', { name: 'Show projects on public profile', exact: true }).uncheck()
  await edit().getByRole('button', { name: 'Save profile', exact: true }).click()
  await edit().waitFor({ state: 'hidden' })
  await button('Public preview').click()
  for (const value of [founderEmail, publicEmail, privateGoal, 'Private Research Venture']) {
    assert.equal(await publicProfile.getByText(value, { exact: true }).count(), 0, `${value} is omitted from the public preview`)
  }
  await checkLayout('private-public-preview')
  await closeDialog()

  // The optional passport can be saved incomplete; only a complete application submits.
  await button('Founder Passport').click()
  await button('Apply for Founder Passport').click()
  const application = dialog('Founder Passport application')
  await application.getByRole('button', { name: 'Submit application', exact: true }).click()
  assert.equal(await application.isVisible(), true, 'Required application data prevents an empty submission')
  await application.getByLabel('Linked project (optional)', { exact: true }).selectOption({ label: 'Private Research Venture' })
  await application.getByRole('button', { name: 'Save draft', exact: true }).click()
  await application.waitFor({ state: 'hidden' })
  await otherTab.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith('labx:projects:v1:') && JSON.parse(localStorage.getItem(item))?.projects?.some((project) => project.name === 'Private Research Venture'))
    if (!key) throw new Error('The linked project fixture was not saved.')
    const saved = JSON.parse(localStorage.getItem(key))
    saved.projects = saved.projects.filter((project) => project.name !== 'Private Research Venture')
    localStorage.setItem(key, JSON.stringify(saved))
  })
  await button('Overview').click()
  await page.getByRole('heading', { name: 'No projects to display', exact: true }).waitFor()
  await otherTab.close()
  await page.bringToFront()
  await button('Founder Passport').click()
  await button('Continue draft').click()
  assert.equal(await application.getByLabel('Linked project (optional)', { exact: true }).inputValue(), '', 'A deleted project is cleared when reopening a saved application')
  assert.equal(await application.getByRole('option', { name: 'Private Research Venture', exact: true }).count(), 0)
  await application.getByLabel('Legal name', { exact: true }).fill('Riley Venture')
  await application.getByLabel('Contact email', { exact: true }).fill(founderEmail)
  await application.getByLabel('City', { exact: true }).fill('Bengaluru')
  await application.getByLabel('Country', { exact: true }).fill('India')
  await application.getByLabel('Venture name', { exact: true }).fill('Research Ventures')
  await application.getByLabel('Founder role', { exact: true }).fill('Co-founder and product lead')
  const founderStory = 'I co-founded Research Ventures to help small teams test practical learning tools. We interviewed prospective users, documented their unmet needs, and built an early prototype. I lead product research, coordinate the team, and organize our next validation studies.'
  await application.getByLabel('Founder story', { exact: true }).fill(founderStory)
  await application.getByLabel('Portfolio / evidence link (optional)', { exact: true }).fill('https://example.com/riley-portfolio')
  await application.getByLabel('Supporting evidence', { exact: true }).setInputFiles({
    name: 'founder-evidence.pdf', mimeType: 'application/pdf', buffer: evidenceBytes,
  })
  await application.getByRole('checkbox', { name: 'I confirm these details and supporting files are mine to submit.', exact: true }).check()
  await checkLayout('passport-application')
  await application.getByRole('button', { name: 'Submit application', exact: true }).click()
  await application.waitFor({ state: 'hidden' })

  const simulator = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Demo review simulator' }) })
  const openSimulator = async () => {
    if (!await simulator.evaluate((node) => node.open)) await simulator.locator('summary').click()
  }
  const review = async (action, feedback) => {
    await openSimulator()
    if (feedback !== undefined) await simulator.getByLabel('Review feedback', { exact: true }).fill(feedback)
    await simulator.getByRole('button', { name: action, exact: true }).click()
  }
  await review('Start review')
  await review('Request more information')
  await simulator.getByRole('alert').filter({ hasText: /required/i }).waitFor()
  const moreInfo = 'Please expand your explanation of the founder responsibilities and validation work.'
  await review('Request more information', moreInfo)
  await page.getByText(moreInfo, { exact: true }).first().waitFor()
  await button('Update application').click()
  const revisedStory = `${founderStory} I also manage customer interviews and document our validation results.`
  await application.getByLabel('Founder story', { exact: true }).fill(revisedStory)
  await application.getByRole('button', { name: 'Resubmit application', exact: true }).click()
  await application.waitFor({ state: 'hidden' })
  await review('Start review')
  await review('Mark eligible', 'The sample application is complete and ready for the optional interview.')
  await openSimulator()
  await simulator.getByLabel('Interview date and time', { exact: true }).fill('2026-10-21T14:00')
  await simulator.getByLabel('Interview location', { exact: true }).fill('Local demo interview room')
  await simulator.getByRole('button', { name: 'Schedule interview', exact: true }).click()
  await openSimulator()
  await simulator.getByLabel('Interview outcome', { exact: true }).fill('The founder explained the prototype and next validation steps clearly.')
  await simulator.getByRole('button', { name: 'Record interview outcome', exact: true }).click()
  await review('Approve application', 'Sample review completed successfully.')
  await page.getByText(/approved/i).first().waitFor()
  await checkLayout('passport-approved')
  await page.reload()
  await button('Founder Passport').click()
  const submittedDetails = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'View submitted details' }) })
  await submittedDetails.locator('summary').click()
  const downloadReady = page.waitForEvent('download')
  await submittedDetails.getByRole('link', { name: 'Download evidence: founder-evidence.pdf', exact: true }).click()
  const evidenceDownload = await downloadReady
  assert.equal(evidenceDownload.suggestedFilename(), 'founder-evidence.pdf')
  assert.deepEqual(await readFile(await evidenceDownload.path()), evidenceBytes, 'Submitted evidence persists and downloads with identical bytes')
  await openSimulator()
  await simulator.getByRole('button', { name: 'Mark renewal due', exact: true }).waitFor()

  // Renewal follows the same review process, including a reasoned rejection and retry.
  await review('Mark renewal due')
  await button('Start renewal').click()
  await application.waitFor()
  await application.getByRole('checkbox', { name: 'I confirm these details and supporting files are mine to submit.', exact: true }).check()
  await application.getByRole('button', { name: 'Submit application', exact: true }).click()
  await application.waitFor({ state: 'hidden' })
  await review('Start review')
  const rejection = 'Please clarify the updated venture responsibilities before the next review.'
  await review('Reject application', rejection)
  await page.getByText(rejection, { exact: true }).first().waitFor()
  await button('Revise and resubmit').click()
  await application.getByLabel('Founder story', { exact: true }).fill(`${revisedStory} The renewal includes updated responsibilities and a refreshed team plan.`)
  await application.getByRole('button', { name: 'Resubmit application', exact: true }).click()
  await application.waitFor({ state: 'hidden' })
  await review('Start review')
  await review('Mark eligible', 'Revised sample details are complete.')
  await review('Approve application', 'Optional interview skipped for this sample renewal.')
  await openSimulator()
  await simulator.getByRole('button', { name: 'Mark renewal due', exact: true }).waitFor()

  // A separate founder has no access to this profile's dossier or application.
  await signOut()
  await signUp({ email: 'profile-other@example.com', name: 'Other Founder' })
  await go('/profile')
  await button('Edit profile').click()
  assert.equal(await edit().getByLabel('Display name', { exact: true }).inputValue(), 'Other Founder')
  assert.equal(await edit().getByLabel('Bio', { exact: true }).inputValue(), '')
  await closeDialog()
  await button('Founder Passport').click()
  await button('Apply for Founder Passport').waitFor()
  assert.equal(await page.getByText('founder-evidence.pdf', { exact: true }).count(), 0)
  await signOut()
  await signUp({ email: 'profile-mentor@example.com', name: 'Morgan Mentor', role: 'mentor' })
  await go('/profile')
  await button('Edit profile').waitFor()
  assert.equal(await button('Founder Passport').count(), 0, 'Mentor profiles cannot open founder applications')
  assert.equal(await button('Apply for Founder Passport').count(), 0)
  await checkLayout('mentor-profile', [390, 1440])
  await signOut()
  await signIn(founderEmail)
  await go('/profile')
  await page.getByRole('link', { name: 'Open profile for Riley Venture', exact: true }).waitFor()
  await button('Founder Passport').click()
  await openSimulator()
  await simulator.getByRole('button', { name: 'Mark renewal due', exact: true }).waitFor()

  assert.deepEqual(runtimeErrors, [], 'No browser runtime errors')
  assert.deepEqual(assetErrors, [], 'No missing local assets')
  assert.deepEqual(backendRequests, [], 'Profile and passport preview stay local')
  assert.deepEqual(externalRequests, [], 'Uploads, previews and simulated reviews do not contact external services')
  console.log('Profile identity, privacy, passport review and responsive checks passed.')
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: `${output}failure.png`, fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
