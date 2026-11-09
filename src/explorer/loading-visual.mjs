import {mountMath} from './loading-visuals/math.mjs';
import {mountMedia} from './loading-visuals/media.mjs';
// One visual lifecycle inside the viewer's pre-sized frame. It never reads objects.
export function mountLoadingVisual(container,selection={mode:'math'}){
 let visual,closed=false,inView=true;const reduced=matchMedia('(prefers-reduced-motion: reduce)'),root=document.createElement('div');root.className='loading-visual';root.setAttribute('aria-hidden','true');container.prepend(root);
 const sync=()=>{visual?.setPaused(document.hidden||!inView);visual?.setReducedMotion(reduced.matches);};
 function fallback(){if(closed)return;visual?.destroy();root.replaceChildren();visual=mountMath(root);root.dataset.kind='math-fallback';sync();}
 if(selection.mode==='media'&&selection.blob instanceof Blob){visual=mountMedia(root,selection.blob,{onError:fallback});root.dataset.kind='media';}else if(selection.mode!=='plain'){visual=mountMath(root);root.dataset.kind=selection.mode==='media'?'math-fallback':'math';}else root.dataset.kind='plain';
 const observer=new IntersectionObserver(entries=>{inView=entries.at(-1)?.isIntersecting??true;sync();});observer.observe(container);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);sync();
 return ()=>{if(closed)return;closed=true;observer.disconnect();document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);visual?.destroy();root.remove();};
}
