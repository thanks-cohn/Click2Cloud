import {createLocalPreference} from '../src/chrome/local-preference.mjs';

export const hyperspaceKey='headerHyperspaceV1';
export const IDLE_MS=5000, SPLIT_MS=1300;
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
export function normalizeHyperspace(value){
 const seconds=Number(value?.seconds);
 return {enabled:value?.enabled!==false,seconds:Number.isFinite(seconds)&&seconds>0?clamp(Math.round(seconds),1,20):5};
}
export const createHyperspacePreference=storage=>createLocalPreference(storage,hyperspaceKey,normalizeHyperspace);
export function hyperspaceTiming(seconds){
 const buildup=normalizeHyperspace({seconds}).seconds;
 const energy=clamp(Math.sqrt(buildup/5),.4,2);
 return {buildup,energy,release:Math.round(780/(.65+.35*energy)),settle:Math.round(420+energy*85)};
}
// Instantaneous velocity grows continuously; integrating it avoids a dash jump
// when its speed changes. Longer charging produces higher terminal velocity.
export function hyperspaceFrame(elapsed,seconds){
 const t=hyperspaceTiming(seconds), chargeMs=t.buildup*1000;
 const charge=clamp((elapsed-SPLIT_MS)/1000,0,t.buildup),p=charge/t.buildup;
 const travel=100*(.20*charge+.045*charge**2+.012*charge**3);
 const speed=.20+.09*charge+.036*charge**2;
 const releaseElapsed=elapsed-SPLIT_MS-chargeMs;
 const r=clamp(releaseElapsed/t.release),settle=smooth((releaseElapsed-t.release)/t.settle);
 const burst=r**2.4;
 const lift= smooth((r-.10)/.90)*(1+Math.min(.22,.075*t.energy)*(1-settle));
 return {split:smooth(elapsed/SPLIT_MS),burst,lift,words:1-smooth((r-.08)/.76),
  travel,speed,glint:Math.min(.84,(.16+.62*p)*smooth(charge/.42))*(1-smooth(r)),
  length:6+Math.min(18,3*speed),done:releaseElapsed>=t.release+t.settle,
  phase:elapsed<SPLIT_MS?'split':releaseElapsed<0?'charge':r<1?'release':settle<1?'settle':'open'};
}
// The surface and the stroke are constructed from exactly the same curve.
// The initial center gap is 80 CSS px (clamped on tiny windows).
export function hyperspaceGeometry(width,height,split,burst){
 const w=Math.max(1,width),h=Math.max(1,height),gap=Math.min(80,w*.42)*split;
 const tip=w/2-gap/2,tipY=h*(1-split),shift=(w/2+3)*burst;
 const x=v=>Number((v-shift).toFixed(3)),y=v=>Number(v.toFixed(3));
 const left='M '+x(tip)+' '+y(tipY)+' C '+x(tip)+' '+y(h*(1-.44*split))+' '+x(tip*(1-.36*split))+' '+y(h*(1-.28*split))+' '+x(0)+' '+y(h);
 const right='M '+(w-x(tip))+' '+y(tipY)+' C '+(w-x(tip))+' '+y(h*(1-.44*split))+' '+(w-x(tip*(1-.36*split)))+' '+y(h*(1-.28*split))+' '+(w-x(0))+' '+y(h);
 return {left,right,leftFill:left+' L '+x(0)+' 0 L '+x(tip)+' 0 Z',rightFill:right+' L '+(w-x(0))+' 0 L '+(w-x(tip))+' 0 Z',gap};
}
export function mountHyperspaceSettings(parent,preference){
 const section=parent.ownerDocument.createElement('section');
 section.className='hyperspace-settings';
 section.innerHTML='<h3>Header Hyperspace</h3><label class="settings-row">Enable header animation<input type="checkbox" data-hyperspace-enabled></label><label class="settings-row">Shimmer buildup (seconds)<input type="number" min="1" max="20" step="1" data-hyperspace-seconds></label><p class="muted">Default: 5 seconds. Longer buildup creates a stronger outward release and upward sweep.</p><p role="status"></p>';
 const enabled=section.querySelector('[data-hyperspace-enabled]'),seconds=section.querySelector('[data-hyperspace-seconds]'),status=section.querySelector('[role=status]');
 const paint=()=>{enabled.checked=preference.value.enabled;seconds.value=preference.value.seconds;seconds.disabled=!enabled.checked;};
 const save=async()=>{try{const next={enabled:enabled.checked,seconds:seconds.valueAsNumber};await preference.update(()=>next);status.textContent='';}catch{status.textContent='Hyperspace preference could not be saved.';}paint();};
 enabled.onchange=seconds.onchange=()=>void save();parent.append(section);paint();void preference.ready.then(paint);
}
const svgNS='http://www.w3.org/2000/svg';
export function installHyperspace({header,shell,preference,doc=header.ownerDocument,clock}){
 const win=doc.defaultView,body=doc.body,media=win.matchMedia('(prefers-reduced-motion: reduce)');
 const time=clock??{now:()=>win.performance.now(),set:(fn,ms)=>win.setTimeout(fn,ms),clear:id=>win.clearTimeout(id),frame:fn=>win.requestAnimationFrame(fn),cancel:id=>win.cancelAnimationFrame(id)};
 let timer,raf,overlay,parts,current,started,returning,runSeconds,inside=false,disposed=false,baseLift=24;
 const cleanups=[];
 const on=(target,type,fn,opts)=>{target.addEventListener(type,fn,opts);cleanups.push(()=>target.removeEventListener(type,fn,opts));};
 const cancelTimer=()=>{if(timer!==undefined){time.clear(timer);timer=undefined;}};
 const cancelFrame=()=>{if(raf!==undefined){time.cancel(raf);raf=undefined;}};
 const eligible=()=>!disposed&&preference.value.enabled&&!media.matches&&!doc.hidden&&shell.dataset.view!=='explorer'&&!inside&&!header.matches(':hover')&&!header.querySelector(':focus-visible')&&!header.querySelector('#header-menu:not([hidden])')&&!doc.querySelector('dialog[open]');
 const setVar=(k,v)=>body.style.setProperty(k,String(v));
 function clear(){
  cancelFrame();overlay?.remove();overlay=parts=current=returning=undefined;
  body.removeAttribute('data-hyperspace');
  for(const key of ['--hyper-page','--hyper-lift','--hyper-words'])body.style.removeProperty(key);
 }
 function reset(){cancelTimer();clear();}
 function draw(frame){
  if(!overlay)return;
  current=frame;
  const g=hyperspaceGeometry(parts.width,parts.height,frame.split,frame.burst);
  for(const side of ['left','right']){
   const el=parts[side];el.fill.style.clipPath='path("'+g[side+'Fill']+'")';
   el.rail.setAttribute('d',g[side]);el.glint.setAttribute('d',g[side]);
   el.glint.setAttribute('stroke-dasharray',frame.length+' '+(100-frame.length));
   el.glint.setAttribute('stroke-dashoffset',String(-(frame.travel%100)));
   el.glint.setAttribute('opacity',String(frame.glint));
  }
  setVar('--hyper-lift',(baseLift*frame.lift).toFixed(2)+'px');setVar('--hyper-words',frame.words);
  body.dataset.hyperspace=frame.phase;
 }
 function tick(now){
  raf=undefined;if(!overlay)return;
  if(returning){
   const p=clamp((now-returning.start)/returning.duration),f=returning.frame;
   const q=smooth(p),releaseBack=smooth(p/.62),splitBack=smooth((p-.26)/.74);
   draw({...f,split:f.split*(1-splitBack),burst:f.burst*(1-releaseBack),lift:f.lift*(1-q),words:f.words+(1-f.words)*q,glint:f.glint*(1-smooth(p/.35)),phase:'return'});
   if(p>=1){clear();return;}
  }else{
   draw(hyperspaceFrame(Math.max(0,now-started),runSeconds));
   if(current.done)return; // hold indefinitely; no idle frame loop
  }
  raf=time.frame(tick);
 }
 function open(){
  timer=undefined;if(!eligible())return;clear();
  const rect=header.getBoundingClientRect(),style=win.getComputedStyle(header);
  if(rect.width<1||rect.height<1)return;
  const surface=style.background,rail=style.borderBottomColor;
  const page=[shell.querySelector('main'),shell,body].filter(Boolean).map(el=>win.getComputedStyle(el).backgroundColor).find(c=>c!=='transparent'&&c!=='rgba(0, 0, 0, 0)')||style.getPropertyValue('--bg');
  baseLift=Math.min(28,Math.max(0,rect.height-40));
  overlay=doc.createElement('div');overlay.className='hyperspace-overlay';overlay.setAttribute('aria-hidden','true');
  parts={width:rect.width,height:Math.max(1,rect.height-1)};
  const svg=doc.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 '+parts.width+' '+parts.height);svg.setAttribute('preserveAspectRatio','none');
  for(const side of ['left','right']){
   const fill=doc.createElement('div');fill.className='hyperspace-surface';fill.style.background=surface;overlay.append(fill);
   const line=className=>{const node=doc.createElementNS(svgNS,'path');node.setAttribute('class',className);node.setAttribute('pathLength','100');node.setAttribute('fill','none');svg.append(node);return node;};
   const railNode=line('hyperspace-rail');railNode.setAttribute('stroke',rail);
   parts[side]={fill,rail:railNode,glint:line('hyperspace-glint')};
  }
  overlay.append(svg);header.prepend(overlay);setVar('--hyper-page',page);
  runSeconds=preference.value.seconds;started=time.now();draw(hyperspaceFrame(0,runSeconds));raf=time.frame(tick);
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
 // Coordinate-based hover retains the original full header hit region even
 // when content has moved up. DOM-only dropdown removal cannot arm the timer.
 on(doc,'pointermove',e=>{if(e.pointerType==='touch')return;const r=header.getBoundingClientRect();pointer(header.contains(e.target)||(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom));},{passive:true,capture:true});
 on(header,'pointerenter',()=>pointer(true));
 on(doc.documentElement,'pointerleave',()=>pointer(false));
 on(header,'pointerdown',()=>restore(true),true);
 on(header,'focusin',()=>{if(header.querySelector(':focus-visible'))restore(true);});
 on(header,'keydown',()=>restore(true));
 on(doc,'visibilitychange',()=>{if(doc.hidden)reset();});
 on(win,'resize',reset);on(media,'change',reset);on(win,'pagehide',reset);
 const themeObserver=new win.MutationObserver(reset);themeObserver.observe(doc.documentElement,{attributeFilter:['data-aesthetic','data-theme','data-onyx-finish','data-nostalgia-style','style']});
 const unsub=preference.subscribe(reset);
 // Navigation is cancellation-only: it never starts a timer or animation.
 return {start(){void preference.ready.then(()=>{if(!disposed)arm();});},viewChanged:reset,dispose(){disposed=true;reset();themeObserver.disconnect();unsub();for(const fn of cleanups)fn();}};
}
