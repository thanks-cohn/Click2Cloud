import {hashBlob,incrementalSHA256} from '../src/recorder/archive-stream.mjs';
import {createImageReader,isImage,readPreviewBytes} from '../src/explorer/image-preview.mjs';
import {withHistoryDownload} from '../src/queue/zip.mjs';
import {safeHistoryURL} from '../src/history/model.mjs';
import {wireHistoryDestinationUrls} from './history-destination-urls.mjs';
import {wireImmersiveView} from './immersive-view.mjs';

export const historyPreset = Object.freeze({
  full:Object.freeze({showSourceUrl:true,showHostUrl:true,showRemoteUrl:true,showFileSize:true,showVerification:true,showAdvancedDetails:true}),
  compact:Object.freeze({showSourceUrl:false,showHostUrl:false,showRemoteUrl:false,showFileSize:false,showVerification:false,showAdvancedDetails:false})
});
export const providerName = value => ({
  cloudflare:'Cloudflare R2',google:'Google Drive',onedrive:'OneDrive',dropbox:'Dropbox'
})[value] ?? 'N/A';
export const queueStatus = value => ({
  working:'Working',waiting:'Waiting',uploading:'Uploading',verifying:'Verifying',verified:'Verified',
  uploaded:'Uploaded · verification unavailable',failed:'Failed',blocked:'Blocked',uncertain:'Outcome uncertain',
  'needs-login':'Needs login',cancelled:'Cancelled'
})[value] ?? 'N/A';
export const historyLocation = destination => [
  destination?.bucket, destination?.key ?? destination?.path ?? destination?.folder
].filter(Boolean).join(' / ') || 'N/A';

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
const date = (at,timezone) => at ? new Date(at).toLocaleString(undefined,{timeZone:timezone}) : 'N/A';
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
const filename = name => {
  let safe = String(name ?? '').replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g,'_').replace(/^[.\s]+|[.\s]+$/g,'').slice(0,180);
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)) safe = '_'+safe;
  return safe || 'saved-file';
};

export function createHistoryCards({api,screenshotRequest,goTo,canRead,signal,preferences,isFirstPage}) {
  const rows = [], previews = new Map(), pending = new Map();
  const reader = createImageReader(read,{maxBytes:12*1024*1024,maxEntries:2});
  const flags = historyPreset[preferences.preset] ?? historyPreset.full;
  let previewDialog, previewAbort, previewUrl, immersive, imageIndex, originalFocus;
  async function read(params) {
    return api('readFileChunk',params,{quiet:true,reconnect:false,readTimeout:25000});
  }
  async function locate(record) {
    const operationId = record.sourceRecordId;
    if (record.kind === 'screenshot') {
      const result = await screenshotRequest('history-output',{operationId,outputId:record.deliveryId});
      if (!result.object) throw Error(result.code ?? 'RESULT_LOOKUP_FAILED');
      return {source:result.target,key:result.object.key,size:result.object.size,etag:result.object.etag,checksum:result.checksum};
    }
    const result = await api('openRemoteResult',{operationId},{quiet:true,reconnect:false,readTimeout:20000});
    return {source:result.target,key:result.highlightKey,size:record.bytes,etag:record.etag};
  }
  function reason(record) {
    if (record.status!=='verified')return 'No verified downloadable file recorded.';
    if (record.provider!=='cloudflare')return 'This provider does not expose a file download through REDOWN.';
    if (!record.destination?.key)return 'No exact file location was recorded.';
    if(!record.etag&&!(record.kind==='screenshot'&&record.checksum))return 'The receipt has no stable file version for download.';
    if (canRead(record) === false) return 'Reconnect the saved account in Remotes to download.';
    return '';
  }
  async function download(record,signal) {
    const object = await locate(record);
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
    image.removeAttribute('src');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl=undefined;
    dialog.querySelector('h2').textContent=record.filename;
    dialog.querySelector('[data-prev]').disabled=index===0;
    dialog.querySelector('[data-next]').disabled=index===rows.length-1;
    feedback.textContent='Loading image…';
    try {
      const object=await locate(record);
      const loaded=await reader.load(object.source,object,{limit:12*1024*1024,signal:local});
      if(object.checksum&&await hashBlob(loaded.blob,local)!==object.checksum)throw Error('RESULT_CHANGED');
      local.throwIfAborted();
      const url=URL.createObjectURL(loaded.blob);
      previewUrl=url;
      image.alt=record.filename;
      image.onload=()=>{if(local.aborted)return;image.hidden=false;immersive.ready();feedback.textContent='';};
      image.onerror=()=>{if(!local.aborted)feedback.textContent='Image decode failed.';};
      image.src=url;
    } catch(error) {
      if(!local.aborted) feedback.textContent=errorMessage(error,'Preview unavailable. The history record is retained.');
    }
  }
  function gallery(record,trigger) {
    closeGallery();
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
  const observer = new IntersectionObserver(entries=>{
    for(const entry of entries){
      const slot=entry.target;
      if(!entry.isIntersecting) {
        pending.get(slot)?.abort();
        const image=slot.querySelector('img');
        if(image){URL.revokeObjectURL(image.src);image.remove();}
      }
    }
    pump();
  });
  function pump() {
    for(const [slot,record] of previews){
      if(pending.size>=2)break;
      if(slot.dataset.failed || slot.querySelector('img') || pending.has(slot) ||
          !slot.getClientRects().length)continue;
      const viewport=slot.getBoundingClientRect();
      if(viewport.bottom<0||viewport.top>innerHeight)continue;
      const ctrl=new AbortController();
      pending.set(slot,ctrl);
      void (async()=>{
        try{
          const object=await locate(record);
          const result=await reader.load(object.source,object,{limit:4*1024*1024,signal:ctrl.signal});
          if(object.checksum&&await hashBlob(result.blob,ctrl.signal)!==object.checksum)throw Error('RESULT_CHANGED');
          ctrl.signal.throwIfAborted();
          const image=new Image();
          image.alt=record.filename;image.src=URL.createObjectURL(result.blob);
          slot.replaceChildren(image);
        }catch(error){
          if(!ctrl.signal.aborted){slot.textContent=errorMessage(error,'Preview unavailable.');slot.dataset.failed='true';}
        }finally{pending.delete(slot);if(!signal.aborted)pump();}
      })();
    }
  }
  signal.addEventListener('abort',()=>{
    observer.disconnect();
    for(const ctrl of pending.values())ctrl.abort();
    for(const slot of previews.keys())for(const img of slot.querySelectorAll('img'))URL.revokeObjectURL(img.src);
    reader.clear();
    closeGallery();
  },{once:true});

  function render(record) {
    const article=node('article',null,'card queue-history-card');
    article.dataset.recordId=record.recordId;
    const top=node('div',null,'queue-card-header');
    const heading=node('strong',record.filename ?? 'N/A');
    const summary=node('div',null,'queue-card-summary');
    const when=node('time',date(record.terminalAt ?? record.requestedAt,preferences.timezone));
    summary.append(heading,when);
    const label=node('span',queueStatus(record.status),'queue-badge');
    label.dataset.outcome=record.status;
    top.append(summary,label);
    article.append(top,node('p',providerName(record.provider)+' · '+historyLocation(record.destination),'queue-location'));
    const actions=node('div',null,'queue-actions');
    const feedback=node('p',null,'queue-feedback');
    feedback.setAttribute('role','status');
    const unavailable=reason(record), downloadFile=action('Download',()=>{
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
    const previewable=!unavailable&&isImage({key:record.destination?.key ?? ''});
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
          else{
            pending.get(slot)?.abort();
            for(const img of slot.querySelectorAll('img')){URL.revokeObjectURL(img.src);img.remove();}
          }
        });
      }
      if(flags.showAdvancedDetails){
        const list=node('dl',null,'queue-record-fields');
        function field(label,value,url=false){
          const item=node('dd');
          const href=url&&safeHistoryURL(value);
          if(href){
            const link=node('a',href);
            link.href=href;link.target='_blank';link.rel='noreferrer noopener';item.append(link);
          }else item.textContent=value??'N/A';
          list.append(node('dt',label),item);
        }
        field('Original filename',record.originalFilename);
        field('Requested',date(record.requestedAt,preferences.timezone));
        field('Completed',date(record.terminalAt,preferences.timezone));
        field('File type',record.mime);
        if(flags.showFileSize)field('Bytes',record.bytes);
        if(flags.showVerification)field('Proof',record.proofLevel);
        field('Provider object',record.providerObjectId);
        field('Save method',record.method ?? record.saveMode);
        field('Error',record.code);
        field('Host page',record.hostTitle);
        if(flags.showSourceUrl){field('Source URL',record.sourceUrl,true);field('Original URL',record.originalUrl,true);}
        if(flags.showHostUrl&&record.kind!=='screenshot')field('Host URL',record.hostUrl,true);
        if(flags.showRemoteUrl){field('Remote URL',record.remoteUrl,true);field('Public URL',record.publicUrl,true);}
        details.append(list);
        if(record.kind==='screenshot'){
          const host=node('details');host.open=preferences.expandScreenshotHostURL;
          host.append(node('summary','Host URL'),node('p',safeHistoryURL(record.hostUrl)??'N/A'));
          details.append(host);
          if(record.deliveryId&&record.destination?.bucket){
            const urls=node('details');
            const holder=node('div');holder.dataset.destinationUrls='';
            urls.append(node('summary','Public URLs'),holder);
            details.append(urls);
            wireHistoryDestinationUrls(urls,{request:screenshotRequest,
              params:{operationId:record.sourceRecordId,outputId:record.deliveryId},
              location:{bucketName:record.destination.bucket},confirmed:record.status==='verified'});
          }
        }
        if(record.metadata)details.append(node('pre',JSON.stringify(record.metadata,null,2)));
      }
      article.append(details);
    }
    return article;
  }
  return {render};
}
