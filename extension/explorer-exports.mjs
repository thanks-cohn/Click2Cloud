import {exportDefaults, exportOptions, exportPreferenceKey} from '../src/explorer/export-preferences.mjs';
import {readPreviewBytes} from '../src/explorer/image-preview.mjs';
import {assertExportIdentity,domainName,eligiblePublicObject,formatUrlExport,listExportInventory,metadataBudget,normalizedTags,objectUrls} from '../src/explorer/object-exports.mjs';
import {canEmbedTags,downloadJob,prepareTaggedPng,streamDownloadArchive} from '../src/explorer/download-archive.mjs';

const labels={original:'Download',tags:'Download with Tags',metadata:'Download with All Metadata'};
const settingLabels={urls:'Show Get URL in right-click menu',tags:'Show Download with Tags in right-click menu',metadata:'Show Download with Metadata in right-click menu',nest:'Nest under Download'};
const downloadKey='download-summary:';
const safeError=error=>/^[A-Z0-9_]{1,80}$/.test(error.code??error.message??'')?error.code??error.message:'DOWNLOAD_FAILED';
const format=number=>number.toLocaleString();

export function createExplorerExports({api,esc,dialog,closeDialog,onPreferencesChange}) {
  let options=exportDefaults, update=Promise.resolve();
  const jobs=new Map(), subscribers=new Set(), active=new Map();
  let settingsCard;
  window.addEventListener('pagehide',()=>{for(const controller of active.values())controller.abort();});
  function refreshOptions(value){
    options=exportOptions(value);
    onPreferencesChange();
    for(const input of settingsCard?.querySelectorAll('input[data-export-option]')??[])input.checked=options[input.dataset.exportOption];
  }
  void chrome.storage?.local?.get(exportPreferenceKey).then(values=>refreshOptions(values[exportPreferenceKey])).catch(()=>{});
  chrome.storage?.onChanged?.addListener((changes,area)=>{
    if(area==='local'&&changes[exportPreferenceKey])refreshOptions(changes[exportPreferenceKey].newValue);
    if(area==='session'&&Object.keys(changes).some(key=>key.startsWith(downloadKey)))void refreshJobs();
  });
  function mountSettings(parent){
    const card=document.createElement('section');
    card.className='card';settingsCard=card;
    card.innerHTML='<h2>Explorer downloads and links</h2>'+Object.entries(settingLabels).map(([flag,label])=>
      `<label><input type="checkbox" data-export-option="${flag}" ${options[flag]?'checked':''}> ${label}</label>`).join('')+'<p role="status"></p>';
    parent.append(card);
    card.onchange=event=>{
      const input=event.target, flag=input.dataset.exportOption;
      if(!Object.hasOwn(exportDefaults,flag))return;
      const checked=input.checked;
      const save=async()=>{
        const stored=exportOptions((await chrome.storage.local.get(exportPreferenceKey))[exportPreferenceKey]);
        const next={...stored,[flag]:checked};
        await chrome.storage.local.set({[exportPreferenceKey]:next});
        refreshOptions(next);card.querySelector('[role=status]').textContent='';
      };
      update=update.catch(()=>{}).then(()=>navigator.locks?navigator.locks.request(exportPreferenceKey,save):save()).catch(()=>{input.checked=options[flag];card.querySelector('[role=status]').textContent='Could not save this setting.';});
    };
  }
  function metadata(source,key,signal){return api('getExportObjectMetadata',{source,key},{quiet:true,signal});}
  function collect(source,signal,onProgress){return listExportInventory((source,cursor)=>
    api('listDirectoryObjects',{source,...(cursor?{cursor}:{})},{quiet:true,signal}),source,{signal,onProgress});}
  async function refreshJobs(){
    try{const stored=await chrome.storage?.session?.get(null);
      for(const [key,job] of Object.entries(stored??{}))if(key.startsWith(downloadKey)&&!active.has(job?.jobId)&&job?.createdAt)jobs.set(job.jobId,job);
    }catch{}
    for(const listener of subscribers)listener();
  }
  function saveJob(job){
    jobs.set(job.jobId,job);
    for(const listener of subscribers)listener();
    if(!chrome.storage?.session?.set)return;
    const old=[...jobs.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(40).filter(item=>!active.has(item.jobId));
    for(const item of old)jobs.delete(item.jobId);
    if(old.length)void chrome.storage.session.remove(old.map(item=>downloadKey+item.jobId)).catch(()=>{});
    void chrome.storage.session.set({[downloadKey+job.jobId]:{...job}}).catch(()=>{});
  }
  function mountJobs(parent){
    const section=document.createElement('section');section.className='page';
    section.innerHTML='<h1>Downloads</h1><div id="download-jobs"></div>';
    parent.replaceChildren(section);
    const render=()=>{
      if(!section.isConnected){subscribers.delete(render);return;}
      const holder=section.querySelector('#download-jobs'),expanded=new Set([...holder.querySelectorAll('details[open]')].map(card=>card.dataset.job));
      const cards=[...jobs.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,40);
      holder.innerHTML=cards.map(job=>`<details class="card download-job" data-job="${esc(job.jobId)}" ${expanded.has(job.jobId)?'open':''}><summary><strong>${esc(job.name)}</strong> · ${esc(labels[job.mode])} · ${esc(job.status)}<br><time datetime="${esc(job.createdAt)}">${esc(new Date(job.createdAt).toLocaleString())}</time> · ${format(job.files??0)} files · ${format(job.bytes??0)} bytes</summary><p>Scanned ${format(job.scanned??0)} · errors ${format(job.errors??0)}</p>${job.error?'<p>Code: '+esc(job.error)+'</p>':''}${job.receiptName?'<p>'+esc(job.receiptName)+'</p>':''}</details>`).join('')||'<p>No download jobs in this browser session.</p>';
    };
    subscribers.add(render);render();void refreshJobs();
  }
  function progressDialog(job,controller){
    dialog(labels[job.mode],'<p id="download-progress" role="status">Preparing '+esc(job.name)+'…</p><button id="cancel-export">Cancel</button>');
    const display=document.querySelector('#download-progress');
    document.querySelector('#cancel-export').onclick=()=>controller.abort();
    return display;
  }
  async function archive(source,entry,mode,{forceCompanion=false}={}){
    const recursive=!entry;
    if(!window.showSaveFilePicker)throw Error('Streaming Download requires Chrome file-system access.');
    const name=entry?.displayName??entry?.key.split('/').at(-1)??source.prefix.split('/').filter(Boolean).at(-1)??source.bucketName;
    const taggedPng=!recursive&&mode==='tags'&&!forceCompanion&&canEmbedTags(entry);
    const outputName=taggedPng?name:name+'.zip';
    const handle=await window.showSaveFilePicker({suggestedName:outputName});
    const controller=new AbortController(), {signal}=controller, job=downloadJob();
    const record={jobId:job.jobId,createdAt:job.createdAt,name,mode,status:'Preparing'};
    active.set(job.jobId,controller);saveJob(record);
    const display=progressDialog(record,controller);
    let writer,last=0,deliverable;
    function report(values,force=false){
      Object.assign(record,values);
      if(force||Date.now()-last>300){
        last=Date.now();saveJob(record);
        if(display.isConnected)display.textContent=record.status+' · '+format(record.files??0)+(record.files===1?' file · ':' files · ')+format(record.bytes??0)+' bytes';
      }
    }
    const read=(file,onChunk)=>readPreviewBytes(p=>api('readFileChunk',p,{quiet:true,signal}),
      {source,key:file.key,etag:file.etag,size:file.size},{limit:Number.MAX_SAFE_INTEGER,concurrency:1,signal,onChunk});
    try {
      let inventory;
      if(recursive)inventory=await collect(source,signal,values=>report({status:'Scanning',...values}));
      else {
        const observed=await metadata(source,entry.key,signal);
        if(entry.etag&&Number.isSafeInteger(entry.size))assertExportIdentity(entry,observed);
        inventory={files:[observed],pages:1,complete:true};
      }
      signal.throwIfAborted();
      writer=await handle.createWritable();
      if(taggedPng){
        const file=inventory.files[0];
        if(file.availability!=='observed')throw Error('TAG_METADATA_UNAVAILABLE');
        const bytes=await prepareTaggedPng(file,file.tags,read);
        await writer.write(bytes);deliverable={state:'completed',files:1,bytes:bytes.length};
      }else deliverable=await streamDownloadArchive({source,inventory,mode,recursive,job,outputName:handle.name??outputName,
        write:bytes=>writer.write(bytes),read,metadata:file=>file.tags?file:metadata(source,file.key,signal),signal,
        onProgress:values=>report({status:'Writing',...values}),forceCompanion});
      signal.throwIfAborted();
      await writer.close();
      if((await handle.getFile()).size!==deliverable.bytes)throw Error('DOWNLOAD_WRITE_UNCONFIRMED');
      report({status:deliverable.state==='partial'?'Partial · file size verified':'Complete · file size verified',files:deliverable.files,bytes:deliverable.bytes,errors:deliverable.errors,receiptName:deliverable.receiptName},true);
      if(deliverable.state==='completed'&&deliverable.files>0)void noteDownload(job.jobId,deliverable.files);
    }catch(error){
      try{await writer?.abort();}catch{}
      report({status:signal.aborted?'Cancelled':'Failed',error:safeError(error),receiptName:undefined},true);
      if(display.isConnected)display.textContent=signal.aborted?'Download cancelled.':'Download failed · '+safeError(error);
      if(taggedPng&&['PNG_FORMAT_INVALID','PNG_TAG_READBACK_FAILED'].includes(error.code))offerCompanion(source,entry);
    }finally{
      active.delete(job.jobId);
      const cancel=display.parentElement?.querySelector('#cancel-export');
      if(cancel){cancel.textContent='Close';cancel.onclick=closeDialog;}
    }
  }
  function offerCompanion(source,entry){
    dialog(labels.tags,'<p>This image cannot safely embed tags. Download the unchanged original and a companion tags JSON together in a ZIP.</p><button id="save-tags-zip">Choose ZIP location</button>');
    document.querySelector('#save-tags-zip').onclick=()=>void archive(source,entry,'tags',{forceCompanion:true}).catch(showError);
  }
  function showError(error){
    if(error.name==='AbortError')return;
    dialog('Download unavailable','<p role="alert">'+esc(safeError(error))+'</p>');
  }
  function download(source,entry,mode){
    if(entry&&mode==='tags'&&!canEmbedTags(entry))return offerCompanion(source,entry);
    return archive(source,entry,mode).catch(showError);
  }
  async function urls(source,entry){
    try{
      const get=(domains)=>api('getPublicUrls',{source,...(entry?{key:entry.key}:{}),...(domains?{domains}:{})},{quiet:true});
      const info=await get();
      const next=(value,selected=value.domains)=>entry?urlEditor(source,entry,value,selected,get):directoryUrls(source,selected);
      if(info.domains.length){next(info);return;}
      dialog('Allow Public URL?','<button id="public-url-yes">Yes</button> <button id="public-url-no">No</button>');
      document.querySelector('#public-url-no').onclick=closeDialog;
      document.querySelector('#public-url-yes').onclick=()=>urlEditor(source,entry,info,[],get,next);
    }catch(error){dialog('Get URL','<p role="alert">'+esc(safeError(error))+'</p>');}
  }
  function urlEditor(source,entry,info,selected,get,next){
    const chosen=new Set(selected);
    dialog('Get URL','<p>Connected Domain with Cloudflare? Add it to give this bucket URLs!</p><p>A bucket custom domain can expose other objects in the bucket. Cloudflare allows up to 100 custom domains per bucket. Only already connected, active domains can be used here.</p><form id="url-domain-form"><label>Domain <input id="url-domain" autocomplete="off" spellcheck="false"></label></form><div id="public-urls"></div><p id="url-result" role="status"></p><button id="choose-urls">Use selected domains</button>');
    const list=document.querySelector('#public-urls'), feedback=document.querySelector('#url-result'), button=document.querySelector('#choose-urls');
    function render(){
      const links=entry?objectUrls(source,entry.key,[...chosen]).urls:[...chosen].map(domain=>({domain}));
      list.replaceChildren(...links.map(item=>{
        const row=document.createElement('p');row.textContent=item.url??item.domain;
        if(item.url){const copy=document.createElement('button');copy.textContent='Copy';copy.onclick=()=>void navigator.clipboard.writeText(item.url).then(()=>{feedback.textContent='URL copied.';});row.append(' ',copy);}
        const remove=document.createElement('button');remove.textContent='Remove';remove.onclick=()=>{chosen.delete(item.domain);render();};row.append(' ',remove);return row;
      }));
      button.disabled=!chosen.size;
    }
    document.querySelector('#url-domain-form').onsubmit=async event=>{
      event.preventDefault();const input=document.querySelector('#url-domain'),domain=domainName(input.value.trim());
      if(!domain){feedback.textContent='Enter a domain name.';return;}
      try{await get([domain]);chosen.add(domain);input.value='';feedback.textContent='Connected domain verified by Cloudflare.';render();}
      catch{feedback.textContent='This domain is not an active custom domain on the selected R2 bucket.';}
    };
    button.textContent=entry?'Copy selected URLs':'Continue';
    if(entry){
      const note=document.createElement('p');note.textContent='Domain selections are used for this copy. Per-file URL edits cannot be saved in this build.';button.after(note);
    }
    button.onclick=()=>{if(!entry)return next?.(info,[...chosen]);const links=objectUrls(source,entry.key,[...chosen]).urls.map(item=>item.url);void navigator.clipboard.writeText(links.join('\n')).then(()=>{feedback.textContent='URLs copied.';});};
    render();
  }
  function directoryUrls(source,domains){
    dialog('Get all URLs from directory?','<button id="directory-url-yes">Yes</button> <button id="directory-url-no">No</button>');
    document.querySelector('#directory-url-no').onclick=closeDialog;
    document.querySelector('#directory-url-yes').onclick=()=>{
      dialog('Export directory URLs','<form id="url-export-form">'+['csv','txt','json'].map(type=>`<label><input type="checkbox" name="format" value="${type}" ${type==='json'?'checked':''}> ${type.toUpperCase()}</label>`).join('')+'<button>Export</button><p id="url-export-progress" role="status"></p></form>');
      const form=document.querySelector('#url-export-form'),progress=document.querySelector('#url-export-progress');
      form.onsubmit=async event=>{
        event.preventDefault();
        const formats=new FormData(form).getAll('format'),button=form.querySelector('button');
        if(!formats.length){progress.textContent='Choose at least one format.';return;}
        button.disabled=true;
        try{
          const inventory=await collect(source,undefined,values=>{progress.textContent='Scanned '+format(values.scanned)+' files.';});
          const verified=await api('getPublicUrls',{source,domains},{quiet:true});
          if(!form.isConnected)return;
          const files=inventory.files.filter(item=>eligiblePublicObject(item.key)).map(item=>objectUrls(source,item.key,verified.domains.filter(domain=>domains.includes(domain))));
          for(const format of formats){
            const blob=new Blob([formatUrlExport(source,files,inventory.complete,format)],{type:format==='json'?'application/json':format==='csv'?'text/csv':'text/plain'});
            const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='directory-urls.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),30000);
          }
          progress.textContent=(inventory.complete?'Export ready':'Partial inventory exported')+' · '+files.length+' eligible files.';
        }catch(error){if(form.isConnected)progress.textContent=safeError(error);}
        finally{button.disabled=false;}
      };
    };
  }
  async function tags(source,entry){
    try{
      const info=await metadata(source,entry.key);
      let draft=info.tags;
      dialog('Add Tags','<p>'+esc(entry.displayName??entry.key)+'</p><form id="stage-tags"><label>Tags separated by commas <input id="tag-draft" autocomplete="off"></label></form><div class="tag-pills" id="tag-pills"></div><p id="tag-budget" role="status"></p><button disabled>Save</button><p>Cloud tag writes are unavailable. Existing metadata is preserved.</p>');
      const list=document.querySelector('#tag-pills'),budget=document.querySelector('#tag-budget'),input=document.querySelector('#tag-draft');
      function render(){
        list.replaceChildren(...draft.map((tag,index)=>{
          const pill=document.createElement('button');pill.textContent=tag+' ×';pill.setAttribute('aria-label','Remove '+tag);
          pill.onclick=()=>{draft=draft.filter((_,i)=>i!==index);render();};return pill;
        }));
        const used=info.tagBudget&&info.tagBudget.used+metadataBudget({},draft).used-metadataBudget({},[]).used;
        budget.textContent=used===undefined?'Existing custom metadata is unavailable.':draft.join(', ').length+' characters · '+format(used)+' / 8,092 usable metadata bytes · '+format(Math.max(0,8092-used))+' remaining · 100 bytes reserved'+(used>8092?' · Too much metadata':'');
      }
      document.querySelector('#stage-tags').onsubmit=event=>{event.preventDefault();draft=normalizedTags([...draft,...input.value.split(',')]);input.value='';render();};
      render();input.focus();
    }catch(error){dialog('Add Tags','<p role="alert">'+esc(safeError(error))+'</p>');}
  }
  return Object.freeze({get options(){return options;},mountSettings,mountJobs,download,urls,tags});
}
export async function noteDownload(jobId,files) {
  try{await chrome.runtime.sendMessage({channel:'verified-local-download',jobId,files});}catch{}
}
