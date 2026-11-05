/**
 * Click2Cloud Cloudflare OAuth 2.0 authorization-code + PKCE S256.
 * The new Cloudflare client must be registered for THIS extension's redirect URL.
 *
 * This is a privileged EXTENSION-CONTEXT MODULE. Call from background / service
 * worker only; do not expose access tokens in runtime message responses or DOM.
 * No REDOWN auth state, extension identity, app ID or secrets are reused.
 */
export const CLOUDFLARE_SCOPES = Object.freeze([
  'workers-r2.read', 'workers-r2.write',
  'workers-scripts.read', 'workers-scripts.write'
]);
export const CLOUDFLARE_AUTH_KEY = 'click2cloud:cloudflare:auth';
const ATTEMPT_KEY = 'click2cloud:cloudflare:oauth-attempt';
const AUTH = 'https://dash.cloudflare.com/oauth2/auth';
const TOKEN = 'https://dash.cloudflare.com/oauth2/token';
const API = 'https://api.cloudflare.com/client/v4';
const EARLY_REFRESH_MS = 60_000;
const TIMEOUT_MS = 5 * 60_000;

export class CloudflareOAuthError extends Error {
  constructor(code, message) { super(message); this.name='CloudflareOAuthError'; this.code=code; }
}

const problem=(code,message)=>new CloudflareOAuthError(code,message);
const b64url = bytes => {
  let binary=''; for(const b of bytes)binary+=String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
};
const random = (c,bytes=32)=>b64url(c.getRandomValues(new Uint8Array(bytes)));
const challenge = async (c,verifier)=>b64url(new Uint8Array(
  await c.subtle.digest('SHA-256',new TextEncoder().encode(verifier))
));
function responseError(body, fallback) {
  return String(body?.errors?.[0]?.message || body?.error_description || body?.error || fallback);
}
function sanitizedAuth(auth) {
  if(!auth?.accessToken) return {phase:'disconnected'};
  return {phase:auth.reconnectRequired?'reconnect-required':auth.verifiedAt?'connected':'authorized-not-verified',
    expiresAt:auth.expiresAt||null, sessionId:auth.sessionId||null};
}
function formFields(fields){return new URLSearchParams(Object.entries(fields).filter(([,v])=>v!==undefined&&v!==null));}

/**
 * Inject Chrome/fetch/crypto for deterministic tests. A client ID is a public
 * identifier, not a secret, but must come from a registered Click2Cloud client.
 */
export function createClick2CloudCloudflareOAuth({
  chromeApi=globalThis.chrome, fetchImpl=globalThis.fetch,
  cryptoApi=globalThis.crypto, clientId='', now=()=>Date.now(),
  timeoutMs=30000, locks=globalThis.navigator?.locks
}={}) {
  if(typeof clientId!=='string'||!clientId.trim())
    throw problem('CLIENT_NOT_REGISTERED','Click2Cloud needs its own registered Cloudflare OAuth client ID.');
  if(!chromeApi?.identity?.getRedirectURL || !chromeApi?.identity?.launchWebAuthFlow ||
     !chromeApi?.storage?.local || !chromeApi?.storage?.session)
    throw problem('CHROME_EXTENSION_REQUIRED','Cloudflare OAuth requires a trusted installed Click2Cloud Chrome extension.');
  if(typeof fetchImpl!=='function'||!cryptoApi?.getRandomValues||!cryptoApi?.subtle?.digest)
    throw problem('RUNTIME_UNAVAILABLE','Secure OAuth browser primitives are missing.');

  const redirectUri=chromeApi.identity.getRedirectURL('cloudflare');
  if(!/^https:\/\/[a-p]{32}\.chromiumapp\.org\/cloudflare\/?$/.test(redirectUri))
    throw problem('INVALID_REDIRECT','Click2Cloud requires its Chrome identity redirect for Cloudflare.');
  let connecting=null,refreshing=null;

  const withLock=(name,fn)=>locks?.request?locks.request('click2cloud-'+name,fn):fn();
  const getSaved=async()=> (await chromeApi.storage.local.get(CLOUDFLARE_AUTH_KEY))[CLOUDFLARE_AUTH_KEY]||null;
  const store=async auth=>chromeApi.storage.local.set({[CLOUDFLARE_AUTH_KEY]:auth});
  const eraseAttempt=()=>chromeApi.storage.session.remove(ATTEMPT_KEY);

  async function postToken(fields) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const res=await fetchImpl(TOKEN,{
        method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:formFields({client_id:clientId,...fields}),signal:controller.signal,
        cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'
      });
      const body=await res.json().catch(()=>({}));
      if(!res.ok||!body?.access_token) {
        const e=problem('TOKEN_REJECTED',responseError(body,'Cloudflare did not issue an access token.'));
        e.oauthCode=body?.error||'';throw e;
      }
      return body;
    }catch(error){
      if(error?.name==='AbortError') throw problem('TOKEN_TIMEOUT','Cloudflare token exchange timed out.');
      throw error;
    }finally{clearTimeout(timer);}
  }

  async function verifyAccount(accessToken) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const res=await fetchImpl(API+'/accounts?per_page=50',{
        headers:{Authorization:'Bearer '+accessToken},cache:'no-store',
        credentials:'omit',redirect:'error',signal:controller.signal
      });
      const body=await res.json().catch(()=>({}));
      if(!res.ok||body.success!==true||!Array.isArray(body.result))
        throw problem('ACCOUNT_VERIFICATION_FAILED',responseError(body,'Cloudflare account verification failed.'));
      return body.result.map(x=>({id:x.id,name:x.name}));
    }catch(error){
      if(error?.name==='AbortError')throw problem('ACCOUNT_TIMEOUT','Cloudflare account verification timed out.');
      throw error;
    }finally{clearTimeout(timer);}
  }

  async function connectUnlocked() {
    const existing=(await chromeApi.storage.session.get(ATTEMPT_KEY))[ATTEMPT_KEY];
    if(existing) await eraseAttempt(); // no stale pending PKCE verifier is ever reused
    const state=random(cryptoApi,24);
    const verifier=random(cryptoApi,48);
    const requestId=cryptoApi.randomUUID?.()||random(cryptoApi,16);
    const at=now();
    const attempt={state,verifier,requestId,redirectUri,at};
    await chromeApi.storage.session.set({[ATTEMPT_KEY]:attempt});
    const url=new URL(AUTH);
    url.searchParams.set('client_id',clientId);
    url.searchParams.set('response_type','code');
    url.searchParams.set('redirect_uri',redirectUri);
    url.searchParams.set('code_challenge',await challenge(cryptoApi,verifier));
    url.searchParams.set('code_challenge_method','S256');
    url.searchParams.set('state',state);
    url.searchParams.set('scope',CLOUDFLARE_SCOPES.join(' '));

    try{
      const responseUrl=await chromeApi.identity.launchWebAuthFlow({url:url.href,interactive:true});
      // Verify exact Chrome redirect (not any website) and the persisted nonce.
      const saved=(await chromeApi.storage.session.get(ATTEMPT_KEY))[ATTEMPT_KEY];
      await eraseAttempt(); // consume nonce before redeeming one-use code
      if(!saved||saved.requestId!==requestId||saved.state!==state||saved.redirectUri!==redirectUri||now()-saved.at>=TIMEOUT_MS)
        throw problem('EXPIRED_ATTEMPT','Cloudflare sign-in expired or another attempt replaced it.');
      if(!responseUrl)throw problem('CANCELLED','Cloudflare sign-in was cancelled.');
      const incoming=new URL(responseUrl), expected=new URL(redirectUri);
      if(incoming.origin!==expected.origin||incoming.pathname!==expected.pathname||
         incoming.username||incoming.password||incoming.hash||
         incoming.searchParams.getAll('state').length!==1||incoming.searchParams.get('state')!==state)
        throw problem('INVALID_CALLBACK','The Cloudflare OAuth callback did not match this sign-in attempt.');
      if(incoming.searchParams.get('error'))
        throw problem('ACCESS_DENIED',incoming.searchParams.get('error_description')||'Cloudflare authorization was declined.');
      if(incoming.searchParams.getAll('code').length!==1||!incoming.searchParams.get('code'))
        throw problem('MISSING_CODE','Cloudflare did not return a valid authorization code.');
      const token=await postToken({grant_type:'authorization_code',code:incoming.searchParams.get('code'),redirect_uri:redirectUri,code_verifier:verifier});
      // Verify the token before showing "Connected" or persisting a new session.
      const accounts=await verifyAccount(token.access_token);
      const auth={
        sessionId:cryptoApi.randomUUID?.()||random(cryptoApi,16),
        accessToken:token.access_token,
        refreshToken:token.refresh_token||null,
        expiresAt:Number.isFinite(Number(token.expires_in))?now()+Number(token.expires_in)*1000:null,
        reconnectRequired:false,accountIds:accounts.map(a=>a.id),verifiedAt:now()
      };
      await store(auth);
      return Object.freeze({phase:'connected',accounts,sessionId:auth.sessionId});
    }finally{await eraseAttempt();}
  }

  async function connect() {
    if(!connecting)connecting=connectUnlocked().finally(()=>{connecting=null;});
    return connecting;
  }

  async function refreshUnlocked({force=false,expectedSession}={}) {
    const current=await getSaved();
    if(!current?.accessToken)throw problem('DISCONNECTED','Connect Cloudflare first.');
    if(current.reconnectRequired)throw problem('RECONNECT_REQUIRED','Reconnect Cloudflare to renew authorization.');
    if(expectedSession && current.sessionId!==expectedSession)
      throw problem('SESSION_CHANGED','Cloudflare connection changed; refresh the File Explorer.');
    if(!force&&(!current.expiresAt || now()<current.expiresAt-EARLY_REFRESH_MS))
      return current.accessToken;
    if(!current.refreshToken){
      await store({...current,reconnectRequired:true});
      throw problem('RECONNECT_REQUIRED','Cloudflare session expired; reconnect Cloudflare.');
    }
    let token;
    try {token=await postToken({grant_type:'refresh_token',refresh_token:current.refreshToken});}
    catch(e){
      if(e?.oauthCode==='invalid_grant') {
        await store({...current,reconnectRequired:true});
        throw problem('RECONNECT_REQUIRED','Cloudflare authorization was revoked or expired. Reconnect.');
      }
      throw e;
    }
    const after=await getSaved();
    if(after?.sessionId!==current.sessionId)
      throw problem('SESSION_CHANGED','Cloudflare connection changed during token renewal.');
    const renewed={...after,accessToken:token.access_token,
      refreshToken:token.refresh_token||after.refreshToken,
      expiresAt:Number.isFinite(Number(token.expires_in))?now()+Number(token.expires_in)*1000:null,
      reconnectRequired:false};
    await store(renewed);
    return renewed.accessToken;
  }
  function getAccessToken(options={}) {
    // Locks serialize refreshes across extension contexts, not only this instance.
    if(!refreshing) refreshing=withLock('cloudflare-refresh',()=>refreshUnlocked(options)).finally(()=>{refreshing=null;});
    return refreshing;
  }

  async function status() {return sanitizedAuth(await getSaved());}
  async function accountStatus() {
    const token=await getAccessToken();
    const accounts=await verifyAccount(token);
    return Object.freeze({phase:'connected',accounts});
  }
  async function disconnect() {
    await chromeApi.storage.local.remove(CLOUDFLARE_AUTH_KEY);
    await eraseAttempt();
    // Deliberately preserve menu choices, Narrow aliases, Depth and backups.
    return {phase:'disconnected'};
  }
  async function apiRequest(path,options={}) {
    if(typeof path!=='string'||!/^\/(?!\/)/.test(path))
      throw problem('INVALID_API_PATH','Only relative Cloudflare management API paths are allowed.');
    const current=await getSaved();
    if(!current?.sessionId)throw problem('DISCONNECTED','Connect Cloudflare first.');
    let token=await getAccessToken({expectedSession:current.sessionId});
    const send=accessToken=>{
      const headers=new Headers(options.headers||{});
      headers.set('Authorization','Bearer '+accessToken);
      return fetchImpl(API+path,{
        ...options,headers,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'
      });
    };
    let response=await send(token);
    if(response.status===401) {
      await response.body?.cancel?.();
      token=await getAccessToken({force:true,expectedSession:current.sessionId});
      response=await send(token);
    }
    if((await getSaved())?.sessionId!==current.sessionId)
      throw problem('SESSION_CHANGED','Cloudflare account changed during request.');
    return response;
  }
  return Object.freeze({connect,status,accountStatus,getAccessToken,apiRequest,disconnect,redirectUri,
    scopes:[...CLOUDFLARE_SCOPES]});
}
