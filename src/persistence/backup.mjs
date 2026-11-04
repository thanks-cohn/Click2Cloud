// Adapted from REDOWN extension/right-click-backup.js at 89211efc08bfb6f4370f9293cc98ebea2050f859.
// Retains PBKDF2-SHA256/210000 + AES-GCM, strict validation, reconnect and empty-store restore.
// Explicit local encrypted backup preserves private config; it is NOT an agent diagnostic export.
import {closed,validateBundle} from './schema.mjs';
const encoder=new TextEncoder(),decoder=new TextDecoder(),limit=8*1024*1024;
const additionalData=encoder.encode('click2cloud-current-encrypted-v1');
const b64=bytes=>{let s='';for(const byte of bytes)s+=String.fromCharCode(byte);return btoa(s);};
const un64=s=>{if(typeof s!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw Error();return Uint8Array.from(atob(s),c=>c.charCodeAt(0));};
function grant(authorized) {if(authorized!==true)throw Object.assign(Error('Explicit local backup authorization is required.'),{code:'BACKUP_AUTH_REQUIRED'});}
async function key(passphrase,salt) {
  if(typeof passphrase!=='string'||passphrase.length<12||passphrase.length>1024)throw Object.assign(Error('Use a local backup passphrase of 12–1024 characters.'),{code:'BACKUP_INVALID'});
  const material=await crypto.subtle.importKey('raw',encoder.encode(passphrase),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:210000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encodeBackup(bundle,{passphrase,authorized=false}={}) {
  grant(authorized);validateBundle(bundle);
  const bytes=encoder.encode(JSON.stringify(bundle));if(bytes.length>limit)throw Object.assign(Error('Local backup exceeds the 8 MiB limit.'),{code:'BACKUP_INVALID'});
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData},await key(passphrase,salt),bytes);
  return JSON.stringify({format:'click2cloud-current-encrypted',version:1,kdf:'PBKDF2-SHA256-210000',salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(encrypted))});
}
export async function decodeBackup(text,{passphrase,authorized=false}={}) {
  grant(authorized);
  try {
    if(typeof text!=='string'||text.length>limit*1.5)throw Error();
    const envelope=JSON.parse(text);closed(envelope,['format','version','kdf','salt','iv','ciphertext']);
    if(envelope.format!=='click2cloud-current-encrypted'||envelope.version!==1||envelope.kdf!=='PBKDF2-SHA256-210000')throw Error();
    const salt=un64(envelope.salt),iv=un64(envelope.iv),ciphertext=un64(envelope.ciphertext);
    if(salt.length!==16||iv.length!==12||ciphertext.length>limit+16)throw Error();
    const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData},await key(passphrase,salt),ciphertext);
    return validateBundle(JSON.parse(decoder.decode(plaintext)));
  } catch {
    throw Object.assign(Error('Backup integrity, schema or passphrase check failed. Nothing was restored.'),{code:'BACKUP_INVALID'});
  }
}
