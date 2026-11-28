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
 const results=[];
 const orderings=['simple,nested,depth','simple,depth,nested','nested,simple,depth','nested,depth,simple','depth,simple,nested','depth,nested,simple','repair'];
 for(const ordering of orderings){
  const context=await browser.newContext();
  page=await context.newPage();
  page.setDefaultTimeout(10000);
  const errors=[];
  page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
  await page.addInitScript(()=>{
   const host=import('/tests/product-browser-host.mjs');
   const event={addListener(){},removeListener(){}};
   const area=()=>{const values={};return {
    async get(keys){return keys==null?{...values}:Object.fromEntries([keys].flat().map(key=>[key,values[key]]));},
    async set(patch){Object.assign(values,patch);},async remove(key){delete values[key];}
   };};
   globalThis.chrome={storage:{local:area(),session:area(),onChanged:event},windows:{getCurrent:async()=>({id:1})},
    runtime:{id:'fixture',getURL:path=>location.origin+'/'+path,onMessage:event,
     async sendMessage(message){
      if(message.channel==='engine')return (await host).invoke({version:message.version,method:message.method,params:message.params});
      if(message.channel==='redown-basic-v1')return {ok:true,value:message.op==='saves.pending'?null:
       {provider:message.input.provider,ready:false,connected:false,phase:'disconnected'}};
      return null;
     }
    }};
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/extension/app.html?fixtureColdDestination');
  const button=name=>page.getByRole('button',{name,exact:true});
  await button('Connect to Cloudflare').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Cloudflare connected'));
  await button('File Explorer').click();
  const bucket=page.getByRole('treeitem',{name:/fixture-bucket/});
  if(await bucket.getAttribute('aria-selected')!=='true')await bucket.click();
  const folder=page.getByRole('row').filter({hasText:'projects'});
  await folder.waitFor();
  assert.equal(await page.evaluate(()=>productFixture.calls.filter(call=>call.operation==='fixture.worker.prepare'&&call.target.bucketName==='fixture-bucket').length),0);
  const repair=ordering==='repair';
  if(repair)await page.evaluate(()=>{window.fixtureColdWorkerOffline=true;});
  for(const mode of repair?['simple']:ordering.split(',')){
   if(mode==='depth'){
    await button('Manage Destinations').first().click();
    await button('Depth').click();
    await page.getByLabel('Add Depth bucket').selectOption({label:'fixture-bucket'});
    await button('Add').click();
    assert(await page.locator('[data-manager-show="depth"]').isChecked());
    await button('Save').click();
    await page.waitForFunction(()=>document.querySelector('#destination-save-status')?.textContent==='Saved · Ready for right-click');
    await page.locator('#close-dialog').click();
   }else{
    await folder.click({button:'right'});
    await page.getByRole('menuitem',{name:'+ Right Click',exact:true}).click();
    if(mode==='nested'){
     await button('Narrow').click();
     assert(await page.getByText('0 selected',{exact:true}).isVisible());
    }
    await page.getByLabel('Menu Title',{exact:true}).fill(mode+' fixture');
    await page.getByText(/Save prepares or maintains the private Cloudflare Worker/).waitFor({state:'attached'});
    await button('Save').click();
    await page.waitForFunction(()=>!document.querySelector('#dialog').open||document.querySelector('#save')?.textContent==='Retry Save');
    assert.equal(await page.getByRole('dialog').count(),0,await page.locator('#destination-save-status').allTextContents());
   }
   const result=await page.evaluate(async mode=>{
    const fixture=window.productFixture,{desired,acknowledgedGeneration,pending}=fixture.registrar.inspect();
    const row=desired.rows.find(r=>r.origin.mode===mode&&r.role==='save'&&r.target.bucketName==='fixture-bucket'&&r.target.prefix==='projects/');
    if(!row||pending||acknowledgedGeneration!==desired.generation||row.actionKind!=='save')throw Error('Expected acknowledged exact route '+mode);
    const configuration=await fixture.current.read(),config=configuration.configs[mode];
    const saved=(config.destinations??config.scopes).some(item=>item.target.bucketName==='fixture-bucket'&&item.target.prefix===(mode==='depth'?'':'projects/'));
    if(window.fixtureColdWorkerOffline)setTimeout(()=>{window.fixtureColdWorkerOffline=false;},200);
    const response=await fixture.api.invoke({version:'3+1.1',method:'dispatchSave',params:{itemId:row.id,generation:desired.generation,context:'link',
     source:{url:'https://example.com/image.png',filename:mode+'.png'},idempotencyKey:crypto.randomUUID()}},'gui');
    return {saved,state:response.state,completion:response.data?.completion,
     exists:fixture.r2Objects.has('fixture-bucket:projects/'+mode+'.png')};
   },mode);
   assert.deepEqual(result,{saved:true,state:'completed',completion:'verified',exists:true});
   assert.equal(await button('Repair Me').count(),0);
   results.push({ordering,mode,...result});
  }
  const calls=await page.evaluate(()=>productFixture.calls);
  assert.equal(calls.filter(call=>call.operation==='fixture.worker.prepare'&&call.target.bucketName==='fixture-bucket').length,1);
  if(!ordering.startsWith('depth'))assert.equal(calls.filter(call=>call.operation==='listRaw').length,1);
  assert.deepEqual(errors,[]);
  await context.close();
  page=undefined;
 }
 console.log(JSON.stringify({evidence:'Chromium DOM, isolated browser IndexedDB, fake Chrome menu callbacks and provider',results},null,2));
}catch(error){
 const detail=await page?.evaluate(()=>({status:document.querySelector('#status')?.textContent,
  save:document.querySelector('#destination-save-status')?.textContent,
  lastResponse:window.productFixture?.lastResponse?.response?.code,
  tree:document.querySelector('#tree')?.textContent,remotes:document.querySelector('#main')?.textContent,
  response:window.productFixture?.lastResponse?.request?.method}));
 if(detail)console.error(JSON.stringify(detail));
 throw error;
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
