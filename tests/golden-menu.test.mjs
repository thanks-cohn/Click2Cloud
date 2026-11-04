import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileMenuSpec,diffMenuSpecs} from '../src/core/menu-spec.mjs';
import {menuFixture} from '../scripts/glaciaring-fixtures.mjs';
const golden=JSON.parse(await readFile(new URL('./fixtures/menu-golden.json',import.meta.url),'utf8'));
test('committed known-good complete mode/provider generations do not silently drift',()=>{
  for(const mode of ['simple','nested','depth']){
    const input=menuFixture({count:16,deep:true,mode});input.defaultTarget=input.inventory.scopes[0];
    const actual=compileMenuSpec(input);
    assert.deepEqual(actual,golden.menus[mode],`${mode} differs from reviewed public fixture generation`);
  }
});
test('known-good baseline detects independent flat-provider and deep route regressions',()=>{
  const before=golden.menus.depth;
  for(const removed of [before.rows.find(r=>r.origin.provider==='google-drive'),before.rows.find(r=>r.role==='save'&&r.target?.prefix.split('/').length>10)]){
    const after={...before,generation:before.generation+1,rows:before.rows.filter(r=>r.id!==removed.id)};
    const diff=diffMenuSpecs(before,after);
    assert(JSON.stringify(diff).includes(removed.id));
  }
});
