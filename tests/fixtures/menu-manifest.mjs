import {productState} from '../../src/api/config.mjs';
import {validateModeConfig} from '../../src/persistence/schema.mjs';
export const qaRoot=(bucketName='click2cloud-qa',accountId='qa-account')=>({provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName,prefix:''});
export const qaDepthPrefixes=['','C2C-QA/','C2C-QA/Depth/',...Array.from({length:5},(_,i)=>'C2C-QA/Depth/'+Array.from({length:i+1},(_,j)=>'L'+(j+1)).join('/')+'/'),...Array.from({length:14},(_,i)=>'C2C-QA/Depth/Sibling'+String(i+1).padStart(2,'0')+'/')];
export function qaFixture({extra=false}={}){
 const buckets=['click2cloud-qa','click2cloud-qa-2'],simple=[],narrow=[];
 for(const [i,bucket] of buckets.entries())for(const label of ['A','B','C']){
  simple.push({id:`simple-${i}-${label}`,target:{...qaRoot(bucket),prefix:`C2C-QA/Simple/${label}/`},label:`Simple ${i+1} ${label}`,order:simple.length,hidden:extra&&label==='C',quick:label==='B'});
  narrow.push({id:`narrow-${i}-${label}`,target:{...qaRoot(bucket),prefix:`C2C-QA/Narrow/${label}/`},label:`Narrow ${i+1} ${label}`,order:narrow.length,hidden:extra&&label==='C',quick:label==='B',visibilityMode:'custom',levels:{'C2C-QA/':{label:i?'C2C-QA2':'C2C-QA',hidden:false},'C2C-QA/Narrow/':{label:'Narrow',hidden:extra},[`C2C-QA/Narrow/${label}/`]:{label}}});
 }
 if(extra)narrow.push({...structuredClone(narrow[0]),id:'separate-same-key',label:'Independent presentation',levels:{'C2C-QA/':{label:'Independent',hidden:false}}});
 return {product:productState({show:{simple:true,nested:true,depth:true,flat:extra},defaultTarget:simple[0].target,providerVisibility:{cloudflare:true,'google-drive':!extra,dropbox:true,onedrive:true},placement:{cloudflare:'direct'}}),configs:{simple:validateModeConfig('simple',{destinations:simple}),nested:validateModeConfig('nested',{destinations:narrow}),depth:validateModeConfig('depth',{scopes:buckets.map(bucket=>({target:qaRoot(bucket),maxDepth:7}))})}};
}
export function qaInventory(configuration=qaFixture()){
 return {revision:1,scopes:['click2cloud-qa','click2cloud-qa-2'].map((bucket,i)=>({target:qaRoot(bucket),authorized:true,workerReady:true,complete:true,folders:[...new Set([...(i?['','C2C-QA/','C2C-QA/Depth/']:qaDepthPrefixes),...Object.values(configuration.configs).flatMap(c=>(c.destinations??c.scopes).filter(r=>r.target.bucketName===bucket).map(r=>r.target.prefix))])].map(prefix=>({prefix,workerReady:true}))})),depthScopes:['click2cloud-qa','click2cloud-qa-2'].map((bucket,i)=>({target:qaRoot(bucket),authorized:true,workerReady:true,complete:true,folders:(i?['','C2C-QA/','C2C-QA/Depth/']:qaDepthPrefixes).map(prefix=>({prefix,workerReady:true}))})),depthCoverageComplete:true};
}
