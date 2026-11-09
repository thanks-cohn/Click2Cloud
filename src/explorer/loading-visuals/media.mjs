// Local Blob only. No source URL, fetch, settings, geometry or R2 dependency.
export function mountMedia(container,blob,{onError=()=>{}}={}){
 const url=URL.createObjectURL(blob);let node,paused=false,reduced=false,closed=false,epoch=0;
 function disposeNode(){if(!node)return;if(node.tagName==='VIDEO'){node.pause();node.removeAttribute('src');node.load();}else if(node.tagName==='IMG')node.removeAttribute('src');node.remove();node=null;}
 function render(){const ticket=++epoch;disposeNode();if(closed)return;const video=blob.type==='video/mp4',media=document.createElement(video?'video':'img');node=media;media.className='loading-media';media.setAttribute('aria-hidden','true');if(video){media.muted=true;media.loop=true;media.playsInline=true;media.preload='auto';}
  const fail=()=>{if(!closed&&ticket===epoch)onError();};media.onerror=fail;
  const ready=()=>{if(closed||ticket!==epoch)return;if(paused||reduced){const canvas=document.createElement('canvas');const width=video?media.videoWidth:media.naturalWidth,height=video?media.videoHeight:media.naturalHeight;if(!width||!height)return fail();const scale=Math.min(1,1024/Math.max(width,height));canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));canvas.className='loading-media';canvas.setAttribute('aria-hidden','true');canvas.getContext('2d').drawImage(media,0,0,canvas.width,canvas.height);disposeNode();node=canvas;container.append(canvas);}else if(video)media.play().catch(fail);};
  media.addEventListener(video?'loadeddata':'load',ready,{once:true});media.src=url;container.append(media);
 }
 render();return {setPaused(value){if(paused!==value){paused=value;render();}},setReducedMotion(value){if(reduced!==value){reduced=value;render();}},destroy(){closed=true;epoch++;disposeNode();URL.revokeObjectURL(url);}};
}
