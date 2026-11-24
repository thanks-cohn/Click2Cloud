import {createCurrentStore} from '../src/persistence/current-store.mjs';
import {createHistoryArchive} from '../src/history-v2/archive.mjs';
import {createLiveJobs} from '../src/history-v2/jobs.mjs';
import {createHistoryCoordinator} from '../src/history-v2/coordinator.mjs';
import {selectHistoryRange} from '../src/history-v2/calendar.mjs';
import {exportRecord,sourceCoverage} from '../src/history-v2/records.mjs';
import {writeHistoryText} from '../src/history-v2/export-text.mjs';
import {downloadHistoryZip,deliverHistoryFile} from './history-v2-download.mjs';
import {mountLiveJobs} from './live-jobs-view.mjs';
import {mountHistoryV2} from './history-v2-view.mjs';
import {mountQueueSettings} from './queue-settings.mjs';

const preferencesKey='queueHistoryPresentationV1';
const defaults={jobsFilter:'all',layout:'full',range:'all',previews:'all',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone??'UTC'};
function presentation(value) {
  const merged={...defaults,...value};
  if(!['all','working','attention','waiting'].includes(merged.jobsFilter)||!['full','compact'].includes(merged.layout)||!['all','daily','weekly'].includes(merged.range)||!['all','first','closed'].includes(merged.previews))throw Error('HISTORY_PREFERENCE_INVALID');
  selectHistoryRange({timezone:merged.timezone});
  return {jobsFilter:merged.jobsFilter,layout:merged.layout,range:merged.range,previews:merged.previews,timezone:merged.timezone};
}

export function createQueueWorkspace({api,goTo,openRemotes,screenshotRequest,download,source=createCurrentStore(),archive=createHistoryArchive(),jobs=createLiveJobs()}) {
  const listeners=new Set(), channel=new BroadcastChannel('click2cloud-queue-v2');
  const publish=update=>{for(const listener of listeners)listener(update);};
  const changed=()=>{publish();channel.postMessage('changed');};
  channel.onmessage=()=>publish();
  const subscribe=listener=>{listeners.add(listener);return ()=>listeners.delete(listener);};
  const coordinator=createHistoryCoordinator({source,archive,jobs,changed,unavailable:publish});
  let preferences=defaults, mounted, maintenance, expiry;
  const jobsState={},historyState={};
  let pageScroll=0;
  const apply=value=>{try{preferences=presentation(value);}catch{preferences=defaults;}publish('preferences');};
  const ready=chrome.storage.local.get(preferencesKey).then(result=>apply(result[preferencesKey])).catch(()=>{});
  const onStorage=(changes,area)=>{if(area==='local'&&changes[preferencesKey])apply(changes[preferencesKey].newValue);};
  chrome.storage.onChanged.addListener(onStorage);
  async function setPresentation(value) {
    const next=presentation(value);
    await chrome.storage.local.set({[preferencesKey]:next});
    apply(next);
  }
  async function exportHistory({format='zip',privacy=true,includeScreenshots=true,signal,onProgress,...options}={}) {
    const selection=selectHistoryRange({timezone:preferences.timezone,...options});
    return archive.snapshot({...selection,includeScreenshots,signal},async ({records,count,revision})=>{
      async function* safeRecords(){for await(const record of records)yield exportRecord(record,{privacy});}
      const metadata={createdAt:new Date().toISOString(),expectedRecords:count,revision,selection:{...selection,includeScreenshots,privacy},sourceCoverage:{...sourceCoverage,reconciliation:coordinator.isSynced()?'complete scan of available sources':'scan incomplete or source unavailable'},
        redaction:'Credentials and arbitrary uploaded metadata excluded. Browsing URLs omitted by default; optional URLs exclude all query strings and fragments.'};
      if(format==='zip')return downloadHistoryZip(safeRecords(),metadata,{signal,onProgress});
      return deliverHistoryFile(format,writer=>writeHistoryText(writer,safeRecords(),{...metadata,format,signal,onProgress}),{signal});
    });
  }
  function activate() {
    if(!maintenance) {
      // Reconcile durable source data only after using an in-scope surface.
      void coordinator.reconcile();
      expiry=setInterval(()=>publish('expiry'),30000);
      maintenance=setInterval(()=>void archive.maintain().then(changed,()=>publish('history')),60000);
    }
  }
  const service={archive,jobs,subscribe,ready,preferences:()=>preferences,setPresentation,exportHistory,
    async setPolicy(options){const result=await archive.setPolicy(options);changed();return result;},
    async clear(options){
      if(!coordinator.isSynced()&&!await coordinator.reconcile())throw Error('HISTORY_V2_SOURCE_SYNC_REQUIRED');
      const result=await archive.clear(options);changed();return result;
    }};
  const retryScreenshot=id=>screenshotRequest('retry',{operationId:id});
  function stop(){mounted?.();mounted=null;}
  function mount(parent) {
    stop();activate();
    const page=document.createElement('section');page.className='page queue-page';page.innerHTML='<h1>Queue</h1>';
    parent.replaceChildren(page);
    jobsState.defaultCategory=preferences.jobsFilter==='all'?null:preferences.jobsFilter;
    const stopJobs=mountLiveJobs(page,{jobs,subscribe,openRemotes,retryScreenshot,viewState:jobsState,inspectAttempt:id=>api('inspectRemoteReceipt',{operationId:id},{quiet:true})});
    const stopHistory=mountHistoryV2(page,{...service,api,goTo,screenshotRequest,retryScreenshot,download,queue:true,viewState:historyState});
    if(pageScroll)requestAnimationFrame(()=>{if(page.isConnected)parent.scrollTop=pageScroll;});
    mounted=()=>{pageScroll=parent.scrollTop;stopJobs();stopHistory();};
  }
  window.addEventListener('pagehide',()=>{
    stop();coordinator.close();channel.close();chrome.storage.onChanged.removeListener?.(onStorage);clearInterval(expiry);clearInterval(maintenance);
  },{once:true});
  return {mount,stop,notify:coordinator.notify,mountSettings(parent){activate();return mountQueueSettings(parent,service);}};
}
