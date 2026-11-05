import test from 'node:test';
import assert from 'node:assert/strict';
import {stableId} from '../src/core/menu-identity.mjs';
const encoder=new TextEncoder();
// Previous production formula is retained only as an independent test oracle.
function bigintOracle(namespace,value) {
  let hash=0xcbf29ce484222325n;
  for(const byte of encoder.encode(value)) {hash^=BigInt(byte);hash=(hash*0x100000001b3n)&0xffffffffffffffffn;}
  return 'c2c:'+namespace+':'+hash.toString(16).padStart(16,'0');
}

test('optimized FNV1a64 retains published vectors and exact namespace/leading-zero semantics',()=>{
  for(const [text,digest] of [['','cbf29ce484222325'],['a','af63dc4c8601ec8c'],['foobar','85944171f73967e8']])
    assert.equal(stableId('action',text),'c2c:action:'+digest);
  for(const namespace of ['item','action','provider','',':unicode-🧊'])for(const value of ['','\0','\uffff','\ud800','\udc00','\ud83d\ude00','日本語/🧊/é/e\u0301','x'.repeat(100000)])
    assert.equal(stableId(namespace,value),bigintOracle(namespace,value));
});

test('split-word FNV equals original BigInt formula across deterministic arbitrary UTF16 and surrogate boundaries',()=>{
  let seed=0x5a17d09b;
  const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
  for(let sample=0;sample<3000;sample++) {
    let value='';const length=next()%180;
    for(let index=0;index<length;index++)value+=String.fromCharCode(next()&0xffff);
    assert.equal(stableId('item',value),bigintOracle('item',value),'UTF16 sample '+sample);
  }
  // Every lone high/low surrogate and each adjacent category is encoded exactly
  // as TextEncoder did before; no normalization or replacement policy changed.
  for(let unit=0xd800;unit<=0xdfff;unit++)for(const suffix of ['',String.fromCharCode(unit),'a','\udc00']) {
    const value=String.fromCharCode(unit)+suffix;
    assert.equal(stableId('action',value),bigintOracle('action',value));
  }
});
