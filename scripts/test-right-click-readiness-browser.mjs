// Disposable packaged Chromium, actual extension registration and signed
// Workerd/R2. Optional X11 drives Chrome's native menu on Linux.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {createServer} from 'node:https';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {build} from 'esbuild';
import {createFetchMock,Miniflare} from 'miniflare';
import {chromium} from 'playwright-core';
import {CLOUDFLARE_SCOPES} from '../src/auth/cloudflare-oauth.mjs';

const extension=resolve('dist/click2cloud');
const {BUILD_INFO}=await import(pathToFileURL(join(extension,'src/build-info.mjs')));
const nativeInput=process.env.REDOWN_NATIVE_INPUT==='1';
const modes=process.env.REDOWN_RIGHT_CLICK_MODE?[process.env.REDOWN_RIGHT_CLICK_MODE]:['simple','nested','depth'];
const output=resolve('lab-local','verification');
await mkdir(output,{recursive:true});
const directory=await mkdtemp(join(output,'right-click-browser-'));
const cert=join(directory,'fixture.pem'),certKey=join(directory,'fixture-key.pem');
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-subj','/CN=right-click-fixture.example.com',
 '-days','1','-keyout',certKey,'-out',cert],{stdio:'ignore'});
const sourceHost='right-click-fixture.example.com',sourceOrigin='https://'+sourceHost;
const accountId='0'.repeat(32),bucketName='qatest',prefix='qa/QAleaf/';
const target={provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName,prefix};
const apiToken='isolated-browser-fixture-token';
const receipt={status:'RUNNING',build:BUILD_INFO,evidenceLayer:nativeInput?'native-Chromium-X11-local-Workerd-R2':'packaged-Chromium-registrar-dispatch-local-Workerd-R2',
 remoteCloudflareWrites:0,scenarios:[]};
const {outputFiles}=await build({entryPoints:[join(extension,'src/cloudflare/worker.mjs')],bundle:true,write:false,format:'esm',platform:'browser',
 plugins:[{name:'local-public-source-fixture',setup(builder){
  builder.onResolve({filter:/public-egress\.mjs$/},()=>({path:fileURLToPath(new URL('../tests/fixtures/public-egress.mjs',import.meta.url))}));
 }}]});
const sha=value=>createHash('sha256').update(Buffer.from(value)).digest('hex');
const waitFor=async (check,label)=>{
 for(let attempt=0;attempt<100;attempt++){
  const result=await check();if(result)return result;
  await delay(120);
 }
 throw Error('Timeout waiting for '+label);
};

let run,context;
const service=createServer({key:await readFile(certKey),cert:await readFile(cert)},async(req,res)=>{
 const address=new URL(req.url,'https://'+req.headers.host);
 const send=(body,status=200,contentType='application/json')=>res.writeHead(status,{'content-type':contentType}).end(body);
 const json=(result,status=200)=>send(JSON.stringify({success:status===200,result}),status);
 try{
  if(address.hostname===sourceHost){
   if(address.pathname==='/')return send('<title>ReDown isolated source</title><p style="margin:100px"><a href="/'+run.filename+'">Fixture source</a></p>',200,'text/html');
   if(address.pathname==='/'+run.filename)return send(run.content,200,'text/plain');
   return send('',404);
  }
  const deployed=run?.workers.get(address.hostname.split('.')[0]);
  if(address.hostname.endsWith('.right-click-fixture.workers.dev')){
   if(!deployed)return send('',404);
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   run.workerPaths.push(address.pathname);
   if(address.pathname==='/remote-save'){
    const {operationId,destination}=JSON.parse(Buffer.concat(chunks).toString());
    run.publications.push({operationId,prefix:destination.prefix});
   }
   const response=await deployed.mf.dispatchFetch(address.href,{method:req.method,headers:{
    authorization:req.headers.authorization,'content-type':req.headers['content-type']},body:Buffer.concat(chunks)});
   return send(await response.text(),response.status);
  }
  if(address.hostname!=='api.cloudflare.com'||req.headers.authorization!=='Bearer '+apiToken)return send('',403);
  const account='/client/v4/accounts/'+accountId,buckets=account+'/r2/buckets';
  if(address.pathname===buckets)return json({buckets:[{name:bucketName}]});
  if(address.pathname===buckets+'/'+bucketName)return json({name:bucketName});
  if(address.pathname===buckets+'/'+bucketName+'/objects'){
   const selected=address.searchParams.get('prefix')??'',delimiter=address.searchParams.get('delimiter');
   const key=prefix+'existing.txt';
   if(!key.startsWith(selected))return json({objects:[],delimited:[]});
   const rest=key.slice(selected.length),slash=rest.indexOf('/');
   return delimiter&&slash>=0?json({objects:[],delimited:[selected+rest.slice(0,slash+1)]}):
    json({objects:[{key,size:8,etag:'fixture-etag',uploaded:'2026-11-27T00:00:00Z'}],delimited:[]});
  }
  if(address.pathname===account+'/workers/subdomain')return json({subdomain:'right-click-fixture'});
  const script=/\/workers\/scripts\/([^/]+)(.*)$/.exec(address.pathname);
  if(script){
   const [,name,suffix]=script;
   const retained=run.workers.get(name);
   if(suffix==='/settings')return retained?json({bindings:retained.bindings}):json(null,404);
   if(suffix==='/subdomain'&&req.method==='POST'&&retained)return json({enabled:true});
   if(!suffix&&req.method==='PUT'){
    const chunks=[];let bytes=0;
    for await(const chunk of req){bytes+=chunk.length;if(bytes>4*1024**2)throw Error('Fixture module request too large');chunks.push(chunk);}
    const form=await new Response(Buffer.concat(chunks),{headers:{'content-type':req.headers['content-type']}}).formData();
    const metadata=JSON.parse(await form.get('metadata').text());
    const bindings=Object.fromEntries(metadata.bindings.filter(row=>'text' in row).map(row=>[row.name,row.text]));
    assert.equal(bindings.ACCOUNT_ID,accountId);assert.equal(bindings.BUCKET_NAME,bucketName);
    assert.equal(bindings.CODE_DIGEST,BUILD_INFO.workerCodeDigest);
    const mock=createFetchMock();mock.disableNetConnect();
    mock.get(sourceOrigin).intercept({path:'/'+run.filename}).reply(200,run.content,
     {headers:{'content-length':String(Buffer.byteLength(run.content)),'content-type':'text/plain'}}).persist();
    run.deployStarted++;
    if(run.held)await run.hold;
    const mf=new Miniflare({modules:true,script:outputFiles[0].text,compatibilityDate:'2026-01-01',r2Buckets:['STORAGE'],
     durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},bindings,fetchMock:mock});
    run.workers.set(name,{mf,bindings:metadata.bindings});
    await mf.ready;
    return json({});
   }
  }
  return json(null,404);
 }catch(error){run?.errors.push({stage:'provider-fixture',code:error.code??error.name});return send('',500);}
});
await new Promise(resolve=>service.listen(0,'127.0.0.1',resolve));
const input=(...args)=>execFileSync(process.env.REDOWN_LAB_PYTHON??'python3',['tests/fixtures/screenshot-x11.py',...args]);

async function pressNative(page,labels,mode){
 await page.bringToFront();
 input('focus');
 const box=await page.getByRole('link',{name:'Fixture source'}).boundingBox();
 const offset=await page.evaluate(()=>({top:screenY+outerHeight-innerHeight,left:screenX}));
 const x=Math.round(offset.left+box.x+box.width/2),y=Math.round(offset.top+box.y+box.height/2);
 input('click',String(x),String(y),'3');
 const labelsSeen=[];let priorLeft=-1;
 for(const [index,label] of ['REDOWN',...labels].entries()){
  const normalized=label.replace(/[^a-z0-9]/gi,'').toLowerCase();
  let words=[];
  const item=await waitFor(async()=>{
   const path=join(directory,mode+'-'+index+'.png');
   execFileSync('import',['-window','root',path]);
   const tsv=execFileSync('tesseract',[path,'stdout','--psm','11','tsv'],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
   words=tsv.trim().split('\n').slice(1).map(line=>line.split('\t')).filter(row=>row[11]?.trim());
   return words.find(row=>Number(row[7])>offset.top&&Number(row[6])>priorLeft+20&&
    row[11].replace(/[^a-z0-9]/gi,'').toLowerCase()===normalized);
  },'native menu label '+label);
  labelsSeen.push(label);
  const [left,top,width,height]=item.slice(6,10).map(Number);
  priorLeft=left;
  input(index===labels.length?'click':'move',String(left+Math.floor(width/2)),String(top+Math.floor(height/2)));
  await delay(220);
 }
 return labelsSeen;
}

try{
 for(const mode of modes){
  const {port}=service.address();
  let release;
  run={filename:'first-'+mode+'.txt',content:'First '+mode+' file via packaged extension\n',
   workers:new Map(),workerPaths:[],publications:[],nativeClicks:[],sidePanels:0,errors:[],deployStarted:0,held:true,hold:new Promise(resolve=>{release=resolve;})};
  let registration;
  try{
   const executablePath=process.env.C2C_CHROME_EXECUTABLE??(process.env.REDOWN_PLAYWRIGHT_CHROMIUM==='1'?chromium.executablePath():process.platform==='win32'?
     join(process.env.ProgramFiles??'C:\\Program Files','Google','Chrome','Application','chrome.exe'):'/usr/bin/chromium');
   context=await chromium.launchPersistentContext(join(directory,'profile-'+mode),{
    headless:!nativeInput,executablePath,ignoreDefaultArgs:['--disable-extensions'],
    viewport:nativeInput?null:{width:900,height:650},args:['--no-sandbox','--no-proxy-server','--ignore-certificate-errors',
     '--enable-unsafe-extension-debugging','--window-size=1220,900','--window-position=0,0',
     '--disable-extensions-except='+extension,'--load-extension='+extension,
     `--host-resolver-rules=MAP api.cloudflare.com 127.0.0.1:${port}, MAP *.${'right-click-fixture.workers.dev'} 127.0.0.1:${port}, MAP ${sourceHost} 127.0.0.1:${port}, MAP * ~NOTFOUND`]
   });
   // The launch flags already load this unpacked extension. Issuing a
   // second CDP install while Chromium is still starting can create another
   // service-worker owner and invalidates the one-gesture experiment.
   const sw=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker',{timeout:12000});
   assert.equal(context.serviceWorkers().filter(worker=>worker.url()===sw.url()).length,1);
   sw.on('console',message=>{
    if(message.text().startsWith('RightClickFixtureDelivery:'))run.nativeClicks.push(message.text().slice('RightClickFixtureDelivery:'.length));
    if(message.text()==='RightClickFixtureShelfOpened')run.sidePanels++;
   });
   await sw.evaluate(async({accountId,apiToken,scopes})=>{
    await click2cloud.ready;
    chrome.contextMenus.onClicked.addListener(info=>console.log('RightClickFixtureDelivery:'+info.menuItemId));
    chrome.sidePanel.onOpened?.addListener(()=>console.log('RightClickFixtureShelfOpened'));
    await chrome.storage.local.set({click2cloudOAuth:{sessionId:'isolated-browser-session',accessToken:apiToken,
     expiresAt:Date.now()+3600000,scopes,scopeEvidence:'provider-returned',accounts:[{id:accountId,name:'Isolated fixture'}]}});
   },{accountId,apiToken,scopes:CLOUDFLARE_SCOPES});
   const page=context.pages()[0]??await context.newPage();
   await page.goto(sourceOrigin+'/');await page.getByRole('link',{name:'Fixture source'}).waitFor();
   registration=sw.evaluate(async({mode,target})=>{
    const {api,current}=click2cloud,{product}=await current.read();
    const changes=[{type:'setShowInChrome',show:{simple:mode==='simple',nested:mode==='nested',depth:mode==='depth',flat:false}}];
    if(mode==='depth')changes.push({type:'setDepthDisplayBuckets',scopes:[{target:{...target,prefix:''},maxDepth:6}]});
    else changes.push({type:'createDestination',mode,target,label:mode==='simple'?'QASimple':'QANarrow'});
    return api.invoke({version:'3+1.1',method:'commitConfigChange',
     params:{changes,prepareModes:[mode],expectedRevision:product.revision,idempotencyKey:crypto.randomUUID()}},'gui');
   },{mode,target});
   void registration.catch(()=>{});
   await waitFor(()=>run.deployStarted===1,'held provider deployment');
   assert.equal(run.workerPaths.length,0);
   const route=await sw.evaluate(({mode,target})=>{
    const {desired,acknowledgedGeneration,pending}=click2cloud.registrar.inspect();
    if(pending||acknowledgedGeneration!==desired.generation)return null;
    const row=desired.rows.find(item=>item.role==='save'&&item.origin.mode===mode&&
     item.target.bucketName===target.bucketName&&item.target.prefix===target.prefix);
    if(!row)return null;
    const labels=[row.label];let next=row;
    while((next=desired.rows.find(item=>item.id===next.parentId)))labels.unshift(next.label);
    return {id:row.id,labels,enabled:row.enabled,generation:desired.generation};
   },{mode,target});
   assert(route?.enabled,'Exact authorized native route must be actionable during preparation');
   let visibleMenu=null,submission;
   if(nativeInput)visibleMenu=await pressNative(page,route.labels,mode);
   else{
    submission=sw.evaluate(({id,url})=>click2cloud.registrar.handleClick({menuItemId:id,linkUrl:url}),{id:route.id,url:sourceOrigin+'/'+run.filename});
    void submission.catch(()=>{});
   }
   await delay(120);
   assert.equal(run.workerPaths.filter(path=>path==='/remote-save').length,0);
   release();
   if(submission)assert.equal((await submission).completion,'verified');
   const committed=await registration;
   assert.equal(committed.data?.native?.state,'completed',JSON.stringify({code:committed.code,native:committed.data?.native}));
   const observed=await waitFor(()=>sw.evaluate(async()=>(await chrome.storage.local.get('lastSave')).lastSave).then(value=>
    value?.completion==='verified'?value:null),'verified menu outcome');
   assert.equal(run.deployStarted,1);assert.equal(run.publications.length,1);
   if(nativeInput)assert.deepEqual(run.nativeClicks,[route.id]);
   const [worker]=run.workers.values(),r2=await worker.mf.getR2Bucket('STORAGE');
   const key=prefix+run.filename,object=await r2.get(key);
   assert(object);assert.equal(sha(await object.arrayBuffer()),sha(run.content));
   const published=(await r2.list()).objects.filter(item=>!item.key.includes('.click2cloud-readiness/'));
   assert.deepEqual(published.map(item=>item.key),[key]);
   const configuration=await sw.evaluate(()=>click2cloud.current.read());
   assert.deepEqual(Object.keys(configuration.configs).filter(key=>(configuration.configs[key].destinations??configuration.configs[key].scopes).length),[mode]);
   assert.equal(context.pages().filter(page=>page.url().includes('/extension/app.html')).length,0);
   assert.equal((await sw.evaluate(()=>chrome.runtime.getContexts({contextTypes:['SIDE_PANEL']}))).length,0);
   assert.equal(run.sidePanels,0);
   assert.deepEqual(run.errors,[]);
   receipt.scenarios.push({mode,status:'PASS',browser:context.browser().version(),visibleMenu,menuGeneration:route.generation,
    actualAppliedGeneration:configuration.generation.applied,operationId:observed.operationId,key,sha256:sha(run.content),
    verifiedObjects:1,deployments:1,publicationRequests:1,shelfOpened:false});
  }catch(error){
   receipt.scenarios.push({mode,status:'FAIL',code:error.code??error.name,message:error.message.slice(0,300),fixtureErrors:run.errors,
    deployStarted:run.deployStarted,workerPaths:run.workerPaths,publications:run.publications,nativeClicks:run.nativeClicks});
  }finally{
   release();
   await context?.close();
   await registration?.catch(()=>{});
   for(const worker of run.workers.values())await worker.mf.dispose();
   await rm(join(directory,'profile-'+mode),{recursive:true,force:true});
  }
 }
 receipt.status=receipt.scenarios.every(item=>item.status==='PASS')?'PASS':'FAIL';
 process.exitCode=receipt.status==='PASS'?0:1;
}finally{
 await new Promise(resolve=>service.close(resolve));
 await Promise.all([rm(cert,{force:true}),rm(certKey,{force:true})]);
 await writeFile(join(directory,'summary.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({...receipt,receipt:join(directory,'summary.json')},null,2));
}
