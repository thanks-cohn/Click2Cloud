import test from 'node:test';import assert from 'node:assert/strict';import {createCloudflareOAuth} from '../src/auth/cloudflare-oauth.mjs';
function fixture({badState=false,denied=false}={}){
 const local={},session={},calls=[];let flow;
 const storage=data=>({get:async k=>({[k]:data[k]}),set:async v=>Object.assign(data,v),remove:async k=>{delete data[k];}});
 const chrome={storage:{local:storage(local),session:storage(session)},identity:{getRedirectURL:()=> 'https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare',launchWebAuthFlow:async({url})=>{const u=new URL(url);calls.push(['authorize',u]);return flow?flow():chrome.identity.getRedirectURL()+'?code=one-use&state='+(badState?'wrong':u.searchParams.get('state'));}}};
 let grants=0;const fetch=async(url,options)=>{calls.push([url,options]);if(url.includes('/oauth2/token')){grants++;return new Response(JSON.stringify({access_token:'private-access',refresh_token:'private-refresh',expires_in:3600}),{status:200});}return new Response(JSON.stringify({success:!denied,result:denied?[]:[{id:'fixture-account',name:'Fixture account'}]}),{status:denied?403:200});};
 const auth=createCloudflareOAuth({chrome,fetch});return {auth,calls,local,session,grants:()=>grants,setFlow:fn=>{flow=fn;}};
}
test('PKCE login uses verified scopes and exact redirect; verifies identity before safe connected status',async()=>{
 const f=fixture(),status=await f.auth.connect();assert.equal(status.state,'CONNECTED');assert.deepEqual(status.accounts,[{id:'fixture-account',name:'Fixture account'}]);assert(!JSON.stringify(status).includes('private-'));
 const u=f.calls[0][1];assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.equal(u.searchParams.get('scope'),'workers-r2.read workers-r2.write workers-scripts.content_read workers-scripts.edit offline_access');
 assert.equal(f.calls.length,3);assert(!f.calls.some(c=>/bucket|worker|object/.test(String(c[0]))));
});
test('OAuth state mismatch never exchanges code; failed identity never becomes Connected',async()=>{
 const f=fixture({badState:true});await assert.rejects(f.auth.connect(),{code:'OAUTH_CALLBACK_REJECTED'});assert.equal(f.grants(),0);assert.equal((await f.auth.status()).state,'DISCONNECTED');
 const denied=fixture({denied:true});await assert.rejects(denied.auth.connect(),{code:'OAUTH_IDENTITY_UNVERIFIED'});assert.equal((await denied.auth.status()).state,'DISCONNECTED');
});
test('cancel pending login prevents late callback from reauthorizing; duplicate login is rejected',async()=>{
 const f=fixture();let resolve;f.setFlow(()=>new Promise(r=>{resolve=r;}));const pending=f.auth.connect();
 while(!resolve)await new Promise(r=>setTimeout(r,0));assert.equal((await f.auth.status()).state,'CONNECTING');await assert.rejects(f.auth.connect(),{code:'LOGIN_IN_PROGRESS'});
 const a=f.session.click2cloudOAuthAttempt;await f.auth.cancel();resolve(a.redirect+'?code=late&state='+a.state);await assert.rejects(pending);assert.equal((await f.auth.status()).state,'DISCONNECTED');assert.equal(f.grants(),0);
});
