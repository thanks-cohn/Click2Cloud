import {diagnoseCloudflare} from '../auth/cloudflare-oauth.mjs';
import {developmentalDomain, domainName, verifiedDevelopmentDomain, verifiedDomains} from '../explorer/object-exports.mjs';
import {scopeKey} from '../core/menu-identity.mjs';

const failure = code => Object.assign(Error(code), {code});
const authFailures = new Set(['AUTH_REQUIRED','REAUTH_REQUIRED','TOKEN_EXPIRED','AUTH_SESSION_CHANGED',
  'AUTHORIZATION_REVOKED','INSUFFICIENT_SCOPE','PUBLIC_DOMAIN_ACCESS_DENIED']);

export function createR2PublicDomains({oauth, assertConnected=()=>{}, readbackDelays=[200,450]}={}) {
  const activations = new Map();
  const path = ({accountId,bucketName}) => `/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/domains/`;

  async function request(source, endpoint, options, errorCode) {
    assertConnected();
    const response = await oauth.request(path(source)+endpoint, {cache:'no-store',timeoutMs:15000,...options});
    const body = await response.json().catch(()=>null);
    assertConnected();
    if (response.ok && body?.success===true && body.result && typeof body.result==='object') return body;
    const {code,providerCodes} = diagnoseCloudflare(response,body);
    if (['REAUTH_REQUIRED','TOKEN_EXPIRED','INSUFFICIENT_SCOPE','WRONG_ACCOUNT'].includes(code)) throw failure(code);
    if (options.method==='POST')throw Object.assign(failure(response.status===403?'CUSTOM_DOMAIN_ACCESS_DENIED':errorCode),
      {httpStatus:response.status,providerCodes:providerCodes.slice(0,8)});
    if (response.status===403) throw failure(options.method==='PUT'?'PUBLIC_URL_ACTIVATION_DENIED':'PUBLIC_DOMAIN_ACCESS_DENIED');
    if (response.status===404) throw failure('SELECTED_BUCKET_MISSING');
    throw failure(errorCode);
  }

  async function readManagedDomain(source, expectedSession) {
    const {result} = await request(source,'managed',{expectedSession},'MANAGED_DOMAIN_UNAVAILABLE');
    if (typeof result.enabled!=='boolean') throw failure('MANAGED_DOMAIN_UNAVAILABLE');
    return result;
  }

  async function readCustomDomains(source, expectedSession) {
    const records = [], seen = new Set();
    let query='', page=1;
    // The documented response contains result.domains. Follow explicit
    // continuation metadata when present and retain any pages we did verify.
    try {
      for (;;) {
        const {result,result_info:info} = await request(source,'custom'+query,{expectedSession},'DOMAIN_LIST_UNAVAILABLE');
        if (!Array.isArray(result.domains)) throw failure('DOMAIN_LIST_UNAVAILABLE');
        for (const record of result.domains) records.push(record);
        const cursor = result.cursor ?? info?.cursor;
        const total = info?.total_pages;
        if (cursor) {
          if (typeof cursor!=='string') throw failure('DOMAIN_LIST_INCOMPLETE');
          query='?'+new URLSearchParams({cursor});
        } else if (total!==undefined && (!Number.isSafeInteger(total) || total<0 || (info.page!==undefined && info.page!==page))) {
          throw failure('DOMAIN_LIST_INCOMPLETE');
        } else if (page<total) {
          query='?'+new URLSearchParams({page:String(page+1)});
        } else {
          if (info?.is_truncated || result.truncated) throw failure('DOMAIN_LIST_INCOMPLETE');
          return records;
        }
        if (seen.has(query) || page>=1000) throw failure('DOMAIN_LIST_INCOMPLETE');
        seen.add(query);
        page++;
      }
    } catch (error) {
      if (!records.length) throw error;
      throw Object.assign(failure(error?.code??'DOMAIN_LIST_UNAVAILABLE'),{knownDomains:records});
    }
  }

  async function activate(source, sessionId) {
    const before = await readManagedDomain(source,sessionId);
    if (verifiedDevelopmentDomain(before)) return before;
    if (before.enabled!==false) throw failure('PUBLIC_URL_ACTIVATION_UNCONFIRMED');
    // A domain may have become active while the confirmation was open.
    if (verifiedDomains(await readCustomDomains(source,sessionId)).length) return null;
    await request(source,'managed',{method:'PUT',headers:{'content-type':'application/json'},
      body:JSON.stringify({enabled:true}),expectedSession:sessionId,requiredScopes:['workers-r2.write']},'PUBLIC_URL_ACTIVATION_FAILED');

    for (const delay of [0,...readbackDelays]) {
      if (delay) await new Promise(resolve=>setTimeout(resolve,delay));
      try {
        const after = await readManagedDomain(source,sessionId);
        if (before.bucketId && before.bucketId!==after.bucketId) throw failure('PUBLIC_URL_BUCKET_CHANGED');
        if (verifiedDevelopmentDomain(after)) return after;
      } catch (error) {
        if (authFailures.has(error.code) || error.code==='PUBLIC_URL_BUCKET_CHANGED') throw error;
      }
    }
    throw failure('PUBLIC_URL_ACTIVATION_UNCONFIRMED');
  }

  async function enableManagedDomain(source) {
    assertConnected();
    const authority = await oauth.authority();
    if (!authority.sessionId || !authority.accounts?.some(account=>account.id===source.accountId)) throw failure('AUTH_REQUIRED');
    const key = JSON.stringify([authority.sessionId,scopeKey(source)]);
    if (activations.has(key)) return activations.get(key);
    const pending = activate(source,authority.sessionId);
    activations.set(key,pending);
    try { return await pending; }
    finally { activations.delete(key); }
  }

  async function connectCustomDomain(source,hostname,zoneId){
    const domain=domainName(hostname);
    if(!domain||developmentalDomain(domain))throw failure('CUSTOM_DOMAIN_INVALID');
    const auth=await oauth.authority();
    if(!auth.sessionId||!auth.accounts?.some(account=>account.id===source.accountId))throw failure('AUTH_REQUIRED');
    const records=await readCustomDomains(source,auth.sessionId);
    const state=record=>verifiedDomains([record]).length?'active':record?.enabled===false?'disabled':'pending';
    const existing=records.find(record=>domainName(record?.domain)===domain);
    if(existing)return {domain,state:state(existing)};
    const knownZone=records.filter(record=>{
      const zone=domainName(record?.zoneName);
      return zone&&(domain===zone||domain.endsWith('.'+zone))&&/^[\da-f]{32}$/i.test(record.zoneId??'');
    }).sort((a,b)=>b.zoneName.length-a.zoneName.length)[0];
    const selectedZone=zoneId?.trim()||knownZone?.zoneId;
    if(!/^[\da-f]{32}$/i.test(selectedZone??''))throw failure('CUSTOM_DOMAIN_ZONE_REQUIRED');
    const {result}=await request(source,'custom',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({domain,enabled:true,zoneId:selectedZone}),expectedSession:auth.sessionId,
      requiredScopes:['workers-r2.write']},'CUSTOM_DOMAIN_CONNECT_FAILED');
    if(domainName(result.domain)!==domain||result.enabled!==true||result.zoneId!==selectedZone)throw failure('CUSTOM_DOMAIN_UNCONFIRMED');
    const observed=(await readCustomDomains(source,auth.sessionId)).find(record=>domainName(record?.domain)===domain);
    if(observed?.zoneId&&observed.zoneId!==selectedZone)throw failure('CUSTOM_DOMAIN_UNCONFIRMED');
    return {domain,state:state(observed)};
  }

  return Object.freeze({readManagedDomain, readCustomDomains, enableManagedDomain, connectCustomDomain});
}
