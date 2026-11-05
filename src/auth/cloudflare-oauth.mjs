export const CLIENT_ID='59535938bc4cc093003b4385a7e2b005';
const base64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const random=()=>base64(crypto.getRandomValues(new Uint8Array(32)));
const failure=code=>Object.assign(Error(code),{code});
/** Only the trusted service worker receives tokens; neither API nor diagnostics returns them. */
export function createCloudflareOAuth({chrome,fetch=globalThis.fetch,clock=Date.now,onConnected=async()=>{}}={}) {
  const key='click2cloudOAuth';let refreshing;
  const read=async()=>(await chrome.storage.local.get(key))[key];
  const store=value=>chrome.storage.local.set({[key]:value});
  async function token(body) {
    const response=await fetch('https://dash.cloudflare.com/oauth2/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...body,client_id:CLIENT_ID}),redirect:'error',signal:AbortSignal.timeout(30000)});
    const data=await response.json();if(!response.ok||typeof data.access_token!=='string'||!Number.isFinite(Number(data.expires_in))||Number(data.expires_in)<=0)throw failure('OAUTH_TOKEN_REJECTED');return data;
  }
  async function connect(scopes) {
    // Scope IDs must be supplied from the owner's verified registration, not guessed dashboard labels.
    if(!Array.isArray(scopes)||!scopes.length||scopes.some(s=>typeof s!=='string'||!/^[a-z0-9._:-]+$/i.test(s)))throw failure('OAUTH_REGISTERED_SCOPES_REQUIRED');
    const state=random(),verifier=random(),redirect=chrome.identity.getRedirectURL('cloudflare');
    const challenge=base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
    await chrome.storage.session.set({click2cloudOAuthAttempt:{state,verifier,redirect,expires:clock()+300000}});
    const url=new URL('https://dash.cloudflare.com/oauth2/auth');url.search=new URLSearchParams({client_id:CLIENT_ID,redirect_uri:redirect,response_type:'code',scope:scopes.join(' '),state,code_challenge:challenge,code_challenge_method:'S256'});
    try {
      const callback=await chrome.identity.launchWebAuthFlow({url:url.href,interactive:true});
      const attempt=(await chrome.storage.session.get('click2cloudOAuthAttempt')).click2cloudOAuthAttempt;
      await chrome.storage.session.remove('click2cloudOAuthAttempt');
      const result=new URL(callback),expected=new URL(redirect);
      if(!attempt||attempt.expires<clock()||result.origin!==expected.origin||result.pathname!==expected.pathname||result.searchParams.get('state')!==attempt.state||!result.searchParams.get('code')||result.searchParams.has('error'))throw failure('OAUTH_CALLBACK_REJECTED');
      const data=await token({grant_type:'authorization_code',code:result.searchParams.get('code'),redirect_uri:redirect,code_verifier:attempt.verifier});
      const session={sessionId:random(),accessToken:data.access_token,refreshToken:data.refresh_token??null,expiresAt:clock()+Number(data.expires_in)*1000,scopes:typeof data.scope==='string'?data.scope.split(' '):scopes};
      await store(session);await onConnected();return status();
    } finally {await chrome.storage.session.remove('click2cloudOAuthAttempt');}
  }
  async function access() {
    const session=await read();if(!session||session.reconnectRequired)throw failure('AUTH_REQUIRED');
    if(session.expiresAt>clock()+60000)return session;
    return refreshing??=(async()=>{
      const old=await read();if(!old?.refreshToken)throw failure('AUTH_REQUIRED');
      let data;try{data=await token({grant_type:'refresh_token',refresh_token:old.refreshToken});}catch(e){if((await read())?.sessionId===old.sessionId)await store({...old,reconnectRequired:true});throw e;}
      if((await read())?.sessionId!==old.sessionId)throw failure('AUTH_SESSION_CHANGED');
      const next={...old,accessToken:data.access_token,refreshToken:data.refresh_token??old.refreshToken,expiresAt:clock()+Number(data.expires_in)*1000};await store(next);return next;
    })().finally(()=>{refreshing=null;});
  }
  async function request(path,options={}) {
    if(typeof path!=='string'||!path.startsWith('/accounts')||path.includes('..'))throw failure('PROVIDER_PATH_DENIED');
    const session=await access();const headers=new Headers(options.headers);headers.set('authorization','Bearer '+session.accessToken);
    const response=await fetch('https://api.cloudflare.com/client/v4'+path,{...options,headers,redirect:'error',signal:options.signal??AbortSignal.timeout(30000)});
    if((await read())?.sessionId!==session.sessionId)throw failure('AUTH_SESSION_CHANGED');
    if(response.status===401||response.status===403)throw failure('PROVIDER_AUTH_REJECTED');return response;
  }
  async function status(){const s=await read();return {state:s&&!s.reconnectRequired?'AUTHORIZED':'UNAUTHORIZED',sessionId:s?.sessionId??null,scopes:s?.scopes??[],redirectUri:chrome.identity.getRedirectURL('cloudflare')};}
  return Object.freeze({connect,request,status,disconnect:()=>chrome.storage.local.remove(key)});
}
