import {VISIBILITY_MS} from '../src/queue/store.mjs';
import {historyCalendar,historyInterval} from '../src/queue/calendar.mjs';
import {createHistoryCards,historyLocation,providerName,queueStatus} from './history-v2-cards.mjs';

const rowHeight=72, jobBatch=10;
const element=(tag,text)=>Object.assign(document.createElement(tag),text==null?{}:{textContent:text});

export function mountLiveJobs(parent,{service,openRemotes,retryScreenshot,inspectReceipt,signal}) {
  const root=element('section');
  root.className='card queue-jobs';
  root.innerHTML='<h2>Live Jobs</h2><p data-job-counts role="status"></p><p data-job-warning role="status"></p><button data-job-resync type="button" hidden>Retry History sync</button>'+
    '<div class="queue-job-window" tabindex="0" aria-label="Live jobs"><div data-job-padding-top></div><div data-job-items></div><div data-job-padding-bottom></div></div>';
  parent.append(root);
  const counts=root.querySelector('[data-job-counts]'),warning=root.querySelector('[data-job-warning]');
  const scroll=root.querySelector('.queue-job-window'),list=root.querySelector('[data-job-items]');
  const top=root.querySelector('[data-job-padding-top]'), bottom=root.querySelector('[data-job-padding-bottom]');
  const resync=root.querySelector('[data-job-resync]');
  resync.onclick=async()=>{
    resync.disabled=true;
    try{await service.refresh();await refresh();}
    finally{resync.disabled=false;}
  };
  let revision=0;
  const rendered=new Map();
  async function refresh(){
    const ticket=++revision, offset=Math.max(0,(Math.floor(scroll.scrollTop/(rowHeight*jobBatch))-1)*jobBatch);
    try{
      const result=await service.store.jobs({offset,limit:offset===0&&scroll.scrollTop<rowHeight*3?jobBatch:jobBatch*3});
      if(signal.aborted||ticket!==revision)return;
      resync.hidden=!service.accountingPending;
      warning.textContent=service.accountingPending?'History sync needed. Saved outcomes can be reconciled from available receipts.':'';
      counts.textContent=result.total?`Working ${result.working} · Waiting ${result.waiting} · Needs attention ${result.attention}`:'No active jobs';
      scroll.hidden=!result.total;
      top.style.height=(offset*rowHeight)+'px';
      bottom.style.height=(Math.max(0,result.total-offset-result.items.length)*rowHeight)+'px';
      const current=new Set(result.items.map(job=>job.recordId));
      for(const [id,node] of rendered)if(!current.has(id)){node.remove();rendered.delete(id);}
      for(const [index,job] of result.items.entries()){
        let row=rendered.get(job.recordId);
        const version=JSON.stringify([job.updatedAt,job.status,job.filename,job.code,job.progress]);
        if(!row||row.dataset.version!==version&&!row.contains(document.activeElement)){
          const next=renderJob(job);
          next.dataset.version=version;
          row?.replaceWith(next);
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
    const description=element('div'), title=element('strong',job.filename??'N/A');
    title.title=job.filename??'';
    description.append(title,element('small',providerName(job.provider)+' · '+historyLocation(job.destination)));
    const state=element('div'), status=element('span',queueStatus(job.status));
    status.className='queue-badge';status.dataset.outcome=job.status;
    const time=job.requestedAt?new Date(job.requestedAt).toLocaleTimeString():'N/A';
    status.title=job.code??'';
    state.append(status,element('small',time));
    row.append(description,state);
    if(job.rank===0){
      const progress=element('progress');progress.max=100;
      if(Number.isFinite(job.progress)&&job.progress>=0&&job.progress<=100)progress.value=job.progress;
      progress.setAttribute('aria-label',job.filename??'Save progress');
      state.append(progress);
    }else{
      const actions=element('div');actions.className='queue-actions';
      const button=(label,click)=>{
        const b=element('button',label);b.onclick=()=>void Promise.resolve().then(click)
          .catch(()=>{warning.textContent='This action is unavailable. Review the save in Remotes or History.';});actions.append(b);
      };
      if(job.status==='uncertain'&&job.sourceApi==='r2'&&job.destination?.bucket)button('Check receipt',async()=>{
        const result=await inspectReceipt(job.sourceRecordId);
        warning.textContent=result.reconciliation?.state==='verified'?'Saved file verified.':'Save still unconfirmed. Check Remotes before starting another save.';
        if(result.reconciliation?.state==='verified')await service.refresh();
      });
      if(job.status==='needs-login'||job.rank===2)button('Remotes',openRemotes);
      if(job.kind==='screenshot'&&job.recoverable)button('Review retry',async()=>{
        if(confirm('Use the existing screenshot recovery to check unconfirmed files and retry available outputs?'))
          await retryScreenshot(job.sourceRecordId);
      });
      if(job.rank===1)button('Acknowledge',async()=>{await service.store.acknowledge(job.recordId);await refresh();});
      row.append(actions);
    }
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

export function mountHistoryV2(parent,{service,api,screenshotRequest,goTo,canRead,signal,metadataPreference,state={page:1}}) {
  const root=element('section');
  root.className='card queue-archive';
  root.innerHTML='<h2>History V2</h2><label class="queue-search">Find saved files<input data-history-find type="search" placeholder="Filename, provider or a word"></label>'+
    '<p role="status" data-history-notice></p><div data-history-records></div>'+
    '<p class="queue-single-page" hidden>Page 1 of 1</p>'+
    '<form class="queue-pager" aria-label="History V2 pages" hidden><button type="button" data-first aria-label="First page" title="First page">«</button>'+
    '<button type="button" data-prev aria-label="Previous page" title="Previous page">‹</button><label><span>Page</span><input type="number" min="1" step="1" required inputmode="numeric"></label>'+
    '<span data-pages></span><button type="button" data-next aria-label="Next page" title="Next page">›</button>'+
    '<button type="button" data-last aria-label="Last page" title="Last page">»</button><button type="submit" class="sr-only">Go to page</button></form>';
  parent.append(root);
  const list=root.querySelector('[data-history-records]'),notice=root.querySelector('[data-history-notice]');
  const form=root.querySelector('form'),input=form.querySelector('input'),find=root.querySelector('[data-history-find]');
  const singlePage=root.querySelector('.queue-single-page');
  let page=state.page??1, pages=1, generation=0, cardScope, cards, lastSignature, debounce, editingPage=false;
  const unsubscribe=metadataPreference?.subscribe(value=>cards?.setVisibility(value));
  const groupState=new Map();
  find.value=state.query??'';
  function render(items,prefs){
    for(const group of list.querySelectorAll('[data-calendar-group]')){
      groupState.set(group.dataset.calendarGroup,group.open);
      if(groupState.size>200)groupState.delete(groupState.keys().next().value);
    }
    cardScope?.abort();
    cardScope=new AbortController();
    cards=createHistoryCards({api,screenshotRequest,goTo,canRead,signal:cardScope.signal,
      preferences:prefs,isFirstPage:page===1,visibility:metadataPreference?.value});
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
      parent.append(cards.render(row));
    }
    list.replaceChildren(contents);
  }
  async function refresh({force=false}={}){
    if(!force&&(list.contains(document.activeElement)||find===document.activeElement||input===document.activeElement))return;
    const ticket=++generation;
    try{
      await service.ready;
      await metadataPreference?.ready;
      if(signal.aborted||ticket!==generation)return;
      const prefs=service.preferences, query=find.value.trim().toLowerCase();
      const range=historyInterval(prefs);
      if(prefs.timer!=='off')range.from=Math.max(range.from??0,Date.now()-VISIBILITY_MS);
      const result=await service.store.page({page,...range,query});
      if(signal.aborted||ticket!==generation)return;
      page=state.page=result.page;pages=result.pages;state.query=find.value;
      const text=result.total?result.total.toLocaleString()+(result.total===1?' result':' results'):'No saves in this display range.';
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
      if(!signal.aborted)notice.textContent='History V2 is unavailable. Live Jobs and saving can continue.';
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
  find.oninput=()=>{clearTimeout(debounce);debounce=setTimeout(()=>select(1),300);};
  signal.addEventListener('abort',()=>{unsubscribe?.();cardScope?.abort();clearTimeout(debounce);},{once:true});
  void refresh({force:true});
  return {refresh};
}

export function createQueuePage(options) {
  let scope;
  const state={page:1};
  function stop(){scope?.abort();}
  function mount(main){
    stop();
    scope=new AbortController();
    const {signal}=scope;
    const page=element('section');page.className='page queue-page';page.append(element('h1','Queue'));
    main.replaceChildren(page);
    const jobs=mountLiveJobs(page,{...options,signal});
    const history=mountHistoryV2(page,{...options,signal,state});
    let update;
    const refresh=()=>{
      if(signal.aborted)return;
      clearTimeout(update);
      update=setTimeout(()=>{void jobs.refresh();void history.refresh();},120);
    };
    const onMessage=(message,sender)=>{
      if(sender?.id===chrome.runtime.id&&['queue-history-changed','queue-history-accounting-pending','connection-changed'].includes(message?.channel))refresh();
    };
    chrome.runtime.onMessage.addListener(onMessage);
    const tick=setInterval(refresh,10000);
    signal.addEventListener('abort',()=>{
      chrome.runtime.onMessage.removeListener(onMessage);
      clearTimeout(update);clearInterval(tick);
    },{once:true});
    void options.service.refresh().then(refresh);
  }
  return {mount,stop};
}
