import {compileComposite} from './composite-menu.mjs';
// Narrow composition of the existing owners. Diagnostics has no write authority.
import {compileMenuSpec} from './menu-spec.mjs';
import {resolveMenuAction} from './action-resolver.mjs';
import {captureSelectedBytes,captureSelectedStream} from './source-capture.mjs';
import {dispatchSave} from './save-dispatcher.mjs';
import {operationIdentity,observe} from './boundary-observation.mjs';
import {location,key} from '../explorer/file-api.mjs';

export function createEngine({current,registrar,providers,getAuthorization,authorizeSource,fetchSource,
  diagnostics,remoteSave,remoteSavers={},onProviderAction,providerSetupActions=false,onVerifiedCompletion,onSaveOutcome=()=>{},fileApi,maxSnapshots=16}={}) {
  if(typeof current?.read!=='function'||typeof registrar?.apply!=='function'||typeof getAuthorization!=='function') throw TypeError('Trusted current state, native registrar and authorization owner required');
  if(!Number.isSafeInteger(maxSnapshots)||maxSnapshots<1||maxSnapshots>256)throw TypeError('Invalid menu retention budget');
  const sink=typeof diagnostics==='function'?diagnostics:diagnostics?.emit;
  const menus=new Map(),compiledIntent=new WeakMap();
  const menuIntent=state=>JSON.stringify({configs:state.configs,...Object.fromEntries(['show','defaultTarget','providerVisibility','placement','favorites','menuCustomized'].map(k=>[k,state.product?.[k]]))});
  let evictedGenerations=0;
  const trustedExplorerSources=new WeakSet();
  const expectedSave=['auth.check','resolver','capture.acquire','intent','worker.capability','transfer.upload','transfer.verify','completion.history'];
  function retain(spec) {
    if(menus.has(spec.generation)&&menus.get(spec.generation)!==spec)throw Object.assign(Error('Generation already exists'),{code:'GENERATION_CONFLICT'});
    menus.set(spec.generation,spec);
    while(menus.size>maxSnapshots){menus.delete(menus.keys().next().value);evictedGenerations++;}
  }
  async function compile({mode,inventory,defaultTarget,flatProviders=[],generation,product,configs}={}) {
    const state=await current.read();
    const spec=compileMenuSpec({mode,inventory,defaultTarget,flatProviders,providerSetupActions,product:product??state.product,configs:configs??state.configs,
      generation:generation??state.generation.desired+1,sink,operationId:operationIdentity()});
    compiledIntent.set(spec,menuIntent({configs:configs??state.configs,product:product??state.product}));return spec;
  }
  async function apply(spec) {
    if(spec.coverage?.rowsComplete===false)return {state:'blocked',code:'MENU_BUDGET_EXCEEDED'};
    const state=await current.read();
    if(compiledIntent.has(spec)&&compiledIntent.get(spec)!==menuIntent(state))return {state:'blocked',code:'STALE_CONFIGURATION'};
    if(spec.generation<state.generation.desired)return {state:'blocked',code:'STALE_GENERATION'};
    if(spec.generation>state.generation.desired)await current.setDesiredGeneration(spec.generation,{expectedGeneration:state.generation.desired});
    retain(spec);
    const result=await registrar.apply(spec);
    if(result.state==='completed'&&result.appliedGeneration===spec.generation) {
      try{await current.acknowledgeGeneration(spec.generation);}catch{return {...result,state:'partial',code:'PERSISTENCE_FAILED'};}
    }
    return result;
  }
  async function save({itemId,generation,context='image',source,signal,attentionContext}={}) {
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
      const durable=await current.read();if(durable.generation.desired!==generation||durable.generation.applied!==generation)return finish({state:'blocked',code:'STALE_GENERATION',operationId});
      const spec=menus.get(generation);
      if(spec&&compiledIntent.has(spec)&&compiledIntent.get(spec)!==menuIntent(durable))return finish({state:'blocked',code:'STALE_CONFIGURATION',operationId});
      if(!spec)return finish({state:'blocked',code:'STALE_GENERATION',operationId});
      const providerRow=spec?.rows.find(r=>r.id===itemId&&r.role==='provider-action');
      if(providerRow){
        const native=registrar.inspect(),resolved=resolveMenuAction(spec,{itemId,generation,context,acknowledgedGeneration:!native.pending&&native.desired?.generation===generation?native.acknowledgedGeneration:null,authorizedTargets:[]});
        if(resolved.state!=='completed')return finish(resolved);
        if(!onProviderAction)return finish({state:'blocked',code:'PROVIDER_SETUP_UNAVAILABLE'});
        return finish(await onProviderAction({provider:resolved.action.providerAction,attentionContext,emptyAssignment:resolved.action.providerAction==='cloudflare',source,signal,generation,dispatchPreparationMs:Math.round(performance.now()-dispatchStarted),authorize:async()=>{const n=registrar.inspect();return !n.pending&&n.desired?.generation===generation&&n.acknowledgedGeneration===generation;}}));
      }
      let auth;
      try{auth=await getAuthorization(spec?.rows.find(r=>r.id===itemId)?.target);}
      catch{observe(saveSink,'auth.check','failed','AUTH_CHECK_FAILED',scope);blockRemaining('auth.check');throw Object.assign(Error('Authorization could not be checked'),{code:'AUTH_CHECK_FAILED'});}
      if(!auth?.sessionId||!Array.isArray(auth.authorizedTargets)) {
        observe(saveSink,'auth.check','blocked','AUTH_REQUIRED',scope);
        blockRemaining('auth.check');
        const row=spec?.rows.find(r=>r.id===itemId);
        const n=registrar.inspect();if(row?.role==='save'&&row.target?.provider==='cloudflare'&&row.enabled&&row.visible&&row.contexts.includes(context)&&!n.pending&&n.desired?.generation===generation&&n.acknowledgedGeneration===generation&&onProviderAction)return finish(await onProviderAction({provider:'cloudflare',requestedTarget:row.target,setupOnly:true,attentionContext}));
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
      if(resolved.state!=='completed'){blockRemaining('resolver');const row=spec?.rows.find(r=>r.id===itemId);if(row?.target?.provider==='cloudflare'&&['SCOPE_UNAUTHORIZED','ITEM_DISABLED'].includes(resolved.code)&&onProviderAction)return finish(await onProviderAction({provider:'cloudflare',requestedTarget:row.target,setupOnly:true,attentionContext}));return finish({...resolved,operationId});}
      const selectedRemote=resolved.action.target.provider==='cloudflare'?remoteSave:remoteSavers[resolved.action.target.provider];
      if(resolved.action.target.provider==='cloudflare'||typeof selectedRemote==='function'){
        observe(saveSink,'capture.acquire','skipped','TRUE_REMOTE_ONLY',scope);
        if(typeof selectedRemote!=='function')return finish({state:'blocked',code:'REMOTE_TRANSPORT_REQUIRED',operationId});
        const authorize=async()=>{const saved=await current.read();if(saved.generation.desired!==generation||saved.generation.applied!==generation||compiledIntent.has(spec)&&compiledIntent.get(spec)!==menuIntent(saved))return false;const latest=await getAuthorization(resolved.action.target),n=registrar.inspect();return latest?.sessionId===auth.sessionId&&!n.pending&&n.desired?.generation===generation&&resolveMenuAction(spec,{itemId,generation,context,acknowledgedGeneration:n.acknowledgedGeneration,authorizedTargets:latest.authorizedTargets}).state==='completed';};
        const out=await selectedRemote({target:resolved.action.target,source,...(resolved.action.provenance?{provenance:resolved.action.provenance}:{}),operationId:crypto.randomUUID(),signal,authorize,dispatchPreparationMs:Math.round(performance.now()-dispatchStarted),onBoundary:(stage,outcome,code)=>observe(saveSink,stage,outcome,code,scope)});
        if(out.state==='verified'){if(out.completionPending)return finish({...out,state:'partial',code:'COMPLETION_PENDING',remoteOperationId:out.operationId,operationId});try{await onVerifiedCompletion?.(out);}catch{return finish({state:'partial',code:'COMPLETION_PENDING',operationId});}observe(saveSink,'completion.history','ok','REMOTE_COMPLETION_RECORDED',scope);return finish({...out,state:'completed',completion:'verified',remoteOperationId:out.operationId,operationId});}
        return finish(out);
      }
      activeStage='capture.acquire';
      const provider=providers?.[resolved.action.target.provider];if(!provider)return finish({state:'blocked',code:'PROVIDER_NOT_IMPLEMENTED',operationId});
      const streamed=typeof provider.uploadStream==='function';if(!streamed&&!(source?.bytes instanceof Uint8Array))return finish({state:'blocked',code:'STREAMING_PROVIDER_REQUIRED',operationId});
      const file=await (streamed?captureSelectedStream:captureSelectedBytes)(source,{authorizeSource:async source=>trustedExplorerSources.has(source)||await authorizeSource(source),fetchSource,sink:saveSink,signal,operationId});
      activeStage='intent';
      try{const result=await dispatchSave({intent:resolved.action.intent,file},{providers,diagnostics:saveSink,context:scope,
        // Recheck current authority after source capture and before upload.
        authorize:async intent=>{
          const saved=await current.read();if(saved.generation.desired!==generation||saved.generation.applied!==generation||compiledIntent.has(spec)&&compiledIntent.get(spec)!==menuIntent(saved))return false;
          const latest=await getAuthorization(resolved.action.target);
          if(latest?.sessionId!==auth.sessionId)return false;
          const registration=registrar.inspect();
          if(registration.pending||registration.desired?.generation!==generation)return false;
          return resolveMenuAction(spec,{itemId,generation,context,acknowledgedGeneration:registration.acknowledgedGeneration,
            authorizedTargets:latest.authorizedTargets}).state==='completed';
        },onVerifiedCompletion});
      return finish({state:result.completion==='pending'?'partial':'completed',operationId,...result});}finally{await file.cancel?.().catch(()=>{});}
    } catch(error) {
      // No raw host/provider errors enter the UI/export; uncertain writes must not be replayed.
      if(activeStage==='capture.acquire')blockRemaining('capture.acquire');
      if(activeStage==='resolver'){observe(saveSink,'resolver','failed','RESOLVE_FAILED',scope);blockRemaining('resolver');}
      const safeCodes=['CONFIGURATION_RECORD_MISSING','CONFIGURATION_CORRUPT','CONFIGURATION_CONFLICT','STORAGE_UNAVAILABLE','STREAMING_PROVIDER_REQUIRED','AUTH_REVOKED','AUTH_CHECK_FAILED','CAPTURE_DENIED','CAPTURE_INVALID','CAPTURE_UNAVAILABLE','CAPTURE_SIZE_LIMIT','CAPTURE_INTERRUPTED','CAPTURE_TIMEOUT','CAPTURE_FAILED','UPLOAD_UNCONFIRMED','VERIFIER_UNAVAILABLE','RECEIPT_UNVERIFIED','VERIFY_UNCERTAIN'];
      const code=safeCodes.includes(error?.code)?error.code:'SAVE_FAILED';
      return finish({state:error?.uncertain||code.includes('UNCONFIRMED')||code.includes('UNVERIFIED')?'uncertain':error?.name==='AbortError'||code==='CAPTURE_INTERRUPTED'?'cancelled':['AUTH_REVOKED','CONFIGURATION_RECORD_MISSING','CONFIGURATION_CORRUPT','CONFIGURATION_CONFLICT','STORAGE_UNAVAILABLE'].includes(code)?'blocked':'failed',code,operationId});
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
    if(typeof providers?.[destination?.provider]?.uploadStream!=='function')return {state:'blocked',code:'STREAMING_PROVIDER_REQUIRED'};
    const stat=await fileApi.run('stat',{source:cloud,key:keyName},{signal});
    const size=Number(stat.data?.object?.size);if(stat.state!=='completed'||!Number.isSafeInteger(size)||size<0)return {state:'blocked',code:'SOURCE_NOT_VERIFIED'};
    const transfer=new TransformStream();let started=false;
    const lazy=new ReadableStream({async pull(c){
      if(!started){started=true;const writer=transfer.writable.getWriter();void (async()=>{try{const result=await fileApi.run('readStream',{source:cloud,key:keyName},{signal,onChunk:chunk=>writer.write(chunk)});if(result.state!=='completed')throw Error('SOURCE_READ_UNCONFIRMED');await writer.close();}catch(e){await writer.abort(e).catch(()=>{});}})();}
      this.reader??=transfer.readable.getReader();const r=await this.reader.read();if(r.done)c.close();else c.enqueue(r.value);
    },cancel(r){return this.reader?.cancel(r);}}, {highWaterMark:0});
    const captured={filename,body:lazy,length:size,contentType:entry.contentType??'application/octet-stream'};trustedExplorerSources.add(captured);
    try{return await save({itemId,generation,context,source:captured,signal});}finally{trustedExplorerSources.delete(captured);if(!lazy.locked)void lazy.cancel().catch(()=>{});}
  }
  return Object.freeze({compile,compileComposite:async options=>compileComposite({...options,sink}),apply,save,saveExplorerEntry,
    getMenu:generation=>menus.get(generation)??null,
    menuRetention:()=>({retained:menus.size,evictedGenerations,maxSnapshots}),
    getEvidence:()=>registrar.inspect(),
    getModeConfig:mode=>current.getModeConfig(mode),
    saveModeConfig:(mode,config,options)=>current.saveModeConfig(mode,config,options)
  });
}
