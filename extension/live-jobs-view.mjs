const groups=[['working','Working'],['attention','Needs attention'],['waiting','Waiting']];
const rowHeight=68;
const labels={failed:'Failed',blocked:'Blocked',uncertain:'Outcome uncertain',verified:'Saved',uploaded:'Uploaded',canceled:'Canceled'};
const loginCodes=new Set(['AUTH_REQUIRED','TOKEN_EXPIRED','REAUTH_REQUIRED','LOGIN_REQUIRED','AUTH_SESSION_CHANGED']);

export function mountLiveJobs(parent,{jobs,subscribe,openRemotes,retryScreenshot,inspectAttempt,viewState={}}) {
  const section=document.createElement('section');
  section.className='card queue-jobs';
  section.innerHTML=`<h2>Live Jobs</h2><div class="queue-job-filters" aria-label="Filter jobs"><button type="button" data-job-filter>All</button>${groups.map(([id,label])=>`<button type="button" data-job-filter="${id}">${label} <span></span></button>`).join('')}</div><p data-job-status role="status"></p><div class="queue-job-scroll" tabindex="0" aria-label="Jobs"><div class="queue-job-list"></div></div><section data-job-detail hidden></section>`;
  parent.append(section);
  const $=selector=>section.querySelector(selector);
  const list=$('.queue-job-list'), scroller=$('.queue-job-scroll'), feedback=$('[data-job-status]'), inspector=$('[data-job-detail]');
  const upper=document.createElement('div'),lower=document.createElement('div');
  upper.setAttribute('aria-hidden','true');lower.setAttribute('aria-hidden','true');list.append(upper,lower);
  const rendered=new Map();
  let category=viewState.category??viewState.defaultCategory??null, ticket=0, frame=0, selected=null, offset=-1;
  const location=record=>record.destination?.bucket?[record.destination.bucket,record.destination.key??record.destination.prefix].filter(Boolean).join(' / '):'N/A';
  const state=record=>record.accountingPending?'History sync needed':loginCodes.has(record.errorCode)?'Needs login':record.category==='working'?
    (/verif/i.test(record.stage??'')?'Verifying':'Working'):record.category==='waiting'?'Waiting':labels[record.status]??'Needs attention';
  function showDetails(record) {
    selected=record.recordId;
    inspector.hidden=false;
    const heading=document.createElement('h3'),description=document.createElement('p'),actions=document.createElement('div');
    heading.textContent=record.filename??'Filename unavailable';
    description.textContent=state(record)+' · '+location(record)+(record.errorCode?' · '+record.errorCode:'')+
      (record.observedAt?' · Last owner update '+new Date(record.observedAt).toLocaleString():'');
    const action=(label,run)=>{
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=async()=>{button.disabled=true;try{await run();}catch{feedback.textContent='The action could not be completed. Check the job again.';}finally{button.disabled=false;}};
      actions.append(button);
    };
    action('Close details',()=>{inspector.hidden=true;selected=null;rendered.get(record.recordId)?.focus();});
    if(loginCodes.has(record.errorCode))action('Open Remotes',openRemotes);
    if(inspectAttempt&&record.kind==='save'&&!loginCodes.has(record.errorCode))action('Inspect provider receipt',async()=>{
      const response=await inspectAttempt(record.attemptId);
      description.textContent=response?.reconciliation?.state==='verified'?'Provider receipt verified.':'The provider has no verified receipt for this attempt.';
    });
    if(record.category==='attention'&&record.capabilities.retry&&retryScreenshot)action('Check or retry screenshot',async()=>{
      if(confirm('Use the existing screenshot recovery for this capture? It checks the original destination before sending bytes.'))await retryScreenshot(record.attemptId);
    });
    if(record.category==='attention'&&!record.accountingPending)action('Acknowledge',async()=>{
      await jobs.acknowledge(record.recordId,record.observedAt);selected=null;inspector.hidden=true;scroller.focus();await refresh();
    });
    inspector.replaceChildren(heading,description,actions);
  }
  function updateRow(button,record) {
    const [name,detail,progress]=button.children;
    name.textContent=record.filename??'Filename unavailable';
    detail.textContent=state(record)+' · '+location(record)+' · '+(record.requestedAt==null?'N/A':new Date(record.requestedAt).toLocaleString());
    progress.hidden=record.category!=='working';
    if(record.progress==null)progress.removeAttribute('value');else progress.value=record.progress;
    button.onclick=()=>showDetails(record);
  }
  async function refresh(force=true) {
    const target=Math.max(0,Math.floor(scroller.scrollTop/rowHeight)-2);
    if(!force&&target===offset)return;
    const current=++ticket;
    try {
      const page=await jobs.page({offset:target,category});
      if(current!==ticket||!section.isConnected)return;
      offset=target;
      feedback.textContent=page.total?'':category?'No jobs in this view':'No active jobs';
      for(const [id] of groups)$(`[data-job-filter="${id}"] span`).textContent=String(page.counts[id]);
      const ids=new Set(page.items.map(record=>record.recordId));
      for(const [id,node] of rendered)if(!ids.has(id)) {
        if(node===document.activeElement){scroller.focus({preventScroll:true});}
        node.remove();rendered.delete(id);
      }
      let next=lower;
      for(const record of page.items.toReversed()) {
        let row=rendered.get(record.recordId);
        if(!row){row=document.createElement('button');row.type='button';row.className='queue-job-row';row.innerHTML='<strong></strong><span></span><progress max="100" aria-label="Job progress"></progress>';rendered.set(record.recordId,row);}
        updateRow(row,record);
        if(row.nextElementSibling!==next||row.parentNode!==list)list.insertBefore(row,next);
        next=row;
      }
      upper.style.height=`${Math.min(target,page.total)*rowHeight}px`;
      lower.style.height=`${Math.max(0,page.total-target-page.items.length)*rowHeight}px`;
      if(force&&selected&&!page.items.some(job=>job.recordId===selected)&&rendered.size===0){inspector.hidden=true;selected=null;}
    } catch { if(current===ticket)feedback.textContent='Jobs are temporarily unavailable. Reopen Queue to retry.'; }
  }
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;void refresh(false);});};
  scroller.addEventListener('scroll',schedule,{passive:true});
  function filter(next){category=next;for(const button of section.querySelectorAll('[data-job-filter]'))button.setAttribute('aria-pressed',String((button.dataset.jobFilter||null)===next));scroller.scrollTop=0;void refresh();}
  for(const button of section.querySelectorAll('[data-job-filter]'))button.onclick=()=>filter(button.dataset.jobFilter||null);
  const unsubscribe=subscribe(update=>{if(update==='jobs')feedback.textContent='Some job updates could not be saved. The owner receipts are kept.';else if(update==='source')feedback.textContent='Some owner job receipts are unavailable.';else void refresh();});
  filter(category);
  const savedScroll=viewState.scrollTop??0;
  if(savedScroll>0)void refresh().then(()=>{if(section.isConnected){scroller.scrollTop=savedScroll;void refresh();}});
  return ()=>{viewState.category=category;viewState.scrollTop=scroller.scrollTop;ticket++;unsubscribe();cancelAnimationFrame(frame);section.remove();};
}
