import {validateProduct} from './config.mjs';
import {describeExplorerContextMenu} from './explorer-context-menu.mjs';
import {describeCanonicalContextMenu} from './menu-view.mjs';
import {normalizeTarget,stableId,targetKey,freeze} from '../core/menu-identity.mjs';
import {inspectMenuTree,diffMenuSpecs} from '../core/menu-spec.mjs';
const fail=code=>{throw Object.assign(Error(code),{code});};
const copy=value=>structuredClone(value);
const targetFields=['provider','connectionId','accountId','bucketName','prefix'];
const definitions={
  describeCapabilities:['inspect',[]],getEngineHealth:['inspect',[]],getConfiguration:['inspect',[]],
  listDestinations:['inspect',['mode','cursor','limit']],inspectExplorerContextMenu:['inspect',['target']],previewContextMenu:['inspect',['context']],previewNativeMenu:['inspect',[]],inspectNativeACK:['inspect',[]],
  listRecoveryPolicies:['inspect',[]],inspectBackupRoots:['inspect',[]],inspectWholeCloudJobs:['inspect',['identity']],enableWholeCloudJob:['configure',['identity','cadence']],disableWholeCloudJob:['configure',['identity']],listAccounts:['inspect',[]],listAuthorizedBuckets:['inspect',['accountId','cursor']],listFolders:['inspect',['source','cursor']],
  previewConfigChange:['configure',['change','expectedRevision']],commitConfigChange:['configure',['previewId','expectedRevision','idempotencyKey']],
  reconcileNativeMenu:['configure',[]],requestRestorePreview:['restore',['recoveryPoint','expectedRevision']],
  restoreRightClickMenu:['restore',['previewId','expectedRevision','idempotencyKey']],dispatchSave:['execute',['itemId','generation','context','source','idempotencyKey']]
};
export const toolRegistry=freeze(Object.entries(definitions).map(([name,[scope,keys]])=>({name,version:1,scope,effectful:['commitConfigChange','restoreRightClickMenu','dispatchSave','reconcileNativeMenu'].includes(name),inputSchema:{type:'object',additionalProperties:false,required:({previewConfigChange:['change','expectedRevision'],commitConfigChange:['previewId','expectedRevision','idempotencyKey'],requestRestorePreview:['recoveryPoint','expectedRevision'],restoreRightClickMenu:['previewId','expectedRevision','idempotencyKey'],listAuthorizedBuckets:['accountId'],listFolders:['source'],inspectExplorerContextMenu:['target'],dispatchSave:['itemId','generation','context','source','idempotencyKey'],enableWholeCloudJob:['identity'],disableWholeCloudJob:['identity'],inspectWholeCloudJobs:['identity']}[name]??[]),properties:Object.fromEntries(keys.map(key=>[key,{...(key==='expectedRevision'||key==='generation'||key==='limit'?{type:'integer',minimum:0}:['change','source','recoveryPoint','identity','target'].includes(key)?{type:'object'}:{type:'string'})}]))}})));
/** Trusted, in-process API. Host authorization is mandatory even for reads. No network listener. */
export function createEngineApi({engine,current,fileApi,getInventory=async()=>({scopes:[]}),authorize,confirm=async()=>false,recovery,wholeCloud,clock=Date.now}={}) {
  if(typeof authorize!=='function'||!engine||!current)throw TypeError('Trusted engine, CURRENT and authorizer required');
  let queue=Promise.resolve();const previews=new Map(),replays=new Map();
  let cachedInventory={scopes:[]};
  const compile=async (product,{localOnly=false}={})=>engine.compileComposite({product,inventory:localOnly?cachedInventory:(cachedInventory=await getInventory()),generation:(await current.read()).generation.desired+1});
  async function synchronize(options) {return engine.apply(await compile(await current.readProduct(),options));}
  function validate(request) {
    if(!request||request.version!==1||!Object.hasOwn(definitions,request.method))fail('UNSUPPORTED_METHOD_OR_VERSION');
    if(Object.keys(request).some(k=>!['version','method','params'].includes(k)))fail('INVALID_REQUEST');
    const params=request.params??{},keys=definitions[request.method][1];
    if(!params||typeof params!=='object'||Array.isArray(params)||Object.keys(params).some(k=>!keys.includes(k)))fail('INVALID_REQUEST');
    const schema=toolRegistry.find(t=>t.name===request.method).inputSchema;
    for(const key of schema.required)if(!(key in params))fail('INVALID_REQUEST');
    for(const [key,value] of Object.entries(params)){const type=schema.properties[key].type;if(type==='object'&&(!value||typeof value!=='object'||Array.isArray(value))||type==='string'&&(typeof value!=='string'||value.length>65536)||type==='integer'&&!Number.isSafeInteger(value))fail('INVALID_REQUEST');}
    for(const key of ['expectedRevision','generation'])if(key in params&&(!Number.isSafeInteger(params[key])||params[key]<0))fail('INVALID_REQUEST');
    return params;
  }
  function changeConfig(product,change) {
    if(change?.target&&Object.keys(change.target).some(k=>!targetFields.includes(k)))fail('INVALID_TARGET');
    if(!change||typeof change!=='object')fail('INVALID_CHANGE');
    if(change.type==='batch'){if(Object.keys(change).some(k=>!['type','changes'].includes(k))||!Array.isArray(change.changes)||change.changes.length<1||change.changes.length>16||change.changes.some(c=>c.type==='batch'))fail('INVALID_CHANGE');return change.changes.reduce(changeConfig,product);}
    const next=copy(product),mode=change.mode==='narrow'?'nested':change.mode;
    const allowed={createDestination:['type','mode','target','label','aliases'],updateDestination:['type','mode','id','label','aliases'],deleteDestinationConfig:['type','mode','id'],setShowInChrome:['type','show'],setFlatDefault:['type','target'],setDepthDisplayBuckets:['type','scopes'],updateRecoveryPolicy:['type','policy']};
    if(!Object.hasOwn(allowed,change.type)||Object.keys(change).some(k=>!allowed[change.type].includes(k)))fail('INVALID_CHANGE');
    if(['createDestination','updateDestination','deleteDestinationConfig'].includes(change.type)) {
      if(!['simple','nested'].includes(mode))fail('INVALID_MODE');
      const config=next.configs[mode];
      if(change.type==='createDestination') {
        const target=normalizeTarget(change.target),id=stableId('destination',mode+targetKey(target));
        if(config.destinations.some(x=>x.id===id))fail('DESTINATION_EXISTS');
        config.destinations.push({id,target,...(change.aliases?{aliases:change.aliases}:{}),...(change.label?{label:change.label}:{})});
      } else {
        const i=config.destinations.findIndex(x=>x.id===change.id);if(i<0)fail('DESTINATION_NOT_FOUND');
        if(change.type==='deleteDestinationConfig')config.destinations.splice(i,1);
        else {if(change.aliases)config.destinations[i].aliases=change.aliases;if(change.label)config.destinations[i].label=change.label;else delete config.destinations[i].label;}
      }config.revision++;
    } else if(change.type==='setShowInChrome') {
      const show=change.show;
      if(!show||Object.keys(show).some(k=>!['simple','narrow','depth','flat'].includes(k))||Object.values(show).some(v=>typeof v!=='boolean'))fail('INVALID_SHOW');
      if(show.flat===true) {if(!next.show.flat)next.previousShow={simple:next.show.simple,narrow:next.show.narrow,depth:next.show.depth};next.show={...next.show,flat:true};}
      else {next.show={...(next.show.flat?next.previousShow:next.show),flat:false,...show};next.previousShow={simple:next.show.simple,narrow:next.show.narrow,depth:next.show.depth};}
    } else if(change.type==='setFlatDefault')next.flatDefault=normalizeTarget(change.target);
    else if(change.type==='updateRecoveryPolicy')next.recoveryPolicy=change.policy;
    else {next.configs.depth.scopes=change.scopes;next.configs.depth.revision++;}
    return validateProduct(next);
  }
  async function invoke(request,actor) {
    const params=validate(request),method=request.method,scope=definitions[method][0];
    if(await authorize({actor,scope,method,params})!==true)fail('PERMISSION_DENIED');
    const work=async()=>{
      const product=await current.readProduct();
      switch(method) {
        case 'describeCapabilities':return {version:1,tools:toolRegistry,destructive:false,publicEndpoint:false};
        case 'getEngineHealth':return {version:1,revision:product.revision,native:engine.getEvidence().coverage,externalRecovery:recovery?.status?await recovery.status():recovery?'AVAILABLE':'BLOCKED',providers:fileApi?'AVAILABLE':'BLOCKED'};
        case 'getConfiguration':return copy(product);
        case 'listRecoveryPolicies':return copy(product.recoveryPolicy);
        case 'inspectBackupRoots':return {state:recovery?.status?await recovery.status():recovery?'AVAILABLE':'BLOCKED'};
        case 'inspectWholeCloudJobs':if(!wholeCloud)fail('EXTERNAL_RECOVERY_UNAVAILABLE');return wholeCloud.inspect(params.identity);
        case 'enableWholeCloudJob':case 'disableWholeCloudJob':if(!wholeCloud)fail('EXTERNAL_RECOVERY_UNAVAILABLE');if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');return method==='enableWholeCloudJob'?wholeCloud.enable(params.identity,{cadence:params.cadence}):wholeCloud.disable(params.identity);
        case 'listDestinations': {
          const mode=params.mode==='narrow'?'nested':params.mode??'simple';if(!['simple','nested'].includes(mode))fail('INVALID_MODE');
          const limit=params.limit??20;if(!Number.isSafeInteger(limit)||limit<1||limit>100)fail('INVALID_LIMIT');
          let offset=0;if(params.cursor){let c;try{c=JSON.parse(params.cursor);}catch{fail('INVALID_CURSOR');}if(c.revision!==product.revision||c.mode!==mode||!Number.isSafeInteger(c.offset)||c.offset<0)fail('STALE_CURSOR');offset=c.offset;}
          const all=product.configs[mode].destinations,items=all.slice(offset,offset+limit);
          return {items,total:all.length,nextCursor:offset+limit<all.length?JSON.stringify({revision:product.revision,mode,offset:offset+limit}):null};
        }
        case 'inspectExplorerContextMenu':return describeExplorerContextMenu(params.target);
        case 'previewContextMenu': {
          const evidence=engine.getEvidence(),acknowledged=evidence.acknowledgedGeneration;
          const installed=acknowledged!==null&&evidence.pending===0&&evidence.desired?.generation===acknowledged?engine.getMenu(acknowledged):null;
          const spec=installed??await compile(product);
          return describeCanonicalContextMenu(spec,{context:params.context??'link',nativeAcknowledged:!!installed});
        }
        case 'previewNativeMenu':return inspectMenuTree(await compile(product),{limit:1000,includeOmissions:true});
        case 'inspectNativeACK':return engine.getEvidence();
        case 'listAccounts':case 'listAuthorizedBuckets':case 'listFolders': {
          if(!fileApi)fail('PROVIDER_UNAVAILABLE');
          const r=await fileApi.run({listAccounts:'accounts',listAuthorizedBuckets:'buckets',listFolders:'list'}[method],params);
          return r.state==='completed'?r:{state:r.state,code:r.code??'PROVIDER_READ_FAILED'};
        }
        case 'previewConfigChange':case 'requestRestorePreview': {
          if(params.expectedRevision!==product.revision)fail('REVISION_CONFLICT');
          let next;
          if(method==='requestRestorePreview') {if(!recovery)fail('EXTERNAL_RECOVERY_UNAVAILABLE');next=validateProduct(await recovery.readVerified(params.recoveryPoint));}
          else next=changeConfig(product,params.change);
          const localOnly=method==='requestRestorePreview';const before=await compile(product,{localOnly}),after=await compile(next,{localOnly}),id=crypto.randomUUID();
          previews.set(id,{actor,method,next,revision:product.revision,expires:clock()+300000});
          while(previews.size>64)previews.delete(previews.keys().next().value);
          return {previewId:id,expectedRevision:product.revision,diff:diffMenuSpecs(before,after),configuration:copy(next),requiresConfirmation:true};
        }
        case 'commitConfigChange':case 'restoreRightClickMenu': {
          if(typeof params.idempotencyKey!=='string'||params.idempotencyKey.length<8||params.idempotencyKey.length>128)fail('IDEMPOTENCY_KEY_REQUIRED');
          const key=JSON.stringify([actor,method,params.idempotencyKey]);const replay=replays.get(key);
          if(replay){if(replay.previewId!==params.previewId)fail('IDEMPOTENCY_CONFLICT');return replay.result;}
          const p=previews.get(params.previewId);
          if(!p||p.actor!==actor||p.expires<clock()||p.method!==(method==='restoreRightClickMenu'?'requestRestorePreview':'previewConfigChange'))fail('PREVIEW_INVALID');
          if(p.revision!==product.revision||params.expectedRevision!==product.revision)fail('REVISION_CONFLICT');
          if(await confirm({actor,method,previewId:params.previewId,configuration:p.next})!==true)fail('CONFIRMATION_REQUIRED');
          const committed=await current.commitProduct(p.next,{expectedRevision:product.revision});previews.delete(params.previewId);
          const native=await synchronize({localOnly:method==='restoreRightClickMenu'});
          let backup={state:'BLOCKED',code:'EXTERNAL_RECOVERY_UNAVAILABLE'};
          if(recovery)try{backup=await recovery.writeVerified(committed);}catch{backup={state:'FAILED',code:'EXTERNAL_BACKUP_FAILED'};}
          const result={version:1,revision:committed.revision,native,backup};replays.set(key,{previewId:params.previewId,result});while(replays.size>128)replays.delete(replays.keys().next().value);return result;
        }
        case 'reconcileNativeMenu':return synchronize();
        case 'dispatchSave': {
          if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');
          if(typeof params.idempotencyKey!=='string'||params.idempotencyKey.length<8)fail('IDEMPOTENCY_KEY_REQUIRED');
          const key=JSON.stringify([actor,method,params.idempotencyKey]);if(replays.has(key))fail('SAVE_REPLAY_BLOCKED');
          replays.set(key,{started:true});return engine.save(params);
        }
      }
    };
    // One transaction owner serializes all clients, including preview/commit fences.
    const result=queue.then(work,work);queue=result.catch(()=>{});const value=await result;
    if((scope==='inspect'||method==='previewConfigChange'||method==='requestRestorePreview')&&await authorize({actor,scope,method,params,result:value,phase:'response'})!==true)fail('PERMISSION_DENIED');
    return value;
  }
  return Object.freeze({invoke,tools:toolRegistry});
}
