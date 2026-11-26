// Real Chromium DOM and product Settings card, with a Chrome message fixture.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {join,resolve} from 'node:path';
import {chromium} from 'playwright-core';

const out=resolve('lab-local','verification','settings-'+randomUUID());
await mkdir(out,{recursive:true});
const report={evidenceClass:'browser-rendered-settings-with-chrome-message-fixture',checks:[]};
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/'){
   res.setHeader('Content-Type','text/html');
   res.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>Settings fixture</title>'+
    '<link rel="stylesheet" href="/extension/app.css"><main class="page"><h1>Settings</h1></main>'+
    '<script type="module">import {mountPythonLabSettings} from "/extension/python-lab-settings.mjs";'+
    'mountPythonLabSettings(document.querySelector("main"));</script>');
   return;
  }
  if(req.url==='/opfs-worker.mjs'){
   res.setHeader('Content-Type','text/javascript');
   res.end(`import {labSpoolDirectory,openLabSpool} from '/src/chrome/python-lab/spool.mjs';
     self.addEventListener('message',event=>event.waitUntil((async()=>{
      try{
       const directory=await labSpoolDirectory();
       const data=new TextEncoder().encode(event.data);
       const spool=await openLabSpool(directory,data.length);
       await spool.append(data.subarray(0,3),0);
       await spool.append(data.subarray(3),3);
       const hash=await spool.seal();
       const value=await (await spool.file()).text();
       await spool.close();
       const retained=[];
       for await(const name of directory.keys())retained.push(name);
       event.ports[0].postMessage({hash,value,retained});
      }catch(error){event.ports[0].postMessage({error:String(error)});}
     })()));`);
   return;
  }
  const types={'/extension/app.css':'text/css','/extension/python-lab-settings.mjs':'text/javascript',
   '/src/chrome/python-lab/spool.mjs':'text/javascript','/src/chrome/python-lab/vendor/sha256.mjs':'text/javascript'};
  if(!Object.hasOwn(types,req.url)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',types[req.url]);res.end(await readFile('.'+req.url));
 }catch{res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 const executablePath=process.env.C2C_CHROME_EXECUTABLE??
  (process.platform==='win32'?join(process.env.ProgramFiles??'C:\\Program Files','Google','Chrome','Application','chrome.exe'):'/usr/bin/chromium');
 browser=await chromium.launch({headless:true,executablePath});
 report.chromium=browser.version();
 const page=await browser.newPage({viewport:{width:365,height:700}});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const calls=[],grants=[];
  let data={state:'OFF'},startCode=null,bucketError=false,empty=false;
  const absentApi={stage:'native-api',code:'NATIVE_API_UNAVAILABLE',
   recovery:'Once REDOWN work is idle, reload REDOWN once from chrome://extensions, reopen Settings and retry.'};
  const runtime={sendMessage:async({channel,action,input})=>{
   calls.push({channel,action,input});
   const result=value=>({ok:true,data:value});
   if(action==='status')return result(data);
   if(action==='accounts')return result({accounts:[{id:'owned-account',name:'QA fixture'}]});
   if(action==='buckets'){
    if(bucketError)return {ok:false,code:'PROVIDER_READ_FAILED'};
    return result({buckets:empty?[]:[{name:'existing-qa'}],cursor:''});
   }
   if(action==='start'){
    if(startCode){data={state:'OFF',code:startCode,nativeApiAvailable:false};return {ok:false,code:startCode};}
    data={state:'PAIRING',ready:true,bucketName:'existing-qa',mode:'read-write',prefix:'.redown-python-lab/fixture/',
     pairCode:'0000111122223333',codeExpiresAt:Date.now()+120000,expiresAt:Date.now()+1800000};
    return result(data);
   }
   if(action==='end'){data={state:'OFF',code:'LAB_SESSION_ENDED'};return result(data);}
   if(action==='preflight')return result({outcome:'BLOCKED',firstFailure:absentApi});
   if(action==='diagnostics')return result({schema:'redown.python-lab.diagnostic-export/1',
    startup:{firstFailure:absentApi},preflight:{firstFailure:absentApi}});
   return {ok:false,code:'UNEXPECTED_FIXTURE_REQUEST'};
  }};
  const permissions={request:async request=>{grants.push(request);return true;}};
  window.chrome={runtime,permissions};
  window.labFixture={calls,grants,connect:()=>{data={...data,state:'CONNECTED',pairCode:null};},
   startError:code=>{startCode=code;},
   bucketResult:value=>{bucketError=value==='error';empty=value==='empty';}};
 });
 await page.goto('http://127.0.0.1:'+server.address().port);
 const card=page.locator('section.card');
 await card.getByRole('heading',{name:'Python Laboratory',exact:true}).waitFor();
 assert.equal(await card.count(),1);
 assert.equal(await card.locator('[data-lab-status]').innerText(),'Off');
 assert.deepEqual(await page.evaluate(()=>window.labFixture.grants),[]);
 assert((await page.evaluate(()=>window.labFixture.calls)).every(item=>item.action==='status'));
 report.checks.push('single card, off by default, no passive permission or provider discovery');
 await card.getByRole('button',{name:'Configure session'}).click();
 const bucket=card.getByLabel('Existing QA bucket');
 await bucket.selectOption('existing-qa');
 await card.getByRole('button',{name:'Start session'}).click();
 await card.getByText('Choose the QA target and approve access first.').waitFor();
 assert.deepEqual(await page.evaluate(()=>window.labFixture.grants),[]);
 await card.getByRole('checkbox',{name:/I approve this bucket/}).check();
 await card.getByRole('button',{name:'Start session'}).click();
 assert.deepEqual(await page.evaluate(()=>window.labFixture.grants),[{permissions:['nativeMessaging']}]);
 const value=await card.getByLabel('Windows CMD from the repository root').inputValue();
 assert.equal(value,'lab-local\\.venv\\Scripts\\redown-lab.exe pair --code 0000111122223333');
 const actions=await page.evaluate(()=>window.labFixture.calls);
 assert.deepEqual(actions.find(item=>item.action==='start').input,
  {accountId:'owned-account',bucketName:'existing-qa',mode:'read-write',minutes:30,scopeId:null});
 report.checks.push('explicit scoped approval and precise Windows pairing command');
 await page.evaluate(()=>window.labFixture.connect());
 await card.getByText('Connected to Python CLI',{exact:true}).waitFor();
 await card.getByRole('button',{name:'End and revoke'}).click();
 await card.getByText('Off',{exact:true}).waitFor();
 assert.equal(await card.getByRole('button',{name:'Copy CMD'}).isVisible(),false);
 assert.deepEqual(errors,[]);
 report.checks.push('paired state, revocation, and no page errors at 365 px');
 await page.evaluate(()=>window.labFixture.bucketResult('error'));
 await card.getByRole('button',{name:'Configure session'}).click();
 await card.getByText(/Could not list QA buckets/).waitFor();
 await page.evaluate(()=>window.labFixture.bucketResult('empty'));
 await card.getByRole('button',{name:'Retry bucket list'}).click();
 await card.getByText('No existing QA buckets found for this account.').waitFor();
 await page.evaluate(()=>window.labFixture.bucketResult('ready'));
 await card.getByRole('button',{name:'Configure session'}).click();
 await bucket.selectOption('existing-qa');
 await page.evaluate(()=>window.labFixture.startError('NATIVE_API_UNAVAILABLE'));
 await card.getByRole('checkbox',{name:/I approve this bucket/}).check();
 await card.getByRole('button',{name:'Start session'}).click();
 await card.locator('[data-lab-session-notice]').getByText(/reload REDOWN once from chrome:\/\/extensions/).waitFor();
 assert.equal(await card.getByRole('button',{name:'Copy CMD'}).isVisible(),false);
 await card.getByRole('button',{name:'Check readiness'}).click();
 await card.locator('[data-lab-preflight-status]').getByText(/native-api.*See Export diagnostics/).waitFor();
 const downloadEvent=page.waitForEvent('download');
 await card.getByRole('button',{name:'Export diagnostics'}).click();
 const download=await downloadEvent;
 assert.equal(download.suggestedFilename(),'redown-python-lab-diagnostics.json');
 const exported=JSON.parse(await readFile(await download.path(),'utf8'));
 assert.equal(exported.startup.firstFailure.code,'NATIVE_API_UNAVAILABLE');
 assert(!JSON.stringify(exported).includes('0000111122223333'));
 assert.deepEqual(errors,[]);
 report.checks.push('bucket error and empty states, retry, reload guidance and JSON export without pairing');
 const valueToStage='REAL CHROMIUM OPFS spool fixture';
 const spool=await page.evaluate(async value=>{
  await navigator.serviceWorker.register('/opfs-worker.mjs',{type:'module'});
  const registration=await navigator.serviceWorker.ready;
  const channel=new MessageChannel();
  const result=new Promise(resolve=>{channel.port1.onmessage=event=>resolve(event.data);});
  registration.active.postMessage(value,[channel.port2]);
  return result;
 },valueToStage);
 assert.deepEqual(spool,{value:valueToStage,hash:createHash('sha256').update(valueToStage).digest('hex'),retained:[]});
 report.checks.push('disk-backed spool, incremental SHA-256, and cleanup in a real Chromium service worker');
 report.state='PASS';
}catch(error){
 report.state='FAIL';report.error=String(error.stack??error);process.exitCode=1;
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
 const evidence=join(out,'results.json');
 await writeFile(evidence,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({...report,evidence},null,2));
}
