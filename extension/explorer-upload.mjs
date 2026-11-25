import {discardLocalUpload,localUploadPort,stageLocalUpload} from '../src/chrome/local-upload-files.mjs';
import {targetKey} from '../src/core/menu-identity.mjs';

function uploadConnection(runtime) {
  const port=runtime.connect({name:localUploadPort});
  let pending,closed=false;
  function disconnected(){
    closed=true;
    pending?.stop(Error('Chrome interrupted the upload. Inspect the destination before retrying.'));
    pending=undefined;
  }
  port.onDisconnect.addListener(disconnected);
  return {
    request(message,progress){
      return new Promise((resolve,reject)=>{
        if(closed){reject(Error('The upload connection is closed.'));return;}
        let keepAlive;
        const cleanup=()=>{
          clearInterval(keepAlive);
          port.onMessage.removeListener(receive);
          pending=undefined;
        };
        const receive=result=>{
          if(result.progress){progress?.(result.progress);return;}
          cleanup();
          resolve(result);
        };
        pending={stop(error){cleanup();reject(error);}};
        port.onMessage.addListener(receive);
        try{
          port.postMessage(message);
          // A long Cloudflare PUT can be silent while Chromium streams the File.
          if(progress)keepAlive=setInterval(()=>{
            try{port.postMessage({ping:true});}catch(error){pending?.stop(error);}
          },20000);
        }catch(error){pending.stop(error);}
      });
    },
    cancel(){try{port.postMessage({cancel:true});}catch{}},
    close(){if(!closed){disconnected();port.disconnect();}}
  };
}

export function wireExplorerUpload({runtime,button,picker,status,cancel,readTarget,closeMenu,refresh}) {
  let checked,checking,picking,active,revision=0;
  const same=target=>target&&targetKey(readTarget()??{})===targetKey(target);
  function update(){
    button.disabled=!!(active||picking)||!same(checked);
  }
  async function check(){
    const ticket=++revision, target=readTarget();
    checking?.close();
    checking=undefined;
    checked=undefined;
    update();
    if(!target||active||picking)return;
    let connection;
    try{
      checking=connection=uploadConnection(runtime);
      button.title='Checking write access…';
      const result=await connection.request({source:target,check:true});
      if(ticket!==revision||!same(target))return;
      if(result.state==='completed')checked=target;
      button.title=result.error??'';
    }catch{
      if(ticket===revision)button.title='Upload is unavailable. Refresh the folder and try again.';
    }finally{
      connection?.close();
      if(ticket===revision){checking=undefined;update();}
    }
  }
  button.onclick=()=>{
    if(button.disabled||!same(checked))return;
    picking=checked;
    closeMenu();
    picker.value='';
    picker.click();
  };
  picker.oncancel=()=>{picking=undefined;update();};
  cancel.onclick=()=>{
    if(!active)return;
    active.cancelled=true;active.connection.cancel();cancel.disabled=true;
    status.textContent='Cancelling upload…';
  };
  picker.onchange=async()=>{
    const target=picking;
    picking=undefined;
    const files=Array.from(picker.files);
    picker.value='';
    if(!files.length||!same(target)){update();return;}
    const batch={cancelled:false};
    let completed=0, issue='';
    try{
      batch.connection=uploadConnection(runtime);
      active=batch;
      update();
      cancel.hidden=false;cancel.disabled=false;
      for(const file of files){
        if(batch.cancelled)break;
        const ticket=crypto.randomUUID();
        try{
          status.textContent=`Uploading ${completed+1} of ${files.length} · ${file.name}`;
          await stageLocalUpload(ticket,file);
          if(batch.cancelled)break;
          const result=await batch.connection.request({source:target,ticket},event=>{
            if(batch.cancelled)return;
            if(event.phase==='verifying'||event.phase==='committing')
              status.textContent=`${event.phase==='verifying'?'Verifying':'Finishing'} ${completed+1} of ${files.length} · ${file.name}`;
          });
          if(result.state==='completed')completed++;
          else{
            issue=result.error??'Cloudflare did not confirm the upload. Inspect the destination before retrying.';
            break;
          }
        }finally{await discardLocalUpload(ticket).catch(()=>{});}
      }
    }catch(error){issue=error.message;}
    finally{
      batch.connection?.close();
      const count=completed===1?'1 file uploaded.':`${completed} files uploaded.`;
      status.textContent=completed===files.length?count:[completed?count:'',issue||
        (batch.cancelled?'Upload cancelled.':'Upload did not complete.')].filter(Boolean).join(' ');
      active=undefined;cancel.hidden=true;update();
      if(completed)try{await refresh(target);}
      catch{status.textContent+=' Refresh the folder to see the uploaded files.';}
    }
  };
  function invalidate(){
    revision++;checking?.close();checking=checked=undefined;update();
  }
  window.addEventListener('pagehide',()=>{checking?.close();active?.connection.close();});
  return {check,update,invalidate};
}
