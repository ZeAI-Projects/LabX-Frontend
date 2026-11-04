import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { DEMO_CREDENTIALS } from '../src/features/authentication/services/mock_auth.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const origin = 'http://127.0.0.1:5207'
const executablePath = process.env.LABX_BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
const server = await preview({ root, envDir: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 5207, strictPort: true } })
let browser

try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  page.setDefaultTimeout(8000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(`${origin}/login`)
  await page.getByLabel('Email Address', { exact: true }).fill(DEMO_CREDENTIALS.email)
  await page.getByLabel('Password', { exact: true }).fill(DEMO_CREDENTIALS.password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(`${origin}/dashboard`)
  assert.equal(await page.locator('.sharp-dock').count(), 0, 'The floating Zenith launcher is removed')

  const outerScroll = () => page.locator('.app-shell__page').evaluate(element => element.scrollTop)
  const center = async (content) => {
    await content.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await content.hover()
  }
  const chain = async (content, direction, label) => {
    await center(content)
    const before = await outerScroll()
    await page.mouse.wheel(0, direction * 120)
    await page.waitForFunction(({ before, direction }) => (document.querySelector('.app-shell__page').scrollTop - before) * direction > 10, { before, direction })
    assert.ok(((await outerScroll()) - before) * direction > 10, label)
  }

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const [path, selector, name] of [
      ['/profile', '.pf-overview-tile--details .pf-panel-content', 'Profile details'],
      ['/profile?tab=passport', '.pf-passport-tile__content', 'Passport application'],
    ]) {
      await page.goto(`${origin}${path}`)
      const content = page.locator(selector).first()
      await content.waitFor()
      // Keep page scroll space after the card while exercising real wheel input.
      await page.locator('.pf-page').evaluate(element => {
        const tail = document.createElement('div')
        tail.style.height = '600px'
        element.append(tail)
      })
      await content.evaluate(element => element.replaceChildren(document.createTextNode('Short card content.')))
      await chain(content, 1, `${name}: a short card passes downward scrolling to the page at ${width}px`)

      await content.evaluate(element => {
        const filler = document.createElement('div')
        filler.style.height = '1200px'
        element.append(filler)
        element.scrollTop = 0
      })
      await center(content)
      const before = await content.evaluate(element => ({
        height: element.closest('.pf-panel').getBoundingClientRect().height,
        headingTop: element.closest('.pf-panel').querySelector('.pf-panel-heading').getBoundingClientRect().top,
        outer: document.querySelector('.app-shell__page').scrollTop,
      }))
      await page.mouse.wheel(0, 150)
      await page.waitForFunction(selector => document.querySelector(selector).scrollTop > 10, selector)
      const after = await content.evaluate(element => ({
        height: element.closest('.pf-panel').getBoundingClientRect().height,
        headingTop: element.closest('.pf-panel').querySelector('.pf-panel-heading').getBoundingClientRect().top,
        outer: document.querySelector('.app-shell__page').scrollTop,
      }))
      assert.deepEqual(after, before, `${name}: content scrolls while its heading, card height, and page stay fixed at ${width}px`)

      await content.evaluate(element => element.scrollTop = element.scrollHeight)
      await chain(content, 1, `${name}: the bottom boundary passes downward scrolling to the page at ${width}px`)
      await content.evaluate(element => element.scrollTop = 0)
      await chain(content, -1, `${name}: the top boundary passes upward scrolling to the page at ${width}px`)
      console.log(`PASS: ${name} inner scrolling and page scroll chaining at ${width}px`)
    }
  }
  assert.deepEqual(errors, [], 'Profile scrolling has no browser errors')
} finally {
  await browser?.close()
  await new Promise(resolve => server.httpServer.close(resolve))
}
