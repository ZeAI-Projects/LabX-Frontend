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
const demoUser = { id: 'demo-founder', full_name: 'Demo Founder', username: 'founder', email: 'founder@labx.demo', role: 'founder', total_points: 0 }
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
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name} fits ${width}px`)
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
    await button('Complete Assessment').click()
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
    await page.getByLabel('Six-digit code', { exact: true }).fill(code)
    await button('Verify email').click()
    await at(role === 'founder' ? '/roadmap/new' : `/onboarding/${role}`)
  }

  const stat = (name) => page.locator(`[data-dashboard-stat="${name}"]`)
  const mission = () => page.getByRole('region', { name: 'Current project', exact: true })
  const projectPicker = () => page.getByLabel('Active project', { exact: true })
  const chooseProject = (path) => projectPicker().selectOption(decodeURIComponent(path.split('/').at(-1)))
  const assertProgress = async (name, value, max) => {
    const progress = page.getByRole('progressbar', { name, exact: true })
    await progress.waitFor()
    assert.equal(await progress.getAttribute('aria-valuenow'), String(value), `${name} current value`)
    assert.equal(await progress.getAttribute('aria-valuemax'), String(max), `${name} maximum`)
  }

  // The account balance comes from approved activity, independently of project placement.
  await go('/dashboard')
  await at('/login')
  await page.getByLabel('Email Address', { exact: true }).fill(DEMO_CREDENTIALS.email)
  await page.getByLabel('Password', { exact: true }).fill(DEMO_CREDENTIALS.password)
  await submit()
  await at('/dashboard')
  await heading('Dashboard').waitFor()
  const achievements = getAchievementsSnapshot(demoUser)
  const ranking = getLeaderboardSnapshot({ user: demoUser, projects: [] })
  assert.equal(achievements.pointsBalance, 450)
  assert.equal(achievements.earnedBadgeCount, 3)
  assert.equal(ranking.userStanding.total_points, 450)
  assert.equal(await stat('LabX Points').innerText(), '450')
  assert.equal(await stat('Earned badges').innerText(), '3')
  assert.equal(await stat('Global rank').innerText(), `#${ranking.userStanding.rank}`)
  assert.equal(await stat('Roadmaps ready').innerText(), '0 / 0')
  assert.equal(await projectPicker().count(), 0)
  await page.getByRole('button', { name: '450 LabX Coins', exact: true }).waitFor()
  await mission().getByRole('link', { name: 'Create your first project', exact: true }).waitFor()
  await assertProgress('Project milestone completion', 0, 75)
  assert.equal(await page.getByRole('link', { name: / stage, (current|available|locked)$/ }).count(), 0, 'No project means no invented stage placement')
  await page.getByRole('region', { name: 'Recent activity', exact: true }).getByText('In review', { exact: true }).waitFor()
  await checkLayout('founder-empty')
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true)
  assert.equal(await page.locator('.db-page').evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length), 0, 'Dashboard respects reduced motion')

  await page.getByRole('link', { name: /^Global rank:/ }).click()
  await at('/leaderboard')
  await heading('Leaderboard').waitFor()
  await page.getByRole('region', { name: 'Your standing', exact: true }).getByText(`#${ranking.userStanding.rank}`, { exact: true }).waitFor()
  await dashboard()

  // Recognition and events open their actual details; browser history and close stay consistent.
  await page.getByRole('link', { name: 'View First Steps badge', exact: true }).click()
  await at('/achievements?badge=first-quest')
  await page.getByRole('dialog', { name: 'First Steps', exact: true }).waitFor()
  await page.goBack()
  await at('/dashboard')
  await heading('Dashboard').waitFor()
  await page.goForward()
  await at('/achievements?badge=first-quest')
  await page.getByRole('dialog', { name: 'First Steps', exact: true }).waitFor()
  await closeDialog()
  await at('/achievements')
  await go('/achievements?badge=missing-badge')
  await heading('Achievements').waitFor()
  assert.equal(await page.getByRole('dialog').count(), 0, 'An unknown badge does not open a misleading detail')
  await dashboard()
  const upcoming = getDashboardSnapshot({ user: demoUser, now: Date.parse('2026-10-20T04:30:00Z') }).upcomingEvents
  const eventsPanel = () => page.getByRole('region', { name: 'Upcoming events', exact: true })
  assert.equal(await eventsPanel().getByRole('link', { name: /^View event:/ }).count(), upcoming.length)
  for (const event of upcoming) await eventsPanel().getByRole('link', { name: `View event: ${event.title}`, exact: true }).waitFor()
  await eventsPanel().getByRole('link', { name: `View event: ${upcoming[0].title}`, exact: true }).click()
  await at(`/events?event=${upcoming[0].id}`)
  await page.getByRole('dialog', { name: upcoming[0].title, exact: true }).waitFor()
  await closeDialog()
  await at('/events')
  await go('/events?event=missing-event')
  await heading('Events & Opportunities').waitFor()
  assert.equal(await page.getByRole('dialog').count(), 0, 'An unknown event does not open a different listing')
  await dashboard()
  await eventsPanel().getByRole('button', { name: /^My events/ }).click()
  await eventsPanel().getByRole('heading', { name: 'No upcoming registrations.', exact: true }).waitFor()
  await eventsPanel().getByRole('link', { name: 'View all events', exact: true }).click()
  await at('/events?view=my')
  await page.getByRole('heading', { name: 'No saved events match this view', exact: true }).waitFor()
  await dashboard()

  const passportTrigger = button('Passport overview')
  await passportTrigger.click()
  const passport = page.getByRole('dialog', { name: 'Founder Passport', exact: true })
  await passport.waitFor()
  await passport.getByText('Try the application in your profile. Submissions and review decisions are saved locally for this demo.', { exact: true }).waitFor()
  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press('Tab')
    assert.equal(await passport.evaluate((element) => element.contains(document.activeElement)), true, 'Passport overview contains keyboard focus')
  }
  await checkLayout('passport', [320, 1440])
  await closeDialog()
  assert.equal(await passportTrigger.evaluate((element) => element === document.activeElement), true, 'Closing passport returns keyboard focus')

  // Two real projects exercise draft/ready selection without seeding fake completion data.
  const draftPath = await createProject('Dashboard Draft', 'Women Safety & Social Impact')
  await page.locator('.assessment-project-back').click()
  await at('/roadmap')
  await dashboard()
  await chooseProject(draftPath)
  await assertProgress('Assessment progress', 2, 8)
  await assertProgress('Project milestone completion', 0, 75)
  assert.equal(await stat('Roadmaps ready').innerText(), '0 / 1')
  await mission().getByRole('link', { name: 'Continue assessment', exact: true }).waitFor()
  assert.equal(await page.getByRole('progressbar', { name: 'Current milestone progress', exact: true }).count(), 0)
  const completedPath = await createProject('Dashboard Health', 'Healthcare & MedTech')
  await completeAssessment(completedPath)
  await dashboard()
  assert.equal(await projectPicker().locator('option').count(), 2)
  await chooseProject(completedPath)
  await mission().getByRole('heading', { name: 'Problem statement', exact: true }).waitFor()
  await mission().getByText(/Discover.*Level 1/).waitFor()
  await mission().getByText('Healthcare & MedTech', { exact: true }).waitFor()
  await assertProgress('Current milestone progress', 0, 1)
  assert.equal(await page.getByRole('progressbar', { name: 'Current milestone progress', exact: true }).getAttribute('aria-valuetext'), '0 of 1')
  assert.equal(await mission().getByText('No active quest', { exact: true }).count(), 0, 'The dashboard offers the actionable current mission')
  await assertProgress('Project milestone completion', 0, 75)
  assert.equal(await stat('Roadmaps ready').innerText(), '1 / 2')
  assert.equal(await stat('LabX Points').innerText(), '450', 'Assessment placement does not award more account points')
  assert.equal(await stat('Earned badges').innerText(), '3', 'Assessment placement does not award more badges')
  await page.getByRole('link', { name: 'Discover stage, current', exact: true }).waitFor()
  await page.getByRole('link', { name: 'Grow stage, locked', exact: true }).waitFor()
  await checkLayout('founder-ready')
  await chooseProject(draftPath)
  await assertProgress('Assessment progress', 2, 8)
  assert.equal(await mission().getByRole('heading', { name: 'Problem statement', exact: true }).count(), 0, 'Selecting the draft removes the other project mission')
  assert.equal(await page.getByRole('link', { name: / stage, (current|available|locked)$/ }).count(), 0)
  await checkLayout('founder-draft', [390, 1440])
  await page.reload()
  await heading('Dashboard').waitFor()
  assert.equal(await projectPicker().locator('option').count(), 2, 'Both projects survive refresh')
  await chooseProject(completedPath)

  await page.getByRole('link', { name: 'Discover stage, current', exact: true }).click()
  await at(`${completedPath}?stage=Discover`)
  assert.equal(await button('Discover, Stage 1, current').getAttribute('aria-pressed'), 'true')
  await page.getByRole('region', { name: 'Discover your next chapter.', exact: true }).waitFor()
  await page.goBack()
  await at('/dashboard')
  await chooseProject(completedPath)
  await page.getByRole('link', { name: 'Grow stage, locked', exact: true }).click()
  await at(`${completedPath}?stage=Grow`)
  assert.equal(await button('Grow, Stage 5, locked').getAttribute('aria-pressed'), 'true')
  assert.equal(await button('Growth indicators, Level 1, Mission 1, locked').isDisabled(), true, 'A locked stage previews mission names without granting submission access')
  await dashboard()
  await chooseProject(completedPath)
  await mission().getByRole('link', { name: 'Open current mission', exact: true }).click()
  await at(`${completedPath}?milestone=discover-l1-m1`)
  await page.getByRole('dialog', { name: 'Problem statement', exact: true }).waitFor()
  await closeDialog()
  await at(completedPath)
  assert.equal(await button('Discover, Stage 1, current').getAttribute('aria-pressed'), 'true', 'Closing a mission preserves its selected stage')
  await go(`${completedPath}?stage=Discover&milestone=missing-milestone`)
  await heading('Dashboard Health').waitFor()
  assert.equal(await page.getByRole('dialog').count(), 0)
  assert.equal(await button('Discover, Stage 1, current').getAttribute('aria-pressed'), 'true')
  await go(`${completedPath}?stage=Discover&milestone=grow-l1-m1`)
  await heading('Dashboard Health').waitFor()
  assert.equal(await page.getByRole('dialog').count(), 0, 'A locked mission query cannot open a submission')
  await dashboard()
  await signOut()

  // A newly verified founder starts with no inherited projects, points, badges, or activity.
  await registerAndVerify('founder')
  await dashboard()
  assert.equal(await stat('LabX Points').innerText(), '0')
  assert.equal(await stat('Earned badges').innerText(), '0')
  assert.equal(await stat('Roadmaps ready').innerText(), '0 / 0')
  assert.equal(await projectPicker().count(), 0)
  await page.getByRole('region', { name: 'Recent activity', exact: true }).getByRole('heading', { name: 'Your story is just beginning.', exact: true }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'View First Steps badge', exact: true }).count(), 0)
  await assertProgress('Project milestone completion', 0, 75)
  await checkLayout('new-founder', [320, 1440])
  await signOut()

  // Profile preferences do not grant investor verification or mentor assignments.
  for (const role of ['mentor', 'investor']) {
    await registerAndVerify(role)
    await dashboard()
    assert.equal(await page.getByRole('region', { name: 'Founder overview', exact: true }).count(), 0)
    assert.equal(await projectPicker().count(), 0)
    assert.equal(await button('Passport overview').count(), 0)
    assert.equal(await page.getByRole('link', { name: 'New project', exact: true }).count(), 0)
    await page.locator('.db-role-summary').getByText('Not completed', { exact: true }).waitFor()
    await page.getByRole('button', { name: '0 LabX Coins', exact: true }).waitFor()
    const roleStatus = role === 'mentor' ? 'No assignments yet' : 'Not submitted'
    await page.locator('.db-role-summary').getByText(roleStatus, { exact: true }).waitFor()
    if (role === 'mentor') {
      for (const view of ['Active', 'Trial', 'Past']) {
        await button(view).click()
        assert.equal(await button(view).getAttribute('aria-pressed'), 'true')
        await page.getByRole('status').getByRole('heading', { name: `No ${view.toLowerCase()} mentorships yet.`, exact: true }).waitFor()
      }
    } else {
      await eventsPanel().getByRole('link', { name: 'View event: Inside an Early-Stage Investment', exact: true }).waitFor()
    }
    await checkLayout(`${role}-empty`)
    await page.getByRole('link', { name: 'Continue profile setup', exact: true }).click()
    await at(`/onboarding/${role}`)
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
    assert.equal(await page.locator('.db-role-journey li.is-done').count(), 1, 'Only the completed preference step is marked done')
    assert.equal(await page.locator('.db-role-summary strong').filter({ hasText: /verified|approved/i }).count(), 0)
    await page.locator('.db-preferences').getByText(role === 'mentor' ? 'Product strategy' : 'Climate technology', { exact: true }).waitFor()
    await page.reload()
    await heading('Dashboard').waitFor()
    await page.getByRole('link', { name: 'Edit profile preferences', exact: true }).waitFor()
    for (const path of ['/leaderboard', '/roadmap']) {
      await go(path)
      await at('/dashboard')
      await heading('Dashboard').waitFor()
    }
    await signOut()
  }

  assert.deepEqual(runtimeErrors, [], 'No browser runtime errors')
  assert.deepEqual(httpErrors, [], 'All local assets are available')
  assert.deepEqual(externalRequests, [], 'No remote requests')
  assert.deepEqual(backendRequests, [], 'No backend requests')
  console.log('PASS: dashboard balances/rank, isolated draft and ready projects, honest roadmap progress, working stage/milestone/badge/event deep links, passport focus, new-account empties, role preferences/guards, responsive layouts and local-only assets.')
} catch (error) {
  await page?.screenshot({ path: `${output}failure.png`, fullPage: true, animations: 'disabled' }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()))
}
