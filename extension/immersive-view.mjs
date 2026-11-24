const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};

// Uses the gallery's existing image and URL. Only its displayed size changes.
export function wireImmersiveView(dialog,{initiallyImmersive=false}={}){
 const frame=dialog.querySelector('.image-frame'),image=frame.querySelector('img');
 const enter=dialog.querySelector('#immersive-view,[data-enter-immersive]'),exitButton=dialog.querySelector('#exit-immersive,[data-exit-immersive]');
 const controls=dialog.querySelector('.immersive-controls'),slider=controls.querySelector('input');
 const percent=controls.querySelector('output'),fit=controls.querySelector('button');
 let observer;

 function size(){
  if(!dialog.hasAttribute('data-immersive')||!image.naturalWidth||image.hidden)return;
  const base=Math.min(frame.offsetWidth/image.naturalWidth,frame.offsetHeight/image.naturalHeight);
  if(base<=0)return;
  const width=Math.floor(image.naturalWidth*base),height=Math.floor(image.naturalHeight*base);
  const scale=Number(slider.value)/100;
  image.style.width=Math.floor(width*scale)+'px';
  image.style.height=Math.floor(height*scale)+'px';
 }

 function zoom(value,point){
  const before=image.getBoundingClientRect(),area=frame.getBoundingClientRect();
  const anchor=point??{x:area.left+frame.clientWidth/2,y:area.top+frame.clientHeight/2};
  const clamp=n=>Math.max(0,Math.min(1,n));
  const x=before.width?clamp((anchor.x-before.left)/before.width):.5;
  const y=before.height?clamp((anchor.y-before.top)/before.height):.5;
  value=Math.max(Number(slider.min),Math.min(Number(slider.max),value));
  slider.value=String(value);percent.value=slider.value+'%';
  frame.toggleAttribute('data-zoomed',value>100);
  size();
  const after=image.getBoundingClientRect();
  frame.scrollTo({
   left:value===100?0:frame.scrollLeft+after.left+after.width*x-anchor.x,
   top:value===100?0:frame.scrollTop+after.top+after.height*y-anchor.y,
   behavior:point&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'
  });
 }

 function open(){
  if(observer)return;
  dialog.setAttribute('data-immersive','');
  zoom(100);
  observer=new ResizeObserver(size);observer.observe(frame);
  exitButton.focus({preventScroll:true});
 }

 function dispose(){observer?.disconnect();observer=undefined;}
 function exit(){
  if(!dialog.hasAttribute('data-immersive'))return false;
  dispose();
  dialog.removeAttribute('data-immersive');
  frame.removeAttribute('data-zoomed');
  image.style.removeProperty('width');image.style.removeProperty('height');
  frame.scrollTo(0,0);
  enter.focus({preventScroll:true});
  return true;
 }

 function escape(){
  if(!dialog.hasAttribute('data-immersive'))return false;
  if(Number(slider.value)>100){zoom(100);return true;}
  return exit();
 }

 function handleKey(event){
  if(!dialog.hasAttribute('data-immersive')||slider.disabled)return false;
  if(event.key==='+'||event.code==='NumpadAdd'||event.shiftKey&&event.code==='Equal'){
   zoom(Number(slider.value)+25);
   return true;
  }
  if(event.key==='-'||event.code==='NumpadSubtract'){
   zoom(Number(slider.value)-25);
   return true;
  }
  const direction=Object.hasOwn(directions,event.key)?directions[event.key]:null;
  if(Number(slider.value)<=100||!direction)return false;
  const step=Math.max(32,Math.min(120,Math.round(Math.min(frame.clientWidth,frame.clientHeight)/5)));
  const within=(current,delta,max)=>Math.min(max,Math.max(0,current+delta*step));
  frame.scrollTo({left:within(frame.scrollLeft,direction[0],frame.scrollWidth-frame.clientWidth),
   top:within(frame.scrollTop,direction[1],frame.scrollHeight-frame.clientHeight),behavior:'instant'});
  return true;
 }

 enter.onclick=open;exitButton.onclick=exit;fit.onclick=()=>zoom(100);
 slider.oninput=()=>zoom(Number(slider.value));
 image.onclick=event=>{
  if(dialog.hasAttribute('data-immersive'))zoom(Number(slider.value)===100?200:100,{x:event.clientX,y:event.clientY});
 };
 if(initiallyImmersive)open();
 return {escape,handleKey,dispose,ready(){enter.disabled=slider.disabled=fit.disabled=false;size();}};
}
