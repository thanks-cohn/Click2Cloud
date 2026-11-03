import test from 'node:test';
import assert from 'node:assert/strict';
import {locationLabel,makeLocationSelection} from '../src/location-picker-intent.mjs';
const scope={providerKind:'cloudflare-r2',connectionId:'conn',accountId:'account',containerId:'redown'};
test('default location label is last folder, falling back to bucket at root',()=>{
  assert.equal(locationLabel({bucketName:'redown',prefix:'Photos/Weddings/2026'}),'2026');
  assert.equal(locationLabel({bucketName:'redown',prefix:''}),'redown');
});
test('bucket and custom label choices preserve exact folder target',()=>{
  const r=makeLocationSelection({scope,prefix:'Photos/Weddings/2026',labelChoice:'bucket'});
  assert.equal(r.label,'redown');assert.equal(r.target.prefix,'Photos/Weddings/2026');
  const custom=makeLocationSelection({scope,prefix:'Photos/Weddings/2026',
    labelChoice:'custom',customLabel:'Wedding Archive'});
  assert.equal(custom.label,'Wedding Archive');
});
test('Simple receives only one flat menu label and exact target',()=>{
  const result=makeLocationSelection({scope,prefix:'Photos/Weddings/2026',mode:'simple',
    labelChoice:'custom',customLabel:'Wedding Archive'});
  assert.deepEqual(result.preview,['Wedding Archive']);
  assert.equal(result.mode,'simple');
  assert.equal(result.target.scope.containerId,'redown');
});
test('Narrow receives all ancestors with only chosen folder renamed',()=>{
  const result=makeLocationSelection({scope,prefix:'Photos/Weddings/2026',mode:'narrow',
    labelChoice:'custom',customLabel:'Wedding Archive'});
  assert.deepEqual(result.preview,['redown','Photos','Weddings','Wedding Archive']);
  assert.equal(result.target.prefix,'Photos/Weddings/2026');
});
test('Narrow defaults to lowest directory name with no typed label',()=>{
  const result=makeLocationSelection({scope,prefix:'Photos/Weddings/2026',mode:'narrow'});
  assert.deepEqual(result.preview,['redown','Photos','Weddings','2026']);
});
test('duplicate display label requires explicit confirmation, but identity remains exact',()=>{
  const config={scope,prefix:'Photos/Weddings/2026',mode:'simple',existingTitles:['2026']};
  const pending=makeLocationSelection(config);
  assert.equal(pending.requiresDuplicateConfirmation,true);assert.equal(pending.accepted,false);
  const accepted=makeLocationSelection({...config,allowDuplicate:true});
  assert.equal(accepted.accepted,true);
  assert.deepEqual(accepted.target,pending.target);
});
test('invalid custom labels and unsafe prefixes rejected; none modify mode engines',()=>{
  assert.throws(()=>makeLocationSelection({scope,mode:'narrow',labelChoice:'custom',customLabel:'   '}));
  assert.throws(()=>makeLocationSelection({scope,prefix:'../other'}));
  assert.throws(()=>makeLocationSelection({scope,mode:'depth'}),/Unsupported/);
});
