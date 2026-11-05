import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createClick2CloudCloudflareOAuth,CLOUDFLARE_SCOPES,CLOUDFLARE_AUTH_KEY,CloudflareOAuthError} from '../src/auth/cloudflare-oauth.mjs';

const extensionId='abcdefghijklmnopabcdefghijklmnop';
const REDIRECT='https://'+extensionId+'.chromiumapp.org/cloudflare';
function store(seed={}) {
  const map=new Map(Object.entries(seed));
  return {
    map,
    async get(keys) {
      const names=Array.isArray(keys)?keys:[keys];return Object.fromEntries(names.map(k=>[k,map.get(k)]));
    },
    async set(values){for(const [k,v] of Object.entries(values))map.set(k,v);},
    async remove(keys){for(const k of (Array.isArray(keys)?keys:[keys]))map.delete(k);}
  };
}
function harness({badState=false,denied=false,expired=false,unverified=false}={}) {
  const local=store({'click2cloud:menus':{narrow:[{id:'saved','aliases':['Art','Photos']}]}});
  const session=store();
  const hits=[],tokens=[];
  let now=1_000_000,tokenCount=0,code='approved-code';
  const chromeApi={
    identity:{
      getRedirectURL:path=>{
        assert.equal(path,'cloudflare');
        return REDIRECT;
      },
      async launchWebAuthFlow({url,interactive}) {
        assert.equal(interactive,true);
        const u=new URL(url);
        assert.equal(u.origin,'https://dash.cloudflare.com');
        assert.equal(u.searchParams.get('code_challenge_method'),'S256');
        assert.equal(u.searchParams.get('client_id'),'click2cloud-public-client');
        assert.deepEqual(u.searchParams.get('scope').split(' '),CLOUDFLARE_SCOPES);
        const callback=new URL(REDIRECT);
        callback.searchParams.set('state',badState?'wrong-state':u.searchParams.get('state'));
        if(denied)callback.searchParams.set('error','access_denied');
        else callback.searchParams.set('code',code);
        return callback.href;
      }
    },
    storage:{local,session}
  };
  const fetchImpl=async (url,options={})=>{
    hits.push({url:String(url),method:options.method||'GET'});
    if(String(url).endsWith('/oauth2/token')){
      const body=new URLSearchParams(options.body);
      if(body.get('grant_type')==='authorization_code') {
        assert.equal(body.get('code'),code);
        assert.ok(body.get('code_verifier')?.length>=43);
      }
      if(body.get('grant_type')==='refresh_token'){
        assert.equal(body.get('refresh_token'),'refresh-1');
      }
      const isRefresh=body.get('grant_type')==='refresh_token';
      const result=isRefresh?{access_token:'access-refreshed',refresh_token:'refresh-1',expires_in:7200}:
        {access_token:'access-original',refresh_token:'refresh-1',expires_in:expired?1:7200};
      tokenCount++;
      tokens.push(result.access_token);
      return {ok:true,status:200,async json(){return result;}};
    }
    if(String(url).includes('/accounts?')){
      const result=unverified?{success:false,errors:[{message:'Denied'}]}:
        {success:true,result:[{id:'account-a',name:'Sample Authorized Account'}]};
      return {ok:!unverified,status:unverified?403:200,async json(){return result;}};
    }
    if(String(url).includes('/r2/buckets')) {
      assert.equal(options.headers.get('Authorization'),'Bearer '+tokens.at(-1));
      return {ok:true,status:200,async json(){return {success:true,result:{buckets:[{name:'redown'}]}};}};
    }
    throw Error('Unexpected URL '+url);
  };
  const auth=createClick2CloudCloudflareOAuth({
    chromeApi,fetchImpl,cryptoApi:webcrypto,
    clientId:'click2cloud-public-client',now:()=>now,
    locks:{request:async (_name,fn)=>fn()}
  });
  return {auth,local,session,hits,advance:ms=>{now+=ms;},get tokenCount(){return tokenCount;}};
}
test('Cannot connect without a separately registered Click2Cloud client ID',()=>{
  assert.throws(()=>createClick2CloudCloudflareOAuth({clientId:''}),e=>e instanceof CloudflareOAuthError&&e.code==='CLIENT_NOT_REGISTERED');
});
test('New Click2Cloud OAuth uses four REDOWN-equivalent scopes without REDOWN auth key',()=>{
  assert.deepEqual(CLOUDFLARE_SCOPES,
    ['workers-r2.read','workers-r2.write','workers-scripts.read','workers-scripts.write']);
  assert.equal(CLOUDFLARE_AUTH_KEY,'click2cloud:cloudflare:auth');
});
test('Valid OAuth PKCE callback verifies Cloudflare account and stores Click2Cloud session',async()=>{
  const h=harness();
  assert.deepEqual(await h.auth.status(),{phase:'disconnected'});
  const connected=await h.auth.connect();
  assert.equal(connected.phase,'connected');
  assert.deepEqual(connected.accounts,[{id:'account-a',name:'Sample Authorized Account'}]);
  const status=await h.auth.status();
  assert.equal(status.phase,'connected');
  assert.equal(status.sessionId,connected.sessionId);
  assert.equal(h.local.map.get(CLOUDFLARE_AUTH_KEY).accessToken,'access-original');
  assert.equal(h.local.map.has('cloudflareAuth'),false);
  assert.equal(h.session.map.size,0);
  assert.ok(h.hits.some(x=>x.url.includes('/accounts?')));
});
test('Forged callback nonce cannot exchange authorization code',async()=>{
  const h=harness({badState:true});
  await assert.rejects(h.auth.connect(),e=>e.code==='INVALID_CALLBACK');
  assert.equal(h.local.map.has(CLOUDFLARE_AUTH_KEY),false);
  assert.equal(h.hits.filter(x=>x.url.endsWith('/oauth2/token')).length,0);
  assert.equal(h.session.map.size,0);
});
test('Denied consent does not create a false connected session',async()=>{
  const h=harness({denied:true});
  await assert.rejects(h.auth.connect(),e=>e.code==='ACCESS_DENIED');
  assert.deepEqual(await h.auth.status(),{phase:'disconnected'});
});
test('Failed account verification never reports verified connected',async()=>{
  const h=harness({unverified:true});
  await assert.rejects(h.auth.connect(),e=>e.code==='ACCOUNT_VERIFICATION_FAILED');
  assert.deepEqual(await h.auth.status(),{phase:'disconnected'});
});
test('Expired token refreshes and authenticated R2 list uses refreshed access token',async()=>{
  const h=harness({expired:true});
  await h.auth.connect();
  h.advance(5000);
  const token=await h.auth.getAccessToken();
  assert.equal(token,'access-refreshed');
  const response=await h.auth.apiRequest('/accounts/account-a/r2/buckets');
  assert.equal((await response.json()).result.buckets[0].name,'redown');
  assert.equal(h.tokenCount,2);
});
test('Disconnect destroys only Click2Cloud OAuth, never Narrow aliases or saved paths',async()=>{
  const h=harness();
  await h.auth.connect();
  await h.auth.disconnect();
  assert.equal(h.local.map.has(CLOUDFLARE_AUTH_KEY),false);
  assert.deepEqual(h.local.map.get('click2cloud:menus'),{narrow:[{id:'saved',aliases:['Art','Photos']}]});
  assert.deepEqual(await h.auth.status(),{phase:'disconnected'});
});
test('Cloudflare API wrapper refuses fully qualified endpoints and protocol-relative paths',async()=>{
  const h=harness();await h.auth.connect();
  await assert.rejects(h.auth.apiRequest('https://other.test/secrets'),e=>e.code==='INVALID_API_PATH');
  await assert.rejects(h.auth.apiRequest('//other.test/path'),e=>e.code==='INVALID_API_PATH');
});
