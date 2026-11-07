import * as simple from '../modes/simple/index.mjs';
import * as nested from '../modes/nested/index.mjs';
import * as depth from '../modes/depth/index.mjs';
import {freeze,normalizeTarget,normalizePrefix,targetKey,scopeKey,stableId,compare,ancestors,availabilityReasons,findCandidate,intentFor,validateRevision,MenuSpecError} from './menu-identity.mjs';
import {operationIdentity} from './boundary-observation.mjs';

export {MenuSpecError,normalizeTarget,targetKey,scopeKey} from './menu-identity.mjs';
export const modeModules=Object.freeze({simple,nested,depth});
const signal=(sink,event)=>{try{if(typeof sink==='function')sink(event);else sink?.emit?.(event);}catch{/* Diagnostics never control business outcomes. */}};
const emit=(options,stage,outcome,code)=>signal(options.sink,{stage,outcome,code,operationId:options.operationId??0,generation:options.generation??1,revision:options.revision??0});

function normalizeInventory(value={}) {
  if(!Array.isArray(value.scopes??[]))throw new MenuSpecError('INVENTORY_INVALID','Inventory scopes must be an array.');
  const seen=new Set();
  const scopes=(value.scopes??[]).map(scope=>{
    const target=normalizeTarget({...scope.target??scope,prefix:''}),key=scopeKey(target);
    if(seen.has(key))throw new MenuSpecError('DUPLICATE_SCOPE','Inventory contains duplicate scope.');
    seen.add(key);
    const folders=new Map([['',{target,writable:scope.writable!==false,observed:true}]]);
    const explicit=new Map();
    if(!Array.isArray(scope.folders??[]))throw new MenuSpecError('INVENTORY_INVALID','Inventory folders must be an array.');
    for(const raw of scope.folders??[]) {
      const prefix=normalizePrefix(typeof raw==='string'?raw:raw.prefix??raw.target?.prefix??'');
      const writable=typeof raw==='string'?scope.writable!==false:raw.writable!==false;
      if(explicit.has(prefix)&&explicit.get(prefix)!==writable)throw new MenuSpecError('INVENTORY_INVALID','Contradictory folder permission observations.');
      explicit.set(prefix,writable);
      for(const ancestor of ancestors(prefix))if(!folders.has(ancestor))folders.set(ancestor,{target:normalizeTarget({...target,prefix:ancestor}),writable:scope.writable!==false,observed:false});
      folders.set(prefix,{target:normalizeTarget({...target,prefix}),writable,observed:true,...(typeof raw==='object'&&typeof raw.workerReady==='boolean'?{workerReady:raw.workerReady}:{})});
    }
    return {target,authorized:scope.authorized===true,workerReady:scope.workerReady===true,stale:scope.stale===true,complete:scope.complete===true,folders:[...folders.values()].sort((a,b)=>compare(a.target.prefix,b.target.prefix))};
  }).sort((a,b)=>compare(scopeKey(a.target),scopeKey(b.target)));
  return freeze({revision:validateRevision(value.revision??0),scopes});
}

/** Pure, full logical menu. Native capability limits are evidence in the registrar, not hidden tree truncation. */
export function compileMenuSpec(options={}) {
  options={...options,operationId:operationIdentity(options)};
  const mode=options.mode==='narrow'?'nested':options.mode??'simple';
  emit(options,'menu.compile','started','COMPILE_STARTED');
  try {
    const generation=options.generation??1;
    if(!Number.isSafeInteger(generation)||generation<1)throw new MenuSpecError('INVALID_GENERATION','Menu generation must be a positive safe integer.');
    const composite=mode==='composite',show=options.product?.show??{simple:true,nested:true,depth:false,flat:false};
    const module=composite?simple:(options.modules??modeModules)[mode];
    if(!module?.project||!module?.createConfig)throw new MenuSpecError('INVALID_MODE','Unsupported independent mode.');
    const inventory=normalizeInventory(options.inventory),revision=validateRevision(options.revision??0);
    emit(options,'modes.'+mode,'started','PROJECTION_STARTED');
    let projection;
    try {
      if(composite) {
        const parts=Object.entries(modeModules).filter(([m])=>show[m]&&!show.flat).map(([m,mod])=>({m,...mod.project({config:mod.createConfig(options.configs?.[m]??{}),inventory})}));
        projection={revision:options.product?.revision??0,rows:parts.flatMap(p=>p.rows.map(r=>({...r,sourceMode:p.m}))),omissions:parts.flatMap(p=>p.omissions)};
      } else {
        const config=module.createConfig(options.configs?.[mode]??{});
        projection=module.project({config,inventory});
      }
      emit(options,'modes.'+mode,projection.omissions.some(x=>x.kind!=='excluded')?'partial':'ok',projection.omissions.some(x=>x.kind!=='excluded')?'PROJECTION_PARTIAL':'PROJECTION_OK');
    } catch(error) {emit(options,'modes.'+mode,'failed','PROJECTION_FAILED');throw error;}
    // Native provider visibility is a presentation-only filter: retained configurations and OAuth remain untouched.
    if(composite)projection={...projection,rows:projection.rows.filter(row=>options.product?.providerVisibility?.[row.target?.provider??row.origin?.provider]!==false)};
    const rows=[],omissions=[...projection.omissions],byId=new Map(),identities=new Map(),siblings=new Map();
    const maxRows=options.maxRows??Number.MAX_SAFE_INTEGER,maxOmissions=options.maxOmissions??Number.MAX_SAFE_INTEGER;
    if(!Number.isSafeInteger(maxRows)||maxRows<1||!Number.isSafeInteger(maxOmissions)||maxOmissions<1)
      throw new MenuSpecError('INVALID_CONFIG','Logical inspection budgets must be positive safe integers.');
    let droppedRows=0;
    function add({id,parentId=null,label='',role='branch',target=null,enabled=true,reason='STRUCTURE',origin={mode,provider:'cloudflare'},placement='',contexts=['image','link','video','audio'],visible=true,providerAction=null}) {
      if(composite&&role!=='separator') {
        const peers=siblings.get(parentId)??[];
        if(peers.some(p=>p.label===label))label+=' ['+stableId('label',placement+JSON.stringify(target)).slice(-6)+']';
      }
      const actionId=role==='provider-action'?stableId('provider-action',providerAction):target&&role==='save'?stableId('action',targetKey(target)):null;
      const identity=JSON.stringify([origin.mode,origin.provider,placement,parentId,role,actionId]);
      id??=stableId('item',identity);
      if(byId.has(id))throw new MenuSpecError('DUPLICATE_ITEM','Duplicate native item identity.');
      if(identities.has(id)&&identities.get(id)!==identity)throw new MenuSpecError('ID_COLLISION','Stable item identity collision.');
      if(actionId&&role==='save'&&identities.has(actionId)&&identities.get(actionId)!==targetKey(target))throw new MenuSpecError('ID_COLLISION','Stable action identity collision.');
      identities.set(id,identity);if(actionId)identities.set(actionId,role==='provider-action'?providerAction:targetKey(target));
      if(rows.length>=maxRows||parentId&&!byId.has(parentId)) {
        droppedRows++;omissions.push({target,itemId:id,parentId,reason:'ROW_LIMIT',kind:'budget'});return null;
      }
      const peers=siblings.get(parentId)??[];
      if(role!=='separator'&&peers.some(peer=>peer.role!=='separator'&&peer.label===label))throw new MenuSpecError('LABEL_COLLISION','Sibling menu labels collide; resolve explicitly before applying.');
      const setupProvider=options.providerSetupActions&&role==='save'&&target?.provider==='cloudflare'&&!enabled&&['SCOPE_UNAUTHORIZED','WORKER_UNVERIFIED'].includes(reason)?'cloudflare':null;
      if(setupProvider){enabled=true;label+=' · Set up';}
      const row={actionKind:setupProvider?'setup':role==='provider-action'?'provider':role==='save'?'save':role,...(setupProvider?{setupProvider}:{}),...(providerAction?{providerAction}:{}),id,itemId:id,parentId,siblingIndex:peers.length,index:peers.length,type:role==='separator'?'separator':'normal',label,contexts:[...contexts],enabled,visible,role,kind:['save','provider-action'].includes(role)?'action':role==='separator'?'separator':'menu',origin:{...origin},reason,actionId,target,intent:target&&role==='save'?intentFor(target):null};
      peers.push(row);siblings.set(parentId,peers);rows.push(row);byId.set(id,row);return id;
    }
    if(composite) {
      const placement=options.product?.placement??{}, quickTargets=new Set(), parents=new Map(), projected=new Map();
      const quick=projection.rows.filter(r=>r.sourceMode==='simple'&&r.quick);
      for(const row of quick){quickTargets.add(targetKey(row.target));add({...row,placement:'quick:'+row.placement,origin:{mode:'simple',provider:row.target.provider},reason:row.reason});}
      for(const [provider,label] of [['google-drive','Google Drive'],['dropbox','Dropbox'],['onedrive','OneDrive'],['cloudflare','Cloudflare R2']])if(options.product?.providerVisibility?.[provider]!==false)add({id:stableId('provider-entry',provider),label,role:'provider-action',providerAction:provider,target:provider==='cloudflare'?(options.defaultTarget??null):null,origin:{mode:null,provider},reason:provider==='cloudflare'?'PROVIDER_ACTION':'PROVIDER_NOT_IMPLEMENTED'});
      const defaultTarget=options.defaultTarget&&(options.product?.menuCustomized!==false||show.flat||projection.rows.length)?normalizeTarget(options.defaultTarget):null;
      if(show.flat) {
        if(defaultTarget&&defaultTarget.provider==='cloudflare'&&options.product?.providerVisibility?.cloudflare!==false) {
          const c=findCandidate(inventory,defaultTarget),reasons=availabilityReasons(c.scope,c.folder);
          add({label:'REDOWN → Cloudflare',role:'save',target:defaultTarget,enabled:!reasons.length,reason:reasons[0]??'DEFAULT_DIRECT_SAVE',placement:'flat-default'});
          for(const reason of reasons)omissions.push({target:defaultTarget,reason,kind:'ineligible'});
        } else omissions.push({reason:'DEFAULT_LOCATION_REQUIRED',kind:'ineligible'});
      } else {
        const providers=[...new Set(projection.rows.map(r=>r.target.provider).concat(defaultTarget&&options.product?.providerVisibility?.[defaultTarget.provider]!==false?[defaultTarget.provider]:[]))];
        const needsOther=providers.some(p=>placement[p]==='other');
        // Quick entries precede direct providers; the optional extra parent comes last.
        let other=null;
        for(const p of providers.filter(p=>placement[p]!=='other'))parents.set(p,add({label:p==='cloudflare'?'Cloudflare':p,placement:'provider:'+p,origin:{mode:null,provider:p}}));
        if(needsOther)other=add({label:'Other Clouds',placement:'other',origin:{mode:null,provider:null}});
        for(const p of providers.filter(p=>placement[p]==='other'))parents.set(p,add({parentId:other,label:p==='cloudflare'?'Cloudflare':p,placement:'provider:'+p,origin:{mode:null,provider:p}}));
        const placements=new Map();
        for(const row of projection.rows) {
          const parentId=row.parentPlacement===null?parents.get(row.target.provider):placements.get(row.sourceMode+':'+row.parentPlacement);
          if(parentId===undefined)throw new MenuSpecError('INVALID_MENU_PARENT','Projection lost its parent.');
          if(row.role==='save'&&quickTargets.has(targetKey(row.target)))continue;
          const key=JSON.stringify([parentId,row.role,targetKey(row.target)]);
          let id=projected.get(key);
          if(!id){id=add({...row,parentId,placement:row.sourceMode+':'+row.placement,origin:{mode:row.sourceMode,provider:row.target.provider}});projected.set(key,id);}
          placements.set(row.sourceMode+':'+row.placement,id);
        }
        if(defaultTarget&&options.product?.providerVisibility?.[defaultTarget.provider]!==false&&!quickTargets.has(targetKey(defaultTarget))&&!projection.rows.some(r=>r.role==='save'&&targetKey(r.target)===targetKey(defaultTarget))) {
          const c=findCandidate(inventory,defaultTarget),reasons=availabilityReasons(c.scope,c.folder);
          add({parentId:parents.get(defaultTarget.provider),label:'Default Location',role:'save',target:defaultTarget,enabled:!reasons.length,reason:reasons[0]??'DEFAULT_HOME_SAVE',placement:'default'});
        }
      }
      for(const peer of options.flatProviders??[])if(options.product?.providerVisibility?.[peer.target?.provider]!==false)add({id:peer.id,label:peer.label,role:'save',target:normalizeTarget(peer.target),enabled:peer.enabled===true,placement:'flat:'+peer.id,origin:{mode:null,provider:peer.target.provider}});
    } else {
    const root=add({id:'c2c:root',label:'REDOWN',origin:{mode:null,provider:null}});
    const defaultTarget=options.defaultTarget?normalizeTarget(options.defaultTarget):null;
    const defaultCandidate=defaultTarget?findCandidate(inventory,defaultTarget):null;
    const defaultReasons=defaultCandidate?availabilityReasons(defaultCandidate.scope,defaultCandidate.folder):[];
    const defaultAvailability=defaultReasons[0];
    for(const reason of defaultReasons)omissions.push({target:defaultTarget,reason,kind:'ineligible',placement:'default'});
    // A single verified default is a native direct leaf. With extras Home is the final save action.
    const extraActions=projection.rows.some(r=>r.target.provider==='cloudflare'&&r.role==='save'&&(!defaultTarget||targetKey(r.target)!==targetKey(defaultTarget)));
    const direct=defaultTarget&&!extraActions;
    const cloud=add({id:'c2c:cloudflare',parentId:root,label:'Cloudflare R2',role:direct?'save':'branch',target:direct?defaultTarget:null,enabled:!direct||!defaultAvailability,reason:direct?(defaultAvailability??'DEFAULT_DIRECT_SAVE'):'PROVIDER_BRANCH',origin:{mode,provider:'cloudflare'}});
    const providerParents=new Map([['cloudflare',cloud]]);
    // Native provider contributors retain their exact native ID when supplied, independently of R2 mode.
    for(const peer of [...options.flatProviders??[]].sort((a,b)=>compare(a.order??0,b.order??0)||compare(a.id,b.id))) {
      const target=normalizeTarget(peer.target);
      add({id:peer.nativeId??peer.id,parentId:root,label:peer.label,role:'save',target,enabled:peer.enabled!==false,reason:peer.enabled===false?'PROVIDER_UNAVAILABLE':'FLAT_PROVIDER',origin:{mode:null,provider:target.provider},placement:'flat:'+peer.id,contexts:peer.contexts??['image','link']});
    }
    for(const provider of [...new Set(projection.rows.map(r=>r.target.provider))].sort(compare))if(provider!=='cloudflare')
      providerParents.set(provider,add({id:stableId('provider',provider),parentId:root,label:options.providerLabels?.[provider]??provider,origin:{mode,provider},reason:'PROVIDER_BRANCH'}));
    {
      const placements=new Map();
      for(const row of projection.rows) {
        if(direct&&row.target.provider==='cloudflare') {omissions.push({target:row.target,reason:'DEFAULT_DIRECT_PLACEMENT',kind:'placement',placement:row.placement});continue;}
        // Top-level default leaf is represented by Home. Branch Save-here is a distinct intentional placement.
        if(defaultTarget&&row.role==='save'&&row.parentPlacement===null&&targetKey(row.target)===targetKey(defaultTarget)) {
          omissions.push({target:row.target,reason:'DEFAULT_HOME_PLACEMENT',kind:'placement',placement:row.placement});continue;
        }
        const parentId=row.parentPlacement===null?providerParents.get(row.target.provider):placements.get(row.parentPlacement);
        // Natural bucket roots disambiguate scopes; custom labels still require explicit collision resolution.
        const repeatedRoot=row.parentPlacement===null&&!row.target.prefix&&projection.rows.some(other=>other!==row&&other.parentPlacement===null&&!other.target.prefix&&other.target.provider===row.target.provider&&other.label===row.label);
        const label=repeatedRoot?row.label+' ['+row.target.connectionId+'/'+row.target.accountId+']':row.label;
        const id=add({...row,label,parentId:parentId??'missing-parent:'+row.parentPlacement,origin:{mode:row.mode??mode,provider:row.target.provider},placement:row.placement});
        if(id)placements.set(row.placement,id);
      }
      if(defaultTarget&&!direct) {
        add({parentId:cloud,role:'separator',placement:'default-separator',reason:'HOME_SEPARATOR'});
        add({parentId:cloud,label:'Home',role:'save',target:defaultTarget,enabled:!defaultAvailability,reason:defaultAvailability??'DEFAULT_HOME_SAVE',placement:'default-home'});
      }
    }
    }
    if(composite) {
      const needed=new Set(rows.filter(r=>['save','provider-action'].includes(r.role)).map(r=>r.id));
      for(let i=rows.length-1;i>=0;i--)if(needed.has(rows[i].id)&&rows[i].parentId)needed.add(rows[i].parentId);
      for(let i=rows.length-1;i>=0;i--)if(rows[i].role==='branch'&&!needed.has(rows[i].id))rows.splice(i,1);
      const indices=new Map();for(const r of rows){const n=indices.get(r.parentId)??0;r.siblingIndex=r.index=n;indices.set(r.parentId,n+1);}
    }
    const retained=omissions.slice(0,maxOmissions),omissionDropped=omissions.length-retained.length;
    const unavailable=omissions.some(x=>['ineligible','unknown-descendants','budget'].includes(x.kind));
    const coverage={rowsComplete:droppedRows===0,rowCount:rows.length,omissionsComplete:omissionDropped===0,omissionCount:omissions.length,omissionsRetained:retained.length,omissionsDropped:omissionDropped,rowsDropped:droppedRows,inventoryComplete:inventory.scopes.every(s=>s.complete&&!s.stale),unobservedDescendants:inventory.scopes.filter(s=>!s.complete).map(s=>({target:s.target,reason:'INVENTORY_INCOMPLETE'})),complete:droppedRows===0&&omissionDropped===0&&!unavailable&&inventory.scopes.every(s=>s.complete&&!s.stale)};
    const spec=freeze({schemaVersion:1,generation,revision,mode,modeRevision:projection.revision,inventoryRevision:inventory.revision,rows,nodes:rows,omissions:retained,coverage});
    emit(options,'menu.compile',coverage.complete?'ok':'partial',coverage.complete?'COMPILE_OK':'COMPILE_PARTIAL');
    return spec;
  } catch(error) {emit(options,'menu.compile','failed',error.code??'COMPILE_FAILED');throw error;}
}

/** Cursor is an offset scoped to the immutable generation; every supported depth remains pageable. */
export function inspectMenuTree(spec,{cursor=null,limit=100,parentId,recursive=true,includeOmissions=false}={}) {
  if(!Number.isSafeInteger(limit)||limit<1||limit>1000)throw new RangeError('Page limit must be between 1 and 1000.');
  const scope=JSON.stringify([parentId??null,recursive,includeOmissions]);
  let offset=0;
  if(cursor!==null) {
    const parsed=typeof cursor==='string'?JSON.parse(cursor):cursor;
    if(parsed.generation!==spec.generation||parsed.scope!==scope||!Number.isSafeInteger(parsed.offset)||parsed.offset<0)
      throw new MenuSpecError('STALE_CURSOR','Cursor belongs to a different immutable menu scope.');
    offset=parsed.offset;
  }
  let selected=spec.rows;
  if(parentId!==undefined) {
    const parents=new Set([parentId]);
    selected=spec.rows.filter(row=>{if(!parents.has(row.parentId))return false;if(recursive)parents.add(row.id);return true;});
  }
  const values=includeOmissions?[...selected.map(row=>({kind:'row',row})),...spec.omissions.map(omission=>({kind:'omission',omission}))]:selected;
  const items=values.slice(offset,offset+limit),next=offset+items.length;
  return freeze({schemaVersion:1,generation:spec.generation,items,total:values.length,nextCursor:next<values.length?JSON.stringify({generation:spec.generation,scope,offset:next}):null,pageComplete:next>=values.length,coverage:spec.coverage});
}

export function diffMenuSpecs(before,after) {
  const old=new Map((before?.rows??[]).map(r=>[r.id,r])),current=new Map(after.rows.map(r=>[r.id,r]));
  const changes=[];
  for(const [id,row] of old)if(!current.has(id))changes.push({type:'removed',itemId:id,owner:row.origin,before:row});
  for(const [id,row] of current) {
    const previous=old.get(id);
    if(!previous){changes.push({type:'added',itemId:id,owner:row.origin,after:row});continue;}
    for(const field of ['parentId','siblingIndex','label','type','enabled','visible','role','actionId','contexts','target','reason'])
      if(JSON.stringify(previous[field])!==JSON.stringify(row[field]))changes.push({type:field==='siblingIndex'?'reordered':field==='actionId'||field==='target'?'action-mismatch':'changed',itemId:id,field,owner:row.origin,before:previous[field],after:row[field]});
  }
  if(JSON.stringify(before?.coverage)!==JSON.stringify(after.coverage))changes.push({type:'coverage-changed',before:before?.coverage??null,after:after.coverage});
  return freeze({schemaVersion:1,fromGeneration:before?.generation??null,toGeneration:after.generation,changes,equivalent:changes.length===0});
}
