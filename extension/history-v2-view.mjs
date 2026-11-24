import {calendarPath,selectHistoryRange} from '../src/history-v2/calendar.mjs';
import {dayKey} from '../src/history/model.mjs';
import {createImageReader,isImage} from '../src/explorer/image-preview.mjs';
import {screenshotDigest} from '../src/cloudflare/screenshot-wire.mjs';
import {wireHistoryDestinationUrls} from './history-destination-urls.mjs';

const fields={showProvider:['Provider','provider'],showOriginalFilename:['Original filename','originalFilename'],
  showSourceUrl:['Source URL','sourceUrl'],showHostUrl:['Host page URL','hostUrl'],showOriginalUrl:['Original asset URL','originalUrl'],
  showRemoteUrl:['Remote URL','remoteUrl'],showPublicUrl:['Public URL','publicUrl'],showPreviewUrl:['Preview URL','previewUrl'],
  showHostTitle:['Page title','hostTitle'],showHostname:['Hostname','hostname'],showFileSize:['Size (bytes)','size'],showFileType:['MIME type','mimeType'],
  showMode:['Save mode','saveMode'],showStatus:['Outcome','status'],showRequestedAt:['Requested','requestedAt'],showStartedAt:['Started','startedAt'],
  showVerifiedAt:['Verified','verifiedAt'],showError:['Error code','errorCode'],showAttempt:['Attempt ID','attemptId'],showRecord:['Record ID','recordId'],
  showAccount:['Account','accountId'],showObject:['Object ID','objectId'], showProof:['Verification','proof']};
export const historyCardPresets=Object.freeze({
  full:Object.freeze({...Object.fromEntries(Object.keys(fields).map(flag=>[flag,true])),showImagePreview:true,showMetadata:true}),
  compact:Object.freeze({...Object.fromEntries(Object.keys(fields).map(flag=>[flag,false])),showImagePreview:true,showMetadata:false})
});
export function historyCardFlags(layout,overrides={}) {
  if(!Object.hasOwn(historyCardPresets,layout))throw Error('HISTORY_CARD_PRESET_INVALID');
  const flags={...historyCardPresets[layout]};
  for(const [key,value] of Object.entries(overrides)) {
    if(!Object.hasOwn(flags,key)||typeof value!=='boolean')throw Error('HISTORY_CARD_FLAG_INVALID');
    flags[key]=value;
  }
  return flags;
}
const outcome={verified:'Saved and verified',uploaded:'Uploaded · independent verification unavailable',failed:'Failed',blocked:'Blocked',canceled:'Canceled',uncertain:'Outcome uncertain'};
const element=(tag,value)=>{
  const node=document.createElement(tag);
  if(value!=null)node.textContent=value;
  return node;
};
const action=(label,run)=>{const button=element('button',label);button.type='button';button.onclick=run;return button;};
const formatTime=(value,timezone)=>value==null?'N/A':new Date(value).toLocaleString(undefined,{timeZone:timezone});
const location=row=>row.destination?.bucket?[row.destination.bucket,row.destination.key??row.destination.prefix].filter(Boolean).join(' / '):'N/A';
const image=row=>row.capabilities.preview&&isImage({key:row.destination?.key??''});

export function mountHistoryV2(parent,{archive,subscribe,preferences,exportHistory,api,goTo,screenshotRequest,retryScreenshot,download,queue=false,cardFlags,viewState={}}) {
  const section=element('section');section.className='card history-v2';
  section.innerHTML=`<header class="history-v2-header"><h2>History V2</h2><button type="button" data-zip>Export Complete History ZIP</button><button type="button" data-export-cancel hidden>Cancel export</button></header><p data-history-message role="status"></p><p data-export-status role="status"></p><div data-history-content></div><form class="history-v2-paging" aria-label="History pages"><button type="button" data-page="first" aria-label="First page">⏮</button><button type="button" data-page="previous" aria-label="Previous page">◀</button><label><span class="queue-sr-only">Page number</span><input name="page" inputmode="numeric" autocomplete="off" size="5"></label><span data-pages></span><button type="button" data-page="next" aria-label="Next page">▶</button><button type="button" data-page="last" aria-label="Last page">⏭</button></form>`;
  parent.append(section);
  const $=selector=>section.querySelector(selector);
  const content=$('[data-history-content]'),message=$('[data-history-message]'),form=$('form'),input=form.elements.page;
  let currentPage=viewState.page??1,pageCount=1,ticket=0,visibleSignature='',visible=[],redrawTimer,previewObserver, exportAbort;
  const opened=viewState.opened??new Map(), reader=createImageReader(p=>api('readFileChunk',p,{quiet:true}),{maxBytes:8*1024*1024,maxEntries:3});
  let viewer=null;
  const groupState=(key,value)=>{if(opened.size>250)opened.delete(opened.keys().next().value);opened.set(key,value);};
  async function locate(row) {
    if(row.outputId)return screenshotRequest('history-output',{operationId:row.attemptId,outputId:row.outputId});
    const result=await api('openRemoteResult',{operationId:row.attemptId},{quiet:true});
    const key=result.key??result.highlightKey??row.destination.key;
    const meta=await api('fileMetadata',{source:result.target,key},{quiet:true});
    if(!meta.data?.object)throw Error(meta.code??'RESULT_NOT_FOUND');
    return {target:result.target,key,object:meta.data.object};
  }
  async function loadImage(row,signal) {
    signal.throwIfAborted();
    const source=await locate(row);
    if(!source.object)throw Error(source.code??'PREVIEW_UNAVAILABLE');
    const value=await reader.load(source.target,{...source.object,key:source.key??source.object.key},{limit:row.outputId?12*1024*1024:8*1024*1024,concurrency:1,signal});
    if(source.checksum&&await screenshotDigest(new Uint8Array(await value.blob.arrayBuffer()))!==source.checksum)throw Error('RESULT_CHANGED');
    signal.throwIfAborted();
    return value;
  }
  function openGallery(initial,returnTo) {
    if(viewer?.open)viewer.close();
    const pictures=visible.filter(image);
    let index=pictures.findIndex(row=>row.recordId===initial.recordId),zoom=1,url,controller;
    if(index<0)return;
    const dialog=element('dialog');dialog.className='history-v2-gallery';viewer=dialog;
    const toolbar=element('div'),title=element('h2'),stage=element('div'),feedback=element('p');
    title.id='history-v2-gallery-title';dialog.setAttribute('aria-labelledby',title.id);feedback.setAttribute('role','status');
    const previous=action('Previous image',()=>move(-1)),next=action('Next image',()=>move(1));
    const zoomButton=action('Zoom in',()=>changeZoom(zoom>=3?1:zoom+.5));
    toolbar.append(previous,next,zoomButton,action('Close',()=>dialog.close()));
    dialog.append(title,toolbar,feedback,stage);section.append(dialog);
    function changeZoom(level){zoom=level;stage.style.setProperty('--history-zoom',String(level));zoomButton.textContent=level>=3?'Reset zoom':'Zoom in';}
    function release(){controller?.abort();if(url){URL.revokeObjectURL(url);url=null;}stage.replaceChildren();}
    async function draw() {
      release();changeZoom(1);
      const row=pictures[index], request=new AbortController();controller=request;
      title.textContent=row.filename??'Image preview';previous.disabled=index===0;next.disabled=index===pictures.length-1;
      feedback.textContent='Loading image…';
      try {
        const {blob}=await loadImage(row,request.signal);
        if(request.signal.aborted)return;
        url=URL.createObjectURL(blob);const img=element('img');img.alt=row.filename??'Saved image';img.src=url;stage.append(img);feedback.textContent='';
      } catch {if(!request.signal.aborted)feedback.textContent='Image unavailable. Check provider access or use GO TO.';}
    }
    function move(step){if(index+step>=0&&index+step<pictures.length){index+=step;void draw();}}
    dialog.onkeydown=event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}};
    dialog.onclose=()=>{release();dialog.remove();if(viewer===dialog)viewer=null;returnTo.focus({preventScroll:true});};
    dialog.showModal();void draw();
  }
  const thumbnailJobs=new Map(), thumbnailUrls=new Map();
  let activeThumbnails=0;
  const thumbnailQueue=new Map();
  function releaseThumbnail(slot) {
    thumbnailQueue.delete(slot);thumbnailJobs.get(slot)?.abort();
    const url=thumbnailUrls.get(slot);
    if(url){URL.revokeObjectURL(url);thumbnailUrls.delete(slot);slot.replaceChildren();}
  }
  function pump() {
    while(activeThumbnails<2&&thumbnailQueue.size) {
      const [slot,row]=thumbnailQueue.entries().next().value;
      thumbnailQueue.delete(slot);
      if(!row||!slot.isConnected||slot.closest('details:not([open])')||thumbnailJobs.has(slot)||thumbnailUrls.has(slot))continue;
      const controller=new AbortController();thumbnailJobs.set(slot,controller);activeThumbnails++;
      slot.textContent='Loading preview…';
      void (async()=>{
        const {blob,width,height}=await loadImage(row,controller.signal);
        const scale=Math.min(1,180/width,160/height);
        const bitmap=await createImageBitmap(blob,{resizeWidth:Math.max(1,Math.round(width*scale)),resizeHeight:Math.max(1,Math.round(height*scale))});
        try {
          controller.signal.throwIfAborted();
          const canvas=element('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
          canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
          const thumbnail=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.8));
          controller.signal.throwIfAborted();
          if(!thumbnail)throw Error('PREVIEW_UNAVAILABLE');
          const url=URL.createObjectURL(thumbnail);thumbnailUrls.set(slot,url);
          const img=element('img');img.src=url;img.alt=row.filename??'Saved image';slot.replaceChildren(img);
        }finally{bitmap.close();}
      })().catch(()=>{if(!controller.signal.aborted)slot.textContent='Preview unavailable. Check access or use GO TO.';}).finally(()=>{
        thumbnailJobs.delete(slot);activeThumbnails--;pump();
      });
    }
  }
  function card(row,pref,page) {
    const flags=historyCardFlags(pref.layout,cardFlags);
    const article=element('article');article.dataset.recordId=row.recordId;article.className='history-v2-record';
    const title=element('strong',row.filename??'N/A'),time=element('time',formatTime(row.terminalAt??row.requestedAt,pref.timezone));
    const summary=element('div');summary.className='history-v2-record-line';summary.append(title,time,element('span',location(row)));
    if(flags.showStatus)summary.append(element('span',outcome[row.status]??row.status));
    article.append(summary);
    const controls=element('div'),feedback=element('p');controls.className='queue-actions';feedback.setAttribute('role','status');
    const run=(label,work)=>{const button=action(label,async()=>{button.disabled=true;try{await work();feedback.textContent='';}catch(error){feedback.textContent=['AUTH_REQUIRED','R2_BUCKET_ACCESS_DENIED','SCOPE_UNAUTHORIZED'].includes(error.code)?'Check access in Remotes.':'Action unavailable. Check access or use GO TO.';}finally{button.disabled=false;}});controls.append(button);};
    if(row.capabilities.open){run('GO TO',()=>goTo(row.attemptId,row.outputId));if(download&&row.status==='verified')run('Download',()=>download(row,()=>locate(row)));}
    if(row.capabilities.retry&&retryScreenshot)run('Check or retry screenshot',()=>{
      if(confirm('Run the existing screenshot recovery for this capture? It checks the recorded destination.'))return retryScreenshot(row.attemptId);
    });
    if(controls.childElementCount)article.append(controls,feedback);
    if(flags.showImagePreview&&image(row)) {
      const preview=element('details'),label=element('summary','Image preview'),slot=element('div');
      preview.open=opened.get(row.recordId)??(pref.previews==='all'||pref.previews==='first'&&page===1);
      slot.className='history-preview';
      const zoom=action('Open image viewer',()=>openGallery(row,zoom));preview.append(label,slot,zoom);article.append(preview);
      preview.ontoggle=()=>{groupState(row.recordId,preview.open);if(!preview.open)releaseThumbnail(slot);else{previewObserver?.unobserve(slot);previewObserver?.observe(slot);}};
      previewSlots.set(slot,row);previewObserver?.observe(slot);
    }
    if(Object.keys(fields).some(flag=>flags[flag])||flags.showMetadata) {
      const details=element('details'),list=element('dl');details.dataset.historyFields='';details.open=opened.get('fields:'+row.recordId)??false;
      details.ontoggle=()=>groupState('fields:'+row.recordId,details.open);details.append(element('summary','Details'));
      for(const [flag,[label,key]] of Object.entries(fields))if(flags[flag]) {
        let value=key==='accountId'?row.destination?.accountId:key==='proof'?row.verification?.level:row[key];
        if(value!=null&&key.endsWith('At'))value=formatTime(value,pref.timezone);
        if(key==='status')value=outcome[value]??value;
        const description=element('dd');
        if(value&&key.endsWith('Url')){
          const a=element('a',value);a.href=value;a.target='_blank';a.rel='noreferrer noopener';description.append(a);
        }else description.textContent=value??'N/A';
        list.append(element('dt',label),description);
      }
      details.append(list);
      if(flags.showMetadata)details.append(element('h3','Saved file metadata'),element('pre',row.savedFileMetadata?JSON.stringify(row.savedFileMetadata,null,2):'N/A'));
      if(row.outputId&&row.destination?.bucket){
        const urls=element('details'),holder=element('div');holder.dataset.destinationUrls='';urls.append(element('summary','Destination URLs'),holder);details.append(urls);
        wireHistoryDestinationUrls(urls,{request:screenshotRequest,params:{operationId:row.attemptId,outputId:row.outputId},
          location:{bucketName:row.destination.bucket},confirmed:row.status==='verified'});
      }
      article.append(details);
    }
    return article;
  }
  const previewSlots=new Map();
  function stopPreviews() {
    previewObserver?.disconnect();for(const slot of previewSlots.keys())releaseThumbnail(slot);previewSlots.clear();
    reader.clear();
  }
  function render(items,pref,page,now) {
    const focus=document.activeElement, previous=focus?.closest('[data-record-id]'), focusId=previous?.dataset.recordId;
    const controls=previous?[...previous.querySelectorAll('button,summary,a')]:[];
    const index=controls.indexOf(focus),groups=new Map(),fragment=document.createDocumentFragment();
    stopPreviews();
    previewObserver=new IntersectionObserver(entries=>{
      for(const entry of entries) {
        if(entry.isIntersecting)thumbnailQueue.set(entry.target,previewSlots.get(entry.target));else releaseThumbnail(entry.target);
      }
      pump();
    });
    for(const row of items) {
      let container=fragment;
      for(const group of calendarPath(row.terminalAt??row.requestedAt,pref.timezone,now)) {
        if(!groups.has(group.id)){
          const details=element('details');details.className='history-v2-group';details.open=opened.get(group.id)??true;
          details.append(element('summary',group.name));details.ontoggle=()=>groupState(group.id,details.open);container.append(details);groups.set(group.id,details);
        }
        container=groups.get(group.id);
      }
      container.append(card(row,pref,page));
    }
    if(!items.length)fragment.append(element('p','No saves in this view.'));
    content.replaceChildren(fragment);
    const restored=focusId&&[...content.querySelectorAll('[data-record-id]')].find(node=>node.dataset.recordId===focusId);
    if(index>=0)(restored?.querySelectorAll('button,summary,a')[index]??input).focus({preventScroll:true});
  }
  async function refresh(request=currentPage) {
    const id=++ticket;
    try {
      const pref=preferences(),now=Date.now(),range=selectHistoryRange({...pref,now});
      const page=await archive.page({...range,page:request,queue});
      if(id!==ticket||!section.isConnected)return;
      currentPage=page.page;pageCount=page.pages;visible=page.items;
      if(document.activeElement!==input||request!==currentPage)input.value=String(currentPage);
      input.removeAttribute('aria-invalid');
      $('[data-pages]').textContent='/ '+pageCount;
      message.textContent=`${page.count.toLocaleString()} ${page.count===1?'save':'saves'} in this view`;
      for(const key of ['first','previous','next','last'])$(`[data-page="${key}"]`).disabled=['first','previous'].includes(key)?currentPage===1:currentPage===pageCount;
      const signature=JSON.stringify([pref,dayKey(now,pref.timezone),page.page,page.items.map(item=>[item.recordId,item.observedAt,item.status])]);
      if(signature!==visibleSignature){visibleSignature=signature;render(page.items,pref,page.page,now);}
    } catch(error) {if(id===ticket)message.textContent=error.message==='HISTORY_V2_CLEAR_IN_PROGRESS'?'Clearing History V2…':'History V2 is temporarily unavailable.';}
  }
  form.onsubmit=event=>{
    event.preventDefault();const raw=input.value.trim(),page=Number(raw);
    if(!/^\d+$/.test(raw)||!Number.isSafeInteger(page)||page<1||page>pageCount){input.setAttribute('aria-invalid','true');message.textContent=`Enter a page from 1 to ${pageCount}.`;return;}
    void refresh(page);
  };
  for(const [key,select] of Object.entries({first:()=>1,previous:()=>currentPage-1,next:()=>currentPage+1,last:()=>pageCount}))$(`[data-page="${key}"]`).onclick=()=>void refresh(select());
  const zip=$('[data-zip]'),abort=$('[data-export-cancel]'),exportStatus=$('[data-export-status]');
  zip.onclick=async()=>{
    const controller=new AbortController();exportAbort=controller;zip.disabled=true;abort.hidden=false;
    exportStatus.textContent='Preparing complete History ZIP…';
    try{const result=await exportHistory({signal:controller.signal,onProgress:(count,total)=>{exportStatus.textContent=`Exporting ${count.toLocaleString()} of ${total.toLocaleString()} records…`;}});exportStatus.textContent=`History ZIP downloaded · ${result.writtenRecords.toLocaleString()} records.`;}
    catch(error){exportStatus.textContent=controller.signal.aborted?'Export cancelled.':error.message==='HISTORY_ZIP_SIZE_LIMIT'?'The ZIP exceeds the supported archive size. Use a smaller date range.':'History ZIP could not be downloaded. Check browser storage and download permissions.';}
    finally{exportAbort=null;zip.disabled=false;abort.hidden=true;}
  };
  abort.onclick=()=>exportAbort?.abort();
  const unsubscribe=subscribe(update=>{
    if(update==='jobs')return;
    if(update==='history'||update==='source'){message.textContent='Some retained History may still be synchronizing.';return;}
    if(!redrawTimer)redrawTimer=setTimeout(()=>{redrawTimer=null;void refresh();},150);
  });
  input.value=String(currentPage);void refresh();
  return ()=>{viewState.page=currentPage;viewState.opened=opened;ticket++;clearTimeout(redrawTimer);unsubscribe();exportAbort?.abort();if(viewer?.open)viewer.close();stopPreviews();section.remove();};
}
