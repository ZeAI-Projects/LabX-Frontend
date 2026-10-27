import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = fileURLToPath(new URL('../test-results/roadmap/', import.meta.url))
const origin = 'http://127.0.0.1:5191'
const executablePath = process.env.LABX_BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
const password = 'RoadmapPass1!'
const acceptedMember = { name: 'Robin Roadmap', email: 'roadmap-member@example.com' }
const decliningMember = { name: 'Dara Roadmap', email: 'roadmap-decline@example.com' }
const notes = 'We interviewed five prospective users, recorded their current workarounds, and compared the repeated problem with our original assumptions. Our next step is to validate the highest priority need with a small prototype.'
await mkdir(output, { recursive: true })
const server = await preview({ root, envDir: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 5191, strictPort: true } })
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
  const button = (name) => page.getByRole('button', { name, exact: true })
  const heading = (name) => page.getByRole('heading', { name, exact: true, level: 1 })
  const dialog = (name) => page.getByRole('dialog', { name, exact: true })
  const submitAuth = () => page.locator('button[type="submit"]').click()
  const signOut = async () => {
    if (await dialog('Join Roadmap').isVisible()) await closeDialog()
    await button('Sign out').click(); await at('/login')
  }
  const closeDialog = async () => {
    await page.keyboard.press('Escape')
    await page.locator('dialog[open]').waitFor({ state: 'hidden' })
  }
  const login = async (email = 'founder@labx.demo') => {
    await go('/login')
    await page.getByLabel('Email Address', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(email === 'founder@labx.demo' ? 'Demo1234!' : password)
    await submitAuth()
    await at('/dashboard')
    await heading('Dashboard').waitFor()
  }
  const register = async (account) => {
    await go('/register?role=founder')
    await page.getByLabel('Full Name', { exact: true }).fill(account.name)
    await page.getByLabel('Email Address', { exact: true }).fill(account.email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByLabel('Confirm Password', { exact: true }).fill(password)
    await submitAuth()
    await at('/verify-email')
    const code = (await page.getByTestId('demo-signup-code').innerText()).trim()
    assert.match(code, /^\d{6}$/)
    await page.getByLabel('Digit 1 of 6', { exact: true }).fill(code)
    await button('Verify email').click()
    await at('/roadmap/new')
    await go('/join-roadmap')
    await dialog('Join Roadmap').waitFor()
    account.id = (await page.locator('.join-roadmap-account code').innerText()).trim()
    assert.ok(account.id, 'Registered members can find their exact Member ID in the portal')
  }
  const createRoadmap = async (name) => {
    await go('/roadmap/new')
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill(name)
    await button('Start assessment').click()
    await page.waitForURL(/\/roadmap\/[^/]+\/assessment$/)
    const path = new URL(page.url()).pathname.replace(/\/assessment$/, '')
    for (const answer of ['Healthcare & MedTech', 'Healthcare providers', 'Web application', 'Exploring an idea', 'Not researched', 'Concept only', 'No target customers identified']) {
      await button(answer).click()
      await button('Next Step').click()
    }
    await button('Problem clarity').click()
    await button('Review Answers').click()
    await page.getByRole('button', { name: 'Submit Assessment', exact: true }).click()
    await at(`${path}/result`)
    await button('Enter My Roadmap').click()
    await at(path)
    await heading(name).waitFor()
    return path
  }
  const missionButton = (name, level, order, state) => button(`${name}, Level ${level}, Mission ${order}, ${state}`)
  const openCurrent = async (name) => {
    await button('Open current mission').click()
    await dialog(name).waitFor()
    return dialog(name)
  }
  const assertCurrent = async (name, level, order, canOpen = true) => {
    await missionButton(name, level, order, 'active').waitFor()
    assert.equal(await missionButton(name, level, order, 'active').isDisabled(), !canOpen)
  }
  const acceptMission = async (name, { file = false, retry = false } = {}) => {
    const active = dialog(name)
    await active.getByLabel('Your work', { exact: true }).fill(notes)
    if (file) {
      await active.getByLabel(/^Evidence file/).setInputFiles({
        name: 'user-research.txt', mimeType: 'text/plain', buffer: Buffer.from(notes),
      })
    } else await active.getByLabel('Evidence link', { exact: true }).fill('https://example.test/roadmap-evidence')
    await active.getByRole('button', { name: retry ? 'Resubmit for evaluation' : 'Submit for evaluation', exact: true }).click()
    await active.getByRole('heading', { name: 'Mission accepted', exact: true }).waitFor()
    assert.equal(await active.getByRole('button', { name: /submit for evaluation/i }).count(), 0, 'Accepted work cannot be submitted twice')
    await active.getByText('This was a simulated evaluation. No AI review or LabX points were awarded.', { exact: true }).waitFor()
  }
  const stageCards = async (statuses, selectedId) => {
    const cards = page.getByRole('navigation', { name: 'Roadmap stages', exact: true }).locator('button[data-stage-id]')
    const actual = await cards.evaluateAll((buttons) => buttons.map((item) => ({
      id: item.dataset.stageId,
      status: item.dataset.stageStatus,
      selected: item.getAttribute('aria-pressed') === 'true',
    })))
    const ids = ['discover', 'validate', 'build', 'launch', 'grow']
    assert.deepEqual(actual.map((item) => item.id), ids, 'All five stage cards retain their progression order')
    assert.deepEqual(actual.map((item) => item.status), statuses, 'Stage progress is independent of the selected stage')
    assert.deepEqual(actual.filter((item) => item.selected).map((item) => item.id), [selectedId], 'Exactly one stage card is selected')
  }
  const highway = async ({ currentId, fullyLit = false, locked = false } = {}) => {
    const viewport = page.locator('.rm-highway-viewport')
    await viewport.waitFor()
    const svg = page.locator('.rm-highway-svg--desktop:visible, .rm-highway-svg--mobile:visible')
    assert.equal(await svg.count(), 1, 'Exactly one responsive road is rendered')
    const nodes = await page.locator('.rm-highway-canvas [data-mission-id]').evaluateAll((items) => items.map((item) => {
      const marker = item.querySelector('[data-road-node]')
      const bounds = marker.getBoundingClientRect()
      const card = item.querySelector('.rm-highway-card').getBoundingClientRect()
      return {
        id: item.dataset.missionId, x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2,
        marker: { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom },
        card: { left: card.left, right: card.right, top: card.top, bottom: card.bottom, centerX: card.x + card.width / 2 },
      }
    }))
    assert.equal(nodes.length, 15, 'Each stage contains fifteen mission checkpoints')
    for (let index = 1; index < nodes.length; index += 1) {
      assert.ok(nodes[index - 1].y > nodes[index].y, `Mission ${index + 1} appears above mission ${index}`)
    }
    assert.ok(Math.max(...nodes.map((node) => node.x)) - Math.min(...nodes.map((node) => node.x)) > 20, 'Checkpoints follow a winding road rather than a straight vertical list')
    const canvas = await page.locator('.rm-highway-canvas').boundingBox()
    if (canvas.width >= 1000 && await svg.evaluate((element) => element.classList.contains('rm-highway-svg--desktop'))) {
      const midpoint = canvas.x + canvas.width / 2
      for (let index = 0; index < nodes.length; index += 1) {
        const { marker, card, id } = nodes[index]
        const overlap = marker.left < card.right && marker.right > card.left
          && marker.top < card.bottom && marker.bottom > card.top
        assert.equal(overlap, false, `${id} keeps its road node clear of the mission card`)
        if (index > 0) {
          assert.ok((card.centerX - midpoint) * (nodes[index - 1].card.centerX - midpoint) < 0,
            `${id} alternates to the other side of the road canvas`)
        }
      }
    }
    const scroll = await viewport.evaluate((element) => ({
      scrollHeight: element.scrollHeight, clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
      overflowY: getComputedStyle(element).overflowY,
      scrollTop: element.scrollTop,
      tabIndex: element.getAttribute('tabindex'),
      canvasHeight: element.querySelector('.rm-highway-canvas').getBoundingClientRect().height,
      documentHeight: document.documentElement.scrollHeight,
      windowHeight: window.innerHeight,
    }))
    assert.equal(scroll.overflowY, 'visible', 'The highway flows with the page instead of creating its own scroll container')
    assert.ok(scroll.scrollHeight <= scroll.clientHeight + 1, 'The full highway height is visible in document flow')
    assert.ok(scroll.clientHeight >= scroll.canvasHeight - 1, 'The highway wrapper contains the complete canvas height')
    assert.equal(scroll.scrollTop, 0, 'The highway has no independent scroll position')
    assert.equal(scroll.tabIndex, null, 'A non-scrollable highway wrapper is not an extra keyboard stop')
    assert.ok(scroll.documentHeight > scroll.windowHeight, 'The document scrolls through the complete roadmap')
    assert.ok(scroll.scrollWidth <= scroll.clientWidth + 1, 'The highway has no horizontal overflow')
    const lit = svg.locator('[data-road-path="lit"]')
    const base = svg.locator('[data-road-path="base"]')
    assert.equal(await base.count(), 1)
    if (locked) {
      assert.equal(await lit.count(), 0, 'A locked stage has no illuminated road segment')
      const road = page.locator('.rm-road-content')
      assert.equal(await road.getAttribute('inert'), null, 'Locked stages retain accessible map exploration')
      assert.equal(await road.getAttribute('aria-hidden'), null, 'Locked stage missions remain readable')
      assert.equal(await road.evaluate((element) => getComputedStyle(element).filter), 'none', 'Locked stage previews are clear instead of blurred')
      assert.ok(await road.evaluate((element) => element.clientHeight) >= 3920, 'A locked stage retains the entire highway height')
      const checkpoints = page.locator('.rm-highway-canvas [data-mission-id] button')
      assert.equal(await checkpoints.count(), 15)
      assert.equal(await checkpoints.evaluateAll((buttons) => buttons.every((item) => item.disabled)), true, 'Locked road checkpoints cannot be opened')
    } else {
      assert.equal(await lit.count(), 1)
      if (fullyLit) {
        assert.equal(await lit.getAttribute('d'), await base.getAttribute('d'), 'A covered stage illuminates the entire road')
      } else {
        const endpoint = await lit.evaluate((path) => {
          const point = path.getPointAtLength(path.getTotalLength())
          const screen = new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM())
          return { x: screen.x, y: screen.y }
        })
        const current = nodes.find((node) => node.id === currentId)
        assert.ok(current, `The current checkpoint ${currentId} exists`)
        assert.ok(Math.hypot(endpoint.x - current.x, endpoint.y - current.y) <= 6,
          `Illumination ends at the current checkpoint, not a later mission: ${JSON.stringify({ endpoint, current })}`)
        assert.notEqual(await lit.getAttribute('d'), await base.getAttribute('d'), 'Unfinished road beyond the current mission stays dim')
      }
    }
  }
  const layout = async (name, widths = [320, 390, 768, 1440, 1920]) => {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
      await page.evaluate(() => document.fonts.ready)
      // Let responsive layout settle before comparing screen coordinates.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name} fits ${width}px`)
      const open = page.locator('dialog[open]')
      if (await open.count()) {
        assert.equal(await open.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), true, `${name} dialog has no horizontal overflow at ${width}px`)
      }
      if (name === 'initial-roadmap') await highway({ currentId: 'discover-l1-m1' })
      if (name === 'progressed-roadmap') {
        await highway({ currentId: 'discover-l2-m1' })
        await page.locator('[data-mission-id="discover-l1-m1"]').getByText('Conquered', { exact: true }).first().waitFor()
      }
      if (name === 'locked-roadmap') await highway({ locked: true })
      if (name === 'completed-roadmap') await highway({ fullyLit: true })
      if (['initial-roadmap', 'progressed-roadmap', 'locked-roadmap'].includes(name)) {
        await stageCards(['current', 'locked', 'locked', 'locked', 'locked'], name === 'locked-roadmap' ? 'grow' : 'discover')
      }
      if (name === 'completed-roadmap') {
        await stageCards(['credited', 'credited', 'credited', 'credited', 'credited'], 'grow')
        const creditedMission = page.locator('[data-mission-id="grow-l1-m1"]')
        await creditedMission.getByText('Placement credit', { exact: true }).first().waitFor()
        assert.equal(await creditedMission.getByText('Conquered', { exact: true }).count(), 0, 'Placement credit is not presented as completed work')
        await page.locator('[data-mission-id="grow-l5-m3"]').getByText('Conquered', { exact: true }).first().waitFor()
      }
      await page.screenshot({ path: `${output}${name}-${width}.png`, fullPage: true, animations: 'disabled' })
    }
  }
  const collection = async (name) => {
    await go('/roadmap')
    await heading('Roadmap').waitFor()
    await button(name).click()
  }
  const team = () => dialog('Roadmap team')
  const openTeam = async () => { await button('Manage team').click(); await team().waitFor() }
  const joinPortal = async () => {
    await go('/join-roadmap')
    await dialog('Join Roadmap').waitFor()
    await page.getByRole('navigation', { name: 'Collaboration views', exact: true }).getByRole('button', { name: 'My activity', exact: true }).click()
  }

  // Accounts are created through the public UI in an isolated browser context.
  await register(acceptedMember)
  await signOut()
  await register(decliningMember)
  await signOut()
  await login()
  await joinPortal()
  await page.getByText('No roadmap invitations yet. Share your Member ID with a founder.', { exact: true }).waitFor()
  await page.getByText('No joined roadmaps yet. Accept an invitation or have a join request accepted to find your team here.', { exact: true }).waitFor()
  await layout('join-roadmap-empty', [320, 1440])
  const projectName = 'Community Health Workflow'
  const projectPath = await createRoadmap(projectName)
  const joinedPath = `/roadmap/joined/demo-founder/${projectPath.split('/').at(-1)}`
  assert.equal(await button('Discover, Stage 1, current').getAttribute('aria-pressed'), 'true')
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap coverage', exact: true }).getAttribute('aria-valuenow'), '0')
  await assertCurrent('Problem statement', 1, 1)
  assert.equal(await missionButton('User context', 1, 2, 'locked').isDisabled(), true)
  await layout('initial-roadmap')
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await button('Find current mission').scrollIntoViewIfNeeded()
  const pageScroll = await page.evaluate(() => window.scrollY)
  await button('Find current mission').click()
  const currentIsInView = await page.locator('[data-mission-id="discover-l1-m1"] [data-road-node]').evaluate((node) => {
    const bounds = node.getBoundingClientRect()
    return bounds.top >= 0 && bounds.bottom <= window.innerHeight
  })
  assert.equal(currentIsInView, true, 'Find current mission brings the first checkpoint into the browser viewport')
  assert.ok(await page.evaluate(() => window.scrollY) > pageScroll + 100, 'Finding the first mission scrolls the page toward the bottom of the roadmap')
  assert.equal(await page.locator('.rm-highway-viewport').evaluate((element) => element.scrollTop), 0, 'Finding a mission does not create an internal road scroll offset')
  assert.equal(await page.getByRole('dialog').count(), 0, 'Finding the current mission does not open its dialog')
  await page.locator('[data-mission-id="discover-l1-m1"] [data-road-node]').hover()
  const beforeWheel = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, -500)
  await page.waitForFunction((previous) => window.scrollY < previous, beforeWheel)
  assert.equal(await page.locator('.rm-highway-viewport').evaluate((element) => element.scrollTop), 0, 'Wheel input over the roadmap scrolls the document, not an inner container')
  // Switching stages keeps the same page, map dimensions, and viewport position.
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
    await button('Discover, Stage 1, current').click()
    await button('Grow, Stage 5, locked').scrollIntoViewIfNeeded()
    const before = await page.evaluate(() => ({
      y: window.scrollY,
      height: document.documentElement.scrollHeight,
      canvasY: document.querySelector('.rm-highway-canvas').getBoundingClientRect().top + window.scrollY,
    }))
    await button('Grow, Stage 5, locked').click()
    await page.getByText('Grow is locked', { exact: true }).waitFor()
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const after = await page.evaluate(() => ({
      y: window.scrollY,
      height: document.documentElement.scrollHeight,
      canvasY: document.querySelector('.rm-highway-canvas').getBoundingClientRect().top + window.scrollY,
    }))
    assert.ok(Math.abs(after.y - before.y) <= 2, `Stage switching keeps the viewport at ${width}px: ${JSON.stringify({ before, after })}`)
    assert.ok(Math.abs(after.canvasY - before.canvasY) <= 2, `Every stage shares the same map origin at ${width}px`)
    assert.ok(Math.abs(after.height - before.height) <= 2, `Every stage keeps the full page height at ${width}px`)
    assert.equal(await button('Grow, Stage 5, locked').evaluate((element) => element === document.activeElement), true, 'Selected stage keeps keyboard focus')
    assert.equal(await page.locator('.rm-highway').evaluate((element) => element.getAnimations().length), 0, 'Reduced motion disables stage fades')
    await highway({ locked: true })
    assert.equal(new URL(page.url()).pathname, projectPath, 'Stage selection keeps the current project route')
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await button('Validate, Stage 2, locked').click()
  assert.ok(await page.locator('.rm-highway').evaluate((element) => element.getAnimations().some((animation) => animation.effect.getTiming().duration === 240)), 'Stage changes use a short in-place fade')
  await page.locator('.rm-highway').evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await button('Grow, Stage 5, locked').click()
  await layout('locked-roadmap', [320, 1440])
  await button('Return to Active Stage').click()
  await assertCurrent('Problem statement', 1, 1)

  // Invalid work produces persistent feedback without unlocking the next mission.
  const firstMission = missionButton('Problem statement', 1, 1, 'active')
  await firstMission.scrollIntoViewIfNeeded()
  const missionPageScroll = await page.evaluate(() => window.scrollY)
  await firstMission.click()
  const first = dialog('Problem statement')
  await first.waitFor()
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.equal(await page.evaluate(() => window.scrollY), missionPageScroll, 'Opening a mission dialog preserves the page position')
  await first.getByLabel('Your work', { exact: true }).fill('Not enough detail.')
  await first.getByRole('button', { name: 'Submit for evaluation', exact: true }).click()
  await first.getByRole('heading', { name: 'Improve your evidence', exact: true }).waitFor()
  await first.getByText('Attempt 1', { exact: true }).waitFor()
  await first.getByLabel('Your work', { exact: true }).fill(notes)
  await first.getByLabel('Evidence link', { exact: true }).fill('javascript:alert(1)')
  await first.getByRole('button', { name: 'Resubmit for evaluation', exact: true }).click()
  await first.getByText('Attempt 2', { exact: true }).waitFor()
  await layout('rejected-mission', [320, 1440])
  await page.reload()
  await dialog('Problem statement').waitFor()
  await dialog('Problem statement').getByRole('heading', { name: 'Improve your evidence', exact: true }).waitFor()
  assert.equal(await dialog('Problem statement').getByLabel('Your work', { exact: true }).inputValue(), notes, 'Rejected work survives refresh')
  await acceptMission('Problem statement', { retry: true })
  await dialog('Problem statement').getByText('Attempt 3', { exact: true }).waitFor()
  await dialog('Problem statement').getByRole('button', { name: 'Close mission', exact: true }).focus()
  for (let count = 0; count < 2; count += 1) {
    await page.keyboard.press('Tab')
    assert.equal(await dialog('Problem statement').evaluate((element) => element.contains(document.activeElement)), true, 'Mission dialog contains keyboard focus')
  }
  assert.equal(await page.evaluate(() => {
    const modal = document.querySelector('dialog[open]')
    document.querySelector('.rm-stage-context button').focus()
    return modal.contains(document.activeElement)
  }), true, 'The open native dialog keeps background actions inert')
  await layout('accepted-mission', [320, 1440])
  await dialog('Problem statement').getByRole('button', { name: 'Next mission', exact: true }).click()
  await dialog('User context').waitFor()

  // File evidence is local metadata; oversized files cannot be submitted as proof.
  await dialog('User context').getByLabel(/^Evidence file/).setInputFiles({
    name: 'too-large.txt', mimeType: 'text/plain', buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 65),
  })
  await dialog('User context').getByRole('alert').filter({ hasText: 'Evidence must be 5 MB or smaller.' }).waitFor()
  assert.equal(await dialog('User context').getByLabel(/^Evidence file/).inputValue(), '')
  await acceptMission('User context', { file: true })
  await dialog('User context').getByText(/user-research\.txt.*metadata saved/).waitFor()
  await dialog('User context').getByRole('button', { name: 'Next mission', exact: true }).click()
  await dialog('Opportunity brief').waitFor()
  await acceptMission('Opportunity brief')
  await closeDialog()
  await assertCurrent('Audience segments', 2, 1)
  assert.equal(await missionButton('Problem statement', 1, 1, 'completed').isDisabled(), false)
  assert.equal(await missionButton('User needs', 2, 2, 'locked').isDisabled(), true)
  await page.reload()
  await heading(projectName).waitFor()
  await assertCurrent('Audience segments', 2, 1)
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap coverage', exact: true }).getAttribute('aria-valuenow'), '3')
  await layout('progressed-roadmap')

  // Approved work updates badges while the illustrative points balance stays unchanged.
  await go('/dashboard')
  await heading('Dashboard').waitFor()
  await page.getByLabel('Active project', { exact: true }).selectOption(projectPath.split('/').at(-1))
  const progress = page.getByRole('progressbar', { name: 'Roadmap progress', exact: true })
  assert.equal(await progress.getAttribute('aria-valuenow'), '3')
  assert.equal(await progress.getAttribute('aria-valuemax'), '75')
  await button('450 LabX Coins').waitFor()
  assert.equal(await page.locator('[data-dashboard-stat="Earned badges"]').innerText(), '6', 'Project creation and assessment completion join the four badges unlocked by existing and approved roadmap work')
  await page.getByRole('region', { name: 'Current project', exact: true }).getByText('Up next: Audience segments', { exact: true }).waitFor()
  assert.equal(await page.locator('[data-dashboard-stat="Completed missions"]').innerText(), '3')
  assert.equal(await page.locator('[data-dashboard-stat="Missions remaining"]').innerText(), '72')
  const independentPath = await createRoadmap('Independent Workflow')
  await assertCurrent('Problem statement', 1, 1)
  await go(projectPath)
  await assertCurrent('Audience segments', 2, 1)

  // Invitations are saved locally and do not grant access until accepted.
  await openTeam()
  await team().locator('summary').filter({ hasText: 'Direct Member Invitation' }).click()
  const directInvitation = team().getByRole('region', { name: 'Direct Member Invitation', exact: true })
  assert.equal(await directInvitation.getByRole('button', { name: 'Send Invitation', exact: true }).isDisabled(), true)
  await directInvitation.getByLabel('Member ID', { exact: true }).fill('not-a-registered-member')
  await directInvitation.getByRole('button', { name: 'Search Member', exact: true }).click()
  await directInvitation.getByText('No member found for this Member ID. Check the full ID and try again.', { exact: true }).waitFor()
  assert.equal(await directInvitation.getByRole('button', { name: 'Send Invitation', exact: true }).isDisabled(), true)
  for (const account of [acceptedMember, decliningMember]) {
    await directInvitation.getByLabel('Member ID', { exact: true }).fill(` ${account.id} `)
    await directInvitation.getByRole('button', { name: 'Search Member', exact: true }).click()
    await directInvitation.getByText(account.name, { exact: true }).waitFor()
    await directInvitation.getByLabel('Team role', { exact: true }).selectOption('member')
    await directInvitation.getByLabel('Invitation message', { exact: false }).fill('Help us understand our community health users.')
    await directInvitation.getByRole('button', { name: 'Send Invitation', exact: true }).click()
    await team().locator('.roadmap-team-pending').getByText(account.name, { exact: true }).waitFor()
  }
  await layout('team-invitations', [320, 1440])
  await closeDialog()
  assert.equal(await button('Manage team').evaluate((element) => element === document.activeElement), true, 'Team dialog restores focus')
  await signOut()
  await login(decliningMember.email)
  await go(joinedPath)
  await heading('Roadmap unavailable').waitFor()
  assert.equal(await page.getByLabel('Your work', { exact: true }).count(), 0)
  assert.equal(await button('Open current mission').count(), 0, 'A pending invitation does not grant roadmap access')
  await joinPortal()
  await layout('join-roadmap-invitation', [320, 1440])
  const invitation = () => page.getByRole('listitem', { name: `Invitation: ${projectName}`, exact: true })
  await invitation().getByRole('button', { name: 'Decline invitation', exact: true }).click()
  await invitation().getByText('Declined by Member', { exact: true }).waitFor()
  assert.equal(await invitation().count(), 1, 'Declined invitations stay in response history')
  assert.equal(await invitation().getByRole('button').count(), 0, 'Final decisions cannot be repeated')
  await collection('Joined roadmaps')
  assert.equal(await page.getByRole('link', { name: `Open joined roadmap: ${projectName}`, exact: true }).count(), 0)
  await go(joinedPath)
  await heading('Roadmap unavailable').waitFor()
  assert.equal(await button('Open current mission').count(), 0, 'A declined invitation grants no access')
  await signOut()
  await login(acceptedMember.email)
  await joinPortal()
  await invitation().getByRole('button', { name: 'Accept invitation', exact: true }).click()
  await invitation().getByText('Member Joins Startup Team', { exact: true }).waitFor()
  assert.equal(await invitation().count(), 1, 'Accepted invitations stay in response history')
  assert.equal(await invitation().getByRole('button').count(), 0, 'Accepted invitations cannot create duplicate membership')
  await page.reload()
  await dialog('Join Roadmap').waitFor()
  await page.getByRole('link', { name: `Open joined roadmap: ${projectName}`, exact: true }).click()
  await at(joinedPath)
  await heading(projectName).waitFor()
  await openTeam()
  await team().getByText('Read-only team overview', { exact: true }).waitFor()
  await team().getByRole('article', { name: 'Owner: Founder', exact: true }).waitFor()
  await team().getByRole('heading', { name: 'Your assigned missions 0', exact: true }).waitFor()
  assert.equal(await team().getByRole('textbox').count(), 0, 'Member team view has no invitation input')
  assert.equal(await team().getByRole('combobox').count(), 0, 'Member team view has no assignment controls')
  assert.equal(await team().getByRole('button', { name: 'Send Invitation', exact: true }).count(), 0)
  await layout('member-team-empty', [320, 1440])
  await closeDialog()
  assert.equal(await button('Manage team').evaluate((element) => element === document.activeElement), true)
  assert.equal(await button(`Edit ${projectName}`).count(), 0)
  assert.equal(await button(`Delete ${projectName}`).count(), 0)
  await assertCurrent('Audience segments', 2, 1, false)
  assert.equal(await button('Open current mission').count(), 0, 'An unassigned member cannot submit the current mission')
  await page.getByText('The main founder can assign the current mission to you.', { exact: true }).waitFor()
  await go(`${joinedPath}?milestone=discover-l2-m1`)
  await heading(projectName).waitFor()
  assert.equal(await page.getByRole('dialog').count(), 0, 'A direct mission URL does not bypass assignment restrictions')
  for (const suffix of ['', '/assessment', '/result']) {
    await go(`${projectPath}${suffix}`)
    await heading('Project not found').waitFor()
  }
  await go(independentPath)
  await heading('Project not found').waitFor()
  await signOut()

  // The owner assigns a canonical mission. Only that active assignment is editable.
  await login()
  await go(projectPath)
  await openTeam()
  const member = team().getByRole('article', { name: `Member: ${acceptedMember.name}`, exact: true })
  const assignedMission = member.getByLabel(`Mission for ${acceptedMember.name}`, { exact: true })
  assert.equal(await assignedMission.locator('option[value="discover-l1-m1"]').count(), 0, 'Initial placement remains owner-only')
  await assignedMission.selectOption('discover-l2-m1')
  await member.getByLabel('Founder instructions', { exact: false }).fill('Map the main user groups and their priorities.')
  await member.getByRole('button', { name: `Review assignment for ${acceptedMember.name}`, exact: true }).click()
  await member.getByRole('region', { name: `Review assignment for ${acceptedMember.name}`, exact: true }).getByText(projectName, { exact: true }).waitFor()
  await member.getByRole('button', { name: 'Confirm assignment', exact: true }).click()
  await assignedMission.selectOption('grow-l5-m3')
  await member.getByRole('button', { name: `Review assignment for ${acceptedMember.name}`, exact: true }).click()
  await member.getByText('This mission is locked. You can assign it now; the member can begin after its prerequisites are completed.', { exact: true }).waitFor()
  await member.getByRole('button', { name: 'Confirm assignment', exact: true }).click()
  await member.getByRole('heading', { name: 'Assigned missions 2', exact: true }).waitFor()
  await closeDialog()
  await signOut()
  await login(acceptedMember.email)
  await go(joinedPath)
  await assertCurrent('Audience segments', 2, 1)
  await openTeam()
  const memberOverview = team().getByRole('article', { name: `Member: ${acceptedMember.name}`, exact: true })
  await memberOverview.getByRole('heading', { name: 'Your assigned missions 2', exact: true }).waitFor()
  await memberOverview.getByText(/Assigned.*Available/).waitFor()
  await memberOverview.getByText(/Assigned.*Locked/).waitFor()
  assert.equal(await memberOverview.getByRole('button').count(), 0, 'Members cannot remove or change assignments')
  await layout('member-team-assignments', [320, 1440])
  await closeDialog()
  assert.equal(await missionButton('User needs', 2, 2, 'locked').isDisabled(), true)
  await openCurrent('Audience segments')
  const memberMission = dialog('Audience segments')
  await memberMission.getByRole('button', { name: 'Start mission', exact: true }).click()
  await memberMission.getByLabel('Your work', { exact: true }).fill(notes)
  await memberMission.getByLabel('Evidence link', { exact: true }).fill('https://example.test/member-evidence')
  await memberMission.getByRole('button', { name: 'Submit to Founder', exact: true }).click()
  await memberMission.locator('.mr-status').getByText('Submitted to Founder', { exact: true }).waitFor()
  assert.equal(await memberMission.getByLabel('Your work', { exact: true }).count(), 0, 'Submitted evidence is frozen during founder review')
  assert.equal(await memberMission.getByRole('button', { name: 'Approve Submission', exact: true }).count(), 0)
  assert.equal(await memberMission.getByRole('button', { name: 'Upload Approved Submission for AI Evaluation', exact: true }).count(), 0)
  await closeDialog()
  await assertCurrent('Audience segments', 2, 1)
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap coverage', exact: true }).getAttribute('aria-valuenow'), '3', 'Member submission does not auto-complete the mission')
  await signOut()
  await login()
  await go(projectPath)
  await openCurrent('Audience segments')
  const founderReview = dialog('Audience segments')
  await founderReview.getByRole('heading', { name: 'Mission Review and Approval', exact: true }).waitFor()
  await founderReview.getByRole('button', { name: 'Start founder review', exact: true }).click()
  await founderReview.locator('.mr-status').getByText('Under Founder Review', { exact: true }).waitFor()
  await founderReview.getByRole('button', { name: 'Approve Submission', exact: true }).click()
  await founderReview.locator('.mr-status').getByText('Awaiting AI Upload', { exact: true }).waitFor()
  assert.equal(await founderReview.getByRole('heading', { name: 'Simulated AI evaluation', exact: true }).count(), 0, 'Approval does not initiate AI evaluation')
  await founderReview.getByRole('button', { name: 'Upload Approved Submission for AI Evaluation', exact: true }).click()
  await founderReview.getByRole('button', { name: 'Confirm approved upload', exact: true }).click()
  await founderReview.locator('.mr-status').getByText('Uploading', { exact: true }).waitFor()
  await founderReview.getByRole('button', { name: 'Finish simulated upload', exact: true }).click()
  await founderReview.locator('.mr-status').getByText('Queued for Evaluation', { exact: true }).waitFor()
  await founderReview.getByRole('button', { name: 'Start simulated evaluation', exact: true }).click()
  await founderReview.locator('.mr-status').getByText('Evaluating', { exact: true }).waitFor()
  await founderReview.getByRole('button', { name: 'Simulate meets requirements', exact: true }).click()
  await founderReview.locator('.mr-status').getByText('Evaluation Completed', { exact: true }).waitFor()
  await founderReview.getByRole('heading', { name: 'Meets requirements', exact: true }).waitFor()
  await closeDialog()
  await assertCurrent('User needs', 2, 2)
  await signOut()
  await login(acceptedMember.email)
  await go(joinedPath)
  await assertCurrent('User needs', 2, 2, false)
  assert.equal(await button('Open current mission').count(), 0, 'Completing an assignment does not grant the next unassigned mission')
  await layout('joined-read-only', [320, 1440])
  await page.reload()
  await assertCurrent('User needs', 2, 2, false)
  await signOut()
  await login()
  await go(projectPath)
  await assertCurrent('User needs', 2, 2)
  await missionButton('Audience segments', 2, 1, 'completed').click()
  await dialog('Audience segments').locator('.mr-status').getByText('Evaluation Completed', { exact: true }).waitFor()
  await closeDialog()
  await go(independentPath)
  await assertCurrent('Problem statement', 1, 1)

  // Initial placement checks every earlier level. Credits stay separate from
  // completed work, and the final three missions still have to be completed.
  await openCurrent('Problem statement')
  await dialog('Problem statement').getByText('Already made progress?', { exact: true }).click()
  await dialog('Problem statement').getByLabel('Starting stage', { exact: true }).selectOption('4')
  await dialog('Problem statement').getByLabel('Starting level', { exact: true }).selectOption('5')
  const proofs = dialog('Problem statement').locator('.rm-level-proof')
  assert.equal(await proofs.count(), 24, 'Every prior stage and level needs evidence')
  for (let index = 0; index < 24; index += 1) {
    await proofs.nth(index).getByLabel('Completed work', { exact: true }).fill(notes)
    await proofs.nth(index).getByLabel('Proof link', { exact: true }).fill(`https://example.test/prior-level-${index + 1}`)
  }
  await acceptMission('Problem statement')
  await dialog('Problem statement').getByRole('button', { name: 'Next mission', exact: true }).click()
  await dialog('Growth priorities').waitFor()
  await closeDialog()
  await assertCurrent('Growth priorities', 5, 1)
  await page.getByText('+ 71 covered by placement', { exact: true }).waitFor()
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap coverage' }).getAttribute('aria-valuenow'), '72')
  for (const mission of ['Growth priorities', 'Experiment roadmap', 'Growth review']) {
    await openCurrent(mission)
    await acceptMission(mission)
    await closeDialog()
  }
  await page.getByRole('heading', { name: 'Roadmap completed!', exact: true }).waitFor()
  assert.equal(await button('Open current mission').count(), 0)
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap coverage' }).getAttribute('aria-valuenow'), '75')
  await page.reload()
  await page.getByRole('heading', { name: 'Roadmap completed!', exact: true }).waitFor()
  await layout('completed-roadmap', [390, 1440])
  await go('/dashboard')
  await heading('Dashboard').waitFor()
  await page.getByLabel('Active project', { exact: true }).selectOption(independentPath.split('/').at(-1))
  await page.getByRole('region', { name: 'Current project' }).getByText('Roadmap complete', { exact: true }).waitFor()
  assert.equal(await page.locator('[data-dashboard-stat="Missions remaining"]').innerText(), '0')
  await page.getByRole('region', { name: 'Project journey' }).getByRole('link', { name: 'Open roadmap', exact: true }).waitFor()
  await button('450 LabX Coins').waitFor()

  assert.deepEqual(runtimeErrors, [], 'No browser runtime errors')
  assert.deepEqual(httpErrors, [], 'All assets are available locally')
  assert.deepEqual(externalRequests, [], 'No evidence links or external services are contacted')
  assert.deepEqual(backendRequests, [], 'All progress and invitations stay local without backend requests')
  console.log('PASS: highway geometry and progression, owner evidence and placement, exact Member ID invitations with final history, reviewed assignments, member submission frozen for founder approval, explicit approved upload and simulated evaluation states, restricted members, dashboard integration, and responsive layouts.')
} catch (error) {
  await page?.screenshot({ path: `${output}failure.png`, fullPage: true, animations: 'disabled' }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()))
}
