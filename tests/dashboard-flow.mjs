import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { DEMO_CREDENTIALS } from '../src/features/authentication/services/mock_auth.js'
import { getLeaderboardSnapshot } from '../src/features/leaderboard/services/mock_leaderboard.js'
import { getAchievementsSnapshot } from '../src/features/achievements/services/mock_achievements.js'
import { getDashboardSnapshot } from '../src/features/dashboard/services/dashboard_snapshot.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = fileURLToPath(new URL('../test-results/dashboard/', import.meta.url))
const origin = 'http://127.0.0.1:5190'
const demoUser = { id: 'demo-founder', full_name: 'Founder', username: 'founder', email: 'founder@labx.demo', role: 'founder', total_points: 0 }
const executablePath = process.env.LABX_BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
await mkdir(output, { recursive: true })
const server = await preview({ root, envDir: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 5190, strictPort: true } })
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
  await page.clock.setFixedTime(new Date('2026-10-20T04:30:00Z'))

  const go = (path) => page.goto(`${origin}${path}`)
  const at = (path) => page.waitForURL(`${origin}${path}`)
  const heading = (name) => page.getByRole('heading', { name, exact: true, level: 1 })
  const button = (name) => page.getByRole('button', { name, exact: true })
  const submit = () => page.locator('button[type="submit"]').click()
  const dashboard = async () => { await go('/dashboard'); await heading('Dashboard').waitFor() }
  const signOut = async () => { await button('Sign out').click(); await at('/login') }
  const closeDialog = async () => {
    await page.keyboard.press('Escape')
    await page.locator('dialog[open]').waitFor({ state: 'hidden' })
  }

  const checkLayout = async (name, widths = [320, 390, 768, 1440]) => {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => window.scrollTo(0, 0))
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name} fits ${width}px`)
      const headerLayout = await page.evaluate(() => {
        const header = document.querySelector('.db-header').getBoundingClientRect()
        const actions = document.querySelector('.labx-navbar-actions').getBoundingClientRect()
        const overlap = [...document.querySelector('.db-header').children].some((element) => {
          const rect = element.getBoundingClientRect()
          return actions.left < rect.right && actions.right > rect.left && actions.top < rect.bottom && actions.bottom > rect.top
        })
        return { overlap, fits: actions.left >= 0 && actions.right <= innerWidth + 1, aligned: innerWidth > 900 ? actions.top < header.bottom && actions.bottom > header.top : actions.bottom <= header.top }
      })
      assert.equal(headerLayout.overlap, false, `${name} header controls do not overlap at ${width}px`)
      assert.equal(headerLayout.fits, true, `${name} navbar controls fit ${width}px`)
      assert.equal(headerLayout.aligned, true, `${name} compact navbar is aligned at ${width}px`)
      await page.screenshot({ path: `${output}${name}-${width}.png`, fullPage: true, animations: 'disabled' })
    }
  }

  const createProject = async (name, domain) => {
    await go('/roadmap/new')
    await page.getByRole('textbox', { name: 'Project name', exact: true }).fill(name)
    await button('Start assessment').click()
    await page.waitForURL(/\/roadmap\/[^/]+\/assessment$/)
    const projectPath = new URL(page.url()).pathname.replace(/\/assessment$/, '')
    await button(domain).click()
    await button('Next Step').click()
    await button('Individual consumers').click()
    return projectPath
  }

  const completeAssessment = async (projectPath) => {
    await button('Next Step').click()
    for (const answer of ['Web application', 'Exploring an idea', 'Not researched', 'Concept only', 'No target customers identified']) {
      await button(answer).click()
      await button('Next Step').click()
    }
    await button('Problem clarity').click()
    await button('Review Answers').click()
    await page.getByRole('button', { name: 'Submit Assessment', exact: true }).click()
    await at(`${projectPath}/result`)
    await heading('Your assessment summary').waitFor()
  }

  const registerAndVerify = async (role) => {
    await go(`/register?role=${role}`)
    await page.getByLabel('Full Name', { exact: true }).fill(`Dashboard ${role}`)
    await page.getByLabel('Email Address', { exact: true }).fill(`dashboard-${role}@example.com`)
    await page.getByLabel('Password', { exact: true }).fill('DashboardPass1!')
    await page.getByLabel('Confirm Password', { exact: true }).fill('DashboardPass1!')
    await submit()
    await at('/verify-email')
    const code = (await page.getByTestId('demo-signup-code').innerText()).trim()
    assert.match(code, /^\d{6}$/)
    await page.getByLabel('Digit 1 of 6', { exact: true }).fill(code)
    await button('Verify email').click()
    await at(role === 'founder' ? '/roadmap/new' : `/onboarding/${role}`)
  }

  const stat = (name) => page.locator(`[data-dashboard-stat="${name}"]`)
  const mission = () => page.getByRole('region', { name: 'Current project', exact: true })
  const projectPicker = () => page.getByLabel('Select Roadmap', { exact: true })
  const chooseProject = (path) => projectPicker().selectOption(decodeURIComponent(path.split('/').at(-1)))
  const assertProgress = async (name, value, max) => {
    const progress = page.getByRole('progressbar', { name, exact: true })
    await progress.waitFor()
    assert.equal(await progress.getAttribute('aria-valuenow'), String(value), `${name} current value`)
    assert.equal(await progress.getAttribute('aria-valuemax'), String(max), `${name} maximum`)
  }

  const content = () => page.locator('.db-page')
  const assertUniqueDestinations = async () => {
    const destinations = await content().locator('a[href]').evaluateAll((links) => links.filter((link) => !link.closest('.db-statistics')).map((link) => new URL(link.href).pathname.split('/').filter(Boolean)[0]))
    assert.equal(destinations.length, new Set(destinations).size, 'Dashboard content offers only one link to each destination screen')
    assert.equal(await content().locator('.sharp-briefing').count(), 0, 'The Zenith promotional banner is removed')
    assert.equal(await content().locator('.db-quest-shortcut').count(), 0, 'No Daily Quest shortcut in the dashboard header')
    assert.equal(await content().locator('.db-project-heading').count(), 0, 'The Your projects list is removed')
    assert.equal(await content().locator('.db-secondary').count(), 0, 'Recent Activity is removed from the founder Dashboard')
    if (await content().locator('.db-statistics').count()) {
      assert.equal(await stat('LabX Points').count(), 1, 'The founder Dashboard shows the account LabX Points balance')
      assert.equal(await stat('LabX Coins').count(), 1, 'The founder Dashboard shows lifetime Daily Quest coins separately')
      assert.equal(await stat('LabX Points').evaluate((element) => element.closest('a')?.getAttribute('href')), '/achievements', 'LabX Points opens Achievements')
      assert.equal(await stat('Roadmaps ready').evaluate((element) => element.closest('a')?.getAttribute('href')), '/roadmap', 'Roadmaps Ready opens Roadmap')
      assert.equal(await content().locator('.db-ranks').getAttribute('href'), '/leaderboard', 'The full Rankings card opens Leaderboard')
      assert.equal(await content().getByRole('button', { name: 'Open daily quests', exact: true }).count(), 1, 'Dashboard has one Daily Quests entry point')
      assert.equal(await content().getByRole('button', { name: 'View LabX Coins in Daily Quests', exact: true }).count(), 1, 'The coins card opens its Daily Quests destination')
      assert.equal(await content().locator('.db-statistics > :first-child').getAttribute('aria-label'), 'Open daily quests', 'Daily Quests occupies the first statistics card')
      assert.equal(await content().locator('.db-statistics').getByRole('button', { name: 'Open daily quests', exact: true }).count(), 1)
      assert.equal(await content().locator('.db-dashboard-columns .sq-card').count(), 0, 'The lower Daily Quests duplicate is removed')
      assert.ok(await content().locator('.db-statistics').evaluate((stats) => stats.compareDocumentPosition(document.querySelector('.db-progress-overview')) & Node.DOCUMENT_POSITION_FOLLOWING), 'KPIs precede selected-project progress')
    }
  }
  const eventsPanel = () => page.getByRole('region', { name: 'Upcoming events', exact: true })

  await go('/dashboard')
  await at('/login')
  await page.getByLabel('Email Address', { exact: true }).fill(DEMO_CREDENTIALS.email)
  await page.getByLabel('Password', { exact: true }).fill(DEMO_CREDENTIALS.password)
  await submit()
  await at('/dashboard')
  await heading('Dashboard').waitFor()
  const achievements = getAchievementsSnapshot(demoUser)
  const ranking = getLeaderboardSnapshot({ user: demoUser, projects: [] })
  assert.equal(await stat('Daily Quests').innerText(), '0 / 3')
  assert.equal(await stat('LabX Points').innerText(), String(achievements.pointsBalance))
  assert.equal(await stat('LabX Coins').innerText(), '0')
  assert.equal(await stat('Earned badges').innerText(), String(achievements.earnedBadgeCount))
  assert.equal(await stat('Global Rank').innerText(), '#' + ranking.userStanding.rank)
  assert.equal(await stat('Domain Rank').innerText(), 'Unranked')
  assert.equal(await stat('Roadmaps ready').innerText(), '0 / 0')
  assert.equal(await stat('Completed missions').innerText(), '0')
  assert.equal(await stat('Missions remaining').innerText(), '—', 'No invented mission total without a project')
  assert.equal(await stat('Placement credits').innerText(), '0')
  assert.equal(await projectPicker().count(), 1)
  assert.equal(await projectPicker().isDisabled(), true, 'The empty founder sees a disabled roadmap selector')
  assert.equal(await projectPicker().locator('option').textContent(), 'No projects available', 'The empty selector explains why it has no options')
  await content().getByRole('link', { name: 'Open Roadmap', exact: true }).waitFor()
  await page.getByRole('button', { name: '450 LabX Coins', exact: true }).waitFor()
  assert.equal(await content().getByRole('progressbar', { name: 'Roadmap progress', exact: true }).count(), 0)
  await assertUniqueDestinations()
  await checkLayout('founder-empty')
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true)
  assert.equal(await content().evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length), 0, 'Dashboard respects reduced motion')

  await content().locator('.db-ranks').click()
  await at('/leaderboard')
  await heading('LabX Leaderboard').waitFor()
  await dashboard()
  await content().getByRole('link', { name: 'View achievements', exact: true }).click()
  await at('/achievements')
  await heading('Achievements').waitFor()
  await page.goBack()
  await at('/dashboard')
  await heading('Dashboard').waitFor()
  const upcoming = getDashboardSnapshot({ user: demoUser, now: Date.parse('2026-10-20T04:30:00Z') }).upcomingEvents
  assert.equal(await eventsPanel().locator('.db-event-list > li').count(), upcoming.length)
  for (const event of upcoming) await eventsPanel().getByRole('heading', { name: event.title, exact: true }).waitFor()
  assert.equal(await eventsPanel().getByRole('link').count(), 1, 'Event previews share one destination')
  await eventsPanel().getByRole('link', { name: 'View all events', exact: true }).click()
  await at('/events')
  await heading('Events & Opportunities').waitFor()
  await dashboard()
  await eventsPanel().getByRole('button', { name: 'My events', exact: true }).click()
  await eventsPanel().getByText('No upcoming registrations.', { exact: true }).waitFor()
  await eventsPanel().getByRole('link', { name: 'View all events', exact: true }).click()
  await at('/events?view=my')
  await dashboard()

  // Actual project assessment and mission evidence drive completed and remaining counts.
  const draftPath = await createProject('Dashboard Draft', 'Women Safety & Social Impact')
  await dashboard()
  assert.equal(await projectPicker().locator('option').count(), 1, 'The selector remains available for one draft project')
  await chooseProject(draftPath)
  assert.equal(await projectPicker().inputValue(), decodeURIComponent(draftPath.split('/').at(-1)))
  await assertProgress('Assessment progress', 2, 8)
  assert.equal(await stat('Roadmaps ready').innerText(), '0 / 1')
  assert.equal(await stat('Missions remaining').innerText(), '—')
  await content().getByRole('link', { name: 'Continue assessment', exact: true }).waitFor()
  await assertUniqueDestinations()
  await checkLayout('founder-draft', [320, 390, 1440])

  const completedPath = await createProject('Dashboard Health', 'Healthcare & MedTech')
  await completeAssessment(completedPath)
  await dashboard()
  await chooseProject(completedPath)
  assert.equal(await projectPicker().locator('option').count(), 2)
  assert.equal(await projectPicker().evaluate((element) => element.closest('.db-journey') !== null), true, 'The selector lives in Roadmap Overview')
  await mission().getByRole('heading', { name: 'Dashboard Health', exact: true }).waitFor()
  await mission().getByText(/Discover.*Level 1.*Healthcare & MedTech/).waitFor()
  await mission().getByText('Up next: Problem statement', { exact: true }).waitFor()
  assert.equal(await page.getByRole('progressbar', { name: 'Roadmap progress', exact: true }).count(), 0, 'The standalone roadmap progress bar is removed')
  await assertProgress('Discover missions covered', 0, 15)
  assert.equal(await stat('Completed missions').innerText(), '0')
  assert.equal(await stat('Missions remaining').innerText(), '75')
  assert.equal(await stat('Placement credits').innerText(), '0')
  assert.equal(await stat('Roadmaps ready').innerText(), '1 / 2')
  assert.match(await stat('Domain Rank').innerText(), /^#\d+$/)
  assert.equal(await stat('Earned badges').innerText(), '3', 'Assessment placement does not award badges')
  assert.equal(await content().getByRole('link', { name: /stage,/ }).count(), 0, 'Stage statistics do not duplicate Roadmap links')
  await assertUniqueDestinations()
  await checkLayout('founder-ready', [320, 390, 768, 1024, 1440])
  const desktopBlocks = await page.locator('.db-dashboard-grid').evaluate((grid) => {
    const rect = (selector) => {
      const element = grid.querySelector(selector)
      return { ...element.getBoundingClientRect().toJSON(), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }
    }
    const progress = rect('.db-progress-overview')
    const breakdown = rect('.db-progress-breakdown')
    const roadmap = rect('.db-journey')
    const achievements = rect('.db-achievements')
    const events = rect('.db-events')
    return { progress, breakdown, roadmap, achievements, events }
  })
  assert.ok(Math.abs(desktopBlocks.progress.top - desktopBlocks.roadmap.top) < 2, 'Progress and Roadmap Overview share the top row')
  assert.ok(Math.abs(desktopBlocks.achievements.top - desktopBlocks.events.top) < 2, 'Achievements and Events share the bottom row')
  assert.ok(Math.abs(desktopBlocks.progress.height - desktopBlocks.roadmap.height) < 2, 'Progress matches the Roadmap Overview height')
  assert.ok(Math.abs(desktopBlocks.achievements.height - desktopBlocks.events.height) < 2, 'Achievements matches the Events height')
  assert.ok(Math.abs(desktopBlocks.progress.left - desktopBlocks.achievements.left) < 2, 'Progress and Achievements share the left column')
  assert.ok(Math.abs(desktopBlocks.roadmap.left - desktopBlocks.events.left) < 2, 'Roadmap Overview and Events share the right column')
  for (const [name, block] of Object.entries(desktopBlocks)) {
    assert.ok(block.scrollWidth <= block.clientWidth + 1, `${name} has no horizontal overflow (${block.scrollWidth}px scroll width, ${block.clientWidth}px client width)`)
  }
  const progressBottomInset = desktopBlocks.progress.bottom - desktopBlocks.breakdown.bottom
  assert.ok(progressBottomInset >= 11 && progressBottomInset <= 15, 'Mission counts sit close to the bottom of the Progress card')
  const progressRows = await page.locator('.db-progress-overview').evaluate((card) => {
    const ring = card.querySelector('.db-progress-ring').getBoundingClientRect()
    const copy = card.querySelector('.db-overview-copy').getBoundingClientRect()
    const metrics = card.querySelector('.db-progress-breakdown').getBoundingClientRect()
    return { ringTop: ring.top, ringWidth: ring.width, ringHeight: ring.height, copyTop: copy.top, copyBottom: copy.bottom, metricsTop: metrics.top }
  })
  assert.ok(progressRows.ringTop < progressRows.copyTop && progressRows.copyTop < progressRows.metricsTop, 'Progress ring and roadmap name align vertically above the mission metrics')
  assert.ok(progressRows.ringWidth >= 194 && progressRows.ringHeight >= 194, 'Desktop progress ring uses the increased size')
  assert.ok(progressRows.metricsTop >= progressRows.copyBottom, 'Mission metrics appear on a separate second row')
  const ringTypography = await page.locator('.db-progress-ring').evaluate((ring) => {
    const value = ring.querySelector('strong')
    const label = ring.querySelector(':scope > span')
    const valueBox = value.getBoundingClientRect()
    const labelBox = label.getBoundingClientRect()
    return { fontSize: Number.parseFloat(getComputedStyle(value).fontSize), centerOffset: Math.abs((valueBox.left + valueBox.right) / 2 - (labelBox.left + labelBox.right) / 2), gap: labelBox.top - valueBox.bottom }
  })
  assert.ok(ringTypography.fontSize >= 52, 'Progress percentage uses a larger desktop font')
  assert.ok(ringTypography.centerOffset < 1, 'Covered label is centered under the percentage')
  assert.ok(ringTypography.gap <= 8, 'Covered label stays close to the percentage')
  await page.setViewportSize({ width: 1024, height: 1000 })
  const tabletBlocks = await page.locator('.db-dashboard-grid').evaluate((grid) => ['.db-progress-overview', '.db-journey', '.db-achievements', '.db-events'].map((selector) => grid.querySelector(selector).getBoundingClientRect().top))
  assert.ok(tabletBlocks[0] < tabletBlocks[1] && tabletBlocks[1] < tabletBlocks[2] && tabletBlocks[2] < tabletBlocks[3], 'Blocks stack in order at tablet width')
  await page.setViewportSize({ width: 390, height: 844 })
  const mobileBlocks = await page.locator('.db-dashboard-grid').evaluate((grid) => ['.db-progress-overview', '.db-journey', '.db-achievements', '.db-events'].map((selector) => grid.querySelector(selector).getBoundingClientRect().top))
  assert.ok(mobileBlocks[0] < mobileBlocks[1] && mobileBlocks[1] < mobileBlocks[2] && mobileBlocks[2] < mobileBlocks[3], 'Four dashboard blocks stack in order on mobile')
  await page.setViewportSize({ width: 1440, height: 1000 })

  const secondCompletedPath = await createProject('Dashboard Growth', 'Education')
  await completeAssessment(secondCompletedPath)
  await dashboard()
  assert.equal(await projectPicker().locator('option').count(), 3)
  assert.equal(await stat('Roadmaps ready').innerText(), '2 / 3')
  const accountKpis = Object.fromEntries(await Promise.all(['LabX Points', 'LabX Coins', 'Earned badges', 'Global Rank', 'Domain Rank'].map(async (label) => [label, await stat(label).innerText()])))
  await chooseProject(completedPath)
  await mission().getByRole('heading', { name: 'Dashboard Health', exact: true }).waitFor()
  for (const [label, value] of Object.entries(accountKpis)) assert.equal(await stat(label).innerText(), value, `${label} stays account-level when switching roadmaps`)
  await chooseProject(secondCompletedPath)
  await mission().getByRole('heading', { name: 'Dashboard Growth', exact: true }).waitFor()
  assert.equal(await stat('Roadmaps ready').innerText(), '2 / 3', 'The account roadmap total does not change with the selected roadmap')
  for (const [label, value] of Object.entries(accountKpis)) assert.equal(await stat(label).innerText(), value, `${label} stays account-level when switching roadmaps`)
  await chooseProject(completedPath)
  await content().getByRole('link', { name: 'Open roadmap', exact: true }).click()
  await at(completedPath)
  await heading('Dashboard Health').waitFor()
  await go(completedPath + '?milestone=discover-l1-m1')
  const submission = page.getByRole('dialog', { name: 'Problem statement', exact: true })
  await submission.getByLabel('Your work', { exact: true }).fill('We interviewed the intended users, documented their needs, and compared our findings with existing alternatives.')
  await submission.getByLabel('Evidence link', { exact: true }).fill('https://example.test/dashboard-evidence')
  await submission.locator('.rm-placement > summary').click()
  await submission.getByLabel('Starting level', { exact: true }).selectOption('2')
  await submission.getByLabel('Completed work', { exact: true }).fill('We documented customer interviews, compared the existing alternatives, and identified the most important problem through direct observation.')
  await submission.getByLabel('Proof link', { exact: true }).fill('https://example.test/dashboard-level-one')
  await submission.getByRole('button', { name: 'Submit for evaluation', exact: true }).click()
  await submission.getByRole('heading', { name: 'Mission accepted', exact: true }).waitFor()
  await closeDialog()
  await dashboard()
  await chooseProject(completedPath)
  await assertProgress('Discover missions covered', 3, 15)
  assert.equal(await stat('Completed missions').innerText(), '1')
  assert.equal(await stat('Missions remaining').innerText(), '72')
  assert.equal(await stat('Placement credits').innerText(), '2', 'Placement credits are separated from submitted work')
  await content().locator('.db-coverage-summary').getByText('1 / 25', { exact: true }).waitFor()
  const progressedNextMission = await mission().locator('.db-next-mission').innerText()
  const accountKpisAfterApproval = Object.fromEntries(await Promise.all(['LabX Points', 'LabX Coins', 'Earned badges', 'Global Rank', 'Domain Rank'].map(async (label) => [label, await stat(label).innerText()])))
  await chooseProject(secondCompletedPath)
  await mission().getByRole('heading', { name: 'Dashboard Growth', exact: true }).waitFor()
  await assertProgress('Discover missions covered', 0, 15)
  assert.equal(await stat('Completed missions').innerText(), '0')
  assert.equal(await stat('Missions remaining').innerText(), '75')
  assert.equal(await stat('Placement credits').innerText(), '0')
  await content().locator('.db-coverage-summary').getByText('0 / 25', { exact: true }).waitFor()
  assert.notEqual(await mission().locator('.db-next-mission').innerText(), progressedNextMission, 'The selected roadmap shows its own next mission')
  for (const [label, value] of Object.entries(accountKpisAfterApproval)) assert.equal(await stat(label).innerText(), value, `${label} stays account-level when switching roadmaps`)
  await chooseProject(completedPath)
  assert.equal(await stat('Completed missions').innerText(), '1')
  assert.equal(await stat('Missions remaining').innerText(), '72')
  assert.equal(await stat('Placement credits').innerText(), '2')
  assert.equal(await stat('Daily Quests').innerText(), '0 / 3', 'Roadmap progress does not complete a side quest')
  await page.getByRole('button', { name: '450 LabX Coins', exact: true }).waitFor()
  await checkLayout('founder-progressed', [320, 768, 1440])
  await chooseProject(draftPath)
  await assertProgress('Assessment progress', 2, 8)
  assert.equal(await stat('Completed missions').innerText(), '0')
  assert.equal(await stat('Placement credits').innerText(), '0')
  assert.equal(await stat('Missions remaining').innerText(), '—', 'Another project does not inherit progress')
  await page.reload()
  await heading('Dashboard').waitFor()
  await chooseProject(completedPath)
  await assertUniqueDestinations()
  await signOut()

  await registerAndVerify('founder')
  await dashboard()
  assert.equal(await stat('Daily Quests').innerText(), '0 / 3')
  assert.equal(await stat('Earned badges').innerText(), '0')
  assert.equal(await stat('Roadmaps ready').innerText(), '0 / 0')
  assert.equal(await stat('Completed missions').innerText(), '0')
  assert.equal(await projectPicker().count(), 1)
  assert.equal(await projectPicker().isDisabled(), true)
  await assertUniqueDestinations()
  await checkLayout('new-founder', [320, 1440])
  await signOut()

  for (const role of ['mentor', 'investor']) {
    await registerAndVerify(role)
    await dashboard()
    assert.equal(await page.getByRole('region', { name: 'Founder overview', exact: true }).count(), 0)
    assert.equal(await projectPicker().count(), 0)
    await page.locator('.db-role-summary').getByText('Not completed', { exact: true }).waitFor()
    await page.getByRole('button', { name: '0 LabX Coins', exact: true }).waitFor()
    const roleStatus = role === 'mentor' ? 'No assignments yet' : 'Not submitted'
    await page.locator('.db-role-summary').getByText(roleStatus, { exact: true }).waitFor()
    if (role === 'mentor') {
      for (const view of ['Active', 'Trial', 'Past']) {
        await button(view).click()
        assert.equal(await button(view).getAttribute('aria-pressed'), 'true')
        await page.getByRole('status').getByRole('heading', { name: 'No ' + view.toLowerCase() + ' mentorships yet.', exact: true }).waitFor()
      }
    } else await eventsPanel().getByRole('heading', { name: 'Inside an Early-Stage Investment', exact: true }).waitFor()
    await assertUniqueDestinations()
    await checkLayout(role + '-empty')
    await page.getByRole('link', { name: 'Continue profile setup', exact: true }).click()
    await at('/onboarding/' + role)
    if (role === 'mentor') {
      await page.getByLabel('Area of expertise', { exact: true }).fill('Product strategy')
      await page.getByLabel('Years of experience', { exact: true }).selectOption({ index: 1 })
      await page.getByLabel('Monthly availability', { exact: true }).selectOption({ index: 1 })
    } else {
      await page.getByLabel('Investment focus', { exact: true }).fill('Climate technology')
      await page.getByLabel('Preferred stage', { exact: true }).selectOption({ label: 'Seed' })
      await page.getByLabel(/^Organization/).fill('Dashboard Ventures')
    }
    await submit()
    await at('/dashboard')
    await heading('Dashboard').waitFor()
    await page.getByRole('link', { name: 'Edit profile preferences', exact: true }).waitFor()
    await page.locator('.db-role-summary').getByText('Completed', { exact: true }).waitFor()
    await page.locator('.db-role-summary').getByText(roleStatus, { exact: true }).waitFor()
    assert.equal(await page.locator('.db-role-journey li.is-done').count(), 1)
    await assertUniqueDestinations()
    await signOut()
  }

  assert.deepEqual(runtimeErrors, [], 'No browser runtime errors')
  assert.deepEqual(httpErrors, [], 'All local assets are available')
  assert.deepEqual(externalRequests, [], 'No remote requests')
  assert.deepEqual(backendRequests, [], 'No backend requests')
  console.log('PASS: dashboard statistics, completed/remaining/credited work, project/account isolation, single destination links, removed promotion, role preferences, responsive layouts and local-only assets.')
} catch (error) {
  await page?.screenshot({ path: output + 'failure.png', fullPage: true, animations: 'disabled' }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()))
}
