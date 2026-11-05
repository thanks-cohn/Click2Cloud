import {compileMenuSpec,modeModules} from './menu-spec.mjs';
import {freeze} from './menu-identity.mjs';
/** Reuse each independent projector; namespace placements rather than duplicate its logic. */
export function compileComposite({product,inventory,generation,sink}={}) {
  const projection={revision:product.revision,rows:[],omissions:[]};
  if(!product.show.flat)for(const [show,mode] of [['simple','simple'],['narrow','nested'],['depth','depth']]) {
    if(!product.show[show])continue;
    const part=modeModules[mode].project({config:product.configs[mode],inventory:normalize(inventory)});
    projection.omissions.push(...part.omissions);
    for(const row of part.rows)projection.rows.push({...row,mode,placement:mode+':'+row.placement,parentPlacement:row.parentPlacement===null?null:mode+':'+row.parentPlacement});
  }
  // Explicitly disambiguate overlapping modes and equal labels without changing route identity.
  const peers=new Map();
  for(const row of projection.rows) {
    const key=JSON.stringify([row.parentPlacement,row.label]);
    const group=peers.get(key)??[];group.push(row);peers.set(key,group);
  }
  for(const group of peers.values())if(group.length>1)for(const row of group)row.label+=` [${row.mode}: ${row.target.connectionId}/${row.target.accountId}/${row.target.bucketName}/${row.target.prefix}]`;
  const custom={createConfig:()=>({}),project:()=>projection};
  const result=compileMenuSpec({mode:'composite',modules:{composite:custom},inventory,configs:{},generation,revision:product.revision,defaultTarget:product.show.flat?product.flatDefault:null,sink});
  const rows=result.rows.map(row=>row.id==='c2c:cloudflare'?{...row,label:'Cloudflare',...(product.show.flat&&!product.flatDefault?{enabled:false,reason:'FLAT_DEFAULT_REQUIRED'}:{})}:row);
  return freeze({...result,rows,nodes:rows});
}
// The existing projectors consume normalized observed inventory. Compiler still validates it independently.
function normalize(value={}) {
  const scopes=(value.scopes??[]).map(scope=>{
    const target={...scope.target,prefix:''};const folders=new Map([['',{target,writable:scope.writable!==false}]]);
    for(const raw of scope.folders??[]) {
      const prefix=typeof raw==='string'?raw:raw.prefix??raw.target?.prefix;
      const segments=prefix.split('/').filter(Boolean);
      for(let i=1;i<=segments.length;i++) {const p=segments.slice(0,i).join('/')+'/';if(!folders.has(p))folders.set(p,{target:{...target,prefix:p},writable:scope.writable!==false});}
      if(typeof raw==='object')folders.set(prefix,{target:{...target,prefix},writable:raw.writable!==false});
    }
    return {...scope,target,folders:[...folders.values()]};
  });return {...value,scopes};
}
