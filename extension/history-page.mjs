import {screenshotMessage} from './screenshot-page.mjs';
import {mountLoadingVisual} from '../src/explorer/loading-visual.mjs';
import {customerRows,historyPage,historyGroups,historyDefaults,exportHistory} from '../src/history/model.mjs';
import {isImage,createImageReader} from '../src/explorer/image-preview.mjs';
import {screenshotDigest} from '../src/cloudflare/screenshot-wire.mjs';
import {wireHistoryDestinationUrls} from './history-destination-urls.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,label)=>url?`<p>${esc(label)}: <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a></p>`:`<p>${esc(label)}: Not captured</p>`;
const screenshotFile=receipt=>receipt.outputs.find(output=>output.state==='confirmed'&&output.outputId&&output.destination&&output.key);
const screenshotName=receipt=>(screenshotFile(receipt)??receipt.outputs.find(output=>output.key))?.key.split('/').at(-1)??'Screenshot';
const previewLimit=4*1024*1024,screenshotPreviewLimit=12*1024*1024;
export function createHistoryPage({api,goTo,screenshotRequest,retryScreenshot,loadingSelection=async()=>({mode:'math'})}){
 let epoch=0,controller,observer,urls=[],page=1,prefs={...historyDefaults},rows=[],manual=new Map(),pending=new Map(),active=0,wake=()=>{};
 const reader=createImageReader(p=>api('readFileChunk',p,{quiet:true}),{maxBytes:8*1024*1024,maxEntries:8});
 function stop(){epoch++;wake=()=>{};for(const job of pending.values())job.abort();pending.clear();controller?.abort();observer?.disconnect();urls.forEach(URL.revokeObjectURL);urls=[];}
 async function* pages(){let cursor;const seen=new Set();do{const result=await api('inspectRemoteHistory',{customer:true,limit:100,...(cursor?{cursor}:{})},{quiet:true}),p=Array.isArray(result)?{items:result}:result;yield p.items;cursor=p.nextCursor;if(cursor&&seen.has(cursor))throw Error('HISTORY_CURSOR_STALLED');seen.add(cursor);}while(cursor);}
 async function load(){stop();const ticket=epoch;const preferences=await api('getHistoryPreferences',{}, {quiet:true}),all=[];for await(const p of pages()){all.push(...customerRows(p));await new Promise(r=>setTimeout(r,0));if(ticket!==epoch)return;}prefs=preferences;rows=all;if(ticket===epoch)render();}
 const expanded=id=>manual.has(id)?manual.get(id):prefs.previews==='all'||prefs.previews==='first'&&page===1;
 function destinationCard(output){
  const {destination,key,outputId}=output;
  const verified=output.state==='confirmed';
  const name=destination?.bucketName??'Destination unavailable';
  return `<section class="screenshot-destination" data-output-id="${esc(outputId)}"><div class="screenshot-destination-line">
   <div><strong>${esc(name)} / ${esc(key??destination?.prefix??'')}</strong><small>${esc(destination?.accountId??'Account unavailable')}</small></div>
   <button data-screenshot-goto aria-label="GO TO — ${esc(name+'/'+(key??destination?.prefix??''))}" ${outputId&&destination?'':'disabled'}>GO TO</button></div>
   <p>${esc(verified?`${output.verification==='direct-r2-get-sha256'?'Verified · R2 GET · SHA-256':'Verified · R2 checksum'} · ${output.bytes} bytes`:screenshotMessage(output.code,output.code??'Awaiting verification'))}</p>
   <p class="history-action" role="status"></p><details data-output-urls><summary>URLs</summary><div data-destination-urls></div></details></section>`;
 }
 function screenshotRow(r){
  const receipt=r.screenshot,confirmed=receipt.outputs.filter(output=>output.state==='confirmed').length;
  const expired=receipt.originalUnavailable||receipt.retryExpiresAt&&Date.parse(receipt.retryExpiresAt)<=Date.now();
  const unresolved=receipt.outputs.some(output=>output.state!=='confirmed'&&output.recoverable!==false);
  return `<article class="history-row history-screenshot" aria-label="Screenshot ${esc(screenshotName(receipt))}" tabindex="0" data-operation="${esc(r.operationId)}"><div class="history-line">
   <span class="history-dot ${r.status}" aria-hidden="true"></span><span class="history-status">${esc(r.statusLabel)}</span>
   <strong>${esc(screenshotName(receipt))}</strong><time datetime="${esc(r.timestamp)}">${esc(r.timestamp?new Date(r.timestamp).toLocaleString(undefined,{timeZone:prefs.timezone}):'Date not captured')}</time></div>
   <details data-history-more="${esc(r.operationId)}" ${expanded(r.operationId)?'open':''}><summary>Screenshot preview</summary>
    ${screenshotFile(receipt)?'<div class="history-preview" data-preview="'+esc(r.operationId)+'"><p>Image preview loads when visible.</p></div>':'<p>Screenshot preview unavailable.</p>'}</details>
   ${receipt.outputs.map(destinationCard).join('')}
   <details><summary>${receipt.outputs.length?`${confirmed} of ${receipt.outputs.length} files verified`:'Capture details'}</summary>
   <p>Capture ID ${esc(receipt.captureId)}</p>${r.hostPageURL?link(r.hostPageURL,'Page'):''}
   ${receipt.code?`<p>${esc(screenshotMessage(receipt.code,receipt.code))}</p>`:''}
   ${expired&&confirmed<receipt.outputs.length?'<p>The original PNG is unavailable for upload retry.</p>':''}
   ${receipt.captured&&unresolved&&retryScreenshot?
    `<button data-screenshot-retry="${esc(r.operationId)}">${expired?'Check unconfirmed files in R2':'Retry unconfirmed files'}</button>`:''}<p class="history-action" role="status"></p></details></article>`;
 }
 function row(r){if(r.screenshot)return screenshotRow(r);const image=r.canGoTo&&isImage({key:r.objectKey}),open=image&&expanded(r.operationId)||manual.get(r.operationId)===true;
 const metadata=r.savedFileMetadata;let parsed;try{parsed=JSON.parse(metadata?.customMetadata?.click2cloud);}catch{}
 return `<article class="history-row" data-operation="${esc(r.operationId)}"><div class="history-line"><span class="history-dot ${r.status}" aria-hidden="true"></span><span class="history-status">${esc(r.statusLabel)}</span><strong>${esc(r.filename??'Filename not captured')}</strong>${r.canGoTo?`<button data-history-goto="${esc(r.operationId)}">GO TO</button>`:''}<time datetime="${esc(r.timestamp)}">${esc(r.timestamp?new Date(r.timestamp).toLocaleString(undefined,{timeZone:prefs.timezone}):'Date not captured')}</time></div><p class="history-action" role="status"></p><details data-history-more="${esc(r.operationId)}" ${open?'open':''}><summary>More</summary>${image?'<div class="history-preview" data-preview="'+esc(r.operationId)+'"><p>Image preview loads when visible.</p></div>':''}<details><summary>Source &amp; links</summary><p>${esc(r.hostPageTitle??r.hostname??'Page name not captured')}</p>${link(r.hostPageURL,'Host page URL')}${link(r.sourceURL,'Original source URL')}<p>Public object URL: ${esc(r.availability.publicObjectURLs)}</p><p>Destination: ${esc(r.bucket??'Not captured')} / ${esc(r.objectKey??r.prefix??'Not captured')}</p></details><details><summary>Metadata</summary><p>${esc(r.metadataAvailability)}${r.metadataRedacted?' · sensitive fields redacted':''}</p>${metadata?'<pre>'+esc(JSON.stringify(metadata,null,2))+'</pre>'+(parsed?'<p>Parsed click2cloud provenance</p><pre>'+esc(JSON.stringify(parsed,null,2))+'</pre>':''):''}</details></details></article>`;
 }
 function render(){stop();controller=new AbortController();const ticket=epoch,result=historyPage(rows,{page,range:prefs.range,timezone:prefs.timezone});page=result.page;
 const groups=historyGroups(result.items,prefs.timezone);let yi=0;let content='';for(const [year,weeks] of groups){let wi=0;content+=`<details class="history-year" ${yi++===0?'open':''}><summary>${year}</summary>`;for(const [week,days] of weeks){let di=0;content+=`<details class="history-week" ${wi++===0?'open':''}><summary>${week}</summary>`;for(const [day,items] of days){content+=`<details class="history-day" ${di++===0?'open':''}><summary>${day}</summary>${items.map(row).join('')}</details>`;}content+='</details>';}content+='</details>';}
 document.querySelector('#main').innerHTML=`<section class="page history-page"><h1>History</h1><p>Saved files and attempted saves · ${result.total} operations · ${esc(prefs.timezone)}</p><p>History is kept forever. Change display and image preferences or export all records in Settings → History.</p>${content||'<p>No saves in this display range.</p>'}<nav aria-label="History pages"><button id="history-prev" ${page===1?'disabled':''}>Previous</button><span>Page ${page} of ${result.pages}</span><button id="history-next" ${page===result.pages?'disabled':''}>Next</button></nav></section>`;
 document.querySelector('#history-prev').onclick=()=>{page--;render();};document.querySelector('#history-next').onclick=()=>{page++;render();};
 const goToError=error=>({RESULT_NOT_FOUND:'This file no longer exists.',RESULT_CHANGED:'The file at this key has changed.',RESULT_LOOKUP_FAILED:'This file is unavailable. Reconnect or check access in Remotes.',AUTH_REQUIRED:'Reconnect in Remotes to locate this file.',SCOPE_UNAUTHORIZED:'This account is not currently authorized.'})[error.code??error.message]??screenshotMessage(error.code,'Could not open this location. Check access and try again.');
 const goToButton=(button,params,feedback)=>{button.onclick=async()=>{
  button.disabled=true;feedback.textContent='Locating the saved destination…';
  try{await goTo(...params);if(feedback.isConnected)feedback.textContent='';}
  catch(error){if(feedback.isConnected)feedback.textContent=goToError(error);}
  finally{button.disabled=false;}
 };};
 document.querySelectorAll('[data-history-goto]').forEach(button=>goToButton(button,[button.dataset.historyGoto],button.closest('article').querySelector('.history-action')));
 for(const item of document.querySelectorAll('.history-screenshot')){
  const operationId=item.dataset.operation,receipt=rows.find(row=>row.operationId===operationId)?.screenshot;
  for(const [index,card] of [...item.querySelectorAll('[data-output-id]')].entries()){
   const output=receipt?.outputs[index],outputId=card.dataset.outputId;
   if(!output||!outputId)continue;
   goToButton(card.querySelector('[data-screenshot-goto]'),[operationId,outputId],card.querySelector('.history-action'));
   wireHistoryDestinationUrls(card.querySelector('[data-output-urls]'),{request:screenshotRequest,
    params:{operationId,outputId},location:output.destination,confirmed:output.state==='confirmed'&&!!output.destination});
  }
 }
 document.querySelectorAll('[data-screenshot-retry]').forEach(button=>button.onclick=async()=>{
  const feedback=button.closest('details').querySelector('[role=status]');
  button.disabled=true;feedback.textContent='Checking unconfirmed files…';
  try{await retryScreenshot(button.dataset.screenshotRetry);if(button.isConnected)await load();}
  catch(error){feedback.textContent=screenshotMessage(error.code,'Could not retry this capture.');button.disabled=false;}
 });
 const queue=[],queued=new Set();
 const eligible=el=>el.isConnected&&!el.closest('details:not([open])');
 const pump=()=>{while(active<2&&queue.length){const el=queue.shift();if(!eligible(el)){queued.delete(el);continue;}if(pending.has(el)||el.querySelector('img'))continue;active++;void preview(el,ticket,()=>{queued.delete(el);observer.unobserve(el);observer.observe(el);}).finally(()=>{active--;wake();});}};
 wake=pump;
 observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting&&eligible(e.target)&&!queued.has(e.target)){queued.add(e.target);queue.push(e.target);}else if(!e.isIntersecting&&pending.has(e.target)){pending.get(e.target).abort();queued.delete(e.target);}pump();},{rootMargin:'50px'});
 document.querySelectorAll('[data-preview]').forEach(el=>observer.observe(el));
 document.querySelectorAll('.history-page details').forEach(d=>d.addEventListener('toggle',()=>{if(d.dataset.historyMore)manual.set(d.dataset.historyMore,d.open);if(d.open)for(const el of d.querySelectorAll('[data-preview]')){if(!queued.has(el)){observer.unobserve(el);observer.observe(el);}}else for(const el of d.querySelectorAll('[data-preview]')){pending.get(el)?.abort();if(el.querySelector('img'))continue;queued.delete(el);}}));
 }
 async function preview(el,ticket,retry){
 const r=rows.find(r=>r.operationId===el.dataset.preview);if(!r)return;
 const job=new AbortController(),parent=controller.signal;let destroy=()=>{},bitmap;
 const clearVisual=()=>{destroy();destroy=()=>{};if(pending.get(el)===job)delete el.dataset.loading;};
 const abort=()=>{job.abort();clearVisual();};parent.addEventListener('abort',abort,{once:true});job.signal.addEventListener('abort',clearVisual,{once:true});pending.set(el,job);
 const current=()=>ticket===epoch&&el.isConnected&&!job.signal.aborted;
 el.replaceChildren(Object.assign(document.createElement('p'),{textContent:'Loading image…'}));el.dataset.loading='true';
 destroy=mountLoadingVisual(el);
 // Preference IO is independent of the authenticated byte reader. A late
 // preference must never remount over a completed/cancelled preview.
 void loadingSelection().then(selection=>{if(current()&&el.dataset.loading){destroy();destroy=mountLoadingVisual(el,selection);}}).catch(()=>{});
 try{
  const output=r.screenshot&&screenshotFile(r.screenshot);
  const located=output?await screenshotRequest('history-output',{operationId:r.operationId,outputId:output.outputId}):await api('openRemoteResult',{operationId:r.operationId},{quiet:true});
  if(!current())return;
  const key=located.key??r.objectKey,limit=output?screenshotPreviewLimit:previewLimit;
  const object=output?located.object:(await api('fileMetadata',{source:located.target,key},{quiet:true})).data?.object;
  if(!current())return;
  if(!object)throw Error('RESULT_NOT_FOUND');
  if(object.size>limit){clearVisual();el.textContent=`Image is larger than the ${limit/1024/1024} MiB preview limit. Use File Explorer to view it.`;return;}
  const value=await reader.load(located.target,{...object,key},{limit,concurrency:1,signal:job.signal});if(!current())return;
  if(output&&located.checksum&&await screenshotDigest(new Uint8Array(await value.blob.arrayBuffer()))!==located.checksum)throw Error('RESULT_CHANGED');
  if(!current())return;
  bitmap=await createImageBitmap(value.blob);if(!current())return;
  const canvas=document.createElement('canvas'),scale=Math.min(1,240/bitmap.width,180/bitmap.height);canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();bitmap=null;
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.75));if(!current())return;if(!blob)throw Error('IMAGE_DECODE_FAILED');
  const url=URL.createObjectURL(blob);urls.push(url);const img=new Image();img.alt=output?screenshotName(r.screenshot):r.filename;img.src=url;clearVisual();el.replaceChildren(img);
 }catch{if(current()){clearVisual();el.textContent=outputUnavailable(r);}}
 finally{bitmap?.close();clearVisual();parent.removeEventListener('abort',abort);if(pending.get(el)===job)pending.delete(el);if(job.signal.aborted&&ticket===epoch&&el.isConnected)retry();}
 }
 function outputUnavailable(row){return row.screenshot?'Screenshot preview unavailable. Check access or open the recorded destination.':'Image preview unavailable. The saved result is retained.';}
 async function settings(container){const p=await api('getHistoryPreferences',{}, {quiet:true});container.innerHTML=`<h2>History</h2><p>Keep all records forever. Display filters never delete saved history.</p><label>History display range <select id="history-range"><option value="all">All Time</option><option value="daily">Today / Daily</option><option value="weekly">This Week / Weekly</option></select></label><label>Image preview auto-expansion <select id="history-previews"><option value="all">Expand all images</option><option value="first">Only first page</option><option value="closed">Close all</option></select></label><label>Display / export timezone <input id="history-timezone" value="${esc(p.timezone)}"></label><button id="history-save-prefs">Save History preferences</button><h3>Export History</h3><label>Export range <select id="history-export-range"><option value="all">All Time / Since the beginning</option><option value="weekly">Weekly</option><option value="daily">Daily</option><option value="custom">Custom Date Range</option></select></label><label>Start date <input id="history-start" type="date"></label><label>End date <input id="history-end" type="date"></label><label>Format <select id="history-format"><option value="json">JSON</option><option value="csv">CSV</option><option value="jsonl">JSONL</option></select></label><label><input id="history-privacy" type="checkbox"> Omit browsing page title and source URLs</label><p>Exports may contain browsing provenance. Review before sharing.</p><button id="history-export">Export History</button><p id="history-settings-status" role="status"></p>`;
 const $=s=>container.querySelector(s);$('#history-range').value=p.range;$('#history-previews').value=p.previews;
 $('#history-save-prefs').onclick=async()=>{try{prefs=await api('setHistoryPreferences',{range:$('#history-range').value,previews:$('#history-previews').value,timezone:$('#history-timezone').value},{quiet:true});$('#history-settings-status').textContent='History preferences saved.';}catch{$('#history-settings-status').textContent='Preferences could not be saved. Check the timezone.';}};
 $('#history-export').onclick=async()=>{let writer;const b=$('#history-export');b.disabled=true;$('#history-settings-status').textContent='Exporting History…';try{const format=$('#history-format').value,options={format,range:$('#history-export-range').value,start:$('#history-start').value,end:$('#history-end').value,timezone:$('#history-timezone').value,privacy:$('#history-privacy').checked,now:Date.now()};const chunks=exportHistory(pages(),options);const first=await chunks.next();const name='click2cloud-history.'+format;
 if(window.showSaveFilePicker){const handle=await window.showSaveFilePicker({suggestedName:name});writer=await handle.createWritable();if(!first.done)await writer.write(first.value);for await(const part of chunks)await writer.write(part);await writer.close();}
 else {const parts=[first.value];let bytes=first.value?.length??0;for await(const part of chunks){bytes+=part.length;if(bytes>16*1024*1024)throw Error('EXPORT_STREAM_REQUIRED');parts.push(part);}const url=URL.createObjectURL(new Blob(parts,{type:format==='json'?'application/json':format==='csv'?'text/csv':'application/x-ndjson'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('#history-settings-status').textContent='History exported. All matching operations included.';
 }catch(e){try{await writer?.abort();}catch{}$('#history-settings-status').textContent=e.message==='HISTORY_DATE_RANGE_INVALID'?'Choose valid inclusive dates, start before end.':e.message==='EXPORT_STREAM_REQUIRED'?'Use a browser supporting streaming file save for this large export.':'Export cancelled or unavailable. History was kept.';}finally{b.disabled=false;}};
 }
 return {load,stop,settings};
}
