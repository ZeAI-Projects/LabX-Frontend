import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { DEMO_CREDENTIALS } from '../src/features/authentication/services/mock_auth.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=new URL('../test-results/refinement/',import.meta.url);await mkdir(output,{recursive:true});
const executablePath=process.env.LABX_BROWSER_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const server=await createServer({root,envDir:false,logLevel:'error',server:{host:'127.0.0.1',port:5194,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,...(executablePath ? {executablePath} : {})});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const go=path=>page.goto('http://127.0.0.1:5194'+path);
const screenshot=label=>page.screenshot({path:fileURLToPath(new URL(`${label}.png`,output)),fullPage:true});
const fit=async(label)=>{const ok=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);if(!ok)console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,15).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right}))));assert(ok,label+' overflow');};
async function login(){await go('/login');await page.getByLabel('Email Address',{exact:true}).fill(DEMO_CREDENTIALS.email);await page.getByLabel('Password',{exact:true}).fill(DEMO_CREDENTIALS.password);await page.locator('button[type=submit]').click();await page.waitForURL('**/dashboard');}
try {
 const phase=process.argv[2] || 'assessment';
 if(phase==='auth') {
  const rects=[];
  for(const route of ['/login','/register','/forgot-password']) {
   await go(route);await page.locator('.showcase-panel').waitFor();await page.evaluate(()=>document.fonts.ready);
   const frame=await page.locator('.gamified-card-shell').boundingBox();
   assert(Math.abs(frame.y+frame.height/2-450)<35,'Authentication frame is vertically centered');
   rects.push(await page.locator('.showcase-panel').boundingBox());
   const sound=page.getByRole('button',{name:'Sound effects'});const before=await sound.getAttribute('aria-pressed');await sound.click();assert.notEqual(await sound.getAttribute('aria-pressed'),before);
   await fit(route);await screenshot('auth-'+route.slice(1));
  }
  await page.getByLabel('Email Address',{exact:true}).fill(DEMO_CREDENTIALS.email);
  await page.locator('button[type=submit]').click();await page.getByRole('heading',{name:'Enter OTP',exact:true}).waitFor();
  rects.push(await page.locator('.showcase-panel').boundingBox());await screenshot('auth-reset');await fit('reset');
  await go('/register');await page.getByLabel('Full Name',{exact:true}).fill('Layout Founder');await page.getByLabel('Role',{exact:true}).selectOption('founder');
  await page.getByLabel('Email Address',{exact:true}).fill('layout@example.com');await page.getByLabel('Password',{exact:true}).fill('LayoutCheck1!');await page.getByLabel('Confirm Password',{exact:true}).fill('LayoutCheck1!');
  await page.locator('button[type=submit]').click();await page.waitForURL('**/verify-email');
  rects.push(await page.locator('.showcase-panel').boundingBox());await screenshot('auth-verification');
  for(const r of rects.slice(1))for(const k of ['x','width','height'])assert(Math.abs(r[k]-rects[0][k])<2,'Stable brand '+k);
  for(const width of [320,390,768]) {await page.setViewportSize({width,height:844});await fit('recovery '+width);}
 } else {
  await login();


  if(phase==='assessment') {
   await go('/roadmap/new');await page.getByLabel('Project name',{exact:true}).fill('Review flow');await page.getByRole('button',{name:'Start assessment'}).click();
   await page.setViewportSize({width:1366,height:768});
   await page.getByRole('button',{name:'Next Step',exact:true}).click();await page.getByText('Please select an option before continuing.',{exact:true}).waitFor();
   assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'Validation fits desktop');
   assert.equal(await page.locator('.onboarding-nav').isVisible(),false);
   await page.setViewportSize({width:1366,height:768});
   for(let i=0;i<8;i++){
    await page.locator('.assessment-option').first().click();
    if(i===0)await screenshot('assessment');
    assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'Question '+(i+1)+' fits desktop');
    await page.getByRole('button',{name:i===7?'Review Answers':'Next Step',exact:true}).click();
   }
   await page.getByRole('button',{name:'Edit Answers',exact:true}).click();
   assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'Review controls fit desktop');
   assert.equal(await page.locator('.assessment-option').first().getAttribute('aria-pressed'),'true');
   await page.locator('.assessment-option').nth(1).click();
   await page.getByRole('button',{name:'Return to summary',exact:true}).click();
   await page.reload();assert.equal(await page.locator('.assessment-result dd').first().innerText(),'Education');
   await screenshot('assessment-summary');
   await page.getByRole('button',{name:'Submit Assessment',exact:true}).click();
   await page.getByRole('button',{name:'Enter My Roadmap',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Edit Answers',exact:true}).count(),0);
   await page.reload();assert.equal(await page.locator('.assessment-result dd').first().innerText(),'Education');
   for(const width of [320,390,768]){await page.setViewportSize({width,height:844});await fit('summary '+width);}
   await page.getByRole('button',{name:'Enter My Roadmap',exact:true}).click();await page.locator('.rm-page').waitFor();
  }

  if(phase==='leaderboard') {
   await page.evaluate(async()=>{const {projectStore}=await import('/src/features/projects/services/project_store.js');const p=projectStore.createProject('Education project');projectStore.completeProject(p.id,{q1:2,q2:1,q3:1,q4:1,q5:1,q6:1,q7:1,q8:1});});
   await go('/leaderboard');await page.locator('.lb-podium-card').first().waitFor();
   assert.equal(await page.locator('.lb-podium-card').count(),3);assert.match(await page.locator('tbody tr').first().innerText(),/#4/);
   assert.equal(await page.getByRole('navigation',{name:'Leaderboard pages'}).count(),0);
   await page.getByRole('button',{name:'Find my rank',exact:true}).click();assert.match(await page.locator(':focus').getAttribute('id'),/^lb-view-/);
   await page.evaluate(()=>scrollTo(0,0));await screenshot('leaderboard');
   for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await fit('leaderboard '+width);}
   await page.getByRole('button',{name:'Domain',exact:true}).click();await page.locator('.lb-assessment-domain').waitFor();assert.match(await page.locator('.lb-assessment-domain').innerText(),/Education/);
   assert.equal(await page.locator('#lb-domain option:checked').innerText(),'Education');
   await page.getByRole('searchbox',{name:'Search founders by name'}).fill('not-a-real-founder');await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('heading',{name:'No founders found'}).waitFor();
  }



 }
 assert.deepEqual(errors,[]);console.log(phase+' checks passed');
} finally {await browser.close();await server.close();}
