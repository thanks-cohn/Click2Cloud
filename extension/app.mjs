import {createAestheticHost} from '../src/aesthetic/host.mjs';
const aesthetic=createAestheticHost({root:document.documentElement,storage:chrome.storage?.local});
const aestheticReady=aesthetic.restore();
import {createHistoryPage} from './history-page.mjs';
import {manifestCard,mountManifestPanel} from './manifest-panel.mjs';
import {mountLoadingVisual} from '../src/explorer/loading-visual.mjs';
import {loadingMedia,LOADING_MEDIA_MAX_BYTES} from '../src/explorer/loading-visual-config.mjs';
import {levelHidden} from '../src/modes/nested/index.mjs';
import {isImage,galleryStep,createImageReader,readPreviewBytes} from '../src/explorer/image-preview.mjs';
import {installExplorerLayout} from './explorer-layout.mjs';
import {installShortcuts} from './shortcut-settings.mjs';
import {createExplorerExports,noteDownload} from './explorer-exports.mjs';
import {downloadJob} from '../src/explorer/download-archive.mjs';
import {selectedSetupReady,selectedSetupLabel,selectedSetupCode} from './cloudflare-setup-view.mjs';
let fileClipboard=null;
import {describeExplorerContextMenu} from '../src/api/explorer-context-menu.mjs';
import {cloudPath,parseCloudPath,middlePath} from '../src/explorer/location-view.mjs';
import {paintTrace} from '../src/explorer/performance.mjs';
import {applyConfigChanges} from '../src/api/config.mjs';
import {providerDefaults} from '../src/explorer/configuration.mjs';
import {createListingOrder,createListingReader,rowWindow,gridWindow} from '../src/explorer/listing-view.mjs';
import {ancestors,scopeKey,targetKey} from '../src/core/menu-identity.mjs';
import {createDebugPreference} from '../src/chrome/debug-preference.mjs';
const readinessNames={CLOUDFLARE_READY:'Ready to save',READY:'Ready to save',NOT_ACTIVATED:'R2 is unavailable. Correct it manually with Cloudflare, then Check again.',RECONNECT_REQUIRED:'Log in to reconnect Cloudflare.',INSUFFICIENT_PERMISSION:'Cloudflare did not grant the required access. Reconnect with the necessary permissions.',NETWORK_UNAVAILABLE:'Cloudflare could not be reached. Try again when the connection is available.',ACCOUNT_AMBIGUOUS:'Choose the Cloudflare account to use.',UNKNOWN:'R2 readiness is not confirmed. Retry Check R2 or review account permissions.',REPAIR_REQUIRED:'This destination needs its private save connection prepared or repaired.',SETUP_RESUME_REQUIRED:'Setup approval is saved. Resume the existing initialization when ready.',SETUP_APPROVAL_REQUIRED:'Approve initial setup to make Cloudflare saving ready.',CHOOSE_DESTINATION:'Choose a folder in Explorer and make it your default.',DESTINATION_UNAVAILABLE:'The selected destination is unavailable. Reconnect or choose another.'};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const connectionElement=$('#connection');
const shelfWindow=chrome.windows?.getCurrent?Promise.resolve().then(()=>chrome.windows.getCurrent()).then(w=>w.id).catch(()=>null):Promise.resolve(null);
const restoreConnection=()=>{if(connectionElement.parentElement!==document.querySelector('aside'))document.querySelector('aside').insertBefore(connectionElement,$('#tree'));};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const debugPreference=createDebugPreference(chrome);let debugMode=false;
function applyDebugMode(enabled){
 debugMode=enabled===true;document.documentElement.dataset.debugMode=debugMode?'on':'off';
 const active=document.activeElement,focusedPanel=active?.closest('[data-debug-only]'),debugControl=$('#debug-mode');
 for(const panel of $$('[data-debug-only]'))panel.hidden=!debugMode;
 if(debugControl)debugControl.checked=debugMode;
 $('#status').hidden=!debugMode||!$('#status').textContent;
 if(debugMode)return;
 if($('#shell').dataset.view==='downloads')void show('settings').catch(error=>status(error.message));
 const diagnosticDialog=$('#dialog').open&&$('#dialog').hasAttribute('data-debug-only-dialog');
 if(diagnosticDialog)closeDialog();
 if(focusedPanel||document.activeElement?.closest('[data-debug-only]')){
  const fallback=focusedPanel?.closest('#header-menu')?$('#header-menu [data-view="settings"]'):debugControl??$('#browse')??$('header [data-view="remotes"]');
  (fallback?.closest('[hidden]')?$('#header-more'):fallback)?.focus({preventScroll:true});
 }else if(diagnosticDialog)$('#header-more').focus({preventScroll:true});
}
debugPreference.subscribe(applyDebugMode);applyDebugMode(false);void debugPreference.ready.then(applyDebugMode);
function quietFeedback(value,attention){
 const feedback=$('#action-feedback');if(!feedback)return;
 const required=attention??(/^[A-Z][A-Z0-9_]+$/.test(value)&&!['READY','CLOUDFLARE_READY'].includes(value)||/could not|cannot|failed|not confirmed|not ready|not saved|uncertain|blocked|unavailable|required|denied|reconnect|needs attention|incomplete|conflict|missing|corrupt|not authorized|not prepared/i.test(value));
 if(required){feedback.textContent=/uncertain|not confirmed|unconfirmed|mismatch|interrupted/i.test(value)?'Save not confirmed. Check History before retrying.':/auth|token|reconnect|log in|sign.in|permission|scope/i.test(value)?'Reconnect Cloudflare or review access in Remotes.':/worker|setup|prepare|not ready/i.test(value)?'Prepare this destination in Remotes before saving.':/configuration|revision|generation|storage|current_/i.test(value)?'Configuration needs attention. Review the current panel before retrying.':'This action needs attention. Review the current panel or History.';feedback.hidden=false;}
 else if(/^Saving remotely/i.test(value)){feedback.textContent='Saving remotely…';feedback.hidden=false;}
 else if(!value||/saved|verified|ready to save|connected\.|cancelled/i.test(value)){feedback.hidden=true;feedback.textContent='';}
}
const status=(s,{attention}={})=>{const el=$('#status'),value=String(s??'');el.dataset.diagnostic='';el.dataset.code='';if(/^\d+ items|^Ready ·|^Saved \d+/.test(value)){el.hidden=true;el.textContent='';return;}const raw=/^[A-Z][A-Z0-9_]+$/.test(value);if(raw){el.dataset.code=value;el.dataset.diagnostic=value;}if(value.startsWith('Click2Cloud could not start'))el.dataset.diagnostic=value;el.textContent=raw?(names[value]??'The operation could not be completed. Inspect the relevant panel for details.'):value.startsWith('Click2Cloud could not start')?'Click2Cloud could not start. Your saved data was kept. Use Retry or inspect engine diagnostics.':value==='OK'?'The operation could not be confirmed.':value;el.hidden=!debugMode||!value;quietFeedback(value,attention);};
const names={DEFAULT_DESTINATION_UNAVAILABLE:'This location cannot be used as the default. Check access and menu visibility.',SAVED_DESTINATIONS_RESTORED:'Saved destinations restored',PROVENANCE_TOO_LARGE:'The selected menu snapshot and filenames exceed R2’s 2 KiB metadata limit. Shorten the menu titles or path; nothing was written.',PROVENANCE_INVALID:'The saved object’s menu metadata could not be validated. The save is not verified.',PROVENANCE_TARGET_MISMATCH:'The menu snapshot does not match the authorized destination. The save was stopped.',OBJECT_CHANGED:'The object changed while it was being read. Refresh and try again.',RANGE_RESPONSE_INVALID:'The object changed or its byte range could not be verified.',OBJECT_IDENTITY_UNAVAILABLE:'Cloudflare did not return a usable strong object identity. The read was stopped safely.',DOWNLOAD_WRITE_UNCONFIRMED:'The local file size did not match the R2 object. Download completion could not be verified.',R2_STATUS_UNKNOWN:'Cloudflare R2 access is not confirmed. Review the HTTP status and provider codes below, check selected-account R2 access, then log in again.',R2_CONFIRMED_INACTIVE:'Enable R2 for the selected account in Cloudflare, then log in again. No bucket or Worker was created.',INSUFFICIENT_SCOPE:'Cloudflare did not grant the required access. Update Cloudflare permissions and log in again; saved destinations remain.',NATIVE_APPLY_INCOMPLETE:'Cloudflare is prepared, but Chrome did not acknowledge the menu. Reload the existing extension and log in again; saved destinations remain.',ACCOUNT_AMBIGUOUS:'Use Review save setup in Remotes to choose the authorized Cloudflare account.',PROFILE_COPY_INVALID:'Choose the complete private profile copy produced by the local preservation tool.',PROFILE_COPY_MISMATCH:'The private copy no longer matches its verified manifest. No configuration was changed.',PROFILE_COPY_INCOMPLETE:'The selected copy is missing required extension storage evidence.',RECOVERY_PRESERVATION_REQUIRED:'Verify and attach your private profile copy before rebuilding.',REBUILD_REQUIRES_ABSENT_CONFIGURATION:'Surviving configuration needs validated recovery or review; it will not be replaced.',OWNER_CHOICES_REQUIRED:'Choose the new destination, mode and options explicitly.',PREVIOUS_BACKUP_REQUIRES_REVIEW:'The existing recovery folder was kept. Review it before changing the preservation location.',TRANSIENT_API_FAILURE:'Cloudflare could not be reached. Your saved connection and destinations were kept. Try Log in again when the network is available.',OAUTH_IDENTITY_UNVERIFIED:'Cloudflare account identity has not been verified. Use Check account authorization.',PROVIDER_AUTH_POLICY_DENIED:'Cloudflare denied sign-in. Review access for this account, then try Log in again.',OAUTH_CALLBACK_REJECTED:'The sign-in callback did not match the pending request. Start Log in again.',LOGIN_IN_PROGRESS:'A sign-in is already pending. Complete or cancel that provider window.',OAUTH_CANCELLED:'Sign-in cancelled. Your saved data was kept.',REAUTH_REQUIRED:'Cloudflare needs you to sign in again. Saved destinations and setup approval are kept.',TOKEN_EXPIRED:'Cloudflare needs you to sign in again. Saved destinations and setup approval are kept.',ENGINE_NO_RESPONSE:'The local service did not answer. Reopen the Shelf or inspect extension service-worker diagnostics; saved data was not changed.',ENGINE_RECEIVER_MISSING:'Chrome has not started the extension service yet. Try the control again.',ENGINE_RESPONSE_CHANNEL_CLOSED:'Chrome interrupted the local connection. Try the control again; no configuration was replaced.',ENGINE_MESSAGE_SEND_FAILED:'The local extension connection failed. Try the control again.',ENGINE_READ_TIMEOUT:'The local service is taking too long. Other independent controls remain available.',STORAGE_ACCESS_UNAVAILABLE:'Chrome credential storage is unavailable. Reopen the extension after checking browser storage policy; saved data was not replaced.',STORAGE_UNAVAILABLE:'Saved local configuration could not be read. Authentication is independent; do not clear extension storage.',CURRENT_READ_UNAVAILABLE:'Saved local configuration could not be read. Nothing was replaced. Inspect local storage diagnostics.',HTTP_401:'Your session needs to reconnect before this object can be read.',HTTP_403:'This object read was denied. Check the account and object-read permissions.',HTTP_404:'This object no longer exists at this location. Refresh the folder.',HTTP_429:'The provider is busy. Wait and retry the read.',WORKER_DESTINATION_SCOPE_REQUIRED:'The existing Worker is scoped to a different folder. Review bucket access in Remotes. Cloudflare resources are unchanged.',CONFIGURATION_CONFLICT:'Conflicting saved configuration versions require validated recovery. Setup stopped without replacing them.',CONFIGURATION_RECORD_MISSING:'Saved configuration records are missing. Stop setup and use validated recovery; existing data was not overwritten.',CONFIGURATION_CORRUPT:'Saved configuration could not be validated. Stop setup and use validated recovery.',SETUP_APPROVAL_RECORD_MISSING:'Previous setup is recorded, but its approval ledger is missing. Inspect or recover local setup records before approving new work.',WORKER_UPGRADE_APPROVAL_REQUIRED:'Update this existing destination’s Worker to match this Click2Cloud version and enable verified save metadata. Your session, bucket and saved choices are kept.',WORKER_FILE_API_REPAIR_REQUIRED:'Update this existing destination’s Worker to enable file actions. No file action was started.',OAUTH_REGISTERED_SCOPES_REJECTED:'Cloudflare rejected the nine registered permissions. Have the client owner confirm the saved registration; your existing connection and destinations were kept.',WORKER_CREATE_PERMISSION_REQUIRED:'Reauthorize Cloudflare with Workers Admin to create the pending Worker. Existing resources and setup approval were kept.',AUTHORIZATION_DENIED:'This save is not authorized. Check the destination and public HTTPS source.',SOURCE_DENIED:'This source is not eligible public HTTPS.',SOURCE_ADDRESS_DENIED:'The source resolves to a private or special-use network address.',SOURCE_EGRESS_UNAVAILABLE:'The source could not be read through Cloudflare’s HTTPS fetch. Inspect its source-stage diagnostic; no verified save was reported.',SOURCE_STALLED:'The source stopped making progress.',RESOURCE_BUSY:'Remote capacity is busy. No write was attempted; try a fresh click later.',R2_SINGLE_PUT_LIMIT:'This file exceeds the current conditional R2 upload service limit. Safe multipart completion is not verified.',OPERATION_INTERRUPTED:'This remote operation was interrupted. Inspect it before any new save.',SOURCE_UNAVAILABLE:'The remote source could not be read. No verified save was reported.',SIZE_LIMIT:'The source exceeds the supported remote-transfer limit.',BUFFER_LIMIT:'This source needs more buffering than the supported limit.',WRITE_UNCONFIRMED:'The write is uncertain. Inspect the destination before retrying.',RECONCILE_READ_ONLY:'The transfer result is uncertain. Inspect the receipt before retrying.',OPERATION_ALREADY_CLAIMED:'This operation was already submitted. Inspect its receipt; it was not replayed.',VERIFICATION_MISMATCH:'Destination verification did not match. Inspect before retrying.',TRANSPORT_UNAVAILABLE:'The private save connection could not be reached. Check Cloudflare setup/status.',PROVIDER_NOT_IMPLEMENTED:'This provider is not available yet. No file was saved.',REMOTE_SOURCE_REQUIRED:'Cloudflare saves require an eligible public HTTPS source; local file bytes are not uploaded.',REMOTE_EXPLORER_SOURCE_UNAVAILABLE:'This Explorer file has no authorized remote-fetch source. Cloudflare cannot stage it through the browser.',WORKER_SETUP_REQUIRED:'Prepare Cloudflare in Remotes before saving.',AUTH_REQUIRED:'Log in to browse this connection.',OAUTH_CANCELLED_OR_UNAVAILABLE:'Sign-in cancelled or unavailable. Retry when ready.',OAUTH_REDIRECT_SETUP_REQUIRED:'Connection setup required. The registered callback does not match this installation.',AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE:'Saving needs an authenticated Click2Cloud Worker transport. No bytes were uploaded.',EXTERNAL_RECOVERY_UNAVAILABLE:'Choose and authorize an external backup folder first.',REVISION_CONFLICT:'Configuration changed. Refresh and try again.',SCOPE_UNAUTHORIZED:'This account is not authorized.',PROVIDER_READ_FAILED:'The provider could not list this location. Retry Refresh.'};
let configurationIssue=null;
let state,connection={state:'UNKNOWN',accounts:[]},view='remotes',source=null,entries=[],selected=new Set(),history=[],historyAt=-1,cursor='',loading=false,sort={key:'displayName',direction:1},anchor=0,listingEpoch=0;
let filenameSearch=null,browseNeedsRefresh=false;
let explorerLayoutUI=null,layoutIntent=null,gallery=null,galleryReturnKey=null,previewAbort=null;
let suggestionDue=false,enteringExplorer=null,connectionEpoch=0,explorerShell,contextTicket=0,viewportWidth=800,viewportHeight=400,paintPending=false,presentationView=null,viewCommit=Promise.resolve(),addressWidth=0,listingAbort=null,explorerScroll=0;
const displayView=()=>presentationView??state.product.view;
const scheduleWindow=()=>{if(paintPending)return;paintPending=true;requestAnimationFrame(()=>{paintPending=false;if(view==='explorer')renderWindow();});};
// enterExplorer owns initial selection through the trusted API; the promise
// coalesces repeated tab clicks, and navigationEpoch protects newer user intent.
async function enterExplorer(){
 const epoch=navigationEpoch;if(enteringExplorer?.epoch===epoch)return enteringExplorer.promise;
 const attempt={epoch};enteringExplorer=attempt;
 attempt.promise=(async()=>{const r=await api('enterExplorer');if(view!=='explorer'||epoch!==navigationEpoch)return;await loadTree(r);if(view!=='explorer'||epoch!==navigationEpoch)return;
  if(r.target){await navigate(r.target,true,true);const slot=treeNodes.get(targetKey({...r.target,prefix:''}));if(slot){slot.button.setAttribute('aria-selected','true');slot.button.setAttribute('aria-expanded','true');slot.children.hidden=false;}const current=treeNodes.get(targetKey(r.target));if(current)syncTreePage(r.target,{entries,cursor,completeListing:!cursor});}
  else{loading=false;if(r.state==='RECONNECT_REQUIRED'){source=r.preferred??source??state.product.defaultTarget;listingError='Reconnect to browse. Saved locations are preserved.';$('#tree').textContent=source?'Saved location: '+source.bucketName+'/'+source.prefix+' · Reconnect to browse.':'Reconnect to browse saved locations.';}renderExplorer();status(r.state==='RECONNECT_REQUIRED'?'Reconnect to browse. Saved locations are preserved.':r.state==='CHOOSE_ACCOUNT'?'Choose a cloud account.':'Choose an available bucket.');}
 })().finally(()=>{if(enteringExplorer===attempt)enteringExplorer=null;});return attempt.promise;
}
let explorerAccountId=null;
let shelfRequest=null,cloudflareState=null,reconnectNeeded=false,confirmExplorerDelete=true;
const deletePreference='explorerConfirmDeleteV1';
void chrome.storage?.local?.get(deletePreference).then(v=>{confirmExplorerDelete=v?.[deletePreference]!==false;}).catch(()=>{});
const reconnectCodes=new Set(['AUTH_REQUIRED','REAUTH_REQUIRED','TOKEN_EXPIRED','HTTP_401','AUTH_SESSION_CHANGED','AUTHORIZATION_REVOKED']);
function reconnectAfter(code){
 if(!reconnectCodes.has(code)||reconnectNeeded)return;
 reconnectNeeded=true;
 void (async()=>{
  await connections();
  if(connection.state==='CONNECTED')return;
  if($('#dialog').open)closeDialog();
  await show('remotes');
 })().catch(error=>status(error.message));
}
const treeFolders=new Map(),treeNodes=new Map(),bucketTargets=[];let previewUrl,previewEpoch=0,navigationEpoch=0,focusIndex=0,listingError='',renderedWindow=null,capabilities=null,contextReturnElement=null,treeEpoch=0;
const listingOrder=createListingOrder();
const listingReader=createListingReader(async(t,cursor,signal,fresh)=>{
 const r=await api(fresh?'refreshExplorer':'listFolders',{source:t,...(cursor?{cursor}:{})},{quiet:true,signal});
 if(r.state!=='completed')throw Error(names[r.code]??r.code??'Provider listing unavailable.');
 return r.data;
},{ttlMs:0,maxPages:0});
async function api(method,params={}, {quiet=false,readTimeout=0,signal}={}) {
  signal?.throwIfAborted();
  let result,timer,abort;
  try{
   const sent=chrome.runtime.sendMessage({channel:'engine',version:'3+1.1',method,params});
   const pending=[sent];
   if(readTimeout)pending.push(new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error(),{code:'ENGINE_READ_TIMEOUT'})),readTimeout);}));
   if(signal)pending.push(new Promise((_,reject)=>{abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();}));
   result=pending.length>1?await Promise.race(pending):await sent;
  }
  catch(error){signal?.throwIfAborted();const message=String(error?.message??''),code=error?.code==='ENGINE_READ_TIMEOUT'?'ENGINE_READ_TIMEOUT':/receiving end does not exist|could not establish connection/i.test(message)?'ENGINE_RECEIVER_MISSING':/message port closed|channel closed|before a response/i.test(message)?'ENGINE_RESPONSE_CHANNEL_CLOSED':'ENGINE_MESSAGE_SEND_FAILED';const err=Object.assign(Error(code),{code,method,stage:'transport'});if(!quiet)status(code+' · '+method,{attention:true});throw err;}finally{clearTimeout(timer);if(abort)signal.removeEventListener('abort',abort);}
  signal?.throwIfAborted();
  if(result==null)throw Object.assign(Error('ENGINE_NO_RESPONSE'),{code:'ENGINE_NO_RESPONSE',method,stage:'transport'});
  if(typeof result!=='object'||!['completed','partial','failed','blocked','uncertain','cancelled'].includes(result.state))throw Object.assign(Error('ENGINE_RESPONSE_INVALID'),{code:'ENGINE_RESPONSE_INVALID',method,stage:'transport'});
  if(result.state!=='completed'&&!(result.state==='partial'&&result.data?.configuration)){const code=result.code??'ENGINE_REQUEST_FAILED';reconnectAfter(code);const err=Object.assign(Error(names[code]??code),{code,method,stage:result.diagnostic?.stage??'api',diagnostic:result.diagnostic});if(!quiet)status(err.message,{attention:true});throw err;}
  return result.data;
}
const explorerExports=createExplorerExports({api,esc,dialog,closeDialog,onPreferencesChange:hideContext});
const shortcuts=installShortcuts({
 invoke:(method,params)=>api(method,params,{quiet:true}),
 context:()=>({view,activeDirectory:!!source&&connection?.state==='CONNECTED'}),
 runUI:id=>explorerLayoutUI?.commands[id]?.(),
 runAPI:command=>{
  if(command.parameterBindings?.source!=='currentAuthorizedFolder'||command.method!=='refreshExplorer')return false;
  void refreshExplorerFolder()?.catch(error=>status(error.message));return true;
 },
 updateReferences:bindings=>explorerLayoutUI?.setShortcuts(bindings)
});
function recoveryCard(){return '<div class="card" role="status"><h2>Local configuration needs recovery</h2><p>'+esc(names[configurationIssue?.code]??configurationIssue?.code??'Saved configuration is unavailable.')+'</p><details><summary>Local service diagnostics</summary><pre id="local-diagnostics">'+esc(JSON.stringify(configurationIssue,null,2))+'</pre></details><p>Saved configuration cannot be trusted. Existing records and native menus are preserved. Login remains independent. Do not clear extension storage or uninstall.</p><button id="inspect-recovery">Inspect recovery</button><button id="attach-private-copy">Verify private profile copy</button><button id="rebuild-config">Rebuild with my choices</button><button id="read-local-state">Read saved configuration again</button><pre id="recovery-summary"></pre></div>';}
function bindRecovery(){listen('#attach-private-copy','click',attachPrivateCopy);listen('#rebuild-config','click',rebuildConfiguration);listen('#inspect-recovery','click',inspectRecovery);listen('#read-local-state','click',async()=>{await refreshState();await show(view);});}
async function inspectRecovery(){
 const health=await api('getEngineHealth');const preview=await api('requestRestorePreview');
 const summary={configuration:health.configuration,storage:health.storage,origin:health.origin,externalRecovery:health.externalRecovery,recovery:{available:preview.available,reason:preview.reason,provenance:preview.provenance,nativeSalvage:preview.nativeSalvage}};
 if($('#recovery-summary'))$('#recovery-summary').textContent=JSON.stringify(summary,null,2);
 if(!preview.available){status('Recovery blocked · '+(preview.reason??'NO_VALID_RECOVERY_POINT')+'. Preserve the original Chrome profile. Native menus are only a partial projection.');return;}
 dialog('Inspect verified recovery',`<p>Verified source: ${esc(preview.provenance)}.</p><p>${preview.configs.simple.destinations.length} Simple · ${preview.configs.nested.destinations.length} Narrow · ${preview.configs.depth.scopes.length} Depth scopes.</p><p>Restoring first retains a verified local evidence file in your previously authorized private backup folder. It preserves surviving records and does not change cloud files. Review the candidate locally before approving.</p><details><summary>Candidate configuration (private)</summary><pre>${esc(JSON.stringify({product:preview.product,configs:preview.configs},null,2))}</pre></details>`,`<div class="dialog-foot"><button id="cancel">Cancel</button><button id="restore-confirm">Preserve evidence and restore</button></div>`);
 listen('#cancel','click',closeDialog);listen('#restore-confirm','click',async()=>{const button=$('#restore-confirm');button.disabled=true;try{const result=await api('restoreRightClickMenu',{previewToken:preview.previewToken,...(state?{expectedRevision:state.product.revision}:{}),idempotencyKey:crypto.randomUUID()});await refreshState();closeDialog();await show(view);status(result.native?.state==='completed'?'Configuration restored · Chrome acknowledged. Reconnect the original account before saving.':'Configuration restored · native acknowledgement remains pending.');}catch(e){status(e.message);button.disabled=false;}});
}
async function attachPrivateCopy(){
 if(!window.showDirectoryPicker)throw Error('This browser cannot attach a private copy. Use the trusted local owner workflow.');
 status('Select the private copy produced with Chrome closed. Verifying every copied file; large profiles can take time.');
 const handle=await window.showDirectoryPicker({mode:'readwrite',id:'click2cloud-preserved-profile'}),{verifyProfileCopy}=await import('../src/persistence/profile-preservation.mjs'),{directoryFiles}=await import('../src/persistence/external-recovery.mjs');
 await verifyProfileCopy(directoryFiles(handle),chrome.runtime.id);
 const {createCurrentStore}=await import('../src/persistence/current-store.mjs'),local=createCurrentStore();try{await local.stageBackupRoot(handle);await api('chooseBackupLocation',{purpose:'rebuild'});}finally{await local.close();}
 status('Private copy readback verified and attached. Original configuration is still missing.');
}
async function rebuildConfiguration(){
 const identity=await api('getProviderConnections');if(identity.state!=='CONNECTED')throw Error('Log in before choosing the account for a new configuration.');
 dialog('Rebuild configuration · new owner choices',`<p>This does not restore your original settings. First close Chrome and make a verified private profile copy using the local preservation tool. Reopen this same profile, then use Verify private profile copy. No cloud resources will be created.</p><label>Account <select id="rebuild-account">${identity.accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name??a.id)+'</option>').join('')}</select></label><p>Review partial native evidence locally; modes, hidden destinations, Quick, Default and approval are unknown.</p><button id="native-clues">Review historical locations</button><pre id="native-clues-output"></pre><div id="rebuild-locations"></div><button id="add-rebuild-location">Add location</button><label><input type="checkbox" id="ack-rebuild"> I am choosing a new configuration and understand the original state has not been recovered.</label>`,`<div class="dialog-foot"><button id="rebuild-preview">Review exact new configuration</button></div>`);
 const add=()=>{const row=document.createElement('div');row.className='card';row.innerHTML='<label>Bucket <input data-bucket></label><label>Folder prefix (exact, empty for root) <input data-prefix></label><label>Label <input data-label></label><label>Mode <select data-mode><option value="simple">Simple</option><option value="nested">Narrow</option><option value="depth">Depth</option></select></label><label>Depth <input data-depth type="number" min="1" value="8"></label><label><input type="checkbox" data-quick>Quick</label><label><input type="checkbox" data-hidden>Hidden</label><label><input type="radio" name="rebuild-default" data-default>Default</label><button data-remove>Remove this draft row</button>';row.querySelector('[data-remove]').onclick=()=>row.remove();$('#rebuild-locations').append(row);};add();listen('#add-rebuild-location','click',add);
 listen('#native-clues','click',async()=>{const r=await api('requestRestorePreview',{rebuild:{accountId:$('#rebuild-account').value,changes:[],acknowledgeUnknown:true}});$('#native-clues-output').textContent=JSON.stringify({partial:r.nativePartial,unknown:r.unknown},null,2);});
 listen('#rebuild-preview','click',async()=>{
  if(!$('#ack-rebuild').checked)throw Error('Review and acknowledge reconstruction first.');const accountId=$('#rebuild-account').value,changes=[],scopes=[];
  for(const row of $$('#rebuild-locations > div')){const value=s=>row.querySelector(s),mode=value('[data-mode]').value,target={provider:'cloudflare',accountId,connectionId:'cloudflare:'+accountId,bucketName:value('[data-bucket]').value,prefix:value('[data-prefix]').value};if(mode==='depth')scopes.push({target,maxDepth:Number(value('[data-depth]').value)});else{changes.push({type:'createDestination',mode,target,quick:value('[data-quick]').checked,hidden:value('[data-hidden]').checked,...(value('[data-label]').value?{label:value('[data-label]').value}:{})});}if(value('[data-default]').checked)changes.push({type:'makeDefault',target});}
  if(scopes.length)changes.push({type:'setDepthDisplayBuckets',scopes});changes.push({type:'setShowInChrome',show:{simple:true,nested:true,depth:scopes.length>0,flat:false}});
  const rebuild={accountId,changes,acknowledgeUnknown:true},preview=await api('requestRestorePreview',{rebuild});if(!preview.available)throw Error(preview.reason);
  dialog('Confirm NEW configuration',`<p>REBUILT_WITH_OWNER_CONFIRMATION. Original hidden/mode/default/approval history is not recovered. These exact new values will be committed after verified private preservation. Provider readiness is separate.</p><pre>${esc(JSON.stringify({product:preview.product,configs:preview.configs},null,2))}</pre>`,`<div class="dialog-foot"><button id="apply-rebuild">Preserve preimage and commit my new configuration</button></div>`);
  const idempotencyKey=crypto.randomUUID();listen('#apply-rebuild','click',async()=>{const b=$('#apply-rebuild');b.disabled=true;try{const result=await api('restoreRightClickMenu',{rebuild,previewToken:preview.previewToken,idempotencyKey});await refreshState();closeDialog();await show('settings');status('New configuration rebuilt with your confirmation. Original state is not restored; remote saving is not verified. '+(result.native?.state==='completed'?'Chrome acknowledged.':'Chrome acknowledgement pending.'));}catch(e){b.disabled=false;throw e;}});
 });
}
listen('#help-diagnose','click',async()=>{
 if(!debugMode)return;
 dialog('Help · Diagnose · Review report','<p role="status">Preparing a local support report…</p>','',true);
 const title=$('#dialog-title'),report=await api('getEngineHealth',{view:'support'});
 if(!debugMode||!title.isConnected||!$('#dialog').open)return;
 dialog('Review support report',`<p>No private locations, account IDs, source URLs or files are included. Nothing has been transmitted. Copy only if you choose to share it.</p><pre>${esc(JSON.stringify(report,null,2))}</pre>`,`<div class="dialog-foot"><button id="copy-reviewed-report">Copy reviewed report</button><button id="save-diagnostics">Inspect save diagnostics</button></div>`,true);
 listen('#save-diagnostics','click',()=>remoteHistory());
 listen('#copy-reviewed-report','click',()=>navigator.clipboard.writeText(JSON.stringify(report,null,2)));
});
async function refreshState(options){const next=await api('getConfiguration',{},options);if(!state||next.product.revision>=state.product.revision)state=next;configurationIssue=null;document.documentElement.dataset.theme=state.product.theme;$('#theme').disabled=false;return state;}
const transientBootCodes=new Set(['STORAGE_UNAVAILABLE','CURRENT_READ_UNAVAILABLE','STORAGE_ACCESS_UNAVAILABLE','ENGINE_RECEIVER_MISSING','ENGINE_RESPONSE_CHANNEL_CLOSED','ENGINE_MESSAGE_SEND_FAILED','ENGINE_READ_TIMEOUT']);
async function readWithRetry(fn){try{return await fn();}catch(error){if(!transientBootCodes.has(error.code)&&!transientBootCodes.has(error.diagnostic?.causeCode))throw error;await new Promise(ok=>setTimeout(ok,100));return fn();}}
async function change(changes,{confirmed=false,expectedRevision=state.product.revision,idempotencyKey=crypto.randomUUID(),prepareModes}={}) {
  if(!Array.isArray(changes))changes=[changes];
  if(changes.some(c=>c.type==='deleteDestinationConfig')&&!confirmed)return;
  const r=await api('commitConfigChange',{changes,expectedRevision,idempotencyKey,...(prepareModes?{prepareModes}:{})});
  if(r.configuration.product.revision>=state.product.revision)state=r.configuration;document.documentElement.dataset.theme=state.product.theme;
  if(changes.some(c=>['createDestination','updateDestination','deleteDestinationConfig','setProviderPlacement','setProviderMenuVisibility','setShowInChrome'].includes(c.type))){suggestionDue=true;if(view==='explorer')void suggestion();}
  const blocked=r.destinationReadiness?.find(d=>d.state!=='READY');
  if(blocked){cloudflareState={state:'REPAIR_REQUIRED',...blocked,accountId:blocked.target.accountId};status('Configuration saved · Destination unavailable · '+(names[blocked.code]??blocked.code)+'');}
  else status(r.native?.state==='completed'?(prepareModes&&r.destinationReadiness?.length?'Saved · Ready for right-click':'Saved · Chrome menu acknowledged')+(r.backup?.state==='BLOCKED'?' · External backup unavailable':''):'Saved · Native menu pending or incomplete');
  return r;
}
function listen(selector,event,fn){$(selector)?.addEventListener(event,e=>{try{Promise.resolve(fn(e)).catch(error=>status(error.message,{attention:true}));}catch(error){status(error.message,{attention:true});}});}
function closeDialog(){stopGalleryVisual();const returnKey=galleryReturnKey;gallery=null;galleryReturnKey=null;previewAbort?.abort();previewEpoch++;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}$('#dialog').close();if(returnKey&&view==='explorer'){const i=listingOrder.index(returnKey);if(i!==undefined){focusIndex=i;focusRow(i);}}}
function dialog(title,body,footer='',debugOnly=false) {
  const wasOpen=$('#dialog').open,focusedId=$('#dialog').contains(document.activeElement)?document.activeElement.id:null;
  $('#dialog').toggleAttribute('data-debug-only-dialog',debugOnly);
  hideContext();if(gallery&&!body.includes('data-gallery')){stopGalleryVisual();gallery=null;galleryReturnKey=null;previewAbort?.abort();}$('#dialog-content').innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2><button id="close-dialog" aria-label="Close">×</button></div><div class="dialog-body">${body}</div>${footer}`;
  listen('#close-dialog','click',closeDialog);if(!$('#dialog').open)$('#dialog').showModal();else if(wasOpen){const previous=focusedId&&document.getElementById(focusedId);(previous&&!previous.disabled?previous:$('#close-dialog')).focus({preventScroll:true});}
}
async function connections() {
  const ticket=++connectionEpoch;let next;try{next=await readWithRetry(()=>api('loginStatus',{}, {quiet:true,readTimeout:5000}));}catch(error){next={state:'UNAVAILABLE',accounts:[],diagnostic:{code:error.code??'AUTH_STATUS_UNAVAILABLE'}};}if(ticket!==connectionEpoch)return;const before=JSON.stringify([connection?.state,connection?.accounts]);connection=next;if(connection.state==='CONNECTED')reconnectNeeded=false;
  if(reconnectCodes.has(connection.diagnostic?.code)||connection.state==='DISCONNECTED'&&connection.identityVerified)reconnectNeeded=true;
  if(reconnectNeeded&&view==='explorer')void show('remotes').catch(error=>status(error.message));
  imageReader.clear();clearThumbnails();if(before!==JSON.stringify([connection.state,connection.accounts])){navigationEpoch++;previewEpoch++;if(filenameSearch){resetFilenameSearch();selected.clear();focusIndex=0;anchor=0;}if(previewUrl||$('#preview-state'))closeDialog();listingReader.invalidate();imageReader.clear();clearThumbnails();treeFolders.clear();treeEpoch++;treeNodes.clear();$('#tree').replaceChildren();bucketTargets.length=0;if(connection.state!=='CONNECTED'){navigationEpoch++;listingEpoch++;entries=[];selected.clear();loading=false;listingError='Reconnect to browse. Saved locations are preserved.';if(view==='explorer'){renderExplorer();$('#tree').textContent=source?'Saved location: '+source.bucketName+'/'+source.prefix+' · Reconnect to browse.':'Reconnect to browse saved locations.';}}}
  renderConnection();if(view==='explorer'&&state&&connection.state==='CONNECTED'&&before!==JSON.stringify([connection.state,connection.accounts]))await enterExplorer();
}
function renderConnection(){
  connectionElement.innerHTML=`${view==='remotes'?'':'<strong>☁ Cloudflare</strong>'}<p class="muted" ${connection.state==='CONNECTED'?'data-aesthetic-text="remotes.connected-caption"':''}>${esc(connection.state==='CONNECTED'?'Connected':connection.state==='CONNECTING'?'Signing in…':connection.state==='VERIFYING'?'Authorization received; account verification pending':connection.state==='DISCONNECTED'?'Not connected':connection.state==='UNKNOWN'?'Checking connection…':'Connection status unavailable')}</p>${connection.diagnostic?.code?'<p class="muted">Connection unavailable · '+esc(connection.diagnostic.code)+'</p>':''}${connection.state==='CONNECTED'?'<button id="browse">Open File Explorer</button><button id="sign-out">Sign out</button>'+(connection.permissions?.needsReconsent?'<button id="reauthorize">Update Cloudflare permissions</button>':''):connection.state==='CONNECTING'?'<button id="cancel-login">Cancel sign-in</button>':connection.state==='VERIFYING'?'<button id="verify-login">Check account authorization</button>':reconnectNeeded?'<button id="login" class="reconnect-needed">Reconnect</button>':'<button id="login">Log in</button>'}`;
  listen('#sign-out','click',async()=>{await api('disconnect');cloudflareState=null;await connections();if(view==='remotes')renderRemotes();status('Signed out. Saved destinations remain.');});listen('#reauthorize','click',()=>login('#reauthorize'));listen('#verify-login','click',()=>login('#verify-login',{verifyOnly:true}));listen('#login','click',()=>login());listen('#cancel-login','click',async()=>{await api('loginCancel');await connections();});listen('#browse','click',async()=>{await show('explorer');});
}
async function login(selector='#login',params={}) {
  const intent=viewEpoch;
  $(selector)?.setAttribute('disabled','');status('Complete the provider sign-in to connect Cloudflare.');
  const pending=api('loginBegin',params);
  // Status reflects the pending attempt; it never initiates scans or navigation.
  setTimeout(()=>void connections().catch(()=>{}),250);
  try{const result=await pending;cloudflareState=result.initialization??null;if(cloudflareState?.state==='completed')await finishCloudflareSetup(cloudflareState,selectedCloudflareTarget());status(result.state==='CONNECTED'?(cloudflareState?.selectedReady?'Prepared and verified · make a new right-click to save.':cloudflareState?'Cloudflare connected · '+(names[cloudflareState.code]??cloudflareState.code)+' · '+(cloudflareState.stage??'cloudflare-initialization'):'Cloudflare connected.'):result.state==='VERIFYING'?'Authorization received; account verification pending.':'Cloudflare sign-in is still in progress.');}catch(error){status(error.message);}finally{await connections();if(view==='remotes'&&intent===viewEpoch)renderRemotes();}
}
function workerFailureMarkup(d){
 if(d?.context==='r2')return `<p role="alert">R2 bucket discovery · HTTP ${esc(d.httpStatus??'not received')} · Cloudflare codes ${esc((d.providerCodes??[]).join(', ')||'not returned')}. ${esc(names[d.code]??'Check R2 access for the selected Cloudflare account, then log in again.')}</p>`;
 if(d?.kind!=='cloudflare-worker-access')return '';
 const upgraded=connection?.permissions?.needsReconsent===false&&!d.sessionScopes.includes('workers-scripts.admin'),action=upgraded?'The updated authorization has been requested. Resume the existing setup once to verify its actual authority; no new setup approval is needed.':d.correctiveAction;
 return `<div class="card"><p class="minimal-only" role="alert">Cloudflare access needs review.</p><p data-aesthetic-text="status.verbose-technical-detail" role="alert">${esc(action)}</p><p data-aesthetic-text="status.verbose-technical-detail">${esc(d.method)} ${esc(d.endpoint)} · HTTP ${esc(d.httpStatus??'not received')} · Cloudflare codes ${esc(d.providerCodes.join(', ')||'not returned')}</p><details><summary>Safe Cloudflare diagnostics</summary><pre id="cf-worker-diagnostics">${esc(JSON.stringify(d,null,2))}</pre></details>${!upgraded&&(d.missingScopes?.includes('workers-scripts.admin')||d.workerIntent==='create'&&!d.sessionScopes.includes('workers-scripts.admin'))?'<button id="reauthorize-worker">Reauthorize Cloudflare</button>':''}<button id="resume-worker">Resume existing setup after correction</button></div>`;
}
async function resumeWorkerSetup(){
 const button=$('#resume-worker')??$('#cf-authorize')??$('#prepare-selected');if(button)button.disabled=true;
 const target=selectedCloudflareTarget();
 try{const out=target?await api('recoverCloudflareDestination',{target,authorizeSetup:false}):await api('initializeCloudflare',{resume:true});await finishCloudflareSetup(out,target);}
 catch(e){cloudflareState={state:'PROVISIONING_BLOCKED',code:e.code,diagnostic:e.diagnostic,...(target?{target,accountId:target.accountId}:{})};renderRemotes();status('Not saved · '+(e.code??'SETUP_FAILED')+' · '+e.message);}
}
function selectedCloudflareTarget(){return shelfRequest?.provider==='cloudflare'&&shelfRequest.target?shelfRequest.target:cloudflareState?.target??null;}
function selectedSetupMarkup(){
 const target=shelfRequest?.provider==='cloudflare'&&shelfRequest.target;if(!target)return '';
 const code=cloudflareState?.target&&targetKey(cloudflareState.target)===targetKey(target)?cloudflareState.code??cloudflareState.worker?.code??cloudflareState.state:shelfRequest.code;
 const verified=cloudflareState?.selectedReady===true&&cloudflareState?.target&&targetKey(cloudflareState.target)===targetKey(target),approval=['SETUP_APPROVAL_REQUIRED','SETUP_APPROVAL_RECORD_MISSING','WORKER_UPGRADE_APPROVAL_REQUIRED','WORKER_BUILD_MISMATCH','CAPABILITY_DENIED','WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED'].includes(code),label=selectedSetupLabel(target,connection?.accounts);
 return `<div class="card" id="selected-save-setup"><h2>Selected save destination</h2><p>${esc(label)}</p><p role="status">${verified?'Prepared and verified · make a new right-click to save.':'<span class="minimal-only">Save unavailable.</span><span data-aesthetic-text="status.verbose-technical-detail">Not saved · '+esc(code??'WORKER_SETUP_REQUIRED')+' · '+esc(names[code]??readinessNames[code]??'Prepare this selected destination, then make a new right-click.')+'</span>'}</p>${code==='WORKER_DESTINATION_SCOPE_REQUIRED'?'<button id="authorize-selected">Authorize bucket access</button>':verified?'':`<p>Preparation uses this exact bucket and folder. Cloudflare may charge for Worker/R2 usage and a small retained verification file. The original source is not replayed.</p><button id="prepare-selected">Inspect / prepare selected destination</button>${approval?'<button id="authorize-selected">Authorize selected destination</button>':''}`}</div>`;
}
// recover/approve owns remote changes. Re-read the exact scoped transport and
// native ACK afterward; never turn an outer completed response into UI READY.
async function finishCloudflareSetup(out,requestedTarget){
 const target=requestedTarget??out.target;
 const stillSelected=()=>!target||!shelfRequest?.target||targetKey(shelfRequest.target)===targetKey(target);
 if(!stillSelected())return out;
 cloudflareState={...out,...(target?{target,accountId:target.accountId}:{}),selectedReady:false};
 await refreshState();
 if(!stillSelected())return out;
 if(out.state==='completed'&&target){
  const readiness=await api('checkCloudflareR2',{accountId:target.accountId,target},{quiet:true}),native=await api('inspectNativeACK',{}, {quiet:true}),ready=selectedSetupReady(target,readiness,native);
  if(!stillSelected())return out;
  cloudflareState={...out,...readiness,target,accountId:target.accountId,selectedReady:ready,state:ready?'completed':'blocked',code:ready?'CLOUDFLARE_READY':readiness.code??readiness.worker?.code??(readiness.state==='READY'?'NATIVE_APPLY_INCOMPLETE':readiness.state)};
 }
 if(shelfRequest&&(!requestedTarget||shelfRequest.target&&targetKey(shelfRequest.target)===targetKey(requestedTarget)))shelfRequest={...shelfRequest,code:cloudflareState.code};
 renderRemotes();status(cloudflareState.selectedReady?'Prepared and verified · the original click did not save. Make a new right-click to save to '+selectedSetupLabel(target,connection?.accounts)+'.':'Not saved · '+(cloudflareState.code??'SETUP_NOT_VERIFIED')+' · '+(names[cloudflareState.code]??readinessNames[cloudflareState.code]??'Review the selected destination and required action.'));
 return cloudflareState;
}
function workerUpdateMarkup(readiness){
 const code=readiness?.code??readiness?.worker?.code;
 if(code==='WORKER_DESTINATION_SCOPE_REQUIRED'&&readiness?.target)return '<p role="alert">Save unavailable. Approve access for this bucket to continue.</p><button id="update-worker">Authorize bucket access</button>';
 if(readiness?.target&&['CAPABILITY_DENIED','WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED'].includes(code))return '<p>The private save connection needs signing-key renewal. Renewal affects the shared Worker for every folder in this exact bucket. Cloud objects and saved destinations are kept. Cloudflare usage may be billed.</p><button id="update-worker">Authorize private connection renewal</button>';
 return readiness?.target&&['WORKER_UPGRADE_APPROVAL_REQUIRED','WORKER_BUILD_MISMATCH'].includes(code)?'<p>Update code in the existing Worker and verify readback. Keep this bucket, destination and saved setup approval. Cloudflare usage may be billed.</p><button id="update-worker">Update existing Worker</button>':'';
}
function ordinarySetupReview(){
 if(connection?.state!=='CONNECTED'||shelfRequest?.target)return '';
 const code=cloudflareState?.code??cloudflareState?.state??shelfRequest?.code;
 return ['SETUP_RESUME_REQUIRED','SETUP_APPROVAL_RECORD_MISSING','REPAIR_REQUIRED','WORKER_SETUP_REQUIRED','ACCOUNT_AMBIGUOUS','CHOOSE_DESTINATION','DESTINATION_UNAVAILABLE','NOT_ACTIVATED','R2_CONFIRMED_INACTIVE'].includes(code)
  ?'<button id="review-selected">Review save setup</button>':'';
}
function renderRemotes(){
  if(view!=='remotes')return;
  connectionElement.remove();
  $('#main').innerHTML=`<section class="page"><h1 class="remotes-headline">The Future is Now. True Remote is Here.</h1><p class="remotes-subtitle">Nothing ever gets downloaded to your computer.</p>${configurationIssue?recoveryCard():''}<p class="muted" data-aesthetic-text="remotes.intro-copy">Connect an account, browse its folders, and choose where to save.</p><div class="card"><h2>☁ Cloudflare R2</h2><p data-aesthetic-text="remotes.intro-copy">${connection?.state==='CONNECTED'?'Signed in to Cloudflare.':'Log in below to connect your account.'}</p>${connection?.state==='CONNECTED'&&!connection.permissions?.needsReconsent||['CONNECTING','VERIFYING'].includes(connection?.state)?'':'<p class="muted">Login or updating access may prepare or reuse a private save Worker and write a small verification file. Cloudflare may charge for this usage.</p>'}<div id="remotes-connection"></div></div>${selectedSetupMarkup()}<p role="status" data-aesthetic-text="status.verbose-technical-detail">${esc(cloudflareState?.state==='completed'&&cloudflareState?.code==='CLOUDFLARE_READY'?(cloudflareState.selectedReady?'Prepared and verified · make a new right-click to save.':'Cloudflare setup completed; inspect the selected destination before saving.'):names[cloudflareState?.code]??cloudflareState?.code??'')}</p>${connection?.state==='CONNECTED'&&cloudflareState?.code==='SETUP_APPROVAL_REQUIRED'?'<p>Automatic setup needs your approval: prepare the selected account’s destinations, create/reuse redown only when none exist, and verify a small retained file. Cloudflare may charge for usage.</p><button id="authorize-setup">Authorize automatic setup</button>':''}${workerUpdateMarkup(cloudflareState)}${workerFailureMarkup(cloudflareState?.diagnostic)}${ordinarySetupReview()}<div class="remote-diagnostic-actions" data-debug-only hidden><button id="cloudflare-setup">Cloudflare status</button><button id="remote-history">Save results</button></div><p id="remote-summary" role="status" data-aesthetic-text="remotes.previous-result-detail"></p><p id="remote-summary-attention" role="status" hidden></p><p class="muted" data-aesthetic-text="remotes.provider-description">Google Drive, Dropbox and OneDrive are not available yet.</p><div id="future-providers"><button data-placeholder="google-drive">Google Drive</button><button data-placeholder="dropbox">Dropbox</button><button data-placeholder="onedrive">OneDrive</button></div></section>`;
  $('#remotes-connection').append(connectionElement);connectionElement.hidden=false;renderConnection();
  listen('#update-worker','click',()=>authorizeCloudflare(cloudflareState.accountId,cloudflareState.target));listen('#reauthorize-worker','click',()=>login('#reauthorize-worker'));listen('#resume-worker','click',resumeWorkerSetup);listen('#authorize-setup','click',()=>authorizeCloudflare(cloudflareState.accountId,selectedCloudflareTarget()));listen('#prepare-selected','click',resumeWorkerSetup);listen('#review-selected','click',cloudflarePanel);listen('#authorize-selected','click',()=>authorizeCloudflare(selectedCloudflareTarget()?.accountId,selectedCloudflareTarget()));listen('#cloudflare-setup','click',()=>{if(debugMode)return cloudflarePanel();});listen('#remote-history','click',()=>{if(debugMode)return show('history');});applyDebugMode(debugMode);$$('[data-placeholder]').forEach(b=>b.onclick=()=>api('invokeProviderAction',{provider:b.dataset.placeholder,idempotencyKey:crypto.randomUUID()}).catch(e=>status(e.message)));
  listen('#open-explorer','click',async()=>{await show('explorer');});
  const summary=$('#remote-summary'),concise=$('#remote-summary-attention');void api('inspectRemoteHistory',{}, {quiet:true}).then(rows=>{const last=rows.find(r=>r.kind!=='readiness');if(view==='remotes'&&summary?.isConnected&&last)summary.textContent=(last.state==='verified'?'Saved and verified.':last.state==='pending'?'Saving…':last.state==='uncertain'?'Save uncertain. Inspect before retrying.':'Not saved.')+(names[last.code]?' '+names[last.code]:'');
   if(concise?.isConnected&&last&&['pending','uncertain','failed','blocked','partial'].includes(last.state)){
    concise.textContent=last.state==='pending'?'Saving…':last.state==='uncertain'||last.state==='partial'?'Save unconfirmed. Check History before retrying.':'Save unavailable. Check History for details.';
    concise.hidden=false;
   }
  }).catch(()=>{});
  bindRecovery();
}
async function focusShelf(){
 const request=await api('inspectShelfAttention',{}, {quiet:true});shelfRequest=request;
 if(request?.provider==='cloudflare'&&request.target){
  try{const readiness=await api('checkCloudflareR2',{accountId:request.target.accountId,target:request.target},{quiet:true}),native=readiness.state==='READY'?await api('inspectNativeACK',{}, {quiet:true}):null;if(shelfRequest!==request)return false;const ready=selectedSetupReady(request.target,readiness,native);cloudflareState={...readiness,target:request.target,accountId:request.target.accountId,selectedReady:ready,code:ready?'CLOUDFLARE_READY':selectedSetupCode(readiness,request.code)};}
  catch(error){if(shelfRequest===request)cloudflareState={state:'PROVISIONING_BLOCKED',code:error.code,diagnostic:error.diagnostic,target:request.target,accountId:request.target.accountId};}
 }
 if(view==='remotes'&&$('#remotes-connection')){renderRemotes();if(request)status(cloudflareState?.selectedReady?'Prepared and verified · the original click did not save. Make a new right-click for the selected destination.':'Not saved · '+(cloudflareState?.code??request.code??'ATTENTION_REQUIRED')+' · '+(names[cloudflareState?.code??request.code]??readinessNames[cloudflareState?.code??request.code]??'Inspect or prepare the selected destination below.'));}return false;
}
async function loadTree(initial=null){
  const ticket=++treeEpoch;$('#tree').textContent='Loading accounts…';bucketTargets.length=0;treeNodes.clear();
  try {
    const a=initial?{state:'completed',data:{accounts:initial.accounts}}:await api('listAccounts');if(ticket!==treeEpoch)return;if(a.state!=='completed')throw Error(names[a.code]??a.code??'Unable to list accounts.');
    $('#tree').replaceChildren();
    for(const account of a.data.accounts) {
      const branch=document.createElement('div'),button=document.createElement('button'),children=document.createElement('div');children.className='children';button.textContent='▸ '+account.name;button.setAttribute('role','treeitem');button.setAttribute('aria-expanded','false');branch.append(button,children);$('#tree').append(branch);treeKeyboard(button,children);
      button.dataset.accountId=account.id;button.onclick=async()=>{explorerAccountId=account.id;if(button.getAttribute('aria-expanded')==='true'){children.hidden=true;button.setAttribute('aria-expanded','false');return;}children.hidden=false;button.setAttribute('aria-expanded','true');if(children.childElementCount)return;
        try{let next='';do {const r=initial?.accountId===account.id?{state:'completed',data:{buckets:initial.buckets,cursor:''}}:await api('listAuthorizedBuckets',{accountId:account.id,...(next?{cursor:next}:{})});if(ticket!==treeEpoch||!button.isConnected)return;if(r.state!=='completed')throw Error(names[r.code]??r.code??'Bucket listing failed.');for(const b of r.data.buckets){const t={provider:'cloudflare',connectionId:'cloudflare:'+account.id,accountId:account.id,bucketName:b.name,prefix:''};bucketTargets.push(t);treeNode(children,t,b.name);}next=r.data.cursor??'';}while(next);}catch(error){status(error.message);}
      };
      if(initial?.accountId===account.id)await button.onclick();
    }
  }catch(error){$('#tree').textContent=error.message;}
}
function treeKeyboard(button,children){
 children.setAttribute('role','group');button.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();
  if(e.key==='ArrowRight'){if(button.getAttribute('aria-expanded')!=='true')button.click();else children.querySelector('button')?.focus();}
  else if(e.key==='ArrowLeft'){if(button.getAttribute('aria-expanded')==='true'){children.hidden=true;button.setAttribute('aria-expanded','false');}else button.parentElement.parentElement.closest('.children')?.parentElement.querySelector(':scope > button')?.focus();}
  else {const items=$$('#tree button[role="treeitem"]').filter(x=>x.getClientRects().length),i=items.indexOf(button),n=e.key==='Home'?0:e.key==='End'?items.length-1:Math.max(0,Math.min(items.length-1,i+(e.key==='ArrowDown'?1:-1)));items[n]?.focus();}
 };
}
function syncTreePage(t,data){
 const slot=treeNodes.get(targetKey(t));if(!slot)return;slot.more?.remove();
 if(data.completeListing){const present=new Set(data.entries.filter(e=>e.folder).map(e=>e.key));for(const key of slot.keys)if(!present.has(key)){slot.nodes.get(key)?.remove();slot.nodes.delete(key);slot.keys.delete(key);}for(const [key,node] of treeNodes)if(!node.children.isConnected)treeNodes.delete(key);}
 for(const f of data.entries.filter(e=>e.folder))if(!slot.keys.has(f.key)){slot.keys.add(f.key);slot.nodes.set(f.key,treeNode(slot.children,{...t,prefix:f.key},f.displayName??f.key));}
 if(data.cursor){const more=document.createElement('button');slot.more=more;more.textContent='Load more folders';more.onclick=async()=>{more.disabled=true;try{const next=await listingReader.page(t,data.cursor);syncTreePage(t,next);}catch(e){status(e.message);more.disabled=false;}};slot.children.append(more);}
}
function treeNode(parent,t,label){
 const node=document.createElement('div'),button=document.createElement('button'),children=document.createElement('div');children.className='children';children.hidden=true;button.textContent='▸ 📁 '+label;button.setAttribute('role','treeitem');button.setAttribute('aria-expanded','false');node.append(button,children);parent.append(node);treeKeyboard(button,children);
 treeNodes.set(targetKey(t),{button,children,keys:new Set(),nodes:new Map()});
 button.onclick=async()=>{const expand=button.getAttribute('aria-expanded')!=='true';children.hidden=!expand;button.setAttribute('aria-expanded',String(expand));if(!expand)return;try{await navigate(t);}catch(e){status(e.message);}};
 button.oncontextmenu=e=>{e.preventDefault();contextFor(t,null,e.clientX,e.clientY);};return node;
}
async function revealListedFile(key,target){
 if(view!=='explorer'||!source||targetKey(source)!==targetKey(target))return;
 const ticket=navigationEpoch,seen=new Set();
 while(!entries.some(e=>e.key===key)&&cursor){if(seen.has(cursor))throw Error('PAGINATION_STALLED');seen.add(cursor);await loadListing(true);if(ticket!==navigationEpoch||view!=='explorer'||filenameSearch)return;}
 if(filenameSearch)return;
 if(!entries.some(e=>e.key===key)){selected.clear();updateSelection();status('This file is unavailable in the listing. Refresh or reconnect before trying again.',{attention:true});throw Error('RESULT_NOT_FOUND');}
 selected=new Set([key]);ordered();focusIndex=listingOrder.index(key);updateSelection();focusRow(focusIndex);
}
const historyUI=createHistoryPage({api,loadingSelection:getGalleryVisualSelection,goTo:async operationId=>{
 const result=await api('openRemoteResult',{operationId},{quiet:true});
 closeDialog();selected.clear();await navigate(result.target);await revealListedFile(result.highlightKey,result.target);
}});
let viewEpoch=0;
const displayedEntries=()=>filenameSearch?.entries??entries;
function resetFilenameSearch(){
 filenameSearch?.controller.abort();filenameSearch=null;
 const input=explorerShell?.querySelector('#filename-search')??$('#filename-search');if(input)input.value='';
}
function clearFilenameSearch(){
 const wasSearching=!!filenameSearch;resetFilenameSearch();
 if(!wasSearching)return;
 selected.clear();focusIndex=0;anchor=0;hideContext();$('#files').scrollTop=0;
 renderAddress();renderFiles();
 if(browseNeedsRefresh)void loadListing();
}
async function searchDirectoryNames(query,{more=false,refresh=false,keepPrevious=false}={}){
 if(!query.trim())return;
 if(!source||view!=='explorer'||connection.state!=='CONNECTED')return;
 const previous=filenameSearch,pageToken=more?previous?.result?.nextPageToken:null;
 if(more&&(!pageToken||previous.loading))return;
 const keep=previous?.query===query&&(more||refresh||keepPrevious);
 const controller=new AbortController(),target=structuredClone(source);
 previous?.controller.abort();
 const current={query,entries:keep?previous.entries:[],result:keep?previous.result:null,error:'',loading:true,controller};
 filenameSearch=current;
 if(refresh)browseNeedsRefresh=true;
 if(!keep){selected.clear();focusIndex=0;anchor=0;$('#files').scrollTop=0;}
 hideContext();renderAddress();renderFiles();
 try{
  const result=await api('searchDirectoryNames',{source:target,query,...(pageToken?{pageToken}:{}),...(refresh?{refresh:true}:{})},{quiet:true,signal:controller.signal});
  if(controller.signal.aborted||filenameSearch!==current||targetKey(target)!==targetKey(source))return;
  if(!Array.isArray(result?.entries))throw Error('Search response unavailable.');
  current.entries=more?[...new Map([...current.entries,...result.entries].map(entry=>[entry.key,entry])).values()]:result.entries;
  current.result=result;
  if(keep&&!more){const remaining=new Set(current.entries.map(entry=>entry.key));selected=new Set([...selected].filter(key=>remaining.has(key)));focusIndex=0;anchor=0;}
 }catch(error){
  if(!controller.signal.aborted){
   if(keep&&!more&&current.result)current.result={...current.result,stale:true,nextPageToken:null};
   current.error=/STALE|CURSOR|TOKEN/.test(error.code??'')?'Search results changed. Use Refresh to search again.':names[error.code]??'Filename search unavailable. Use Refresh to try again.';
  }
 }finally{
  if(filenameSearch===current){current.loading=false;if(view==='explorer'){renderAddress();renderFiles();}}
 }
}
function searchCaption(search){
 const {result,error,loading}=search,count=search.entries.length;
 if(!result)return error||'Searching filenames…';
 const provenance=result.source==='offline'?'Offline · last known':result.stale?'Stale inventory':result.source==='cache'?'Cached':result.source==='cloud'?'Cloud listing':'';
 const time=Number.isFinite(result.asOf)?'As of '+new Date(result.asOf).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'';
 return [`${count} ${count===1?'match':'matches'} shown`,selected.size?`${selected.size} selected`:'',result.complete?'':'Partial inventory',provenance,time,
  error||(loading||result.refreshing?'Updating…':'')].filter(Boolean).join(' · ');
}
function reloadCurrentDirectory(){
 if(!filenameSearch)return loadListing();
 browseNeedsRefresh=true;
 return searchDirectoryNames(filenameSearch.query,{keepPrevious:true});
}
function markCurrentSearchStale(){
 if(!filenameSearch)return;
 browseNeedsRefresh=true;
 // Discard a reply that could have been queued before invalidation.
 filenameSearch.controller.abort();
 filenameSearch.loading=false;
 if(filenameSearch.result)filenameSearch.result={...filenameSearch.result,stale:true,nextPageToken:null};
 filenameSearch.error='Results may have changed. Use Refresh to recheck.';
 renderFiles();
}
async function show(next){if(next==='downloads'&&!debugMode)return;if(next!=='history')historyUI.stop();const ticket=++viewEpoch;if(view==='explorer'&&next!=='explorer'){
 explorerScroll=$('#files')?.scrollTop??0;
}if(next!=='remotes')restoreConnection();if(next!=='explorer'){explorerLayoutUI?.hide();stopThumbnailJobs();if(gallery)closeDialog();}view=next;$('#shell').dataset.view=next;$('#main').inert=false;hideContext();$$('header nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===next));if(next==='remotes'){renderRemotes();return;}if(next==='history'){await historyUI.load();return;}if(next==='downloads'){explorerExports.mountJobs($('#main'));return;}if(!state||configurationIssue){$('#main').innerHTML='<section class="page"><h1>'+ (next==='explorer'?'File Explorer':'Settings')+'</h1><p role="status">Reading saved configuration…</p></section>';try{await refreshState({quiet:true,readTimeout:5000});}catch(error){configurationIssue={code:error.code??'CURRENT_READ_UNAVAILABLE',method:error.method,stage:error.stage,diagnostic:error.diagnostic};if(ticket===viewEpoch){$('#main').innerHTML='<section class="page"><h1>'+ (next==='explorer'?'File Explorer':'Settings')+'</h1>'+recoveryCard()+'<p>Navigation and configuration changes are blocked until validated recovery. Remotes and sign-in remain available.</p></section>';bindRecovery();}return;}}if(ticket!==viewEpoch)return;if(next==='explorer'){renderExplorer();if(!source||!$('#tree').childElementCount)await enterExplorer();else if(browseNeedsRefresh&&!filenameSearch)await loadListing();}else await renderSettings();}
/** Stable presentation of enterExplorer/navigateExplorer and setView. Local
 * feedback precedes IPC; all persisted changes remain commitConfigChange. */
function renderExplorer(){
 restoreConnection();
 if(!explorerShell){explorerShell=document.createElement('section');explorerShell.className='explorer-shell';explorerShell.innerHTML=`<div id="explorer-commands" class="toolbar" aria-label="Explorer toolbar"><div id="command-items"><button id="back" aria-label="Back">←</button><button id="forward" aria-label="Forward">→</button><button id="up" aria-label="Up">↑</button><button id="refresh" aria-label="Refresh">⟳</button><form id="filename-search-form" role="search" aria-label="Current folder filenames"><input type="text" id="filename-search" aria-label="Search filenames" placeholder="Search filenames…" spellcheck="false" autocomplete="off" maxlength="1024"><button type="button" id="hide-filename-search" aria-label="Hide search">×</button></form><button id="open-filename-search" type="button" aria-label="Search filenames">Search</button><select id="view-switch" aria-label="View"><option value="details">Details</option><option value="list">List</option><option value="grid">Grid</option></select><button id="add-location">+ Right Click</button></div><button id="toolbar-more" aria-label="More Explorer actions" aria-expanded="false" aria-controls="toolbar-overflow" hidden>More</button><div id="toolbar-overflow" role="group" aria-label="More Explorer actions" hidden></div><div id="explorer-more-actions" hidden><label id="go-to-path" for="location">Go to path<span class="address"><input id="location" aria-label="Address" spellcheck="false"><span id="location-display" aria-hidden="true"></span></span></label><button id="create-bucket">Create Bucket</button></div></div><div id="toolbar-splitter" role="separator" aria-label="Explorer toolbar height" aria-orientation="horizontal" aria-valuemin="1" aria-valuemax="7" aria-valuenow="1" tabindex="0"></div><div id="suggestion"></div><div id="files" class="file-scroll" tabindex="0"></div><div class="toolbar"><span id="item-count" class="muted" data-aesthetic-text="explorer.debug-caption"></span><button id="more" hidden>Load more</button><span class="muted" id="listing-state" role="status"></span><button id="clear-search" hidden>Clear search</button></div>`;
  $('#main').replaceChildren(explorerShell);
  listen('#back','click',async()=>{if(historyAt>0)await navigate(history[--historyAt],false);});listen('#forward','click',async()=>{if(historyAt<history.length-1)await navigate(history[++historyAt],false);});
  listen('#up','click',()=>source&&navigate({...source,prefix:ancestors(source.prefix).at(-2)??''}));listen('#refresh','click',refreshExplorerFolder);
  listen('#view-switch','change',e=>{const value=e.target.value,start=performance.now(),el=$('#files'),oldGrid=displayView()==='grid',anchor=Math.floor(Math.max(0,el.scrollTop-(oldGrid?0:40))/(oldGrid?136:40))*(oldGrid?gridWindow(displayedEntries().length,0,viewportHeight,viewportWidth).columns:1);presentationView=value;renderExplorer();el.scrollTop=Math.floor(anchor/(value==='grid'?gridWindow(displayedEntries().length,0,viewportHeight,viewportWidth).columns:1))*(value==='grid'?136:40);renderWindow();paintTrace('view',start);viewCommit=viewCommit.catch(()=>{}).then(async()=>{if(presentationView!==value)return;try{await change({type:'setView',view:value});}catch(error){status(error.message);}finally{if(presentationView===value)presentationView=null;if(view==='explorer')renderExplorer();}});});
  listen('#create-bucket','click',createBucketGUI);
  listen('#add-location','click',()=>openPopup(selectedFolder()));
  listen('#more','click',()=>filenameSearch?searchDirectoryNames(filenameSearch.query,{more:true}):loadListing(true));
  listen('#filename-search-form','submit',event=>{
   event.preventDefault();const query=$('#filename-search').value;
   return searchDirectoryNames(query,{keepPrevious:true});
  });
  listen('#clear-search','click',()=>{
   clearFilenameSearch();
   $('#files').focus({preventScroll:true});
  });
  listen('#location','focus',e=>e.target.select());
  listen('#location','keydown',async e=>{
   if(e.isComposing)return;
   if(e.key==='Escape'){renderAddress(true);return;}
   if(e.key!=='Enter')return;
   e.preventDefault();
   const {target,key}=parseCloudPath(e.target.value),ticket=navigationEpoch,seen=new Set();
   let next='',found=false;
   do{
    const listed=await api('listAuthorizedBuckets',{accountId:target.accountId,...(next?{cursor:next}:{})});
    if(listed.state!=='completed')throw Error('Bucket authorization is unavailable.');
    found=listed.data.buckets.some(b=>b.name===target.bucketName);next=listed.data.cursor??'';
    if(next&&seen.has(next))throw Error('Bucket listing did not advance.');
    seen.add(next);
   }while(next&&!found&&ticket===navigationEpoch&&view==='explorer');
   if(ticket!==navigationEpoch||view!=='explorer')return;
   if(!found)throw Error('This bucket is not currently authorized.');
   if(key){const r=await api('fileMetadata',{source:target,key});if(r.state!=='completed'||!r.data.object)throw Error('File not found.');}
   if(ticket!==navigationEpoch||view!=='explorer')return;
   explorerLayoutUI.hide();await navigate(target);
   if(key){await revealListedFile(key,target);}
   else if(view==='explorer')$('#files').focus({preventScroll:true});
  });
  const resize=new ResizeObserver(rows=>{for(const row of rows){if(row.target.id==='files'){viewportWidth=row.contentRect.width;viewportHeight=row.contentRect.height;scheduleWindow();}if(row.target.classList.contains('address')){addressWidth=row.contentRect.width;renderAddress();}}});resize.observe($('#files'));resize.observe($('.address'));explorerLayoutUI=installExplorerLayout({read:()=>layoutIntent??state.product.explorerLayout,save:async value=>{layoutIntent=value;viewCommit=viewCommit.catch(()=>{}).then(async()=>{try{await change({type:'setExplorerLayout',explorerLayout:value});}finally{if(layoutIntent===value)layoutIntent=null;}});return viewCommit;},onResize:scheduleWindow});shortcuts.attachReferences();
 }else if(!explorerShell.isConnected){$('#main').replaceChildren(explorerShell);$('#files').scrollTop=explorerScroll;}
 $('#back').disabled=historyAt<=0;$('#forward').disabled=historyAt>=history.length-1;$('#up').disabled=!source?.prefix;$('#add-location').disabled=!source;explorerLayoutUI.setSearchAvailable(!!source&&connection.state==='CONNECTED');$('#view-switch').value=displayView();
 $('#shell').dataset.view='explorer';explorerLayoutUI?.refresh();renderAddress();renderFiles();void suggestion();
}
function refreshExplorerFolder(){
 imageReader.clear();clearThumbnails();listingReader.invalidate();
 if(filenameSearch)return searchDirectoryNames(filenameSearch.query,{refresh:true});
 return source?loadListing(false,true):enterExplorer();
}
function selectedFolder(){const row=displayedEntries().find(e=>selected.has(e.key));return row?.folder?{...source,prefix:row.key}:source;}
const pathMeasure=(()=>{let ctx;return text=>{ctx??=document.createElement('canvas').getContext('2d');ctx.font='14px Segoe UI';return ctx.measureText(text).width;};})();
function renderAddress(restore=false){const input=$('#location'),display=$('#location-display');if(!input)return;const e=selected.size===1?ordered()[listingOrder.index(selected.values().next().value)]:null,value=cloudPath(source,e&&!e.folder?e.key:source?.prefix);if(restore||document.activeElement!==input)input.value=value;input.title=value;display.textContent=value?middlePath(value,Math.max(20,addressWidth-20),pathMeasure):'Choose a cloud folder';}
async function navigate(t,push=true,fromAPI=false){
  listingAbort?.abort();const started=performance.now(),same=source&&targetKey(source)===targetKey(t),ticket=++navigationEpoch;if(!same)resetFilenameSearch();listingEpoch++;previewEpoch++;if(!same){imageReader.clear();clearThumbnails();}hideContext();closeDialog();
  source=structuredClone(t);explorerAccountId=t.accountId;if(!same){selected.clear();focusIndex=0;anchor=0;}if(!same){entries=[];cursor='';}loading=true;listingError='';
  if(push&&(historyAt<0||targetKey(history[historyAt])!==targetKey(t))){history=history.slice(0,historyAt+1);history.push(source);historyAt=history.length-1;}
  if(view!=='explorer'){view='explorer';$('#shell').dataset.view='explorer';$$('header nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));}renderExplorer();if(!same)$('#files').scrollTop=0;paintTrace('navigation-feedback',started);
  try{if(!fromAPI)await api('navigateExplorer',{target:t},{quiet:true});if(ticket!==navigationEpoch)return;await loadListing();}catch(e){if(ticket===navigationEpoch){loading=false;listingError=e.message;status(e.message);renderFiles();}}
}
async function loadListing(more=false,fresh=false){
  if(!source||more&&loading)return;browseNeedsRefresh=false;listingAbort?.abort();const controller=new AbortController();listingAbort=controller;const epoch=++listingEpoch,t=structuredClone(source),scroll=$('#files')?.scrollTop??0;loading=true;listingError='';renderFiles();
  try{const data=await listingReader.page(t,more?cursor:'',fresh,controller.signal);if(epoch!==listingEpoch||targetKey(t)!==targetKey(source))return;
    entries=more?[...new Map([...entries,...data.entries].map(e=>[e.key,e])).values()]:data.entries;cursor=data.cursor??'';treeFolders.set(targetKey(t),entries.filter(e=>e.folder));syncTreePage(t,{entries,cursor,completeListing:!cursor});paintTrace('listing');status(`${entries.length} items · ${t.bucketName}`);
  }catch(error){if(epoch===listingEpoch&&view==='explorer'&&error.name!=='AbortError'){listingError=error.message;status(error.message+(entries.length?' · Showing previous results.':''));}}
  finally{if(epoch===listingEpoch){loading=false;if(view==='explorer'){renderFiles();if(more&&!filenameSearch)$('#files').scrollTop=scroll;}}}
}
function ordered(){return listingOrder.read(displayedEntries(),sort);}
function renderFiles(){
 const el=$('#files');if(!el)return;
 const search=filenameSearch,rows=displayedEntries(),busy=search?search.loading:loading;
 el.className='file-scroll '+displayView();el.setAttribute('aria-busy',String(busy));
 if(!el.querySelector('table')){el.innerHTML=`<div class="empty"></div><table role="grid" aria-label="Files" aria-multiselectable="true"><thead><tr>${[['Name','displayName'],['Date Modified','uploaded'],['Type','folder'],['Size','size']].map(([label,k])=>`<th><button data-sort="${k}">${label}</button></th>`).join('')}</tr></thead><tbody></tbody></table><div class="grid-tiles" role="grid" aria-label="Files" aria-multiselectable="true" hidden></div>`;
  el.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{hideContext();sort={key:b.dataset.sort,direction:sort.key===b.dataset.sort?-sort.direction:1};focusIndex=0;el.scrollTop=0;renderWindow();});
  el.addEventListener('scroll',scheduleWindow,{passive:true});
  el.onclick=event=>{const row=event.target.closest('[data-index]');if(!row)return;selectRow(Number(row.dataset.index),event);row.focus({preventScroll:true});};
  el.ondblclick=event=>{const row=event.target.closest('[data-index]');if(row)void openEntry(ordered()[Number(row.dataset.index)]).catch(e=>status(e.message));};
  el.oncontextmenu=event=>{const row=event.target.closest('[data-index]');event.preventDefault();if(!row){if(source)void contextFor(source,null,event.clientX,event.clientY);return;}const i=Number(row.dataset.index),e=ordered()[i];if(!selected.has(e.key))selectRow(i,{});focusIndex=i;void contextFor(e.folder?{...source,prefix:e.key}:source,e,event.clientX,event.clientY);};
  el.onkeydown=event=>{if($('#dialog').open)return;const row=event.target.closest('[data-index]'),rows=ordered(),i=row?Number(row.dataset.index):focusIndex,cols=displayView()==='grid'?gridWindow(rows.length,0,viewportHeight,viewportWidth).columns:1;let n;
   if(['ArrowDown','ArrowUp','Home','End','PageDown','PageUp',...(displayView()==='grid'?['ArrowLeft','ArrowRight']:[])].includes(event.key)&&rows.length){event.preventDefault();const step=event.key.startsWith('Page')?Math.max(1,Math.floor(viewportHeight/(displayView()==='grid'?136:40)))*cols:cols;n=event.key==='Home'?0:event.key==='End'?rows.length-1:Math.max(0,Math.min(rows.length-1,i+(event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:['ArrowDown','PageDown'].includes(event.key)?step:-step)));selectRow(n,event);focusRow(n);}
   else if(event.key==='Enter'&&rows[i]){event.preventDefault();void openEntry(rows[i]).catch(e=>status(e.message));}
   else if(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey){event.preventDefault();if(rows[i]&&!selected.has(rows[i].key))selectRow(i,{});const r=(row??el).getBoundingClientRect();void contextFor(rows[i]?.folder?{...source,prefix:rows[i].key}:source,rows[i]??null,r.left+20,r.top+20);}
   else if(event.key==='Escape'&&!($('#context').hidden&&explorerLayoutUI.dismissSearch())){selected.clear();updateSelection();hideContext();}
   else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'){event.preventDefault();hideContext();selected=new Set(rows.map(e=>e.key));updateSelection();}
  };
 }
 const inactive=displayView()==='grid'?el.querySelector('tbody'):el.querySelector('.grid-tiles');if(inactive.childElementCount)inactive.replaceChildren();
 const empty=el.querySelector('.empty');empty.hidden=rows.length>0;
 empty.textContent=search?searchEmptyText(search):loading?'Loading…':listingError?listingError+' · Use Refresh to retry.':source?'This folder is empty.':'Choose an account and bucket in the navigation pane.';
 el.querySelector('table').hidden=!rows.length||displayView()==='grid';el.querySelector('.grid-tiles').hidden=!rows.length||displayView()!=='grid';el.querySelector('table').setAttribute('aria-rowcount',String(rows.length+1));
 const more=$('#more');more.hidden=search?!search.result?.nextPageToken:!cursor;more.disabled=busy;
 more.textContent=search?(search.result?.complete?'Load more matches':'Continue search'):'Load more';
 $('#clear-search').hidden=!search;
 renderListingCaption();
 renderWindow();
}
function searchEmptyText(search){
 if(search.loading)return 'Searching filenames…';
 if(search.error)return search.error;
 if(!search.result?.complete)return 'No matches found so far. This inventory is incomplete.';
 if(search.result.stale||search.result.source==='offline')return 'No matches in the last known inventory.';
 return 'No matching filenames or folders.';
}
function renderListingCaption(){
 const count=$('#item-count'),status=$('#listing-state');if(!count||!status)return;
 count.hidden=!!filenameSearch;
 if(!filenameSearch)count.textContent=`${entries.length} items${selected.size?' · '+selected.size+' selected':''}`;
 const text=filenameSearch?searchCaption(filenameSearch):listingError?(entries.length?'Unavailable · showing previous verified listing.':listingError):loading?(entries.length?'Refreshing · previous verified listing.':'Loading authorized contents…'):'';
 if(status.textContent!==text)status.textContent=text;
}
function renderWindow(){
 const el=$('#files');if(!el||view!=='explorer')return;if(viewportWidth<1||viewportHeight<1){stopThumbnailJobs();return;}const grid=displayView()==='grid',body=grid?el.querySelector('.grid-tiles'):el.querySelector('tbody');if(!body)return;const rows=ordered();let range=grid?gridWindow(rows.length,el.scrollTop,viewportHeight,viewportWidth):rowWindow(rows.length,el.scrollTop,viewportHeight);if(grid&&renderedWindow?.body===body&&renderedWindow.columns!==range.columns){const anchor=Math.floor(el.scrollTop/136)*renderedWindow.columns;el.scrollTop=Math.floor(anchor/range.columns)*136;range=gridWindow(rows.length,el.scrollTop,viewportHeight,viewportWidth);}
 if(renderedWindow?.body===body&&renderedWindow.rows===rows&&renderedWindow.start===range.start&&renderedWindow.end===range.end&&renderedWindow.columns===range.columns){syncThumbnails();return;}const focused=el.contains(document.activeElement)?document.activeElement.dataset.index:null;renderedWindow={body,rows,start:range.start,end:range.end,columns:range.columns};
 const icon=e=>e.folder?'📁':'▤',label=e=>esc(e.displayName??e.key),spacer=height=>height?grid?`<div aria-hidden="true" style="grid-column:1/-1;height:${height}px"></div>`:`<tr aria-hidden="true" class="row-spacer"><td colspan="4" style="height:${height}px;padding:0;border:0"></td></tr>`:'';
 if(grid){body.style.gridTemplateColumns=`repeat(${range.columns},minmax(0,1fr))`;body.setAttribute('aria-rowcount',String(Math.ceil(rows.length/range.columns)));body.setAttribute('aria-colcount',String(range.columns));}
 body.innerHTML=spacer(range.top)+rows.slice(range.start,range.end).map((e,j)=>{const i=range.start+j,attrs=`tabindex="${i===focusIndex?'0':'-1'}" data-index="${i}" aria-rowindex="${grid?Math.floor(i/range.columns)+1:i+2}" aria-selected="${selected.has(e.key)}"`;return grid?`${i%range.columns===0?'<div role="row" class="tile-row">':''}<div role="gridcell" aria-colindex="${i%range.columns+1}" class="file-tile" ${attrs}><div><span aria-hidden="true">${icon(e)}</span><div class="tile-label" title="${label(e)}">${label(e)}</div></div></div>${(i+1)%range.columns===0||i===range.end-1?'</div>':''}`:`<tr ${attrs}><td><span class="${e.folder?'folder-icon':'file-icon'}" aria-hidden="true">${icon(e)}</span>${label(e)}</td><td>${esc(e.uploaded??e.last_modified??'—')}</td><td>${e.folder?'File folder':esc(e.key.split('.').at(-1)?.toUpperCase()??'File')}</td><td>${e.folder?'':Number.isFinite(Number(e.size))?Number(e.size).toLocaleString()+' B':'—'}</td></tr>`;}).join('')+spacer(grid?range.total-Math.ceil(range.end/range.columns)*range.rowHeight:(rows.length-range.end)*40);
 syncThumbnails();if(focused!==undefined&&focused!==null)(body.querySelector(`[data-index="${focused}"]`)??el).focus({preventScroll:true});
}
function selectRow(i,event){const started=performance.now();hideContext();const rows=ordered(),e=rows[i];if(!e)return;if(event.shiftKey){if(!event.ctrlKey&&!event.metaKey)selected.clear();for(let j=Math.min(anchor,i);j<=Math.max(anchor,i);j++)selected.add(rows[j].key);}else if(event.ctrlKey||event.metaKey){if(selected.has(e.key))selected.delete(e.key);else selected.add(e.key);anchor=i;}else{selected=new Set([e.key]);anchor=i;}focusIndex=i;updateSelection();paintTrace('selection',started);}
function focusRow(i){const el=$('#files'),grid=displayView()==='grid',columns=grid?gridWindow(displayedEntries().length,0,viewportHeight,viewportWidth).columns:1,h=grid?136:40,top=Math.floor(i/columns)*h;if(top<el.scrollTop)el.scrollTop=top;else if(top+h+(grid?0:40)>el.scrollTop+viewportHeight)el.scrollTop=top+h+(grid?0:40)-viewportHeight;renderWindow();el.querySelector(`[data-index="${i}"]`)?.focus({preventScroll:true});}
function updateSelection(){const rows=ordered();$('#files')?.querySelectorAll('[data-index]').forEach(row=>{const i=Number(row.dataset.index),value=String(selected.has(rows[i]?.key));if(row.getAttribute('aria-selected')!==value)row.setAttribute('aria-selected',value);row.tabIndex=i===focusIndex?0:-1;});renderListingCaption();renderAddress();}
const imageReader=createImageReader(p=>api('readFileChunk',p,{quiet:true}));
// At most 256 decoded 128×128 thumbnails (~16 MiB pixels), two byte reads at once.
const THUMBNAIL_EDGE=128,THUMBNAIL_ENTRIES=256;
const thumbnailURLs=new Map(),thumbnailJobs=new Map();let thumbnailActive=0,thumbnailFrame=0;
function stopThumbnailJobs(){for(const job of thumbnailJobs.values())job.abort();thumbnailJobs.clear();}
function clearThumbnails(){stopThumbnailJobs();for(const row of thumbnailURLs.values())if(row.url)URL.revokeObjectURL(row.url);thumbnailURLs.clear();}
const imageMessage=code=>({IMAGE_BYTES_INVALID:'The stored object does not contain a supported image. Download to inspect the original bytes.',IMAGE_DECODE_FAILED:'The stored image could not be decoded. It may be corrupt or truncated.',IMAGE_HEADER_UNAVAILABLE:'The image dimensions could not be safely read. Use Download for this object.',PREVIEW_DIMENSIONS_LIMIT:'This image exceeds the safe decoded-pixel preview budget. Use Download.',PREVIEW_SIZE_LIMIT:'This object exceeds the bounded image preview budget. Use streaming Download.',FILE_READ_FAILED:'The image could not be read. Check the connection and try again.'}[code]??names[code]??'The image is unavailable. Check access or use Download.');
function thumbnailKey(e){return JSON.stringify([targetKey(source),e.key,e.etag??e.version??e.uploaded??'',e.size??null]);}
function syncThumbnails(){
 if(thumbnailFrame)return;thumbnailFrame=requestAnimationFrame(()=>{thumbnailFrame=0;const cells=view==='explorer'&&displayView()==='grid'&&viewportWidth>0?[...$('#files').querySelectorAll('[data-index]')]:[],wanted=new Map();for(const cell of cells){const e=ordered()[Number(cell.dataset.index)];if(e&&isImage(e))wanted.set(thumbnailKey(e),{cell,e});}
 for(const [key,job] of thumbnailJobs)if(!wanted.has(key)){job.abort();thumbnailJobs.delete(key);}
 for(const [key,{cell,e}] of [...wanted].slice(0,THUMBNAIL_ENTRIES)){const old=thumbnailURLs.get(key);if(old){if(old.url&&!cell.querySelector('img')){const img=new Image();img.alt=e.displayName??e.key;img.src=old.url;img.className='thumbnail';cell.querySelector('span').replaceWith(img);}else if(old.error){cell.title=imageMessage(old.error);cell.dataset.thumbnail='unavailable';}continue;}
  if(thumbnailJobs.has(key)||thumbnailActive>=2||thumbnailJobs.size>=2)continue;
  const controller=new AbortController(),captured=structuredClone(source);thumbnailJobs.set(key,controller);thumbnailActive++;
  void (async()=>{let bitmap;try{const value=await imageReader.load(captured,e,{limit:4*1024*1024,signal:controller.signal,concurrency:1});controller.signal.throwIfAborted();try{const ratio=Math.min(1,THUMBNAIL_EDGE/Math.max(value.width,value.height));bitmap=await createImageBitmap(value.blob,{resizeWidth:Math.max(1,Math.round(value.width*ratio)),resizeHeight:Math.max(1,Math.round(value.height*ratio)),resizeQuality:'low'});}catch{throw Object.assign(Error(),{code:'IMAGE_DECODE_FAILED'});}controller.signal.throwIfAborted();if(bitmap.width*bitmap.height>64*1024*1024)throw Object.assign(Error(),{code:'PREVIEW_SIZE_LIMIT'});const scale=Math.min(1,THUMBNAIL_EDGE/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error('IMAGE_DECODE_FAILED')),'image/png'));controller.signal.throwIfAborted();thumbnailURLs.set(key,{url:URL.createObjectURL(blob),etag:value.etag});}
  catch(error){if(!controller.signal.aborted)thumbnailURLs.set(key,{error:error.code??'IMAGE_DECODE_FAILED'});}
  finally{bitmap?.close();thumbnailActive--;if(thumbnailJobs.get(key)===controller)thumbnailJobs.delete(key);while(thumbnailURLs.size>THUMBNAIL_ENTRIES){const first=[...thumbnailURLs.keys()].find(k=>!wanted.has(k))??thumbnailURLs.keys().next().value;const cached=thumbnailURLs.get(first);if(cached.url)URL.revokeObjectURL(cached.url);thumbnailURLs.delete(first);}syncThumbnails();}})();
 }
 });
}
let stopLoadingVisual=null,cachedGalleryVisual=null;
function stopGalleryVisual(){stopLoadingVisual?.();stopLoadingVisual=null;const frame=$('.image-frame');if(frame)delete frame.dataset.loading;}
// Shared preference reader; History and gallery use the identical local choice.
async function getGalleryVisualSelection(){
 const summary=await api('getGalleryLoadingVisual',{}, {quiet:true});if(!cachedGalleryVisual||cachedGalleryVisual.revision!==summary.revision){const value=summary.mode==='media'?await api('getGalleryLoadingVisual',{includeMedia:true},{quiet:true}):summary;cachedGalleryVisual={revision:value.revision,mode:value.mode,...(value.media?.base64?{blob:loadingMedia(value.media).blob}:{})};}return cachedGalleryVisual;
}
async function startGalleryVisual(frame,ticket,signal){
 frame.dataset.loading='true';stopLoadingVisual=mountLoadingVisual(frame,cachedGalleryVisual??{mode:'math'});
 try{const selection=await getGalleryVisualSelection();
 if(ticket!==previewEpoch||signal.aborted||frame.dataset.loading!=='true')return;stopLoadingVisual?.();stopLoadingVisual=mountLoadingVisual(frame,selection);
 }catch{/* Loading artwork never prevents an authenticated object read. */}
}
function galleryControls(e){return `<div class="gallery-controls"><button id="gallery-previous" class="gallery-arrow" title="Previous image" aria-label="Previous image" aria-keyshortcuts="ArrowLeft" ${!galleryStep(ordered(),e.key,-1)?'disabled':''}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><span class="sr-only" role="status">${cursor?'More files may be loaded in Explorer.':''}</span><button id="gallery-next" class="gallery-arrow" title="Next image" aria-label="Next image" aria-keyshortcuts="ArrowRight" ${!galleryStep(ordered(),e.key,1)?'disabled':''}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></div>`;}
function moveGallery(direction){if(!gallery)return;const next=galleryStep(ordered(),gallery.key,direction);if(next)void openEntry(next).catch(e=>status(imageMessage(e.code)));}
async function openEntry(e){
 if(e.folder)return navigate({...source,prefix:e.key});
 stopGalleryVisual();previewAbort?.abort();const controller=new AbortController();previewAbort=controller;const ticket=++previewEpoch,captured=structuredClone(source),started=performance.now(),image=isImage(e),text=/\.(txt|md|json|csv|log)$/i.test(e.key);
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
 if(image){galleryReturnKey??=e.key;gallery={key:e.key,target:captured};selected=new Set([e.key]);focusIndex=listingOrder.index(e.key)??0;updateSelection();}else{gallery=null;galleryReturnKey=null;}
 const body=image?`<section data-gallery>${galleryControls(e)}<div class="image-frame"><p id="preview-state" role="status">Loading image…</p><img class="preview" alt="File preview" hidden><p id="preview-error" role="alert" hidden></p></div></section>`:'<p id="preview-state" role="status">Loading preview…</p>';
 dialog(e.displayName??e.key,body+'<button id="download-stream">Download</button>'+(image&&explorerExports.options.tags?'<button id="preview-tags">Add Tags</button>':''));
 if($('#preview-tags'))$('#preview-tags').onclick=()=>{void explorerExports.tags(captured,e);};if(!image)previewAbort=controller;$('#download-stream').onclick=()=>{void downloadEntry(e).catch(error=>status(error.message));};listen('#gallery-previous','click',()=>moveGallery(-1));listen('#gallery-next','click',()=>moveGallery(1));paintTrace('preview-feedback',started);if(image){bindInlineRename(e,captured,ticket);void startGalleryVisual($('.image-frame'),ticket,controller.signal);}
 if(!image&&!text){$('#preview-state').textContent='Inline preview unavailable for this type.';return;}
 try{
  const result=image?await imageReader.load(captured,e,{limit:providerDefaults.previewMaxBytes,signal:controller.signal}):await readPreviewBytes(p=>api('readFileChunk',p,{quiet:true}),{source:captured,key:e.key},{limit:providerDefaults.textPreviewMaxBytes,signal:controller.signal,truncate:true});
  if(ticket!==previewEpoch||targetKey(captured)!==targetKey(source)||controller.signal.aborted)return;
  if(image){const url=URL.createObjectURL(result.blob);previewUrl=url;const img=$('img.preview');img.src=url;try{await img.decode();if(!img.naturalWidth||!img.naturalHeight)throw Error();}catch{throw Object.assign(Error(),{code:'IMAGE_DECODE_FAILED'});}if(ticket!==previewEpoch||controller.signal.aborted)return;stopGalleryVisual();img.hidden=false;$('#preview-state').hidden=true;}
  else{$('#preview-state').outerHTML='<pre id="preview-text">'+esc(await result.blob.text())+'</pre>'+(!result.done?'<p>Showing the first 512 KiB. Download the full file for all contents.</p>':'');}
  paintTrace('preview-ready',started);
 }catch(error){if(ticket!==previewEpoch||controller.signal.aborted)return;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}stopGalleryVisual();const message=imageMessage(error.code);if(image){$('#preview-state').hidden=true;const alert=$('#preview-error');alert.hidden=false;alert.textContent=message;alert.dataset.code=error.code??'FILE_READ_FAILED';$('img.preview').hidden=true;}else{$('#preview-state').textContent=message;$('#preview-state').setAttribute('role','alert');}}
}
function bindInlineRename(entry,target,ticket){
 const title=$('#dialog-title'),name=entry.displayName??entry.key.split('/').at(-1);
 title.tabIndex=0;title.title='Double-click or press F2 to rename';
 const edit=()=>{
  if(title.querySelector('input'))return;
  const input=document.createElement('input'),feedback=document.createElement('span');
  input.value=name;input.maxLength=1024;input.setAttribute('aria-label','Image filename');
  feedback.setAttribute('role','status');feedback.className='preview-rename-status';
  title.replaceChildren(input,feedback);input.focus();input.select();
  const cancel=()=>{title.textContent=name;title.focus();};
  input.addEventListener('keydown',async event=>{
   if(event.isComposing||!['Enter','Escape'].includes(event.key))return;
   event.preventDefault();event.stopPropagation();
   if(event.key==='Escape'||input.value===name){cancel();return;}
   const newName=input.value;
   if(!newName.trim()||newName==='.'||newName==='..'||newName.includes('/')||newName.includes('\\')){feedback.textContent='Enter a filename without path separators.';return;}
   input.readOnly=true;feedback.textContent='Renaming…';
   try{
    const result=await runFileAction('rename',{source:target,entry:{key:entry.key,folder:false},name:newName,conflict:'skip'});
    const data=result.data??result;
    const key=entry.key.slice(0,entry.key.lastIndexOf('/')+1)+newName;
    if(!data.code?.endsWith('_VERIFIED')||data.receipt?.key!==key)throw Object.assign(Error(),{code:data.code??'FILE_RENAME_UNCONFIRMED'});
    listingReader.invalidate();
    if(ticket!==previewEpoch||view!=='explorer'||targetKey(target)!==targetKey(source))return;
    galleryReturnKey=key;gallery.key=key;selected=new Set([key]);
    title.textContent=newName;title.focus();
    const renamed={...entry,key,displayName:newName,etag:data.receipt.etag??entry.etag,size:data.receipt.size??entry.size};
    bindInlineRename(renamed,target,ticket);
    $('#download-stream').onclick=()=>{void downloadEntry(renamed).catch(error=>status(error.message));};
    if($('#preview-tags'))$('#preview-tags').onclick=()=>{void explorerExports.tags(target,renamed);};
    await reloadCurrentDirectory();
    if(ticket===previewEpoch&&gallery?.key===key){
     $('#gallery-previous').disabled=!galleryStep(ordered(),key,-1);
     $('#gallery-next').disabled=!galleryStep(ordered(),key,1);
    }
   }catch(error){
    if(!input.isConnected)return;
    feedback.textContent=/EXIST|CONFLICT|SKIP/.test(error.code??'')?'That name is already in use.':fileError('Rename',error);
    input.readOnly=/UNCERTAIN|UNCONFIRMED|INSPECTION/.test(error.code??'');
   }
  });
 };
 title.ondblclick=edit;
 title.onkeydown=event=>{if(event.target===title&&(event.key==='F2'||event.key==='Enter')){event.preventDefault();edit();}};
}
$('#dialog').addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
$('#dialog').addEventListener('keydown',e=>{if(!gallery||e.target.closest('input,textarea,select,[contenteditable=true]'))return;if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();moveGallery(e.key==='ArrowRight'?1:-1);}});

function hideContext(){contextTicket++;$('#context').hidden=true;$('#context').replaceChildren();}
async function contextFor(t,entry,x,y){
  contextReturnElement=entry?$('#files')?.querySelector(`[data-index="${focusIndex}"]`):document.activeElement;
  const started=performance.now(),ticket=++contextTicket,contextEpoch=navigationEpoch,origin=structuredClone(source),capturedSelection=[...selected].map(key=>ordered()[listingOrder.index(key)]).filter(Boolean).map(e=>({key:e.key,folder:e.folder}));
  const params={target:t,...(entry?{entry:{key:entry.key,folder:entry.folder,...(entry.displayName?{displayName:entry.displayName}:{})}}:{}),hasClipboard:!!fileClipboard};
  // Same pure descriptor as inspectExplorerContextMenu; no second menu policy.
  // Shell has no enabled authority until the trusted response arrives.
  const descriptors=describeExplorerContextMenu(t,{entry:params.entry,hasClipboard:!!fileClipboard,mutations:false,exports:explorerExports.options}),el=$('#context');el.replaceChildren();let verified=false;
  let downloadGroup;
  const action=(label,fn)=>{const descriptor=descriptors.items.find(d=>d.label===label);if(!descriptor)return null;const button=document.createElement('button');button.textContent=label;button.setAttribute('role','menuitem');button.disabled=true;button.dataset.action=descriptor.id;button.onclick=()=>{if(!verified||ticket!==contextTicket||contextEpoch!==navigationEpoch||view!=='explorer')return;hideContext();Promise.resolve(fn()).catch(e=>status(e.message));};if(descriptor.group){
   if(!downloadGroup){
    downloadGroup=document.createElement('details');const summary=document.createElement('summary');
    summary.textContent=descriptor.group;summary.setAttribute('role','menuitem');downloadGroup.append(summary);el.append(downloadGroup);
   }
   downloadGroup.append(button);
  }else el.append(button);return button;};
  action('Open',()=>entry?openEntry(entry):navigate(t));
  const file=entry&&!entry.folder?entry:null,scope=file?origin:t;
  if(file)action('Preview',()=>openEntry(file));
  action('Download',()=>file?downloadEntry(file):explorerExports.download(scope,null,'original'));
  action('Download original',()=>file?downloadEntry(file):explorerExports.download(scope,null,'original'));
  action('Download with Tags',()=>explorerExports.download(scope,file,'tags'));
  action('Download with All Metadata',()=>explorerExports.download(scope,file,'metadata'));
  action('Get URL',()=>explorerExports.urls(scope,file));
  action('Add Tags',()=>explorerExports.tags(scope,file));
  if(!entry||entry.folder){action('+ Right Click',()=>openPopup(structuredClone(t)));action('Make Default',()=>makeExplorerDefault(t));}
  else {const save=action('Save to cloud…',()=>chooseRemoteSave(entry));if(capabilities?.providers?.cloudflare?.explorerSource===false){save.disabled=true;save.title='No authorized remote source is available for this private Explorer file.';}}
  const mutation=action;
  if(entry){
   mutation('Copy',()=>{fileClipboard={source:origin,entries:capturedSelection,action:'copy'};status(fileClipboard.entries.length+' items ready to paste.');});
   mutation('Cut',()=>{fileClipboard={source:origin,entries:capturedSelection,action:'move'};status(fileClipboard.entries.length+' items ready to move. Sources remain until paste.');});
   mutation('Move',()=>fileActionGUI('move',entry,origin));mutation('Rename',()=>fileActionGUI('rename',entry,origin));mutation('Delete',()=>fileActionGUI('delete',entry,origin));
   action('Properties',async()=>{const r=await api(entry.folder?'listFolders':'fileMetadata',entry.folder?{source:{...origin,prefix:entry.key}}:{source:origin,key:entry.key});const metadata=!entry.folder&&isImage(entry)&&explorerExports.options.tags?await api('getExportObjectMetadata',{source:origin,key:entry.key},{quiet:true}).catch(()=>null):null;
    dialog('Properties',(metadata?'<p>Tags · '+esc(metadata.availability==='observed'?metadata.tags.join(', ')||'None':'Unavailable')+'</p>':'')+'<pre>'+esc(JSON.stringify(r,null,2))+'</pre>');});
  }
  if(!entry||entry.folder){mutation('New Folder',()=>fileActionGUI('mkdir',null,t));mutation('Paste',()=>pasteFiles(structuredClone(t)));}

  const feedback=document.createElement('div');feedback.className='muted';feedback.setAttribute('role','status');feedback.textContent='Checking actions…';el.append(feedback);
  el.hidden=false;const r=el.getBoundingClientRect();el.style.left=Math.max(8,Math.min(x,innerWidth-r.width-8))+'px';el.style.top=Math.max(8,Math.min(y,innerHeight-r.height-8))+'px';el.tabIndex=-1;el.focus({preventScroll:true});paintTrace('menu-shell',started);
  try{const checked=await api('inspectExplorerContextMenu',params,{quiet:true});if(ticket!==contextTicket||contextEpoch!==navigationEpoch||view!=='explorer'||el.hidden)return;verified=true;for(const button of el.querySelectorAll('[data-action]')){
   const item=checked.items.find(d=>d.id===button.dataset.action);
   button.disabled=item?.enabled!==true;
   if(item?.id==='explorer.setFlatDefault'&&button.disabled)feedback.textContent='Make Default unavailable. Check Cloudflare access.';
  }
  if(feedback.textContent==='Checking actions…')feedback.remove();if(document.activeElement===el)el.querySelector('button:not(:disabled)')?.focus({preventScroll:true});paintTrace('menu-authorized',started);}catch(error){if(ticket===contextTicket&&!el.hidden)feedback.textContent='Actions unavailable · '+(error.code??'INSPECTION_FAILED');}
}
async function makeExplorerDefault(target){
 try{
  await refreshState({quiet:true});
  const result=await change({type:'makeDefault',target,ensureSimple:true});
  if(result.native?.state!=='completed')throw Object.assign(Error(),{code:result.native?.code});
  $('#listing-state').textContent='Default set · Chrome menu acknowledged.';
 }catch(error){
  if($('#listing-state'))$('#listing-state').textContent=fileError('Make Default',error);
 }
}
const workerCost='This action may prepare a private Worker for all paths in the selected bucket or bind both selected buckets for a transfer. Cloudflare may charge for Worker and R2 usage.';
function setupDisclosure(title,run,detail=workerCost){
 dialog(title,'<p>'+esc(detail)+'</p><button id="approve-file-setup">Continue</button><button id="cancel-file-setup">Cancel</button><p id="file-setup-feedback" role="status"></p>');
 listen('#cancel-file-setup','click',closeDialog);
 listen('#approve-file-setup','click',async()=>{
  const button=$('#approve-file-setup'),feedback=$('#file-setup-feedback');button.disabled=true;const cancel=$('#cancel-file-setup');cancel.disabled=true;
  feedback.textContent='Checking access…';
  try{await run();if(button.isConnected)closeDialog();}
  catch(error){if(feedback.isConnected){feedback.textContent=fileError(title,error);button.disabled=error.code==='FILE_RETRY_REQUIRES_INSPECTION';cancel.disabled=false;}}
 });
}
function fileError(action,error){
 if(reconnectCodes.has(error.code))return 'Reconnect Cloudflare and try again.';
 if(['WORKER_CREATE_PERMISSION_REQUIRED','INSUFFICIENT_SCOPE','WORKER_PERMISSION_DENIED','AUTHORIZATION_DENIED','PERMISSION_DENIED'].includes(error.code))return 'Cloudflare denied access. Review your account permissions.';
 if(/UNCERTAIN|UNCONFIRMED|RETRY_REQUIRES_INSPECTION|INTERRUPTED|ENGINE_RESPONSE_CHANNEL_CLOSED|ENGINE_NO_RESPONSE/.test(error.code??''))return action==='New Folder'?'Folder creation was not confirmed. Inspect this folder in Explorer or check History before starting a new attempt.':'Outcome unconfirmed. Refresh both locations before retrying.';
 return (action==='New Folder'?'Couldn’t create folder.':action==='Create Bucket'?'Couldn’t create bucket.':action==='Make Default'?'Default was not changed.':'File action unavailable.')+
  (error.code==='BUCKET_ALREADY_EXISTS'?' That name is already in use.':error.code==='BUCKET_NAME_INVALID'?' Enter 3–63 lowercase letters, digits or hyphens.':' Check the selected location and permissions.');
}
async function runFileAction(action,params,authorizeSetup=false,idempotencyKey=crypto.randomUUID()){
 try{
  const result=await api('fileAction',{action,...params,idempotencyKey,...(authorizeSetup?{authorizeSetup:true}:{})},{quiet:true});
  imageReader.clear();clearThumbnails();return result;
 }catch(error){
  if(/UNCERTAIN|UNCONFIRMED|INTERRUPTED|ENGINE_RESPONSE_CHANNEL_CLOSED|ENGINE_NO_RESPONSE/.test(error.code??''))markCurrentSearchStale();
  throw error;
 }
}
function namedOperation(title,label,value,run,{bucket=false}={}){
 dialog(title,'<form id="file-name-form"><label>'+esc(label)+' <input id="file-name" '+(bucket?'required minlength="3" maxlength="63"':'maxlength="1024"')+' value="'+esc(value)+'"></label><button type="submit">'+esc(title)+'</button><p id="file-feedback" role="status"></p></form>');
 const form=$('#file-name-form'),input=$('#file-name'),button=form.querySelector('button'),feedback=$('#file-feedback');
 input.focus();
 form.onsubmit=async event=>{
  event.preventDefault();
  if(button.disabled)return;
  button.disabled=true;feedback.textContent='Working…';
  try{await run(input.value);if(form.isConnected)closeDialog();}
  catch(error){if(form.isConnected){feedback.textContent=fileError(title,error);button.disabled=false;}}
 };
}
async function finishFileAction(action,params,approve=false,idempotencyKey){
 const result=await runFileAction(action,params,approve,idempotencyKey);
 listingReader.invalidate();
 if(view==='explorer')await reloadCurrentDirectory();
 const code=result.data?.code;
 status(code?.endsWith('_VERIFIED')?(action==='mkdir'?'Folder created and verified.':'File action verified.'):code??'File action verified.');
 return result;
}
function offerFilePreparation(title,run,detail){
 return async (...args)=>{
  try{return await run(...args,false);}
  catch(error){
   if(error.code!=='FILE_SETUP_APPROVAL_REQUIRED')throw error;
   setupDisclosure(title,()=>run(...args,true),detail);
  }
 };
}
async function createBucketGUI(){
 const accounts=connection?.accounts??[],account=accounts.find(a=>a.id===(explorerAccountId??source?.accountId))??(accounts.length===1?accounts[0]:null);
 if(!account){status('Select a Cloudflare account or one of its buckets first.',{attention:true});return;}
 namedOperation('Create Bucket','Bucket name','',async name=>{
  const target={provider:'cloudflare',accountId:account.id,connectionId:'cloudflare:'+account.id,bucketName:name,prefix:''};
  await runFileAction('createBucket',{source:target,name});
  if(view==='explorer'){listingReader.invalidate();await loadTree();await $$('#tree [data-account-id]').find(button=>button.dataset.accountId===account.id)?.onclick();await navigate(target);}
  status('Bucket created and verified.');
 },{bucket:true});
}
async function fileActionGUI(action,entry,target=source){
 const captured=structuredClone(target),params={source:captured,...(entry?{entry:{key:entry.key,folder:entry.folder}}:{})};
 if(action==='mkdir'||action==='rename'){
  const title=action==='mkdir'?'New Folder':'Rename';
  const attempts=new Map();
  const run=(name,allow)=>{
   if(!attempts.has(name))attempts.set(name,crypto.randomUUID());
   return finishFileAction(action,{...params,name},allow,attempts.get(name));
  };
  const detail=action==='mkdir'?`To create this folder, Click2Cloud needs to prepare or update its private Worker for bucket ${captured.bucketName}. Cloudflare may charge for Worker and R2 usage. Continue to approve this setup and create the folder.`:undefined;
  namedOperation(title,action==='mkdir'?'Folder name':'New name',action==='rename'?(entry.displayName??entry.key.split('/').filter(Boolean).at(-1)):'',
   offerFilePreparation(title,run,detail));
  return;
 }
 if(action==='move'){
  namedOperation('Move','Destination folder in '+captured.bucketName,captured.prefix,
   offerFilePreparation('Move',(prefix,allow)=>finishFileAction(action,{...params,destination:{...captured,prefix:prefix&&!prefix.endsWith('/')?prefix+'/':prefix}},allow)));
  return;
 }
 const remove=offerFilePreparation('Delete',allow=>finishFileAction(action,params,allow));
 if(confirmExplorerDelete){
  dialog('Delete permanently?', '<p>'+esc(entry.displayName??entry.key)+(entry.folder?' and all objects inside it':'')+'</p><p role="status" id="delete-feedback"></p>',
   '<div class="dialog-foot"><button id="cancel-delete">Cancel</button><button id="confirm-delete">Delete</button></div>');
  listen('#cancel-delete','click',closeDialog);
  listen('#confirm-delete','click',async()=>{
   const button=$('#confirm-delete');button.disabled=true;$('#delete-feedback').textContent='Deleting…';
   try{await remove();if(button.isConnected)closeDialog();}
   catch(error){if(button.isConnected){$('#delete-feedback').textContent=fileError('Delete',error);button.disabled=false;}}
  });
 }else try{await remove();}catch(error){status(fileError('Delete',error),{attention:true});}
}
async function pasteFiles(destination){
 const original=fileClipboard;if(!original)return;
 const clip=structuredClone(original);let completed=0;
 const transfer=async approved=>{
  try{
   for(const entry of clip.entries.slice(completed)){
    await runFileAction(clip.action,{source:clip.source,destination,entry},approved);
    completed++;
    if(clip.action==='move'&&fileClipboard===original)original.entries.shift();
   }
  }catch(error){
   if(error.code==='FILE_SETUP_APPROVAL_REQUIRED'&&!approved){setupDisclosure('Prepare file transfer',()=>transfer(true));return;}
   status((completed?completed+' items verified. ':'')+fileError('Paste',error),{attention:true});
   if(approved)throw error;
  }finally{
   if(fileClipboard===original&&!original.entries.length)fileClipboard=null;
   if(completed&&view==='explorer'){listingReader.invalidate();await reloadCurrentDirectory();}
  }
 };
 await transfer(false);
}
async function chooseRemoteSave(entry){const capabilities=await api('describeCapabilities');if(capabilities.providers?.cloudflare?.explorerSource===false){dialog('Save to cloud','<p>This private Explorer file has no authorized remote source transfer. Cloudflare never stages file bytes through your browser.</p><button id="download-stream">Download instead</button>');listen('#download-stream','click',()=>downloadEntry(entry));return;}
  const captured=structuredClone(source),menu=await api('previewContextMenu',{context:'link'}),leaves=[];
  function render(items){return items.map(item=>{if(item.role==='save'||item.role==='provider-action'){const i=leaves.push(item)-1;return `<p><button data-cloud-save="${i}" ${!item.enabled||!menu.nativeAcknowledged?'disabled':''}>${esc(item.label)}${!item.enabled?' · '+esc(item.reason):''}</button></p>`;}return item.role==='branch'?`<details open><summary>${esc(item.label)}</summary>${render(item.children)}</details>`:'';}).join('');}
  dialog('Save to cloud',`<p>${esc(entry.displayName??entry.key)}</p>${render(menu.roots)||'<p>No configured destinations.</p>'}<p class="muted">Saving requires current source-account authorization, a native menu ACK and a verified provider transport.</p>`);
  $$('[data-cloud-save]').forEach(b=>b.onclick=async()=>{try{const item=leaves[b.dataset.cloudSave];if(!confirm('Save this file to '+item.label+'?'))return;if(item.providerAction){await api('invokeProviderAction',{provider:item.providerAction,idempotencyKey:crypto.randomUUID()});return;}const r=await api('dispatchExplorerSave',{itemId:item.itemId,generation:menu.generation,context:'link',source:captured,entry:{key:entry.key,folder:false,...(entry.displayName?{displayName:entry.displayName}:{})},idempotencyKey:crypto.randomUUID()});status(r.confirmed?'Save verified by provider readback.':r.code);closeDialog();}catch(error){status(error.message);}});
}
const completedDestinationMessage=result=>result.destinationReadiness?.length?'Saved · Ready for right-click':'Saved · Chrome menu acknowledged';
const saveButton='<button id="save" class="primary">Save</button>';
const saveFeedback='<p id="destination-save-status" class="muted" role="status" aria-live="polite" hidden></p>';
const destinationSetupDisclosure='<p class="muted" data-aesthetic-text="destinations.worker-explanation">Save prepares or maintains the private Cloudflare Worker for the selected destinations and checks a small R2 verification file when needed. Worker and R2 usage may incur charges. Setup covers the selected bucket.</p><details class="minimal-only"><summary>Setup and usage</summary><p>Save can authorize a private Worker for the selected bucket and a small R2 verification file. Cloudflare usage may incur charges.</p></details>';
function showInChrome(display,attribute){
 return '<h3>Show in Chrome</h3><div class="show-mode-checkboxes">'+[['simple','Simple'],['nested','Narrow'],['depth','Depth']].map(([mode,label])=>
  `<label><input ${attribute}="${mode}" type="checkbox" ${display[mode]?'checked':''}> ${label}</label>`).join('')+'</div>';
}
function popupFooter(){return '<div id="level-action"></div><div class="show-controls" id="show-controls"></div>'+destinationSetupDisclosure+saveFeedback+'<div class="dialog-foot"><button id="cancel">Cancel</button>'+saveButton+'</div>';}
function destinationDraft(session){
  return session.changes.length?applyConfigChanges(session.base,session.changes):session.base;
}
function bindDestinationSave(session,mode,readChanges,afterSave){
  listen('#save','click',async()=>{
    const button=$('#save'),feedback=$('#destination-save-status');
    const setFeedback=text=>{feedback.textContent=text;feedback.hidden=!text;};
    const controls=$$('#dialog button:not(:disabled), #dialog input:not(:disabled), #dialog select:not(:disabled)').filter(control=>control.id!=='close-dialog');
    let retryOnly=!!session.attempt?.persisted;
    controls.forEach(control=>control.disabled=true);
    try{
      const changes=session.attempt?.persisted?session.attempt.changes:structuredClone(readChanges());
      const serialized=JSON.stringify(changes);
      if(!session.attempt||session.attempt.serialized!==serialized){
        const display=changes.findLast(c=>c.type==='setShowInChrome')?.show;
        const modes=['simple','nested','depth'];
        const prepareModes=modes.filter(m=>(!changes.length&&m===mode)||display?.[m]&&!session.base.product.show[m]);
        session.attempt={serialized,changes,prepareModes,expectedRevision:session.base.product.revision,idempotencyKey:crypto.randomUUID()};
      }
      const attempt=session.attempt;
      setFeedback('Saving configuration, checking destination readiness and applying the Chrome menu…');
      const result=await change(attempt.changes,{...attempt,confirmed:true});
      if(!button.isConnected||!$('#dialog').open)return;
      if(result.native.state!=='completed'){
        attempt.persisted=attempt.changes.length>0;retryOnly=attempt.persisted;
        button.textContent='Retry Save';
        if(result.native.code==='CONFIGURATION_SUPERSEDED'){
          setFeedback('A newer configuration was saved. Reopen Destinations to review it.');
          return;
        }
        const blocked=result.destinationReadiness?.find(r=>r.state!=='READY');
        setFeedback(blocked
          ?'Configuration saved. '+blocked.target.bucketName+'/'+blocked.target.prefix+' is unavailable ('+(names[blocked.code]??blocked.code)+'). Use Retry Save after resolving the issue.'
          :'Configuration saved. Chrome menu application is incomplete ('+result.native.code+'). Use Retry Save.');
        return;
      }
      session.base=result.configuration;session.changes=[];session.attempt=null;
      await afterSave(result);
    }catch(error){
      button.textContent='Retry Save';
      setFeedback(error.code==='REVISION_CONFLICT'||error.code==='GENERATION_CONFLICT'
        ?'Configuration changed in another window. Reopen Destinations and review your edits.'
        :error.method==='reconcileNativeMenu'
          ?'Chrome menu application is incomplete ('+error.code+'). Use Retry Save.'
          :'Save could not be confirmed. '+(names[error.code]??error.message)+' Use Retry Save.');
    }finally{controls.forEach(control=>control.disabled=retryOnly&&control!==button&&!['back-manager','cancel'].includes(control.id));}
  });
}
function openPopup(t,existing=null,managerDraft=null){
  if(!t)return;const fromManager=!!managerDraft,configuration=fromManager?destinationDraft(managerDraft):state;
  const buckets=structuredClone(bucketTargets),captured=structuredClone(t),session=managerDraft??{base:configuration,changes:[]};let mode=existing?.mode??'simple',drafts={},display=structuredClone(configuration.product.show),selectedLevels=new Set(),selectMode=false,lastLevel=0,depthScopes=structuredClone(configuration.configs.depth.scopes);
  const original=existing?configuration.configs[mode].destinations.find(d=>d.id===existing.id):null;
  const draft=m=>drafts[m]??=(m===existing?.mode?structuredClone(original):{target:captured,label:'',levels:{}});
  function render(){
    const d=draft(mode),paths=ancestors(captured.prefix);
    const body=`${fromManager?'<button id="back-manager">← Back to Destinations</button>':''}<div class="tabs">${['simple','nested','depth'].map(m=>`<button data-mode="${m}" class="${mode===m?'active':''}" ${existing&&m!==mode?'disabled':''}>${m==='nested'?'Narrow':m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div><div class="target">${esc(captured.bucketName+'/'+captured.prefix)}</div>${mode==='depth'?`<p class="muted">Display only discovered folders in explicitly enabled buckets.</p>${buckets.length?buckets.map((b,i)=>{const scope=depthScopes.find(s=>scopeKey(s.target)===scopeKey(b));return `<label><input data-bucket="${i}" type="checkbox" ${scope?'checked':''}> ${esc(b.bucketName)} <input data-depth="${i}" aria-label="Display depth for ${esc(b.bucketName)}" type="number" min="1" value="${scope?.maxDepth??10}"></label>`;}).join(''):'<p>Expand authorized accounts to load their buckets first.</p>'}`:`<label>Menu Title <input id="title" value="${esc(d.label??'')}" placeholder="${esc(captured.prefix.split('/').filter(Boolean).at(-1)??captured.bucketName)}"></label>${mode==='nested'?`<div class="between"><h2>Menu Titles</h2><button id="hierarchy-toggle">${d.visibilityMode==='hide-all'?'Show All':'Hide All'}</button>${d.visibilityMode&&d.visibilityMode!=='custom'?'<button id="custom-visibility">Restore custom visibility</button>':''}<button id="select-mode" aria-pressed="${selectMode}">Select Mode</button></div><div class="tabs"><button id="select-all">Select All</button><button id="clear-levels">Clear</button><span id="selection-count" class="muted">${selectedLevels.size} selected</span></div><div class="title-row muted"><span></span><span>Actual folder</span><span>Menu title</span></div>${paths.map((p,i)=>`<div class="title-row ${selectedLevels.has(p)?'selected':''} ${levelHidden(d,p)?'hidden-level':''}"><input data-level="${i}" aria-label="Select ${esc(p.split('/').at(-2))}" type="checkbox" ${selectedLevels.has(p)?'checked':''} ${!selectMode||p===captured.prefix?'disabled':''}><span title="${esc(p)}">${esc(p.split('/').at(-2))}</span><input data-alias="${i}" aria-label="Menu title for ${esc(p.split('/').at(-2))}" type="text" value="${esc(d.levels?.[p]?.label??'')}"></div>`).join('')}`:''}`}`;
    dialog(existing?'Edit destination':'+ Right Click',body,popupFooter());
    $('#show-controls').innerHTML=showInChrome(display,'data-show')+`<div class="show-mode-actions"><button id="all">All</button><button id="flat" title="Keep checked mode trees; use an unassigned saved Default as a direct choice." aria-pressed="${display.flat}">Flat</button></div>`;
    $$('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;selectedLevels.clear();render();});
    listen('#title','input',e=>{d.label=e.target.value;if(mode==='nested'&&paths.length){const last=paths.at(-1);d.levels??={};d.levels[last]={...d.levels[last]};if(d.label)d.levels[last].label=d.label;else delete d.levels[last].label;const input=$(`[data-alias="${paths.length-1}"]`);if(input)input.value=d.label;}});
    $$('[data-alias]').forEach(input=>input.oninput=()=>{const p=paths[Number(input.dataset.alias)];d.levels??={};d.levels[p]={...d.levels[p]};if(input.value)d.levels[p].label=input.value;else delete d.levels[p].label;if(p===paths.at(-1)){d.label=input.value;$('#title').value=input.value;}});
    listen('#hierarchy-toggle','click',()=>{d.visibilityMode=d.visibilityMode==='hide-all'?'all':'hide-all';render();});listen('#custom-visibility','click',()=>{d.visibilityMode='custom';render();});listen('#select-mode','click',()=>{selectMode=!selectMode;render();});listen('#select-all','click',()=>{selectMode=true;selectedLevels=new Set(paths.filter(p=>p!==captured.prefix));render();});listen('#clear-levels','click',()=>{selectedLevels.clear();render();});
    $$('[data-level]').forEach(input=>input.onclick=e=>{const i=Number(input.dataset.level);if(e.shiftKey){for(let j=Math.min(i,lastLevel);j<=Math.max(i,lastLevel);j++)selectedLevels.add(paths[j]);}else if(input.checked)selectedLevels.add(paths[i]);else selectedLevels.delete(paths[i]);lastLevel=i;render();});
    if(mode==='nested'&&selectedLevels.size){const hidden=[...selectedLevels].every(p=>levelHidden(d,p));$('#level-action').innerHTML=`<div class="show-controls"><button id="hide-levels" class="${hidden?'':'primary'}">${hidden?'Show':'Hide'} selected</button><span>${selectedLevels.size} selected</span></div>`;listen('#hide-levels','click',()=>{d.levels??={};d.visibilityMode='custom';for(const p of selectedLevels)if(p!==captured.prefix)d.levels[p]={...d.levels[p],hidden:!hidden};render();});}
    $$('[data-show]').forEach(input=>input.onchange=()=>{display[input.dataset.show]=input.checked;render();});listen('#all','click',()=>{display={simple:true,nested:true,depth:true,flat:false};render();});listen('#flat','click',()=>{display.flat=!display.flat;render();});
    const readDepth=()=>{
      depthScopes=[...depthScopes.filter(s=>!buckets.some(b=>scopeKey(b)===scopeKey(s.target))),...$$('[data-bucket]:checked').map(input=>{
        const i=Number(input.dataset.bucket),target=buckets[i],previous=depthScopes.find(s=>scopeKey(s.target)===scopeKey(target));
        return {...previous,target,maxDepth:$('[data-depth="'+i+'"]').valueAsNumber};
      })];
    };
    for(const input of $$('[data-bucket], [data-depth]'))input.oninput=()=>{
      readDepth();
      if(input.matches('[data-bucket]')&&input.checked&&!display.depth){
        display.depth=true;
        $('[data-show="depth"]').checked=true;
      }
    };
    const back=()=>fromManager?manager(existing.mode,0,managerDraft.attempt?.persisted?null:managerDraft):closeDialog();
    listen('#cancel','click',back);listen('#back-manager','click',back);
    bindDestinationSave(session,mode,()=>{
      const changes=[];
      for(const [m,rec] of Object.entries(drafts).filter(([m])=>m===mode))if(m!=='depth') {
        if(existing)changes.push({type:'updateDestination',mode:m,id:existing.id,label:rec.label??'',...(m==='nested'?{levels:rec.levels??{},...(rec.visibilityMode?{visibilityMode:rec.visibilityMode}:{})}:{})});
        else changes.push({type:'createDestination',mode:m,target:captured,...(rec.label?{label:rec.label}:{}),...(m==='nested'?{levels:rec.levels??{},...(rec.visibilityMode?{visibilityMode:rec.visibilityMode}:{})}:{})});
      }
      if(mode==='depth'){readDepth();if(depthScopes.some(s=>!Number.isSafeInteger(s.maxDepth)||s.maxDepth<1))throw Error('Enter a positive whole number for each selected bucket.');}
      if(mode==='depth')changes.push({type:'setDepthDisplayBuckets',scopes:depthScopes});
      changes.push({type:'setShowInChrome',show:display});
      return [...session.changes,...changes];
    },async result=>{
      if(fromManager)await manager(existing.mode,0,managerDraft,completedDestinationMessage(result));
      else closeDialog();
    });
  }render();
}
async function manager(filter='simple',page=0,session=null,message=''){
  const ticket=viewEpoch;
  if(!session){await refreshState();if(ticket!==viewEpoch)return;session={base:state,changes:[]};}
  const configuration=destinationDraft(session),product=configuration.product;
  const rows=configuration.configs[filter].destinations??configuration.configs[filter].scopes;
  const total=rows.length,items=rows.slice(page*20,page*20+20);
  const isDepth=filter==='depth';
  const rowLabel=d=>d.label??d.target.prefix.split('/').filter(Boolean).at(-1)??d.target.bucketName;
  const isDefault=d=>!!product.defaultTarget&&targetKey(d.target)===targetKey(product.defaultTarget);
  const rowHtml=(d,i)=>`<div class="dest-row ${d.hidden?'hidden':''}">
    <strong>${esc(rowLabel(d))}</strong><div class="muted">Cloudflare R2 · ${esc(d.target.accountId+' · '+d.target.bucketName+'/'+d.target.prefix)}</div>
    ${isDepth?'':`<button data-default="${i}" aria-pressed="${isDefault(d)}" ${isDefault(d)?'class="badge" aria-label="Default destination: '+esc(rowLabel(d))+'"':''}>${isDefault(d)?'Default':'Make Default'}</button>`}
    <div class="controls">
      <button data-hide="${i}" aria-label="${isDepth?'Change visibility for '+esc(d.target.bucketName):'Change Visibility'}" aria-pressed="${!d.hidden}"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor"><path d="M1 10Q10 -2 19 10Q10 22 1 10Z"/><circle cx="10" cy="10" r="3"/>${d.hidden?'<path d="M2 2L18 18"/>':''}</svg></button>
      ${isDepth?`<label>Maximum depth <input data-manager-depth="${i}" type="number" min="1" step="1" value="${d.maxDepth}" aria-label="Display depth for ${esc(d.target.bucketName)}"></label>`:
      `<button data-quick="${i}" aria-pressed="${!!d.quick}">${d.quick?'Quick ✓':'Quick Select'}</button><button data-edit="${i}" aria-label="Edit Menu Title">✎</button>`}
      <button data-delete="${i}" aria-label="${isDepth?'Remove Depth bucket '+esc(d.target.bucketName):'Remove destination configuration'}">🗑</button>
    </div></div>`;
  dialog('Destinations',`<div class="between"><div class="tabs">${[['simple','Simple'],['nested','Narrow'],['depth','Depth']].map(([mode,label])=>
    `<button data-manager-mode="${mode}" class="${mode===filter?'active':''}">${label}</button>`).join('')}</div>
    <button id="organize" class="circle" aria-label="Organize Right-Click" title="Organize Right-Click">☷</button></div>
    <p class="muted" data-aesthetic-text="destinations.availability-hint">${connection?.state==='CONNECTED'?'Availability depends on the connected account.':'Reconnect to use saved destinations.'}</p>
    <p class="wrap-text">${product.defaultTarget?'Default: '+esc(product.defaultTarget.accountId+' · '+product.defaultTarget.bucketName+'/'+product.defaultTarget.prefix):'No default selected'}</p>
    <div id="dest-list"${isDepth?' class="depth-destinations"':''}>${items.map(rowHtml).join('')||'<p class="muted">No assigned destinations in this filter.</p>'}</div>
    <div id="destination-delete-confirmation" class="card" role="group" aria-labelledby="destination-delete-title" hidden></div>
    ${isDepth?'<div id="manager-buckets"></div>':''}<button id="browse-destinations">Browse Cloudflare buckets</button>
    <div class="show-controls">${showInChrome(product.show,'data-manager-show')}</div>
    ${destinationSetupDisclosure}${saveFeedback}`,`<div class="dialog-foot"><button id="previous" ${!page?'disabled':''}>Previous</button><span>${total?`${page*20+1}–${Math.min(total,page*20+20)} of ${total}`:'0 destinations'}</span><button id="next" ${(page+1)*20>=total?'disabled':''}>Next</button>${saveButton}</div>`);
  const feedback=$('#destination-save-status');
  feedback.textContent=message||(session.changes.length?'Unsaved changes':'');feedback.hidden=!feedback.textContent;
  const stage=edit=>{
    session.attempt=null;
    if(edit.type==='setShowInChrome')session.changes=session.changes.filter(c=>c.type!==edit.type);
    session.changes.push(edit);feedback.textContent='Unsaved changes';feedback.hidden=false;};
  const rerender=async(nextPage=page)=>{const scroll=$('.dialog-body').scrollTop;await manager(filter,nextPage,session);$('.dialog-body').scrollTop=scroll;};
  const stageScopes=scopes=>{
    session.changes=session.changes.filter(c=>c.type!=='setDepthDisplayBuckets');
    stage({type:'setDepthDisplayBuckets',scopes});
  };
  const withDepthInputs=()=>{
    const inputs=$$('[data-manager-depth]');
    for(const input of inputs)if(!Number.isSafeInteger(input.valueAsNumber)||input.valueAsNumber<1){input.reportValidity();throw Error('Enter a positive whole number for each selected bucket.');}
    return rows.map((scope,i)=>{const input=$('[data-manager-depth="'+(i-page*20)+'"]');return input?{...scope,maxDepth:input.valueAsNumber}:scope;});
  };
  const captureDepth=()=>{
    if(!isDepth)return;
    const scopes=withDepthInputs();
    if(scopes.some((scope,i)=>scope.maxDepth!==rows[i].maxDepth))stageScopes(scopes);
  };
  const update=async(i,key)=>{
    const d=items[i];
    if(isDepth)stageScopes(withDepthInputs().map((s,n)=>n===page*20+i?{...s,hidden:!d.hidden}:s));
    else stage({type:'updateDestination',mode:filter,id:d.id,[key]:!d[key]});
    await rerender();
  };
  $$('[data-default]').forEach(b=>listen('[data-default="'+b.dataset.default+'"]','click',async()=>{
    const d=items[b.dataset.default];stage(isDefault(d)?{type:'clearDefault'}:{type:'makeDefault',target:d.target});await rerender();
  }));
  $$('[data-hide]').forEach(b=>listen('[data-hide="'+b.dataset.hide+'"]','click',()=>update(Number(b.dataset.hide),'hidden')));
  $$('[data-quick]').forEach(b=>listen('[data-quick="'+b.dataset.quick+'"]','click',()=>update(Number(b.dataset.quick),'quick')));
  $$('[data-edit]').forEach(b=>b.onclick=()=>{const d=items[b.dataset.edit];openPopup(d.target,{id:d.id,mode:filter},session);});
  const deletion=$('#destination-delete-confirmation');let deleteReturnButton=null;
  const cancelDeletion=()=>{deletion.hidden=true;$('#save').disabled=false;deleteReturnButton?.focus();};
  deletion.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelDeletion();}};
  $$('[data-delete]').forEach(button=>{
    const selected=items[Number(button.dataset.delete)],identity=isDepth?scopeKey(selected.target):selected.id;
    button.onclick=()=>{
      deleteReturnButton=button;deletion.innerHTML=`<h3 id="destination-delete-title">Remove ${esc(rowLabel(selected))}?</h3><p>Remove only this menu configuration when you Save. Cloud files and folders are kept.</p><p class="target">${esc(selected.target.accountId+' · '+selected.target.bucketName+'/'+selected.target.prefix)}</p><button id="cancel-destination-delete">Cancel</button> <button id="confirm-destination-delete">Remove from draft</button>`;
      button.closest('.dest-row').append(deletion);deletion.hidden=false;$('#save').disabled=true;
      $('#cancel-destination-delete').onclick=cancelDeletion;
      $('#confirm-destination-delete').onclick=async event=>{
        const confirmButton=event.currentTarget;if(confirmButton.disabled)return;confirmButton.disabled=true;
        try{
          const current=destinationDraft(session).configs[filter],present=(current.destinations??current.scopes).some(row=>(isDepth?scopeKey(row.target):row.id)===identity);
          if(!present)throw Error('This destination is no longer in the draft. Reopen Destinations to review it.');
          if(isDepth)stageScopes(withDepthInputs().filter(scope=>scopeKey(scope.target)!==identity));
          else stage({type:'deleteDestinationConfig',mode:filter,id:identity});
          await rerender(Math.min(page,Math.max(0,Math.ceil((total-1)/20)-1)));
          $('#save').focus({preventScroll:true});
        }catch(error){feedback.textContent='Removal could not be staged. '+error.message;feedback.hidden=false;confirmButton.disabled=false;}
      };
      $('#cancel-destination-delete').focus();
    };
  });
  $$('[data-manager-show]').forEach(input=>input.onchange=()=>{
    stage({type:'setShowInChrome',show:{...product.show,...Object.fromEntries($$('[data-manager-show]').map(box=>[box.dataset.managerShow,box.checked]))}});
  });
  $$('[data-manager-mode]').forEach(b=>listen('[data-manager-mode="'+b.dataset.managerMode+'"]','click',()=>{captureDepth();return manager(b.dataset.managerMode,0,session);}));
  listen('#previous','click',()=>{captureDepth();return rerender(page-1);});
  listen('#next','click',()=>{captureDepth();return rerender(page+1);});
  listen('#organize','click',()=>{captureDepth();return organize(session,()=>manager(filter,page,session));});
  listen('#browse-destinations','click',async()=>{if((session.changes.length||isDepth&&$$('[data-manager-depth]').some((input,i)=>input.valueAsNumber!==items[i].maxDepth))&&!confirm('Discard unsaved destination edits and browse Cloudflare buckets?'))return;closeDialog();await show('explorer');});
  bindDestinationSave(session,filter,()=>{captureDepth();return session.changes;},result=>manager(filter,page,session,completedDestinationMessage(result)));
  if(isDepth)void loadManagerBuckets();
  async function loadManagerBuckets(){
    const region=$('#manager-buckets');
    if(connection.state!=='CONNECTED')return;
    region.textContent='Loading available buckets…';
    const candidates=[];
    try{
      for(const account of connection.accounts){
        let cursor='';const seen=new Set();
        do{
          const result=await api('listAuthorizedBuckets',{accountId:account.id,...(cursor?{cursor}:{})},{quiet:true});
          if(result.state!=='completed')throw Error(result.code);
          for(const bucket of result.data.buckets)candidates.push({provider:'cloudflare',connectionId:'cloudflare:'+account.id,accountId:account.id,bucketName:bucket.name,prefix:''});
          cursor=result.data.cursor??'';
          if(cursor&&seen.has(cursor))throw Error('PAGINATION_STALLED');
          seen.add(cursor);
        }while(cursor);
      }
      if(!region.isConnected)return;
      const available=[...new Map(candidates.map(t=>[scopeKey(t),t])).values()].filter(t=>!rows.some(row=>scopeKey(row.target)===scopeKey(t)));
      region.innerHTML=available.length?`<label>Add Depth bucket <select id="manager-bucket-choice">${available.map((t,i)=>`<option value="${i}">${esc(t.accountId+' · '+t.bucketName)}</option>`).join('')}</select></label> <button id="add-manager-bucket">Add</button>`:'';
      if($('#save').disabled||session.attempt?.persisted){region.replaceChildren();return;}
      listen('#add-manager-bucket','click',async()=>{
        const target=available[Number($('#manager-bucket-choice').value)];
        stageScopes([...withDepthInputs(),{target,maxDepth:10}]);
        if(!product.show.depth)stage({type:'setShowInChrome',show:{...product.show,depth:true}});
        await rerender(Math.floor(total/20));
      });
    }catch{region.textContent='Available buckets could not be loaded. Switch back to Depth to retry.';}
  }
}
async function organize(managerDraft,back=closeDialog){
  const spec=await api('previewNativeMenu'),providers=[...new Set(spec.rows.filter(r=>r.origin?.provider).map(r=>r.origin.provider))],placement={...destinationDraft(managerDraft).product.placement};
  dialog('Organize Right-Click',`<p class="muted">The four providers lead; Quick Select shortcuts follow and do not duplicate Cloudflare children.</p>${providers.map((p,i)=>`<div class="settings-row"><span>${esc(p==='cloudflare'?'Cloudflare':p)}</span><button data-placement="${i}">${placement[p]==='other'?'Under REDOWN':'Keep Direct'}</button></div>`).join('')||'<p>No configured providers yet.</p>'}<p id="layout-preview" class="muted"></p>`,`<div class="dialog-foot"><button id="cancel">Cancel</button><button id="save" class="primary">Done</button></div>`);
  const preview=()=>{$('#layout-preview').textContent='Providers → '+providers.filter(p=>placement[p]!=='other').join(', ')+(providers.some(p=>placement[p]==='other')?' → Other Clouds: '+providers.filter(p=>placement[p]==='other').join(', '):'');};preview();
  $$('[data-placement]').forEach(b=>b.onclick=()=>{const p=providers[b.dataset.placement];placement[p]=placement[p]==='other'?'direct':'other';b.textContent=placement[p]==='other'?'Under REDOWN':'Keep Direct';preview();});listen('#cancel','click',back);listen('#save','click',async()=>{
    managerDraft.attempt=null;
    managerDraft.changes.push(...providers.map(p=>({type:'setProviderPlacement',provider:p,placement:placement[p]??'direct'})));
    await back();
  });
}
async function suggestion(){if(!$('#suggestion')||!suggestionDue)return;try{const s=await api('getOrganizationSuggestion');if(!s.eligible){$('#suggestion').replaceChildren();$('#suggestion').className='';return;}$('#suggestion').innerHTML='<span>Many direct entries. Organize your right-click menu?</span><button id="suggest-organize">Organize</button><button id="dismiss-suggestion" aria-label="Dismiss organization suggestion">×</button>';$('#suggestion').className='suggestion';listen('#suggest-organize','click',organize);listen('#dismiss-suggestion','click',async()=>{await change({type:'dismissOrganizationSuggestion',signature:s.signature});$('#suggestion').replaceChildren();$('#suggestion').className='';});}catch{}}
async function renderSettings(){
  await aestheticReady;
  const [recovery,visual]=await Promise.all([api('inspectBackupRoots'),api('getGalleryLoadingVisual')]);if(view!=='settings')return;const policy=state.product.recovery;
  const providerMenuOptions=[['google-drive','Google Drive'],['dropbox','Dropbox'],['onedrive','OneDrive'],['cloudflare','Cloudflare']];
  $('#main').innerHTML=`<section class="page"><h1>Settings</h1>${state.product.defaultTarget?'<button id="clear-default">Remove Default Location</button>':''}<div class="card"><h2>Appearance</h2><div class="settings-row"><label for="appearance">Appearance</label><select id="appearance">${aesthetic.list().map(theme=>'<option value="'+esc(theme.id)+'">'+esc(theme.name)+'</option>').join('')}</select></div><p id="aesthetic-status" role="status"></p><div class="settings-row"><label for="setting-theme">Theme</label><select id="setting-theme"><option value="dark">Dark</option><option value="light">Light</option></select></div></div><div class="card"><h2>Gallery loading visual</h2><label for="loading-visual-mode">Loading visual</label><select id="loading-visual-mode"><option value="math">Mathematical geometry</option><option value="media">My local media</option><option value="plain">Plain placeholder</option></select><label>Choose local loading media <input id="loading-visual-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4"></label><p class="muted">${esc(visual.warning?'Custom media is unavailable; choose a replacement or remove it.':visual.media?.name??'No custom media selected')}. One local visual, up to 8 MiB; never uploaded. Reduced motion uses a still frame.</p><button id="loading-visual-remove" ${!visual.media&&!visual.warning?'disabled':''}>Remove local media</button><p id="loading-visual-result" role="status"></p></div><div class="card"><h2>Right-click menu</h2><p class="muted">Choose which cloud providers appear in Chrome's right-click menu. Turning one off keeps its account, files and saved destinations.</p>${providerMenuOptions.map(([provider,name])=>`<label class="settings-row"><span>${name}</span><input type="checkbox" data-provider-visible="${provider}" ${state.product.providerVisibility?.[provider]!==false?'checked':''} aria-label="Show ${name} in Chrome right-click menu"></label>`).join('')}</div>${manifestCard}<div class="card"><h2>Favorite Cloud</h2><p class="muted">A personal marker for future use. It does not change saves or menus.</p>${(connection?.accounts??[]).map((a,i)=>`<label><input type="checkbox" data-favorite="${i}" ${state.product.favorites.includes('cloudflare:'+a.id)?'checked':''}> ${esc(a.name)}</label>`).join('')||'<p class="muted">Connect an account to mark a favorite.</p>'}</div><div id="settings-recovery" class="card" data-debug-only hidden><h2>Recovery Mode</h2><p class="muted">External storage: ${esc(recovery.state)}. Automatic Windows known-folder storage requires a native companion.</p><label>Cadence <select id="cadence"><option value="weekly">Weekly · Monday</option><option value="daily">Daily</option></select></label><label><input type="checkbox" id="simple-recovery" ${policy.simple?'checked':''}> Simple Recovery</label><label><input type="checkbox" id="narrow-recovery" ${policy.nested?'checked':''}> Narrow Recovery</label><details><summary>Bucket recovery crawl</summary><p class="muted">Recovery depth is independent of Chrome display depth. Expand accounts in File Explorer to discover buckets.</p>${bucketTargets.map((b,i)=>{const policy=state.product.recovery.buckets.find(p=>p.target.accountId===b.accountId&&p.target.bucketName===b.bucketName);return `<label><input data-recovery="${i}" type="checkbox" ${policy?.enabled?'checked':''}> ${esc(b.bucketName)} <input type="number" min="1" data-crawl-depth="${i}" aria-label="Recovery depth for ${esc(b.bucketName)}" value="${policy?.depth??10}"></label>`;}).join('')}</details><label>Windows Backup Location <select id="backup-location"><option value="automatic">Automatic · Local AppData</option><option value="documents">Documents</option></select></label><p class="muted">Windows locations are unavailable without a native companion. A user-authorized external folder can be attached separately.</p><button id="choose-backup">Choose external backup folder</button><button id="backup-now">Back up now</button><button id="restore">Restore My Right-Click Menu</button></div><div id="settings-whole-cloud" class="card" data-debug-only hidden><h2>Save Whole Cloud</h2><p class="muted">Read-only bucket/key outline. Starts only when explicitly enabled and external storage is authorized. Lost authorization quietly pauses the job.</p>${(connection?.accounts??[]).map((a,i)=>`<label><input type="checkbox" data-whole="${i}"> Cloudflare · ${esc(a.name)}</label>`).join('')||'<p class="muted">No connected supported accounts.</p>'}<button id="enable-whole">Enable selected accounts</button><button id="stop-whole">Stop selected accounts</button><button id="whole-status">Inspect jobs</button><pre id="jobs"></pre></div><div id="settings-connection" class="card" data-debug-only hidden><h2>Connection</h2><p id="oauth-redirect-uri" class="muted wrap-text">${esc(connection?.redirectUri??'')}</p><button id="disconnect" ${!connection?.authenticated&&connection?.state!=='CONNECTED'?'disabled':''}>Disconnect Cloudflare</button></div><div class="card"><h2>Programmatic access</h2><p class="muted" data-aesthetic-text="settings.help-copy">The V3+1 API powers these controls. Agent execution requires a separate local grant scoped to methods, accounts, and expiry. No public endpoint or active MCP connection.</p><button id="capabilities">Inspect API capabilities</button><pre id="api-info"></pre></div></section>`;
  mountManifestPanel($('#portable-menu-manifests'),{api:(method,params)=>api(method,params,{quiet:true}),accounts:()=>connection?.accounts??[],getRevision:()=>state.product.revision,onApplied:async()=>{await refreshState();}});
  const debugCard=document.createElement('div');debugCard.className='card';debugCard.innerHTML='<h2>Debug</h2><label><input id="debug-mode" type="checkbox"> Debug Mode</label><p class="muted" data-aesthetic-text="settings.help-copy">Show diagnostic status and inspect safe local details. This does not grant additional access or change saving.</p><div id="debug-details" data-debug-only hidden><button id="show-save-results">Review save results</button><button id="debug-health">Inspect safe diagnostics</button><pre id="debug-health-output"></pre><div id="recorder-panel"></div></div><p id="debug-preference-result" role="status"></p>';$('#main .page').append(debugCard);applyDebugMode(debugMode);
  void import('./recorder-panel.mjs').then(m=>m.mountRecorderPanel(document.querySelector('#recorder-panel'))).catch(()=>{});
  const historySettings=document.createElement('div');historySettings.className='card';$('#main .page').append(historySettings);
  listen('#debug-mode','change',async event=>{const enabled=event.target.checked,feedback=$('#debug-preference-result');try{if(!enabled&&!confirm('Turn Debug Mode off and stop any expansive forensic recording? Basic diagnostics stays on.')){event.target.checked=true;return;}if(!enabled){let deadline;try{await Promise.race([chrome.runtime.sendMessage({channel:'recorder',version:2,method:'stop',params:{}}),new Promise(resolve=>{deadline=setTimeout(resolve,2000);})]);}catch{}finally{clearTimeout(deadline);}}await debugPreference.set(enabled);applyDebugMode(enabled);if(feedback.isConnected)feedback.textContent='';}catch{applyDebugMode(debugPreference.enabled);if(feedback.isConnected)feedback.textContent='Debug Mode is OFF for this window; the preference could not be saved. Try again.';}});
  listen('#show-save-results','click',()=>{if(debugMode)return show('history');});
  listen('#debug-health','click',async()=>{const output=$('#debug-health-output');output.textContent='Reading local diagnostics…';try{const report=await api('getEngineHealth',{view:'support'},{quiet:true});if(output.isConnected)output.textContent=JSON.stringify(report,null,2);}catch{if(output.isConnected)output.textContent='Diagnostics are unavailable. Your saved data was kept.';}});
  const deleteSetting=document.createElement('label');
  deleteSetting.innerHTML='<input id="confirm-explorer-delete" type="checkbox"> Confirm before deleting cloud files';
  $('#main .page').append(deleteSetting);$('#confirm-explorer-delete').checked=confirmExplorerDelete;
  listen('#confirm-explorer-delete','change',async e=>{
   try{await chrome.storage.local.set({[deletePreference]:e.target.checked});confirmExplorerDelete=e.target.checked;}
   catch(error){e.target.checked=confirmExplorerDelete;throw error;}
  });
  const preference=document.createElement('label');preference.innerHTML='<input id="auto-attention" type="checkbox"> Automatically open login/attention';$('#main .page').prepend(preference);$('#auto-attention').checked=state.product.autoOpenAttention;listen('#auto-attention','change',e=>change({type:'setAutoOpenAttention',visible:e.target.checked}));
  $('#appearance').value=aesthetic.getActive().id;
  listen('#appearance','change',async e=>{const result=await aesthetic.apply({id:e.target.value});const feedback=$('#aesthetic-status');if(feedback)feedback.textContent=result.error?'Appearance applied for this session; preference could not be saved.':'Appearance saved.';});
  $('#setting-theme').value=state.product.theme;$('#cadence').value=policy.cadence;$('#backup-location').value=policy.location;
  listen('#setting-theme','change',e=>change({type:'setTheme',theme:e.target.value}));
  $$('[data-provider-visible]').forEach(input=>input.onchange=async()=>{try{await change({type:'setProviderMenuVisibility',provider:input.dataset.providerVisible,visible:input.checked});}catch(e){input.checked=!input.checked;status(e.message);}});
  $$('[data-favorite]').forEach(input=>input.onchange=()=>change({type:'setFavorite',connectionId:'cloudflare:'+connection.accounts[input.dataset.favorite].id,favorite:input.checked}).catch(e=>status(e.message)));
  $('#loading-visual-mode').value=visual.mode;
  const saveVisual=async params=>{const result=await api('setGalleryLoadingVisual',{expectedRevision:visual.revision,...params});cachedGalleryVisual=null;await renderSettings();$('#loading-visual-result').textContent='Loading visual saved locally.';return result;};
  listen('#loading-visual-mode','change',async e=>{try{await saveVisual({mode:e.target.value});}catch(error){e.target.value=visual.mode;$('#loading-visual-result').textContent=error.code??error.message;}});
  listen('#loading-visual-remove','click',()=>saveVisual({mode:visual.mode==='media'?'math':visual.mode,removeMedia:true}));
  listen('#loading-visual-file','change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>LOADING_MEDIA_MAX_BYTES)throw Error('LOADING_MEDIA_TOO_LARGE');let binary='';const bytes=new Uint8Array(await file.arrayBuffer());for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));const media={name:file.name,type:file.type,base64:btoa(binary)};loadingMedia(media);await saveVisual({mode:'media',media});}catch(error){$('#loading-visual-result').textContent=error.code??error.message;}});
  listen('#clear-default','click',async()=>{if(confirm('Remove the default destination? Cloud files are kept. If all saved destinations are also removed, the next login can initialize redown again.')){await change({type:'clearDefault'});await renderSettings();}});
  for(const id of ['cadence','simple-recovery','narrow-recovery','backup-location'])listen('#'+id,'change',()=>change({type:'updateRecoveryPolicy',policy:{...state.product.recovery,cadence:$('#cadence').value,simple:$('#simple-recovery').checked,nested:$('#narrow-recovery').checked,location:$('#backup-location').value}}));
  for(const input of $$('[data-recovery], [data-crawl-depth]'))input.onchange=()=>change({type:'updateRecoveryPolicy',policy:{...state.product.recovery,buckets:[...state.product.recovery.buckets.filter(s=>!bucketTargets.some(b=>b.accountId===s.target.accountId&&b.bucketName===s.target.bucketName)),...bucketTargets.map((b,i)=>({target:b,enabled:$(`[data-recovery="${i}"]`).checked,depth:Number($(`[data-crawl-depth="${i}"]`).value)}))]}}).catch(e=>status(e.message));
  listen('#choose-backup','click',async()=>{
    if(!window.showDirectoryPicker)throw Error('External folder selection is unavailable in this browser.');
    const h=await window.showDirectoryPicker({mode:'readwrite',id:'click2cloud-recovery'});
    const {createCurrentStore}=await import('../src/persistence/current-store.mjs');const local=createCurrentStore();try{await local.stageBackupRoot(h);await api('chooseBackupLocation');status('External folder attached and verified.');}finally{await local.close();}await renderSettings();
  });
  listen('#backup-now','click',async()=>{const r=await api('writeRecovery');status('Backup '+r.state+' · external filesystem readback');});
  listen('#restore','click',inspectRecovery);
  const selectedClouds=()=>$$('[data-whole]:checked').map(input=>{const a=connection.accounts[input.dataset.whole];return {provider:'cloudflare',connectionId:'cloudflare:'+a.id,accountId:a.id};});
  listen('#enable-whole','click',async()=>{const ids=selectedClouds();if(!ids.length)throw Error('Select at least one account.');if(!confirm('Enable continuous read-only outlines for these accounts?'))return;for(const identity of ids)await api('enableWholeCloudJob',{identity,cadence:state.product.recovery.cadence});status('Whole Cloud enabled for selected accounts.');});
  listen('#stop-whole','click',async()=>{for(const identity of selectedClouds())await api('disableWholeCloudJob',{identity});status('Selected jobs stopped.');});
  listen('#whole-status','click',async()=>{$('#jobs').textContent=JSON.stringify(await api('inspectWholeCloudJobs'),null,2);});listen('#disconnect','click',async()=>{await api('disconnect');await connections();await renderSettings();status('Cloudflare disconnected. Saved destinations remain.');});
  listen('#capabilities','click',async()=>{const c=await api('describeCapabilities');$('#api-info').textContent=JSON.stringify({version:c.version,tools:c.tools.map(t=>({name:t.name,scope:t.scope})),publicEndpoint:c.publicEndpoint},null,2);});
  await historyUI.settings(historySettings);
  if(historySettings.isConnected){
    explorerExports.mountSettings(historySettings.parentElement);
    shortcuts.mount(historySettings.parentElement);
  }
}
const headerMore=$('#header-more'),headerMenu=$('#header-menu');
const headerItems=()=>[...headerMenu.querySelectorAll('button:not([hidden]):not(:disabled)')].filter(button=>button.getClientRects().length);
function closeHeaderMore(focus=false){headerMenu.hidden=true;headerMore.setAttribute('aria-expanded','false');if(focus)headerMore.focus();}
headerMore.onclick=()=>{headerMenu.hidden=!headerMenu.hidden;headerMore.setAttribute('aria-expanded',String(!headerMenu.hidden));if(!headerMenu.hidden)headerItems()[0]?.focus();};
headerMore.onkeydown=e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();headerMenu.hidden=false;headerMore.setAttribute('aria-expanded','true');const items=headerItems();items[e.key==='ArrowDown'?0:items.length-1]?.focus();}};
headerMenu.addEventListener('click',()=>closeHeaderMore());
headerMenu.addEventListener('keydown',e=>{const items=headerItems();if(e.key==='Escape'){e.preventDefault();closeHeaderMore(true);}else if(items.length&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();let i=items.indexOf(document.activeElement);items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();}else if(e.key==='Tab')closeHeaderMore(true);});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.header-more'))closeHeaderMore();});
$$('header nav [data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view).catch(e=>status(e.message)));listen('#manage','click',()=>manager());listen('#theme','click',async()=>{await change({type:'setTheme',theme:state.product.theme==='dark'?'light':'dark'});if(view==='settings')await renderSettings();});
document.addEventListener('pointerdown',e=>{if(!$('#context').contains(e.target))hideContext();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){const open=!$('#context').hidden;hideContext();if(open&&contextReturnElement?.isConnected)contextReturnElement.focus({preventScroll:true});}if(!$('#context').hidden&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const items=[...$('#context').querySelectorAll('button:not(:disabled),summary')].filter(item=>item.getClientRects().length),i=items.indexOf(document.activeElement);items[(i+(e.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();}});
$('#dialog').addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
async function bootstrap(){
 // Remotes and its independent controls precede every optional read. No fake config.
 view='remotes';$('#shell').dataset.view='remotes';renderRemotes();$$('header nav button, #manage').forEach(b=>b.disabled=false);$('header [data-view="remotes"]').classList.add('active');
 const configuration=readWithRetry(()=>refreshState({quiet:true,readTimeout:5000})).catch(error=>{configurationIssue={code:error.code??'CURRENT_READ_UNAVAILABLE',method:error.method,stage:error.stage,diagnostic:error.diagnostic};}).finally(()=>{if(view==='remotes'&&$('#remotes-connection'))renderRemotes();});
 const session=connections().finally(()=>{if(view==='remotes'&&$('#remotes-connection'))renderRemotes();});
 const description=readWithRetry(()=>api('describeCapabilities',{}, {quiet:true,readTimeout:5000})).then(value=>{capabilities=value;}).catch(()=>{});
 await Promise.allSettled([configuration,session,description]);
 await focusShelf().catch(()=>{});
}
void bootstrap();

async function authorizeCloudflare(accountId,target){
 target=target??(shelfRequest?.provider==='cloudflare'?shelfRequest.target:null);
 const code=cloudflareState?.code??cloudflareState?.worker?.code,renewal=['CAPABILITY_DENIED','WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED'].includes(code);
 if(target&&!confirm('Authorize preparation for '+selectedSetupLabel(target,connection?.accounts)+'? '+(renewal?'Click2Cloud will renew the shared signing key for this bucket’s private save Worker; all its folder saves use that renewed connection. ':'Click2Cloud may create or repair its private save Worker for all paths in this bucket. ')+'It will retain a small R2 verification file. Cloudflare may charge for usage. Existing cloud objects and saved destinations are kept. This does not retry the original source.'))return;
 const button=$('#authorize-selected')??$('#authorize-setup')??$('#cf-authorize')??$('#update-worker');if(button)button.disabled=true;
 try{await refreshState();const out=await api(target?'recoverCloudflareDestination':'approveCloudflareSetup',{...(target?{target,authorizeSetup:true}:{accountId}),expectedRevision:state.product.revision,idempotencyKey:crypto.randomUUID()});return await finishCloudflareSetup(out,target);}
 catch(e){cloudflareState={state:'PROVISIONING_BLOCKED',code:e.code,diagnostic:e.diagnostic,...(target?{target,accountId:target.accountId}:{accountId})};if(shelfRequest)shelfRequest={...shelfRequest,code:e.code};renderRemotes();status('Not saved · '+(e.code??'SETUP_FAILED')+' · '+e.message);}
}
async function cloudflarePanel(){
 const ticket=++viewEpoch,result=await api('inspectCloudflare');if(ticket!==viewEpoch)return;
 const target=selectedCloudflareTarget()??result.status?.target,accounts=connection?.accounts??[];
 let readiness=target?await api('checkCloudflareR2',{accountId:target.accountId,target},{quiet:true}):result.status,ready=false;
 if(target&&readiness.state==='READY'){const native=await api('inspectNativeACK',{}, {quiet:true});ready=selectedSetupReady(target,readiness,native);if(!ready)readiness={...readiness,state:'NATIVE_APPLY_INCOMPLETE',code:'NATIVE_APPLY_INCOMPLETE'};}
 if(ticket!==viewEpoch)return;
 const accountId=target?.accountId??readiness.accountId??result.onboarding.selectedAccountId??(accounts.length===1?accounts[0].id:null),code=ready?'CLOUDFLARE_READY':readiness.state==='NATIVE_APPLY_INCOMPLETE'?readiness.code:selectedSetupCode(readiness,target&&shelfRequest?.target&&targetKey(target)===targetKey(shelfRequest.target)?shelfRequest.code:undefined);
 cloudflareState={...readiness,code,selectedReady:ready,...(target?{target,accountId}:{} )};
 const needsApproval=['SETUP_APPROVAL_REQUIRED','SETUP_APPROVAL_RECORD_MISSING','WORKER_UPGRADE_APPROVAL_REQUIRED','WORKER_BUILD_MISMATCH','CAPABILITY_DENIED','WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED'].includes(code);
 const setupNeeded=accountId&&!readiness.diagnostic&&['SETUP_APPROVAL_REQUIRED','SETUP_RESUME_REQUIRED','SETUP_APPROVAL_RECORD_MISSING','REPAIR_REQUIRED'].includes(readiness.state)&&!['WORKER_UPGRADE_APPROVAL_REQUIRED','WORKER_BUILD_MISMATCH','CAPABILITY_DENIED','WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED','WORKER_DESTINATION_SCOPE_REQUIRED'].includes(code);
 $('#main').innerHTML=`<section class="page"><h1>Cloudflare R2</h1>${target?'<h2>Selected save destination</h2><p>'+esc(selectedSetupLabel(target,accounts))+'</p>':''}<p role="status" data-aesthetic-text="status.verbose-technical-detail">${esc(ready?'Prepared and verified · make a new right-click to save.':(target?'Not saved · '+code+' · ':'')+(names[code]??readinessNames[readiness.state]??code))}</p><p class="minimal-only" role="status">${ready?'Ready to save.':'Save unavailable.'}</p>${!shelfRequest?.target&&accounts.length>1?'<label>Authorized account<select id="cf-account"><option value="">Choose an account</option>'+accounts.map(a=>'<option value="'+esc(a.id)+'" '+(a.id===accountId?'selected':'')+'>'+esc(a.name??a.id)+'</option>').join('')+'</select></label>':''}${workerUpdateMarkup(cloudflareState)}${workerFailureMarkup(readiness.diagnostic)}${setupNeeded?'<p>'+(target?'Prepare this exact bucket and folder using saved approval, or authorize preparation once if needed. No original source is replayed. Cloudflare may charge for Worker/R2 usage and a small retained verification file.':result.onboarding.setupAuthorized?'Setup approval is already saved. Resume the same interrupted operation after correcting Cloudflare access.':'Authorize automatic setup for this account: create/reuse redown only when no destinations or default exist, prepare saved destinations, and verify a small retained readiness file. Cloudflare may charge for usage. Cloud files are never deleted.')+'</p><button id="cf-authorize">'+(target?(!needsApproval&&result.onboarding.setupAuthorized?'Inspect / prepare selected destination':'Authorize selected destination'):(result.onboarding.setupAuthorized?'Inspect / resume existing setup':'Authorize automatic setup'))+'</button>':''}<button id="cf-remotes">Back to Remotes</button><details><summary>Advanced diagnostics</summary><pre>${esc(JSON.stringify({state:readiness.state,code,worker:readiness.worker?.code,target:target?{accountId:target.accountId,bucketName:target.bucketName,prefix:target.prefix}:undefined},null,2))}</pre><button id="cf-refresh">Refresh status</button></details></section>`;
 listen('#update-worker','click',()=>authorizeCloudflare(accountId,target));listen('#reauthorize-worker','click',()=>login('#reauthorize-worker'));listen('#resume-worker','click',resumeWorkerSetup);listen('#cf-account','change',async e=>{if(!e.target.value)return;await api('selectCloudflareAccount',{accountId:e.target.value});cloudflareState=await api('checkCloudflareR2',{accountId:e.target.value});await refreshState();await cloudflarePanel();});
 listen('#cf-authorize','click',async()=>{if(needsApproval||!result.onboarding.setupAuthorized)return authorizeCloudflare(accountId,target);return resumeWorkerSetup();});
 listen('#cf-refresh','click',cloudflarePanel);listen('#cf-remotes','click',()=>show('remotes'));
}
async function remoteHistory(cursor=null,append=[]){
 if(!debugMode)return;
 const intent=++viewEpoch;const result=await api('inspectRemoteHistory',{limit:20,...(cursor?{cursor}:{})}),page=Array.isArray(result)?{items:result,nextCursor:null}:result,rows=[...append,...page.items];if(intent!==viewEpoch||!debugMode)return;
 dialog('Save results',rows.length?rows.map(r=>r.kind==='depth-click'?`<div><strong>Depth click · ${esc(r.state)}</strong><p>${esc(r.code)} · ${esc(r.operationId)}</p><p>No transfer receipt is implied by this click record.</p><details><summary>Click boundary details</summary><pre>${esc(r.stage)}${r.cause?'\nRelated operation: '+esc(r.cause):''}</pre></details></div>`:`<div><strong>${esc(r.state)}</strong> · ${esc(names[r.code]??r.code)}${r.receipt?.provenance?.sourceUrl?'<p><a href="'+esc(r.receipt.provenance.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Original source'+(r.receipt.provenance.sourceRedacted==='true'?' (credential query removed)':'')+'</a></p>':''}<p>${esc(r.receipt?.key??r.stage??'No verified key')} · ${esc(r.durationMs??'—')} ms</p><button data-receipt="${esc(r.operationId)}">Inspect receipt</button>${['pending','uncertain'].includes(r.state)&&r.kind!=='readiness'?'<button data-cancel-operation="'+esc(r.operationId)+'">Request cancellation</button>':''}${r.state==='verified'&&r.kind!=='readiness'?'<button data-goto="'+esc(r.operationId)+'">GO TO</button>':''}</div>`).join(''):'<p>No remote operations recorded.</p>',page.nextCursor?'<button id="more-results">Load more</button>':'',true);
 $$('[data-receipt]').forEach(b=>b.onclick=async()=>{
  const saved=rows.find(r=>r.operationId===b.dataset.receipt);
  dialog('Remote receipt',`<p role="status">Inspecting…</p><pre>${esc(JSON.stringify(saved,null,2))}</pre>`,'',true);
  const receiptTitle=$('#dialog-title');
  try{const r=await api('inspectRemoteReceipt',{operationId:b.dataset.receipt},{quiet:true});if(debugMode&&receiptTitle.isConnected&&$('#dialog').open)dialog('Remote receipt',`<pre>${esc(JSON.stringify(r,null,2))}</pre>`,'',true);}
  catch(error){if(!debugMode||!receiptTitle.isConnected||!$('#dialog').open)return;dialog('Remote receipt',`<p role="alert">Inspection failed · ${esc(error.code??'ENGINE_REQUEST_FAILED')}. The saved result is preserved.</p><pre>${esc(JSON.stringify(saved,null,2))}</pre>`,'',true);status('Receipt inspection failed · '+(error.code??'ENGINE_REQUEST_FAILED'));}
 });
 $$('[data-goto]').forEach(b=>b.onclick=async()=>{const result=await api('openRemoteResult',{operationId:b.dataset.goto});closeDialog();await navigate(result.target);selected=new Set([result.highlightKey]);updateSelection();});
 $$('[data-cancel-operation]').forEach(b=>b.onclick=async()=>{const result=await api('cancelRemoteOperation',{operationId:b.dataset.cancelOperation,target:(()=>{const d=rows.find(r=>r.operationId===b.dataset.cancelOperation).destination;return {provider:'cloudflare',connectionId:d.connectionId,accountId:d.accountId,bucketName:d.bucketName,prefix:d.prefix?d.prefix+'/':''};})()});status(result.code??'Cancellation requested; inspect the receipt before retrying.');b.disabled=true;});
 listen('#more-results','click',()=>remoteHistory(page.nextCursor,rows));
}
async function downloadEntry(entry){
 if(!window.showSaveFilePicker)throw Error('Streaming Download requires Chrome file-system access.');
 status('Preparing download…');
 const captured=structuredClone(source),handle=await window.showSaveFilePicker({suggestedName:entry.displayName??entry.key.split('/').at(-1)});let writer,offset=0;
 try{
  const result=await readPreviewBytes(p=>api('readFileChunk',p,{quiet:true}),{source:captured,key:entry.key,etag:entry.etag,size:entry.size},{limit:Number.MAX_SAFE_INTEGER,concurrency:1,onChunk:async bytes=>{writer??=await handle.createWritable();await writer.write(bytes);offset+=bytes.length;status('Downloading '+offset.toLocaleString()+' bytes');}});
  if(offset!==result.total)throw Error('RANGE_RESPONSE_INVALID');writer??=await handle.createWritable();await writer.close();
  if((await handle.getFile()).size!==result.total)throw Error('DOWNLOAD_WRITE_UNCONFIRMED');
  status('Download complete · '+offset.toLocaleString()+' bytes.');
  void noteDownload(downloadJob().jobId,1);
 }catch(error){try{await writer?.abort();}catch{}throw error;}
}

chrome.runtime.onMessage?.addListener((message,sender)=>{
 if(sender?.id!==chrome.runtime.id)return;
 if(message?.channel==='depth-click-outcome'){status(message.message,{attention:message.state===undefined?undefined:!['completed','pending'].includes(message.state)});return;}
 if(message?.channel==='shelf-opened'){const intent=viewEpoch;void shelfWindow.then(id=>{if(id!==null&&id===message.windowId&&intent===viewEpoch){closeDialog();return show('remotes');}}).catch(e=>status(e.message));return;}
 if(message?.channel==='shelf-attention'){void focusShelf().catch(e=>status(e.message));return;}
 if(message?.channel==='connection-changed'){void (async()=>{const before=JSON.stringify([connection?.state,connection?.accounts]);listingReader.invalidate();if(filenameSearch){resetFilenameSearch();selected.clear();focusIndex=0;anchor=0;renderFiles();}await connections();if(view==='explorer'&&connection.state==='CONNECTED'&&before===JSON.stringify([connection.state,connection.accounts])&&source)await loadListing();if(view==='remotes'&&$('#remotes-connection'))renderRemotes();})().catch(e=>status(e.message));return;}
 if(message?.channel==='engine-navigation'&&message.target){if(view!=='explorer')return;void navigate(message.target,true,true).catch(e=>status(e.message));return;}
 if(message?.channel==='filename-inventory-changed'){
  if(source&&view==='explorer'&&message.scopes?.some(d=>scopeKey(source)===scopeKey(d)&&
    (d.prefix===undefined||d.prefix===source.prefix||d.recursive&&source.prefix.startsWith(d.prefix))))markCurrentSearchStale();
  return;
 }
 if(message?.channel!=='remote-result')return;
 const affectsDirectory=d=>d&&source&&view==='explorer'&&source.connectionId===d.connectionId&&source.accountId===d.accountId&&source.bucketName===d.bucketName&&(d.prefix?d.prefix+'/':'').startsWith(source.prefix);
 void (async()=>{const result=message.result;if(result.kind==='readiness')return;reconnectAfter(result.code);
  if(affectsDirectory(result.destination))markCurrentSearchStale();
  if(result.state==='verified'){
   const current=await api('inspectRemoteReceipt',{operationId:result.operationId});if(current.reconciliation?.state!=='verified'){status(current.reconciliation?.code??current.code??'Save verification is pending. Inspect the receipt before retrying.');return;}
   imageReader.clear();clearThumbnails();listingReader.invalidate();const d=current.receipt?.destination??current.destination;
   if(affectsDirectory(d))await reloadCurrentDirectory();status('Saved and independently verified.');
  }else status(result.state==='pending'?'Saving remotely · '+(result.stage??'accepted'):names[result.code]??result.code??result.state,{attention:result.state!=='pending'});
 })().catch(e=>status(e.message));
});
window.addEventListener('focus',()=>{void connections().then(()=>{if(view==='remotes'&&$('#remotes-connection'))renderRemotes();}).catch(e=>status(e.message));});
