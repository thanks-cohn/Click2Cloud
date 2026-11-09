import {ancestors,targetLabel} from './menu-identity.mjs';
import {levelHidden} from '../modes/nested/index.mjs';
// Compile-time selected route snapshot; never infer authority or paths from labels.
export function menuProvenance({mode,entryId,target,title,presentationId,destinationConfig,menuPath}){
 const directories=target.prefix.split('/').filter(Boolean),snapshot={schema:1,mode:mode==='nested'?'narrow':mode,entryId,location:{provider:'cloudflare',bucket:target.bucketName,directories},menuPath};
 const d=destinationConfig??{};
 if(mode==='simple')snapshot.presentation={...(presentationId?{id:presentationId}:{}),title,configuredTitle:d.label??targetLabel(target),labelSource:d.label?'menu_title':'name',visibility:'hide-all'};
 if(mode==='nested')snapshot.presentation={id:presentationId,title,visibilityMode:d.visibilityMode??'custom',levels:ancestors(target.prefix).map((prefix,i)=>({actual:directories[i],title:d.levels?.[prefix]?.label??(prefix===target.prefix?d.label:undefined)??targetLabel({...target,prefix}),visible:!levelHidden({...d,target},prefix)})),...(d.levels?.['']?.label?{bucketTitle:d.levels[''].label,bucketVisible:!levelHidden({...d,target},'')}: {})};
 return snapshot;
}
