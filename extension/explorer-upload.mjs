import {discardLocalUpload,localUploadPort,stageLocalUpload} from '../src/chrome/local-upload-files.mjs';
import {planLocalUpload} from '../src/chrome/local-upload-plan.mjs';
import {normalizeTarget,targetKey} from '../src/core/menu-identity.mjs';

function uploadConnection(runtime) {
  const port=runtime.connect({name:localUploadPort});
  let pending,closed=false;
  function disconnected(){
    closed=true;
    pending?.(Error('Chrome interrupted the upload. Check the destination before selecting the affected files again.'));
  }
  port.onDisconnect.addListener(disconnected);
  return {
    request(message,progress){
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

const requestId=()=>crypto.randomUUID();
const ttl=30_000;
export function wireExplorerUpload({runtime,button,choices,picker,folderPicker,status,cancel,readTarget,closeMenu,refresh}) {
  let checked,checking,picking,active;
  const same=target=>target&&targetKey(readTarget()??{})===targetKey(target);
  const fresh=()=>same(checked?.target)&&checked.expires>Date.now();
  function menu(show){
    choices.hidden=!show;
    button.setAttribute('aria-expanded',String(show));
  }
  function update(){
    if(checked&&!same(checked.target))checked=undefined;
    button.disabled=!!(active||picking)||!fresh();
    if(button.disabled)menu(false);
    if(!readTarget())button.title='Choose a folder in a connected Cloudflare account.';
  }
  function invalidate(){
    const next=checking;
    checking=checked=undefined;
    next?.connection?.close();
    menu(false);
    update();
  }
  function check(){
    update();
    const target=readTarget();
    if(!target||active||picking||fresh())return;
    if(checking&&same(checking.target))return checking.result;
    checking?.connection?.close();
    const check={target:normalizeTarget(target)};
    checking=check;
    button.title='Checking Cloudflare write access…';
    check.result=(async()=>{
      for(let attempt=0;attempt<2;attempt++){
        let connection;
        try{
          checking.connection=connection=uploadConnection(runtime);
          const result=await connection.request({source:check.target,check:true,requestId:requestId()});
          if(checking!==check||!same(check.target))return;
          if(result.state==='completed')checked={target:check.target,expires:Date.now()+ttl};
          if(!result.retryable||attempt===1){button.title=result.error??'';return;}
        }catch{
          if(checking!==check||!same(check.target))return;
          button.title='Chrome interrupted the write check. Open More to check again.';
        }finally{connection?.close();}
      }
    })().finally(()=>{if(checking===check){checking=undefined;update();}});
    return check.result;
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
      if(!fresh()){void check();return;}
      picking={target:checked.target,mode,input};
      menu(false);
      closeMenu();
      input.value='';
      input.click();
      update();
    };
    input.oncancel=()=>{if(picking?.input===input){picking=undefined;update();}};
    input.onchange=()=>{if(picking?.input===input)void upload(picking,input.files);};
  }
  cancel.onclick=()=>{
    if(!active)return;
    active.controller.abort();
    active.connection?.cancel();
    cancel.disabled=true;
    status.textContent='Cancelling upload…';
  };
  async function upload({target,mode,input},files){
    picking=undefined;
    if(!same(target)){
      status.textContent='Upload cancelled because the selected Cloudflare folder changed. Choose the files again in the intended folder.';
      input.value='';update();return;
    }
    if(!files.length){
      if(mode==='folder')status.textContent='There are no files to upload. Empty folders are omitted by the folder picker.';
      input.value='';update();return;
    }
    const batch={id:requestId(),controller:new AbortController()};
    const {signal}=batch.controller;
    active=batch;
    update();
    cancel.hidden=false;cancel.disabled=false;
    let completed=0,failed=0,uncertain=0,processed=0,issue='',renamed=0,lastRename='';
    try{
      status.textContent='Checking selected file paths…';
      const plan=await planLocalUpload({source:target,files,mode,signal});
      if(!same(target))throw Error('The selected Cloudflare folder changed. Choose the files again in the intended folder.');
      batch.connection=uploadConnection(runtime);
      const ready=await batch.connection.request({source:target,begin:true,batchId:batch.id,requestId:requestId()});
      if(ready.state!=='completed')throw Error(ready.error??'Cloudflare write access is unavailable.');
      for(let index=0;index<plan.total;index++){
        signal.throwIfAborted();
        const file=files[index],ticket=requestId();
        const relativePath=mode==='folder'?file.webkitRelativePath:file.name;
        const binding={source:target,batchId:batch.id,index,mode,relativePath};
        let dispatched=false;
        try{
          status.textContent=`Uploading ${index+1} of ${plan.total} · ${relativePath}`;
          await stageLocalUpload(ticket,file,binding);
          signal.throwIfAborted();
          dispatched=true;
          const result=await batch.connection.request({source:target,ticket,batchId:batch.id,index,requestId:requestId()},event=>{
            if(!signal.aborted&&(event.phase==='verifying'||event.phase==='committing'))
              status.textContent=`${event.phase==='verifying'?'Verifying':'Finishing'} ${index+1} of ${plan.total} · ${relativePath}`;
          });
          processed++;
          if(result.state==='completed'){
            completed++;
            if(result.key!==target.prefix+relativePath){renamed++;lastRename=result.key;}
          }else{
            issue=result.error??'Cloudflare could not confirm this file.';
            if(result.state==='uncertain')uncertain++;
            else if(result.state!=='cancelled')failed++;
            if(!result.continue)break;
          }
        }catch(error){
          if(dispatched){processed++;uncertain++;}
          if(error.name==='QuotaExceededError')throw Error('Local upload staging is full. Free disk space and select the remaining files again.');
          throw error;
        }finally{await discardLocalUpload(ticket).catch(()=>{});}
      }
    }catch(error){if(error.name!=='AbortError')issue=error.message;}
    finally{
      batch.connection?.close();
      const remaining=files.length-processed;
      const summary=[`${completed} of ${files.length} files verified.`,
        failed?`${failed} failed or skipped.`:'',uncertain?`${uncertain} unconfirmed.`:'',
        remaining?`${remaining} files not processed.`:'',signal.aborted?'Upload cancelled.':'',issue,
        renamed?`${renamed} saved with a different name to avoid replacing existing files. Latest: ${lastRename}`:''];
      status.textContent=summary.filter(Boolean).join(' ');
      input.value='';active=undefined;cancel.hidden=true;update();
      if(completed&&same(target))try{await refresh(target);}
      catch{status.textContent+=' Refresh the folder to see the uploaded files.';}
    }
  }
  window.addEventListener('pagehide',()=>{checking?.connection?.close();active?.connection?.close();});
  return {check,update,invalidate};
}
