// Standalone fixture using the production styles and real native select controls.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright-core';
const root=process.cwd();
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
  const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript'};
  let bytes=await readFile(path);
  if(path.endsWith('app.html'))bytes=bytes.toString().replace(/<script\b[^>]*><\/script>/g,'');
  res.setHeader('Content-Type',mime[extname(path)]??'application/octet-stream');res.end(bytes);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true});
 const page=await browser.newPage({viewport:{width:380,height:760}});
 await page.goto('http://127.0.0.1:'+server.address().port+'/extension/app.html');
 await page.evaluate(async()=>{
  const {createAestheticHost}=await import('/src/aesthetic/host.mjs');
  window.host=createAestheticHost({root:document.documentElement});
  const form=document.createElement('form');
  form.id='select-fixture';form.innerHTML='<label>Speed <select name="speed"><option value="slow">Slow</option><option value="normal" selected>Normal</option><option value="fast">Fast</option><option disabled>Unavailable</option></select></label><select multiple aria-label="Multiple"><option>One</option><option>Two</option></select><select disabled aria-label="Disabled"><option>Disabled</option></select>';
  document.querySelector('#main').replaceChildren(form);
  window.changes=0;form.addEventListener('change',()=>window.changes++);
 });
 const select=page.locator('select[name=speed]');
 const skins=[...['minimal','standard','golden-age','oceania','frames','chrome'].map(id=>({id})),...['kawaii','dungeon-master','heroine'].map(style=>({id:'nostalgia',style})),...['onyx','platinum','gunmetal','obsidian','azure'].map(finish=>({id:'onyx',finish}))];
 for(const skin of skins)for(const mode of ['dark','light']){
  await page.evaluate(async({skin,mode})=>{document.documentElement.dataset.theme=mode;await window.host.apply({...skin,persist:false});},{skin,mode});
  for(const view of ['remotes','queue','history','explorer','settings','screenshot','downloads']){
   await page.evaluate(view=>document.querySelector('#shell').dataset.view=view,view);
   const metrics=await select.evaluate(el=>{const s=getComputedStyle(el);return {borders:[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],background:s.backgroundColor,radius:s.borderRadius,appearance:s.appearance};});
   assert.deepEqual(metrics.borders,['0px','0px','1px','0px'],JSON.stringify({skin,mode,view,metrics}));
   assert.equal(metrics.background,'rgba(0, 0, 0, 0)');assert.equal(metrics.radius,'0px');
   assert(['auto','base-select'].includes(metrics.appearance));
  }
 }
 await page.evaluate(()=>document.querySelector('#shell').dataset.view='remotes');
 await select.selectOption('fast');assert.equal(await select.inputValue(),'fast');
 assert.equal(await page.evaluate(()=>new FormData(document.querySelector('#select-fixture')).get('speed')),'fast');
 assert.equal(await page.evaluate(()=>window.changes),1);
 await select.focus();assert(await select.evaluate(el=>document.activeElement===el));
 assert(await page.locator('select[disabled]').isDisabled());
 assert(await page.locator('select[multiple]').evaluate(el=>el.multiple&&getComputedStyle(el).appearance!=='base-select'));
 if(await select.evaluate(el=>getComputedStyle(el).appearance==='base-select')){
  await select.click();await page.waitForFunction(()=>document.querySelector('select[name=speed]').matches(':open'));
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('select[name=speed]').matches(':open'));
 }
 console.log('PASS: shared dropdown styles, native selection, forms and focus across skins and views.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
