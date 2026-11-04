import {observe,operationIdentity,errorOutcome} from '../core/boundary-observation.mjs';
// REDOWN Explorer Refresh / Activate Buckets parity, hosted via its authenticated API.
// This module intentionally never creates/deploys a bucket Worker itself:
// original REDOWN background.js alone owns provisioning and native menu reconciliation.
const k = target => JSON.stringify([target.accountId,target.bucketName]);
const publicSnapshot = state => ({
  phase:state.phase,
  accounts:state.accounts.map(a=>({id:a.id,name:a.name})),
  buckets:state.buckets.map(b=>({accountId:b.accountId,bucketName:b.bucketName})),
  entries:state.entries.map(x=>({...x})),
  cursor:state.cursor,
  location:state.location?{...state.location}:null,
  activation:{...state.activation},
  message:state.message
});
const assertResult = (result, label) => {
  if (result?.state !== 'completed') {
    const error = new Error(result?.error || label+' was not confirmed.');
    error.code=result?.code || 'RESULT_UNCONFIRMED';
    throw error;
  }
  return result.data || {};
};
const safePublicCode=(error,fallback)=>['DISCONNECTED','RESULT_UNCONFIRMED','REFRESH_FAILED','ACTIVATION_FAILED','REDOWN_SENDER_REQUIRED','INVALID_ACTIVATION','HTTP_400','HTTP_401','HTTP_403','HTTP_404','HTTP_409','HTTP_429','HTTP_500','HTTP_502','HTTP_503','HTTP_504'].includes(error?.code)?error.code:fallback;
const safeError = e => ({DISCONNECTED:'Connect Cloudflare first.',HTTP_401:'The Cloudflare session expired. Reconnect and retry.',HTTP_403:'Cloudflare denied access. Check account authorization.',HTTP_404:'The requested resource is unavailable. Refresh discovery.',HTTP_429:'Cloudflare is busy. Wait briefly and retry.',REDOWN_SENDER_REQUIRED:'Activation requires the authorized REDOWN host.'}[safePublicCode(e,'REQUEST_FAILED')] || 'Request failed. Check the connection and inspect authorized diagnostics before retrying.');

export function createDashboardControls({fileApi,readAuth,readActivation,activateBuckets,onChange=()=>{},diagnostics,context={}}={}) {
  if (!fileApi || typeof fileApi.run!=='function' || typeof readAuth!=='function' ||
      typeof readActivation!=='function' || typeof activateBuckets!=='function')
    throw TypeError('Requires REDOWN authenticated Explorer API and activation transport.');
  const state={
    phase:'idle',accounts:[],buckets:[],entries:[],cursor:'',location:null,message:'',
    activation:{status:'unknown',ready:0,total:0,menuRegistered:false},busy:false
  };
  const emit = () => { const s=publicSnapshot(state); onChange(s);return s; };
  const scopeFor = () => ({...context,operationId:operationIdentity(context)});
  const isConnected = async scope => {
    try {
      const auth=await readAuth();
      const connected=Boolean(auth?.accessToken&&!auth.reconnectRequired);
      observe(diagnostics,'auth.check',connected?'ok':'blocked',connected?'AUTH_VERIFIED':auth?.reconnectRequired?'AUTH_REVOKED':'AUTH_REQUIRED',scope);
      return connected;
    }catch(error){observe(diagnostics,'auth.check',errorOutcome(error),'AUTH_CHECK_FAILED',scope);throw error;}
  };
  async function updateActivation(scope=scopeFor()) {
    let a;
    try {a=await readActivation();}
    catch(error){observe(diagnostics,'activation.status',errorOutcome(error),'ACTIVATION_STATUS_FAILED',scope);throw error;}
    // Compare account+bucket identity, NOT bucket names alone.
    const profiles=a.profiles || [];
    const prepared=(a.activatedBuckets || []).filter(x=>x.enabled&&profiles.some(p=>
      p.id===x.profileId&&p.accountId===x.accountId&&p.bucketName===x.bucketName&&p.workerUrl&&p.token));
    const actual=state.buckets;
    const complete=actual.length>0&&actual.every(b=>prepared.some(p=>k(p)===k(b)));
    const menuRegistered=a.menuStatus?.state==='registered';
    const ready=a.globalActivation?.state==='ready'&&complete&&menuRegistered;
    state.activation={
      status:ready?'ready':a.globalActivation?.state==='running'?'running':
        ['partial','failed'].includes(a.globalActivation?.state)?a.globalActivation.state:'needs-attention',
      ready:prepared.length,
      total:actual.length||a.globalActivation?.buckets?.length||0,
      menuRegistered,
      error:a.globalActivation?.error ? 'Bucket preparation reported a failure. Inspect authorized diagnostics.':'',
      verified:ready
    };
    observe(diagnostics,'activation.status',ready?'ok':state.activation.status==='running'?'started':'partial',
      ready?'ACTIVATION_READY':!menuRegistered?'NATIVE_ACK_UNKNOWN':!complete?'ACTIVATION_PARTIAL':'ACTIVATION_UNVERIFIED',scope,[],prepared.length);
    return state.activation;
  }
  async function refresh(location=null) {
    const scope=scopeFor();
    if(state.busy){observe(diagnostics,'inventory.refresh','blocked','BUSY',scope);return {ok:false,code:'BUSY',state:emit()};}
    observe(diagnostics,'inventory.refresh','started','REFRESH_STARTED',scope);
    state.busy=true;state.phase='refreshing';state.message='Refreshing from Cloudflare…';emit();
    try {
      if(!await isConnected(scope))throw Object.assign(Error('Connect Cloudflare first.'),{code:'DISCONNECTED'});
      if (location) {
        if (typeof location.accountId!=='string'||typeof location.bucketName!=='string')
          {observe(diagnostics,'inventory.refresh','failed','LOCATION_INVALID',scope);throw Error('Choose an account and bucket.');}
        // REDOWN: an open folder refreshes via 'list' and never provisions a Worker.
        const data=assertResult(await fileApi.run('list',{source:location}), 'Folder refresh');
        observe(diagnostics,'inventory.page',data.cursor?'partial':'ok',data.cursor?'INVENTORY_PARTIAL':'INVENTORY_PAGE_COMPLETE',scope,[],data.entries?.length||0);
        state.location={accountId:location.accountId,bucketName:location.bucketName,prefix:location.prefix||''};
        if(!Array.isArray(data.entries)){observe(diagnostics,'inventory.page','failed','INVENTORY_INVALID',scope);throw Error('Cloudflare returned no valid folder listing.');}
        state.entries=data.entries;
        state.cursor=String(data.cursor||'');
      } else {
        // REDOWN: when no location is active, discover real accounts and buckets.
        const data=assertResult(await fileApi.run('accounts',{}),'Account discovery');
        if(!Array.isArray(data.accounts)){observe(diagnostics,'inventory.page','failed','INVENTORY_INVALID',scope);throw Error('Cloudflare returned no valid account listing.');}
        const accounts=data.accounts;
        const results=await Promise.allSettled(accounts.map(async account=>{
          const childScope={...scope,parentOperation:scope.operationId,operationId:operationIdentity()};
          try {
            const b=assertResult(await fileApi.run('buckets',{accountId:account.id}),'Bucket discovery');
            if(!Array.isArray(b.buckets))throw Error('Cloudflare returned no valid bucket listing.');
            observe(diagnostics,'inventory.page','ok','INVENTORY_PAGE_COMPLETE',childScope,[],b.buckets.length);
            return b.buckets.map(bucket=>({accountId:account.id,bucketName:bucket.name}));
          }catch(error){observe(diagnostics,'inventory.page',errorOutcome(error),'INVENTORY_PAGE_FAILED',childScope);throw error;}
        }));
        const discovered=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
        const failures=results.filter(r=>r.status==='rejected');
        if(failures.length)throw failures[0].reason;
        state.accounts=accounts.map(a=>({id:a.id,name:a.name||a.id}));
        state.buckets=discovered.flat();
        state.location=null;state.entries=[];state.cursor='';
      }
      await updateActivation(scope);
      state.phase='ready';state.message=location?'Folder refreshed from Cloudflare R2.':'Cloudflare accounts and buckets refreshed.';
      observe(diagnostics,'inventory.refresh','ok','REFRESH_COMPLETED',scope);
      return {ok:true,state:emit()};
    } catch (error) {
      observe(diagnostics,'inventory.refresh',errorOutcome(error),'REFRESH_FAILED',scope);
      state.phase='failed';state.message=safeError(error);
      return {ok:false,code:safePublicCode(error,'REFRESH_FAILED'),state:emit()};
    } finally {state.busy=false;}
  }
  async function activate() {
    const scope=scopeFor();
    if(state.busy){observe(diagnostics,'activation.prepare','blocked','BUSY',scope);return {ok:false,code:'BUSY',state:emit()};}
    observe(diagnostics,'activation.prepare','started','ACTIVATION_STARTED',scope);
    state.busy=true;state.phase='activating';state.message='Preparing REDOWN bucket Workers…';emit();
    try {
      if(!await isConnected(scope))throw Object.assign(Error('Connect Cloudflare first.'),{code:'DISCONNECTED'});
      const current=await readActivation();
      const retryFailed=['partial','failed'].includes(current.globalActivation?.state);
      observe(diagnostics,'activation.prepare','started',retryFailed?'ACTIVATION_RETRY_FAILED':'ACTIVATION_INITIAL',scope);
      // Exact original REDOWN background action and opt-in confirmation flag.
      const result=await activateBuckets({type:'activateAllBuckets',confirmed:true,retryFailed});
      if(result?.ok!==true)throw Object.assign(Error(result?.error || 'Bucket activation was not confirmed.'),{code:result?.code||'ACTIVATION_FAILED'});
      await updateActivation(scope);
      const status=state.activation.status;
      state.phase=status==='ready'?'ready':status==='running'?'activating':'partial';
      state.message=status==='ready'?'Buckets activated; Chrome confirmed the right-click menu.':
        status==='running'?'Bucket preparation is in progress.':'Some buckets still need attention. Review the result before retrying.';
      observe(diagnostics,'activation.prepare',status==='ready'?'ok':status==='running'?'started':'partial',status==='ready'?'ACTIVATION_READY':status==='running'?'ACTIVATION_RUNNING':'ACTIVATION_PARTIAL',scope);
      return {ok:status==='ready',state:emit()};
    } catch (error) {
      observe(diagnostics,'activation.prepare',errorOutcome(error),'ACTIVATION_FAILED',scope);
      state.phase='failed';state.message=safeError(error);
      return {ok:false,code:safePublicCode(error,'ACTIVATION_FAILED'),state:emit()};
    } finally {state.busy=false;}
  }
  return Object.freeze({
    refresh,activate,updateActivation,
    setLocation: l=>{state.location=l?{...l}:null;return emit();},
    snapshot:()=>publicSnapshot(state),
    async hydrate(){await updateActivation();return emit();}
  });
}
