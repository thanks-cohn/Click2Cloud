import test from 'node:test';
import assert from 'node:assert/strict';
import {decideSimpleCloudflare,R2_SETUP_URL,newSimpleBucketSelection,toggleSimpleBucket,
  setSimpleAutoIncludeNew} from '../src/cloudflare-simple-gate.mjs';
const base={cloudflareSession:'verified',cloudflareAccountId:'acct',r2Subscription:'active'};
const root={accountId:'acct',profileId:'p',bucketName:'redown',prefix:''};
const b1={...root,bucketName:'bucket-1'},b2={...root,bucketName:'bucket-2'};
test('not logged in: flat login; connected no R2: same flat R2 setup',()=>{
  const login=decideSimpleCloudflare({...base,cloudflareSession:'missing',validSaveTargets:[root,b1,b2]});
  assert.equal(login.mode,'flat-setup');assert.deepEqual(login.action,{kind:'start-cloudflare-login'});
  const r2=decideSimpleCloudflare({...base,r2Subscription:'inactive',validSaveTargets:[root,b1,b2]});
  assert.equal(r2.mode,'flat-setup');assert.deepEqual(r2.action,{kind:'open-r2-setup',url:R2_SETUP_URL});
  assert.deepEqual(login.children,[]);assert.deepEqual(r2.children,[]);
});
test('without verified redown root, existing other buckets cannot substitute',()=>{
  const p=decideSimpleCloudflare({...base,validSaveTargets:[b1,b2]});
  assert.equal(p.mode,'flat-setup');assert.equal(p.action.kind,'ensure-redown-bucket');
});
test('single redown root: Cloudflare itself is a save leaf',()=>{
  const p=decideSimpleCloudflare({...base,validSaveTargets:[root]});
  assert.equal(p.mode,'flat-save');assert.equal(p.action.target,root);
});
test('new verified R2 buckets automatically appear as flat Simple siblings, redown always first',()=>{
  const p=decideSimpleCloudflare({...base,validSaveTargets:[b2,root,b1]});
  assert.equal(p.mode,'nested');
  assert.deepEqual(p.children.map(x=>x.title),['redown','bucket-1','bucket-2']);
  assert.deepEqual(p.children.map(x=>x.target),[root,b1,b2]);
  assert.equal(p.children.every(x=>x.kind==='save'),true);
});
test('unmarking all additional buckets returns exactly one flat Cloudflare saving to redown',()=>{
  let s=newSimpleBucketSelection('acct');
  s=toggleSimpleBucket(s,'bucket-1',false,['bucket-1','bucket-2']);
  s=toggleSimpleBucket(s,'bucket-2',false,['bucket-1','bucket-2']);
  assert.equal(s.autoIncludeNew,false);
  const plan=decideSimpleCloudflare({...base,validSaveTargets:[root,b1,b2],selection:s});
  assert.equal(plan.mode,'flat-save');assert.deepEqual(plan.children,[]);
  assert.equal(plan.action.target.bucketName,'redown');
});
test('explicit flat-only preference survives a newly created bucket, until user chooses otherwise',()=>{
  let s=newSimpleBucketSelection('acct');
  s=toggleSimpleBucket(s,'bucket-1',false,['bucket-1']);
  const b3={...root,bucketName:'bucket-3'};
  const plan=decideSimpleCloudflare({...base,validSaveTargets:[root,b1,b3],selection:s});
  assert.equal(plan.mode,'flat-save');
  s=setSimpleAutoIncludeNew(s,true,['bucket-1','bucket-3']);
  const reopened=decideSimpleCloudflare({...base,validSaveTargets:[root,b1,b3],selection:s});
  assert.deepEqual(reopened.children.map(x=>x.title),['redown','bucket-3']);
});
test('one checkbox change does not modify cloud buckets or other engine state',()=>{
  const s=newSimpleBucketSelection('acct');
  const next=toggleSimpleBucket(s,'bucket-1',false,['bucket-1','bucket-2']);
  assert.equal(s.revision,0);assert.equal(next.revision,1);
  assert.equal(next.autoIncludeNew,true);
  const p=decideSimpleCloudflare({...base,validSaveTargets:[root,b1,b2],selection:next});
  assert.deepEqual(p.children.map(x=>x.title),['redown','bucket-2']);
});
test('redown cannot be unchecked, unfamiliar buckets cannot be checked',()=>{
  const s=newSimpleBucketSelection('acct');
  assert.throws(()=>toggleSimpleBucket(s,'redown',false,['bucket-1']),/cannot be unchecked/);
  assert.throws(()=>toggleSimpleBucket(s,'unknown',true,['bucket-1']),/unknown bucket/);
});
test('account mismatch never borrows bucket visibility decisions from other accounts',()=>{
  const wrong=newSimpleBucketSelection('other');
  const p=decideSimpleCloudflare({...base,validSaveTargets:[root,b1],selection:wrong});
  assert.equal(p.mode,'flat-setup');
});
test('existing optional Simple folder shortcuts remain independent of bucket checkbox visibility',()=>{
  const folder={...root,prefix:'photos/wedding',label:'Weddings',configured:true};
  const p=decideSimpleCloudflare({...base,validSaveTargets:[root,folder]});
  assert.deepEqual(p.children.map(x=>x.title),['redown','Weddings']);
});
