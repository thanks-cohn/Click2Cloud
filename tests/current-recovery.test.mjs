import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {toolRegistry,validate} from '../src/api/service.mjs';
const spec={schemaVersion:1,generation:1,rows:[]};
test('C2C-PERSIST-3 queued native clear revalidates CURRENT after asynchronous prepare',async()=>{
 let valid=true,clears=0;const chrome={contextMenus:{create(){},removeAll(cb){clears++;cb();}},runtime:{}};
 const registrar=createChromeRegistrar({chrome,beforeApply:async()=>{if(!valid)throw Object.assign(Error(),{code:'CONFIGURATION_RECORD_MISSING'});},persist:async()=>{valid=false;}});
 const result=await registrar.apply(spec);assert.equal(result.state,'blocked');assert.equal(result.appliedGeneration,null);assert.equal(clears,0);
});
test('C2C-PERSIST-6 canonical restore requires an immutable preview, schema rejects fabricated revision-only repairs',()=>{
 const restore=toolRegistry.find(t=>t.name==='restoreRightClickMenu');assert.throws(()=>validate(restore.inputSchema,{expectedRevision:0,idempotencyKey:'reset'}));validate(restore.inputSchema,{previewToken:'fixture-proof',idempotencyKey:'authorized'});assert.throws(()=>validate(restore.inputSchema,{previewToken:'fixture-proof',idempotencyKey:'authorized',clear:true}));assert.equal(toolRegistry.find(t=>t.name==='requestRestorePreview').effectful,false);
});
test('C2C-PERSIST CI guard links permanent invariants to production sources and real-IDB regression gates',()=>{
 const map=JSON.parse(readFileSync(new URL('../11.2026/workings/right-click-workings.json',import.meta.url))),browser=readFileSync(new URL('./current-recovery-browser.mjs',import.meta.url),'utf8');
 const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;assert.equal(createHash('sha256').update(JSON.stringify(canonical(map.currentLossBefore))).digest('hex'),'923445ef707cade5bc36b46957fd26f831bac9951beec40c5a5760cb9abbd440','pre-loss baseline must stay immutable');
 assert(readFileSync(new URL('../.github/workflows/test.yml',import.meta.url),'utf8').includes('node scripts/test-current-recovery-browser.mjs'),'existing CI must execute real-IDB guard');
 for(let i=1;i<=7;i++){const id='C2C-PERSIST-'+i,row=map.currentImplementation.behaviors.find(b=>b.id===id);assert(row,id);assert(browser.includes(id),id+' missing browser regression');for(const ref of row.sourceRefs)assert(readFileSync(new URL('../'+ref.path,import.meta.url),'utf8').includes(ref.symbol));}
});
