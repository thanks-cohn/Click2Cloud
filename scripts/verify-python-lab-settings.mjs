// Real Chromium DOM and product Settings card, with a Chrome message fixture.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
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
  const types={'/extension/app.css':'text/css','/extension/python-lab-settings.mjs':'text/javascript'};
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
  let data={state:'OFF'};
  const runtime={sendMessage:async({channel,action,input})=>{
   calls.push({channel,action,input});
   const result=value=>({ok:true,data:value});
   if(action==='status')return result(data);
   if(action==='accounts')return result({accounts:[{id:'owned-account',name:'QA fixture'}]});
   if(action==='buckets')return result({buckets:[{name:'existing-qa'}],cursor:''});
   if(action==='start'){
    data={state:'PAIRING',ready:true,bucketName:'existing-qa',mode:'read-write',prefix:'.redown-python-lab/fixture/',
     pairCode:'0000111122223333',codeExpiresAt:Date.now()+120000,expiresAt:Date.now()+1800000};
    return result(data);
   }
   if(action==='end'){data={state:'OFF',code:'LAB_SESSION_ENDED'};return result(data);}
   return {ok:false,code:'UNEXPECTED_FIXTURE_REQUEST'};
  }};
  const permissions={request:async request=>{grants.push(request);return true;}};
  window.chrome={runtime,permissions};
  window.labFixture={calls,grants,connect:()=>{data={...data,state:'CONNECTED',pairCode:null};}};
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
