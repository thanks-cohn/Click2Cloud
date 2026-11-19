// Actual Destinations Manager DOM and browser IndexedDB with a local provider
// and Chrome-ACK fixture. The workerd test covers the real Worker separately.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {chromium} from 'playwright-core';

const root=fileURLToPath(new URL('..',import.meta.url));
const server=createServer(async(req,res)=>{
 const path=resolve(root,'.'+new URL(req.url,'http://127.0.0.1').pathname);
 const types={mjs:'text/javascript',html:'text/html',css:'text/css'};
 const type=types[path.split('.').at(-1)];
 if(!path.startsWith(root.endsWith(sep)?root:root+sep)||!type){res.writeHead(404).end();return;}
 try{const bytes=await readFile(path);res.writeHead(200,{'Content-Type':type});res.end(bytes);}
 catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));

let browser,page;
try{
 browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true});
 page=await browser.newPage();
 page.setDefaultTimeout(10000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const host=import('/tests/product-browser-host.mjs');
  globalThis.chrome={runtime:{id:'fixture',onMessage:{addListener(){}},sendMessage:async message=>(await host).invoke({version:message.version,method:message.method,params:message.params})}};
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/extension/app.html');
 await page.getByRole('button',{name:'Log in',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Cloudflare connected'));
 await page.getByRole('button',{name:'File Explorer',exact:true}).click();
 const bucket=page.getByRole('treeitem',{name:/fixture-bucket/});
 if(await bucket.getAttribute('aria-selected')!=='true')await bucket.click();
 await page.getByRole('row').filter({hasText:'projects'}).waitFor();
 const results=[];
 const ready=()=>page.getByText('Saved · Ready for right-click',{exact:true}).first().waitFor();
 const check=mode=>page.evaluate(async mode=>{
  const fixture=window.productFixture,{desired,acknowledgedGeneration,pending}=fixture.registrar.inspect();
  const row=desired.rows.find(r=>r.origin.mode===mode&&r.role==='save'&&r.target.bucketName==='fixture-bucket'&&r.target.prefix==='projects/');
  if(!row||pending||acknowledgedGeneration!==desired.generation||row.actionKind!=='save')throw Error('Expected acknowledged exact route '+mode);
  const operationId=crypto.randomUUID();
  const result=await fixture.api.invoke({version:'3+1.1',method:'dispatchSave',params:{itemId:row.id,generation:desired.generation,context:'link',
   source:{url:'https://example.com/image.png',filename:mode+'.png'},idempotencyKey:operationId}},'gui');
  return {state:result.state,completion:result.data?.completion,
   exists:fixture.r2Objects.has('fixture-bucket:projects/'+mode+'.png')};
 },mode);
 for(const mode of ['simple','nested']){
  await page.getByRole('row').filter({hasText:'projects'}).click({button:'right'});
  await page.getByRole('menuitem',{name:'+ Right Click',exact:true}).click();
  if(mode==='nested')await page.getByRole('button',{name:'Narrow',exact:true}).click();
  await page.getByLabel('Menu Title',{exact:true}).fill(mode+' fixture');
  await page.getByText(/Save prepares or maintains the private Cloudflare Worker/).waitFor();
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#dialog').open||document.querySelector('#save')?.textContent==='Retry Save');
  assert.equal(await page.getByRole('dialog').count(),0,await page.locator('#destination-save-status').allTextContents());
  const result=await check(mode);
  assert.deepEqual(result,{state:'completed',completion:'verified',exists:true});
  results.push({mode,...result});
 }
 await page.getByRole('button',{name:'Manage Destinations',exact:true}).first().click();
 await page.getByRole('button',{name:'Depth',exact:true}).click();
 await page.getByLabel('Add Depth bucket').selectOption({label:'fixture-account · fixture-bucket'});
 await page.getByRole('button',{name:'Add',exact:true}).click();
 assert(await page.locator('[data-manager-show="depth"]').isChecked());
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await ready();
 const depth=await check('depth');
 assert.deepEqual(depth,{state:'completed',completion:'verified',exists:true});
 results.push({mode:'depth',...depth});
 const provisionCount=await page.evaluate(()=>window.productFixture.calls.filter(c=>c.operation==='fixture.worker.prepare'&&c.target.bucketName==='fixture-bucket').length);
 assert.equal(provisionCount,1);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({evidence:'Chromium DOM and IndexedDB, fake Chrome menu callbacks and provider',results,provisionCount},null,2));
}catch(error){
 const detail=await page?.evaluate(()=>({status:document.querySelector('#status')?.textContent,
  save:document.querySelector('#destination-save-status')?.textContent,
  lastResponse:window.productFixture?.lastResponse?.response?.code,
  tree:document.querySelector('#tree')?.textContent}));
 if(detail)console.error(JSON.stringify(detail));
 throw error;
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
