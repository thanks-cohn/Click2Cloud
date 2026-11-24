import {HISTORY_CLEANUP_ALARM} from '../src/queue/store.mjs';
import {historyInterval} from '../src/queue/calendar.mjs';
import {downloadHistoryExport} from '../src/queue/export.mjs';

export function mountQueueSettings(parent,service){
  const section=document.createElement('section');
  section.className='card queue-settings';
  section.innerHTML=`<h2>Queue</h2>
    <p>Live Jobs keeps work that is waiting, running or needs attention. Acknowledge resolved alerts in Queue.</p>
    <label>Automatic History Cleanup
      <select data-timer><option value="hide">On · Hide after 15 minutes</option><option value="delete">On · Delete after 15 minutes</option><option value="off">Off</option></select>
    </label>
    <label>History V2 storage limit
      <select data-limit><option value="unlimited">Unlimited</option><option value="capped">Capped</option></select>
    </label>
    <div data-cap-row hidden><label>Maximum History records <input type="number" data-cap min="1" step="1" value="200000"></label>
      <button type="button" data-apply-cap>Apply storage limit</button></div>
    <p class="muted">Unlimited uses available browser storage. A cap permanently removes the oldest History V2 records.</p>
    <label>History card layout <select data-preset><option value="full">Full</option><option value="compact">Compact</option></select></label>
    <label>History display range <select data-range><option value="all">All Time</option><option value="daily">Today / Daily</option><option value="weekly">This Week / Weekly</option></select></label>
    <label>Image preview auto-expansion <select data-previews><option value="all">Expand all images</option><option value="first">Only first page</option><option value="closed">Close all</option></select></label>
    <label><input type="checkbox" data-host> Expand screenshot Host URL by default</label>
    <label>Display / export timezone <input data-timezone></label>
    <div class="queue-actions"><button type="button" data-complete-export>Export Complete History ZIP</button>
      <button type="button" data-cancel-export hidden>Cancel export</button></div>
    <fieldset data-detailed hidden><legend>Export Queue History</legend>
      <label>Export range <select data-export-range><option value="all">All Time</option><option value="daily">Today</option><option value="weekly">This Week</option><option value="monthly">This Month</option><option value="yearly">This Year</option><option value="custom">Custom Date Range</option></select></label>
      <div data-custom hidden><label>Start date <input data-start type="date"></label><label>End date <input data-end type="date"></label></div>
      <label>Format <select data-format><option value="zip">ZIP</option><option value="json">JSON</option><option value="csv">CSV</option><option value="jsonl">JSONL</option></select></label>
      <label><input data-privacy type="checkbox"> Omit browsing provenance</label>
      <label><input data-screenshots type="checkbox" checked> Include Screenshots</label>
      <button type="button" data-range-export>Export selected range</button>
    </fieldset>
    <p role="status" data-queue-settings-status></p>
    <button type="button" data-clear>Clear All History V2</button>
    <dialog data-confirm><form method="dialog" class="card"><h3></h3><p data-scope></p><div class="queue-actions">
      <button type="button" data-export-first>Export All History Before Clearing</button>
      <button value="cancel">Cancel</button><button value="confirm">Continue</button>
    </div></form></dialog>`;
  parent.append(section);
  const $=selector=>section.querySelector(selector),feedback=$('[data-queue-settings-status]');
  const timer=$('[data-timer]'),limit=$('[data-limit]'),cap=$('[data-cap]'),dialog=$('[data-confirm]');
  const complete=$('[data-complete-export]'),rangeButton=$('[data-range-export]'),cancel=$('[data-cancel-export]');
  let policy={}, activeExport, writing=false;
  function paint(){
    const p=service.preferences;
    timer.value=policy.deleteSince?'delete':p.timer==='off'?'off':'hide';
    limit.value=policy.cap?'capped':'unlimited';
    cap.value=String(policy.cap??200000);
    $('[data-cap-row]').hidden=!policy.cap;
    $('[data-detailed]').hidden=timer.value!=='off';
    for(const id of ['preset','range','previews','timezone'])$('[data-'+id+']').value=p[id];
    $('[data-host]').checked=p.expandScreenshotHostURL;
  }
  async function busy(work){
    if(writing)return;
    writing=true;
    try{await work();}
    catch(error){feedback.textContent=error.message==='HISTORY_DATE_RANGE_INVALID'?'Choose a valid inclusive date range.':
      'Queue setting or operation could not be completed. Review the archive and try again.';}
    finally{writing=false;paint();}
  }
  async function exportArchive(options={}){
    if(activeExport)return;
    activeExport=new AbortController();
    complete.disabled=rangeButton.disabled=true;cancel.hidden=false;
    const signal=activeExport.signal;
    try{
      feedback.textContent='Reconciling saved receipts…';
      await service.refresh();
      signal.throwIfAborted();
      feedback.textContent='Preparing History export…';
      const result=await downloadHistoryExport(service.store,{
        timezone:service.preferences.timezone, sourceCoverage:service.coverage, ...options,signal,
        onProgress:({total})=>{feedback.textContent=`Exporting ${total.toLocaleString()} records…`;}
      });
      feedback.textContent=`Export complete · ${result.total.toLocaleString()} records.`;
    }catch(error){
      feedback.textContent=signal.aborted?'Export cancelled.':
        error.name==='QuotaExceededError'?'Browser storage is full. Free space and retry the export.':
        error.code==='ZIP32_LIMIT'||error.message==='ZIP32_LIMIT'?'The selected archive exceeds the ZIP format size limit. Choose a smaller date range.':
        'Export interrupted or unavailable. No complete archive was reported.';
    }finally{activeExport=undefined;complete.disabled=rangeButton.disabled=false;cancel.hidden=true;}
  }
  complete.onclick=()=>void exportArchive();
  cancel.onclick=()=>activeExport?.abort();
  $('[data-export-range]').onchange=event=>{$('[data-custom]').hidden=event.target.value!=='custom';};
  rangeButton.onclick=()=>{
    try{
      const range=historyInterval({range:$('[data-export-range]').value,start:$('[data-start]').value,
        end:$('[data-end]').value,timezone:service.preferences.timezone});
      void exportArchive({...range,format:$('[data-format]').value,privacy:$('[data-privacy]').checked,
        includeScreenshots:$('[data-screenshots]').checked});
    }catch{feedback.textContent='Choose a valid inclusive date range.';}
  };
  timer.onchange=()=>void busy(async()=>{
    const value=timer.value;
    if(value==='delete'&&!confirm('Permanently delete future History V2 records 15 minutes after completion? Existing records, cloud files, original History and Live Jobs are kept.'))return;
    policy=await service.store.setPolicy({deleteSince:value==='delete'?Date.now():null},{confirmed:value==='delete'});
    await service.update({timer:value});
    if(value==='delete')await chrome.alarms.create(HISTORY_CLEANUP_ALARM,{periodInMinutes:1});
    else await chrome.alarms.clear(HISTORY_CLEANUP_ALARM);
    feedback.textContent='History visibility saved.';
  });
  limit.onchange=()=>{
    $('[data-cap-row]').hidden=limit.value!=='capped';
    if(limit.value==='unlimited')void busy(async()=>{
      policy=await service.store.setPolicy({cap:null});
      feedback.textContent='Unlimited archive retention saved.';
    });
  };
  function review(title,message,exportLabel){
    dialog.querySelector('h3').textContent=title;
    $('[data-scope]').textContent=message;
    $('[data-export-first]').textContent=exportLabel;
    dialog.returnValue='cancel';
    dialog.showModal();
    return new Promise(resolve=>{dialog.onclose=()=>resolve(dialog.returnValue==='confirm');});
  }
  $('[data-apply-cap]').onclick=()=>void busy(async()=>{
    const value=cap.valueAsNumber;
    if(!cap.reportValidity()||!Number.isSafeInteger(value))throw Error('HISTORY_INVALID_POLICY');
    const count=await service.store.count();
    if((!policy.cap||value<policy.cap)&&!await review('Apply capped storage?',
      `${count.toLocaleString()} records are retained. The new cap is ${value.toLocaleString()} and would remove up to ${Math.max(0,count-value).toLocaleString()} oldest records now. Future saves roll over the oldest records. Cloud files, Live Jobs and original History are kept.`,
      'Export All History First'))return;
    policy=await service.store.setPolicy({cap:value},{confirmed:true});
    feedback.textContent='History archive limit saved.';
  });
  $('[data-clear]').onclick=()=>void busy(async()=>{
    const coverage=await service.refresh();
    if(coverage.some(source=>source.state!=='retained-source-scanned')){
      feedback.textContent='Clear All requires access to the original receipt stores. Reopen Queue and retry the sync.';return;
    }
    const count=await service.store.count();
    if(!await review('Clear All History V2?',`Permanently clear ${count.toLocaleString()} local History V2 records and their indexes. Cloud files, accounts, Live Jobs, original History and Diagnostics are kept.`,
      'Export All History Before Clearing'))return;
    if(!confirm('Permanently clear the History V2 archive now?'))return;
    feedback.textContent='Clearing History V2…';
    const deleted=await service.store.clear({confirmed:true});
    feedback.textContent=`Cleared ${deleted.toLocaleString()} History V2 records.`;
  });
  $('[data-export-first]').onclick=async()=>{
    const previous=$('[data-scope]').textContent;
    $('[data-scope]').textContent='Exporting the complete archive…';
    await exportArchive();
    $('[data-scope]').textContent=feedback.textContent+' '+previous;
  };
  for(const id of ['preset','range','previews','timezone','host'])$('[data-'+id+']').onchange=event=>void busy(async()=>{
    const value=event.target.value;
    if(id==='timezone')new Intl.DateTimeFormat('en',{timeZone:value});
    await service.update(id==='host'?{expandScreenshotHostURL:event.target.checked}:{[id]:value});
    feedback.textContent='History display preferences saved.';
  });
  void Promise.all([service.ready,service.store.policy()]).then(([,value])=>{policy=value;paint();})
    .catch(()=>{feedback.textContent='History V2 storage is unavailable.';});
}
