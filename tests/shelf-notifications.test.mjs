import assert from 'node:assert/strict';
import test from 'node:test';
import {createTransientNotice,shelfNoticeText} from '../extension/shelf-notifications.mjs';

test('the redundant review sentence is removed while the outcome is retained',()=>{
  assert.equal(shelfNoticeText('Review the current panel or History for details.'),'');
  assert.equal(shelfNoticeText('Save failed. · Review the current panel or History for details.'),'Save failed.');
});

test('Shelf notices expire, suppress polling repeats, and ignore a dismissal from a prior notice', t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const seen = new Set();
  let displayed;
  const create = () => createTransientNotice({seen, paint: notice => { displayed = notice?.text; }});
  let notices = create();
  const summary = 'Save not confirmed. Check History before retrying.';
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

test('footer notices use an absolute ten-second lifetime and dedupe after dismissal', t => {
  t.mock.timers.enable({apis:['setTimeout']});
  let now=0, displayed;
  const seen=new Set();
  const options={seen,clock:()=>now,paint:notice=>{displayed=notice??undefined;}};
  let notices=createTransientNotice(options);
  const show=key=>notices.show('Saved · Chrome menu acknowledged',{key,duration:10000});
  const dismiss=show('first');
  assert.equal(displayed.expiresAt,10000);
  now=6000;
  assert.equal(show('first'),undefined);
  show('second');
  dismiss();
  assert.equal(displayed.expiresAt,16000);
  now=15999;notices.expire();
  assert(displayed);
  now=16000;notices.expire();
  assert.equal(displayed,undefined);
  notices=createTransientNotice(options);
  assert.equal(show('second'),undefined);
  show('third')();
  assert.equal(show('third'),undefined);
  assert.equal(displayed,undefined);
  show('automatic');
  t.mock.timers.tick(9999);
  assert(displayed);
  t.mock.timers.tick(1);
  assert.equal(displayed,undefined);
});
