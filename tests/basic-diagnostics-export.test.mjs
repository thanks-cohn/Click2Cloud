import assert from 'node:assert/strict';
import test from 'node:test';
import {createBasicDiagnosticsExport} from '../extension/basic-diagnostics-export.mjs';

function controls() {
  const button = {attributes: {}, setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(_type, listener) { this.click = listener; }};
  const output = {};
  const host = {querySelector: selector => selector === '#export-basic-diagnostics' ? button : output};
  return {host, button, output};
}

test('Settings sends one trusted Basic export with explicit consent and stays busy through a remount', async () => {
  const calls = [], warnings = [];
  let release;
  const request = new Promise(resolve => { release = resolve; });
  const widget = createBasicDiagnosticsExport({
    runtime: {sendMessage(message) { calls.push(message); return request; }},
    confirm(message) { warnings.push(message); return true; },
  });
  const first = controls();
  widget.mount(first.host);
  assert.match(first.host.innerHTML, /Export Other Cloud Provider Diagnostics/);
  assert.match(first.host.innerHTML, /Google Drive, OneDrive, and Dropbox/);
  const done = first.button.click();
  await first.button.click();
  assert.equal(first.button.disabled, true);
  assert.equal(first.button.attributes['aria-busy'], 'true');
  assert.match(first.output.textContent, /Preparing/);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /private RAW diagnostics.*before sharing/i);
  assert.deepEqual(calls, [{channel: 'redown-basic-v1', api: 1, op: 'diagnostics.exportZip', input: {}}]);
  const reopened = controls();
  widget.mount(reopened.host);
  assert.equal(reopened.button.disabled, true);
  await reopened.button.click();
  assert.equal(calls.length, 1);
  release({ok: true, value: {downloadId: 7}});
  await done;
  assert.equal(reopened.button.disabled, false);
  assert.equal(reopened.button.attributes['aria-busy'], 'false');
  assert.match(reopened.output.textContent, /^Download initiated\./);
});

test('Settings reports cancellation, the existing size cap, unavailable storage and API failures', async () => {
  for (const [reply, consent, expected] of [
    [null, false, /Export cancelled/],
    [{ok: false, error: {code: 'EXPORT_TOO_LARGE'}}, true, /16 MiB local export limit/],
    [{ok: false, error: {code: 'STORAGE_UNAVAILABLE'}}, true, /diagnostics are unavailable/],
    [{ok: false, error: {code: 'DOWNLOAD_CANCELLED'}}, true, /Download cancelled/],
    [{ok: false, error: {code: 'UNEXPECTED_ERROR'}}, true, /could not start/],
    [{ok: true, value: {}}, true, /could not start/],
    [Error('disconnected'), true, /could not start/],
  ]) {
    const ui = controls();
    let calls = 0;
    createBasicDiagnosticsExport({confirm: () => consent,
      runtime: {sendMessage: async () => { calls++; if (reply instanceof Error) throw reply; return reply; }},
    }).mount(ui.host);
    await ui.button.click();
    assert.match(ui.output.textContent, expected);
    assert.doesNotMatch(ui.output.textContent, /Download initiated/);
    assert.equal(ui.button.disabled, false);
    assert.equal(ui.button.attributes['aria-busy'], 'false');
    assert.equal(calls, Number(consent));
  }
});
