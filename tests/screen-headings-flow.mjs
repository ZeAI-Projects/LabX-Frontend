import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { DEMO_CREDENTIALS } from '../src/features/authentication/services/mock_auth.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = fileURLToPath(new URL('../test-results/screen-headings/', import.meta.url))
const origin = 'http://127.0.0.1:5206'
const executablePath = process.env.LABX_BROWSER_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
await mkdir(output, { recursive: true })
const server = await preview({ root, envDir: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 5206, strictPort: true } })
let browser
let page

try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', timezoneId: 'Asia/Kolkata' })
  const errors = [], network = [], assetErrors = []
  await context.route('**/*', route => {
    const request = route.request()
    const url = new URL(request.url())
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) { network.push(url.href); return route.abort() }
    if (['fetch', 'xhr'].includes(request.resourceType()) || /\/api(?:\/|$)/.test(url.pathname)) network.push(url.href)
    return route.continue()
  })
  page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 400) assetErrors.push(`${response.status()} ${response.url()}`) })
  await page.clock.setFixedTime(new Date('2026-10-23T04:30:00Z'))
  const go = path => page.goto(origin + path)
  const button = name => page.getByRole('button', { name, exact: true })
  const closeDialog = async () => { await page.keyboard.press('Escape'); await page.locator('dialog[open]').waitFor({ state: 'hidden' }) }

  await go('/login')
  await page.getByLabel('Email Address', { exact: true }).fill(DEMO_CREDENTIALS.email)
  await page.getByLabel('Password', { exact: true }).fill(DEMO_CREDENTIALS.password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/dashboard')

  // Use a real assessed project so the detail header and team controls are covered.
  await go('/roadmap/new')
  await page.getByLabel('Project name', { exact: true }).fill('Header layout project')
  await button('Start assessment').click()
  await page.waitForURL(/\/roadmap\/[^/]+\/assessment$/)
  const projectPath = new URL(page.url()).pathname.replace(/\/assessment$/, '')
  for (const answer of ['Healthcare & MedTech', 'Healthcare providers', 'Web application', 'Exploring an idea', 'Not researched', 'Concept only', 'No target customers identified']) {
    await button(answer).click()
    await button('Next Step').click()
  }
  await button('Problem clarity').click()
  await button('Review Answers').click()
  await button('Submit Assessment').click()
  await button('Enter My Roadmap').click()
  await page.getByRole('heading', { name: 'Header layout project', level: 1, exact: true }).waitFor()

  const routes = [
    { path: '/dashboard', title: 'Dashboard', header: '.db-header' },
    { path: '/chats', title: 'Chats' },
    { path: '/roadmap', title: 'Roadmap', header: '.projects-header' },
    { path: '/roadmap/new', title: 'New Project', header: '.labx-navbar-title' },
    { path: projectPath, title: 'Header layout project', header: '.rm-project-bar' },
    { path: '/leaderboard', title: 'LabX Leaderboard', header: '.lb-header' },
    { path: '/events', title: 'Events & Opportunities' },
    { path: '/achievements', title: 'Achievements' },
    { path: '/profile', title: 'Profile' },
    { path: '/guild', title: 'Guilds' },
    { path: '/social', title: 'Social' },
    { path: '/notifications', title: 'Notifications' },
  ]
  for (const width of [320, 390, 901, 1101, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
    for (const route of routes) {
      await go(route.path)
      await page.getByRole('heading', { name: route.title, exact: true, level: 1 }).waitFor()
      assert.equal(await page.locator('.labx-navbar h1').innerText(), route.title, `${route.path}: shared header shows the current page title`)
      assert.equal(await page.locator('.labx-navbar').getByRole('link', { name: 'Notifications', exact: true }).count(), 1, `${route.path}: notifications remain in the shared header`)
      await page.evaluate(() => document.fonts.ready)
      // The roadmap opens at its current mission; inspect the header at the top.
      await page.evaluate(() => window.scrollTo(0, 0))
      const label = `${route.path} at ${width}px`
      assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1, `${label}: exactly one screen title`)
      assert.equal(await page.locator('.labx-navbar').getByText('Workspace', { exact: true }).count(), 0, `${label}: no generic Workspace label`)
      assert.equal(await page.locator('.labx-navbar').getByText(/COMMAND CENTER/i).count(), 0, `${label}: no command center subtitle`)
      assert.equal(await page.locator('.labx-navbar .labx-title-line').count(), 0, `${label}: no obsolete title accent`)

      const geometry = await page.evaluate(headerSelector => {
        const actions = document.querySelector('.labx-navbar-actions').getBoundingClientRect()
        const intersect = rect => actions.left < rect.right - 1 && actions.right > rect.left + 1 && actions.top < rect.bottom - 1 && actions.bottom > rect.top + 1
        const header = headerSelector ? document.querySelector(headerSelector) : document.querySelector('.labx-navbar-title')
        const collisions = []
        if (header) {
          const text = document.createTreeWalker(header, NodeFilter.SHOW_TEXT)
          while (text.nextNode()) {
            if (!text.currentNode.textContent.trim()) continue
            const range = document.createRange()
            range.selectNodeContents(text.currentNode)
            if ([...range.getClientRects()].some(intersect)) collisions.push(text.currentNode.textContent.trim())
          }
          for (const control of header.querySelectorAll('a, button, input, select')) {
            if (control.getClientRects().length && intersect(control.getBoundingClientRect())) collisions.push(control.getAttribute('aria-label') || control.textContent.trim())
          }
        }
        const usable = [...document.querySelectorAll('.labx-navbar-actions > a, .labx-navbar-actions > button')].filter(element => element.getClientRects().length).map(element => {
          const rect = element.getBoundingClientRect()
          const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          return { name: element.getAttribute('aria-label'), hit: element === target || element.contains(target), fits: rect.left >= 0 && rect.right <= innerWidth + 1 }
        })
        return { fits: document.documentElement.scrollWidth <= innerWidth + 1, collisions, usable }
      }, route.header || null)
      assert.equal(geometry.fits, true, `${label}: no horizontal page overflow`)
      assert.deepEqual(geometry.collisions, [], `${label}: toolbar does not overlap screen title or header controls`)
      assert.ok(geometry.usable.every(control => control.fits && control.hit), `${label}: toolbar controls are visible and clickable: ${JSON.stringify(geometry.usable)}`)

      const coin = button('450 LabX Coins')
      await coin.click()
      assert.equal(await coin.getAttribute('aria-expanded'), 'true', `${label}: coin details open`)
      await page.keyboard.press('Escape')
      assert.equal(await coin.getAttribute('aria-expanded'), 'false', `${label}: coin details close`)
      if (route.header) {
        const controls = page.locator(route.header).locator('a:visible, button:visible')
        for (let index = 0; index < await controls.count(); index++) await controls.nth(index).click({ trial: true })
      }
      if (route.path === '/roadmap') {
        await button('Join roadmap').click()
        await page.getByRole('dialog', { name: 'Join Roadmap', exact: true }).waitFor()
        await closeDialog()
      } else if (route.path === projectPath) {
        await button('Manage team').click()
        await page.getByRole('dialog', { name: 'Roadmap team', exact: true }).waitFor()
        await closeDialog()
      } else if (route.path === '/leaderboard') {
        await button('How rankings work').click()
        await page.getByRole('dialog', { name: 'How rankings work', exact: true }).waitFor()
        await closeDialog()
      }
      if ([320, 1440].includes(width)) {
        await page.evaluate(() => window.scrollTo(0, 0))
        const name = route.path === projectPath ? 'project-roadmap' : route.path.slice(1).replaceAll('/', '-')
        await page.screenshot({ path: `${output}${name}-${width}.png`, animations: 'disabled' })
      }
    }
    await go('/dashboard')
    await page.locator('.labx-navbar').getByRole('link', { name: 'Notifications', exact: true }).click()
    await page.waitForURL('**/notifications')
    await page.getByRole('heading', { name: 'Notifications', exact: true, level: 1 }).waitFor()
  }
  assert.deepEqual(errors, [], 'No browser runtime errors')
  assert.deepEqual(assetErrors, [], 'No missing assets')
  assert.deepEqual(network, [], 'No backend or external requests')
  console.log('Screen heading checks passed: 12 routes at 320, 390, 901, 1101, and 1440px; unique titles, no obsolete header, usable controls, and no overlap or page overflow.')
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: `${output}failure.png`, fullPage: true, animations: 'disabled' }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await new Promise(resolve => server.httpServer.close(resolve))
}
