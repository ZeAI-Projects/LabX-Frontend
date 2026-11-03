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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
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

  const nodes = page.locator('.rmj-level-node')
  const map = page.locator('.rmj-mountain-viewport')
  const assertFixedMap = async () => {
    assert.equal(await nodes.count(), 5, `Only the selected stage’s five levels are rendered (${page.url()})`)
    const dimensions = await map.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowY: getComputedStyle(element).overflowY,
    }))
    assert.ok(dimensions.scrollHeight <= dimensions.clientHeight + 1, 'The mountain has no vertical scrolling')
    assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 1, 'The mountain has no horizontal scrolling')
    assert.equal(dimensions.overflowY, 'hidden')
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), true, 'The roadmap page itself does not scroll')
  }
  const completeMission = async (missionNumber) => {
    const open = page.getByRole('button', { name: 'Open mission', exact: true })
    await open.click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    await dialog.getByLabel('What did you work on?').fill(`We interviewed local customers, examined their workarounds, and documented evidence to validate the problem and guide our next experiment. Mission ${missionNumber}.`)
    await dialog.getByLabel('Evidence link').fill(`https://example.com/happora-mission-${missionNumber}`)
    await dialog.getByRole('button', { name: 'Complete mission' }).click()
    await dialog.waitFor({ state: 'hidden' })
  }

  assert.equal(await nodes.count(), 5)
  assert.equal(await page.locator('.rmj-stage-step').count(), 5)
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap progress' }).getAttribute('aria-valuenow'), '0')
  assert.equal(await page.locator('.rmj-companion-card').count(), 0, 'The roadmap has no AI companion panel')
  assert.equal(await page.locator('.rmj-project-title h2').innerText(), 'Happora Roadmap')
  assert.equal(await page.getByRole('button', { name: /Stage 5: Grow/ }).isDisabled(), true)
  await assertFixedMap()

  await page.getByRole('button', { name: 'Stage 1, Level 2: Audience discovery, locked' }).click()
  assert.equal(await page.locator('.rmj-level-card:visible').count(), 1, 'Selecting one level shows one information card')
  assert.equal(await page.locator('.rmj-level-card:visible .rmj-launch-button').isDisabled(), true, 'Locked levels cannot be launched')
  assert.equal(await page.locator('.rmj-mission-page').count(), 0)
  await page.getByRole('button', { name: 'Stage 1, Level 1: Problem focus, current' }).click()
  await page.getByRole('button', { name: 'Enter Level', exact: true }).click()
  const levelPage = page.locator('.rmj-mission-page')
  await levelPage.waitFor()
  assert.deepEqual(await page.locator('.rmj-mission-tile .rmj-mission-state').allTextContents(), ['Ready to begin', 'Locked', 'Locked'])
  assert.equal(await page.getByRole('button', { name: 'Open mission', exact: true }).count(), 1, 'Only Mission 1 is available initially')
  await completeMission(1)
  assert.deepEqual(await page.locator('.rmj-mission-tile .rmj-mission-state').allTextContents(), ['Completed', 'Ready to begin', 'Locked'])
  await completeMission(2)
  assert.deepEqual(await page.locator('.rmj-mission-tile .rmj-mission-state').allTextContents(), ['Completed', 'Completed', 'Ready to begin'])
  await completeMission(3)
  assert.deepEqual(await page.locator('.rmj-mission-tile .rmj-mission-state').allTextContents(), ['Completed', 'Completed', 'Completed'])
  await levelPage.getByRole('button', { name: 'Back to journey', exact: true }).click()
  await assertFixedMap()
  assert.equal(await page.getByRole('button', { name: 'Stage 1, Level 2: Audience discovery, current' }).getAttribute('aria-pressed'), 'true')
  assert.equal(await page.locator('.rmj-stage-step.is-selected').getAttribute('aria-label'), 'Stage 1: Discover, 1 of 5 levels complete')
  assert.equal(await page.locator('.rmj-level-stop.is-completed .rmj-level-node').count(), 1)
  assert.equal(await page.locator('.rmj-level-stop.is-completed .rmj-level-node').evaluate((node) => getComputedStyle(node).borderColor), 'rgb(98, 221, 242)', 'Completed levels use cyan')
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap progress' }).getAttribute('aria-valuenow'), '3')
  await page.reload()
  await page.getByRole('region', { name: 'Happora roadmap journey' }).waitFor()
  await assertFixedMap()
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap progress' }).getAttribute('aria-valuenow'), '3', 'Prototype mission progress persists')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('region', { name: 'Happora roadmap journey' }).waitFor()
  await assertFixedMap()
  const mobileCard = page.locator('.rmj-level-card--mobile')
  assert.equal(await mobileCard.isVisible(), true, 'The compact card remains visible on small screens')
  const mapBounds = await map.boundingBox()
  const nodeBounds = await nodes.evaluateAll((elements) => elements.map((node) => {
    const bounds = node.getBoundingClientRect()
    return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom }
  }))
  assert.ok(nodeBounds.every((bounds) => bounds.left >= mapBounds.x && bounds.right <= mapBounds.x + mapBounds.width
    && bounds.top >= mapBounds.y && bounds.bottom <= mapBounds.y + mapBounds.height), 'All five mobile level nodes remain within the map')
  await mobileCard.getByRole('button', { name: 'Enter Level', exact: true }).click()
  await page.locator('.rmj-mission-page').waitFor()
  assert.equal(await page.locator('.rmj-mission-tile').count(), 3)

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
  await page.getByRole('region', { name: 'Grow stage mountain roadmap' }).waitFor()
  assert.equal(await page.getByRole('button', { name: /Stage 5: Grow/ }).isDisabled(), false, 'Completing Launch unlocks Grow')
  await assertFixedMap()
  await page.getByRole('button', { name: /Stage 1: Discover/ }).click()
  await page.getByRole('region', { name: 'Discover stage mountain roadmap' }).waitFor()
  await assertFixedMap()
  assert.equal(await page.locator('.rmj-level-stop.is-completed').count(), 5, 'Completed stages remain selectable for review')
  await page.getByRole('button', { name: /Stage 5: Grow/ }).click()
  await page.getByRole('region', { name: 'Grow stage mountain roadmap' }).waitFor()
  await assertFixedMap()
  assert.equal(await page.locator('.rmj-mountain-canvas.is-premium').count(), 1, 'Grow uses the premium summit treatment')

  assert.deepEqual(runtimeErrors, [])
  assert.deepEqual(backendRequests, [], 'The prototype does not call backend APIs')
  assert.deepEqual(externalRequests, [], 'The prototype does not depend on external assets or services')
  await context.close()
} finally {
  await browser?.close()
  await server.httpServer.close()
}
