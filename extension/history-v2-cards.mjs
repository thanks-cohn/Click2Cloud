import {hashBlob,incrementalSHA256} from '../src/recorder/archive-stream.mjs';
import {createImageReader,isImage,readPreviewBytes} from '../src/explorer/image-preview.mjs';
import {withHistoryDownload} from '../src/queue/zip.mjs';
import {safeHistoryURL} from '../src/history/model.mjs';
import {wireHistoryDestinationUrls} from './history-destination-urls.mjs';
import {wireImmersiveView} from './immersive-view.mjs';
import {basicImageMime,loadBasicHistoryImage} from './basic-history-preview.mjs';
import {hasHistoryV2Value,historyV2FieldLabels,historyV2FieldVisible,historyV2Providers,normalizeHistoryV2View} from './history-v2-preferences.mjs';

export const historyPreset = Object.freeze({
  full:Object.freeze({showSourceUrl:true,showHostUrl:true,showRemoteUrl:true,showFileSize:true,showVerification:true,showAdvancedDetails:true}),
  compact:Object.freeze({showSourceUrl:false,showHostUrl:false,showRemoteUrl:false,showFileSize:false,showVerification:false,showAdvancedDetails:false})
});
export const providerName = value => Object.hasOwn(historyV2Providers,value) ? historyV2Providers[value] : 'N/A';
export const queueStatus = value => ({
  working:'Working',waiting:'Waiting',uploading:'Uploading',verifying:'Verifying',verified:'Verified',
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

export function createHistoryCards({api,screenshotRequest,goTo,canRead,signal,preferences,isFirstPage,visibility}) {
  const rows = [], previews = new Map(), visible = new Set(), pending = new Map(), metadata = [];
  const reader = createImageReader(read,{maxBytes:12*1024*1024,maxEntries:2});
  const flags = historyPreset[preferences.preset] ?? historyPreset.full;
  let view = visibility ?? normalizeHistoryV2View();
  let previewDialog, previewAbort, previewUrl, immersive, imageIndex, originalFocus;
  async function read(params,signal) {
    return api('readFileChunk',params,{quiet:true,reconnect:false,readTimeout:25000,signal});
  }
  async function locate(record,signal) {
    const operationId = record.sourceRecordId;
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
    if (record.provider!=='cloudflare')return 'This provider does not expose a file download through REDOWN.';
    if (!record.destination?.key)return 'No exact file location was recorded.';
    if(!record.etag&&!(record.kind==='screenshot'&&record.checksum))return 'The receipt has no stable file version for download.';
    if (canRead(record) === false) return 'Reconnect the saved account in Remotes to download.';
    return '';
  }
  async function loadPreview(record,limit,signal,concurrency) {
    if (record.provider !== 'cloudflare') return loadBasicHistoryImage(record,signal);
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

  function closeGallery() {
    previewAbort?.abort();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = undefined;
    immersive?.dispose();
    if (previewDialog?.open) previewDialog.close();
    previewDialog?.remove();
    previewDialog = undefined;
    originalFocus?.focus({preventScroll:true});
    originalFocus = undefined;
    if (!signal.aborted) pump();
  }
  async function showImage(index) {
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
    dialog.querySelector('h2').textContent=record.filename;
    dialog.querySelector('[data-prev]').disabled=index===0;
    dialog.querySelector('[data-next]').disabled=index===rows.length-1;
    feedback.textContent='Loading image…';
    try {
      const loaded=await loadPreview(record,12*1024*1024,local,2);
      local.throwIfAborted();
      const url=URL.createObjectURL(loaded.blob);
      previewUrl=url;
      dialog.toggleAttribute('data-retained-preview',loaded.retained===true);
      image.alt=record.filename;
      image.onload=()=>{
        if(local.aborted)return;
        image.hidden=false;immersive.ready();
        feedback.textContent=loaded.retained ? `${loaded.label} · ${image.naturalWidth} × ${image.naturalHeight}` : loaded.label ?? '';
      };
      image.onerror=()=>{if(!local.aborted){URL.revokeObjectURL(url);previewUrl=undefined;feedback.textContent='Image decode failed.';}};
      image.src=url;
    } catch(error) {
      if(!local.aborted) feedback.textContent=previewMessage(error);
    }
  }
  function gallery(record,trigger) {
    if (previewDialog) closeGallery();
    for (const controller of pending.values()) controller.abort();
    originalFocus=trigger;
    const dialog=node('dialog');
    dialog.className='queue-image-dialog';
    dialog.setAttribute('aria-label','History image preview');
    dialog.innerHTML='<div class="dialog-head"><h2></h2><button type="button" data-close>Close</button></div>'+
      '<div class="dialog-body"><p role="status"></p><div class="image-frame"><img class="preview" alt="" hidden></div></div>'+
      '<div class="dialog-foot"><button type="button" data-prev aria-label="Previous image">←</button><button type="button" data-next aria-label="Next image">→</button>'+
      '<button type="button" id="immersive-view" disabled>Zoom view</button><button type="button" id="exit-immersive">Exit zoom view</button>'+
      '<div class="immersive-controls"><label>Zoom <input type="range" min="100" max="400" value="100" disabled></label><output>100%</output><button type="button" disabled>Fit</button></div></div>';
    document.body.append(dialog);
    previewDialog=dialog;
    immersive=wireImmersiveView(dialog);
    dialog.querySelector('[data-close]').onclick=closeGallery;
    dialog.querySelector('[data-prev]').onclick=()=>void showImage(imageIndex-1);
    dialog.querySelector('[data-next]').onclick=()=>void showImage(imageIndex+1);
    dialog.oncancel=event=>{event.preventDefault();if(!immersive.escape())closeGallery();};
    dialog.onkeydown=event=>{
      if(immersive.handleKey(event)){event.preventDefault();return;}
      if(event.target instanceof HTMLInputElement)return;
      if(['ArrowLeft','ArrowRight'].includes(event.key)){
        event.preventDefault();void showImage(imageIndex+(event.key==='ArrowLeft'?-1:1));
      }
    };
    dialog.showModal();
    void showImage(rows.indexOf(record));
  }
  function releasePreview(slot) {
    pending.get(slot)?.abort();
    const image = slot.querySelector('img');
    if (image) {
      image.onload = image.onerror = null;
      URL.revokeObjectURL(image.src);
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
          slot.replaceChildren(image,...(result.label?[node('p',result.label,'muted')]:[]));
          image.src=URL.createObjectURL(result.blob);
        }catch(error){
          if(!ctrl.signal.aborted){slot.textContent=previewMessage(error);slot.dataset.failed='true';}
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
    const top=node('div',null,'queue-card-header');
    const heading=node('strong',record.filename ?? 'N/A');
    const summary=node('div',null,'queue-card-summary');
    const timestamp=date(record.terminalAt ?? record.requestedAt,preferences.timezone);
    const when=node('time',timestamp ?? 'N/A');
    summary.append(heading,when);
    const label=node('span',queueStatus(record.status),'queue-badge');
    label.dataset.outcome=record.status;
    top.append(summary,label);
    const location=node('p',null,'queue-location');
    const provider=providerName(record.provider),path=savedLocation(record.destination);
    const updateSummary=()=>{
      when.hidden=view.hideNA&&!timestamp;
      location.textContent=path||!view.hideNA ? `${provider} · ${path||'N/A'}` : provider;
    };
    metadata.push(updateSummary);
    updateSummary();
    article.append(top,location);
    const actions=node('div',null,'queue-actions');
    const feedback=node('p',null,'queue-feedback');
    feedback.setAttribute('role','status');
    const unavailable=downloadReason(record), downloadFile=action('Download',()=>{
      const controller=new AbortController();
      downloadFile.disabled=true;
      feedback.textContent='Downloading saved file…';
      const cancel=action('Cancel download',()=>controller.abort());
      actions.append(cancel);
      void download(record,controller.signal).then(()=>{feedback.textContent='Download complete.';},
        error=>{feedback.textContent=errorMessage(error,'Download failed. Check the connection and saved file.');})
        .finally(()=>{downloadFile.disabled=false;cancel.remove();});
    });
    downloadFile.setAttribute('aria-label','Download '+(record.filename ?? 'saved file'));
    downloadFile.disabled=!!unavailable;
    if(unavailable){
      const id='download-unavailable-'+crypto.randomUUID();
      feedback.id=id;
      downloadFile.title=unavailable;
      downloadFile.setAttribute('aria-describedby',id);
      feedback.textContent=unavailable;
    }
    actions.append(downloadFile);
    if(record.status==='verified'&&record.provider==='cloudflare'&&record.destination?.key) {
      const go=action('GO TO',async()=>{
        go.disabled=true;
        try{await goTo(record);}catch(error){feedback.textContent=errorMessage(error,'Saved location is unavailable.');}
        finally{go.disabled=false;}
      });
      go.disabled=canRead(record)===false;
      actions.append(go);
    }
    const previewable=record.status==='verified'&&(record.provider==='cloudflare'
      ? isImage({key:record.destination?.key ?? record.filename ?? ''}) : !!basicImageMime(record));
    if(previewable) {
      rows.push(record);
      const trigger=action('Preview',()=>gallery(record,trigger));
      actions.append(trigger);
    }
    article.append(actions,feedback);
    const details=node('details');
    if(flags.showAdvancedDetails||previewable) {
      details.append(node('summary',flags.showAdvancedDetails?'Details':'Image preview'));
      if(previewable) {
        details.open=preferences.previews==='all'||preferences.previews==='first'&&isFirstPage;
        const slot=node('div',null,'history-preview');
        previews.set(slot,record);
        details.append(slot);observer.observe(slot);
        details.addEventListener('toggle',()=>{
          if(details.open){delete slot.dataset.failed;pump();}
          else releasePreview(slot);
        });
      }
      if(flags.showAdvancedDetails){
        const list=node('dl',null,'queue-record-fields');
        const tracked = [];
        function track(field,available,...elements) {
          tracked.push({field,available,elements});
        }
        function field(key,value,url=false,label=historyV2FieldLabels[key]){
          const term=node('dt',label);
          const item=node('dd');
          const href=url ? safeHistoryURL(value) : null;
          if(href){
            const link=node('a',href);
            link.href=href;link.target='_blank';link.rel='noreferrer noopener';item.append(link);
          }else item.textContent=(url?null:value) ?? 'N/A';
          list.append(term,item);
          track(key,url ? !!href : hasHistoryV2Value(value),term,item);
        }
        field('originalFilename',record.originalFilename);
        field('requested',date(record.requestedAt,preferences.timezone));
        field('completed',date(record.terminalAt,preferences.timezone));
        field('mime',record.mime);
        if(flags.showFileSize)field('bytes',record.bytes);
        if(flags.showVerification)field('proof',record.proofLevel);
        field('objectId',record.providerObjectId);
        field('saveMethod',record.method ?? record.saveMode);
        field('error',record.code,false,'Error');
        field('hostTitle',record.hostTitle);
        if(flags.showSourceUrl){field('sourceUrl',record.sourceUrl,true);field('originalUrl',record.originalUrl,true);}
        if(flags.showHostUrl&&record.kind!=='screenshot')field('hostUrl',record.hostUrl,true);
        if(flags.showRemoteUrl){field('remoteUrl',record.remoteUrl,true,'Remote URL');field('publicUrl',record.publicUrl,true,'Public URL');}
        details.append(list);
        if(record.kind==='screenshot'){
          const host=node('details');host.open=preferences.expandScreenshotHostURL;
          const hostURL=safeHistoryURL(record.hostUrl);
          host.append(node('summary','Host URL'),node('p',hostURL??'N/A'));
          details.append(host);
          track('hostUrl',!!hostURL,host);
          if(record.deliveryId&&record.destination?.bucket){
            const urls=node('details');
            const holder=node('div');holder.dataset.destinationUrls='';
            urls.append(node('summary','Public URLs'),holder);
            details.append(urls);
            track('publicUrl',true,urls);
            wireHistoryDestinationUrls(urls,{request:screenshotRequest,
              params:{operationId:record.sourceRecordId,outputId:record.deliveryId},
              location:{bucketName:record.destination.bucket},confirmed:record.status==='verified'});
          }
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
        };
        metadata.push(update);
        update();
      }
      article.append(details);
    }
    if (!flags.showAdvancedDetails && record.code && record.status!=='verified') article.append(node('p',record.code,'queue-feedback'));
    return article;
  }
  return {render,setVisibility};
}
