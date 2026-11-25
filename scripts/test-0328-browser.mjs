// The packaged Shelf, browser layout and IndexedDB are real. Chrome extension
// endpoints and provider traffic are isolated fixtures for this run.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {extname,join,resolve,sep} from 'node:path';
import {chromium} from 'playwright-core';

const root = resolve('dist/click2cloud'), out = resolve(process.env.C2C_0328_EVIDENCE ?? 'work/0328/browser');
const baseline = process.env.C2C_BASELINE_BUILD && resolve(process.env.C2C_BASELINE_BUILD);
const types = {'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
const server = createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://fixture');
    if (url.pathname==='/projectile' || url.pathname==='/projectile-frame') {
      res.setHeader('Content-Type','text/html');
      res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; frame-src http:");
      return res.end('<!doctype html><title>Projectile fixture</title><p>Browser coordinates</p><script src="/extension/projectile.js"></script>');
    }
    const before = url.pathname.startsWith('/baseline/');
    const directory = before ? baseline : url.pathname.startsWith('/tests/') ? resolve('.') : root;
    if (!directory) return res.writeHead(404).end();
    const file = resolve(directory,'.'+(before?url.pathname.slice('/baseline'.length):url.pathname));
    if (!file.startsWith(directory+sep)) return res.writeHead(404).end();
    res.setHeader('Content-Type',types[extname(file)] ?? 'text/html');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const report = {result:'FAIL',proof:'PACKAGED_UI_IN_CHROMIUM_WITH_SYNTHETIC_CHROME_AND_PROVIDER_PORTS',checks:[],screenshots:[],errors:[]};
const pass = (name,detail={}) => report.checks.push({name,...detail});
let browser;
await mkdir(out,{recursive:true});

function installFixture(manifest) {
  const runtimeListeners = new Set(), storageListeners = new Set();
  const storage = area => ({
    async get(keys) {
      const values = JSON.parse(area.getItem('release0327-fixture') ?? '{}');
      return keys == null ? values : Object.fromEntries([keys].flat().map(key=>[key,values[key]]));
    },
    async set(patch) {
      const before = JSON.parse(area.getItem('release0327-fixture') ?? '{}');
      area.setItem('release0327-fixture',JSON.stringify({...before,...patch}));
      const changes = Object.fromEntries(Object.entries(patch).map(([key,newValue])=>[key,{oldValue:before[key],newValue}]));
      for (const callback of storageListeners) callback(changes,area===localStorage?'local':'session');
    },
  });
  const event = listeners => ({addListener:listener=>listeners.add(listener),removeListener:listener=>listeners.delete(listener)});
  const target = {provider:'cloudflare',connectionId:'cloudflare:fixture-account',accountId:'fixture-account',bucketName:'fixture-bucket',prefix:''};
  const project = {connection:'DISCONNECTED',ready:new Set(),photos:new Map(),r2Keys:new Map(),operations:[],active:0,peak:0,aborts:0,footerAcks:0};
  let basic;
  async function basicFixture() {
    if (basic) return basic;
    basic = Promise.all([import('/src/basic/lib/api.js'),import('/src/basic/lib/store.js'),import('/src/basic/providers/index.js')]).then(async ([{createApi},{openStore},{createAdapters}])=>{
      const store = await openStore(indexedDB,'release-0327-basic-fixtures');
      const auth = {authorization:async provider=>({identity:provider==='google'?['fixture-account']:['fixture-account','fixture-root'],
        accessToken:'fixture-read',isCurrent:()=>true,scopes:project.dropboxRead?['files.content.read']:[]}),
        reconnect:async(provider,identity)=>{
          if(provider!=='dropbox'||identity.join('/')!=='fixture-account/fixture-root')throw Error('Wrong preview identity');
          project.dropboxRead=true;return {provider,ready:true};
        }};
      const adapters = createAdapters({fetch:async (url,options)=>{
        const dropbox = url.startsWith('https://content.dropboxapi.com/');
        const id = dropbox?JSON.parse(options.headers['Dropbox-API-Arg']).path:
          /items\/([^/?]+)|files\/([^/?]+)/.exec(url)?.slice(1).find(Boolean);
        project.operations.push(['provider-read',id]);
        if (id==='expired-object') return new Response(null,{status:401});
        const bytes = project.photos.get(id);
        project.active++;
        project.peak = Math.max(project.peak,project.active);
        try {
          if (id?.startsWith('slow-')) await new Promise((resolve,reject)=>{
            const timer = setTimeout(resolve,2500);
            options.signal.addEventListener('abort',()=>{clearTimeout(timer);project.aborts++;reject(options.signal.reason);},{once:true});
          });
          return bytes ? new Response(bytes,{headers:dropbox?{'Dropbox-API-Result':JSON.stringify({id,size:bytes.length})}:undefined}) : new Response(null,{status:404});
        } finally { project.active--; }
      }});
      return {store,api:createApi({auth,chrome,durable:async()=>({store}),previewAdapters:adapters})};
    });
    return basic;
  }
  const success = data => ({state:'completed',version:'3+1.1',data});
  const runtime = {
    id:'fixture',getManifest:()=>manifest,getURL:path=>location.origin+'/'+path,
    onMessage:event(runtimeListeners),
    connect({name}){
      if(name!=='redown-local-upload')throw Error('Unknown fixture port');
      const listeners=new Set(),disconnect=new Set();
      let cancelled=false;
      const send=value=>{for(const listener of listeners)listener(value);};
      return {onMessage:event(listeners),onDisconnect:event(disconnect),
        disconnect(){for(const listener of disconnect)listener();},
        postMessage(message){
          if(message.ping)return;
          if(message.cancel){cancelled=true;return;}
          if(message.check){
            project.operations.push(['upload-check',message.source]);
            queueMicrotask(()=>send({state:project.uploadWritable?'completed':'blocked'}));
            return;
          }
          void (async()=>{
            const {takeLocalUpload}=await import('/src/chrome/local-upload-files.mjs');
            const file=await takeLocalUpload(message.ticket);
            const key=message.source.prefix+file.name;
            project.operations.push(['upload-file',message.source,file.name,await file.text()]);
            send({progress:{phase:'verifying'}});
            if(project.uploadWait)await new Promise(resolve=>setTimeout(resolve,300));
            if(cancelled){send({state:'cancelled',error:'Upload cancelled.'});return;}
            productFixture.r2Objects.set(message.source.bucketName+':'+key,
              {bucketName:message.source.bucketName,key,size:file.size,displayName:file.name,folder:false});
            send({state:'completed'});
          })().catch(error=>send({state:'failed',error:error.message}));
        }
      };
    },
    async sendMessage(message) {
      if (message.channel==='redown-basic-v1') {
        const {op,input} = message;
        project.operations.push([op,input.provider ?? input.id]);
        if (op.startsWith('history.')||op==='auth.reconnect'&&input.previewId) {
          const {api} = await basicFixture();
          return api.message(message,{id:'fixture',url:runtime.getURL('extension/app.html'),documentId:'fixture-shelf'});
        }
        const provider = input.provider;
        if (op==='saves.pending') return {ok:true,value:null};
        if (op==='providers.goTo') return {ok:true,value:{opened:true}};
        if (op.startsWith('auth.')) {
          await new Promise(resolve=>setTimeout(resolve,130));
          if (project.cardFailure) return {ok:false,error:{code:'AUTH_NETWORK',message:'Provider authorization is temporarily unavailable.',nextAction:'Reconnect the original account to check access again.'}};
          project.ready.add(provider);
        }
        const ready = project.ready.has(provider), longInfo = project.longInfo;
        return {ok:true,value:{provider,ready,connected:ready,reason:ready?'READY':'AUTH_REQUIRED',...(longInfo?{message:longInfo}:{}),...(ready?{}:{nextAction:'Sign in to authorize saves.'})}};
      }
      if (message.channel==='queue-history-scan') return {ok:true,records:[],malformed:0,next:null};
      if (message.channel==='queue-control') {
        const {createHistoryStore}=await import('/src/queue/store.mjs');
        const store=createHistoryStore();
        try{
          if(message.action==='dismiss')await store.acknowledge(message.recordId);
          if(message.action==='clear')await store.clearJobs();
          project.operations.push(['queue-control',message.action,message.recordId]);
          return {ok:true,data:{state:'cancelling'}};
        }finally{await store.close();}
      }
      if (message.channel==='screenshot'){
        if(message.method==='history-output'){
          const key=project.r2Keys.get(message.params.operationId);
          return {state:'completed',data:{target,object:{key,size:project.photos.get(key)?.length,etag:'fixture-r2-etag'}}};
        }
        if(message.method==='history-public-urls'){
          project.operations.push(['history-public-urls',message.params.operationId]);
          return {state:'completed',data:{domainCheckComplete:true,managedPublicAccess:'disabled',file:{urls:[]}}};
        }
        return {state:'completed',data:{rules:[],revision:0,defaultHandled:true}};
      }
      if (message.channel!=='engine') return null;
      const {method,params} = message;
      if (method==='loginStatus') return success({state:project.connection,identityVerified:project.reconnect,
        accounts:project.connection==='CONNECTED'?[{id:target.accountId,name:'Fixture account'}]:[]});
      if (method==='enterExplorer'&&project.forceReconnect) return success({state:'RECONNECT_REQUIRED'});
      if(method==='commitConfigChange'&&params.changes.every(change=>change.type==='setProviderMenuVisibility')){
        const result=await (await import('/tests/product-browser-host.mjs')).invoke({version:message.version,method,params});
        if(result.data?.configuration){project.footerAcks++;return success({...result.data,native:{state:'completed'},backup:{state:'BLOCKED'}});}
        return result;
      }
      if (method==='openRemoteResult') return success({target,highlightKey:project.r2Keys.get(params.operationId)??'cloudflare.png'});
      if (method==='fileAction'&&params.action==='rename') {
        project.operations.push(['rename',params.entry.key,params.name]);
        if(project.renameFail)return {state:'blocked',code:'FILE_CONFLICT'};
        project.photos.set(params.name,project.photos.get(params.entry.key));
        project.photos.delete(params.entry.key);
        return success({data:{code:'FILE_ACTION_VERIFIED',receipt:{key:params.name,etag:'fixture-r2-etag',
          version:'fixture-renamed',size:project.photos.get(params.name).length}}});
      }
      if (method==='inspectShelfAttention'&&project.attention)return success(project.attention);
      if (method==='checkCloudflareR2'&&project.attention)
        return success({state:'SETUP_APPROVAL_REQUIRED',code:'SETUP_APPROVAL_REQUIRED',target});
      if (method==='inspectCloudflare'&&project.attention)
        return success({status:{state:'SETUP_APPROVAL_REQUIRED',target},onboarding:{setupAuthorized:false}});
      if (method==='recoverCloudflareDestination'){
        project.operations.push(['approve-cloudflare',params.authorizeSetup]);
        return success({state:'blocked',code:'WORKER_SETUP_REQUIRED',target});
      }
      if (method==='readFileChunk') {
        const {offset,length} = params, bytes = project.photos.get(params.key);
        project.operations.push(['readFileChunk',params.key]);
        if(params.key==='gallery-0329-2.png')await project.r2Gate;
        if(!bytes)return {state:'failed',code:'HTTP_404'};
        return success({state:'completed',data:{offset,total:bytes.length,etag:'fixture-r2-etag',
          done:offset+length>=bytes.length,bytes:Array.from(bytes.slice(offset,offset+length))}});
      }
      return (await import('/tests/product-browser-host.mjs')).invoke({version:message.version,method,params});
    }
  };
  Object.defineProperty(globalThis,'chrome',{value:{runtime,storage:{local:storage(localStorage),session:storage(sessionStorage),onChanged:event(storageListeners)},
    windows:{getCurrent:async()=>({id:1})},alarms:{create:async()=>{},clear:async()=>true},
    commands:{getAll:async()=>manifest.commands?Object.keys(manifest.commands).map((name,index)=>({name,shortcut:['Alt+Shift+H','Alt+Shift+F','Alt+Q','Ctrl+Shift+Y'][index]})):[]}}});
  window.releaseFixture = Object.assign(project,{target,basicFixture,event(message){
    for (const callback of runtimeListeners) callback(message,{id:'fixture'});
  }});
}

try {
  const manifest = JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
  assert.equal(manifest.version,JSON.parse(await readFile('package.json','utf8')).version);
  browser = await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true});
  report.chromium = browser.version();
  const context = await browser.newContext({viewport:{width:920,height:850},acceptDownloads:true});
  const page = await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  page.setDefaultTimeout(8000);
  await page.addInitScript(installFixture,manifest);
  const app = url => page.goto(`${origin}${url}/extension/app.html?fixturePerformance=1`);
  const shot = async name => {await page.screenshot({path:join(out,name+'.png')});report.screenshots.push(name+'.png');};
  const btn = name => page.getByRole('button',{name,exact:true});
  const cloudflare = page.locator('.remote-cloudflare');
  const google = page.locator('.remote-provider').filter({has:page.getByRole('heading',{name:'Google Drive',exact:true})});
  const fullWidth = async name => {
    await page.waitForFunction(text=>{
      const container = document.querySelector('.remote-cloudflare #connection');
      const control = [...container?.querySelectorAll('button') ?? []].find(button=>button.textContent===text);
      return control && control.offsetWidth>0 && Math.abs(control.offsetWidth-container.offsetWidth)<=1;
    },name);
  };
  if (baseline) {
    await app('/baseline');
    await btn('Log in').waitFor();
    await shot('baseline-remotes-920');
  }
  await app('');
  await fullWidth('Connect to Cloudflare');
  assert.equal(await page.getByText('Not connected',{exact:true}).count(),0);
  assert.equal(await page.getByText(/Connection details/i).count(),0);
  assert.equal(await btn('Save results').count(),0);
  assert(!(await btn('Review Cloudflare setup').isVisible()));
  await page.evaluate(async()=>{
    const {createAestheticHost}=await import('/src/aesthetic/host.mjs');
    await createAestheticHost({root:document.documentElement,storage:chrome.storage.local}).apply({id:'standard'});
  });
  await page.reload();await fullWidth('Connect to Cloudflare');
  assert(await btn('Review Cloudflare setup').isVisible());
  await btn('Review Cloudflare setup').click();
  await btn('Back to Remotes').click();
  await page.evaluate(async()=>{
    const {createAestheticHost}=await import('/src/aesthetic/host.mjs');
    await createAestheticHost({root:document.documentElement,storage:chrome.storage.local}).apply({id:'minimal'});
  });
  await page.reload();await fullWidth('Connect to Cloudflare');
  assert.equal(await page.locator('#cloudflare-setup').count(),0);
  assert.equal(await cloudflare.getByText(/Cloudflare may charge/).count(),0);
  assert.equal(await page.locator('#selected-save-setup').count(),0);
  await page.evaluate(()=>{releaseFixture.reconnect=true;releaseFixture.event({channel:'connection-changed'});});
  await fullWidth('Reconnect');
  await page.evaluate(()=>{releaseFixture.connection='CONNECTED';releaseFixture.event({channel:'connection-changed'});});
  await fullWidth('Connected');
  assert(await cloudflare.getByRole('button',{name:'Sign out',exact:true}).isVisible());
  await shot('remotes-920');
  const cardBounds = async () => {
    const geometry = await google.evaluate(card=>{
      const box = selector=>card.querySelector(selector).getBoundingClientRect().toJSON();
      return {card:card.getBoundingClientRect().toJSON(),connect:box('[data-connect]'),go:box('[data-go]'),refresh:box('[data-refresh]'),
        heading:box('h2'),status:box('[data-activity]')};
    });
    assert((!geometry.status.width||geometry.heading.right<=geometry.status.left) && geometry.connect.right<geometry.refresh.left && geometry.refresh.right<geometry.go.left);
    assert.equal(geometry.refresh.width,geometry.refresh.height);
    assert(Math.abs(geometry.connect.y-geometry.refresh.y)<1);
    return [geometry.card.height,geometry.refresh.x,geometry.refresh.y-geometry.card.y,geometry.connect.x,geometry.connect.y-geometry.card.y].map(Math.round);
  };
  await page.setViewportSize({width:320,height:850});
  const idle = await cardBounds();
  await page.mouse.move(3,3);
  const refresh=google.getByRole('button',{name:'Refresh Google Drive',exact:true});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-refresh]')).opacity==='0');
  await refresh.focus();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-refresh]')).opacity==='1');
  assert.deepEqual(await cardBounds(),idle);
  await google.getByRole('button',{name:'Connect',exact:true}).click();
  await google.getByText('Success!',{exact:true}).waitFor();
  assert.equal(await google.locator('[data-activity]').evaluate(el=>el.getAnimations()[0]?.effect.getTiming().iterations),2);
  assert.equal((await cardBounds())[0],idle[0],'sign-in should keep the compact card height');
  assert(await google.getByRole('button',{name:'Connected',exact:true}).isVisible());
  await shot('provider-success-320');
  await google.getByText('Success!',{exact:true}).waitFor({state:'hidden'});
  await page.evaluate(()=>{releaseFixture.cardFailure=true;});
  await refresh.click();
  await google.getByText('Needs attention',{exact:true}).waitFor();
  assert.equal(await google.getByText('Connection details',{exact:true}).count(),0);
  await google.getByText(/temporarily unavailable/).waitFor();
  assert.equal(await google.locator('[data-success]').count(),0);
  await page.evaluate(()=>{releaseFixture.cardFailure=false;});
  await page.evaluate(()=>{
    releaseFixture.attention={provider:'cloudflare',target:releaseFixture.target,code:'SETUP_APPROVAL_REQUIRED'};
    releaseFixture.event({channel:'shelf-attention'});
  });
  await btn('Review save setup').click();
  await page.getByText(/Cloudflare may charge for Worker/).waitFor();
  page.once('dialog',dialog=>dialog.dismiss());
  await btn('Authorize selected destination').click();
  assert(!await page.evaluate(()=>releaseFixture.operations.some(([op])=>op==='approve-cloudflare')));
  page.once('dialog',dialog=>dialog.accept());
  await btn('Authorize selected destination').click();
  await page.waitForFunction(()=>releaseFixture.operations.some(([op,approved])=>op==='approve-cloudflare'&&approved));
  assert.equal(await page.locator('#selected-save-setup').count(),0);
  await page.evaluate(()=>{releaseFixture.attention=null;});
  await page.reload();
  pass('Cloudflare full-width actions and stable Basic cards through sign-in, refresh, success and failure');
  await page.evaluate(()=>{releaseFixture.forceReconnect=true;});
  await page.getByRole('button',{name:'File Explorer',exact:true}).click();
  const footer=page.locator('#footer-notice');
  const dismissFooter=footer.getByRole('button',{name:'Dismiss footer notification'});
  await footer.getByText('Reconnect to browse. Saved locations are preserved.',{exact:true}).waitFor();
  await dismissFooter.press('Enter');
  assert(await footer.isHidden());
  await btn('Remotes').click();
  await page.getByRole('button',{name:'File Explorer',exact:true}).click();
  await page.locator('#shell[data-view=explorer] #files').waitFor({state:'attached'});
  assert(await footer.isHidden());
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await footer.getByText('Reconnect to browse. Saved locations are preserved.',{exact:true}).waitFor();
  await btn('Remotes').click();
  assert(await footer.isHidden());
  assert.equal(await footer.textContent(),'×');
  await page.evaluate(()=>{releaseFixture.forceReconnect=false;});
  pass('Reconnect footer dismisses and stays scoped to the Files browsing attempt');
  await page.evaluate(()=>{releaseFixture.connection='CONNECTED';releaseFixture.event({channel:'connection-changed'});});
  await fullWidth('Connected');
  await btn('Connected · Open File Explorer').click();
  await page.locator('#files').getByText('projects',{exact:true}).dblclick();
  await page.waitForFunction(()=>document.querySelector('#location').value.includes('projects'));
  const moreActions=page.getByRole('button',{name:'More Explorer actions'});
  const upload=page.getByRole('button',{name:'Upload',exact:true});
  await moreActions.click();
  assert(await upload.isDisabled());
  assert.equal(await page.locator('#toolbar-overflow').evaluate(el=>el.lastElementChild.id),'explorer-upload');
  await moreActions.click();
  await page.evaluate(()=>{releaseFixture.uploadWritable=true;});
  await moreActions.click();
  const [picker]=await Promise.all([page.waitForEvent('filechooser'),upload.click()]);
  assert(picker.isMultiple());
  assert.equal(await moreActions.getAttribute('aria-expanded'),'false');
  await picker.setFiles([
    {name:'notes-75.txt',mimeType:'text/plain',buffer:Buffer.from('first')},
    {name:'notes-76.txt',mimeType:'text/plain',buffer:Buffer.from('second')}
  ]);
  await page.getByText('2 files uploaded.',{exact:true}).waitFor();
  await page.locator('#files').getByText('notes-76.txt',{exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>releaseFixture.operations.filter(([op])=>op==='upload-file').map(([,target,name,text])=>
    [target.bucketName,target.prefix,name,text])),[
    ['fixture-bucket','projects/','notes-75.txt','first'],['fixture-bucket','projects/','notes-76.txt','second']
  ]);
  await page.evaluate(()=>{releaseFixture.uploadWait=true;});
  await moreActions.click();
  const [cancelledPicker]=await Promise.all([page.waitForEvent('filechooser'),upload.click()]);
  await cancelledPicker.setFiles({name:'cancelled.txt',mimeType:'text/plain',buffer:Buffer.from('cancel me')});
  await page.getByText(/Verifying 1 of 1/).waitFor();
  await btn('Cancel upload').click();
  await page.getByText('Upload cancelled.',{exact:true}).waitFor();
  assert.equal(await page.locator('#files').getByText('cancelled.txt',{exact:true}).count(),0);
  await btn('Remotes').click();
  pass('Cloudflare toolbar Upload is last, checks write access, opens a multi-file picker, cancels, and refreshes the exact folder');

  const collection = ['explorer','remotes','queue','history'];
  const header = async expected => {
    if (expected) await page.waitForFunction(ids=>[...document.querySelectorAll('header nav>[data-view]:not([hidden])')]
      .map(button=>button.dataset.view).join()===ids.join(),expected);
    const current = await page.evaluate(()=>{
      const rect = el => {const r=el.getBoundingClientRect();return {left:r.left,right:r.right,center:r.y+r.height/2};};
      const tabs = [...document.querySelectorAll('header nav>[data-view]:not([hidden])')];
      return {ids:tabs.map(el=>el.dataset.view),bounds:[document.querySelector('.brand-lockup'),...tabs,document.querySelector('#header-more'),document.querySelector('#theme')].map(rect),
        width:innerWidth,scroll:document.querySelector('header').scrollWidth};
    });
    if (expected) assert.deepEqual(current.ids,expected);
    const {bounds:boxes,width,scroll} = current;
    assert(scroll<=width+1);
    assert(width-boxes.at(-1).right<20);
    assert(boxes.at(-1).left-boxes.at(-2).right<=6);
    for (let i=1;i<boxes.length;i++) {
      assert(boxes[i].left>=boxes[i-1].right-.5,JSON.stringify(current));
      assert(Math.abs(boxes[i].center-boxes[0].center)<1);
      if (i>1&&i<=current.ids.length) assert(boxes[i].left-boxes[i-1].right<=6.1);
    }
    if(width>=900 && current.ids.length) {
      assert(boxes[1].left-boxes[0].right<16);
      assert(boxes.at(-2).left-boxes[current.ids.length].right>width/3);
    }
    return current.ids;
  };
  const storeNav = placements=>page.evaluate(p=>chrome.storage.local.set({shelfNavigationPlacementV1:p}),placements);
  await page.setViewportSize({width:920,height:850});
  for (let n=1;n<=4;n++) {
    await storeNav(Object.fromEntries(collection.map((id,index)=>[id,index<n?'main':'more'])));
    await header(collection.slice(0,n));
  }
  const ordered = ['screenshot','history','remotes','explorer'];
  await storeNav(Object.fromEntries([...ordered,'queue','settings'].map(id=>[id,'main'])));
  await header(ordered);
  await page.setViewportSize({width:250,height:850});
  await page.waitForFunction(()=>document.querySelectorAll('header nav>[data-view]').length<4);
  const narrow = await header();
  assert.deepEqual(narrow,ordered.slice(0,narrow.length));
  await btn('More').click();
  assert(await page.getByRole('menuitem',{name:'Settings',exact:true}).isVisible());
  await page.getByRole('menuitem',{name:'Settings',exact:true}).click();
  const settings = page.locator('.history-v2-settings');
  await settings.waitFor();
  const now=Date.now();
  await page.clock.install({time:now});
  await page.clock.pauseAt(now+100);
  const visibility=page.getByRole('checkbox',{name:'Show Google Drive in Chrome right-click menu'});
  await visibility.evaluate(el=>{if(el.checked)el.click();});
  await footer.getByText('Saved · Chrome menu acknowledged',{exact:true}).waitFor();
  await page.clock.fastForward(6000);
  await dismissFooter.dispatchEvent('pointerenter');
  assert(await footer.isVisible());
  await visibility.evaluate(el=>{if(!el.checked)el.click();});
  await page.waitForFunction(()=>releaseFixture.footerAcks===2);
  await footer.getByText('Saved · Chrome menu acknowledged',{exact:true}).waitFor();
  await page.clock.fastForward(4001);
  assert(await footer.isVisible());
  await dismissFooter.evaluate(el=>el.click());
  assert(await footer.isHidden());
  await visibility.evaluate(el=>{if(el.checked)el.click();});
  await footer.getByText('Saved · Chrome menu acknowledged',{exact:true}).waitFor();
  await page.clock.fastForward(10001);
  assert(await footer.isHidden());
  assert.equal(await page.locator('#footer-notice-text').textContent(),'');
  await visibility.evaluate(el=>{if(!el.checked)el.click();});
  await footer.waitFor();
  await page.clock.resume();
  await page.reload();
  await page.locator('#login').waitFor();
  assert(await footer.isHidden());
  await btn('More').click();
  await page.getByRole('menuitem',{name:'Settings',exact:true}).click();
  await settings.waitFor();
  pass('Saved acknowledgments expire, handle consecutive saves and hover, and stay dismissed after reopening');
  assert.deepEqual(await page.locator('[data-favorite]').evaluateAll(els=>els.map(el=>el.parentElement.textContent.trim())),
    ['Google Drive','OneDrive','Dropbox','Cloudflare R2']);
  const driveFavorite=page.locator('[data-favorite="google-drive"]');
  await driveFavorite.check();
  await page.waitForFunction(async()=>window.productFixture&&(await productFixture.current.read()).product.favorites.includes('provider:google-drive'));
  const shortcuts=page.locator('section.card').filter({has:page.getByRole('heading',{name:'Keyboard Shortcuts',exact:true})});
  await shortcuts.waitFor();
  assert.equal(await page.getByRole('button',{name:'Open Chrome shortcut settings',exact:true}).count(),1);
  assert(await shortcuts.getByLabel('Divider Cycle',{exact:true}).isVisible());
  assert(await shortcuts.getByText('Built-in shortcuts',{exact:true}).isVisible());
  assert(await shortcuts.getByText('F2',{exact:true}).isHidden());
  assert.equal(await page.locator('#placement-settings option[value=main]').isDisabled(),true);
  await page.getByRole('button',{name:'Move earlier History',exact:true}).click();
  await page.setViewportSize({width:920,height:850});
  await header(['history','screenshot','remotes','explorer']);
  await page.reload();
  await header(['history','screenshot','remotes','explorer']);
  await storeNav({explorer:'main',remotes:'main',queue:'main',history:'more',screenshot:'more',settings:'main'});
  await header(['explorer','remotes','queue','settings']);
  pass('One through four left-packed tabs, deterministic overflow and keyboard-accessible ordering persist');

  await btn('Settings').click();
  const getUrl=page.getByLabel('Show Get URL in right-click menu');
  const previews=page.getByLabel('Cloudflare image preview auto-expansion');
  const basicPreviews=page.getByLabel('Basic image auto-expansion');
  assert(await getUrl.isChecked());
  assert.equal(await previews.inputValue(),'all');
  await getUrl.uncheck();
  await basicPreviews.selectOption('first');
  await previews.selectOption('closed');
  await page.waitForFunction(async()=>{
    const {explorerExportOptions,queueHistoryViewV1}=await chrome.storage.local.get(['explorerExportOptions','queueHistoryViewV1']);
    return explorerExportOptions?.urls===false&&queueHistoryViewV1?.previews==='closed';
  });
  await page.reload();
  await page.locator('#theme:enabled').waitFor();
  await btn('Settings').click();
  await page.waitForFunction(()=>document.querySelector('[data-previews]')?.value==='closed');
  assert(!(await getUrl.isChecked()));
  assert.equal(await previews.inputValue(),'closed');
  assert.equal(await basicPreviews.inputValue(),'first');
  await page.locator('[data-reset-exports]').click();
  await btn('Restore image preview default').click();
  await page.waitForFunction(()=>document.querySelector('[data-previews]')?.value==='all');
  await basicPreviews.selectOption('all');
  await page.waitForFunction(async()=>{
    const {explorerExportOptions,queueHistoryViewV1}=await chrome.storage.local.get(['explorerExportOptions','queueHistoryViewV1']);
    return explorerExportOptions?.urls===true&&queueHistoryViewV1?.previews==='all'&&queueHistoryViewV1?.basicPreviews==='all';
  });
  pass('Get URL and independent History expansion defaults, explicit choices, restart, and reset');
  const feedback = page.locator('.visual-feedback-settings');
  await feedback.waitFor();
  assert.equal(await feedback.getByLabel('Average speed').inputValue(),'normal');
  assert.equal(await feedback.getByLabel('Colors').inputValue(),'random');
  await feedback.getByLabel('Average speed').selectOption('fast');
  await feedback.getByLabel('Colors').selectOption('theme');
  await feedback.getByLabel('Provider card success pulse').uncheck();
  await feedback.getByLabel('Toolbar transmission').uncheck();
  assert.equal(await feedback.getByLabel('Show while Shelf is open').inputValue(),'true');
  await feedback.getByLabel('Position',{exact:true}).selectOption('center');
  await feedback.getByLabel('Size',{exact:true}).selectOption('small');
  await feedback.getByLabel('Dismiss on hover').selectOption('false');
  await feedback.getByLabel('Show success notifications').selectOption('false');
  assert(await feedback.getByLabel('Show while Shelf is open').isDisabled());
  await page.locator('#aesthetic-palette input[value=amethyst]').check();
  await page.waitForFunction(async()=>(await chrome.storage.local.get('aestheticFeedbackAccentV1')).aestheticFeedbackAccentV1==='#c4a1ff');
  await page.locator('#setting-theme').selectOption('light');
  await page.waitForFunction(async()=>(await chrome.storage.local.get('aestheticFeedbackAccentV1')).aestheticFeedbackAccentV1==='#7542ad');
  await page.reload();await btn('Settings').click();await feedback.waitFor();
  assert.equal(await feedback.getByLabel('Average speed').inputValue(),'fast');
  assert.equal(await feedback.getByLabel('Colors').inputValue(),'theme');
  assert(await feedback.getByLabel('Energy projectile',{exact:true}).isChecked());
  assert(await feedback.getByLabel('Rapid-click escalation').isChecked());
  assert(!(await feedback.getByLabel('Provider card success pulse').isChecked()));
  assert(!(await feedback.getByLabel('Toolbar transmission').isChecked()));
  assert.equal(await feedback.getByLabel('Show success notifications').inputValue(),'false');
  assert.equal(await feedback.getByLabel('Position',{exact:true}).inputValue(),'center');
  assert.equal(await feedback.getByLabel('Size',{exact:true}).inputValue(),'small');
  assert.equal(await feedback.getByLabel('Dismiss on hover').inputValue(),'false');
  pass('Independent visual feedback settings survive reload and track the active palette and color mode');

  const seed = await page.evaluate(async()=>{
    const {createHistoryStore} = await import('/src/queue/store.mjs');
    const {basicReceipt,currentReceipt} = await import('/src/queue/receipts.mjs');
    const {encodePreview} = await import('/src/basic/lib/preview.mjs');
    const rgba = (w,h) => {
      const canvas = Object.assign(document.createElement('canvas'),{width:w,height:h});
      const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(w,h);
      let seed = 5499;
      for(let i=0;i<pixels.data.length;i+=4) {
        seed ^= seed << 13;seed ^= seed >>> 17;seed ^= seed << 5;
        pixels.data.set([seed&255,(seed>>>8)&255,(seed>>>16)&255,255],i);
      }
      ctx.putImageData(pixels,0,0);
      return new Promise(resolve=>canvas.toBlob(async blob=>resolve(new Uint8Array(await blob.arrayBuffer()))));
    };
    const small = await rgba(42,31), large = await rgba(480,480), current = Date.now();
    const qa = releaseFixture, history = createHistoryStore(), {store} = await qa.basicFixture();
    const rows = [];
    const definitions = [['google','Drive retained',small,true],['dropbox','Dropbox retained',small,true],['onedrive','OneDrive retained',small,true],
      ['google','Drive large',large,false],['onedrive','OneDrive live',small,false],['dropbox','Dropbox missing',small,false],
      ['google','Expired grant',small,false,'expired-object'],['google','Slow provider 1',small,false,'slow-first'],['onedrive','Slow provider 2',small,false,'slow-second'],
      ['google','Over limit',small,false,'large-object'],['google','Original record missing',small,false]];
    for (const [i,[provider,name,bytes,retained,id]] of definitions.entries()) {
      const objectId = id ?? `object-${i}`, at = new Date(current-i*1200).toISOString();
      const row = {id:`release-record-${i}`,provider,state:'SAVED',confirmed:true,mime:'image/png',filename:`${name}.png`,
        objectId,hostUrl:'https://content.example.org/article/feature',sourceUrl:'https://assets.example.net/photos/fixture.png',bytes:i===9?4194305:bytes.length,createdAt:at,updatedAt:at,
        destination:{accountId:'fixture-account',...(provider==='dropbox'?{namespace:'fixture-root'}:provider==='onedrive'?{rootId:'fixture-root'}:{})},
        ...(retained?{preview:encodePreview(bytes,'image/png')}:{})};
      qa.photos.set(objectId,bytes);
      if (i!==10) await store.begin(row);
      rows.push(...basicReceipt(row));
    }
    qa.photos.set('cloudflare.png',small);
    rows.push(...currentReceipt({operationId:'cloudflare-row',kind:'save',state:'verified',at:current+1000,updatedAt:current+1000,
      proofKind:'fixture-independent-head',receipt:{key:'cloudflare.png',etag:'fixture-r2-etag',size:small.length,
        destination:qa.target,savedFileMetadata:{httpMetadata:{contentType:'image/png'}}}}));
    rows.push({...rows[0],recordId:'zero-and-false',filename:'Metadata sample.txt',mime:'text/plain',bytes:0,sourceUrl:null,proofLevel:false,sortAt:current+2000},
      {...rows[1],recordId:'error-row',filename:'Failed save with a long descriptive filename.txt',status:'failed',code:'AUTH_REVOKED',
        rank:1,retryable:true,retryExpiresAt:current+60000,sortAt:current+3000});
    rows.push(...Array.from({length:52},(_,i)=>({...rows[0],recordId:`padding-${i}`,filename:`Archive entry ${i}.txt`,mime:'text/plain',sortAt:current-20000-i})));
    const cloud=rows.find(row=>row.sourceRecordId==='cloudflare-row');
    const longKey='screenshots/'+('Folder · café 研究/'.repeat(9))+'long-53e050ff143-1.png';
    rows.push({...cloud,recordId:'long-history',sourceRecordId:'long-history',filename:'long-53e050ff143-1.png',
      destination:{...cloud.destination,key:longKey},sortAt:current-35000});
    const screenKey='screenshots/Screenshot-75.png';
    qa.photos.set(screenKey,small);qa.r2Keys.set('screenshot-75',screenKey);
    rows.push({...cloud,recordId:'screenshot-75',sourceRecordId:'screenshot-75',deliveryId:'output-75',kind:'screenshot',
      filename:'Screenshot-75.png',destination:{...cloud.destination,key:screenKey},sortAt:current-30000},
      {...rows[0],recordId:'basic-screen-75',filename:'Screenshot-75 notes.txt',mime:'text/plain',sortAt:current-31000});
    const failedId='3180e90a-345f-4fd7-bd50-4d85cfc46533';
    const {createScreenshotRetryCache}=await import('/src/screenshot/retry-cache.mjs');
    const {hashBlob}=await import('/src/recorder/archive-stream.mjs');
    const failedBlob=new Blob([small],{type:'image/png'});
    await createScreenshotRetryCache().store(failedId,failedBlob);
    rows.push({...cloud,recordId:'failed-capture',sourceRecordId:failedId,deliveryId:'failed-output',kind:'screenshot',
      status:'failed',code:'SCREENSHOT_R2_UPLOAD_FAILED',filename:'Failed staged capture.png',retryExpiresAt:current+60000,
      checksum:await hashBlob(failedBlob),sortAt:current-32000});
    for(const i of [1,2,3]){
      const filename='gallery-0329-'+i+'.png',id='gallery-'+i;
      if(i!==3)qa.photos.set(filename,small);
      qa.r2Keys.set(id,filename);
      rows.push({...cloud,recordId:id,sourceRecordId:id,filename,destination:{...cloud.destination,key:filename},sortAt:current-32900-i});
    }
    qa.connection = 'CONNECTED';qa.event({channel:'connection-changed'});
    await history.reconcile(rows);
    const result = await history.page({page:1});
    return {total:result.total,large:large.length,withoutPreviewPayload:!JSON.stringify(result.items).includes('base64,')};
  });
  assert.equal(seed.total,73);
  assert(seed.large>256*1024 && seed.withoutPreviewPayload);

  const queue = async () => {
    await btn('Queue').click();
    await page.getByRole('heading',{name:'Queue',exact:true}).waitFor();
    assert.equal(await page.getByRole('searchbox',{name:'Find saved files'}).count(),0);
  };
  const history = async () => {
    await btn('More').click();
    await page.getByRole('menuitem',{name:'History',exact:true}).click();
    await page.getByRole('heading',{name:'History',exact:true}).waitFor();
  };
  const find = page.getByRole('searchbox',{name:'Find saved files'});
  const card = name => page.locator('.queue-history-card').filter({has:page.getByText(name,{exact:true})});
  const previewDialog = page.getByRole('dialog',{name:'History image preview'});
  const viewImage = async (name,width) => {
    await find.fill(name);
    const item=card(name);
    await item.waitFor();
    const image=item.locator('.history-preview img');
    await image.waitFor();
    await image.click();
    await previewDialog.locator('img').waitFor();
    assert.equal(await previewDialog.locator('img').evaluate(img=>img.naturalWidth),width);
    assert.equal(await previewDialog.getByText(/Retained preview/).count(),0);
    await previewDialog.getByRole('button',{name:'Close',exact:true}).click();
    return item;
  };
  await queue();
  assert(await btn('Cancel All').isVisible());
  await page.setViewportSize({width:320,height:850});
  const failedJob=page.locator('.queue-job').filter({hasText:'Failed save with a long'});
  await failedJob.getByRole('button',{name:'Retry',exact:true}).waitFor();
  const jobChecks=await failedJob.evaluate(row=>{
    const rect=selector=>row.querySelector(selector).getBoundingClientRect().toJSON();
    return {heading:rect('.queue-job-heading'),status:rect('.queue-job-state'),dismiss:rect('.queue-dismiss'),
      filename:rect('strong'),retry:rect('.queue-actions button'),location:rect(':scope > small')};
  });
  assert(jobChecks.filename.right<jobChecks.dismiss.left&&jobChecks.location.y>=jobChecks.heading.bottom);
  assert(jobChecks.retry.y>=jobChecks.status.bottom&&Math.abs(jobChecks.retry.right-jobChecks.dismiss.right)<1);
  assert(jobChecks.retry.width<jobChecks.heading.width/2);
  await page.getByText('Completed',{exact:true}).first().waitFor();
  assert.equal(await page.locator('.queue-job').filter({hasText:'Completed'}).first().locator(':scope > .queue-actions').count(),0);
  await btn('Clear All').click();
  await page.getByText('No jobs',{exact:true}).waitFor();
  await history();
  await card('Drive retained.png').waitFor();
  await find.fill('cloudflare.png');
  const cloudCard=card('cloudflare.png');
  await cloudCard.locator('.history-preview img').waitFor();
  assert.equal(await cloudCard.getByText('Media',{exact:true}).evaluate(el=>el.parentElement.open),true);
  assert.equal(await cloudCard.getByText('Details',{exact:true}).evaluate(el=>el.parentElement.open),false);
  for(const width of [320,920]){
    await page.setViewportSize({width,height:850});
    const box=await cloudCard.evaluate(el=>{
      const rect=selector=>el.querySelector(selector).getBoundingClientRect().toJSON();
      return {heading:rect('.queue-card-summary strong'),time:rect('time'),badge:rect('.queue-badge'),
        location:rect('.queue-location'),media:rect('.history-preview'),download:rect('[data-download]'),go:rect('[data-go]')};
    });
    assert(box.heading.right<=box.time.left && box.heading.y===box.time.y);
    assert(box.location.top>=box.heading.bottom && box.badge.top>=box.time.bottom && box.badge.right<=box.time.right+.5);
    assert(box.download.top>=box.media.bottom && box.go.left>=box.download.right);
  }
  await find.fill('long-53e050ff143-1.png');
  const longPath=card('long-53e050ff143-1.png').locator('.history-cloudflare-location');
  await longPath.waitFor();
  const pathSnapshot=()=>longPath.evaluate(element=>{
    const [start,end]=element.children;
    return {title:element.title,text:element.textContent,scope:element.clientWidth,visible:start.clientWidth,
      needed:start.scrollWidth,end:end.textContent,ellipsis:getComputedStyle(start).textOverflow};
  });
  await page.setViewportSize({width:320,height:850});
  await longPath.focus();
  const narrowPath=await pathSnapshot();
  assert.equal(narrowPath.text,narrowPath.title);
  assert.equal(await longPath.getAttribute('aria-label'),narrowPath.title);
  assert(narrowPath.title.startsWith('Cloudflare R2 · fixture-bucket / screenshots/'));
  assert(narrowPath.end.endsWith('53e050ff143-1.png'));
  assert(narrowPath.needed>narrowPath.visible&&narrowPath.ellipsis==='ellipsis');
  await page.setViewportSize({width:920,height:850});
  assert((await pathSnapshot()).visible>narrowPath.visible);
  for(const query of ['screen','Screenshot','screenshot-75','75']){
    await find.fill(query);
    await card('Screenshot-75.png').waitFor();
    await card('Screenshot-75 notes.txt').waitFor();
  }
  const shotCard=card('Screenshot-75.png');
  const sections=card=>card.locator(':scope > details > summary').allTextContents();
  assert.deepEqual(await sections(shotCard),['Media','Public URLs','Details']);
  assert.equal(await shotCard.getByText('Public URLs',{exact:true}).evaluate(el=>el.parentElement.open),false);
  await shotCard.getByText('Public URLs',{exact:true}).click();
  await page.waitForFunction(()=>releaseFixture.operations.some(([op])=>op==='history-public-urls'));
  assert.equal(await shotCard.getByText('Details',{exact:true}).evaluate(el=>el.parentElement.open),false);
  await find.fill('Failed staged capture');
  const failed=card('Failed staged capture.png');
  await failed.locator('.history-preview img').waitFor();
  assert.deepEqual(await sections(failed),['Media','Public URLs','Details','Error']);
  assert.equal(await failed.getByText('Error',{exact:true}).evaluate(el=>el.parentElement.open),false);
  assert.equal(await failed.locator('[data-download],[data-go]').count(),0);
  await failed.getByText('Error',{exact:true}).click();
  assert(await failed.getByText('SCREENSHOT_R2_UPLOAD_FAILED',{exact:true}).isVisible());
  await find.fill('no matches expected');
  await page.getByText('No saved files match your search.',{exact:true}).waitFor();
  await find.fill('');
  await card('cloudflare.png').waitFor();
  await find.fill('cloudflare.png');
  await cloudCard.locator('.history-preview img').waitFor();
  pass('Cloudflare card geometry and case-insensitive screenshot lookup across the retained archive');

  await cloudCard.getByRole('button',{name:'Preview cloudflare.png',exact:true}).press('Enter');
  await previewDialog.locator('img').waitFor();
  await previewDialog.getByRole('button',{name:'Immersive View'}).click();
  const imageFrame=previewDialog.locator('.image-frame'), image=previewDialog.locator('img');
  assert((await imageFrame.boundingBox()).height>200);
  assert.equal(await previewDialog.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)');
  await image.click();
  assert.equal(await previewDialog.locator('output').textContent(),'200%');
  await page.keyboard.press('ArrowRight');
  assert.equal(await previewDialog.locator('output').textContent(),'200%');
  await page.keyboard.press('Escape');
  assert.equal(await previewDialog.locator('output').textContent(),'100%');
  await page.keyboard.press('Escape');
  assert.equal(await previewDialog.getAttribute('data-immersive'),null);
  await previewDialog.getByRole('button',{name:'cloudflare.png',exact:true}).click();
  await previewDialog.getByRole('textbox',{name:'Filename'}).fill('cancel draft');
  await page.keyboard.press('Escape');
  assert(await previewDialog.getByRole('button',{name:'cloudflare.png',exact:true}).isVisible());
  await previewDialog.getByRole('button',{name:'cloudflare.png',exact:true}).click();
  await previewDialog.getByRole('textbox',{name:'Filename'}).fill('renamed');
  await page.keyboard.press('Enter');
  await previewDialog.getByRole('button',{name:'renamed.png',exact:true}).waitFor();
  await previewDialog.getByRole('button',{name:'Close',exact:true}).click();
  await find.fill('renamed.png');
  await card('renamed.png').waitFor();
  await page.evaluate(()=>{releaseFixture.r2Gate=new Promise(resolve=>{releaseFixture.releaseR2=resolve;});});
  await find.fill('gallery-0329');
  await card('gallery-0329-1.png').getByRole('button',{name:'Preview gallery-0329-1.png'}).click();
  await previewDialog.locator('img').waitFor();
  const immersive=previewDialog.getByRole('button',{name:'Immersive View'});
  const original=await immersive.evaluate(button=>{
    window.originalImmersive=button;
    return [getComputedStyle(button).opacity,...['x','y','width','height'].map(key=>button.getBoundingClientRect()[key])];
  });
  await page.keyboard.press('ArrowRight');
  assert.equal(await immersive.getAttribute('aria-disabled'),'true');
  assert.deepEqual(await immersive.evaluate(button=>{
    if(button!==window.originalImmersive)throw Error('The Immersive View control was replaced');
    return [getComputedStyle(button).opacity,...['x','y','width','height'].map(key=>button.getBoundingClientRect()[key])];
  }),original);
  await immersive.evaluate(button=>button.click());
  assert.equal(await previewDialog.getAttribute('data-immersive'),null);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await page.evaluate(()=>releaseFixture.releaseR2());
  await previewDialog.locator('img').waitFor();
  await page.keyboard.press('ArrowRight');
  await previewDialog.getByText(/Preview unavailable|no longer exists/).waitFor();
  assert(await immersive.isDisabled());
  await previewDialog.getByRole('button',{name:'Close',exact:true}).click();
  await find.fill('renamed.png');
  await card('renamed.png').waitFor();
  pass('Rapid Preview navigation keeps Immersive View stable and guards pending or unavailable images');
  await page.evaluate(()=>{releaseFixture.renameFail=true;});
  await card('renamed.png').getByRole('button',{name:'renamed.png',exact:true}).click();
  await card('renamed.png').getByRole('textbox',{name:'Filename'}).fill('duplicate.gif');
  await page.keyboard.press('Enter');
  await card('renamed.png').getByText('That name is already in use.').waitFor();

  for (const name of ['Drive retained.png','Dropbox retained.png','OneDrive retained.png']) {
    const item=await viewImage(name,42);
    assert.equal(await item.getByRole('button',{name:/^Download /}).count(),0);
    assert(await item.getByText('content.example.org',{exact:true}).isVisible());
    assert(await item.getByText('Image',{exact:true}).evaluate(el=>el.parentElement.open));
    await item.getByText('Image',{exact:true}).click();
    assert(await item.getByText('content.example.org',{exact:true}).isVisible());
    assert.equal(await item.getByText('URL',{exact:true}).evaluate(el=>el.parentElement.open),false);
    await item.getByText('URL',{exact:true}).click();
    assert(await item.getByText('https://content.example.org/article/feature',{exact:true}).isVisible());
    assert(await item.getByText('https://assets.example.net/photos/fixture.png',{exact:true}).isVisible());
  }
  await viewImage('Drive large.png',480);
  await viewImage('OneDrive live.png',42);
  await find.fill('Dropbox missing.png');
  await card('Dropbox missing.png').getByRole('button',{name:'Allow Dropbox image previews'}).click();
  await viewImage('Dropbox missing.png',42);
  for(const [name,error] of [
    ['Expired grant.png',/Reconnect the saved provider account/],
    ['Over limit.png',/exceeds the preview size limit/],
    ['Original record missing.png',/original confirmed image record is unavailable/]
  ]){
    await find.fill(name);
    await card(name).getByText(error).waitFor();
  }
  await page.evaluate(()=>{releaseFixture.aborts=0;});
  await find.fill('slow');
  await page.waitForFunction(()=>releaseFixture.active===2);
  await find.fill('Drive retained.png');
  await page.waitForFunction(()=>releaseFixture.aborts===2 && releaseFixture.active===0);
  assert.equal(await page.evaluate(()=>releaseFixture.peak),2);
  await shot('history-basic-image');
  pass('Completed Queue jobs, Clear All, History sections, exact rename and immersive keyboard controls',seed);

  await find.fill('Metadata sample.txt');
  await card('Metadata sample.txt').getByText('Details',{exact:true}).click();
  const dt = label => card('Metadata sample.txt').locator('dt').filter({hasText:new RegExp(`^${label}$`)});
  assert.equal(await dt('Original filename').count(),0);
  assert.equal(await card('Metadata sample.txt').locator('.queue-location').first().textContent(),'Google Drive');
  assert.equal(await dt('Bytes').evaluate(el=>el.nextElementSibling.textContent),'0');
  assert.equal(await dt('Proof').evaluate(el=>el.nextElementSibling.textContent),'false');
  const originalRows = await page.evaluate(async()=>{
    const {createHistoryStore}=await import('/src/queue/store.mjs');
    return (await createHistoryStore().page({page:1,query:'metadata sample.txt'})).items;
  });
  await btn('Settings').click();await settings.waitFor();
  assert(await settings.getByRole('checkbox',{name:'Hide N/A fields'}).isChecked());
  assert(await settings.getByText('Google Drive',{exact:true}).isHidden());
  await settings.getByText('Advanced',{exact:true}).click();
  const googleSettings = settings.locator('[data-history-provider=google]');
  await googleSettings.getByText('Google Drive',{exact:true}).click();
  await googleSettings.getByRole('checkbox',{name:'Bytes',exact:true}).uncheck();
  await settings.getByRole('checkbox',{name:'Hide N/A fields'}).uncheck();
  await history();
  await card('Metadata sample.txt').getByText('Details',{exact:true}).click();
  assert(await dt('Bytes').isHidden());
  assert.equal(await card('Metadata sample.txt').locator('.queue-location').first().textContent(),'Google Drive · N/A');

  await page.evaluate(()=>chrome.storage.local.set({historyV2MetadataVisibilityV1:{hideNA:true,providers:{}}}));
  assert(await dt('Bytes').isVisible());
  assert(await card('Metadata sample.txt').getByText('Details',{exact:true}).evaluate(el=>el.parentElement.open));
  assert.deepEqual(await page.evaluate(async()=>{
    const {createHistoryStore}=await import('/src/queue/store.mjs');
    return (await createHistoryStore().page({page:1,query:'metadata sample.txt'})).items;
  }),originalRows);
  await find.fill('Failed save with a long descriptive filename.txt');
  await card('Failed save with a long descriptive filename.txt').getByText('Details',{exact:true}).click();
  assert(await card('Failed save with a long descriptive filename.txt').getByText('AUTH_REVOKED',{exact:true}).isVisible());
  pass('Provider metadata updates open cards and preserves raw records');
  await find.fill('');
  await page.locator('.queue-pager:not([hidden])').waitFor();
  const testGeometry = async setup => {
    const g = await page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,mid:r.x+r.width/2};};
      return {title:rect('.queue-page>h1'),history:rect('.queue-page>h1'),archive:rect('.queue-archive'),search:rect('.queue-search input'),
        pager:rect('.queue-pager'),first:rect('[data-first]'),last:rect('[data-last]'),footer:rect('#manage-slot'),manage:rect('#manage')};
    });
    assert(Math.abs(g.title.mid-g.history.mid)<=1 && Math.abs(g.pager.mid-g.history.mid)<1,JSON.stringify({setup,g}));
    assert.equal(g.first.top,g.last.top);
    assert(Math.abs((g.first.left+g.last.right)/2-g.pager.mid)<1);
    assert(g.search.top>g.history.bottom && g.search.left>=g.archive.left && g.search.right<=g.archive.right);
    assert(g.search.right-g.search.left>.75*(g.archive.right-g.archive.left));
    assert(g.footer.right-g.manage.right<=21 && g.footer.bottom>=g.manage.bottom);
  };
  const themes = await page.evaluate(async()=>{
    const {themePackages,palettes}=await import('/src/aesthetic/packages.mjs');
    return ['standard','minimal',...themePackages.map(theme=>theme.id)].flatMap(id=>id==='nostalgia'
      ?themePackages.find(theme=>theme.id===id).styles.map(style=>({id,style:style.id})):
      ['minimal','frames'].includes(id)?palettes.map(palette=>({id,palette:palette.id})):[{id}]);
  });
  for (const theme of themes) for (const mode of ['light','dark']) {
    await page.evaluate(async ({theme,mode})=>{
      const {createAestheticHost}=await import('/src/aesthetic/host.mjs');
      const root=document.documentElement, host=createAestheticHost({root,storage:chrome.storage.local});
      root.dataset.theme=mode;
      await host.apply({...theme,persist:false});
      if (theme.palette) await host.applyPalette(theme.palette);
    },{theme,mode});
    for (const width of [320,920]) {
      await page.setViewportSize({width,height:850});
      await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
      await page.waitForFunction(()=>{
        const tabs=document.querySelectorAll('header nav>[data-view]:not([hidden])');
        return !tabs.length||tabs[tabs.length-1].getBoundingClientRect().right<=document.querySelector('#header-more').getBoundingClientRect().left+.5;
      },null,{timeout:2000}).catch(error=>{throw Error(JSON.stringify({theme,mode,width})+' '+error.message);});
      await header();await testGeometry({theme,mode,width});
    }
  }
  await page.setViewportSize({width:320,height:850});
  await page.locator('.queue-pager').scrollIntoViewIfNeeded();
  await shot('history-pagination-320');
  await page.getByRole('spinbutton',{name:'Page',exact:true}).fill('3');
  await page.getByRole('spinbutton',{name:'Page',exact:true}).press('Enter');
  await page.waitForFunction(()=>document.querySelector('[data-last]').disabled);
  assert(await btn('Next page').isDisabled());
  pass('Single-row header, right-aligned footer, centered Queue/History and pagination',{appearanceModes:themes.length*2,widths:[320,920]});

  // Compare existing packages on the same rendered Remotes controls.
  if(baseline){
    const other=await context.newPage();
    await other.addInitScript(installFixture,manifest);
    await other.goto(origin+'/baseline/extension/app.html?fixturePerformance=1');
    await other.locator('#theme:enabled').waitFor();
    await page.getByRole('button',{name:'Remotes',exact:true}).click();
    const styles=(target,variation,mode)=>target.evaluate(async({variation,mode})=>{
      const {createAestheticHost}=await import('/src/aesthetic/host.mjs');
      const root=document.documentElement,host=createAestheticHost({root});
      await host.apply({...variation,persist:false});
      if(variation.palette)await host.applyPalette(variation.palette);
      root.dataset.theme=mode;
      await document.fonts.ready;
      return ['body','.app-header','.remotes-headline','.remote-interlude span','.remote-provider','.remote-provider h2',
        '[data-connect]','#manage'].map(selector=>{
        const style=getComputedStyle(document.querySelector(selector));
        return ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','backgroundColor','color','borderRadius']
          .map(key=>style[key]);
      });
    },{variation,mode});
    const protectedThemes=themes.filter(theme=>!['chrome','golden-age'].includes(theme.id));
    for(const theme of protectedThemes)for(const mode of ['light','dark'])for(const width of [320,920]){
      await Promise.all([other,page].map(target=>target.setViewportSize({width,height:850})));
      const [before,after]=await Promise.all([other,page].map(target=>styles(target,theme,mode)));
      assert.deepEqual(after,before,JSON.stringify({theme,mode,width}));
    }
    await other.close();
    pass('Protected packages match baseline computed typography and surface colors',{comparisons:protectedThemes.length*4});
  }

  const aestheticSettings=async()=>{
    await btn('Settings').click();
    await page.locator('#appearance').waitFor();
  };
  for(const appearance of ['chrome','golden-age']){
    await aestheticSettings();
    await page.locator('#appearance').selectOption(appearance);
    await page.locator('#setting-theme').selectOption('dark');
    await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
    await btn('Remotes').click();
    assert.equal(await page.locator('#cloudflare-setup').count(),0);
    assert.deepEqual(await page.locator('.remote-interlude span').allTextContents(),['The Future Is NOW','True Remote Is Here']);
    assert.deepEqual(await page.locator('.remote-provider h2').allTextContents(),['Google Drive','OneDrive','Dropbox']);
    for(const mode of ['dark','light']){
      await page.setViewportSize({width:365,height:850});
      await page.mouse.move(2,100);
      const design=await page.evaluate(()=>({
        mode:document.documentElement.dataset.theme,
        moon:getComputedStyle(document.querySelector('.chrome-appearance-icon')).backgroundImage,
        bevel:getComputedStyle(document.querySelector('.remote-provider')).borderTopWidth,
        background:getComputedStyle(document.querySelector('#shell')).backgroundImage,
        cloudflare:getComputedStyle(document.querySelector('.cf-connection-primary')).backgroundImage,
        navigation:getComputedStyle(document.querySelector('nav [aria-current=page]')).backgroundImage,
        basic:getComputedStyle(document.querySelector('.remote-provider-actions [data-connect]')).backgroundImage,
        accent:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        footer:[...document.querySelectorAll('#manage-slot button:not([hidden])')].map(button=>button.id)
      }));
      assert.equal(design.mode,mode);
      assert.deepEqual(design.footer,['manage']);
      if(appearance==='chrome'){
        assert(design.moon.endsWith('chrome-moon-'+mode+'.svg")'));
        assert.equal(design.bevel,'3px');
        assert.match(design.background,/linear-gradient/);
        assert.match(design.cloudflare,/rgb\(247, 142, 55\)/);
        assert.match(design.navigation,/rgb\(215, 25, 54\)/);
        assert.match(design.basic,/rgb\(250, 250, 250\)/);
      }else assert.equal(design.accent,'#e60023');
      await header();await shot(appearance+'-'+mode+'-365');
      if(mode==='dark'){
        await page.locator('#theme').click();
        await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
      }
    }
    await page.reload();
    await page.waitForFunction(id=>document.documentElement.dataset.theme==='light'&&document.documentElement.dataset.aesthetic===id,appearance);
  }
  pass('Chrome metallic appearances and Golden Age palette with live appearance switching and restart');

  const web = await context.newPage();
  await web.addInitScript(()=>{
    const handlers=[];
    globalThis.chrome={runtime:{id:'test-extension',onMessage:{addListener:fn=>handlers.push(fn)}}};
    window.addEventListener('contextmenu',event=>event.preventDefault());
    window.effect=(message={},sender={id:'test-extension'})=>{
      for (const listener of handlers) listener({channel:'redown-energy-projectile',clickedAt:Date.now(),side:'right',
        style:{duration:600,curve:-45,color:'#4ae5ff',white:23,trail:45,brightness:.95},...message},sender);
    };
  });
  await web.goto(origin+'/projectile');
  await web.evaluate(()=>effect());
  assert.equal(await web.locator('[data-redown-projectile]').count(),0);
  await web.mouse.click(165,260,{button:'right'});
  assert.equal(await web.locator('[data-redown-projectile]').count(),0);
  await web.evaluate(()=>effect({}, {id:'website'}));
  assert.equal(await web.locator('[data-redown-projectile]').count(),0);
  await web.evaluate(()=>effect());
  const ball = web.locator('[data-redown-projectile]');
  await ball.waitFor({state:'attached'});
  const path = await ball.evaluate(el=>{
    const flight=el.getAnimations()[0], css=getComputedStyle(el);
    return {frames:flight.effect.getKeyframes(),duration:flight.effect.getTiming().duration,width:innerWidth,position:css.position,pointer:css.pointerEvents};
  });
  assert.match(path.frames[0].transform,/165px, 260px/);
  assert.match(path.frames.at(-1).transform,new RegExp(`${path.width-9}px`));
  assert.equal(path.duration,751);
  assert.deepEqual([path.position,path.pointer],['fixed','none']);
  await web.screenshot({path:join(out,'projectile-webpage.png')});report.screenshots.push('projectile-webpage.png');
  await ball.waitFor({state:'detached'});
  await web.emulateMedia({reducedMotion:'reduce'});
  await web.mouse.click(250,230,{button:'right'});
  await web.evaluate(()=>effect({side:'left'}));
  assert.equal(await ball.count(),0);
  await web.emulateMedia({reducedMotion:'no-preference'});
  for(let i=0;i<5;i++) {await web.mouse.click(310+i,230,{button:'right'});await web.evaluate(()=>effect({side:'left'}));}
  assert.equal(await ball.count(),3);
  assert.match(await ball.first().evaluate(el=>el.getAnimations()[0].effect.getKeyframes().at(-1).transform),/9px/);
  const released = await web.evaluate(()=>{effect({stop:true});return document.querySelectorAll('[data-redown-projectile]').length;});
  assert.equal(released,0);
  await web.evaluate(()=>{const frame=document.createElement('iframe');frame.src='/projectile-frame';document.body.append(frame);});
  await web.frameLocator('iframe').locator('p').waitFor();
  const frame = web.frames().find(frame=>frame.url().endsWith('projectile-frame'));
  await frame.waitForFunction(()=>typeof effect==='function');
  const offset = await web.locator('iframe').boundingBox();
  await web.mouse.click(offset.x+70,offset.y+60,{button:'right'});
  await frame.evaluate(()=>effect());
  assert.equal(await ball.count(),1);
  await frame.evaluate(()=>effect({stop:true}));
  const frameUrl = origin.replace('127.0.0.1','localhost')+'/projectile-frame';
  await web.locator('iframe').evaluate((element,url)=>{element.src=url;},frameUrl);
  await frame.waitForURL(frameUrl);
  await web.frameLocator('iframe').locator('p').waitFor();
  const crossOrigin = web.frames().find(frame=>frame.url()===frameUrl);
  assert(crossOrigin);
  await web.mouse.click(offset.x+65,offset.y+55,{button:'right'});
  await crossOrigin.evaluate(()=>effect({side:'left'}));
  assert.equal(await ball.count(),0);
  assert.equal(await crossOrigin.locator('[data-redown-projectile]').count(),1);
  await web.reload();assert.equal(await ball.count(),0);
  pass('Trusted browser coordinates, fixed webpage endpoints, frame offsets, reduced motion and burst cleanup');
  assert.deepEqual(report.errors,[]);
  report.result='PASS';
} catch(error) {
  report.error=error.stack;
  process.exitCode=1;
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
  await writeFile(join(out,'browser-results.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
