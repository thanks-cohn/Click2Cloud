import test from 'node:test';
import assert from 'node:assert/strict';
import {decideSimpleCloudflare,R2_SETUP_URL} from '../src/cloudflare-simple-gate.mjs';
const root={profileId:'p',accountId:'acct',bucketName:'redown',prefix:''};
const extra={...root,prefix:'images'};
test('missing or unverified Cloudflare login is exactly one flat onboarding leaf',()=>{
  for(const cloudflareSession of ['missing','unknown','expired']){
    const plan=decideSimpleCloudflare({cloudflareSession,r2Subscription:'active',validSaveTargets:[root,extra]});
    assert.equal(plan.mode,'flat-setup');
    assert.equal(plan.title,'Cloudflare');assert.deepEqual(plan.children,[]);
    assert.equal(plan.action.url,R2_SETUP_URL);assert.equal(plan.target,null);
  }
});
test('Cloudflare connected but R2 not activated remains one flat onboarding leaf',()=>{
  for(const r2Subscription of ['inactive','unknown']){
    const plan=decideSimpleCloudflare({cloudflareSession:'verified',r2Subscription,validSaveTargets:[root,extra]});
    assert.equal(plan.mode,'flat-setup');assert.deepEqual(plan.children,[]);
    assert.equal(plan.action.kind,'open-r2-setup');
  }
});
test('both conditions satisfied but bucket not writable cannot claim a save',()=>{
  const plan=decideSimpleCloudflare({cloudflareSession:'verified',r2Subscription:'active'});
  assert.equal(plan.mode,'flat-setup');assert.equal(plan.reason,'no-authorized-bucket');
});
test('connected + R2 active + one valid target preserves original Simple one-click save',()=>{
  const plan=decideSimpleCloudflare({cloudflareSession:'verified',r2Subscription:'active',validSaveTargets:[root]});
  assert.equal(plan.mode,'flat-save');assert.equal(plan.action.target,root);assert.deepEqual(plan.children,[]);
});
test('nested Cloudflare requires both conditions and multiple verified targets',()=>{
  const plan=decideSimpleCloudflare({cloudflareSession:'verified',r2Subscription:'active',validSaveTargets:[root,extra]});
  assert.equal(plan.mode,'nested');assert.equal(plan.children.length,2);
  assert.deepEqual(plan.children.map(x=>x.target),[root,extra]);assert.equal(plan.action,null);
});
test('partial R2 capability or account readiness never produces a misleading submenu',()=>{
  assert.equal(decideSimpleCloudflare({cloudflareSession:'verified',r2Subscription:'unknown',validSaveTargets:[root,extra]}).mode,'flat-setup');
  assert.equal(decideSimpleCloudflare({cloudflareSession:'unknown',r2Subscription:'active',validSaveTargets:[root,extra]}).mode,'flat-setup');
});
