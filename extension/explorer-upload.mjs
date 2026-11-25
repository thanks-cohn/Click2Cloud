import {downloadUploadReceiptBlob} from '../src/chrome/local-upload-receipt-download.mjs';
import {discardLocalUpload,localUploadPort,stageLocalUpload} from '../src/chrome/local-upload-files.mjs';
import {maximumUploadFiles} from '../src/chrome/local-upload-plan.mjs';
import {normalizeTarget,targetKey} from '../src/core/menu-identity.mjs';

export function uploadConnection(runtime) {
  const port=runtime.connect({name:localUploadPort});
  let pending,closed=false,handledReceipt=false;
  port.onMessage.addListener(({receiptDownload:receipt})=>{
    if(!receipt||handledReceipt)return;
    handledReceipt=true;
    void downloadUploadReceiptBlob(chrome,receipt).then(result=>{
      const value=result==='disabled'?{state:result}:{state:result.state,downloadId:result.id};
      if(!closed)port.postMessage({receiptAck:receipt.id,...value});
    },()=>{
      if(!closed)port.postMessage({receiptAck:receipt.id,state:'failed'});
    }).catch(()=>{});
  });
  function disconnected(){
    closed=true;
    pending?.(Error('Chrome interrupted the upload. Check the destination before selecting the affected files again.'));
  }
  port.onDisconnect.addListener(disconnected);
  return {
    request(input,progress){
      const message={...input,requestId:crypto.randomUUID()};
      return new Promise((resolve,reject)=>{
        if(closed||pending){reject(Error('The upload connection is unavailable.'));return;}
        let timer,keepAlive;
        const cleanup=()=>{
          clearTimeout(timer);
          clearInterval(keepAlive);
          port.onMessage.removeListener(receive);
          pending=undefined;
        };
        const receive=result=>{
          if(result.requestId!==message.requestId)return;
          if(result.progress){progress?.(result.progress);return;}
          cleanup();
          resolve(result);
        };
        pending=error=>{cleanup();reject(error);};
        port.onMessage.addListener(receive);
        timer=setTimeout(()=>pending?.(Error('Cloudflare did not respond in time. Check the destination before trying again.')),progress?12*60_000:25_000);
        try{
          port.postMessage(message);
          if(progress)keepAlive=setInterval(()=>{
            try{port.postMessage({ping:true});}catch(error){pending?.(error);}
          },20000);
        }catch(error){pending?.(error);}
      });
    },
    cancel(){try{port.postMessage({cancel:true});}catch{}},
    close(){if(!closed){disconnected();port.disconnect();}}
  };
}

const ttl=30_000;
const terminal=new Set(['verified','failed','cancelled','unconfirmed']);
const targetLabel=target=>target.bucketName+'/'+target.prefix;
const sameTarget=(a,b)=>!!a&&!!b&&targetKey(a)===targetKey(b);
export function wireExplorerUpload({runtime,button,choices,availability,picker,folderPicker,status,bar,cancel,
    addFolder,startFolders,reconcileButton,resumeButton,readTarget,windowId,closeMenu,refresh}){
  let checked,checking,picking,collecting,active,recovered,restoreGeneration=0;
  const current=target=>sameTarget(readTarget(),target);
  const fresh=()=>current(checked?.target)&&checked.expires>Date.now();
  function menu(show){
    choices.hidden=!show;
    button.setAttribute('aria-expanded',String(show));
  }
  function showReadiness(message,show){
    button.title=message;
    availability.textContent=show?message:'';
    availability.hidden=!show;
  }
  function update(){
    if(checked&&!current(checked.target))checked=undefined;
    button.disabled=!!(active||picking||collecting)||!fresh();
    if(button.disabled)menu(false);
    if(!readTarget())showReadiness('Choose a folder in a connected Cloudflare account.',true);
  }
  function showBatch(batch,issue=''){
    const {counts,total,processed,uploaded,phase}=batch;
    bar.hidden=false;
    bar.max=total;
    bar.value=counts.verified;
    reconcileButton.hidden=phase!=='paused'||batch.activeIndex===null;
    resumeButton.hidden=phase!=='paused'||batch.activeIndex!==null;
    recovered=phase==='paused'?batch:null;
    const caption=phase==='verifying'?(`Verifying ${counts.verified}/${total} · ${uploaded} uploaded`):
      phase==='ready'||phase==='uploading'?(`Uploading ${processed}/${total} processed · ${counts.verified} verified`):
      phase==='preparing'?'Preparing upload…':`${counts.verified} of ${total} files verified.`;
    const final=terminal.has(phase)||phase==='paused';
    if(final)cancel.hidden=true;
    const notes=final?[counts.failed?`${counts.failed} failed.`:'',counts.skipped?`${counts.skipped} existing objects skipped.`:'',
      counts.unconfirmed?`${counts.unconfirmed} unconfirmed.`:'',counts.cancelled?`${counts.cancelled} cancelled.`:'',
      total>processed?`${total-processed} not processed.`:'',
      phase==='cancelled'?'Upload cancelled.':'',
      phase==='paused'?'Upload paused. The remaining local files must be selected again.':'',
      batch.renamed?`${batch.renamed} saved with separate names to keep existing files.`:'']:null;
    status.textContent=[caption,`Destination ${targetLabel(batch.target)}.`,...(notes??[]),issue].filter(Boolean).join(' ');
  }
  async function inspect({reconcile=false}={}){
    const source=readTarget();
    if(!source||active||picking||collecting||reconcile&&!recovered)return;
    const generation=++restoreGeneration;
    let transport;
    try{
      transport=uploadConnection(runtime);
      const result=await transport.request(reconcile?{reconcile:true,source,batchId:recovered.id}:{inspect:true,source});
      if(generation!==restoreGeneration||!current(source)||active||picking||collecting)return;
      if(result.batch)showBatch(result.batch);
      else if(reconcile)status.textContent=result.error??'Cloudflare could not reconcile this upload.';
    }catch(error){
      if(reconcile&&generation===restoreGeneration)status.textContent=error.message;
    }finally{transport?.close();}
  }
  function invalidate(){
    const next=checking;
    checking=checked=undefined;
    next?.connection?.close();
    menu(false);
    showReadiness('',false);
    if(!active&&!picking&&!collecting){
      restoreGeneration++;
      recovered=null;
      reconcileButton.hidden=resumeButton.hidden=true;
      status.textContent='';
      bar.hidden=true;
    }
    update();
  }
  function check(){
    update();
    const target=readTarget();
    if(!target||active||picking||collecting||fresh())return;
    if(checking&&current(checking.target))return checking.result;
    checking?.connection?.close();
    const check={target:normalizeTarget(target)};
    checking=check;
    showReadiness('Checking Cloudflare write access…',false);
    check.result=(async()=>{
      for(let attempt=0;attempt<2;attempt++){
        let connection;
        try{
          check.connection=connection=uploadConnection(runtime);
          const result=await connection.request({source:check.target,check:true});
          if(checking!==check||!current(check.target))return;
          if(result.state==='completed')checked={target:check.target,expires:Date.now()+ttl};
          if(!result.retryable||attempt===1){
            showReadiness(result.state==='completed'?'':result.error??'Cloudflare write access is unavailable.',result.state!=='completed');
            return;
          }
        }catch{
          if(checking!==check||!current(check.target))return;
          showReadiness('Chrome interrupted the write check. Reopen More to check again.',attempt===1);
        }finally{connection?.close();}
      }
    })().finally(()=>{if(checking===check){checking=undefined;update();}});
    return check.result;
  }
  function pick(mode,target,resumeId){
    const input=mode==='files'?picker:folderPicker;
    picking={mode,target,input,resumeId};
    menu(false);
    closeMenu();
    input.value='';
    input.click();
    update();
  }
  function showCollection(issue=''){
    const count=collecting?.files.length??0;
    startFolders.hidden=addFolder.hidden=!collecting;
    cancel.hidden=!collecting;
    cancel.disabled=false;
    if(collecting)status.textContent=[
      `${collecting.roots.size} ${collecting.roots.size===1?'folder':'folders'} · ${count} files queued for ${targetLabel(collecting.target)}.`,
      'Empty folders are omitted.',issue].filter(Boolean).join(' ');
  }
  button.onclick=event=>{
    event.stopPropagation();
    if(!fresh()){void check();return;}
    menu(choices.hidden);
    if(!choices.hidden)choices.querySelector('button').focus();
  };
  choices.onkeydown=event=>{
    if(event.key==='Escape'){event.stopPropagation();menu(false);button.focus();}
  };
  for(const [mode,input] of [['files',picker],['folder',folderPicker]]){
    choices.querySelector('[data-upload-kind="'+mode+'"]').onclick=()=>{
      if(!fresh()){menu(false);void check();return;}
      pick(mode,checked.target);
    };
    input.oncancel=()=>{if(picking?.input===input){picking=undefined;update();}};
    input.onchange=()=>{
      if(picking?.input!==input)return;
      const {target,resumeId}=picking;
      picking=undefined;
      const picked=input.files;
      if(picked.length+(collecting?.files.length??0)>maximumUploadFiles){
        input.value='';
        if(collecting)showCollection('Select up to 10,000 files in one batch.');
        else status.textContent='Select up to 10,000 files in one batch.';
        update();
        return;
      }
      const files=Array.from(picked);
      input.value='';
      if(!files.length){
        if(collecting)showCollection('This folder did not contain any selectable files.');
        else if(mode==='folder')status.textContent='There are no files to upload. Empty folders are omitted.';
        update();
        return;
      }
      if(mode==='files'){void upload(target,mode,files,resumeId);return;}
      collecting??={target,resumeId,files:[],roots:new Set()};
      const roots=new Set(files.map(file=>file.webkitRelativePath.split('/')[0]));
      if([...roots].some(root=>collecting.roots.has(root))){
        showCollection('A folder with the same selected name is already in this batch.');
      }else{
        for(const root of roots)collecting.roots.add(root);
        for(const file of files)collecting.files.push(file);
        bar.hidden=true;
        reconcileButton.hidden=resumeButton.hidden=true;
        showCollection();
      }
      update();
    };
  }
  addFolder.onclick=()=>{if(collecting&&!picking)pick('folder',collecting.target);};
  startFolders.onclick=()=>{
    if(!collecting||picking)return;
    const {target,files,resumeId}=collecting;
    collecting=undefined;
    showCollection();
    void upload(target,'folder',files,resumeId);
  };
  resumeButton.onclick=()=>{
    if(recovered&&current(recovered.target)&&!active&&!picking&&!collecting)
      pick(recovered.mode,recovered.target,recovered.id);
  };
  reconcileButton.onclick=async()=>{
    reconcileButton.disabled=true;
    try{await inspect({reconcile:true});}finally{reconcileButton.disabled=false;}
  };
  cancel.onclick=()=>{
    if(collecting){
      collecting=undefined;
      showCollection();
      status.textContent='';
      update();
      void inspect();
      return;
    }
    if(!active)return;
    active.controller.abort();
    active.connection?.cancel();
    cancel.disabled=true;
    status.textContent='Cancelling upload…';
  };
  async function upload(target,mode,files,resumeId){
    const id=resumeId??crypto.randomUUID(),controller=new AbortController(),{signal}=controller;
    const batch={id,controller};
    active=batch;
    restoreGeneration++;
    update();
    cancel.hidden=false;cancel.disabled=false;
    reconcileButton.hidden=resumeButton.hidden=true;
    bar.hidden=false;bar.removeAttribute('value');
    status.textContent=`Preparing upload to ${targetLabel(target)}…`;
    let state,issue='';
    const paths=files.map(file=>mode==='folder'?file.webkitRelativePath:file.name);
    try{
      const origin=await windowId;
      signal.throwIfAborted();
      batch.connection=uploadConnection(runtime);
      const result=await batch.connection.request({source:target,...(resumeId?{resume:true}:{begin:true}),batchId:id,mode,windowId:origin,
        items:files.map((file,index)=>({name:file.name,size:file.size,relativePath:paths[index]}))},progress=>showBatch(progress));
      state=result.batch;
      if(!state||result.state!=='completed')throw Error(result.error??'Cloudflare write access is unavailable.');
      showBatch(state);
      const order=result.order??files.map((_,index)=>index);
      for(const selected of order){
        if(state.phase!=='ready')break;
        signal.throwIfAborted();
        const ticket=crypto.randomUUID(),index=state.next;
        try{
          await stageLocalUpload(ticket,files[selected],{source:target,batchId:id,index,mode,relativePath:paths[selected]});
          signal.throwIfAborted();
          const response=await batch.connection.request({source:target,ticket,batchId:id,index},progress=>{
            if(!signal.aborted)showBatch(progress);
          });
          if(!response.batch)throw Error(response.error??'Chrome could not confirm the upload status.');
          state=response.batch;
          showBatch(state,response.error);
          if(response.error)issue=response.error;
        }finally{await discardLocalUpload(ticket).catch(()=>{});}
        if((index+1)%128===0)await new Promise(resolve=>setTimeout(resolve,0));
      }
    }catch(error){
      issue=error.name==='QuotaExceededError'?'Local upload staging is full. Free disk space before selecting the remaining files.':
        signal.aborted?'Upload cancelled.':error.message;
      if(state&&!terminal.has(state.phase)&&state.phase!=='paused'){
        const code=error.name==='QuotaExceededError'?'LOCAL_UPLOAD_STAGING_QUOTA':'LOCAL_UPLOAD_INTERRUPTED';
        const stop=await batch.connection?.request({source:target,batchId:id,stop:true,...(signal.aborted?{}:{code})}).catch(()=>null);
        state=stop?.batch??null;
      }
    }finally{
      batch.connection?.close();
      if(state)showBatch(state,issue);
      else if(resumeId&&recovered)showBatch(recovered,issue);
      else{status.textContent=issue;bar.hidden=true;}
      active=undefined;cancel.hidden=true;update();
      if(state?.counts.verified&&current(target))try{await refresh(target);}
      catch{status.textContent+=' Refresh the folder to see the uploaded files.';}
    }
  }
  window.addEventListener('pagehide',()=>{checking?.connection?.close();active?.connection?.close();});
  return {check,update,invalidate,inspect};
}
