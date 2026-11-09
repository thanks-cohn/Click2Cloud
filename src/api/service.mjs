import {createAgentDebugApi} from '../glaciaring/agent-api.mjs';
import {describeReliability} from '../glaciaring/reliability.mjs';
import {supportReport} from '../glaciaring/support-report.mjs';
import {operationIdentity,observe} from '../core/boundary-observation.mjs';
import {REASON_CODES} from '../glaciaring/catalog.mjs';
import {fileOperationTarget} from '../cloudflare/file-transport.mjs';
import {digest,remoteDestination} from '../cloudflare/wire.mjs';
import {safeWorkerDiagnostic} from '../cloudflare/deployment.mjs';
import {BUILD_INFO} from '../build-info.mjs';
import {describeExplorerContextMenu} from './explorer-context-menu.mjs';
import {describeCanonicalContextMenu} from './menu-view.mjs';
import {productState,fail,validateProduct,CONFIG_CHANGE_FIELDS,applyConfigChanges} from './config.mjs';
import {normalizeTarget,targetKey,stableId,ancestors,scopeKey} from '../core/menu-identity.mjs';
import {validateModeConfig} from '../persistence/schema.mjs';
import {diffMenuSpecs,inspectMenuTree} from '../core/menu-spec.mjs';
const str={type:'string',minLength:1,maxLength:8192},num={type:'integer',minimum:0},bool={type:'boolean'};
const obj=(properties={},required=[])=>({type:'object',properties,required,additionalProperties:false});
const target=obj({provider:str,connectionId:str,accountId:str,bucketName:str,prefix:{type:'string',maxLength:2048}},['provider','connectionId','accountId','bucketName','prefix']);
const arr=items=>({type:'array',items,maxItems:Number.MAX_SAFE_INTEGER});
const show=obj({simple:bool,nested:bool,depth:bool,flat:bool},['simple','nested','depth','flat']);
const level=obj({hidden:bool,label:str});
const change=obj({type:str,mode:{enum:['simple','nested','narrow']},id:str,target,label:{type:'string',maxLength:256},hidden:bool,quick:bool,order:num,
  visibilityMode:{enum:['all','hide-all','custom']},levels:{type:'object',additionalProperties:level},show,theme:{enum:['dark','light']},view:{enum:['details','list','grid']},explorerLayout:obj({split:{type:'number',minimum:0,maximum:100},toolbarRows:{type:'integer',minimum:1,maximum:7}},['split','toolbarRows']),connectionId:str,favorite:bool,provider:str,visible:bool,placement:{enum:['direct','other']},
  scopes:arr(obj({target,hidden:bool,maxDepth:{type:'integer',minimum:1}},['target','maxDepth'])),signature:str,
  policy:obj({cadence:{enum:['weekly','daily']},simple:bool,nested:bool,location:{enum:['automatic','documents']},buckets:arr(obj({target,enabled:bool,depth:{type:'integer',minimum:1}},['target','enabled','depth']))},['cadence','simple','nested','location','buckets'])},['type']);
const changeFields=CONFIG_CHANGE_FIELDS;
change.oneOf=Object.entries(changeFields).map(([type,fields])=>({...obj({type:{enum:[type]},...Object.fromEntries(fields.map(k=>[k,change.properties[k]]))},['type',...(type==='createDestination'?['mode','target']:type==='updateDestination'?['mode','id']:fields)]),...(type==='updateDestination'?{minProperties:4}:{})}));
const rebuild=obj({accountId:str,changes:arr(change),acknowledgeUnknown:{enum:[true]}},['accountId','changes','acknowledgeUnknown']);
const definitions={
  initializeCloudflare:['provision',obj({resume:bool})],inspectShelfAttention:['inspect',obj()],openCloudflareDestinations:['configure',obj()],inspectCloudflare:['inspect',obj()],checkCloudflareR2:['inspect',obj({accountId:str,target})],selectCloudflareAccount:['configure',obj({accountId:str},['accountId'])],openCloudflareActivation:['configure',obj({accountId:str},['accountId'])],
  approveCloudflareSetup:['provision',obj({accountId:str,expectedRevision:num,idempotencyKey:str},['accountId','expectedRevision','idempotencyKey'])],repairCloudflareDestination:['provision',obj({accountId:str,target,expectedRevision:num,idempotencyKey:str},['accountId','expectedRevision','idempotencyKey'])],
  invokeProviderAction:['execute',obj({provider:{enum:['cloudflare','google-drive','dropbox','onedrive']},generation:num,source:obj({url:str,filename:str,responseFilename:bool},['url','filename']),idempotencyKey:str},['provider','idempotencyKey'])],
  inspectRemoteHistory:['inspect',obj({cursor:str,limit:{type:'integer',minimum:1,maximum:100}})],inspectRemoteReceipt:['inspect',obj({operationId:str,target},['operationId'])],inspectCloudflareSetup:['inspect',obj({accountId:str,idempotencyKey:str},['accountId','idempotencyKey'])],cancelRemoteOperation:['execute',obj({target,operationId:str},['target','operationId'])],openRemoteResult:['inspect',obj({operationId:str},['operationId'])],refreshExplorer:['inspect',obj({source:target,cursor:str},['source'])],enterExplorer:['inspect',obj()],navigateExplorer:['inspect',obj({target},['target'])],readFileChunk:['inspect',obj({source:target,key:str,offset:num,etag:str,length:{type:'integer',minimum:1,maximum:65536}},['source','key','offset'])],
  inspectExplorerContextMenu:['inspect',obj({target,entry:obj({key:str,folder:bool,displayName:str},['key','folder']),hasClipboard:bool},['target'])],previewContextMenu:['inspect',obj({context:{enum:['image','link','page','selection','video','audio']}})],describeCapabilities:['inspect',obj({section:{enum:['reliability']}})],getConfiguration:['inspect',obj()],getEngineHealth:['inspect',obj({view:{enum:['health','trace','support']},operationId:num,cursor:str,limit:{type:'integer',minimum:1,maximum:128}})],getProviderConnections:['inspect',obj()],
  loginBegin:['auth',obj({verifyOnly:bool})],loginStatus:['inspect',obj()],loginCancel:['auth',obj()],disconnect:['auth',obj()],
  fileAction:['execute',obj({action:{enum:['mkdir','copy','move','rename','delete']},source:target,destination:target,entry:obj({key:str,folder:bool,displayName:str},['key','folder']),name:str,conflict:{enum:['keep','skip','replace']},idempotencyKey:str},['action','source','idempotencyKey'])],
  listAccounts:['inspect',obj()],listAuthorizedBuckets:['inspect',obj({accountId:str,cursor:str},['accountId'])],
  listFolders:['inspect',obj({source:target,cursor:str},['source'])],fileMetadata:['inspect',obj({source:target,key:str},['source','key'])],
  readFile:['inspect',obj({source:target,entry:obj({key:str,folder:bool},['key','folder'])},['source','entry'])],
  listDestinations:['inspect',obj({mode:{enum:['simple','nested','narrow','depth']},cursor:str,limit:{type:'integer',minimum:1,maximum:20}})],
  inspectMenuTree:['inspect',obj({generation:num,cursor:str,limit:{type:'integer',minimum:1,maximum:1000},parentId:str,recursive:bool,includeOmissions:bool},['generation'])],previewNativeMenu:['inspect',obj()],inspectNativeACK:['inspect',obj()],getOrganizationSuggestion:['inspect',obj()],
  previewConfigChange:['configure',obj({changes:arr(change),expectedRevision:num},['changes','expectedRevision'])],
  commitConfigChange:['configure',obj({changes:arr(change),expectedRevision:num,idempotencyKey:str},['changes','expectedRevision','idempotencyKey'])],
  reconcileNativeMenu:['configure',obj({expectedGeneration:num},['expectedGeneration'])],
  chooseBackupLocation:['restore',obj({purpose:{enum:['rebuild']}})],inspectRecoveryCoverage:['inspect',obj({target},['target'])],runRecoveryPage:['restore',obj({target},['target'])],inspectBackupRoots:['inspect',obj()],listRecoveryPolicies:['inspect',obj()],writeRecovery:['restore',obj()],
  requestRestorePreview:['restore',obj({rebuild})],restoreRightClickMenu:['restore',obj({expectedRevision:num,previewToken:str,idempotencyKey:str,rebuild},['previewToken','idempotencyKey'])],
  inspectWholeCloudJobs:['inspect',obj()],enableWholeCloudJob:['configure',obj({identity:obj({provider:str,connectionId:str,accountId:str},['provider','connectionId','accountId']),cadence:{enum:['weekly','daily']}},['identity'])],
  disableWholeCloudJob:['configure',obj({identity:obj({provider:str,connectionId:str,accountId:str},['provider','connectionId','accountId'])},['identity'])],
  dispatchExplorerSave:['execute',obj({itemId:str,generation:num,context:{enum:['image','link','video','audio','page']},source:target,entry:obj({key:str,folder:bool,displayName:str,contentType:str},['key','folder']),idempotencyKey:str},['itemId','generation','source','entry','idempotencyKey'])],
  dispatchSave:['execute',obj({itemId:str,generation:num,context:{enum:['image','link','video','audio','page']},source:obj({url:str,filename:str,bytes:{type:'array',items:{type:'integer',minimum:0,maximum:255},maxItems:Number.MAX_SAFE_INTEGER},contentType:str,responseFilename:bool},['filename']),idempotencyKey:str},['itemId','generation','source','idempotencyKey'])]
};
export const toolRegistry=Object.freeze(Object.entries(definitions).map(([name,[scope,inputSchema]])=>Object.freeze({name,scope,version:'3+1.1',inputSchema,effectful:!['inspect'].includes(scope)&&name!=='requestRestorePreview',transport:'trusted-local',outputSchema:obj({version:{enum:['3+1.1']},state:{enum:['completed','partial','blocked','failed','uncertain','cancelled']},code:str,data:{},diagnostic:{},receipt:{}},['version','state','code'])})));
export function validate(schema,value) {
  if(schema.oneOf){let matches=0;for(const variant of schema.oneOf)try{validate(variant,value);matches++;}catch{}if(matches!==1)fail('INVALID_REQUEST');}

  if(schema.enum&&!schema.enum.includes(value))fail('INVALID_REQUEST');
  if(schema.type==='object') {
    if(!value||typeof value!=='object'||Array.isArray(value))fail('INVALID_REQUEST');
    if(Object.keys(value).length<(schema.minProperties??0))fail('INVALID_REQUEST');
    for(const k of schema.required??[])if(!Object.hasOwn(value,k))fail('INVALID_REQUEST');
    for(const [k,v] of Object.entries(value)) {if(['__proto__','constructor','prototype'].includes(k))fail('INVALID_REQUEST');const sub=schema.properties?.[k]??schema.additionalProperties;if(!sub)fail('INVALID_REQUEST');if(sub!==true)validate(sub,v);}
  }
  if(schema.type==='array'){if(!Array.isArray(value)||value.length>(schema.maxItems??Number.MAX_SAFE_INTEGER))fail('INVALID_REQUEST');for(const v of value)validate(schema.items,v);}
  if(schema.type==='string'&&(typeof value!=='string'||value.length<(schema.minLength??0)||value.length>(schema.maxLength??8192)||/[\x00-\x1f]/.test(value)))fail('INVALID_REQUEST');
  if(schema.type==='integer'&&(!Number.isSafeInteger(value)||value<(schema.minimum??0)||value>(schema.maximum??Number.MAX_SAFE_INTEGER)))fail('INVALID_REQUEST');
  if(schema.type==='boolean'&&typeof value!=='boolean')fail('INVALID_REQUEST');
}

export function organizationSuggestion(spec,product) {
  const count=spec.rows.filter(r=>r.parentId===null&&r.role!=='separator').length;
  const signature=JSON.stringify([count,product.placement,spec.rows.filter(r=>r.parentId===null).map(r=>r.id)]);
  return {count,eligible:count>=7&&product.suggestionDismissed!==signature,signature};
}
/** Same source-owned API for GUI and separately granted local agents. No network listener. */
export function createEngineApi({engine,current,fileApi,oauth,getInventory,authorize,confirm=async()=>false,navigate=async()=>{},recovery,wholeCloud,recoveryCrawl,cloudflare,attention,diagnostics,breadcrumbs,readNative=async()=>null,readStorageHealth=async()=>({state:'UNOBSERVED'}),readState=context=>current.read(context)}={}) {
  if(!engine||!current||typeof authorize!=='function')throw TypeError('Trusted owners required');
  let queue=Promise.resolve(),traceInspector;
  async function loadCurrent(context){try{return await readState(context);}catch(error){const candidate=error.code??error.message,code=typeof candidate==='string'&&/^[A-Z][A-Z0-9_]{1,79}$/.test(candidate)?candidate:'STORAGE_UNAVAILABLE';throw Object.assign(Error(code),{code,diagnostic:{stage:'current-read',...(['CURRENT_STORE','BACKGROUND_NATIVE_FENCE'].includes(error.origin)?{origin:error.origin}:{}),...(['ESTABLISHED_BOUNDARY_MISSING','HISTORICAL_EVIDENCE_WITHOUT_CONFIGURATION','REQUIRED_RECORD_MISSING','GENERATION_RECORD_MISSING','NATIVE_GENERATION_WITH_ZERO_CURRENT'].includes(error.subreason)?{subreason:error.subreason}:{}),...(['AbortError','InvalidStateError','QuotaExceededError','SecurityError','VersionError','UnknownError'].includes(error.name)?{causeName:error.name}:{})}});}}
  const compile=async state=>engine.compile({mode:'composite',configs:state.configs,product:state.product,defaultTarget:state.product.defaultTarget,inventory:await getInventory()});
  async function reconcile(){return engine.apply(await compile(await current.read()));}
  async function restorePreview(){
    const local=await current.inspect(),evidence=await current.evidence();
    let present;if(local.database?.present!==false)try{present=await loadCurrent({observe:false});}catch{};
    let candidate,internal;try{internal=await current.readRecoveryCandidate?.();}catch{fail('RECOVERY_CONFLICT');}
    try{candidate=validateProduct(await recovery.readVerified(present));if(internal&&JSON.stringify(internal)!==JSON.stringify(candidate))fail('RECOVERY_CONFLICT');}catch(e){if(e.code==='RECOVERY_CONFLICT')throw e;if(internal)candidate=internal;else return {available:false,current:local,reason:/^[A-Z][A-Z0-9_]+$/.test(e.code??e.message)?e.code??e.message:'NO_VALID_RECOVERY_POINT',nativeSalvage:'PARTIAL_PROJECTION_ONLY_NOT_RESTORABLE'};}
    const map=Object.fromEntries(evidence.state.map(r=>[r.id,r.value]));
    if(!present)for(const [id,value] of [['product',candidate.product],...Object.entries(candidate.configs).map(([m,c])=>['mode:'+m,c])])if(Object.hasOwn(map,id)&&JSON.stringify(map[id])!==JSON.stringify(value))return {available:false,current:local,reason:'CONFIGURATION_CONFLICT',nativeSalvage:'PARTIAL_PROJECTION_ONLY_NOT_RESTORABLE'};
    if(!present)for(const row of evidence.journal){const value=row.kind==='product'?candidate.product:row.kind==='config'?candidate.configs[row.mode]:null;if(value&&row.current.revision>value.revision)return {available:false,current:local,reason:'RECOVERY_STALE'};}
    if(!present){
      const last=new Map();for(const row of evidence.journal)if(row.kind==='product'||row.kind==='config')last.set(row.kind==='product'?'product':row.mode,row.current);
      for(const row of evidence.checkpoints)if(row.config&&(!last.has(row.mode)||last.get(row.mode).revision<=row.config.revision))last.set(row.mode,row.config);
      for(const [key,value] of last){const proposed=key==='product'?candidate.product:candidate.configs[key];if(!proposed||value.revision>proposed.revision)return {available:false,current:local,reason:'RECOVERY_STALE'};if(value.revision===proposed.revision&&JSON.stringify(value)!==JSON.stringify(proposed))return {available:false,current:local,reason:'CONFIGURATION_CONFLICT'};}
    }
    // A backup older than retained durable evidence is not an exact recovery.
    const retainedRevision=Math.max(map.product?.revision??0,...evidence.journal.filter(r=>r.kind==='product').map(r=>r.current?.revision??0));
    if(candidate.product.revision<retainedRevision)return {available:false,current:local,reason:'RECOVERY_STALE'};
    return {available:true,...candidate,current:local,previewToken:await digest({candidate,evidence}),provenance:internal?'VALIDATED_COMPLETE_LOCAL_JOURNAL':'USER_AUTHORIZED_EXTERNAL_CHECKSUM_VERIFIED',requiresPreservation:true};
  }
  async function affectedConfigurationAccounts(native){
    const accounts=new Set();
    let prior;try{prior=await readState({observe:false});}catch(e){if(!['CONFIGURATION_RECORD_MISSING','CONFIGURATION_CORRUPT','CONFIGURATION_CONFLICT'].includes(e.code))throw e;}
    if(!prior)for(const row of native?.desired?.rows??[])if(typeof row.target?.accountId==='string')accounts.add(row.target.accountId);
    for(const t of [prior?.product?.defaultTarget,...Object.values(prior?.configs??{}).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(Boolean))accounts.add(t.accountId);
    return [...accounts].map(accountId=>({accountId}));
  }
  async function rebuildPreview(params,actor,activeMethod){
    const local=await current.inspect(),evidence=await current.evidence(),native=await readNative(),identity=await oauth.status();
    if(local.state!=='ESTABLISHED_MISSING'||evidence.journal.length||evidence.checkpoints.length||evidence.state.some(r=>['product','generation','configurationIntegrity','configurationProvenance'].includes(r.id)||r.id.startsWith('mode:')))return {available:false,current:local,reason:'REBUILD_REQUIRES_ABSENT_CONFIGURATION'};
    if(identity.state!=='CONNECTED'||!identity.accounts?.some(a=>a.id===params.accountId))fail('AUTH_REQUIRED');
    if(await authorize({actor,scope:'restore',method:activeMethod,params:{rebuild:params},bindings:await affectedConfigurationAccounts(native)})!==true)fail('PERMISSION_DENIED');
    const nativePartial=(native?.desired?.rows??[]).filter(r=>r.role==='save'&&r.target?.accountId===params.accountId&&r.target.provider==='cloudflare').flatMap(r=>{try{return [{target:normalizeTarget(r.target),label:typeof r.label==='string'?r.label.slice(0,256):''}];}catch{return [];}});
    if(!params.changes.length)return {available:false,current:local,reason:'OWNER_CHOICES_REQUIRED',nativePartial,unknown:['modes','hidden','Quick','Default','unprojected destinations','setup approval'],reconstruction:'NEW_OWNER_CHOICES_REQUIRED'};
    const allowed=new Set(['createDestination','updateDestination','setDepthDisplayBuckets','makeDefault','setShowInChrome','setProviderMenuVisibility','setProviderPlacement','setFavorite']);
    if(params.changes.some(c=>!allowed.has(c.type)))fail('REBUILD_CHANGE_DENIED');
    const candidate=applyConfigChanges({product:productState(),configs:Object.fromEntries(['simple','nested','depth'].map(m=>[m,validateModeConfig(m,{})]))},params.changes);
    for(const t of [candidate.product.defaultTarget,...Object.values(candidate.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(Boolean))if(t.provider!=='cloudflare'||t.accountId!==params.accountId||t.connectionId!=='cloudflare:'+params.accountId)fail('SCOPE_UNAUTHORIZED');
    if(!Object.values(candidate.configs).some(c=>(c.destinations??c.scopes??[]).length))fail('OWNER_CHOICES_REQUIRED');
    const proof=await recovery.verifyProfileCopy();if(proof?.state!=='VERIFIED'||proof.proofClass!=='PRIVATE_PROFILE_COPY_FILE_READBACK')fail('RECOVERY_PRESERVATION_REQUIRED');
    return {available:true,...candidate,current:local,nativePartial,provenance:'NEW_OWNER_CONFIRMED_CONFIGURATION',outcome:'REBUILT_WITH_OWNER_CONFIRMATION',profileCopy:{state:proof.state,proofClass:proof.proofClass,checksum:proof.checksum},previewToken:await digest({rebuild:params,candidate,evidence,native,proof}),unknown:['Original settings and physical deletion cause remain unknown'],requiresPreservation:true};
  }
  function nativeReadiness(readiness){
    const evidence=engine.getEvidence?.();
    if(readiness?.state!=='READY'||!evidence)return readiness;
    if(evidence.pending||evidence.acknowledgedGeneration==null||evidence.acknowledgedGeneration!==evidence.desired?.generation)return {...readiness,state:'NATIVE_APPLY_INCOMPLETE',code:'NATIVE_APPLY_INCOMPLETE'};
    const row=evidence.desired?.rows?.find(r=>r.role==='save'&&readiness.target&&r.target&&targetKey(r.target)===targetKey(readiness.target));
    return row&&!row.enabled?{...readiness,state:'REPAIR_REQUIRED',code:row.reason??'DESTINATION_NOT_READY'}:readiness;
  }
  async function finishInitialization(data){
    const native=await reconcile();if(data.state!=='completed')return {...data,native};
    if(native.state!=='completed')return {...data,native,state:'partial',code:'NATIVE_APPLY_INCOMPLETE'};
    const readiness=nativeReadiness({state:'READY',target:data.target});return {...data,native,...(readiness.state!=='READY'?{state:'blocked',code:readiness.code}:{})};
  }
  async function invoke(request,actor) {
    const operationId=crypto.randomUUID(),traceId=operationIdentity(),requestStarted=performance.now(),inspectOnly=['getEngineHealth','describeCapabilities','requestRestorePreview'].includes(request?.method);const traceMethodIndex=toolRegistry.findIndex(t=>t.name===request?.method)+1;const startSignal=inspectOnly?0:observe(diagnostics?.emit,'api.invoke','started','API_INVOKE_STARTED',{operationId:traceId},[],traceMethodIndex);
    try {
      if(request?.version!=='3+1.1'||Object.keys(request).some(k=>!['version','method','params'].includes(k))||!Object.hasOwn(definitions,request.method))fail('VERSION_OR_METHOD_UNSUPPORTED');
      const {method}=request,params=request.params??{},[scope,schema]=definitions[method];validate(schema,params);
      if(await authorize({actor,scope,method,params})!==true)fail('PERMISSION_DENIED');
      const work=async()=>{
        // Authentication and introspection do not depend on menu/configuration storage.
        const independent=['loginBegin','loginStatus','loginCancel','disconnect','getProviderConnections','describeCapabilities','inspectShelfAttention','getEngineHealth','requestRestorePreview','restoreRightClickMenu','inspectBackupRoots','chooseBackupLocation'].includes(method);
        let state=independent?null:await loadCurrent({operationId:traceId,requires:startSignal?[startSignal]:[]}),data,receipt;
        // Resolve IDs against the current authoritative state before account scoping.
        const bindings=[];
        if(method==='initializeCloudflare')bindings.push(...((await oauth.status()).accounts??[]).map(a=>({accountId:a.id})));
        if(['inspectRemoteReceipt','openRemoteResult'].includes(method)&&!params.target){const saved=await current.readRemoteResult?.(params.operationId);if(saved?.destination)bindings.push(saved.destination);}
        for(const c of params.changes??[])if(c.id){const d=Object.values(state.configs).flatMap(c=>c.destinations??[]).find(d=>d.id===c.id);if(d)bindings.push(d.target);}
        if(method==='invokeProviderAction'){
          const spec=params.generation===undefined?null:engine.getMenu(params.generation),row=spec?.rows.find(r=>r.id===stableId('provider-entry',params.provider)&&r.role==='save');
          const target=row?.target??(state.product.defaultTarget?.provider===params.provider?state.product.defaultTarget:null);if(target)bindings.push(target);
        }
        if((params.changes??[]).some(c=>c.type==='clearDefault')&&state.product.defaultTarget)bindings.push(state.product.defaultTarget);
        if(params.itemId){const row=engine.getMenu(params.generation)?.rows.find(r=>r.id===params.itemId);if(row?.target)bindings.push(row.target);}
        if(await authorize({actor,scope,method,params,bindings})!==true)fail('PERMISSION_DENIED');
        if(['initializeCloudflare','inspectCloudflare','checkCloudflareR2','selectCloudflareAccount','openCloudflareActivation','approveCloudflareSetup','repairCloudflareDestination','invokeProviderAction','inspectRemoteHistory','inspectRemoteReceipt'].includes(method)){
          if(!cloudflare)fail('CLOUDFLARE_HOST_UNAVAILABLE');
          if(['openCloudflareActivation','approveCloudflareSetup','repairCloudflareDestination','invokeProviderAction'].includes(method)&&await confirm({actor,scope,method,params})!==true)fail('CONFIRMATION_REQUIRED');
          if(method==='initializeCloudflare'){data=await finishInitialization(await cloudflare.initialize(params));}
          if(method==='inspectCloudflare'){data=await cloudflare.inspect();data.status=nativeReadiness(data.status);}
          if(method==='checkCloudflareR2')data=nativeReadiness(await cloudflare.check(params.accountId,params.target));
          if(method==='selectCloudflareAccount')data=await cloudflare.select(params.accountId);
          if(method==='openCloudflareActivation')data=await cloudflare.activation(params.accountId);
          if(method==='approveCloudflareSetup'||method==='repairCloudflareDestination'){data=await cloudflare.setup({...params,repair:method==='repairCloudflareDestination'});if(data.state==='completed')data=await finishInitialization(data);}
          if(method==='invokeProviderAction'){if(!await current.reserveOperation(actor+':provider:'+params.idempotencyKey,Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(params)))),b=>b.toString(16).padStart(2,'0')).join('')))fail('SAVE_RETRY_REQUIRES_INSPECTION');if(params.source){if(!Number.isSafeInteger(params.generation))fail('GENERATION_REQUIRED');const spec=engine.getMenu(params.generation),row=spec?.rows.find(r=>r.providerAction===params.provider||r.role==='save'&&r.id===stableId('provider-entry',params.provider)||r.role==='save'&&r.target?.provider===params.provider&&state.product.defaultTarget&&targetKey(r.target)===targetKey(state.product.defaultTarget));if(!row)fail('CANONICAL_ACTION_UNAVAILABLE');data=await engine.save({itemId:row.id,generation:params.generation,context:'link',source:params.source});}else data=await cloudflare.invoke(params);}
          if(method==='inspectRemoteHistory')data=await cloudflare.history(params);
          if(method==='inspectRemoteReceipt')data=await cloudflare.receipt(params);
        }
        else if(method==='inspectShelfAttention')data=await attention?.read()??null;
        else if(method==='openCloudflareDestinations'){if(!cloudflare)fail('CLOUDFLARE_HOST_UNAVAILABLE');data=await cloudflare.manage();}
        else if(method==='inspectCloudflareSetup')data=await cloudflare.setupStatus(params);
        else if(method==='cancelRemoteOperation'){if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');data=await cloudflare.cancel(params);}
        else if(method==='openRemoteResult'){const saved=await current.readRemoteResult(params.operationId);if(!saved?.receipt||saved.state!=='verified')fail('VERIFIED_RESULT_REQUIRED');const d=saved.receipt.destination??saved.destination;const checked=await fileApi.run('stat',{source:{accountId:d.accountId,bucketName:d.bucketName,prefix:d.prefix?d.prefix+'/':''},key:saved.receipt.key});if(checked.state!=='completed')fail('RESULT_LOOKUP_FAILED');const object=checked.data?.object;if(!object)fail('RESULT_NOT_FOUND');if(Number(object.size)!==saved.receipt.size||object.etag&&object.etag!==saved.receipt.etag)fail('RESULT_CHANGED');data={target:{provider:'cloudflare',connectionId:d.connectionId,accountId:d.accountId,bucketName:d.bucketName,prefix:d.prefix?d.prefix+'/':''},highlightKey:saved.receipt.key};}
        // One canonical startup decision for Shelf and trusted API. Never rewrites
        // Default or destinations. Only explicit navigateExplorer remembers user intent.
        else if(method==='enterExplorer'){
          const preferred=await current.readExplorerLocation?.()??null,a=await oauth.status();
          if(a.state!=='CONNECTED')data={state:'RECONNECT_REQUIRED',code:'AUTH_REQUIRED',preferred,accounts:[],buckets:[],target:null};
          else {
            const listed=await fileApi.run('accounts',{});if(listed.state!=='completed')fail(listed.code??'PROVIDER_READ_FAILED');
            const accounts=listed.data.accounts.filter(x=>a.accounts.some(y=>y.id===x.id)),valid=t=>t?.provider==='cloudflare'&&t.connectionId==='cloudflare:'+t.accountId&&accounts.some(x=>x.id===t.accountId);
            const candidates=[preferred,state.product.defaultTarget].filter(valid),byAccount=new Map();
            const bucketsFor=async accountId=>{if(byAccount.has(accountId))return byAccount.get(accountId);let cursor,buckets=[];do{const r=await fileApi.run('buckets',{accountId,...(cursor?{cursor}:{})});if(r.state!=='completed')fail(r.code??'PROVIDER_READ_FAILED');buckets.push(...r.data.buckets);cursor=r.data.cursor;}while(cursor);byAccount.set(accountId,buckets);return buckets;};
            let chosen;for(const t of candidates)if((await bucketsFor(t.accountId)).some(b=>b.name===t.bucketName)){chosen=t;break;}
            const accountId=chosen?.accountId??(accounts.some(x=>x.id===state.product.cloudflare.selectedAccountId)?state.product.cloudflare.selectedAccountId:null)??(accounts.length===1?accounts[0].id:null);
            if(!accountId)data={state:'CHOOSE_ACCOUNT',accounts,buckets:[],target:null,preferred};
            else {
              const buckets=await bucketsFor(accountId),bucket=chosen?.bucketName??buckets.find(b=>b.name==='redown')?.name??(buckets.length===1?buckets[0].name:null),t=chosen??(bucket?{provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName:bucket,prefix:''}:null);
              if(t){if(await authorize({actor,scope,method,params,bindings:t})!==true)fail('PERMISSION_DENIED');await navigate(t,actor);}
              data={state:t?'completed':'CHOOSE_BUCKET',accounts,accountId,buckets,target:t,preferred};
            }
          }
        }
        else if(method==='navigateExplorer'){const t=params.target,a=await oauth.status();if(t.provider!=='cloudflare'||t.connectionId!=='cloudflare:'+t.accountId||a.state!=='CONNECTED'||!a.accounts.some(x=>x.id===t.accountId))fail('SCOPE_UNAUTHORIZED');await current.writeExplorerLocation?.(t);await navigate(t,actor);data={state:'completed',target:t};}
        else if(method==='describeCapabilities'&&params.section==='reliability')data=describeReliability(toolRegistry,diagnostics?.manifest?.()??[],BUILD_INFO);
        else if(method==='describeCapabilities')data={version:'3+1.1',build:BUILD_INFO,tools:toolRegistry,publicEndpoint:false,destructiveRemoteOperations:fileApi?.capabilities?.includes('delete')===true,remoteInfrastructureChanges:'explicit-provision-scope-and-confirmation',cloudflareTransfer:'true-remote-only',sourceCaptureMaxBytes:null,browserTransfer:'streaming-adapter-or-resident-bytes',explorer:{operations:fileApi?.capabilities??[],mutations:fileApi?.capabilities?.includes('mkdir')===true},providers:{cloudflare:{implemented:true,transfer:'true-remote-only',explorerSource:false,localFile:false},'google-drive':{implemented:false},dropbox:{implemented:false},onedrive:{implemented:false}},idempotencyRetention:256};
        else if(method==='getConfiguration')data=state;
        else if(method==='getEngineHealth'){
          let configuration;try{configuration=await current.inspect?.();}catch{configuration={state:'UNKNOWN',code:'STORAGE_UNAVAILABLE'};}
          let storage;if(configuration?.database?.present===false)storage={state:configuration.state==='FRESH_VERIFIED'?'available':'blocked',...(configuration.state==='FRESH_VERIFIED'?{}:{code:'CONFIGURATION_RECORD_MISSING'})};
          else try{state=await loadCurrent({observe:false});storage={state:'available'};}catch(error){storage={state:'blocked',code:/^[A-Z][A-Z0-9_]{1,79}$/.test(error.code??'')?error.code:'CURRENT_READ_UNAVAILABLE'};}
          let externalRecovery;try{externalRecovery=await recovery?.status();}catch{externalRecovery={state:'BLOCKED',code:'EXTERNAL_RECOVERY_UNAVAILABLE'};}
          let storagePolicy;try{storagePolicy=await readStorageHealth();}catch{storagePolicy={state:'UNOBSERVED'};}
          const native=engine.getEvidence();data={revision:state?.product.revision??null,generation:state?.generation??null,storage,configuration,storagePolicy,origin:{extensionId:globalThis.chrome?.runtime?.id??null,schemaVersion:1},native:{coverage:native.coverage,desiredGeneration:native.desired?.generation??null,acknowledgedGeneration:native.acknowledgedGeneration??null,pending:native.pending??null},externalRecovery};
          if(params.view==='trace'||params.view==='support'){const snapshot=diagnostics?.snapshot({...(params.operationId!==undefined?{operationId:params.operationId}:{} )}),durable=await breadcrumbs?.inspect();if(params.view==='support')data=await supportReport({health:data,snapshot,breadcrumbs:durable,build:BUILD_INFO});else{if(diagnostics&&!traceInspector)traceInspector=createAgentDebugApi({diagnostics,build:BUILD_INFO.revision,authorize:async(_request,context)=>await authorize({actor:context.actor,scope:'inspect',method:'getEngineHealth',params:{view:'trace'},phase:'diagnostic'})===true?{debug:true}:false});const page=await traceInspector?.getDiagnosticSnapshot({version:1,...(params.operationId!==undefined?{operationId:params.operationId}:{}),...(params.cursor?{cursor:params.cursor}:{}),limit:params.limit??64},{actor});data={snapshot:page??null,breadcrumbs:durable??null,coverage:'PARTIAL',gaps:['PHYSICAL_CAUSE_UNKNOWN','UNLINKED_BOUNDARIES_MAY_REMAIN',...(!page?['TRACE_UNOBSERVED']:[])]};}}
        }
        else if(method==='getProviderConnections'||method==='loginStatus')data=await oauth.status();
        else if(['loginBegin','loginCancel','disconnect'].includes(method)) {
          if(await confirm({actor,method,params})!==true)fail('HUMAN_INTERACTION_REQUIRED');
          if(method==='loginBegin'&&params.verifyOnly){await oauth.authority();data=await oauth.status();}else data=await oauth[{loginBegin:'connect',loginCancel:'cancel',disconnect:'disconnect'}[method]]();
          // Explicit Login includes authorized save preparation. Authentication
          // stays successful even if local state or provider setup is blocked.
          if(method==='loginBegin'&&!params.verifyOnly&&data?.state==='CONNECTED'){
            let stage='configuration';const initializationId=crypto.randomUUID();
            try{
              await loadCurrent({operationId:traceId});
              stage='authorization';
              if(await authorize({actor,scope:'provision',method:'initializeCloudflare',params:{},bindings:(data.accounts??[]).map(a=>({accountId:a.id}))})!==true)fail('PERMISSION_DENIED');
              stage='cloudflare-initialization';
              if(!cloudflare)fail('CLOUDFLARE_HOST_UNAVAILABLE');
              const prepared=await cloudflare.initialize({authorizeSetup:true,resume:true});
              stage='native-registration';
              const initialization=prepared.state==='completed'?await finishInitialization(prepared):prepared;data={...data,initialization:{...initialization,operationId:initializationId,stage:initialization.stage??(initialization.native?.state&&initialization.native.state!=='completed'?'native-registration':prepared.state==='completed'?'ready':'cloudflare-initialization')}};
            }catch(error){
              const code=/^[A-Z][A-Z0-9_]{1,79}$/.test(error.code??'')?error.code:'INITIALIZATION_FAILED';
              data={...data,initialization:{state:'blocked',code,stage,operationId:initializationId,...(safeWorkerDiagnostic(error.diagnostic)?{diagnostic:safeWorkerDiagnostic(error.diagnostic)}:{})}};
            }
          }

        }
        else if(method==='fileAction'){
          const s=normalizeTarget(params.source),d=normalizeTarget(params.destination??s),a=await oauth.status();
          if([s,d].some(t=>t.provider!=='cloudflare'||t.connectionId!=='cloudflare:'+t.accountId||!a.accounts?.some(x=>x.id===t.accountId))||a.state!=='CONNECTED')fail('SCOPE_UNAUTHORIZED');
          if(params.action==='mkdir'?!params.name:!params.entry||!params.entry.key.startsWith(s.prefix))fail('SOURCE_SCOPE_MISMATCH');
          if(['rename'].includes(params.action)&&!params.name||['copy','move'].includes(params.action)&&!params.destination)fail('INVALID_REQUEST');
          if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');
          if(!await current.reserveOperation(actor+':files:'+params.idempotencyKey,await digest(params)))fail('FILE_RETRY_REQUIRES_INSPECTION');
          const input={source:s,...(params.destination?{destination:d}:{}),...(params.entry?{entry:params.entry,entries:[params.entry]}:{}),...(params.name?{name:params.name,newName:params.name}:{}),conflict:params.conflict??'keep'};
          const operationTarget=fileOperationTarget(s,d),destination=remoteDestination(operationTarget);
          await current.recordRemoteResult?.({kind:'file-action',operationId,state:'pending',code:'FILE_ACTION_PENDING',destination});
          data=await fileApi.run(params.action,input,{operationId});
          const r=data.data;await current.recordRemoteResult?.({kind:'file-action',operationId,state:data.state==='completed'&&r?.receipt?'verified':data.state,code:r?.code??data.code??'FILE_ACTION_RESULT',destination,receipt:r?.receipt});
        }
        else if(method==='listAccounts')data=await fileApi.run('accounts');
        else if(method==='listAuthorizedBuckets')data=await fileApi.run('buckets',params);
        else if(['listFolders','refreshExplorer','fileMetadata','readFile','readFileChunk'].includes(method)) {
          const s=params.source;
          if(s.provider!=='cloudflare'||s.connectionId!=='cloudflare:'+s.accountId)fail('SCOPE_UNAUTHORIZED');
          const a=await oauth.status();if(a.state!=='CONNECTED'||!a.accounts.some(x=>x.id===s.accountId))fail('AUTH_REQUIRED');
          if((method==='readFile'&&(params.entry.folder||!params.entry.key.startsWith(s.prefix)))||(method==='readFileChunk'&&!params.key.startsWith(s.prefix)))fail('SOURCE_SCOPE_MISMATCH');
          if(method==='readFileChunk')data=await fileApi.run('readChunk',params);
          else if(method==='readFile') {
            const chunks=[];let size=0;
            const result=await fileApi.run('readStream',{source:s,key:params.entry.key},{onChunk:chunk=>{size+=chunk.length;if(size>8*1024*1024)fail('PREVIEW_SIZE_LIMIT');chunks.push(chunk);}});
            const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
            data=result.state==='completed'?{state:'completed',data:{bytes:Array.from(bytes),key:params.entry.key}}:result;
          } else data=await fileApi.run({listFolders:'list',refreshExplorer:'list',fileMetadata:'stat'}[method],params);
        }
        else if(method==='listDestinations') {
          const m=params.mode==='narrow'?'nested':params.mode??'simple',limit=params.limit??20;let offset=0;
          if(params.cursor){const c=JSON.parse(params.cursor);if(c.revision!==state.product.revision||c.mode!==m||!Number.isSafeInteger(c.offset)||c.offset<0)fail('STALE_CURSOR');offset=c.offset;}
          const rows=state.configs[m].destinations??state.configs[m].scopes;data={items:rows.slice(offset,offset+limit),total:rows.length,nextCursor:offset+limit<rows.length?JSON.stringify({revision:state.product.revision,mode:m,offset:offset+limit}):null};
        }
        else if(method==='inspectMenuTree'){const spec=engine.getMenu(params.generation);if(!spec)fail('STALE_GENERATION');data=inspectMenuTree(spec,params);}
        else if(method==='inspectExplorerContextMenu'){const a=await oauth?.status(),available=a?.state==='CONNECTED'&&a.accounts?.some(x=>x.id===params.target.accountId)&&params.target.connectionId==='cloudflare:'+params.target.accountId,scopes=a?.scopes??a?.permissions?.issuedScopes;data=describeExplorerContextMenu(params.target,{entry:params.entry,hasClipboard:params.hasClipboard,available:!!available,mutations:!!available&&(!Array.isArray(scopes)||scopes.includes('workers-r2.write'))&&fileApi?.capabilities?.includes('mkdir')===true});}
        else if(method==='previewContextMenu') {
          const evidence=engine.getEvidence(),generation=evidence.acknowledgedGeneration;
          const installed=generation!==null&&!evidence.pending&&evidence.desired?.generation===generation?engine.getMenu(generation):null;
          data=describeCanonicalContextMenu(installed??await compile(state),{context:params.context??'link',nativeAcknowledged:!!installed});
        }
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
          const next=replay?state:applyConfigChanges(state,params.changes);
          if(await authorize({actor,scope,method,params,bindings:{configs:next.configs,defaultTarget:next.product.defaultTarget,prior:{configs:state.configs,defaultTarget:state.product.defaultTarget}}})!==true)fail('PERMISSION_DENIED');
          if(method==='previewConfigChange')data={configuration:next,diff:diffMenuSpecs(await compile(state),await compile(next))};
          else {
            if(params.changes.some(c=>c.type==='deleteDestinationConfig'||c.type==='setDepthDisplayBuckets'&&state.configs.depth.scopes.some(old=>!c.scopes.some(n=>targetKey(n.target)===targetKey(old.target))))&&await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');
            receipt=await current.commitProduct({...next,expectedRevision:params.expectedRevision,idempotencyKey:actor+':'+params.idempotencyKey,fingerprint:JSON.stringify(params),traceContext:{operationId:traceId,requires:startSignal?[startSignal]:[]}});
            const added=[...new Map(params.changes.flatMap(c=>c.type==='createDestination'||c.type==='makeDefault'?[c.target]:c.type==='setDepthDisplayBuckets'?c.scopes.map(s=>s.target):[]).map(t=>[targetKey(t),t])).values()];
            if(!receipt.replayed&&added.length)await getInventory({refreshTargets:added});
            // Display-only preferences persist through this same transaction without
            // rebuilding unrelated native menus on every View/Theme click.
            const displayOnly=params.changes.every(c=>['setView','setTheme','setExplorerLayout'].includes(c.type)),evidence=engine.getEvidence?.();
            const native=receipt.replayed?evidence?.lastOutcome??{state:'blocked',code:'NATIVE_ACK_UNAVAILABLE'}:displayOnly&&evidence?(evidence.lastOutcome?.state==='completed'&&!evidence.pending&&evidence.acknowledgedGeneration===evidence.desired?.generation?{...evidence.lastOutcome,retained:true}:{state:'partial',code:'NATIVE_APPLY_INCOMPLETE',retained:true}):await reconcile();let backup;
            if(receipt.replayed)backup={state:'NOT_REPEATED',code:'IDEMPOTENT_REPLAY'};else try{backup=await recovery.writeVerified(await current.read());}catch{backup={state:'BLOCKED',code:'EXTERNAL_RECOVERY_UNAVAILABLE'};}
            const destinationReadiness=[];for(const target of added){const row=engine.getEvidence?.().desired?.rows.find(r=>r.target&&targetKey(r.target)===targetKey(target));if(row?.enabled&&row.actionKind!=='attention'&&native.state==='completed')destinationReadiness.push({target,state:'READY',code:'DESTINATION_NATIVE_ACKNOWLEDGED'});else{const checked=cloudflare?.check?await cloudflare.check(target.accountId,target):null;destinationReadiness.push({target,state:'blocked',code:checked?.worker?.code??checked?.code??row?.reason??'NATIVE_APPLY_INCOMPLETE'});}}
            data={configuration:await current.read(),native,backup,destinationReadiness};
          }
        }
        else if(method==='reconcileNativeMenu'){if(await authorize({actor,scope,method,params,bindings:{configs:state.configs,defaultTarget:state.product.defaultTarget}})!==true)fail('PERMISSION_DENIED');if(params.expectedGeneration!==state.generation.desired)fail('GENERATION_CONFLICT');data=await reconcile();}
        else if(method==='chooseBackupLocation'){if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');data=await recovery.choose(params);}
        else if(method==='inspectRecoveryCoverage')data=await recoveryCrawl.inspect(params.target);
        else if(method==='runRecoveryPage'){const policy=state.product.recovery.buckets.find(b=>scopeKey(b.target)===scopeKey(params.target));if(!policy?.enabled)fail('RECOVERY_NOT_ENABLED');data=await recoveryCrawl.tick(policy,{cadence:state.product.recovery.cadence});}
        else if(method==='inspectBackupRoots')data=await recovery.status();
        else if(method==='listRecoveryPolicies')data=state.product.recovery;
        else if(method==='writeRecovery')data=await recovery.writeVerified(state);
        else if(method==='requestRestorePreview')data=params.rebuild?await rebuildPreview(params.rebuild,actor,method):await restorePreview();
        else if(method==='restoreRightClickMenu') {
          if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');
          const requestFingerprint=await digest({previewToken:params.previewToken,rebuild:params.rebuild??null}),retry=await current.findRetry(actor+':'+params.idempotencyKey);
          if(retry){if(retry.fingerprint!==requestFingerprint&&!(retry.fingerprint===params.previewToken&&!params.rebuild))fail('IDEMPOTENCY_CONFLICT');receipt={...retry,replayed:true};data={configuration:await current.read(),native:engine.getEvidence().lastOutcome??{state:'partial',code:'NATIVE_ACK_UNAVAILABLE'},requiresReconnect:true,...(params.rebuild?{code:'REBUILT_WITH_OWNER_CONFIRMATION',outcome:'REBUILT_WITH_OWNER_CONFIRMATION',originalStateRestored:false}: {})};}
          else{
            const preview=params.rebuild?await rebuildPreview(params.rebuild,actor,method):await restorePreview();if(!preview.available)fail(preview.reason??'NO_VALID_RECOVERY_POINT');if(preview.previewToken!==params.previewToken)fail('RECOVERY_EVIDENCE_CHANGED');
            const restored=validateProduct({product:preview.product,configs:preview.configs});
            if(await authorize({actor,scope,method,params,bindings:{restored,priorAccounts:await affectedConfigurationAccounts(await readNative())}})!==true)fail('PERMISSION_DENIED');
            const evidence=await current.evidence();let preimage=evidence;if(params.rebuild){const native=await readNative(),proof=await recovery.verifyProfileCopy();if(await digest({rebuild:params.rebuild,candidate:restored,evidence,native,proof})!==params.previewToken)fail('RECOVERY_EVIDENCE_CHANGED');preimage={current:evidence,native,profileCopy:proof};}else if(await digest({candidate:restored,evidence})!==params.previewToken)fail('RECOVERY_EVIDENCE_CHANGED');const preservation=await recovery.preserveEvidence(preimage);
            if(preservation?.state!=='VERIFIED')fail('RECOVERY_PRESERVATION_REQUIRED');
            // Revalidate after external I/O; no CURRENT writes precede the verified preimage.
            if(await authorize({actor,scope,method,params,bindings:{restored,priorAccounts:await affectedConfigurationAccounts(await readNative())}})!==true)fail('PERMISSION_DENIED');
            if(params.rebuild){const identity=await oauth.status();if(identity.state!=='CONNECTED'||!identity.accounts?.some(a=>a.id===params.rebuild.accountId))fail('AUTH_REQUIRED');}
            let readable;try{readable=await loadCurrent({observe:false});}catch{};
            if(readable){if(params.expectedRevision!==readable.product.revision)fail('REVISION_CONFLICT');receipt=await current.commitProduct({...restored,expectedRevision:params.expectedRevision,idempotencyKey:actor+':'+params.idempotencyKey,fingerprint:requestFingerprint,traceContext:{operationId:traceId,requires:startSignal?[startSignal]:[]}});}
            else receipt=await current.recoverProduct({candidate:restored,expectedEvidence:evidence,idempotencyKey:actor+':'+params.idempotencyKey,fingerprint:requestFingerprint,generationFloor:evidence.establishment.nativeGeneration??0,kind:params.rebuild?'OWNER_CONFIRMED_REBUILD':'VERIFIED_RECOVERY',traceContext:{operationId:traceId,requires:startSignal?[startSignal]:[]}});
            let native;try{if(params.rebuild)await getInventory({refreshTargets:[...Object.values(restored.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))]});native=await reconcile();}catch{native={state:'blocked',code:'NATIVE_RECONCILE_UNAVAILABLE'};}data={configuration:await current.read(),native,preservation,requiresReconnect:true,...(params.rebuild?{code:'REBUILT_WITH_OWNER_CONFIRMATION',outcome:'REBUILT_WITH_OWNER_CONFIRMATION',originalStateRestored:false,remoteSave:'NOT_VERIFIED'}:{})};
          }
        }
        else if(method==='inspectWholeCloudJobs'){const ids=await wholeCloud.list();data=await Promise.all(ids.map(x=>wholeCloud.inspect(x)));}
        else if(method==='enableWholeCloudJob'||method==='disableWholeCloudJob') {
          if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');
          data=method==='enableWholeCloudJob'?await wholeCloud.enable(params.identity,{cadence:params.cadence}):await wholeCloud.disable(params.identity);
        }
        else if(method==='dispatchSave'||method==='dispatchExplorerSave') {
          if(await confirm({actor,method,params})!==true)fail('CONFIRMATION_REQUIRED');
          const reserved=await current.reserveOperation(actor+':'+params.idempotencyKey,Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(params)))),b=>b.toString(16).padStart(2,'0')).join(''));
          if(!reserved)fail('SAVE_RETRY_REQUIRES_INSPECTION');
          if(method==='dispatchExplorerSave'){
            const auth=await oauth.status(),s=params.source;
            if(s.provider!=='cloudflare'||s.connectionId!=='cloudflare:'+s.accountId||auth.state!=='CONNECTED'||!auth.accounts.some(a=>a.id===s.accountId)||params.entry.folder||!params.entry.key.startsWith(s.prefix))fail('SOURCE_SCOPE_MISMATCH');
            data=await engine.saveExplorerEntry(params);
          } else {
          const source={...params.source,...(params.source.bytes?{bytes:new Uint8Array(params.source.bytes)}:{})};
          data=await engine.save({...params,source});
          }
        }
        if(await authorize({actor,scope,method,params,result:data,phase:'response'})!==true)fail('PERMISSION_DENIED');
        if(['listFolders','refreshExplorer','fileMetadata','readFile','readFileChunk'].includes(method)&&data?.state&&data.state!=='completed'&&(!data.code||data.code==='OK')){const reason=data.error;data={...data,code:/^[A-Z][A-Z0-9_]+$/.test(reason??'')&&reason!=='OK'?reason:'FILE_READ_FAILED'};}
        const inspection=method==='inspectRemoteReceipt';
        const status=inspection?'completed':data?.native&&typeof data.native.state==='string'&&data.native.state!=='completed'?'partial':data?.state;
        if(!inspectOnly)observe(diagnostics?.emit,'api.invoke','ok','API_INVOKE_COMPLETED',{operationId:traceId},startSignal?[startSignal]:[],traceMethodIndex);
        return {version:'3+1.1',state:['failed','blocked','partial','uncertain','cancelled'].includes(status)?status:'completed',code:inspection?'OK':status==='partial'&&data?.native?data.native.code??'NATIVE_APPLY_INCOMPLETE':data?.code??'OK',data,...(safeWorkerDiagnostic(data?.diagnostic)?{diagnostic:safeWorkerDiagnostic(data.diagnostic)}:{}),receipt:{operationId,traceId,durationMs:Math.round(performance.now()-requestStarted),method,before:receipt?.before??state?.product.revision??null,after:receipt?.after??state?.product.revision??null,replayed:receipt?.replayed??false}};
      };
      // Auth must remain cancellable while a provider sign-in window is pending.
      if(scope==='inspect'||['initializeCloudflare','loginBegin','loginCancel','disconnect','loginStatus','inspectCloudflare','checkCloudflareR2','inspectRemoteHistory','inspectRemoteReceipt','inspectCloudflareSetup','openRemoteResult','readFileChunk','refreshExplorer','navigateExplorer','dispatchSave','dispatchExplorerSave','invokeProviderAction','cancelRemoteOperation'].includes(request.method))return await work();
      const task=queue.then(work,work);queue=task.catch(()=>{});return await task;
    } catch(error){if(!inspectOnly)observe(diagnostics?.emit,'api.invoke','failed',REASON_CODES.includes(error?.code)?error.code:'API_INVOKE_FAILED',{operationId:traceId},startSignal?[startSignal]:[],traceMethodIndex);const code=/^[A-Z][A-Z0-9_]+$/.test(error?.code??error?.message)?error.code??error.message:'OPERATION_FAILED';return {version:'3+1.1',state:['PERMISSION_DENIED','AUTH_REQUIRED','HUMAN_INTERACTION_REQUIRED','EXTERNAL_RECOVERY_UNAVAILABLE'].includes(code)?'blocked':'failed',code,...(safeWorkerDiagnostic(error?.diagnostic)?{diagnostic:safeWorkerDiagnostic(error.diagnostic)}:error?.diagnostic?.stage==='current-read'?{diagnostic:error.diagnostic}:{}),receipt:{operationId,traceId,method:request?.method??null}};}
  }
  return Object.freeze({invoke,tools:toolRegistry,reconcile});
}
