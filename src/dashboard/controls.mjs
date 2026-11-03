// REDOWN Explorer Refresh / Activate Buckets parity, hosted via its authenticated API.
// This module intentionally never creates/deploys a bucket Worker itself:
// original REDOWN background.js alone owns provisioning and native menu reconciliation.
const states = ['disconnected','idle','refreshing','activating','ready','partial','failed'];
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
const safeError = e => String(e?.message || 'Request failed. Check Cloudflare connection and retry.').slice(0,360);

export function createDashboardControls({fileApi,readAuth,readActivation,activateBuckets,onChange=()=>{}}={}) {
  if (!fileApi || typeof fileApi.run!=='function' || typeof readAuth!=='function' ||
      typeof readActivation!=='function' || typeof activateBuckets!=='function')
    throw TypeError('Requires REDOWN authenticated Explorer API and activation transport.');
  const state={
    phase:'idle',accounts:[],buckets:[],entries:[],cursor:'',location:null,message:'',
    activation:{status:'unknown',ready:0,total:0,menuRegistered:false},busy:false
  };
  const emit = () => { const s=publicSnapshot(state); onChange(s);return s; };
  const isConnected = async () => {
    const auth=await readAuth();
    return Boolean(auth?.accessToken&&!auth.reconnectRequired);
  };
  async function updateActivation() {
    const a=await readActivation();
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
      error:a.globalActivation?.error ? String(a.globalActivation.error).slice(0,250):'',
      verified:ready
    };
    return state.activation;
  }
  async function refresh(location=null) {
    if(state.busy)return {ok:false,code:'BUSY',state:emit()};
    state.busy=true;state.phase='refreshing';state.message='Refreshing from Cloudflare…';emit();
    try {
      if(!await isConnected())throw Object.assign(Error('Connect Cloudflare first.'),{code:'DISCONNECTED'});
      if (location) {
        if (typeof location.accountId!=='string'||typeof location.bucketName!=='string')
          throw Error('Choose an account and bucket.');
        // REDOWN: an open folder refreshes via 'list' and never provisions a Worker.
        const data=assertResult(await fileApi.run('list',{source:location}), 'Folder refresh');
        state.location={accountId:location.accountId,bucketName:location.bucketName,prefix:location.prefix||''};
        state.entries=Array.isArray(data.entries)?data.entries:[];
        state.cursor=String(data.cursor||'');
      } else {
        // REDOWN: when no location is active, discover real accounts and buckets.
        const data=assertResult(await fileApi.run('accounts',{}),'Account discovery');
        const accounts=Array.isArray(data.accounts)?data.accounts:[];
        const discovered=await Promise.all(accounts.map(async account=>{
          const b=assertResult(await fileApi.run('buckets',{accountId:account.id}),'Bucket discovery');
          if(!Array.isArray(b.buckets))throw Error('Cloudflare returned no valid bucket listing.');
          return b.buckets.map(bucket=>({accountId:account.id,bucketName:bucket.name}));
        }));
        state.accounts=accounts.map(a=>({id:a.id,name:a.name||a.id}));
        state.buckets=discovered.flat();
        state.location=null;state.entries=[];state.cursor='';
      }
      await updateActivation();
      state.phase='ready';state.message=location?'Folder refreshed from Cloudflare R2.':'Cloudflare accounts and buckets refreshed.';
      return {ok:true,state:emit()};
    } catch (error) {
      state.phase='failed';state.message=safeError(error);
      return {ok:false,code:error.code||'REFRESH_FAILED',state:emit()};
    } finally {state.busy=false;}
  }
  async function activate() {
    if(state.busy)return {ok:false,code:'BUSY',state:emit()};
    state.busy=true;state.phase='activating';state.message='Preparing REDOWN bucket Workers…';emit();
    try {
      if(!await isConnected())throw Object.assign(Error('Connect Cloudflare first.'),{code:'DISCONNECTED'});
      const current=await readActivation();
      const retryFailed=['partial','failed'].includes(current.globalActivation?.state);
      // Exact original REDOWN background action and opt-in confirmation flag.
      const result=await activateBuckets({type:'activateAllBuckets',confirmed:true,retryFailed});
      if(result?.ok!==true)throw Object.assign(Error(result?.error || 'Bucket activation was not confirmed.'),{code:result?.code||'ACTIVATION_FAILED'});
      await updateActivation();
      const status=state.activation.status;
      state.phase=status==='ready'?'ready':status==='running'?'activating':'partial';
      state.message=status==='ready'?'Buckets activated; Chrome confirmed the right-click menu.':
        status==='running'?'Bucket preparation is in progress.':'Some buckets still need attention. Review the result before retrying.';
      return {ok:status==='ready',state:emit()};
    } catch (error) {
      state.phase='failed';state.message=safeError(error);
      return {ok:false,code:error.code||'ACTIVATION_FAILED',state:emit()};
    } finally {state.busy=false;}
  }
  return Object.freeze({
    refresh,activate,updateActivation,
    setLocation: l=>{state.location=l?{...l}:null;return emit();},
    snapshot:()=>publicSnapshot(state),
    async hydrate(){await updateActivation();return emit();}
  });
}
