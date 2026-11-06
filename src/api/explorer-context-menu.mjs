// Read-only, serializable description of the Explorer's folder context menu.
// The same descriptors are consumed by the GUI and by authorized scripts.
// Actual effects remain delegated to the existing Engine API and Explorer navigation.
import {normalizeTarget,freeze} from '../core/menu-identity.mjs';

const actions=Object.freeze([
  {id:'explorer.open',label:'Open',kind:'navigate'},
  {id:'explorer.rightClickSetup',label:'+ Right Click',kind:'configure'},
  {id:'explorer.setFlatDefault',label:'Make Default',kind:'configure'},
  {id:'explorer.manageDestinations',label:'Manage Destinations',kind:'navigate'}
]);

export function describeExplorerContextMenu(target) {
  return freeze({
    schemaVersion:1,
    kind:'explorer.folder',
    target:normalizeTarget(target),
    items:actions.map(({id,label,kind})=>({id,label,kind,enabled:true}))
  });
}
