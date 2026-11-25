import {hashBlob,incrementalSHA256} from '../src/recorder/archive-stream.mjs';
import {createImageReader,isImage,readPreviewBytes} from '../src/explorer/image-preview.mjs';
import {withHistoryDownload} from '../src/queue/zip.mjs';
import {safeHistoryURL} from '../src/history/model.mjs';
import {wireHistoryDestinationUrls} from './history-destination-urls.mjs';
import {wireImmersiveView} from './immersive-view.mjs';
import {basicImageMime,loadBasicHistoryImage} from './basic-history-preview.mjs';
import {createScreenshotRetryCache} from '../src/screenshot/retry-cache.mjs';
import {hasHistoryV2Value,historyV2FieldLabels,historyV2FieldVisible,historyV2Providers,normalizeHistoryV2View} from './history-v2-preferences.mjs';

export const historyPreset = Object.freeze({
  full:Object.freeze({showSourceUrl:true,showHostUrl:true,showRemoteUrl:true,showFileSize:true,showVerification:true,showAdvancedDetails:true}),
  compact:Object.freeze({showSourceUrl:false,showHostUrl:false,showRemoteUrl:false,showFileSize:false,showVerification:false,showAdvancedDetails:false})
});
export const providerName = value => Object.hasOwn(historyV2Providers,value) ? historyV2Providers[value] : 'N/A';
export const queueStatus = value => ({
  working:'Working',waiting:'Pending',uploading:'Uploading',verifying:'Verifying',verified:'Verified',cancelling:'Cancelling',
  uploaded:'Uploaded · verification unavailable',failed:'Failed',blocked:'Blocked',uncertain:'Outcome uncertain',
  'needs-login':'Needs login',cancelled:'Cancelled'
})[value] ?? 'N/A';
const savedLocation = destination => [
  destination?.bucket, destination?.key ?? destination?.path ?? destination?.folder
].filter(Boolean).join(' / ');
export const historyLocation = destination => savedLocation(destination) || 'N/A';

const node = (tag,text,className) => {
  const value = document.createElement(tag);
  if (text != null) value.textContent = text;
  if (className) value.className = className;
  return value;
};
function action(label, run) {
  const button = node('button',label);
  button.type = 'button';
  button.onclick = run;
  return button;
}
const date = (at,timezone) => Number.isFinite(at) ? new Date(at).toLocaleString(undefined,{timeZone:timezone}) : null;
const errorMessage = (error, fallback) => ({
  RESULT_NOT_FOUND:'The saved file no longer exists at this location.',
  RESULT_CHANGED:'The file at this location has changed.',
  OBJECT_CHANGED:'The file changed during transfer.',
  SCOPE_UNAUTHORIZED:'This account is not authorized. Check Remotes.',
  AUTH_REQUIRED:'Reconnect Cloudflare in Remotes.',
  RECONNECT_REQUIRED:'Reconnect Cloudflare in Remotes.',
  R2_BUCKET_ACCESS_DENIED:'This account does not have permission to read the saved bucket.',
  RESULT_LOOKUP_FAILED:'The file could not be verified. Check access in Remotes.',
  INSUFFICIENT_PERMISSION:'This account does not have permission to read the file.',
  HISTORY_DOWNLOAD_INTERRUPTED:'Chrome interrupted the file download.'
})[error.code ?? error.message] ?? (error.name==='AbortError'?'Cancelled.':fallback);
const previewMessage = error => ({
  AUTH_REQUIRED:'Sign in to the saved provider account in Remotes to preview this file.',
  AUTH_ACCOUNT_CHANGED:'The saved file belongs to another account or drive.',
  AUTH_CHANGED:'The provider connection changed. Open the preview again.',
  AUTH_REVOKED:'Reconnect the saved provider account in Remotes.',
  AUTH_SCOPE_REQUIRED:'The saved provider authorization lacks the necessary file access.',
  PROVIDER_AUTH_REVOKED:'Reconnect the saved provider account in Remotes.',
  PROVIDER_PERMISSION:'The saved provider account cannot read this image.',
  PREVIEW_READ_SCOPE_MISSING:'Dropbox file-read access is unavailable. This save has no usable retained image.',
  PREVIEW_RECORD_UNAVAILABLE:'The original confirmed image record is unavailable.',
  PREVIEW_ACCOUNT_UNAVAILABLE:'No verified account binding is available for a live preview.',
  PREVIEW_FILE_UNAVAILABLE:'The receipt does not identify an exact image and version.',
  PREVIEW_SIZE_UNKNOWN:'The saved image size is unavailable.',
  PREVIEW_SIZE_LIMIT:'This image exceeds the preview size limit.',
  PREVIEW_DIMENSIONS_LIMIT:'This image exceeds the preview dimension limit.',
  IMAGE_BYTES_INVALID:'The image bytes could not be validated.',
  IMAGE_HEADER_UNAVAILABLE:'The image dimensions could not be read safely.',
  PREVIEW_TIMEOUT:'The preview took too long. Try opening it again.',
  PREVIEW_BUSY:'Other images are loading. Try opening this preview again.'
})[error.code ?? error.message] ?? errorMessage(error,'Preview unavailable. The history record is retained.');
const filename = name => {
  let safe = String(name ?? '').replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g,'_').replace(/^[.\s]+|[.\s]+$/g,'').slice(0,180);
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)) safe = '_'+safe;
  return safe || 'saved-file';
};
const retainedScreenshot = record => record.kind==='screenshot'&&record.status!=='verified'&&
  record.retryExpiresAt>Date.now()&&/^[a-f\d]{64}$/.test(record.checksum??'')&&
  /^[a-f\d-]{36}$/i.test(record.sourceRecordId);

export function createHistoryCards({api,screenshotRequest,goTo,canRead,signal,preferences,isFirstPage,visibility,rename,renameError,onGalleryClosed}) {
  const rows = [], names = new Map(), thumbnails = new WeakMap(), previews = new Map(), visible = new Set(), pending = new Map(), metadata = [];
  const reader = createImageReader(read,{maxBytes:12*1024*1024,maxEntries:2});
  const retryCache=createScreenshotRetryCache();
  const flags = historyPreset[preferences.preset] ?? historyPreset.full;
  let view = visibility ?? normalizeHistoryV2View();
  let previewDialog, previewAbort, previewUrl, immersive, imageIndex, originalFocus;
  async function read(params,signal) {
    return api('readFileChunk',params,{quiet:true,reconnect:false,readTimeout:25000,signal});
  }
  async function locate(record,signal) {
    const operationId = record.sourceRecordId;
    if(record.renamed){
      const {account,connection,bucket,key}=record.destination;
      return {source:{provider:'cloudflare',accountId:account,connectionId:connection,bucketName:bucket,
        prefix:key.slice(0,key.lastIndexOf('/')+1)},key,size:record.bytes,etag:record.etag,checksum:record.checksum};
    }
    if (record.kind === 'screenshot') {
      const result = await screenshotRequest('history-output',{operationId,outputId:record.deliveryId});
      if (!result.object) throw Error(result.code ?? 'RESULT_LOOKUP_FAILED');
      return {source:result.target,key:result.object.key,size:result.object.size,etag:result.object.etag,checksum:result.checksum};
    }
    const result = await api('openRemoteResult',{operationId},{quiet:true,reconnect:false,readTimeout:20000,signal});
    return {source:result.target,key:result.highlightKey,size:record.bytes,etag:record.etag};
  }
  function downloadReason(record) {
    if (record.status!=='verified')return 'No verified downloadable file recorded.';
    if (!record.destination?.key)return 'No exact file location was recorded.';
    if(!record.etag&&!(record.kind==='screenshot'&&record.checksum))return 'The receipt has no stable file version for download.';
    if (canRead(record) === false) return 'Reconnect the saved account in Remotes to download.';
    return '';
  }
  async function loadPreview(record,limit,signal,concurrency) {
    if (record.provider !== 'cloudflare') return loadBasicHistoryImage(record,signal);
    if(retainedScreenshot(record)){
      const blob=await retryCache.preview(record.sourceRecordId,limit);
      signal.throwIfAborted();
      if(!blob||await hashBlob(blob,signal)!==record.checksum)throw Error('PREVIEW_FILE_UNAVAILABLE');
      return {blob,retained:true};
    }
    if(record.status!=='verified')throw Error('PREVIEW_FILE_UNAVAILABLE');
    if (!record.destination?.key || (!record.etag && !(record.kind === 'screenshot' && record.checksum))) {
      throw Error('PREVIEW_FILE_UNAVAILABLE');
    }
    if (canRead(record) === false) throw Error('RECONNECT_REQUIRED');
    const object = await locate(record,signal);
    signal.throwIfAborted();
    if (!object.key) throw Error('RESULT_LOOKUP_FAILED');
    const result = await reader.load(object.source,object,{limit,signal,concurrency});
    if (object.checksum && await hashBlob(result.blob,signal) !== object.checksum) throw Error('RESULT_CHANGED');
    return result;
  }
  async function download(record,signal) {
    const object = await locate(record,signal);
    signal.throwIfAborted();
    if ((!object.etag&&!object.checksum)||!Number.isSafeInteger(object.size)) throw Error('RESULT_LOOKUP_FAILED');
    return withHistoryDownload(filename(record.filename),async write => {
      const hash=object.checksum?incrementalSHA256():null;
      const onChunk=async bytes=>{hash?.update(bytes);await write(bytes);};
      const {total,done} = await readPreviewBytes(
        params=>api('readFileChunk',params,{quiet:true,reconnect:false,readTimeout:25000,signal}),
        object,{limit:Number.MAX_SAFE_INTEGER,concurrency:1,onChunk,signal});
      if (!done||total!==object.size||hash&&hash.digest()!==object.checksum) throw Error('RESULT_CHANGED');
      return {bytes:total};
    },{signal});
  }

  const editable=record=>rename&&record.provider==='cloudflare'&&record.kind!=='screenshot'&&record.status==='verified'&&
    !!record.destination?.key&&!!record.etag&&canRead(record);
  const editing=new Set(), unconfirmed=new Set();
  function nameControl(holding,record,feedback){
    holding.replaceChildren();
    if(!editable(record)||unconfirmed.has(record.recordId)){
      holding.textContent=record.filename??'N/A';
      return;
    }
    const label=action(record.filename??'N/A',()=>{
      if(editing.has(record.recordId))return;
      const input=node('input');
      input.type='text';input.value=record.filename;input.setAttribute('aria-label','Filename');
      holding.replaceChildren(input);
      input.focus();
      input.select();
      input.onkeydown=async event=>{
        if(event.isComposing||!['Escape','Enter'].includes(event.key))return;
        event.preventDefault();event.stopPropagation();
        if(editing.has(record.recordId))return;
        if(event.key==='Escape'){holding.replaceChildren(label);label.focus();return;}
        editing.add(record.recordId);input.readOnly=true;
        try{
          Object.assign(record,await rename(record,input.value));
          if(record.renamed){
            const card=names.get(record.recordId)?.[0].closest('article');
            if(card){
              const object=card.querySelector('[data-provider-object]');
              if(object)object.textContent=record.providerObjectId;
              const thumbnail=card.querySelector('.history-preview img');
              if(thumbnail){
                thumbnail.alt=record.filename;
                thumbnail.closest('button')?.setAttribute('aria-label','Preview '+record.filename);
              }
              card.querySelector('[data-download]')?.setAttribute('aria-label','Download '+record.filename);
            }
            for(const update of metadata)update();
          }
          if(names.has(record.recordId))nameControl(...names.get(record.recordId));
          if(previewDialog&&rows[imageIndex]===record){
            nameControl(previewDialog.querySelector('h2'),record,previewDialog.querySelector('[role=status]'));
            previewDialog.querySelector('img').alt=record.filename;
          }
          feedback.textContent='';
        }catch(error){
          if(error.outcome==='uncertain'||error.code==='FILE_RENAME_UNCONFIRMED')unconfirmed.add(record.recordId);
          feedback.textContent=renameError?.(error)??'Could not rename this file. Check access and try again.';
        }finally{
          editing.delete(record.recordId);
          if(holding.contains(input))nameControl(holding,record,feedback);
          holding.querySelector('button')?.focus();
        }
      };
    });
    label.className='history-filename';
    label.title='Rename '+record.filename;
    holding.append(label);
  }

  function closeGallery() {
    const wasOpen=!!previewDialog;
    previewAbort?.abort();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = undefined;
    immersive?.dispose();
    if (previewDialog?.open) previewDialog.close();
    previewDialog?.remove();
    previewDialog = undefined;
    originalFocus?.focus({preventScroll:true});
    originalFocus = undefined;
    if (!signal.aborted){
      pump();
      if(wasOpen)onGalleryClosed?.();
    }
  }
  async function showImage(index,thumbnail) {
    const record = rows[index];
    if (!previewDialog || !record) return;
    imageIndex=index;
    previewAbort?.abort();
    previewAbort = new AbortController();
    const local = previewAbort.signal, dialog = previewDialog;
    const image = dialog.querySelector('img'), feedback = dialog.querySelector('[role=status]');
    image.hidden=true;
    dialog.removeAttribute('data-retained-preview');
    image.onload=image.onerror=null;
    image.removeAttribute('src');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl=undefined;
    nameControl(dialog.querySelector('h2'),record,feedback);
    immersive.loading();
    dialog.querySelector('[data-prev]').disabled=index===0;
    dialog.querySelector('[data-next]').disabled=index===rows.length-1;
    feedback.textContent='Loading image…';
    try {
      const loaded=thumbnail??await loadPreview(record,12*1024*1024,local,2);
      local.throwIfAborted();
      const url=URL.createObjectURL(loaded.blob);
      previewUrl=url;
      dialog.toggleAttribute('data-retained-preview',loaded.retained===true);
      image.alt=record.filename;
      image.onload=()=>{
        if(local.aborted)return;
        image.hidden=false;immersive.ready();
        feedback.textContent=loaded.retained ? '' : loaded.label ?? '';
      };
      image.onerror=()=>{if(!local.aborted){URL.revokeObjectURL(url);previewUrl=undefined;immersive.unavailable();feedback.textContent='Image decode failed.';}};
      image.src=url;
    } catch(error) {
      if(!local.aborted){immersive.unavailable();feedback.textContent=previewMessage(error);}
    }
  }
  function gallery(record,trigger) {
    if (previewDialog) closeGallery();
    for (const controller of pending.values()) controller.abort();
    originalFocus=trigger;
    const dialog=node('dialog');
    dialog.className='queue-image-dialog';
    dialog.setAttribute('aria-label','History image preview');
    dialog.innerHTML='<div class="dialog-head"><h2 data-preview-title></h2><button type="button" data-close>Close</button></div>'+
      '<div class="dialog-body gallery-body"><p role="status"></p><div class="image-frame"><img class="preview" alt="" hidden></div>'+
      '<div class="gallery-controls"><button type="button" data-prev aria-label="Previous image">←</button><button type="button" data-next aria-label="Next image">→</button></div></div>'+
      '<div class="dialog-foot gallery-actions"><button type="button" data-enter-immersive disabled>Immersive View</button></div>'+
      '<button type="button" data-exit-immersive aria-label="Exit Immersive View">×</button>'+
      '<div class="immersive-controls"><label>Zoom <input type="range" min="100" max="400" value="100" disabled></label><output>100%</output><button type="button" disabled>Fit</button></div>';
    document.body.append(dialog);
    previewDialog=dialog;
    immersive=wireImmersiveView(dialog);
    dialog.querySelector('[data-close]').onclick=closeGallery;
    dialog.querySelector('[data-prev]').onclick=()=>void showImage(imageIndex-1);
    dialog.querySelector('[data-next]').onclick=()=>void showImage(imageIndex+1);
    dialog.oncancel=event=>{event.preventDefault();if(!immersive.escape())closeGallery();};
    dialog.onkeydown=event=>{
      if(event.target instanceof HTMLInputElement&&event.target.type!=='range')return;
      if(immersive.handleKey(event)){event.preventDefault();return;}
      if(event.target instanceof HTMLInputElement)return;
      if(['ArrowLeft','ArrowRight'].includes(event.key)){
        event.preventDefault();void showImage(imageIndex+(event.key==='ArrowLeft'?-1:1));
      }
    };
    dialog.showModal();
    void showImage(rows.indexOf(record),thumbnails.get(record));
  }
  function releasePreview(slot) {
    pending.get(slot)?.abort();
    const image = slot.querySelector('img');
    if (image) {
      image.onload = image.onerror = null;
      URL.revokeObjectURL(image.src);
      thumbnails.delete(previews.get(slot));
      slot.replaceChildren();
    }
  }
  const observer = new IntersectionObserver(entries=>{
    for(const entry of entries){
      const slot=entry.target;
      if(entry.isIntersecting) visible.add(slot);
      else {
        visible.delete(slot);
        releasePreview(slot);
      }
    }
    pump();
  });
  function pump() {
    if (signal.aborted || previewDialog) return;
    for(const slot of visible){
      if(pending.size>=2)break;
      if(slot.dataset.failed || slot.querySelector('img') || pending.has(slot) || !slot.parentElement.open)continue;
      const record=previews.get(slot);
      const ctrl=new AbortController();
      pending.set(slot,ctrl);
      void (async()=>{
        try{
          const result=await loadPreview(record,4*1024*1024,ctrl.signal,1);
          ctrl.signal.throwIfAborted();
          const image=new Image();
          image.alt=record.filename;
          image.decoding='async';
          image.onerror=()=>{
            releasePreview(slot);
            slot.dataset.failed='true';slot.textContent='Image decode failed.';
          };
          const open=action('',()=>gallery(record,open));
          open.className='history-thumbnail';open.setAttribute('aria-label','Preview '+record.filename);
          open.append(image);slot.replaceChildren(open);
          thumbnails.set(record,result);
          image.src=URL.createObjectURL(result.blob);
        }catch(error){
          if(!ctrl.signal.aborted){
            const message=previewMessage(error);
            if(!record.destination?.key||error.message!=='PREVIEW_SIZE_LIMIT')slot.textContent=message;
            else{
              const open=action(message,()=>gallery(record,open));
              open.className='history-thumbnail';
              open.setAttribute('aria-label','Open image '+record.filename);
              slot.replaceChildren(open);
            }
            slot.dataset.failed='true';
          }
        }finally{pending.delete(slot);if(!signal.aborted)pump();}
      })();
    }
  }
  signal.addEventListener('abort',()=>{
    observer.disconnect();
    for(const slot of previews.keys())releasePreview(slot);
    visible.clear();
    reader.clear();
    closeGallery();
  },{once:true});

  function setVisibility(next) {
    view = next;
    for (const update of metadata) update();
  }

  function render(record) {
    const article=node('article',null,'card queue-history-card');
    article.dataset.recordId=record.recordId;
    article.dataset.provider=record.provider;
    const top=node('div',null,'queue-card-header');
    const heading=node('strong',record.filename ?? 'N/A');
    const summary=node('div',null,'queue-card-summary');
    const timestamp=date(record.terminalAt ?? record.requestedAt,preferences.timezone);
    const when=node('time',timestamp ?? 'N/A');
    const basic=record.provider!=='cloudflare', compact=basic&&preferences.preset==='compact';
    summary.append(heading);
    const label=node('span',queueStatus(record.status),'queue-badge');
    label.dataset.outcome=record.status;
    const location=node('p',null,'queue-location');
    if(basic){
      summary.append(when);
      top.append(summary,label);
    }else{
      summary.append(location);
      const status=node('div',null,'queue-card-status');
      status.append(when,label);
      top.append(summary,status);
    }
    const provider=providerName(record.provider);
    const updateSummary=()=>{
      when.hidden=compact||view.hideNA&&!timestamp;
      const path=savedLocation(record.destination);
      location.textContent=!compact&&(path||!view.hideNA) ? `${provider} · ${path||'N/A'}` : provider;
    };
    metadata.push(updateSummary);
    updateSummary();
    article.append(top);
    if(basic)article.append(location);
    const actions=node('div',null,'queue-actions');
    const feedback=node('p',null,'queue-feedback');
    feedback.setAttribute('role','status');
    names.set(record.recordId,[heading,record,feedback]);nameControl(heading,record,feedback);
    const unavailable=basic?'':downloadReason(record);
    if(!basic&&!unavailable){
    const downloadFile=action('Download',()=>{
      const controller=new AbortController();
      downloadFile.disabled=true;
      feedback.textContent='Downloading saved file…';
      const cancel=action('Cancel download',()=>controller.abort());
      actions.append(cancel);
      void download(record,controller.signal).then(()=>{feedback.textContent='Download complete.';},
        error=>{feedback.textContent=errorMessage(error,'Download failed. Check the connection and saved file.');})
        .finally(()=>{downloadFile.disabled=false;cancel.remove();});
    });
    downloadFile.dataset.download='';
    downloadFile.setAttribute('aria-label','Download '+(record.filename ?? 'saved file'));
    actions.append(downloadFile);
    }
    if(record.status==='verified'&&!basic&&record.destination?.key&&canRead(record)!==false) {
      const go=action('GO TO',async()=>{
        go.disabled=true;
        try{await goTo(record);}catch(error){feedback.textContent=errorMessage(error,'Saved location is unavailable.');}
        finally{go.disabled=false;}
      });
      go.dataset.go='';
      actions.append(go);
    }
    if(record.kind==='screenshot'&&record.deliveryId&&record.status!=='verified'){
      const check=action('Check receipt',async()=>{
        check.disabled=true;
        try{
          const result=await screenshotRequest('reconcile',{operationId:record.sourceRecordId});
          feedback.textContent=result.state==='confirmed'?'Screenshot files verified.':'Some screenshot files remain unconfirmed.';
        }catch(error){feedback.textContent=errorMessage(error,'Could not verify the screenshot. Check Remotes.');}
        finally{check.disabled=false;}
      });
      actions.append(check);
    }
    const previewable=basic ? record.status==='verified'&&!!basicImageMime(record) :
      retainedScreenshot(record)||record.status==='verified'&&isImage({key:record.destination?.key ?? record.filename ?? ''});
    if(previewable)rows.push(record);
    const details=node('details');
    const disclosure=(title,open)=>{
      const detail=node('details');detail.open=open;detail.append(node('summary',title));
      return detail;
    };
    function thumbnail(container){
      const slot=node('div',null,'history-preview');
      previews.set(slot,record);
      container.append(slot);observer.observe(slot);
      container.addEventListener('toggle',()=>{
        if(container.open){delete slot.dataset.failed;pump();}
        else releasePreview(slot);
      });
    }
    if(!basic&&previewable){
      const media=disclosure('Media',preferences.previews==='all'||preferences.previews==='first'&&isFirstPage);
      thumbnail(media);article.append(media);
    }
    if(actions.childElementCount)article.append(actions);
    article.append(feedback);
    if(basic){
      const imagePref=preferences.basicPreviews??'all';
      if(previewable){
        const image=disclosure('Image',imagePref==='all'||imagePref==='first'&&isFirstPage);
        thumbnail(image);article.append(image);
      }
      const host=safeHistoryURL(record.hostUrl);
      if(host)article.append(node('p',new URL(host).hostname,'queue-location'));
    }
    if(!basic){
      const publicURL=safeHistoryURL(record.publicUrl);
      const screenshotURLs=record.kind==='screenshot'&&record.deliveryId&&record.destination?.bucket;
      if(screenshotURLs||publicURL){
        const publicURLs=disclosure('Public URLs',false);
        if(screenshotURLs){
          const holder=node('div');holder.dataset.destinationUrls='';
          publicURLs.append(holder);
          wireHistoryDestinationUrls(publicURLs,{request:screenshotRequest,
            params:{operationId:record.sourceRecordId,outputId:record.deliveryId},
            location:{bucketName:record.destination.bucket},confirmed:record.status==='verified'});
        }else{
          const link=node('a',publicURL);
          link.href=publicURL;link.target='_blank';link.rel='noreferrer noopener';publicURLs.append(link);
        }
        const update=()=>{publicURLs.hidden=!historyV2FieldVisible(view,record.provider,'publicUrl',true);};
        metadata.push(update);update();
        article.append(publicURLs);
      }
    }
    if(basic||flags.showAdvancedDetails) {
      details.append(node('summary','Details'));
      if(basic||flags.showAdvancedDetails){
        const list=node('dl',null,'queue-record-fields');
        let fieldList=list;
        const tracked = [];
        function track(field,available,...elements) {
          tracked.push({field,available,elements});
        }
        function field(key,value,url=false,label=historyV2FieldLabels[key]){
          const term=node('dt',label);
          const item=node('dd');
          if(key==='objectId')item.dataset.providerObject='';
          const href=url ? safeHistoryURL(value) : null;
          if(href){
            const link=node('a',href);
            link.href=href;link.target='_blank';link.rel='noreferrer noopener';item.append(link);
          }else item.textContent=(url?null:value) ?? 'N/A';
          fieldList.append(term,item);
          track(key,url ? !!href : hasHistoryV2Value(value),term,item);
        }
        let urls, urlFields;
        if(basic){
          urls=disclosure('URL',preferences.expandBasicURL===true);
          urlFields=node('dl',null,'queue-record-fields');urls.append(urlFields);
          fieldList=urlFields;
          field('sourceUrl',record.sourceUrl,true);
          field('hostUrl',record.hostUrl,true);
          fieldList=list;
          article.append(urls);
        }else field('originalFilename',record.originalFilename);
        field('requested',date(record.requestedAt,preferences.timezone));
        field('completed',date(record.terminalAt,preferences.timezone));
        field('mime',record.mime);
        if(basic||flags.showFileSize)field('bytes',record.bytes);
        if(basic||flags.showVerification)field('proof',record.proofLevel);
        field('objectId',record.providerObjectId);
        if(!basic){
          field('saveMethod',record.method ?? record.saveMode);
          field('hostTitle',record.hostTitle);
          if(flags.showSourceUrl){field('sourceUrl',record.sourceUrl,true);field('originalUrl',record.originalUrl,true);}
          if(flags.showHostUrl&&record.kind!=='screenshot')field('hostUrl',record.hostUrl,true);
          if(flags.showRemoteUrl)field('remoteUrl',record.remoteUrl,true,'Remote URL');
        }
        if(basic)field('error',record.code,false,'Error');
        details.append(list);
        if(record.kind==='screenshot'){
          const host=node('details');host.open=preferences.expandScreenshotHostURL;
          const hostURL=safeHistoryURL(record.hostUrl);
          host.append(node('summary','Host URL'),node('p',hostURL??'N/A'));
          details.append(host);
          track('hostUrl',!!hostURL,host);
        }
        if(record.metadata){
          const data=node('pre',JSON.stringify(record.metadata,null,2));
          details.append(data);
          track('metadata',true,data);
        }
        const update = () => {
          for (const {field,available,elements} of tracked) {
            const visible = historyV2FieldVisible(view,record.provider,field,available);
            for (const element of elements) element.hidden = !visible;
          }
          list.hidden = !list.querySelector('dt:not([hidden])');
          if(urls)urls.hidden=!urlFields.querySelector('dt:not([hidden])');
        };
        metadata.push(update);
        update();
      }
      article.append(details);
    }
    if(!basic&&!['verified','cancelled'].includes(record.status)){
      const error=disclosure('Error',false);
      if(record.code)error.append(node('p',record.code));
      error.append(node('p',record.status==='uncertain'||record.status==='uploaded'?
        'Check the receipt or the destination before retrying.':'Check the saved location and connection in Remotes before retrying.'));
      article.append(error);
    }
    return article;
  }
  return {render,setVisibility,get previewOpen(){return !!previewDialog;}};
}
