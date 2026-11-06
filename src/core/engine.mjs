import {compileComposite} from './composite-menu.mjs';
// Narrow composition of the existing owners. Diagnostics has no write authority.
import {compileMenuSpec} from './menu-spec.mjs';
import {resolveMenuAction} from './action-resolver.mjs';
import {captureSelectedBytes} from './source-capture.mjs';
import {dispatchSave} from './save-dispatcher.mjs';
import {operationIdentity,observe} from './boundary-observation.mjs';
import {location,key} from '../explorer/file-api.mjs';

export function createEngine({current,registrar,providers,getAuthorization,authorizeSource,fetchSource,
  diagnostics,remoteSave,remoteSavers={},onProviderAction,providerSetupActions=false,onVerifiedCompletion,onSaveOutcome=()=>{},fileApi,maxSnapshots=16}={}) {
  if(typeof current?.read!=='function'||typeof registrar?.apply!=='function'||typeof getAuthorization!=='function') throw TypeError('Trusted current state, native registrar and authorization owner required');
  if(!Number.isSafeInteger(maxSnapshots)||maxSnapshots<1||maxSnapshots>256)throw TypeError('Invalid menu retention budget');
  const sink=typeof diagnostics==='function'?diagnostics:diagnostics?.emit;
  const menus=new Map();let evictedGenerations=0;
  const trustedExplorerSources=new WeakSet();
  const expectedSave=['auth.check','resolver','capture.acquire','intent','worker.capability','transfer.upload','transfer.verify','completion.history'];
  function retain(spec) {
    if(menus.has(spec.generation)&&menus.get(spec.generation)!==spec)throw Object.assign(Error('Generation already exists'),{code:'GENERATION_CONFLICT'});
    menus.set(spec.generation,spec);
    while(menus.size>maxSnapshots){menus.delete(menus.keys().next().value);evictedGenerations++;}
  }
  async function compile({mode,inventory,defaultTarget,flatProviders=[],generation,product,configs}={}) {
    const state=await current.read();
    return compileMenuSpec({mode,inventory,defaultTarget,flatProviders,providerSetupActions,product:product??state.product,configs:configs??state.configs,
      generation:generation??state.generation.desired+1,sink,operationId:operationIdentity()});
  }
  async function apply(spec) {
    if(spec.coverage?.rowsComplete===false)return {state:'blocked',code:'MENU_BUDGET_EXCEEDED'};
    const state=await current.read();
    if(spec.generation<state.generation.desired)return {state:'blocked',code:'STALE_GENERATION'};
    if(spec.generation>state.generation.desired)await current.setDesiredGeneration(spec.generation,{expectedGeneration:state.generation.desired});
    retain(spec);
    const result=await registrar.apply(spec);
    if(result.state==='completed'&&result.appliedGeneration===spec.generation) {
      try{await current.acknowledgeGeneration(spec.generation);}catch{return {...result,state:'partial',code:'PERSISTENCE_FAILED'};}
    }
    return result;
  }
  async function save({itemId,generation,context='image',source,signal}={}) {
    const dispatchStarted=performance.now(),operationId=operationIdentity(),scope={operationId,generation};
    let priorBoundary=0;
    // These are actual sequential prerequisites in this owner, not inferred
    // correlations between temporally adjacent independent operations.
    const saveSink=event=>{
      if(typeof sink!=='function')return 0;
      const requires=event.requires?.length?event.requires:priorBoundary?[priorBoundary]:[];
      let id=0;try{id=sink({...event,operationId,generation,requires})||0;}catch{}
      if(id)priorBoundary=id;return id;
    };
    const blockRemaining=stage=>{
      for(const downstream of expectedSave.slice(expectedSave.indexOf(stage)+1))
        observe(saveSink,downstream,downstream==='completion.history'?'skipped':'blocked','DEPENDENCY_BLOCKED',scope);
    };
    let activeStage='auth.check';
    try{diagnostics?.declareOperation?.(operationId,expectedSave);}catch{}
    const finish=outcome=>{try{onSaveOutcome(outcome);}catch{}return outcome;};
    try {
      const spec=menus.get(generation);
      const providerRow=spec?.rows.find(r=>r.id===itemId&&r.role==='provider-action');
      if(providerRow){
        const native=registrar.inspect(),resolved=resolveMenuAction(spec,{itemId,generation,context,acknowledgedGeneration:!native.pending&&native.desired?.generation===generation?native.acknowledgedGeneration:null,authorizedTargets:[]});
        if(resolved.state!=='completed')return finish(resolved);
        if(!onProviderAction)return finish({state:'blocked',code:'PROVIDER_SETUP_UNAVAILABLE'});
        return finish(await onProviderAction({provider:resolved.action.providerAction,source,signal,generation,dispatchPreparationMs:Math.round(performance.now()-dispatchStarted),authorize:async()=>{const n=registrar.inspect();return !n.pending&&n.desired?.generation===generation&&n.acknowledgedGeneration===generation;}}));
      }
      let auth;
      try{auth=await getAuthorization();}
      catch{observe(saveSink,'auth.check','failed','AUTH_CHECK_FAILED',scope);blockRemaining('auth.check');throw Object.assign(Error('Authorization could not be checked'),{code:'AUTH_CHECK_FAILED'});}
      if(!auth?.sessionId||!Array.isArray(auth.authorizedTargets)) {
        observe(saveSink,'auth.check','blocked','AUTH_REQUIRED',scope);
        blockRemaining('auth.check');
        const row=spec?.rows.find(r=>r.id===itemId);
        const n=registrar.inspect();if(row?.role==='save'&&row.target?.provider==='cloudflare'&&row.enabled&&row.visible&&row.contexts.includes(context)&&!n.pending&&n.desired?.generation===generation&&n.acknowledgedGeneration===generation&&onProviderAction)return finish(await onProviderAction({provider:'cloudflare',requestedTarget:row.target,setupOnly:true}));
        return finish({state:'blocked',code:'AUTH_REQUIRED',operationId});
      }
      observe(saveSink,'auth.check','ok','AUTH_VERIFIED',scope);
      activeStage='resolver';
      // Authorization can await storage/network. Inspect current native generation
      // after that await, never reuse an observation from before it.
      const native=registrar.inspect();
      const resolved=resolveMenuAction(spec,{itemId,generation,context,acknowledgedGeneration:
        native.pending||native.desired?.generation!==generation?null:native.acknowledgedGeneration,
        authorizedTargets:auth.authorizedTargets,sink:saveSink,operationId});
      if(resolved.state!=='completed'){blockRemaining('resolver');const row=spec?.rows.find(r=>r.id===itemId);if(row?.target?.provider==='cloudflare'&&['SCOPE_UNAUTHORIZED','ITEM_DISABLED'].includes(resolved.code)&&onProviderAction)return finish(await onProviderAction({provider:'cloudflare',requestedTarget:row.target,setupOnly:true}));return finish({...resolved,operationId});}
      const selectedRemote=resolved.action.target.provider==='cloudflare'?remoteSave:remoteSavers[resolved.action.target.provider];
      if(resolved.action.target.provider==='cloudflare'||typeof selectedRemote==='function'){
        observe(saveSink,'capture.acquire','skipped','TRUE_REMOTE_ONLY',scope);
        if(typeof selectedRemote!=='function')return finish({state:'blocked',code:'REMOTE_TRANSPORT_REQUIRED',operationId});
        const authorize=async()=>{const latest=await getAuthorization(),n=registrar.inspect();return latest?.sessionId===auth.sessionId&&!n.pending&&n.desired?.generation===generation&&resolveMenuAction(spec,{itemId,generation,context,acknowledgedGeneration:n.acknowledgedGeneration,authorizedTargets:latest.authorizedTargets}).state==='completed';};
        const out=await selectedRemote({target:resolved.action.target,source,operationId:crypto.randomUUID(),signal,authorize,dispatchPreparationMs:Math.round(performance.now()-dispatchStarted),onBoundary:(stage,outcome,code)=>observe(saveSink,stage,outcome,code,scope)});
        if(out.state==='verified'){if(out.completionPending)return finish({...out,state:'partial',code:'COMPLETION_PENDING',remoteOperationId:out.operationId,operationId});try{await onVerifiedCompletion?.(out);}catch{return finish({state:'partial',code:'COMPLETION_PENDING',operationId});}observe(saveSink,'completion.history','ok','REMOTE_COMPLETION_RECORDED',scope);return finish({...out,state:'completed',completion:'verified',remoteOperationId:out.operationId,operationId});}
        return finish(out);
      }
      activeStage='capture.acquire';
      const file=await captureSelectedBytes(source,{authorizeSource:async source=>trustedExplorerSources.has(source)||await authorizeSource(source),fetchSource,sink:saveSink,signal,operationId});
      activeStage='intent';
      const result=await dispatchSave({intent:resolved.action.intent,file},{providers,diagnostics:saveSink,context:scope,
        // Recheck current authority after source capture and before upload.
        authorize:async intent=>{
          const latest=await getAuthorization();
          if(latest?.sessionId!==auth.sessionId)return false;
          const registration=registrar.inspect();
          if(registration.pending||registration.desired?.generation!==generation)return false;
          return resolveMenuAction(spec,{itemId,generation,context,acknowledgedGeneration:registration.acknowledgedGeneration,
            authorizedTargets:latest.authorizedTargets}).state==='completed';
        },onVerifiedCompletion});
      return finish({state:result.completion==='pending'?'partial':'completed',operationId,...result});
    } catch(error) {
      // No raw host/provider errors enter the UI/export; uncertain writes must not be replayed.
      if(activeStage==='capture.acquire')blockRemaining('capture.acquire');
      if(activeStage==='resolver'){observe(saveSink,'resolver','failed','RESOLVE_FAILED',scope);blockRemaining('resolver');}
      const safeCodes=['AUTH_REVOKED','AUTH_CHECK_FAILED','CAPTURE_DENIED','CAPTURE_INVALID','CAPTURE_UNAVAILABLE','CAPTURE_SIZE_LIMIT','CAPTURE_INTERRUPTED','CAPTURE_TIMEOUT','CAPTURE_FAILED','UPLOAD_UNCONFIRMED','VERIFIER_UNAVAILABLE','RECEIPT_UNVERIFIED','VERIFY_UNCERTAIN'];
      const code=safeCodes.includes(error?.code)?error.code:'SAVE_FAILED';
      return finish({state:error?.uncertain||code.includes('UNCONFIRMED')||code.includes('UNVERIFIED')?'uncertain':error?.name==='AbortError'||code==='CAPTURE_INTERRUPTED'?'cancelled':code==='AUTH_REVOKED'?'blocked':'failed',code,operationId});
    }
  }
  // Explorer uses the same save resolver/dispatcher as Chrome native menus. It
  // reads exact bytes through the authoritative Universal File API, never a URL
  // sent to the provider. Only this host-created byte source is whitelisted.
  async function saveExplorerEntry({itemId,generation,context='link',source,entry,signal}={}) {
    const destination=menus.get(generation)?.rows.find(r=>r.id===itemId)?.target;
    if(destination?.provider==='cloudflare'||typeof remoteSavers[destination?.provider]==='function')return {state:'blocked',code:'REMOTE_EXPLORER_SOURCE_UNAVAILABLE'};
    if(typeof fileApi?.run!=='function')return {state:'blocked',code:'FILE_API_UNAVAILABLE'};
    let cloud,keyName,filename;
    try {
      cloud=location(source);keyName=key(entry?.key);
      if(entry?.folder===true||keyName.endsWith('/'))throw Error('FILE_REQUIRED');
      filename=entry?.displayName??keyName.split('/').at(-1);
      if(typeof filename!=='string'||!filename||/[\\/\\\\\\0]/.test(filename))throw Error('INVALID_FILENAME');
    }catch{return {state:'blocked',code:'INVALID_EXPLORER_SOURCE'};}
    const limit=32*1024*1024;
    const stat=await fileApi.run('stat',{source:cloud,key:keyName},{signal});
    if(stat.state!=='completed'||!stat.data?.object)return {state:'blocked',code:'SOURCE_NOT_VERIFIED'};
    const size=Number(stat.data.object.size);
    if(!Number.isSafeInteger(size)||size<0||size>limit)return {state:'blocked',code:'CAPTURE_SIZE_LIMIT'};
    const chunks=[];let total=0;
    let response;
    try {
      response=await fileApi.run('readStream',{source:cloud,key:keyName},{signal,onChunk:chunk=>{
        if(!(chunk instanceof Uint8Array))throw Error('INVALID_SOURCE_CHUNK');
        total+=chunk.byteLength;
        if(total>limit||total>size)throw Error('CAPTURE_SIZE_LIMIT');
        chunks.push(chunk);
      }});
    }catch{return {state:'failed',code:'SOURCE_READ_FAILED'};}
    if(response.state!=='completed'||total!==size)return {state:'uncertain',code:'SOURCE_READ_UNCONFIRMED'};
    const bytes=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const captured={filename,bytes,contentType:entry.contentType??'application/octet-stream'};
    trustedExplorerSources.add(captured);
    try{return await save({itemId,generation,context,source:captured,signal});}
    finally{trustedExplorerSources.delete(captured);}
  }
  return Object.freeze({compile,compileComposite:async options=>compileComposite({...options,sink}),apply,save,saveExplorerEntry,
    getMenu:generation=>menus.get(generation)??null,
    menuRetention:()=>({retained:menus.size,evictedGenerations,maxSnapshots}),
    getEvidence:()=>registrar.inspect(),
    getModeConfig:mode=>current.getModeConfig(mode),
    saveModeConfig:(mode,config,options)=>current.saveModeConfig(mode,config,options)
  });
}
