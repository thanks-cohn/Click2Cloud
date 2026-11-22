// Disposable Chromium + actual app/API/IndexedDB; provider and Chrome transport
// fixtures are explicit. This is not installed Windows or live R2 evidence.
import {chromium} from 'playwright-core';import {createServer} from 'node:http';import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';import {resolve,join,extname} from 'node:path';import {tmpdir} from 'node:os';import assert from 'node:assert/strict';
const root=resolve(new URL('../',import.meta.url).pathname),out=resolve(process.env.C2C_HISTORY_EVIDENCE??'/tmp/c2c-history-browser');await mkdir(out,{recursive:true});let context,server;const results=[],errors=[],profile=await mkdtemp(join(tmpdir(),'c2c-history-'));
try{server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!p.startsWith(root+'/'))return res.writeHead(403).end();res.setHeader('Content-Type',({'.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[extname(p)]??'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
context=await chromium.launchPersistentContext(profile,{executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox'],viewport:{width:1100,height:850}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{const listeners=[],data={uiDebugMode:false};globalThis.chrome={runtime:{id:'fixture',onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:async message=>{
 if(message.method==='inspectRemoteHistory')window.historyRequests?.push(message.params);
 return (await import('/tests/product-browser-host.mjs')).invoke({version:message.version,method:message.method,params:message.params});
}},storage:{local:{get:async key=>({[key]:data[key]}),set:async v=>Object.assign(data,v)},onChanged:{addListener(){}}}};window.fixtureNotify=message=>listeners.forEach(fn=>fn(message,{id:'fixture'}));});
await page.goto('http://127.0.0.1:'+server.address().port+'/extension/app.html?fixturePerformance=1');await page.waitForFunction(()=>window.productFixture);
await page.waitForFunction(()=>!document.querySelector('[data-view=history]').disabled);
await page.evaluate(bytes=>{window.fixtureImageData={};window.fixtureHistoryPNG=bytes;},Array.from(await readFile(join(root,'tests/fixtures/images/picture.png'))));
await page.evaluate(async()=>{const f=window.productFixture;f.setReady('fixture-bucket');const d={provider:'cloudflare-r2',connectionId:f.target.connectionId,accountId:f.target.accountId,bucketName:f.target.bucketName,prefix:''};for(let i=0;i<101;i++){const ext=['png','pdf','docx','txt','zip','bin','mp4','mp3'][i%8],name='file-'+i+'.'+ext,size=ext==='png'?window.fixtureHistoryPNG.length:3,etag=ext==='png'?'fixture-preview':'fixture';if(ext==='png')window.fixtureImageData[name]=window.fixtureHistoryPNG;f.r2Objects.set('fixture-bucket:'+name,{bucketName:'fixture-bucket',key:name,displayName:name,folder:false,size,etag});await f.current.recordRemoteResult({kind:'save',operationId:'history-'+String(i).padStart(3,'0'),state:'verified',proofKind:'independent-head-version-size',destination:d,historyContext:{hostPageTitle:'Captured page',hostPageURL:'https://page.test/article?token=secret',sourceURL:'https://image.test/original?signature=secret',hostname:'page.test'},receipt:{key:name,size,etag,version:'fixture',destination:d,savedFileMetadata:{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{operationId:'history-'+i,click2cloud:'{"mode":"simple"}'}}}});}await f.current.setHistoryPreferences({range:'all',previews:'closed',timezone:'America/Chicago'});});
await page.getByRole('button',{name:'History',exact:true}).click();await page.locator('.history-row').first().waitFor();assert.equal(await page.locator('.history-row').count(),25);assert.match(await page.locator('.history-page').innerText(),/Page 1 of 5/);assert.equal(await page.locator('.history-preview img').count(),0);results.push({gate:'101-operation-history-first-page-25',state:'PASS'});
await page.locator('[data-history-more]').first().locator('summary').first().click();const first=page.locator('.history-row').first();await first.getByText('Source & Links',{exact:true}).click();assert.equal(await first.locator('a').count(),2);assert(!await first.innerHTML().then(s=>s.includes('token=secret')||s.includes('signature=secret')));await first.getByText('Metadata',{exact:true}).click();assert.match(await first.innerText(),/httpMetadata/);assert(!await page.locator('.history-page').innerText().then(s=>/Technical Details|ETag|worker stage/i.test(s)));results.push({gate:'separate-safe-links-exact-upload-metadata-no-technical-panel',state:'PASS'});
await page.screenshot({path:join(out,'history-details.png'),fullPage:true});
await page.getByRole('button',{name:'Next',exact:true}).click();assert.equal(await page.locator('.history-row').count(),25);await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:'Next',exact:true}).click();assert.equal(await page.locator('.history-row').count(),1);results.push({gate:'history-25-page-boundaries-last-page-one',state:'PASS'});
await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('menuitem',{name:'Settings',exact:true}).click();await page.locator('#history-range').waitFor();assert.equal(await page.locator('#history-previews').inputValue(),'closed');await page.locator('#history-previews').selectOption('all');await page.locator('#history-save-prefs').click();await page.getByText('History preferences saved.',{exact:true}).waitFor();assert.equal(await page.evaluate(async()=>(await window.productFixture.current.readHistoryPreferences()).previews),'all');results.push({gate:'persistent-history-settings',state:'PASS'});
await page.evaluate(()=>{window.fixtureExportParts=[];window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async chunk=>window.fixtureExportParts.push(chunk),close:async()=>{},abort:async()=>{}})});});
for(const format of ['json','jsonl','csv']){
 await page.locator('#history-format').selectOption(format);await page.evaluate(()=>window.fixtureExportParts=[]);await page.locator('#history-export').click();await page.getByText('History exported · 101 operations.',{exact:true}).waitFor();const text=await page.evaluate(()=>window.fixtureExportParts.join(''));
 if(format==='json')assert.equal(JSON.parse(text).operations.length,101);
 if(format==='jsonl')assert.equal(text.trim().split('\n').length,103);
 if(format==='csv'){assert(text.includes('exportSelection'));assert.equal(text.split('\r\n').filter(Boolean).length,104);}
 assert(!text.includes('technicalDetails'));assert(!text.includes('token=secret'));
}
results.push({gate:'settings-export-101-operations-independent-of-visible-page-all-three-formats',state:'PASS'});

await page.evaluate(()=>{const api=window.productFixture.fileApi,run=api.run.bind(api);api.run=async(op,input,options)=>{const r=await run(op,input,options);if(op!=='list'||r.state!=='completed')return r;const at=Number((input.cursor??'').split(':')[1]??0),all=r.data.entries;return {...r,data:{...r.data,entries:all.slice(at,at+25),cursor:at+25<all.length?'fixture-page:'+String(at+25):''}};};});
// Genuine app navigation and exact selection across all requested file types.
for(const ext of ['pdf','docx','txt','zip','bin','mp4','mp3','png']){
 await page.getByRole('button',{name:'History',exact:true}).click();await page.locator('.history-row').first().waitFor();
 let entry=page.locator('.history-row').filter({has:page.locator('strong', {hasText:new RegExp('\\.'+ext+'$')})}).first();
 if(!await entry.count()){await page.getByRole('button',{name:'Previous',exact:true}).click();entry=page.locator('.history-row').filter({has:page.locator('strong', {hasText:new RegExp('\\.'+ext+'$')})}).first();}
 const filename=await entry.locator('strong').textContent();await entry.getByRole('button',{name:'GO TO',exact:true}).click();await page.waitForFunction(name=>[...document.querySelectorAll('#files [aria-selected="true"]')].some(el=>el.textContent.includes(name)),filename);assert.match(await page.locator('#files [aria-selected="true"]').innerText(),new RegExp(filename.replaceAll('.','\\.')));
}
results.push({gate:'production-GO-TO-selects-png-pdf-docx-txt-zip-bin-video-audio',state:'PASS'});
await page.getByRole('button',{name:'History',exact:true}).click();await page.locator('[data-history-goto]').first().waitFor();const missing=await page.locator('.history-row strong').first().textContent();await page.evaluate(name=>{window.productFixture.r2Objects.delete('fixture-bucket:'+name);},missing);await page.locator('[data-history-goto]').first().click();await page.getByText('This file no longer exists.',{exact:true}).waitFor();results.push({gate:'missing-object-does-not-highlight-unrelated-file',state:'PASS'});
// Every-page preference rules, actual bounded image reads, no hidden-group fetch.
for(const mode of ['all','first','closed']){
 await page.evaluate(async mode=>{await window.productFixture.current.setHistoryPreferences({range:'all',previews:mode,timezone:'America/Chicago'});},mode);
 await page.reload();await page.waitForFunction(()=>window.productFixture);await page.evaluate(async bytes=>{const f=window.productFixture;f.setReady('fixture-bucket');window.fixtureImageData={};for(const r of await f.current.readRemoteResults()){if(!r.receipt)continue;const {key,size,etag}=r.receipt;f.r2Objects.set('fixture-bucket:'+key,{key,size,etag,bucketName:'fixture-bucket',folder:false,displayName:key});if(key.endsWith('.png'))window.fixtureImageData[key]=bytes;}},Array.from(await readFile(join(root,'tests/fixtures/images/picture.png'))));await page.getByRole('button',{name:'History',exact:true}).click();await page.locator('.history-row').first().waitFor();
 const images=await page.locator('[data-preview]').count();assert(images>0);assert.equal(await page.locator('[data-history-more][open]').count(),mode==='closed'?0:images);
 if(mode==='all'){await page.locator('[data-preview]').first().scrollIntoViewIfNeeded();await page.locator('.history-preview img').first().waitFor({timeout:5000});assert((await page.evaluate(()=>window.fixtureImageReadPeak??0))<=2);}
 await page.getByRole('button',{name:'Next',exact:true}).click();assert.equal(await page.locator('[data-history-more][open]').count(),mode==='all'?await page.locator('[data-preview]').count():0);
 if(mode!=='all')assert.equal(await page.locator('.history-preview img').count(),0);
}
results.push({gate:'preview-all-first-closed-on-first-and-second-page-bounded-reads',state:'PASS'});
await page.locator('.history-year > summary').first().click();const count=await page.evaluate(()=>window.productFixture.calls.filter(c=>c.operation==='readChunk').length);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.productFixture.calls.filter(c=>c.operation==='readChunk').length),count);results.push({gate:'collapsed-date-group-no-new-preview-reads',state:'PASS'});
await page.screenshot({path:join(out,'history.png'),fullPage:true});
await page.getByRole('button',{name:'File Explorer',exact:true}).click();await page.locator('#toolbar-splitter').press('Home');
await page.waitForFunction(()=>document.querySelector('#command-items #filename-search'));
assert.deepEqual(await page.locator('#command-items > button').evaluateAll(els=>els.map(e=>e.id)),['back','forward','up','refresh']);
await page.locator('#toolbar-more').click();
assert(await page.locator('#toolbar-overflow #location').isVisible());
assert(await page.locator('#view-switch').isVisible());assert(await page.locator('#add-location').isVisible());
results.push({gate:'condensed-explorer-navigation-search-and-go-to-path-overflow',state:'PASS'});
await page.locator('#toolbar-splitter').press('ArrowDown');
await page.locator('#command-items #add-location').waitFor();
assert(await page.locator('#command-items #filename-search').isVisible());
assert(await page.locator('#toolbar-overflow #location').isHidden());
results.push({gate:'expanded-toolbar-retains-search-and-second-row-right-click',state:'PASS'});
await page.screenshot({path:join(out,'explorer-condensed.png'),fullPage:true});

// Use the real Shelf, typed API, and IndexedDB. The test controls the result
// records and message delivery so there are no provider credentials involved.
await page.evaluate(async()=>{
 const {current}=window.productFixture;
 for(let first=0;first<2200;first+=100)await Promise.all(Array.from({length:100},(_,i)=>current.recordRemoteResult({operationId:'prior-'+(first+i),kind:'save',state:'failed',attemptedFilename:'Previous result'})));
 await current.setHistoryPreferences({range:'all',previews:'closed',timezone:'America/Chicago'});
 window.historyRequests=[];
 window.seedLiveHistory=async(id,kind,state)=>{
  const screenshot=kind==='screenshot-to-cloud'?{state,plan:{operationId:id,captureId:crypto.randomUUID(),outputs:[]},outputs:[],attempts:[],trace:[]}:undefined;
  const verified=state==='verified'?{proofKind:'independent-head-version-size',receipt:{key:id+'.txt',size:3}}:{};
  await current.recordRemoteResult({operationId:id,kind,state,screenshot,attemptedFilename:id,...verified});
 };
});
await page.getByRole('button',{name:'History',exact:true}).click();
await page.getByText('Page 2 of 93',{exact:true}).waitFor();
await page.getByRole('button',{name:'Previous',exact:true}).click();
await page.getByText('Page 1 of 93',{exact:true}).waitFor();
const started=Date.now();
await page.evaluate(async()=>{
 window.historyRequests.length=0;
 const {seedLiveHistory:seed,fixtureNotify:notify}=window;
 await Promise.all(Array.from({length:130},(_,i)=>seed('burst-save-'+i,'save','pending')));
 await seed('burst-shot','screenshot-to-cloud','pending');
 await seed('burst-top-save','save','pending');
 for(let i=0;i<130;i++)notify({channel:'remote-result',result:{operationId:'burst-save-'+i,kind:'save',state:'pending'}});
 notify({channel:'screenshot-history-changed',operationId:'burst-shot'});
 notify({channel:'remote-result',result:{operationId:'burst-top-save',kind:'save',state:'pending'}});
});
const liveShot=page.locator('[data-operation="burst-shot"]'),liveSave=page.locator('[data-operation="burst-top-save"]');
await liveShot.getByText('Pending verification',{exact:true}).waitFor();
await liveSave.getByText('Saving…',{exact:true}).waitFor();
const liveMs=Date.now()-started;
const batches=await page.evaluate(()=>window.historyRequests.map(params=>params.operationIds?.length??0));
assert.deepEqual(batches,[64,64,4]);
const focusedControl=liveSave.getByText('More',{exact:true});
await focusedControl.focus();
await page.evaluate(async()=>{
 const {seedLiveHistory:seed,fixtureNotify:notify}=window;
 await seed('burst-top-save','save','verified');await seed('burst-shot','screenshot-to-cloud','blocked');
 notify({channel:'remote-result',result:{operationId:'burst-top-save',kind:'save',state:'verified'}});
 notify({channel:'screenshot-history-changed',operationId:'burst-shot'});
});
await liveSave.getByText('Saved and verified',{exact:true}).waitFor();
await liveShot.getByText('Delivery blocked',{exact:true}).waitFor();
assert.equal(await focusedControl.evaluate(element=>document.activeElement===element),true);
assert.equal(await page.locator('.history-preview img').count(),0);
results.push({gate:'B05/B07-open-History-burst-with-2301-prior-rows',state:'PASS',batches,fixtureElapsedMs:liveMs});

await page.getByRole('button',{name:'File Explorer',exact:true}).click();
await page.evaluate(async()=>{await window.seedLiveHistory('closed-save','save','failed');await window.seedLiveHistory('closed-shot','screenshot-to-cloud','blocked');});
await page.getByRole('button',{name:'History',exact:true}).click();
await page.locator('[data-operation="closed-save"]').getByText('Not saved',{exact:true}).waitFor();
await page.locator('[data-operation="closed-shot"]').getByText('Delivery blocked',{exact:true}).waitFor();
results.push({gate:'B06-closed-History-reconciles-both-operation-types-on-reopen',state:'PASS'});
assert.deepEqual(errors,[]);
}catch(e){try{const p=context.pages().at(-1);await writeFile(join(out,'failure-dom.html'),await p.content());await writeFile(join(out,'failure-debug.json'),JSON.stringify(await p.evaluate(()=>({previews:[...document.querySelectorAll('[data-preview]')].map(el=>({text:el.textContent,rect:el.getBoundingClientRect().toJSON()})),calls:window.productFixture?.calls,settings:document.querySelector('.history-page')?.innerText})),null,2));}catch{}results.push({gate:'browser-acceptance',state:'FAIL',message:e.message,stack:e.stack});process.exitCode=1;}finally{await context?.close();if(server)await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true});await writeFile(join(out,'results.json'),JSON.stringify({evidenceClass:'REAL_CHROMIUM_APP_API_IDB_WITH_FIXTURE_PROVIDER_NOT_LIVE',results,errors},null,2));console.log(JSON.stringify(results,null,2));}
