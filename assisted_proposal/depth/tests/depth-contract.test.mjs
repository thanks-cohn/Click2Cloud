import test from 'node:test';
import assert from 'node:assert/strict';
import {scopeKey,folderKey,inventoryKey,parentPrefix,folderLevel} from '../src/scope-identity.mjs';
import {diffFolderChildren} from '../src/scan-diff.mjs';
const scope={providerKind:'cloudflare-r2',connectionId:'c1',accountId:'a1',containerId:'redown'};
test('full inventory identity never changes with menu display depth',()=>{
  assert.equal(inventoryKey(scope,1),inventoryKey(scope,10));
  assert.equal(scopeKey(scope),inventoryKey(scope));
});
test('exact account/bucket and Unicode/case separate folder identities',()=>{
  assert.notEqual(folderKey(scope,'A/é'),folderKey({...scope,containerId:'other'},'A/é'));
  assert.notEqual(folderKey(scope,'Photos'),folderKey(scope,'photos'));
  assert.equal(parentPrefix('A/é/Photos'),'A/é');
  assert.equal(folderLevel('a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p'),16);
});
test('scoped complete authorized diff emits changed children only',()=>{
  const x=diffFolderChildren({scope,parent:'Photos',known:['Photos/a','Photos/b'],
    observed:['Photos/b','Photos/c'],listingComplete:true,deletionProven:true,authorized:true});
  assert.deepEqual(x.added,['Photos/c']);assert.deepEqual(x.removed,['Photos/a']);
});
test('repeat identical scan generates zero semantic deltas',()=>{
  const x=diffFolderChildren({scope,known:['A','B'],observed:['B','A'],
    listingComplete:true,deletionProven:true,authorized:true});
  assert.deepEqual(x.added,[]);assert.deepEqual(x.removed,[]);
});
test('partial listing or unproven absence never deletes remembered folders',()=>{
  for(const [listingComplete,deletionProven] of [[false,true],[true,false]]){
    const x=diffFolderChildren({scope,known:['A','B'],observed:['B'],
      listingComplete,deletionProven,authorized:true});
    assert.deepEqual(x.removed,[]);assert.deepEqual(x.retainedUnknown,['A']);
  }
});
test('folder scan cannot mutate unrelated prefix and requires authorization',()=>{
  assert.throws(()=>diffFolderChildren({scope,parent:'X',known:['Y/a'],authorized:true}),/Out-of-scope/);
  assert.throws(()=>diffFolderChildren({scope,known:[],observed:[],authorized:false}),/Unauthorized/);
});
