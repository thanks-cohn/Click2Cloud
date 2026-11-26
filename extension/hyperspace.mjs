import {createLocalPreference} from '../src/chrome/local-preference.mjs';

export const hyperspaceKey='headerHyperspaceV1';
export const IDLE_MS=5000, SPLIT_MS=1800, ELEGANT_MS=1050;
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
export function normalizeHyperspace(value){
 const seconds=Number(value?.seconds);
 // Require an explicit new mode selection. Legacy on/off preferences retain
 // their saved charge duration but migrate to None, the new default.
 const mode=['hyperspace','elegant'].includes(value?.mode)?value.mode:'none';
 return {mode,seconds:Number.isFinite(seconds)&&seconds>0?clamp(Math.round(seconds),1,20):5};
}
export const createHyperspacePreference=storage=>createLocalPreference(storage,hyperspaceKey,normalizeHyperspace);
export function hyperspaceTiming(seconds){
 const buildup=normalizeHyperspace({seconds}).seconds;
 const energy=clamp(.35+.65*buildup/5,.4,2.8);
 const flexMs=Math.round(55+35*energy),exitMs=Math.round(290/(.72+.28*energy));
 return {buildup,energy,flexMs,exitMs,release:flexMs+exitMs,settle:Math.round(290+energy*65)};
}
// Instantaneous velocity grows continuously; integrating it avoids a dash jump
// when its speed changes. Longer charging produces higher terminal velocity.
export function hyperspaceFrame(elapsed,seconds){
 const t=hyperspaceTiming(seconds), chargeMs=t.buildup*1000;
 const charge=clamp((elapsed-SPLIT_MS)/1000,0,t.buildup),p=charge/t.buildup;
 const travel=100*(3*charge+.35*charge**2);
 const speed=3+.70*charge;
 const releaseElapsed=elapsed-SPLIT_MS-chargeMs;
 const r=clamp(releaseElapsed/t.release),settle=smooth((releaseElapsed-t.release)/t.settle);
 // First the pressure visibly bends the rails; then the same impulse sends
 // the deformed boundaries, navigation and content flying. A longer charge
 // bends the rails further and drives a faster exit, not just a longer wait.
 const impact=smooth(releaseElapsed/t.flexMs);
 const exit=clamp((releaseElapsed-t.flexMs)/t.exitMs);
 // Wind up within the existing charge window, then unload the compression
 // into the outward impact. No extra delay or discontinuous geometry.
 const windup=Math.min(1.5,t.buildup*.32);
 // Spend the last tenth of the windup almost motionless at maximum strain.
 // The glints continue accelerating: anticipation, not an extra wait.
 const windupProgress=smooth((charge-(t.buildup-windup))/(windup*.90));
 // Diminishing travel with two smooth resistance points: the spring seems
 // to creak and nearly stall without reversing, jittering or adding a delay.
 const load=1-(1-windupProgress)**2;
 const creak=clamp(load+.065*Math.sin(4*Math.PI*load)*(1-load));
 const loaded=creak*clamp(.52+.43*t.energy,0,1);
 const tension=loaded*(1-impact);
 // The deeper dip holds against the initial impact, then snaps upward.
 const wordsDip=Math.min(14,7+6*t.energy)*loaded*(1-impact**1.7);
 const burst=.08*impact+.92*(1-(1-exit)**3.4);
 const flex=clamp(.24+.16*t.energy,0,.72)*impact*(1-smooth(exit/.76));
 const lift=burst*(1+.16*t.energy*(1-settle));
 // The navigation is ejected by the very same impulse, not an independent fade.
 const wordsUp=burst;
 const releaseGlow=impact*(1-smooth(exit/.75));
 return {split:((u)=>u*u*u*(10+u*(-15+6*u)))(clamp(elapsed/SPLIT_MS)),burst,flex,tension,lift,wordsUp,wordsDip,words:1-smooth((wordsUp-.48)/.50),
  travel:travel+100*t.energy*2.6*burst,speed,glint:Math.min(1,(.48+.36*p)*smooth(charge/.08)*(1-smooth(r))+.18*releaseGlow),
  length:4+Math.min(18,3*speed)+12*releaseGlow,done:releaseElapsed>=t.release+t.settle,
  phase:elapsed<SPLIT_MS?'split':releaseElapsed<0?'charge':r<1?'release':settle<1?'settle':'open'};
}
// The quiet alternative uses the same final frame contract and layout engine.
// No rails, charge, overshoot or abrupt impulse.
export function elegantHeaderFrame(elapsed){
 const p=clamp(elapsed/ELEGANT_MS),lift=p*p*p*(10+p*(-15+6*p));
 return {split:0,burst:smooth(p),flex:0,tension:0,lift,wordsUp:lift,wordsDip:0,
  words:1-smooth(p/.65),travel:0,speed:0,glint:0,length:0,done:p>=1,phase:p>=1?'open':'elegant'};
}
// Preserve the logo/theme clearance while allowing the content to occupy the opened space.
export function hyperspaceLiftBounds(height,contentGap,controlBottom,controlShift){
 const clearance=Math.max(0,height+Math.max(0,contentGap)-controlBottom+controlShift-4);
 const peak=Math.max(0,Math.min(54,height-18,clearance));
 return {rest:Math.max(0,Math.min(40,height-26,peak)),peak};
}
// History and Queue retain breathing room instead of rising to the viewport
// edge. Their visible title rises a little farther than the content below it.
export function archiveLiftBounds(bounds,atTop,view='history'){
 const rest=Math.min(bounds.rest,28),peak=Math.min(bounds.peak,34);
 return {rest,peak:Math.max(rest,peak),title:atTop?(view==='queue'?Math.min(14,rest*.6):Math.min(8,rest*.4)):0};
}
// The surface and the stroke are constructed from exactly the same curve.
// The initial center gap is 80 CSS px (clamped on tiny windows).
export function hyperspaceGeometry(width,height,split,burst,flex=0,tension=0){
 const w=Math.max(1,width),h=Math.max(1,height),gap=Math.min(80,w*.42)*split;
 const tip=w/2-gap/2,tipY=h*(1-split),shift=(w/2+3)*burst;
 // Keep endpoints and the two color boundaries coherent; the interior of each
 // rail bows away from the center under pressure before the lateral exit.
 const bow=tip*clamp(flex,0,.72)*split;
 // The last part of charge arches both rails toward the center, but leaves
 // a clean minimum corridor and never allows the mirror curves to intersect.
 const inward=Math.max(0,gap/2-4)*clamp(tension)*split;
 const limit=Math.max(tip,w/2-4);
 const c1=Math.min(limit,Math.max(0,tip-bow+inward)),c2=Math.min(limit,Math.max(0,tip*(1-.36*split)-bow*.82+inward*1.65));
 const x=v=>Number((v-shift).toFixed(3)),y=v=>Number(v.toFixed(3));
 const left='M '+x(tip)+' '+y(tipY)+' C '+x(c1)+' '+y(h*(1-.44*split))+' '+x(c2)+' '+y(h*(1-.28*split))+' '+x(0)+' '+y(h);
 const right='M '+(w-x(tip))+' '+y(tipY)+' C '+(w-x(c1))+' '+y(h*(1-.44*split))+' '+(w-x(c2))+' '+y(h*(1-.28*split))+' '+(w-x(0))+' '+y(h);
 return {left,right,leftFill:left+' L '+x(0)+' 0 L '+x(tip)+' 0 Z',rightFill:right+' L '+(w-x(0))+' 0 L '+(w-x(tip))+' 0 Z',gap};
}
export function mountHyperspaceSettings(parent,preference){
 const section=parent.ownerDocument.createElement('section');
 section.className='hyperspace-settings';
 section.innerHTML='<h3>Header Animation</h3><label class="settings-row">Animation<select data-hyperspace-mode><option value="none">None (default)</option><option value="hyperspace">Hyperspace</option><option value="elegant">Elegant</option></select></label><div data-hyperspace-options><label class="settings-row">Shimmer buildup (seconds)<input type="number" min="1" max="20" step="1" data-hyperspace-seconds></label><p class="muted">Default: 5 seconds. Longer buildup creates a stronger outward release and upward sweep.</p></div><p class="muted">Animated modes begin after five seconds away from the header. Hover over the header area to restore it.</p><p role="status"></p>';
 const mode=section.querySelector('[data-hyperspace-mode]'),seconds=section.querySelector('[data-hyperspace-seconds]'),options=section.querySelector('[data-hyperspace-options]'),status=section.querySelector('[role=status]');
 const paint=()=>{const value=preference.value;mode.value=value.mode;seconds.value=value.seconds;options.hidden=value.mode!=='hyperspace';seconds.disabled=options.hidden;};
 const save=async(transform)=>{try{await preference.update(transform);status.textContent='';}catch{status.textContent='Header animation preference could not be saved.';}paint();};
 mode.onchange=()=>{const selected=mode.value;void save(v=>({...v,mode:selected}));};
 seconds.onchange=()=>{const selected=seconds.valueAsNumber;void save(v=>({...v,seconds:selected}));};
 parent.append(section);paint();void preference.ready.then(paint);
}
const svgNS='http://www.w3.org/2000/svg';
export function installHyperspace({header,shell,preference,doc=header.ownerDocument,clock}){
 const win=doc.defaultView,body=doc.body,media=win.matchMedia('(prefers-reduced-motion: reduce)');
 const time=clock??{now:()=>win.performance.now(),set:(fn,ms)=>win.setTimeout(fn,ms),clear:id=>win.clearTimeout(id),frame:fn=>win.requestAnimationFrame(fn),cancel:id=>win.cancelAnimationFrame(id)};
 let timer,raf,overlay,parts,current,started,returning,runSeconds,runMode,inside=false,disposed=false,baseLift=24,peakLift=30,controlShift=0;
 const main=shell.querySelector('main'),brand=header.querySelector('.brand-lockup'),theme=header.querySelector('#theme');
 const pageColor=()=>[main,shell,body].filter(Boolean).map(el=>win.getComputedStyle(el).backgroundColor).find(c=>c!=='transparent'&&c!=='rgba(0, 0, 0, 0)')||win.getComputedStyle(doc.documentElement).getPropertyValue('--bg');
 let brandAttributes;
 let reserved=0,liftActive=false,lastGeometry='',lastPhase='',originalTranslate='',originalTranslatePriority='';
 const cleanups=[];
 const on=(target,type,fn,opts)=>{target.addEventListener(type,fn,opts);cleanups.push(()=>target.removeEventListener(type,fn,opts));};
 const cancelTimer=()=>{if(timer!==undefined){time.clear(timer);timer=undefined;}};
 const cancelFrame=()=>{if(raf!==undefined){time.cancel(raf);raf=undefined;}};
 const eligible=()=>!disposed&&['hyperspace','elegant'].includes(preference.value.mode)&&!media.matches&&!doc.hidden&&shell.dataset.view!=='explorer'&&!inside&&!header.matches(':hover')&&!header.querySelector(':focus-visible')&&!header.querySelector('#header-menu:not([hidden])')&&!doc.querySelector('dialog[open]');
 // Keep per-frame style invalidation local, rather than inheriting changing
 // variables from body through every History card. Skip unchanged values.
 const setVar=(el,k,v)=>{v=String(v);if(el&&el.style.getPropertyValue(k)!==v)el.style.setProperty(k,v);};
 function reserve(value){
  if(reserved===value)return;reserved=value;
  if(value)shell.style.setProperty('--hyper-reserve',value+'px');else shell.style.removeProperty('--hyper-reserve');
 }
 function layer(active){
  if(liftActive===active)return;liftActive=active;
  shell.toggleAttribute('data-hyperspace-lifting',active);
  if(active){originalTranslate=main?.style.getPropertyValue('translate')??'';originalTranslatePriority=main?.style.getPropertyPriority('translate')??'';}
  else if(main){if(originalTranslate)main.style.setProperty('translate',originalTranslate,originalTranslatePriority);else main.style.removeProperty('translate');}
 }
 function movePage(frame){
  const lift=Math.min(peakLift,baseLift*frame.lift);
  // FLIP: reserve the maximum travel once, then move the already-laid-out
  // scrolling surface using only a transform. The footer remains stationary.
  // At rest commit the exact final layout and discard the compositor hint.
  if(frame.done&&frame.phase==='open'){reserve(baseLift);layer(false);}
  else if(lift>0||reserved>0){layer(true);reserve(peakLift);setVar(main,'translate','0 '+(reserved-lift).toFixed(3)+'px');}
  else if(frame.tension>0){layer(true);}
  setVar(overlay,'--hyper-lift',lift.toFixed(3)+'px');
  if(parts.titleLift)setVar(main,'--hyper-title-up',(parts.titleLift*clamp(frame.lift)).toFixed(3)+'px');
  if(parts.titleCenter!==undefined)setVar(main,'--hyper-title-center',(parts.titleCenter*clamp(frame.lift)).toFixed(3)+'px');
 }
 function clear(){
  cancelFrame();overlay?.remove();overlay=parts=current=returning=undefined;
  body.removeAttribute('data-hyperspace');body.removeAttribute('data-hyperspace-mode');body.style.removeProperty('--hyper-elegant-page');
  if(brandAttributes&&brand){for(const [key,value] of brandAttributes){if(value===null)brand.removeAttribute(key);else brand.setAttribute(key,value);}brandAttributes=undefined;}
  reserve(0);layer(false);main?.style.removeProperty('--hyper-title-up');main?.style.removeProperty('--hyper-title-center');lastGeometry=lastPhase='';
  for(const key of ['--hyper-words','--hyper-controls-up','--hyper-words-up','--hyper-theme-right'])header.style.removeProperty(key);
 }
 function reset(){cancelTimer();clear();}
 function draw(frame){
  if(!overlay)return;
  current=frame;
  if(runMode==='elegant'){
   setVar(parts.elegant,'opacity',1-frame.burst);
   setVar(header,'--hyper-theme-right',(parts.themeShift*clamp(frame.lift)).toFixed(2)+'px');
  }else{
  const gone=frame.burst>=1;
  const geometry=gone?'gone':[frame.split,frame.burst,frame.flex,frame.tension].join('/');
  if(geometry!==lastGeometry){
   const g=gone?null:hyperspaceGeometry(parts.width,parts.height,frame.split,frame.burst,frame.flex,frame.tension);
   for(const side of ['left','right']){
    const el=parts[side];el.fill.hidden=gone;
    el.rail.style.display=gone?'none':'';el.glint.style.display=gone?'none':'';
    if(g){el.fill.style.clipPath='path("'+g[side+'Fill']+'")';el.rail.setAttribute('d',g[side]);el.glint.setAttribute('d',g[side]);}
   }
   lastGeometry=geometry;
  }
  if(!gone)for(const side of ['left','right']){
   const el=parts[side];
   el.glint.setAttribute('stroke-dasharray',frame.length+' '+(100-frame.length));
   el.glint.setAttribute('stroke-dashoffset',String(frame.length+(frame.travel%100)));
   el.glint.setAttribute('opacity',String(frame.glint));
  }
  }
  movePage(frame);
  setVar(header,'--hyper-controls-up',(controlShift*clamp(frame.lift)).toFixed(2)+'px');setVar(header,'--hyper-words',frame.words);
  setVar(header,'--hyper-words-up',((parts.height+12)*frame.wordsUp-frame.wordsDip).toFixed(2)+'px');
  if(lastPhase!==frame.phase){body.dataset.hyperspace=frame.phase;lastPhase=frame.phase;}
 }
 function tick(now){
  raf=undefined;if(!overlay)return;
  if(returning){
   const p=clamp((now-returning.start)/returning.duration),f=returning.frame;
   const q=smooth(p),releaseBack=runMode==='elegant'?q:smooth(p/.62),splitBack=smooth((p-.26)/.74);
   draw({...f,split:f.split*(1-splitBack),burst:f.burst*(1-releaseBack),flex:f.flex*(1-q),tension:f.tension*(1-q),lift:f.lift*(1-q),wordsUp:f.wordsUp*(1-q),wordsDip:f.wordsDip*(1-q),words:f.words+(1-f.words)*q,glint:f.glint*(1-smooth(p/.35)),phase:'return'});
   if(p>=1){clear();return;}
  }else{
   draw(runMode==='elegant'?elegantHeaderFrame(Math.max(0,now-started)):hyperspaceFrame(Math.max(0,now-started),runSeconds));
   if(current.done)return; // hold indefinitely; no idle frame loop
  }
  raf=time.frame(tick);
 }
 function open(){
  timer=undefined;if(!eligible())return;clear();
  const rect=header.getBoundingClientRect(),style=win.getComputedStyle(header);
  if(rect.width<1||rect.height<1)return;
  const surface=style.background,rail=style.borderBottomColor;
  const page=pageColor();
  const controls=[header.querySelector('.brand-lockup'),header.querySelector('#theme')].filter(Boolean).map(el=>el.getBoundingClientRect());
  const controlBottom=Math.max(0,...controls.map(r=>r.bottom-rect.top));
  controlShift=controls.length?Math.max(0,Math.min(12,...controls.map(r=>r.top-rect.top-3))):0;
  const heading=main?.querySelector('h1,h2');
  // A page that is already scrolled may have content against its top edge.
  const contentGap=main&&heading&&main.scrollTop<1?clamp(heading.getBoundingClientRect().top-main.getBoundingClientRect().top,0,32):0;
  ({rest:baseLift,peak:peakLift}=hyperspaceLiftBounds(rect.height,contentGap,controlBottom,controlShift));
  // Elegant is an overlay-only header: reclaim the entire measured header
  // height, including on scrolled pages. The R and theme glyph float above
  // the existing content. Hyperspace retains its original clearance bounds.
  if(preference.value.mode==='elegant')baseLift=peakLift=rect.height;
  overlay=doc.createElement('div');overlay.className='hyperspace-overlay';overlay.setAttribute('aria-hidden','true');
  let titleLift=0;
  if(['history','queue'].includes(shell.dataset.view)){
   const atTop=main?.scrollTop<1&&!!main.querySelector('.queue-page>h1');
   ({rest:baseLift,peak:peakLift,title:titleLift}=archiveLiftBounds({rest:baseLift,peak:peakLift},atTop,shell.dataset.view));
  }
  let titleCenter;
  if(['settings','screenshot'].includes(shell.dataset.view)){
   const title=main?.querySelector('.page>h1>[data-hyper-center-title]');
   if(title){const r=title.getBoundingClientRect();titleCenter=rect.left+rect.width/2-r.left-r.width/2;}
  }
  parts={width:rect.width,height:Math.max(1,rect.height-1),titleLift,titleCenter};
  runMode=preference.value.mode;body.dataset.hyperspaceMode=runMode;
  if(runMode==='elegant'){
   setVar(body,'--hyper-elegant-page',page);
   const themeRect=theme?.getBoundingClientRect();
   parts.themeShift=themeRect?Math.max(0,Math.min(6,rect.right-themeRect.right-2)):0;
   // Retain a keyboard/touch-accessible R as a keyboard/touch reveal target.
   if(brand){brandAttributes=['tabindex','role','aria-label'].map(k=>[k,brand.getAttribute(k)]);brand.setAttribute('tabindex','0');brand.setAttribute('role','button');brand.setAttribute('aria-label','Reveal header');}
   const fill=doc.createElement('div');fill.className='hyperspace-elegant-surface';fill.style.background=surface;fill.style.borderBottomColor=rail;overlay.append(fill);parts.elegant=fill;
  }else{
  const svg=doc.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 '+parts.width+' '+parts.height);svg.setAttribute('preserveAspectRatio','none');
  for(const side of ['left','right']){
   const fill=doc.createElement('div');fill.className='hyperspace-surface';fill.style.background=surface;overlay.append(fill);
   const line=className=>{const node=doc.createElementNS(svgNS,'path');node.setAttribute('class',className);node.setAttribute('pathLength','100');node.setAttribute('fill','none');svg.append(node);return node;};
   const railNode=line('hyperspace-rail');railNode.setAttribute('stroke',rail);
   parts[side]={fill,rail:railNode,glint:line('hyperspace-glint')};
  }
  overlay.append(svg);}
  header.prepend(overlay);setVar(overlay,'--hyper-page',page);
  runSeconds=preference.value.seconds;started=time.now();draw(runMode==='elegant'?elegantHeaderFrame(0):hyperspaceFrame(0,runSeconds));raf=time.frame(tick);
 }
 function arm(){cancelTimer();if(!overlay&&eligible())timer=time.set(open,IDLE_MS);}
 function restore(immediate=false){
  cancelTimer();if(!overlay)return;
  if(immediate||media.matches){clear();return;}
  if(returning)return;
  cancelFrame();returning={frame:{...current},start:time.now(),duration:Math.max(300,Math.round(880*Math.max(current.split,current.burst,.3)))};
  raf=time.frame(tick);
 }
 function pointer(over){
  if(over===inside)return;inside=over;
  if(over)restore();else arm();
 }
 // Both animations reveal from the original header rectangle on every
 // supported view. The visible color toggle is an independent control.
 const elegantHidden=()=>!!overlay&&runMode==='elegant'&&!returning;
 const within=(el,e)=>{if(!el)return false;const r=el.getBoundingClientRect();return el.contains(e.target)||(e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom);};
 const revealArea=e=>within(header,e)&&!(elegantHidden()&&within(theme,e));
 on(doc,'pointermove',e=>{if(e.pointerType==='touch')return;pointer(revealArea(e));},{passive:true,capture:true});
 on(header,'pointerenter',e=>{if(e.pointerType!=='touch')pointer(revealArea(e));});
 on(doc.documentElement,'pointerleave',()=>pointer(false));
 on(header,'pointerdown',e=>{if(revealArea(e))restore(true);},true);
 on(header,'focusin',e=>{if(elegantHidden()){if(brand?.contains(e.target)&&e.target.matches(':focus-visible'))restore(true);return;}if(header.querySelector(':focus-visible'))restore(true);});
 on(header,'keydown',e=>{if(elegantHidden()){if(brand?.contains(e.target)&&(e.key==='Enter'||e.key===' '))restore(true);return;}restore(true);});
 on(doc,'visibilitychange',()=>{if(doc.hidden)reset();});
 on(win,'resize',reset);on(media,'change',reset);on(win,'pagehide',reset);
 const skinSignature=()=>['data-aesthetic','data-onyx-finish','data-nostalgia-style'].map(k=>doc.documentElement.getAttribute(k)).join('|');
 let lastSkin=skinSignature();
 const themeObserver=new win.MutationObserver(records=>{
  const nextSkin=skinSignature(),sameSkin=nextSkin===lastSkin;lastSkin=nextSkin;
  if(elegantHidden()&&sameSkin){
   // Color-mode changes or redundant skin writes during Providers updates
   // must never reveal Elegant navigation. Read the new
   // page color without retaining the previous fallback on the body.
   body.style.removeProperty('--hyper-elegant-page');setVar(body,'--hyper-elegant-page',pageColor());
   return;
  }
  reset();
 });themeObserver.observe(doc.documentElement,{attributeFilter:['data-aesthetic','data-theme','data-onyx-finish','data-nostalgia-style','style']});
 const unsub=preference.subscribe(reset);
 // Navigation is cancellation-only: it never starts a timer or animation.
 return {start(){void preference.ready.then(()=>{if(!disposed)arm();});},viewChanged:reset,dispose(){disposed=true;reset();themeObserver.disconnect();unsub();for(const fn of cleanups)fn();}};
}
