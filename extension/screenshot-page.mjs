import {targetKey} from '../src/core/menu-identity.mjs';
import {screenshotCommands,screenshotPreference,screenshotRulePageSize,websiteCondition} from '../src/screenshot/rules.mjs';
import {chromeCommandBindings,openChromeShortcuts} from '../src/chrome/command-bindings.mjs';

const scopes=[['all','All websites'],['domain','Entire domain + subdomains'],['host','Exact hostname'],['url','Specific full URL']];
const scopeName=kind=>scopes.find(([id])=>id===kind)?.[1];
const describeSite=site=>site.value?`${site.value} · ${scopeName(site.kind)}`:scopeName(site.kind);
const describeTarget=target=>`${target.bucketName}/${target.prefix} · ${target.accountId}`;
const screenshotMessages={
 SCREENSHOT_HOST_INVALID:'Enter a hostname such as example.com.',
 SCREENSHOT_URL_INVALID:'Enter a full HTTP or HTTPS page URL.',
 SCREENSHOT_RULE_CHANGED:'This rule changed in another Shelf. Reopen it to edit the latest version.',
 SCREENSHOT_RULE_NOT_FOUND:'This rule was deleted. Reopen Screenshot to refresh the cards.',
 SCREENSHOT_FOLDER_UNAVAILABLE:'This folder could not be verified in Cloudflare. Select an available directory.',
 SCREENSHOT_FOLDER_REQUEST_EXPIRED:'Open Screenshot from the webpage’s right-click menu again.',
 SCREENSHOT_PAGE_CHANGED:'The active tab or page changed during capture.',
 SCREENSHOT_PAGE_UNSUPPORTED:'Chrome can capture supported HTTP and HTTPS webpages.',
 SCREENSHOT_PERMISSION_REQUIRED:'Chrome did not grant access to capture this tab.',
 SCREENSHOT_CAPTURE_RATE_LIMIT:'Chrome limited capture frequency. Wait before pressing a shortcut again.',
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
export async function screenshotRequest(method,params={}){
 const result=await chrome.runtime.sendMessage({channel:'screenshot',method,params});
 if(result?.state==='completed')return result.data;
 throw Object.assign(Error(result?.code??'SCREENSHOT_REQUEST_FAILED'),{code:result?.code});
}

export function createScreenshotPage({api,dialog,closeDialog,esc,windowId}){
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
 function picker(holder,onPick){
  let ticket=0;
  function view(place={}){void page(place);}
  async function page(place,cursor=''){
   const requested=++ticket;
   if(!cursor)holder.replaceChildren();
   const oldMore=holder.querySelector('[data-picker-more]');
   if(oldMore)oldMore.remove();
   const {account,target}=place;
   if(!cursor){
    const title=element('strong',target?target.bucketName+'/'+target.prefix:account?account.name??account.id:'Cloudflare accounts');
    const path=element('div');path.className='screenshot-picker-path';path.append(title);
    if(account)path.prepend(button('Back',()=>{
     if(!target){view();return;}
     if(!target.prefix){view({account});return;}
     const trimmed=target.prefix.slice(0,-1);
     view({account,target:{...target,prefix:trimmed.slice(0,trimmed.lastIndexOf('/')+1)}});
    }));
    if(target)path.append(button('Use this directory',()=>{ticket++;holder.hidden=true;onPick(target);}));
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
    if(!cursor&&!rows.length)progress.textContent=target?'No subfolders.':account?'No authorized buckets.':'Connect Cloudflare in Remotes to select a directory.';
    else progress.remove();
    for(const item of rows){
     const name=target?item.displayName??item.key:item.name??item.id;
     const next=target?{account,target:{...target,prefix:item.key}}:account?{account,target:{
      provider:'cloudflare',accountId:account.id,connectionId:'cloudflare:'+account.id,bucketName:item.name,prefix:''}}:{account:item};
     holder.append(button(name,()=>view(next)));
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
  const list=element('div'),browser=element('div'),open=button(multiple?'Add directory':'Choose directory',()=>{
   browser.hidden=!browser.hidden;
   if(!browser.hidden)picker(browser,target=>{
    if(multiple){
     if(!targets.some(item=>targetKey(item)===targetKey(target)))targets.push(target);
    }else targets=[target];
    render();open.focus();
   });
  });
  browser.className='screenshot-picker';
  browser.hidden=true;
  holder.append(list,open,browser);
  function render(){
   list.replaceChildren(...targets.map((target,index)=>{
    const row=element('div');row.className='screenshot-destination';
    row.append(element('span',describeTarget(target)));
    if(multiple)row.append(button('Remove',()=>{targets.splice(index,1);render();}));
    return row;
   }));
   if(!multiple)open.textContent=targets.length?'Change':'Choose directory';
   onChange?.(targets.length);
  }
  render();
  return ()=>targets;
 }
 async function editor(initial,after){
  dialog('Edit screenshot rule','<form id="screenshot-editor"><label>Name <input name="rule-name" required></label><fieldset><legend>Websites · any match</legend><div data-websites></div></fieldset><fieldset><legend>Cloudflare directories</legend><div data-directories></div></fieldset><button class="primary">Save</button><p role="status"></p></form>');
  const form=document.querySelector('#screenshot-editor'),name=form.elements['rule-name'];
  name.value=initial.name;
  const readSites=sites(form.querySelector('[data-websites]'),initial.websites,true);
  const readTargets=directories(form.querySelector('[data-directories]'),initial.destinations,null,{multiple:true});
  wireSave(form,()=>({ruleId:initial.ruleId,expectedRevision:initial.revision,name:name.value,websites:readSites(),destinations:readTargets()}),config=>{
   closeDialog();after(config,initial.ruleId);
  });
 }
 function wireSave(form,fields,after){
  const save=[...form.querySelectorAll('button')].find(control=>control.type==='submit'),feedback=form.querySelector('[role=status]');
  form.onsubmit=async event=>{
   event.preventDefault();
   if(save.disabled)return;
   save.disabled=true;
   try{
    const params=fields();
    if(!params.destinations.length){feedback.textContent='Choose a Cloudflare directory.';return;}
    const config=await screenshotRequest('save',params);
    if(form.isConnected)after(config);
   }catch(error){feedback.textContent=screenshotMessage(error.code,'Could not save this screenshot rule.');}
   finally{save.disabled=false;}
  };
 }
 async function shortcutHint(hint){
  try{
   const bindings=await chromeCommandBindings(chrome);
   const keys=screenshotCommands.map(id=>bindings.get(id)).filter(Boolean);
   hint.replaceChildren(element('span',keys.length?'Chrome shortcuts · '+keys.join(' · '):'Assign a screenshot shortcut in Chrome.'));
   if(keys.length<screenshotCommands.length){
    const change=button('Chrome shortcut settings',()=>{void openChromeShortcuts(chrome).catch(()=>{hint.textContent='Open chrome://extensions/shortcuts in Chrome.';});});
    hint.append(' ',change);
   }
  }catch{hint.textContent='Shortcut assignments are unavailable. Check Chrome’s extension shortcut settings.';}
 }
 async function mount(parent){
  const page=element('section');page.className='page screenshot-page';
  page.innerHTML='<h1>Screenshot</h1><p class="muted" data-keys></p><form id="screenshot-form"><fieldset><legend>Website</legend><div data-websites></div></fieldset><fieldset><legend>Cloudflare directory</legend><div data-directories></div></fieldset><button class="primary">Save</button><p role="status"></p></form><section><h2>Saved Screenshot Rules</h2><div data-cards></div><div class="screenshot-pagination" data-pages></div><p data-rule-status role="status"></p></section>';
  parent.replaceChildren(page);
  const form=page.querySelector('form'),cards=page.querySelector('[data-cards]'),pager=page.querySelector('[data-pages]'),feedback=page.querySelector('[data-rule-status]');
  const readSites=sites(form.querySelector('[data-websites]'),[{kind:'all'}]);
  const readTargets=directories(form.querySelector('[data-directories]'),[]);
  let config,pageIndex=0;
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
    const active=button(rule.active?'Active':'Inactive',()=>void mutate('toggle',{ruleId:rule.ruleId,active:!rule.active},rule.ruleId));
    active.setAttribute('aria-pressed',String(rule.active));
    active.setAttribute('aria-label',(rule.active?'Active':'Inactive')+' · '+rule.name);
    const remove=button('×',()=>void mutate('delete',{ruleId:rule.ruleId}));
    remove.setAttribute('aria-label','Delete '+rule.name);
    card.append(edit,active,remove);
    return card;
   }));
   if(!all.length)cards.append(element('p','No screenshot rules yet.'));
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
  wireSave(form,()=>{const websites=readSites();return {name:websites[0]?.value??'All websites',websites,destinations:readTargets()};},saved=>{
   pageIndex=0;render(saved);form.querySelector('[role=status]').textContent='Rule saved.';
  });
  void shortcutHint(page.querySelector('[data-keys]'));
  const updated=(changes,area)=>{
   if(!page.isConnected){chrome.storage.onChanged.removeListener(updated);return;}
   if(area==='local'&&changes[screenshotPreference])void screenshotRequest('read').then(next=>{if(!config||next.revision>config.revision)render(next);}).catch(()=>{});
  };
  chrome.storage?.onChanged?.addListener(updated);
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
   fields.innerHTML='<fieldset><legend>Websites · any match</legend><div data-websites></div></fieldset>';
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
 async function chooseForCapture(){
  const id=await windowId;
  if(!Number.isInteger(id))return;
  const pending=await screenshotRequest('folder-request',{windowId:id});
  if(!pending||document.querySelector('#screenshot-one-off'))return;
  dialog('Screenshot to folder','<form id="screenshot-one-off"><fieldset><legend>Cloudflare directory</legend><div data-directories></div></fieldset><button class="primary" disabled>Capture and save</button><p role="status"></p></form>');
  const form=document.querySelector('#screenshot-one-off'),save=form.querySelector('button[disabled]'),feedback=form.querySelector('[role=status]');
  const targets=directories(form.querySelector('[data-directories]'),[],count=>{save.disabled=!count;});
  form.onsubmit=async event=>{
   event.preventDefault();save.disabled=true;feedback.textContent='Capturing…';
   try{
    const result=await screenshotRequest('choose-folder',{windowId:id,id:pending.id,target:targets()[0]});
    if(result?.state==='confirmed')closeDialog();
    else feedback.textContent=screenshotMessage(result?.code,'Open History for the capture result.');
   }catch(error){feedback.textContent=screenshotMessage(error.code,'Could not save the screenshot.');save.disabled=false;}
  };
 }
 async function settings(container){
  const control=element('section');control.className='card';
  control.innerHTML='<h2>Screenshot</h2><label><input type="checkbox" disabled> Single file per screenshot per directory</label><p role="status"></p>';
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
 return {mount,settings,configureHere,chooseForCapture};
}
