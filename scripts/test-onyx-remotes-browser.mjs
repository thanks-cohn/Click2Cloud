// Focused production CSS + real provider renderer fixture (no provider credentials).
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {chromium} from 'playwright-core';
const root=process.cwd(),out=resolve('work/onyx-remotes');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(root+'/')&&!path.startsWith(root+'\\')){res.writeHead(403).end();return;}
  const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.png':'image/png'};
  let bytes=await readFile(path);
  if(path.endsWith('app.html'))bytes=bytes.toString().replace(/<script\b[^>]*><\/script>/g,'');
  res.setHeader('Content-Type',mime[extname(path)]??'application/octet-stream');res.end(bytes);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true});
 const page=await browser.newPage({viewport:{width:380,height:760}});
 await page.goto('http://127.0.0.1:'+server.address().port+'/extension/app.html');
 await page.evaluate(async()=>{
  const {createBasicProviderCards}=await import('/extension/basic-provider-cards.mjs');
  const {createAestheticHost}=await import('/src/aesthetic/host.mjs');
  const host=createAestheticHost({root:document.documentElement});
  window.testHost=host;await host.apply({id:'onyx',persist:false});
  const calls=window.providerCalls=[];
  const runtime={sendMessage:async m=>{
    calls.push([m.op,m.input.provider]);
    if(m.op==='auth.refresh'&&window.deferRefresh){
      await new Promise(resolve=>window.releaseRefresh=resolve);
      if(window.failRefresh)return {ok:false,error:{code:'FIXTURE_ERROR',message:'Long fixture error: check your account connection and retry.'}};
    }
    const connected=m.input.provider==='dropbox'||m.op==='auth.connect'||m.op==='auth.reconnect';
    return {ok:true,value:m.op==='saves.pending'?null:m.op==='providers.goTo'?{opened:true}:{connected,ready:connected,authorized:connected}};
  }};
  const stack=createBasicProviderCards({runtime,document,pulseEnabled:()=>true});
  window.testProviderCards=stack;
  const slot=document.createElement('div');document.querySelector('.remotes-page').append(slot);stack.mount(slot);
  document.querySelectorAll('header button,#manage').forEach(b=>b.disabled=false);
  document.querySelector('header [data-view=remotes]').classList.add('active');
 });
 await page.locator('[data-provider=dropbox][data-onyx-connected]').waitFor();
 assert(await page.locator('#theme .onyx-moon').isVisible());
 assert(!(await page.locator('#theme .onyx-sun').isVisible()));
 await page.evaluate(()=>document.documentElement.dataset.theme='light');
 assert(await page.locator('#theme .onyx-sun').isVisible());
 assert(!(await page.locator('#theme .onyx-moon').isVisible()));
 await page.evaluate(()=>document.documentElement.dataset.theme='dark');
 // The approved Providers header is the canonical header for every Onyx view.
 const headerAppearance=()=>page.locator('.app-header').evaluate(header=>{
  const read=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {
   geometry:[r.x,r.y,r.width,r.height],background:s.background,color:s.color,border:s.borderBottom,
   padding:s.padding,gap:s.gap,font:s.font,fontSize:s.fontSize,fontWeight:s.fontWeight,
   radius:s.borderRadius,shadow:s.boxShadow
  }};
  const active=header.querySelector('nav>button.active');
  const indicator=active?getComputedStyle(active,'::after'):null;
  return {header:read(header),nav:read(header.querySelector('nav')),controls:read(header.querySelector('.header-controls')),
   logo:read(header.querySelector('.brand-lockup')),tabs:[...header.querySelectorAll('nav>button')].map(read),
   more:read(header.querySelector('#header-more')),theme:read(header.querySelector('#theme')),
   indicator:indicator&&[indicator.content,indicator.backgroundColor,indicator.width,indicator.height]};
 });
 for(const width of [320,380,480,800])for(const finish of ['onyx','platinum','gunmetal','obsidian','azure'])for(const mode of ['dark','light']){
  await page.setViewportSize({width,height:760});
  await page.evaluate(async({finish,mode})=>{
   document.documentElement.dataset.theme=mode;document.querySelector('#shell').dataset.view='remotes';
   await window.testHost.apply({id:'onyx',finish,persist:false});
  },{finish,mode});
  const reference=await headerAppearance();
  assert.equal(reference.header.geometry[3],66,'Providers header height must remain canonical');
  const selection=await page.locator('.app-header nav>button.active').evaluate(el=>{
   const s=getComputedStyle(el);return {radius:s.borderRadius,border:s.borderTopColor,shadow:s.boxShadow,fill:s.backgroundColor,after:getComputedStyle(el,'::after').content};
  });
  assert.equal(selection.radius,'0px');assert.equal(selection.border,'rgba(0, 0, 0, 0)');
  assert.equal(selection.shadow,'none');assert.notEqual(selection.fill,'rgba(0, 0, 0, 0)');assert.equal(selection.after,'none');
  for(const view of ['queue','history','explorer','settings','screenshot','downloads']){
   await page.evaluate(view=>document.querySelector('#shell').dataset.view=view,view);
   assert.deepEqual(await headerAppearance(),reference,JSON.stringify({width,finish,mode,view}));
  }
 }
 await page.setViewportSize({width:380,height:760});
 await page.evaluate(async()=>{document.documentElement.dataset.theme='dark';document.querySelector('#shell').dataset.view='remotes';await window.testHost.apply({id:'onyx',finish:'onyx',persist:false});});
 // The shared button is the existing Explorer icon, not a layout-consuming footer.
 const manage=page.locator('#manage');
 const manageGeometry=()=>manage.evaluate(el=>{
  const rect=el.getBoundingClientRect(),icon=el.querySelector('svg').getBoundingClientRect();
  const slot=el.parentElement,main=document.querySelector('#main'),shell=slot.parentElement;
  return {x:rect.x,width:rect.width,iconX:icon.x,iconWidth:icon.width,
   labelOpacity:getComputedStyle(el.querySelector('span')).opacity,
   rightGap:rect.right-el.querySelector('span').getBoundingClientRect().right,
   duration:getComputedStyle(el).transitionDuration,
   slotPosition:getComputedStyle(slot).position,slotBackground:getComputedStyle(slot).backgroundColor,
   mainBottom:main.getBoundingClientRect().bottom,shellBottom:shell.getBoundingClientRect().bottom};
 });
 for(const view of ['remotes','queue','history','settings','screenshot','downloads']){
  await page.mouse.move(1,1);
  await page.evaluate(view=>{document.activeElement?.blur();document.querySelector('#shell').dataset.view=view;},view);
  await page.waitForFunction(()=>Math.abs(document.querySelector('#manage').getBoundingClientRect().width-36)<1);
  const idle=await manageGeometry();
  assert.equal(idle.slotPosition,'absolute');assert.equal(idle.slotBackground,'rgba(0, 0, 0, 0)');
  assert.equal(idle.mainBottom,idle.shellBottom);assert.equal(idle.iconWidth,16);
  await manage.hover();
  await page.waitForFunction(()=>{
   const el=document.querySelector('#manage'),label=el.querySelector('span');
   const gap=el.getBoundingClientRect().right-label.getBoundingClientRect().right;
   return gap>=7&&gap<=9&&getComputedStyle(label).opacity==='1';
  });
  const expanded=await manageGeometry();
  assert.equal(expanded.x,idle.x);assert.equal(expanded.iconX,idle.iconX);
  assert.equal(expanded.mainBottom,idle.mainBottom);
  assert(expanded.rightGap>=7&&expanded.rightGap<=9,'Expanded button must fit its text with tight right padding');
  assert.equal(expanded.duration,'0.48s');assert.equal(idle.duration,'0.42s');
  await page.mouse.move(1,1);
  await page.waitForFunction(()=>Math.abs(document.querySelector('#manage').getBoundingClientRect().width-36)<1&&getComputedStyle(document.querySelector('#manage span')).opacity==='0');
 }
 await page.evaluate(()=>document.querySelector('#shell').dataset.view='remotes');
 await manage.focus();
 await page.waitForFunction(()=>{
  const el=document.querySelector('#manage'),label=el.querySelector('span');
  const gap=el.getBoundingClientRect().right-label.getBoundingClientRect().right;
  return gap>=7&&gap<=9&&getComputedStyle(label).opacity==='1';
 });
 await manage.evaluate(el=>el.blur());
 await page.locator('#repair-me').evaluate(el=>el.hidden=false);
 await manage.hover();
 await page.waitForFunction(()=>{
  const el=document.querySelector('#manage'),label=el.querySelector('span');
  const gap=el.getBoundingClientRect().right-label.getBoundingClientRect().right;
  return gap>=7&&gap<=9&&getComputedStyle(label).opacity==='1';
 });
 const [manageBounds,repairBounds]=await Promise.all([manage.boundingBox(),page.locator('#repair-me').boundingBox()]);
 assert(repairBounds&&manageBounds.x+manageBounds.width<=repairBounds.x);
 await page.locator('#repair-me').evaluate(el=>el.hidden=true);
 await page.mouse.move(1,1);
 // Outer page geometry must be symmetric with and without vertical overflow.
 for(const width of [320,380,480,800,1200]){
  await page.setViewportSize({width,height:760});
  for(const view of ['remotes','queue','history','settings','screenshot','downloads']){
   await page.evaluate(view=>{
    const shell=document.querySelector('#shell'),main=document.querySelector('#main');
    shell.dataset.view=view;
    const fixture=document.createElement('section');fixture.className='page '+(view==='remotes'?'remotes-page':view==='queue'||view==='history'?'queue-page':'');
    fixture.id='outer-page-fixture';fixture.innerHTML='<div data-outer-content style="height:20px"></div>';
    for(const child of main.children)child.hidden=true;
    main.append(fixture);
   },view);
   for(const height of [20,1800]){
    const insets=await page.locator('#outer-page-fixture').evaluate((el,height)=>{
     const child=el.querySelector('[data-outer-content]');child.style.height=height+'px';
     const c=child.getBoundingClientRect(),r=el.parentElement.getBoundingClientRect();
     return {left:c.left-r.left,right:r.right-c.right,gutter:getComputedStyle(el.parentElement).scrollbarGutter};
    },height);
    assert.equal(insets.gutter,'stable both-edges');
    assert(Math.abs(insets.left-insets.right)<=1,JSON.stringify({width,view,height,insets}));
   }
   await page.evaluate(()=>{const main=document.querySelector('#main');document.querySelector('#outer-page-fixture').remove();for(const child of main.children)child.hidden=false;});
  }
 }
 await page.setViewportSize({width:380,height:760});
 await page.evaluate(()=>document.querySelector('#shell').dataset.view='remotes');
 // History uses native disclosures with two persistent, animated CSS strokes.
 await page.evaluate(()=>{
  const shell=document.querySelector('#shell');shell.dataset.view='history';
  const fixture=document.createElement('section');fixture.id='history-disclosure-fixture';fixture.className='queue-archive';
  fixture.innerHTML='<details class="queue-calendar"><summary>November 2026</summary><article class="queue-history-card"><details><summary>URLs</summary><p>Example URL</p></details></article></details>';
  document.querySelector('#main').prepend(fixture);
 });
 const historySummary=page.locator('#history-disclosure-fixture>.queue-calendar>summary');
 const strokes=()=>historySummary.evaluate(el=>{
  const read=pseudo=>{const s=getComputedStyle(el,pseudo);return {width:parseFloat(s.width),left:parseFloat(s.left),top:parseFloat(s.top),transform:s.transform,opacity:s.opacity,background:s.backgroundColor,duration:s.transitionDuration}};
  return {open:el.parentElement.open,upper:read('::before'),lower:read('::after'),marker:getComputedStyle(el,'::marker').content,list:getComputedStyle(el).listStyleType,text:el.textContent};
 });
 const closed=await strokes();
 assert.equal(closed.open,false);assert.equal(closed.list,'none');assert.equal(closed.text,'November 2026');
 assert.equal(closed.upper.width,6.5);assert.equal(closed.lower.width,6.5);
 assert.notEqual(closed.upper.transform,closed.lower.transform);
 const samples=await historySummary.evaluate(async el=>{
  const frames=[];
  const read=pseudo=>{const s=getComputedStyle(el,pseudo);return {width:parseFloat(s.width),top:parseFloat(s.top),left:parseFloat(s.left),transform:s.transform,opacity:s.opacity}};
  el.click();
  await new Promise(resolve=>{const start=performance.now();function frame(){frames.push({upper:read('::before'),lower:read('::after')});if(performance.now()-start<500)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});
  return frames;
 });
 const opened=await strokes();
 assert.equal(opened.open,true);assert.equal(opened.upper.width,12);assert.equal(opened.lower.width,7);
 assert(opened.upper.top<closed.upper.top&&opened.lower.top>closed.lower.top);
 assert(samples.some(f=>f.upper.width>6.5&&f.upper.width<11.9&&f.upper.top<closed.upper.top&&f.upper.top>opened.upper.top&&f.upper.transform!==closed.upper.transform&&f.upper.transform!==opened.upper.transform),'Upper stroke must travel and rotate through intermediate frames');
 assert(samples.some(f=>f.lower.top>closed.lower.top&&f.lower.top<opened.lower.top&&f.lower.transform!==closed.lower.transform&&f.lower.transform!==opened.lower.transform),'Lower stroke must travel and rotate independently');
 assert(samples.every(f=>f.upper.opacity==='1'&&f.lower.opacity==='1'),'Neither stroke may flash or fade');
 const nested=page.locator('#history-disclosure-fixture .queue-history-card summary');
 await nested.press('Enter');
 assert(await nested.evaluate(el=>el.parentElement.open));
 await nested.press('Enter');
 assert(!(await nested.evaluate(el=>el.parentElement.open)));
 await historySummary.press('Space');
 await page.waitForFunction(()=>{const el=document.querySelector('#history-disclosure-fixture>.queue-calendar>summary');return !el.parentElement.open&&getComputedStyle(el,'::before').width==='6.5px'});
 await page.emulateMedia({reducedMotion:'reduce'});
 await historySummary.press('Enter');
 assert.equal((await strokes()).upper.duration,'0s');
 assert.equal((await strokes()).upper.width,12);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{document.querySelector('#history-disclosure-fixture').remove();document.querySelector('#shell').dataset.view='remotes';});
 // Queue job surfaces retain status colors on the top rule only, with open sides.
 for(const mode of ['dark','light']){
  const rules=await page.evaluate(mode=>{
   document.documentElement.dataset.theme=mode;
   document.querySelector('#shell').dataset.view='queue';
   const fixture=document.createElement('section');
   fixture.className='queue-page';
   document.querySelector('#main').append(fixture);
   const results=[];
   for(const state of ['working','uploading','verifying','failed','uncertain','blocked','verified','waiting','cancelled']){
    const card=document.createElement('article');
    card.className='queue-job';card.dataset.queueState=state;fixture.append(card);
    const style=getComputedStyle(card);
    const expected=['working','uploading','verifying'].includes(state)?'--onyx-blue':['failed','uncertain','blocked'].includes(state)?'--onyx-amber':state==='verified'?'--onyx-green':'--line';
    const probe=document.createElement('span');card.append(probe);
    probe.style.color='var('+expected+')';
    const top=getComputedStyle(probe).color;
    probe.style.color='var(--line)';
    results.push({state,sides:[style.borderLeftWidth,style.borderRightWidth],horizontal:[style.borderTopWidth,style.borderBottomWidth],top:style.borderTopColor,expectedTop:top,bottom:style.borderBottomColor,expectedBottom:getComputedStyle(probe).color,radius:style.borderRadius});
   }
   fixture.remove();return results;
  },mode);
  for(const rule of rules){
   assert.deepEqual(rule.sides,['0px','0px'],rule.state);
   assert.deepEqual(rule.horizontal,['1px','1px'],rule.state);
   assert.equal(rule.top,rule.expectedTop,rule.state);
   assert.equal(rule.bottom,rule.expectedBottom,rule.state);
   assert.equal(rule.radius,'0px',rule.state);
  }
 }
 await page.evaluate(()=>{document.documentElement.dataset.theme='dark';document.querySelector('#shell').dataset.view='remotes';});
 // Use the production virtualized Queue renderer with a long job list.
 await page.evaluate(async()=>{
  const {mountLiveJobs}=await import('/extension/queue-page.mjs');
  const main=document.querySelector('#main');
  document.querySelector('#shell').dataset.view='queue';
  const fixture=document.createElement('section');fixture.className='page queue-page';fixture.id='queue-scroll-fixture';
  for(const child of main.children)child.hidden=true;
  main.append(fixture);
  const rows=Array.from({length:125},(_,i)=>({recordId:'job-'+i,filename:'fixture-'+i+'.png',provider:'google',status:'verified',rank:3,terminal:true,updatedAt:1}));
  window.queueFixtureCalls=[];
  window.queueFixtureScope=new AbortController();
  mountLiveJobs(fixture,{service:{store:{jobs:async({offset,limit})=>{
   window.queueFixtureCalls.push([offset,limit]);return {items:rows.slice(offset,offset+limit),total:rows.length,working:0,waiting:0,attention:0,finished:rows.length};
  }},control:async()=>({}),accountingPending:false},signal:window.queueFixtureScope.signal});
 });
 await page.locator('#queue-scroll-fixture .queue-job').first().waitFor();
 const queueLayout=await page.locator('#queue-scroll-fixture').evaluate(el=>{
  const window=el.querySelector('.queue-job-window'),main=el.parentElement;
  const cancel=el.querySelector('[data-cancel-all]'),clear=el.querySelector('[data-clear-all]');
  return {overflow:getComputedStyle(window).overflowY,maxHeight:getComputedStyle(window).maxHeight,
   outerScrollable:main.scrollHeight>main.clientHeight,
   left:clear.getBoundingClientRect().left,right:cancel.getBoundingClientRect().right,
   edges:[el.querySelector('.queue-actions').getBoundingClientRect().left,el.querySelector('.queue-actions').getBoundingClientRect().right],
   borders:[getComputedStyle(cancel).borderTopWidth,getComputedStyle(clear).borderTopWidth],
   colors:[getComputedStyle(cancel).color,getComputedStyle(clear).color]};
 });
 assert.equal(queueLayout.overflow,'visible');assert.equal(queueLayout.maxHeight,'none');assert(queueLayout.outerScrollable);
 assert(Math.abs(queueLayout.left-queueLayout.edges[0])<=1);assert(Math.abs(queueLayout.right-queueLayout.edges[1])<=1);
 assert.deepEqual(queueLayout.borders,['0px','0px']);assert.notEqual(...queueLayout.colors);
 await page.locator('#main').evaluate(el=>el.scrollTop=el.scrollHeight);
 await page.waitForFunction(()=>[...document.querySelectorAll('#queue-scroll-fixture .queue-job strong')].some(el=>el.textContent==='fixture-124.png'));
 assert(await page.locator('#queue-scroll-fixture .queue-job').count()<125);
 await page.evaluate(()=>{
  window.queueFixtureScope.abort();document.querySelector('#queue-scroll-fixture').remove();
  const main=document.querySelector('#main');for(const child of main.children)child.hidden=false;main.scrollTop=0;
  document.querySelector('#shell').dataset.view='remotes';
 });
 // Every view shares the same header glyph, dimensions and color.
 const iconAppearance=()=>page.locator('#theme .onyx-mode-icon:visible').evaluate(el=>{
  const style=getComputedStyle(el);return {className:el.getAttribute('class'),width:style.width,height:style.height,color:style.color};
 });
 for(const mode of ['dark','light']){
  await page.evaluate(mode=>{document.documentElement.dataset.theme=mode;document.querySelector('#shell').dataset.view='remotes';},mode);
  const reference=await iconAppearance();
  for(const view of ['queue','history','explorer','settings','screenshot','downloads']){
   await page.evaluate(view=>document.querySelector('#shell').dataset.view=view,view);
   assert.deepEqual(await iconAppearance(),reference,'Shared appearance icon must not change on '+view);
   assert.equal(await page.locator('#theme :is(.theme-sun,.theme-moon,.chrome-appearance-icon):visible').count(),0);
  }
 }
 await page.evaluate(()=>{document.documentElement.dataset.theme='dark';document.querySelector('#shell').dataset.view='remotes';});
 const scrollbar=await page.locator('#main').evaluate(el=>{
  const width=getComputedStyle(el,'::-webkit-scrollbar').width;
  const thumb=getComputedStyle(el,'::-webkit-scrollbar-thumb');
  const track=getComputedStyle(el,'::-webkit-scrollbar-track');
  return {width,radius:thumb.borderTopLeftRadius,track:track.backgroundColor,idle:thumb.backgroundColor,
   hover:getComputedStyle(el).getPropertyValue('--shelf-scroll-hover').trim(),active:getComputedStyle(el).getPropertyValue('--shelf-scroll-active').trim()};
 });
 assert.equal(scrollbar.width,'9px');
 assert.equal(scrollbar.radius,'999px');
 assert.equal(scrollbar.track,'rgba(0, 0, 0, 0)');
 assert.equal(scrollbar.idle,'rgb(41, 59, 83)');
 assert.equal(scrollbar.hover,'#506b8d');assert.equal(scrollbar.active,'#7495bd');
 // Shared scrollbars: all theme packages, Nostalgia styles and Onyx finishes.
 // Use a real overflow element to verify native vertical/horizontal movement.
 await page.evaluate(()=>{
  const el=document.createElement('div');el.id='scrollbar-fixture';
  el.style.cssText='position:fixed;top:0;left:0;width:100px;height:100px;overflow:scroll;pointer-events:none';
  const content=document.createElement('div');content.style.cssText='width:300px;height:300px';el.append(content);
  document.querySelector('#main').append(el);
 });
 const skins=[...['minimal','standard','golden-age','oceania','frames','chrome'].map(id=>({id})),
  ...['kawaii','dungeon-master','heroine'].map(style=>({id:'nostalgia',style})),
  ...['onyx','platinum','gunmetal','obsidian','azure'].map(finish=>({id:'onyx',finish}))];
 for(const skin of skins)for(const mode of ['dark','light']){
  await page.evaluate(async({skin,mode})=>{document.documentElement.dataset.theme=mode;await window.testHost.apply({...skin,persist:false});},{skin,mode});
  for(const view of ['remotes','queue','history','explorer','settings','screenshot']){
   await page.evaluate(view=>document.querySelector('#shell').dataset.view=view,view);
   const metrics=await page.locator('#scrollbar-fixture').evaluate(el=>{
    el.scrollTop=60;el.scrollLeft=60;
    return {width:getComputedStyle(el,'::-webkit-scrollbar').width,height:getComputedStyle(el,'::-webkit-scrollbar').height,
     thumb:getComputedStyle(el,'::-webkit-scrollbar-thumb').borderTopLeftRadius,
     track:getComputedStyle(el,'::-webkit-scrollbar-track').backgroundColor,
     top:el.scrollTop,left:el.scrollLeft};
   });
   assert.deepEqual(metrics,{width:'9px',height:'9px',thumb:'999px',track:'rgba(0, 0, 0, 0)',top:60,left:60},JSON.stringify({skin,mode,view}));
   if(skin.id==='onyx'){
    const color=await page.locator('#scrollbar-fixture').evaluate(el=>getComputedStyle(el,'::-webkit-scrollbar-thumb').backgroundColor);
    assert.equal(color,mode==='light'||skin.finish==='platinum'?'rgb(135, 156, 182)':'rgb(41, 59, 83)');
   }
  }
 }
 await page.evaluate(async()=>{document.querySelector('#scrollbar-fixture').remove();document.documentElement.dataset.theme='dark';document.querySelector('#shell').dataset.view='remotes';await window.testHost.apply({id:'onyx',finish:'onyx',persist:false});});
 const google=page.locator('[data-provider=google]'),dropbox=page.locator('[data-provider=dropbox]');
 assert.deepEqual(await page.locator('.remote-provider .onyx-provider-meta').allTextContents(),['15 GB Free','5 GB Free','2 GB Free']);
 // Exercise the real projection on mounted provider cards without credentials.
 await page.evaluate(async()=>{
  const {paintProviderUploadProgress}=await import('/extension/onyx-provider-progress.mjs');
  window.paintUploadFixture=jobs=>paintProviderUploadProgress(document,jobs);
 });
 const free=dropbox.locator('.onyx-free-caption'),transfer=dropbox.locator('.onyx-provider-transfer');
 await page.evaluate(()=>window.paintUploadFixture([{provider:'dropbox',status:'uploading',progress:37}]));
 assert(await transfer.isVisible());assert.equal(await transfer.getAttribute('aria-valuenow'),'37');
 assert.equal(await free.isVisible(),false);
 await page.evaluate(()=>window.paintUploadFixture([{provider:'dropbox',status:'uploading'},{provider:'dropbox',status:'verifying'}]));
 assert.equal(await transfer.getAttribute('aria-valuenow'),null);
 await page.evaluate(()=>window.paintUploadFixture([]));
 assert.equal(await transfer.isVisible(),false);assert(await free.isVisible());
 const box=locator=>locator.boundingBox();
 for(const width of [320,380,480,800]){
  await page.setViewportSize({width,height:760});await page.mouse.move(0,0);
  const geometry=await page.locator('.remote-provider').evaluateAll(cards=>cards.map(card=>{
   const title=card.querySelector('.remote-provider-heading').getBoundingClientRect(),button=card.querySelector(card.hasAttribute('data-onyx-connected')?'[data-go]':'[data-connect]').getBoundingClientRect(),rect=card.getBoundingClientRect();
   return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,overlap:title.right>button.left+1,verticalOverlap:title.top<button.bottom&&title.bottom>button.top,overflow:card.scrollWidth>card.clientWidth+1};
  }));
  assert(geometry.every((g,i)=>!g.overlap&&g.verticalOverlap&&!g.overflow&&g.left>=0&&g.right<=width&&(!i||g.top>=geometry[i-1].bottom)),JSON.stringify({width,geometry}));
  const allBoxes=()=>page.locator('.remote-provider').evaluateAll(cards=>cards.map(card=>{const r=card.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
  const atRest=await allBoxes();
  for(const card of [google,dropbox]){
   await card.hover({position:{x:20,y:20}});
   assert.deepEqual(await allBoxes(),atRest,'Hover must never resize or displace cards at '+width);
   const refresh=card.locator('[data-refresh]');
   await page.waitForFunction(el=>getComputedStyle(el).opacity==='1',await refresh.elementHandle());
   const primaryAction=card.locator(card===google?'[data-connect]':'[data-go]');
   const icon=await refresh.boundingBox(),primary=await primaryAction.boundingBox();
   const outline=await primaryAction.evaluate(el=>{
    const style=getComputedStyle(el),divider=getComputedStyle(el.parentElement,'::before');
    const card=el.closest('.remote-provider').getBoundingClientRect(),r=el.getBoundingClientRect();
    return {sides:[style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth],divider:divider.content,dividerWidth:divider.width,inset:r.right<card.right-3};
   });
   assert.deepEqual(outline.sides,['1px','1px','1px','0px'],'Only three button sides should be outlined');
   assert.notEqual(outline.divider,'none','Independent divider must remain present');
   assert.equal(outline.dividerWidth,'1px');
   assert(outline.inset,'The action must be inset from the card edge');
   assert(icon.x+icon.width<=primary.x+1,'Refresh must be left of the primary edge');
   assert(Math.abs(icon.y+icon.height/2-primary.y-primary.height/2)<=1,'Refresh must be vertically centered');
   assert.equal(await refresh.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
   await refresh.hover();
   assert.deepEqual(await allBoxes(),atRest,'Refresh hover cannot move cards');
   await page.mouse.move(0,0);
   assert.deepEqual(await allBoxes(),atRest,'Leaving hover cannot move cards');
  }
  const browse=dropbox.locator('[data-go]');
  const browseState=()=>browse.evaluate(el=>{
   const r=el.getBoundingClientRect();
   const opacity=sel=>getComputedStyle(el.querySelector(sel)).opacity;
   return {right:r.right,top:r.top,height:r.height,width:r.width,word:opacity('.onyx-browse-word'),closed:opacity('.onyx-folder-closed'),open:opacity('.onyx-folder-open')};
  });
  const waitWidth=async width=>page.waitForFunction(({el,width})=>Math.abs(el.getBoundingClientRect().width-width)<.1,{el:await browse.elementHandle(),width});
  await page.mouse.move(0,0);
  await waitWidth(44);
  const idle=await browseState();
  assert.equal(idle.word,'0');assert.equal(idle.closed,'1');assert.equal(idle.open,'0');
  // Sample the entire transition, starting with the pointer entering the card.
  // Refresh must remain invisible on every frame before the dock reaches full width.
  const frames=page.evaluate(async()=>{
   const card=document.querySelector('[data-provider=dropbox]'),button=card.querySelector('[data-go]'),refresh=card.querySelector('[data-refresh]');
   const samples=[];const start=performance.now(),limit=start+3000;
   await new Promise(resolve=>{function frame(){samples.push({time:performance.now()-start,width:button.getBoundingClientRect().width,opacity:Number(getComputedStyle(refresh).opacity)});if(performance.now()<limit)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});
   return samples;
  });
  await browse.hover();
  const expandedWidth=width<=345?88:92;
  await waitWidth(expandedWidth);
  const expanded=await browseState();
  const samples=await frames;
  assert(samples.some(f=>f.width>44&&f.width<expandedWidth-.5),'Expected intermediate Browse expansion frames');
  assert(samples.every(f=>f.width>=expandedWidth-.5||f.opacity===0),'Refresh must not appear before Browse is fully expanded');
  const fullyExpanded=samples.find(f=>f.width>=expandedWidth-.5);
  const firstRefresh=samples.find(f=>f.opacity>0);
  assert(fullyExpanded&&firstRefresh&&firstRefresh.time-fullyExpanded.time >=1970,'Refresh must wait two full seconds after expansion (allowing frame sampling tolerance)');
  assert(samples.some(f=>f.width>=expandedWidth-.5&&f.opacity===1),'Refresh must finish fading in');
  const sizes=await browse.evaluate(el=>({word:getComputedStyle(el.querySelector('.onyx-browse-word')).fontSize,folder:getComputedStyle(el.querySelector('.onyx-browse-symbol')).width,weight:getComputedStyle(el.querySelector('.onyx-browse-word')).fontWeight,stroke:getComputedStyle(el.querySelector('.onyx-folder-open')).strokeWidth}));
  assert.deepEqual(sizes,{word:'9px',folder:'13px',weight:'400',stroke:'1.1px'});
  assert.equal(expanded.word,'1');assert.equal(expanded.closed,'0');assert.equal(expanded.open,'1');
  assert.equal(expanded.right,idle.right);assert.equal(expanded.top,idle.top);assert.equal(expanded.height,idle.height);
  assert.deepEqual(await allBoxes(),atRest,'Browse hover must not move cards');
  await page.mouse.move(0,0);await waitWidth(44);
  assert.deepEqual(await allBoxes(),atRest,'Browse contraction must not move cards');
  const activity=dropbox.locator('[data-activity]');
  await page.evaluate(()=>{window.deferRefresh=true;window.failRefresh=false;});
  await dropbox.hover({position:{x:20,y:20}});
  await dropbox.locator('[data-refresh]').click();
  await page.waitForFunction(()=>typeof window.releaseRefresh==='function');
  assert.equal(await activity.textContent(),'Working…');
  assert.deepEqual(await allBoxes(),atRest,'Working status must not change any card bounds');
  await page.evaluate(()=>{window.releaseRefresh();delete window.releaseRefresh;});
  await page.waitForFunction(()=>document.querySelector('[data-provider=dropbox] [data-activity]').textContent==='Success!');
  assert.deepEqual(await allBoxes(),atRest,'Success pulse must not change card bounds');
  await page.waitForFunction(()=>document.querySelector('[data-provider=dropbox] [data-activity]').hidden);
  assert.deepEqual(await allBoxes(),atRest,'Status expiry must not change card bounds');
  await page.evaluate(()=>{window.failRefresh=true;});
  await dropbox.locator('[data-refresh]').click();
  await page.waitForFunction(()=>typeof window.releaseRefresh==='function');
  await page.evaluate(()=>{window.releaseRefresh();delete window.releaseRefresh;window.deferRefresh=false;});
  const details=dropbox.locator('.onyx-provider-detail-toggle');
  await details.waitFor({state:'visible'});
  assert.deepEqual(await allBoxes(),atRest,'Error must not change card bounds');
  await details.click();
  assert(await dropbox.locator('[data-feedback]').isVisible());
  assert.deepEqual(await allBoxes(),atRest,'Opening details must not change card bounds');
  await details.press('Escape');
  assert.equal(await details.getAttribute('aria-expanded'),'false');
  await dropbox.locator('[data-refresh]').click();
  await page.waitForFunction(()=>document.querySelector('[data-provider=dropbox] [data-activity]').hidden);
  await page.mouse.move(0,0);
  assert.deepEqual(await allBoxes(),atRest,'Recovery must not change card bounds');
  assert(await page.locator('#manage').isVisible());
  await page.screenshot({path:join(out,'provider-fixture-'+width+'.png')});
 }
 await page.setViewportSize({width:380,height:760});
 await page.mouse.move(0,0);
 const primary=google.locator('[data-connect]'),before=await box(primary);
 await primary.hover();
 const after=await box(primary);
 assert(Math.abs(before.x-after.x)<=2&&Math.abs(before.y-after.y)<=2,'Primary dock must remain stable on hover');
 await primary.click();
 await google.locator('[data-connect][data-authenticated]').waitFor();
 await google.locator('[data-go]').click();
 await google.locator('[data-refresh]').focus();
 await google.locator('[data-refresh]').press('Enter');
 const calls=await page.evaluate(()=>window.providerCalls);
 assert(calls.some(([op,p])=>op==='auth.connect'&&p==='google'));
 assert(calls.some(([op,p])=>op==='providers.goTo'&&p==='google'));
 assert(calls.some(([op,p])=>op==='auth.refresh'&&p==='google'));
 await page.mouse.move(0,0);
 // A provider logout must remove Browse entirely and show Reconnect.
 // Reconnect only becomes Browse after the existing auth operation succeeds.
 await page.mouse.move(0,0);
 const reconnect=dropbox.locator('[data-connect]'),browseAfterAuth=dropbox.locator('[data-go]');
 await page.evaluate(()=>window.testProviderCards.onStatus({provider:'dropbox',connected:true,ready:false,authorized:false,phase:'reconnect-needed',reason:'AUTH_REQUIRED'}));
 assert.equal(await reconnect.textContent(),'Reconnect');
 assert.equal(await browseAfterAuth.isVisible(),false);
 await page.evaluate(()=>window.testProviderCards.onStatus({provider:'dropbox',connected:false,ready:false,authorized:false,phase:'disconnected',reason:'AUTH_REQUIRED'}));
 assert.equal(await reconnect.textContent(),'Reconnect','A previously connected provider must retain its reconnect label in Onyx');
 assert.equal(await browseAfterAuth.isVisible(),false);
 await page.evaluate(()=>window.testProviderCards.onStatus({provider:'dropbox',connected:true,ready:false,authorized:false,phase:'reconnect-needed',reason:'AUTH_REQUIRED'}));
 await reconnect.click();
 await page.waitForFunction(()=>document.querySelector('[data-provider=dropbox]').hasAttribute('data-onyx-connected'));
 assert(await browseAfterAuth.isVisible());
 assert((await page.evaluate(()=>window.providerCalls)).some(([op,p])=>op==='auth.reconnect'&&p==='dropbox'));
 await page.mouse.move(0,0);
 const fills=[];
 for(const finish of ['onyx','platinum','gunmetal','obsidian','azure']){
  await page.evaluate(async id=>window.testHost.apply({id:'onyx',finish:id,persist:false}),finish);
  fills.push(await page.locator('#main').evaluate(el=>getComputedStyle(el).backgroundColor));
 }
 assert.equal(new Set(fills).size,5);
 await page.evaluate(async()=>window.testHost.apply({id:'oceania',persist:false}));
 assert.equal(await dropbox.locator('.onyx-provider-meta').isVisible(),false);
 console.log('PASS: actual provider renderer + Onyx CSS: geometry, primary dock, secondary actions, five finishes, Oceania scope. Full application screenshots still required.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
