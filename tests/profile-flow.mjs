import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = fileURLToPath(new URL('../test-results/profile/', import.meta.url))
const origin = 'http://127.0.0.1:5196'
const executablePath = process.env.LABX_BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
const password = 'ProfilePreview1!'
const founderEmail = 'profile-founder@example.com'
const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMQCsj7DwADGAHQEUfrBgAAAABJRU5ErkJggg==', 'base64')
const webpBytes = Buffer.from('UklGRgAAAAhXRUJQ', 'base64')
const evidenceBytes = Buffer.from('%PDF-1.4\nSample founder portfolio evidence\n%%EOF')
await mkdir(output, { recursive: true })
const server = await preview({ root, envDir: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 5196, strictPort: true } })
let browser
let page

try {
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', timezoneId: 'Asia/Kolkata',
    acceptDownloads: true,
  })
  const runtimeErrors = []
  const assetErrors = []
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
    openedPage.on('response', (response) => { if (response.status() >= 400) assetErrors.push(`${response.status()} ${response.url()}`) })
  })
  page = await context.newPage()
  page.setDefaultTimeout(10000)
  await page.clock.setFixedTime(new Date('2026-10-20T05:00:00Z'))
  const go = (path) => page.goto(`${origin}${path}`)
  const button = (name) => page.getByRole('button', { name, exact: true })
  const dialog = (name) => page.getByRole('dialog', { name, exact: true })
  const edit = () => dialog('Edit profile')
  const closeDialog = async () => {
    await page.keyboard.press('Escape')
    await page.locator('dialog[open]').waitFor({ state: 'hidden' })
  }
  const signOut = async () => { await button('Sign out').click(); await page.waitForURL(`${origin}/login`) }
  const checkLayout = async (name, widths = [320, 390, 768, 1440]) => {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => { if (!document.querySelector('dialog[open]')) window.scrollTo(0, 0) })
      const geometry = await page.evaluate(() => {
        const modal = document.querySelector('dialog[open]')
        const box = modal?.getBoundingClientRect()
        const overview = document.querySelector('.pf-overview-grid')
        const columns = overview ? getComputedStyle(overview).gridTemplateColumns.split(' ').map(Number.parseFloat) : []
        const identity = document.querySelector('.pf-identity')
        const avatar = identity?.querySelector('.pf-completion-avatar, .pf-avatar')
        const nameRow = identity?.querySelector('.pf-name-row')
        const banner = document.querySelector('.pf-dossier-banner')
        const tooltip = document.querySelector('.pf-completion-avatar__label')
        const tooltipBox = tooltip?.getBoundingClientRect()
        const dossierBox = document.querySelector('.pf-dossier')?.getBoundingClientRect()
        const avatarBox = avatar?.getBoundingClientRect()
        const nameRowBox = nameRow?.getBoundingClientRect()
        const bannerBox = banner?.getBoundingClientRect()
        return {
          fits: document.documentElement.scrollWidth <= innerWidth + 1,
          modalFits: !box || box.left >= -1 && box.right <= innerWidth + 1 && modal.scrollWidth <= modal.clientWidth + 1,
          overviewColumns: columns,
          identityAligned: Boolean(avatarBox && nameRowBox && bannerBox && nameRowBox.top >= bannerBox.bottom && nameRowBox.top < avatarBox.bottom),
          identityDoesNotOverlap: Boolean(avatarBox && nameRowBox && nameRowBox.left >= avatarBox.right),
          tooltipVisible: tooltip && getComputedStyle(tooltip).visibility === 'visible',
          tooltipFitsDossier: Boolean(tooltipBox && dossierBox && tooltipBox.left >= dossierBox.left && tooltipBox.right <= dossierBox.right),
          tooltipCentered: Boolean(tooltipBox && avatarBox && Math.abs((tooltipBox.top + tooltipBox.height / 2) - (avatarBox.top + avatarBox.height / 2)) <= 1),
          identityTransform: identity ? getComputedStyle(identity.querySelector('.pf-identity-copy')).transform : null,
        }
      })
      assert.ok(geometry.fits && geometry.modalFits, `${name} fits ${width}px without horizontal overflow`)
      if (name === 'founder-profile') {
        assert.equal(geometry.identityAligned, true, `Founder name block aligns with the avatar at ${width}px`)
        assert.equal(geometry.identityDoesNotOverlap, true, `Founder name block does not overlap the avatar at ${width}px`)
        assert.equal(geometry.tooltipVisible, true, `Completion tooltip remains visible at ${width}px`)
        assert.equal(geometry.tooltipFitsDossier, true, `Completion tooltip remains within the profile card at ${width}px`)
        assert.equal(geometry.tooltipCentered, true, `Completion tooltip stays centered beside the avatar at ${width}px`)
        assert.equal(geometry.identityTransform, 'none', `Completion tooltip does not move profile content at ${width}px`)
      }
      if (name === 'founder-profile' && width > 900) {
        assert.equal(geometry.overviewColumns.length, 2, 'Founder overview uses two columns on desktop')
        assert.ok(Math.abs(geometry.overviewColumns[0] - geometry.overviewColumns[1]) <= 1, 'Founder overview columns have equal widths')
      }
      if (name === 'founder-profile' && width <= 900) {
        assert.equal(geometry.overviewColumns.length, 1, 'Founder overview switches to one column on tablet and mobile')
      }
      if ([390, 1440].includes(width)) await page.screenshot({ path: `${output}${name}-${width}.png`, animations: 'disabled' })
    }
  }
  const signUp = async ({ email, name, role = 'founder' }) => {
    await go(`/register?role=${role}`)
    await page.getByLabel('Full Name', { exact: true }).fill(name)
    await page.getByLabel('Email Address', { exact: true }).fill(email)
    await page.getByLabel('Role', { exact: true }).selectOption(role)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByLabel('Confirm Password', { exact: true }).fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${origin}/verify-email`)
    const code = (await page.getByTestId('demo-signup-code').innerText()).trim()
    await page.getByLabel('Digit 1 of 6', { exact: true }).fill(code)
    await button('Verify email').click()
    await page.waitForURL(`${origin}${role === 'founder' ? '/roadmap/new' : `/onboarding/${role}`}`)
  }
  const signIn = async (email, pass = password) => {
    await go('/login')
    await page.getByLabel('Email Address', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(pass)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(`${origin}/dashboard`)
  }

  await go('/profile')
  await page.waitForURL(`${origin}/login`)
  await signUp({ email: founderEmail, name: 'Riley Builder' })
  await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Private Research Venture')
  await button('Start assessment').click()
  await page.waitForURL(/\/roadmap\/[^/]+\/assessment$/)
  await go('/profile')
  await button('Edit profile').waitFor()
  assert.equal(await page.locator('.pf-stats [data-profile-stat="Completed Missions"]').count(), 1, 'Founder profile labels the completion metric Completed Missions')
  assert.equal(await page.getByText('Completed quests', { exact: true }).count(), 0, 'Founder profile no longer uses Completed quests terminology')
  assert.equal(await page.locator('.pf-identity .pf-bio').count(), 0, 'Founder profile header does not display Bio')
  assert.equal(await page.locator('.pf-verified-badge').count(), 0, 'An unsubmitted Passport does not show the verified founder badge')
  assert.equal(await page.locator('.pf-dossier .pf-featured-badges').count(), 0, 'Earned mission badges are not displayed in the profile header')
  assert.equal(await page.getByRole('region', { name: 'Earned achievements', exact: true }).count(), 1, 'Earned achievements remain available in the profile overview')
  const overviewBadges = page.locator('.pf-badge-grid > .pf-badge')
  assert.ok(await overviewBadges.count() <= 3, 'Profile overview shows at most three achievement badges')
  const badgeDates = await overviewBadges.evaluateAll((elements) => elements.map((element) => Date.parse(element.dataset.earnedAt)))
  assert.ok(badgeDates.every((date, index) => index === 0 || badgeDates[index - 1] >= date), 'Profile overview badges are ordered newest earned first')
  const overviewRoadmaps = page.locator('.pf-project-list > .pf-project')
  assert.ok(await overviewRoadmaps.count() <= 3, 'Profile overview shows at most three roadmaps')
  const roadmapDates = await overviewRoadmaps.evaluateAll((elements) => elements.map((element) => Date.parse(element.dataset.createdAt)))
  assert.ok(roadmapDates.every((date, index) => index === 0 || roadmapDates[index - 1] >= date), 'Profile overview roadmaps are ordered newest created first')
  assert.equal(await page.getByRole('link', { name: 'View all achievements', exact: true }).getAttribute('href'), '/achievements', 'View all achievements retains the existing route')
  assert.equal(await page.getByRole('link', { name: 'View all roadmaps', exact: true }).getAttribute('href'), '/roadmap', 'View all roadmaps retains the existing route')
  const socialMetrics = page.locator('.pf-social-metric')
  assert.equal(await socialMetrics.count(), 2, 'Founder profile shows Followers and Following metrics')
  assert.equal(await socialMetrics.nth(0).innerText(), '8\nFollowers', 'Follower count matches the mock follower list')
  assert.equal(await socialMetrics.nth(1).innerText(), '5\nFollowing', 'Following count matches the mock following list')
  await socialMetrics.nth(0).click()
  const followersDialog = dialog('Followers')
  assert.match(await followersDialog.innerText(), /8 followers/i, 'Followers dialog displays the total count')
  assert.equal(await followersDialog.locator('.pf-connection-row').count(), 8, 'Followers dialog renders the mock list')
  const firstFollower = followersDialog.locator('.pf-connection-row').first()
  const followerName = await firstFollower.locator('.pf-connection-profile-link').innerText()
  const followerId = await firstFollower.locator('.pf-connection-avatar-link').getAttribute('href')
  assert.equal(followerId, '/profile/ava-chen', 'Follower avatar links use the selected person ID')
  assert.equal(await firstFollower.locator('.pf-connection-profile-link').getAttribute('href'), followerId, 'Follower names link to that person')
  assert.equal(await firstFollower.locator('.pf-connection-username-link').getAttribute('href'), followerId, 'Follower usernames link to that person')
  await firstFollower.locator('.pf-connection-profile-link').click()
  await page.waitForURL(`${origin}/profile/ava-chen`)
  assert.equal(await page.getByRole('heading', { name: followerName, exact: true }).count(), 1, 'Follower link opens the selected public profile')
  assert.equal(await page.getByRole('button', { name: 'Edit profile', exact: true }).count(), 0, 'A public profile has no Edit Profile control')
  assert.equal(await page.getByRole('button', { name: 'Manage visibility', exact: true }).count(), 0, 'A public profile has no visibility controls')
  assert.equal(await page.getByText(founderEmail, { exact: true }).count(), 0, 'A public profile never shows the signed-in user email')
  assert.equal(await page.getByRole('link', { name: 'View all roadmaps', exact: true }).count(), 0, 'A public profile does not link to the signed-in user roadmaps')
  await page.goBack()
  await page.waitForURL(`${origin}/profile?connections=followers`)
  await followersDialog.waitFor()
  assert.equal(await followersDialog.locator('.pf-connection-row').count(), 8, 'Browser Back restores the Followers list')
  await page.setViewportSize({ width: 320, height: 844 })
  const followerDialogLayout = await followersDialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const list = element.querySelector('.pf-connections-scroll')
    return { left: bounds.left, right: bounds.right, scrollHeight: list.scrollHeight, clientHeight: list.clientHeight, scrollbarWidth: getComputedStyle(list).scrollbarWidth }
  })
  assert.ok(followerDialogLayout.left >= 0 && followerDialogLayout.right <= 320, 'Followers dialog fits a narrow mobile viewport')
  assert.ok(followerDialogLayout.scrollHeight > followerDialogLayout.clientHeight, 'Follower list remains vertically scrollable')
  assert.equal(followerDialogLayout.scrollbarWidth, 'none', 'Community connection scrolling hides the visible scrollbar')
  await page.setViewportSize({ width: 1440, height: 1000 })
  const follower = followersDialog.locator('.pf-connection-row').first()
  await follower.getByRole('button', { name: `Follow ${followerName}`, exact: true }).click()
  assert.equal(await socialMetrics.nth(1).innerText(), '6\nFollowing', 'Following count updates when a follower is followed')
  await followersDialog.getByRole('button', { name: 'Close followers', exact: true }).click()
  await socialMetrics.nth(1).click()
  const followingDialog = dialog('Following')
  assert.match(await followingDialog.innerText(), /6 following/i, 'Following dialog displays the current total')
  assert.equal(await followingDialog.locator('.pf-connection-row').count(), 6, 'Following dialog reflects mock follow state')
  const firstFollowing = followingDialog.locator('.pf-connection-row').first()
  const followingName = await firstFollowing.locator('.pf-connection-profile-link').innerText()
  const followingHref = await firstFollowing.locator('.pf-connection-profile-link').getAttribute('href')
  assert.equal(followingHref, '/profile/isabel-torres', 'Following names link to the selected person ID')
  assert.equal(await firstFollowing.locator('.pf-connection-avatar-link').getAttribute('href'), followingHref, 'Following avatars link to that person')
  assert.equal(await firstFollowing.locator('.pf-connection-username-link').getAttribute('href'), followingHref, 'Following usernames link to that person')
  await firstFollowing.locator('.pf-connection-avatar-link').click()
  await page.waitForURL(`${origin}${followingHref}`)
  assert.equal(await page.getByRole('heading', { name: followingName, exact: true }).count(), 1, 'Following link opens the selected public profile')
  assert.equal(await page.getByRole('button', { name: 'Edit profile', exact: true }).count(), 0, 'Following profiles remain read-only')
  await page.goBack()
  await page.waitForURL(`${origin}/profile?connections=following`)
  await followingDialog.waitFor()
  assert.equal(await followingDialog.locator('.pf-connection-row').count(), 6, 'Browser Back restores the Following list')
  await followingDialog.getByRole('button', { name: `Following ${followerName}`, exact: true }).click()
  assert.equal(await followingDialog.locator('.pf-connection-row').count(), 5, 'Unfollowing removes the user from the mock following list')
  await followingDialog.getByRole('button', { name: 'Close following', exact: true }).click()
  await page.getByRole('link', { name: 'My Posts', exact: true }).click()
  await page.waitForURL(`${origin}/social`)
  assert.equal(new URL(page.url()).search, '', 'My Posts opens the Social route without a separate view or filter')
  assert.equal(await page.getByRole('heading', { name: 'Social', exact: true }).count(), 1, 'My Posts opens the existing Social preview')
  assert.equal(await page.getByText('Coming soon', { exact: true }).count(), 1, 'The Social Coming Soon card is retained')
  assert.equal(await page.getByText('Share what you are building and learn from other members.', { exact: true }).count(), 1, 'The Social preview description is retained')
  assert.equal(await page.getByRole('link', { name: 'Back to Dashboard', exact: true }).count(), 1, 'The existing dashboard navigation remains available')
  await go('/profile')
  await button('Edit profile').waitFor()
  assert.equal(await page.locator('.pf-dossier-body .pf-button--primary').count(), 0, 'The prominent profile action is removed from the banner body')
  assert.equal(await page.locator('.pf-account-strip').getByRole('button', { name: 'Edit profile', exact: true }).count(), 1, 'Edit profile is available in the lower banner action strip')
  assert.equal(await page.getByRole('button', { name: 'Manage visibility', exact: true }).count(), 0, 'Manage visibility is removed from the profile banner')
  assert.equal(await page.getByText('Make it your own', { exact: true }).count(), 0, 'The profile completion card is removed')
  assert.equal(await page.getByRole('progressbar', { name: 'Profile detail completion' }).count(), 0, 'Completion is not displayed as a separate card')
  const completionAvatar = page.getByRole('button', { name: /^Profile picture,/ })
  const completionLabel = page.getByRole('tooltip', { name: 'Profile Completion Percentage' })
  const identityCopy = page.locator('.pf-identity-copy')
  const completion = Number(await completionAvatar.getAttribute('data-completion'))
  assert.ok(completion >= 0 && completion <= 100, 'Profile picture exposes the computed completion value')
  assert.match(await completionAvatar.getAttribute('aria-label'), new RegExp(`${completion}%`), 'Completion is available to assistive technology')
  const ring = completionAvatar.locator('.pf-completion-avatar__ring-progress')
  const ringOffset = Number.parseFloat(await ring.evaluate((element) => element.style.strokeDashoffset))
  assert.equal(ringOffset, 100 - completion, 'Progress ring uses the same profile completion percentage')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const identityBeforeHover = await identityCopy.boundingBox()
  const dossierBeforeHover = await page.locator('.pf-dossier').boundingBox()
  await completionAvatar.hover()
  await completionAvatar.waitFor({ state: 'visible' })
  await completionLabel.waitFor({ state: 'visible' })
  await page.waitForTimeout(250)
  assert.equal(await completionLabel.innerText(), 'Profile Completion Percentage', 'Hover displays the completion percentage label')
  const labelBounds = await completionLabel.boundingBox()
  const avatarBounds = await completionAvatar.boundingBox()
  const dossierBounds = await page.locator('.pf-dossier').boundingBox()
  assert.ok(labelBounds.x >= avatarBounds.x + avatarBounds.width, 'The floating label appears beside the avatar')
  assert.ok(Math.abs((labelBounds.y + labelBounds.height / 2) - (avatarBounds.y + avatarBounds.height / 2)) <= 1, 'The floating label is vertically centered with the avatar')
  assert.ok(labelBounds.x >= dossierBounds.x && labelBounds.x + labelBounds.width <= dossierBounds.x + dossierBounds.width, 'The complete label remains within the profile card')
  assert.deepEqual(await identityCopy.boundingBox(), identityBeforeHover, 'The completion tooltip overlays the profile without moving identity content')
  assert.deepEqual(await page.locator('.pf-dossier').boundingBox(), dossierBeforeHover, 'The completion tooltip does not change profile banner dimensions')
  assert.equal(await completionAvatar.getAttribute('aria-pressed'), 'true', 'Hover reveals the completion value')
  assert.equal(await completionAvatar.locator('.pf-completion-avatar__flipper').evaluate((element) => getComputedStyle(element).transitionDuration), '0.85s', 'The flip uses a smooth transition when motion is enabled')
  await page.waitForTimeout(900)
  assert.match(await completionAvatar.locator('.pf-completion-avatar__flipper').evaluate((element) => getComputedStyle(element).transform), /matrix3d/, 'Hover applies a 3D flip transform')
  await page.screenshot({ path: `${output}founder-profile-completion-hover.png` })
  await page.mouse.move(0, 0)
  await page.waitForFunction(() => document.querySelector('.pf-completion-avatar')?.getAttribute('aria-pressed') === 'false')
  await completionLabel.waitFor({ state: 'hidden' })
  assert.equal(await completionAvatar.getAttribute('aria-pressed'), 'false', 'Leaving the avatar returns to the profile picture')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await completionAvatar.locator('.pf-completion-avatar__flipper').evaluate((element) => getComputedStyle(element).transitionDuration), '0s', 'The flip respects reduced-motion preference')
  await completionAvatar.evaluate((element) => element.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })))
  assert.equal(await completionAvatar.getAttribute('aria-pressed'), 'true', 'Touch tap reveals the completion value')
  await completionLabel.waitFor({ state: 'visible' })
  await completionAvatar.evaluate((element) => element.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })))
  assert.equal(await completionAvatar.getAttribute('aria-pressed'), 'false', 'A second touch tap returns to the profile picture')
  await completionLabel.waitFor({ state: 'hidden' })
  await page.mouse.move(0, 0)
  await completionAvatar.focus()
  await page.mouse.move(0, 0)
  await completionLabel.waitFor({ state: 'visible' })
  await completionAvatar.press('Enter')
  assert.equal(await completionAvatar.getAttribute('aria-pressed'), 'true', 'Keyboard activation reveals the completion value')
  await completionAvatar.press('Space')
  assert.equal(await completionAvatar.getAttribute('aria-pressed'), 'false', 'Keyboard activation toggles back to the profile picture')
  assert.equal(await completionLabel.isVisible(), true, 'Keyboard focus keeps the completion label visible')
  assert.equal(await completionAvatar.locator('.pf-completion-avatar__back').innerText(), `${completion}%`, 'The flip displays the computed percentage')
  assert.equal(await completionAvatar.locator('.pf-completion-avatar__flipper').evaluate((element) => getComputedStyle(element).transitionDuration), '0s', 'The flip respects reduced-motion preference')
  await checkLayout('founder-profile')

  // Identity and uploads are saved only after validation, then shared with the shell.
  await button('Edit profile').click()
  assert.equal(await edit().getByText('Your LabX profile', { exact: true }).count(), 1, 'Edit Profile uses Profile terminology')
  assert.equal(await edit().getByText(/dossier/i).count(), 0, 'Edit Profile contains no dossier wording')
  assert.equal(await edit().getByRole('button', { name: 'Venture', exact: true }).count(), 0, 'Venture tab is not present')
  assert.equal(await edit().getByRole('button', { name: 'Visibility', exact: true }).count(), 0, 'Visibility tab is not present')
  const username = edit().getByLabel('Username', { exact: true })
  const accountEmail = edit().getByLabel('Email', { exact: true })
  const originalUsername = await username.inputValue()
  const originalEmail = await accountEmail.inputValue()
  assert.equal(await username.evaluate((element) => element.readOnly), true, 'Username cannot be edited')
  assert.equal(await accountEmail.evaluate((element) => element.readOnly), true, 'Registered email cannot be edited')
  const editFieldLabels = await edit().locator('.pf-dialog-content .pf-field > span:first-child').allInnerTexts()
  const requiredFieldOrder = ['Name', 'Email', 'Username', 'Profile Picture', 'Country', 'State', 'City', 'Skills & expertise', 'Interests', 'Goals & collaboration', 'Professional Background', 'Education', 'Collaboration availability', 'Website']
  let lastFieldIndex = -1
  for (const label of requiredFieldOrder) {
    const index = editFieldLabels.findIndex((item) => item.startsWith(label))
    assert.ok(index > lastFieldIndex, `${label} appears in the requested form order: ${editFieldLabels.join(' | ')}`)
    lastFieldIndex = index
  }
  const nameInfo = edit().getByRole('button', { name: 'More information about Name', exact: true })
  await nameInfo.click()
  assert.equal(await edit().getByRole('tooltip').innerText(), 'Your name as it appears on your profile.', 'Name guidance is available on demand')
  assert.equal(await nameInfo.getAttribute('aria-expanded'), 'true', 'Information icon exposes its expanded state')
  await edit().getByLabel('Name', { exact: true }).click()
  assert.equal(await edit().getByRole('tooltip').count(), 0, 'Clicking outside closes field guidance')
  await nameInfo.click()
  await nameInfo.click()
  assert.equal(await edit().getByRole('tooltip').count(), 0, 'Clicking the information icon again closes field guidance')
  await edit().getByRole('button', { name: 'More information about Profile Picture', exact: true }).click()
  assert.equal(await edit().getByRole('tooltip').innerText(), 'Upload a profile picture to represent your account.', 'Profile picture guidance is available on demand')
  await edit().getByRole('button', { name: 'More information about Profile Picture', exact: true }).click()
  assert.equal(await edit().getByText('PNG or JPEG · up to 512 KiB', { exact: true }).count(), 1, 'Profile picture restrictions remain visible')
  assert.equal(await edit().getByText('PNG or JPEG · up to 1 MiB', { exact: true }).count(), 1, 'Profile banner restrictions remain visible')
  assert.equal(await edit().getByLabel('Bio', { exact: true }).count(), 0, 'Bio is not editable in the Founder Profile form')
  assert.equal(await edit().getByText('Up to 80 characters.', { exact: true }).count(), 1, 'Name character limit remains visible')
  const linkFields = edit().locator('.pf-field:has(input[type="url"])')
  assert.equal(await linkFields.count(), 3, 'Website, Portfolio and LinkedIn remain link fields')
  for (const linkField of await linkFields.all()) {
    assert.equal(await linkField.locator('small').count(), 0, 'Link fields do not show character-limit helper text')
    assert.equal(await linkField.locator('input').getAttribute('maxlength'), '2048', 'Link field character validation remains unchanged')
    assert.equal(await linkField.locator('.pf-info-button').count(), 1, 'Link field info tooltips remain available')
  }
  await edit().getByRole('button', { name: 'Details', exact: true }).click()
  const fundraisingInfo = edit().getByRole('button', { name: 'More information about Fundraising status', exact: true })
  await fundraisingInfo.click()
  assert.equal(await edit().getByRole('tooltip').innerText(), 'Choose whether you are currently raising or preparing to raise funds.', 'Details tab fields use the same information tooltip')
  await fundraisingInfo.press('Escape')
  assert.equal(await edit().getByRole('tooltip').count(), 0, 'Escape closes the tooltip without closing Edit Profile')
  await edit().getByRole('button', { name: 'Basics', exact: true }).click()
  await edit().getByLabel('Name', { exact: true }).fill('')
  await edit().getByRole('button', { name: 'Save profile', exact: true }).click()
  assert.equal(await edit().isVisible(), true, 'An empty display name cannot be saved')
  await edit().getByLabel('Name', { exact: true }).fill('Riley Venture')
  const stateField = edit().getByLabel('State', { exact: true })
  const cityField = edit().getByLabel('City', { exact: true })
  assert.equal(await stateField.isDisabled(), true, 'State remains disabled until a country is selected')
  assert.equal(await cityField.isDisabled(), true, 'City remains disabled until a state is selected')
  await edit().getByLabel('Country', { exact: true }).fill('India')
  assert.equal(await stateField.isDisabled(), false, 'Selecting a country enables its states')
  await stateField.fill('Karnataka')
  assert.equal(await cityField.isDisabled(), false, 'Selecting a state enables its cities')
  await cityField.fill('Bengaluru')
  await stateField.fill('Tamil Nadu')
  assert.equal(await cityField.inputValue(), '', 'Changing state clears the selected city')
  await cityField.fill('Chennai')
  await edit().getByLabel('Country', { exact: true }).fill('United States')
  assert.equal(await stateField.inputValue(), '', 'Changing country clears the selected state')
  assert.equal(await cityField.inputValue(), '', 'Changing country clears the selected city')
  await edit().getByLabel('Country', { exact: true }).fill('India')
  await stateField.fill('Karnataka')
  await cityField.fill('Bengaluru')
  await page.evaluate(() => {
    window.revokedProfilePreviewUrls = []
    const revoke = URL.revokeObjectURL.bind(URL)
    URL.revokeObjectURL = (url) => { window.revokedProfilePreviewUrls.push(url); revoke(url) }
  })
  await edit().getByLabel('Profile Picture', { exact: true }).setInputFiles({ name: 'profile-photo.png', mimeType: 'image/png', buffer: imageBytes })
  assert.equal(await edit().locator('.pf-photo-drop > span[aria-hidden="true"]').count(), 0, 'Avatar has no floating plus icon')
  const avatarPreview = edit().locator('.pf-photo-drop img[src^="blob:"]')
  await avatarPreview.waitFor()
  const originalAvatarPreview = await avatarPreview.getAttribute('src')
  const bannerFileChooser = page.waitForEvent('filechooser')
  await edit().locator('.pf-editor-banner').click()
  const bannerPicker = await bannerFileChooser
  await bannerPicker.setFiles({ name: 'profile-banner.png', mimeType: 'image/png', buffer: imageBytes })
  await edit().getByText('profile-photo.png', { exact: true }).waitFor()
  await edit().locator('.pf-editor-banner img[src^="blob:"]').waitFor()
  const firstBannerPreview = await edit().locator('.pf-editor-banner img').getAttribute('src')
  await edit().getByRole('button', { name: 'Choose File', exact: true }).first().waitFor()
  await edit().getByLabel('Profile Picture', { exact: true }).setInputFiles({ name: 'profile-photo.webp', mimeType: 'image/webp', buffer: webpBytes })
  await edit().getByRole('alert').getByText(/Choose a PNG or JPG image/).waitFor()
  assert.equal(await avatarPreview.getAttribute('src'), originalAvatarPreview, 'An unsupported replacement does not replace the current photo preview')
  await edit().getByLabel('Profile Picture', { exact: true }).setInputFiles({ name: 'profile-photo.png', mimeType: 'image/png', buffer: imageBytes })
  await page.waitForFunction((previous) => document.querySelector('.pf-photo-drop img')?.src !== previous, originalAvatarPreview)
  assert.equal(await page.evaluate((url) => window.revokedProfilePreviewUrls.includes(url), originalAvatarPreview), true, 'Replacing a photo revokes its previous preview URL')
  const replacedAvatarPreview = await avatarPreview.getAttribute('src')
  await edit().getByRole('button', { name: 'Remove Profile Photo', exact: true }).click()
  await avatarPreview.waitFor({ state: 'detached' })
  assert.equal(await page.evaluate((url) => window.revokedProfilePreviewUrls.includes(url), replacedAvatarPreview), true, 'Removing a photo revokes its preview URL')
  await edit().getByLabel('Profile Picture', { exact: true }).setInputFiles({ name: 'profile-photo.png', mimeType: 'image/png', buffer: imageBytes })
  await avatarPreview.waitFor()
  await edit().getByRole('alert').waitFor({ state: 'hidden' })
  await page.evaluate(() => {
    const zone = document.querySelector('.pf-editor-banner')
    const transfer = new DataTransfer()
    transfer.items.add(new File([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMQCsj7DwADGAHQEUfrBgAAAABJRU5ErkJggg=='), (char) => char.charCodeAt(0))], 'dropped-banner.png', { type: 'image/png' }))
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }))
  })
  await edit().getByText('dropped-banner.png', { exact: true }).waitFor()
  await page.waitForFunction((previous) => document.querySelector('.pf-editor-banner img')?.src !== previous, firstBannerPreview)
  assert.equal(await page.evaluate((url) => window.revokedProfilePreviewUrls.includes(url), firstBannerPreview), true, 'Dropping a replacement banner revokes its previous preview URL')
  await checkLayout('edit-basics')

  const privateGoal = 'Validate the private enterprise pilot before announcing the venture.'
  const publicEmail = 'riley.public@example.com'
  const skillsInput = edit().getByRole('combobox', { name: 'Skills & expertise', exact: true })
  await skillsInput.fill('Py')
  await skillsInput.press('ArrowDown')
  await skillsInput.press('Enter')
  await skillsInput.fill('Custom capability')
  await skillsInput.press('Enter')
  await skillsInput.fill('custom capability')
  await skillsInput.press('Enter')
  assert.equal(await edit().locator('.pf-tag-input__tag').filter({ hasText: 'Custom capability' }).count(), 1, 'Duplicate custom tags are prevented')
  const interestsInput = edit().getByRole('combobox', { name: 'Interests', exact: true })
  await interestsInput.fill('Artificial')
  assert.equal(await edit().getByRole('option', { name: 'Python', exact: true }).count(), 0, 'Suggestions are limited to the active tag category')
  await interestsInput.press('ArrowDown')
  await interestsInput.press('Enter')
  const goalsInput = edit().getByRole('combobox', { name: 'Goals & collaboration', exact: true })
  await goalsInput.fill(privateGoal)
  await goalsInput.press('Enter')
  const backgroundInput = edit().getByRole('combobox', { name: 'Professional Background', exact: true })
  await backgroundInput.fill('Product')
  await backgroundInput.press('ArrowDown')
  await backgroundInput.press('Enter')
  const educationInput = edit().getByRole('combobox', { name: 'Education', exact: true })
  await educationInput.fill('Computer')
  await educationInput.press('Enter')
  await edit().getByLabel('Public contact email', { exact: true }).fill(publicEmail)
  await edit().getByLabel('Portfolio', { exact: true }).fill('https://example.com/riley-portfolio')
  assert.equal(await edit().getByRole('button', { name: 'Venture', exact: true }).count(), 0, 'Venture editing is removed')
  assert.equal(await edit().getByRole('button', { name: 'Visibility', exact: true }).count(), 0, 'Visibility settings are removed')
  assert.equal(await edit().getByLabel('Venture name', { exact: true }).count(), 0, 'Venture fields are not rendered')
  assert.equal(await edit().getByRole('checkbox', { name: /Show .* on public profile/ }).count(), 0, 'Visibility controls are not rendered')
  await edit().getByRole('button', { name: 'Save profile', exact: true }).click()
  await edit().waitFor({ state: 'hidden' })
  await page.getByRole('link', { name: 'Open profile for Riley Venture', exact: true }).waitFor()
  await page.reload()
  await page.getByRole('link', { name: 'Open profile for Riley Venture', exact: true }).waitFor()
  await page.getByText(`@${originalUsername}`, { exact: true }).first().waitFor()
  await page.getByText('Bengaluru, Karnataka, India', { exact: true }).waitFor()
  assert.equal(originalEmail, founderEmail, 'The edit form displays the registered account email')
  const uploadedImages = page.locator('img[src^="data:image/png;base64,"]')
  assert.ok(await uploadedImages.count() >= 2, 'Profile photo and banner survive a refresh')
  await uploadedImages.evaluateAll((images) => Promise.all(images.map((image) => image.decode())))
  assert.equal(await uploadedImages.evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)), true, 'Uploaded images decode correctly')
  assert.equal(await button('Public preview').count(), 0, 'Public preview is not available on the profile page')
  assert.equal(await page.getByText(founderEmail, { exact: true }).count(), 0, 'The sign-in email is not displayed on the profile page')
  assert.equal(await page.getByText(publicEmail, { exact: true }).count(), 0, 'The public contact email is not displayed on the profile page')
  assert.equal(await page.getByText('Venture details', { exact: true }).count(), 0, 'Venture details are not displayed on the profile page')
  assert.equal(await page.getByText('Recent activity', { exact: true }).count(), 0, 'Recent activity is not displayed on the profile page')
  const overviewPanels = page.locator('.pf-overview-side > .pf-panel, .pf-overview-main > .pf-panel, .pf-overview-grid--founder > .pf-panel')
  const panelSizes = await overviewPanels.evaluateAll((panels) => panels.map((panel) => {
    const bounds = panel.getBoundingClientRect()
    return { height: bounds.height, width: bounds.width }
  }))
  assert.ok(panelSizes.every(({ height }) => height === 300), 'Founder overview tiles use the compact Around the web reference height')
  assert.equal(panelSizes.length, 4, 'Founder overview renders four equal-sized tiles')
  assert.equal(new Set(panelSizes.map(({ width }) => width)).size, 1, 'Overview tiles use equal-width columns')
  assert.equal(await page.getByText('Earned badges recognise activity. They are separate from passport status or identity verification.', { exact: true }).count(), 0, 'Recent achievements has no redundant helper text')
  const linksPanel = page.getByRole('region', { name: 'Links', exact: true })
  assert.ok(await linksPanel.locator('.pf-profile-links > a').count() <= 3, 'Around the web displays no more than three URL entries')
  const linksScroll = await linksPanel.locator('.pf-panel-content').evaluate((content) => {
    const originalHeight = content.closest('.pf-panel').getBoundingClientRect().height
    const item = content.firstElementChild
    for (let index = 0; index < 8; index++) content.append(item.cloneNode(true))
    const heading = content.previousElementSibling
    const headingTop = heading.getBoundingClientRect().top
    content.scrollTo({ top: content.scrollHeight, behavior: 'instant' })
    const result = {
      scrolls: content.scrollTop > 0 && content.scrollHeight > content.clientHeight,
      scrollbar: getComputedStyle(content).scrollbarWidth,
      tileHeight: content.closest('.pf-panel').getBoundingClientRect().height,
      headingStayedFixed: headingTop === heading.getBoundingClientRect().top,
    }
    while (content.children.length > 1) content.lastElementChild.remove()
    content.scrollTop = 0
    return { ...result, originalHeight }
  })
  assert.equal(linksScroll.scrolls, true, 'Around the web overflow scrolls inside its tile')
  assert.equal(linksScroll.scrollbar, 'none', 'Around the web scrollbar is hidden')
  assert.equal(linksScroll.tileHeight, linksScroll.originalHeight, 'Scrolling Around the web does not resize its tile')
  assert.equal(linksScroll.headingStayedFixed, true, 'Around the web heading remains fixed while scrolling')
  const detailPanel = page.getByRole('region', { name: 'Profile details', exact: true })
  const detailsScroll = await detailPanel.locator('.pf-panel-content').evaluate((content) => {
    const originalHeight = content.closest('.pf-panel').getBoundingClientRect().height
    const item = content.firstElementChild
    for (let index = 0; index < 8; index++) content.append(item.cloneNode(true))
    content.scrollTop = content.scrollHeight
    const result = { scrolls: content.scrollTop > 0 && content.scrollHeight > content.clientHeight, scrollbar: getComputedStyle(content).scrollbarWidth, tileHeight: content.closest('.pf-panel').getBoundingClientRect().height }
    while (content.children.length > 1) content.lastElementChild.remove()
    content.scrollTop = 0
    return { ...result, originalHeight }
  })
  assert.equal(detailsScroll.scrolls, true, 'Profile details overflow scrolls inside their tile')
  assert.equal(detailsScroll.scrollbar, 'none', 'Profile detail scrollbar is hidden')
  assert.equal(detailsScroll.tileHeight, detailsScroll.originalHeight, 'Scrolling profile details does not resize the tile')
  const projectProgression = page.getByRole('region', { name: 'Project progression', exact: true })
  await projectProgression.waitFor()
  const projectListStyle = await projectProgression.locator('.pf-project-list').evaluate((element) => {
    const style = getComputedStyle(element)
    const project = element.querySelector('.pf-project')
    return {
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      scrollSnapType: style.scrollSnapType,
      scrollBehavior: style.scrollBehavior,
      maxHeight: style.maxHeight,
      flexDirection: style.flexDirection,
      projectWidth: project.getBoundingClientRect().width,
      listWidth: element.getBoundingClientRect().width,
      cardCount: element.querySelectorAll('.pf-project').length,
      tabIndex: element.tabIndex,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }
  })
  assert.equal(projectListStyle.overflowX, 'hidden', 'Project progression does not scroll horizontally')
  assert.equal(projectListStyle.overflowY, 'auto', 'Project progression keeps inline vertical scrolling')
  assert.equal(projectListStyle.tabIndex, 0, 'Project progression scrolling can be focused and used from the keyboard')
  assert.equal(projectListStyle.flexDirection, 'column', 'Project cards are stacked vertically')
  assert.match(projectListStyle.scrollSnapType, /^y/, 'Project browsing snaps vertically between cards')
  assert.equal(projectListStyle.scrollBehavior, 'smooth', 'Project browsing scrolls smoothly')
  assert.notEqual(projectListStyle.maxHeight, 'none', 'Project progression scrolling is bounded within its card')
  assert.equal(projectListStyle.projectWidth, projectListStyle.listWidth, 'Project cards fill the available list width')
  assert.equal(projectListStyle.scrollWidth, projectListStyle.clientWidth, 'Project cards do not expand the page horizontally')
  const projectScrollAudit = await projectProgression.locator('.pf-project-list').evaluate((element) => {
    const heading = element.previousElementSibling
    const headingTop = heading.getBoundingClientRect().top
    const project = element.querySelector('.pf-project')
    const extras = [project.cloneNode(true), project.cloneNode(true)]
    extras.forEach((card) => element.append(card))
    const initialCards = [...element.querySelectorAll('.pf-project')]
    const bounds = element.getBoundingClientRect()
    const initialView = initialCards.slice(0, 2).every((card) => card.getBoundingClientRect().bottom <= bounds.bottom)
      && initialCards[2].getBoundingClientRect().bottom > bounds.bottom
    const canScrollVertically = element.scrollHeight > element.clientHeight
    element.scrollTo({ top: element.scrollHeight, behavior: 'instant' })
    const scrolled = element.scrollTop > 0
    const headingStayedPut = headingTop === heading.getBoundingClientRect().top
    extras.forEach((card) => card.remove())
    element.scrollTop = 0
    return { initialView, canScrollVertically, scrolled, headingStayedPut }
  })
  assert.equal(projectScrollAudit.initialView, true, 'The first two sorted projects are visible before scrolling')
  assert.equal(projectScrollAudit.canScrollVertically, true, 'Additional projects remain available in the vertical scroll area')
  assert.equal(projectScrollAudit.scrolled, true, 'Project progression scrolls independently of the page')
  assert.equal(projectScrollAudit.headingStayedPut, true, 'The section heading and All Projects action remain fixed while scrolling')

  // A second same-origin tab produces real storage events without replacing this page.
  const otherTab = await context.newPage()
  await otherTab.goto(`${origin}/login`)
  await page.bringToFront()
  await otherTab.evaluate((email) => {
    const key = Object.keys(localStorage).find((item) => item.startsWith('labx:profile:v1:') && JSON.parse(localStorage.getItem(item))?.details?.public_email === email)
    if (!key) throw new Error('The profile fixture was not saved.')
    const saved = JSON.parse(localStorage.getItem(key))
    saved.details.privacy.public_email = false
    saved.details.privacy.goals = false
    localStorage.setItem(key, JSON.stringify(saved))
  }, publicEmail)
  await button('Edit profile').click()
  assert.equal(await edit().getByRole('button', { name: 'Visibility', exact: true }).count(), 0, 'Visibility settings remain absent after reopening')
  await edit().getByLabel('City', { exact: true }).fill('Mysuru')
  await edit().getByRole('button', { name: 'Save profile', exact: true }).click()
  await edit().waitFor({ state: 'hidden' })
  const savedPrivacy = await otherTab.evaluate((email) => {
    const key = Object.keys(localStorage).find((item) => item.startsWith('labx:profile:v1:') && JSON.parse(localStorage.getItem(item))?.details?.public_email === email)
    return JSON.parse(localStorage.getItem(key)).details.privacy
  }, publicEmail)
  assert.equal(savedPrivacy.public_email, false, 'Saving profile details preserves the stored public-email preference')
  assert.equal(savedPrivacy.goals, false, 'Saving profile details preserves the stored goals preference')

  // The optional passport can be saved incomplete; only a complete application submits.
  await button('Founder Passport').click()
  const passportTiles = page.locator('.pf-passport-layout > .pf-passport-tile')
  assert.equal(await passportTiles.count(), 2, 'Founder Passport overview replaces Passport possibilities with the existing timeline')
  assert.equal(await page.locator('.pf-passport-layout').getByRole('heading', { name: 'Passport possibilities', exact: true }).count(), 0, 'Passport possibilities is removed from the dashboard')
  assert.equal(await page.locator('.pf-passport-layout').getByText('Preview only', { exact: true }).count(), 0, 'The removed tile no longer displays its preview label')
  const tileLayout = await passportTiles.evaluateAll((elements) => {
    const boxes = elements.map((element) => element.getBoundingClientRect())
    return {
      applicationHeight: boxes[0].height,
      timelineHeight: boxes[1].height,
      equalWidths: Math.abs(boxes[0].width - boxes[1].width) < 1,
      timelineBesideApplication: Math.abs(boxes[0].top - boxes[1].top) < 1 && boxes[1].left > boxes[0].left,
    }
  })
  assert.ok(tileLayout.applicationHeight > 0 && tileLayout.applicationHeight < 390, 'Application status starts at the height its content requires')
  assert.ok(tileLayout.timelineHeight > 0 && tileLayout.timelineHeight < 390, 'Application timeline starts at the height its content requires')
  assert.equal(tileLayout.equalWidths, true, 'Application timeline uses the replaced tile grid width')
  assert.equal(tileLayout.timelineBesideApplication, true, 'Application timeline occupies the Passport possibilities grid position')
  const timeline = passportTiles.nth(1)
  const timelineContent = timeline.locator('.pf-passport-tile__content')
  const applicationTile = passportTiles.nth(0)
  const applicationContent = applicationTile.locator('.pf-passport-tile__content')
  const originalApplicationContent = await applicationContent.innerHTML()
  const originalTimelineContent = await timelineContent.innerHTML()
  const emptyTimelineHeight = await timeline.evaluate((tile) => tile.getBoundingClientRect().height)
  const initialApplicationHeight = await applicationTile.evaluate((tile) => tile.getBoundingClientRect().height)
  assert.ok(emptyTimelineHeight < 390, 'An empty application timeline uses only the height required by its content')
  const expandedTimelineHeight = await timeline.evaluate((tile) => {
    const list = document.createElement('ol')
    list.className = 'pf-timeline'
    for (let index = 0; index < 3; index += 1) {
      const item = document.createElement('li')
      item.innerHTML = `<span class="pf-timeline-dot">✓</span><div><strong>Application update ${index + 1}</strong><time>3 Nov 2026 IST</time><p>Timeline detail for update ${index + 1}.</p></div>`
      list.append(item)
    }
    tile.querySelector('.pf-passport-tile__content').replaceChildren(list)
    return tile.getBoundingClientRect().height
  })
  assert.ok(expandedTimelineHeight > emptyTimelineHeight && expandedTimelineHeight < 390, 'The timeline grows with a few entries without filling the whole tile height')
  const timelineScroll = await timeline.evaluate((tile) => {
    const content = tile.querySelector('.pf-passport-tile__content')
    const header = tile.querySelector('.pf-panel-heading')
    const before = { tileHeight: tile.getBoundingClientRect().height, headerTop: header.getBoundingClientRect().top }
    const filler = document.createElement('div')
    filler.style.height = '1000px'
    content.append(filler)
    const canScroll = content.scrollHeight > content.clientHeight
    content.scrollTop = content.scrollHeight
    const independentlyScrolled = content.scrollTop > 0
    const capped = tile.getBoundingClientRect().height === 390
    const headerStayedPut = header.getBoundingClientRect().top === before.headerTop
    filler.remove()
    content.scrollTop = 0
    return { canScroll, independentlyScrolled, capped, headerStayedPut, scrollbarWidth: getComputedStyle(content).scrollbarWidth }
  })
  assert.equal(timelineScroll.canScroll && timelineScroll.independentlyScrolled, true, 'Additional timeline entries scroll inside the timeline')
  assert.equal(timelineScroll.capped, true, 'The timeline stops expanding at the height of the other tiles')
  assert.equal(timelineScroll.headerStayedPut, true, 'Timeline header remains fixed while its content scrolls')
  assert.equal(timelineScroll.scrollbarWidth, 'none', 'Timeline scrollbar remains visually hidden')
  const expandedApplicationHeight = await applicationTile.evaluate((tile) => {
    const spacer = document.createElement('div')
    spacer.style.height = '100px'
    tile.querySelector('.pf-passport-tile__content').append(spacer)
    return tile.getBoundingClientRect().height
  })
  assert.ok(expandedApplicationHeight > initialApplicationHeight && expandedApplicationHeight < 390, 'Application status expands naturally with additional content')
  const applicationScroll = await applicationTile.evaluate((tile) => {
    const content = tile.querySelector('.pf-passport-tile__content')
    const header = tile.querySelector('.pf-panel-heading')
    const timeline = tile.parentElement.children[1]
    const before = {
      tileHeight: tile.getBoundingClientRect().height,
      headerTop: header.getBoundingClientRect().top,
      timelineHeight: timeline.getBoundingClientRect().height,
    }
    const filler = document.createElement('div')
    filler.style.height = '1000px'
    content.append(filler)
    const canScroll = content.scrollHeight > content.clientHeight
    content.scrollTop = content.scrollHeight
    const independentlyScrolled = content.scrollTop > 0
    const capped = tile.getBoundingClientRect().height === 390
    const headerStayedPut = header.getBoundingClientRect().top === before.headerTop
    const otherTileUnaffected = timeline.getBoundingClientRect().height === before.timelineHeight
    filler.remove()
    content.querySelector('div[style*="100px"]')?.remove()
    content.scrollTop = 0
    return { canScroll, independentlyScrolled, capped, headerStayedPut, otherTileUnaffected, scrollbarWidth: getComputedStyle(content).scrollbarWidth }
  })
  assert.equal(applicationScroll.canScroll && applicationScroll.independentlyScrolled, true, 'Additional application status details scroll inside that tile')
  assert.equal(applicationScroll.capped, true, 'Application status stops expanding at the shared maximum height')
  assert.equal(applicationScroll.headerStayedPut, true, 'Application status header remains fixed while its content scrolls')
  assert.equal(applicationScroll.otherTileUnaffected, true, 'Scrolling application status does not resize the timeline')
  assert.equal(applicationScroll.scrollbarWidth, 'none', 'Application status scrollbar remains visually hidden')
  await page.setViewportSize({ width: 390, height: 844 })
  const mobileTileLimits = await passportTiles.evaluateAll((tiles) => tiles.map((tile) => ({ height: tile.getBoundingClientRect().height, maxHeight: getComputedStyle(tile).maxHeight })))
  assert.ok(mobileTileLimits.every(({ height, maxHeight }) => height <= 360 && maxHeight === '360px'), 'Both tiles use the responsive mobile height limit')
  assert.ok(mobileTileLimits.every(({ height }) => height > 0), 'Both tiles remain visible in the single-column mobile layout')
  await applicationTile.evaluate((tile, content) => { tile.querySelector('.pf-passport-tile__content').innerHTML = content }, originalApplicationContent)
  await timeline.evaluate((tile, content) => { tile.querySelector('.pf-passport-tile__content').innerHTML = content }, originalTimelineContent)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const passportPreview = page.getByRole('button', { name: /Founder Passport preview for/ })
  await page.mouse.move(0, 0)
  await passportPreview.hover()
  const passportDialog = page.getByRole('dialog', { name: 'Your Founder Identity', exact: true })
  await passportDialog.waitFor()
  assert.equal(await page.locator('.pf-passport-preview-benefit').count(), 7, 'The passport preview exposes all proposed benefits')
  assert.equal(await page.locator('.pf-passport-card--modal').getByText('Application: Not applied', { exact: true }).count(), 1, 'The reverse side uses the current application status')
  assert.equal(await page.locator('.pf-passport-card__application-status').evaluate((element) => getComputedStyle(element).color), 'rgb(255, 133, 133)', 'Passport application status is red')
  assert.equal(await page.locator('.pf-passport-card__disclaimer').evaluate((element) => getComputedStyle(element).color), 'rgb(255, 133, 133)', 'Passport preview disclaimer is red')
  assert.equal(await passportDialog.getByText('Explore the opportunities envisioned for the LabX Founder Passport.', { exact: true }).count(), 1, 'The identity panel explains the proposed experience')
  assert.equal(await passportDialog.getByRole('button', { name: /Flip passport|Show front/ }).count(), 0, 'Manual flip controls are not shown')
  assert.equal(await passportDialog.getByRole('button', { name: 'Close Founder Passport preview', exact: true }).count(), 0, 'The close button is not shown')
  const passportSpin = page.locator('.pf-passport-card--modal .pf-passport-card__spin')
  const reducedMotion = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const initialSpin = await passportSpin.evaluate((element) => getComputedStyle(element).animationName)
  if (reducedMotion) {
    assert.equal(initialSpin, 'none', 'Reduced motion disables the passport spin')
  } else {
    assert.equal(initialSpin, 'pf-passport-continuous-flip', 'The expanded passport uses the continuous rotation')
    assert.equal(await passportSpin.evaluate((element) => getComputedStyle(element).animationPlayState), 'running', 'Opening the popup starts the passport rotation')
    assert.equal(await page.locator('.pf-passport-popup__card').evaluate((element) => getComputedStyle(element, '::before').animationName), 'pf-passport-ring-rotate, pf-passport-ring-pulse', 'The popup holographic ring rotates and pulses')
    await page.waitForFunction(() => document.querySelector('.pf-passport-popup__card')?.classList.contains('pf-passport-popup__card--entered'))
    const modalCard = await page.locator('.pf-passport-card--modal').boundingBox()
    const benefitsCard = await page.locator('.pf-passport-popup__benefits').boundingBox()
    await page.mouse.move(benefitsCard.x + 5, benefitsCard.y + 5)
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.pf-passport-card--modal .pf-passport-card__spin')).animationPlayState === 'running')
    await page.mouse.move(modalCard.x + modalCard.width / 2, modalCard.y + modalCard.height / 2)
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.pf-passport-card--modal .pf-passport-card__spin')).animationPlayState === 'paused')
    const pausedTransform = await passportSpin.evaluate((element) => getComputedStyle(element).transform)
    await page.waitForTimeout(300)
    assert.equal(await passportSpin.evaluate((element) => getComputedStyle(element).transform), pausedTransform, 'Hovering the expanded card pauses its current orientation')
    await page.mouse.move(benefitsCard.x + 5, benefitsCard.y + 5)
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.pf-passport-card--modal .pf-passport-card__spin')).animationPlayState === 'running')
    const resumedTransform = await passportSpin.evaluate((element) => getComputedStyle(element).transform)
    await page.waitForTimeout(300)
    assert.notEqual(await passportSpin.evaluate((element) => getComputedStyle(element).transform), resumedTransform, 'Leaving the expanded card resumes rotation while over benefits')
    await page.mouse.move(modalCard.x + modalCard.width / 2, modalCard.y + modalCard.height / 2)
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.pf-passport-card--modal .pf-passport-card__spin')).animationPlayState === 'paused')
    await page.mouse.move(benefitsCard.x + 5, benefitsCard.y + 5)
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.pf-passport-card--modal .pf-passport-card__spin')).animationPlayState === 'running')
  }
  assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden', 'The passport popup locks background scrolling')
  assert.equal(await page.locator('#root').evaluate((root) => root.inert), true, 'The passport popup disables background interaction')
  await page.locator('.pf-passport-popup__benefits').click()
  await passportDialog.waitFor()
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const layout = await page.evaluate(() => {
      const card = document.querySelector('.pf-passport-popup__card .pf-passport-card')?.getBoundingClientRect()
      const benefits = document.querySelector('.pf-passport-popup__benefits')?.getBoundingClientRect()
      return {
        fits: document.documentElement.scrollWidth <= innerWidth + 1,
        cardFits: Boolean(card && card.left >= 0 && card.right <= innerWidth),
        benefitsVisible: Boolean(benefits && benefits.width > 0 && benefits.height > 0),
      }
    })
    assert.ok(layout.fits && layout.cardFits && layout.benefitsVisible, `Expanded passport fits at ${width}px`)
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.mouse.click(10, 10)
  await passportDialog.waitFor({ state: 'hidden' })
  assert.equal(await page.locator('#root').evaluate((root) => root.inert), false, 'Closing the popup restores background interaction')
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden', 'Closing the popup restores background scrolling')
  assert.equal(await passportSpin.evaluate((element) => getComputedStyle(element).animationName), 'none', 'Closing the popup stops its rotation loop')
  await passportPreview.hover()
  await passportDialog.waitFor()
  if (!reducedMotion) assert.equal(await page.locator('.pf-passport-card--modal .pf-passport-card__spin').evaluate((element) => getComputedStyle(element).animationPlayState), 'running', 'Reopening the popup restarts passport rotation')
  await page.keyboard.press('Escape')
  await passportDialog.waitFor({ state: 'hidden' })
  await passportPreview.hover()
  await passportDialog.waitFor()
  await page.mouse.click(1, 1)
  await passportDialog.waitFor({ state: 'hidden' })
  await button('Apply for Founder Passport').click()
  const application = dialog('Founder Passport application')
  assert.equal(await application.getByLabel('Venture name', { exact: true }).count(), 0, 'Founder Passport application does not include a venture name field')
  for (const label of ['Linked project (optional)', 'Portfolio / evidence link (optional)', 'Founder story', 'Supporting evidence']) {
    assert.equal(await application.getByRole('button', { name: `More information about ${label}`, exact: true }).count(), 1, `${label} has an information tooltip`)
  }
  const storyInfo = application.getByRole('button', { name: 'More information about Founder story', exact: true })
  await storyInfo.click()
  assert.equal(await application.getByRole('tooltip').innerText(), 'Describe your venture, your contribution, and the progress represented by your evidence.', 'Founder story explanation is available in its tooltip')
  await application.getByLabel('Founder story', { exact: true }).click()
  assert.equal(await application.getByRole('tooltip').count(), 0, 'Clicking outside closes Passport application tooltips')
  assert.equal(await application.getByText('Describe your venture, your contribution, and the progress represented by your evidence.', { exact: true }).count(), 0, 'Founder story explanation is no longer displayed below the field')
  const confirmationInfo = application.getByRole('button', { name: 'More information about Application Confirmation', exact: true })
  await confirmationInfo.click()
  assert.equal(await application.getByRole('tooltip').innerText(), 'This bounded form demonstrates the application flow. It is not an official eligibility policy. You can save a draft and continue using LabX without applying.', 'Application confirmation explanation is available in its tooltip')
  await confirmationInfo.press('Escape')
  assert.equal(await application.getByRole('tooltip').count(), 0, 'Escape closes the confirmation tooltip')
  assert.equal(await application.getByRole('checkbox', { name: 'I confirm these details and supporting files are mine to submit.', exact: true }).count(), 1, 'Application confirmation remains an accessible required checkbox')
  assert.equal(await application.getByText('This bounded form demonstrates the application flow. It is not an official eligibility policy. You can save a draft and continue using LabX without applying.', { exact: true }).count(), 0, 'Application policy explanation is no longer displayed inline')
  await application.getByRole('button', { name: 'Submit application', exact: true }).click()
  assert.equal(await application.isVisible(), true, 'Required application data prevents an empty submission')
  await application.getByLabel('Linked project (optional)', { exact: true }).selectOption({ label: 'Private Research Venture' })
  await application.getByRole('button', { name: 'Save draft', exact: true }).click()
  await application.waitFor({ state: 'hidden' })
  await otherTab.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith('labx:projects:v1:') && JSON.parse(localStorage.getItem(item))?.projects?.some((project) => project.name === 'Private Research Venture'))
    if (!key) throw new Error('The linked project fixture was not saved.')
    const saved = JSON.parse(localStorage.getItem(key))
    saved.projects = saved.projects.filter((project) => project.name !== 'Private Research Venture')
    localStorage.setItem(key, JSON.stringify(saved))
  })
  await button('Overview').click()
  await page.getByRole('heading', { name: 'No projects to display', exact: true }).waitFor()
  await otherTab.close()
  await page.bringToFront()
  await button('Founder Passport').click()
  await button('Continue draft').click()
  assert.equal(await application.getByLabel('Linked project (optional)', { exact: true }).inputValue(), '', 'A deleted project is cleared when reopening a saved application')
  assert.equal(await application.getByRole('option', { name: 'Private Research Venture', exact: true }).count(), 0)
  await application.getByLabel('Legal name', { exact: true }).fill('Riley Venture')
  await application.getByLabel('Contact email', { exact: true }).fill(founderEmail)
  await application.getByLabel('City', { exact: true }).fill('Bengaluru')
  await application.getByLabel('Country', { exact: true }).fill('India')
  assert.equal(await application.getByLabel('Founder role', { exact: true }).count(), 0, 'Founder role is not part of the application form')
  const founderStory = 'I co-founded Research Ventures to help small teams test practical learning tools. We interviewed prospective users, documented their unmet needs, and built an early prototype. I lead product research, coordinate the team, and organize our next validation studies.'
  await application.getByLabel('Founder story', { exact: true }).fill(founderStory)
  await application.getByLabel('Portfolio / evidence link (optional)', { exact: true }).fill('https://example.com/riley-portfolio')
  assert.equal(await application.getByText('PDF, PNG, JPG, JPEG — Up to 3 files, 1 MiB each and 2 MiB combined.', { exact: true }).count(), 1)
  await application.getByLabel('Supporting evidence', { exact: true }).setInputFiles({
    name: 'renamed-webp.jpg', mimeType: 'image/jpeg', buffer: webpBytes,
  })
  await application.getByRole('alert').getByText(/contents do not match/i).waitFor()
  await application.getByText('Reading supporting evidence…', { exact: true }).waitFor({ state: 'hidden' })
  const supportingEvidence = application.getByLabel('Supporting evidence', { exact: true })
  assert.equal(await supportingEvidence.isDisabled(), false, 'Evidence selection is available after rejecting an unsupported file')
  await supportingEvidence.setInputFiles({
    name: 'founder-evidence.pdf', mimeType: 'application/pdf', buffer: evidenceBytes,
  })
  await application.locator('.pf-file-list li').filter({ hasText: 'founder-evidence.pdf' }).waitFor()
  await application.getByRole('checkbox', { name: 'I confirm these details and supporting files are mine to submit.', exact: true }).check()
  await checkLayout('passport-application')
  await application.getByRole('button', { name: 'Submit application', exact: true }).click()
  await application.waitFor({ state: 'hidden' })

  assert.equal(await page.locator('.pf-simulator').count(), 0, 'Review Simulator is not displayed on the Founder Profile')
  assert.equal(await page.getByText(/Review simulator/i).count(), 0, 'Review Simulator heading is absent')
  assert.equal(await page.getByText(/Preview controls/i).count(), 0, 'Review Simulator controls are absent')
  const statusTile = page.locator('.pf-passport-layout > .pf-passport-tile').first()
  assert.equal(await statusTile.getByText('Submitted', { exact: true }).count(), 1, 'Application status remains visible after submission')
  assert.equal(await statusTile.getByText('Your application is saved. Review updates will appear in your application timeline.', { exact: true }).count(), 0, 'Submitted status helper text is removed')
  const submittedDetails = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'View submitted details' }) })
  assert.equal(await submittedDetails.locator('summary').count(), 1, 'Submitted details remain expandable')
  await submittedDetails.locator('summary').click()
  assert.equal(await submittedDetails.getByText('Only you can see this application.', { exact: true }).count(), 1, 'Submitted details remain available when expanded')
  const downloadReady = page.waitForEvent('download')
  await submittedDetails.getByRole('link', { name: 'Download evidence: founder-evidence.pdf', exact: true }).click()
  const evidenceDownload = await downloadReady
  assert.equal(evidenceDownload.suggestedFilename(), 'founder-evidence.pdf')
  assert.deepEqual(await readFile(await evidenceDownload.path()), evidenceBytes, 'Submitted evidence persists and downloads with identical bytes')
  await page.evaluate(async () => {
    const { mockAuth } = await import('/src/features/authentication/services/mock_auth.js')
    const { passportStore } = await import('/src/features/profile/services/passport_store.js')
    const userId = mockAuth.getUser().id
    passportStore.simulateReview(userId, 'start_review')
    passportStore.simulateReview(userId, 'mark_eligible')
    passportStore.simulateReview(userId, 'approve')
  })
  const verifiedFounder = page.locator('.pf-verified-badge')
  await verifiedFounder.waitFor()
  assert.equal(await verifiedFounder.getAttribute('title'), 'Verified Founder', 'Approval displays the verified founder badge with its tooltip')
  assert.equal(await verifiedFounder.evaluate((element) => element.parentElement.classList.contains('pf-name-with-verification') && element.parentElement.firstElementChild.matches('h2') && element.previousElementSibling === element.parentElement.firstElementChild), true, 'Verified badge sits directly beside the founder name')
  assert.equal(await page.locator('.pf-name-row > .pf-role-chip').count(), 1, 'Founder role remains separate from the verified badge')
  assert.equal(await verifiedFounder.evaluate((element) => getComputedStyle(element).color), 'rgb(240, 212, 147)', 'The verified founder badge uses a subtle golden accent')
  await page.evaluate(async () => {
    const { mockAuth } = await import('/src/features/authentication/services/mock_auth.js')
    const { passportStore } = await import('/src/features/profile/services/passport_store.js')
    passportStore.simulateReview(mockAuth.getUser().id, 'mark_renewal_due')
  })
  await verifiedFounder.waitFor({ state: 'detached' })
  assert.equal(await page.locator('.pf-verified-badge').count(), 0, 'Badge is removed when the application is no longer approved')

  // A separate founder has no access to this profile's dossier or application.
  await signOut()
  await signUp({ email: 'profile-other@example.com', name: 'Other Founder' })
  await go('/profile')
  await button('Edit profile').click()
  assert.equal(await edit().getByLabel('Name', { exact: true }).inputValue(), 'Other Founder')
  assert.equal(await edit().getByLabel('Bio', { exact: true }).count(), 0, 'Bio is absent from another Founder Profile editor')
  await closeDialog()
  await button('Founder Passport').click()
  await button('Apply for Founder Passport').waitFor()
  assert.equal(await page.getByText('founder-evidence.pdf', { exact: true }).count(), 0)
  await signOut()
  await signUp({ email: 'profile-mentor@example.com', name: 'Morgan Mentor', role: 'mentor' })
  await go('/profile')
  await button('Edit profile').waitFor()
  assert.equal(await button('Founder Passport').count(), 0, 'Mentor profiles cannot open founder applications')
  assert.equal(await button('Apply for Founder Passport').count(), 0)
  await checkLayout('mentor-profile', [390, 1440])
  await signOut()
  await signIn(founderEmail)
  await go('/profile')
  await page.getByRole('link', { name: 'Open profile for Riley Venture', exact: true }).waitFor()
  assert.equal(await page.getByText(/dossier/i).count(), 0, 'Founder profile copy uses Profile terminology')
  await button('Founder Passport').click()
  assert.equal(await page.locator('.pf-simulator').count(), 0, 'Review Simulator remains absent after reopening the Founder Profile')

  assert.deepEqual(runtimeErrors, [], 'No browser runtime errors')
  assert.deepEqual(assetErrors, [], 'No missing local assets')
  assert.deepEqual(backendRequests, [], 'Profile and passport preview stay local')
  assert.deepEqual(externalRequests, [], 'Uploads, previews and simulated reviews do not contact external services')
  console.log('Profile identity, privacy, passport review and responsive checks passed.')
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: `${output}failure.png`, fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser?.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
