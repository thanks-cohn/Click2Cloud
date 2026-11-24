// The packaged Shelf, browser layout and IndexedDB are real. Chrome extension
// endpoints and provider traffic are isolated fixtures for this run.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {extname,join,resolve,sep} from 'node:path';
import {chromium} from 'playwright-core';

const root = resolve('dist/click2cloud'), out = resolve(process.env.C2C_0328_EVIDENCE ?? 'work/0328/browser');
const baseline = process.env.C2C_BASELINE_BUILD && resolve(process.env.C2C_BASELINE_BUILD);
const types = {'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png'};
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
  const project = {connection:'DISCONNECTED',ready:new Set(),photos:new Map(),operations:[],active:0,peak:0,aborts:0};
  let basic;
  async function basicFixture() {
    if (basic) return basic;
    basic = Promise.all([import('/src/basic/lib/api.js'),import('/src/basic/lib/store.js'),import('/src/basic/providers/index.js')]).then(async ([{createApi},{openStore},{createAdapters}])=>{
      const store = await openStore(indexedDB,'release-0327-basic-fixtures');
      const auth = {authorization:async provider=>({identity:provider==='google'?['fixture-account']:['fixture-account','fixture-root'],
        accessToken:'fixture-read',isCurrent:()=>true,scopes:[]})};
      const adapters = createAdapters({fetch:async (url,options)=>{
        const id = /items\/([^/?]+)|files\/([^/?]+)/.exec(url)?.slice(1).find(Boolean);
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
          return bytes ? new Response(bytes) : new Response(null,{status:404});
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
    async sendMessage(message) {
      if (message.channel==='redown-basic-v1') {
        const {op,input} = message;
        project.operations.push([op,input.provider ?? input.id]);
        if (op.startsWith('history.')) {
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
      if (message.channel==='screenshot') return {state:'completed',data:{rules:[],revision:0,defaultHandled:true}};
      if (message.channel!=='engine') return null;
      const {method,params} = message;
      if (method==='loginStatus') return success({state:project.connection,identityVerified:project.reconnect,
        accounts:project.connection==='CONNECTED'?[{id:target.accountId,name:'Fixture account'}]:[]});
      if (method==='openRemoteResult') return success({target,highlightKey:'cloudflare.png'});
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
  assert.equal(manifest.version,'0.3.28');
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
  await fullWidth('Log in');
  assert.equal(await cloudflare.getByText('Not connected',{exact:true}).count(),0);
  assert.equal(await cloudflare.getByText(/Cloudflare may charge/).count(),0);
  assert.equal(await page.locator('#selected-save-setup').count(),0);
  await page.evaluate(()=>{releaseFixture.reconnect=true;releaseFixture.event({channel:'connection-changed'});});
  await fullWidth('Reconnect');
  await page.evaluate(()=>{releaseFixture.connection='CONNECTED';releaseFixture.event({channel:'connection-changed'});});
  await fullWidth('Open File Explorer');
  assert(await cloudflare.getByRole('button',{name:'Sign out',exact:true}).isVisible());
  await shot('remotes-920');
  const cardBounds = async () => {
    const geometry = await google.evaluate(card=>{
      const box = selector=>card.querySelector(selector).getBoundingClientRect().toJSON();
      return {card:card.getBoundingClientRect().toJSON(),connect:box('[data-connect]'),go:box('[data-go]'),refresh:box('[data-refresh]'),
        heading:box('h2'),status:box('[data-activity]')};
    });
    assert(geometry.heading.right<=geometry.status.left && geometry.connect.left<geometry.go.left && geometry.go.right<geometry.refresh.left);
    assert(Math.abs(geometry.connect.y-geometry.refresh.y)<1);
    return [geometry.card.height,geometry.refresh.x,geometry.refresh.y-geometry.card.y,geometry.connect.x,geometry.connect.y-geometry.card.y].map(Math.round);
  };
  await page.setViewportSize({width:320,height:850});
  const idle = await cardBounds();
  await google.getByRole('button',{name:'Sign In'}).click();
  await google.getByText('Success!',{exact:true}).waitFor();
  assert.equal(await google.locator('[data-activity]').evaluate(el=>el.getAnimations()[0]?.effect.getTiming().iterations),2);
  assert((await cardBounds())[0]<idle[0],'ready information space should collapse');
  await shot('provider-success-320');
  await google.getByText('Success!',{exact:true}).waitFor({state:'hidden'});
  await page.evaluate(()=>{releaseFixture.cardFailure=true;});
  await google.getByRole('button',{name:'Refresh',exact:true}).click();
  await google.getByText('Needs attention',{exact:true}).waitFor();
  await google.getByText('Connection details',{exact:true}).click();
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
  const feedback = page.locator('.visual-feedback-settings');
  await feedback.waitFor();
  assert.equal(await feedback.getByLabel('Average speed').inputValue(),'normal');
  assert.equal(await feedback.getByLabel('Colors').inputValue(),'random');
  await feedback.getByLabel('Average speed').selectOption('fast');
  await feedback.getByLabel('Colors').selectOption('theme');
  await feedback.getByLabel('Provider card success pulse').uncheck();
  await feedback.getByLabel('Toolbar transmission').uncheck();
  await feedback.getByLabel('Save notifications when Shelf is closed').uncheck();
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
  assert(!(await feedback.getByLabel('Save notifications when Shelf is closed').isChecked()));
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
      {...rows[1],recordId:'error-row',filename:'Failed save.txt',status:'failed',code:'AUTH_REVOKED',sortAt:current+3000});
    rows.push(...Array.from({length:52},(_,i)=>({...rows[0],recordId:`padding-${i}`,filename:`Archive entry ${i}.txt`,mime:'text/plain',sortAt:current-20000-i})));
    qa.connection = 'CONNECTED';qa.event({channel:'connection-changed'});
    await history.reconcile(rows);
    const result = await history.page({page:1});
    return {total:result.total,large:large.length,withoutPreviewPayload:!JSON.stringify(result.items).includes('base64,')};
  });
  assert.equal(seed.total,66);
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
  await page.getByText('Completed',{exact:true}).first().waitFor();
  await btn('Clear All').click();
  await page.getByText('No jobs',{exact:true}).waitFor();
  await history();
  await card('Drive retained.png').waitFor();
  await find.fill('cloudflare.png');
  const cloudCard=card('cloudflare.png');
  await cloudCard.getByRole('button',{name:'Preview',exact:true}).click();
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
  for(const [name,error] of [
    ['Dropbox missing.png',/Dropbox file-read access is unavailable/],
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
  await find.fill('Failed save.txt');
  await card('Failed save.txt').getByText('Details',{exact:true}).click();
  assert(await card('Failed save.txt').getByText('AUTH_REVOKED',{exact:true}).isVisible());
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
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
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
