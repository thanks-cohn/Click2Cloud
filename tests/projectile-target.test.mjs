import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleProviderFraction} from '../extension/projectile-target.mjs';
import {createProjectileFeedback,readProjectileTarget,projectileProvider} from '../src/aesthetic/projectile.mjs';
import {normalizeVisualFeedback} from '../src/aesthetic/visual-feedback.mjs';

function fixture({hidden=false,view='remotes',top=100,bottom=180,modal=false,pending=false}={}){
 const card={getBoundingClientRect:()=>({top,bottom,width:200,height:bottom-top})};
 return {hidden,documentElement:{hasAttribute:()=>pending},defaultView:{innerHeight:800,getComputedStyle:()=>({visibility:'visible',display:'grid',opacity:'1'})},
  querySelector:s=>s==='#shell'?{dataset:{view}}:s==='dialog[open]'?(modal?{}:null):s==='#main'?{getBoundingClientRect:()=>({top:60,bottom:740})}:s.startsWith('#main ')?card:null};
}
test('visible geometry tracks scrolling and clips partially visible cards',()=>{
 assert.equal(visibleProviderFraction(fixture(),'google'),140/800);
 assert.equal(visibleProviderFraction(fixture({top:300,bottom:380}),'dropbox'),340/800);
 assert.equal(visibleProviderFraction(fixture({top:40,bottom:100}),'cloudflare'),80/800);
 for(const options of [{hidden:true},{view:'history'},{modal:true},{pending:true},{top:750,bottom:830}]){
  assert.equal(visibleProviderFraction(fixture(options),'onedrive'),null);
 }
 assert.equal(visibleProviderFraction(fixture(),'unknown'),null);
});
test('only matching window/provider replies are accepted; missing and failed replies fall back',async()=>{
 assert.equal(projectileProvider('google-drive'),'google');
 assert.equal(projectileProvider('invalid'),null);
 const answer=(result)=>({runtime:{sendMessage:async()=>result}});
 assert.equal(await readProjectileTarget(answer({windowId:7,provider:'dropbox',verticalFraction:.4}),7,'dropbox'),.4);
 for(const reply of [null,{windowId:8,provider:'dropbox',verticalFraction:.4},{windowId:7,provider:'google',verticalFraction:.4},{windowId:7,provider:'dropbox',verticalFraction:2}]){
  assert.equal(await readProjectileTarget(answer(reply),7,'dropbox'),null);
 }
 assert.equal(await readProjectileTarget({runtime:{sendMessage:async()=>{throw Error('closed');}}},7,'dropbox'),null);
 assert.equal(await readProjectileTarget({runtime:{sendMessage:()=>new Promise(()=>{})}},7,'dropbox'),null);
});
test('accepted callback alone dispatches an aimed flight, once, with unchanged style and fallback',async()=>{
 const sent=[];const value=normalizeVisualFeedback({});
 const chrome={runtime:{sendMessage:async m=>m.provider==='dropbox'?{windowId:m.windowId,provider:m.provider,verticalFraction:.7}:null},
  sidePanel:{getLayout:async()=>({side:'left'})},tabs:{sendMessage:async(...args)=>sent.push(args)}};
 const feedback=createProjectileFeedback({chrome,preferences:{ready:Promise.resolve(),value,subscribe(){}},clock:()=>1000,random:()=>.5});
 const info={frameId:2};feedback.arm(info,{id:9,windowId:7});
 const accepted=feedback.forClick(info,'dropbox');
 assert.equal(sent.length,0);accepted();accepted();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sent.length,1);assert.equal(sent[0][1].verticalFraction,.7);assert.equal(sent[0][1].side,'left');
 assert.deepEqual(sent[0][2],{frameId:2});assert.ok(sent[0][1].style.duration>0);
 const second={};feedback.arm(second,{id:9,windowId:7});feedback.forClick(second,'google-drive')();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sent.length,2);assert.equal(Object.hasOwn(sent[1][1],'verticalFraction'),false);
});
