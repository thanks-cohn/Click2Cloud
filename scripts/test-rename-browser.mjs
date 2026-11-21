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
const {BUILD_INFO}=await import(pathToFileURL(join(extension,'src/build-info.mjs')));
if(evidence)await mkdir(evidence,{recursive:true});
const {accountId,bucketName}=fixtureTarget;
const workerHost='rename-fixture.account.workers.dev';
const folder='Nested/',original='Original.png',taken='Taken.png',prefixScope='Nested';
const png=await readFile(new URL('../tests/fixtures/images/picture.png',import.meta.url));
const remote=await localScreenshotWorker({prefixScope,codeDigest:BUILD_INFO.workerCodeDigest});
const storage=await remote.getR2Bucket('STORAGE');
await storage.put(folder+original,png,{httpMetadata:{contentType:'image/png'}});
const occupied=await storage.put(folder+taken,png,{httpMetadata:{contentType:'image/png'}});
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
   const listed=await storage.list({prefix,delimiter});
   return json({objects:listed.objects.map(({key,size,etag,uploaded})=>({key,size,etag,uploaded:uploaded.toISOString()})),delimited:listed.delimitedPrefixes});
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
const shot=async name=>{if(evidence)await page.screenshot({path:join(evidence,name+'.png')});};
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
  ignoreDefaultArgs:['--disable-extensions'],viewport:{width:570,height:740},
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
  await title('Preview.png').click();
  await inline().fill('Unused.png');
  await inline().press('Escape');
  assert(await page.locator('dialog[data-immersive]').isVisible());
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
