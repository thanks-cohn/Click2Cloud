export const CLIENT_ID='59535938bc4cc093003b4385a7e2b005';
const base64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const random=()=>base64(crypto.getRandomValues(new Uint8Array(32)));
const localLocks=new WeakMap();
const failure=(code,diagnostic)=>Object.assign(Error(code),{code,...(diagnostic?{diagnostic}:{})});
export function diagnoseCloudflare(response,body,{context='r2',scopes,requiredScopes=[]}={}){
 const httpStatus=response?.status??null,challenge=response?.headers?.get('www-authenticate')??'',messages=[body?.error,...(body?.errors??[]).map(e=>e.message)].filter(x=>typeof x==='string').join(' ').toLowerCase();
 const providerCodes=(body?.errors??[]).map(e=>e.code).filter(c=>typeof c==='number'&&Number.isSafeInteger(c)||typeof c==='string'&&/^[0-9]{1,16}$/.test(c));
 const missingScopes=Array.isArray(scopes)?requiredScopes.filter(s=>!scopes.includes(s)):[];
 let code='R2_STATUS_UNKNOWN',evidence='status-only';
 if(body?.error==='invalid_grant'){code='REAUTH_REQUIRED';evidence='oauth-invalid-grant';}
 else if(['invalid_client','unauthorized_client','access_denied'].includes(body?.error)){code='PROVIDER_AUTH_POLICY_DENIED';evidence='oauth-policy-error';}
 else if(/insufficient_scope/i.test(challenge)||missingScopes.length||/insufficient scope|missing (?:required )?scope|required scope/.test(messages)){code='INSUFFICIENT_SCOPE';evidence=missingScopes.length?'verified-grants':'provider-scope-error';}
 else if(/invalid_token/i.test(challenge)||/invalid (?:access )?token|authentication error|token (?:has )?expired/.test(messages)||httpStatus===401){code=/expired/.test(messages)?'TOKEN_EXPIRED':'REAUTH_REQUIRED';evidence=/invalid_token/i.test(challenge)?'www-authenticate':httpStatus===401?'http-401':'provider-auth-error';}
 else if(/account mismatch|invalid account identifier|account (?:id|identifier) (?:is )?invalid|account.*does not match/.test(messages)){code='WRONG_ACCOUNT';evidence='provider-account-error';}
 else if(/\br2\b.*\bnot (?:enabled|activated)\b|\br2\b.*\bsubscription (?:is )?(?:inactive|disabled)\b/.test(messages)){code='R2_CONFIRMED_INACTIVE';evidence='explicit-r2-unavailable';}
 else if(httpStatus===429||httpStatus===408||httpStatus>=500){code='TRANSIENT_API_FAILURE';evidence='http-transient';}
 else if(context==='worker'&&httpStatus===403){code='WORKER_PERMISSION_DENIED';}
 else if(context==='identity'&&httpStatus===403){code='PROVIDER_AUTH_POLICY_DENIED';}
 return {code,httpStatus,context,evidence,providerCodes,missingScopes,challenge:/invalid_token/i.test(challenge)?'invalid_token':/insufficient_scope/i.test(challenge)?'insufficient_scope':null};
}
async function errorBody(response){
 const reader=response.clone().body?.getReader();if(!reader)return null;const parts=[];let size=0;
 try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>65536)return null;parts.push(r.value);}const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}return JSON.parse(new TextDecoder().decode(bytes));}catch{return null;}finally{void reader.cancel().catch(()=>{});}
}
/** Sole OAuth owner. Tokens/PKCE stay in trusted Chrome storage, never API results. */
export function createCloudflareOAuth({chrome,fetch=globalThis.fetch,clock=Date.now,onConnected=async()=>{},onStatus=()=>{}}={}){
 const key='click2cloudOAuth',attemptKey='click2cloudOAuthAttempt',fenceKey='click2cloudOAuthEpoch';let refreshing,connecting=false,generation=0,mutations=Promise.resolve();
 const registeredScopes=['workers-r2.read','workers-r2.write','workers-scripts.content_read','workers-scripts.edit','offline_access'];
 const registeredRedirect='https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare';
 const read=async()=>(await chrome.storage.local.get(key))[key],attempt=async()=>(await chrome.storage.session.get(attemptKey))[attemptKey],fence=async()=>(await chrome.storage.session.get(fenceKey))[fenceKey];
 const critical=fn=>{if(globalThis.navigator?.locks?.request)return globalThis.navigator.locks.request('click2cloud-cloudflare-session',fn);const task=(localLocks.get(chrome)??Promise.resolve()).then(fn);localLocks.set(chrome,task.catch(()=>{}));return task;};
 const store=(value,expected=generation)=>{const task=mutations.then(async()=>{if(expected!==generation)throw failure('AUTH_SESSION_CHANGED');await chrome.storage.local.set({[key]:value});});mutations=task.catch(()=>{});return task;};
 async function token(body){
  let response;try{response=await fetch('https://dash.cloudflare.com/oauth2/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...body,client_id:CLIENT_ID}),redirect:'error',signal:AbortSignal.timeout(30000)});}catch{throw failure('TRANSIENT_API_FAILURE');}
  const data=await response.json().catch(()=>null);
  if(!response.ok){const d=diagnoseCloudflare(response,data,{context:'token'});throw failure(d.code,d);}
  if(typeof data?.access_token!=='string'||!Number.isFinite(Number(data.expires_in))||Number(data.expires_in)<=0||!Number.isSafeInteger(clock()+Number(data.expires_in)*1000))throw failure('OAUTH_RESPONSE_INVALID');return data;
 }
 async function verifyIdentity(expectedSession){
  const initial=await read();if(!initial?.accessToken||expectedSession&&initial.sessionId!==expectedSession)throw failure('AUTH_SESSION_CHANGED');
  const initialFence=await fence();let accounts=[],page=1,total=1;
  try{do{const r=await fetch('https://api.cloudflare.com/client/v4/accounts?per_page=50'+(page>1?'&page='+page:''),{headers:{authorization:'Bearer '+initial.accessToken},redirect:'error',signal:AbortSignal.timeout(30000)}),b=await r.json().catch(()=>null);
   if(!r.ok||b?.success!==true||!Array.isArray(b.result)){const d=diagnoseCloudflare(r,b,{context:'identity'});throw failure(d.code,d);}accounts.push(...b.result.map(a=>({id:a.id,name:a.name})));total=b.result_info?.total_pages??1;if(!Number.isSafeInteger(total)||total<page)throw failure('OAUTH_IDENTITY_UNVERIFIED');page++;
  }while(page<=total);if(!accounts.length||accounts.some(a=>typeof a.id!=='string'||!a.id))throw failure('OAUTH_IDENTITY_UNVERIFIED');
   await critical(async()=>{const current=await read();if(current?.sessionId!==initial.sessionId||await fence()!==initialFence)throw failure('AUTH_SESSION_CHANGED');await store({...current,accounts,identityPending:false,diagnostic:null});if(initial.identityPending)await chrome.storage.session.set({[attemptKey]:{phase:'connected'}});});return accounts;
  }catch(e){const code=e.code??'TRANSIENT_API_FAILURE';await critical(async()=>{const current=await read();if(current?.sessionId===initial.sessionId&&await fence()===initialFence)await store({...current,identityPending:true,diagnostic:{code,...(e.diagnostic?{httpStatus:e.diagnostic.httpStatus,providerCodes:e.diagnostic.providerCodes,evidence:e.diagnostic.evidence}:{})}});});throw failure(code,e.diagnostic);}
 }
 async function completeCallback(callback,{fromEvent=false}={}){
  let claimed;
  await critical(async()=>{const a=await attempt();if(!a||a.phase!=='authorizing')return;let result;try{result=new URL(callback);}catch{if(fromEvent)return;throw failure('OAUTH_CALLBACK_REJECTED');}const expected=new URL(a.redirect);
   if(result.origin!==expected.origin||result.pathname!==expected.pathname||result.searchParams.get('state')!==a.state||a.expires<clock()){if(fromEvent)return;throw failure('OAUTH_CALLBACK_REJECTED');}
   if(result.searchParams.has('error'))throw failure(['access_denied','unauthorized_client'].includes(result.searchParams.get('error'))?'PROVIDER_AUTH_POLICY_DENIED':'OAUTH_CALLBACK_REJECTED');
   if(!result.searchParams.get('code'))throw failure('OAUTH_CALLBACK_REJECTED');claimed={...a,code:result.searchParams.get('code')};await chrome.storage.session.set({[attemptKey]:{...a,phase:'exchanging'}});
  });
  if(!claimed){if((await attempt())?.phase==='connected')connecting=false;return status();}
  try{const data=await token({grant_type:'authorization_code',code:claimed.code,redirect_uri:claimed.redirect,code_verifier:claimed.verifier}),granted=typeof data.scope==='string'?data.scope.split(' '):claimed.scopes;
   const session={sessionId:random(),accessToken:data.access_token,refreshToken:data.refresh_token??null,expiresAt:clock()+Number(data.expires_in)*1000,scopes:granted,scopeEvidence:typeof data.scope==='string'?'provider-returned':'oauth-default-requested',accounts:[],identityPending:true,diagnostic:null};
   await critical(async()=>{const a=await attempt();if(a?.state!==claimed.state||a.phase!=='exchanging'||await fence()!==claimed.state)throw failure('OAUTH_CANCELLED');await store(session);await chrome.storage.session.set({[attemptKey]:{phase:'verifying',expires:claimed.expires}});});
   await verifyIdentity(session.sessionId);await critical(async()=>{if((await read())?.sessionId!==session.sessionId||await fence()!==claimed.state)throw failure('AUTH_SESSION_CHANGED');await chrome.storage.session.set({[attemptKey]:{phase:'connected'}});});connecting=false;await onConnected();return status();
  }catch(e){const a=await attempt();if(await fence()===claimed.state&&(a?.phase==='exchanging'||a?.phase==='verifying'))await chrome.storage.session.set({[attemptKey]:{phase:'failed',code:e.code??'TRANSIENT_API_FAILURE'}});throw failure(e.code??'TRANSIENT_API_FAILURE',e.diagnostic);}
 }
 async function connect(scopes=registeredScopes){
  const prior=await attempt();if(connecting||['authorizing','exchanging','verifying'].includes(prior?.phase)&&prior.expires>clock())throw failure('LOGIN_IN_PROGRESS');
  if(chrome.identity.getRedirectURL('cloudflare')!==registeredRedirect)throw failure('OAUTH_REDIRECT_SETUP_REQUIRED');
  if(!Array.isArray(scopes)||scopes.join(' ')!==registeredScopes.join(' '))throw failure('OAUTH_REGISTERED_SCOPES_REQUIRED');
  connecting=true;const epoch=++generation,state=random(),verifier=random(),redirect=registeredRedirect,challenge=base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  try{if(epoch!==generation)throw failure('OAUTH_CANCELLED');await chrome.storage.session.set({[fenceKey]:state,[attemptKey]:{state,verifier,redirect,scopes,phase:'authorizing',expires:clock()+300000}});
   const url=new URL('https://dash.cloudflare.com/oauth2/auth');url.search=new URLSearchParams({client_id:CLIENT_ID,redirect_uri:redirect,response_type:'code',scope:scopes.join(' '),state,code_challenge:challenge,code_challenge_method:'S256'});
   const callback=await chrome.identity.launchWebAuthFlow({url:url.href,interactive:true});if(epoch!==generation)throw failure('OAUTH_CANCELLED');return await completeCallback(callback);
  }catch(e){const a=await attempt();if(a?.state===state)await chrome.storage.session.set({[attemptKey]:{phase:'failed',code:e.code??'OAUTH_CANCELLED_OR_UNAVAILABLE'}});throw failure(e.code??'OAUTH_CANCELLED_OR_UNAVAILABLE',e.diagnostic);}finally{connecting=false;}
 }
 async function access(rejectedToken,expectedSession){
  const s=await read();if(!s?.accessToken||!Array.isArray(s.accounts)&&!s.identityPending||s.reconnectRequired)throw failure(s?.reconnectRequired?'REAUTH_REQUIRED':'AUTH_REQUIRED');if(expectedSession&&s.sessionId!==expectedSession)throw failure('AUTH_SESSION_CHANGED');
  if(s.accessToken!==rejectedToken&&s.expiresAt>clock()+60000){if(s.identityPending)await verifyIdentity(s.sessionId);return await read();}
  return refreshing??=(critical(async()=>{const epoch=generation,old=await read(),initialFence=await fence();if(!old||expectedSession&&old.sessionId!==expectedSession)throw failure('AUTH_SESSION_CHANGED');
   if(old.accessToken!==rejectedToken&&old.expiresAt>clock()+60000)return old;
   if(!old.refreshToken){await store({...old,reconnectRequired:true,diagnostic:{code:'REAUTH_REQUIRED'}},epoch);throw failure('REAUTH_REQUIRED');}
   let data;try{data=await token({grant_type:'refresh_token',refresh_token:old.refreshToken});}catch(e){if((await read())?.sessionId===old.sessionId&&await fence()===initialFence&&['REAUTH_REQUIRED','PROVIDER_AUTH_POLICY_DENIED'].includes(e.code))await store({...old,reconnectRequired:true,diagnostic:{code:e.code}},epoch);throw e;}
   if((await read())?.sessionId!==old.sessionId||await fence()!==initialFence)throw failure('AUTH_SESSION_CHANGED');const next={...old,accessToken:data.access_token,refreshToken:data.refresh_token??old.refreshToken,expiresAt:clock()+Number(data.expires_in)*1000,scopes:typeof data.scope==='string'?data.scope.split(' '):old.scopes,reconnectRequired:false,diagnostic:null};await store(next,epoch);return next;
  })).finally(()=>{refreshing=null;});
 }
 async function request(path,options={}){
  if(typeof path!=='string'||!/^\/accounts(?:[/?]|$)/.test(path)||path.includes('..'))throw failure('PROVIDER_PATH_DENIED');
  const {timeoutMs=30000,...fetchOptions}=options,session=await access(),account=/^\/accounts\/([^/?]+)/.exec(path)?.[1];if(account&&!session.accounts.some(a=>a.id===decodeURIComponent(account)))throw failure('WRONG_ACCOUNT');
  const method=String(fetchOptions.method??'GET').toUpperCase(),safe=['GET','HEAD'].includes(method),run=async current=>{if((await read())?.sessionId!==session.sessionId)throw failure('AUTH_SESSION_CHANGED');const headers=new Headers(fetchOptions.headers);headers.set('authorization','Bearer '+current.accessToken);return fetch('https://api.cloudflare.com/client/v4'+path,{...fetchOptions,headers,redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(timeoutMs),...(fetchOptions.signal?[fetchOptions.signal]:[])])});};
  let response;try{response=await run(session);}catch(e){if(e.code)throw e;throw failure('TRANSIENT_API_FAILURE');}
  const b=[401,403].includes(response.status)?await errorBody(response):null,diagnostic=diagnoseCloudflare(response,b,{context:path.includes('/workers')?'worker':'r2'});
  if(safe&&['TOKEN_EXPIRED','REAUTH_REQUIRED'].includes(diagnostic.code)&&[401,403].includes(response.status)&&session.refreshToken){await response.body?.cancel();const renewed=await access(session.accessToken,session.sessionId);try{response=await run(renewed);}catch{throw failure('TRANSIENT_API_FAILURE');}}
  if((await read())?.sessionId!==session.sessionId)throw failure('AUTH_SESSION_CHANGED');
  if(!safe&&[401,403].includes(response.status)&&['TOKEN_EXPIRED','REAUTH_REQUIRED'].includes(diagnostic.code)&&session.refreshToken){await access(session.accessToken,session.sessionId);throw failure('TOKEN_EXPIRED',diagnostic);}
  if(response.status===401){await critical(async()=>{const current=await read();if(current?.sessionId!==session.sessionId)throw failure('AUTH_SESSION_CHANGED');await store({...current,reconnectRequired:true,diagnostic:{code:'REAUTH_REQUIRED'}});});throw failure('REAUTH_REQUIRED',diagnostic);}return response;
 }
 async function cancel(){generation++;connecting=false;await chrome.storage.session.set({[fenceKey]:random(),[attemptKey]:{phase:'cancelled'}});return status();}
 async function status(){const s=await read(),a=await attempt(),busy=['authorizing','exchanging','verifying'].includes(a?.phase)&&a.expires>clock(),verified=s&&Array.isArray(s.accounts)&&s.accounts.length>0&&!s.identityPending,live=s&&!s.reconnectRequired&&(s.expiresAt>clock()||s.refreshToken);
  const result={state:busy||connecting?'CONNECTING':live&&s.identityPending?'VERIFYING':live&&verified?'CONNECTED':'DISCONNECTED',authenticated:!!live,identityVerified:!!verified,diagnostic:s?.diagnostic??(a?.code?{code:a.code}:null),provider:'cloudflare',connections:live&&verified?s.accounts.map(a=>({provider:'cloudflare',connectionId:'cloudflare:'+a.id,accountId:a.id,connected:true})):[],accounts:live&&verified?s.accounts:[],scopes:live?s.scopes:[],scopeEvidence:s?.scopeEvidence??'legacy',redirectUri:registeredRedirect};try{onStatus(result);}catch{}return result;}
 async function authority(){let s=await access();if(s.identityPending){await verifyIdentity(s.sessionId);s=await read();}if(!Array.isArray(s.accounts)||!s.accounts.length)throw failure('OAUTH_IDENTITY_UNVERIFIED');return {sessionId:s.sessionId,accounts:s.accounts,scopes:s.scopes};}
 // Exact registered callback + state/expiry + single claim, with no tab/window owner.
 chrome.webNavigation?.onBeforeNavigate?.addListener(details=>{if(details.frameId===0)void completeCallback(details.url,{fromEvent:true}).catch(()=>{});},{url:[{hostEquals:new URL(registeredRedirect).hostname}]});
 return Object.freeze({connect,request,status,authority,cancel,async disconnect(){await cancel();await critical(async()=>{const task=mutations.then(()=>chrome.storage.local.remove(key));mutations=task.catch(()=>{});await task;});return status();}});
}
