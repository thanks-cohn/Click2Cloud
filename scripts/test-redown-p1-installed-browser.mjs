// Real unpacked Chrome with a disposable, disconnected profile.
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {chromium} from 'playwright-core';

const id='ajppphdiamdobknpamcheohmdbdbeoal',extension=resolve('dist/click2cloud');
const out=resolve(process.env.C2C_P1_INSTALLED_EVIDENCE??'work/redown-p1-installed');
const profile=await mkdtemp(join(tmpdir(),'redown-p1-installed-'));
const report={proof:'INSTALLED_UNPACKED_CHROME_SHELF_TAB_DISCONNECTED',extensionId:id,views:[]};
await mkdir(out,{recursive:true});
let context;
try{
 context=await chromium.launchPersistentContext(profile,{
  headless:true,executablePath:process.env.C2C_CHROME_EXECUTABLE,viewport:{width:850,height:740},
  ignoreDefaultArgs:['--disable-extensions'],
  args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]
 });
 const worker=context.serviceWorkers().find(worker=>worker.url().startsWith(`chrome-extension://${id}/`))??
  await context.waitForEvent('serviceworker',{predicate:worker=>worker.url().startsWith(`chrome-extension://${id}/`),timeout:10000});
 const identity=await worker.evaluate(()=>({
  id:chrome.runtime.id,version:chrome.runtime.getManifest().version,name:chrome.runtime.getManifest().name
 }));
 assert.deepEqual(identity,{id,version:'0.3.23',name:'REDOWN'});
 report.browser=context.browser().version();
 const page=await context.newPage();
 page.setDefaultTimeout(8000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`chrome-extension://${id}/extension/app.html`);
 const settings=async()=>{
  await page.locator('#header-more').click();
  await page.getByRole('menuitem',{name:'Settings',exact:true}).click();
  await page.locator('#appearance').waitFor();
 };
 for(const [theme,style] of [
  ['minimal'],['standard'],['golden-age'],['oceania'],
  ['nostalgia','kawaii'],['nostalgia','dungeon-master'],['nostalgia','heroine']
 ]){
  await settings();
  await page.locator('#appearance').selectOption(theme);
  if(style)await page.locator('#nostalgia-style').selectOption(style);
  for(const mode of ['light','dark']){
   await page.locator('#setting-theme').selectOption(mode);
   await page.waitForFunction(({theme,style,mode})=>{
    const state=document.documentElement.dataset;
    return state.aesthetic===theme&&state.nostalgiaStyle===style&&state.theme===mode;
   },{theme,style,mode});
   const tag=`${style??theme}-${mode}`;
   await page.screenshot({path:join(out,tag+'-settings.png')});
   await page.getByRole('button',{name:'Remotes',exact:true}).click();
   await page.locator('#login').waitFor();
   await page.screenshot({path:join(out,tag+'-remotes.png')});
   await settings();
   report.views.push({theme,style,mode,result:'PASS'});
  }
  await page.getByRole('button',{name:'Remotes',exact:true}).click();
 }
 await page.reload();
 await page.waitForFunction(()=>document.documentElement.dataset.nostalgiaStyle==='heroine');
 assert.deepEqual(errors,[]);
 report.result='PASS';
}catch(error){
 report.result='FAIL';report.error=String(error.stack);process.exitCode=1;
}finally{
 await context?.close();
 await rm(profile,{recursive:true,force:true});
 await writeFile(join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
