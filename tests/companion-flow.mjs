import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'
import { DEMO_CREDENTIALS } from '../src/features/authentication/services/mock_auth.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = fileURLToPath(new URL('../test-results/companion/', import.meta.url))
const origin = 'http://127.0.0.1:5198'
const executablePath = process.env.LABX_BROWSER_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
await mkdir(output, { recursive: true })
const server = await preview({ root, envDir: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 5198, strictPort: true } })
let browser
try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const errors = [], external = []
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) { external.push(url.href); return route.abort() }
    return route.continue()
  })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', e => errors.push(e.message))
  const go = path => page.goto(origin + path)
  const button = name => page.getByRole('button', { name, exact: true })
  const params = () => new URL(page.url()).searchParams
  const chats = async () => {
    await page.getByRole('heading', { name: 'Chats', exact: true }).waitFor()
    await page.waitForURL(url => url.pathname === '/chats' && url.searchParams.has('chat'))
    assert.equal(await page.locator('.sharp-dock').count(), 0, 'Chats has one full conversation interface')
    assert.equal(await page.getByRole('navigation', { name: 'Chat sections', exact: true }).count(), 0, 'Chats is a conversation workspace without section tabs')
    assert.equal(await page.getByRole('button', { name: 'Settings', exact: true }).count(), 0, 'Settings is removed from Chats')
    assert.equal(await page.locator('.sharp-settings').count(), 0)
    assert.equal(await page.getByRole('button', { name: /Save(?:d)? to memory/i }).count(), 0, 'Saved chats do not expose memory controls')
  }
  const login = async (email = DEMO_CREDENTIALS.email, password = DEMO_CREDENTIALS.password) => { await go('/login'); await page.getByLabel('Email Address', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill(password); await page.locator('button[type=submit]').click(); await page.waitForURL('**/dashboard') }
  const send = async prompt => {
    await page.getByLabel('Message Zenith', { exact: true }).fill(prompt)
    await button('Send message').click()
    await page.getByText('Preparing a sample reply', { exact: true }).waitFor({ state: 'hidden' })
    await page.locator('.sharp-message--user').last().filter({ hasText: prompt }).waitFor()
  }
  const newChat = async () => {
    const previous = params().get('chat')
    await button('New chat').click()
    await page.waitForURL(url => url.searchParams.get('chat') !== previous)
    await page.getByRole('heading', { name: 'New chat', exact: true }).waitFor()
    await page.locator('.sharp-message').first().waitFor({ state: 'hidden' })
  }
  const openChat = async (title, id) => {
    await button(`Open chat: ${title}`).click()
    if (id) await page.waitForURL(url => url.searchParams.get('chat') === id)
    await page.locator('.chats-conversation-title').getByRole('heading', { name: title, exact: true }).waitFor()
  }
  const assertFits = async label => {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label} has no page overflow`)
    const composer = page.getByLabel('Message Zenith', { exact: true })
    if (await composer.isVisible()) {
      const rect = await composer.boundingBox()
      assert.ok(rect.x >= 0 && rect.x + rect.width <= page.viewportSize().width + 1, `${label} composer fits`)
      const pane = await page.locator('.chats-chat-pane').boundingBox()
      const form = await page.locator('.sharp-composer > form').boundingBox()
      assert.ok(Math.abs(form.x - pane.x) <= 1 && Math.abs(form.width - pane.width) <= 1, `${label} input bar spans the entire chat pane`)
      assert.equal(await page.locator('.sharp-composer > form').evaluate(el => getComputedStyle(el).borderRadius), '0px', `${label} input bar is flat`)
    }
  }
  const assertRoadmapOnly = async () => {
    await page.locator('.rm-page, .projects-page').first().waitFor()
    assert.equal(await button('Open Companion').count(), 0, 'Companion box is removed from Roadmap')
    assert.equal(await page.getByRole('dialog', { name: 'Roadmap Companion', exact: true }).count(), 0)
    assert.equal(await page.locator('.sharp-dock').count(), 0, 'Roadmap has no floating assistant')
  }

  for (const route of ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/intro']) {
    await go(route); await page.getByRole('heading').first().waitFor()
    assert.equal(await page.locator('.sharp-dock').count(), 0, route + ' hides Zenith')
  }
  await login()
  await page.locator('.labx-sidebar-nav').waitFor()
  assert.equal(await page.locator('.sharp-briefing').count(), 0, 'Dashboard no longer includes the companion promotion')
  assert.equal(await page.locator('.labx-sidebar-nav').getByRole('link', { name: 'Chats', exact: true }).count(), 1, 'Chats appears in desktop navigation')
  assert.equal(await page.locator('.labx-sidebar-nav, .mobile-menu__links').getByRole('link', { name: 'Companion', exact: true, includeHidden: true }).count(), 0)
  await button('450 LabX Coins').waitFor()
  const dockPosition = await button('Ask Zenith AI').boundingBox()
  assert.ok(Math.abs(dockPosition.x + dockPosition.width - 1440 + 24) < 1, 'Zenith sits in the desktop right corner')
  await page.mouse.move(0, 0)
  assert.ok(Number(await button('Ask Zenith AI').evaluate(el => getComputedStyle(el).opacity)) < .6)
  await button('Ask Zenith AI').hover()
  assert.equal(await button('Ask Zenith AI').evaluate(el => getComputedStyle(el).opacity), '1')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  assert.equal(await page.locator('.sharp-dock-trigger .sharp-robot__eyelids').evaluate(el => getComputedStyle(el).animationName), 'sharp-blink')
  await button('Ask Zenith AI').click()
  await page.getByLabel('Message Zenith in quick chat', { exact: true }).fill('What should I work on today?')
  await button('Send message').click()
  await page.getByText('Preparing a sample reply', { exact: true }).waitFor({ state: 'hidden' })
  await page.locator('.sharp-message--assistant').waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await button('Ask Zenith AI').evaluate(el => el === document.activeElement), true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('.labx-sidebar-nav').getByRole('link', { name: 'Chats', exact: true }).click()
  await chats()
  assert.match(await page.locator('.sharp-messages').innerText(), /starting point/, 'Quick chat is stored in Chats')
  const quickId = params().get('chat')
  await page.reload(); await chats()
  assert.equal(params().get('chat'), quickId)
  const desktopInput = page.getByLabel('Message Zenith', { exact: true })
  const initialInputSize = await desktopInput.boundingBox()
  assert.ok(initialInputSize.height >= 36 && initialInputSize.height <= 48, 'Chats starts with a compact single-line message box')
  assert.ok((await page.locator('.sharp-composer > form').boundingBox()).height <= 68, 'The input bar stays flat while the draft is empty')
  await assertFits('Desktop Chats')
  await desktopInput.fill(Array.from({ length: 10 }, (_, index) => `Draft line ${index + 1}`).join('\n'))
  assert.ok((await desktopInput.boundingBox()).height > initialInputSize.height, 'The message box grows with a longer draft')
  assert.ok((await desktopInput.boundingBox()).height <= 160, 'Long drafts scroll after reaching the comfortable height limit')
  await desktopInput.fill('')
  assert.ok((await desktopInput.boundingBox()).height <= 48, 'Clearing a draft restores the flat input bar')

  // Saved conversations can be reopened, continued, renamed, searched and deleted.
  await newChat()
  assert.equal(await page.locator('.sharp-message').count(), 0)
  await send('Brainstorm a school pilot')
  const firstId = params().get('chat')
  await newChat()
  await send('Plan customer research')
  const secondId = params().get('chat')
  assert.notEqual(firstId, secondId)
  await openChat('Brainstorm a school pilot', firstId)
  assert.equal(params().get('chat'), firstId)
  assert.match(await page.locator('.sharp-messages').innerText(), /Brainstorm a school pilot/)
  assert.doesNotMatch(await page.locator('.sharp-messages').innerText(), /Plan customer research/)
  await send('Keep the pilot to five interviews')
  assert.equal(params().get('chat'), firstId, 'Continuing keeps the same saved conversation')
  await page.reload(); await chats()
  assert.match(await page.locator('.sharp-messages').innerText(), /Keep the pilot to five interviews/)
  await button('Rename chat').click()
  const rename = page.getByRole('dialog', { name: 'Rename chat', exact: true })
  await rename.getByLabel('Chat name', { exact: true }).fill('School pilot planning')
  await rename.getByRole('button', { name: 'Save name', exact: true }).click()
  await button('Open chat: School pilot planning').waitFor()
  const search = page.getByLabel('Search chats', { exact: true })
  await search.fill('five interviews')
  assert.equal(await button('Open chat: School pilot planning').count(), 1, 'Search includes conversation contents')
  assert.equal(await button('Open chat: Plan customer research').count(), 0)
  await search.fill('customer research')
  await openChat('Plan customer research', secondId)
  await search.fill('')
  await button('Delete chat').click()
  const deletion = page.getByRole('dialog', { name: 'Delete chat?', exact: true })
  await deletion.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.equal(params().get('chat'), secondId, 'Cancel preserves the conversation')
  await button('Delete chat').click()
  await deletion.getByRole('button', { name: 'Delete chat', exact: true }).click()
  assert.equal(await button('Open chat: Plan customer research').count(), 0)
  await page.reload(); await chats()
  assert.equal(await button('Open chat: Plan customer research').count(), 0, 'Deletion persists')
  await openChat('School pilot planning', firstId)

  // Both generations of saved Companion links now resolve to Chats.
  for (const route of ['/companion', '/roadmap?companion=chat']) {
    await go(route); await chats()
    assert.equal(new URL(page.url()).pathname, '/chats')
    assert.match(await page.locator('.sharp-messages').innerText(), /Keep the pilot to five interviews/)
  }
  for (const route of ['/companion', '/chats']) {
    for (const removedTab of ['memory', 'insights', 'settings']) {
      await go(`${route}?tab=${removedTab}&chat=${encodeURIComponent(firstId)}`); await chats()
      assert.equal(params().get('chat'), firstId, 'Removed section links preserve the selected conversation')
      assert.equal(params().get('tab') || 'chat', 'chat', 'Removed sections fall back to Chat')
      await page.getByLabel('Message Zenith', { exact: true }).waitFor()
      assert.match(await page.locator('.sharp-messages').innerText(), /Keep the pilot to five interviews/)
    }
  }
  await page.locator('.sharp-composer input[type=file]').setInputFiles({ name: 'research.txt', mimeType: 'text/plain', buffer: Buffer.from('Customer interviews: founders need a clear next action and evidence checklist.') })
  await page.locator('.sharp-document-tray > summary').click()
  await page.getByText('research.txt', { exact: true }).waitFor()
  await page.getByText('View text excerpt', { exact: true }).click()
  await page.getByText('Customer interviews: founders need a clear next action and evidence checklist.', { exact: true }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/chats', 'Documents can be reviewed directly in Chats')
  await button('Remove document: research.txt').click()
  assert.equal(await page.getByText('research.txt', { exact: true }).count(), 0)
  await page.locator('.sharp-composer input[type=file]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Keep the pilot focused.') })
  await page.locator('.sharp-document-tray > summary').click()
  await page.locator('.sharp-attached').filter({ hasText: 'notes.txt' }).waitFor()
  await newChat(); await send('Review document')
  assert.match(await page.locator('.sharp-message--assistant').last().innerText(), /Keep the pilot focused/)
  assert.equal(await page.getByRole('link', { name: 'View documents', exact: true }).count(), 0)

  await go('/roadmap'); await assertRoadmapOnly()
  await go('/roadmap/new'); await page.getByLabel('Project name', { exact: true }).fill('Zenith Education Project'); await button('Start assessment').click()
  await page.waitForURL('**/assessment'); await page.locator('.assessment-option').first().waitFor()
  const projectPath = new URL(page.url()).pathname.replace('/assessment', '')
  const projectId = projectPath.split('/').at(-1)
  assert.equal(await page.locator('.sharp-dock').count(), 0)
  for (let step = 0; step < 8; step++) { await page.locator('.assessment-option').nth(step === 0 ? 1 : 0).click(); await button(step === 7 ? 'Review Answers' : 'Next Step').click() }
  await button('Submit Assessment').click(); await button('Enter My Roadmap').click(); await assertRoadmapOnly()
  await button('Open current mission').click()
  await page.getByRole('dialog', { name: 'Problem statement', exact: true }).waitFor()
  await page.getByRole('link', { name: 'Get quest help from Zenith', exact: true }).click()
  await chats(); await page.waitForURL(url => !url.searchParams.has('prompt'))
  await page.getByText('Preparing a sample reply', { exact: true }).waitFor({ state: 'hidden' })
  assert.match(await page.locator('.sharp-message--assistant').last().innerText(), /Problem statement/)
  assert.equal(await page.getByRole('dialog', { name: 'Problem statement', exact: true }).count(), 0)
  const questMessages = await page.locator('.sharp-message').count()
  await page.reload(); await chats()
  assert.equal(await page.locator('.sharp-message').count(), questMessages, 'Reloading does not resubmit a consumed quest prompt')
  await page.getByRole('link', { name: 'Open current mission', exact: true }).last().click()
  await page.getByRole('dialog', { name: 'Problem statement', exact: true }).waitFor()
  assert.equal(new URL(page.url()).pathname, projectPath)
  await page.keyboard.press('Escape')
  await go(`${projectPath}?stage=Discover&companion=chat&prompt=quest`)
  await chats(); await page.waitForURL(url => !url.searchParams.has('prompt'))
  await page.getByText('Preparing a sample reply', { exact: true }).waitFor({ state: 'hidden' })
  assert.match(await page.locator('.sharp-message--assistant').last().innerText(), /Problem statement/, 'Old roadmap links retain their project guidance')
  await go(`/companion?tab=chat&prompt=quest&project=${encodeURIComponent(projectId)}`)
  await chats(); await page.waitForURL(url => !url.searchParams.has('prompt'))
  await page.getByText('Preparing a sample reply', { exact: true }).waitFor({ state: 'hidden' })
  assert.match(await page.locator('.sharp-message--assistant').last().innerText(), /Problem statement/)

  // Chats fits mobile, tablet and desktop. Mobile history is a keyboard-accessible drawer.
  {
    await go('/chats'); await chats()
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await assertFits(`Chats at ${width}px`)
      if (width <= 768) {
        await button('Open chat history').click()
        const drawer = page.getByRole('dialog', { name: 'Chat history', exact: true })
        await drawer.waitFor()
        assert.equal(await drawer.evaluate(el => el.matches(':modal') && el.contains(document.activeElement)), true)
        const rect = await drawer.boundingBox()
        assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1, `History drawer fits ${width}px`)
        assert.ok(await drawer.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `History drawer content fits ${width}px`)
        await drawer.getByLabel('Search chats', { exact: true }).fill('school pilot')
        await drawer.getByRole('button', { name: 'Open chat: School pilot planning', exact: true }).waitFor()
        await drawer.getByLabel('Search chats', { exact: true }).fill('')
        await page.keyboard.press('Escape')
        await drawer.waitFor({ state: 'hidden' })
        assert.equal(await button('Open chat history').evaluate(el => el === document.activeElement), true, 'Closing history restores keyboard focus')
      }
    }
  }
  await go('/chats'); await chats()
  await page.screenshot({ path: output + 'chats-desktop.png', fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 320, height: 640 })
  await assertFits('Chat at 320px by 640px')
  await page.getByLabel('Message Zenith', { exact: true }).scrollIntoViewIfNeeded()
  const narrowComposer = await page.getByLabel('Message Zenith', { exact: true }).boundingBox()
  const narrowNav = await page.locator('.mobile-navigation').boundingBox()
  assert.ok(narrowComposer.y >= 0 && narrowComposer.y + narrowComposer.height < narrowNav.y, 'Mobile composer can be reached above fixed navigation')
  await page.screenshot({ path: output + 'chats-mobile.png', fullPage: true, animations: 'disabled' })
  await button('Open chat history').click()
  await page.screenshot({ path: output + 'chats-history-mobile.png', animations: 'disabled' })
  await page.keyboard.press('Escape')
  await button('More navigation').click()
  await page.getByRole('dialog', { name: 'Your workspace', exact: true }).getByRole('link', { name: 'Chats', exact: true }).click()
  await chats()

  await page.setViewportSize({ width: 1440, height: 900 })
  await go('/dashboard')
  assert.equal(await page.locator('.sharp-briefing').count(), 0)
  await page.locator('.labx-sidebar-nav').getByRole('link', { name: 'Chats', exact: true }).click(); await chats()
  await page.setViewportSize({ width: 390, height: 844 }); await go('/dashboard'); await button('Ask Zenith AI').click()
  const panel = await page.locator('.sharp-quick-panel').boundingBox()
  const bottomNav = await page.locator('.mobile-navigation').boundingBox()
  assert.ok(panel.x >= 0 && panel.x + panel.width <= 390 && panel.y >= 0 && panel.y + panel.height < bottomNav.y, 'Quick chat clears mobile navigation')
  await page.keyboard.press('Escape')
  await go('/roadmap/new'); await page.getByLabel('Project name', { exact: true }).waitFor()
  assert.equal(await page.locator('.sharp-dock').count(), 0, 'All Roadmap screens are free of the floating assistant')
  for (const route of ['/achievements', '/events', '/profile', '/notifications', '/guild', '/social']) {
    await go(route); await button('Ask Zenith AI').waitFor()
    assert.equal(await page.locator('.sharp-dock').count(), 1)
  }

  // A legacy history with more than eight entries survives migration and subsequent writes.
  await page.setViewportSize({ width: 1440, height: 900 }); await go('/chats'); await chats()
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(name => name.startsWith('labx:sharp:v1:'))
    const state = JSON.parse(localStorage.getItem(key))
    state.sessions.push(...Array.from({ length: 10 }, (_, index) => ({
      id: `legacy-${index}`, title: `Archived discussion ${index + 1}`, projectId: '',
      messages: [{ id: `legacy-message-${index}`, role: 'user', content: `Archived discussion ${index + 1}`, time: '2025-01-01T12:00:00.000Z' }],
    })))
    localStorage.setItem(key, JSON.stringify(state))
  })
  await page.reload(); await chats()
  for (let index = 1; index <= 10; index++) await button(`Open chat: Archived discussion ${index}`).waitFor()
  await openChat('Archived discussion 1', 'legacy-0'); await send('Continue this archived discussion')
  await page.reload(); await chats()
  assert.match(await page.locator('.sharp-messages').innerText(), /Continue this archived discussion/)
  for (let index = 1; index <= 10; index++) assert.equal(await button(`Open chat: Archived discussion ${index}`).count(), 1)
  await button('Open chat: School pilot planning').waitFor()

  // Account isolation and member project permissions remain intact.
  await go('/dashboard'); await button('Sign out').click(); await page.waitForURL('**/login')
  await go('/chats'); await page.waitForURL('**/login')
  await go('/register'); await page.getByLabel('Full Name', { exact: true }).fill('Fresh Founder'); await page.getByLabel('Email Address', { exact: true }).fill('sharp-new@example.com'); await page.getByLabel('Role', { exact: true }).selectOption('founder'); await page.getByLabel('Password', { exact: true }).fill('FreshFounder123!'); await page.getByLabel('Confirm Password', { exact: true }).fill('FreshFounder123!'); await page.locator('button[type=submit]').click(); await page.waitForURL('**/verify-email')
  const code = await page.getByTestId('demo-signup-code').innerText(); await page.getByLabel('Digit 1 of 6', { exact: true }).fill(code.trim()); await button('Verify email').click(); await page.waitForURL('**/roadmap/new')
  await go('/roadmap?join=1')
  const freshMemberId = await page.locator('.join-roadmap-account code').innerText()
  await go('/chats?tab=settings'); await chats()
  assert.equal(await page.getByText('notes.txt', { exact: true }).count(), 0, 'Other accounts cannot see attached documents')
  assert.equal(await page.locator('.sharp-message').count(), 0)
  assert.equal(await button('Open chat: School pilot planning').count(), 0, 'Other accounts cannot see saved chats')
  await go(projectPath); await page.getByRole('heading', { name: 'Project not found', exact: true }).waitFor()
  assert.equal(params().get('tab'), null)
  await go('/dashboard'); await button('Sign out').click(); await page.waitForURL('**/login'); await login()
  await go(projectPath); await button('Manage team').click()
  const team = page.getByRole('dialog', { name: 'Roadmap team', exact: true })
  await team.locator('.roadmap-team-invite-details > summary').click()
  await team.getByLabel('Member ID', { exact: true }).fill(freshMemberId)
  await team.getByRole('button', { name: 'Search Member', exact: true }).click()
  await team.getByRole('button', { name: 'Send Invitation', exact: true }).click(); await team.getByRole('status').waitFor(); await page.keyboard.press('Escape')
  await go('/dashboard'); await button('Sign out').click(); await page.waitForURL('**/login'); await login('sharp-new@example.com', 'FreshFounder123!')
  await go('/roadmap?join=1&joinView=activity')
  await page.getByRole('listitem', { name: 'Invitation: Zenith Education Project', exact: true }).getByRole('button', { name: 'Accept invitation', exact: true }).click()
  await page.getByRole('link', { name: 'Open joined roadmap: Zenith Education Project', exact: true }).click()
  const joinedPath = new URL(page.url()).pathname
  assert.match(joinedPath, /^\/roadmap\/joined\//)
  await assertRoadmapOnly()
  await go(`${joinedPath}?companion=chat&prompt=quest`); await chats()
  await page.waitForURL(url => !url.searchParams.has('prompt'))
  await page.getByText('Preparing a sample reply', { exact: true }).waitFor({ state: 'hidden' })
  assert.match(await page.locator('.sharp-page').innerText(), /Zenith Education Project/, 'Member guidance retains its authorized project')
  assert.match(await page.locator('.sharp-message--assistant').last().innerText(), /assignment/)
  assert.equal(await page.getByRole('link', { name: 'Open current mission', exact: true }).count(), 0, 'Members are not offered an unassigned mission')
  await page.reload(); await chats()
  assert.match(await page.locator('.sharp-page').innerText(), /Zenith Education Project/, 'Reopening saved member chats retains context')
  assert.deepEqual(errors, []); assert.deepEqual(external, [])
  console.log('Chats: flat full-width growing composer, removed Settings, saved history, continuation, rename/search/delete, legacy migration, keyboard/mobile history, project and member guidance, inline documents and account isolation passed.')
} finally { await browser?.close(); await server.close() }
