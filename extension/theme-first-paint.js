// Parser-blocking script in the Shelf head, before the body is painted.
(() => {
 const root=document.documentElement,cacheKey='redownShelfColorModeV1';
 let aestheticReady=false,colorReady=false,released=false,timer;
 // This is only a last-known visual preference; configuration remains authoritative.
 try{
  const cached=localStorage.getItem(cacheKey);
  if(cached==='light'||cached==='dark')root.dataset.theme=cached;
 }catch{}
 root.dataset.aestheticPending='';
 function release(){
  if(released)return;
  released=true;clearTimeout(timer);delete root.dataset.aestheticPending;
  document.removeEventListener('redown-aesthetic-ready',aesthetic);
  document.removeEventListener('redown-color-mode-ready',color);
 }
 function check(){if(aestheticReady&&colorReady)release();}
 function aesthetic(){aestheticReady=true;check();}
 function color(){colorReady=true;check();}
 document.addEventListener('redown-aesthetic-ready',aesthetic);
 document.addEventListener('redown-color-mode-ready',color);
 // The guard never depends on provider authentication, network, or engine readiness.
 // Fail open on unavailable local preferences/configuration, using the cached mode.
 timer=setTimeout(release,1200);
})();
