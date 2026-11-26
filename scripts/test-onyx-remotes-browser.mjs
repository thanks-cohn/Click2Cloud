// Focused production CSS + real provider renderer fixture (no provider credentials).
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {chromium} from 'playwright-core';
const root=process.cwd(),out=resolve('work/onyx-remotes');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(root+'/')&&!path.startsWith(root+'\\')){res.writeHead(403).end();return;}
  const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.png':'image/png'};
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
  const {createBasicProviderCards}=await import('/extension/basic-provider-cards.mjs');
  const {createAestheticHost}=await import('/src/aesthetic/host.mjs');
  const host=createAestheticHost({root:document.documentElement});
  window.testHost=host;await host.apply({id:'onyx',persist:false});
  const calls=window.providerCalls=[];
  const runtime={sendMessage:async m=>{
    calls.push([m.op,m.input.provider]);
    const connected=m.input.provider==='dropbox'||m.op==='auth.connect';
    return {ok:true,value:m.op==='saves.pending'?null:m.op==='providers.goTo'?{opened:true}:{connected,ready:connected,authorized:connected}};
  }};
  const stack=createBasicProviderCards({runtime,document,pulseEnabled:()=>false});
  const slot=document.createElement('div');document.querySelector('.remotes-page').append(slot);stack.mount(slot);
  document.querySelectorAll('header button,#manage').forEach(b=>b.disabled=false);
  document.querySelector('header [data-view=remotes]').classList.add('active');
 });
 await page.locator('[data-provider=dropbox][data-onyx-connected]').waitFor();
 const google=page.locator('[data-provider=google]'),dropbox=page.locator('[data-provider=dropbox]');
 const box=locator=>locator.boundingBox();
 for(const width of [320,380,480,800]){
  await page.setViewportSize({width,height:760});await page.mouse.move(0,0);
  const geometry=await page.locator('.remote-provider').evaluateAll(cards=>cards.map(card=>{
   const title=card.querySelector('.remote-provider-heading').getBoundingClientRect(),button=card.querySelector(card.hasAttribute('data-onyx-connected')?'[data-go]':'[data-connect]').getBoundingClientRect(),rect=card.getBoundingClientRect();
   return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,overlap:title.right>button.left+1,verticalOverlap:title.top<button.bottom&&title.bottom>button.top,overflow:card.scrollWidth>card.clientWidth+1};
  }));
  assert(geometry.every((g,i)=>!g.overlap&&g.verticalOverlap&&!g.overflow&&g.left>=0&&g.right<=width&&(!i||g.top>=geometry[i-1].bottom)),JSON.stringify({width,geometry}));
  const allBoxes=()=>page.locator('.remote-provider').evaluateAll(cards=>cards.map(card=>{const r=card.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
  const atRest=await allBoxes();
  for(const card of [google,dropbox]){
   await card.hover({position:{x:20,y:20}});
   assert.deepEqual(await allBoxes(),atRest,'Hover must never resize or displace cards at '+width);
   const refresh=card.locator('[data-refresh]');
   await page.waitForFunction(el=>getComputedStyle(el).opacity==='1',await refresh.elementHandle());
   const icon=await refresh.boundingBox(),primary=await card.locator(card===google?'[data-connect]':'[data-go]').boundingBox();
   assert(icon.x+icon.width<=primary.x+1,'Refresh must be left of the primary edge');
   assert(Math.abs(icon.y+icon.height/2-primary.y-primary.height/2)<=1,'Refresh must be vertically centered');
   assert.equal(await refresh.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
   await refresh.hover();
   assert.deepEqual(await allBoxes(),atRest,'Refresh hover cannot move cards');
   await page.mouse.move(0,0);
   assert.deepEqual(await allBoxes(),atRest,'Leaving hover cannot move cards');
  }
  assert(await page.locator('#manage').isVisible());
  await page.screenshot({path:join(out,'provider-fixture-'+width+'.png')});
 }
 await page.setViewportSize({width:380,height:760});
 await page.mouse.move(0,0);
 const primary=google.locator('[data-connect]'),before=await box(primary);
 await primary.hover();
 const after=await box(primary);
 assert(Math.abs(before.x-after.x)<=2&&Math.abs(before.y-after.y)<=2,'Primary dock must remain stable on hover');
 await primary.click();
 await google.locator('[data-connect][data-authenticated]').waitFor();
 await google.locator('[data-go]').click();
 await google.locator('[data-refresh]').focus();
 await google.locator('[data-refresh]').press('Enter');
 const calls=await page.evaluate(()=>window.providerCalls);
 assert(calls.some(([op,p])=>op==='auth.connect'&&p==='google'));
 assert(calls.some(([op,p])=>op==='providers.goTo'&&p==='google'));
 assert(calls.some(([op,p])=>op==='auth.refresh'&&p==='google'));
 await page.mouse.move(0,0);
 const fills=[];
 for(const finish of ['onyx','platinum','gunmetal','obsidian','azure']){
  await page.evaluate(async id=>window.testHost.apply({id:'onyx',finish:id,persist:false}),finish);
  fills.push(await page.locator('#main').evaluate(el=>getComputedStyle(el).backgroundColor));
 }
 assert.equal(new Set(fills).size,5);
 await page.evaluate(async()=>window.testHost.apply({id:'oceania',persist:false}));
 assert.equal(await dropbox.locator('.onyx-provider-meta').isVisible(),false);
 console.log('PASS: actual provider renderer + Onyx CSS: geometry, primary dock, secondary actions, five finishes, Oceania scope. Full application screenshots still required.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
