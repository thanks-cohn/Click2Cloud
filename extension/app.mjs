import {createSkyIdle,createSkyHover,reverseSkyAnimations} from './sky-idle.mjs';
import {visibleProviderFraction} from './projectile-target.mjs';
import {uploadId} from '../src/chrome/local-upload-plan.mjs';
import {isTextPreview} from '../src/explorer/r2-adapter.mjs';
import {createQueueService} from './queue-service.mjs';
import {paintProviderUploadProgress} from './onyx-provider-progress.mjs';
import {createQueuePage,createHistoryArchive} from './queue-page.mjs';
import {mountHistorySettings,mountQueueSettings} from './queue-settings.mjs';
import {installNavigation} from './navigation.mjs';
import {mountVisualFeedbackSettings} from './visual-feedback-settings.mjs';
import {createHistoryV2Preference} from './history-v2-preferences.mjs';
import {createVisualFeedbackPreference,feedbackAccentKey} from '../src/aesthetic/visual-feedback.mjs';
import {createBasicProviderCards} from './basic-provider-cards.mjs';
import {createBasicDiagnosticsExport} from './basic-diagnostics-export.mjs';
import {wireImmersiveView} from './immersive-view.mjs';
import {createScreenshotPage,screenshotFeedback,screenshotRequest} from './screenshot-page.mjs';
import {createAestheticHost} from '../src/aesthetic/host.mjs';
const aesthetic=createAestheticHost({root:document.documentElement,storage:chrome.storage?.local});
const aestheticReady=aesthetic.restore();
const visualFeedback=createVisualFeedbackPreference(chrome.storage);
let feedbackAccent;
function rememberFeedbackAccent(){
 const color=aesthetic.feedbackAccent();
 if(!/^#[\da-f]{6}$/i.test(color??'')||color===feedbackAccent)return;
 feedbackAccent=color;
 void chrome.storage.local.set({[feedbackAccentKey]:color}).catch(()=>{if(feedbackAccent===color)feedbackAccent=undefined;});
}
import {manifestCard,mountManifestPanel} from './manifest-panel.mjs';
import {mountLoadingVisual} from '../src/explorer/loading-visual.mjs';
import {loadingMedia,LOADING_MEDIA_MAX_BYTES} from '../src/explorer/loading-visual-config.mjs';
import {levelHidden} from '../src/modes/nested/index.mjs';
import {isImage,galleryStep,createImageReader,readPreviewBytes} from '../src/explorer/image-preview.mjs';
import {installExplorerLayout} from './explorer-layout.mjs';
import {wireExplorerUpload} from './explorer-upload.mjs';
import {dividerCycleKey,normalizeDividerMode} from '../src/explorer/layout.mjs';
import {installShortcuts} from './shortcut-settings.mjs';
import {createExplorerExports,noteDownload} from './explorer-exports.mjs';
import {downloadJob} from '../src/explorer/download-archive.mjs';
import {selectedSetupReady,selectedSetupLabel,selectedSetupCode} from './cloudflare-setup-view.mjs';
let fileClipboard=null;
const fileClipboardKey='explorerClipboardV1';
let clipboardChanged=false;
void chrome.storage?.session?.get(fileClipboardKey).then(values=>{
 if(!clipboardChanged)fileClipboard=values[fileClipboardKey]??null;
}).catch(()=>{});
function keepClipboard(clip){
 clipboardChanged=true;
 fileClipboard=clip;
 // Large selections remain usable in the current Shelf without growing
 // session storage. Only references are kept here, never image bytes.
 const stored=clip?.entries.length<=512?clip:null;
 void chrome.storage?.session?.set({[fileClipboardKey]:stored}).catch(()=>{});
}
import {describeExplorerContextMenu} from '../src/api/explorer-context-menu.mjs';
import {accountLabel,destinationPath} from './cloudflare-labels.mjs';
import {cloudPath,parseCloudPath,middlePath} from '../src/explorer/location-view.mjs';
import {paintTrace} from '../src/explorer/performance.mjs';
import {applyConfigChanges} from '../src/api/config.mjs';
import {providerDefaults} from '../src/explorer/configuration.mjs';
import {createListingOrder,createListingReader,rowWindow,gridWindow,masonryLayout} from '../src/explorer/listing-view.mjs';
import {ancestors,scopeKey,targetKey} from '../src/core/menu-identity.mjs';
import {createDebugPreference,uploadReceiptPreferenceKey} from '../src/chrome/debug-preference.mjs';
import {createExplorerOperationFeedback} from './explorer-operation-feedback.mjs';
import {createShelfNotifications,shelfNoticeText} from './shelf-notifications.mjs';
import {createExplorerImageClipboard} from './explorer-image-clipboard.mjs';
import {installExplorerMarquee} from './explorer-marquee.mjs';
import {installDetailsColumns} from './explorer-details-columns.mjs';
const notifications=createShelfNotifications(document);
const operationFeedback=createExplorerOperationFeedback(document,notifications);
const copyImageToClipboard=createExplorerImageClipboard(params=>api('readFileChunk',params,{quiet:true}));
const readinessNames={CLOUDFLARE_READY:'Ready to save',READY:'Ready to save',NOT_ACTIVATED:'R2 is unavailable. Correct it manually with Cloudflare, then Check again.',RECONNECT_REQUIRED:'Log in to reconnect Cloudflare.',INSUFFICIENT_PERMISSION:'Cloudflare did not grant the required access. Reconnect with the necessary permissions.',NETWORK_UNAVAILABLE:'Cloudflare could not be reached. Try again when the connection is available.',ACCOUNT_AMBIGUOUS:'Choose the Cloudflare account to use.',UNKNOWN:'R2 readiness is not confirmed. Retry Check R2 or review account permissions.',REPAIR_REQUIRED:'This destination needs its private save connection prepared or repaired.',SETUP_RESUME_REQUIRED:'Setup approval is saved. Resume the existing initialization when ready.',SETUP_APPROVAL_REQUIRED:'Approve initial setup to make Cloudflare saving ready.',CHOOSE_DESTINATION:'Choose a folder in Explorer and make it your default.',DESTINATION_UNAVAILABLE:'The selected destination is unavailable. Reconnect or choose another.'};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reportedShelfEvents=new Set();
function shelfBreadcrumb(event){
 if(reportedShelfEvents.has(event))return;
 reportedShelfEvents.add(event);
 try{void chrome.runtime.sendMessage({channel:'shelf-breadcrumb',event}).catch(()=>{});}catch{}
}
for(const event of ['error','unhandledrejection'])window.addEventListener(event,()=>shelfBreadcrumb('exception'));
shelfBreadcrumb('started');
const connectionElement=$('#connection');
const shelfWindow=chrome.windows?.getCurrent?Promise.resolve().then(()=>chrome.windows.getCurrent()).then(w=>w.id).catch(()=>null):Promise.resolve(null);
// Ordinary app.html tabs must not provide Shelf-edge targets.
let projectileShelfWindow=null;
if(typeof chrome.tabs?.getCurrent==='function'){
 void Promise.all([shelfWindow,Promise.resolve().then(()=>chrome.tabs.getCurrent())]).then(([id,tab])=>{
  if(Number.isInteger(id)&&!tab)projectileShelfWindow=id;
 }).catch(()=>{});
}
const shelfView=async(method,next,sequence)=>{
 const windowId=await shelfWindow;
 if(!Number.isInteger(windowId))return null;
 return chrome.runtime.sendMessage({channel:'shelf-history',method,windowId,view:next,sequence});
};
const restoreConnection=()=>{if(connectionElement.parentElement!==document.querySelector('aside'))document.querySelector('aside').insertBefore(connectionElement,$('#tree'));};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const debugPreference=createDebugPreference(chrome);let debugMode=false;
function applyDebugMode(enabled){
 debugMode=enabled===true;document.documentElement.dataset.debugMode=debugMode?'on':'off';
 const active=document.activeElement,focusedPanel=active?.closest('[data-debug-only]'),debugControl=$('#debug-mode');
 const receiptControl=$('#automatic-upload-receipts');
 if(receiptControl){receiptControl.disabled=!debugMode;if(!debugMode)receiptControl.checked=false;}
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
function saveNoticeKey(operationId,state){
 if(!operationId)return null;
 return 'save:'+operationId+':'+({completed:'verified',SAVED:'verified',FAILED:'failed',UNCERTAIN:'uncertain',partial:'uncertain'}[state]??state);
}
function quietFeedback(value,attention,noticeKey){
 const required=attention??(/^[A-Z][A-Z0-9_]+$/.test(value)&&!['READY','CLOUDFLARE_READY'].includes(value)||/could not|cannot|failed|not confirmed|not ready|not saved|uncertain|blocked|unavailable|required|denied|reconnect|needs attention|incomplete|conflict|missing|corrupt|not authorized|not prepared/i.test(value));
 if(required){
  const actionable=/uncertain|not confirmed|unconfirmed|mismatch|interrupted/i.test(value)?'Save not confirmed. Check History before retrying.':
    /auth|token|reconnect|log in|sign.in|permission|scope/i.test(value)?'Reconnect Cloudflare or review access in Remotes.':
    /worker|setup|prepare|not ready/i.test(value)?'Prepare this destination in Remotes before saving.':
    /configuration|revision|generation|storage|current_/i.test(value)?'Configuration needs attention. Review the current panel before retrying.':null;
  const code=/^([A-Z][A-Z0-9_]+)(?: ·|$)/.exec(value)?.[1];
  notifications.show(actionable??names[code]??(attention===true&&!code?value:null),{error:true,key:noticeKey});
 }
 else if(/^Saving remotely/i.test(value))notifications.show('Saving remotely…',{key:noticeKey});
}
const reconnectBrowseNotice='Reconnect to browse. Saved locations are preserved.';
let explorerReconnectNotified=false;
const status=(s,{attention,noticeKey}={})=>{const el=$('#status');
 const value=shelfNoticeText(s);
 const saved=/^Saved · (?:Chrome menu acknowledged|Ready for right-click)(?: · External backup unavailable)?$/.test(value);
 if(saved||value===reconnectBrowseNotice){
  if(saved)notifications.showFooter(value.replace(' · External backup unavailable',''),noticeKey);
  else if(view==='explorer'&&!explorerReconnectNotified){explorerReconnectNotified=true;notifications.showFooter(value);}
  return;
 }el.dataset.diagnostic='';el.dataset.code='';if(/^\d+ items|^Ready ·|^Saved \d+/.test(value)){el.hidden=true;el.textContent='';return;}const raw=/^[A-Z][A-Z0-9_]+$/.test(value);if(raw){el.dataset.code=value;el.dataset.diagnostic=value;}if(value.startsWith('Click2Cloud could not start'))el.dataset.diagnostic=value;el.textContent=raw?(names[value]??'The operation could not be completed. Inspect the relevant panel for details.'):value.startsWith('Click2Cloud could not start')?'Click2Cloud could not start. Your saved data was kept. Use Retry or inspect engine diagnostics.':value==='OK'?'The operation could not be confirmed.':value;el.hidden=!debugMode||!value;quietFeedback(value,attention,noticeKey);};
const names={DEFAULT_DESTINATION_UNAVAILABLE:'This location cannot be used as the default. Check access and menu visibility.',SAVED_DESTINATIONS_RESTORED:'Saved destinations restored',PROVENANCE_TOO_LARGE:'The selected menu snapshot and filenames exceed R2’s 2 KiB metadata limit. Shorten the menu titles or path; nothing was written.',PROVENANCE_INVALID:'The saved object’s menu metadata could not be validated. The save is not verified.',PROVENANCE_TARGET_MISMATCH:'The menu snapshot does not match the authorized destination. The save was stopped.',OBJECT_CHANGED:'The object changed while it was being read. Refresh and try again.',RANGE_RESPONSE_INVALID:'The object changed or its byte range could not be verified.',OBJECT_IDENTITY_UNAVAILABLE:'Cloudflare did not return a usable strong object identity. The read was stopped safely.',DOWNLOAD_WRITE_UNCONFIRMED:'The local file size did not match the R2 object. Download completion could not be verified.',R2_STATUS_UNKNOWN:'Cloudflare R2 access is not confirmed. Review the HTTP status and provider codes below, check selected-account R2 access, then log in again.',R2_CONFIRMED_INACTIVE:'Enable R2 for the selected account in Cloudflare, then log in again. No bucket or Worker was created.',INSUFFICIENT_SCOPE:'Cloudflare did not grant the required access. Update Cloudflare permissions and log in again; saved destinations remain.',NATIVE_APPLY_INCOMPLETE:'Cloudflare is prepared, but Chrome did not acknowledge the menu. Reload the existing extension and log in again; saved destinations remain.',ACCOUNT_AMBIGUOUS:'Use Review save setup in Remotes to choose the authorized Cloudflare account.',PROFILE_COPY_INVALID:'Choose the complete private profile copy produced by the local preservation tool.',PROFILE_COPY_MISMATCH:'The private copy no longer matches its verified manifest. No configuration was changed.',PROFILE_COPY_INCOMPLETE:'The selected copy is missing required extension storage evidence.',RECOVERY_PRESERVATION_REQUIRED:'Verify and attach your private profile copy before rebuilding.',REBUILD_REQUIRES_ABSENT_CONFIGURATION:'Surviving configuration needs validated recovery or review; it will not be replaced.',OWNER_CHOICES_REQUIRED:'Choose the new destination, mode and options explicitly.',PREVIOUS_BACKUP_REQUIRES_REVIEW:'The existing recovery folder was kept. Review it before changing the preservation location.',TRANSIENT_API_FAILURE:'Cloudflare could not be reached. Your saved connection and destinations were kept. Try Log in again when the network is available.',OAUTH_IDENTITY_UNVERIFIED:'Cloudflare account identity has not been verified. Use Check account authorization.',PROVIDER_AUTH_POLICY_DENIED:'Cloudflare denied sign-in. Review access for this account, then try Log in again.',OAUTH_CALLBACK_REJECTED:'The sign-in callback did not match the pending request. Start Log in again.',LOGIN_IN_PROGRESS:'A sign-in is already pending. Complete or cancel that provider window.',OAUTH_CANCELLED:'Sign-in cancelled. Your saved data was kept.',REAUTH_REQUIRED:'Cloudflare needs you to sign in again. Saved destinations and setup approval are kept.',TOKEN_EXPIRED:'Cloudflare needs you to sign in again. Saved destinations and setup approval are kept.',ENGINE_NO_RESPONSE:'The local service did not answer. Reopen the Shelf or inspect extension service-worker diagnostics; saved data was not changed.',ENGINE_RECEIVER_MISSING:'Chrome has not started the extension service yet. Try the control again.',ENGINE_RESPONSE_CHANNEL_CLOSED:'Chrome interrupted the local connection. Try the control again; no configuration was replaced.',ENGINE_MESSAGE_SEND_FAILED:'The local extension connection failed. Try the control again.',ENGINE_READ_TIMEOUT:'The local service is taking too long. Other independent controls remain available.',STORAGE_ACCESS_UNAVAILABLE:'Chrome credential storage is unavailable. Reopen the extension after checking browser storage policy; saved data was not replaced.',STORAGE_UNAVAILABLE:'Saved local configuration could not be read. Authentication is independent; do not clear extension storage.',CURRENT_READ_UNAVAILABLE:'Saved local configuration could not be read. Nothing was replaced. Inspect local storage diagnostics.',HTTP_401:'Your session needs to reconnect before this object can be read.',HTTP_403:'This object read was denied. Check the account and object-read permissions.',HTTP_404:'This object no longer exists at this location. Refresh the folder.',HTTP_429:'The provider is busy. Wait and retry the read.',WORKER_DESTINATION_SCOPE_REQUIRED:'The existing Worker is scoped to a different folder. Review bucket access in Remotes. Cloudflare resources are unchanged.',CONFIGURATION_CONFLICT:'Conflicting saved configuration versions require validated recovery. Setup stopped without replacing them.',CONFIGURATION_RECORD_MISSING:'Saved configuration records are missing. Stop setup and use validated recovery; existing data was not overwritten.',CONFIGURATION_CORRUPT:'Saved configuration could not be validated. Stop setup and use validated recovery.',SETUP_APPROVAL_RECORD_MISSING:'Previous setup is recorded, but its approval ledger is missing. Inspect or recover local setup records before approving new work.',WORKER_UPGRADE_APPROVAL_REQUIRED:'Update this existing destination’s Worker to match this Click2Cloud version and enable verified save metadata. Your session, bucket and saved choices are kept.',WORKER_FILE_API_REPAIR_REQUIRED:'Update this existing destination’s Worker to enable file actions. No file action was started.',OAUTH_REGISTERED_SCOPES_REJECTED:'Cloudflare rejected the nine registered permissions. Have the client owner confirm the saved registration; your existing connection and destinations were kept.',WORKER_CREATE_PERMISSION_REQUIRED:'Reauthorize Cloudflare with Workers Admin to create the pending Worker. Existing resources and setup approval were kept.',AUTHORIZATION_DENIED:'This save is not authorized. Check the destination and public HTTPS source.',SOURCE_DENIED:'This source is not eligible public HTTPS.',SOURCE_ADDRESS_DENIED:'The source resolves to a private or special-use network address.',SOURCE_EGRESS_UNAVAILABLE:'The source could not be read through Cloudflare’s HTTPS fetch. Inspect its source-stage diagnostic; no verified save was reported.',SOURCE_STALLED:'The source stopped making progress.',RESOURCE_BUSY:'Remote capacity is busy. No write was attempted; try a fresh click later.',R2_SINGLE_PUT_LIMIT:'This file exceeds the current conditional R2 upload service limit. Safe multipart completion is not verified.',OPERATION_INTERRUPTED:'This remote operation was interrupted. Inspect it before any new save.',SOURCE_UNAVAILABLE:'The remote source could not be read. No verified save was reported.',SIZE_LIMIT:'The source exceeds the supported remote-transfer limit.',BUFFER_LIMIT:'This source needs more buffering than the supported limit.',WRITE_UNCONFIRMED:'The write is uncertain. Inspect the destination before retrying.',RECONCILE_READ_ONLY:'The transfer result is uncertain. Inspect the receipt before retrying.',OPERATION_ALREADY_CLAIMED:'This operation was already submitted. Inspect its receipt; it was not replayed.',VERIFICATION_MISMATCH:'Destination verification did not match. Inspect before retrying.',TRANSPORT_UNAVAILABLE:'The private save connection could not be reached. Check Cloudflare setup/status.',PROVIDER_NOT_IMPLEMENTED:'This provider is not available yet. No file was saved.',REMOTE_SOURCE_REQUIRED:'Cloudflare saves require an eligible public HTTPS source; local file bytes are not uploaded.',REMOTE_EXPLORER_SOURCE_UNAVAILABLE:'This Explorer file has no authorized remote-fetch source. Cloudflare cannot stage it through the browser.',WORKER_SETUP_REQUIRED:'Prepare Cloudflare in Remotes before saving.',AUTH_REQUIRED:'Log in to browse this connection.',OAUTH_CANCELLED_OR_UNAVAILABLE:'Sign-in cancelled or unavailable. Retry when ready.',OAUTH_REDIRECT_SETUP_REQUIRED:'Connection setup required. The registered callback does not match this installation.',AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE:'Saving needs an authenticated Click2Cloud Worker transport. No bytes were uploaded.',EXTERNAL_RECOVERY_UNAVAILABLE:'Choose and authorize an external backup folder first.',REVISION_CONFLICT:'Configuration changed. Refresh and try again.',SCOPE_UNAUTHORIZED:'This account is not authorized.',PROVIDER_READ_FAILED:'The provider could not list this location. Retry Refresh.'};
let configurationIssue=null;
let state,connection={state:'UNKNOWN',accounts:[]},view='remotes',source=null,entries=[],selected=new Set(),history=[],historyAt=-1,cursor='',loading=false,sort={key:'displayName',direction:1},anchor=0,listingEpoch=0;
let filenameSearch=null,browseNeedsRefresh=false;
let explorerLayoutUI=null,explorerUpload,layoutIntent=null,gallery=null,galleryReturnKey=null,previewAbort=null;
let marquee,draggedFiles,dropFolder;
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
  else{
   loading=false;
   if(r.state==='RECONNECT_REQUIRED'){
    source=r.preferred??source??state.product.defaultTarget;
    listingError=reconnectBrowseNotice;
    $('#tree').replaceChildren();
    status(reconnectBrowseNotice);
   }
   renderExplorer();
  }
 })().finally(()=>{if(enteringExplorer===attempt)enteringExplorer=null;});return attempt.promise;
}
let explorerAccountId=null;
let shelfRequest=null,cloudflareState=null,reconnectNeeded=false,confirmExplorerDelete=true;
const deletePreference='explorerConfirmDeleteV1';
let dividerMode='alternate';
const dividerReady=chrome.storage?.local?.get(dividerCycleKey).then(value=>{dividerMode=normalizeDividerMode(value[dividerCycleKey]);}).catch(()=>{});
chrome.storage?.onChanged?.addListener((changes,area)=>{if(area==='local'&&changes[dividerCycleKey])dividerMode=normalizeDividerMode(changes[dividerCycleKey].newValue);});
void chrome.storage?.local?.get(deletePreference).then(v=>{confirmExplorerDelete=v?.[deletePreference]!==false;}).catch(()=>{});
const reconnectCodes=new Set(['AUTH_REQUIRED','REAUTH_REQUIRED','TOKEN_EXPIRED','HTTP_401','AUTH_SESSION_CHANGED','AUTHORIZATION_REVOKED']);
function reconnectAfter(code){
 if(!reconnectCodes.has(code)||reconnectNeeded)return;
 reconnectNeeded=true;
 void connections().catch(error=>status(error.message));
}
const treeFolders=new Map(),treeNodes=new Map(),bucketTargets=[];let previewUrl,previewEpoch=0,navigationEpoch=0,focusIndex=0,listingError='',renderedWindow=null,capabilities=null,contextReturnElement=null,treeEpoch=0;
const listingOrder=createListingOrder();
const listingReader=createListingReader(async(t,cursor,signal,fresh)=>{
 const r=await api(fresh?'refreshExplorer':'listFolders',{source:t,...(cursor?{cursor}:{})},{quiet:true,signal});
 if(r.state!=='completed')throw Error(names[r.code]??r.code??'Provider listing unavailable.');
 return r.data;
},{ttlMs:0,maxPages:0});
async function api(method,params={}, {quiet=false,readTimeout=0,signal,reconnect=true}={}) {
  signal?.throwIfAborted();
  let result,timer,abort;
  const readId=signal&&method==='readFile'&&params.textPreview?crypto.randomUUID():undefined;
  try{
   const sent=chrome.runtime.sendMessage({channel:'engine',version:'3+1.1',method,params,...(readId?{readId}:{})});
   const pending=[sent];
   if(readTimeout)pending.push(new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error(),{code:'ENGINE_READ_TIMEOUT'})),readTimeout);}));
   if(signal)pending.push(new Promise((_,reject)=>{abort=()=>{
     if(readId)try{void chrome.runtime.sendMessage({channel:'engine',cancelReadId:readId}).catch(()=>{});}catch{}
     reject(signal.reason);
    };signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();}));
   result=pending.length>1?await Promise.race(pending):await sent;
  }
  catch(error){signal?.throwIfAborted();const message=String(error?.message??''),code=error?.code==='ENGINE_READ_TIMEOUT'?'ENGINE_READ_TIMEOUT':/receiving end does not exist|could not establish connection/i.test(message)?'ENGINE_RECEIVER_MISSING':/message port closed|channel closed|before a response/i.test(message)?'ENGINE_RESPONSE_CHANNEL_CLOSED':'ENGINE_MESSAGE_SEND_FAILED';const err=Object.assign(Error(code),{code,method,stage:'transport'});if(!quiet)status(code+' · '+method,{attention:true});throw err;}finally{clearTimeout(timer);if(abort)signal.removeEventListener('abort',abort);}
  signal?.throwIfAborted();
  if(result==null)throw Object.assign(Error('ENGINE_NO_RESPONSE'),{code:'ENGINE_NO_RESPONSE',method,stage:'transport'});
  if(typeof result!=='object'||!['completed','partial','failed','blocked','uncertain','cancelled'].includes(result.state))throw Object.assign(Error('ENGINE_RESPONSE_INVALID'),{code:'ENGINE_RESPONSE_INVALID',method,stage:'transport'});
  if(result.state!=='completed'&&!(result.state==='partial'&&result.data?.configuration)){const code=result.code??'ENGINE_REQUEST_FAILED';if(reconnect)reconnectAfter(code);const err=Object.assign(Error(names[code]??code),{code,outcome:result.state,method,stage:result.diagnostic?.stage??'api',diagnostic:result.diagnostic});if(!quiet)status(err.message,{attention:true});throw err;}
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
function recoveryCard(){return '<div class="card" role="status"><h2>Local Configuration Needs Recovery</h2><p>'+esc(names[configurationIssue?.code]??configurationIssue?.code??'Saved configuration is unavailable.')+'</p><details><summary>Local Service Diagnostics</summary><pre id="local-diagnostics">'+esc(JSON.stringify(configurationIssue,null,2))+'</pre></details><p>Saved configuration cannot be trusted. Existing records and native menus are preserved. Login remains independent. Do not clear extension storage or uninstall.</p><button id="inspect-recovery">Inspect recovery</button><button id="attach-private-copy">Verify private profile copy</button><button id="rebuild-config">Rebuild with my choices</button><button id="read-local-state">Read saved configuration again</button><pre id="recovery-summary"></pre></div>';}
function bindRecovery(){listen('#attach-private-copy','click',attachPrivateCopy);listen('#rebuild-config','click',rebuildConfiguration);listen('#inspect-recovery','click',inspectRecovery);listen('#read-local-state','click',async()=>{await refreshState();await show(view);});}
async function inspectRecovery(){
 const health=await api('getEngineHealth');const preview=await api('requestRestorePreview');
 const summary={configuration:health.configuration,storage:health.storage,origin:health.origin,externalRecovery:health.externalRecovery,recovery:{available:preview.available,reason:preview.reason,provenance:preview.provenance,nativeSalvage:preview.nativeSalvage}};
 if($('#recovery-summary'))$('#recovery-summary').textContent=JSON.stringify(summary,null,2);
 if(!preview.available){status('Recovery blocked · '+(preview.reason??'NO_VALID_RECOVERY_POINT')+'. Preserve the original Chrome profile. Native menus are only a partial projection.');return;}
 dialog('Inspect verified recovery',`<p>Verified source: ${esc(preview.provenance)}.</p><p>${preview.configs.simple.destinations.length} Simple · ${preview.configs.nested.destinations.length} Narrow · ${preview.configs.depth.scopes.length} Depth scopes.</p><p>Restoring first retains a verified local evidence file in your previously authorized private backup folder. It preserves surviving records and does not change cloud files. Review the candidate locally before approving.</p><details><summary>Candidate Configuration (Private)</summary><pre>${esc(JSON.stringify({product:preview.product,configs:preview.configs},null,2))}</pre></details>`,`<div class="dialog-foot"><button id="cancel">Cancel</button><button id="restore-confirm">Preserve evidence and restore</button></div>`);
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
 dialog('Rebuild configuration · new owner choices',`<p>This does not restore your original settings. First close Chrome and make a verified private profile copy using the local preservation tool. Reopen this same profile, then use Verify private profile copy. No cloud resources will be created.</p><label>Account <select id="rebuild-account">${identity.accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(accountLabel(a))+'</option>').join('')}</select></label><p>Review partial native evidence locally; modes, hidden destinations, Quick, Default and approval are unknown.</p><button id="native-clues">Review historical locations</button><pre id="native-clues-output"></pre><div id="rebuild-locations"></div><button id="add-rebuild-location">Add location</button><label><input type="checkbox" id="ack-rebuild"> I am choosing a new configuration and understand the original state has not been recovered.</label>`,`<div class="dialog-foot"><button id="rebuild-preview">Review exact new configuration</button></div>`);
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
 dialog('Review Support Report',`<p>No private locations, account IDs, source URLs or files are included. Nothing has been transmitted. Copy only if you choose to share it.</p><p>For a browser shutdown or extension unload, check Errors in chrome://extensions and the Chrome crash log at chrome://crashes. The cause of an unexpected exit may be unknown.</p><pre>${esc(JSON.stringify(report,null,2))}</pre>`,`<div class="dialog-foot"><button id="copy-reviewed-report">Copy reviewed report</button><button id="save-diagnostics">Inspect save diagnostics</button></div>`,true);
 listen('#save-diagnostics','click',()=>remoteHistory());
 listen('#copy-reviewed-report','click',()=>navigator.clipboard.writeText(JSON.stringify(report,null,2)));
});
function applyColorMode(theme){
 document.documentElement.dataset.theme=theme;
 if(theme==='light'||theme==='dark'){
  try{localStorage.setItem('redownShelfColorModeV1',theme);}catch{}
 }
 void aestheticReady.then(rememberFeedbackAccent);
}
async function refreshState(options){const next=await api('getConfiguration',{},options);if(!state||next.product.revision>=state.product.revision)state=next;configurationIssue=null;applyColorMode(state.product.theme);$('#theme').disabled=false;return state;}
const transientBootCodes=new Set(['STORAGE_UNAVAILABLE','CURRENT_READ_UNAVAILABLE','STORAGE_ACCESS_UNAVAILABLE','ENGINE_RECEIVER_MISSING','ENGINE_RESPONSE_CHANNEL_CLOSED','ENGINE_MESSAGE_SEND_FAILED','ENGINE_READ_TIMEOUT']);
async function readWithRetry(fn){try{return await fn();}catch(error){if(!transientBootCodes.has(error.code)&&!transientBootCodes.has(error.diagnostic?.causeCode))throw error;await new Promise(ok=>setTimeout(ok,100));return fn();}}
async function change(changes,{confirmed=false,expectedRevision=state.product.revision,idempotencyKey=crypto.randomUUID(),prepareModes}={}) {
  if(!Array.isArray(changes))changes=[changes];
  if(changes.some(c=>c.type==='deleteDestinationConfig')&&!confirmed)return;
  const r=await api('commitConfigChange',{changes,expectedRevision,idempotencyKey,...(prepareModes?{prepareModes}:{})});
  if(r.configuration.product.revision>=state.product.revision)state=r.configuration;applyColorMode(state.product.theme);
  if(changes.some(c=>['createDestination','updateDestination','deleteDestinationConfig','setProviderPlacement','setProviderMenuVisibility','setShowInChrome'].includes(c.type))){suggestionDue=true;if(view==='explorer')void suggestion();}
  for(const entry of r.destinationReadiness??[]){
    const key=targetKey(entry.target);
    if(repairableReadiness.has(entry.code))repairTargets.set(key,entry.target);
    else if(entry.code!=='NATIVE_APPLY_INCOMPLETE')repairTargets.delete(key);
  }
  renderRepair();
  const blocked=r.destinationReadiness?.find(d=>d.state!=='READY');
  if(blocked){cloudflareState={state:'REPAIR_REQUIRED',...blocked,accountId:blocked.target.accountId};status('Configuration saved · Destination unavailable · '+(names[blocked.code]??blocked.code)+'');}
 else if(!r.native?.retained&&r.backup?.code!=='IDEMPOTENT_REPLAY')
  status(r.native?.state==='completed'?(prepareModes&&r.destinationReadiness?.length?'Saved · Ready for right-click':'Saved · Chrome menu acknowledged'):'Saved · Native menu pending or incomplete',{noticeKey:idempotencyKey});
  return r;
}
function listen(selector,event,fn){$(selector)?.addEventListener(event,e=>{try{Promise.resolve(fn(e)).catch(error=>status(error.message,{attention:true}));}catch(error){status(error.message,{attention:true});}});}
function closeDialog(){immersiveView?.dispose();immersiveView=null;$('#dialog').removeAttribute('data-immersive');stopGalleryVisual();const returnKey=galleryReturnKey;gallery=null;galleryReturnKey=null;previewAbort?.abort();previewEpoch++;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}$('#dialog').close();if(returnKey&&view==='explorer'){const i=listingOrder.index(returnKey);if(i!==undefined){focusIndex=i;focusRow(i);}}}
function dialog(title,body,footer='',debugOnly=false,filePreview=false) {
  marquee?.cancel();
  const wasOpen=$('#dialog').open,focusedId=$('#dialog').contains(document.activeElement)?document.activeElement.id:null;
  $('#dialog').toggleAttribute('data-debug-only-dialog',debugOnly);
  $('#dialog').toggleAttribute('data-file-preview',filePreview);
  hideContext();if(!body.includes('data-gallery')){$('#dialog').removeAttribute('data-immersive');immersiveView?.dispose();immersiveView=null;}if(gallery&&!body.includes('data-gallery')){stopGalleryVisual();gallery=null;galleryReturnKey=null;previewAbort?.abort();}$('#dialog-content').innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2><button id="close-dialog" aria-label="Close">×</button></div><div class="dialog-body">${body}</div>${footer}`;
  listen('#close-dialog','click',closeDialog);if(!$('#dialog').open)$('#dialog').showModal();else if(wasOpen){const previous=focusedId&&document.getElementById(focusedId);(previous&&!previous.disabled?previous:$('#close-dialog')).focus({preventScroll:true});}
}
async function connections() {
  const ticket=++connectionEpoch;
  let next;
  try{next=await readWithRetry(()=>api('loginStatus',{}, {quiet:true,readTimeout:5000}));}
  catch(error){next={state:'UNAVAILABLE',accounts:[],diagnostic:{code:error.code??'AUTH_STATUS_UNAVAILABLE'}};}
  if(ticket!==connectionEpoch)return;
  const before=JSON.stringify([connection?.state,connection?.accounts]);
  connection=next;
  const changed=before!==JSON.stringify([connection.state,connection.accounts]);
  if(connection.state==='CONNECTED'){reconnectNeeded=false;explorerReconnectNotified=false;}
  if(reconnectCodes.has(connection.diagnostic?.code)||connection.state==='DISCONNECTED'&&connection.identityVerified)reconnectNeeded=true;
  renderConnection();
  imageReader.clear();clearThumbnails();
  if(!changed)return;
  explorerUpload?.invalidate();
  navigationEpoch++;previewEpoch++;
  if(filenameSearch){resetFilenameSearch();selected.clear();focusIndex=0;anchor=0;}
  if(previewUrl||$('#preview-state'))closeDialog();
  listingReader.invalidate();imageReader.clear();clearThumbnails();treeFolders.clear();treeEpoch++;treeNodes.clear();
  $('#tree').replaceChildren();bucketTargets.length=0;
  if(connection.state!=='CONNECTED'){
    navigationEpoch++;listingEpoch++;entries=[];selected.clear();loading=false;listingError='Reconnect to browse. Saved locations are preserved.';
    // The browser shortcut can enter Explorer before the saved layout has loaded.
    if(view==='explorer'&&state&&!configurationIssue){
      renderExplorer();
      $('#tree').replaceChildren();
    }
  }else if(view==='explorer'&&state)await enterExplorer();
}
async function signOut(event){
  const button=event.currentTarget;button.disabled=true;
  try{await api('disconnect');cloudflareState=null;reconnectNeeded=false;await connections();if(view==='remotes')renderRemotes();status('Signed out. Saved destinations remain.');}
  finally{button.disabled=false;}
}
function renderConnection(){
  explorerUpload?.update();
  const inExplorer=view==='explorer',connected=connection.state==='CONNECTED',existing=$('#manage-slot #sign-out');
  if(!inExplorer||!connected)existing?.remove();
  else if(!existing){
    const button=document.createElement('button');button.id='sign-out';button.type='button';button.textContent='Sign Out';
    $('#manage-slot').append(button);listen('#manage-slot #sign-out','click',signOut);
  }
  const caption={CONNECTED:'Connected',CONNECTING:'Signing in…',VERIFYING:'Authorization received. Checking account access…',
    DISCONNECTED:'Not connected',UNKNOWN:'Checking connection…'}[connection.state]??'Connection status unavailable';
  const updatePermissions=connection.permissions?.needsReconsent?'<button id="reauthorize">Update Cloudflare permissions</button>':'';
  const controls=connected?(inExplorer?'':'<button id="browse" class="cf-connection-primary" data-authenticated title="Open File Explorer" aria-label="Connected · Open File Explorer">Connected</button><button id="sign-out">Sign out</button>')+updatePermissions:
    connection.state==='CONNECTING'?'<button id="cancel-login">Cancel sign-in</button>':
    connection.state==='VERIFYING'?'<button id="verify-login">Check account authorization</button>':
    connection.state==='DISCONNECTED'? `<button id="login" class="${inExplorer?'':'cf-connection-primary'} ${reconnectNeeded?'reconnect-needed':''}">${reconnectNeeded?'Reconnect':inExplorer?'Log In':'Connect to Cloudflare'}</button>`:
    connection.state==='UNKNOWN'?'':'<button id="check-connection">Check connection</button>';
  const showCaption=inExplorer||!['DISCONNECTED','CONNECTED'].includes(connection.state);
  const connectionIssue=names[connection.diagnostic?.code];
  connectionElement.innerHTML=`${inExplorer?'<strong>☁ Cloudflare</strong>':''}${showCaption?`<p class="muted">${caption}</p>`:''}${connectionIssue?
    '<p class="muted" role="status">'+esc(connectionIssue)+'</p>':''}${controls}`;
  listen('#connection #sign-out','click',signOut);listen('#reauthorize','click',()=>login('#reauthorize'));
  listen('#verify-login','click',()=>login('#verify-login',{verifyOnly:true}));listen('#login','click',()=>login());
  listen('#cancel-login','click',async()=>{await api('loginCancel');await connections();});listen('#browse','click',()=>show('explorer'));
  listen('#check-connection','click',connections);
}
async function login(selector='#login',params={}) {
  const intent=viewEpoch;
  $(selector)?.setAttribute('disabled','');status('Complete the provider sign-in to connect Cloudflare.');
  const pending=api('loginBegin',params);
  // Status reflects the pending attempt; it never initiates scans or navigation.
  setTimeout(()=>void connections().catch(()=>{}),250);
  try{const result=await pending;cloudflareState=result.initialization??null;if(cloudflareState?.state==='completed')await finishCloudflareSetup(cloudflareState,selectedCloudflareTarget());status(result.state==='CONNECTED'?(cloudflareState?.selectedReady?(document.documentElement.dataset.aesthetic==='standard'?'Prepared and verified · make a new right-click to save.':'Cloudflare connected.') :cloudflareState?'Cloudflare connected · '+(names[cloudflareState.code]??cloudflareState.code)+' · '+(cloudflareState.stage??'cloudflare-initialization'):'Cloudflare connected.'):result.state==='VERIFYING'?'Authorization received; account verification pending.':'Cloudflare sign-in is still in progress.');}catch(error){status(error.message);}finally{await connections();if(view==='remotes'&&intent===viewEpoch)renderRemotes();}
}
function workerFailureMarkup(d){
 if(d?.context==='r2')return `<p role="alert">Check R2 access in Cloudflare, then log in again.</p><details><summary>R2 Bucket Discovery</summary><p>R2 bucket discovery · HTTP ${esc(d.httpStatus??'not received')} · Cloudflare codes ${esc((d.providerCodes??[]).join(', ')||'not returned')}. ${esc(names[d.code]??'Check R2 access for the selected Cloudflare account, then log in again.')}</p></details>`;
 if(d?.kind!=='cloudflare-worker-access')return '';
 const upgraded=connection?.permissions?.needsReconsent===false&&!d.sessionScopes.includes('workers-scripts.admin'),action=upgraded?'The updated authorization has been requested. Resume the existing setup once to verify its actual authority; no new setup approval is needed.':d.correctiveAction;
 return `<div class="card"><p role="alert">${esc(action)}</p><p>${esc(d.method)} ${esc(d.endpoint)} · HTTP ${esc(d.httpStatus??'not received')} · Cloudflare codes ${esc(d.providerCodes.join(', ')||'not returned')}</p><details class="worker-diagnostics"><summary>Safe Cloudflare Diagnostics</summary><pre id="cf-worker-diagnostics">${esc(JSON.stringify(d,null,2))}</pre></details>${!upgraded&&(d.missingScopes?.includes('workers-scripts.admin')||d.workerIntent==='create'&&!d.sessionScopes.includes('workers-scripts.admin'))?'<button id="reauthorize-worker">Reauthorize Cloudflare</button>':''}<button id="resume-worker">Resume existing setup after correction</button></div>`;
}
async function resumeWorkerSetup(){
 const button=$('#resume-worker')??$('#cf-authorize');if(button)button.disabled=true;
 const target=selectedCloudflareTarget();
 try{const out=target?await api('recoverCloudflareDestination',{target,authorizeSetup:false}):await api('initializeCloudflare',{resume:true});await finishCloudflareSetup(out,target);}
 catch(e){cloudflareState={state:'PROVISIONING_BLOCKED',code:e.code,diagnostic:e.diagnostic,...(target?{target,accountId:target.accountId}:{})};renderRemotes();status('Not saved · '+(e.code??'SETUP_FAILED')+' · '+e.message);}
}
function selectedCloudflareTarget(){return shelfRequest?.provider==='cloudflare'&&shelfRequest.target?shelfRequest.target:cloudflareState?.target??null;}
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
function setupStatusMarkup(){
 const code=cloudflareState?.code;
 if(!code||['CLOUDFLARE_READY','READY'].includes(code)||reconnectCodes.has(code))return '';
 const text=names[code]??readinessNames[code];
 return text?`<p role="status">${esc(text)}</p>`:'';
}
function ordinarySetupReview(){
 if(connection?.state!=='CONNECTED'||reconnectCodes.has(cloudflareState?.code??shelfRequest?.code))return '';
 if(eligibleRepairTargets().length)return '';
 if(shelfRequest?.target)return cloudflareState?.selectedReady?'':'<button id="review-selected">Review save setup</button>';
 const code=cloudflareState?.code??cloudflareState?.state??shelfRequest?.code;
 return ['SETUP_RESUME_REQUIRED','SETUP_APPROVAL_RECORD_MISSING','REPAIR_REQUIRED','WORKER_SETUP_REQUIRED','ACCOUNT_AMBIGUOUS','CHOOSE_DESTINATION','DESTINATION_UNAVAILABLE','NOT_ACTIVATED','R2_CONFIRMED_INACTIVE'].includes(code)
  ?'<button id="review-selected">Review save setup</button>':'';
}
const repairableReadiness=new Set(['WORKER_SETUP_REQUIRED','WORKER_NOT_READY','WRITE_PROOF_REQUIRED','TRANSPORT_UNAVAILABLE','RESPONSE_INVALID','WORKER_RECOVERY_FAILED','PROVISION_RECONCILE_REQUIRED']);
const repairTargets=new Map();
let repairing=false;
function eligibleRepairTargets(){
 if(connection?.state!=='CONNECTED'||!state?.product.providerVisibility.cloudflare)return [];
 const configured=Object.entries(state.configs).flatMap(([mode,config])=>state.product.show[mode]?
   (config.destinations??config.scopes).filter(row=>!row.hidden).map(row=>targetKey(row.target)):[]);
 if(state.product.defaultTarget)configured.push(targetKey(state.product.defaultTarget));
 return [...repairTargets.values()].filter(target=>configured.includes(targetKey(target))&&connection.accounts.some(account=>account.id===target.accountId));
}
function renderRepair(){
 const button=$('#repair-me');
 button.hidden=view!=='remotes'||!eligibleRepairTargets().length;
 button.disabled=repairing;
 button.setAttribute('aria-busy',String(repairing));
}
async function repairDestinations(){
 if(repairing)return;
 const targets=eligibleRepairTargets();
 if(!targets.length)return;
 repairing=true;renderRepair();
 let failure, recovered=0;
 try{
  status('Checking the affected Cloudflare destinations…');
  for(const target of targets){
   if(!eligibleRepairTargets().includes(target))continue;
   try{
    const result=await api('recoverCloudflareDestination',{target,expectedRevision:state.product.revision},{quiet:true});
    if(result.state==='completed'&&result.native?.state==='completed'&&result.readiness?.state==='READY'){
     recovered++;
     repairTargets.delete(targetKey(target));
     if(cloudflareState?.target&&targetKey(cloudflareState.target)===targetKey(target))cloudflareState=null;
    }else{
     failure=result.code??'WORKER_RECOVERY_FAILED';
     if(failure&&cloudflareState?.target&&targetKey(cloudflareState.target)===targetKey(target))
      cloudflareState={...result,target,accountId:target.accountId};
     if(result.requiredAction||reconnectCodes.has(failure))repairTargets.delete(targetKey(target));
    }
   }catch(error){failure=error.code??'WORKER_RECOVERY_FAILED';if(reconnectCodes.has(failure))repairTargets.delete(targetKey(target));}
  }
  if(failure)status('Destination recovery is incomplete · '+(names[failure]??readinessNames[failure]??failure));
  else if(recovered)status('Cloudflare destinations verified · Chrome menu updated');
 }finally{repairing=false;renderRepair();if(view==='remotes')renderRemotes();}
}
listen('#repair-me','click',repairDestinations);
const basicCards=createBasicProviderCards({runtime:chrome.runtime,document,permissions:chrome.permissions,
 pulseEnabled:()=>visualFeedback.value.cardPulse});
visualFeedback.subscribe(value=>{if(!value.cardPulse)basicCards.clearSuccesses();});
const basicDiagnostics=createBasicDiagnosticsExport({runtime:chrome.runtime,confirm:message=>window.confirm(message)});
let providerProgressRevision=0;
function refreshProviderUploadProgress(){
 if(view!=='remotes'||document.documentElement.dataset.aesthetic!=='onyx')return;
 const revision=++providerProgressRevision;
 void queueService.store.workingProviderJobs().then(jobs=>{
  if(revision===providerProgressRevision&&view==='remotes'&&document.documentElement.dataset.aesthetic==='onyx')
   paintProviderUploadProgress($('#main'),jobs);
 }).catch(()=>{
  if(revision===providerProgressRevision&&view==='remotes')paintProviderUploadProgress($('#main'),[]);
 });
}
function renderRemotes(){
  if(view!=='remotes')return;
  connectionElement.remove();
  const focusedProvider=document.activeElement?.closest('.remote-provider')?document.activeElement:null;
  $('#main').innerHTML=`<section class="page remotes-page">
    <div class="remotes-intro"><h1 class="remotes-headline"><span>All Your Clouds</span> <span>One Place</span></h1></div>
    <div id="basic-provider-slot"></div>
    <h2 class="remote-interlude"><span><span class="legacy-slogan">The Future Is NOW</span><span class="onyx-slogan">The Future Is Now</span></span><span>True Remote Is Here</span></h2>
    <div class="card remote-cloudflare"><h2><span class="cf-legacy-mark">☁</span><svg class="cf-chrome-mark" viewBox="0 0 48 32" aria-hidden="true"><path fill="#f48120" d="M4 25a8 8 0 0 1 9-9 13 13 0 0 1 25 2l-3 7Z"/><path fill="#faae40" d="M37 17a7 7 0 1 1 3 12H34Z"/><path fill="#f48120" d="M3 27h30v3H3Z"/></svg> Cloudflare R2</h2><p class="onyx-provider-meta onyx-cloudflare-meta"><span class="onyx-free-caption">10 GB Free</span><span class="onyx-provider-transfer" role="progressbar" aria-valuemin="0" aria-valuemax="100" hidden><span class="onyx-transfer-fill"></span></span></p><div id="remotes-connection"></div></div>${setupStatusMarkup()}${connection?.state==='CONNECTED'&&cloudflareState?.code==='SETUP_APPROVAL_REQUIRED'?'<p>Automatic setup needs your approval: prepare the selected account’s destinations, create/reuse redown only when none exist, and verify a small retained file. Cloudflare may charge for usage.</p><button id="authorize-setup">Authorize automatic setup</button>':''}${workerUpdateMarkup(cloudflareState)}${workerFailureMarkup(cloudflareState?.diagnostic)}${ordinarySetupReview()}<button id="cloudflare-setup" class="remote-v1-copy">Review Cloudflare setup</button>${configurationIssue?recoveryCard():''}</section>`;
  if(aesthetic.getActive().id!=='standard')$('#cloudflare-setup')?.remove();
  basicCards.mount($('#basic-provider-slot'));
  focusedProvider?.focus({preventScroll:true});
  $('#remotes-connection').append(connectionElement);connectionElement.hidden=false;renderConnection();
  listen('#update-worker','click',()=>authorizeCloudflare(cloudflareState.accountId,cloudflareState.target));listen('#reauthorize-worker','click',()=>login('#reauthorize-worker'));listen('#resume-worker','click',resumeWorkerSetup);listen('#authorize-setup','click',()=>authorizeCloudflare(cloudflareState.accountId,selectedCloudflareTarget()));listen('#review-selected','click',cloudflarePanel);listen('#cloudflare-setup','click',cloudflarePanel);applyDebugMode(debugMode);
  listen('#open-explorer','click',async()=>{await show('explorer');});
  bindRecovery();
  renderRepair();
  refreshProviderUploadProgress();
}
async function focusShelf({live=false}={}){
 const request=await api('inspectShelfAttention',{}, {quiet:true});shelfRequest=request;
 if(['google-drive','onedrive','dropbox'].includes(request?.provider)){
  if(live&&view!=='remotes'&&request.opening?.state==='opened')await show('remotes');
  if(view==='remotes'&&request.opening?.state!=='badge-only')basicCards.showRecovery(request.provider);
  return false;
 }
 if(request?.provider==='cloudflare'&&request.target){
  try{const readiness=await api('checkCloudflareR2',{accountId:request.target.accountId,target:request.target},{quiet:true}),native=readiness.state==='READY'?await api('inspectNativeACK',{}, {quiet:true}):null;if(shelfRequest!==request)return false;const ready=selectedSetupReady(request.target,readiness,native);cloudflareState={...readiness,target:request.target,accountId:request.target.accountId,selectedReady:ready,code:ready?'CLOUDFLARE_READY':selectedSetupCode(readiness,request.code)};}
  catch(error){if(shelfRequest===request)cloudflareState={state:'PROVISIONING_BLOCKED',code:error.code,diagnostic:error.diagnostic,target:request.target,accountId:request.target.accountId};}
  if(shelfRequest===request){
   const key=targetKey(request.target);
   if(cloudflareState?.selectedReady)repairTargets.delete(key);
   else if(repairableReadiness.has(request.code)&&repairableReadiness.has(cloudflareState?.code))repairTargets.set(key,request.target);
  }
 }
 if(view==='remotes'&&$('#remotes-connection')){renderRemotes();if(live&&request)status(cloudflareState?.selectedReady?'Prepared and verified · the original click did not save. Make a new right-click for the selected destination.':'Not saved · '+(cloudflareState?.code??request.code??'ATTENTION_REQUIRED')+' · '+(names[cloudflareState?.code??request.code]??readinessNames[cloudflareState?.code??request.code]??'Inspect or prepare the selected destination below.'));}return false;
}
async function loadTree(initial=null){
  const ticket=++treeEpoch;$('#tree').textContent='Loading accounts…';bucketTargets.length=0;treeNodes.clear();
  try {
    const a=initial?{state:'completed',data:{accounts:initial.accounts}}:await api('listAccounts');if(ticket!==treeEpoch)return;if(a.state!=='completed')throw Error(names[a.code]??a.code??'Unable to list accounts.');
    $('#tree').replaceChildren();
    for(const account of a.data.accounts) {
      const branch=document.createElement('div'),button=document.createElement('button'),children=document.createElement('div');children.className='children';button.textContent='▸ '+accountLabel(account,connection.accounts);button.setAttribute('role','treeitem');button.setAttribute('aria-expanded','false');branch.append(button,children);$('#tree').append(branch);treeKeyboard(button,children);
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
 if(!entries.some(entry=>entry.key===key)&&!cursor&&!listingError){
  await loadListing(false,true);
  if(ticket!==navigationEpoch||view!=='explorer'||filenameSearch)return;
 }
 while(!entries.some(e=>e.key===key)&&cursor){if(seen.has(cursor))throw Error('PAGINATION_STALLED');seen.add(cursor);await loadListing(true);if(ticket!==navigationEpoch||view!=='explorer'||filenameSearch)return;}
 if(filenameSearch)return;
 if(!entries.some(e=>e.key===key)){selected.clear();updateSelection();status('This file is unavailable in the listing. Refresh or reconnect before trying again.',{attention:true});throw Error('RESULT_NOT_FOUND');}
 selected=new Set([key]);ordered();focusIndex=listingOrder.index(key);updateSelection();focusRow(focusIndex);
}
const screenshotUI=createScreenshotPage({api,dialog,closeDialog,esc,connectedAccounts:()=>connection.accounts??[]});
const queueService=createQueueService({readLegacy:()=>api('getHistoryPreferences',{}, {quiet:true}),
 writeLegacy:params=>api('setHistoryPreferences',params,{quiet:true})});
const historyV2Preference=createHistoryV2Preference(chrome.storage);
const queuePage=createQueuePage({service:queueService,screenshotRequest,openRemotes:()=>show('remotes'),
 retryScreenshot:operationId=>screenshotRequest('retry',{operationId}),
 inspectReceipt:operationId=>api('inspectRemoteReceipt',{operationId},{quiet:true,reconnect:false,readTimeout:25000}),
});
const historyUI=createHistoryArchive({service:queueService,metadataPreference:historyV2Preference,api,screenshotRequest,
 rename:renameHistoryRecord, renameError:error=>fileError('Rename',error),
 canRead:record=>record.provider==='cloudflare'&&connection?.state==='CONNECTED'&&
   connection.accounts?.some(account=>account.id===record.destination?.account),
 goTo:async record=>{
   const before=viewEpoch;
   const operationId=record.sourceRecordId;
   const result=record.renamed?{target:historyFileTarget(record),highlightKey:record.destination.key}:record.kind==='screenshot'?await screenshotRequest('history-output',{operationId,outputId:record.deliveryId}):
     await api('openRemoteResult',{operationId},{quiet:true,reconnect:false});
   if(before!==viewEpoch)return;
   const key=result.highlightKey??result.object?.key;
   if(!key)throw Error(result.code??'RESULT_LOOKUP_FAILED');
   historyUI.stop();
   await navigate(result.target);
   if(view==='explorer')await revealListedFile(key,result.target);
 }});
let viewEpoch=0,pendingSearchFocus=null,lastSearchSequence=-1;
function focusPendingSearch(){
 if(pendingSearchFocus===null||view!=='explorer'||!document.hasFocus()||!source||connection.state!=='CONNECTED'||!explorerLayoutUI?.focusSearch(true))return;
 finishSearchIntent();
}
function finishSearchIntent(){
 const sequence=pendingSearchFocus;
 pendingSearchFocus=null;
 if(sequence!==null)void shelfView('search-complete',undefined,sequence).catch(()=>{});
}
async function useShelfIntent(intent){
 if(intent?.view==='history'){closeDialog();await show('history');return;}
 if(intent?.view!=='explorer'||!intent.focusSearch||intent.sequence<=lastSearchSequence)return;
 lastSearchSequence=intent.sequence;
 closeDialog();pendingSearchFocus=intent.sequence;
 if(view==='explorer'&&explorerLayoutUI)focusPendingSearch();
 else await show('explorer');
}
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
// Persistent open header surface: restore on interaction, not on animation completion.
function finishSkyOpening(){
 document.body.removeAttribute('data-sky-opening');
 $('.app-header>.sky-canopy')?.remove();
}
function clearSkyOpening(){
 const header=$('.app-header'),canopy=header.querySelector('.sky-canopy');
 if(!canopy)return;
 if(view==='explorer'||window.matchMedia('(prefers-reduced-motion: reduce)').matches){finishSkyOpening();return;}
 if(canopy.hasAttribute('data-returning'))return;
 canopy.setAttribute('data-returning','');
 const animations=[...header.getAnimations({subtree:true}),...$('#shell').getAnimations()].filter(animation=>animation.animationName?.startsWith('sky-'));
 void reverseSkyAnimations(animations).finally(()=>{if(canopy.isConnected)finishSkyOpening();});
}
function playSkyOpening(){
 finishSkyOpening();
 if(!skyEligible())return;
 const header=$('.app-header'),style=getComputedStyle(header),canopy=document.createElement('div');
 canopy.className='sky-canopy';canopy.setAttribute('aria-hidden','true');
 canopy.style.setProperty('--sky-surface',style.background);
 canopy.style.setProperty('--sky-rail',style.borderBottomColor);
 const pageColor=[$('#main'),$('#shell'),document.body].map(element=>getComputedStyle(element).backgroundColor).find(color=>color!=='rgba(0, 0, 0, 0)'&&color!=='transparent')||getComputedStyle($('#shell')).getPropertyValue('--bg');
 canopy.style.setProperty('--sky-page-surface',pageColor);
 for(const side of ['left','right']){
  const half=document.createElement('div');half.className='sky-half sky-'+side;canopy.append(half);
 }
 const liquid=document.createElement('div');liquid.className='sky-liquid';canopy.append(liquid);
 header.prepend(canopy);document.body.setAttribute('data-sky-opening','');
 // CSS retains the final open frame until clearSkyOpening is explicitly called.
}
function skyEligible(){
 const header=$('.app-header');
 return view!=='explorer'&&!document.hidden&&!header.matches(':hover')&&!header.querySelector(':focus-visible')&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
const skyIdle=createSkyIdle({eligible:skyEligible,open:playSkyOpening,close:clearSkyOpening});
// Visual-only morph eligibility uses the same connected state as the Explorer sign-out control.
function prepareManageMorph(next){
 if(next===view)return;
 $('#shell').toggleAttribute('data-manage-morph',next==='explorer'&&view!=='remotes'&&view!=='explorer'&&connection.state==='CONNECTED');
}
async function show(next){if(next==='downloads'&&!debugMode)return;const previousView=view;if(next!==view){notifications.clear();basicCards.clearSuccesses();}if(next!=='history')historyUI.stop();if(next!=='queue')queuePage.stop();if(next!=='screenshot')screenshotUI.stop();const ticket=++viewEpoch;if(view==='explorer'&&next!=='explorer'){
 explorerScroll=$('#files')?.scrollTop??0;
}if(next!=='remotes')restoreConnection();if(next!=='explorer'){marquee?.cancel();clearDropFolder();finishSearchIntent();explorerUpload?.invalidate();explorerLayoutUI?.hide();stopThumbnailJobs();if(gallery)closeDialog();}if(next!==view)$('#shell').toggleAttribute('data-manage-fade',next==='remotes'&&view!=='explorer');prepareManageMorph(next);view=next;void shelfView('view',next).catch(()=>{});$('#shell').dataset.view=next;if(previousView!==next){if(next==='explorer')skyIdle.cancel();else skyIdle.stopPending();}$('#main').inert=false;hideContext();$$('header [data-view]').forEach(button=>{
 const active=button.dataset.view===next;
 button.classList.toggle('active',active);
 if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
});if(next==='remotes'){renderRemotes();return;}renderConnection();if(next==='history'){historyUI.mount($('#main'));return;}if(next==='queue'){queuePage.mount($('#main'));return;}if(next==='screenshot'){await screenshotUI.mount($('#main'));return;}if(next==='downloads'){explorerExports.mountJobs($('#main'));return;}if(!state||configurationIssue){$('#main').innerHTML='<section class="page"><h1>'+ (next==='explorer'?'File Explorer':'Settings')+'</h1><p role="status">Reading saved configuration…</p></section>';try{await refreshState({quiet:true,readTimeout:5000});}catch(error){configurationIssue={code:error.code??'CURRENT_READ_UNAVAILABLE',method:error.method,stage:error.stage,diagnostic:error.diagnostic};if(ticket===viewEpoch){$('#main').innerHTML='<section class="page"><h1>'+ (next==='explorer'?'File Explorer':'Settings')+'</h1>'+recoveryCard()+'<p>Navigation and configuration changes are blocked until validated recovery. Remotes and sign-in remain available.</p></section>';bindRecovery();if(next==='settings'){navigationPlacement.mount($('#main .page'));mountQueueSettings($('#main .page'),queueService);mountHistoryV2Settings($('#main .page'),historyV2Preference);}}return;}}if(ticket!==viewEpoch)return;if(next==='explorer'){renderExplorer();if(!source||!$('#tree').childElementCount)await enterExplorer();else if(browseNeedsRefresh&&!filenameSearch)await loadListing();}else await renderSettings();}
/** Stable presentation of enterExplorer/navigateExplorer and setView. Local
 * feedback precedes IPC; all persisted changes remain commitConfigChange. */
function saveExplorerLayout(value){
 layoutIntent=value;
 const commit=viewCommit.catch(()=>{}).then(async()=>{
  const changes={type:'setExplorerLayout',explorerLayout:value};
  try{await change(changes);}
  catch(error){
   if(error.code!=='REVISION_CONFLICT')throw error;
   await refreshState({quiet:true});
   await change(changes);
  }
 }).finally(()=>{if(layoutIntent===value)layoutIntent=null;});
 viewCommit=commit;
 return commit.catch(error=>{
  shelfBreadcrumb('divider-write-failed');
  status('Divider position could not be saved. Try adjusting the divider again.',{attention:true});
  throw error;
 });
}
function renderExplorer(){
 restoreConnection();
 if(!explorerShell){explorerShell=document.createElement('section');explorerShell.className='explorer-shell';explorerShell.innerHTML=`<div id="explorer-commands" class="toolbar" aria-label="Explorer toolbar"><div id="command-items"><button id="back" aria-label="Back">←</button><button id="forward" aria-label="Forward">→</button><button id="up" aria-label="Up">↑</button><button id="refresh" aria-label="Refresh">⟳</button><form id="filename-search-form" role="search" aria-label="Current folder filenames"><input type="text" id="filename-search" aria-label="Search filenames" placeholder="Search filenames…" spellcheck="false" autocomplete="off" maxlength="1024"><button type="button" id="hide-filename-search" aria-label="Hide search">×</button></form><button id="open-filename-search" type="button" aria-label="Search filenames">Search</button><select id="view-switch" aria-label="View"><option value="details">Details</option><option value="list">List</option><option value="grid">Grid</option></select><button id="add-location">+ Right Click</button></div><button id="toolbar-more" aria-label="More Explorer actions" aria-expanded="false" aria-controls="toolbar-overflow" hidden>More</button><div id="toolbar-overflow" role="group" aria-label="More Explorer actions" hidden></div><div id="explorer-more-actions" hidden><label id="go-to-path" for="location">Go to path<span class="address"><input id="location" aria-label="Address" spellcheck="false"><span id="location-display" aria-hidden="true"></span></span></label><button id="create-bucket">Create Bucket</button><div id="explorer-upload-control"><button type="button" id="explorer-upload" aria-describedby="explorer-upload-availability" aria-expanded="false" aria-controls="explorer-upload-choices" disabled>Upload</button><div id="explorer-upload-choices" role="group" aria-label="Upload options" hidden><button type="button" data-upload-kind="files" title="Existing files are kept; an uploaded copy may have a different name">Upload files</button><button type="button" data-upload-kind="folder" title="Empty folders are omitted and existing objects are skipped">Upload folders</button></div><span id="explorer-upload-availability" class="muted" role="status" hidden></span></div></div></div><div id="toolbar-splitter" role="separator" aria-label="Explorer toolbar height" aria-orientation="horizontal" aria-valuemin="1" aria-valuemax="7" aria-valuenow="1" tabindex="0"></div><div id="suggestion"></div><div id="files" class="file-scroll" tabindex="0"></div><div class="toolbar"><span id="item-count" class="muted"></span><button id="more" hidden>Load more</button><span class="muted" id="listing-state" role="status"></span><button id="clear-search" hidden>Clear search</button><span id="explorer-upload-status" role="status"></span><progress id="explorer-upload-progress" aria-label="Verified upload files" hidden></progress><button type="button" id="add-upload-folder" hidden>Add another folder</button><button type="button" id="start-upload-folders" hidden>Start upload</button><button type="button" id="reconcile-upload-batch" hidden>Check upload receipt</button><button type="button" id="resume-upload-batch" hidden>Reselect for upload</button><button type="button" id="cancel-explorer-upload" hidden>Cancel upload</button></div><input id="explorer-upload-picker" type="file" multiple hidden><input id="explorer-upload-folder" type="file" webkitdirectory multiple hidden>`;
  $('#main').replaceChildren(explorerShell);
  listen('#back','click',async()=>{if(historyAt>0)await navigate(history[--historyAt],false);});listen('#forward','click',async()=>{if(historyAt<history.length-1)await navigate(history[++historyAt],false);});
  listen('#up','click',navigateParent);listen('#refresh','click',refreshExplorerFolder);
  listen('#view-switch','change',e=>{
   const value=e.target.value,start=performance.now(),el=$('#files'),rows=ordered(),oldGrid=displayView()==='grid';
   const columns=gridWindow(rows.length,0,viewportHeight,viewportWidth).columns,masonry=imageGrid(rows);
   const anchor=masonry?.visible(el.scrollTop,el.scrollTop+viewportHeight)[0]??
    Math.floor(Math.max(0,el.scrollTop-(oldGrid?0:40))/(oldGrid?136:40))*(oldGrid?columns:1);
   presentationView=value;renderExplorer();
   el.scrollTop=imageGrid(rows)?.tiles[anchor]?.top??(value==='grid'?Math.floor(anchor/columns)*136:anchor*40);
   renderWindow();paintTrace('view',start);
   viewCommit=viewCommit.catch(()=>{}).then(async()=>{
    if(presentationView!==value)return;
    try{await change({type:'setView',view:value});}catch(error){status(error.message);}
    finally{if(presentationView===value)presentationView=null;if(view==='explorer')renderExplorer();}
   });
  });
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
   const {target,key}=parseLocation(e.target.value),ticket=navigationEpoch,seen=new Set();
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
  const resize=new ResizeObserver(rows=>{for(const row of rows){if(row.target.id==='files'){viewportWidth=row.contentRect.width;viewportHeight=row.contentRect.height;scheduleWindow();}if(row.target.classList.contains('address')){addressWidth=row.contentRect.width;renderAddress();}}});resize.observe($('#files'));resize.observe($('.address'));explorerLayoutUI=installExplorerLayout({read:()=>layoutIntent??state.product.explorerLayout,save:saveExplorerLayout,onResize:scheduleWindow,readCycleMode:()=>dividerMode,onMoreOpened:()=>{void explorerUpload.check();void explorerUpload.inspect();}});
  explorerUpload=wireExplorerUpload({
   runtime:chrome.runtime,button:$('#explorer-upload'),choices:$('#explorer-upload-choices'),
   availability:$('#explorer-upload-availability'),
   picker:$('#explorer-upload-picker'),folderPicker:$('#explorer-upload-folder'),
   status:$('#explorer-upload-status'),bar:$('#explorer-upload-progress'),cancel:$('#cancel-explorer-upload'),
   addFolder:$('#add-upload-folder'),startFolders:$('#start-upload-folders'),
   reconcileButton:$('#reconcile-upload-batch'),resumeButton:$('#resume-upload-batch'),windowId:shelfWindow,
   readTarget:()=>view==='explorer'&&source?.provider==='cloudflare'&&connection.state==='CONNECTED'&&
     connection.accounts?.some(account=>account.id===source.accountId)?source:null,
   closeMenu:()=>explorerLayoutUI.dismissMore(),
   refresh:async target=>{
    if(!source||targetKey(target)!==targetKey(source))return;
    if(view==='explorer')await refreshExplorerFolder();else browseNeedsRefresh=true;
   }
  });
  shortcuts.attachReferences();
 }else if(!explorerShell.isConnected){$('#main').replaceChildren(explorerShell);$('#files').scrollTop=explorerScroll;}
 $('#back').disabled=historyAt<=0;$('#forward').disabled=historyAt>=history.length-1;$('#up').disabled=!source?.prefix;$('#add-location').disabled=!source;explorerLayoutUI.setSearchAvailable(!!source&&connection.state==='CONNECTED');$('#view-switch').value=displayView();
 $('#shell').dataset.view='explorer';explorerUpload.update();explorerLayoutUI?.refresh();renderAddress();renderFiles();focusPendingSearch();void suggestion();
}
function navigateParent(){
 if(source?.prefix)return navigate({...source,prefix:ancestors(source.prefix).at(-2)??''});
}
function refreshExplorerFolder(){
 imageReader.clear();clearThumbnails();listingReader.invalidate();
 if(connection.state==='DISCONNECTED'){
  explorerReconnectNotified=false;
  status(reconnectBrowseNotice);
 }
 if(filenameSearch)return searchDirectoryNames(filenameSearch.query,{refresh:true});
 return source?loadListing(false,true):enterExplorer();
}
function selectedFolder(){const row=displayedEntries().find(e=>selected.has(e.key));return row?.folder?{...source,prefix:row.key}:source;}
const pathMeasure=(()=>{let ctx;return text=>{ctx??=document.createElement('canvas').getContext('2d');ctx.font='14px Segoe UI';return ctx.measureText(text).width;};})();
const addressAccounts=new Map();
function displayLocation(target,key){
 const value=cloudPath(target,key);
 if(!target)return value;
 if(!addressAccounts.has(target.accountId))addressAccounts.set(target.accountId,addressAccounts.size+1);
 return value.replace(/^cloudflare:\/\/[^/]+/,'cloudflare://account-'+addressAccounts.get(target.accountId));
}
function parseLocation(value){
 const match=/^cloudflare:\/\/account-(\d+)\//.exec(value);
 if(!match)return parseCloudPath(value);
 const account=connection.accounts.find(item=>item.id===source?.accountId&&addressAccounts.get(item.id)===Number(match[1]));
 if(!account)throw Error('This Cloudflare account is unavailable.');
 return parseCloudPath(value.replace(match[0],'cloudflare://'+encodeURIComponent(account.id)+'/'));
}
function renderAddress(restore=false){const input=$('#location'),display=$('#location-display');if(!input)return;const e=selected.size===1?ordered()[listingOrder.index(selected.values().next().value)]:null,value=displayLocation(source,e&&!e.folder?e.key:source?.prefix);if(restore||document.activeElement!==input)input.value=value;input.title=value;display.textContent=value?middlePath(value,Math.max(20,addressWidth-20),pathMeasure):'Choose a cloud folder';}
async function navigate(t,push=true,fromAPI=false){
  marquee?.cancel();clearDropFolder();typedName='';
  listingAbort?.abort();const started=performance.now(),same=source&&targetKey(source)===targetKey(t),ticket=++navigationEpoch;if(!same)resetFilenameSearch();listingEpoch++;previewEpoch++;if(!same){imageReader.clear();clearThumbnails();}hideContext();closeDialog();
  source=structuredClone(t);if(!same)explorerUpload?.invalidate();explorerAccountId=t.accountId;if(!same){selected.clear();focusIndex=0;anchor=0;}if(!same){entries=[];cursor='';}loading=true;listingError='';
  if(push&&(historyAt<0||targetKey(history[historyAt])!==targetKey(t))){history=history.slice(0,historyAt+1);history.push(source);historyAt=history.length-1;}
  if(view!=='explorer'){skyIdle.cancel();finishSkyOpening();prepareManageMorph('explorer');view='explorer';renderConnection();$('#shell').dataset.view='explorer';$$('header [data-view]').forEach(button=>{const active=button.dataset.view===view;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});}renderExplorer();if(!same){$('#files').scrollTop=0;void explorerUpload.inspect();}paintTrace('navigation-feedback',started);
  try{if(!fromAPI)await api('navigateExplorer',{target:t},{quiet:true});if(ticket!==navigationEpoch)return;await loadListing();}catch(e){if(ticket===navigationEpoch){loading=false;listingError=e.message;status(e.message);renderFiles();}}
}
async function loadListing(more=false,fresh=false){
  if(!source||more&&loading)return;browseNeedsRefresh=false;listingAbort?.abort();const controller=new AbortController();listingAbort=controller;const epoch=++listingEpoch,t=structuredClone(source),scroll=$('#files')?.scrollTop??0;loading=true;listingError='';renderFiles();
  try{const data=await listingReader.page(t,more?cursor:'',fresh,controller.signal);if(epoch!==listingEpoch||targetKey(t)!==targetKey(source))return;
    entries=more?[...new Map([...entries,...data.entries].map(e=>[e.key,e])).values()]:data.entries;cursor=data.cursor??'';treeFolders.set(targetKey(t),entries.filter(e=>e.folder));syncTreePage(t,{entries,cursor,completeListing:!cursor});paintTrace('listing');status(`${entries.length} items · ${t.bucketName}`);
    if(fresh&&!filenameSearch){
     ordered();selected=new Set([...selected].filter(key=>listingOrder.index(key)!==undefined));
     if(selected.size===1)focusIndex=anchor=listingOrder.index(selected.values().next().value);
    }
  }catch(error){if(epoch===listingEpoch&&view==='explorer'&&error.name!=='AbortError'){listingError=error.message;status(error.message+(entries.length?' · Showing previous results.':''));}}
  finally{if(epoch===listingEpoch){loading=false;if(view==='explorer'){renderFiles();if(more&&!filenameSearch)$('#files').scrollTop=scroll;}}}
}
function ordered(){return listingOrder.read(displayedEntries(),sort);}
const thumbnailAspects=new WeakMap();
let appearanceGrid,aspectRevision=0;
function imageGrid(rows){
 if(displayView()!=='grid'||aesthetic.getActive().id!=='golden-age'||!viewportWidth)return null;
 const width=Math.floor(viewportWidth);
 if(appearanceGrid?.rows===rows&&appearanceGrid.width===width&&appearanceGrid.aspectRevision===aspectRevision)return appearanceGrid.layout;
 const sample=rows.slice(0,60),imageCount=sample.filter(isImage).length;
 const layout=imageCount&&imageCount/sample.length>=2/3
  ?masonryLayout(rows.length,width,i=>thumbnailAspects.get(rows[i])??.75):null;
 appearanceGrid={rows,width,aspectRevision,layout};
 return layout;
}
function rememberThumbnailAspect(entry,aspect){
 if(thumbnailAspects.get(entry)===aspect)return;
 thumbnailAspects.set(entry,aspect);
 aspectRevision++;
 if(aesthetic.getActive().id==='golden-age')scheduleWindow();
}
function selectedFileEntries(){
 const rows=ordered();
 return [...selected].map(key=>rows[listingOrder.index(key)]).filter(Boolean);
}
const fileReference=({key,folder,displayName})=>({key,folder,...(displayName?{displayName}:{})});
let typedName='',lastTypeAt=0;
function selectByName(event,rows,index){
 const now=performance.now(),letter=event.key.toLocaleLowerCase();
 if(now-lastTypeAt>750)typedName='';
 const cycling=typedName===letter;
 if(!cycling)typedName+=letter;
 lastTypeAt=now;
 const matches=entry=>(entry.displayName??fileLeaf(entry)).toLocaleLowerCase().startsWith(typedName);
 const start=cycling?(index+1)%rows.length:0;
 const after=rows.findIndex((entry,i)=>i>=start&&matches(entry));
 const next=after<0&&start?rows.findIndex(matches):after;
 if(next>=0){selectRow(next,{});focusRow(next);}
}
function clearDropFolder(){
 dropFolder?.removeAttribute('data-drop-folder');dropFolder=null;
}
function bindFileDrag(pane){
 const dragType='application/x-redown-files';
 function target(event){
  const row=event.target.closest('[data-index]');
  const entry=row&&ordered()[Number(row.dataset.index)];
  if(!draggedFiles||!entry?.folder||draggedFiles.entries.some(item=>item.folder&&entry.key.startsWith(item.key)))return {};
  return {row,entry};
 }
 pane.addEventListener('dragstart',event=>{
  if(!event.target.closest('[data-file-drag]')||$('#dialog').open)return;
  const row=event.target.closest('[data-index]'),i=Number(row.dataset.index);
  if(!selected.has(ordered()[i].key))selectRow(i,{});
  draggedFiles={source:structuredClone(source),entries:selectedFileEntries().map(fileReference),action:'move'};
  event.dataTransfer.setData(dragType,'move');
  event.dataTransfer.effectAllowed='move';
 });
 pane.addEventListener('dragover',event=>{
  const {row}=target(event);
  if(row!==dropFolder){clearDropFolder();if(row){dropFolder=row;row.dataset.dropFolder='';}}
  if(row){event.preventDefault();event.dataTransfer.dropEffect='move';}
 });
 pane.addEventListener('dragleave',event=>{if(!pane.contains(event.relatedTarget))clearDropFolder();});
 pane.addEventListener('dragend',()=>{draggedFiles=null;clearDropFolder();});
 pane.addEventListener('drop',event=>{
  const {entry}=target(event),clip=draggedFiles;draggedFiles=null;clearDropFolder();
  if(!entry||!event.dataTransfer.types.includes(dragType))return;
  event.preventDefault();void pasteFiles({...source,prefix:entry.key},clip);
 });
}
function renderFiles(){
 const el=$('#files');if(!el)return;
 if(connection?.state!=='CONNECTED'){
  el.hidden=true;el.setAttribute('aria-busy','false');
  $('#more').hidden=true;$('#clear-search').hidden=true;
  renderListingCaption();stopThumbnailJobs();return;
 }
 el.hidden=false;
 const search=filenameSearch,rows=displayedEntries(),busy=search?search.loading:loading;
 el.className='file-scroll '+displayView();el.setAttribute('aria-busy',String(busy));
 if(!el.querySelector('table')){el.innerHTML=`<div class="empty"></div><table role="grid" aria-label="Files" aria-multiselectable="true"><thead><tr>${[['Name','displayName'],['Date Modified','uploaded'],['Type','folder'],['Size','size']].map(([label,k])=>`<th><button data-sort="${k}">${label}</button></th>`).join('')}</tr></thead><tbody></tbody></table><div class="grid-tiles" role="grid" aria-label="Files" aria-multiselectable="true" hidden></div>`;
  el.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{hideContext();sort={key:b.dataset.sort,direction:sort.key===b.dataset.sort?-sort.direction:1};focusIndex=0;el.scrollTop=0;renderWindow();});
  const table=el.querySelector('table');
  installDetailsColumns(table);
  marquee=installExplorerMarquee(el,{
   readRows:ordered,readLayout:()=>{
    if(displayView()!=='grid')return {columns:1,rowHeight:40,header:table.tHead.offsetHeight};
    const masonry=imageGrid(ordered());
    return {columns:masonry?.columns??gridWindow(0,0,viewportHeight,viewportWidth).columns,rowHeight:136,header:0,masonry};
   },
   readSelection:()=>selected,setSelection:value=>{selected=value;},onChange:updateSelection,
   onCommit:mode=>{
    const index=listingOrder.index(selected.values().next().value);
    if(index===undefined)return;
    focusIndex=index;if(mode!=='add')anchor=index;updateSelection();
   },
   available:()=>view==='explorer'&&!$('#dialog').open&&$('#context').hidden
  });
  bindFileDrag(el);
  el.addEventListener('scroll',scheduleWindow,{passive:true});
  el.onclick=event=>{if(marquee.takeClick())return;const row=event.target.closest('[data-index]');if(!row)return;selectRow(Number(row.dataset.index),event);row.focus({preventScroll:true});};
  el.ondblclick=event=>{const row=event.target.closest('[data-index]');if(row)void openEntry(ordered()[Number(row.dataset.index)]).catch(e=>status(e.message));};
  el.oncontextmenu=event=>{const row=event.target.closest('[data-index]');event.preventDefault();if(!row){if(source)void contextFor(source,null,event.clientX,event.clientY);return;}const i=Number(row.dataset.index),e=ordered()[i];if(!selected.has(e.key))selectRow(i,{});focusIndex=i;void contextFor(e.folder?{...source,prefix:e.key}:source,e,event.clientX,event.clientY);};
  el.onkeydown=event=>{if(event.defaultPrevented||event.isComposing||$('#dialog').open||!$('#context').hidden||event.target.closest('input,textarea,select,[contenteditable]'))return;
   const row=event.target.closest('[data-index]'),rows=ordered(),i=row?Number(row.dataset.index):focusIndex;
   const cols=displayView()==='grid'&&!imageGrid(rows)?gridWindow(rows.length,0,viewportHeight,viewportWidth).columns:1;
   const control=event.ctrlKey||event.metaKey,key=event.key,plain=!control&&!event.altKey&&!event.shiftKey;
   const connected=source&&connection.state==='CONNECTED';
   if(connected&&!event.altKey){
    const action=plain?{
     Delete:()=>deleteExplorerFiles(selectedFileEntries(),source),F5:refreshExplorerFolder,Backspace:navigateParent
    }[key]:control?event.shiftKey?{n:()=>fileActionGUI('mkdir',null,source)}[key.toLowerCase()]:{
     c:()=>copyExplorerFiles(source,selectedFileEntries(),true),x:()=>cutExplorerFiles(source,selectedFileEntries()),
     v:()=>pasteFiles(structuredClone(source))
    }[key.toLowerCase()]:null;
    if(action){event.preventDefault();if(!event.repeat)void Promise.resolve(action()).catch(error=>status(error.message,{attention:true}));return;}
   }
   let n;
   if(['ArrowDown','ArrowUp','Home','End','PageDown','PageUp',...(displayView()==='grid'?['ArrowLeft','ArrowRight']:[])].includes(event.key)&&rows.length){event.preventDefault();const step=event.key.startsWith('Page')?Math.max(1,Math.floor(viewportHeight/(displayView()==='grid'?136:40)))*cols:cols;n=event.key==='Home'?0:event.key==='End'?rows.length-1:Math.max(0,Math.min(rows.length-1,i+(event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:['ArrowDown','PageDown'].includes(event.key)?step:-step)));selectRow(n,event);focusRow(n);}
   else if(event.key==='Enter'&&rows[i]){event.preventDefault();void openEntry(rows[i]).catch(e=>status(e.message));}
   else if(key==='F2'&&plain&&selected.size===1){
    const entry=rows[listingOrder.index(selected.values().next().value)];
    if(entry){event.preventDefault();if(!event.repeat)void fileActionGUI('rename',entry);}
   }
   else if(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey){event.preventDefault();if(rows[i]&&!selected.has(rows[i].key))selectRow(i,{});const r=(row??el).getBoundingClientRect();void contextFor(rows[i]?.folder?{...source,prefix:rows[i].key}:source,rows[i]??null,r.left+20,r.top+20);}
   else if(event.key==='Escape'&&!($('#context').hidden&&explorerLayoutUI.dismissSearch())){selected.clear();updateSelection();hideContext();}
   else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'){event.preventDefault();hideContext();selected=new Set(rows.map(e=>e.key));updateSelection();}
   else if(rows.length&&!control&&!event.altKey&&event.key.length===1&&event.key.trim()){event.preventDefault();selectByName(event,rows,i);}
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
 explorerUpload?.update();
 const count=$('#item-count'),status=$('#listing-state');if(!count||!status)return;
 if(connection?.state!=='CONNECTED'){count.hidden=true;count.textContent='';status.textContent='';return;}
 count.hidden=!!filenameSearch;
 if(!filenameSearch)count.textContent=`${entries.length} items${selected.size?' · '+selected.size+' selected':''}`;
 const text=filenameSearch?searchCaption(filenameSearch):listingError?(entries.length?'Unavailable · showing previous verified listing.':listingError):loading?(entries.length?'Refreshing · previous verified listing.':'Loading authorized contents…'):'';
 if(status.textContent!==text)status.textContent=text;
}
function renderWindow(){
 const el=$('#files');if(!el||el.hidden||view!=='explorer')return;if(viewportWidth<1||viewportHeight<1){stopThumbnailJobs();return;}const grid=displayView()==='grid',body=grid?el.querySelector('.grid-tiles'):el.querySelector('tbody');if(!body)return;const rows=ordered();
 const masonry=grid&&imageGrid(rows);
 if(masonry){renderImageGrid(el,body,rows,masonry);return;}
 if(body.hasAttribute('data-masonry')){delete body.dataset.masonry;body.style.height='';}
 let range=grid?gridWindow(rows.length,el.scrollTop,viewportHeight,viewportWidth):rowWindow(rows.length,el.scrollTop,viewportHeight);if(grid&&renderedWindow?.body===body&&!renderedWindow.masonry&&renderedWindow.columns!==range.columns){const anchor=Math.floor(el.scrollTop/136)*renderedWindow.columns;el.scrollTop=Math.floor(anchor/range.columns)*136;range=gridWindow(rows.length,el.scrollTop,viewportHeight,viewportWidth);}
 if(renderedWindow?.body===body&&renderedWindow.rows===rows&&renderedWindow.start===range.start&&renderedWindow.end===range.end&&renderedWindow.columns===range.columns){syncThumbnails();return;}const focused=el.contains(document.activeElement)?document.activeElement.dataset.index:null;renderedWindow={body,rows,start:range.start,end:range.end,columns:range.columns};
 const icon=e=>e.folder?'📁':'▤',label=e=>esc(e.displayName??e.key),spacer=height=>height?grid?`<div class="row-spacer" aria-hidden="true" style="grid-column:1/-1;height:${height}px"></div>`:`<tr aria-hidden="true" class="row-spacer"><td colspan="4" style="height:${height}px;padding:0;border:0"></td></tr>`:'';
 if(grid){body.style.gridTemplateColumns=`repeat(${range.columns},minmax(0,1fr))`;body.setAttribute('aria-rowcount',String(Math.ceil(rows.length/range.columns)));body.setAttribute('aria-colcount',String(range.columns));}
 body.innerHTML=spacer(range.top)+rows.slice(range.start,range.end).map((e,j)=>{const i=range.start+j,attrs=`tabindex="${i===focusIndex?'0':'-1'}" data-index="${i}" aria-rowindex="${grid?Math.floor(i/range.columns)+1:i+2}" aria-selected="${selected.has(e.key)}"`;return grid?`${i%range.columns===0?'<div role="row" class="tile-row">':''}<div role="gridcell" aria-colindex="${i%range.columns+1}" class="file-tile" ${attrs}><div data-file-drag draggable="true"><span aria-hidden="true">${icon(e)}</span><div class="tile-label" title="${label(e)}">${label(e)}</div></div></div>${(i+1)%range.columns===0||i===range.end-1?'</div>':''}`:`<tr ${attrs}><td><span class="file-item-name" data-file-drag draggable="true" title="${label(e)}"><span class="${e.folder?'folder-icon':'file-icon'}" aria-hidden="true">${icon(e)}</span>${label(e)}</span></td><td><span class="file-cell-text">${esc(e.uploaded??e.last_modified??'—')}</span></td><td><span class="file-cell-text">${e.folder?'File folder':esc(e.key.split('.').at(-1)?.toUpperCase()??'File')}</span></td><td><span class="file-cell-text">${e.folder?'':Number.isFinite(Number(e.size))?Number(e.size).toLocaleString()+' B':'—'}</span></td></tr>`;}).join('')+spacer(grid?range.total-Math.ceil(range.end/range.columns)*range.rowHeight:(rows.length-range.end)*40);
 syncThumbnails();if(focused!==undefined&&focused!==null)(body.querySelector(`[data-index="${focused}"]`)??el).focus({preventScroll:true});
}
function renderImageGrid(el,body,rows,masonry){
 const prior=renderedWindow?.body===body?renderedWindow:null;
 body.dataset.masonry='';body.style.gridTemplateColumns='';body.style.height=masonry.total+'px';
 if(prior?.masonry&&prior.rows===rows&&prior.masonry!==masonry){
  const anchor=prior.masonry.visible(el.scrollTop,el.scrollTop+1)[0];
  if(anchor!==undefined)el.scrollTop+=masonry.tiles[anchor].top-prior.masonry.tiles[anchor].top;
 }
 const visible=masonry.visible(el.scrollTop-220,el.scrollTop+viewportHeight+220),windowKey=visible.join(',');
 if(prior?.masonry===masonry&&prior.windowKey===windowKey){syncThumbnails();return;}
 const focused=el.contains(document.activeElement)?document.activeElement.dataset.index:null;
 renderedWindow={body,rows,masonry,windowKey};
 body.setAttribute('aria-rowcount',String(rows.length));body.setAttribute('aria-colcount',String(masonry.columns));
 body.innerHTML=visible.map(i=>{
  const {top,left,width,height,media,column}=masonry.tiles[i],entry=rows[i],label=esc(entry.displayName??entry.key);
  const geometry=`top:${top}px;left:${left}px;width:${width}px;height:${height}px;--pin-image-size:${media}px`;
  return `<div role="row" class="tile-row" aria-rowindex="${i+1}"><div class="file-tile" role="gridcell" data-index="${i}" aria-colindex="${column+1}" tabindex="${i===focusIndex?0:-1}" aria-selected="${selected.has(entry.key)}" style="${geometry}"><div data-file-drag draggable="true"><span aria-hidden="true">${entry.folder?'📁':'▤'}</span><div class="tile-label" title="${label}">${label}</div></div></div></div>`;
 }).join('');
 syncThumbnails();
 if(focused!=null)(body.querySelector(`[data-index="${focused}"]`)??el).focus({preventScroll:true});
}
function selectRow(i,event){const started=performance.now();hideContext();const rows=ordered(),e=rows[i];if(!e)return;if(event.shiftKey){if(!event.ctrlKey&&!event.metaKey)selected.clear();for(let j=Math.min(anchor,i);j<=Math.max(anchor,i);j++)selected.add(rows[j].key);}else if(event.ctrlKey||event.metaKey){if(selected.has(e.key))selected.delete(e.key);else selected.add(e.key);anchor=i;}else{selected=new Set([e.key]);anchor=i;}focusIndex=i;updateSelection();paintTrace('selection',started);}
function focusRow(i){
 const el=$('#files'),grid=displayView()==='grid';
 // A detached pane can still have stale ResizeObserver dimensions when History
 // navigates back and immediately reveals a file near the end of the listing.
 if(el.clientWidth!==viewportWidth||el.clientHeight!==viewportHeight){
  viewportWidth=el.clientWidth;viewportHeight=el.clientHeight;renderWindow();
 }
 const columns=grid?gridWindow(displayedEntries().length,0,viewportHeight,viewportWidth).columns:1;
 const tile=grid?imageGrid(ordered())?.tiles[i]:null;
 const rowHeight=grid?136:40,top=tile?.top??Math.floor(i/columns)*rowHeight,bottom=tile?.bottom??top+rowHeight+(grid?0:40);
 if(top<el.scrollTop)el.scrollTop=top;
 else if(bottom>el.scrollTop+viewportHeight)el.scrollTop=bottom-viewportHeight;
 renderWindow();el.querySelector(`[data-index="${i}"]`)?.focus({preventScroll:true});
}
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
 for(const [key,{cell,e}] of [...wanted].slice(0,THUMBNAIL_ENTRIES)){const old=thumbnailURLs.get(key);if(old){if(old.url&&!cell.querySelector('img')){rememberThumbnailAspect(e,old.aspect);const img=new Image();img.alt=e.displayName??e.key;img.src=old.url;img.className='thumbnail';img.draggable=false;cell.querySelector('span').replaceWith(img);}else if(old.error){cell.title=imageMessage(old.error);cell.dataset.thumbnail='unavailable';}continue;}
  if(thumbnailJobs.has(key)||thumbnailActive>=2||thumbnailJobs.size>=2)continue;
  const controller=new AbortController(),captured=structuredClone(source);thumbnailJobs.set(key,controller);thumbnailActive++;
  void (async()=>{let bitmap;try{const value=await imageReader.load(captured,e,{limit:4*1024*1024,signal:controller.signal,concurrency:1});controller.signal.throwIfAborted();try{const ratio=Math.min(1,THUMBNAIL_EDGE/Math.max(value.width,value.height));bitmap=await createImageBitmap(value.blob,{resizeWidth:Math.max(1,Math.round(value.width*ratio)),resizeHeight:Math.max(1,Math.round(value.height*ratio)),resizeQuality:'low'});}catch{throw Object.assign(Error(),{code:'IMAGE_DECODE_FAILED'});}controller.signal.throwIfAborted();if(bitmap.width*bitmap.height>64*1024*1024)throw Object.assign(Error(),{code:'PREVIEW_SIZE_LIMIT'});const scale=Math.min(1,THUMBNAIL_EDGE/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error('IMAGE_DECODE_FAILED')),'image/png'));controller.signal.throwIfAborted();const aspect=value.height/value.width;thumbnailURLs.set(key,{url:URL.createObjectURL(blob),etag:value.etag,aspect});rememberThumbnailAspect(e,aspect);}
  catch(error){if(!controller.signal.aborted)thumbnailURLs.set(key,{error:error.code??'IMAGE_DECODE_FAILED'});}
  finally{bitmap?.close();thumbnailActive--;if(thumbnailJobs.get(key)===controller)thumbnailJobs.delete(key);while(thumbnailURLs.size>THUMBNAIL_ENTRIES){const first=[...thumbnailURLs.keys()].find(k=>!wanted.has(k))??thumbnailURLs.keys().next().value;const cached=thumbnailURLs.get(first);if(cached.url)URL.revokeObjectURL(cached.url);thumbnailURLs.delete(first);}syncThumbnails();}})();
 }
 });
}
let stopLoadingVisual=null,cachedGalleryVisual=null,immersiveView=null;
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
function galleryControls(e){return `<div class="gallery-controls"><button id="gallery-previous" class="gallery-arrow" title="Previous image" aria-label="Previous image" aria-keyshortcuts="ArrowLeft" ${!galleryStep(ordered(),e.key,-1)?'disabled':''}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15.25 5.5 8.75 12l6.5 6.5"/></svg></button><span class="sr-only" role="status">${cursor?'More files may be loaded in Explorer.':''}</span><button id="gallery-next" class="gallery-arrow" title="Next image" aria-label="Next image" aria-keyshortcuts="ArrowRight" ${!galleryStep(ordered(),e.key,1)?'disabled':''}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8.75 5.5 15.25 12l-6.5 6.5"/></svg></button></div>`;}
function moveGallery(direction){if(!gallery)return;const next=galleryStep(ordered(),gallery.key,direction);if(next)void openEntry(next).catch(e=>status(imageMessage(e.code)));}
async function openEntry(e){
 if(e.folder)return navigate({...source,prefix:e.key});
 const continuing=!!(isImage(e)&&immersiveView&&$('#dialog').open&&$('[data-gallery]'));
 stopGalleryVisual();previewAbort?.abort();const controller=new AbortController();previewAbort=controller;const ticket=++previewEpoch,captured=structuredClone(source),started=performance.now(),image=isImage(e),text=isTextPreview(e.key);
 if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
 if(image){galleryReturnKey??=e.key;gallery={key:e.key,target:captured};selected=new Set([e.key]);focusIndex=listingOrder.index(e.key)??0;updateSelection();}else{gallery=null;galleryReturnKey=null;}
 const body=image?`<section data-gallery>${galleryControls(e)}<div class="image-frame"><p id="preview-state" role="status">Loading image…</p><img class="preview" alt="File preview" hidden><p id="preview-error" role="alert" hidden></p></div></section>`:'<p id="preview-state" role="status">Loading preview…</p>';
 const zoomControls='<div class="immersive-controls"><button type="button" disabled>Fit</button><label><span class="sr-only">Zoom relative to Fit</span><input type="range" min="100" max="400" step="1" value="100" disabled></label><output>100%</output></div>';
 const actions=(image?'<button id="immersive-view" disabled>Immersive View</button>':'')+'<button id="download-stream">Download</button>' +(image&&explorerExports.options.tags?'<button id="preview-tags">Add Tags</button>':'');
 if(continuing){
  $('#dialog-title').textContent=e.displayName??e.key;
  $('#gallery-previous').disabled=!galleryStep(ordered(),e.key,-1);
  $('#gallery-next').disabled=!galleryStep(ordered(),e.key,1);
  const img=$('img.preview');
  img.hidden=true;img.removeAttribute('src');
  $('#preview-state').hidden=false;$('#preview-error').hidden=true;
  immersiveView.loading({resetZoom:true});
 }else{
  dialog(e.displayName??e.key,body+(image?'<button id="exit-immersive" type="button" aria-label="Exit Immersive View" title="Exit Immersive View (Esc)">×</button><div class="gallery-actions">'+actions+'</div>'+zoomControls:actions),'',false,true);
  if(image){
   immersiveView=wireImmersiveView($('#dialog'));
   listen('#gallery-previous','click',()=>moveGallery(-1));listen('#gallery-next','click',()=>moveGallery(1));
  }
 }
 if($('#preview-tags'))$('#preview-tags').onclick=()=>{void explorerExports.tags(captured,e);};
 $('#download-stream').onclick=()=>{void downloadEntry(e).catch(error=>status(error.message));};
 paintTrace('preview-feedback',started);
 if(image){bindInlineRename(e,captured,ticket);void startGalleryVisual($('.image-frame'),ticket,controller.signal);}
 if(!image&&!text){$('#preview-state').textContent='Inline preview unavailable for this type.';return;}
 try{
  const result=image?await imageReader.load(captured,e,{limit:providerDefaults.previewMaxBytes,signal:controller.signal}):await api('readFile',{source:captured,entry:{key:e.key,folder:false},textPreview:{
   ...(e.etag?{etag:e.etag}:{}),...(Number.isSafeInteger(e.size)?{size:e.size}:{})
  }},{quiet:true,signal:controller.signal});
  if(ticket!==previewEpoch||targetKey(captured)!==targetKey(source)||controller.signal.aborted)return;
  if(image){const url=URL.createObjectURL(result.blob);previewUrl=url;const img=$('img.preview');img.src=url;try{await img.decode();if(!img.naturalWidth||!img.naturalHeight)throw Error();}catch{throw Object.assign(Error(),{code:'IMAGE_DECODE_FAILED'});}if(ticket!==previewEpoch||controller.signal.aborted)return;stopGalleryVisual();img.hidden=false;$('#preview-state').hidden=true;immersiveView?.ready();}
  else{
   if(result.state!=='completed'||!Array.isArray(result.data?.bytes))throw Object.assign(Error(),{code:result.code});
   const preview=document.createElement('pre');
   preview.id='preview-text';preview.tabIndex=0;
   preview.setAttribute('aria-label','Text preview');
   preview.textContent=new TextDecoder().decode(Uint8Array.from(result.data.bytes));
   $('#preview-state').replaceWith(preview);
   if(result.data.truncated){
    const note=document.createElement('p');
    note.textContent='Showing the first 512 KiB. Download the full file for all contents.';
    preview.after(note);
   }
  }
  paintTrace('preview-ready',started);
 }catch(error){if(ticket!==previewEpoch||controller.signal.aborted)return;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}stopGalleryVisual();const message=imageMessage(error.code);if(image){immersiveView.unavailable();$('#preview-state').hidden=true;const alert=$('#preview-error');alert.hidden=false;alert.textContent=message;alert.dataset.code=error.code??'FILE_READ_FAILED';$('img.preview').hidden=true;}else{$('#preview-state').textContent=message;$('#preview-state').setAttribute('role','alert');}}
}
const fileLeaf=entry=>entry.key.replace(/\/$/,'').split('/').at(-1);
const renameExtension=name=>name.lastIndexOf('.')>0?name.slice(name.lastIndexOf('.')):'';
const renameConflict=error=>['FILES_SKIPPED','FILE_CONFLICT'].includes(error.code);
const renameUnconfirmed=error=>!renameConflict(error)&&(error.outcome==='uncertain'||
 /UNCONFIRMED|RETRY_REQUIRES_INSPECTION|ENGINE_RESPONSE_CHANNEL_CLOSED|ENGINE_NO_RESPONSE/.test(error.code??''));
let editPreviewFilename;
function selectBasename(input){
 input.focus();
 input.setSelectionRange(0,input.value.length-renameExtension(input.value).length);
}
function checkedFileName(original,draft){
 const extension=renameExtension(original);
 if(!draft||draft!==draft.trim()||draft==='.'||draft==='..'||/[\\/\x00-\x1f\x7f]/.test(draft))
  throw Object.assign(Error(),{code:'FILENAME_INVALID'});
 return extension&&!renameExtension(draft)?draft+extension:draft;
}
function historyFileTarget(record){
 const {account,connection,bucket,key}=record.destination;
 return {provider:'cloudflare',accountId:account,connectionId:connection,bucketName:bucket,
  prefix:key.slice(0,key.lastIndexOf('/')+1)};
}
async function renameHistoryRecord(record,draft){
 return navigator.locks.request('redown-history-rename:'+record.recordId,async()=>{
  const current=await queueService.store.get(record.recordId);
  if(!current||current.destination?.key!==record.destination?.key||current.etag!==record.etag)
   throw Object.assign(Error(),{code:'FILE_RENAME_UNCONFIRMED'});
  const target=historyFileTarget(current), name=checkedFileName(fileLeaf(current.destination),draft);
  if(name===current.filename)return current;
  if(!current.renamed){
   const method=current.kind==='screenshot'?'history-output':'openRemoteResult';
   const result=current.kind==='screenshot'?await screenshotRequest(method,{operationId:current.sourceRecordId,outputId:current.deliveryId}):
     await api(method,{operationId:current.sourceRecordId},{quiet:true,reconnect:false});
   if((result.highlightKey??result.object?.key)!==current.destination.key)
    throw Object.assign(Error(),{code:'FILE_NOT_FOUND'});
  }else{
   const lookup=await api('readFileChunk',{source:target,key:current.destination.key,offset:0,length:1,etag:current.etag},{quiet:true,reconnect:false});
   if(lookup?.state!=='completed')throw Object.assign(Error(),{code:lookup?.code??'FILE_NOT_FOUND'});
  }
  const result=await api('fileAction',{action:'rename',source:target,entry:{key:current.destination.key,folder:false},
   name,conflict:'skip',idempotencyKey:crypto.randomUUID()},{quiet:true,reconnect:false});
  const receipt=result.data?.receipt??result.receipt;
  if(receipt?.key!==target.prefix+name||!receipt.etag)
   throw Object.assign(Error(),{code:'FILE_RENAME_UNCONFIRMED'});
  const renamed={filename:name,providerObjectId:receipt.key,etag:receipt.etag,version:receipt.version,
   bytes:receipt.size,destination:{...current.destination,key:receipt.key}};
  await queueService.store.rememberRename(current.recordId,renamed);
  listingReader.invalidate();imageReader.clear();
  return {...current,...renamed,renamed:true};
 });
}
async function renameFile(entry,target,draft){
 const original=fileLeaf(entry),name=checkedFileName(original,draft);
 if(name===original)return entry;
 const navigation=navigationEpoch;
 const key=entry.key.slice(0,entry.key.lastIndexOf('/')+1)+name;
 const data=await presentOperation('rename',async()=>{
  const result=await runFileAction('rename',{source:target,entry:{key:entry.key,folder:false},name,conflict:'skip'});
  const data=result.data??result;
  if(data.code!=='FILE_ACTION_VERIFIED'||data.receipt?.key!==key)throw Object.assign(Error(),{code:'FILE_RENAME_UNCONFIRMED'});
  return data;
 });
 const renamed={...entry,key,displayName:name,etag:data.receipt.etag,size:data.receipt.size};
 listingReader.invalidate();
 if(view==='explorer'&&navigation===navigationEpoch&&targetKey(target)===targetKey(source)){
  const replace=rows=>rows.map(row=>row.key===entry.key?renamed:row);
  entries=replace(entries);
  if(filenameSearch)filenameSearch.entries=replace(filenameSearch.entries);
  if(selected.delete(entry.key))selected.add(key);
  if(gallery?.key===entry.key){gallery.key=key;galleryReturnKey=key;}
  ordered();
  const i=listingOrder.index(key);
  if(i!==undefined&&selected.has(key))focusIndex=anchor=i;
  renderFiles();
  // Keep the verified result visible immediately, then reconcile the listing.
  void reloadCurrentDirectory().then(()=>{
   if(view!=='explorer'||navigation!==navigationEpoch||!selected.has(key))return;
   ordered();
   const index=listingOrder.index(key);
   if(index!==undefined){focusIndex=anchor=index;updateSelection();}
  }).catch(()=>{});
 }
 return renamed;
}
function bindInlineRename(entry,target,ticket){
 const title=$('#dialog-title'),name=fileLeaf(entry);
 title.tabIndex=0;title.title='Rename filename (F2)';
 const edit=editPreviewFilename=()=>{
  if(title.querySelector('input'))return;
  const input=document.createElement('input'),feedback=document.createElement('span');
  input.value=name;input.maxLength=1024;input.setAttribute('aria-label','Image filename');
  feedback.setAttribute('role','status');feedback.className='preview-rename-status';
  title.replaceChildren(input,feedback);selectBasename(input);
  const cancel=()=>{title.textContent=name;title.focus();};
  let saving=false;
  input.addEventListener('keydown',async event=>{
   if(event.isComposing||!['Enter','Escape'].includes(event.key))return;
   event.preventDefault();event.stopPropagation();
   if(saving)return;
   if(event.key==='Escape'||input.value===name){cancel();return;}
   if(input.readOnly)return;
   saving=input.readOnly=true;feedback.textContent='';
   try{
    const renamed=await renameFile(entry,target,input.value);
    if(ticket!==previewEpoch||!input.isConnected)return;
    title.textContent=fileLeaf(renamed);title.focus();
    bindInlineRename(renamed,target,ticket);
    $('#download-stream').onclick=()=>{void downloadEntry(renamed).catch(error=>status(error.message));};
    if($('#preview-tags'))$('#preview-tags').onclick=()=>{void explorerExports.tags(target,renamed);};
    $('#gallery-previous').disabled=!galleryStep(ordered(),renamed.key,-1);
    $('#gallery-next').disabled=!galleryStep(ordered(),renamed.key,1);
   }catch(error){
    if(!input.isConnected)return;
    feedback.textContent=fileError('Rename',error);
    input.readOnly=renameUnconfirmed(error);
   }finally{
    saving=false;
   }
  });
 };
 title.onclick=event=>{if(event.target===title&&immersiveView&&$('#dialog').hasAttribute('data-immersive'))edit();};
 title.ondblclick=()=>{if(!$('#dialog').hasAttribute('data-immersive'))edit();};
 title.onkeydown=event=>{if(event.target===title&&event.key==='Enter'){event.preventDefault();edit();}};
}
const previewInput='input:not([type=range]),textarea,select,[contenteditable]';
function dismissPreview(){
 if(!immersiveView?.escape())closeDialog();
}
$('#dialog').addEventListener('keydown',event=>{
 if(!gallery||event.defaultPrevented||event.isComposing||event.ctrlKey||event.altKey||event.metaKey||
    event.target.closest(previewInput))return;
 if(event.key==='Escape'){
  event.preventDefault();
  if(!event.repeat)dismissPreview();
  return;
 }
 if(event.key==='F2'&&!event.shiftKey){
  event.preventDefault();
  if(!event.repeat)editPreviewFilename?.();
  return;
 }
 if(event.target.closest('input[type=range]'))return;
 if(immersiveView?.handleKey(event))event.preventDefault();
 else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
  event.preventDefault();
  moveGallery(event.key==='ArrowRight'?1:-1);
 }
});

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
  action('Get URL',()=>explorerExports.urls(scope,file,()=>view==='explorer'&&contextEpoch===navigationEpoch));
  action('Add Tags',()=>explorerExports.tags(scope,file));
  action('Copy Image to Clipboard',()=>writeExplorerImage(origin,file));
  if(!entry||entry.folder){action('Screenshot2Here',()=>screenshotUI.configureHere(structuredClone(t)));action('+ Right Click',()=>openPopup(structuredClone(t)));action('Make Default',()=>makeExplorerDefault(t));}
  else {const save=action('Save to cloud…',()=>chooseRemoteSave(entry));if(capabilities?.providers?.cloudflare?.explorerSource===false){save.disabled=true;save.title='No authorized remote source is available for this private Explorer file.';}}
  const mutation=action;
  if(entry){
   mutation('Copy',()=>copyExplorerFiles(origin,capturedSelection));
   mutation('Cut',()=>cutExplorerFiles(origin,capturedSelection));
   mutation('Move',()=>fileActionGUI('move',entry,origin));mutation('Rename',()=>fileActionGUI('rename',entry,origin));
   mutation('Delete',()=>deleteExplorerFiles(capturedSelection,origin));
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
 if(action==='New Folder'&&error.code==='FOLDER_ALREADY_EXISTS')return 'That folder already exists.';
 if(action==='Rename'){
  if(renameConflict(error))return 'That name is already in use.';
  if(renameUnconfirmed(error))return 'Rename unconfirmed. Close the editor and refresh this folder before retrying.';
  const message={
   FILENAME_INVALID:'Enter a filename without path separators or spaces at the ends.',
   FILE_KEY_INVALID:'The full file path is too long or contains an invalid character.',
   FILE_NOT_FOUND:'The original file could not be found. Refresh the folder.',
   WORKER_SETUP_REQUIRED:'This bucket has no ready file connection. Review this bucket in Remotes.',
   FILE_SETUP_APPROVAL_REQUIRED:'This folder action requires a prepared bucket. Review this bucket in Remotes.',
   WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED:'The file connection is missing its signing key. Ask the account owner to review it in Remotes.',
   WORKER_DESTINATION_SCOPE_REQUIRED:'This folder is outside the existing file connection’s scope. Ask the account owner to review access.',
   WORKER_UPGRADE_APPROVAL_REQUIRED:'The saved file connection uses an incompatible Worker version. Review it in Remotes.',
   WORKER_BUILD_MISMATCH:'The saved and deployed Worker versions differ. Ask the account owner to review the file connection.',
   WORKER_FILE_API_REPAIR_REQUIRED:'The existing file connection does not support Rename. Ask the account owner to review it.',
   WORKER_NOT_READY:'Cloudflare did not confirm the file connection. Try again when it is available.',
   TRANSPORT_UNAVAILABLE:'The file connection is unavailable. Try again when it is reachable.',
   SELECTED_BUCKET_MISSING:'Cloudflare could not find this bucket. Refresh Explorer.'
  }[error.code];
  if(message)return message;
 }
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
async function presentOperation(kind,run){
 let finish;
 try{finish=operationFeedback.start(kind);}catch{/* Optional presentation. */}
 try{
  const result=await run();
  try{finish?.(true);}catch{/* Optional presentation. */}
  return result;
 }catch(error){
  try{finish?.(false,$('#dialog').open&&['rename','mkdir','delete','move'].includes(kind)?null:
   renameUnconfirmed(error)?'Outcome unconfirmed. Refresh before retrying.':
   error.code==='FILE_SETUP_APPROVAL_REQUIRED'?'File access needs review.':undefined);}catch{/* Optional presentation. */}
  throw error;
 }
}
function namedOperation(title,label,value,run,{bucket=false,singleRename=false}={}){
 dialog(title,'<form id="file-name-form"><label>'+esc(label)+' <input id="file-name" '+(bucket?'required minlength="3" maxlength="63"':'maxlength="1024"')+' value="'+esc(value)+'"></label><button type="submit">'+(singleRename?'Save':esc(title))+'</button><p id="file-feedback" role="status"></p></form>');
 const form=$('#file-name-form'),input=$('#file-name'),button=form.querySelector('button'),feedback=$('#file-feedback');
 if(singleRename)selectBasename(input);else input.focus();
 form.onsubmit=async event=>{
  event.preventDefault();
  if(button.disabled)return;
  button.disabled=true;feedback.textContent=singleRename||title==='New Folder'?'':'Working…';
  if(singleRename)input.readOnly=true;
  try{
   const renamed=await run(input.value);
   if(!form.isConnected||!$('#dialog').open)return;
   closeDialog();
   if(singleRename&&view==='explorer'&&selected.has(renamed.key)){
    const index=listingOrder.index(renamed.key);
    if(index!==undefined)focusRow(index);
   }
  }catch(error){
   if(!form.isConnected||!$('#dialog').open)return;
   feedback.textContent=fileError(title,error);
   button.disabled=singleRename&&renameUnconfirmed(error);
   if(singleRename)input.readOnly=button.disabled;
  }
 };
}
async function finishFileAction(action,params,approve=false,idempotencyKey){
 const result=await presentOperation(action,async()=>{
  const result=await runFileAction(action,params,approve,idempotencyKey);
  if(!(result.data??result).code?.endsWith('_VERIFIED'))
   throw Object.assign(Error(),{code:(result.data??result).code??'FILE_ACTION_UNCONFIRMED'});
  return result;
 });
 listingReader.invalidate();
 if(view==='explorer')await reloadCurrentDirectory();
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
 if(action==='rename'&&!entry.folder){
  namedOperation('Rename','New name',fileLeaf(entry),name=>renameFile(entry,captured,name),{singleRename:true});
  return;
 }
 if(action==='mkdir'||action==='rename'){
  const title=action==='mkdir'?'New Folder':'Rename';
  const attempts=new Map();
  const run=(name,allow)=>{
   if(!attempts.has(name))attempts.set(name,crypto.randomUUID());
   return finishFileAction(action,{...params,name},allow,attempts.get(name));
  };
  const detail=action==='mkdir'?`To create this folder, Click2Cloud needs to prepare or update its private Worker for bucket ${captured.bucketName}. Cloudflare may charge for Worker and R2 usage. Continue to approve this setup and create the folder.`:undefined;
  namedOperation(title,action==='mkdir'?'Folder name':'New name',action==='rename'?(entry.displayName??entry.key.split('/').filter(Boolean).at(-1)):'',
   action==='rename'?name=>run(name,false):offerFilePreparation(title,run,detail));
  return;
 }
 if(action==='move'){
  namedOperation('Move','Destination folder in '+captured.bucketName,captured.prefix,
   offerFilePreparation('Move',(prefix,allow)=>finishFileAction(action,{...params,destination:{...captured,prefix:prefix&&!prefix.endsWith('/')?prefix+'/':prefix}},allow)));
  return;
 }
}
async function deleteExplorerFiles(entries,target){
 if(!entries.length)return;
 const captured=structuredClone(target);
 const remaining=entries.map(fileReference);
 let changed=false;
 const remove=offerFilePreparation('Delete',allow=>presentOperation('delete',async()=>{
  try{
   while(remaining.length){
    const result=await runFileAction('delete',{source:captured,entry:remaining[0]},allow);
    if((result.data??result).code!=='FILE_ACTION_VERIFIED')throw Object.assign(Error(),{code:'FILE_ACTION_UNCONFIRMED'});
    selected.delete(remaining.shift().key);
    changed=true;
   }
  }finally{
   if(changed){listingReader.invalidate();if(view==='explorer')void reloadCurrentDirectory();}
  }
 }));
 if(confirmExplorerDelete){
  const [entry]=entries;
  const summary=entries.length===1?esc(entry.displayName??entry.key)+(entry.folder?' and all objects inside it':''):
   'Delete '+entries.length+' selected items, including the contents of selected folders?';
  dialog('Delete permanently?', '<p>'+summary+'</p><p role="status" id="delete-feedback"></p>',
   '<div class="dialog-foot"><button id="cancel-delete">Cancel</button><button id="confirm-delete">Delete</button></div>');
  listen('#cancel-delete','click',closeDialog);
  listen('#confirm-delete','click',async()=>{
   const button=$('#confirm-delete');button.disabled=true;$('#delete-feedback').textContent='';
   try{await remove();if(button.isConnected)closeDialog();}
   catch(error){if(button.isConnected){$('#delete-feedback').textContent=fileError('Delete',error);button.disabled=false;}}
  });
 }else try{await remove();}catch(error){status(fileError('Delete',error),{attention:true});}
}
function cutExplorerFiles(target,entries){
 if(!entries.length)return;
 keepClipboard({source:structuredClone(target),entries:entries.map(fileReference),action:'move'});
 operationFeedback.notify('Cut to cloud clipboard.');
}
async function copyExplorerFiles(target,entries,writeImage=false){
 if(!entries.length)return;
 keepClipboard({source:structuredClone(target),entries:entries.map(fileReference),action:'copy'});
 if(!writeImage||!entries.some(isImage))return operationFeedback.notify('Copied!');
 if(entries.length!==1)return operationFeedback.notify('Cloud copied. Select one image for the image clipboard.');
 await writeExplorerImage(target,entries[0],true);
}
async function writeExplorerImage(target,entry,cloudCopied=false){
 let finish;
 try{finish=operationFeedback.start('copy');}catch{/* Optional presentation. */}
 try{
  await copyImageToClipboard(target,entry);
 }catch{
  try{finish?.(false,cloudCopied?'Cloud copied. Image clipboard unavailable.':undefined);}catch{/* Optional presentation. */}
  return;
 }
 try{finish?.(true,cloudCopied?'Copied! Cloud and image clipboard.':undefined);}catch{/* Optional presentation. */}
}
async function pasteFiles(destination,dragged){
 const original=dragged??fileClipboard;if(!original||clipboardTransferPending)return;
 const clip=structuredClone(original),kind=dragged?'move':'paste';let completed=0;
 const transfer=async approved=>{
  if(clipboardTransferPending)return;
  clipboardTransferPending=true;
  try{
   await presentOperation(kind,async()=>{
    for(;completed<clip.entries.length;completed++){
     const entry=clip.entries[completed],result=await runFileAction(clip.action,{source:clip.source,destination,entry},approved);
     if((result.data??result).code!=='FILE_ACTION_VERIFIED')throw Object.assign(Error(),{code:'FILE_ACTION_UNCONFIRMED'});
     if(clip.action==='move'&&source&&targetKey(source)===targetKey(clip.source))selected.delete(entry.key);
     if(clip.action==='move'&&fileClipboard===original){
      original.entries.shift();
      keepClipboard(original.entries.length?original:null);
     }
    }
   });
  }catch(error){
   if(error.code==='FILE_SETUP_APPROVAL_REQUIRED'&&!approved){setupDisclosure('Prepare file transfer',()=>transfer(true));return;}
   if(approved)throw error;
  }finally{
   clipboardTransferPending=false;
   if(completed&&view==='explorer'){listingReader.invalidate();void reloadCurrentDirectory();}
  }
 };
 await transfer(false);
}
let clipboardTransferPending=false;
async function chooseRemoteSave(entry){const capabilities=await api('describeCapabilities');if(capabilities.providers?.cloudflare?.explorerSource===false){dialog('Save to cloud','<p>This private Explorer file has no authorized remote source transfer. Cloudflare never stages file bytes through your browser.</p><button id="download-stream">Download instead</button>');listen('#download-stream','click',()=>downloadEntry(entry));return;}
  const captured=structuredClone(source),menu=await api('previewContextMenu',{context:'link'}),leaves=[];
  function render(items){return items.map(item=>{if(item.role==='save'||item.role==='provider-action'){const i=leaves.push(item)-1;return `<p><button data-cloud-save="${i}" ${!item.enabled||!menu.nativeAcknowledged?'disabled':''}>${esc(item.label)}${!item.enabled?' · '+esc(item.reason):''}</button></p>`;}return item.role==='branch'?`<details open><summary>${esc(item.label)}</summary>${render(item.children)}</details>`:'';}).join('');}
  dialog('Save to cloud',`<p>${esc(entry.displayName??entry.key)}</p>${render(menu.roots)||'<p>No configured destinations.</p>'}<p class="muted">Saving requires current source-account authorization, a native menu ACK and a verified provider transport.</p>`);
  $$('[data-cloud-save]').forEach(b=>b.onclick=async()=>{try{const item=leaves[b.dataset.cloudSave];if(!confirm('Save this file to '+item.label+'?'))return;if(item.providerAction){await api('invokeProviderAction',{provider:item.providerAction,idempotencyKey:crypto.randomUUID()});return;}const r=await api('dispatchExplorerSave',{itemId:item.itemId,generation:menu.generation,context:'link',source:captured,entry:{key:entry.key,folder:false,...(entry.displayName?{displayName:entry.displayName}:{})},idempotencyKey:crypto.randomUUID()});status(r.confirmed?'Save verified by provider readback.':r.code);closeDialog();}catch(error){status(error.message);}});
}
const completedDestinationMessage=result=>result.destinationReadiness?.length?'Saved · Ready for right-click':'Saved · Chrome menu acknowledged';
const saveButton='<button id="save" class="primary">Save</button>';
const saveFeedback='<p id="destination-save-status" class="muted" role="status" aria-live="polite" hidden></p>';
const destinationSetupDisclosure='<details><summary>Setup and Usage</summary><p>Save prepares or maintains the private Cloudflare Worker for the selected destinations and checks a small R2 verification file when needed. Worker and R2 usage may incur charges. Setup covers the selected bucket.</p></details>';
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
  const pathLabel=t=>accountLabel(connection.accounts?.find(account=>account.id===t.accountId),connection.accounts)+' · '+destinationPath(t);
  const rowHtml=(d,i)=>`<div class="dest-row ${d.hidden?'hidden':''}">
    <div class="manager-row-name"><strong>${esc(rowLabel(d))}</strong><div class="muted" title="${esc(pathLabel(d.target))}">Cloudflare R2 · ${esc(pathLabel(d.target))}</div></div>
    <div class="controls">
      ${isDepth?'':`<button data-default="${i}" aria-pressed="${isDefault(d)}" ${isDefault(d)?'aria-label="Default destination: '+esc(rowLabel(d))+'"':''}>${isDefault(d)?'Default':'Make Default'}</button>`}
      ${isDepth?`<label>Maximum depth <input data-manager-depth="${i}" type="number" min="1" step="1" value="${d.maxDepth}" aria-label="Display depth for ${esc(d.target.bucketName)}"></label>`:
       `<button data-quick="${i}" aria-pressed="${!!d.quick}">${d.quick?'Quick ✓':'Quick Select'}</button><button class="manager-icon" data-edit="${i}" aria-label="Edit Menu Title" title="Edit Menu Title">✎</button>`}
      <button class="manager-icon" data-hide="${i}" aria-label="${isDepth?'Change visibility for '+esc(d.target.bucketName):'Change Visibility'}" aria-pressed="${!d.hidden}" title="Change visibility"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"><path d="M1 10Q10 -2 19 10Q10 22 1 10Z"/><circle cx="10" cy="10" r="3"/>${d.hidden?'<path d="M2 2L18 18"/>':''}</svg></button>
      <button class="manager-icon" data-delete="${i}" aria-label="${isDepth?'Remove Depth bucket '+esc(d.target.bucketName):'Remove destination configuration'}" title="Remove destination"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"><path d="M4 5h12M8 5V3h4v2M6 5l1 12h6l1-12M9 8v6m2-6v6"/></svg></button>
    </div></div>`;
  dialog('Destinations',`<div class="destinations-manager">
    <p class="manager-purpose muted">Choose where Chrome’s right-click menu saves files.</p>
    <div class="manager-mode-bar"><div class="tabs" role="group" aria-label="Destination mode">${[['simple','Simple'],['nested','Narrow'],['depth','Depth']].map(([mode,label])=>
     `<button data-manager-mode="${mode}" class="${mode===filter?'active':''}" aria-pressed="${mode===filter}">${label}</button>`).join('')}</div>
     <button id="organize" aria-label="Organize Right-Click">Organize</button></div>
    <section class="manager-default"><h3>Default Destination</h3><p title="${esc(product.defaultTarget?destinationPath(product.defaultTarget):'')}">${product.defaultTarget?esc(destinationPath(product.defaultTarget)):'No default selected'}</p></section>
    <p class="muted">${connection?.state==='CONNECTED'?'Availability depends on the connected account.':'Reconnect to use saved destinations.'}</p>
    <div id="dest-list"${isDepth?' class="depth-destinations"':''}>${items.map(rowHtml).join('')||'<p class="muted manager-empty">No destinations in this mode.</p>'}</div>
    <div id="destination-delete-confirmation" class="card" role="group" aria-labelledby="destination-delete-title" hidden></div>
    ${isDepth?'<div id="manager-buckets"></div>':''}<button id="browse-destinations">Browse Cloudflare buckets</button>
    <section class="show-controls manager-chrome">${showInChrome(product.show,'data-manager-show')}</section>
    ${destinationSetupDisclosure}</div>`,
    `<div class="dialog-foot manager-footer">${saveFeedback}<nav aria-label="Destination pages"><button id="previous" ${!page?'disabled':''}>Previous</button><span>${total?`${page*20+1}–${Math.min(total,page*20+20)} of ${total}`:'0 destinations'}</span><button id="next" ${(page+1)*20>=total?'disabled':''}>Next</button></nav>${saveButton}</div>`);
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
      deleteReturnButton=button;deletion.innerHTML=`<h3 id="destination-delete-title">Remove ${esc(rowLabel(selected))}?</h3><p>Remove only this menu configuration when you Save. Cloud files and folders are kept.</p><p class="target">${esc(pathLabel(selected.target))}</p><button id="cancel-destination-delete">Cancel</button> <button id="confirm-destination-delete">Remove from draft</button>`;
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
      region.innerHTML=available.length?`<label>Add Depth bucket <select id="manager-bucket-choice">${available.map((t,i)=>`<option value="${i}">${esc(available.some(other=>other.bucketName===t.bucketName&&other.accountId!==t.accountId)?t.bucketName+' · '+accountLabel(connection.accounts?.find(account=>account.id===t.accountId),connection.accounts):t.bucketName)}</option>`).join('')}</select></label> <button id="add-manager-bucket">Add</button>`:'';
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
  await Promise.all([aestheticReady,dividerReady]);
  const [recovery,visual]=await Promise.all([api('inspectBackupRoots'),api('getGalleryLoadingVisual')]);if(view!=='settings')return;const policy=state.product.recovery;
  const favoriteProviders=[['google-drive','Google Drive'],['onedrive','OneDrive'],['dropbox','Dropbox'],['cloudflare','Cloudflare R2']];
  const providerMenuOptions=[['google-drive','Google Drive'],['dropbox','Dropbox'],['onedrive','OneDrive'],['cloudflare','Cloudflare']];
  $('#main').innerHTML=`<section class="page"><h1>Settings</h1><div class="card"><h2>Aesthetic</h2><div class="settings-row"><label for="appearance">Theme</label><select id="appearance">${aesthetic.list().map(theme=>'<option value="'+esc(theme.id)+'">'+esc(theme.name)+'</option>').join('')}</select></div><fieldset id="aesthetic-palette" class="palette-settings"><legend>Color and Typography</legend><div class="palette-options">${aesthetic.listPalettes().map(({id,name,preview})=>`<label class="palette-choice"><input type="radio" name="aesthetic-palette" value="${esc(id)}"><span class="palette-swatch" aria-hidden="true" style="--swatch-light:${preview.light};--swatch-dark:${preview.dark}"></span><span>${esc(name)}</span></label>`).join('')}</div><div data-palette-preview aria-label="Palette preview"><h3 id="palette-preview-name"></h3><p>Folder names and descriptions</p><button type="button" disabled>Example control</button></div></fieldset><div class="settings-row" id="nostalgia-style-row" hidden><label for="nostalgia-style">Nostalgia Style</label><select id="nostalgia-style">${aesthetic.listNostalgiaStyles().map(({id,name})=>'<option value="'+esc(id)+'">'+esc(name)+'</option>').join('')}</select></div><div class="settings-row" id="onyx-finish-row" hidden><label for="onyx-finish">Onyx Finish</label><select id="onyx-finish">${aesthetic.listOnyxFinishes().map(({id,name})=>'<option value="'+esc(id)+'">'+esc(name)+'</option>').join('')}</select></div><p id="aesthetic-status" role="status"></p><div class="settings-row"><label for="setting-theme">Color mode</label><select id="setting-theme"><option value="dark">Dark</option><option value="light">Light</option></select></div></div><div class="card"><h2>Gallery Loading Visual</h2><label for="loading-visual-mode">Loading visual</label><select id="loading-visual-mode"><option value="math">Mathematical geometry</option><option value="media">My local media</option><option value="plain">Plain placeholder</option></select><label>Choose local loading media <input id="loading-visual-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4"></label><p class="muted">${esc(visual.warning?'Custom media is unavailable; choose a replacement or remove it.':visual.media?.name??'No custom media selected')}. One local visual, up to 8 MiB; never uploaded. Reduced motion uses a still frame.</p><button id="loading-visual-remove" ${!visual.media&&!visual.warning?'disabled':''}>Remove local media</button><p id="loading-visual-result" role="status"></p></div><div class="card"><h2>Right-Click Menu</h2><p class="muted">Choose which cloud providers appear in Chrome's right-click menu. Turning one off keeps its account, files and saved destinations.</p>${providerMenuOptions.map(([provider,name])=>`<label class="settings-row"><span>${name}</span><input type="checkbox" data-provider-visible="${provider}" ${state.product.providerVisibility?.[provider]!==false?'checked':''} aria-label="Show ${name} in Chrome right-click menu"></label>`).join('')}</div>${manifestCard}<div class="card"><h2>Favorite Cloud</h2><p class="muted">A personal marker for future use. It does not change saves or menus.</p>${favoriteProviders.map(([provider,name])=>`<label><input type="checkbox" data-favorite="${provider}" ${state.product.favorites.some(id=>id==='provider:'+provider||provider==='cloudflare'&&id.startsWith('cloudflare:'))?'checked':''}> ${name}</label>`).join('')}</div><div id="settings-recovery" class="card"><h2>Recovery Mode</h2><p class="muted">External storage: ${esc(recovery.state)}. Automatic Windows known-folder storage requires a native companion.</p><label>Cadence <select id="cadence"><option value="weekly">Weekly · Monday</option><option value="daily">Daily</option></select></label><label><input type="checkbox" id="simple-recovery" ${policy.simple?'checked':''}> Simple Recovery</label><label><input type="checkbox" id="narrow-recovery" ${policy.nested?'checked':''}> Narrow Recovery</label><details><summary>Bucket Recovery Crawl</summary><p class="muted">Recovery depth is independent of Chrome display depth. Expand accounts in File Explorer to discover buckets.</p>${bucketTargets.map((b,i)=>{const policy=state.product.recovery.buckets.find(p=>p.target.accountId===b.accountId&&p.target.bucketName===b.bucketName);return `<label><input data-recovery="${i}" type="checkbox" ${policy?.enabled?'checked':''}> ${esc(b.bucketName)} <input type="number" min="1" data-crawl-depth="${i}" aria-label="Recovery depth for ${esc(b.bucketName)}" value="${policy?.depth??10}"></label>`;}).join('')}</details><label>Windows Backup Location <select id="backup-location"><option value="automatic">Automatic · Local AppData</option><option value="documents">Documents</option></select></label><p class="muted">Windows locations are unavailable without a native companion. A user-authorized external folder can be attached separately.</p><button id="choose-backup">Choose external backup folder</button><button id="backup-now">Back up now</button><button id="restore">Restore My Right-Click Menu</button></div><div id="settings-whole-cloud" class="card"><h2>Save Whole Cloud</h2><p class="muted">Read-only bucket/key outline. Starts only when explicitly enabled and external storage is authorized. Lost authorization quietly pauses the job.</p>${(connection?.accounts??[]).map((a,i)=>`<label><input type="checkbox" data-whole="${i}"> Cloudflare · ${esc(a.name)}</label>`).join('')||'<p class="muted">No connected supported accounts.</p>'}<button id="enable-whole">Enable selected accounts</button><button id="stop-whole">Stop selected accounts</button><button id="whole-status">Inspect jobs</button><pre id="jobs"></pre></div><div id="settings-connection" class="card" data-debug-only hidden><h2>Connection</h2><p id="oauth-redirect-uri" class="muted wrap-text">${esc(connection?.redirectUri??'')}</p><button id="disconnect" ${!connection?.authenticated&&connection?.state!=='CONNECTED'?'disabled':''}>Disconnect Cloudflare</button></div><div class="card" id="programmatic-access"><h2>Programmatic Access</h2><p class="muted">The V3+1 API powers these controls. Agent execution requires a separate local grant scoped to methods, accounts, and expiry. No public endpoint or active MCP connection.</p><button id="capabilities">Inspect API capabilities</button><pre id="api-info"></pre></div></section>`;
  navigationPlacement.mount($('#main .page'));
  mountQueueSettings($('#main .page'),queueService);
  mountHistorySettings($('#main .page'),queueService,historyV2Preference);
  mountManifestPanel($('#portable-menu-manifests'),{api:(method,params)=>api(method,params,{quiet:true}),accounts:()=>connection?.accounts??[],getRevision:()=>state.product.revision,onApplied:async()=>{await refreshState();}});
  const debugCard=document.createElement('div');debugCard.className='card';debugCard.innerHTML='<h2>Debug</h2><label><input id="debug-mode" type="checkbox"> Debug Mode</label><p class="muted">Show diagnostic status and inspect safe local details. This does not grant additional access or change saving.</p><div id="basic-diagnostics"></div><div id="debug-details" data-debug-only hidden><label><input id="automatic-upload-receipts" type="checkbox"> Produce and download receipts after uploads automatically</label><button id="show-save-results">Review save results</button><button id="debug-health">Inspect safe diagnostics</button><pre id="debug-health-output"></pre><div id="recorder-panel"></div></div><p id="debug-preference-result" role="status"></p>';$('#main .page').append(debugCard);basicDiagnostics.mount($('#basic-diagnostics'));applyDebugMode(debugMode);
  void import('./recorder-panel.mjs').then(m=>m.mountRecorderPanel(document.querySelector('#recorder-panel'))).catch(()=>{});
  const settingsPage=$('#main .page');
  listen('#debug-mode','change',async event=>{const enabled=event.target.checked,feedback=$('#debug-preference-result');try{if(!enabled&&!confirm('Turn Debug Mode off and stop any expansive forensic recording? Basic diagnostics stays on.')){event.target.checked=true;return;}await debugPreference.set(enabled);applyDebugMode(enabled);if(!enabled){let deadline;try{await Promise.race([chrome.runtime.sendMessage({channel:'recorder',version:2,method:'stop',params:{}}),new Promise(resolve=>{deadline=setTimeout(resolve,2000);})]);}catch{}finally{clearTimeout(deadline);}}if(feedback.isConnected)feedback.textContent='';}catch{applyDebugMode(debugPreference.enabled);if(feedback.isConnected)feedback.textContent='Debug Mode is OFF for this window; the preference could not be saved. Try again.';}});
  const receiptOption=$('#automatic-upload-receipts');
  async function loadUploadReceiptPreference(){
   const preferences=await chrome.storage.local.get(['uiDebugMode',uploadReceiptPreferenceKey]);
   if(receiptOption.isConnected)receiptOption.checked=preferences.uiDebugMode===true&&uploadId(preferences[uploadReceiptPreferenceKey]);
  }
  void loadUploadReceiptPreference().catch(()=>{});
  listen('#automatic-upload-receipts','change',async()=>{
   const enabled=receiptOption.checked;
   try{
    const {uiDebugMode}=await chrome.storage.local.get('uiDebugMode');
    if(uiDebugMode===true&&debugMode)await chrome.storage.local.set({[uploadReceiptPreferenceKey]:enabled?crypto.randomUUID():false});
    await loadUploadReceiptPreference();
   }catch{
    receiptOption.checked=false;
    if(receiptOption.isConnected)$('#debug-preference-result').textContent='Could not save the upload receipt preference.';
   }
  });
  listen('#show-save-results','click',()=>{if(debugMode)return show('history');});
  listen('#debug-health','click',async()=>{const output=$('#debug-health-output');output.textContent='Reading local diagnostics…';try{const report=await api('getEngineHealth',{view:'support'},{quiet:true});if(output.isConnected)output.textContent=JSON.stringify(report,null,2);}catch{if(output.isConnected)output.textContent='Diagnostics are unavailable. Your saved data was kept.';}});
  const deleteSetting=document.createElement('section');
  deleteSetting.className='card';
  deleteSetting.innerHTML='<h2>File Explorer Settings</h2><label><input id="confirm-explorer-delete" type="checkbox"> Confirm before deleting cloud files</label>';
  const accountCard=document.createElement('details');accountCard.className='card';
  accountCard.innerHTML='<summary>Cloudflare Accounts</summary><p>Account IDs identify Cloudflare accounts in support and configuration tools.</p>'+
   (connection.accounts??[]).map((account,index)=>'<p>'+esc(accountLabel(account,connection.accounts))+' <code>'+esc(account.id)+'</code> <button data-copy-account="'+index+'">Copy</button></p>').join('');
  $('#main .page').append(deleteSetting,accountCard);
  for(const button of accountCard.querySelectorAll('[data-copy-account]')){
   const id=connection.accounts[Number(button.dataset.copyAccount)].id;
   button.onclick=async()=>{try{await navigator.clipboard.writeText(id);status('Account ID copied.');}catch{status('Clipboard unavailable.');}};
  }
 $('#confirm-explorer-delete').checked=confirmExplorerDelete;
  listen('#confirm-explorer-delete','change',async e=>{
   try{await chrome.storage.local.set({[deletePreference]:e.target.checked});confirmExplorerDelete=e.target.checked;}
   catch(error){e.target.checked=confirmExplorerDelete;throw error;}
  });

  const appearance=$('#appearance'),palettes=$('#aesthetic-palette'),appearanceStatus=$('#aesthetic-status');
  const cursorSetting=document.createElement('div');
  cursorSetting.className='settings-row';
  cursorSetting.innerHTML='<label for="busy-cursor-style">Busy Cursor Style</label><select id="busy-cursor-style">'+
   aesthetic.listBusyCursors().map(({id,name})=>'<option value="'+esc(id)+'">'+esc(name)+'</option>').join('')+'</select>';
  appearance.closest('.settings-row').after(cursorSetting);
  const busyCursor=cursorSetting.querySelector('select');
  busyCursor.value=aesthetic.getBusyCursor();
  busyCursor.onchange=async()=>{
   const result=await aesthetic.applyBusyCursor(busyCursor.value);
   busyCursor.value=result.id;
   appearanceStatus.textContent=result.error?'Busy cursor changed for this session. The preference could not be saved.':'';
  };
  mountVisualFeedbackSettings(appearance.closest('.card'),visualFeedback);
  const nostalgiaStyle=$('#nostalgia-style'),onyxFinish=$('#onyx-finish');
  function syncAppearance(){
   appearance.value=aesthetic.getActive().id;
   palettes.hidden=!['minimal','frames'].includes(appearance.value);
   $('#nostalgia-style-row').hidden=appearance.value!=='nostalgia';
   nostalgiaStyle.value=aesthetic.getNostalgiaStyle()??'';
   $('#onyx-finish-row').hidden=appearance.value!=='onyx';
   onyxFinish.value=aesthetic.getOnyxFinish();
   $('#palette-preview-name').textContent=aesthetic.listPalettes().find(palette=>palette.id===aesthetic.getPalette())?.name??'';
   for(const option of palettes.querySelectorAll('input'))option.checked=option.value===aesthetic.getPalette();
  }
  let appearanceChange=0;
  async function showAppearanceResult(pending){
   const ticket=++appearanceChange,styleHadFocus=document.activeElement===nostalgiaStyle;
   syncAppearance();
   navigationPlacement.fit();
   rememberFeedbackAccent();
   if(styleHadFocus&&$('#nostalgia-style-row').hidden)appearance.focus();
   const {error}=await pending;
   if(ticket!==appearanceChange)return;
   appearanceStatus.textContent=error==='PREFERENCE_WRITE_FAILED'?'Appearance changed for this session. The preference could not be saved.':
    error?'Appearance unavailable. Showing Minimal.':'';
  }
  appearance.onchange=event=>showAppearanceResult(aesthetic.apply({id:event.target.value}));
  nostalgiaStyle.onchange=event=>showAppearanceResult(aesthetic.applyNostalgiaStyle(event.target.value));
  onyxFinish.onchange=event=>showAppearanceResult(aesthetic.applyOnyxFinish(event.target.value));
  palettes.onchange=event=>showAppearanceResult(aesthetic.applyPalette(event.target.value));
  syncAppearance();
  if(aesthetic.getActive().error)appearanceStatus.textContent='Saved appearance unavailable. Showing Minimal.';
  $('#setting-theme').value=state.product.theme;$('#cadence').value=policy.cadence;$('#backup-location').value=policy.location;
  listen('#setting-theme','change',e=>change({type:'setTheme',theme:e.target.value}));
  $$('[data-provider-visible]').forEach(input=>input.onchange=async()=>{try{await change({type:'setProviderMenuVisibility',provider:input.dataset.providerVisible,visible:input.checked});}catch(e){input.checked=!input.checked;status(e.message);}});
  $$('[data-favorite]').forEach(input=>input.onchange=async()=>{
    const favorite=input.checked, provider=input.dataset.favorite;
    const changes=[{type:'setFavorite',connectionId:'provider:'+provider,favorite}];
    if(!favorite&&provider==='cloudflare')for(const id of state.product.favorites)
      if(id.startsWith('cloudflare:'))changes.push({type:'setFavorite',connectionId:id,favorite:false});
    input.disabled=true;
    try{await change(changes);}
    catch(error){input.checked=!favorite;status(error.message);}
    finally{input.disabled=false;}
  });
  $('#loading-visual-mode').value=visual.mode;
  const saveVisual=async params=>{const result=await api('setGalleryLoadingVisual',{expectedRevision:visual.revision,...params});cachedGalleryVisual=null;await renderSettings();$('#loading-visual-result').textContent='Loading visual saved locally.';return result;};
  listen('#loading-visual-mode','change',async e=>{try{await saveVisual({mode:e.target.value});}catch(error){e.target.value=visual.mode;$('#loading-visual-result').textContent=error.code??error.message;}});
  listen('#loading-visual-remove','click',()=>saveVisual({mode:visual.mode==='media'?'math':visual.mode,removeMedia:true}));
  listen('#loading-visual-file','change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>LOADING_MEDIA_MAX_BYTES)throw Error('LOADING_MEDIA_TOO_LARGE');let binary='';const bytes=new Uint8Array(await file.arrayBuffer());for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));const media={name:file.name,type:file.type,base64:btoa(binary)};loadingMedia(media);await saveVisual({mode:'media',media});}catch(error){$('#loading-visual-result').textContent=error.code??error.message;}});
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
  if(settingsPage.isConnected){
    explorerExports.mountSettings(settingsPage);
    const page=settingsPage;
    await screenshotUI.settings(page);
    if(!page.isConnected)return;
    shortcuts.mount(page,{dividerMode, async setDividerMode(value){
      await chrome.storage.local.set({[dividerCycleKey]:value});
      dividerMode=value;
    }});
    if(state.product.defaultTarget){
      const section=document.createElement('section');section.className='card';
      section.innerHTML='<h2>Default Location</h2><button id="clear-default">Remove Default Location</button>';
      page.append(section);
  listen('#clear-default','click',async()=>{if(confirm('Remove the default destination? Cloud files are kept. If all saved destinations are also removed, the next login can initialize redown again.')){await change({type:'clearDefault'});await renderSettings();}});
    }
  }
  if(settingsPage.isConnected){
  const preference=document.createElement('label');preference.innerHTML='<input id="auto-attention" type="checkbox"> Automatically open login/attention';settingsPage.append(preference);$('#auto-attention').checked=state.product.autoOpenAttention;listen('#auto-attention','change',e=>change({type:'setAutoOpenAttention',visible:e.target.checked}));
  }
}
const headerMore=$('#header-more'),headerMenu=$('#header-menu');
const skyHeader=$('.app-header'),skyHover=createSkyHover(skyIdle);
// Only actual pointer movement across the header boundary can restart the timer.
skyHeader.addEventListener('pointerenter',()=>skyHover.move(true));
document.addEventListener('pointermove',event=>skyHover.move(skyHeader.contains(event.target)),{passive:true,capture:true});
document.documentElement.addEventListener('pointerleave',()=>skyHover.move(false));
skyHeader.addEventListener('pointerdown',skyIdle.cancel,{capture:true});
skyHeader.addEventListener('focusin',()=>{if(skyHeader.querySelector(':focus-visible')){skyIdle.cancel();finishSkyOpening();}});
skyHeader.addEventListener('keydown',skyIdle.cancel);
document.addEventListener('visibilitychange',skyIdle.stopPending);
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',skyIdle.cancel);
const headerItems=()=>[...headerMenu.querySelectorAll('button:not([hidden]):not(:disabled)')].filter(button=>button.getClientRects().length);
function closeHeaderMore(focus=false){if(headerMenu.hidden)return;headerMenu.hidden=true;headerMore.setAttribute('aria-expanded','false');if(focus)headerMore.focus({preventScroll:true});}
headerMore.onclick=()=>{headerMenu.hidden=!headerMenu.hidden;headerMore.setAttribute('aria-expanded',String(!headerMenu.hidden));if(!headerMenu.hidden)headerItems()[0]?.focus();};
headerMore.onkeydown=e=>{if(e.defaultPrevented||e.isComposing)return;if(e.key==='Escape'&&!headerMenu.hidden){e.preventDefault();closeHeaderMore(true);return;}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();headerMenu.hidden=false;headerMore.setAttribute('aria-expanded','true');const items=headerItems();items[e.key==='ArrowDown'?0:items.length-1]?.focus();}};
headerMenu.addEventListener('click',()=>closeHeaderMore());
headerMenu.addEventListener('keydown',e=>{if(e.defaultPrevented||e.isComposing)return;const items=headerItems();if(e.key==='Escape'){e.preventDefault();closeHeaderMore(true);}else if(items.length&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();let i=items.indexOf(document.activeElement);items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();}else if(e.key==='Tab')closeHeaderMore(true);});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.header-more'))closeHeaderMore();});
document.addEventListener('focusin',e=>{if(!e.target.closest('.header-more'))closeHeaderMore();});
const navigationPlacement=installNavigation({header:document.querySelector('header nav'),menu:headerMenu,more:headerMore,open:next=>show(next).catch(e=>status(e.message))});
void aestheticReady.then(()=>{navigationPlacement.fit();if(view==='remotes')renderRemotes();})
 .catch(()=>{}).finally(()=>document.dispatchEvent(new Event('redown-aesthetic-ready')));
// Arm the Providers fade after an intentional reveal, including keyboard access.
function armManageFade(){if(view==='remotes')$('#shell').setAttribute('data-manage-fade','');}
listen('#manage','pointerenter',armManageFade);listen('#manage','focus',armManageFade);
listen('#manage','click',()=>manager());listen('#theme','click',async()=>{await change({type:'setTheme',theme:state.product.theme==='dark'?'light':'dark'});if(view==='settings')await renderSettings();});
document.addEventListener('pointerdown',e=>{if(!$('#context').contains(e.target))hideContext();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){const open=!$('#context').hidden;hideContext();if(open)e.preventDefault();if(open&&contextReturnElement?.isConnected)contextReturnElement.focus({preventScroll:true});}if(!$('#context').hidden&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const items=[...$('#context').querySelectorAll('button:not(:disabled),summary')].filter(item=>item.getClientRects().length),i=items.indexOf(document.activeElement);items[(i+(e.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();}});
$('#dialog').addEventListener('cancel',event=>{
 event.preventDefault();
 if(!gallery||!document.activeElement?.closest(previewInput))dismissPreview();
});
async function bootstrap(){
 // Remotes and its independent controls precede every optional read. No fake config.
 view='remotes';$('#shell').dataset.view='remotes';renderRemotes();$$('header [data-view], #manage').forEach(b=>b.disabled=false);$('header [data-view="remotes"]').classList.add('active');skyIdle.reset();
 const configuration=readWithRetry(()=>refreshState({quiet:true,readTimeout:5000})).catch(error=>{configurationIssue={code:error.code??'CURRENT_READ_UNAVAILABLE',method:error.method,stage:error.stage,diagnostic:error.diagnostic};}).finally(()=>{
  try{if(view==='remotes'&&$('#remotes-connection'))renderRemotes();}
  finally{document.dispatchEvent(new Event('redown-color-mode-ready'));}
 });
 const session=connections().finally(()=>{if(view==='remotes'&&$('#remotes-connection'))renderRemotes();});
 const description=readWithRetry(()=>api('describeCapabilities',{}, {quiet:true,readTimeout:5000})).then(value=>{capabilities=value;}).catch(()=>{});
 const startingView=viewEpoch;
 void shelfView('intent').then(intent=>{if(viewEpoch===startingView)return useShelfIntent(intent);}).catch(()=>{});
 await Promise.allSettled([configuration,session,description]);
 await focusShelf().catch(()=>{});
}
void bootstrap();

async function authorizeCloudflare(accountId,target){
 target=target??(shelfRequest?.provider==='cloudflare'?shelfRequest.target:null);
 const code=cloudflareState?.code??cloudflareState?.worker?.code,renewal=['CAPABILITY_DENIED','WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED'].includes(code);
 if(!target&&!confirm('Authorize Cloudflare R2 setup? This may prepare a private save Worker, create or reuse redown if no destinations exist, and store a small verification file. Cloudflare may charge for usage.'))return;
 if(target&&!confirm('Authorize preparation for '+selectedSetupLabel(target,connection?.accounts)+'? '+(renewal?'Click2Cloud will renew the shared signing key for this bucket’s private save Worker; all its folder saves use that renewed connection. ':'Click2Cloud may create or repair its private save Worker for all paths in this bucket. ')+'It will retain a small R2 verification file. Cloudflare may charge for usage. Existing cloud objects and saved destinations are kept. This does not retry the original source.'))return;
 const button=$('#authorize-setup')??$('#cf-authorize')??$('#update-worker');if(button)button.disabled=true;
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
 $('#main').innerHTML=`<section class="page"><h1>Cloudflare R2</h1>${target?'<h2>Save setup</h2><p>'+esc(selectedSetupLabel(target,accounts))+'</p>':''}<p role="status">${esc(ready?'Prepared and verified · make a new right-click to save.':(target?'Not saved · '+code+' · ':'')+(names[code]??readinessNames[readiness.state]??code))}</p>${!shelfRequest?.target&&accounts.length>1?'<label>Authorized account<select id="cf-account"><option value="">Choose an account</option>'+accounts.map(a=>'<option value="'+esc(a.id)+'" '+(a.id===accountId?'selected':'')+'>'+esc(accountLabel(a))+'</option>').join('')+'</select></label>':''}${workerUpdateMarkup(cloudflareState)}${workerFailureMarkup(readiness.diagnostic)}${setupNeeded?'<p>'+(target?'Prepare this exact bucket and folder using saved approval, or authorize preparation once if needed. No original source is replayed. Cloudflare may charge for Worker/R2 usage and a small retained verification file.':result.onboarding.setupAuthorized?'Setup approval is already saved. Resume the same interrupted operation after correcting Cloudflare access.':'Authorize automatic setup for this account: create/reuse redown only when no destinations or default exist, prepare saved destinations, and verify a small retained readiness file. Cloudflare may charge for usage. Cloud files are never deleted.')+'</p><button id="cf-authorize">'+(target?(!needsApproval&&result.onboarding.setupAuthorized?'Resume setup':'Authorize selected destination'):(result.onboarding.setupAuthorized?'Inspect / resume existing setup':'Authorize automatic setup'))+'</button>':''}<button id="cf-remotes">Back to Remotes</button><details><summary>Advanced Diagnostics</summary><pre>${esc(JSON.stringify({state:readiness.state,code,worker:readiness.worker?.code,target:target?destinationPath(target):undefined},null,2))}</pre><button id="cf-refresh">Refresh status</button></details></section>`;
 listen('#update-worker','click',()=>authorizeCloudflare(accountId,target));listen('#reauthorize-worker','click',()=>login('#reauthorize-worker'));listen('#resume-worker','click',resumeWorkerSetup);listen('#cf-account','change',async e=>{if(!e.target.value)return;await api('selectCloudflareAccount',{accountId:e.target.value});cloudflareState=await api('checkCloudflareR2',{accountId:e.target.value});await refreshState();await cloudflarePanel();});
 listen('#cf-authorize','click',async()=>{if(needsApproval||!result.onboarding.setupAuthorized)return authorizeCloudflare(accountId,target);return resumeWorkerSetup();});
 listen('#cf-refresh','click',cloudflarePanel);listen('#cf-remotes','click',()=>show('remotes'));
}
async function remoteHistory(cursor=null,append=[]){
 if(!debugMode)return;
 const intent=++viewEpoch;const result=await api('inspectRemoteHistory',{limit:20,...(cursor?{cursor}:{})}),page=Array.isArray(result)?{items:result,nextCursor:null}:result,rows=[...append,...page.items.filter(row=>row.kind!=='screenshot-to-cloud')];if(intent!==viewEpoch||!debugMode)return;
 dialog('Save results',rows.length?rows.map(r=>r.kind==='depth-click'?`<div><strong>Depth click · ${esc(r.state)}</strong><p>${esc(r.code)} · ${esc(r.operationId)}</p><p>No transfer receipt is implied by this click record.</p><details><summary>Click Boundary Details</summary><pre>${esc(r.stage)}${r.cause?'\nRelated operation: '+esc(r.cause):''}</pre></details></div>`:`<div><strong>${esc(r.state)}</strong> · ${esc(names[r.code]??r.code)}${r.receipt?.provenance?.sourceUrl?'<p><a href="'+esc(r.receipt.provenance.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Original source'+(r.receipt.provenance.sourceRedacted==='true'?' (credential query removed)':'')+'</a></p>':''}<p>${esc(r.receipt?.key??r.stage??'No verified key')} · ${esc(r.durationMs??'—')} ms</p><button data-receipt="${esc(r.operationId)}">Inspect receipt</button>${['pending','uncertain'].includes(r.state)&&r.kind!=='readiness'?'<button data-cancel-operation="'+esc(r.operationId)+'">Request cancellation</button>':''}${r.state==='verified'&&r.kind!=='readiness'?'<button data-goto="'+esc(r.operationId)+'">GO TO</button>':''}</div>`).join(''):'<p>No remote operations recorded.</p>',page.nextCursor?'<button id="more-results">Load more</button>':'',true);
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

chrome.runtime.onMessage?.addListener((message,sender,respond)=>{
 if(sender?.id!==chrome.runtime.id)return;
 if(message?.channel==='redown-projectile-target'){
  if(projectileShelfWindow===null||message.windowId!==projectileShelfWindow)return;
  const verticalFraction=visibleProviderFraction(document,message.provider);
  if(verticalFraction!==null)respond({windowId:projectileShelfWindow,provider:message.provider,verticalFraction});
  return;
 }
 if(['shelf-history-show','shelf-explorer-search'].includes(message?.channel)){
  const requestedAt=viewEpoch;
  void shelfWindow.then(async id=>{
   if(id!==message.windowId)return;
   const intent=await shelfView('intent');
   if(message.channel==='shelf-history-show'&&(requestedAt!==viewEpoch||intent?.view!=='history'))return;
   if(message.channel==='shelf-explorer-search'&&(intent?.view!=='explorer'||intent.sequence!==message.sequence))return;
   await useShelfIntent(intent);
  }).catch(error=>status(error.message));
  return;
 }
 if(message?.channel==='shelf-history-feedback'){
  void shelfWindow.then(id=>{if(id===message.windowId){
   notifications.show(message.code==='SHELF_CLOSE_UNAVAILABLE'?'Use the Shelf close button in this version of Chrome.':'Chrome could not change the Shelf. Try the shortcut again.',{error:true});
  }}).catch(()=>{});
  return;
 }
 if(message?.channel==='queue-history-changed'){refreshProviderUploadProgress();return;}
 if(message?.channel==='screenshot-history-changed')return;
 if(message?.channel==='screenshot-result'){
  void shelfWindow.then(id=>{
   if(message.windowId!=null&&id!==message.windowId)return;
   if(message.recorded&&message.state==='confirmed'&&message.confirmed>0&&message.confirmed===message.total){
    notifications.clearMatching(`screenshot:${message.operationId}:uploading:undefined`);
    return;
   }
   notifications.show(screenshotFeedback(message),{
    error:message.state!=='uploading'&&(!message.confirmed||message.retryable>0||message.recorded===false),
    key:message.operationId?`screenshot:${message.operationId}:${message.state}:${message.confirmed}`:undefined
   });
  }).catch(()=>{});
  return;
 }
 if(message?.channel==='depth-click-outcome'){
  status(message.message,{attention:message.state===undefined?undefined:!['completed','pending'].includes(message.state),
   noticeKey:saveNoticeKey(message.remoteOperationId??message.operationId,message.state)});
  return;
 }
 if(message?.channel==='redown-basic-status'){basicCards.onStatus(message.status);return;}
 if(message?.channel==='redown-basic-attempt'){
  const attempt=message.attempt;
  basicCards.onAttempt(attempt);
  if(['FAILED','UNCERTAIN'].includes(attempt?.state))
   notifications.show([attempt.message,attempt.nextAction].filter(Boolean).join(' ')||'Provider save did not complete.',{key:saveNoticeKey(attempt.id,attempt.state),error:true});
  return;
 }
 if(message?.channel==='shelf-opened'){const intent=viewEpoch;void shelfWindow.then(id=>{if(id!==null&&id===message.windowId&&intent===viewEpoch){closeDialog();return show('remotes');}}).catch(e=>status(e.message));return;}
 if(message?.channel==='shelf-attention'){void focusShelf({live:true}).catch(e=>status(e.message));return;}
 if(message?.channel==='connection-changed'){explorerUpload?.invalidate();void (async()=>{const before=JSON.stringify([connection?.state,connection?.accounts]);listingReader.invalidate();await connections();if(view==='explorer'&&connection.state==='CONNECTED'&&before===JSON.stringify([connection.state,connection.accounts])&&source)await reloadCurrentDirectory();if(view==='remotes'&&$('#remotes-connection'))renderRemotes();})().catch(e=>status(e.message));return;}
 if(message?.channel==='engine-navigation'&&message.target){if(view!=='explorer')return;void navigate(message.target,true,true).catch(e=>status(e.message));return;}
 if(message?.channel==='filename-inventory-changed'){
  if(source&&view==='explorer'&&message.scopes?.some(d=>scopeKey(source)===scopeKey(d)&&
    (d.prefix===undefined||d.prefix===source.prefix||d.recursive&&source.prefix.startsWith(d.prefix))))markCurrentSearchStale();
  return;
 }
 if(message?.channel!=='remote-result')return;
 const affectsDirectory=d=>d&&source&&view==='explorer'&&source.connectionId===d.connectionId&&source.accountId===d.accountId&&source.bucketName===d.bucketName&&(d.prefix?d.prefix+'/':'').startsWith(source.prefix);
 void (async()=>{const result=message.result;if(result.kind==='readiness')return;reconnectAfter(result.code);
  const noticeKey=saveNoticeKey(result.operationId,result.state);
  if(affectsDirectory(result.destination))markCurrentSearchStale();
  if(result.state==='verified'){
   notifications.clearMatching(saveNoticeKey(result.operationId,'pending'));
   const current=await api('inspectRemoteReceipt',{operationId:result.operationId});if(current.reconciliation?.state!=='verified'){status(current.reconciliation?.code??current.code??'Save verification is pending. Inspect the receipt before retrying.');return;}
   imageReader.clear();clearThumbnails();listingReader.invalidate();const d=current.receipt?.destination??current.destination;
   if(affectsDirectory(d))await reloadCurrentDirectory();status('Saved and independently verified.',{noticeKey});
  }else if(view==='remotes'&&result.code==='SOURCE_UNAVAILABLE')status('Save source unavailable. See History for details.',{attention:true,noticeKey});
  else status(result.state==='pending'?'Saving remotely · '+(result.stage??'accepted'):names[result.code]??result.code??result.state,{attention:result.state!=='pending',noticeKey});
 })().catch(e=>status(e.message));
});
window.addEventListener('focus',()=>{focusPendingSearch();if(view==='screenshot')void screenshotUI.refreshShortcuts();void connections().then(()=>{if(view==='remotes'&&$('#remotes-connection'))renderRemotes();}).catch(e=>status(e.message));});
