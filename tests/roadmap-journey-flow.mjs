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
  await page.goto(`${origin}/roadmap/demo/demo-roadmap-aurora-materials`)
  await page.getByRole('region', { name: 'Aurora Materials roadmap journey' }).waitFor()
  assert.equal(await page.locator('.rmj-level-node').count(), 5, 'Joined mock roadmaps open the full interactive mountain journey')
  assert.equal(await page.getByRole('link', { name: 'All roadmaps' }).getAttribute('href'), '/roadmap?view=joined', 'Joined mock journeys return to the Joined roadmaps collection')
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
    const open = page.locator('.rmj-mission-tile.is-clickable').filter({ hasText: 'Ready to begin' }).first()
    await open.click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    const content = dialog.locator('.rmj-mock-mission-content')
    const notesField = dialog.getByLabel('What did you work on?')
    assert.equal(await content.evaluate((element) => getComputedStyle(element).overflowY), 'auto', 'Mission dialog content remains scrollable')
    assert.equal(await content.evaluate((element) => getComputedStyle(element).scrollbarWidth), 'none', 'Mission dialog scrolling has no visible scrollbar')
    assert.ok(parseFloat(await notesField.evaluate((element) => getComputedStyle(element).minHeight)) >= 110, 'Work field has a larger writing area')
    assert.ok((await dialog.boundingBox()).width >= 850, 'Mission dialog is wider on desktop')
    await notesField.fill(`We interviewed local customers, examined their workarounds, and documented evidence to validate the problem and guide our next experiment. Mission ${missionNumber}.`)
    await dialog.locator('input[type="file"]').setInputFiles({
      name: `happora-mission-${missionNumber}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from(`Evidence for mission ${missionNumber}.`),
    })
    await dialog.getByRole('button', { name: 'Complete mission' }).click()
    await page.waitForTimeout(250)
    if (await dialog.locator('.rmj-mock-error').count()) throw new Error(await dialog.locator('.rmj-mock-error').innerText())
    const close = dialog.getByRole('button', { name: 'Close mission', exact: true })
    if (await close.isVisible()) await close.click()
    await dialog.waitFor({ state: 'hidden' })
  }

  assert.equal(await nodes.count(), 5)
  assert.equal(await page.locator('.rmj-stage-step').count(), 5)
  assert.equal(await page.locator('.rmj-progress-summary').count(), 0, 'Roadmap progress summary is removed')
  assert.equal(await page.locator('.rmj-companion-card').count(), 0, 'The roadmap has no AI companion panel')
  assert.equal(await page.locator('.rmj-project-title h2').innerText(), 'Happora')
  const lockedStage = page.getByRole('button', { name: /Stage 5: Grow/ })
  assert.equal(await lockedStage.isDisabled(), false, 'Locked stages remain selectable for feedback')
  assert.equal(await page.locator('.rmj-stage-heading').count(), 0, 'The redundant roadmap stages heading is removed')
  assert.equal(await page.locator('.rmj-stage-step').first().evaluate((element) => getComputedStyle(element, '::after').content), 'none', 'Stage selection has no underline')
  const teamButton = page.getByRole('button', { name: 'Manage team', exact: true })
  await teamButton.waitFor()
  assert.equal(await teamButton.innerText(), '', 'Manage team is represented by its icon only')
  assert.equal(await page.locator('.rmj-operations').count(), 0, 'Review actions are not inserted into the roadmap layout')
  const founderReview = page.getByRole('button', { name: /Review and Approve/ })
  await founderReview.waitFor()
  await founderReview.click()
  const emptyReviewQueue = page.getByRole('dialog', { name: 'Review and Approve' })
  await emptyReviewQueue.getByText('There are no member submissions waiting for review.').waitFor()
  await emptyReviewQueue.getByRole('button', { name: 'Close review queue' }).click()
  await emptyReviewQueue.waitFor({ state: 'hidden' })
  await teamButton.click()
  const teamDialog = page.getByRole('dialog', { name: 'Roadmap team' })
  await teamDialog.waitFor()
  await page.getByLabel('Username', { exact: true }).fill('@team-mate')
  await teamDialog.getByRole('button', { name: 'Invite', exact: true }).click()
  await page.getByRole('status').getByText('Sample invitation saved for this roadmap in this browser.').waitFor()
  await teamDialog.getByText('@team-mate', { exact: false }).waitFor()
  await teamDialog.getByText('Publish a post or review incoming join requests', { exact: true }).click()
  await page.getByLabel('Opportunity title').fill('Customer research partner')
  await page.getByLabel('Role or contribution').fill('Interview prospective users')
  await page.getByLabel('Skills or experience').fill('User research')
  await page.getByLabel('Description').fill('Help validate the early customer problem.')
  await page.getByRole('button', { name: 'Publish opportunity', exact: true }).click()
  await page.getByRole('status').getByText('Opportunity saved for this roadmap in this browser.').waitFor()
  await teamDialog.getByText('Customer research partner', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Close roadmap team' }).click()
  await teamDialog.waitFor({ state: 'hidden' })
  await page.goto(`${origin}/roadmap/demo/demo-roadmap-circuit-school`)
  await page.getByRole('region', { name: 'Circuit School roadmap journey' }).waitFor()
  await page.getByRole('button', { name: 'Manage team', exact: true }).click()
  const otherRoadmapTeam = page.getByRole('dialog', { name: 'Roadmap team' })
  await otherRoadmapTeam.waitFor()
  await otherRoadmapTeam.getByText('Publish a post or review incoming join requests', { exact: true }).click()
  await otherRoadmapTeam.getByText('No invitations for this roadmap yet.').waitFor()
  await otherRoadmapTeam.getByText('No opportunities for this roadmap yet.').waitFor()
  await page.getByRole('button', { name: 'Close roadmap team' }).click()
  await otherRoadmapTeam.waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: /Review and Approve/ }).click()
  const mockReviewQueue = page.getByRole('dialog', { name: 'Review and Approve' })
  await mockReviewQueue.getByText('Submitted by', { exact: true }).waitFor()
  await mockReviewQueue.getByText('Amara Wilson', { exact: true }).waitFor()
  const mockReviewMissionName = await mockReviewQueue.locator('.roadmap-review-item-heading strong').innerText()
  await mockReviewQueue.getByRole('button', { name: 'Review mission', exact: true }).click()
  const mockSubmittedMission = page.getByRole('dialog', { name: mockReviewMissionName })
  await mockSubmittedMission.getByText('Submitted by Amara Wilson', { exact: true }).waitFor()
  await mockSubmittedMission.getByRole('button', { name: 'Close mission', exact: true }).click()
  await mockSubmittedMission.waitFor({ state: 'hidden' })
  await page.goto(`${origin}/roadmap/demo/demo-roadmap-atlas-access`)
  await page.getByRole('region', { name: 'Atlas Access roadmap journey' }).waitFor()
  const memberActionOrder = await page.locator('.rmj-breadcrumb-actions button').evaluateAll((buttons) => buttons.map((button) =>
    button.classList.contains('rmj-review-button') ? 'review' : button.classList.contains('rmj-member-exit') ? 'exit' : 'other'))
  assert.deepEqual(memberActionOrder, ['review', 'exit'], 'Pending approval appears before the mission exit action')
  await page.getByRole('button', { name: /Pending Approval/ }).click()
  const memberPendingQueue = page.getByRole('dialog', { name: 'Pending Approval' })
  await memberPendingQueue.getByText('Interview guide', { exact: true }).waitFor()
  await memberPendingQueue.getByText('Submitted by', { exact: true }).waitFor()
  await memberPendingQueue.getByText('Submission details', { exact: true }).waitFor()
  await memberPendingQueue.getByRole('button', { name: 'Open mission', exact: true }).click()
  const memberSubmittedMission = page.getByRole('dialog', { name: 'Interview guide' })
  await memberSubmittedMission.getByText('Submitted to founder · Awaiting review', { exact: true }).waitFor()
  await memberSubmittedMission.getByRole('button', { name: 'Close mission', exact: true }).click()
  await memberSubmittedMission.waitFor({ state: 'hidden' })
  await page.goto(`${origin}/roadmap/demo/demo-roadmap-happora`)
  await page.getByRole('region', { name: 'Happora roadmap journey' }).waitFor()
  await page.reload()
  await page.getByRole('region', { name: 'Happora roadmap journey' }).waitFor()
  await page.getByRole('button', { name: 'Manage team', exact: true }).click()
  const savedTeam = page.getByRole('dialog', { name: 'Roadmap team' })
  await savedTeam.getByText('@team-mate', { exact: false }).waitFor()
  await savedTeam.getByText('Publish a post or review incoming join requests', { exact: true }).click()
  await savedTeam.getByText('Customer research partner', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Close roadmap team' }).click()
  await savedTeam.waitFor({ state: 'hidden' })
  await page.goto(`${origin}/roadmap?join=1`)
  const joinDialog = page.getByRole('dialog', { name: 'Join Roadmap' })
  await joinDialog.waitFor()
  await page.getByRole('tab', { name: 'Browse opportunities' }).waitFor()
  await joinDialog.getByRole('article', { name: 'Opportunity: Customer research partner' }).waitFor()
  assert.equal(await joinDialog.getByRole('article', { name: 'Opportunity: Customer research partner' }).getByText('Happora', { exact: true }).count(), 1, 'A roadmap team opportunity is listed in Join Roadmap')
  await page.getByRole('button', { name: 'Close Join Roadmap' }).click()
  await joinDialog.waitFor({ state: 'hidden' })
  await page.goto(`${origin}/roadmap/demo/demo-roadmap-happora`)
  await page.getByRole('region', { name: 'Happora roadmap journey' }).waitFor()
  assert.equal(await page.locator('.rmj-level-card:visible').count(), 0, 'Level cards are hidden until their level is hovered')
  assert.equal(await page.locator('.rmj-summit-flag, .rmj-mountain-finish').count(), 0, 'The map ends at level 5 without an extra summit marker')
  assert.equal(await page.locator('.rmj-start-marker').count(), 0, 'The start label is not displayed on the map by itself')
  assert.equal(await page.locator('.rmj-mountain-road-progress').count(), 1, 'Road progress uses one connected path')
  assert.equal(Number.parseFloat(await page.locator('.rmj-mountain-road-progress').evaluate((element) => element.style.strokeDasharray)), 0, 'No road glow appears before any missions are complete')
  assert.equal(await page.locator('.rmj-progress-summary').count(), 0, 'The progress summary is removed from every roadmap')
  assert.equal(await page.locator('.rmj-progress-track').count(), 0, 'The roadmap progress bar is removed')
  const roadLane = page.locator('.rmj-mountain-road-lane')
  assert.equal(await roadLane.evaluate((element) => getComputedStyle(element).strokeLinecap), 'round', 'The unfinished route keeps rounded road dashes')
  assert.match(await roadLane.evaluate((element) => getComputedStyle(element).strokeDasharray), /^9(?:px)?[,\s]+13(?:px)?$/, 'The road centerline keeps its original dash pattern')
  const roadSegments = page.locator('.rmj-mountain-road-progress')
  const routeGeometry = await roadSegments.evaluate((element) => {
    const d = element.getAttribute('d')
    const length = element.getTotalLength()
    const start = element.getPointAtLength(0)
    const end = element.getPointAtLength(length)
    const firstLineThenCurve = /^M\s*[-+]?(?:\d*\.)?\d+[\s,]+[-+]?(?:\d*\.)?\d+\s+L\s*[-+]?(?:\d*\.)?\d+[\s,]+[-+]?(?:\d*\.)?\d+\s+C/.test(d)
    const dx = end.x - start.x
    const dy = end.y - start.y
    const squaredLength = dx * dx + dy * dy
    const maxDeviation = Array.from({ length: 101 }, (_, index) => {
      const point = element.getPointAtLength(length * index / 100)
      const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / squaredLength))
      return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t))
    }).reduce((max, deviation) => Math.max(max, deviation), 0)
    return {
      d,
      length,
      start: [start.x, start.y],
      end: [end.x, end.y],
      maxDeviation,
      firstLineThenCurve,
    }
  })
  assert.equal((routeGeometry.d.match(/M/g) || []).length, 1, 'The road is one continuous path without segment joins')
  assert.ok(routeGeometry.maxDeviation > 28, `The road has a visible natural curve (${routeGeometry.maxDeviation.toFixed(1)}px)`)
  assert.ok(routeGeometry.firstLineThenCurve, `The road starts straight into Level 1 and curves afterwards (${routeGeometry.d.slice(0, 100)})`)
  const assertRoadEndsAtLevel = async (levelIndex, message) => {
    const distance = await roadSegments.evaluate((element, index) => {
      const progress = Number.parseFloat(element.style.strokeDasharray);
      const point = element.getPointAtLength(element.getTotalLength() * progress / 1000);
      const screenPoint = element.ownerSVGElement.createSVGPoint();
      screenPoint.x = point.x;
      screenPoint.y = point.y;
      const screen = screenPoint.matrixTransform(element.getScreenCTM());
      const node = document.querySelectorAll('.rmj-level-node')[index].getBoundingClientRect();
      return Math.hypot(screen.x - (node.left + node.width / 2), screen.y - (node.top + node.height / 2));
    }, levelIndex)
    assert.ok(distance < 8, `${message}; endpoint is ${distance.toFixed(2)}px from the level marker`)
  }
  await assertFixedMap()

  const lockedNode = page.getByRole('button', { name: 'Stage 1, Level 2: Audience discovery, locked' })
  await lockedNode.hover()
  assert.equal(await page.locator('.rmj-level-card:visible').count(), 0, 'Locked level details do not appear on hover')
  await lockedNode.click()
  await page.locator('.rmj-level-card:visible').waitFor()
  await page.waitForTimeout(800)
  assert.equal(await page.locator('.rmj-level-card:visible').count(), 1, 'Locked level feedback stays readable after the click animation')
  assert.match(await page.locator('.rmj-level-card:visible').innerText(), /Complete Level 1 to unlock this level/)
  assert.doesNotMatch(await page.locator('.rmj-level-card:visible').innerText(), /Audience discovery/, 'Locked level details stay hidden')
  assert.equal(await lockedNode.locator('..').evaluate((element) => getComputedStyle(element).zIndex), '8', 'The clicked level card remains above adjacent level nodes')
  assert.equal(await page.locator('.rmj-mission-page').count(), 0)
  assert.equal(await lockedNode.evaluate((element) => element.classList.contains('is-rejected')), true, 'Clicking a locked level gives shake feedback')
  await lockedStage.hover()
  assert.equal(await lockedStage.locator('.rmj-stage-lock-hint').evaluate((element) => getComputedStyle(element).visibility), 'hidden', 'Locked stage details do not appear on hover')
  await lockedStage.click()
  assert.equal(await lockedStage.evaluate((element) => element.classList.contains('is-rejected')), true, 'Clicking a locked stage gives shake feedback')
  assert.equal(await lockedStage.locator('.rmj-stage-lock-hint').evaluate((element) => getComputedStyle(element).visibility), 'visible', 'Clicking a locked stage reveals its smooth unlock hint')
  assert.match(await lockedStage.innerText(), /Complete Launch to unlock/)
  assert.equal(await page.getByRole('region', { name: 'Happora roadmap journey' }).count(), 1, 'A locked stage does not open its content')
  const fourthLevelNode = page.getByRole('button', { name: 'Stage 1, Level 4: Opportunity framing, locked' })
  await fourthLevelNode.hover()
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.rmj-level-card'))
    .every((element) => getComputedStyle(element).visibility === 'hidden'))
  assert.equal(await page.locator('.rmj-level-card:visible').count(), 0, 'Locked level cards remain hidden on hover')
  await fourthLevelNode.click()
  const hoverCard = page.locator('.rmj-level-stop.is-rejected .rmj-level-card')
  await hoverCard.waitFor({ state: 'visible' })
  const hoverCardBounds = await hoverCard.boundingBox()
  const mountainBounds = await map.boundingBox()
  assert.ok(hoverCardBounds.x >= mountainBounds.x && hoverCardBounds.x + hoverCardBounds.width <= mountainBounds.x + mountainBounds.width
    && hoverCardBounds.y >= mountainBounds.y && hoverCardBounds.y + hoverCardBounds.height <= mountainBounds.y + mountainBounds.height, 'Level 4 popup stays inside the mountain map')
  const firstLevelNode = page.getByRole('button', { name: 'Stage 1, Level 1: Problem focus, current' })
  await firstLevelNode.hover()
  const startButton = page.locator('.rmj-level-card-footer .rmj-level-guidance')
  assert.match(await page.locator('.rmj-level-card:visible').innerText(), /Start/, 'A fresh roadmap shows Start inside its first level card')
  assert.equal(await startButton.innerText(), 'Start', 'The first-level action is labeled Start')
  await startButton.hover()
  assert.equal(await page.locator('.rmj-level-card:visible').count(), 1, 'The popup stays open while moving the pointer onto its action')
  await startButton.click()
  const levelPage = page.locator('.rmj-mission-page')
  await levelPage.waitFor()
  await page.setViewportSize({ width: 1366, height: 768 })
  assert.equal(await page.locator('.rmj-breadcrumb').count(), 0, 'Mission view hides the All roadmaps breadcrumb')
  assert.equal(await page.locator('.rmj-viewport--missions').evaluate((element) => getComputedStyle(element).overflowY), 'hidden', 'The mission page itself does not scroll')
  assert.equal(await page.locator('.rmj-mission-page-list').evaluate((element) => getComputedStyle(element).overflowY), 'hidden', 'Three missions fit without a scroll area')
  assert.equal(await page.locator('.rmj-mission-page-list').evaluate((element) => getComputedStyle(element).scrollbarWidth), 'none', 'The mission-list scrollbar is not visible')
  assert.equal(await page.locator('.rmj-mission-page-list').evaluate((element) => !element.classList.contains('is-scrollable')), true, 'A level with three missions does not enable list scrolling')
  assert.equal(await page.locator('.rmj-mission-page-list').evaluate((element) => element.scrollHeight <= element.clientHeight + 1), true, 'All three missions fit in the viewport at a typical laptop height')
  assert.equal(await page.locator('.rmj-mission-page-list').evaluate((element) => getComputedStyle(element).overflowX), 'hidden', 'The mission list cannot create a horizontal scrollbar')
  assert.equal(await page.locator('.rmj-back-button').evaluate((element) => getComputedStyle(element).borderWidth), '0px', 'Back to journey is an unboxed text button')
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), true, 'The mission page does not scroll as a whole')
  assert.deepEqual(await page.locator('.rmj-mission-tile .rmj-mission-state').allTextContents(), ['Ready to begin', 'Locked', 'Locked'])
  assert.equal(await page.locator('.rmj-mission-tile.is-clickable').count(), 1, 'Only Mission 1 is available initially')
  const secondMissionTile = page.locator('.rmj-mission-tile').nth(1)
  assert.doesNotMatch(await secondMissionTile.innerText(), /User needs|Develop user needs/, 'Locked missions hide their content')
  await secondMissionTile.hover()
  assert.equal(await secondMissionTile.evaluate((element) => getComputedStyle(element, '::after').visibility), 'hidden', 'Locked mission hints do not appear on hover')
  await secondMissionTile.click()
  assert.equal(await secondMissionTile.evaluate((element) => element.classList.contains('is-rejected')), true, 'Clicking a locked mission gives shake feedback')
  await page.waitForTimeout(800)
  assert.equal(await secondMissionTile.evaluate((element) => getComputedStyle(element, '::after').visibility), 'visible', 'Locked mission feedback stays readable after the click animation')
  const popupTranslationY = await secondMissionTile.evaluate((element) => Number(getComputedStyle(element, '::after').transform.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,([^)]+)\)/)?.[1]))
  assert.ok(popupTranslationY < 0, 'The locked mission hint opens above its centered lock icon')
  assert.match(await secondMissionTile.evaluate((element) => getComputedStyle(element, '::after').content), /Complete Mission 1 to unlock/)
  assert.equal(await page.locator('.rmj-mission-page-list').evaluate((element) => element.scrollWidth <= element.clientWidth), true, 'Clicking a locked mission does not add horizontal overflow')
  assert.equal(await secondMissionTile.locator('.rmj-mission-tile-top').evaluate((element) => getComputedStyle(element).visibility), 'hidden', 'Locked mission tiles show no text')
  assert.equal(await secondMissionTile.locator('.rmj-mission-locked-indicator').evaluate((element) => getComputedStyle(element).display), 'grid', 'Locked mission tiles show only the centered lock icon')
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
  await assertRoadEndsAtLevel(0, 'Road glow reaches the completed first-level node')
  assert.equal(await page.locator('.rmj-mountain-road-flow').evaluate((element) => element.style.strokeDasharray),
    await page.locator('.rmj-mountain-road-progress').evaluate((element) => element.style.strokeDasharray), 'The flowing neon follows the same uninterrupted progress')
  assert.equal(await page.locator('.rmj-mountain-road-flow').first().evaluate((element) => getComputedStyle(element).stroke), 'url("#rmj-road-glow")', 'The completed path uses the slowly flowing neon gradient')
  await page.getByRole('button', { name: 'Stage 1, Level 2: Audience discovery, current' }).hover()
  assert.equal(await page.locator('.rmj-level-card-footer .rmj-level-guidance:visible').innerText(), 'Continue', 'A progressed roadmap labels its current-level action Continue')
  await page.reload()
  await page.getByRole('region', { name: 'Happora roadmap journey' }).waitFor()
  await assertFixedMap()
  assert.equal(await page.locator('.rmj-progress-summary').count(), 0, 'Progress remains hidden after refresh')

  await page.evaluate(() => {
    const userId = JSON.parse(localStorage.getItem('labx.demo.session.v1')).userId
    const completedMissionIds = Array.from({ length: 4 }, (_, levelIndex) =>
      [1, 2, 3].map((missionNumber) => `discover-l${levelIndex + 1}-m${missionNumber}`)).flat()
    localStorage.setItem(`labx:roadmap-prototype:v1:${encodeURIComponent(userId)}:demo-roadmap-happora`, JSON.stringify({
      completedMissionIds,
      submissionsByMissionId: {},
    }))
  })
  await page.reload()
  await page.getByRole('region', { name: 'Happora roadmap journey' }).waitFor()
  await assertRoadEndsAtLevel(3, 'Completing Level 4 lights the road precisely through the Level 4 node')
  assert.equal(await page.locator('.rmj-level-stop.is-completed').count(), 4, 'The glow endpoint matches the four completed level markers')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('region', { name: 'Happora roadmap journey' }).waitFor()
  await assertFixedMap()
  assert.equal(await page.locator('.rmj-level-card:visible').count(), 0, 'Cards remain hidden by default on small screens')
  const mapBounds = await map.boundingBox()
  const nodeBounds = await nodes.evaluateAll((elements) => elements.map((node) => {
    const bounds = node.getBoundingClientRect()
    return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom }
  }))
  assert.ok(nodeBounds.every((bounds) => bounds.left >= mapBounds.x && bounds.right <= mapBounds.x + mapBounds.width
    && bounds.top >= mapBounds.y && bounds.bottom <= mapBounds.y + mapBounds.height), 'All five mobile level nodes remain within the map')
  await page.locator('.rmj-level-stop.is-current .rmj-level-node').click()
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
  assert.equal(await page.locator('.rmj-stage-step.is-selected').count(), 1, 'Only the selected stage is highlighted')
  assert.notEqual(await page.locator('.rmj-stage-step.is-selected').evaluate((element) => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)', 'The selected stage has its highlight')
  assert.equal(await page.getByRole('button', { name: /Stage 2: Validate/ }).evaluate((element) => getComputedStyle(element).backgroundColor), 'rgba(0, 0, 0, 0)', 'The current but unselected stage has no highlight')
  assert.equal(await page.locator('.rmj-mountain-road-progress').evaluate((element) => element.style.strokeDasharray), '1000, 1000', 'Completing Level 5 lights the full connected road')
  assert.equal(await page.locator('.rmj-mountain-road-flow').evaluate((element) => element.style.strokeDasharray), '1000, 1000', 'The complete stage has a continuous glow across the full route')
  const discoverPath = await page.locator('.rmj-mountain-road-lane').getAttribute('d')
  await page.getByRole('button', { name: /Stage 5: Grow/ }).click()
  await page.getByRole('region', { name: 'Grow stage mountain roadmap' }).waitFor()
  await assertFixedMap()
  assert.notEqual(await page.locator('.rmj-mountain-road-lane').getAttribute('d'), discoverPath, 'Each stage has its own mountain-road curves')
  assert.equal(await page.locator('.rmj-mountain-canvas.is-premium').count(), 1, 'Grow uses the premium summit treatment')

  assert.deepEqual(runtimeErrors, [])
  assert.deepEqual(backendRequests, [], 'The prototype does not call backend APIs')
  assert.deepEqual(externalRequests, [], 'The prototype does not depend on external assets or services')
  await context.close()
} finally {
  await browser?.close()
  await server.httpServer.close()
}
