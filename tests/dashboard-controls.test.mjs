import test from 'node:test';
import assert from 'node:assert/strict';
import {createDashboardControls} from '../src/dashboard/controls.mjs';
import {createRedownDashboardBridge} from '../src/dashboard/redown-bridge.mjs';

const readySnapshot={
  globalActivation:{state:'ready',buckets:[{accountId:'a',bucketName:'redown',state:'ready'}]},
  activatedBuckets:[{profileId:'profile1',accountId:'a',bucketName:'redown',enabled:true}],
  profiles:[{id:'profile1',accountId:'a',bucketName:'redown',workerUrl:'https://example.workers.dev',token:'secret-placeholder'}],
  menuStatus:{state:'registered'}
};
function harness({auth={accessToken:'private-token',reconnectRequired:false},activation=readySnapshot,listError=false}={}){
  const calls=[],activationCalls=[],snapshots=[];
  let currentActivation=activation;
  const api={run:async (op,input)=>{
    calls.push({op,input});
    if(op==='accounts')return {state:'completed',data:{accounts:[{id:'a',name:'Account'}]}};
    if(op==='buckets')return {state:'completed',data:{buckets:[{name:'redown'}]}};
    if(op==='list')return listError?
      {state:'failed',error:'Cloudflare connection failed',code:'HTTP_403'}:
      {state:'completed',data:{entries:[{key:'Pictures/example.png',folder:false}],cursor:''}};
    throw Error('Unexpected operation: '+op);
  }};
  const controller=createDashboardControls({
    fileApi:api,readAuth:async()=>auth,readActivation:async()=>currentActivation,
    activateBuckets:async msg=>{activationCalls.push(msg);return {ok:true,activation:currentActivation.globalActivation};},
    onChange:state=>snapshots.push(state)
  });
  return {controller,calls,activationCalls,snapshots,setActivation:a=>{currentActivation=a}};
}
test('Refresh with no selected location lists real accounts and buckets via REDOWN file API only',async()=>{
  const h=harness();
  const out=await h.controller.refresh();
  assert.equal(out.ok,true);
  assert.deepEqual(h.calls.map(c=>c.op),['accounts','buckets']);
  assert.equal(out.state.buckets[0].bucketName,'redown');
  assert.equal(out.state.activation.status,'ready');
  assert.deepEqual(h.activationCalls,[]);
  assert.equal(JSON.stringify(out.state).includes('private-token'),false);
  assert.equal(JSON.stringify(out.state).includes('secret-placeholder'),false);
});
test('Refresh with selected folder uses REDOWN list, not activation or provisioning',async()=>{
  const h=harness();
  const loc={accountId:'a',bucketName:'redown',prefix:'Pictures/'};
  const out=await h.controller.refresh(loc);
  assert.equal(out.ok,true);
  assert.deepEqual(h.calls.map(c=>c.op),['list']);
  assert.equal(out.state.entries[0].key,'Pictures/example.png');
  assert.equal(h.activationCalls.length,0);
});
test('Activate uses REDOWN background exact message and observed registered menu state',async()=>{
  const h=harness();
  await h.controller.refresh();
  const out=await h.controller.activate();
  assert.equal(out.ok,true);
  assert.deepEqual(h.activationCalls,[{type:'activateAllBuckets',confirmed:true,retryFailed:false}]);
  assert.equal(out.state.activation.menuRegistered,true);
});
test('Failed/partial activation retries failed buckets, never resets already ready targets',async()=>{
  const h=harness({activation:{...readySnapshot,globalActivation:{state:'partial',buckets:[],error:'one Worker failed'}}});
  await h.controller.refresh();
  const out=await h.controller.activate();
  assert.equal(out.ok,false);
  assert.equal(out.state.activation.status,'partial');
  assert.equal(h.activationCalls[0].retryFailed,true);
});
test('A missing menu registration receipt cannot be reported as activated',async()=>{
  const h=harness({activation:{...readySnapshot,menuStatus:{state:'failed'}}});
  await h.controller.refresh();
  const out=await h.controller.activate();
  assert.equal(out.ok,false);
  assert.notEqual(out.state.activation.status,'ready');
});
test('Unauthenticated refresh/activate do not send any cloud operations',async()=>{
  const h=harness({auth:{accessToken:null,reconnectRequired:true}});
  assert.equal((await h.controller.refresh()).code,'DISCONNECTED');
  assert.equal((await h.controller.activate()).code,'DISCONNECTED');
  assert.deepEqual(h.calls,[]);
  assert.deepEqual(h.activationCalls,[]);
});
test('Refresh failure reports error and leaves activation untouched',async()=>{
  const h=harness({listError:true});
  const out=await h.controller.refresh({accountId:'a',bucketName:'redown',prefix:''});
  assert.equal(out.ok,false);
  assert.equal(out.code,'HTTP_403');
  assert.equal(h.activationCalls.length,0);
});
test('Original sender restrictions are preserved; separate Click2Cloud page cannot invoke provisioning',async()=>{
  const messages=[];
  const chromeApi={
    runtime:{getURL:p=>'chrome-extension://redown-id/'+p,sendMessage:async m=>{messages.push(m);return {ok:true}}},
    storage:{local:{get:async()=>({cloudflareAuth:{accessToken:'secret'},profiles:[]})}}
  };
  const cloudflareApi={request:async()=>({}),boundedFetch:async()=>({})};
  const outside=createRedownDashboardBridge({
    chromeApi,cloudflareApi,pageUrl:'chrome-extension://click2cloud-id/dashboard/index.html'
  });
  assert.equal(outside.activationHostReady,false);
  await assert.rejects(outside.activateBuckets({type:'activateAllBuckets',confirmed:true}),{code:'REDOWN_SENDER_REQUIRED'});
  assert.equal(messages.length,0);
  const within=createRedownDashboardBridge({
    chromeApi,cloudflareApi,pageUrl:'chrome-extension://redown-id/beta/explorer.html#destinations'
  });
  assert.equal(within.activationHostReady,true);
  await assert.rejects(within.activateBuckets({type:'wrong',confirmed:true}),{code:'INVALID_ACTIVATION'});
  await within.activateBuckets({type:'activateAllBuckets',confirmed:true});
  assert.equal(messages.length,1);
});
