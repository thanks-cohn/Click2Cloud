import assert from 'node:assert/strict';
import test from 'node:test';
import {productState} from '../src/api/config.mjs';
import {createEngineApi} from '../src/api/service.mjs';
import {createCloudflareOnboarding} from '../src/cloudflare/onboarding.mjs';

const target = {provider:'cloudflare', connectionId:'cloudflare:a', accountId:'a', bucketName:'bucket', prefix:''};
const nested = {...target, prefix:'projects/'};
const other = {...target, bucketName:'archive'};

function fixture({prepared = false} = {}) {
  const plans = new Map(), receipts = [], operations = new Set(), written = [], preparedFor = [], inspected = [];
  const key = (target, sourceBucket = '') => JSON.stringify([target.accountId, target.bucketName, sourceBucket]);
  const ready = {state:'ready', prefixScope:'', secret:'fixture', protocol:'current'};
  if (prepared) plans.set(key(target), ready);
  let canProvision = true, canInspect = true, connected = true, sessionId = 'fixture-session';
  const accounts = [{id:target.accountId}];
  const current = {
    read:async () => ({product:productState(), configs:{simple:{destinations:[]}, nested:{destinations:[]}, depth:{scopes:[]}}}),
    reserveOperation:async id => {
      if (operations.has(id)) return false;
      operations.add(id);
      return true;
    },
    recordRemoteResult:async value => receipts.push(value)
  };
  const oauth = {
    status:async () => ({state:connected ? 'CONNECTED' : 'DISCONNECTED', accounts}),
    authority:async () => {
      if (!connected) throw Object.assign(Error('AUTH_REQUIRED'), {code:'AUTH_REQUIRED'});
      return {accounts, sessionId, scopes:['workers-scripts.admin']};
    }
  };
  const cloudflare = createCloudflareOnboarding({current, oauth,
    provisioner:{
      lookup:async (target, sourceBucket) => plans.get(key(target, sourceBucket)),
      prepare:async (target, options) => {
        preparedFor.push({target, options});
        plans.set(key(target, options.sourceBucket), ready);
      }
    },
    transport:{filePlanCurrent:plan => plan?.protocol === 'current', status:async () => ({state:'PREPARED'})},
    inspectBucket:async target => {inspected.push(target.bucketName); return canInspect;}
  });
  const fileApi = {run:async (operation,input) => {
    written.push({operation,input});
    return {state:'completed', data:{state:'completed', code:'FILE_ACTION_VERIFIED'}};
  }};
  const api = createEngineApi({engine:{}, current, fileApi, oauth, prepareFileWorker:cloudflare.ensureFileWorker,
    authorize:async ({scope}) => scope !== 'provision' || canProvision, confirm:async () => true});
  return {
    invoke:params => api.invoke({version:'3+1.1', method:'fileAction', params:{idempotencyKey:crypto.randomUUID(), ...params}}, 'gui'),
    written, preparedFor, receipts, operations, inspected,
    disconnect:() => { connected = false; },
    reconnect:() => { sessionId = 'renewed-fixture-session'; connected = true; },
    allowProvision:value => { canProvision = value; },
    allowInspection:value => { canInspect = value; }
  };
}

const mkdir = (source, name, options) => ({action:'mkdir', source, name, ...options});

test('prepared broad File API Worker serves consecutive root and nested mkdir after reauthorization', async () => {
  const f = fixture({prepared:true});
  assert.equal((await f.invoke(mkdir(target, 'root child'))).state, 'completed');
  f.disconnect();
  assert.equal((await f.invoke(mkdir(nested, 'nested child'))).code, 'AUTH_REQUIRED');
  f.reconnect();
  assert.equal((await f.invoke(mkdir(nested, 'nested child'))).state, 'completed');
  assert.deepEqual(f.written.map(({input}) => [input.source.prefix,input.name]), [['','root child'], ['projects/','nested child']]);
  assert.deepEqual(f.preparedFor, []);
  assert.deepEqual(f.inspected, []);
});

test('unprepared mkdir preserves approval, account checks, and exactly-once dispatch on a repeated intent', async () => {
  const f = fixture();
  const input = mkdir(nested, 'new child', {idempotencyKey:'same-folder-intent'});
  assert.equal((await f.invoke(input)).code, 'FILE_SETUP_APPROVAL_REQUIRED');
  f.allowProvision(false);
  assert.equal((await f.invoke({...input, authorizeSetup:true})).code, 'PERMISSION_DENIED');
  f.allowProvision(true);
  f.allowInspection(false);
  assert.equal((await f.invoke({...input, authorizeSetup:true})).code, 'AUTHORIZATION_DENIED');
  assert.equal(f.operations.size, 0);
  assert.deepEqual(f.preparedFor, []);
  assert.deepEqual(f.written, []);
  f.allowInspection(true);
  assert.equal((await f.invoke({...input, authorizeSetup:true})).state, 'completed');
  assert.equal((await f.invoke({...input, authorizeSetup:true})).code, 'FILE_RETRY_REQUIRES_INSPECTION');
  assert.equal(f.preparedFor.length, 1);
  assert.equal(f.preparedFor[0].options.sourceBucket, undefined);
  assert.equal(f.written.length, 1);
  assert.deepEqual(f.receipts.map(({state}) => state), ['pending','completed']);
  assert.equal((await f.invoke(mkdir(target, 'second child'))).state, 'completed');
  assert.equal(f.preparedFor.length, 1);
});

test('cross-bucket copy and move require the exact source binding and preserve the transfer approval gate', async () => {
  const f = fixture({prepared:true});
  const input = {source:target, destination:other, entry:{key:'example.txt',folder:false}};
  for (const action of ['copy','move']) assert.equal((await f.invoke({action,...input})).code, 'FILE_SETUP_APPROVAL_REQUIRED');
  assert.deepEqual(f.written, []);
  assert.equal((await f.invoke({action:'copy', ...input, authorizeSetup:true})).state, 'completed');
  assert.deepEqual(f.inspected, ['archive','bucket']);
  assert.equal(f.preparedFor[0].options.sourceBucket, 'bucket');
  assert.equal((await f.invoke({action:'move', ...input})).state, 'completed');
  assert.equal(f.preparedFor.length, 1);
  assert.deepEqual(f.written.map(({operation}) => operation), ['copy','move']);
});
