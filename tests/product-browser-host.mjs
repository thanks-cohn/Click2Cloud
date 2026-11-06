// ISOLATED FIXTURE HOST. Actual product source + actual browser IndexedDB;
// fake OAuth/provider responses and fake Chrome ACK callbacks are never live evidence.
import {createCurrentStore} from '../src/persistence/current-store.mjs';
import {createEngine} from '../src/core/engine.mjs';import {createChromeRegistrar} from '../src/chrome/registrar.mjs';import {createEngineApi} from '../src/api/service.mjs';import {createAgentGateway} from '../src/api/gateway.mjs';
const t={provider:'cloudflare',connectionId:'cloudflare:fixture-account',accountId:'fixture-account',bucketName:'fixture-bucket',prefix:''};
const current=createCurrentStore(),calls=[],grants=new Map();let connected=false;
const fakeChrome={runtime:{},contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb(),onClicked:{addListener(){},removeListener(){}}}};
const registrar=createChromeRegistrar({chrome:fakeChrome}),engine=createEngine({current,registrar,getAuthorization:async()=>null});
const entries=[{key:'projects/',displayName:'projects',folder:true},{key:'notes.txt',displayName:'notes.txt',folder:false,size:42,uploaded:'2026-11-05'}];
const fileApi={async run(operation,input){calls.push({operation,input});if(operation==='accounts')return {state:'completed',data:{accounts:[{id:t.accountId,name:'Fixture account'}]}};if(operation==='buckets')return {state:'completed',data:{buckets:[{name:t.bucketName}],cursor:''}};if(operation==='list')return {state:'completed',data:{entries:input.source.prefix?[]:entries,cursor:''}};return {state:'blocked',code:'FIXTURE_PROVIDER_UNAVAILABLE'};}};
const oauth={status:async()=>({state:connected?'CONNECTED':'DISCONNECTED',connections:connected?[{provider:'cloudflare',connectionId:t.connectionId,accountId:t.accountId}]:[],accounts:connected?[{id:t.accountId,name:'Fixture account'}]:[],redirectUri:'https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare'}),connect:async()=>{calls.push({operation:'oauth.connect'});connected=true;return oauth.status();},cancel:async()=>{connected=false;return oauth.status();},disconnect:async()=>{connected=false;return oauth.status();}};
const recovery={status:async()=>({state:'BLOCKED',code:'EXTERNAL_RECOVERY_UNAVAILABLE'}),writeVerified:async()=>{throw Error('EXTERNAL_RECOVERY_UNAVAILABLE');}};
const api=createEngineApi({engine,current,fileApi,oauth,recovery,wholeCloud:{list:async()=>[]},getInventory:async()=>({scopes:[{target:t,authorized:connected,workerReady:false,folders:['projects/',Array.from({length:20},(_,i)=>'level'+(i+1)).join('/')+'/'],complete:false}]}),authorize:async r=>r.actor==='gui'||r.actor==='fixture-agent'&&grants.get(r.actor)?.includes(r.method),confirm:async r=>r.actor==='gui'});
const gateway=createAgentGateway({api});await api.reconcile();
window.productFixture={api,current,engine,registrar,gateway,grants,calls,target:t};
export async function invoke(request){const response=await api.invoke(request,'gui');window.productFixture.lastResponse={request,response};return response;}
