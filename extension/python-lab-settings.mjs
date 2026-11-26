// The existing Shelf owns consent. Python sees only the narrow native protocol.
const channel='redown-python-laboratory';
const command='lab-local\\.venv\\Scripts\\redown-lab.exe pair --code ';
const messages={
 AUTH_REQUIRED:'Connect Cloudflare in Remotes, then reopen Settings.',
 REAUTH_REQUIRED:'Reconnect Cloudflare in Remotes.',
 AUTH_SESSION_CHANGED:'Cloudflare authorization changed. Start a new laboratory session.',
 AUTHORIZATION_REVOKED:'Cloudflare authorization ended.',
 NATIVE_HOST_NOT_REGISTERED:'Install the Python native helper from CMD, then start the session again.',
 NATIVE_HOST_DISCONNECTED:'The native helper disconnected. Start a new session to reconnect.',
 NATIVE_PERMISSION_REVOKED:'Chrome removed native messaging access.',
 WORKER_SETUP_REQUIRED:'Choose an existing QA bucket with a prepared REDOWN Worker.',
 WORKER_UPGRADE_APPROVAL_REQUIRED:'The selected QA bucket needs the normal REDOWN Worker update before use.',
 LAB_SESSION_ENDED:'Session ended.',
 LAB_AUTHORIZATION_EXPIRED:'Session expired. Start another session when ready.'
};

async function request(action,input={}){
 const answer=await chrome.runtime.sendMessage({channel,action,input});
 if(!answer?.ok)throw Error(answer?.code??'LAB_REQUEST_FAILED');
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
  <button type="button" data-lab-config>Configure session</button>
  <div data-lab-form hidden>
   <label>Cloudflare account <select data-lab-account></select></label>
   <label>Existing QA bucket <select data-lab-bucket></select></label>
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
 let next='',form=false,busy=false,bucketEpoch=0,recoveryEpoch=0;
 const report=error=>{el('error').textContent=error?(messages[error.message]??error.message):'';};
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
  if(!append){
   el('bucket').replaceChildren();option(el('bucket'),'','Choose existing QA bucket');next='';
   el('approved').checked=false;
  }
  el('more').hidden=true;
  const accountId=el('account').value;
  if(!accountId){await recovery();return;}
  const {buckets,cursor}=await request('buckets',{accountId,cursor:next});
  if(epoch!==bucketEpoch)return;
  for(const row of buckets)option(el('bucket'),row.name,row.name);
  next=cursor;
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
  if(code&&state==='OFF'&&!busy)report(Error(code));
 }
 const refresh=async()=>render(await request('status'));
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
  const accountId=el('account').value,bucketName=el('bucket').value,mode=el('mode').value;
  const scopeId=mode==='read-only'?el('recovery').value:null;
  if(!accountId||!bucketName||!el('approved').checked||scopeId==='')throw Error('Choose the QA target and approve access first.');
  // permissions.request must run in the owner's direct Chrome click gesture.
  if(!await chrome.permissions.request({permissions:['nativeMessaging']}))throw Error('Chrome did not grant native messaging.');
  el('start').disabled=true;
  try{
   render(await request('start',{accountId,bucketName,mode,minutes:Number(el('duration').value),scopeId}));
   form=false;el('approved').checked=false;
  }finally{el('start').disabled=false;}
 });
 el('copy').onclick=act(async()=>{
  const text=el('command').value;
  if(!text)return;
  try{await navigator.clipboard.writeText(text);}
  catch{el('command').select();throw Error('Press Ctrl+C to copy the selected command.');}
  el('error').textContent='CMD copied.';
 });
 el('end').onclick=async()=>{
  form=false;report();
  try{render(await request('end'));}catch(error){report(error);}
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
