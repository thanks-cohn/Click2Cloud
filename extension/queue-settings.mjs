import {suggestedCap} from '../src/history-v2/archive.mjs';

const setStatus=(element,text)=>{element.textContent=text;};
export async function mountQueueSettings(parent,service) {
  const section=document.createElement('section');section.className='card queue-settings';
  section.innerHTML=`<h2>Queue</h2><p>Live Jobs keeps working, waiting and unacknowledged jobs visible.</p>
    <label>Automatic History cleanup <select data-cleanup><option value="hide">On · Hide after 15 minutes</option><option value="delete">On · Delete after 15 minutes</option><option value="off">Off</option></select></label>
    <label>History V2 storage limit <select data-retention><option value="unlimited">Unlimited</option><option value="capped">Capped</option></select></label>
    <div data-cap-input hidden><label>Maximum History records <input type="number" min="1" step="1" data-cap value="${suggestedCap}"></label><button type="button" data-apply-cap>Apply cap</button></div>
    <button type="button" data-clear>Clear All History V2</button><p data-archive-status role="status"></p>
    <form data-presentation><label>Default Live Jobs view <select name="jobsFilter"><option value="all">All jobs</option><option value="working">Working</option><option value="attention">Needs attention</option><option value="waiting">Waiting</option></select></label><label>Card layout <select name="layout"><option value="full">Full</option><option value="compact">Compact</option></select></label>
    <label>History display range <select name="range"><option value="all">All time</option><option value="daily">Today</option><option value="weekly">This week</option></select></label>
    <label>Image preview auto-expansion <select name="previews"><option value="all">Expand all images</option><option value="first">Only first page</option><option value="closed">Close all</option></select></label>
    <label>Display / export timezone <input name="timezone" required></label><button>Save Queue preferences</button><p role="status"></p></form>
    <form data-export-settings hidden><h3>Export Queue History</h3><label>Export range <select name="range"><option value="all">All retained History</option><option value="daily">Today</option><option value="weekly">This week</option><option value="monthly">This month</option><option value="yearly">This year</option><option value="custom">Custom date range</option></select></label>
    <div data-dates hidden><label>Start date <input type="date" name="start"></label><label>End date <input type="date" name="end"></label></div>
    <label>Format <select name="format"><option value="zip">ZIP</option><option value="json">JSON</option><option value="jsonl">JSONL</option><option value="csv">CSV</option></select></label>
    <label><input type="checkbox" name="includeScreenshots" checked> Include screenshots</label>
    <label><input type="checkbox" name="privacy" checked> Omit browsing page title and source URLs</label><p>URLs and destination names can contain private information. Review exports before sharing.</p>
    <button>Export Queue History</button><button type="button" data-cancel-export hidden>Cancel export</button><p role="status"></p></form>`;
  parent.append(section);
  const $=query=>section.querySelector(query);
  const cleanup=$('[data-cleanup]'),retention=$('[data-retention]'),capBlock=$('[data-cap-input]'),cap=$('[data-cap]');
  const feedback=$('[data-archive-status]'),exportForm=$('[data-export-settings]'),presentation=$('[data-presentation]');
  let archive, busy=false, currentExport;
  const sync=()=>{
    cleanup.value=archive.cleanup;retention.value=archive.limit===null?'unlimited':'capped';
    capBlock.hidden=archive.limit===null;cap.value=archive.limit??suggestedCap;exportForm.hidden=archive.cleanup!=='off';
  };
  const setAvailable=available=>{for(const control of [cleanup,retention,cap,$('[data-apply-cap]'),$('[data-clear]')])control.disabled=!available;};
  setAvailable(false);
  try{await service.ready;archive=await service.archive.status();if(!section.isConnected)return;sync();setAvailable(true);}
  catch {setStatus(feedback,'Archive settings are unavailable.');}
  for(const [name,value] of Object.entries(service.preferences()))presentation.elements[name].value=value;
  presentation.onsubmit=async event=>{
    event.preventDefault();
    const status=presentation.querySelector('[role=status]');
    try{await service.setPresentation(Object.fromEntries(new FormData(presentation)));setStatus(status,'Queue preferences saved.');}
    catch{setStatus(status,'Queue preferences could not be saved. Check the timezone.');}
  };
  async function run(work) {
    if(busy)return;
    busy=true;setAvailable(false);
    try{await work();}
    catch(error){setStatus(feedback,error.message==='HISTORY_V2_COUNT_CHANGED'?'History changed. Review the updated count and confirm again.':'The archive operation could not be completed. Reopen Queue Settings to check its state.');}
    finally {
      try{archive=await service.archive.status();sync();setAvailable(true);}catch{}
      busy=false;
    }
  }
  function confirmRemoval(title,description,finalLabel) {
    const dialog=document.createElement('dialog'),heading=document.createElement('h3'),summary=document.createElement('p');
    heading.id='queue-archive-confirm-title';heading.textContent=title;summary.textContent=description;
    dialog.setAttribute('aria-labelledby',heading.id);
    dialog.innerHTML='<button type="button" data-export-first>Export all History first</button><label><input data-confirm-local type="checkbox"> I understand that this permanently removes local History V2 records</label><p role="status"></p><button type="button" data-cancel autofocus>Cancel</button><button type="button" data-permanent disabled></button>';
    dialog.prepend(heading,summary);
    section.append(dialog);
    const $=query=>dialog.querySelector(query),confirm=$('[data-permanent]'),exportButton=$('[data-export-first]'),check=$('[data-confirm-local]');
    const controller=new AbortController(),status=$('[role=status]');
    confirm.textContent=finalLabel;
    check.onchange=()=>{confirm.disabled=!check.checked||exportButton.disabled;};
    confirm.onclick=()=>dialog.close('confirmed');$('[data-cancel]').onclick=()=>dialog.close('cancel');
    exportButton.onclick=async()=>{
      exportButton.disabled=true;confirm.disabled=true;
      setStatus(status,'Exporting…');
      try{const output=await service.exportHistory({signal:controller.signal});setStatus(status,`ZIP downloaded · ${output.writtenRecords.toLocaleString()} records.`);}
      catch{setStatus(status,'ZIP unavailable. You can cancel or explicitly continue.');}
      finally{exportButton.disabled=false;confirm.disabled=!check.checked;}
    };
    return new Promise(resolve=>{
      dialog.addEventListener('close',()=>{controller.abort();resolve(dialog.returnValue==='confirmed');dialog.remove();},{once:true});
      dialog.showModal();
    });
  }
  cleanup.onchange=()=>{
    const value=cleanup.value;
    void run(async()=>{
      const approved=value!=='delete'||confirm('Delete History V2 metadata for new saves 15 minutes after they finish? This starts now. Earlier records, live jobs, legacy History and cloud files are kept.');
      if(!approved)return;
      await service.setPolicy({cleanup:value,approved});setStatus(feedback,'Automatic cleanup saved.');
    });
  };
  retention.onchange=()=>{
    capBlock.hidden=retention.value==='unlimited';
    if(retention.value==='unlimited')void run(async()=>{await service.setPolicy({limit:null});setStatus(feedback,'Unlimited History selected.');});
    else cap.focus();
  };
  $('[data-apply-cap]').onclick=()=>{
    const limit=Number(cap.value);
    if(!Number.isSafeInteger(limit)||limit<=0){setStatus(feedback,'Enter a positive whole number.');return;}
    void run(async()=>{
      const current=await service.archive.status(),count=current.count;
      let approved=true;
      if(current.limit===null||limit<current.limit) {
        approved=count>limit?await confirmRemoval('Confirm archive cap',
          `History V2 has ${count.toLocaleString()} records. A maximum of ${limit.toLocaleString()} removes the oldest ${(count-limit).toLocaleString()} V2 records now. Cloud files, legacy History and live jobs are kept.`, 'Apply cap and remove oldest records'):
          confirm(`Keep at most ${limit.toLocaleString()} History V2 records? The oldest records will be removed as new ones arrive. Cloud files, legacy History and live jobs are kept.`);
      }
      if(!approved)return;
      await service.setPolicy({limit,approved,expectedCount:count,expectedRevision:current.revision});setStatus(feedback,'Archive cap applied.');
    });
  };
  $('[data-clear]').onclick=()=>void run(async()=>{
    const {count,revision}=await service.archive.status();
    if(!await confirmRemoval('Clear All History V2',`Permanently clear ${count.toLocaleString()} locally retained History V2 records and indexes. Cloud files, provider accounts, Live Jobs, legacy History and Diagnostics are kept. Export first or continue without an export.`,'Permanently clear V2 History'))return;
    setStatus(feedback,'Clearing History V2…');
    const progress=setInterval(()=>{
      void service.archive.status().then(state=>{
        if(state.clearing)setStatus(feedback,`Clearing History V2 · ${state.count.toLocaleString()} of ${count.toLocaleString()} records remaining.`);
      }).catch(()=>{});
    },500);
    try{await service.clear({approved:true,expectedCount:count,expectedRevision:revision});setStatus(feedback,'History V2 cleared.');}
    finally{clearInterval(progress);}
  });
  exportForm.elements.range.onchange=()=>{$('[data-dates]').hidden=exportForm.elements.range.value!=='custom';};
  const cancel=$('[data-cancel-export]');cancel.onclick=()=>currentExport?.abort();
  exportForm.onsubmit=async event=>{
    event.preventDefault();if(currentExport)return;
    const controller=new AbortController(),status=exportForm.querySelector('[role=status]'),submit=exportForm.querySelector('button');
    currentExport=controller;submit.disabled=true;cancel.hidden=false;
    setStatus(status,'Preparing export…');
    try{
      const fields=Object.fromEntries(new FormData(exportForm));
      const result=await service.exportHistory({...fields,privacy:exportForm.elements.privacy.checked,includeScreenshots:exportForm.elements.includeScreenshots.checked,
        signal:controller.signal,onProgress:(done,total)=>setStatus(status,`Exporting ${done.toLocaleString()} of ${total.toLocaleString()} records…`)});
      setStatus(status,`History downloaded · ${result.writtenRecords.toLocaleString()} records.`);
    }catch(error){setStatus(status,controller.signal.aborted?'Export cancelled.':error.message==='HISTORY_DATE_RANGE_INVALID'?'Choose valid start and end dates.':'Export unavailable. Check browser storage and download permissions.');}
    finally{currentExport=null;submit.disabled=false;cancel.hidden=true;}
  };
  window.addEventListener('pagehide',()=>currentExport?.abort(),{once:true});
}
