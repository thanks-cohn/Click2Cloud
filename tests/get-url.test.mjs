import assert from 'node:assert/strict';
import test from 'node:test';
import {createEngineApi} from '../src/api/service.mjs';
import {createPermissions} from '../src/api/permissions.mjs';
import {createR2PublicDomains} from '../src/cloudflare/r2-public-domains.mjs';

const source={provider:'cloudflare',connectionId:'cloudflare:account',accountId:'account',bucketName:'selected-bucket',prefix:'Images/Nested/'};
const key=source.prefix+'café #100%?.png';
const domain='pub-6e0a0c.r2.dev';
const escaped='Images/Nested/caf%C3%A9%20%23100%25%3F.png';
const base='/accounts/account/r2/buckets/selected-bucket/domains/';
const active=domain=>({domain,enabled:true,status:{ownership:'active',ssl:'active'}});
const codeError=code=>Object.assign(Error(code),{code});

function fixture() {
  const requests=[], permissions=createPermissions();
  const state={enabled:false,domain,custom:[],sessionId:'authorized-session',bucketId:'real-bucket-id',
    readbackBucketId:null,managedStatus:200,putStatus:200,readbackEnabled:null,storedObject:key,writeScope:true};
  const current={read(){assert.fail('Get URL must work independently of menu storage');}};
  const oauth={
    status:async()=>({state:'CONNECTED',accounts:[{id:source.accountId}]}),
    authority:async()=>({...await oauth.status(),sessionId:state.sessionId}),
    async request(path,options){
      const method=options.method??'GET';requests.push({method,path,options});
      if(options.expectedSession&&options.expectedSession!==state.sessionId)throw codeError('AUTH_SESSION_CHANGED');
      const json=(result,status=200,info,success=status===200)=>Response.json({success,result,result_info:info}, {status});
      if(!path.startsWith(base))return json(null,404);
      if(path.startsWith(base+'custom')){
        const page=Number(new URL(path,'https://fixture').searchParams.get('page')??1);
        if(state.failCustomPage===page)return json(null,403);
        const list=state.paginate?state.custom.slice((page-1)*2,page*2):state.custom;
        return json({domains:list},200,state.paginate?{page,total_pages:Math.ceil(state.custom.length/2)}:undefined);
      }
      assert.equal(path,base+'managed');
      if(method==='PUT'){
        assert.deepEqual(options.requiredScopes,['workers-r2.write']);
        assert.equal(options.expectedSession,state.sessionId);
        if(!state.writeScope)throw codeError('INSUFFICIENT_SCOPE');
        if(state.putStatus!==200)return json(null,state.putStatus);
        if(state.rejectEnvelope)return json({enabled:true,domain},200,undefined,false);
        if(state.holdWrite)await state.holdWrite;
        state.enabled=true;
        return json({enabled:true,domain:'pub-only-acknowledged.r2.dev',bucketId:state.bucketId});
      }
      if(state.managedException)throw codeError('TRANSIENT_API_FAILURE');
      if(state.managedStatus!==200)return json(null,state.managedStatus);
      return json({enabled:state.enabled?(state.readbackEnabled??true):false,domain:state.domain,
        bucketId:state.enabled?(state.readbackBucketId??state.bucketId):state.bucketId,
        ...(state.invalidManaged?{enabled:'false'}:{})});
    }
  };
  const publicDomains=createR2PublicDomains({oauth,readbackDelays:[0,0]});
  const api=createEngineApi({engine:{},current,oauth,...publicDomains,readExportOptions:async()=>({urls:true}),
    authorize:request=>request.actor==='gui'||permissions.authorize(request),confirm:request=>request.actor==='gui'||permissions.confirm(request),
    fileApi:{run:async(operation,params)=>{
      assert.equal(operation,'stat');
      assert.equal(params.key,key);
      return {state:'completed',data:{object:state.storedObject===null?null:{key:state.storedObject}}};
    }}});
  const enableParams={source,key,confirmed:true};
  const invoke=(method,params={source,key},actor='gui')=>api.invoke({version:'3+1.1',method,params},actor);
  return {state,requests,permissions,invoke,enableParams,enable:params=>invoke('enableBucketPublicAccess',params??enableParams),
    writes:()=>requests.filter(r=>r.method==='PUT')};
}

test('Get URL is read-only and Yes performs one scoped write followed by independent readback',async()=>{
  const f=fixture();
  for(let count=0;count<2;count++){
    const initial=(await f.invoke('getPublicUrls')).data;
    assert.equal(initial.managedPublicAccess,'disabled');
    assert.equal(initial.domainCheckComplete,true);
    assert.deepEqual(initial.file.urls,[]);
  }
  assert.equal(f.writes().length,0);
  f.requests.length=0;
  const activation=await f.enable();
  assert.equal(activation.state,'completed');
  assert.equal(activation.data.managedDomain,domain);
  assert.equal(activation.data.file.urls[0].url,`https://${domain}/${escaped}`);
  assert.deepEqual(f.requests.filter(r=>r.path===base+'managed').map(r=>r.method),['GET','PUT','GET']);
  assert.deepEqual(JSON.parse(f.writes()[0].options.body),{enabled:true});
  assert.equal(f.writes()[0].path,base+'managed');
  assert.equal((await f.invoke('getPublicUrls')).data.managedDomain,domain);
  assert.equal((await f.enable()).data.managedDomain,domain);
  assert.equal(f.writes().length,1);
});

test('All active custom domains survive paging and work with the development URL disabled',async()=>{
  const f=fixture();
  f.state.paginate=true;
  f.state.custom=[...Array.from({length:105},(_,n)=>active(`cdn${n}.example.org`)),
    {...active('pending.example.org'),status:{ssl:'initializing',ownership:'active'}},
    {...active('disabled.example.org'),enabled:false}];
  const data=(await f.invoke('getPublicUrls')).data;
  assert.equal(data.domainCheckComplete,true);
  assert.equal(data.managedPublicAccess,'disabled');
  assert.equal(data.file.urlCount,105);
  assert(data.file.urls.every(item=>item.url.endsWith(escaped)));
  assert(data.file.urls.some(item=>item.domain==='cdn104.example.org'));
  assert.equal((await f.enable()).data.file.urlCount,105,'An existing custom domain wins on the pre-write read');
  assert.equal(f.writes().length,0);
  f.state.enabled=true;
  assert.equal((await f.invoke('getPublicUrls')).data.file.urlCount,106);
  f.state.failCustomPage=2;
  const partial=(await f.invoke('getPublicUrls')).data;
  assert.equal(partial.domainCheckComplete,false);
  assert.equal(partial.domainCheckCode,'PUBLIC_DOMAIN_ACCESS_DENIED');
  assert.equal(partial.file.urlCount,3);
});

test('Consent, account-scoped grants and exact object verification precede an activation',async()=>{
  const f=fixture();
  assert.equal((await f.enable({...f.enableParams,confirmed:false})).code,'INVALID_REQUEST');
  assert.equal((await f.enable({...f.enableParams,key:'Another/file.png'})).code,'SOURCE_SCOPE_MISMATCH');
  assert.equal((await f.enable({...f.enableParams,source:{...source,accountId:'other',connectionId:'cloudflare:other'}})).code,'AUTH_REQUIRED');
  assert.equal((await f.enable({...f.enableParams,source:{...source,bucketName:'other-bucket'}})).code,'SELECTED_BUCKET_MISSING');
  f.state.storedObject=key+'.other';
  assert.equal((await f.enable()).code,'OBJECT_NOT_FOUND');
  f.state.storedObject=key;
  assert.equal((await f.invoke('enableBucketPublicAccess',f.enableParams,'agent')).code,'PERMISSION_DENIED');
  f.permissions.issue({actor:'agent',methods:['enableBucketPublicAccess'],accounts:[source.accountId],expiresAt:Date.now()+5000});
  assert.equal((await f.invoke('enableBucketPublicAccess',f.enableParams,'agent')).code,'CONFIRMATION_REQUIRED');
  assert.equal(f.writes().length,0);
  f.permissions.approve('agent','enableBucketPublicAccess',f.enableParams);
  assert.equal((await f.invoke('enableBucketPublicAccess',f.enableParams,'agent')).state,'completed');
  assert.equal((await f.invoke('enableBucketPublicAccess',f.enableParams,'agent')).code,'CONFIRMATION_REQUIRED');
  assert.equal(f.writes().length,1);
});

test('Activation failures and inconclusive results never return a development URL',async()=>{
  const cases=[
    [{managedStatus:401},'REAUTH_REQUIRED',0],
    [{managedStatus:403},'PUBLIC_DOMAIN_ACCESS_DENIED',0],
    [{managedException:true},'TRANSIENT_API_FAILURE',0],
    [{invalidManaged:true},'MANAGED_DOMAIN_UNAVAILABLE',0],
    [{writeScope:false},'INSUFFICIENT_SCOPE',1],
    [{putStatus:401},'REAUTH_REQUIRED',1],
    [{putStatus:403},'PUBLIC_URL_ACTIVATION_DENIED',1],
    [{rejectEnvelope:true},'PUBLIC_URL_ACTIVATION_FAILED',1],
    [{readbackEnabled:false},'PUBLIC_URL_ACTIVATION_UNCONFIRMED',1],
    [{domain:'https://invalid.r2.dev'},'PUBLIC_URL_ACTIVATION_UNCONFIRMED',1],
    [{readbackBucketId:'different-bucket-id'},'PUBLIC_URL_BUCKET_CHANGED',1]
  ];
  for(const [scenario,expected,writes] of cases){
    const f=fixture();Object.assign(f.state,scenario);
    const result=await f.enable();
    assert.equal(result.code,expected,JSON.stringify(scenario));
    assert.equal(result.data,undefined);
    assert.equal(f.writes().length,writes);
    assert.doesNotMatch(JSON.stringify(result),/pub-only-acknowledged/);
  }
  const f=fixture();f.state.invalidManaged=true;
  const data=(await f.invoke('getPublicUrls')).data;
  assert.equal(data.managedPublicAccess,'unknown');
  assert.equal(data.domainCheckComplete,false);
  assert.equal(f.writes().length,0);
});

test('Concurrent confirmed requests for one account and bucket share their one PUT',async()=>{
  const f=fixture();
  const {promise,resolve}=Promise.withResolvers();
  f.state.holdWrite=promise;
  const first=f.enable(), second=f.enable();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.writes().length,1);
  resolve();
  assert.deepEqual((await Promise.all([first,second])).map(result=>result.data.managedDomain),[domain,domain]);
  assert.equal(f.writes().length,1);
});

test('Custom attach sends the exact zone and hostname, keeps older domains and checks activation independently',async()=>{
  const hostname='new.example.org',zoneId='c'.repeat(32),calls=[];
  let added=false,reads=0;
  const oauth={authority:async()=>({sessionId:'authorized-session',accounts:[{id:source.accountId}]}),async request(path,options){
    assert.equal(path,base+'custom');assert.equal(options.expectedSession,'authorized-session');
    calls.push(options.method??'GET');
    if(options.method==='POST'){
      assert.deepEqual(JSON.parse(options.body),{domain:hostname,zoneId,enabled:true});
      assert.deepEqual(options.requiredScopes,['workers-r2.write']);
      added=true;return Response.json({success:true,result:{domain:hostname,zoneId,enabled:true}});
    }
    const domain=reads++>1?active(hostname):{...active(hostname),status:{ownership:'active',ssl:'initializing'}};
    return Response.json({success:true,result:{domains:[{...active('existing.example.org'),zoneId,zoneName:'example.org'},...(added?[domain]:[])]}});
  }};
  const provider=createR2PublicDomains({oauth});
  await assert.rejects(provider.connectCustomDomain(source,'unowned.example.net'),{code:'CUSTOM_DOMAIN_ZONE_REQUIRED'});
  reads=0;
  assert.deepEqual(await provider.connectCustomDomain(source,hostname),{domain:hostname,state:'pending'});
  assert.deepEqual(await provider.connectCustomDomain(source,hostname,zoneId),{domain:hostname,state:'active'});
  assert.deepEqual(calls,['GET','GET','POST','GET','GET']);
  assert.deepEqual((await provider.readCustomDomains(source,'authorized-session')).map(record=>record.domain),['existing.example.org',hostname]);
});
