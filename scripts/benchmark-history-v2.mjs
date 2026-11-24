import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {cpus,tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {chromium} from 'playwright-core';

const extension = resolve('dist/click2cloud');
const out = resolve(process.env.C2C_HISTORY_V2_EVIDENCE ?? 'work/history-v2');
const profile = await mkdtemp(join(tmpdir(),'redown-history-benchmark-'));
const id = 'ajppphdiamdobknpamcheohmdbdbeoal';
const count = Number(process.env.C2C_HISTORY_V2_COUNT ?? 100_000);
const retention=process.env.C2C_HISTORY_V2_RETENTION==='1';
let context;
const {BUILD_INFO}=await import('../dist/click2cloud/src/build-info.mjs');
const report = {result:'FAIL',build:BUILD_INFO,platform:process.platform,cpu:cpus()[0]?.model, proof:'UNPACKED_CHROMIUM_WITH_SYNTHETIC_INDEXEDDB_DATA', count,retention};
await mkdir(out,{recursive:true});
try {
  context = await chromium.launchPersistentContext(profile,{
    executablePath:process.env.C2C_CHROME_EXECUTABLE ?? '/usr/bin/chromium',headless:true,acceptDownloads:true,
    ignoreDefaultArgs:['--disable-extensions'],args:['--no-sandbox','--enable-unsafe-extension-debugging',
      `--disable-extensions-except=${extension}`,`--load-extension=${extension}`]
  });
  report.browser=context.browser().version();
  const browserSession = await context.browser().newBrowserCDPSession();
  const extensions = await context.newPage();
  await extensions.goto('chrome://extensions/');
  if (!await extensions.locator('extensions-item#'+id).count()) await browserSession.send('Extensions.loadUnpacked',{path:extension});
  await extensions.locator('extensions-item#'+id).waitFor();
  report.version = await extensions.locator('extensions-item#'+id).evaluate(node=>node.data.version);
  assert.equal(report.version,'0.3.26');
  const page=await context.newPage();
  await page.goto(`chrome-extension://${id}/extension/app.html`);
  const download=retention?null:page.waitForEvent('download',{timeout:600_000});
  void download?.catch(()=>{});
  report.metrics = await page.evaluate(async ({count,retention})=>{
    const {createHistoryStore}=await import('/src/queue/store.mjs');
    const {downloadHistoryExport}=await import('/src/queue/export.mjs');
    const store=createHistoryStore({database:'history-benchmark'});
    const started=performance.now();
    for(let offset=0;offset<count;offset+=500){
      const rows=Array.from({length:Math.min(500,count-offset)},(_,index)=>{
        const i=offset+index, t=1700000000000+Math.floor(i/4)*60000;
        return {schemaVersion:1,recordId:'synthetic:'+String(i).padStart(7,'0'),attemptId:String(i),
          terminal:true,sortAt:t,terminalAt:t,updatedAt:t,requestedAt:t-1000,
          provider:i%7?['cloudflare','google','onedrive','dropbox'][i%4]:'cloudflare',
          kind:i%7?'save':'screenshot',status:['verified','uploaded','failed','uncertain','blocked'][i%5],
          proofLevel:i%5===0?'provider-object-receipt':null,
          filename:'object-'+i%100+'.png',sourceUrl:i%3?'https://example.com/file?token=secret-fixture':null,
          destination:{bucket:'fixture',key:'folder/object-'+i%100+'.png'}};
      });
      await store.reconcile(rows);
    }
    const seedMs=performance.now()-started,storage=await navigator.storage.estimate();
    if(retention){
      const clock=1700000000000;
      await store.setPolicy({cap:count},{confirmed:true});
      const next={schemaVersion:1,recordId:'rollover',terminal:true,sortAt:clock+count*60000,kind:'save'};
      const begin=performance.now();
      await store.reconcile([next]);
      const last=await store.page({page:Math.ceil(count/25)});
      if(last.total!==count||last.items.at(-1).recordId!=='synthetic:0000001')throw Error('ROLLOVER_FAILED');
      const rolloverMs=performance.now()-begin,clearStart=performance.now();
      const cleared=await store.clear({confirmed:true}),clearMs=performance.now()-clearStart;
      await store.close();
      await store.reconcile([next,{...next,recordId:'synthetic:0000000'},{...next,recordId:'post-clear'}]);
      if(await store.count()!==1||cleared!==count)throw Error('CLEAR_REPLAY_FAILED');
      await store.close();
      return {seedMs,storage,rolloverMs,clearMs,cleared,postClearFresh:1};
    }
    const timings=[];
    const middle=Math.max(1,Math.ceil(count/50)),last=Math.max(1,Math.ceil(count/25));
    for(const input of [1,middle,last,1,last,middle,middle,middle,middle,middle]){
      const before=performance.now();
      const result=await store.page({page:input});
      if(result.total!==count||result.items.length>25) throw Error('PAGE_MISMATCH');
      for(const [offset,row] of result.items.entries()){
        const expected=count-(input-1)*25-offset-1;
        if(row.recordId!=='synthetic:'+String(expected).padStart(7,'0')) throw Error('PAGE_ORDER_MISMATCH');
      }
      timings.push({page:input,ms:performance.now()-before});
    }
    const before=performance.now(),heapBefore=performance.memory?.usedJSHeapSize;
    let heapPeak=heapBefore,concurrent;
    const result=await downloadHistoryExport(store,{onProgress(){
      heapPeak=Math.max(heapPeak,performance.memory?.usedJSHeapSize);
      concurrent??=store.reconcile([{schemaVersion:1,recordId:'arrived-during-export',terminal:true,
        sortAt:1700000000000+count*60000,kind:'save'}]);
    }});
    await concurrent;
    if(await store.count()!==count+(count?1:0))throw Error('CONCURRENT_BOUNDARY_FAILED');
    await store.close();
    const sorted=timings.map(timing=>timing.ms).sort((a,b)=>a-b);
    return {...result,seedMs,storage,timings,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],
      exportMs:performance.now()-before,heapBefore,heapPeak,concurrentWriteExcluded:count>0};
  },{count,retention});
  if(!retention){
    const zip=join(out,`history-${count}.zip`);
    await (await download).saveAs(zip);
    report.integrity=JSON.parse(execFileSync('python3',['scripts/verify-history-v2-zip.py',zip,String(count)],{encoding:'utf8'}));
    assert.equal(report.metrics.total,count);
  }
  report.result='PASS';
} catch(error) {
  report.error=error.stack;
  process.exitCode=1;
} finally {
  await context?.close();
  await rm(profile,{recursive:true,force:true});
  await writeFile(join(out,'benchmark-'+count+'.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
