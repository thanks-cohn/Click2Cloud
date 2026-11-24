import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,rm,stat,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';

const root = fileURLToPath(new URL('../',import.meta.url));
const extension = join(root,'dist/click2cloud');
const profile = await mkdtemp(join(tmpdir(),'click2cloud-queue-zip-'));
const target = resolve(process.env.C2C_QUEUE_EVIDENCE_DIR??join(profile,'downloads'));
await mkdir(target,{recursive:true});
let browser, server;
const fixtureTransport=process.argv.includes('--fixture');
try {
  browser = await chromium.launchPersistentContext(join(profile,'profile'),{
    executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,
    ignoreDefaultArgs:['--disable-extensions'],args:['--no-sandbox','--enable-unsafe-extension-debugging',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]
  });
  const cdp = await browser.browser().newBrowserCDPSession();
  await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:target,eventsEnabled:true});
  const page = await browser.newPage();
  if(fixtureTransport) {
    let resolveDownload;
    const downloadCompleted=new Promise(resolve=>{resolveDownload=resolve;});
    cdp.on('Browser.downloadProgress',event=>{if(event.state!=='inProgress')resolveDownload(event.state);});
    await page.exposeFunction('fixtureDownloadCompleted',()=>Promise.race([downloadCompleted,new Promise(resolve=>setTimeout(()=>resolve('timed out'),12000))]));
    server=createServer(async(request,response)=>{
      const path=new URL(request.url,'http://localhost').pathname;
      if(path==='/')return response.end('<!doctype html><title>History ZIP fixture</title>');
      if(!['/extension/history-v2-download.mjs','/src/history-v2/zip.mjs'].includes(path))return response.writeHead(404).end();
      response.writeHead(200,{'Content-Type':'text/javascript'}).end(await readFile(join(extension,path)));
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
  } else {
    if(!browser.serviceWorkers().length) await cdp.send('Extensions.loadUnpacked',{path:extension});
    await page.goto('chrome-extension://ajppphdiamdobknpamcheohmdbdbeoal/extension/app.html');
  }
  const count = Number(process.env.C2C_QUEUE_ZIP_RECORDS??100000);
  const result = await page.evaluate(async ({count,fixtureTransport}) => {
    const {downloadHistoryZip} = await import('/extension/history-v2-download.mjs');
    const wait = request => new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const complete = tx => new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
    const opening = indexedDB.open('queue-zip-feasibility-fixture',1);
    opening.onupgradeneeded = () => opening.result.createObjectStore('records',{keyPath:'orderAt'});
    const db = await wait(opening);
    const offset = 1795564800000;
    const seedStarted = performance.now();
    for(let first=0;first<count;first+=512) {
      const tx=db.transaction('records','readwrite'),finished=complete(tx),store=tx.objectStore('records');
      for(let n=first;n<Math.min(first+512,count);n++) store.put({schemaVersion:1,recordId:'fixture:'+n,attemptId:'a-'+n,
        orderAt:offset+n,terminalAt:offset+n,provider:['cloudflare','google-drive','dropbox','onedrive'][n%4],
        kind:n%7===0?'screenshot-save':'save',status:['verified','uploaded','failed','blocked','uncertain'][n%5],
        verification:{level:n%5===0?'readback':'none'},filename:`fixture-${n%1000}.png`,size:n%83111,
        destination:{label:'Synthetic / Examples',key:`examples/fixture-${n%1000}.png`},sourceUrl:null,hostUrl:null,remoteUrl:null});
      await finished;
    }
    const seedMs = performance.now()-seedStarted;
    let batchBytes=0, maxBatch=0;
    async function* snapshot() {
      let upper;
      for(;;) {
        const tx=db.transaction('records'),finished=complete(tx),rows=[];
        const request=tx.objectStore('records').openCursor(upper===undefined?null:IDBKeyRange.upperBound(upper,true),'prev');
        request.onsuccess=()=>{const c=request.result;if(c){rows.push(c.value);if(rows.length<128)c.continue();}};
        await finished;
        if(!rows.length)break;
        upper=rows.at(-1).orderAt;
        batchBytes=Math.max(batchBytes,new TextEncoder().encode(JSON.stringify(rows)).length);
        maxBatch=Math.max(maxBatch,rows.length);
        yield* rows;
      }
    }
    const usage = await navigator.storage.estimate();
    const started = performance.now();
    const downloads=fixtureTransport?{
      onChanged:{addListener(){},removeListener(){}},
      async download({url,filename}) {const link=document.createElement('a');link.href=url;link.download=filename;link.click();const state=await fixtureDownloadCompleted();if(state!=='completed')throw Error('Web download '+state);return 0;},
      async search(){return [{state:'complete'}];}
    }:chrome.downloads;
    const result = await downloadHistoryZip(snapshot(),{expectedRecords:count,createdAt:new Date().toISOString(),selection:{range:'all',timezone:'UTC'},sourceCoverage:{fixture:'deterministic'}},{downloads});
    const [download] = await downloads.search({id:result.downloadId});
    return {...result,path:download.filename,state:download.state,seedMs,exportMs:performance.now()-started,
      maxBatch,batchBytes,estimatedOriginUsage:usage.usage};
  },{count,fixtureTransport});
  assert.equal(result.state,'complete');
  result.path??=join(target,'click2cloud-history-v2.zip');
  for(let i=0;i<100;i++) {
    if(await stat(result.path).then(file=>file.size===result.archiveBytes,()=>false))break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.equal((await stat(result.path)).size,result.archiveBytes);
  const verification = execFileSync('python3',[join(root,'scripts/verify-history-v2-zip.py'),result.path,String(count)],{encoding:'utf8'});
  console.log(JSON.stringify({result:'PASS',transport:fixtureTransport?'Chromium OPFS and web download with simulated extension receipt':'unpacked extension chrome.downloads',browser:browser.browser().version(),fixture:'index sequence 0 through n-1',...result,verification:JSON.parse(verification)},null,2));
} catch(error) {
  const blocked=/disabled by (?:the )?administrator|ERR_BLOCKED_BY_CLIENT/i.test(error.message);
  console.log(JSON.stringify({result:blocked?'BLOCKED':'FAIL',browser:browser?.browser()?.version(),error:error.message}));
  process.exitCode=blocked?2:1;
} finally {
  server?.close();
  await browser?.close();
  await rm(profile,{recursive:true,force:true});
}
