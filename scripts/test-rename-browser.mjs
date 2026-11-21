import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:https';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright-core';
import {CLOUDFLARE_SCOPES} from '../src/auth/cloudflare-oauth.mjs';
import {digest,PROTOCOL} from '../src/cloudflare/wire.mjs';
import {fixtureSecret,fixtureSession,fixtureTarget,localScreenshotWorker} from '../tests/fixtures/screenshot-worker.mjs';

const root=await mkdtemp(join(tmpdir(),'click2cloud-rename-'));
const extension=resolve(process.env.C2C_RENAME_BUILD??'dist/click2cloud');
const evidence=process.env.C2C_RENAME_EVIDENCE;
const essentials=process.env.C2C_EXPLORER_ESSENTIALS==='1';
const {BUILD_INFO}=await import(pathToFileURL(join(extension,'src/build-info.mjs')));
if(evidence)await mkdir(evidence,{recursive:true});
const {accountId,bucketName}=fixtureTarget;
const workerHost='rename-fixture.account.workers.dev';
const folder='Nested/',original='Original.png',taken='Taken.png',prefixScope=essentials?'':'Nested';
const png=await readFile(new URL('../tests/fixtures/images/picture.png',import.meta.url));
const remote=await localScreenshotWorker({prefixScope,codeDigest:BUILD_INFO.workerCodeDigest});
const storage=await remote.getR2Bucket('STORAGE');
await storage.put(folder+original,png,{httpMetadata:{contentType:'image/png'}});
const occupied=await storage.put(folder+taken,png,{httpMetadata:{contentType:'image/png'}});
if(essentials){
 await storage.put(folder+'Target/.redown','');
 for(const size of [1,4,100]){
  await Promise.all(Array.from({length:size},(_,index)=>storage.put('Marquee '+size+'/Item '+index+'.txt','x')));
 }
 for(let start=0;start<1200;start+=40){
  await Promise.all(Array.from({length:40},(_,offset)=>storage.put('Stress/File '+String(start+offset).padStart(4,'0')+'.txt','x')));
 }
}
const cert=join(root,'fixture.pem'),key=join(root,'fixture-key.pem');
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-subj','/CN=api.cloudflare.com',
 '-days','1','-keyout',key,'-out',cert],{stdio:'ignore'});
const calls=[];
const bucketPath='/client/v4/accounts/'+accountId+'/r2/buckets';
const apiToken='disposable-rename-browser-fixture';
const provider=createServer({key:await readFile(key),cert:await readFile(cert)},async(req,res)=>{
 const address=new URL(req.url,'https://'+req.headers.host);
 const json=(result,status=200)=>res.writeHead(status,{'content-type':'application/json'})
  .end(JSON.stringify({success:status===200,result,errors:status===200?[]:[{code:10000,message:'Fixture denied the request'}]}));
 try{
  if(address.hostname===workerHost){
   calls.push(address.pathname);
   const chunks=[];
   for await(const chunk of req)chunks.push(chunk);
   const reply=await remote.dispatchFetch(address.href,{method:req.method,headers:{
    authorization:req.headers.authorization,'content-type':'application/json'
   },body:Buffer.concat(chunks)});
   return res.writeHead(reply.status,{'content-type':'application/json'}).end(await reply.text());
  }
  if(req.headers.authorization!=='Bearer '+apiToken)return json(null,401);
  if(req.method!=='GET'){calls.push(req.method+' '+address.pathname);return json(null,403);}
  if(address.pathname===bucketPath)return json({buckets:[{name:bucketName}]});
  if(address.pathname===bucketPath+'/'+bucketName)return json({name:bucketName});
  if(address.pathname===bucketPath+'/'+bucketName+'/objects'){
   const prefix=address.searchParams.get('prefix')??'',delimiter=address.searchParams.get('delimiter')??undefined;
   const listed=await storage.list({prefix,delimiter,cursor:address.searchParams.get('cursor')??undefined});
   return json({objects:listed.objects.map(({key,size,etag,uploaded})=>({key,size,etag,uploaded:uploaded.toISOString()})),
    delimited:listed.delimitedPrefixes,truncated:listed.truncated,cursor:listed.cursor});
  }
  const objectPath=bucketPath+'/'+bucketName+'/objects/';
  if(address.pathname.startsWith(objectPath)){
   const object=await storage.get(decodeURIComponent(address.pathname.slice(objectPath.length)));
   if(object)return res.writeHead(200,{'content-type':'image/png','content-length':object.size,etag:object.httpEtag})
    .end(Buffer.from(await object.arrayBuffer()));
  }
  return json(null,404);
 }catch(error){res.writeHead(500).end();process.stderr.write(String(error)+'\n');}
});
await new Promise(resolve=>provider.listen(0,'127.0.0.1',resolve));

let context,page,appURL;
const row=name=>page.locator('#files [data-index]').filter({hasText:name});
const title=name=>page.getByRole('heading',{name,exact:true});
const inline=()=>page.getByRole('textbox',{name:'Image filename'});
const shot=async name=>{if(evidence&&page)await page.screenshot({path:join(evidence,name+'.png')});};
async function openShelf(name,{reusePage=false}={}){
 if(!reusePage)page=await context.newPage();
 page.setDefaultTimeout(6500);
 await page.goto(appURL);
 await page.getByRole('button',{name:'File Explorer',exact:true}).click();
 const target=row(name),directory=row('Nested');
 await target.or(directory).first().waitFor();
 if(await directory.isVisible())await directory.dblclick();
 await target.waitFor();
}
async function boot({seed=false}={}){
 const {port}=provider.address();
 context=await chromium.launchPersistentContext(join(root,'profile'),{
  executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,
  ignoreDefaultArgs:['--disable-extensions'],viewport:{width:essentials?1050:570,height:740},
  args:['--no-sandbox','--no-proxy-server','--ignore-certificate-errors','--enable-unsafe-extension-debugging',
   '--disable-extensions-except='+extension,'--load-extension='+extension,
   `--host-resolver-rules=MAP api.cloudflare.com 127.0.0.1:${port}, MAP ${workerHost} 127.0.0.1:${port}`]
 });
 let worker=context.serviceWorkers()[0];
 if(!worker){
  const cdp=await context.browser().newBrowserCDPSession();
  await cdp.send('Extensions.loadUnpacked',{path:extension});
  worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker',{timeout:6000});
 }
 appURL=new URL('app.html',worker.url()).href;
 if(!seed)return;
 const plan={...fixtureTarget,state:'ready',protocol:PROTOCOL,codeDigest:BUILD_INFO.workerCodeDigest,
  secret:fixtureSecret,url:'https://'+workerHost,prefixScope};
 await worker.evaluate(async({storageKey,plan,scopes,apiToken,sessionId})=>{
  await click2cloud.ready;
  await chrome.storage.local.set({
   [storageKey]:plan,click2cloudOAuth:{sessionId,accessToken:apiToken,expiresAt:Date.now()+3600000,scopes,
    scopeEvidence:'provider-returned',accounts:[{id:plan.accountId,name:'Disposable browser fixture'}]}
  });
 },{storageKey:'remoteTransport:'+await digest([accountId,bucketName]),plan,scopes:CLOUDFLARE_SCOPES,apiToken,sessionId:fixtureSession});
}
async function verify(from,to){
 assert.equal(await storage.head(folder+from),null,'Old key must be absent');
 assert.equal((await storage.head(folder+taken)).version,occupied.version,'Collision target must be unchanged');
 assert.deepEqual(Buffer.from(await (await storage.get(folder+to)).arrayBuffer()),png);
}
async function renameInline(name,input){
 await inline().fill(input);
 await inline().press('Enter');
 await inline().waitFor({state:'detached'});
 await title(name).waitFor();
}

async function explorerEssentials(){
 const settings=async()=>{
  await page.locator('#header-more').click();
  await page.getByRole('menuitem',{name:'Settings',exact:true}).click();
  await page.locator('#appearance').waitFor();
 };
 const explorer=()=>page.getByRole('button',{name:'File Explorer',exact:true}).click();
 const toast=message=>page.locator('.explorer-mini-toast').filter({hasText:message});
 const pane=()=>page.locator('#files');
 const splitter=()=>page.locator('#pane-splitter');
 async function layout(view){
  if(!await page.locator('#view-switch').isVisible())await page.locator('#toolbar-more').click();
  await page.locator('#view-switch').selectOption(view);
  await page.waitForFunction(view=>document.querySelector('#files')?.classList.contains(view),view);
  if(await page.locator('#toolbar-more').getAttribute('aria-expanded')==='true')await page.locator('#toolbar-more').click();
 }
 await settings();
 assert.deepEqual(await page.locator('#busy-cursor-style option').allTextContents(),
  ['System Default','Classic Hourglass','Spinning Ring','Arrow + Busy','REDOWN Pulse']);
 const fixed=await page.locator('.fixed-shortcut-rows kbd').allTextContents();
 for(const key of ['F2','Delete','Ctrl+C','Ctrl+X','Ctrl+V','F5','Backspace','Ctrl+Shift+N'])assert(fixed.includes(key));
 await page.locator('#busy-cursor-style').selectOption('ring');
 await page.reload();
 await settings();
 assert.equal(await page.locator('#busy-cursor-style').inputValue(),'ring');
 await explorer();
 if(await row('Nested').isVisible())await row('Nested').dblclick();
 await row(original).waitFor();
 await splitter().press('Home');
 await layout('list');
 const width=await page.evaluate(()=>{
  const pane=document.querySelector('#files');
  return {pane:pane.clientWidth,header:pane.querySelector('th').getBoundingClientRect().width};
 });
 assert(Math.abs(width.pane-width.header)<=2,'List Name must use the available width');
 await shot('list-full-width');
 await splitter().press('End');
 await page.waitForFunction(()=>document.querySelector('#pane-splitter').getAttribute('aria-valuenow')==='100');
 await splitter().press('Home');
 await layout('details');
 const nameGrip=page.getByRole('separator',{name:'Resize Name'});
 const initial=await nameGrip.locator('..').evaluate(el=>el.getBoundingClientRect().width);
 await nameGrip.press('ArrowRight');
 assert(await nameGrip.locator('..').evaluate(el=>el.getBoundingClientRect().width)>initial);
 const dateGrip=page.getByRole('separator',{name:'Resize Date Modified'}),date=await dateGrip.boundingBox();
 const initialDate=await dateGrip.locator('..').evaluate(el=>el.getBoundingClientRect().width);
 await page.mouse.move(date.x+date.width/2,date.y+date.height/2);
 await page.mouse.down();
 await page.mouse.move(date.x+date.width/2-24,date.y+date.height/2,{steps:6});
 await page.mouse.up();
 assert(await dateGrip.locator('..').evaluate(el=>el.getBoundingClientRect().width)<initialDate);
 for(const column of ['Type','Size'])assert.equal(await page.getByRole('separator',{name:'Resize '+column}).count(),1);
 await page.keyboard.press('Escape');

 // Chromium must paste an actual image into a separate receiving document.
 await row(original).click();
 await page.evaluate(()=>{
  const write=navigator.clipboard?.write?.bind(navigator.clipboard);
  if(write)navigator.clipboard.write=async items=>{
   try{return await write(items);}
   catch(error){window.clipboardFailure={name:error.name,message:error.message,focused:document.hasFocus()};throw error;}
  };
 });
 await row(original).press('Control+c');
 await page.waitForFunction(()=>/Copied!|clipboard unavailable/.test(document.querySelector('.explorer-mini-toast')?.textContent??''));
 const clipboardToast=await page.locator('.explorer-mini-toast').textContent();
 assert.equal(clipboardToast,'Copied! Cloud and image clipboard.',JSON.stringify(await page.evaluate(()=>window.clipboardFailure)));
 const receiver=await context.newPage();
 await receiver.setContent('<textarea aria-label="Receiving app"></textarea>');
 await receiver.evaluate(()=>{
  document.addEventListener('paste',async event=>{
   const image=[...event.clipboardData.files].find(file=>file.type==='image/png');
   if(image){
    const bitmap=await createImageBitmap(image);
    window.pasted={width:bitmap.width,height:bitmap.height};bitmap.close();
   }
  });
 });
 await receiver.getByRole('textbox',{name:'Receiving app'}).focus();
 await receiver.keyboard.press('Control+v');
 await receiver.waitForFunction(()=>window.pasted?.width>0&&window.pasted?.height>0);
 const pasted=await receiver.evaluate(()=>window.pasted);
 await receiver.close();
 await page.bringToFront();
 await row(taken).click({modifiers:['Control']});
 await row(taken).press('Control+c');
 await toast('Cloud copied. Select one image for the image clipboard.').waitFor();
 await row(original).click();
 await row(original).press('Control+c');
 await toast('Copied! Cloud and image clipboard.').waitFor();
 await page.close();
 await openShelf(original);
 await row('Target').dblclick();
 await pane().press('Control+v');
 await row(original).waitFor();
 assert.deepEqual(Buffer.from(await (await storage.get(folder+'Target/'+original)).arrayBuffer()),png);
 await row(original).press('Backspace');
 await row(taken).click();
 await row(taken).press('Control+x');
 assert(await storage.head(folder+taken));
 await row('Target').dblclick();
 await row(original).waitFor();
 await pane().focus();
 await page.keyboard.press('Control+v');
 await row(taken).waitFor();
 assert.equal(await storage.head(folder+taken),null);
 await row(taken).click();
 await row(taken).press('F5');
 await page.waitForFunction(()=>document.querySelector('#files').getAttribute('aria-busy')==='false');
 assert.equal(await row(taken).getAttribute('aria-selected'),'true');
 await row(taken).press('Delete');
 const deleteDialog=page.getByRole('dialog',{name:'Delete permanently?'});
 await deleteDialog.waitFor();
 await deleteDialog.getByRole('button',{name:'Cancel',exact:true}).click();
 assert(await storage.head(folder+'Target/'+taken));
 await row(taken).click({button:'right'});
 await page.getByRole('menuitem',{name:'Delete',exact:true}).click();
 await deleteDialog.getByRole('button',{name:'Delete',exact:true}).click();
 await row(taken).waitFor({state:'detached'});
 assert.equal(await storage.head(folder+'Target/'+taken),null);
 await settings();
 await page.getByLabel('Confirm before deleting cloud files').uncheck();
 await explorer();
 await row(original).click();
 await row(original).press('Delete');
 await row(original).waitFor({state:'detached'});
 assert(!await deleteDialog.isVisible());
 await pane().press('Control+Shift+n');
 await page.getByLabel('Folder name').fill('New folder via shortcut');
 await page.getByRole('button',{name:'New Folder',exact:true}).click();
 await toast('Creating folder…').waitFor();
 await page.mouse.move(750,600);
 const cursor=page.locator('.explorer-busy-cursor');
 await cursor.waitFor();
 const size=await cursor.boundingBox();
 assert(size.width<18&&size.height<18);
 await shot('busy-cursor-and-toast');
 await row('New folder via shortcut').waitFor();
 await cursor.waitFor({state:'detached'});
 assert(await storage.head(folder+'Target/New folder via shortcut/.redown'));
 await pane().press('Backspace');
 await row(original).waitFor();
 await pane().press('o');
 assert.equal(await row(original).getAttribute('aria-selected'),'true');
 await row(original).locator('[data-file-drag]').dragTo(row('Target'));
 await row(original).waitFor({state:'detached'});
 assert.equal(await storage.head(folder+original),null);
 assert(await storage.head(folder+'Target/'+original));

 await pane().press('Backspace');
 async function dragBox(x0,y0,x1,y1,modifier){
  if(modifier)await page.keyboard.down(modifier);
  await page.mouse.move(x0,y0);
  await page.mouse.down();
  await page.mouse.move(x1,y1,{steps:10});
  await page.locator('.explorer-marquee').waitFor();
  await page.mouse.up();
  if(modifier)await page.keyboard.up(modifier);
  await page.locator('.explorer-marquee').waitFor({state:'detached'});
 }
 await layout('list');
 for(const size of [1,4,100]){
  await page.locator('#files [data-file-drag][title="Marquee '+size+'"]').dblclick();
  await page.waitForFunction(size=>document.querySelector('#item-count').textContent.startsWith(size+' items'),size);
  const first=await pane().locator('[data-index]').first().boundingBox(),box=await pane().boundingBox();
  const from=size<10?first.y+size*40+12:first.y+5;
  const to=size<10?first.y+8:first.y+120;
  await dragBox(box.x+box.width-32,from,box.x+box.width-12,to);
  assert(await pane().locator('[data-index][aria-selected=true]').count()>0);
  await pane().press('Backspace');
 }
 await row('Stress').dblclick();
 await row('File 0000.txt').waitFor({timeout:20000});
 assert((await page.locator('#item-count').textContent()).startsWith('1000 items'));
 await page.getByRole('button',{name:'Load more',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#item-count').textContent.startsWith('1200 items'));
 for(const view of ['details','list','grid']){
  await layout(view);
  const mounted=await pane().locator('[data-index]').count();
  assert(mounted>0&&mounted<150,view+' remains virtualized for 1200 files');
  const box=await pane().boundingBox();
  const first=await pane().locator('[data-index]').first().boundingBox();
  const x=view==='grid'?first.x+first.width-2:box.x+box.width-24;
  const y=first.y+Math.min(120,first.height*2);
  await dragBox(x,first.y+5,x+20,y);
  assert(await pane().locator('[data-index][aria-selected=true]').count()>0,view+' marquee selects intersected entries');
  await dragBox(x,first.y+5,x+20,y,'Control');
  assert.equal(await pane().locator('[data-index][aria-selected=true]').count(),0);
  await dragBox(x,first.y+5,x+20,y,'Shift');
  const selection=await page.locator('#item-count').textContent();
  await page.mouse.move(x,first.y+5);
  await page.mouse.down();
  await page.mouse.move(x+18,box.y+box.height-5,{steps:7});
  await page.waitForFunction(()=>document.querySelector('#files').scrollTop>=40);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await page.locator('.explorer-marquee').waitFor({state:'detached'});
  assert.equal(await page.locator('#item-count').textContent(),selection);
  await pane().evaluate(el=>{el.scrollTop=0;});
  await row('File 0000.txt').waitFor();
 }
 await shot('virtualized-grid-selection');
 let headlineChecks=0;
 for(const [theme,style] of [['minimal'],['standard'],['frames'],['golden-age'],['oceania'],['nostalgia','kawaii'],
  ['nostalgia','dungeon-master'],['nostalgia','heroine']]){
  for(const color of ['dark','light']){
   await settings();
   await page.locator('#appearance').selectOption(theme);
   if(style)await page.locator('#nostalgia-style').selectOption(style);
   await page.locator('#setting-theme').selectOption(color);
   await page.getByRole('button',{name:'Remotes',exact:true}).click();
   for(const width of [280,360,570]){
    await page.setViewportSize({width,height:740});
    const headline=await page.locator('.remotes-headline').evaluate(el=>{
     const range=document.createRange();range.selectNodeContents(el);
     return {text:el.textContent,fits:range.getBoundingClientRect().right<=el.getBoundingClientRect().right+1};
    });
    assert.deepEqual(headline,{text:'From the Web to your Cloud.',fits:true});
    headlineChecks++;
   }
   await page.setViewportSize({width:360,height:740});
   if(theme==='golden-age'&&color==='dark')await shot('remotes-slogan');
   await page.getByRole('button',{name:'History',exact:true}).click();
   await page.getByRole('heading',{name:'The Rest is History',exact:true}).waitFor();
   assert.equal(await page.getByText(/History is kept forever|Saved files and attempted saves/).count(),0);
   if(theme==='nostalgia'&&style==='dungeon-master'&&color==='dark')await shot('history-hero');
  }
 }
 console.log(JSON.stringify({evidence:'Installed Chrome with local Worker and R2 emulation',build:BUILD_INFO.revision,
  state:'PASS',browser:context.browser().version(),os:process.platform,clipboardPasted:pasted,
  marqueeSizes:[1,4,100,1000,1200],views:['details','list','grid'],headlineChecks}));
}

try{
 await boot({seed:true});
 await openShelf(original);
 if(process.env.C2C_RENAME_REPRODUCE_BASELINE==='1'){
  await row(original).dblclick();
  await page.getByRole('img',{name:'File preview'}).waitFor();
  await page.getByRole('button',{name:'Immersive View',exact:true}).click();
  assert.equal(await title(original).evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  await shot('baseline-immersive-filename');
  await page.getByRole('button',{name:'Exit Immersive View'}).click();
  await title(original).dblclick();
  await inline().fill('Preview.png');
  await inline().press('Enter');
  const setupMessage='Rename needs Cloudflare setup. Review the selected destination in Remotes.';
  await page.getByText(setupMessage,{exact:true}).waitFor();
  await shot('baseline-preview-setup');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await row(original).click({button:'right'});
  await page.getByRole('menuitem',{name:'Rename',exact:true}).click();
  await page.getByRole('textbox',{name:'New name'}).fill('Explorer.png');
  await page.getByRole('button',{name:'Rename',exact:true}).click();
  await page.getByText(setupMessage,{exact:true}).waitFor();
  await shot('baseline-explorer-setup');
  assert.deepEqual(calls,[]);
  console.log(JSON.stringify({evidence:'Installed Chrome with local Worker and R2 emulation',build:BUILD_INFO.revision,
   state:'BASELINE_REPRODUCED',accountId,bucketName,prefixScope,protocol:PROTOCOL,workerCodeDigest:BUILD_INFO.workerCodeDigest,
   session:'CONNECTED with R2 read/write',setupMessage,workerRequests:calls.length}));
 }else if(essentials){
  await explorerEssentials();
 }else{
  await row(original).click({button:'right'});
  await page.getByRole('menuitem',{name:'Rename',exact:true}).click();
  await page.getByRole('textbox',{name:'New name'}).fill('Explorer');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await row('Explorer.png').waitFor();
  await verify(original,'Explorer.png');
  assert.equal(await row('Explorer.png').getAttribute('aria-selected'),'true');
  await row('Explorer.png').press('F2');
  await page.getByRole('textbox',{name:'New name'}).fill('Keyboard.png');
  await page.getByRole('textbox',{name:'New name'}).press('Enter');
  await row('Keyboard.png').waitFor();
  await verify('Explorer.png','Keyboard.png');
  const cdp=await context.newCDPSession(page),worker=context.serviceWorkers()[0];
  let stopped=false;
  worker.once('close',()=>{stopped=true;});
  cdp.on('ServiceWorker.workerVersionUpdated',({versions})=>{
   if(versions.some(version=>version.scriptURL===worker.url()&&version.runningStatus==='stopped'))stopped=true;
  });
  await cdp.send('ServiceWorker.enable');
  stopped=false;
  await cdp.send('ServiceWorker.stopAllWorkers');
  for(let attempt=0;attempt<40&&!stopped;attempt++)await delay(150);
  assert(stopped,'Chrome must stop the extension service worker before the next Rename');
  await row('Keyboard.png').dblclick();
  await page.getByRole('img',{name:'File preview'}).waitFor();
  const previewSrc=await page.getByRole('img',{name:'File preview'}).getAttribute('src');
  await title('Keyboard.png').dblclick();
  await renameInline('Preview.png','Preview');
  await verify('Keyboard.png','Preview.png');
  assert.equal(await page.getByRole('img',{name:'File preview'}).getAttribute('src'),previewSrc);
  await page.getByRole('button',{name:'Next image'}).click();
  await title(taken).waitFor();
  await page.getByRole('button',{name:'Previous image'}).click();
  await title('Preview.png').waitFor();
  await page.getByRole('button',{name:'Immersive View',exact:true}).click();
  await page.getByRole('img',{name:'File preview'}).click();
  const zoom=page.getByRole('slider',{name:'Zoom relative to Fit'});
  assert.equal(await zoom.inputValue(),'200');
  await title('Preview.png').click();
  await inline().fill('Unused.png');
  await inline().press('Escape');
  assert(await page.locator('dialog[data-immersive]').isVisible());
  assert.equal(await zoom.inputValue(),'200');
  await title('Preview.png').click();
  await shot('immersive-inline-rename');
  await renameInline('Immersive.png','Immersive.png');
  await verify('Preview.png','Immersive.png');
  await page.getByRole('button',{name:'Exit Immersive View'}).press('F2');
  await inline().fill(taken);
  await inline().press('Enter');
  await page.getByText('That name is already in use.',{exact:true}).waitFor();
  assert(await storage.head(folder+'Immersive.png'));
  assert.equal((await storage.head(folder+taken)).version,occupied.version);
  await renameInline('Retry.png','Retry.png');
  await verify('Immersive.png','Retry.png');
  await page.getByRole('button',{name:'Exit Immersive View'}).click();
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await row('Retry.png').waitFor();
  assert.equal(await row('Retry.png').getAttribute('aria-selected'),'true');
  await page.close();
  await openShelf('Retry.png');
  await context.close();
  await boot();
  await openShelf('Retry.png');
  await row('Retry.png').dblclick();
  await page.getByRole('img',{name:'File preview'}).waitFor();
  await title('Retry.png').press('F2');
  await renameInline('Reopened.png','Reopened.png');
  await verify('Retry.png','Reopened.png');
  await openShelf('Reopened.png',{reusePage:true});
  assert.equal(calls.filter(path=>path==='/files').length,7);
  assert(calls.every(path=>['/capabilities','/files','/operation'].includes(path)));
  console.log(JSON.stringify({evidence:'Installed Chrome with local Worker and R2 emulation',build:BUILD_INFO.revision,
   state:'PASS',browser:context.browser().version(),os:process.platform,renames:6,collisions:1,
   gestures:['Explorer menu and F2','preview double-click and F2','immersive click and F2'],
   mv3WorkerStopped:true,shelfReopen:true,browserRestart:true,pageReload:true}));
 }
}catch(error){
 await shot('rename-failure');
 throw error;
}finally{
 await context?.close();
 provider.closeAllConnections();
 await new Promise(resolve=>provider.close(resolve));
 await remote.dispose();
 await rm(root,{recursive:true,force:true});
}
