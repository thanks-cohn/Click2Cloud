import test from 'node:test';
import assert from 'node:assert/strict';
import {productState,DEFAULT_PROVIDER_VISIBILITY} from '../src/api/config.mjs';
import {compileMenuSpec} from '../src/core/menu-spec.mjs';
import {toolRegistry,validate} from '../src/api/service.mjs';

const redown={provider:'cloudflare',connectionId:'cloudflare:account-1',accountId:'account-1',bucketName:'redown',prefix:''};
const initial=()=>({
  mode:'composite',generation:1,revision:0,
  defaultTarget:redown,
  product:productState({defaultTarget:redown,menuCustomized:true}),
  configs:{
    simple:{revision:0,destinations:[]},
    nested:{revision:0,destinations:[]},
    depth:{revision:0,scopes:[]}
  },
  inventory:{revision:0,scopes:[{target:redown,authorized:true,workerReady:true,complete:true,folders:[]}]}
});

test('all four provider visibility preferences default ON and migrate absent historical field',()=>{
  assert.deepEqual(productState().providerVisibility,DEFAULT_PROVIDER_VISIBILITY);
  const legacy=productState({theme:'light'});
  assert.deepEqual(legacy.providerVisibility,DEFAULT_PROVIDER_VISIBILITY);
  assert.throws(()=>productState({providerVisibility:{'google-drive':'false'}}),{message:'INVALID_STATE'});
  assert.throws(()=>productState({providerVisibility:{unknown:true}}),{message:'INVALID_STATE'});
});

test('per-provider configuration changes have a typed, permission-scoped API schema',()=>{
  const entry=toolRegistry.find(t=>t.name==='commitConfigChange');
  assert.ok(entry);assert.equal(entry.scope,'configure');
  assert.doesNotThrow(()=>validate(entry.inputSchema,{
    changes:[{type:'setProviderMenuVisibility',provider:'cloudflare',visible:false}],
    expectedRevision:0,idempotencyKey:'menu-hide'
  }));
  assert.throws(()=>validate(entry.inputSchema,{
    changes:[{type:'setProviderMenuVisibility',provider:'cloudflare',visible:'false'}],
    expectedRevision:0,idempotencyKey:'menu-hide'
  }),{message:'INVALID_REQUEST'});
});

test('hiding Cloudflare removes all of its menu entries without mutating saved targets',()=>{
  const input=initial(),before=JSON.stringify(input);
  const shown=compileMenuSpec(input);
  assert.ok(shown.rows.some(r=>r.origin?.provider==='cloudflare'));
  const hidden={...input,product:productState({...input.product,providerVisibility:{...input.product.providerVisibility,cloudflare:false}})};
  const spec=compileMenuSpec(hidden);
  assert.ok(spec.rows.every(r=>r.origin?.provider!=='cloudflare'));
  assert.equal(spec.rows.filter(r=>r.role==='provider-action').length,3);
  assert.equal(hidden.product.defaultTarget.bucketName,'redown');
  assert.equal(JSON.stringify(input),before);
  assert.deepEqual(compileMenuSpec(input).rows,shown.rows);
});

test('hiding all providers yields no native provider or descendant rows; preferences can be restored',()=>{
  const input=initial();
  const hidden=compileMenuSpec({...input,product:productState({...input.product,providerVisibility:{'google-drive':false,dropbox:false,onedrive:false,cloudflare:false}})});
  assert.equal(hidden.rows.length,0);
  const restored=compileMenuSpec(input);
  assert.deepEqual(restored.rows.filter(r=>r.parentId===null).map(r=>r.origin.provider),['google-drive','dropbox','onedrive','cloudflare']);
});
