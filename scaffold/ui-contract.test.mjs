// Static/contract smoke checks for the in-memory UI scaffold.
// These do NOT verify real browser interactions, native Chrome contextMenus or R2 uploads.
// Run: node --test scaffold/ui-contract.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
const docs=readFileSync(new URL('./README.md',import.meta.url),'utf8');

test('HTML IDs used by script all exist uniquely',()=>{
  const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,'duplicate HTML IDs');
  const mentioned=[...js.matchAll(/byId\('([^']+)'\)/g)].map(m=>m[1]);
  for(const id of mentioned) assert.ok(ids.includes(id),'missing HTML ID: '+id);
});

test('Explorer has creation, management and additive Depth controls',()=>{
  for(const id of ['add-right-click','depth-toggle','open-manager-explorer','explorer-context-add','explorer-context-manage']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/function showExplorerContext\(/);
  assert.match(js,/state\.depthEnabled=!state\.depthEnabled/);
});

test('The manager is one pop-out with mode filter, return action and bottom Save',()=>{
  for(const id of ['manager-backdrop','manager-list','manager-editor','manager-simple','manager-narrow','manager-back','manager-save','manager-footer']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/pageSize:20/);
  assert.match(js,/managerState\.selectedId/);
  assert.match(js,/function backToManager\(/);
  assert.match(js,/function saveManagerEditor\(/);
});

test('X deletion requires confirmation and never deletes real cloud files',()=>{
  assert.match(js,/managerState\.confirmId=record\.id/);
  assert.match(js,/Remove.*Cloud files remain untouched/);
  assert.match(js,/state\.records\.splice\(index,1\)/);
  assert.doesNotMatch(js,/fetch\(/);
  assert.doesNotMatch(js,/chrome\.contextMenus/);
});

test('Manager filter is not a conversion operation',()=>{
  assert.match(js,/managerState\.mode=mode/);
  assert.match(js,/existing\.title=draft\.title\.trim\(\)/);
  assert.match(js,/existing\.aliases=\{\.\.\.draft\.aliases\}/);
  assert.doesNotMatch(js,/existing\.mode=draft\.mode/);
});

test('Simple editing is one row, Narrow editing maps every original path level',()=>{
  assert.match(js,/draft\.mode==='simple'\?\[pieces\.length-1\]:pieces\.map/);
  assert.match(js,/left\.title='Original cloud directory name: cannot be edited'/);
  assert.match(html,/MENU TITLE · EDITABLE/);
});

test('Escape and Back return to the list before closing the manager',()=>{
  assert.match(js,/if\(managerState\.selectedId!==null\)backToManager\(\)/);
  assert.match(js,/else closeManager\(\)/);
  assert.match(js,/byId\('manager-back'\)\.addEventListener\('click',backToManager\)/);
});

test('Chrome shortcut is a configurable preview only, Explorer access remains',()=>{
  assert.match(html,/id="chrome-manage-visible"/);
  assert.match(js,/if \(state\.chromeManageVisible\)/);
  assert.match(js,/byId\('open-manager-explorer'\)\.addEventListener/);
  assert.match(docs,/native Chrome menu.*preview-only/i);
});

test('Narrow-only creation tab is completely hidden in Simple',()=>{
  assert.match(html,/id="titles-tab"[^>]*hidden/);
  assert.match(js,/byId\('titles-tab'\)\.hidden=!isNarrow/);
  assert.match(js,/if \(!isNarrow && state\.activeTab==='titles'\) showTab\('setup'\)/);
});

test('Layout assets exist and preserve scroll/fixed footer',()=>{
  assert.match(css,/\.manager-list.*overflow-y:auto/);
  assert.match(css,/\.dialog-actions/);
  assert.match(css,/\.back-link/);
});
