import {destination} from '../../right2cloud-module/src/common.mjs';
export const PROTOCOL='click2cloud-remote-2';
export const fail=code=>{throw Object.assign(Error(code),{code});};
export function remoteDestination(t){
 if(t?.provider!=='cloudflare'||t.connectionId!=='cloudflare:'+t.accountId)fail('DESTINATION_INVALID');
 return destination({provider:'cloudflare-r2',connectionId:t.connectionId,accountId:t.accountId,bucketName:t.bucketName,prefix:t.prefix.endsWith('/')?t.prefix.slice(0,-1):t.prefix,conflictPolicy:'keep-both'});
}
const encoder=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export async function digest(value){return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(value)))));}
const hmac=secret=>crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
export async function signGrant(secret,payload){const data=b64(encoder.encode(JSON.stringify(payload)));return data+'.'+b64(new Uint8Array(await crypto.subtle.sign('HMAC',await hmac(secret),encoder.encode(data))));}
export async function verifyGrant(secret,token){
 try{if(typeof token!=='string'||token.length>8192)fail('CAPABILITY_DENIED');const [data,sig,extra]=token.split('.');if(extra||!await crypto.subtle.verify('HMAC',await hmac(secret),unb64(sig),encoder.encode(data)))fail('CAPABILITY_DENIED');const p=JSON.parse(new TextDecoder().decode(unb64(data)));if(p.protocol!==PROTOCOL||!Number.isFinite(p.expiresAt)||p.expiresAt<=Date.now()||p.expiresAt>Date.now()+300001||typeof p.principal!=='string'||!p.principal||typeof p.sessionId!=='string'||!p.sessionId||!['save','status','revoke','probe','cancel'].includes(p.use))fail('CAPABILITY_DENIED');destination(p.destination);return p;}catch{fail('CAPABILITY_DENIED');}
}
export async function boundedJSON(response,max=65536){
 const reader=response.body?.getReader();if(!reader)fail('RESPONSE_INVALID');let size=0;const chunks=[];
 try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>max)fail('RESPONSE_TOO_LARGE');chunks.push(r.value);}}finally{await reader.cancel();}
 const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}try{return JSON.parse(new TextDecoder().decode(all));}catch{fail('RESPONSE_INVALID');}
}
