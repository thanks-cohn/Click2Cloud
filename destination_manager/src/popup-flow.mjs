/**
 * V3+1 — pure minimal circle -> Add Destination popup interaction.
 * This is a neutral UI contract, not Chrome/IndexedDB/provider integration.
 * The top editor mode may differ from the mode chosen for the new entry.
 */
import {existingDestinationRows,locationKey,addDestination} from './manager-model.mjs';
const choices=new Set(['simple','narrow']);
function assertMode(mode){
  if(!choices.has(mode))throw new TypeError('Popup destination type must be Simple or Narrow');
}
export function beginAddPopup(target,editorMode='simple'){
  assertMode(editorMode);
  locationKey(target);
  return Object.freeze({open:true,target:structuredClone(target),mode:editorMode,menuTitle:''});
}
export function setPopupMode(popup,mode){
  if(!popup?.open)throw new Error('No open destination popup');
  assertMode(mode);
  return {...popup,mode};
}
export function setPopupTitle(popup,title){
  if(!popup?.open)throw new Error('No open destination popup');
  if(typeof title!=='string'||title.length>60)throw new TypeError('Invalid title input');
  return {...popup,menuTitle:title};
}
export function popupPreview(popup){
  if(!popup?.open)throw new Error('No open destination popup');
  assertMode(popup.mode);
  const {scope,prefix}=popup.target;
  const defaultName=prefix?prefix.split('/').at(-1):scope.containerId;
  const title=popup.menuTitle.trim()||defaultName;
  if(!title||title.length>60||/[\x00-\x1f]/.test(title))throw new TypeError('Invalid menu title');
  const branch=popup.mode==='simple'?[title]:[scope.containerId,...(prefix?prefix.split('/'):[])];
  if(popup.mode==='narrow')branch[branch.length-1]=title;
  return Object.freeze({mode:popup.mode,title,target:structuredClone(popup.target),branch});
}
/** No badges/counts. Any alias in either mode fills the same circle. */
export function circleChecked({configs,target,pendingPopup=null}){
  const key=locationKey(target);
  if(pendingPopup?.open&&locationKey(pendingPopup.target)===key)return true;
  return existingDestinationRows(configs).some(row=>row.locationKey===key);
}
/** Return the changed mode's draft only, never mutate the other mode's draft. */
export function addFromPopup({popup,configByMode,destinationId,expectedRevision}){
  if(!popup?.open)throw new Error('No open destination popup');
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)
    throw new TypeError('Expected revision required for concurrent edits');
  const preview=popupPreview(popup);
  const current=configByMode?.[preview.mode];
  if(!current||current.mode!==preview.mode)throw new Error('Missing owning mode config');
  const next=addDestination(current,{
    id:destinationId,menuTitle:preview.title,target:preview.target
  },expectedRevision);
  return Object.freeze({mode:preview.mode,config:next,addedId:destinationId,
    status:'Added to '+preview.mode[0].toUpperCase()+preview.mode.slice(1)});
}
export function cancelAddPopup(){return null}
