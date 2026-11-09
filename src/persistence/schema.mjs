// Closed portable config schema, independent from live authorization.
import * as simple from '../modes/simple/index.mjs';
import * as nested from '../modes/nested/index.mjs';
import * as depth from '../modes/depth/index.mjs';
import {productState} from '../api/config.mjs';
export const modeModules=Object.freeze({simple,nested,depth});
export const BACKUP_FORMAT='click2cloud-current';
export const MAX_RECORDS=4096;
const fail=()=>{throw Object.assign(new TypeError('Invalid or unsupported local state schema.'),{code:'BACKUP_INVALID'});};
export function closed(value,keys) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).some(k=>!keys.includes(k)))fail();
}
export function integer(n) {if(!Number.isSafeInteger(n)||n<0)fail();return n;}
function text(s,max=2048) {if(typeof s!=='string'||!s||s.length>max||/[\x00-\x1f\x7f]/.test(s))fail();}
function target(t) {
  closed(t,['provider','connectionId','accountId','bucketName','prefix']);
  for(const k of ['provider','connectionId','accountId','bucketName'])text(t[k]);
  if(typeof t.prefix!=='string'||t.prefix.length>2048)fail();
}
export function validateModeConfig(mode,raw) {
  if(!Object.hasOwn(modeModules,mode))fail();
  closed(raw,mode==='depth'?['schemaVersion','mode','revision','scopes']:['schemaVersion','mode','revision','destinations']);
  if(raw.schemaVersion!==undefined&&raw.schemaVersion!==1||raw.mode!==undefined&&raw.mode!==mode)fail();
  if(raw.revision!==undefined)integer(raw.revision);
  const values=raw[mode==='depth'?'scopes':'destinations']??[];
  if(!Array.isArray(values))fail();
  for(const d of values) {
    closed(d,mode==='depth'?['target','maxDepth','hidden']:['id','target','label','hidden','quick','order','levels','aliases',...(mode==='nested'?['visibilityMode']:[])]);target(d.target);
    if(mode==='depth'){if(d.maxDepth!==undefined&&(!Number.isSafeInteger(d.maxDepth)||d.maxDepth<1))fail();}
    else {if(d.id!==undefined)text(d.id,128);if(d.label!==undefined)text(d.label,256);}
  }
  return modeModules[mode].createConfig(raw);
}
export function validateGeneration(g) {
  closed(g,['desired','applied']);integer(g.desired);
  if(g.applied!==null){integer(g.applied);if(g.applied>g.desired)fail();}
  return g;
}
export function validateBundle(raw) {
  closed(raw,['format','schemaVersion','requiresReconnect','exportedAt','configs','product','generation','journal','journalEvicted','checkpoints']);
  if(raw.format!==BACKUP_FORMAT||raw.schemaVersion!==1||raw.requiresReconnect!==true)fail();
  if(raw.product!==undefined)productState(raw.product);
  integer(raw.exportedAt);integer(raw.journalEvicted);closed(raw.configs,['simple','nested','depth']);
  for(const [mode,config] of Object.entries(raw.configs))validateModeConfig(mode,config);
  validateGeneration(raw.generation);
  if(!Array.isArray(raw.journal)||!Array.isArray(raw.checkpoints))fail();
  let sequence=raw.journalEvicted;
  const latestConfigs=new Map();let latestGeneration=null,latestProduct=null;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  for(const row of raw.journal) {
    closed(row,['sequence','kind','mode','at','previous','current']);integer(row.sequence);integer(row.at);
    if(row.sequence!==sequence+1)fail();sequence=row.sequence;
    if(row.kind==='config') {
      if(row.previous!==null)validateModeConfig(row.mode,row.previous);
      validateModeConfig(row.mode,row.current);
      if(row.current.revision!==(row.previous?.revision??0)+1)fail();
      if(latestConfigs.has(row.mode)&&!same(row.previous,latestConfigs.get(row.mode)))fail();
      latestConfigs.set(row.mode,row.current);
    } else if(row.kind==='generation') {
      if(row.mode!==null)fail();validateGeneration(row.previous);validateGeneration(row.current);
      if(row.current.desired<row.previous.desired||latestGeneration&&!same(row.previous,latestGeneration))fail();
      latestGeneration=row.current;
    } else if(row.kind==='product') {
      productState(row.previous);productState(row.current);
      if(row.mode!==null||row.current.revision!==row.previous.revision+1||latestProduct&&!same(latestProduct,row.previous))fail();
      latestProduct=row.current;
    } else fail();
  }
  if(latestProduct&&!same(latestProduct,raw.product))fail();
  for(const [mode,config] of latestConfigs)if(!same(raw.configs[mode],config))fail();
  if(latestGeneration&&!same(raw.generation,latestGeneration))fail();
  const ids=new Set();
  for(const checkpoint of raw.checkpoints) {
    closed(checkpoint,['id','mode','at','config']);text(checkpoint.id);integer(checkpoint.at);
    if(ids.has(checkpoint.id))fail();ids.add(checkpoint.id);validateModeConfig(checkpoint.mode,checkpoint.config);
  }
  return raw;
}
