import {productState,fail,validateProduct} from './config.mjs';
import {normalizeTarget,targetKey,stableId,ancestors,scopeKey} from '../core/menu-identity.mjs';
import {validateModeConfig} from '../persistence/schema.mjs';
import {diffMenuSpecs,inspectMenuTree} from '../core/menu-spec.mjs';
const str={type:'string',minLength:1,maxLength:8192},num={type:'integer',minimum:0},bool={type:'boolean'};
const obj=(properties={},required=[])=>({type:'object',properties,required,additionalProperties:false});
const target=obj({provider:str,connectionId:str,accountId:str,bucketName:str,prefix:{type:'string',maxLength:2048}},['provider','connectionId','accountId','bucketName','prefix']);
const arr=items=>({type:'array',items,maxItems:4096});
const show=obj({simple:bool,nested:bool,depth:bool,flat:bool},['simple','nested','depth','flat']);
const level=obj({hidden:bool,label:str});
const change=obj({type:str,mode:{enum:['simple','nested','narrow']},id:str,target,label:{type:'string',maxLength:256},hidden:bool,quick:bool,order:num,
  levels:{type:'object',additionalProperties:level},show,theme:{enum:['dark','light']},view:{enum:['details','list']},connectionId:str,favorite:bool,provider:str,placement:{enum:['direct','other']},
  scopes:arr(obj({target,maxDepth:{type:'integer',minimum:1}},['target','maxDepth'])),signature:str,
  policy:obj({cadence:{enum:['weekly','daily']},simple:bool,nested:bool,location:{enum:['automatic','documents']},buckets:arr(obj({target,enabled:bool,depth:{type:'integer',minimum:1}},['target','enabled','depth']))},['cadence','simple','nested','location','buckets'])},['type']);
const changeFields={createDestination:['mode','target','label','levels'],updateDestination:['mode','id','label','levels','hidden','quick','order'],deleteDestinationConfig:['mode','id'],setShowInChrome:['show'],setDepthDisplayBuckets:['scopes'],makeDefault:['target'],setTheme:['theme'],setView:['view'],setFavorite:['connectionId','favorite'],setProviderPlacement:['provider','placement'],dismissOrganizationSuggestion:['signature'],updateRecoveryPolicy:['policy']};
change.oneOf=Object.entries(changeFields).map(([type,fields])=>({...obj({type:{enum:[type]},...Object.fromEntries(fields.map(k=>[k,change.properties[k]]))},['type',...(type==='createDestination'?['mode','target']:type==='updateDestination'?['mode','id']:fields)]),...(type==='updateDestination'?{minProperties:4}:{})}));
const definitions={
  describeCapabilities:['inspect',obj()],getConfiguration:['inspect',obj()],getEngineHealth:['inspect',obj()],getProviderConnections:['inspect',obj()],
  loginBegin:['auth',obj()],loginStatus:['inspect',obj()],loginCancel:['auth',obj()],disconnect:['auth',obj()],
  listAccounts:['inspect',obj()],listAuthorizedBuckets:['inspect',obj({accountId:str,cursor:str},['accountId'])],
  listFolders:['inspect',obj({source:target,cursor:str},['source'])],fileMetadata:['inspect',obj({source:target,key:str},['source','key'])],
  readFile:['inspect',obj({source:target,entry:obj({key:str,folder:bool},['key','folder'])},['source','entry'])],
  listDestinations:['inspect',obj({mode:{enum:['simple','nested','narrow']},cursor:str,limit:{type:'integer',minimum:1,maximum:20}})],
  inspectMenuTree:['inspect',obj({generation:num,cursor:str,limit:{type:'integer',minimum:1,maximum:1000},parentId:str,recursive:bool,includeOmissions:bool},['generation'])],previewNativeMenu:['inspect',obj()],inspectNativeACK:['inspect',obj()],getOrganizationSuggestion:['inspect',obj()],
  previewConfigChange:['configure',obj({changes:arr(change),expectedRevision:num},['changes','expectedRevision'])],
  commitConfigChange:['configure',obj({changes:arr(change),expectedRevision:num,idempotencyKey:str},['changes','expectedRevision','idempotencyKey'])],
  reconcileNativeMenu:['configure',obj({expectedGeneration:num},['expectedGeneration'])],
  chooseBackupLocation:['restore',obj()],inspectRecoveryCoverage:['inspect',obj({target},['target'])],runRecoveryPage:['restore',obj({target},['target'])],inspectBackupRoots:['inspect',obj()],listRecoveryPolicies:['inspect',obj()],writeRecovery:['restore',obj()],
  requestRestorePreview:['restore',obj()],restoreRightClickMenu:['restore',obj({expectedRevision:num,idempotencyKey:str},['expectedRevision','idempotencyKey'])],
  inspectWholeCloudJobs:['inspect',obj()],enableWholeCloudJob:['configure',obj({identity:obj({provider:str,connectionId:str,accountId:str},['provider','connectionId','accountId']),cadence:{enum:['weekly','daily']}},['identity'])],
  disableWholeCloudJob:['configure',obj({identity:obj({provider:str,connectionId:str,accountId:str},['provider','connectionId','accountId'])},['identity'])],
  dispatchSave:['execute',obj({itemId:str,generation:num,context:{enum:['image','link']},source:obj({url:str,filename:str,bytes:{type:'array',items:{type:'integer',minimum:0,maximum:255},maxItems:33554432},contentType:str},['filename']),idempotencyKey:str},['itemId','generation','source','idempotencyKey'])]
};
export const toolRegistry=Object.freeze(Object.entries(definitions).map(([name,[scope,inputSchema]])=>Object.freeze({name,scope,version:'3+1.1',inputSchema,effectful:!['inspect'].includes(scope),transport:'trusted-local',outputSchema:obj({version:str,state:str,code:str,data:{},receipt:{}},['version','state','code'])})));
export function validate(schema,value) {
  if(schema.oneOf){let matches=0;for(const variant of schema.oneOf)try{validate(variant,value);matches++;}catch{}if(matches!==1)fail('INVALID_REQUEST');}

  if(schema.enum&&!schema.enum.includes(value))fail('INVALID_REQUEST');
  if(schema.type==='object') {
    if(!value||typeof value!=='object'||Array.isArray(value))fail('INVALID_REQUEST');
    if(Object.keys(value).length<(schema.minProperties??0))fail('INVALID_REQUEST');
    for(const k of schema.required??[])if(!Object.hasOwn(value,k))fail('INVALID_REQUEST');
    for(const [k,v] of Object.entries(value)) {if(['__proto__','constructor','prototype'].includes(k))fail('INVALID_REQUEST');const sub=schema.properties?.[k]??schema.additionalProperties;if(!sub)fail('INVALID_REQUEST');if(sub!==true)validate(sub,v);}
  }
  if(schema.type==='array'){if(!Array.isArray(value)||value.length>(schema.maxItems??4096))fail('INVALID_REQUEST');for(const v of value)validate(schema.items,v);}
  if(schema.type==='string'&&(typeof value!=='string'||value.length<(schema.minLength??0)||value.length>(schema.maxLength??8192)||/[\x00-\x1f]/.test(value)))fail('INVALID_REQUEST');
  if(schema.type==='integer'&&(!Number.isSafeInteger(value)||value<(schema.minimum??0)||value>(schema.maximum??Number.MAX_SAFE_INTEGER)))fail('INVALID_REQUEST');
  if(schema.type==='boolean'&&typeof value!=='boolean')fail('INVALID_REQUEST');
}
function applyChanges(state,changes) {
  if(!changes.length||changes.length>64)fail('INVALID_CHANGE');
  const next=structuredClone(state),p=next.product;
  const allowed=changeFields;
  for(const c of changes) {
    if(!Object.hasOwn(allowed,c.type)||Object.keys(c).some(k=>k!=='type'&&!allowed[c.type].includes(k)))fail('INVALID_CHANGE');
    const m=c.mode==='narrow'?'nested':c.mode;
    if(c.type.endsWith('Destination')||c.type==='deleteDestinationConfig') {
      if(!['simple','nested'].includes(m))fail('INVALID_MODE');
      const all=next.configs[m].destinations;
      if(c.type==='createDestination') {
        const t=normalizeTarget(c.target),id=stableId('destination',m+targetKey(t));
        if(all.some(d=>targetKey(d.target)===targetKey(t)))fail('DESTINATION_EXISTS');
        all.push({id,target:t,order:all.length,...(c.label?{label:c.label}:{}),...(c.levels?{levels:c.levels}:{})});
      } else {
        const i=all.findIndex(d=>d.id===c.id);if(i<0)fail('DESTINATION_NOT_FOUND');
        if(c.type==='deleteDestinationConfig')all.splice(i,1);
        else {for(const k of ['label','levels','hidden','quick','order'])if(Object.hasOwn(c,k)){if(k==='label'&&!c[k])delete all[i].label;else all[i][k]=c[k];}}
      }
    } else if(c.type==='setShowInChrome')p.show=c.show;
    else if(c.type==='setDepthDisplayBuckets')next.configs.depth.scopes=c.scopes;
    else if(c.type==='makeDefault')p.defaultTarget=normalizeTarget(c.target);
    else if(c.type==='setTheme')p.theme=c.theme;
    else if(c.type==='setView')p.view=c.view;
    else if(c.type==='setFavorite'){p.favorites=p.favorites.filter(x=>x!==c.connectionId);if(c.favorite)p.favorites.push(c.connectionId);}
    else if(c.type==='setProviderPlacement')p.placement[c.provider]=c.placement;
    else if(c.type==='dismissOrganizationSuggestion')p.suggestionDismissed=c.signature;
    else if(c.type==='updateRecoveryPolicy')p.recovery=c.policy;
  }
  next.product=productState(p);
  for(const m of ['simple','nested','depth'])next.configs[m]=validateModeConfig(m,next.configs[m]);
  return next;
}
export function organizationSuggestion(spec,product) {
  const count=spec.rows.filter(r=>r.parentId===null&&r.role!=='separator').length;
  const signature=JSON.stringify([count,product.placement,spec.rows.filter(r=>r.parentId===null).map(r=>r.id)]);
  return {count,eligible:count>=7&&product.suggestionDismissed!==signature,signature};
}
/** Same source-owned API for GUI and separately granted local agents. No network listener. */
export function createEngineApi({engine,current,fileApi,oauth,getInventory,authorize,confirm=async()=>false,recovery,wholeCloud,recoveryCrawl}={}) {
  if(!engine||!current||typeof authorize!=='function')throw TypeError('Trusted owners required');
  let queue=Promise.resolve();
  const compile=async state=>engine.compile({mode:'composite',configs:state.configs,product:state.product,defaultTarget:state.product.defaultTarget,inventory:await getInventory()});
  async function reconcile(){return engine.apply(await compile(await current.read()));}
  async function invoke(request,actor) {
    const operationId=crypto.randomUUID();
    try {
      if(request?.version!=='3+1.1'||Object.keys(request).some(k=>!['version','method','params'].includes(k))||!Object.hasOwn(definitions,request.method))fail('VERSION_OR_METHOD_UNSUPPORTED');
      const {method}=request,params=request.params??{},[scope,schema]=definitions[method];validate(schema,params);
      if(await authorize({actor,scope,method,params})!==true)fail('PERMISSION_DENIED');
      const work=async()=>{
        let state=await current.read(),data,receipt;
        // Resolve IDs against the current authoritative state before account scoping.
        const bindings=[];
        for(const c of params.changes??[])if(c.id){const d=Object.values(state.configs).flatMap(c=>c.destinations??[]).find(d=>d.id===c.id);if(d)bindings.push(d.target);}
        if(params.itemId){const row=engine.getMenu(params.generation)?.rows.find(r=>r.id===params.itemId);if(row?.target)bindings.push(row.target);}
        if(await authorize({actor,scope,method,params,bindings})!==true)fail('PERMISSION_DENIED');
        if(method==='describeCapabilities')data={version:'3+1.1',tools:toolRegistry,publicEndpoint:false,destructiveRemoteOperations:false,sourceCaptureMaxBytes:33554432,idempotencyRetention:256};
        else if(method==='getConfiguration')data=state;
        else if(method==='getEngineHealth')data={revision:state.product.revision,generation:state.generation,native:engine.getEvidence().coverage,externalRecovery:await recovery.status()};
        else if(method==='getProviderConnections'||method==='loginStatus')data=await oauth.status();
        else if(['loginBegin','loginCancel','disconnect'].includes(method)) {
          if(await confirm({actor,method,params})!==true)fail('HUMAN_INTERACTION_REQUIRED');
          data=await oauth[{loginBegin:'connect',loginCancel:'cancel',disconnect:'disconnect'}[method]]();
        }
        else if(method==='listAccounts')data=await fileApi.run('accounts');
        else if(method==='listAuthorizedBuckets')data=await fileApi.run('buckets',params);
        else if(['listFolders','fileMetadata','readFile'].includes(method)) {
          const s=params.source;
          if(s.provider!=='cloudflare'||s.connectionId!=='cloudflare:'+s.accountId)fail('SCOPE_UNAUTHORIZED');
          const a=await oauth.status();if(a.state!=='CONNECTED'||!a.accounts.some(x=>x.id===s.accountId))fail('AUTH_REQUIRED');
          if(method==='readFile'&&(params.entry.folder||!params.entry.key.startsWith(s.prefix)))fail('SOURCE_SCOPE_MISMATCH');
          if(method==='readFile') {
            const chunks=[];let size=0;
            const result=await fileApi.run('readStream',{source:s,key:params.entry.key},{onChunk:chunk=>{size+=chunk.length;if(size>8*1024*1024)fail('PREVIEW_SIZE_LIMIT');chunks.push(chunk);}});
            const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
            data=result.state==='completed'?{state:'completed',data:{bytes:Array.from(bytes),key:params.entry.key}}:result;
          } else data=await fileApi.run({listFolders:'list',fileMetadata:'stat'}[method],params);
        }
        else if(method==='listDestinations') {
          const m=params.mode==='narrow'?'nested':params.mode??'simple',limit=params.limit??20;let offset=0;
          if(params.cursor){const c=JSON.parse(params.cursor);if(c.revision!==state.product.revision||c.mode!==m||!Number.isSafeInteger(c.offset)||c.offset<0)fail('STALE_CURSOR');offset=c.offset;}
          const rows=state.configs[m].destinations;data={items:rows.slice(offset,offset+limit),total:rows.length,nextCursor:offset+limit<rows.length?JSON.stringify({revision:state.product.revision,mode:m,offset:offset+limit}):null};
        }
        else if(method==='inspectMenuTree'){const spec=engine.getMenu(params.generation);if(!spec)fail('STALE_GENERATION');data=inspectMenuTree(spec,params);}
        else if(method==='previewNativeMenu')data=await compile(state);
        else if(method==='inspectNativeACK')data=engine.getEvidence();
        else if(method==='getOrganizationSuggestion')data=organizationSuggestion(await compile(state),state.product);
        else if(method==='previewConfigChange'||method==='commitConfigChange') {
          if(method==='previewConfigChange'&&params.expectedRevision!==state.product.revision)fail('REVISION_CONFLICT');
          const fingerprint=JSON.stringify(params),replay=method==='commitConfigChange'?await current.findRetry(actor+':'+params.idempotencyKey):null;
          if(replay&&replay.fingerprint!==fingerprint)fail('IDEMPOTENCY_CONFLICT');
          for(const c of replay?[]:params.changes)if(['createDestination','makeDefault'].includes(c.type)) {
            const t=normalizeTarget(c.target),inv=await getInventory(),scope=inv.scopes.find(s=>scopeKey(s.target??s)===scopeKey(t));
            if(!scope?.authorized||!['',...(scope.folders??[]).map(f=>typeof f==='string'?f:f.prefix??f.target?.prefix)].includes(t.prefix))fail('TARGET_NOT_DISCOVERED');
          }
          for(const c of replay?[]:params.changes)if(c.type==='setFavorite'&&c.favorite){const connection=await oauth.status();if(!connection.connections?.some(x=>x.connectionId===c.connectionId))fail('CONNECTION_UNKNOWN');}
          const next=replay?state:applyChanges(state,params.changes);
          if(await authorize({actor,scope,method,params,bindings:next.configs})!==true)fail('PERMISSION_DENIED');
          if(method==='previewConfigChange')data={configuration:next,diff:diffMenuSpecs(await compile(state),await compile(next))};
          else {
            if(params.changes.some(c=>c.type==='deleteDestinationConfig')&&await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');
            receipt=await current.commitProduct({...next,expectedRevision:params.expectedRevision,idempotencyKey:actor+':'+params.idempotencyKey,fingerprint:JSON.stringify(params)});
            const native=receipt.replayed?engine.getEvidence().lastOutcome??{state:'blocked',code:'NATIVE_ACK_UNAVAILABLE'}:await reconcile();let backup;
            if(receipt.replayed)backup={state:'NOT_REPEATED',code:'IDEMPOTENT_REPLAY'};else try{backup=await recovery.writeVerified(await current.read());}catch{backup={state:'BLOCKED',code:'EXTERNAL_RECOVERY_UNAVAILABLE'};}
            data={configuration:await current.read(),native,backup};
          }
        }
        else if(method==='reconcileNativeMenu'){if(params.expectedGeneration!==state.generation.desired)fail('GENERATION_CONFLICT');data=await reconcile();}
        else if(method==='chooseBackupLocation'){if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');data=await recovery.choose();}
        else if(method==='inspectRecoveryCoverage')data=await recoveryCrawl.inspect(params.target);
        else if(method==='runRecoveryPage'){const policy=state.product.recovery.buckets.find(b=>scopeKey(b.target)===scopeKey(params.target));if(!policy?.enabled)fail('RECOVERY_NOT_ENABLED');data=await recoveryCrawl.tick(policy,{cadence:state.product.recovery.cadence});}
        else if(method==='inspectBackupRoots')data=await recovery.status();
        else if(method==='listRecoveryPolicies')data=state.product.recovery;
        else if(method==='writeRecovery')data=await recovery.writeVerified(state);
        else if(method==='requestRestorePreview')data=await recovery.readVerified(state);
        else if(method==='restoreRightClickMenu') {
          if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');
          const restored=validateProduct(await recovery.readVerified(state));
          if(await authorize({actor,scope,method,params,bindings:restored})!==true)fail('PERMISSION_DENIED');
          receipt=await current.commitProduct({...restored,expectedRevision:params.expectedRevision,idempotencyKey:actor+':'+params.idempotencyKey,fingerprint:JSON.stringify(params)});
          data={configuration:await current.read(),native:await reconcile(),requiresReconnect:true};
        }
        else if(method==='inspectWholeCloudJobs'){const ids=await wholeCloud.list();data=await Promise.all(ids.map(x=>wholeCloud.inspect(x)));}
        else if(method==='enableWholeCloudJob'||method==='disableWholeCloudJob') {
          if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');
          data=method==='enableWholeCloudJob'?await wholeCloud.enable(params.identity,{cadence:params.cadence}):await wholeCloud.disable(params.identity);
        }
        else if(method==='dispatchSave') {
          if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');
          const reserved=await current.reserveOperation(actor+':'+params.idempotencyKey,Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(params)))),b=>b.toString(16).padStart(2,'0')).join(''));
          if(!reserved)fail('SAVE_RETRY_REQUIRES_INSPECTION');
          const source={...params.source,...(params.source.bytes?{bytes:new Uint8Array(params.source.bytes)}:{})};
          data=await engine.save({...params,source});
        }
        if(await authorize({actor,scope,method,params,result:data,phase:'response'})!==true)fail('PERMISSION_DENIED');
        const status=data?.native&&data.native.state!=='completed'?'partial':data?.state;
        return {version:'3+1.1',state:['failed','blocked','partial','uncertain','cancelled'].includes(status)?status:'completed',code:status==='partial'&&data?.native?data.native.code??'NATIVE_APPLY_INCOMPLETE':data?.code??'OK',data,receipt:{operationId,method,before:receipt?.before??state.product.revision,after:receipt?.after??state.product.revision,replayed:receipt?.replayed??false}};
      };
      // Auth must remain cancellable while a provider sign-in window is pending.
      if(['loginBegin','loginCancel','disconnect','loginStatus'].includes(request.method))return await work();
      const task=queue.then(work,work);queue=task.catch(()=>{});return await task;
    } catch(error){const code=/^[A-Z][A-Z0-9_]+$/.test(error?.code??error?.message)?error.code??error.message:'OPERATION_FAILED';return {version:'3+1.1',state:['PERMISSION_DENIED','AUTH_REQUIRED','HUMAN_INTERACTION_REQUIRED','EXTERNAL_RECOVERY_UNAVAILABLE'].includes(code)?'blocked':'failed',code,receipt:{operationId,method:request?.method??null}};}
  }
  return Object.freeze({invoke,tools:toolRegistry,reconcile});
}
