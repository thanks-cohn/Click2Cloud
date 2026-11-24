import assert from 'node:assert/strict';
import test from 'node:test';
import {createTransientNotice} from '../extension/shelf-notifications.mjs';

test('Shelf notices expire, suppress polling repeats, and ignore a dismissal from a prior notice', t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const seen = new Set();
  let displayed;
  const create = () => createTransientNotice({seen, paint: notice => { displayed = notice?.text; }});
  let notices = create();
  const summary = 'Review the current panel or History for details.';
  const dismiss = notices.show(summary, {error: true, key:'operation:1:uncertain'});
  assert.equal(displayed, summary);
  t.mock.timers.tick(8000);
  assert.equal(notices.show(summary, {error: true, key:'operation:1:uncertain'}), undefined);
  t.mock.timers.tick(1000);
  assert.equal(displayed, undefined);
  t.mock.timers.tick(2 * 60 * 60 * 1000);
  assert.equal(notices.show(summary, {error: true, key:'operation:1:uncertain'}), undefined);

  notices.show('Save verified.', {key: 'verified:1'});
  dismiss();
  assert.equal(displayed, 'Save verified.');
  t.mock.timers.tick(4999);
  assert.equal(displayed, 'Save verified.');
  t.mock.timers.tick(1);
  assert.equal(displayed, undefined);

  notices = create();
  assert.equal(notices.show(summary, {error: true, key:'operation:1:uncertain'}), undefined);
  notices.show(summary, {key: 'operation:2', error: true});
  t.mock.timers.tick(7000);
  notices.show('Another action started.');
  t.mock.timers.tick(2000);
  assert.equal(displayed, 'Another action started.');
  notices.clear();
  assert.equal(displayed, undefined);
});
