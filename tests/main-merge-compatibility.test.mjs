import test from 'node:test';import assert from 'node:assert/strict';
import {createEngine} from '../src/core/engine.mjs';import {createChromeRegistrar} from '../src/chrome/registrar.mjs';import {productState} from '../src/api/config.mjs';
import {compileComposite} from '../src/core/composite-menu.mjs';import {compileMenuSpec} from '../src/core/menu-spec.mjs';
const target={provider:'cloudflare',connectionId:'cloudflare:account',accountId:'account',bucketName:'bucket',prefix:'exact/deep/'};
const inventory={scopes:[{target:{...target,prefix:''},folders:[target.prefix],authorized:true,workerReady:true,complete:true}]};
test('retained Explorer file-save path reads Universal File API bytes and uses the existing verified dispatcher',async()=>{
 let generation={desired:0,applied:null};const calls=[],uploads=[];
 const chrome={runtime:{},contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb(),onClicked:{addListener(){},removeListener(){}}}};
 const configs={simple:{destinations:[{id:'preserved-destination',target}]},nested:{destinations:[]},depth:{scopes:[]}},product=productState();
 const current={read:async()=>({configs,product,generation}),setDesiredGeneration:async desired=>{generation={...generation,desired};},acknowledgeGeneration:async applied=>{generation={...generation,applied};}};
 const fileApi={async run(operation,input,options){calls.push({operation,input});if(operation==='stat')return {state:'completed',data:{object:{size:3}}};if(operation==='readStream'){await options.onChunk(new Uint8Array([1,2,3]));return {state:'completed',data:{size:3}};}throw Error('UNEXPECTED_OPERATION');}};
 const providers={cloudflare:{upload:async payload=>{uploads.push(payload);return {confirmed:true,id:'fixture-only'};},verifyReceipt:async()=>({verified:true,independent:true,byteLength:3,destinationMatches:true,evidenceClass:'provider-readback'})}};
 const engine=createEngine({current,registrar:createChromeRegistrar({chrome}),fileApi,providers,getAuthorization:async()=>({sessionId:'fixture-session',authorizedTargets:[target]})});
 const spec=await engine.compile({mode:'composite',inventory});await engine.apply(spec);const row=spec.rows.find(r=>r.role==='save');
 const result=await engine.saveExplorerEntry({itemId:row.id,generation:spec.generation,source:{accountId:'source-account',bucketName:'source-bucket',prefix:'source/'},entry:{key:'source/picture.bin',folder:false}});
 assert.equal(result.confirmed,true);assert.deepEqual(calls.map(c=>c.operation),['stat','readStream']);assert.equal(uploads.length,1);assert.deepEqual([...uploads[0].bytes],[1,2,3]);assert.equal(uploads[0].destination.path,'exact/deep');assert(!JSON.stringify(uploads[0]).includes('source-account'));
});
test('old composite entrypoint delegates to the single canonical compiler',()=>{
 const state={product:productState(),configs:{simple:{destinations:[{target}]},nested:{destinations:[]},depth:{scopes:[]}}};
 const actual=compileComposite({product:state,inventory,generation:7});const expected=compileMenuSpec({mode:'composite',product:state.product,configs:state.configs,inventory,generation:7});assert.deepEqual(actual,expected);
});
