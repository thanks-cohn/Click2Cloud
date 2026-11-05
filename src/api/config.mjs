import {closed, integer, validateModeConfig} from '../persistence/schema.mjs';
import {normalizeTarget, freeze} from '../core/menu-identity.mjs';
export const initialConfig=()=>({schemaVersion:1,revision:0,configs:{simple:validateModeConfig('simple',{}),nested:validateModeConfig('nested',{}),depth:validateModeConfig('depth',{})},show:{simple:true,narrow:true,depth:true,flat:false},previousShow:{simple:true,narrow:true,depth:true},flatDefault:null,recoveryPolicy:{cadence:'weekly',simple:true,narrow:true,buckets:[],backupLocation:'automatic'}});
export function validateProduct(raw) {
  closed(raw,['schemaVersion','revision','configs','show','previousShow','flatDefault','recoveryPolicy']);
  if(raw.schemaVersion!==1)throw TypeError('Unsupported product schema');integer(raw.revision);
  closed(raw.configs,['simple','nested','depth']);
  const configs=Object.fromEntries(['simple','nested','depth'].map(mode=>[mode,validateModeConfig(mode,raw.configs[mode])]));
  for(const [value,keys] of [[raw.show,['simple','narrow','depth','flat']],[raw.previousShow,['simple','narrow','depth']]]) {
    closed(value,keys);if(keys.some(k=>typeof value[k]!=='boolean'))throw TypeError('Invalid Show selection');
  }
  if(raw.flatDefault!==null)closed(raw.flatDefault,['provider','connectionId','accountId','bucketName','prefix']);
  const flatDefault=raw.flatDefault===null?null:normalizeTarget(raw.flatDefault);
  if(flatDefault&&flatDefault.provider!=='cloudflare')throw TypeError('Flat requires Cloudflare');
  const policy=raw.recoveryPolicy??initialConfig().recoveryPolicy;
  closed(policy,['cadence','simple','narrow','buckets','backupLocation']);
  if(!['weekly','daily'].includes(policy.cadence)||!['automatic','documents'].includes(policy.backupLocation)||typeof policy.simple!=='boolean'||typeof policy.narrow!=='boolean')throw TypeError('Invalid recovery policy');
  const buckets=validateModeConfig('depth',{scopes:policy.buckets}).scopes;
  return freeze({schemaVersion:1,revision:raw.revision,configs,show:{...raw.show},previousShow:{...raw.previousShow},flatDefault,recoveryPolicy:{...policy,buckets}});
}
