// The compact card is a client of the same trusted API/OAuth/setup owner.
const providers={cloudflare:'Cloudflare R2','google-drive':'Google Drive',dropbox:'Dropbox',onedrive:'OneDrive'},provider=location.hash.slice(1)||'cloudflare',actions=document.querySelector('#actions'),status=document.querySelector('#status');
document.querySelector('#provider').textContent=providers[provider]??'Unknown provider';
async function api(method,params={}){const r=await chrome.runtime.sendMessage({channel:'engine',version:'3+1.1',method,params});if(r?.state!=='completed')throw Error(r?.code??'ENGINE_UNAVAILABLE');return r.data;}
function button(label,run){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await run();}catch(e){status.textContent=e.message;}finally{if(b.isConnected)b.disabled=false;}};actions.append(b);return b;}
async function refresh(){
 actions.replaceChildren();if(!Object.hasOwn(providers,provider)){status.textContent='Provider unavailable.';return;}
 if(provider!=='cloudflare'){status.textContent='This provider is not implemented yet. No file has been saved.';button('Sign in to '+providers[provider],async()=>{}).disabled=true;return;}
 const login=await api('loginStatus');if(login.state!=='CONNECTED'){status.textContent='Sign in to Cloudflare to continue. No files or buckets are created during sign-in.';button('Sign in to Cloudflare R2',async()=>{await api('loginBegin');const r=await api('inspectCloudflare');if(r.status.state==='CHOOSE_DESTINATION'){await manage();return;}await refresh();});return;}
 const result=await api('inspectCloudflare'),r=result.status;status.textContent=r.state==='READY'?'Ready. Use a fresh right-click to save.':r.state==='CHOOSE_DESTINATION'?'Choose a save destination.':r.state==='SETUP_APPROVAL_REQUIRED'?'Approve initial setup to prepare your private save connection.':r.state==='REPAIR_REQUIRED'?'The selected save destination needs repair.':r.state==='NOT_ACTIVATED'?'Activate R2 with Cloudflare to continue.':r.state==='ACCOUNT_AMBIGUOUS'?'Choose the authorized account.':(r.code??r.state);
 if(r.state==='ACCOUNT_AMBIGUOUS'){const select=document.createElement('select');select.setAttribute('aria-label','Cloudflare account');for(const a of r.accounts??[]){const option=document.createElement('option');option.value=a.id;option.textContent=a.name??a.id;select.append(option);}actions.append(select);button('Continue',async()=>{await api('selectCloudflareAccount',{accountId:select.value});await refresh();});}
 if(r.state==='NOT_ACTIVATED')button('Open Cloudflare R2 activation',async()=>{await api('openCloudflareActivation',{accountId:r.accountId});status.textContent='Complete activation with Cloudflare, then Check again.';});
 if(['SETUP_APPROVAL_REQUIRED','REPAIR_REQUIRED'].includes(r.state))button(r.state==='REPAIR_REQUIRED'?'Approve repair':'Approve initial setup',async()=>{
  if(!confirm('Prepare the authorized Worker and Durable Object, reuse/create redown only during first setup, and write a small readiness object for independent readback? Cloudflare may charge. Unknown-length saves retain staging parts and incur additional storage/operations.'))return;
  const state=await api('getConfiguration'),method=r.state==='REPAIR_REQUIRED'?'repairCloudflareDestination':'approveCloudflareSetup',out=await api(method,{accountId:r.accountId,...(r.state==='REPAIR_REQUIRED'&&r.target?{target:r.target}:{}),expectedRevision:state.product.revision,idempotencyKey:crypto.randomUUID()});if(out.state!=='completed'){status.textContent=out.code;return;}await refresh();
 });
 if(['CHOOSE_DESTINATION','DESTINATION_UNAVAILABLE'].includes(r.state))button('Manage Destinations',manage);
 button('Check again',refresh);
}
async function manage(){await api('openCloudflareDestinations');window.close();}
void refresh().catch(e=>{status.textContent=e.message;button('Retry',refresh);});

window.addEventListener('hashchange',()=>location.reload());
