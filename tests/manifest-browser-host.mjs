// Actual CURRENT/engine/registrar/API and provider binding owner. Cloudflare
// responses and Chrome callbacks are explicit fixtures, never live evidence.
import {createCurrentStore} from '../src/persistence/current-store.mjs';
import {createEngine} from '../src/core/engine.mjs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {createEngineApi} from '../src/api/service.mjs';
import {createManifestStore} from '../src/manifest/service.mjs';
import {createManifestLocations} from '../src/cloudflare/manifest-locations.mjs';
import {scopeKey,targetKey} from '../src/core/menu-identity.mjs';
import {qaFixture,qaInventory} from './fixtures/menu-manifest.mjs';
const profile=new URLSearchParams(location.search).get('manifestProfile')??'source',c=qaFixture(),calls=[],records=new Map(),buckets=new Set(profile==='missing'?['click2cloud-qa']:['click2cloud-qa','click2cloud-qa-2']),plans=new Map();let connected=true;
const current=createCurrentStore({dbName:'manifest-browser-'+profile,readEstablishment:async()=>({}),retainEstablishment:async()=>{}});
if(profile==='source'&&(await current.read()).product.revision===0)await current.commitProduct({...c,expectedRevision:0,idempotencyKey:'seed',fingerprint:'seed'});
const oauth={status:async()=>({state:connected?'CONNECTED':'DISCONNECTED',accounts:connected?[{id:'qa-account',name:'QA fixture account'}]:[],connections:connected?[{provider:'cloudflare',accountId:'qa-account',connectionId:'cloudflare:qa-account'}]:[]}),authority:async()=>{if(!connected)throw Object.assign(Error(),{code:'AUTH_REQUIRED'});return {sessionId:'fixture-session',accounts:[{id:'qa-account'}],scopes:['workers-r2.read','workers-r2.write','workers-scripts.admin','workers-scripts.edit']};},request:async(path,o={})=>{calls.push({path,method:o.method??'GET'});if(o.method==='POST'){const name=JSON.parse(o.body).name;buckets.add(name);return Response.json({success:true,result:{name}});}const name=path.split('/r2/buckets/')[1]?.split('/')[0];if(path.includes('/objects?'))return Response.json({success:true,result:{objects:[]}});return buckets.has(name)?Response.json({success:true,result:{name}}):Response.json({success:false,errors:[{code:10006,message:'The specified bucket does not exist.'}]},{status:404});}};
const transport={status:async t=>({state:!buckets.has(t.bucketName)?'blocked':t.bucketName==='click2cloud-qa-2'&&profile==='missing'&&!plans.has(scopeKey(t))?'blocked':'READY',code:'WORKER_SETUP_REQUIRED'}),probe:async x=>{if(!await x.authorize())throw Error('AUTHORIZATION_REVOKED');calls.push({probe:x.target});return {state:'verified'};},probeStatus:async()=>({state:'verified'})};
const provisioner={lookup:async t=>plans.get(scopeKey(t)),prepare:async(t,o)=>{calls.push({prepare:t,options:o});plans.set(scopeKey(t),{state:'ready',prefixScope:o.prefixScope,name:o.workerName});},markVerified:async()=>{}};
const registrar=createChromeRegistrar({chrome:{runtime:{},contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb()}}});
const engine=createEngine({current,registrar,getAuthorization:async t=>connected?{sessionId:'fixture-session',authorizedTargets:[t]}:null});
const locations=createManifestLocations({oauth,current,provisioner,transport});
const fileApi={capabilities:[],run:async()=>({state:'completed',data:{entries:[],cursor:''}})};
const api=createEngineApi({current,engine,oauth,fileApi,manifestLocations:locations,manifestStore:createManifestStore(),getInventory:async()=>{const s=await current.read(),inventory=qaInventory(s);if(!connected)for(const v of [inventory.scopes,inventory.depthScopes])for(const scope of v){scope.authorized=false;scope.workerReady=false;for(const f of scope.folders)f.workerReady=false;}return inventory;},recovery:{status:async()=>({state:'BLOCKED',code:'EXTERNAL_RECOVERY_UNAVAILABLE'})},authorize:async()=>true,confirm:async r=>{calls.push({confirmation:r.method});return true;}});
await api.reconcile();
window.manifestFixture={calls,current,api,engine,registrar,locations,disconnect(){connected=false;},connect(){connected=true;},records};
export const invoke=request=>api.invoke(request,'gui');
