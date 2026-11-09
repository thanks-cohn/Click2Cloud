// Only fixture boundaries: Chrome callbacks, OAuth/management API and source
// network. Actual Shelf/background, API, IDB, Worker, DO and R2 code execute.
import assert from 'node:assert/strict';import {Miniflare,createFetchMock} from 'miniflare';import {build} from 'esbuild';import {mkdtemp,rm,writeFile} from 'node:fs/promises';import{join}from'node:path';import{tmpdir}from'node:os';import{createHash}from'node:crypto';
export async function createWorkflowFixture(){
 const code=(await build({entryPoints:['src/cloudflare/worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',plugins:[{name:'source-network-fixture',setup(b){b.onResolve({filter:/public-egress\.mjs$/},()=>({path:new URL('./fixtures/public-egress.mjs',import.meta.url).pathname}));}}]})).outputFiles[0].text;
 const mock=createFetchMock();mock.disableNetConnect();const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l2kAAAAASUVORK5CYII=','base64');mock.get('https://raw.githubusercontent.com').intercept({path:'/image.png'}).reply(200,png,{headers:{'content-type':'image/png','content-length':String(png.length)}}).persist();
 let mf,bindings=[],bucketExists=false,uploads=0,creates=0;const receipts=[];
 const json=(res,data,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
 async function handle(req,res){const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith('/fixture-'))return false;
  try{
   if(u.pathname==='/fixture-object'){const key=u.searchParams.get('key'),b=await mf.getR2Bucket('STORAGE'),obj=await b.get(key),bytes=obj?Buffer.from(await obj.arrayBuffer()):null;json(res,{exists:!!obj,size:bytes?.length,sha256:bytes?createHash('sha256').update(bytes).digest('hex'):null,expected:bytes?.equals(png)});return true;}
   const remote=new URL(u.searchParams.get('path')),request=new Request('http://local'+u.pathname,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:req,duplex:'half'}:{})});
   if(u.pathname==='/fixture-worker'){const r=await mf.dispatchFetch('https://worker.fixture.workers.dev'+remote.pathname,{method:req.method,headers:request.headers,body:await request.text()});res.writeHead(r.status,{'content-type':'application/json'});res.end(Buffer.from(await r.arrayBuffer()));return true;}
   const path=remote.pathname.replace('/client/v4','');
   if(path.endsWith('/r2/buckets')&&req.method==='POST'){bucketExists=true;creates++;json(res,{success:true,result:{name:'redown'}});}
   else if(path.endsWith('/r2/buckets'))json(res,{success:true,result:{buckets:bucketExists?[{name:'redown'}]:[]}});
   else if(path.endsWith('/r2/buckets/redown'))json(res,{success:true,result:{name:'redown'}});
   else if(path.endsWith('/workers/subdomain'))json(res,{success:true,result:{subdomain:'fixture'}});
   else if(path.endsWith('/settings'))json(res,{success:true,result:{bindings}});
   else if(path.endsWith('/subdomain'))json(res,{success:true,result:{enabled:true}});
   else if(req.method==='PUT'&&path.includes('/workers/scripts/')){const form=await request.formData(),meta=JSON.parse(await form.get('metadata').text());bindings=meta.bindings;uploads++;const vars=Object.fromEntries(bindings.filter(b=>['plain_text','secret_text'].includes(b.type)).map(b=>[b.name,b.text]));await mf?.dispose();mf=new Miniflare({modules:true,script:code,compatibilityDate:'2026-01-01',r2Buckets:['STORAGE'],durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},bindings:vars,fetchMock:mock});await mf.ready;json(res,{success:true,result:{id:'fixture'}});}
   else json(res,{success:false,errors:[{code:99999}]},404);
  }catch(e){json(res,{success:false,code:'FIXTURE_BOUNDARY_FAILED'},500);}return true;
 }
 async function run({launch,install,origin,results,evidence}){
  const profile=await mkdtemp(join(tmpdir(),'c2c-login-workflow-'));let context=await launch(profile);await install(context);let page=await context.newPage();await page.goto(origin+'/extension/app.html?case=workflow');await page.getByRole('heading',{name:'Your clouds, one place.'}).waitFor();receipts.push({id:crypto.randomUUID(),stage:'Shelf-opens',state:'PASS'});
  async function saveAndVerify(n){
   const native=await page.evaluate(()=>click2cloud.registrar.inspect());assert(!native.pending);assert.equal(native.acknowledgedGeneration,native.desired.generation);assert.equal(native.desired.rows.filter(r=>r.parentId===null).length,4);const row=native.desired.rows.find(r=>r.role==='save'&&r.target?.bucketName==='redown');assert(row);assert(!row.label.includes('Set up'));
   receipts.push({id:crypto.randomUUID(),stage:'native-registration',state:'PASS',generation:native.acknowledgedGeneration,proofClass:'FIXTURE_CHROME_CALLBACK_ACK_NOT_INSTALLED_CHROME'});
   await page.evaluate(row=>bootFixture.nativeClick({menuItemId:row.id,srcUrl:'https://raw.githubusercontent.com/image.png',mediaType:'image',pageUrl:'https://example.org/'},{id:1,url:'https://example.org/'}),row);
   let observed=false;for(let attempt=0;attempt<100;attempt++){observed=await page.evaluate(async n=>(await click2cloud.current.readRemoteResults()).filter(x=>x.kind==='save'&&x.state==='verified'&&x.receipt).length>=n,n);if(observed)break;await page.waitForTimeout(200);}if(!observed){await writeFile(join(evidence,'synthetic-dispatch-failure.json'),JSON.stringify(await page.evaluate(async()=>({lastSave:(await chrome.storage.local.get('lastSave')).lastSave,records:await click2cloud.current.readRemoteResults()})),null,2));}assert(observed,'Native dispatch did not produce a verified receipt');
   const all=await page.evaluate(()=>click2cloud.current.readRemoteResults());const saved=all.find(x=>x.kind==='save'&&x.state==='verified'&&x.receipt);receipts.push({id:saved.operationId,stage:'right-click-true-remote',state:'PASS',receipt:{key:saved.receipt.key,size:saved.receipt.size,etag:saved.receipt.etag}});
   const check=await (await page.request.get(origin+'/fixture-object?key='+encodeURIComponent(saved.receipt.key))).json();assert(check.exists&&check.expected);assert.equal(check.size,saved.receipt.size);receipts.push({id:crypto.randomUUID(),parentOperationId:saved.operationId,stage:'independent-local-R2-readback',state:'PASS',...check});
  }
  let config;
  for(let n=1;n<=3;n++){
   await page.getByRole('button',{name:'Log in',exact:true}).click();await page.waitForFunction(()=>bootFixture.responses.some(r=>r.request.method==='loginBegin'&&r.response.initializationReturned)&&document.querySelector('#status')?.textContent.includes('Ready to save'),null,{timeout:30000});
   const response=await page.evaluate(()=>bootFixture.loginResponse);receipts.push({id:response.receipt.operationId,stage:'login-'+n,state:'PASS',result:response.data.state,initialization:response.data.initialization.code});assert.equal(response.data.initialization.state,'completed');assert.equal(await page.getByRole('button',{name:'Authorize automatic setup',exact:true}).count(),0);assert.equal(await page.getByRole('dialog').isVisible(),false);
   const current=await page.evaluate(()=>bootFixture.snapshot());assert.equal(current.product.defaultTarget.bucketName,'redown');assert.equal(current.configs.simple.destinations.length,1);if(config)assert.deepEqual(current.configs,config.configs);config=current;
   await saveAndVerify(n);
   if(n<3){await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Log in',exact:true}).waitFor();assert.deepEqual((await page.evaluate(()=>bootFixture.snapshot())).configs,config.configs);receipts.push({id:crypto.randomUUID(),stage:'logout-'+n,state:'PASS'});}
  }
  assert.equal(creates,1);assert.equal(uploads,1);await context.close();context=await launch(profile);await install(context);page=await context.newPage();await page.goto(origin+'/extension/app.html?case=workflow');await page.getByText('Signed in to Cloudflare.',{exact:true}).waitFor();await page.evaluate(()=>bootFixture.startupListener());await page.waitForFunction(()=>{const e=click2cloud.registrar.inspect();return e.desired&&!e.pending&&e.acknowledgedGeneration===e.desired.generation;});assert.deepEqual((await page.evaluate(()=>bootFixture.snapshot())).configs,config.configs);await saveAndVerify(4);receipts.push({id:crypto.randomUUID(),stage:'full-browser-process-restart-and-save',state:'PASS'});
  results.push({gate:'login-ready-native-dispatch-local-workerd-R2-logout-relogin-restart',state:'PASS',bucketCreates:creates,workerUploads:uploads,operations:receipts,evidenceClass:'REAL_APP_BACKGROUND_IDB_WORKERD_R2_DO; FIXTURE_CHROME_OAUTH_MANAGEMENT_SOURCE; NOT_LIVE_OR_INSTALLED'});await page.screenshot({path:join(evidence,'login-ready.png')});await context.close();await rm(profile,{recursive:true,force:true});
 }
 return{handle,run,dispose:()=>mf?.dispose()};
}
