import {exportDefaults, exportOptions, exportPreferenceKey} from '../src/explorer/export-preferences.mjs';
import {readPreviewBytes} from '../src/explorer/image-preview.mjs';
import {assertExportIdentity,developmentalDomain,directoryUrlFiles,domainName,formatUrlExport,listExportInventory,metadataBudget,normalizedTags,objectUrls,simpleDirectoryUrls} from '../src/explorer/object-exports.mjs';
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
  function collect(source,signal,onProgress,immediate=false){return listExportInventory((source,cursor)=>
    api('listDirectoryObjects',{source,...(cursor?{cursor}:{}),...(immediate?{immediate:true}:{})},{quiet:true,signal}),source,{signal,onProgress});}
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
      const get=domains=>api('getPublicUrls',{source,...(entry?{key:entry.key}:{}),...(domains?{domains}:{})},{quiet:true});
      const info=await get();
      const open=()=>entry ? urlEditor(info,get) : directoryUrls(source,info,get);
      if(info.domains.length){open();return;}
      dialog('Allow Public URL?','<button id="public-url-yes">Yes</button> <button id="public-url-no">No</button>');
      document.querySelector('#public-url-no').onclick=closeDialog;
      document.querySelector('#public-url-yes').onclick=open;
    }catch(error){dialog('Get URL','<p role="alert">Could not check this bucket’s public domains. '+esc(safeError(error))+'</p>');}
  }
  function domainControls(form,get,apply,feedback){
    const input=form.querySelector('input'),submit=form.querySelector('[type=submit]'),recheck=form.querySelector('[data-recheck]');
    async function verify(requireName){
      const typed=input.value.trim(),name=domainName(typed);
      if(requireName&&!name){feedback.textContent='Enter a domain name.';input.focus();return;}
      submit.disabled=recheck.disabled=true;
      try{
        const info=await get();
        if(!form.closest('dialog[open]'))return;
        apply(info);
        feedback.textContent=typed
          ? info.domains.includes(name)&&!developmentalDomain(name)
            ? 'Cloudflare verified the active custom domain for this bucket.'
            : 'Activate this domain under the bucket’s Custom Domains in Cloudflare, then Recheck.'
          : info.domainCheckComplete===false?'Some endpoints could not be checked. Try Recheck again.':'Domain check updated.';
      }catch{feedback.textContent='Could not check the bucket’s domains. Check your Cloudflare connection and Recheck.';}
      finally{submit.disabled=recheck.disabled=false;}
    }
    form.onsubmit=event=>{event.preventDefault();void verify(true);};
    recheck.onclick=()=>void verify(false);
  }
  function urlEditor(info,get){
    dialog('Get URL',`<form id="url-domain-form"><label for="url-domain">Custom domain</label><div class="url-domain-row"><input id="url-domain" autocomplete="off" spellcheck="false" placeholder="assets.example.com"><button type="submit">Submit</button><button type="button" id="copy-urls">Copy All</button></div><div id="public-urls" class="public-url-cards" aria-label="Verified URLs"></div><p id="url-empty"></p><button type="button" data-recheck>Recheck</button><p class="muted">Manage bucket domains in Cloudflare. Anonymous reachability has not been checked.</p><p id="url-result" role="status"></p></form>`);
    const form=document.querySelector('#url-domain-form'),list=form.querySelector('#public-urls'),
      feedback=form.querySelector('#url-result'),empty=form.querySelector('#url-empty'),copyAll=form.querySelector('#copy-urls');
    async function copy(text,success){
      try{await navigator.clipboard.writeText(text);feedback.textContent=success;}
      catch{feedback.textContent='Could not copy. Check Chrome’s clipboard access and try again.';}
    }
    function render(value){
      const links=value.file?.urls??[];
      list.replaceChildren(...links.map(item=>{
        const button=document.createElement('button'),label=document.createElement('strong'),address=document.createElement('span');
        button.type='button';button.className='public-url-card';
        const dev=developmentalDomain(item.domain);
        if(dev)button.classList.add('development-url');
        label.textContent=dev?'Development URL':'Custom domain';
        address.textContent=item.url;
        button.append(label,address);
        button.onclick=()=>void copy(item.url,'URL copied.');
        return button;
      }));
      list.hidden=!links.length;
      empty.hidden=links.length>0&&value.domainCheckComplete!==false;
      empty.textContent=value.domainCheckComplete===false?'Some endpoints could not be checked.':links.length?'':'No verified public URL for this object. To add one, configure the bucket’s public domain in Cloudflare and Recheck.';
      copyAll.disabled=!links.length;
      copyAll.onclick=()=>void copy([...new Set(links.map(item=>item.url))].join('\n'),'All URLs copied.');
    }
    domainControls(form,get,render,feedback);
    render(info);
  }
  function directoryUrls(source,info,get){
    dialog('Export directory URLs',`<p class="muted">Current directory only · No subfolders</p><form id="url-export-form">
      <fieldset><legend>Export mode</legend><label><input type="radio" name="mode" value="simple" checked> One Link per Asset — Simple Text File</label>
      <label><input type="radio" name="mode" value="all"> Get All URLs for Directory</label></fieldset>
      <fieldset><legend>File types</legend><div class="url-export-options">${['Images','Audio','Video','All files'].map((label,index)=>`<label><input type="checkbox" name="type" value="${index===3?'all':label.toLowerCase()}" ${index===3?'checked':''}> ${label}</label>`).join('')}</div></fieldset>
      <label id="prefer-public"><input type="checkbox" name="prefer" checked> Use non-developmental URLs where possible</label>
      <fieldset id="url-export-formats" hidden><legend>Formats</legend><div class="url-export-options">${['txt','csv','json'].map(type=>`<label><input type="checkbox" name="format" value="${type}" ${type==='json'?'checked':''}> ${type.toUpperCase()}</label>`).join('')}</div></fieldset>
      <p id="url-export-scope" class="muted"></p><button type="submit" class="primary">Export</button><p id="url-export-progress" role="status"></p></form>
      <form id="directory-domain-form"><p id="directory-domain-prompt"></p><label for="directory-domain">Website/domain</label>
      <div class="url-domain-row"><input id="directory-domain" autocomplete="off" spellcheck="false" placeholder="assets.example.com"><button type="submit">Save</button><button type="button" data-recheck>Recheck</button></div>
      <p class="muted">Configure custom domains in the bucket’s Cloudflare settings. This dialog checks the association. Anonymous reachability has not been checked.</p><p id="directory-domain-result" role="status"></p></form>`);
    const form=document.querySelector('#url-export-form'),progress=form.querySelector('#url-export-progress'),button=form.querySelector('button');
    const domainForm=document.querySelector('#directory-domain-form'),prompt=domainForm.querySelector('#directory-domain-prompt');
    const types=[...form.querySelectorAll('[name=type]')];
    let running=false;
    const choices=()=>{
      const data=new FormData(form);
      return {simple:data.get('mode')==='simple',prefer:data.has('prefer'),types:new Set(data.getAll('type')),formats:data.getAll('format')};
    };
    function sync(){
      const {simple,prefer,types,formats}=choices(),custom=info.domains.some(domain=>!developmentalDomain(domain));
      const onlyDev=info.domains.length>0&&!custom;
      form.querySelector('#prefer-public').hidden=!simple;
      form.querySelector('#url-export-formats').hidden=simple;
      domainForm.hidden=custom&&info.domainCheckComplete!==false;
      prompt.textContent=info.domainCheckComplete===false?'Some public endpoints could not be checked. Recheck the bucket.'
        :onlyDev?'Only developmental URLs exist. Add domain?':'No public URLs available for this bucket. Add domain?';
      form.querySelector('#url-export-scope').textContent=!types.size?'Select at least one file type.'
        :simple&&onlyDev?prefer?'Uncheck “Use non-developmental URLs where possible” to export developmental URLs now.':'Exports Development URLs.'
        :!simple&&!formats.length?'Choose at least one format.':'';
      button.disabled=running||!types.size||!info.domains.length||(simple?prefer&&!custom:!formats.length);
    }
    form.onchange=event=>{
      const input=event.target;
      if(input.name==='type'&&input.checked){
        for(const type of types)if(type!==input&&(input.value==='all'||type.value==='all'))type.checked=false;
      }
      progress.textContent='';sync();
    };
    domainControls(domainForm,get,value=>{info=value;sync();},domainForm.querySelector('#directory-domain-result'));
    form.onsubmit=async event=>{
      event.preventDefault();
      if(button.disabled)return;
      const {simple,prefer,types,formats}=choices();
      running=true;sync();
      try{
        const inventory=await collect(source,undefined,values=>{progress.textContent='Scanned '+format(values.scanned)+' objects.';},true);
        info=await get();
        if(!form.closest('dialog[open]'))return;
        const files=directoryUrlFiles(source,inventory.files,types).map(item=>objectUrls(source,item.key,info.domains));
        const data=simple?simpleDirectoryUrls(files,prefer):null;
        const urlCount=data?.count??files.reduce((sum,file)=>sum+file.urlCount,0);
        const missing=data?.missing??files.filter(file=>!file.urlCount).length;
        const development=data?.developmental??files.reduce((sum,file)=>sum+file.urls.filter(item=>developmentalDomain(item.domain)).length,0);
        const counts=` · ${inventory.files.length} scanned · ${files.length} files · ${urlCount} links · ${missing} files without exported URLs · ${urlCount-development} custom · ${development} developmental`;
        if(!inventory.complete){progress.textContent='Partial inventory. Export paused; retry to finish scanning.'+counts;return;}
        if(!urlCount){progress.textContent='No URLs exported'+counts;return;}
        for(const type of simple?['txt']:formats){
          const body=simple?data.text:formatUrlExport(source,files,info.domainCheckComplete!==false,type);
          const blob=new Blob([body],{type:type==='json'?'application/json':type==='csv'?'text/csv':'text/plain;charset=utf-8'});
          const href=URL.createObjectURL(blob),link=document.createElement('a');
          link.href=href;link.download=simple?'directory-urls-simple.txt':'directory-urls.'+type;
          link.click();setTimeout(()=>URL.revokeObjectURL(href),30000);
        }
        progress.textContent=(info.domainCheckComplete===false||missing?'Partial URL export':'Export complete')+counts;
      }catch(error){if(form.isConnected)progress.textContent='Export unavailable · '+safeError(error);}
      finally{running=false;sync();}
    };
    sync();
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
