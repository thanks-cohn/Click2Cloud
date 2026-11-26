// The existing Shelf owns consent. Python sees only the narrow native protocol.
const channel='redown-python-laboratory';
const command='lab-local\\.venv\\Scripts\\redown-lab.exe pair --code ';
const messages={
 AUTH_REQUIRED:'Connect Cloudflare in Remotes, then reopen Settings.',
 REAUTH_REQUIRED:'Reconnect Cloudflare in Remotes.',
 AUTH_SESSION_CHANGED:'Cloudflare authorization changed. Start a new laboratory session.',
 AUTHORIZATION_REVOKED:'Cloudflare authorization ended.',
 NATIVE_PERMISSION_DENIED:'Chrome did not grant native messaging.',
 NATIVE_API_UNAVAILABLE:'Chrome granted native messaging, but this REDOWN worker cannot use it yet. Once REDOWN work is idle, reload REDOWN once from chrome://extensions, reopen Settings and retry.',
 NATIVE_HOST_NOT_REGISTERED:'Install the Python native helper from CMD, then start the session again.',
 NATIVE_HOST_LAUNCH_FAILED:'Chrome could not launch the Python helper. Check the installation from CMD and retry.',
 NATIVE_HOST_FORBIDDEN:'Chrome blocked access to the Python helper. Check the profile policy and registered extension ID.',
 NATIVE_HOST_DISCONNECTED:'The native helper disconnected. Start a new session to reconnect.',
 NATIVE_HOST_EXITED:'The native helper exited. Check the installation and start a new session.',
 NATIVE_HANDSHAKE_TIMEOUT:'The Python helper did not become ready in time. Check the installation and retry.',
 NATIVE_HANDSHAKE_INVALID:'The Python helper sent an unexpected ready message. Reinstall the helper from this checkout.',
 NATIVE_PERMISSION_REVOKED:'Chrome removed native messaging access.',
 LAB_WORKER_RESTARTED:'The REDOWN worker restarted. Start a new laboratory session.',
 LAB_EXTENSION_UNAVAILABLE:'Reopen REDOWN Settings and try again.',
 WORKER_SETUP_REQUIRED:'Choose an existing QA bucket with a prepared REDOWN Worker.',
 WORKER_UPGRADE_APPROVAL_REQUIRED:'The selected QA bucket needs the normal REDOWN Worker update before use.',
 LAB_SESSION_ENDED:'Session ended.',
 LAB_AUTHORIZATION_EXPIRED:'Session expired. Start another session when ready.'
};

async function request(action,input={}){
 let answer;
 try{answer=await chrome.runtime.sendMessage({channel,action,input});}
 catch{throw Error('LAB_EXTENSION_UNAVAILABLE');}
 if(!answer?.ok)throw Object.assign(Error(answer?.code??'LAB_REQUEST_FAILED'),{recovery:answer?.recovery});
 return answer.data;
}
function option(select,value,label){
 const item=document.createElement('option');item.value=value;item.textContent=label;select.append(item);
}

export function mountPythonLabSettings(page) {
 const card=document.createElement('section');
 card.className='card';
 card.innerHTML=`<h2>Python Laboratory</h2>
  <p role="status" data-lab-status>Off</p>
  <p role="status" data-lab-session-notice hidden></p>
  <button type="button" data-lab-config>Configure session</button>
  <button type="button" data-lab-preflight>Check readiness</button>
  <button type="button" data-lab-export>Export diagnostics</button>
  <p role="status" data-lab-preflight-status hidden></p>
  <div data-lab-form hidden>
   <label>Cloudflare account <select data-lab-account></select></label>
   <label>Existing QA bucket <select data-lab-bucket></select></label>
   <p role="status" data-lab-bucket-status hidden></p>
   <button type="button" data-lab-bucket-retry hidden>Retry bucket list</button>
   <button type="button" data-lab-more hidden>More buckets</button>
   <label>Access <select data-lab-mode>
    <option value="read-write">Read and write a fresh QA prefix</option>
    <option value="read-only">Read a previous QA prefix for recovery</option>
   </select></label>
   <label data-lab-recovery-row hidden>Previous QA scope <select data-lab-recovery></select></label>
   <label>Session duration <select data-lab-duration>
    <option>15</option><option selected>30</option><option>60</option>
   </select> minutes</label>
   <label><input type="checkbox" data-lab-approved> I approve this bucket for the selected QA access and its provider usage.</label>
   <p class="muted" data-lab-limits>One transfer at a time, 8 MiB per file, up to 640 MiB of modeled provider traffic.</p>
   <button type="button" class="primary" data-lab-start>Start session</button>
  </div>
  <div data-lab-active hidden>
   <p class="muted wrap-text" data-lab-scope></p>
   <label data-lab-command-row hidden>Windows CMD from the repository root
    <input data-lab-command readonly type="text" spellcheck="false">
   </label>
   <button type="button" data-lab-copy hidden>Copy CMD</button>
   <button type="button" data-lab-new hidden>New pairing code</button>
   <button type="button" data-lab-end>End and revoke</button>
  </div>
  <p role="status" data-lab-error></p>`;
 page.append(card);
 const el=(key)=>card.querySelector('[data-lab-'+key+']');
 let next='',form=false,busy=false,bucketEpoch=0,recoveryEpoch=0,sessionEpoch=0;
 const report=error=>{el('error').textContent=error?(messages[error.message]??
  (error.recovery?`${error.message}. ${error.recovery}`:error.message)):'';};
 const act=fn=>async()=>{
  if(busy)return;
  busy=true;report();
  try{await fn();}catch(error){report(error);}finally{busy=false;}
 };
 async function recovery(){
  const epoch=++recoveryEpoch;
  const readOnly=el('mode').value==='read-only';
  el('recovery-row').hidden=!readOnly;
  el('recovery').replaceChildren();option(el('recovery'),'','Choose previous QA scope');
  const accountId=el('account').value,bucketName=el('bucket').value;
  if(!readOnly||!accountId||!bucketName)return;
  const {scopes}=await request('recovery',{accountId,bucketName});
  if(epoch!==recoveryEpoch||accountId!==el('account').value||bucketName!==el('bucket').value)return;
  for(const row of scopes)option(el('recovery'),row.id,new Date(row.created).toLocaleString()+' · '+row.id);
  if(!scopes.length)report(Error('No recovery scope is recorded for this bucket.'));
 }
 async function bucketPage(append){
  const epoch=++bucketEpoch;
  recoveryEpoch++;
  const note=el('bucket-status'),retry=el('bucket-retry'),bucket=el('bucket');
  if(!append){
   bucket.replaceChildren();option(bucket,'','Choose existing QA bucket');next='';
   el('approved').checked=false;
  }
  retry.hidden=true;
  el('more').hidden=true;
  const accountId=el('account').value;
  bucket.disabled=!accountId||!append;
  note.hidden=!accountId;
  if(!accountId){await recovery();return;}
  note.textContent='Loading QA buckets…';
  let buckets,cursor;
  try{({buckets,cursor}=await request('buckets',{accountId,cursor:next}));}
  catch(error){
   if(epoch!==bucketEpoch||!card.isConnected)return;
   note.textContent=`Could not list QA buckets (${error.message}).`;
   retry.onclick=act(()=>bucketPage(append));
   retry.hidden=false;
   return;
  }
  if(epoch!==bucketEpoch||!card.isConnected)return;
  const known=new Set([...bucket.options].map(row=>row.value));
  for(const row of buckets)if(!known.has(row.name)){option(bucket,row.name,row.name);known.add(row.name);}
  next=cursor;
  bucket.disabled=bucket.options.length===1;
  note.hidden=!bucket.disabled;
  note.textContent=next?'No QA buckets on this page.':'No existing QA buckets found for this account.';
  el('more').hidden=!next;
  await recovery();
 }
 function render(data){
  if(!card.isConnected)return;
  const {state,code}=data,active=state!=='OFF';
  el('status').textContent=({OFF:'Off',STARTING:'Checking selected bucket and native helper…',
   PAIRING:'Ready to pair',PAIRED:'Paired · CLI idle',CONNECTED:'Connected to Python CLI'})[state]??'Off';
  el('config').hidden=active;
  el('active').hidden=!active;
  el('form').hidden=active||!form;
  el('scope').textContent=data.prefix?
   `${data.mode==='read-write'?'Read and write':'Read only'} · ${data.bucketName}/${data.prefix} · Expires ${new Date(data.expiresAt).toLocaleTimeString()}`:'';
  const valid=!!data.pairCode&&Date.now()<data.codeExpiresAt;
  const cmd=valid?command+data.pairCode:'';
  if(el('command').value!==cmd)el('command').value=cmd;
  el('command-row').hidden=!valid;el('copy').hidden=!valid;
  el('new').hidden=!data.ready||state==='CONNECTED'||valid;
  const notice=el('session-notice');
  notice.hidden=!code||active;
  notice.textContent=code==='NATIVE_API_UNAVAILABLE'&&data.nativeApiAvailable===true?
   'Native messaging is now available. Start a new session.':messages[code]??code??'';
 }
 const refresh=async()=>{
  const epoch=sessionEpoch,data=await request('status');
  if(epoch===sessionEpoch)render(data);
  return data;
 };
 const selection=()=>{
  const accountId=el('account').value,bucketName=el('bucket').value,mode=el('mode').value;
  return {accountId,bucketName,mode,scopeId:mode==='read-only'?el('recovery').value:null,
   minutes:Number(el('duration').value)};
 };
 const clearApproval=()=>{el('approved').checked=false;};
 el('duration').onchange=clearApproval;
 el('config').onclick=act(async()=>{
  form=true;el('form').hidden=false;
  el('account').replaceChildren();option(el('account'),'','Choose account');
  const {accounts}=await request('accounts');
  for(const row of accounts)option(el('account'),row.id,row.name??row.id);
  if(accounts.length===1)el('account').value=accounts[0].id;
  await bucketPage(false);
 });
 const update=work=>void work().catch(report);
 el('account').onchange=()=>update(()=>bucketPage(false));
 el('more').onclick=act(()=>bucketPage(true));
 el('bucket').onchange=el('mode').onchange=()=>{clearApproval();update(recovery);};
 el('recovery').onchange=clearApproval;
 el('start').onclick=act(async()=>{
  const input=selection();
  if(!input.accountId||!input.bucketName||!el('approved').checked||input.scopeId==='')throw Error('Choose the QA target and approve access first.');
  const epoch=++sessionEpoch;
  // permissions.request must run in the owner's direct Chrome click gesture.
  el('start').disabled=true;
  try{
   try{await chrome.permissions.request({permissions:['nativeMessaging']});}catch{}
   // The worker checks the actual grant and records denial in the same report.
   const data=await request('start',input);
   if(epoch!==sessionEpoch)return;
   form=false;el('approved').checked=false;
   ++sessionEpoch;
   render(data);
  }catch(error){
   if(epoch===sessionEpoch){
    const observed=await refresh().catch(()=>null);
    if(epoch===sessionEpoch&&observed?.code!==error.message)throw error;
   }
  }finally{el('start').disabled=false;}
 });
 el('preflight').onclick=act(async()=>{
  const input=form?selection():{};
  const note=el('preflight-status');
  note.hidden=false;note.textContent='Checking readiness…';
  try{
   const preflight=await request('preflight',input.accountId&&input.bucketName&&input.scopeId!==''?input:{});
   note.textContent=preflight.firstFailure?
    `${preflight.firstFailure.stage}: ${preflight.firstFailure.recovery} See Export diagnostics for all checks.`:
    preflight.outcome==='PASS'?'Readiness checks passed. The transfer round trip has not been tested.':
     'Local checks complete. Choose a QA bucket to check its readiness.';
  }catch(error){note.hidden=true;throw error;}
 });
 el('export').onclick=act(async()=>{
  const report=await request('diagnostics');
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;link.download='redown-python-lab-diagnostics.json';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
 });
 el('copy').onclick=act(async()=>{
  const text=el('command').value;
  if(!text)return;
  try{await navigator.clipboard.writeText(text);}
  catch{el('command').select();throw Error('Press Ctrl+C to copy the selected command.');}
  el('error').textContent='CMD copied.';
 });
 el('end').onclick=async()=>{
  const epoch=++sessionEpoch;
  form=false;report();
  try{const data=await request('end');if(epoch===sessionEpoch)render(data);}
  catch(error){if(epoch===sessionEpoch)report(error);}
 };
 el('new').onclick=act(async()=>render(await request('newCode')));
 // Poll only while this card is mounted. Polling is local and does not contact Cloudflare.
 async function tick(){
  if(!card.isConnected)return;
  try{await refresh();}catch(error){report(error);}
  if(card.isConnected)setTimeout(tick,1500);
 }
 void tick();
}
