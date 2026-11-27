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
    if(m.op==='auth.disconnect')return {ok:true,value:{provider:m.input.provider,connected:false,ready:false,authorized:false,phase:'disconnected',reason:'AUTH_SIGNED_OUT'}};
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
  const rect=el.getBoundingClientRect(),icon=el.querySelector('svg').getBoundingClientRect(),style=getComputedStyle(el);
  const slot=el.parentElement,main=document.querySelector('#main'),shell=slot.parentElement;
  return {x:rect.x,width:rect.width,iconX:icon.x,iconWidth:icon.width,
   background:style.backgroundColor,backgroundImage:style.backgroundImage,shadow:style.boxShadow,
   sides:[style.borderInlineStartColor,style.borderInlineEndColor],
   radius:style.borderTopLeftRadius,railAccent:getComputedStyle(el,'::before').backgroundImage,
   rails:[style.borderBlockStartColor,style.borderBlockEndColor],
   railWidths:[style.borderBlockStartWidth,style.borderBlockEndWidth],
   opacity:style.opacity,labelOpacity:getComputedStyle(el.querySelector('span')).opacity,
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
  assert.equal(idle.opacity,view==='remotes'?'0':'1','Only Providers hides the entire resting destination control');
  assert.deepEqual(idle.sides,['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)']);
  assert.equal(idle.radius,'5px');assert.match(idle.railAccent,/linear-gradient/);
  await manage.hover();
  await page.waitForFunction(()=>{
   const el=document.querySelector('#manage'),label=el.querySelector('span');
   const gap=el.getBoundingClientRect().right-label.getBoundingClientRect().right;
   return gap>=7&&gap<=9&&getComputedStyle(label).opacity==='1';
  });
  const expanded=await manageGeometry();
  assert.equal(expanded.opacity,'1','Hover reveals the destination control');
  assert.equal(expanded.radius,'0px');assert.equal(expanded.railAccent,'none');
  assert.equal(expanded.x,idle.x);assert.equal(expanded.iconX,idle.iconX);
  assert.equal(expanded.mainBottom,idle.mainBottom);
  assert(expanded.rightGap>=7&&expanded.rightGap<=9,'Expanded button must fit its text with tight right padding');
  assert.equal(expanded.duration,'0.48s');assert.equal(idle.duration,'0.42s');
  assert.equal(expanded.background,'rgba(0, 0, 0, 0)');
  assert.equal(expanded.backgroundImage,'none');assert.equal(expanded.shadow,'none');
  assert.deepEqual(expanded.sides,['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)']);
  assert.deepEqual(expanded.rails,idle.rails);assert.deepEqual(expanded.railWidths,idle.railWidths);
  await page.mouse.move(1,1);
  await page.waitForFunction(()=>Math.abs(document.querySelector('#manage').getBoundingClientRect().width-36)<1&&getComputedStyle(document.querySelector('#manage span')).opacity==='0');
  const collapsed=await manageGeometry();
  assert.equal(collapsed.opacity,idle.opacity,'Leaving restores the resting visibility');
  assert.equal(collapsed.background,idle.background);assert.deepEqual(collapsed.sides,idle.sides);
 }
 await page.evaluate(()=>document.querySelector('#shell').dataset.view='remotes');
 await manage.focus();
 await page.waitForFunction(()=>{
  const el=document.querySelector('#manage'),label=el.querySelector('span');
  const gap=el.getBoundingClientRect().right-label.getBoundingClientRect().right;
  return gap>=7&&gap<=9&&getComputedStyle(label).opacity==='1';
 });
 assert.equal((await manageGeometry()).opacity,'1','Keyboard focus reveals Providers destination control');
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
   // Navigation fade is opt-in, never a flash on first paint or Explorer entry.
  await page.evaluate(()=>{
   const shell=document.querySelector('#shell'),button=document.querySelector('#manage');
   shell.dataset.view='queue';shell.removeAttribute('data-manage-fade');
   button.getBoundingClientRect();getComputedStyle(button).opacity;
   shell.setAttribute('data-manage-fade','');shell.dataset.view='remotes';
  });
  await page.waitForFunction(()=>{
   const opacity=Number(getComputedStyle(document.querySelector('#manage')).opacity);
   return opacity>0&&opacity<1;
  });
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#manage')).opacity==='0');
  await page.evaluate(()=>{
   const shell=document.querySelector('#shell'),button=document.querySelector('#manage');
   shell.dataset.view='explorer';shell.removeAttribute('data-manage-fade');
   button.getBoundingClientRect();getComputedStyle(button).opacity;
   shell.dataset.view='remotes';
  });
  assert.equal((await manageGeometry()).opacity,'0','Explorer entry hides without a fade');
  // Once the reveal is armed, leaving the hover area must dissolve, not snap.
  await manage.hover();
  await page.evaluate(()=>document.querySelector('#shell').setAttribute('data-manage-fade',''));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#manage span')).opacity==='1');
  await page.mouse.move(1,1);
  await page.waitForFunction(()=>{
   const opacity=Number(getComputedStyle(document.querySelector('#manage')).opacity);
   return opacity>0&&opacity<1;
  });
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#manage')).opacity==='0');

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{
   const shell=document.querySelector('#shell'),button=document.querySelector('#manage');
   shell.dataset.view='queue';getComputedStyle(button).opacity;
   shell.setAttribute('data-manage-fade','');shell.dataset.view='remotes';
  });
  assert.equal((await manageGeometry()).opacity,'0','Reduced motion disables fade');
  await page.evaluate(()=>document.querySelector('#shell').removeAttribute('data-manage-fade'));
  await page.emulateMedia({reducedMotion:'no-preference'});
  // The Explorer morph uses the existing button and returns to its exact original style.
  const morph=await page.evaluate(()=>{
   const shell=document.querySelector('#shell'),button=document.querySelector('#manage');
   const geometry=()=>{const s=getComputedStyle(button),r=button.getBoundingClientRect();return {width:r.width,radius:s.borderTopLeftRadius,side:s.borderInlineStartColor};};
   shell.dataset.view='explorer';shell.removeAttribute('data-manage-morph');
   const original=geometry();
   shell.dataset.view='queue';geometry();
   shell.setAttribute('data-manage-morph','');shell.dataset.view='explorer';
   const animation=button.getAnimations().find(a=>a.animationName?.startsWith('manage-explorer-morph'));
   if(!animation)throw Error('Expected Explorer button morph');
   if(animation.effect.getTiming().duration!==2200)throw Error('Expected deliberate 2.2 second morph');
   animation.pause();animation.currentTime=0;
   const start=geometry();
   animation.finish();
   const end=geometry();
   shell.removeAttribute('data-manage-morph');
   const excluded=getComputedStyle(button).animationName;
   shell.dataset.view='remotes';
   return {original,start,end,excluded};
  });
  assert.equal(morph.start.side,'rgba(0, 0, 0, 0)');
  assert.equal(morph.start.radius,'5px');
  assert.deepEqual(morph.end,morph.original,'Morph must settle into unmodified Explorer geometry');
  assert.equal(morph.excluded,'none','Excluded navigation keeps the original control');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.evaluate(()=>{
   const shell=document.querySelector('#shell');shell.setAttribute('data-manage-morph','');shell.dataset.view='explorer';
   return getComputedStyle(document.querySelector('#manage')).animationName;
  }),'none');
  await page.evaluate(()=>{const shell=document.querySelector('#shell');shell.removeAttribute('data-manage-morph');shell.dataset.view='remotes';});
  await page.emulateMedia({reducedMotion:'no-preference'});
  // Exercise the actual controller with a deterministic clock and real DOM geometry.
  await page.mouse.move(190,500);
  const hyperspace=await page.evaluate(async()=>{
   const {installHyperspace,normalizeHyperspace,ELEGANT_MS}=await import('/extension/hyperspace.mjs');
   const header=document.querySelector('.app-header'),shell=document.querySelector('#shell');
   document.activeElement?.blur();shell.dataset.view='remotes';
   let now=0,sequence=0;const timers=new Map(),frames=new Map();
   const clock={now:()=>now,set:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,at:now+ms});return id;},clear:id=>timers.delete(id),frame:fn=>{const id=++sequence;frames.set(id,fn);return id;},cancel:id=>frames.delete(id)};
   const advance=ms=>{now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}for(const [id,fn] of [...frames]){frames.delete(id);fn(now);}};
   const listeners=new Set();
   const preference={ready:Promise.resolve(),value:normalizeHyperspace(),subscribe:fn=>{listeners.add(fn);return ()=>listeners.delete(fn);}};
   const choose=mode=>{preference.value=normalizeHyperspace({mode,seconds:5});for(const fn of listeners)fn(preference.value);};
   const controller=installHyperspace({header,shell,preference,clock});
   const phase=()=>document.body.dataset.hyperspace??'closed';
   const move=(x,y)=>document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:x,clientY:y}));
   const phases=[];const main=shell.querySelector('main'),dock=shell.querySelector('#manage-slot');
   const logoPositions=[],providerThemePositions=[];const recordLogo=()=>{const r=header.querySelector('.brand-lockup').getBoundingClientRect();logoPositions.push([r.x,r.y,r.width,r.height]);if(shell.dataset.view==='remotes'){const t=header.querySelector('#theme').getBoundingClientRect();providerThemePositions.push([t.x,t.y,t.width,t.height]);}};recordLogo();
   const initial={shellTop:shell.getBoundingClientRect().top,mainTop:main.getBoundingClientRect().top,dockBottom:dock.getBoundingClientRect().bottom,translate:main.style.translate};
   controller.start();await Promise.resolve();advance(20000);
   const none={phase:phase(),timers:timers.size,frames:frames.size,overlay:!!header.querySelector('.hyperspace-overlay')};
   choose('hyperspace');move(10,10);move(190,500);
   advance(4999);phases.push(phase());advance(1);phases.push(phase());
   advance(1800);phases.push(phase());recordLogo();
   const overlay=header.querySelector('.hyperspace-overlay');
   const geometry=[...overlay.querySelectorAll('.hyperspace-rail')].map(el=>el.getAttribute('d'));
   const first=overlay.querySelector('.hyperspace-glint');
   advance(2000);const streak=first.getAttribute('stroke-dashoffset');
   advance(2999);phases.push(phase());const later=first.getAttribute('stroke-dashoffset');
   advance(1);phases.push(phase());
   const sweep=[];for(const step of [64,61,50,60,90,100]){
    advance(step);recordLogo();const lift=parseFloat(overlay.style.getPropertyValue('--hyper-lift'));
    sweep.push({lift,reserve:shell.style.getPropertyValue('--hyper-reserve'),height:shell.offsetHeight,mainTop:main.getBoundingClientRect().top,dockBottom:dock.getBoundingClientRect().bottom,translate:main.style.translate});
   }
   advance(1575);phases.push(phase());
   const heldFrames=frames.size;advance(15000);phases.push(phase());recordLogo();
   const paint={mainTop:main.getBoundingClientRect().top,dockBottom:dock.getBoundingClientRect().bottom,translate:main.style.translate,lifting:shell.hasAttribute('data-hyperspace-lifting'),header:getComputedStyle(header).backgroundColor,clip:getComputedStyle(overlay).clipPath,lift:parseFloat(overlay.style.getPropertyValue('--hyper-lift')),shellTop:shell.getBoundingClientRect().top,overlayTop:overlay.getBoundingClientRect().top,overlayHeight:overlay.getBoundingClientRect().height};
   move(10,10);advance(200);phases.push(phase());recordLogo();advance(1000);phases.push(phase());recordLogo();
   move(190,500);advance(1000);controller.viewChanged();shell.dataset.view='history';advance(10000);phases.push(phase());
   move(10,10);move(190,500);advance(5000);phases.push(phase());
   controller.viewChanged();shell.dataset.view='explorer';advance(10000);phases.push(phase());
   shell.dataset.view='remotes';choose('elegant');move(10,10);move(190,500);advance(4999);
   const elegantIdle=phase();const elegantHeaderRect=header.getBoundingClientRect();const themeStart=header.querySelector('#theme').getBoundingClientRect();advance(1);advance(350);recordLogo();const themeMid=header.querySelector('#theme').getBoundingClientRect();
   const elegantOverlay=header.querySelector('.hyperspace-overlay'),surface=elegantOverlay?.querySelector('.hyperspace-elegant-surface');
   const elegantMid={phase:phase(),opacity:Number(surface?.style.opacity),rails:elegantOverlay?.querySelectorAll('svg,.hyperspace-rail').length,lift:parseFloat(elegantOverlay?.style.getPropertyValue('--hyper-lift'))};
   advance(ELEGANT_MS);recordLogo();const elegantEnd={phase:phase(),headerHeight:elegantHeaderRect.height,headerTop:elegantHeaderRect.top,mainTop:main.getBoundingClientRect().top,shellTop:shell.getBoundingClientRect().top,dockBottom:dock.getBoundingClientRect().bottom,lift:parseFloat(elegantOverlay?.style.getPropertyValue('--hyper-lift')),frames:frames.size,surfaceOpacity:Number(surface?.style.opacity)};
   const brand=header.querySelector('.brand-lockup'),theme=header.querySelector('#theme');
   const logo=brand.querySelector('img')??brand,logoRect=logo.getBoundingClientRect(),headerRect=header.getBoundingClientRect();
   const themeEnd=theme.getBoundingClientRect();
   const themeGlide={mid:themeMid.left-themeStart.left,end:themeEnd.left-themeStart.left,right:themeEnd.right,edge:headerRect.right};
   const elegantHidden={themeOpacity:getComputedStyle(theme).opacity,themeVisibility:getComputedStyle(theme).visibility,navVisibility:getComputedStyle(header.querySelector('nav')).visibility,logoOpacity:getComputedStyle(brand).opacity,headerPointer:getComputedStyle(header).pointerEvents,logoPointer:getComputedStyle(brand).pointerEvents,overlayBackground:getComputedStyle(elegantOverlay).backgroundColor};
   // Preserve the hidden state for appearance writes and direct theme input.
   move(themeEnd.left+themeEnd.width/2,themeEnd.top+themeEnd.height/2);
   document.documentElement.setAttribute('data-aesthetic',document.documentElement.getAttribute('data-aesthetic'));
   await Promise.resolve();await Promise.resolve();advance(1500);
   const themeHoverPhase=phase();
   const headerStyle=getComputedStyle(header);
   const noPaint={visibility:headerStyle.visibility,background:headerStyle.backgroundColor,image:headerStyle.backgroundImage,border:headerStyle.borderBottomColor,shadow:headerStyle.boxShadow,themeBackground:getComputedStyle(theme).backgroundColor,bodyColor:getComputedStyle(document.body).backgroundColor,pageColor:getComputedStyle(main).backgroundColor};
   // Fixture mirrors app.mjs's color-mode mutation without a backend call.
   const root=document.documentElement,originalMode=root.dataset.theme;
   const toggle=()=>{root.dataset.theme=root.dataset.theme==='light'?'dark':'light';};
   theme.addEventListener('click',toggle);
   theme.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:themeEnd.left+5,clientY:themeEnd.top+5,pointerType:'mouse'}));
   theme.focus();theme.click();await Promise.resolve();await Promise.resolve();
   advance(1500);
   const afterThemeClick={phase:phase(),mode:root.dataset.theme,navVisibility:getComputedStyle(header.querySelector('nav')).visibility,themeVisibility:getComputedStyle(theme).visibility,frames:frames.size,mainTop:main.getBoundingClientRect().top};
   theme.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));theme.click();await Promise.resolve();await Promise.resolve();
   const afterThemeKeyboard={phase:phase(),mode:root.dataset.theme};
   theme.removeEventListener('click',toggle);theme.blur();
   // The middle of the original header, far from R and theme, restores it.
   move(headerRect.left+headerRect.width/2,headerRect.top+headerRect.height/2);advance(200);const elegantReturn=phase();recordLogo();advance(1000);const elegantClosed=phase();recordLogo();
   const viewReveal=[];
   for(const view of ['history','queue','screenshot','settings','downloads','remotes']){
    controller.viewChanged();shell.dataset.view=view;
    move(190,500);move(190,20);move(190,500);advance(5000);advance(ELEGANT_MS);
    const before=phase();const r=header.getBoundingClientRect();
    move(r.left+r.width/2,r.top+r.height/2);advance(200);const after=phase();advance(1000);
    viewReveal.push({view,before,after,closed:phase()});
   }
   const archiveSpacing=[],originalChildren=[...main.childNodes],originalScroll=main.scrollTop;
   for(const mode of ['elegant','hyperspace'])for(const view of ['history','queue']){
    controller.viewChanged();shell.dataset.view=view;choose(mode);
    const fixture=document.createElement('section');fixture.className='page queue-page';
    fixture.innerHTML='<h1>'+view+'</h1><section class="card '+(view==='history'?'queue-archive':'queue-jobs')+'">Content</section>';
    main.replaceChildren(fixture);main.scrollTop=0;
    const title=fixture.firstElementChild,content=fixture.lastElementChild;
    const read=()=>({title:title.getBoundingClientRect().top,content:content.getBoundingClientRect().top,gap:content.getBoundingClientRect().top-title.getBoundingClientRect().bottom});
    const initialArchive=read();move(190,500);move(190,20);move(190,500);advance(5000);advance(10000);
    const settled=read(),settledPhase=phase();
    move(190,20);advance(1000);
    const restored=read();
    archiveSpacing.push({mode,view,titleLift:initialArchive.title-settled.title,contentLift:initialArchive.content-settled.content,gap: settled.gap-initialArchive.gap,settledPhase,restored:Math.abs(restored.title-initialArchive.title)<.1&&Math.abs(restored.content-initialArchive.content)<.1});
   }
   const titleCentering=[];
   for(const mode of ['elegant','hyperspace'])for(const view of ['settings','screenshot']){
    controller.viewChanged();shell.dataset.view=view;choose(mode);
    const fixture=document.createElement('section');fixture.className=view==='screenshot'?'page screenshot-page':'page';
    fixture.innerHTML='<h1><span data-hyper-center-title>'+ (view==='settings'?'Settings':'Screenshots')+'</span></h1>'+(view==='screenshot'?'<div class="muted" data-keys><p><span data-hyper-center-shortcuts>Alt+Q · Ctrl+Shift+Y</span></p></div>':'')+'<section class="card">Content</section>';
    main.replaceChildren(fixture);main.scrollTop=0;
    const label=fixture.querySelector('[data-hyper-center-title]'),content=fixture.lastElementChild,keys=fixture.querySelector('[data-hyper-center-shortcuts]');
    const read=()=>{const r=label.getBoundingClientRect(),c=content.getBoundingClientRect();const k=keys?.getBoundingClientRect();return {center:r.left+r.width/2,top:r.top,contentX:c.left,contentWidth:c.width,contentTop:c.top,keysCenter:k?k.left+k.width/2:null};};
    const initialTitle=read(),hr=header.getBoundingClientRect(),target=hr.left+hr.width/2;
    move(190,500);move(190,20);move(190,500);advance(5000);advance(mode==='elegant'?525:6950);
    const mid=read();advance(10000);const settled=read(),settledPhase=phase();
    if(keys)keys.textContent='Alt+Shift+Q · Ctrl+Shift+Y';
    const updated=read();if(keys)keys.textContent='Alt+Q · Ctrl+Shift+Y';
    move(190,20);advance(1000);const restored=read();
    titleCentering.push({mode,view,initial:initialTitle,mid,settled,updated,restored,target,settledPhase,cleared:!main.style.getPropertyValue('--hyper-title-center')&&!main.style.getPropertyValue('--hyper-shortcut-center')&&!main.style.getPropertyValue('--hyper-shortcut-progress')});
   }
   controller.viewChanged();main.replaceChildren(...originalChildren);main.scrollTop=originalScroll;shell.dataset.view='remotes';choose('elegant');
   move(190,20);move(190,500);advance(5200);choose('none');advance(20000);
   const disabledAgain={phase:phase(),timers:timers.size,frames:frames.size,overlay:!!header.querySelector('.hyperspace-overlay')};
   const scrollAnchors=[];
   const spacer=document.createElement('div');spacer.style.height='1500px';main.append(spacer);
   const readAnchors=()=>({r:brand.getBoundingClientRect().top,moon:theme.getBoundingClientRect().top,nav:header.querySelector('nav').getBoundingClientRect().top,more:header.querySelector('#header-more').getBoundingClientRect().top,header:header.getBoundingClientRect().top});
   const scrollTo=y=>{main.scrollTop=y;main.dispatchEvent(new Event('scroll'));};
   for(const view of ['remotes','queue','history','settings','screenshot','downloads'])for(const mode of ['none','elegant','hyperspace']){
    controller.viewChanged();shell.dataset.view=view;choose(mode);scrollTo(0);
    if(mode!=='none'){move(190,20);move(190,500);advance(5000);advance(15000);}
    const top=readAnchors(),footerBefore=dock.getBoundingClientRect().bottom,headerHeight=header.offsetHeight;
    const nav=header.querySelector('nav'),more=header.querySelector('.header-more');
    const menuPaint=()=>[getComputedStyle(nav).visibility,getComputedStyle(nav).opacity,getComputedStyle(more).visibility,getComputedStyle(more).opacity,getComputedStyle(header).backgroundColor,phase()];
    const beforePaint=menuPaint(),handoffPaint=[],handoffLayout=[];
    scrollTo(100);handoffPaint.push(menuPaint());
    for(let i=0;i<10;i++){
     advance(68);handoffPaint.push(menuPaint());
     handoffLayout.push({reserve:shell.style.getPropertyValue('--hyper-reserve'),height:shell.offsetHeight,frames:frames.size});
    }
    const down=readAnchors();const actual=main.scrollTop;
    const noHeaderStrip=Math.abs(main.getBoundingClientRect().top-(top.header))<.1;
    const footerStable=Math.abs(dock.getBoundingClientRect().bottom-footerBefore)<.1;
    // Moving into the old header area while scrolled cannot expose an orphaned menu.
    move(190,20);advance(1000);
    const offscreen=[brand,theme,header.querySelector('nav'),header.querySelector('#header-more')].every(el=>el.getBoundingClientRect().bottom<=0);
    scrollTo(0);advance(680);const restored=readAnchors();
    scrollAnchors.push({view,mode,top,down,actual,restored,offscreen,noHeaderStrip,footerStable,headerHeight,beforePaint,handoffPaint,handoffLayout});
    controller.viewChanged();
   }
   // A nearly-fitting Screenshots page is the critical boundary: scroll
   // reclaim must not shrink the range and clamp scrollTop back toward zero.
   controller.viewChanged();choose('none');shell.dataset.view='screenshot';scrollTo(0);
   const savedScrollChildren=[...main.childNodes];
   const shortPage=document.createElement('div');shortPage.style.cssText='margin:0;flex:none;display:block;';
   main.replaceChildren(shortPage);
   const style=getComputedStyle(main);
   shortPage.style.height=(main.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)+24)+'px';
   const shortRange=main.scrollHeight-main.clientHeight;
   const shortScroll=[];
   for(const mode of ['none','elegant','hyperspace']){
    controller.viewChanged();choose(mode);scrollTo(0);advance(680);
    const before=main.scrollHeight-main.clientHeight;
    scrollTo(before);
    const samples=[];
    for(let n=0;n<6;n++){advance(136);main.dispatchEvent(new Event('scroll'));samples.push({top:main.scrollTop,range:main.scrollHeight-main.clientHeight});}
    if(mode!=='none'){
     move(190,20);move(190,500);advance(5000);advance(15000);
     main.dispatchEvent(new Event('scroll'));
     samples.push({top:main.scrollTop,range:main.scrollHeight-main.clientHeight});
    }
    shortScroll.push({mode,before,samples});
   }
   // Tiny changes must move proportionally, not toggle the entire header.
   const hysteresis=[];
   for(const mode of ['none','elegant','hyperspace']){
    controller.viewChanged();choose(mode);scrollTo(0);
    for(const value of [1,5,11,12,11,10,3,2,5,11,12,0]){
     scrollTo(value);move(190,20);advance(680);
     hysteresis.push({mode,value,offset:-header.getBoundingClientRect().top,phase:phase()});
    }
   }
   controller.viewChanged();choose('none');scrollTo(0);advance(680);
   // Sample real layout at intermediate frames, not only final states.
   const motion=[];
   for(const target of [12,0,12,0]){
    const from=header.getBoundingClientRect().top;
    scrollTo(target);
    const samples=[header.getBoundingClientRect().top],ranges=[main.scrollHeight-main.clientHeight],layouts=[];
    for(let i=0;i<10;i++){advance(20);samples.push(header.getBoundingClientRect().top);ranges.push(main.scrollHeight-main.clientHeight);layouts.push({reserve:shell.style.getPropertyValue('--hyper-reserve'),frames:frames.size});}
    motion.push({target,from,samples,ranges,layouts,height:header.offsetHeight});
   }
   main.replaceChildren(...savedScrollChildren);
   choose('none');shell.dataset.view='remotes';scrollTo(0);
   const explorerReference=readAnchors();scrollTo(100);advance(680);
   shell.dataset.view='explorer';
   const explorerWithoutSync=readAnchors();main.dispatchEvent(new Event('scroll'));
   const explorerAfterSync=readAnchors();
   const explorerScrollCleared=!header.style.getPropertyValue('--onyx-header-scroll')&&!shell.style.getPropertyValue('--hyper-reserve');
   spacer.remove();scrollTo(0);
   controller.dispose();shell.dataset.view='remotes';
   return {phases,geometry,streak,later,heldFrames,paint,initial,sweep,logoPositions,providerThemePositions,none,elegantIdle,elegantMid,elegantEnd,elegantHidden,themeGlide,themeHoverPhase,viewReveal,archiveSpacing,titleCentering,noPaint,afterThemeClick,afterThemeKeyboard,elegantReturn,elegantClosed,disabledAgain,scrollAnchors,shortRange,shortScroll,hysteresis,motion,explorerReference,explorerWithoutSync,explorerAfterSync,explorerScrollCleared,clean:!shell.hasAttribute('data-hyperspace-lifting')&&!shell.style.getPropertyValue('--hyper-reserve')&&main.style.translate===initial.translate&&!header.querySelector('.hyperspace-overlay')&&!document.body.hasAttribute('data-hyperspace')&&!document.body.hasAttribute('data-hyperspace-mode')&&!brand.hasAttribute('tabindex')&&frames.size===0&&timers.size===0};
  });
  assert(Math.abs(hyperspace.shortRange-24)<=1,'short Screenshots fixture overflows by only 24px');
  for(const {mode,before,samples} of hyperspace.shortScroll){
   assert(Math.abs(before-hyperspace.shortRange)<=1,mode+' stable initial short scroll range');
   for(const sample of samples){
    assert(Math.abs(sample.range-before)<=1,mode+' header reclaim must not change the scroll range');
    assert(Math.abs(sample.top-before)<=1,mode+' header reclaim must not clamp the scroll offset');
   }
  }
  for(const mode of ['none','elegant','hyperspace']){
   const rows=hyperspace.hysteresis.filter(row=>row.mode===mode);
   assert(rows.every(row=>Math.abs(row.offset-row.value)<.1),mode+' proportional partial-scroll movement');
   assert(rows.filter(row=>row.value>0).every(row=>row.phase==='closed'),mode+' scroll ownership suppresses idle animation');
  }
  for(const {target,from,samples,ranges,layouts,height} of hyperspace.motion){
   assert(Math.abs(samples[0]-from)<.1,'no instantaneous header jump');
   assert(Math.abs(samples.at(-1)+target)<.1,'motion settles at the proportional endpoint');
   assert(samples.slice(1).every((v,i)=>target?v<=samples[i]+.1:v>=samples[i]-.1),'motion is monotonic');
   assert(samples.slice(1).some(v=>v<-.1&&v>-12+.1),'motion has genuine intermediate frames');
   assert(layouts.every(v=>v.frames<=1),'only one animation frame scheduler');
   assert(new Set(layouts.map(v=>v.reserve)).size<=2,'reservation changes only on settle');
   assert(ranges.every(v=>Math.abs(v-ranges[0])<=1),'motion preserves the short-page scroll range');
  }
  assert.equal(hyperspace.scrollAnchors.length,18);
  for(const {view,mode,top,down,actual,restored,offscreen,noHeaderStrip,footerStable,headerHeight,beforePaint,handoffPaint,handoffLayout} of hyperspace.scrollAnchors){
   const label=view+'/'+mode;
   assert.equal(actual,100,label+' scroll fixture');
   assert(Math.abs(top.r-down.r-headerHeight)<.1&&Math.abs(top.moon-down.moon-headerHeight)<.1,label+' icons must fully retract');
   assert(Math.abs(top.nav-down.nav-headerHeight)<.1&&Math.abs(top.more-down.more-headerHeight)<.1&&Math.abs(top.header-down.header-headerHeight)<.1,label+' navigation and header retract as one unit');
   assert(handoffPaint.every(sample=>JSON.stringify(sample)===JSON.stringify(beforePaint)),label+' idle-hidden menu and background must never reappear during scroll handoff');
   assert(handoffLayout.every(sample=>sample.frames<=1),label+' single frame scheduler');
   assert(new Set(handoffLayout.slice(0,-1).map(sample=>sample.reserve)).size===1,label+' no per-frame reservation changes');
   assert(offscreen,label+' hovering the old header position must not expose a detached menu');
   assert(noHeaderStrip,label+' scroll immediately reclaims the entire former header strip');
   assert(footerStable,label+' scroll reclaim preserves the footer anchor');
   assert(Math.abs(restored.r-top.r)<.1&&Math.abs(restored.moon-top.moon)<.1&&Math.abs(restored.header-top.header)<.1,label+' header returns at page top');
  }
  assert.deepEqual(hyperspace.explorerWithoutSync,hyperspace.explorerReference,'File Explorer excludes shared header offset even before observer delivery');
  assert.deepEqual(hyperspace.explorerAfterSync,hyperspace.explorerReference,'File Explorer header stays unchanged');
  assert(hyperspace.explorerScrollCleared,'File Explorer clears the shared scroll offset');
  assert.deepEqual(hyperspace.phases,['closed','split','charge','charge','release','open','open','return','closed','closed','split','closed']);
  assert.equal(hyperspace.geometry.length,2);
  assert(hyperspace.logoPositions.every(p=>p.every((v,i)=>Math.abs(v-hyperspace.logoPositions[0][i])<.1)),'R stays fixed throughout both animations and restoration');
  assert(hyperspace.providerThemePositions.every(p=>p.every((v,i)=>Math.abs(v-hyperspace.providerThemePositions[0][i])<.1)),'Providers sun/moon stays fixed throughout both effects and restoration');
  assert.deepEqual(hyperspace.none,{phase:'closed',timers:0,frames:0,overlay:false});
  assert.deepEqual(hyperspace.disabledAgain,hyperspace.none);
  assert.equal(hyperspace.elegantIdle,'closed');assert.equal(hyperspace.elegantMid.phase,'elegant');
  assert(hyperspace.elegantMid.opacity>0&&hyperspace.elegantMid.opacity<1&&hyperspace.elegantMid.lift>0);
  assert.equal(hyperspace.elegantMid.rails,0);
  assert.equal(hyperspace.elegantEnd.phase,'open');assert.equal(hyperspace.elegantEnd.frames,0);assert.equal(hyperspace.elegantEnd.surfaceOpacity,0);
  assert(Math.abs(hyperspace.elegantEnd.lift-hyperspace.elegantEnd.headerHeight)<1,'Elegant reclaims the complete header height');
  assert(Math.abs(hyperspace.elegantEnd.shellTop-hyperspace.elegantEnd.headerTop)<1,'No reserved header strip remains');
  assert(Math.abs(hyperspace.elegantEnd.mainTop-hyperspace.elegantEnd.headerTop)<1,'Content reaches the top of the viewport');
  assert(Math.abs(hyperspace.elegantEnd.dockBottom-hyperspace.paint.dockBottom)<1,'Footer stays anchored');
  assert.deepEqual(hyperspace.elegantHidden,{themeOpacity:'1',themeVisibility:'visible',navVisibility:'hidden',logoOpacity:'1',headerPointer:'none',logoPointer:'auto',overlayBackground:'rgba(0, 0, 0, 0)'});
  assert(hyperspace.themeGlide.mid>=0&&hyperspace.themeGlide.end>=hyperspace.themeGlide.mid&&hyperspace.themeGlide.end<=6.1&&hyperspace.themeGlide.right<=hyperspace.themeGlide.edge,'Moon/sun glides right within available clearance');
  assert.equal(hyperspace.themeHoverPhase,'open','Theme control hover and redundant skin writes must not restore Elegant');
  assert.equal(hyperspace.viewReveal.length,6);
  assert.equal(hyperspace.archiveSpacing.length,4);
  assert.equal(hyperspace.titleCentering.length,4);
  for(const v of hyperspace.titleCentering){
   assert.equal(v.settledPhase,'open');
   assert(Math.abs(v.settled.center-v.target)<.2,'Title ends centered in Shelf');
   assert(v.mid.center>v.initial.center&&v.mid.center<v.target,'Title glides to center');
   assert(v.settled.top<v.initial.top,'Title rises with the page');
   if(v.view==='screenshot'){
    assert(v.mid.keysCenter>v.initial.keysCenter&&v.mid.keysCenter<v.target,'Shortcut line glides with title');
    assert(Math.abs(v.settled.keysCenter-v.target)<.2&&Math.abs(v.updated.keysCenter-v.target)<.2,'Shortcut line remains centered even when key labels change');
    assert(Math.abs(v.restored.keysCenter-v.initial.keysCenter)<.2,'Shortcut line returns to original alignment');
   }
   assert([v.mid,v.settled,v.restored].every(p=>Math.abs(p.contentX-v.initial.contentX)<.2&&Math.abs(p.contentWidth-v.initial.contentWidth)<.2),'Cards retain horizontal layout');
   assert(Math.abs(v.restored.center-v.initial.center)<.2&&Math.abs(v.restored.top-v.initial.top)<.2&&Math.abs(v.restored.contentTop-v.initial.contentTop)<.2&&v.cleared,'Original alignment restored and style cleared');
  }
  assert(hyperspace.archiveSpacing.every(v=>v.settledPhase==='open'&&v.contentLift>0&&v.contentLift<=28.1&&v.titleLift>v.contentLift&&v.titleLift<=(v.view==='queue'?42.1:36.1)&&Math.abs(v.titleLift-v.contentLift-(v.view==='queue'?Math.min(14,v.contentLift*.6):Math.min(8,v.contentLift*.4)))<.1&&v.gap>0&&v.restored),'History and Queue preserve a relaxed title/content gap and restore cleanly');
  assert(hyperspace.viewReveal.every(v=>v.before==='open'&&v.after==='return'&&v.closed==='closed'),'Former header region reveals consistently on every supported Shelf tab');
  assert.equal(hyperspace.noPaint.visibility,'hidden');assert.equal(hyperspace.noPaint.background,'rgba(0, 0, 0, 0)');assert.equal(hyperspace.noPaint.image,'none');assert.equal(hyperspace.noPaint.border,'rgba(0, 0, 0, 0)');assert.equal(hyperspace.noPaint.shadow,'none');assert.equal(hyperspace.noPaint.themeBackground,'rgba(0, 0, 0, 0)');assert.equal(hyperspace.noPaint.bodyColor,hyperspace.noPaint.pageColor);
  assert.equal(hyperspace.afterThemeClick.phase,'open');assert.equal(hyperspace.afterThemeClick.mode,'light');assert.equal(hyperspace.afterThemeClick.navVisibility,'hidden');assert.equal(hyperspace.afterThemeClick.themeVisibility,'visible');assert.equal(hyperspace.afterThemeClick.frames,0);assert(Math.abs(hyperspace.afterThemeClick.mainTop-hyperspace.elegantEnd.mainTop)<1);
  assert.deepEqual(hyperspace.afterThemeKeyboard,{phase:'open',mode:'dark'});
  assert.equal(hyperspace.elegantReturn,'return');assert.equal(hyperspace.elegantClosed,'closed');
  assert.notEqual(hyperspace.streak,hyperspace.later);
  assert.equal(hyperspace.heldFrames,0);assert.equal(hyperspace.clean,true);
  assert.equal(hyperspace.paint.header,'rgba(0, 0, 0, 0)','Header must not paint over the elevated page');
  assert(hyperspace.paint.lift>0);
  assert(hyperspace.paint.overlayTop+hyperspace.paint.overlayHeight-hyperspace.paint.lift<=hyperspace.paint.shellTop+1,'Painted header must end before the raised page');
  assert.match(hyperspace.paint.clip,/^inset\(/);
  assert(hyperspace.sweep.every(f=>f.reserve===hyperspace.sweep[0].reserve&&f.height===hyperspace.sweep[0].height),'Release must not relayout the shell on every frame');
  assert(hyperspace.sweep.every(f=>Math.abs(f.dockBottom-hyperspace.initial.dockBottom)<1),'Footer must stay anchored');
  assert(hyperspace.sweep.every(f=>Math.abs(f.mainTop-(hyperspace.initial.mainTop-f.lift))<1),'Translated surface follows the original lift curve');
  assert(hyperspace.sweep.some(f=>f.translate&&f.lift>0),'Release uses translation');
  assert.equal(hyperspace.paint.lifting,false,'Compositor hint removed after settling');
  assert.equal(hyperspace.paint.translate,hyperspace.initial.translate,'Inline translation restored');
  assert(Math.abs(hyperspace.paint.mainTop-(hyperspace.initial.mainTop-hyperspace.paint.lift))<1,'Final layout matches the visual resting position');
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
 // History cards maintain a compact, consistent rhythm with optional content.
 await page.evaluate(()=>{
  document.querySelector('#shell').dataset.view='history';
  const fixture=document.createElement('section');fixture.id='history-spacing-fixture';fixture.className='queue-archive';
  fixture.innerHTML='<details open class="queue-calendar"><summary>Today</summary><article class="card queue-history-card" data-provider="dropbox"><div class="queue-card-header"><div class="queue-card-summary"><strong>image.png</strong></div><div class="queue-card-status"><span class="queue-badge">Verified</span><time>11/26/2026</time></div></div><p class="queue-location">Dropbox · /image.png</p><p class="queue-feedback"></p><details open><summary>Image</summary><div class="history-preview"><div style="width:100px;height:100px"></div></div></details><p class="queue-location">www.example.com</p><details><summary>URLs</summary></details><details><summary>Details</summary></details></article></details>';
  document.querySelector('#main').prepend(fixture);
 });
 for(const width of [320,380,800]){
  await page.setViewportSize({width,height:760});
  const spacing=await page.locator('#history-spacing-fixture .queue-history-card').evaluate(card=>{
   const rect=el=>el.getBoundingClientRect(),style=getComputedStyle(card);
   const children=[...card.children].filter(el=>el.getClientRects().length);
   const preview=card.querySelector('.history-preview'),imageLabel=preview.previousElementSibling;
   return {padding:parseFloat(style.paddingBlockStart),gap:parseFloat(style.rowGap),gaps:children.slice(1).map((el,i)=>rect(el).top-rect(children[i]).bottom),
    previewGap:rect(preview).top-rect(imageLabel).bottom,
    overflow:card.scrollWidth>card.clientWidth+1,feedbackVisible:children.some(el=>el.classList.contains('queue-feedback'))};
  });
  assert(spacing.padding>=14&&spacing.padding<=18);
  assert.equal(spacing.gap,5);assert(spacing.gaps.every(gap=>gap>=4.9&&gap<=7.1));
  assert.equal(spacing.previewGap,5);assert(!spacing.overflow);assert(!spacing.feedbackVisible);
 }
 await page.setViewportSize({width:380,height:760});
 await page.evaluate(()=>{document.querySelector('#history-spacing-fixture').remove();document.querySelector('#shell').dataset.view='remotes';});
 // Independent ornament fragments and partial text dividers must coexist.
 const ornamentCheck=await page.evaluate(async()=>{
  const {historyOrnamentPattern,createHistoryOrnament}=await import('/extension/history-card-ornament.mjs');
  document.querySelector('#shell').dataset.view='history';
  const fixture=document.createElement('section');fixture.id='ornament-fixture';fixture.className='queue-archive';
  let previous=null;const patterns=[];
  for(const key of ['one','two','three','three']){
   const lines=historyOrnamentPattern(key,previous);previous=lines;patterns.push(lines);
   const card=document.createElement('article');card.className='card queue-history-card';
   card.innerHTML='<details open><summary>Image</summary><div class="history-preview"></div></details><details class="history-urls"><summary>URLs</summary></details>';
   card.insertBefore(createHistoryOrnament(document,lines),card.lastElementChild);
   fixture.append(card);
  }
  document.querySelector('#main').prepend(fixture);
  const cards=[...fixture.children].map(card=>{
   const ornament=card.querySelector('.history-card-ornament'),rect=ornament.getBoundingClientRect();
   return {hidden:ornament.getAttribute('aria-hidden'),lines:[...ornament.children].map(el=>{
    const r=el.getBoundingClientRect();return {height:r.height,width:r.width,x:r.x,y:r.y,inside:r.left>=rect.left-.1&&r.right<=rect.right+.1&&r.top>=rect.top&&r.bottom<=rect.bottom};
   }),dividers:[...card.querySelectorAll(':scope>details')].map(el=>getComputedStyle(el).backgroundSize)};
  });
  const stable=JSON.stringify(historyOrnamentPattern('one'))===JSON.stringify(patterns[0]);
  fixture.remove();document.querySelector('#shell').dataset.view='remotes';
  return {patterns,cards,stable};
 });
 assert(ornamentCheck.stable);
 for(let i=0;i<ornamentCheck.cards.length;i++){
  const card=ornamentCheck.cards[i];assert.equal(card.hidden,'true');assert.equal(card.lines.length,3);
  assert.equal(new Set(card.lines.map(l=>l.width)).size,3);assert.equal(new Set(card.lines.map(l=>l.y)).size,3);
  assert(card.lines.every(l=>l.inside&&l.height===1));assert.deepEqual(card.dividers,['34px 1px','22px 1px']);
  if(i)assert.notDeepEqual(ornamentCheck.patterns[i],ornamentCheck.patterns[i-1]);
 }
 // Floating architectural History: real pagination and delayed, non-blocking reveal.
 await page.evaluate(async()=>{
  const {mountHistoryV2}=await import('/extension/queue-page.mjs');
  const shell=document.querySelector('#shell'),main=document.querySelector('#main');
  shell.dataset.view='history';
  const fixture=document.createElement('section');fixture.className='page queue-page';fixture.id='fixed-history-fixture';
  for(const child of main.children)child.hidden=true;
  main.append(fixture);
  const dock=document.createElement('div');dock.id='history-pagination-dock';main.after(dock);
  window.fixedHistoryScope=new AbortController();
  const service={ready:Promise.resolve(),preferences:{timer:'off',range:'all',timezone:'UTC'},store:{page:async({page})=>({page,pages:2,total:50,items:[]})}};
  mountHistoryV2(fixture,{service,canRead:()=>true,signal:window.fixedHistoryScope.signal,pagerHost:dock});
 });
 const fixedPager=page.locator('#history-pagination-dock .queue-pager');
 await fixedPager.waitFor();
 for(const width of [320,380,800]){
  await page.setViewportSize({width,height:760});
  const layout=()=>page.evaluate(()=>{
   const rect=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {x:r.x,y:r.y,bottom:r.bottom,width:r.width};};
   return {pager:rect('#history-pagination-dock .queue-pager'),main:rect('#main'),dock:rect('#history-pagination-dock'),shell:rect('#shell')};
  });
  await page.mouse.move(1,1);
  const before=await layout();
  assert.equal(before.shell.bottom-before.dock.bottom,6);
  assert.equal(before.main.bottom,before.shell.bottom,'Overlay must not reserve footer height');
  assert(Math.abs(before.pager.x+before.pager.width/2-(before.shell.x+before.shell.width/2))<=1);
  const dock=page.locator('#history-pagination-dock');
  await page.waitForFunction(()=>document.querySelector('#history-pagination-dock').hasAttribute('data-revealed'));
  assert.equal(await dock.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  await page.evaluate(()=>{const group=document.createElement('details');group.id='fixed-history-group';group.className='queue-calendar';group.innerHTML='<summary>Today</summary><div style="height:1800px">Expanded archive</div>';document.querySelector('#fixed-history-fixture [data-history-records]').append(group);group.open=true;});
  await page.waitForFunction(()=>!document.querySelector('#history-pagination-dock').hasAttribute('data-revealed'));
  assert.equal(await fixedPager.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  const hoverX=before.pager.x+before.pager.width/2,hoverY=before.pager.y+8;
  await page.mouse.move(hoverX,hoverY);
  await page.waitForTimeout(600);
  assert(!(await dock.evaluate(el=>el.hasAttribute('data-revealed'))),'Reveal must wait a full second');
  await page.mouse.move(1,1);
  await page.waitForTimeout(500);
  assert(!(await dock.evaluate(el=>el.hasAttribute('data-revealed'))),'Leaving early must cancel the dwell');
  await page.mouse.move(hoverX,hoverY);
  await page.waitForFunction(()=>document.querySelector('#history-pagination-dock').hasAttribute('data-revealed'));
  assert.equal(await fixedPager.evaluate(el=>getComputedStyle(el).pointerEvents),'auto');
  await page.mouse.move(1,1);
  await page.waitForFunction(()=>!document.querySelector('#history-pagination-dock').hasAttribute('data-revealed'));
  await page.locator('#main').evaluate(el=>el.scrollTop=el.scrollHeight);
  await page.waitForFunction(()=>document.querySelector('#history-pagination-dock').hasAttribute('data-revealed'));
  assert.deepEqual((await layout()).pager,before.pager);
  await page.locator('#main').evaluate(el=>el.scrollTop=0);
  await page.waitForFunction(()=>!document.querySelector('#history-pagination-dock').hasAttribute('data-revealed'));
  await page.locator('#fixed-history-group>summary').click();
  await page.waitForFunction(()=>document.querySelector('#history-pagination-dock').hasAttribute('data-revealed'));
  assert.deepEqual((await layout()).pager,before.pager);
  await page.locator('#fixed-history-group').evaluate(el=>el.remove());
 }
 await fixedPager.locator('[data-last]').click();
 await page.waitForFunction(()=>document.querySelector('#history-pagination-dock input').value==='02');
 await fixedPager.locator('[data-first]').click();
 await page.waitForFunction(()=>document.querySelector('#history-pagination-dock input').value==='01');
 await page.evaluate(()=>{window.fixedHistoryScope.abort();document.querySelector('#history-pagination-dock').remove();document.querySelector('#fixed-history-fixture').remove();for(const child of document.querySelector('#main').children)child.hidden=false;document.querySelector('#shell').dataset.view='remotes';});
 await page.setViewportSize({width:380,height:760});
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
   const outline=el.querySelector('.onyx-browse-outline');
   const strokes=[...outline.querySelectorAll('path')].map(path=>{
    const style=getComputedStyle(path),length=parseFloat(style.strokeDasharray),offset=-parseFloat(style.strokeDashoffset);
    const start=path.getPointAtLength(offset),end=path.getPointAtLength(offset+length);
    return {length,offset,start:[start.x,start.y],end:[end.x,end.y],track:path.getTotalLength()};
   });
   return {right:r.right,top:r.top,height:r.height,width:r.width,word:opacity('.onyx-browse-word'),closed:opacity('.onyx-folder-closed'),open:opacity('.onyx-folder-open'),strokes};
  });
  const waitWidth=async width=>page.waitForFunction(({el,width})=>Math.abs(el.getBoundingClientRect().width-width)<.1,{el:await browse.elementHandle(),width});
  await page.mouse.move(0,0);
  await waitWidth(44);
  const idle=await browseState();
  assert.equal(idle.word,'0');assert.equal(idle.closed,'1');assert.equal(idle.open,'0');
  for(const stroke of idle.strokes){
   assert(Math.abs(stroke.length-61.780972)<.01);
   assert.equal(stroke.offset,0);assert(Math.abs(stroke.start[1]-22)<.01);
   assert(Math.abs(stroke.end[0]-48)<.1);
  }
  // Sample the entire transition, starting with the pointer entering the card.
  // Refresh must remain invisible on every frame before the dock reaches full width.
  const frames=page.evaluate(async()=>{
   const card=document.querySelector('[data-provider=dropbox]'),button=card.querySelector('[data-go]'),refresh=card.querySelector('[data-refresh]');
   const samples=[];const start=performance.now(),limit=start+3800;
   await new Promise(resolve=>{function frame(){samples.push({time:performance.now()-start,width:button.getBoundingClientRect().width,opacity:Number(getComputedStyle(refresh).opacity),strokes:[...button.querySelectorAll('.onyx-browse-outline>path')].map(path=>{const style=getComputedStyle(path),length=parseFloat(style.strokeDasharray),offset=-parseFloat(style.strokeDashoffset),end=path.getPointAtLength(offset+length);return {length,offset,endX:end.x};})});if(performance.now()<limit)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});
   return samples;
  });
  await browse.hover();
  const expandedWidth=width<=345?88:92;
  await waitWidth(expandedWidth);
  const expanded=await browseState();
  const samples=await frames;
  assert(samples.some(f=>f.width>44&&f.width<expandedWidth-.5),'Expected intermediate Browse expansion frames');
  assert(samples.some(f=>f.strokes[0].offset>0.1&&f.strokes[0].offset<25.6),'Expected continuous perimeter travel');
  for(const frame of samples)for(const stroke of frame.strokes){
   assert(Math.abs(stroke.length-61.780972)<.01,'Each visible strand must conserve length');
   assert(stroke.endX>=92-frame.width-.2,'No stroke can be clipped at the expanding left edge');
  }
  for(const [i,stroke] of expanded.strokes.entries()){
   const y=i===0?.5:43.5;
   assert(Math.abs(stroke.offset-25.780972)<.1);
   assert(Math.abs(stroke.start[1]-y)<.1&&Math.abs(stroke.end[1]-y)<.1,'Expanded outline is horizontal only');
   assert(stroke.offset+stroke.length<stroke.track);
  }
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
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-provider=dropbox] .onyx-browse-outline>path')].every(p=>Math.abs(parseFloat(getComputedStyle(p).strokeDashoffset))<.01));
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
 // A cold-start status check must not consume the first interactive click.
 await page.evaluate(()=>window.testProviderCards.onStatus({provider:'google',connected:false,ready:false,authorized:false,phase:'checking',reason:'AUTH_CHANGED'}));
 const primary=google.locator('[data-connect]'),before=await box(primary);
 assert.equal(await primary.textContent(),'Connect');
 const googleConnectBefore=await page.evaluate(()=>window.providerCalls.filter(([op,p])=>op==='auth.connect'&&p==='google').length);
 await primary.hover();
 const after=await box(primary);
 assert(Math.abs(before.x-after.x)<=2&&Math.abs(before.y-after.y)<=2,'Primary dock must remain stable on hover');
 await primary.click();
 await google.locator('[data-connect][data-authenticated]').waitFor();
 await google.locator('[data-go]').click();
 await google.locator('[data-refresh]').focus();
 await google.locator('[data-refresh]').press('Enter');
 const calls=await page.evaluate(()=>window.providerCalls);
 assert.equal(calls.filter(([op,p])=>op==='auth.connect'&&p==='google').length,googleConnectBefore+1,'First Google click launches exactly one interactive connection');
 await page.evaluate(()=>window.testProviderCards.onStatus({provider:'onedrive',connected:false,ready:false,authorized:false,phase:'network-temporary',reason:'AUTH_NETWORK'}));
 const oneDriveConnect=page.locator('[data-provider=onedrive] [data-connect]');
 assert.equal(await oneDriveConnect.textContent(),'Connect');
 const oneDriveConnectBefore=await page.evaluate(()=>window.providerCalls.filter(([op,p])=>op==='auth.connect'&&p==='onedrive').length);
 await oneDriveConnect.click();
 await page.locator('[data-provider=onedrive][data-onyx-connected]').waitFor();
 assert.equal(await page.evaluate(()=>window.providerCalls.filter(([op,p])=>op==='auth.connect'&&p==='onedrive').length),oneDriveConnectBefore+1,'First OneDrive click launches exactly one interactive connection');
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
 // Hover replaces the capacity label without changing the card geometry.
 for(const provider of ['google','onedrive','dropbox']){
  await page.evaluate(provider=>{
   window.testProviderCards.onStatus({provider,connected:true,ready:true,authorized:true,phase:'ready'});
   document.activeElement?.blur();
  },provider);
  await page.mouse.move(0,0);
  const card=page.locator('[data-provider='+provider+']'),signout=card.locator('[data-signout]');
  const original=await card.boundingBox();
  assert.equal(await signout.evaluate(el=>getComputedStyle(el).opacity),'0');
  await card.hover();
  await page.waitForFunction(el=>getComputedStyle(el).opacity==='1',await signout.elementHandle());
  assert.equal(await signout.evaluate(el=>getComputedStyle(el).opacity),'1');
  assert.equal(await card.locator('.onyx-free-caption').evaluate(el=>getComputedStyle(el).visibility),'hidden');
  assert.deepEqual(await card.boundingBox(),original,'Hover must not resize the provider card');
  await signout.click();
  await page.waitForFunction(provider=>!document.querySelector('[data-provider='+provider+']').hasAttribute('data-onyx-connected'),provider);
  assert.equal(await card.locator('[data-connect]').textContent(),'Connect');
  assert.equal(await signout.evaluate(el=>el.hidden),true);
  assert.equal(await page.evaluate(provider=>window.providerCalls.filter(([op,p])=>op==='auth.disconnect'&&p===provider).length,provider),1);
  assert.deepEqual(await card.boundingBox(),original,'Disconnect must not resize the provider card');
 }
 // Sign-in and verification captions must not expand the Cloudflare card.
 for(const width of [320,380,480,800]){
  await page.setViewportSize({width,height:760});
  const geometry=await page.evaluate(()=>{
   const page=document.querySelector('.remotes-page');
   const card=document.createElement('div');card.className='card remote-cloudflare';
   card.innerHTML='<h2><svg class="cf-chrome-mark" viewBox="0 0 48 32"></svg> Cloudflare R2</h2><p class="onyx-provider-meta onyx-cloudflare-meta">10 GB Free</p><div id="cf-test-connection"><button id="login">Connect to Cloudflare</button></div>';
   // Use the production connection selector without a duplicate document ID.
   const existing=document.getElementById('connection');if(existing)existing.id='connection-test-original';
   const connection=card.querySelector('#cf-test-connection');connection.id='connection';
   page.append(card);
   try{
    const read=()=>({height:card.getBoundingClientRect().height,buttonY:connection.querySelector('button').getBoundingClientRect().top-card.getBoundingClientRect().top});
    const base=read(),results=[];
    for(const [state,label,button] of [['CONNECTING','Signing in…','Cancel sign-in'],['VERIFYING','Authorization received. Checking account access…','Check account authorization']]){
     connection.innerHTML='<p class="muted cf-connection-caption" data-connection-state="'+state+'">'+label+'</p><button>'+button+'</button>';
     const caption=connection.querySelector('p'),r=caption.getBoundingClientRect(),bounds=card.getBoundingClientRect();
     results.push({...read(),inside:r.left>=bounds.left+169&&r.right<=bounds.right&&r.bottom<=connection.querySelector('button').getBoundingClientRect().top});
    }
    return {base,results};
   }finally{card.remove();if(existing)existing.id='connection';}
  });
  for(const state of geometry.results){assert.equal(state.height,geometry.base.height,'Cloudflare sign-in caption must not change card height');assert.equal(state.buttonY,geometry.base.buttonY);assert(state.inside,'Caption stays in the right-hand header space');}
 }
 await page.setViewportSize({width:380,height:760});
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
