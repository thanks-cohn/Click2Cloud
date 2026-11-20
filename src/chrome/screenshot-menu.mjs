import {stableId,targetKey} from '../core/menu-identity.mjs';
import {screenshotTarget} from '../screenshot/rules.mjs';

export const screenshotMenuId='click2cloud-screenshot';
export const chooseScreenshotFolderId=screenshotMenuId+'-choose';
const itemPrefix=screenshotMenuId+'-target-';
export const isScreenshotMenuItem=id=>id===chooseScreenshotFolderId||String(id).startsWith(itemPrefix);

export function screenshotMenu(spec){
 const targets=new Map();
 for(const row of spec?.rows??[]){
  if(row.role!=='save'||row.enabled!==true||row.visible===false||row.target?.provider!=='cloudflare')continue;
  const target=screenshotTarget(row.target);
  targets.set(targetKey(target),target);
 }
 const rows=[...targets].map(([key,target])=>({
  id:itemPrefix+stableId('screenshot-folder',JSON.stringify([spec.generation,key])),
  target
 }));
 const contexts=['page','link','image','video','audio','editable','selection'];
 const properties={contexts,documentUrlPatterns:['https://*/*','http://*/*']};
 return {
  targets:rows,
  items:[
   {...properties,id:screenshotMenuId,title:'Screenshot'},
   ...rows.map(({id,target})=>({...properties,id,parentId:screenshotMenuId,title:(target.bucketName+'/'+target.prefix+' · '+target.accountId).replaceAll('%','%%')})),
   {...properties,id:chooseScreenshotFolderId,parentId:screenshotMenuId,title:'Choose folder…'}
  ]
 };
}
