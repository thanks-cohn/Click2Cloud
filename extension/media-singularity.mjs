// Singularity V1. The SVG is decorative; native action buttons retain
// their exact handlers, geometry, semantics and disabled state.
const NS='http://www.w3.org/2000/svg';
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
let serial=0;
export const SINGULARITY_MS=3800;
export function fragmentPattern(start,end,random=Math.random){
 const pieces=[];let x=start,lastGap=-100;const used=new Set();
 while(x<end){
  const length=Math.min(end-x,4+random()*16);
  if(length<3)break;
  pieces.push({start:x,end:x+length,alpha:.65+random()*.35});
  let gaps=Array.from({length:15},(_,i)=>i+4).filter(g=>!used.has(g)&&Math.abs(g-lastGap)>=3);
  if(!gaps.length)gaps=Array.from({length:15},(_,i)=>i+4).filter(g=>Math.abs(g-lastGap)>=3);
  const gap=gaps[Math.min(gaps.length-1,Math.floor(random()*gaps.length))];
  used.add(gap);lastGap=gap;x+=length+gap;
 }
 return pieces;
}
export function singularityFrame(p,left,right){
 p=clamp(p);
 // Short acceleration, long friction-like coast: velocity peaks at a quarter
 // of the approach and smoothly falls to zero at the merge boundary.
 const t=clamp(p/.42),approach=1-(1-t)**4*(1+4*t);
 const collapse=ease((p-.42)/.28),retreat=clamp((p-.70)/.30);
 const edge=right.x+right.w, movingX=left.x+(right.x-left.x)*approach+(edge-right.x)*collapse;
 const width=Math.max(0,(left.w+(right.w-left.w)*approach)*(1-collapse));
 return {movingX,width,retreat,rotation:1080*retreat*retreat,scale:Math.pow(1-retreat,1.8),
  outlineOpacity:1-ease((p-.66)/.04),rightOpacity:1-ease((p-.39)/.06),
  lineOpacity:ease((p-.66)/.04)*(1-ease((retreat-.86)/.14)),
  rightClip:Math.max(right.x,Math.min(edge,movingX+width))};
}
export function wireMediaSingularity(media,actions,signal){
 const doc=media.ownerDocument,win=doc.defaultView,root=doc.documentElement;
 const buttons=[actions.querySelector('[data-download]'),actions.querySelector('[data-go]')];
 if(buttons.some(b=>!b)||!win||signal.aborted)return;
 const summary=media.querySelector('summary'),motion=win.matchMedia('(prefers-reduced-motion: reduce)');
 let scene,geometry,fragments=[],progress=0,target=0,raf,last,initialized=false,enabled=false,disposed=false;
 let priorInert=buttons.map(b=>b.inert);
 const id='media-singularity-'+(++serial);
 const svg=(tag,attrs={},parent)=>{const n=doc.createElementNS(NS,tag);attrsFor(n,attrs);parent?.append(n);return n;};
 function attrsFor(n,attrs){for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));}
 const stop=()=>{if(raf!==undefined)win.cancelAnimationFrame(raf);raf=undefined;last=undefined;};
 function native(){
  actions.removeAttribute('data-singularity-painted');
  buttons.forEach((b,i)=>{b.inert=priorInert[i];});
  if(scene)scene.svg.style.visibility='hidden';
 }
 function decorative(){
  if(buttons.includes(doc.activeElement))summary?.focus({preventScroll:true});
  actions.setAttribute('data-singularity-painted','');
  buttons.forEach(b=>{b.inert=true;});
  if(scene)scene.svg.style.visibility='visible';
 }
 function measure(){
  const box=actions.getBoundingClientRect();
  const rects=buttons.map(b=>{
   const r=b.getBoundingClientRect(),s=win.getComputedStyle(b);
   return {x:r.left-box.left,y:r.top-box.top,w:r.width,h:r.height,radius:Math.min(parseFloat(s.borderTopLeftRadius)||0,r.height/2),stroke:s.borderTopColor,strokeWidth:parseFloat(s.borderTopWidth)||1,fill:s.backgroundColor,color:s.color,font:s.fontSize,family:s.fontFamily,weight:s.fontWeight,label:b.textContent.trim()};
  });
  if(box.width<=0||box.height<=0||rects.some(r=>r.w<=0||r.h<=0)||Math.abs(rects[0].y-rects[1].y)>2||rects[0].x+rects[0].w>rects[1].x+.5)return null;
  return {w:box.width,h:box.height,left:rects[0],right:rects[1]};
 }
 function createScene(){
  scene?.svg.remove();
  const {w,h,left,right}=geometry;
  const surface=svg('svg',{class:'media-singularity-scene',viewBox:'0 0 '+w+' '+h,'aria-hidden':'true',focusable:'false'},actions);
  const defs=svg('defs',{},surface);
  const textClip=svg('clipPath',{id:id+'-text'},defs);svg('rect',{x:0,y:0,width:right.x,height:h},textClip);
  const rClip=svg('clipPath',{id:id+'-right'},defs);const clip=svg('rect',{x:right.x,y:0,width:w-right.x,height:h},rClip);
  const debris=svg('g',{},surface);
  const rg=svg('g',{'clip-path':'url(#'+id+'-right)'},surface);
  const rect=svg('rect',{x:right.x,y:right.y,width:right.w,height:right.h,rx:right.radius,fill:right.fill,stroke:right.stroke,'stroke-width':right.strokeWidth},rg);
  function label(r,parent){const t=svg('text',{x:r.x+r.w/2,y:r.y+r.h/2,'dominant-baseline':'central','text-anchor':'middle',fill:r.color,'font-size':r.font,'font-family':r.family,'font-weight':r.weight},parent);t.textContent=r.label;return t;}
  label(right,rg);
  const moving=svg('rect',{x:left.x,y:left.y,width:left.w,height:left.h,rx:left.radius,fill:left.fill,stroke:left.stroke,'stroke-width':left.strokeWidth},surface);
  const tg=svg('g',{'clip-path':'url(#'+id+'-text)'},surface),text=label(left,tg);
  const edge=right.x+right.w-.75,cy=right.y+right.h/2;
  const line=svg('line',{x1:edge,x2:edge,y1:right.y+.75,y2:right.y+right.h-.75,stroke:right.stroke,'stroke-width':Math.max(1,right.strokeWidth),'stroke-linecap':'round',opacity:0},surface);
  scene={svg:surface,clip,rg,moving,text,debris,line,edge,cy};
  rebuildFragments();
 }
 function rebuildFragments(){
  if(!scene)return;
  scene.debris.replaceChildren();
  const {left,right}=geometry;
  fragments=fragmentPattern(left.x+left.radius,right.x+right.w-right.radius).map(piece=>{
   const n=svg('line',{x1:piece.start,x2:piece.end,y1:left.y+left.h-.5,y2:left.y+left.h-.5,stroke:left.stroke,'stroke-width':Math.max(1,left.strokeWidth),'stroke-linecap':'round',opacity:0},scene.debris);
   return {...piece,node:n};
  });
 }
 function draw(){
  if(!scene||!geometry)return;
  const {left,right}=geometry,f=singularityFrame(progress,left,right);
  attrsFor(scene.moving,{x:f.movingX,y:left.y,width:Math.max(.001,f.width),height:left.h,rx:Math.min(left.radius,f.width/2),opacity:f.outlineOpacity});
  attrsFor(scene.text,{x:f.movingX+left.w/2,opacity:f.outlineOpacity});
  attrsFor(scene.clip,{x:f.rightClip,width:Math.max(0,geometry.w-f.rightClip)});
  attrsFor(scene.rg,{opacity:f.rightOpacity});
  for(const piece of fragments)attrsFor(piece.node,{opacity:ease((f.movingX-piece.end-2)/7)*piece.alpha});
  const {edge,cy}=scene,angle=f.rotation*Math.PI/180;
  // Keep the rotating line inside its own action row, even at the edge.
  const shift=Math.min(edge,Math.max(0,Math.abs(Math.sin(angle))*right.h*f.scale/2-(geometry.w-edge-1)));
  attrsFor(scene.line,{opacity:f.lineOpacity,transform:'translate('+(edge-shift)+' '+cy+') rotate('+f.rotation+') scale('+Math.max(.001,f.scale)+') translate('+(-edge)+' '+(-cy)+')'});
 }
 function finish(){stop();draw();if(progress===0)native();else decorative();}
 function frame(now){
  raf=undefined;
  if(disposed||!enabled||!actions.isConnected){stop();return;}
  const dt=last===undefined?0:Math.min(50,Math.max(0,now-last));last=now;
  progress=clamp(progress+Math.sign(target-progress)*Math.min(Math.abs(target-progress),dt/SINGULARITY_MS));
  draw();
  if(progress===target)finish();else raf=win.requestAnimationFrame(frame);
 }
 function sync(instant=false){
  if(disposed||!actions.isConnected)return;
  const allowed=root.dataset.aesthetic==='onyx'&&actions.closest('#shell[data-view=history]')&&actions.querySelectorAll(':scope > button').length===2;
  if(!allowed){stop();enabled=false;initialized=false;native();actions.removeAttribute('data-media-singularity');scene?.svg.remove();scene=undefined;geometry=undefined;return;}
  const next=measure();
  if(!next){
   // Narrow shelves may wrap the real buttons. Keep the actions accessible,
   // without projecting an overlapping or clipped decorative scene.
   stop();enabled=false;initialized=false;native();actions.removeAttribute('data-media-singularity');scene?.svg.remove();scene=undefined;geometry=undefined;return;
  }
  enabled=true;actions.setAttribute('data-media-singularity','');
  const signature=g=>[g.w,g.h,...[g.left,g.right].flatMap(r=>[r.x,r.y,r.w,r.h,r.stroke,r.fill,r.color,r.font,r.radius])].join('|');
  if(!geometry||signature(next)!==signature(geometry)){geometry=next;createScene();}
  const destination=media.open?0:1;
  if(!initialized){initialized=true;progress=target=destination;finish();return;}
  if(instant||motion.matches){progress=target=destination;finish();return;}
  if(destination===target){if(progress===target)finish();else draw();return;}
  if(destination===1&&progress===0)rebuildFragments();
  target=destination;decorative();draw();
  if(raf===undefined){last=undefined;raf=win.requestAnimationFrame(frame);}
 }
 const toggle=()=>sync(),resize=()=>sync(),reduce=()=>sync(true);
 media.addEventListener('toggle',toggle);motion.addEventListener('change',reduce);
 const ro=new win.ResizeObserver(resize);ro.observe(actions);
 const mo=new win.MutationObserver(()=>sync());mo.observe(root,{attributes:true,attributeFilter:['data-aesthetic','data-theme','data-onyx-finish']});
 // An active download adds a real Cancel button. Always yield to it.
 const children=new win.MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeName==='BUTTON')))sync(true);});
 children.observe(actions,{childList:true});
 win.queueMicrotask(()=>sync(true));
 signal.addEventListener('abort',()=>{
  disposed=true;stop();ro.disconnect();mo.disconnect();children.disconnect();media.removeEventListener('toggle',toggle);motion.removeEventListener('change',reduce);
  native();actions.removeAttribute('data-media-singularity');scene?.svg.remove();scene=undefined;
 },{once:true});
}
