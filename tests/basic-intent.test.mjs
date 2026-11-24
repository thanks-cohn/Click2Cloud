import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import 'fake-indexeddb/auto';
import {createCoordinator} from '../src/basic/lib/coordinator.js';
import {createSaveIntents, CONTINUE_WINDOW_MS} from '../src/basic/lib/intent.js';
import {fail} from '../src/basic/lib/common.js';
import {acquireSource} from '../src/basic/lib/source.js';
import {openStore} from '../src/basic/lib/store.js';

const sourceUrl = 'https://images.example/file.png?signature=private-query';
const data = Uint8Array.of(1, 2, 3);
async function fixture(provider, {connected = true, access = true, login = () => {}} = {}) {
  const db = new IDBFactory(), session = {}, name = 'intent-fixture';
  const chrome = {storage:{session: {
    get: async key => ({[key]: structuredClone(session[key])}),
    set: async values => Object.assign(session, structuredClone(values)),
    remove: async key => {delete session[key];},
  }}};
  const intents = createSaveIntents(chrome, async () => {});
  let now = Date.now(), identity = provider === 'google' ? ['acct'] : ['acct', 'root'];
  let logins = 0, reads = 0, writes = 0;
  const auth = {
    binding: () => connected ? identity : null,
    authorization: async () => {
      if (!connected) throw fail('AUTH_REQUIRED', 'Sign in.');
      return {accessToken: 'synthetic', identity};
    },
    connect: async () => { logins++; await login(); connected = true; },
  };
  const onVerified = [], notifications = [];
  const create = store => createCoordinator({store, auth, intents, now:()=>now,
    onVerified: a => onVerified.push(a.id),
    notify: a => notifications.push([a.id, a.state]),
    acquire: input => acquireSource(input, {hasAccess: async () => access,
      fetch: async url => {
        reads++; assert.equal(url, sourceUrl);
        return new Response(data, {headers:{'content-type':'image/png'}});
      },
    }),
    adapters:{[provider]:{upload:async input => {
      writes++;
      assert.deepEqual(input.bytes, data);
      assert(!Object.hasOwn(input, 'sourceUrl'));
      return {provider, id:'verified-object', size:data.byteLength, name:input.filename, confirmed:true};
    }}},
  });
  const input = {provider, sourceUrl, hostUrl:'https://page.example/path', requestId: 'test-save-intent'};
  const store = await openStore(db, name);
  return {store, coordinator:create(store), input, session, onVerified, notifications,
    counts: () => ({logins, reads, writes}),
    grant() {access = true;},
    connect() {connected = true;},
    bind(value) {identity = value;},
    advance() {now += CONTINUE_WINDOW_MS + 1;},
    async restart() {
      const store = await openStore(db, name);
      await store.recover();
      return {store, coordinator:create(store)};
    }};
}

for (const provider of ['google','dropbox','onedrive'])
  test(`${provider} connects and continues the same native save with one confirmed receipt`, async () => {
    const f = await fixture(provider,{connected:false});
    try {
      const a = await f.coordinator.start(f.input,{native:true});
      assert.equal(a.state, 'SAVED');
      assert.equal(a.id, f.input.requestId);
      assert.equal(a.destination.accountId, 'acct');
      assert.deepEqual(await f.store.counter(), {count:1});
      assert.deepEqual(f.counts(), {logins:1, reads:1, writes:1});
      assert.deepEqual(f.session, {});
      assert.deepEqual(f.onVerified, [a.id]);
      assert.equal((await f.coordinator.start(f.input,{native:true})).id, a.id);
      assert.deepEqual(f.counts(), {logins:1, reads:1, writes:1});
      const events = (await f.store.diagnosticsForAttempt(a.id)).items;
      assert(events.some(e => e.stage === 'AWAITING_AUTH'));
      assert(!JSON.stringify(events).includes('private-query'));
      assert(!JSON.stringify(a).includes('private-query'));
    } finally {f.store.close();}
  });

test('Native Basic acknowledgment follows admission and cannot change the outcome or fire on replay',async()=>{
  const f = await fixture('google');
  const writesAtAcceptance = [];
  const onAccepted = () => {
    writesAtAcceptance.push(f.counts().writes);
    throw Error('Optional animation failed');
  };
  try {
    const result = await f.coordinator.start(f.input,{native:true,onAccepted});
    assert.equal(result.state,'SAVED');
    assert.deepEqual(writesAtAcceptance,[0]);
    assert.equal((await f.coordinator.start(f.input,{native:true,onAccepted})).state,'SAVED');
    assert.deepEqual(writesAtAcceptance,[0]);
  } finally { f.store.close(); }
});

test('A withheld host leaves one intent and the same worker-restarted gesture resumes once',async()=>{
  const f = await fixture('onedrive',{access:false});
  const waiting = await f.coordinator.start(f.input,{native:true});
  assert.equal(waiting.state,'AWAITING_SOURCE');
  assert.equal(waiting.code,'SOURCE_PERMISSION_REQUIRED');
  assert.equal(Object.values(f.session)[0].input.sourceUrl, sourceUrl);
  assert(!JSON.stringify(waiting).includes('private-query'));
  assert.deepEqual(f.counts(),{logins:0,reads:0,writes:0});
  f.store.close();
  const next = await f.restart();
  try {
    assert.equal((await next.coordinator.pending('onedrive')).id, waiting.id);
    await assert.rejects(next.coordinator.resume('dropbox',waiting.id), {code:'PENDING_SAVE_NOT_FOUND'});
    f.grant();
    const [a,b] = await Promise.all([next.coordinator.resume('onedrive',waiting.id),next.coordinator.resume('onedrive',waiting.id)]);
    assert.equal(a.state,'SAVED');
    assert.deepEqual(a,b);
    assert.equal((await next.store.historyList()).total,1);
    assert.deepEqual(await next.store.counter(),{count:1});
    assert.deepEqual(f.counts(),{logins:0,reads:1,writes:1});
    assert.deepEqual(f.session,{});
  } finally {next.store.close();}
});

test('A missing user gesture leaves an auth intent that an explicit Sign In can continue',async()=>{
  const f = await fixture('dropbox',{connected:false,login:()=>{throw fail('AUTH_GESTURE_REQUIRED','Use Shelf.');}});
  try {
    const waiting = await f.coordinator.start(f.input,{native:true});
    assert.equal(waiting.state,'AWAITING_AUTH');
    assert.equal(await f.store.getAttempt(waiting.id).then(row=>row.state),'AWAITING_AUTH');
    f.connect();
    const done = await f.coordinator.afterLogin('dropbox');
    assert.equal(done.id,waiting.id);
    assert.equal(done.state,'SAVED');
    assert.deepEqual(f.counts(),{logins:1,reads:1,writes:1});
  } finally {f.store.close();}
});

test('A cancelled native consent never resumes or writes',async()=>{
  const f = await fixture('google',{connected:false,login:()=>{throw fail('AUTH_CANCELLED','Consent cancelled.');}});
  try {
    const row = await f.coordinator.start(f.input,{native:true});
    assert.equal(row.code,'AUTH_CANCELLED');
    assert.equal(row.state,'FAILED');
    assert.deepEqual(f.session,{});
    assert.deepEqual(f.counts(),{logins:1,reads:0,writes:0});
  } finally {f.store.close();}
});

for (const [condition, code] of [['changed account','AUTH_ACCOUNT_CHANGED'],['expired','PENDING_SAVE_EXPIRED']])
  test(`A resumed intent with a ${condition} lease cannot read or upload`,async()=>{
    const f = await fixture('dropbox',{access:false});
    try {
      const waiting = await f.coordinator.start(f.input,{native:true});
      if (condition === 'expired') f.advance();
      else f.bind(['other','root']);
      f.grant();
      const terminal = await f.coordinator.resume('dropbox',waiting.id);
      assert.equal(terminal.code,code);
      assert.equal(terminal.state,'FAILED');
      assert.deepEqual(f.counts(),{logins:0,reads:0,writes:0});
      assert.deepEqual(f.session,{});
    } finally {f.store.close();}
  });

test('Two clicks cannot replace another pending intent, and the API never prompts',async()=>{
  const f = await fixture('google',{access:false});
  try {
    const [a,b] = await Promise.all([
      f.coordinator.start(f.input,{native:true}),
      f.coordinator.start({...f.input,requestId:'other-save-intent'},{native:true}),
    ]);
    const waiting = [a,b].find(row=>row.state === 'AWAITING_SOURCE');
    const rejected = [a,b].find(row=>row.state === 'FAILED');
    assert.equal(rejected.code,'PENDING_SAVE_EXISTS');
    assert.equal((await f.coordinator.pending('google')).id,waiting.id);
    const apiSave = await f.coordinator.start({...f.input,requestId:'explicit-api-save-id'});
    assert.equal(apiSave.state,'FAILED');
    assert.equal(apiSave.code,'SOURCE_PERMISSION_REQUIRED');
    assert.deepEqual(f.counts(),{logins:0,reads:0,writes:0});
  } finally {f.store.close();}
});
