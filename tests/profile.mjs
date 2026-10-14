import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base = process.env.LABX_URL || 'http://localhost:5173';
const browser = await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge'});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[], remote=[];
page.on('pageerror', e=>errors.push(e.message));
page.on('request', r=>{if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) remote.push(r.url());});
await mkdir('tests/screenshots',{recursive:true});
try {
 await page.goto(`${base}/profile`);
 await page.getByRole('heading',{name:'Your professional identity',exact:true}).waitFor();
 assert.equal(await page.locator('.labx-sidebar').count(),1);
 assert.equal(await page.locator('.labx-navbar').count(),1);
 assert.equal(await page.locator('.labx-brand-logo').count(),1);
 assert.equal(await page.locator('.labx-shell__sidebar').count(),0);
 assert.equal(await page.locator('.lp-view-picker').count(),0);
 assert.equal(await page.getByRole('heading',{name:'Aarav Menon',exact:true}).count(),0);
 assert.equal(await page.locator('.lp-badges > div > span').first().textContent(),'🏆');
 await page.screenshot({path:'tests/screenshots/combined-desktop.png',fullPage:true,animations:'disabled'});
 await page.screenshot({path:'tests/screenshots/combined-desktop-viewport.png',animations:'disabled'});
 await page.getByRole('button',{name:'Edit profile',exact:true}).click();
 await page.getByLabel('Full name',{exact:true}).fill('Cancelled Name');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 assert.equal(await page.getByRole('heading',{name:'Cancelled Name',exact:true}).count(),0);
 await page.getByRole('button',{name:'Edit profile',exact:true}).click();
 await page.getByLabel('Full name',{exact:true}).fill('Updated Founder');
 await page.getByLabel('Add Skills & expertise',{exact:true}).fill('Testing');
 await page.getByLabel('Add Skills & expertise',{exact:true}).press('Enter');
 await page.getByRole('button',{name:'Save profile',exact:true}).click();
 await page.getByRole('heading',{name:'Updated Founder',exact:true}).waitFor();
 assert.equal(await page.locator('.labx-user-name').textContent(),'Updated Founder');
 const likes=page.locator('.lp-post__actions button').first();
 const oldLikes=await likes.textContent(); await likes.click();
 assert.notEqual(await likes.textContent(),oldLikes);
 await page.getByRole('button',{name:/Comments$/}).first().click();
 await page.getByLabel('Comment',{exact:true}).fill('Local comment check');
 await page.getByRole('button',{name:'Post comment',exact:true}).click();
 await page.getByText('Local comment check',{exact:true}).waitFor();
 await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('dialog').count(),0);
 await page.getByRole('button',{name:/Founder Passport/}).click();
 await page.getByLabel('Why are you applying?',{exact:true}).fill('Review my startup work.');
 await page.getByRole('button',{name:'Review details',exact:false}).click();
 await page.getByRole('heading',{name:'Review your application',exact:true}).waitFor();
 await page.getByRole('button',{name:'Save mock draft',exact:false}).click();
 await page.getByRole('status').filter({hasText:'Draft kept'}).waitFor();
 await page.keyboard.press('Escape');
 for (const width of [1920,1440,1024,768,390]) {
  await page.setViewportSize({width,height:844});
  await page.evaluate(()=>window.scrollTo(0,0));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);
  await page.screenshot({path:`tests/screenshots/combined-${width}.png`,fullPage:true,animations:'disabled'});
  await page.screenshot({path:`tests/screenshots/combined-${width}-viewport.png`,animations:'disabled'});
  if (width <= 900) {
   await page.getByRole('button',{name:'More navigation',exact:true}).click();
   await page.getByRole('button',{name:'Close navigation',exact:true}).click();
  }
 }
 await page.reload();
 await page.getByRole('heading',{name:'Deshikh Raaj',exact:true}).waitFor();
 assert.deepEqual(errors,[]); assert.deepEqual(remote,[]);
 console.log('PASS: Sample FE shell/logo/header/badge icons, owner-only profile, edit/cancel/save, shared identity, likes/comments, Passport review, mobile/tablet layout and menu; no runtime errors or remote requests.');
} finally {await browser.close();}
