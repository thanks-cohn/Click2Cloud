import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createExternalRecovery} from '../src/persistence/external-recovery.mjs';import {nodeFiles} from '../src/persistence/node-files.mjs';import {productState} from '../src/api/config.mjs';
import {validateModeConfig} from '../src/persistence/schema.mjs';
import {createWholeCloudJobs} from '../src/api/whole-cloud.mjs';
test('actual temporary disk CURRENT and monthly journal preserve preferences and recover corrupted CURRENT',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'c2c-recovery-'));try{
 let now=Date.parse('2026-12-31T23:59:00Z');const recovery=createExternalRecovery({files:nodeFiles(dir),clock:()=>now});
 const configs=Object.fromEntries(['simple','nested','depth'].map(m=>[m,validateModeConfig(m,{})]));
 const p={product:productState({theme:'light',favorites:['fixture'],placement:{cloudflare:'other'}}),configs};
 const receipt=await recovery.writeVerified(p);assert.equal(receipt.state,'VERIFIED');now+=120000;p.product.revision++;p.product.theme='dark';await recovery.writeVerified(p);
 await writeFile(join(dir,'menu-config/CURRENT.json'),'corrupted');
 const restored=await recovery.readVerified();assert.equal(restored.product.theme,'dark');assert.deepEqual(restored.product.favorites,['fixture']);
 assert((await readFile(join(dir,'menu-config/journal/2026-12.jsonl'),'utf8')).includes('checksum'));assert((await readFile(join(dir,'menu-config/journal/2027-01.jsonl'),'utf8')).includes('checksum'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('whole-cloud external job pauses without auth UI and resumes only the same opted-in account',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'c2c-outline-'));try{
 let auth=false,lists=0;const identity={provider:'cloudflare',connectionId:'fixture',accountId:'fixture'};
 const recovery=createExternalRecovery({files:nodeFiles(dir)}),jobs=createWholeCloudJobs({recovery,isAuthorized:async i=>auth&&i.accountId==='fixture',fileApi:{run:async()=>{lists++;return {state:'completed',data:{buckets:[]}};}}});
 await jobs.enable(identity);assert.equal((await jobs.tick(identity)).state,'PAUSED_AUTH');assert.equal(lists,0);auth=true;await jobs.onSameAccountLogin(identity);assert.equal(lists,1);
 await jobs.disable(identity);assert.equal((await jobs.tick(identity)).state,'STOPPED');assert.equal(lists,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('per-bucket recovery crawl uses independent explicit depth and an actual disk checkpoint',async()=>{
 const {createRecoveryCrawl}=await import('../src/persistence/recovery-crawl.mjs');const dir=await mkdtemp(join(tmpdir(),'c2c-crawl-'));
 try{const target={provider:'cloudflare',connectionId:'fixture',accountId:'fixture',bucketName:'bucket',prefix:''};let calls=0;
 const recovery=createExternalRecovery({files:nodeFiles(dir)}),crawl=createRecoveryCrawl({recovery,isAuthorized:async()=>true,fileApi:{run:async()=>{calls++;return {state:'completed',data:{entries:[{key:'a/b/c/file.txt'}],cursor:''}};}}});
 const stopped=await crawl.tick({target,enabled:false,depth:2});assert.equal(stopped.state,'STOPPED');assert.equal(calls,0);
 const result=await crawl.tick({target,enabled:true,depth:2});assert.deepEqual(result.folders,['a/','a/b/']);assert.equal(result.complete,true);assert.equal(result.receipt.evidenceClass,'external-filesystem-readback');
 const deeper=await crawl.tick({target,enabled:true,depth:40});assert.deepEqual(deeper.folders,['a/','a/b/','a/b/c/']);assert.equal(calls,2);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('Simple/Narrow history toggles omit disabled records from dated checkpoints while CURRENT retains both',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'c2c-history-'));try{
 const target={provider:'cloudflare',connectionId:'fixture',accountId:'fixture',bucketName:'bucket',prefix:'private/'};
 const p={product:productState({recovery:{cadence:'daily',simple:false,nested:true,buckets:[],location:'automatic'}}),configs:{simple:validateModeConfig('simple',{destinations:[{target,label:'disabled-simple-history'}]}),nested:validateModeConfig('nested',{}),depth:validateModeConfig('depth',{})}};
 const recovery=createExternalRecovery({files:nodeFiles(dir),clock:()=>Date.parse('2026-11-05T12:00:00Z')});await recovery.writeVerified(p);
 assert(!(await readFile(join(dir,'menu-config/backups/2026-11-05.json'),'utf8')).includes('disabled-simple-history'));
 assert((await readFile(join(dir,'menu-config/CURRENT.json'),'utf8')).includes('disabled-simple-history'));
 assert.equal((await recovery.readVerified()).configs.simple.destinations.length,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
