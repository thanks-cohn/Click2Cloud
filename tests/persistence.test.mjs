import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeBackup,decodeBackup} from '../src/persistence/backup.mjs';
import {validateModeConfig,validateBundle} from '../src/persistence/schema.mjs';
import {createCurrentStore} from '../src/persistence/current-store.mjs';
const target={provider:'cloudflare',connectionId:'fixture-connection',accountId:'fixture-account',bucketName:'fixture-bucket',prefix:'Pictures/'};
const simple={schemaVersion:1,mode:'simple',revision:1,destinations:[{id:'one',target,label:'Pictures'}]};
const bundle=()=>({format:'click2cloud-current',schemaVersion:1,requiresReconnect:true,exportedAt:100,configs:{simple},generation:{desired:3,applied:3},journal:[{sequence:1,kind:'config',mode:'simple',at:100,previous:null,current:simple}],journalEvicted:0,checkpoints:[]});
const options={authorized:true,passphrase:'synthetic-fixture-passphrase'};
test('local encrypted backup retains schema, authenticates payload and requires a distinct explicit authorization',async()=>{
  const original=bundle();
  await assert.rejects(encodeBackup(original,{passphrase:options.passphrase}),{code:'BACKUP_AUTH_REQUIRED'});
  const text=await encodeBackup(original,options);
  assert.equal(text.includes('fixture-account'),false);
  assert.equal(text.includes('Pictures'),false);
  assert.deepEqual(await decodeBackup(text,options),original);
  await assert.rejects(decodeBackup(text,{...options,authorized:false}),{code:'BACKUP_AUTH_REQUIRED'});
  await assert.rejects(decodeBackup(text,{...options,passphrase:'wrong-fixture-passphrase'}),{code:'BACKUP_INVALID'});
  const modified=JSON.parse(text);modified.ciphertext=modified.ciphertext.slice(0,-8)+'AAAAAAAA';
  await assert.rejects(decodeBackup(JSON.stringify(modified),options),{code:'BACKUP_INVALID'});
});
test('closed persistence schema rejects credentials hidden behind unknown fields at every accepted level',async()=>{
  for(const raw of [
    {...simple,note:'raw-secret-canary'},
    {...simple,destinations:[{...simple.destinations[0],options:{value:'raw-secret-canary'}}]},
    {...simple,destinations:[{...simple.destinations[0],target:{...target,extra:'raw-secret-canary'}}]},
    {...simple,destinations:[{...simple.destinations[0],target:{...target,token:'raw-secret-canary'}}]}
  ])assert.throws(()=>validateModeConfig('simple',raw));
  const b=bundle();b.extra='raw-secret-canary';assert.throws(()=>validateBundle(b));
  const c=bundle();c.journal[0].extra='raw-secret-canary';assert.throws(()=>validateBundle(c));
  const d=bundle();d.generation.extra='raw-secret-canary';assert.throws(()=>validateBundle(d));
  const e=bundle();e.requiresReconnect=false;assert.throws(()=>validateBundle(e));
  await assert.rejects(encodeBackup({...bundle(),configs:{simple:{...simple,secret:'raw-secret-canary'}}},options));
});
test('backup rejects namespace mismatch, revision mismatch, duplicate journal and unsupported schemas',()=>{
  const a=bundle();a.configs.simple={...simple,mode:'nested'};assert.throws(()=>validateBundle(a));
  const b=bundle();b.journal[0].current={...simple,revision:99};assert.throws(()=>validateBundle(b));
  const c=bundle();c.journal.push(c.journal[0]);assert.throws(()=>validateBundle(c));
  const d=bundle();d.schemaVersion=2;assert.throws(()=>validateBundle(d));
  const e=bundle();e.configs={simple:{...simple,label:'unexpected'}};assert.throws(()=>validateBundle(e));
  const f=bundle();f.configs={simple:{...simple,destinations:[]}};assert.throws(()=>validateBundle(f));
  const g=bundle();g.journal.push({sequence:2,kind:'config',mode:'simple',at:101,previous:{...simple,destinations:[]},current:{...simple,revision:2}});g.configs.simple={...simple,revision:2};assert.throws(()=>validateBundle(g));
});
test('unavailable CURRENT reports a setup failure while throwing diagnostic sinks cannot mask the outcome',async()=>{
  const events=[];
  const store=createCurrentStore({indexedDB:null,sink:e=>{events.push(e);throw Error('sink failure');}});
  await assert.rejects(store.saveModeConfig('simple',simple,{expectedRevision:0}),{code:'STORAGE_UNAVAILABLE'});
  assert.equal(events.at(-1).code,'STORAGE_UNAVAILABLE');
  await assert.rejects(store.exportEncrypted({}),{code:'BACKUP_AUTH_REQUIRED'});
});
