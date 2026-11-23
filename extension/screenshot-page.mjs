import {targetKey} from '../src/core/menu-identity.mjs';
import {screenshotCommands,screenshotDefaultName,screenshotPreference,screenshotRulePageSize,websiteCondition} from '../src/screenshot/rules.mjs';
import {chromeCommandBindings,openChromeShortcuts,screenshotShortcutSetupKey} from '../src/chrome/command-bindings.mjs';

const scopes=[['all','All websites'],['domain','Entire domain + subdomains'],['host','Exact hostname'],['url','Specific full URL']];
const scopeName=kind=>scopes.find(([id])=>id===kind)?.[1];
const describeSite=site=>site.value?`${site.value} · ${scopeName(site.kind)}`:scopeName(site.kind);
import {accountLabel,destinationPath} from './cloudflare-labels.mjs';
const screenshotMessages={
 SCREENSHOT_HOST_INVALID:'Enter a hostname such as example.com.',
 SCREENSHOT_URL_INVALID:'Enter a full HTTP or HTTPS page URL.',
 SCREENSHOT_RULE_CHANGED:'This rule changed in another Shelf. Reopen it to edit the latest version.',
 SCREENSHOT_RULE_NOT_FOUND:'This rule was deleted. Reopen Screenshots to refresh the cards.',
 SCREENSHOT_FOLDER_UNAVAILABLE:'This folder could not be verified in Cloudflare. Select an available directory.',
 SCREENSHOT_FOLDER_REQUEST_EXPIRED:'The screenshot folder request expired.',
 SCREENSHOT_PAGE_CHANGED:'The active tab or page changed during capture.',
 SCREENSHOT_PAGE_UNSUPPORTED:'Chrome can capture supported HTTP and HTTPS webpages.',
 SCREENSHOT_PERMISSION_REQUIRED:'Chrome did not grant access to capture this tab.',
 CHROME_CAPTURE_PERMISSION_DENIED:'Chrome denied capture for this tab. Set the shortcut to In Chrome, then try it on a loaded webpage.',
 SCREENSHOT_CAPTURE_POLICY_BLOCKED:'Chrome blocked screenshots for this page or browser profile.',
 TAB_URL_UNAVAILABLE:'Chrome did not provide the active page URL. Focus the webpage and press the shortcut again.',
 SCREENSHOT_WINDOW_UNAVAILABLE:'Focus a normal Chrome window and try again.',
 SCREENSHOT_PNG_INVALID:'Chrome returned an invalid screenshot image.',
 SCREENSHOT_NO_MATCHING_RULES:'Create or enable a matching rule in More → Screenshots.',
 R2_BUCKET_ACCESS_DENIED:'Check your Cloudflare access to this bucket, then retry from History.',
 SELECTED_BUCKET_MISSING:'This bucket is no longer available to the connected Cloudflare account.',
 INSUFFICIENT_SCOPE:'Reconnect Cloudflare with permission to read and write R2 objects.',
 WRONG_ACCOUNT:'Reconnect the Cloudflare account that owns this bucket.',
 AUTH_SESSION_CHANGED:'The Cloudflare session changed. Reconnect the original account and retry.',
 REAUTH_REQUIRED:'Reconnect Cloudflare in Remotes and retry from History.',
 TRANSIENT_API_FAILURE:'Cloudflare could not be reached. Retry from History.',
 R2_OBJECT_UNCONFIRMED:'R2 did not return the exact file for verification.',
 R2_OBJECT_CONFLICT:'R2 returned different bytes at this key. This file needs inspection.',
 R2_UPLOAD_METADATA_MISMATCH:'R2 reported an unexpected object key or size. This file needs inspection.',
 SCREENSHOT_CAPTURE_RATE_LIMIT:'Chrome limited capture frequency. Wait before pressing a shortcut again.',
 SCREENSHOT_BUSY:'Two screenshots are in progress. Try the shortcut again when one finishes.',
 SCREENSHOT_WORKER_UPDATE_REQUIRED:'Update the existing Click2Cloud Worker to enable screenshots.',
 SCREENSHOT_CROSS_BUCKET_UNSUPPORTED:'This capture can write to one account and bucket. This directory is outside its Worker binding.',
 SCREENSHOT_ORIGINAL_UNAVAILABLE:'The original image is unavailable for retry.',
 SCREENSHOT_OBJECT_UNCONFIRMED:'The Worker could not independently confirm this file.',
 WORKER_SETUP_REQUIRED:'Prepare this bucket’s Click2Cloud Worker in Remotes.',
 WORKER_DESTINATION_SCOPE_REQUIRED:'The existing Worker does not authorize this directory.',
 AUTH_REQUIRED:'Connect Cloudflare in Remotes.',
 SCOPE_UNAUTHORIZED:'This Cloudflare account is unavailable or unauthorized.'
};
export const screenshotMessage=(code,fallback)=>screenshotMessages[code]??fallback;
export function screenshotFeedback({state,confirmed,total,retryable,code,recorded,transient}){
 if(state==='uploading')return `Screenshot captured. Uploading to ${total} ${total===1?'folder':'folders'}…`;
 if(recorded===false)return 'The screenshot result could not be added to History.';
 if(confirmed)return `Saved to ${confirmed} of ${total} locations.${retryable?` Retry remaining ${retryable} in History.`:''}`;
 if(transient)return screenshotMessage(code,'The screenshot could not start. Try again after checking your Cloudflare connection.');
 return screenshotMessage(code,retryable?'Screenshot captured. Upload delayed. Retry in History.':'Open History for the screenshot result.');
}
export async function screenshotRequest(method,params={}){
 const result=await chrome.runtime.sendMessage({channel:'screenshot',method,params});
 if(result?.state==='completed')return result.data;
 throw Object.assign(Error(result?.code??'SCREENSHOT_REQUEST_FAILED'),{code:result?.code,httpStatus:result?.httpStatus,providerCodes:result?.providerCodes});
}

export function createScreenshotPage({api,dialog,closeDialog,esc,connectedAccounts=()=>[]}){
 let mounted;
 function stop(){mounted?.stop();mounted=undefined;}
 const describeTarget=target=>{
  const accounts=connectedAccounts(),account=accounts.find(item=>item.id===target?.accountId);
  return destinationPath(target)+(account&&accounts.length>1?' · '+accountLabel(account,accounts):'');
 };
 const element=(tag,text)=>Object.assign(document.createElement(tag),text===undefined?{}:{textContent:text});
 const button=(label,action)=>{
  const control=element('button',label);
  control.type='button';control.onclick=action;
  return control;
 };
 function sites(holder,websites=[],editable=false){
  function add(site,focus=false){
   const row=element('div');
   row.className='screenshot-site';
   row.innerHTML=`<select aria-label="Website scope">${scopes.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select>
    <input aria-label="Website" type="text" autocomplete="off" spellcheck="false">`;
   const scope=row.querySelector('select'),input=row.querySelector('input');
   scope.value=site.kind;input.value=site.value??'';
   function sync(){
    input.required=scope.value!=='all';input.hidden=!input.required;
    input.placeholder=scope.value==='url'?'https://example.com/page':'example.com';
   }
   scope.onchange=sync;sync();
   if(editable)row.append(button('Remove',()=>row.remove()));
   holder.append(row);
   if(focus)scope.focus();
  }
  for(const website of websites)add(website);
  if(editable)holder.after(button('Add website',()=>add({kind:'domain'},true)));
  return ()=>[...holder.children].map(row=>websiteCondition({kind:row.querySelector('select').value,value:row.querySelector('input').value}));
 }
 function picker(holder,toggle,isSelected){
  let ticket=0,accounts=[];
  function view(place={}){void page(place);}
  async function page(place,cursor=''){
   const requested=++ticket;
   if(!cursor)holder.replaceChildren();
   const oldMore=holder.querySelector('[data-picker-more]');
   if(oldMore)oldMore.remove();
   const {account,target}=place;
   if(!cursor){
    const title=element('strong',target?target.bucketName+'/'+target.prefix:account?accountLabel(account,accounts):'Cloudflare accounts');
    const path=element('div');path.className='screenshot-picker-path';path.append(title);
    if(account)path.prepend(button('Back',()=>{
     if(!target){view();return;}
     if(!target.prefix){view({account});return;}
     const trimmed=target.prefix.slice(0,-1);
     view({account,target:{...target,prefix:trimmed.slice(0,trimmed.lastIndexOf('/')+1)}});
    }));
    holder.append(path);
   }
   const progress=element('p','Loading…');progress.setAttribute('role','status');holder.append(progress);
   try{
    let result;
    if(target)result=await api('listFolders',{source:target,...(cursor?{cursor}:{})},{quiet:true});
    else if(account)result=await api('listAuthorizedBuckets',{accountId:account.id,...(cursor?{cursor}:{})},{quiet:true});
    else result=await api('listAccounts',{}, {quiet:true});
    if(requested!==ticket||!holder.isConnected)return;
    if(result.state!=='completed')throw Error(result.code);
    const data=result.data,rows=target?data.entries.filter(item=>item.folder):account?data.buckets:data.accounts;
    if(!target&&!account)accounts=data.accounts;
    if(!cursor&&!rows.length)progress.textContent=target?'No subfolders.':account?'No authorized buckets.':'Connect Cloudflare in Remotes to select a directory.';
    else progress.remove();
    for(const item of rows){
     const name=target?item.displayName??item.key:account?item.name:accountLabel(item,accounts);
     const next=target?{account,target:{...target,prefix:item.key}}:account?{account,target:{
      provider:'cloudflare',accountId:account.id,connectionId:'cloudflare:'+account.id,bucketName:item.name,prefix:''}}:{account:item};
     if(!next.target){holder.append(button(name,()=>view(next)));continue;}
     const row=element('div'),label=element('label'),check=element('input');
     row.className='screenshot-picker-row';
     check.type='checkbox';check.dataset.directoryKey=targetKey(next.target);check.checked=isSelected(next.target);
     check.onchange=()=>toggle(next.target);
     label.append(check,' '+name);
     const browse=button('›',()=>view(next));browse.setAttribute('aria-label','Browse '+name);
     row.append(label,browse);holder.append(row);
    }
    if(data.cursor&&data.cursor!==cursor){
     const more=button('Load more',()=>void page(place,data.cursor));more.dataset.pickerMore='';holder.append(more);
    }
   }catch(error){if(requested===ticket)progress.textContent=screenshotMessage(error.code,'Could not list Cloudflare directories. Check access in Remotes.');}
  }
  view();
 }
 function directories(holder,initial,onChange,{multiple=false}={}){
  let targets=[...initial];
  const count=element('p'),list=element('div'),browser=element('div');
  count.setAttribute('aria-live','polite');
  const isSelected=target=>targets.some(item=>targetKey(item)===targetKey(target));
  function toggle(target){
   if(isSelected(target))targets=targets.filter(item=>targetKey(item)!==targetKey(target));
   else targets=multiple?[...targets,target]:[target];
   render();
  }
  const open=button('Choose folders',()=>{
   browser.hidden=!browser.hidden;
   open.textContent=browser.hidden?'Choose folders':'Hide folders';
   open.setAttribute('aria-expanded',String(!browser.hidden));
   if(!browser.hidden&&!browser.hasChildNodes())picker(browser,toggle,isSelected);
  });
  open.setAttribute('aria-expanded','false');
  browser.className='screenshot-picker';
  browser.hidden=true;
  holder.append(count,list,open,browser);
  function render(){
   count.textContent=targets.length?`${targets.length} selected`:'No folders selected';
   list.replaceChildren(...targets.map(target=>{
    const row=element('div');row.className='screenshot-destination';
    const remove=button('Remove',()=>toggle(target));
    remove.setAttribute('aria-label','Remove '+describeTarget(target));
    row.append(element('span',describeTarget(target)),remove);
    return row;
   }));
   const keys=new Set(targets.map(targetKey));
   for(const check of browser.querySelectorAll('[data-directory-key]'))check.checked=keys.has(check.dataset.directoryKey);
   onChange?.(targets.length);
  }
  render();
  return ()=>targets;
 }
 async function editor(initial,after){
  const bindings=await chromeCommandBindings(chrome).catch(()=>new Map());
  const editingDefault=!initial.ruleId;
  dialog(editingDefault?'Set up Default Screenshots':'Edit Screenshot Rule','<form id="screenshot-editor"><label>Name <input name="rule-name" required></label><fieldset><legend>Websites · Any Match</legend><div data-websites></div></fieldset><fieldset><legend>Cloudflare Directories</legend><div data-directories></div></fieldset><button class="primary">Save</button> <button type="button" data-cancel>Cancel</button><p role="status"></p></form>');
  const form=document.querySelector('#screenshot-editor'),name=form.elements['rule-name'];
  name.value=initial.name;name.readOnly=editingDefault;
  form.querySelector('[data-cancel]').onclick=closeDialog;
  const readSites=sites(form.querySelector('[data-websites]'),initial.websites,!editingDefault);
  if(editingDefault)form.querySelector('[data-websites] select').disabled=true;
  const readTargets=directories(form.querySelector('[data-directories]'),initial.destinations,null,{multiple:true});
  const shortcut=shortcutField(form,initial.shortcut,bindings);
  wireSave(form,()=>({shortcut:shortcut.value,ruleId:initial.ruleId,expectedRevision:initial.revision,name:name.value,websites:readSites(),destinations:readTargets()}),config=>{
   closeDialog();after(config,initial.ruleId);
  },editingDefault?'save-default':'save');
 }
 function wireSave(form,fields,after,method='save'){
  const save=[...form.querySelectorAll('button')].find(control=>control.type==='submit'),feedback=form.querySelector('[role=status]');
  form.onsubmit=async event=>{
   event.preventDefault();
   if(save.disabled)return;
   save.disabled=true;
   try{
    const params=fields();
    if(!params.destinations.length){feedback.textContent='Choose a Cloudflare directory.';return;}
    const config=await screenshotRequest(method,params);
    if(form.isConnected)after(config);
   }catch(error){feedback.textContent=screenshotMessage(error.code,'Could not save this screenshot rule.');}
   finally{save.disabled=false;}
  };
 }
 function shortcutField(form,value,bindings){
  const label=element('label','Screenshot Shortcut ');
  const select=element('select');
  select.append(new Option('',''),...screenshotCommands.map(id=>new Option(shortcutLabel(id,bindings),id)));
  select.value=value??'';label.append(select);
  form.querySelector('button[type=submit],button.primary').before(label);
  return select;
 }
 const suggestedKey=id=>chrome.runtime.getManifest?.()?.commands?.[id]?.suggested_key?.default??
  (id===screenshotCommands[0]?'Alt+Q':'Ctrl+Shift+Y');
 const shortcutLabel=(id,bindings)=>bindings?.get(id)??(suggestedKey(id)+(bindings?' command (unassigned)':' command (suggested)'));
 function shortcutStatus(hint,updateLabels){
  let bindings,offered=false,revision=0;
  const statuses=element('p'),help=element('span'),feedback=element('span');
  statuses.setAttribute('aria-live','polite');feedback.setAttribute('role','status');
  const labels=screenshotCommands.map(id=>{
   const label=element('span');
   label.dataset.shortcutStatus=id;return label;
  });
  statuses.append(labels[0],' · ',labels[1],help);
  const change=button('Chrome shortcut settings',()=>{
   feedback.textContent='';
   void openChromeShortcuts(chrome).catch(()=>{feedback.textContent=' Open chrome://extensions/shortcuts in Chrome.';});
  });
  const notice=element('p','Set up missing screenshot shortcut ');
  notice.dataset.shortcutSetup='';
  notice.append(button('Dismiss',finish));
  hint.append(statuses,change,feedback,notice);
  function finish(){
   offered=false;notice.hidden=true;
   void chrome.storage.local.set({[screenshotShortcutSetupKey]:false}).catch(()=>{
    if(hint.isConnected)feedback.textContent=' The browser could not save this dismissal.';
   });
  }
  function paint(){
   const missing=bindings&&screenshotCommands.some(id=>!bindings.get(id));
   for(const [index,id] of screenshotCommands.entries()){
    const suggested=suggestedKey(id),key=bindings?.get(id);
    const text=key?key+' — Assigned'+(key!==suggested?' (suggested '+suggested+')':''):
     suggested+' — '+(bindings?'Unassigned':bindings===null?'Status unavailable':'Checking assignment…');
    if(labels[index].textContent!==text)labels[index].textContent=text;
   }
   const tip=missing?' · Choose a shortcut in Chrome.':'';
   if(help.textContent!==tip)help.textContent=tip;
   change.hidden=bindings===undefined||Boolean(bindings&&!missing);
   notice.hidden=!offered||!missing;
   if(offered&&bindings&&!missing)finish();
  }
  paint();
  return {
   async refresh(){
    const ticket=++revision;
    const next=typeof chrome.commands?.getAll==='function'?await chromeCommandBindings(chrome).catch(()=>null):null;
    if(ticket!==revision||!hint.isConnected)return;
    bindings=next;updateLabels(next);paint();
   },
   setOffer(value){if(hint.isConnected){offered=value===true;paint();}},
  };
 }
 async function mount(parent){
  stop();
  const page=element('section');page.className='page screenshot-page';
  page.innerHTML='<h1>Screenshots</h1><div class="muted" data-keys></div><form id="screenshot-form"><fieldset><legend>Website</legend><div data-websites></div></fieldset><fieldset><legend>Cloudflare Directories</legend><div data-directories></div></fieldset><button class="primary">Save</button><p role="status"></p></form><section><h2>Saved Screenshot Rules</h2><p class="muted">Every active rule that matches the page receives the screenshot.</p><div data-cards></div><div class="screenshot-pagination" data-pages></div><p data-rule-status role="status"></p></section>';
  parent.replaceChildren(page);
  const form=page.querySelector('form'),cards=page.querySelector('[data-cards]'),pager=page.querySelector('[data-pages]'),feedback=page.querySelector('[data-rule-status]');
  const readSites=sites(form.querySelector('[data-websites]'),[{kind:'all'}]);
  const readTargets=directories(form.querySelector('[data-directories]'),[],null,{multiple:true});
  let config,pageIndex=0,bindings=null;
  const shortcut=shortcutField(form,null,bindings);
  function render(next,focusId){
   if(!page.isConnected)return;
   config=next;
   const all=next.rules,last=Math.max(0,Math.ceil(all.length/screenshotRulePageSize)-1);
   pageIndex=Math.min(pageIndex,last);
   const start=pageIndex*screenshotRulePageSize;
   cards.replaceChildren(...all.slice(start,start+screenshotRulePageSize).map(rule=>{
    const card=element('article');card.className='screenshot-card';
    const edit=button('',()=>void editor(rule,render));
    edit.dataset.ruleEdit=rule.ruleId;
    edit.className='screenshot-card-body';
    edit.append(element('strong',rule.name),
     element('span',rule.websites.length?rule.websites.map(describeSite).join(' or '):'All websites'),
     element('span',rule.destinations.map(describeTarget).join(' · ')));
    if(rule.shortcut){
     const label=element('span',shortcutLabel(rule.shortcut,bindings));label.dataset.ruleShortcut=rule.shortcut;edit.append(label);
    }
    const active=button(rule.active?'Active':'Inactive',()=>void mutate('toggle',{ruleId:rule.ruleId,active:!rule.active},rule.ruleId));
    active.setAttribute('aria-pressed',String(rule.active));
    active.setAttribute('aria-label',(rule.active?'Active':'Inactive')+' · '+rule.name);
    const remove=button('×',()=>void mutate('delete',{ruleId:rule.ruleId}));
    remove.setAttribute('aria-label','Delete '+rule.name);
    card.append(edit,active,remove);
    return card;
   }));
   if(!next.defaultHandled){
    const card=element('article');card.className='screenshot-card';card.dataset.defaultOffer='';
    const text=element('div');text.className='screenshot-card-body';
    text.append(element('strong',screenshotDefaultName),element('span','All websites · redown / screenshots/'),element('span','Choose a destination to activate.'));
    const choose=button('Set up',async()=>{
     choose.disabled=true;
     try{
      const target=await screenshotRequest('suggest-default');
      if(page.isConnected)await editor({name:screenshotDefaultName,websites:[{kind:'all'}],destinations:target?[target]:[]},render);
     }catch{feedback.textContent='Could not open the default screenshot setup.';}
     finally{choose.disabled=false;}
    });
    const dismiss=button('×',()=>void mutate('dismiss-default',{}));
    dismiss.setAttribute('aria-label','Dismiss Default Screenshots');
    card.append(text,choose,dismiss);cards.prepend(card);
   }
   const prev=button('Previous',()=>{pageIndex--;render(config);pager.querySelector('button:not([disabled])')?.focus();});
   const nextPage=button('Next',()=>{pageIndex++;render(config);pager.querySelector('button:not([disabled])')?.focus();});
   prev.disabled=!pageIndex;nextPage.disabled=pageIndex>=last;
   pager.replaceChildren(prev,element('span',all.length?`${start+1}–${Math.min(start+screenshotRulePageSize,all.length)} of ${all.length}`:''),nextPage);
   pager.hidden=!last;
   if(focusId)cards.querySelector('[data-rule-edit="'+focusId+'"]')?.focus({preventScroll:true});
  }
  async function mutate(method,params,focusId){
   try{render(await screenshotRequest(method,params),focusId);feedback.textContent=method==='delete'?'Rule deleted.':'';}
   catch(error){feedback.textContent=screenshotMessage(error.code,'Could not update this screenshot rule.');}
  }
  wireSave(form,()=>{const websites=readSites();return {shortcut:shortcut.value,name:websites[0]?.value??'All websites',websites,destinations:readTargets()};},saved=>{
   pageIndex=0;render(saved);form.querySelector('[role=status]').textContent='Rule saved.';
  });
  const shortcuts=shortcutStatus(page.querySelector('[data-keys]'),next=>{
   bindings=next;
   for(const option of shortcut.options)if(option.value)option.textContent=shortcutLabel(option.value,bindings);
   for(const label of cards.querySelectorAll('[data-rule-shortcut]'))label.textContent=shortcutLabel(label.dataset.ruleShortcut,bindings);
  });
  void shortcuts.refresh();
  void chrome.storage.local.get(screenshotShortcutSetupKey).then(value=>shortcuts.setOffer(value[screenshotShortcutSetupKey]),()=>{});
  const updated=(changes,area)=>{
   if(!page.isConnected||area!=='local')return;
   if(changes[screenshotShortcutSetupKey])shortcuts.setOffer(changes[screenshotShortcutSetupKey].newValue);
   if(changes[screenshotPreference])void screenshotRequest('read').then(next=>{if(!config||next.revision>config.revision)render(next);}).catch(()=>{});
  };
  chrome.storage?.onChanged?.addListener(updated);
  const refreshDefault=message=>{
   if(!page.isConnected)return;
   if(message?.channel==='connection-changed'&&!config?.defaultHandled)
    void screenshotRequest('read').then(next=>{if(!config||next.revision>config.revision)render(next);}).catch(()=>{});
  };
  chrome.runtime.onMessage.addListener(refreshDefault);
  mounted={refresh:shortcuts.refresh,stop(){
   chrome.storage?.onChanged?.removeListener?.(updated);
   chrome.runtime.onMessage.removeListener?.(refreshDefault);
  }};
  try{render(await screenshotRequest('read'));}
  catch(error){feedback.textContent=screenshotMessage(error.code,'Could not read saved screenshot rules.');}
 }
 async function configureHere(target){
  const config=await screenshotRequest('read');
  dialog('Screenshot2Here',`<form id="screenshot-here"><label>Rule <select name="card"><option value="">New rule</option>${config.rules.map(rule=>`<option value="${rule.ruleId}">${esc(rule.name)} · ${esc(describeTarget(rule.destinations[0]))}</option>`).join('')}</select></label>
   <p class="wrap-text">${esc(describeTarget(target))}</p><div data-fields></div><button class="primary">Save</button><p role="status"></p></form>`);
  const form=document.querySelector('#screenshot-here'),fields=form.querySelector('[data-fields]');
  function redraw(){
   const rule=config.rules.find(item=>item.ruleId===form.elements.card.value);
   fields.innerHTML='<fieldset><legend>Websites · Any Match</legend><div data-websites></div></fieldset>';
   const readSites=sites(fields.querySelector('[data-websites]'),rule?rule.websites:[{kind:'all'}],!!rule);
   if(rule){
    const label=element('label','Directory action ');
    const choices=element('select');choices.name='destination-action';
    choices.append(new Option('Add selected directory','add'),new Option('Replace a directory','replace'));
    label.append(choices);fields.append(label);
    const old=element('label','Directory to replace '),select=element('select');select.name='replace';
    select.append(new Option('Choose directory',''),...rule.destinations.map((item,index)=>new Option(describeTarget(item),String(index))));
    old.hidden=true;choices.onchange=()=>{old.hidden=choices.value!=='replace';select.required=!old.hidden;};
    old.append(select);fields.append(old);
   }
   wireSave(form,()=>{
    const websites=readSites(),destinations=[...rule?.destinations??[]];
    if(rule&&form.elements['destination-action'].value==='replace')destinations[Number(form.elements.replace.value)]=target;
    else destinations.push(target);
    return {ruleId:rule?.ruleId,expectedRevision:rule?.revision,name:rule?.name??websites[0]?.value??'All websites',websites,destinations};
   },closeDialog);
  }
  form.elements.card.onchange=redraw;redraw();
 }
 async function settings(container){
  const control=element('section');control.className='card';
  control.innerHTML='<h2>Screenshots</h2><label><input type="checkbox" disabled> Single file per screenshot per directory</label><p role="status"></p>';
  container.append(control);
  const input=control.querySelector('input'),feedback=control.querySelector('[role=status]');
  try{input.checked=(await screenshotRequest('read')).dedup;input.disabled=false;}
  catch{feedback.textContent='Screenshot settings are unavailable.';return;}
  input.onchange=async()=>{
   const enabled=input.checked;input.disabled=true;
   try{await screenshotRequest('dedup',{enabled});feedback.textContent='';}
   catch{input.checked=!enabled;feedback.textContent='Could not save the screenshot setting.';}
   finally{input.disabled=false;}
  };
 }
 return {mount,stop,refreshShortcuts:()=>mounted?.refresh(),settings,configureHere};
}
