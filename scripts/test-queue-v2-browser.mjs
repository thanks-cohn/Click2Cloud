import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {extname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const root=fileURLToPath(new URL('../',import.meta.url));
const profile=await mkdtemp(join(tmpdir(),'c2c-queue-v2-browser-'));
const server=createServer(async (request,response)=>{
  const url=new URL(request.url,'http://fixture');
  const file=resolve(root,'.'+(url.pathname==='/'?'/extension/app.html':url.pathname));
  if(!file.startsWith(root)||!['extension/','src/','right2cloud-module/','tests/'].some(dir=>file.startsWith(root+dir)))return response.writeHead(404).end();
  const mime={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png'};
  try{const bytes=await readFile(file);response.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'}).end(bytes);}
  catch{response.writeHead(404).end();}
});
let context;
const checks=[];
try {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  context=await chromium.launchPersistentContext(profile,{executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox'],viewport:{width:1000,height:900}});
  const page=await context.newPage();
  const mode=process.argv[2]??'ui';
  if(mode==='--benchmark'||mode==='--retention-scale'||mode==='--contracts') {
    await page.goto(origin+'/extension/app.html');
    const result=await page.evaluate(async mode=>{
      const assert=(value,message)=>{if(!value)throw Error(message);};
      const {createHistoryArchive,archiveBatch,cleanupMs}=await import('/src/history-v2/archive.mjs');
      const {createLiveJobs}=await import('/src/history-v2/jobs.mjs');
      const {createHistoryCoordinator}=await import('/src/history-v2/coordinator.mjs');
      const now=1795564800000;
      const archive=createHistoryArchive({now:()=>now}), jobs=createLiveJobs();
      const step=mode==='--benchmark'?20*60000:60000;
      const start=mode==='--benchmark'?now-100000*step:now-365*86400000;
      const fixture=i=>({schemaVersion:1,recordId:'fixture:'+i,attemptId:'attempt-'+i,observedAt:start+i*step,orderAt:start+i*step,terminalAt:start+i*step,
        kind:i%7===0?'screenshot-save':'save',filename:`file-${i%300}.png`,provider:['cloudflare','google-drive','dropbox','onedrive'][i%4],
        status:['verified','uploaded','failed','uncertain','blocked'][i%5],destination:{bucket:'fixture',key:`pictures/file-${i%300}.png`},sourceUrl:null,
        verification:null,capabilities:{open:false,preview:false,retry:false}});
      const count=mode==='--benchmark'?100000:mode==='--retention-scale'?200000:27;
      const started=performance.now(),before=(await navigator.storage.estimate()).usage;
      if(mode==='--retention-scale')await archive.setPolicy({limit:200000,approved:true,expectedCount:0});
      for(let first=0;first<count;first+=archiveBatch)await archive.upsert(Array.from({length:Math.min(archiveBatch,count-first)},(_,offset)=>fixture(first+offset)));
      const seedMs=performance.now()-started;
      const databaseEstimate=(await navigator.storage.estimate()).usage-before;
      if(mode==='--benchmark') {
        const times=[];
        for(const num of [1,2,1000,1500,2000,2001,2400,3999,4000,1,4000,2000,2377]) {
          const start=performance.now(),page=await archive.page({page:num});times.push(performance.now()-start);
          assert(page.count===count&&page.pages===4000,'exact counts');
          assert(page.items.length===25&&page.items.every((row,j)=>row.recordId==='fixture:'+(count-(num-1)*25-1-j)),'deep page continuity');
        }
        const binaryBytes=new TextEncoder().encode(JSON.stringify((await archive.page({page:2000})).items)).length;
        let seen=0;
        const snapshot=await archive.snapshot({},async ({records,count})=>{
          for await(const row of records){assert(row.recordId==='fixture:'+(count-1-seen),'full snapshot ordering');seen++;}
          return count;
        });
        assert(snapshot===count&&seen===count,'complete snapshot');
        const ordered=times.toSorted((a,b)=>a-b);
        return {count,seedMs,databaseEstimate,binaryBytes,seekMs:times,p95Ms:ordered[Math.ceil(times.length*.95)-1],scannedSnapshot:seen,spanDays:Math.round((count-1)*step/86400000)};
      }
      if(mode==='--retention-scale') {
        assert((await archive.status()).count===200000,'cap initially full');
        await archive.upsert([fixture(count)]);
        assert((await archive.status()).count===200000,'real rollover at 200001');
        const oldest=(await archive.page({page:8000})).items.at(-1);
        assert(oldest.recordId==='fixture:1','oldest evicted');
        await archive.setPolicy({limit:null});await archive.upsert([fixture(0)]);
        assert((await archive.status()).count===200000,'eviction replay suppressed after Unlimited');
        const purge=performance.now();await archive.clear({approved:true,expectedCount:200000});
        assert((await archive.status()).count===0,'bounded clear');
        await archive.upsert([fixture(17),fixture(count+1)]);
        assert((await archive.status()).count===1,'clear reimport suppressed, new ID retained');
        return {count,seedMs,databaseEstimate,rolloverOldest:oldest.recordId,clearMs:performance.now()-purge};
      }
      // Current production APIs, with fault injection at the durable archive boundary.
      const terminal={kind:'save',operationId:'accounting-pending',at:now-400,updatedAt:now-100,state:'verified',proofKind:'test-readback',receipt:{key:'confirmed.png',size:4}};
      const source={async readQueueReceiptPage(){return {items:[terminal],cursor:null};}};
      const fault={...archive,async upsert(){throw new DOMException('Fixture quota','QuotaExceededError');}};
      const failed=createHistoryCoordinator({source,archive:fault,jobs,changed(){},unavailable(){}});
      await failed.reconcile();failed.close();
      assert((await jobs.page()).items.some(job=>job.accountingPending&&job.status==='verified'),'accounting failure never fabricates cloud failure');
      const resumed=createHistoryCoordinator({source,archive,jobs,changed(){},unavailable(){}});
      await resumed.reconcile();resumed.close();
      assert((await jobs.page()).total===0,'job clears after archive accepts');
      const state=await archive.status();assert(state.count===28,'after recovery');
      await archive.snapshot({from:fixture(5).orderAt,to:fixture(12).orderAt+1,includeScreenshots:false},async ({records,count})=>{
        const ids=[];for await(const record of records)ids.push(record.recordId);
        assert(count===7&&ids.join(',')==='fixture:12,fixture:11,fixture:10,fixture:9,fixture:8,fixture:6,fixture:5','indexed range and screenshot filtering');
      });
      assert((await archive.page({queue:true})).count===1,'Hide filters before count');
      await archive.setPolicy({cleanup:'off'});assert((await archive.page({queue:true})).count===28,'OFF reveals records');
      await archive.setPolicy({cleanup:'delete',approved:true});
      assert((await archive.status()).count===28,'Delete is nonretroactive');
      await archive.setPolicy({limit:3,approved:true,expectedCount:28});
      assert((await archive.status()).count===3,'cap lowering');
      const reopened=createHistoryArchive({now:()=>now+cleanupMs+10});
      await reopened.upsert([fixture(0),{...fixture(28),orderAt:now+1,observedAt:now+1,terminalAt:now+1}]);
      await reopened.maintain();assert((await archive.status()).count===2,'restart Delete with replay exclusion');
      let pending;
      await archive.snapshot({},async ({records,count})=>{
        pending=reopened.upsert([fixture(29)]);
        let read=0;for await(const row of records)if(row)read++;
        assert(read===count&&count===2,'snapshot lock holds while another instance writes');
      });
      await pending;
      const interruption=createHistoryArchive({name:'history-purge-interruption'});
      for(let first=0;first<384;first+=archiveBatch)await interruption.upsert(Array.from({length:archiveBatch},(_,i)=>fixture(first+i)));
      const remove=IDBObjectStore.prototype.delete;
      IDBObjectStore.prototype.delete=function(key){
        if(this.name==='records'&&key==='fixture:128')throw new DOMException('Injected quota','QuotaExceededError');
        return remove.call(this,key);
      };
      let interrupted=false;
      try{await interruption.clear({approved:true,expectedCount:384});}catch(error){interrupted=error.name==='QuotaExceededError';}
      finally{IDBObjectStore.prototype.delete=remove;}
      const partial=await interruption.status();
      assert(interrupted&&partial.clearing&&partial.count===256,'interrupted purge leaves durable progress and rolls back open batch');
      const recovery=createHistoryArchive({name:'history-purge-interruption'});
      await recovery.maintain();
      await recovery.upsert([fixture(128),fixture(384)]);
      const recovered=await recovery.status();
      assert(!recovered.clearing&&recovered.count===1,'resumed purge suppresses old receipt and accepts fresh save');
      return {count,status:await archive.status(),checks:['snapshot date and screenshot filters','interrupted purge, rollback and restart','quota and restart recovery','hide and off','nonretroactive Delete','cap lowering','delete replay','cross-instance export lock']};
    },mode);
    console.log(JSON.stringify({result:'PASS',mode,evidence:'Chromium IndexedDB with deterministic metadata',browser:context.browser().version(),...result},null,2));
  } else {
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      const listeners=[], changes=[];
      const data=()=>JSON.parse(localStorage.getItem('fixture-chrome-storage')??'{}');
      globalThis.chrome={runtime:{id:'fixture',onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:async message=>
        (await import('/tests/product-browser-host.mjs')).invoke({version:message.version,method:message.method,params:message.params})},
        storage:{local:{get:async key=>typeof key==='string'?{[key]:data()[key]}:data(),set:async values=>{
          const old=data();localStorage.setItem('fixture-chrome-storage',JSON.stringify({...old,...values}));
          changes.forEach(fn=>fn(Object.fromEntries(Object.entries(values).map(([k,v])=>[k,{oldValue:old[k],newValue:v}])),'local'));
        }},onChanged:{addListener:fn=>changes.push(fn)}}};
      window.fixtureNotify=message=>listeners.forEach(fn=>fn(message,{id:'fixture'}));
    });
    await page.goto(origin+'/extension/app.html');
    await page.waitForFunction(()=>window.productFixture);
    const top=()=>page.locator('header nav > button').allTextContents();
    assert.deepEqual(await top(),['Files','Remotes','Queue','Settings']);
    const login=page.locator('.remote-provider-card #login');await login.waitFor();
    const card=await page.locator('.remote-provider-card').boundingBox(),button=await login.boundingBox();
    assert(button.x>card.x+card.width/2&&button.y-card.y>=8);
    checks.push('default navigation and padded top-right Log in');
    const openMore=()=>page.locator('#header-more').click();
    await openMore();await page.getByRole('menuitem',{name:'History',exact:true}).waitFor();assert.equal(await page.locator('#header-menu [data-view=downloads]').count(),0);
    await page.keyboard.press('Escape');
    await page.evaluate(async()=>{
      const {current}=window.productFixture;
      for(let i=0;i<73;i++)await current.recordRemoteResult({operationId:`owner-${i}`,state:'failed',attemptedFilename:`file-${i}.txt`,code:'HTTP_403'});
      for(let i=0;i<14;i++)await current.recordRemoteResult({operationId:`working-${i}`,state:'pending',attemptedFilename:`job-${i}.dat`});
    });
    await page.locator('header [data-view=queue]').click();await page.getByRole('heading',{name:'Live Jobs',exact:true}).waitFor();
    await page.getByText('73 saves in this view',{exact:true}).waitFor();
    assert.equal(await page.locator('.queue-job-row').count(),10);
    await page.getByRole('button',{name:'Working 14',exact:true}).click();
    await page.locator('.queue-job-scroll').evaluate(el=>{el.scrollTop=500;});
    await page.getByText('job-0.dat',{exact:true}).waitFor();
    const pageNumber=page.getByRole('textbox',{name:'Page number'});
    await pageNumber.fill('3');await pageNumber.press('Enter');
    await page.waitForFunction(()=>document.querySelectorAll('.history-v2-record').length===23);
    assert.equal(await pageNumber.inputValue(),'3');
    await page.getByRole('button',{name:'First page',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.history-v2-record').length===25);
    await page.getByRole('button',{name:'Last page',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.history-v2-record').length===23);
    await pageNumber.fill('9');await pageNumber.press('Enter');assert.equal(await pageNumber.getAttribute('aria-invalid'),'true');
    await page.getByRole('button',{name:'Export Complete History ZIP',exact:true}).waitFor();
    checks.push('durable owner backfill, counts, 10 initial jobs, virtual scroll, numeric jumps and First/Last');
    await page.locator('header [data-view=settings]').click();
    await page.locator('[data-cleanup]').waitFor();
    assert(await page.locator('[data-export-settings]').isHidden());
    await page.locator('[data-cleanup]').selectOption('off');
    await page.getByRole('heading',{name:'Export Queue History',exact:true}).waitFor();
    await page.locator('[data-presentation] [name=layout]').selectOption('compact');await page.getByRole('button',{name:'Save Queue preferences'}).click();
    await page.getByText('Queue preferences saved.',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fixture-chrome-storage')).queueHistoryPresentationV1.layout),'compact');
    await page.locator('[data-pin-route=history]').check();await page.locator('nav > [data-view=history]').waitFor();
    await page.locator('[data-pin-route=settings]').uncheck();await page.locator('#header-menu [data-view=settings]').waitFor({state:'attached'});
    await page.getByRole('button',{name:'Reset to Defaults'}).click();
    await page.locator('nav > [data-view=settings]').waitFor();
    for(const theme of ['standard','minimal','golden-age','oceania','nostalgia']){
      await page.locator('#appearance').selectOption(theme);
      assert.equal(await page.locator('#settings-recovery').isVisible(),theme==='standard');
      assert.equal(await page.locator('#settings-whole-cloud').isVisible(),theme==='standard');
    }
    await page.locator('#debug-mode').check();
    await page.setViewportSize({width:290,height:850});
    await openMore();await page.getByRole('menuitem',{name:'Help · Diagnose',exact:true}).waitFor();
    assert.equal(await page.locator('#header-menu [data-view=downloads]').count(),0);
    await page.keyboard.press('Escape');
    await page.reload();await page.waitForFunction(()=>window.productFixture);
    await openMore();await page.getByRole('menuitem',{name:'Settings',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-presentation] [name=layout]')?.value==='compact'&&document.querySelector('[data-cleanup]')?.value==='off');
    checks.push('Settings persistence, separate pin controls, reset, all themes and narrow Debug More exclusion');
    await page.setViewportSize({width:1000,height:900});
    await page.evaluate(async bytes=>{
      const fixture=window.productFixture;
      await fixture.oauth.connect();fixture.setReady('fixture-bucket');
      const destination={provider:'cloudflare-r2',accountId:fixture.target.accountId,connectionId:fixture.target.connectionId,bucketName:'fixture-bucket',prefix:''};
      window.fixtureImageData={};
      for(const name of ['queue-preview-1.png','queue-preview-2.png']){
        window.fixtureImageData[name]=bytes;
        fixture.r2Objects.set('fixture-bucket:'+name,{bucketName:'fixture-bucket',key:name,displayName:name,size:bytes.length,etag:'fixture-preview'});
        await fixture.current.recordRemoteResult({operationId:name,kind:'save',state:'verified',proofKind:'independent-head-version-size',destination,
          historyContext:{sourceURL:'https://fixture.invalid/asset?sig=SECRET'},receipt:{key:name,size:bytes.length,etag:'fixture-preview',version:'fixture',destination}});
        window.fixtureNotify({channel:'remote-result',result:{operationId:name,kind:'save',state:'pending'}});
      }
    },Array.from(await readFile(join(root,'tests/fixtures/images/picture.png'))));
    await page.locator('header [data-view=queue]').click();
    await page.getByText('75 saves in this view',{exact:true}).waitFor();
    assert.equal(await page.locator('.history-v2 [data-history-fields]').count(),0);
    const picture=page.locator('.history-v2-record').filter({hasText:'queue-preview-1.png'});
    await picture.getByRole('button',{name:'Open image viewer'}).click();
    await page.locator('.history-v2-gallery img').waitFor();
    await page.getByRole('button',{name:'Zoom in',exact:true}).click();
    await page.keyboard.press('ArrowLeft');
    await page.getByRole('heading',{name:'queue-preview-2.png',exact:true}).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await picture.getByRole('button',{name:'Open image viewer'}).evaluate(node=>node===document.activeElement),true);
    checks.push('Compact hides details, authorized image reader, viewer zoom, keyboard gallery and focus return');
    await page.locator('header [data-view=settings]').click();
    await page.getByRole('button',{name:'Clear All History V2',exact:true}).click();
    const clearDialog=page.getByRole('dialog',{name:'Clear All History V2',exact:true});
    assert.match(await clearDialog.innerText(),/75 locally retained/);
    const erase=clearDialog.getByRole('button',{name:'Permanently clear V2 History'});
    assert(await erase.isDisabled());
    await clearDialog.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByRole('button',{name:'Clear All History V2',exact:true}).click();
    await clearDialog.getByRole('checkbox').check();await erase.click();
    await page.getByText('History V2 cleared.',{exact:true}).waitFor();
    const standalone=await page.evaluate(async()=>{
      const {mountLiveJobs}=await import('/extension/live-jobs-view.mjs'),{mountHistoryV2}=await import('/extension/history-v2-view.mjs');
      const {createLiveJobs}=await import('/src/history-v2/jobs.mjs'),{createHistoryArchive}=await import('/src/history-v2/archive.mjs');
      const parent=document.createElement('div');document.body.append(parent);const subscribe=()=>()=>{};
      const stopJobs=mountLiveJobs(parent,{jobs:createLiveJobs(),subscribe,openRemotes(){}});
      const jobsOnly=!!parent.querySelector('.queue-jobs')&&!parent.querySelector('.history-v2');stopJobs();
      const stopHistory=mountHistoryV2(parent,{archive:createHistoryArchive(),subscribe,preferences:()=>({range:'all',layout:'full',previews:'closed',timezone:'UTC'})});
      const historyOnly=!!parent.querySelector('.history-v2')&&!parent.querySelector('.queue-jobs');stopHistory();parent.remove();
      return [jobsOnly,historyOnly,(await createHistoryArchive().status()).count,(await window.productFixture.current.readRemoteResultsById(['owner-2']))[0]?.operationId];
    });
    assert.deepEqual(standalone,[true,true,0,'owner-2']);
    checks.push('guarded Clear cancellation, explicit confirmation, independent mounts and legacy preservation');
    const rolloverLabel=await page.evaluate(async()=>{
      const {mountHistoryV2}=await import('/extension/history-v2-view.mjs');
      const {createHistoryArchive}=await import('/src/history-v2/archive.mjs');
      const archive=createHistoryArchive({name:'calendar-rollover-fixture'}), now=Date.now;
      let simulated=Date.parse('2026-11-24T23:59:00Z'),notify;
      await archive.upsert([{schemaVersion:1,recordId:'day-boundary',observedAt:simulated,orderAt:simulated,terminalAt:simulated,
        kind:'save',filename:'day-boundary.txt',provider:'cloudflare',status:'uploaded',capabilities:{}}]);
      Date.now=()=>simulated;
      const parent=document.createElement('div');document.body.append(parent);
      const stop=mountHistoryV2(parent,{archive,subscribe:listener=>{notify=listener;return ()=>{};},
        preferences:()=>({range:'all',layout:'compact',previews:'closed',timezone:'UTC'})});
      const label=async expected=>{
        for(let n=0;n<30;n++){
          if(parent.querySelector('.history-v2-group > summary')?.textContent===expected)return true;
          await new Promise(resolve=>setTimeout(resolve,25));
        }
        return false;
      };
      try {
        const today=await label('Today');simulated+=120000;notify('expiry');
        return [today,await label('Earlier This Week')];
      }finally{stop();parent.remove();Date.now=now;}
    });
    assert.deepEqual(rolloverLabel,[true,true]);
    checks.push('calendar groups refresh across local midnight without archive changes');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'PASS',evidence:'Chromium UI and real IndexedDB; simulated Chrome extension and provider transport',browser:context.browser().version(),checks},null,2));
  }
} catch(error) {
  console.log(JSON.stringify({result:'FAIL',checks,error:error.stack},null,2));process.exitCode=1;
} finally {await context?.close();server.close();await rm(profile,{recursive:true,force:true});}
