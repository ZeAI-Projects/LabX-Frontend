import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../', import.meta.url))
const origin = 'http://127.0.0.1:5192'
const executablePath = process.env.LABX_BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
const server = await preview({ root, envDir: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 5192, strictPort: true } })
let browser

try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' })
  const externalRequests = []
  const backendRequests = []
  const runtimeErrors = []
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
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  await page.goto(`${origin}/login`)
  await page.getByLabel('Email Address', { exact: true }).fill('founder@labx.demo')
  await page.getByLabel('Password', { exact: true }).fill('Demo1234!')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/dashboard')
  await page.goto(`${origin}/roadmap/demo/demo-roadmap-happora`)
  await page.getByRole('region', { name: 'Happora roadmap journey' }).waitFor()
  assert.equal(await page.locator('.rmj-level-node').count(), 25)
  assert.equal(await page.locator('.rmj-stage-step').count(), 5)
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap progress' }).getAttribute('aria-valuenow'), '0')
  assert.equal(await page.getByRole('button', { name: 'Stage 1, Level 1: Problem focus, current' }).getAttribute('aria-pressed'), 'true')
  assert.equal(await page.locator('.rmj-companion-card').count(), 0, 'The roadmap has no AI companion panel')
  assert.equal(await page.locator('.rmj-project-title h2').innerText(), 'Happora Roadmap', 'The journey header includes the project and roadmap')
  assert.equal(await page.locator('.labx-navbar .labx-page-title').innerText(), 'Roadmap', 'The app header keeps the Roadmap section name')
  const growTab = page.getByRole('button', { name: /Stage 5: Grow/ })
  assert.equal(await growTab.isDisabled(), true, 'An unreached stage cannot be selected')

  const map = page.locator('.rmj-viewport')
  const headerTop = await page.locator('.rmj-header').evaluate((node) => node.getBoundingClientRect().top)
  await map.evaluate((node) => { node.scrollTop = node.scrollHeight / 3 })
  await page.waitForTimeout(80)
  assert.ok(await map.evaluate((node) => node.scrollTop > 0), 'The journey scrolls inside its own viewport')
  assert.equal(await page.locator('.rmj-header').evaluate((node) => node.getBoundingClientRect().top), headerTop, 'The progress header stays fixed')
  assert.equal(await page.locator('.app-shell__page').evaluate((node) => node.scrollTop), 0, 'The page itself does not scroll')
  await map.evaluate((node) => { node.scrollTop = node.scrollHeight })
  await page.getByRole('button', { name: /Stage 1: Discover/ }).click()
  const discoverNode = page.getByRole('button', { name: 'Stage 1, Level 1: Problem focus, current' })
  await page.waitForFunction((ariaLabel) => {
    const viewport = document.querySelector('.rmj-viewport')
    const node = [...document.querySelectorAll('.rmj-level-node')].find((entry) => entry.getAttribute('aria-label') === ariaLabel)
    if (!viewport || !node) return false
    const bounds = node.getBoundingClientRect()
    const viewportBounds = viewport.getBoundingClientRect()
    return bounds.top >= viewportBounds.top && bounds.bottom <= viewportBounds.bottom
  }, 'Stage 1, Level 1: Problem focus, current', { timeout: 5000 })
  const discoverNodeBox = await discoverNode.boundingBox()
  const mapBox = await map.boundingBox()
  assert.ok(discoverNodeBox.y > mapBox.y && discoverNodeBox.y < mapBox.y + mapBox.height, 'Selecting an unlocked stage scrolls to its first level')

  const notesByMission = [
    'We interviewed local customers about the problem, compared their existing workarounds, and documented the evidence for our next product decision.',
    'We spoke with users about their current workflow, captured common workarounds, and grouped observations into evidence-backed patterns.',
    'We compared the customer evidence to our assumptions and documented which need to address before shaping a solution.',
  ]
  const missionNames = ['Problem Identification', 'Problem Research', 'Problem Validation']
  await page.getByRole('button', { name: 'Stage 1, Level 1: Problem focus, current' }).click()
  const levelPage = page.locator('.rmj-mission-page')
  await levelPage.waitFor()
  assert.equal(await page.getByRole('dialog').count(), 0, 'Opening a level navigates to its mission page without a popup')
  for (let index = 0; index < missionNames.length; index += 1) {
    const tile = levelPage.locator('.rmj-mission-tile').filter({ has: page.getByText(missionNames[index], { exact: true }) })
    await tile.getByRole('button', { name: 'Open mission', exact: true }).click()
    const missionDialog = page.getByRole('dialog', { name: missionNames[index] })
    await missionDialog.waitFor()
    const dialogBox = await missionDialog.boundingBox()
    assert.ok(Math.abs((dialogBox.x + dialogBox.width / 2) - 960) < 2, 'The mission dialog is horizontally centered')
    assert.ok(Math.abs((dialogBox.y + dialogBox.height / 2) - 540) < 2, 'The mission dialog is vertically centered')
    await missionDialog.getByLabel('What did you work on?').fill(notesByMission[index])
    await missionDialog.getByLabel('Evidence link').fill(`https://example.com/happora-mission-${index + 1}`)
    await missionDialog.getByRole('button', { name: 'Complete mission' }).click()
    await missionDialog.waitFor({ state: 'hidden' })
  }
  await levelPage.getByRole('button', { name: 'Back to journey', exact: true }).click()
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap progress' }).getAttribute('aria-valuenow'), '3')
  assert.equal(await page.getByRole('button', { name: 'Stage 1, Level 2: Audience discovery, current' }).getAttribute('aria-pressed'), 'true')
  assert.equal(await page.locator('.rmj-level-stop.is-completed .rmj-level-node').count(), 1)
  assert.equal(await page.locator('.rmj-level-stop.is-completed .rmj-level-node').evaluate((node) => getComputedStyle(node).borderColor), 'rgb(179, 148, 241)', 'Completed levels use purple rather than green')
  await page.reload()
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap progress' }).getAttribute('aria-valuenow'), '3', 'Prototype mission progress persists in this browser')
  await page.goto(`${origin}/dashboard`)
  await page.locator('.labx-sidebar-nav').getByRole('link', { name: 'Roadmap' }).click()
  await page.waitForURL('**/roadmap/demo/demo-roadmap-happora')
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap progress' }).getAttribute('aria-valuenow'), '3', 'The Roadmap sidebar resumes the last opened roadmap')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${origin}/roadmap/demo/demo-roadmap-happora`)
  await page.getByRole('region', { name: 'Happora roadmap journey' }).waitFor()
  assert.equal(await page.locator('.rmj-level-node').count(), 25)
  assert.equal(await page.locator('.app-shell__page').evaluate((node) => node.scrollWidth > node.clientWidth), false, 'Mobile layout has no horizontal page overflow')
  assert.ok(await map.evaluate((node) => node.clientHeight > 0), 'Mobile layout retains an inline journey viewport')
  await page.locator('.rmj-level-node[aria-label$=", current"]').click()
  await page.locator('.rmj-mission-page').waitFor()
  assert.equal(await page.locator('.rmj-mission-tile').count(), 3, 'Mobile mission page keeps all three tiles available')
  assert.equal(await page.getByRole('dialog').count(), 0, 'Mobile level navigation is a page, not a popup')
  assert.equal(await page.locator('.app-shell__page').evaluate((node) => node.scrollWidth > node.clientWidth), false, 'Mission page has no mobile horizontal overflow')
  await page.goto(`${origin}/roadmap/demo/demo-roadmap-happora`)
  await page.evaluate(() => {
    const userId = JSON.parse(localStorage.getItem('labx.demo.session.v1')).userId
    const completedMissionIds = ['discover', 'validate', 'build', 'launch'].flatMap((stage) =>
      Array.from({ length: 5 }, (_, levelIndex) =>
        [1, 2, 3].map((missionNumber) => `${stage}-l${levelIndex + 1}-m${missionNumber}`)).flat())
    localStorage.setItem(`labx:roadmap-prototype:v1:${encodeURIComponent(userId)}:demo-roadmap-happora`, JSON.stringify({
      completedMissionIds,
      submissionsByMissionId: {},
    }))
  })
  await page.reload()
  await page.getByRole('region', { name: 'Happora roadmap journey' }).waitFor()
  const unlockedGrow = page.getByRole('button', { name: /Stage 5: Grow/ })
  assert.equal(await unlockedGrow.isDisabled(), false, 'Progress through Launch unlocks Grow stage navigation')
  await page.locator('.rmj-viewport').evaluate((node) => { node.scrollTop = 0 })
  await unlockedGrow.click()
  const growLevel = page.getByRole('button', { name: 'Stage 5, Level 1: Growth baseline, current' })
  await growLevel.waitFor()
  await page.waitForFunction((ariaLabel) => {
    const viewport = document.querySelector('.rmj-viewport')
    const node = [...document.querySelectorAll('.rmj-level-node')].find((entry) => entry.getAttribute('aria-label') === ariaLabel)
    if (!viewport || !node) return false
    const bounds = node.getBoundingClientRect()
    const viewportBounds = viewport.getBoundingClientRect()
    return bounds.top >= viewportBounds.top && bounds.bottom <= viewportBounds.bottom
  }, 'Stage 5, Level 1: Growth baseline, current', { timeout: 5000 })
  const growBox = await growLevel.boundingBox()
  const mobileMapBox = await page.locator('.rmj-viewport').boundingBox()
  assert.ok(growBox.y > mobileMapBox.y && growBox.y < mobileMapBox.y + mobileMapBox.height, 'Selecting Grow scrolls to Grow Level 1')
  assert.deepEqual(runtimeErrors, [])
  assert.deepEqual(backendRequests, [], 'The prototype does not call backend APIs')
  assert.deepEqual(externalRequests, [], 'The prototype does not depend on external assets or services')
  await context.close()
} finally {
  await browser?.close()
  await server.httpServer.close()
}
