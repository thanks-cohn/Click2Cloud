import {observe,operationIdentity,errorOutcome} from '../core/boundary-observation.mjs';
// The same Chrome messaging and storage contract used by REDOWN Beta Explorer.
// This is a *host adapter*, not an independent Worker provisioner.
export function createRedownDashboardBridge({
  chromeApi=globalThis.chrome,
  cloudflareApi=globalThis.RedownCloudflareApi,
  pageUrl=globalThis.location?.href,
  diagnostics,context={}
}={}) {
  if(!chromeApi?.runtime?.sendMessage || !chromeApi?.storage?.local?.get)
    throw Object.assign(Error('Open this dashboard in an authorized Chrome extension with REDOWN services.'),{code:'REDOWN_RUNTIME_REQUIRED'});
  if(!cloudflareApi || typeof cloudflareApi.request!=='function' ||
     typeof cloudflareApi.boundedFetch!=='function')
    throw Object.assign(Error('REDOWN authenticated Cloudflare API transport is unavailable.'),{code:'REDOWN_AUTH_TRANSPORT_REQUIRED'});
  const scopeFor=()=>({...context,operationId:operationIdentity(context)});
  const send=async message=>{
    const scope=scopeFor();const signal=observe(diagnostics,'transport.send','started','TRANSPORT_STARTED',scope);
    try{const result=await chromeApi.runtime.sendMessage(message);observe(diagnostics,'transport.send',result?.ok===false?'failed':'ok',result?.ok===false?'TRANSPORT_REJECTED':'TRANSPORT_RETURNED',scope,[signal]);return result;}
    catch(error){observe(diagnostics,'transport.send',errorOutcome(error),'TRANSPORT_FAILED',scope,[signal]);throw error;}
  };
  const requiredSender=chromeApi.runtime.getURL('beta/explorer.html');
  const activePage=String(pageUrl||'').split(/[?#]/)[0];
  const activationHostReady=activePage===requiredSender;
  return Object.freeze({
    send,
    http:cloudflareApi,
    activationHostReady,
    // REDOWN production background guards this action to beta/explorer.html.
    // Deliberately fail closed until integration supplies the *same* authorized
    // sender capability. Never try an external extension-message bypass.
    async activateBuckets(message){
      if(!activationHostReady){observe(diagnostics,'activation.prepare','blocked','SENDER_DENIED',scopeFor());throw Object.assign(Error('Activation requires the authorized REDOWN Explorer host. Click2Cloud needs the production host integration before this button can operate.'),{code:'REDOWN_SENDER_REQUIRED'});}
      if(message?.type!=='activateAllBuckets'||message.confirmed!==true){
        observe(diagnostics,'activation.prepare','blocked','CONSENT_REQUIRED',scopeFor());
        throw Object.assign(Error('Explicit bucket activation confirmation required.'),{code:'INVALID_ACTIVATION'});}
      return send(message);
    },
    async readAuth(){
      const {cloudflareAuth}=await chromeApi.storage.local.get('cloudflareAuth');
      // The privileged controller receives the full auth object but never
      // publishes its token in snapshots, DOM, logs, URLs, or API responses.
      return cloudflareAuth||null;
    },
    async readActivation(){
      const s=await chromeApi.storage.local.get([
        'rightClickGlobalActivation','rightClickActivatedBuckets','profiles','rightClickMenuStatus'
      ]);
      return {
        globalActivation:s.rightClickGlobalActivation||null,
        activatedBuckets:s.rightClickActivatedBuckets?.buckets||[],
        profiles:s.profiles||[],
        menuStatus:s.rightClickMenuStatus||null
      };
    }
  });
}
