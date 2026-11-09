import {freeze,targetKey,stableId,intentFor} from './menu-identity.mjs';
import {operationIdentity} from './boundary-observation.mjs';
const signal=(sink,event)=>{try{if(typeof sink==='function')sink(event);else sink?.emit?.(event);}catch{/* Observation must not change resolution. */}};

/** Internal owner for dispatchSave/dispatchExplorerSave and native engine.save.
 * Read the acknowledged generation, context, bound action ID and fresh target authorization;
 * reject stale/hidden/unknown/mismatched rows before returning a target intent.
 * Pure: never fetches, persists, provisions or treats a prior menu as present authority.
 * Observe through inspectNativeACK/previewNativeMenu; tests/chrome-registrar.test.mjs.
 */
export function resolveMenuAction(spec,selection={}) {
  const {generation,acknowledgedGeneration,context='image',authorizedTargets,sink}=selection;
  const operationId=operationIdentity(selection);
  const emit=(outcome,code)=>signal(sink,{stage:'resolver',outcome,code,operationId,generation:generation??0,revision:spec?.revision??0});
  emit('started','RESOLVE_STARTED');
  const blocked=code=>{emit(code==='STALE_GENERATION'?'stale':'blocked',code);return freeze({state:'blocked',code,generation:spec?.generation??null});};
  if(!spec||generation!==spec.generation)return blocked('STALE_GENERATION');
  if(spec.schemaVersion!==1||!Array.isArray(spec.rows))return blocked('MENU_INVALID');
  if(acknowledgedGeneration===undefined||acknowledgedGeneration===null)return blocked('ACK_MISSING');
  if(acknowledgedGeneration!==spec.generation)return blocked('STALE_GENERATION');
  const row=spec.rows.find(item=>item?.id===(selection.itemId??selection.id));
  if(!row)return blocked('ITEM_UNKNOWN');
  if(row.role==='provider-action'){
    if(!['google-drive','dropbox','onedrive','cloudflare'].includes(row.providerAction)||row.actionId!==stableId('provider-action',row.providerAction)||!row.visible||!row.enabled||!row.contexts.includes(context))return blocked('PROVIDER_ACTION_INVALID');
    return freeze({state:'completed',code:'PROVIDER_ACTION',generation:spec.generation,action:{actionId:row.actionId,itemId:row.id,providerAction:row.providerAction}});
  }
  if(row.role!=='save'||!row.actionId||!row.target)return blocked('NOT_ACTIONABLE');
  if(!row.enabled||!row.visible)return blocked('ITEM_DISABLED');
  if(!Array.isArray(row.contexts))return blocked('MENU_INVALID');
  if(!row.contexts.includes(context)&&!row.contexts.includes('all'))return blocked('CONTEXT_MISMATCH');
  const bound=intentFor(row.target);
  if(row.actionId!==stableId('action',targetKey(row.target))||!row.intent||
      Object.keys(row.intent).length!==Object.keys(bound).length||Object.keys(bound).some(key=>bound[key]!==row.intent[key]))
    return blocked('ACTION_BINDING_INVALID');
  // A canonical menu is an observation, never present-time write authority.
  if(!Array.isArray(authorizedTargets))return blocked('AUTHORIZATION_MISSING');
  if(!authorizedTargets.some(target=>target&&typeof target==='object'&&targetKey(target)===targetKey(row.target)))return blocked('SCOPE_UNAUTHORIZED');
  emit('ok','RESOLVE_OK');
  return freeze({state:'completed',code:'RESOLVE_OK',generation:spec.generation,action:{actionId:row.actionId,itemId:row.id,target:row.target,intent:bound,...(row.provenance?{provenance:row.provenance}:{})}});
}
