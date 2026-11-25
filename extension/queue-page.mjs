import {VISIBILITY_MS} from '../src/queue/store.mjs';
import {historyCalendar,historyInterval} from '../src/queue/calendar.mjs';
import {createHistoryCards,historyLocation,providerName,queueStatus} from './history-v2-cards.mjs';

const rowHeight=82, jobBatch=10;
const element=(tag,text)=>Object.assign(document.createElement(tag),text==null?{}:{textContent:text});

export function mountLiveJobs(parent,{service,openRemotes,inspectReceipt,screenshotRequest,signal}) {
  const root=element('section');
  root.className='card queue-jobs';
  root.innerHTML='<div class="queue-actions"><button type="button" data-cancel-all>Cancel All</button><button type="button" data-clear-all>Clear All</button></div><p data-job-counts role="status"></p><p data-job-warning role="status"></p><button data-job-resync type="button" hidden>Retry receipt sync</button>'+
    '<div class="queue-job-window" tabindex="0" aria-label="Live jobs"><div data-job-padding-top></div><div data-job-items></div><div data-job-padding-bottom></div></div>';
  parent.append(root);
  const counts=root.querySelector('[data-job-counts]'),warning=root.querySelector('[data-job-warning]');
  const scroll=root.querySelector('.queue-job-window'),list=root.querySelector('[data-job-items]');
  const top=root.querySelector('[data-job-padding-top]'), bottom=root.querySelector('[data-job-padding-bottom]');
  const resync=root.querySelector('[data-job-resync]');
  resync.onclick=async()=>{
    resync.disabled=true;
    try{await service.refresh({force:true});await refresh();}
    finally{resync.disabled=false;}
  };
  const cancelAll=root.querySelector('[data-cancel-all]'),clearAll=root.querySelector('[data-clear-all]');
  async function control(button,action,job){
    if(button.disabled)return;
    button.disabled=true;
    try{
      const data=await service.control(action,job);
      warning.textContent=action==='cancel-all'?(data?.results?.length?'Stop requested for cancellable saves. Final writes and captures may still complete.':
        'No cancellable saves found. Final writes and captures may still complete.'):
        data?.state==='unsupported'?'This save is past its cancellation point. Wait for verification.':
        action==='cancel'?'Cancellation requested.':'';
    }catch{
      warning.textContent=action==='retry'?'Retry unavailable. Check the original source and account in Remotes.':
        'Could not complete this Queue action. Check the job before trying again.';
    }finally{
      button.disabled=false;
      await refresh();
    }
  }
  cancelAll.onclick=()=>void control(cancelAll,'cancel-all');
  clearAll.onclick=()=>void control(clearAll,'clear');
  let revision=0;
  const rendered=new Map();
  async function refresh(){
    const ticket=++revision, offset=Math.max(0,(Math.floor(scroll.scrollTop/(rowHeight*jobBatch))-1)*jobBatch);
    try{
      const result=await service.store.jobs({offset,limit:offset===0&&scroll.scrollTop<rowHeight*3?jobBatch:jobBatch*3});
      if(signal.aborted||ticket!==revision)return;
      if(offset>=result.total&&scroll.scrollTop>0){
        scroll.scrollTop=0;
        return void refresh();
      }
      resync.hidden=!service.accountingPending;

      counts.textContent=result.total?`Working ${result.working} · Waiting ${result.waiting} · Needs attention ${result.attention} · Finished ${result.finished}`:'No jobs';
      scroll.hidden=!result.total;
      top.style.height=(offset*rowHeight)+'px';
      bottom.style.height=(Math.max(0,result.total-offset-result.items.length)*rowHeight)+'px';
      const current=new Set(result.items.map(job=>job.recordId));
      for(const [id,node] of rendered)if(!current.has(id)){node.remove();rendered.delete(id);}
      for(const [index,job] of result.items.entries()){
        let row=rendered.get(job.recordId);
        const version=JSON.stringify([job.updatedAt,job.status,job.filename,job.code,job.progress,job.bytes,job.cancellable,job.retryable,job.retryExpiresAt>Date.now()]);
        if(!row||row.dataset.version!==version){
          const focus=row?.contains(document.activeElement)?document.activeElement.className:null;
          const next=renderJob(job);
          next.dataset.version=version;
          row?.replaceWith(next);
          if(focus==='queue-dismiss')next.querySelector('.queue-dismiss:not(:disabled)')?.focus({preventScroll:true});
          row=next;
          rendered.set(job.recordId,row);
        }
        if(list.children[index]!==row)list.insertBefore(row,list.children[index]??null);
      }
    }catch{
      if(!signal.aborted){warning.textContent='Live Jobs storage is unavailable. Saving can continue independently.';}
    }
  }
  function renderJob(job){
    const row=element('article');row.className='queue-job';
    const heading=element('div'), title=element('strong',job.filename??'N/A');
    heading.className='queue-job-heading';
    title.title=job.filename??'';
    heading.append(title);
    const location=element('small',providerName(job.provider)+' · '+historyLocation(job.destination));
    location.title=location.textContent;
    const state=element('div'), status=element('span',job.status==='verified'?'Completed':queueStatus(job.status));
    state.className='queue-job-state';
    status.className='queue-badge';status.dataset.outcome=job.status;
    const time=job.requestedAt?new Date(job.requestedAt).toLocaleTimeString():'N/A';
    status.title=job.code??'';
    state.append(status,element('small',time));
    row.append(heading,location,state);
    const actions=element('div');actions.className='queue-actions';
    if(job.rank===0&&job.status!=='cancelling'){
      const progress=element('progress');progress.max=100;
      if(Number.isFinite(job.progress)&&job.progress>=0&&job.progress<=100)progress.value=job.progress;
      progress.setAttribute('aria-label',job.filename??'Save progress');
      actions.append(progress);
      if(job.bytes>0)actions.append(element('small',job.bytes.toLocaleString()+' bytes'));
    }
    const button=(label,click,parent=actions)=>{
      const b=element('button',label);
      b.type='button';
      b.onclick=()=>void Promise.resolve().then(()=>click(b)).catch(()=>{
        warning.textContent='This action is unavailable. Review the save in Remotes or History.';
      });
      parent.append(b);
      return b;
    };
    if(job.status==='uncertain'&&job.sourceApi==='r2'&&job.destination?.bucket)button('Check receipt',async()=>{
      const result=await inspectReceipt(job.sourceRecordId);
      warning.textContent=result.reconciliation?.state==='verified'?'Saved file verified.':'Save still unconfirmed. Check Remotes before starting another save.';
      if(result.reconciliation?.state==='verified')await service.refresh({force:true});
    });
    if(job.kind==='screenshot'&&job.deliveryId&&job.status==='uncertain')button('Check receipt',async b=>{
      b.disabled=true;
      try{
        const result=await screenshotRequest('reconcile',{operationId:job.sourceRecordId});
        warning.textContent=result.state==='confirmed'?'Screenshot files verified.':'Some screenshot files remain unconfirmed.';
      }finally{b.disabled=false;}
    });
    if(['needs-login','waiting'].includes(job.status))button('Remotes',openRemotes);
    if(job.terminal&&['cancelled','failed'].includes(job.status)&&job.retryExpiresAt>Date.now()&&
        (job.retryable||job.kind==='screenshot'&&job.recoverable))
      button('Retry',b=>control(b,'retry',job));
    const close=button('×',b=>control(b,job.terminal?'dismiss':'cancel',job),heading);
    close.className='queue-dismiss';
    close.disabled=!job.terminal&&!job.cancellable;
    close.title=job.terminal?'Dismiss job':job.status==='cancelling'?'Cancelling…':
      job.cancellable?'Cancel job':'Cancellation unavailable at this stage';
    close.setAttribute('aria-label',close.title+' '+(job.filename??'save'));
    if(actions.childElementCount)row.append(actions);
    return row;
  }
  let frame;
  scroll.addEventListener('scroll',()=>{
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>void refresh());
  },{signal});
  signal.addEventListener('abort',()=>cancelAnimationFrame(frame),{once:true});
  void refresh();
  return {refresh};
}

export function mountHistoryV2(parent,{service,api,screenshotRequest,goTo,canRead,signal,metadataPreference,rename,renameError,state={page:1}}) {
  const root=element('section');
  root.className='card queue-archive';
  root.innerHTML='<label class="queue-search">Find saved files<input data-history-find type="search" placeholder="Filename, provider or a word"></label>'+
    '<p role="status" data-history-notice></p><div data-history-records></div>'+
    '<p class="queue-single-page" hidden>Page 1 of 1</p>'+
    '<form class="queue-pager" aria-label="History pages" hidden><button type="button" data-first aria-label="First page" title="First page">«</button>'+
    '<button type="button" data-prev aria-label="Previous page" title="Previous page">‹</button><label><span>Page</span><input type="number" min="1" step="1" required inputmode="numeric"></label>'+
    '<span data-pages></span><button type="button" data-next aria-label="Next page" title="Next page">›</button>'+
    '<button type="button" data-last aria-label="Last page" title="Last page">»</button><button type="submit" class="sr-only">Go to page</button></form>';
  parent.append(root);
  const list=root.querySelector('[data-history-records]'),notice=root.querySelector('[data-history-notice]');
  const form=root.querySelector('form'),input=form.querySelector('input'),find=root.querySelector('[data-history-find]');
  const singlePage=root.querySelector('.queue-single-page');
  let page=state.page??1, pages=1, generation=0, cardScope, cards, lastSignature, debounce, reading, editingPage=false;
  const unsubscribe=metadataPreference?.subscribe(value=>cards?.setVisibility(value));
  const groupState=new Map(), cardDisclosures=new Map();
  find.value=state.query??'';
  function render(items,prefs){
    for(const group of list.querySelectorAll('[data-calendar-group]')){
      groupState.set(group.dataset.calendarGroup,group.open);
      if(groupState.size>200)groupState.delete(groupState.keys().next().value);
    }
    for(const row of list.querySelectorAll('[data-record-id]')){
      cardDisclosures.set(row.dataset.recordId,new Map([...row.querySelectorAll('details')].map(detail=>[detail.querySelector('summary')?.textContent,detail.open])));
      if(cardDisclosures.size>200)cardDisclosures.delete(cardDisclosures.keys().next().value);
    }
    cardScope?.abort();
    cardScope=new AbortController();
    cards=createHistoryCards({api,screenshotRequest,goTo,canRead,signal:cardScope.signal,
      preferences:prefs,isFirstPage:page===1,visibility:metadataPreference?.value,rename,renameError,onGalleryClosed:()=>void refresh({force:true})});
    const groups=new Map(), contents=document.createDocumentFragment();
    for(const row of items){
      let parent=contents;
      for(const [key,label] of historyCalendar(row.terminalAt??row.requestedAt,prefs.timezone)){
        let group=groups.get(key);
        if(!group){
          group=element('details');
          group.className='queue-calendar';
          group.dataset.calendarGroup=key;
          group.open=groupState.get(key)??true;
          group.append(element('summary',label));
          groups.set(key,group);
          parent.append(group);
        }
        parent=group;
      }
      const card=cards.render(row), previous=cardDisclosures.get(row.recordId);
      if(previous)[...card.querySelectorAll('details')].forEach(detail=>{
        const title=detail.querySelector('summary')?.textContent;
        if(previous.has(title))detail.open=previous.get(title);
      });
      parent.append(card);
    }
    list.replaceChildren(contents);
  }
  async function refresh({force=false}={}){
    if(cards?.previewOpen||list.querySelector('input:not([type=range]):focus'))return;
    if(!force&&(debounce||input===document.activeElement))return;
    const ticket=++generation;
    reading?.abort();
    reading=new AbortController();
    const requestSignal=reading.signal;
    try{
      await service.ready;
      await metadataPreference?.ready;
      if(signal.aborted||ticket!==generation)return;
      const prefs=service.preferences, query=find.value.trim().toLowerCase();
      const range=historyInterval(prefs);
      if(prefs.timer!=='off')range.from=Math.max(range.from??0,Date.now()-VISIBILITY_MS);
      const result=await service.store.page({page,...range,query,signal:requestSignal});
      if(signal.aborted||ticket!==generation||cards?.previewOpen||list.querySelector('input:not([type=range]):focus'))return;
      page=state.page=result.page;pages=result.pages;state.query=find.value;
      const text=result.total?result.total.toLocaleString()+(result.total===1?' result':' results'):
        query&&!result.rangeEmpty?'No saved files match your search.':'No saves in this display range.';
      const timer=prefs.timer==='off'?'':' · 15-minute '+(prefs.timer==='delete'?'Delete':'Hide');
      notice.textContent=text+timer+(service.accountingPending?' · Some receipts are awaiting reconciliation.':'');
      form.hidden=pages<=1;
      singlePage.hidden=pages>1 || !result.total;
      input.max=String(pages);
      if(!editingPage)input.value=String(page);
      form.querySelector('[data-pages]').textContent='/ '+pages.toLocaleString();
      form.querySelector('[data-first]').disabled=form.querySelector('[data-prev]').disabled=page<=1;
      form.querySelector('[data-last]').disabled=form.querySelector('[data-next]').disabled=page>=pages;
      const signature=JSON.stringify([prefs,page,result.items.map(row=>[row.recordId,row.updatedAt,row.status,canRead(row)])]);
      if(lastSignature!==signature){
        render(result.items,prefs);
        lastSignature=signature;
      }
    }catch{
      if(!signal.aborted&&!requestSignal.aborted&&ticket===generation)notice.textContent='History is unavailable. Live Jobs and saving can continue.';
    }
  }
  const select=newPage=>{editingPage=false;page=newPage;void refresh({force:true});};
  form.onsubmit=event=>{event.preventDefault();if(input.reportValidity())select(input.valueAsNumber);};
  input.oninput=()=>{editingPage=true;};
  input.onchange=()=>{if(input.checkValidity())select(input.valueAsNumber);};
  input.onblur=()=>{if(!input.checkValidity()){editingPage=false;input.value=String(page);}};
  form.querySelector('[data-first]').onclick=()=>select(1);
  form.querySelector('[data-prev]').onclick=()=>select(page-1);
  form.querySelector('[data-next]').onclick=()=>select(page+1);
  form.querySelector('[data-last]').onclick=()=>select(pages);
  find.oninput=()=>{
    state.query=find.value;state.page=1;
    reading?.abort();generation++;
    clearTimeout(debounce);debounce=setTimeout(()=>{debounce=undefined;select(1);},300);
  };
  signal.addEventListener('abort',()=>{unsubscribe?.();reading?.abort();cardScope?.abort();clearTimeout(debounce);},{once:true});
  void refresh({force:true});
  return {refresh};
}

export function createQueuePage(options) {
  let scope;
  function stop(){scope?.abort();}
  function mount(main){
    stop();
    scope=new AbortController();
    const {signal}=scope;
    const page=element('section');page.className='page queue-page';page.append(element('h1','Queue'));
    main.replaceChildren(page);
    const jobs=mountLiveJobs(page,{...options,signal});

    let update;
    const refresh=()=>{
      if(signal.aborted)return;
      clearTimeout(update);
      update=setTimeout(()=>{void jobs.refresh();},120);
    };
    const onMessage=(message,sender)=>{
      if(sender?.id===chrome.runtime.id&&['queue-history-changed','queue-history-accounting-pending','connection-changed'].includes(message?.channel))refresh();
    };
    chrome.runtime.onMessage.addListener(onMessage);
    const tick=setInterval(refresh,15000);
    signal.addEventListener('abort',()=>{
      chrome.runtime.onMessage.removeListener(onMessage);
      clearTimeout(update);clearInterval(tick);
    },{once:true});
    void options.service.store.maintainJobs().then(refresh).catch(()=>{});
    void options.service.refresh().then(refresh);
  }
  return {mount,stop};
}

export function createHistoryArchive(options) {
  let scope;
  const state={page:1};
  function stop(){scope?.abort();}
  function mount(main){
    stop();
    scope=new AbortController();
    const {signal}=scope;
    const page=element('section');
    page.className='page queue-page';
    page.append(element('h1','History'));
    main.replaceChildren(page);
    const history=mountHistoryV2(page,{...options,signal,state});
    let pending;
    const schedule=()=>{
      clearTimeout(pending);
      pending=setTimeout(()=>void history.refresh(),120);
    };
    const onMessage=(message,sender)=>{
      if(sender?.id===chrome.runtime.id&&['queue-history-changed','queue-history-accounting-pending','connection-changed'].includes(message?.channel))schedule();
    };
    chrome.runtime.onMessage.addListener(onMessage);
    const tick=setInterval(()=>{if(options.service.preferences.timer!=='off')schedule();},15000);
    signal.addEventListener('abort',()=>{
      chrome.runtime.onMessage.removeListener(onMessage);
      clearInterval(tick);
      clearTimeout(pending);
    },{once:true});
    void options.service.refresh().then(schedule);
  }
  return {mount,stop};
}
