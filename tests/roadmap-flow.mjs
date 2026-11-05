import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { AUTH_STORAGE_KEYS } from '../src/features/authentication/services/mock_auth.js'

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
    const closeMissionButton = page.getByRole('button', { name: 'Close mission', exact: true })
    if (await closeMissionButton.count()) await closeMissionButton.click()
    else await page.keyboard.press('Escape')
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
    const profiles = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '[]'), AUTH_STORAGE_KEYS.profiles)
    account.id = profiles.find((entry) => entry.user?.email === account.email)?.user?.id
    assert.ok(account.id, 'Registered members are persisted for invitation lookup')
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
    await page.getByRole('heading', { name: 'Roadmap', exact: true, level: 1 }).waitFor()
    await page.getByRole('heading', { name, exact: true, level: 2 }).waitFor()
    return path
  }
  const missionItem = (name) => page.locator('.rmj-mission-tile').filter({ has: page.getByText(name, { exact: true }) })
  const levelNode = (level, stage = 1) => page.locator(`.rmj-level-node[aria-label^="Stage ${stage}, Level ${level}:"]`)
  const stageStep = (stage) => page.locator(`.rmj-stage-step[aria-label^="Stage ${stage}:"]`)
  const selectStage = async (stage) => {
    const step = stageStep(stage)
    if (await step.isDisabled()) throw new Error(`Stage ${stage} is still locked`)
    if (!(await step.getAttribute('class')).includes('is-selected')) await step.click()
  }
  const openLevel = async (level, stage = 1) => {
    if (await page.locator('.rmj-mission-page').count()) await button('Back to journey').click()
    await selectStage(stage)
    const node = levelNode(level, stage)
    await node.scrollIntoViewIfNeeded()
    await node.click()
    const levelPage = page.locator('.rmj-mission-page')
    await levelPage.waitFor()
    return levelPage
  }
  const openMission = async (name, level, stage = 1) => {
    await openLevel(level, stage)
    await missionItem(name).click()
    await dialog(name).waitFor()
    return dialog(name)
  }
  const openCurrent = async (name) => {
    const missionPage = page.locator('.rmj-mission-page')
    if (await missionPage.count()) await missionPage.getByRole('button', { name: 'Back to journey', exact: true }).click()
    const currentStageStep = page.locator('.rmj-stage-step[aria-current="step"]')
    if (!(await currentStageStep.getAttribute('class')).includes('is-selected')) await currentStageStep.click()
    const activeNode = page.locator('.rmj-level-node[aria-label$=", current"]')
    await activeNode.waitFor()
    const label = await activeNode.getAttribute('aria-label')
    const level = Number(label.match(/Level (\d+):/)?.[1])
    const stage = Number(label.match(/Stage (\d+),/)?.[1])
    return openMission(name, level, stage)
  }
  const assertCurrent = async (name, level, order, canOpen = true) => {
    const missionPage = page.locator('.rmj-mission-page')
    if (await missionPage.count()) await missionPage.getByRole('button', { name: 'Back to journey', exact: true }).click()
    const currentStageStep = page.locator('.rmj-stage-step[aria-current="step"]')
    if (!(await currentStageStep.getAttribute('class')).includes('is-selected')) await currentStageStep.click()
    const activeNode = page.locator('.rmj-level-node[aria-label$=", current"]')
    await activeNode.waitFor()
    const label = await activeNode.getAttribute('aria-label')
    assert.match(label, new RegExp(`Level ${level}:`), `Level ${level} contains the current mission`)
    const stage = Number(label.match(/Stage (\d+),/)?.[1])
    const levelDialog = await openLevel(level, stage)
    const item = canOpen ? missionItem(name) : page.locator('.rmj-mission-tile').nth(order - 1)
    await item.waitFor()
    if (canOpen) await item.evaluate((element) => { if (!element.classList.contains('is-clickable')) throw new Error('Assigned mission card is not clickable') })
    else {
      await item.locator('.rmj-mission-locked-indicator').waitFor()
      assert.equal(await item.evaluate((element) => element.classList.contains('is-clickable')), false, 'Unassigned missions cannot be opened')
      assert.equal(await item.locator('.rmj-mission-copy').count(), 0, 'Unassigned mission details stay hidden')
      assert.equal(await item.getByText(name, { exact: true }).count(), 0, 'Unassigned mission titles stay hidden')
    }
    await levelDialog.getByRole('button', { name: 'Back to journey', exact: true }).click()
  }
  const assertMissionLocked = async (name, level, stage = 1) => {
    const levelDialog = await openLevel(level, stage)
    const item = page.locator('.rmj-mission-tile').nth(1)
    await item.locator('.rmj-mission-locked-indicator').waitFor()
    assert.equal(await item.evaluate((element) => element.classList.contains('is-clickable')), false, 'Locked missions cannot be opened')
    assert.equal(await item.locator('.rmj-mission-copy').count(), 0, 'Locked mission content stays hidden')
    assert.equal(await item.getByText(name, { exact: true }).count(), 0, 'Locked mission titles stay hidden')
    await levelDialog.getByRole('button', { name: 'Back to journey', exact: true }).click()
  }
  const assertMissionReviewable = async (name, level, stage = 1) => {
    const levelDialog = await openLevel(level, stage)
    await missionItem(name).evaluate((element) => { if (!element.classList.contains('is-clickable')) throw new Error('Completed mission card is not clickable') })
    await levelDialog.getByRole('button', { name: 'Back to journey', exact: true }).click()
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
  const layout = async (name, widths = [320, 390, 768, 1440, 1920]) => {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name} fits ${width}px`)
      const viewport = page.locator('.rmj-mountain-viewport')
      if (await viewport.count()) {
        assert.equal(await page.locator('.rmj-stage-step').count(), 5, 'The journey summarizes all five stages')
        assert.equal(await page.locator('.rmj-level-node').count(), 5, 'The selected stage displays all five level nodes')
        const scroll = await viewport.evaluate((element) => ({
          clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
          clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
          overflowY: getComputedStyle(element).overflowY,
        }))
        assert.ok(scroll.scrollHeight <= scroll.clientHeight + 1, 'The complete stage fits without vertical roadmap scrolling')
        assert.ok(scroll.scrollWidth <= scroll.clientWidth + 1, 'The journey has no horizontal overflow')
        assert.equal(scroll.overflowY, 'hidden')
      } else if (await page.locator('.rmj-mission-page').count()) {
        assert.equal(await page.locator('.rmj-mission-tile').count(), 3, 'A level page displays its three mission tiles')
      }
      const open = page.locator('dialog[open]')
      if (await open.count()) {
        assert.equal(await open.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), true, `${name} dialog has no horizontal overflow at ${width}px`)
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
    await page.getByRole('navigation', { name: 'Collaboration views', exact: true }).getByRole('tab', { name: 'My activity', exact: true }).click()
  }

  // Accounts are created through the public UI in an isolated browser context.
  await register(acceptedMember)
  await signOut()
  await register(decliningMember)
  await signOut()
  await login()
  await go('/dashboard')
  const pointsBeforeMissions = await page.locator('[data-dashboard-stat="LabX Points"]').innerText()
  const badgesBeforeMissions = await page.locator('[data-dashboard-stat="Earned badges"]').innerText()
  await joinPortal()
  await page.getByText('No roadmap invitations yet. Share your Member ID with a founder.', { exact: true }).waitFor()
  await page.getByText('No joined roadmaps yet. Accept an invitation or have a join request accepted to find your team here.', { exact: true }).waitFor()
  await layout('join-roadmap-empty', [320, 1440])
  const projectName = 'Community Health Workflow'
  const projectPath = await createRoadmap(projectName)
  const joinedPath = `/roadmap/joined/demo-founder/${projectPath.split('/').at(-1)}`
  await page.getByRole('region', { name: `${projectName} roadmap journey`, exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: /Review and Approve/ }).count(), 1, 'Founder roadmaps expose the review queue')
  const stageColors = await page.locator('.rmj-stage-step').evaluateAll((steps) => steps.map((step) => step.style.getPropertyValue('--stage-color')))
  assert.equal(new Set(stageColors).size, 5, 'Stage navigation uses distinct stage accents')
  assert.equal(await page.locator('.rmj-progress-summary').count(), 0, 'Roadmap progress summary is removed')
  await assertCurrent('Problem statement', 1, 1)
  await assertMissionLocked('User context', 1)
  await layout('initial-roadmap')
  await selectStage(1)
  await levelNode(5, 1).click()
  assert.match(await levelNode(5, 1).getAttribute('aria-label'), /locked$/, 'Locked levels remain identifiable')
  assert.equal(await page.locator('.rmj-mission-page').count(), 0, 'Locked levels remain previews, not mission pages')
  await assertCurrent('Problem statement', 1, 1)

  // Invalid work produces persistent feedback without unlocking the next mission.
  const first = await openCurrent('Problem statement')
  assert.equal(await page.locator('.rmj-mission-page').count(), 1, 'Opening a mission keeps its mission page in the background')
  assert.equal(await page.locator('.rmj-mission-page').isVisible(), true, 'The mission dialog overlays rather than replaces the mission page')
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
  assert.equal(await page.evaluate(() => ['hidden', 'clip'].includes(getComputedStyle(document.documentElement).overflowY)
    || ['hidden', 'clip'].includes(getComputedStyle(document.body).overflowY)), false, 'Opening a mission does not lock background scrolling')
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('roadmap-dialog-open')), true, 'The non-modal overlay remains visible')
  await layout('accepted-mission', [320, 1440])
  await dialog('Problem statement').getByRole('button', { name: 'Close mission', exact: true }).click()
  await openMission('User context', 1)

  // File evidence is local metadata; oversized files cannot be submitted as proof.
  await dialog('User context').getByLabel(/^Evidence file/).setInputFiles({
    name: 'too-large.txt', mimeType: 'text/plain', buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 65),
  })
  await dialog('User context').getByRole('alert').filter({ hasText: 'Evidence must be 5 MB or smaller.' }).waitFor()
  assert.equal(await dialog('User context').getByLabel(/^Evidence file/).inputValue(), '')
  await acceptMission('User context', { file: true })
  await dialog('User context').getByText(/user-research\.txt.*metadata saved/).waitFor()
  await dialog('User context').getByRole('button', { name: 'Close mission', exact: true }).click()
  await openMission('Opportunity brief', 1)
  await acceptMission('Opportunity brief')
  await closeDialog()
  await assertCurrent('Audience segments', 2, 1)
  await assertMissionReviewable('Problem statement', 1)
  await assertMissionLocked('User needs', 2)
  await page.reload()
  await page.getByRole('heading', { name: 'Roadmap', exact: true, level: 1 }).waitFor()
  await page.getByRole('heading', { name: projectName, exact: true, level: 2 }).waitFor()
  await assertCurrent('Audience segments', 2, 1)
  assert.equal(await page.locator('.rmj-progress-summary').count(), 0, 'Roadmap progress summary stays hidden after mission completion')
  await layout('progressed-roadmap')

  // Approved work updates earned badges but does not award LabX Points.
  await go('/dashboard')
  await heading('Dashboard').waitFor()
  await page.getByLabel('Select Roadmap', { exact: true }).selectOption(projectPath.split('/').at(-1))
  assert.equal(await page.locator('[data-dashboard-stat="LabX Points"]').innerText(), pointsBeforeMissions)
  assert.ok(Number(await page.locator('[data-dashboard-stat="Earned badges"]').innerText()) > Number(badgesBeforeMissions))
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
  assert.equal(await page.locator('.rmj-mountain-viewport').count(), 0, 'A pending invitation does not grant roadmap access')
  await joinPortal()
  await layout('join-roadmap-invitation', [320, 1440])
  const invitation = () => page.getByRole('listitem', { name: `Invitation: ${projectName}`, exact: true })
  await invitation().getByRole('button', { name: 'Decline invitation', exact: true }).click()
  await invitation().getByText('Declined by Member', { exact: true }).waitFor()
  assert.equal(await invitation().count(), 1, 'Declined invitations stay in response history')
  assert.equal(await invitation().getByRole('button').count(), 0, 'Final decisions cannot be repeated')
  await collection('Joined as Member')
  assert.equal(await page.getByRole('link', { name: `Open joined roadmap: ${projectName}`, exact: true }).count(), 0)
  await go(joinedPath)
  await heading('Roadmap unavailable').waitFor()
  assert.equal(await page.locator('.rmj-mountain-viewport').count(), 0, 'A declined invitation grants no access')
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
  await page.getByRole('region', { name: `${projectName} roadmap journey`, exact: true }).waitFor()
  assert.equal(await button('Manage team').count(), 0, 'Member roadmaps hide founder team controls')
  const memberReview = button(/Pending Approval/)
  await memberReview.waitFor()
  await memberReview.click()
  const memberAssignments = dialog('Pending Approval')
  await memberAssignments.waitFor()
  await memberAssignments.getByText('There are no mission approvals waiting for you.', { exact: true }).waitFor()
  await memberAssignments.getByRole('button', { name: 'Close review queue', exact: true }).click()
  await memberAssignments.waitFor({ state: 'hidden' })
  assert.equal(await button(`Edit ${projectName}`).count(), 0)
  assert.equal(await button(`Delete ${projectName}`).count(), 0)
  await assertCurrent('Audience segments', 2, 1, false)
  await go(`${joinedPath}?milestone=discover-l2-m1`)
  await page.getByRole('region', { name: `${projectName} roadmap journey`, exact: true }).waitFor()
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
  await page.locator('.labx-sidebar-nav').getByRole('link', { name: 'Roadmap', exact: true }).click()
  await at('/roadmap')
  await page.getByRole('button', { name: 'Joined as Member' }).click()
  await at('/roadmap?view=joined')
  const assignmentTable = page.locator('.projects-table--assignments')
  await assignmentTable.waitFor()
  assert.deepEqual(await assignmentTable.locator('thead th').allTextContents().then((items) => items.map((item) => item.trim())), ['Mission', 'Project', 'Founder', 'Joined at', 'Expire Date', 'Status', 'Action'])
  const assignedMissionRow = assignmentTable.locator('tbody tr').filter({ hasText: 'Audience segments' }).first()
  const missionLink = assignedMissionRow.getByRole('link', { name: 'Audience segments', exact: false }).first()
  assert.match(await missionLink.getAttribute('href'), /milestone=discover-l2-m1/, 'Mission name opens its assigned roadmap mission')
  assert.equal(await assignedMissionRow.getByRole('button', { name: /Request to leave/ }).count(), 1, 'Only the exit icon is shown in the action column')
  await assignedMissionRow.getByRole('button', { name: /Request to leave/ }).click()
  const exitDialog = dialog('Request to leave this mission?')
  await exitDialog.waitFor()
  await exitDialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await exitDialog.waitFor({ state: 'hidden' })
  await go(joinedPath)
  assert.equal(await button('Manage team').count(), 0, 'Member roadmaps hide team assignment controls')
  const memberReviewAfterExit = button(/Pending Approval/)
  await memberReviewAfterExit.waitFor()
  await memberReviewAfterExit.click()
  const memberAssignmentsAfterExit = dialog('Pending Approval')
  await memberAssignmentsAfterExit.waitFor()
  await memberAssignmentsAfterExit.getByText('Audience segments', { exact: true }).waitFor()
  await memberAssignmentsAfterExit.getByRole('button', { name: 'Close review queue', exact: true }).click()
  const memberAssignedLevel = await openLevel(2, 1)
  await memberAssignedLevel.getByText('Only the mission assigned to you is available. Other missions and levels remain locked.', { exact: true }).waitFor()
  assert.equal(await page.locator('.rmj-mission-tile.is-clickable').count(), 1, 'Members can open only their assigned mission')
  assert.equal(await page.locator('.rmj-mission-tile .rmj-mission-copy').count(), 1, 'Unassigned mission details stay hidden')
  await memberAssignedLevel.getByRole('button', { name: 'Back to journey', exact: true }).click()
  await assertMissionLocked('User needs', 2)
  await openCurrent('Audience segments')
  const memberMission = dialog('Audience segments')
  await memberMission.locator('.mr-status').getByText('In Progress', { exact: true }).waitFor()
  await memberMission.getByLabel('Your work', { exact: true }).fill(notes)
  await memberMission.getByLabel('Evidence link', { exact: true }).fill('https://example.test/member-evidence')
  await memberMission.getByRole('button', { name: 'Submit to Founder', exact: true }).click()
  await memberMission.locator('.mr-status').getByText('Submitted to Founder', { exact: true }).waitFor()
  assert.equal(await memberMission.getByLabel('Your work', { exact: true }).count(), 0, 'Submitted evidence is frozen during founder review')
  assert.equal(await memberMission.getByRole('button', { name: 'Approve Submission', exact: true }).count(), 0)
  assert.equal(await memberMission.getByRole('button', { name: 'Upload Approved Submission for AI Evaluation', exact: true }).count(), 0)
  await closeDialog()
  await assertCurrent('Audience segments', 2, 1)
  assert.equal(await page.locator('.rmj-progress-summary').count(), 0, 'Member roadmaps have no progress summary')
  await button(/Pending Approval/).click()
  const memberPending = dialog('Pending Approval')
  await memberPending.getByText('Submitted by', { exact: true }).waitFor()
  await memberPending.getByText(acceptedMember.name, { exact: true }).waitFor()
  await memberPending.getByRole('button', { name: 'Close review queue', exact: true }).click()
  await memberPending.waitFor({ state: 'hidden' })
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
  await assertCurrent('Growth review', 5, 3)
  await layout('joined-read-only', [320, 1440])
  await page.reload()
  await assertCurrent('Growth review', 5, 3)
  await signOut()
  await login()
  await go(projectPath)
  await assertCurrent('User needs', 2, 2)
  await openMission('Audience segments', 2, 1)
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
  await dialog('Problem statement').getByRole('button', { name: 'Close mission', exact: true }).click()
  await openCurrent('Growth priorities')
  await closeDialog()
  await assertCurrent('Growth priorities', 5, 1)
  assert.equal(await page.locator('.rmj-progress-summary').count(), 0, 'Completed stage credits do not restore the progress summary')
  assert.equal(await page.locator('.rmj-stage-step.is-complete').count(), 4, 'Placement credits complete the four covered stage indicators')
  for (const mission of ['Growth priorities', 'Experiment roadmap', 'Growth review']) {
    await openCurrent(mission)
    await acceptMission(mission)
    await closeDialog()
  }
  const completedLevelPage = page.locator('.rmj-mission-page')
  if (await completedLevelPage.count()) await completedLevelPage.getByRole('button', { name: 'Back to journey', exact: true }).click()
  assert.equal(await page.locator('.rmj-mountain-finish, .rmj-summit-flag').count(), 0, 'The map has no extra summit or initiator controls')
  assert.equal(await page.locator('.rmj-level-node[aria-label$=", current"]').count(), 0)
  assert.equal(await page.locator('.rmj-progress-summary').count(), 0, 'Completed roadmaps have no progress summary')
  await page.reload()
  assert.equal(await page.locator('.rmj-mountain-finish, .rmj-summit-flag').count(), 0, 'The completed mountain still ends at level 5')
  await layout('completed-roadmap', [390, 1440])
  await go('/dashboard')
  await heading('Dashboard').waitFor()
  await page.getByLabel('Select Roadmap', { exact: true }).selectOption(independentPath.split('/').at(-1))
  await page.getByRole('region', { name: 'Current project' }).getByText('Roadmap complete', { exact: true }).waitFor()
  assert.equal(await page.locator('[data-dashboard-stat="Missions remaining"]').innerText(), '0')
  await page.getByRole('region', { name: 'Project journey' }).getByRole('link', { name: 'Open roadmap', exact: true }).waitFor()
  assert.equal(await page.locator('[data-dashboard-stat="LabX Points"]').innerText(), pointsBeforeMissions)

  assert.deepEqual(runtimeErrors, [], 'No browser runtime errors')
  assert.deepEqual(httpErrors, [], 'All assets are available locally')
  assert.deepEqual(externalRequests, [], 'No evidence links or external services are contacted')
  assert.deepEqual(backendRequests, [], 'All progress and invitations stay local without backend requests')
  console.log('PASS: continuous journey progression, owner evidence and placement, exact Member ID invitations with final history, reviewed assignments, member submission frozen for founder approval, explicit approved upload and simulated evaluation states, restricted members, dashboard integration, and responsive layouts.')
} catch (error) {
  await page?.screenshot({ path: `${output}failure.png`, fullPage: true, animations: 'disabled' }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()))
}
