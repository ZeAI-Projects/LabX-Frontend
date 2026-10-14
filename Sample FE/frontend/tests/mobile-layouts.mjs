import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// All API traffic is fulfilled locally. This suite never creates real users.
const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../test-results/mobile/', import.meta.url));
await mkdir(output, { recursive: true });
const server = await createServer({ root, envDir: false, logLevel: 'error', server: { host: '127.0.0.1', port: 5188, strictPort: true },
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:5188/api') } });
await server.listen();
let browser;

const user = { id: 'founder-4', full_name: 'Alex Morgan', username: 'alexbuilds', role: 'founder', assessment_completed: true, total_points: 8450 };
const founders = ['Amara Okafor', 'Sofia Chen', 'Rohan Patel', 'Alex Morgan', 'Isabella Fernandez-Williams', 'Noah Kim', 'Maya Singh', 'James Wilson'].map((name, i) => ({
  id: `founder-${i + 1}`, rank: i + 1, full_name: name, username: name.toLowerCase().replaceAll(' ', ''),
  total_points: 12450 - i * 1250, badges_count: 12 - i, domain: 'Technology & Innovation', domain_icon: '✦', stage: 'Discover', level: 'Level 2', is_current_user: i === 3,
}));
const names = ['Find your opportunity', 'Define your ideal customer', 'Validate the problem', 'Map the competitive landscape', 'Build your first prototype', 'Test with real people'];
const roadmap = {
  domain: { id: 'tech', name: 'Technology & Innovation' },
  current_location: { current_stage_id: 'stage-0', current_level_id: 'level-0-0', current_milestone_id: 'mission-0-1' },
  stages: ['Discover', 'Develop', 'Launch', 'Traction', 'Scale'].map((name, s) => ({ id: `stage-${s}`, name, is_unlocked: s === 0,
    levels: [0, 1].map((l) => ({ id: `level-${s}-${l}`, name: `Level ${l + 1}`, milestones: [0, 1, 2].map((m) => ({
      id: `mission-${s}-${l * 3 + m}`, name: names[l * 3 + m], milestone_order: m + 1,
      description: 'Turn your idea into a clear next step. Gather evidence, reflect on what you learn, and build with confidence.',
      is_completed: s === 0 && l === 0 && m === 0, is_unlocked: s === 0 && l === 0 && m <= 1,
    })) })),
  })),
};
const badges = ['First Steps', 'Problem Solver', 'Community Builder', 'Consistent Creator', 'Venture Visionary', 'Milestone Master', 'Team Player', 'Growth Mindset'].map((name, i) => ({
  id: `badge-${i}`, name, icon: ['✦', '◈', '★', '⚡'][i % 4], is_earned: i < 3,
  description: ['Complete your first mission and begin your founder journey.', 'Turn a real customer problem into an opportunity.', 'Connect with your guild and share what you have learned.'][i % 3],
}));
const payload = (path) => {
  if (path === '/api/auth/me' || path === '/api/profile' || path.startsWith('/api/profile/')) return user;
  if (path === '/api/roadmap') return roadmap;
  if (path === '/api/achievements') return badges;
  if (path === '/api/leaderboard') return { leaderboard: founders, user_standing: founders[3], current_domain: { name: 'Technology & Innovation' }, domains: [{ id: 'tech', name: 'Technology & Innovation' }], total_founders: 128 };
  return [];
};

try {
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {});
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.addInitScript(() => localStorage.setItem('labx_token', 'layout-fixture-token'));
  let failAchievements = false;
  let emptyAchievements = false;
  const requests = [];
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      assert.equal(route.request().method(), 'GET', 'Layout checks must never write to the API');
      requests.push(url);
      if (failAchievements && url.pathname === '/api/achievements') return route.fulfill({ status: 503, json: { success: false } });
      return route.fulfill({ json: { success: true, data: emptyAchievements && url.pathname === '/api/achievements' ? [] : payload(url.pathname) } });
    }
    return url.origin === 'http://127.0.0.1:5188' ? route.continue() : route.abort();
  });
  const visit = async (path, selector) => { await page.goto(`http://127.0.0.1:5188${path}`); await page.locator(selector).first().waitFor(); await page.waitForTimeout(600); await page.evaluate(async () => { await Promise.all(document.getAnimations().filter((animation) => animation.effect?.getTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {}))); }); };
  const fits = async (selector) => {
    const failures = await page.locator(selector).evaluateAll((elements) => elements.filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width && (box.left < -1 || box.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 2);
    }).map((element) => element.className));
    assert.deepEqual(failures, [], `Clipped content at ${page.viewportSize().width}px: ${failures}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Page must not scroll sideways');
  };

  for (const width of [320, 375, 390, 430, 768, 844, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : width === 844 ? 390 : 844 });
    await visit('/leaderboard', '.ranking-row');
    await fits('.leaderboard-content, .leaderboard-controls-row, .podium-card, .your-standing-card-hero');
    if (width <= 900) await fits('.ranking-row, .ranking-founder, .ranking-domain');
    assert.equal(await page.locator('.leaderboard-main-title > span').textContent(), 'Leaderboard', 'Reveal must preserve styled heading children');
    await page.screenshot({ path: `${output}leaderboard-${width}.png`, fullPage: true, animations: 'disabled' });

    await visit('/roadmap', '.board-holo-card');
    await fits('.pubg-roadmap-header, .stage-section-pill, .board-holo-card, .next-stage-teaser-copy');
    if (width <= 900) await fits('.next-stage-teaser-pill');
    if (width <= 900) {
      assert.ok(await page.locator('.game-board-container').evaluate((element) => element.offsetHeight < 1800), 'Mobile canvas must fit its content');
      const rows = await page.locator('.board-milestone-row').evaluateAll((elements) => elements.map((element) => ({ node: element.querySelector('.board-node-anchor').getBoundingClientRect().left, card: element.querySelector('.board-holo-card').getBoundingClientRect().left })));
      assert.ok(rows.every((row) => row.node < row.card), 'Every mobile node must precede its card');
    }
    await page.screenshot({ path: `${output}roadmap-${width}.png`, fullPage: true, animations: 'disabled' });

    await visit('/achievements', '.achievement-card');
    await fits('.achievements-hero, .achievements-grid, .achievement-card, .achievements-filters');
    if (width <= 900) assert.equal(await page.locator('.achievements-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length), 2, 'Two badge columns on phones');
    await page.screenshot({ path: `${output}achievements-${width}.png`, fullPage: true, animations: 'disabled' });
    console.log(`PASS: populated layouts at ${width}px`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await visit('/roadmap', '.board-holo-card');
  await page.getByRole('button', { name: 'Develop, Stage 2, locked preview' }).click();
  await page.locator('.roadmap-stage-preview-lock__message').waitFor();
  await fits('.roadmap-stage-preview-lock__message');
  assert.equal(await page.locator('.board-holo-card:disabled').count(), 6);
  await page.screenshot({ path: `${output}roadmap-locked.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Return to Active Stage' }).click();
  await page.getByRole('button', { name: 'Current mission', exact: true }).click();
  await page.waitForTimeout(700);
  await page.locator('.board-holo-card.state-active').click();
  await page.waitForURL('**/roadmap/milestones/mission-0-1');

  await visit('/leaderboard', '.ranking-row');
  await page.getByLabel('Search founders').fill('Maya');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.waitForTimeout(250);
  assert.ok(requests.some((url) => url.searchParams.get('search') === 'Maya'));
  await page.getByLabel('Filter leaderboard by domain').selectOption('tech');
  await page.waitForTimeout(250);
  assert.ok(requests.some((url) => url.searchParams.get('domain_id') === 'tech'));
  await page.getByRole('button', { name: /Rank 1: Amara/ }).click();
  await page.waitForURL('**/profile/founder-1');

  await visit('/achievements', '.achievement-card');
  await page.getByRole('button', { name: /^Earned/ }).click();
  assert.equal(await page.locator('.achievement-card').count(), 3);
  await page.getByRole('button', { name: /^Locked/ }).click();
  assert.equal(await page.locator('.achievement-card').count(), 5);
  await page.getByRole('button', { name: 'More navigation' }).click();
  await page.locator('dialog[open]').waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${output}navigation.png`, animations: 'disabled' });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'More navigation' }).evaluate((element) => document.activeElement === element), true);
  await page.getByRole('button', { name: 'More navigation' }).click();
  await page.getByRole('navigation', { name: 'All pages' }).getByRole('link', { name: 'Roadmap', exact: true }).click();
  await page.waitForURL('**/roadmap');
  assert.equal(await page.locator('dialog[open]').count(), 0);

  failAchievements = true;
  await visit('/achievements', '[role="alert"]');
  failAchievements = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.locator('.achievement-card').first().waitFor();
  emptyAchievements = true;
  await visit('/achievements', '.achievements-status h3');
  assert.equal(await page.locator('.achievements-status h3').textContent(), 'No badges to show');
  emptyAchievements = false;

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visit('/leaderboard', '.ranking-row');
  assert.equal(await page.locator('h1').first().evaluate((element) => element.getAnimations().length), 0);
  assert.equal(await page.locator('.leaderboard-main-title > span').textContent(), 'Leaderboard');
  await page.getByRole('button', { name: 'More navigation' }).click();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.waitForURL('**/login');
  assert.equal(await page.evaluate(() => localStorage.getItem('labx_token')), null);
  assert.deepEqual(errors, [], 'No browser runtime errors');
  await writeFile(`${output}index.html`, `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LabX mobile review</title>
<style>*{box-sizing:border-box}body{margin:0;background:#080e1b;color:#e2e8f0;font:15px system-ui;padding:32px}header{max-width:1200px;margin:auto}h1{font-size:28px;letter-spacing:-.04em}p{color:#94a3b8;line-height:1.6}label{display:block;margin:20px 0}select{background:#15243b;color:#fff;border:1px solid #334155;padding:10px;border-radius:8px}.screens{max-width:1200px;margin:30px auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.screen{border:1px solid #334155;border-radius:20px;overflow:hidden;background:#0a1020}.screen img{width:100%;display:block}h2{font-size:16px;margin:14px}.viewport{max-height:720px;overflow:auto;scrollbar-width:thin}a{color:#67e8f9}@media(max-width:850px){.screens{grid-template-columns:1fr;max-width:430px}body{padding:16px}}</style>
<header><p>LABX / MOBILE REVIEW</p><h1>A clearer path, on every screen.</h1><p>Actual browser captures with fictional test data. Scroll inside each preview to inspect the full page. The bottom navigation is captured at its original viewport position.</p><label>Screen width <select id="width"><option>320</option><option>375</option><option selected>390</option><option>430</option><option>768</option><option>844</option><option>1440</option></select> px</label><a href="navigation.png">View the navigation sheet</a> · <a href="roadmap-locked.png">View a locked stage</a></header>
<main class="screens">${['roadmap', 'leaderboard', 'achievements'].map((name) => `<section class="screen"><h2>${name[0].toUpperCase() + name.slice(1)}</h2><div class="viewport"><img data-page="${name}" src="${name}-390.png" alt="${name} screen"></div></section>`).join('')}</main>
<script>document.querySelector('select').addEventListener('change',e=>{document.querySelectorAll('[data-page]').forEach(img=>{img.src=img.dataset.page+'-'+e.target.value+'.png';img.parentElement.scrollTop=0})})</script></html>`);
  console.log('PASS: locked stages, mission navigation, search, domain filter, profile links, badge filters, menu, logout, retry, empty state, reduced motion and heading integrity');
} finally {
  await browser?.close();
  await server.close();
}
