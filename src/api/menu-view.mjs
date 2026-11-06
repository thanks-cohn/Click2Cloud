// Shared read-only nested view of a canonical V3+1 MenuSpec.
// Used by the GUI mirror, tests, and authenticated programmatic clients.
// Never derives menu authority from DOM coordinates, labels, or a simulation.
import {freeze} from '../core/menu-identity.mjs';

export function describeCanonicalContextMenu(spec,{context='link',nativeAcknowledged=false}={}){
  if(!['image','link','page','selection','video','audio'].includes(context))throw TypeError('INVALID_MENU_CONTEXT');
  if(!spec||!Array.isArray(spec.rows))throw TypeError('MENU_SPEC_REQUIRED');
  const byId=new Map(),roots=[];
  for(const row of spec.rows){
    if(row.visible===false||!row.contexts?.includes(context))continue;
    const item={
      itemId:row.id,parentId:row.parentId,actionId:row.actionId??null,
      label:row.label,role:row.role,kind:row.kind,
      enabled:row.enabled===true,reason:row.reason,
      target:row.target??null,providerAction:row.providerAction??null,children:[]
    };
    byId.set(row.id,item);
    if(row.parentId===null)roots.push(item);
    else byId.get(row.parentId)?.children.push(item);
  }
  return freeze({
    schemaVersion:1,source:'canonical-menu-spec',
    context,generation:spec.generation,nativeAcknowledged:!!nativeAcknowledged,
    coverage:spec.coverage,
    roots
  });
}
