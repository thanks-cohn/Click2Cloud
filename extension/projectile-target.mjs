// Visual-only, current visible provider geometry. No observers or polling.
const selectors={google:'.remote-provider[data-provider="google"]',onedrive:'.remote-provider[data-provider="onedrive"]',dropbox:'.remote-provider[data-provider="dropbox"]',cloudflare:'.remote-cloudflare'};
export function visibleProviderFraction(document,provider){
 const selector=Object.hasOwn(selectors,provider)?selectors[provider]:null;
 const view=document.defaultView;
 if(!selector||document.hidden||document.documentElement.hasAttribute('data-aesthetic-pending')||
    document.querySelector('#shell')?.dataset.view!=='remotes'||document.querySelector('dialog[open]'))return null;
 const card=document.querySelector('#main '+selector),main=document.querySelector('#main');
 if(!card||!main||!view||!(view.innerHeight>0))return null;
 const style=view.getComputedStyle(card);
 if(style.visibility!=='visible'||style.display==='none'||Number(style.opacity)===0)return null;
 const bounds=card.getBoundingClientRect(),clip=main.getBoundingClientRect();
 const top=Math.max(bounds.top,clip.top,0),bottom=Math.min(bounds.bottom,clip.bottom,view.innerHeight);
 if(bottom-top<12||bounds.width<=0||bounds.height<=0)return null;
 return (top+bottom)/2/view.innerHeight;
}
