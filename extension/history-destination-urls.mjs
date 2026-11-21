import {domainName,developmentalDomain} from '../src/explorer/object-exports.mjs';
import {domainStatus,publicDomainError,renderPublicUrlCards} from './explorer-exports.mjs';

const customErrors={
 CUSTOM_DOMAIN_INVALID:'Enter a Cloudflare custom hostname such as assets.example.com.',
 CUSTOM_DOMAIN_ZONE_UNAVAILABLE:'This domain isn’t available in the connected Cloudflare account.',
 CUSTOM_DOMAIN_ZONE_FORBIDDEN:'Cloudflare permission is needed to find this domain.',
 CUSTOM_DOMAIN_ZONE_LOOKUP_FAILED:'Cloudflare could not verify the domain in this account. Try again or check Cloudflare domain setup.',
 CUSTOM_DOMAIN_ACCESS_DENIED:'Cloudflare denied this connection. Check R2 write access and make sure the zone belongs to this account.',
 CUSTOM_DOMAIN_CONNECT_FAILED:'Cloudflare rejected the custom domain. Check the hostname in the bucket’s account.',
 CUSTOM_DOMAIN_UNCONFIRMED:'Cloudflare has not confirmed the association. Refresh before trying again.'
};

export function wireHistoryDestinationUrls(details,{request,params,location,confirmed}){
 const body=details.querySelector('[data-destination-urls]');
 if(!confirmed){body.textContent='Public URLs are available after this file is verified.';return;}
 let sequence=0;
 details.addEventListener('toggle',()=>{
  const ticket=++sequence;
  if(!details.open)return;
  const current=()=>ticket===sequence&&details.isConnected&&details.open;
  body.innerHTML=`<div class="public-url-cards history-public-list" aria-label="Public URLs for this destination" tabindex="0" hidden></div>
   <p role="status"></p><button type="button" data-enable hidden>Enable public URLs for this bucket</button>
   <button type="button" data-refresh>Refresh</button>
   <form class="history-domain-form"><label>Custom domain <input name="domain" placeholder="assets.example.com" autocomplete="off" spellcheck="false"></label>
    <p class="muted">If your nameservers are already with Cloudflare, simply add your domain!</p>
    <button>Connect domain</button> <a href="https://dash.cloudflare.com/?to=/:account/r2/overview" target="_blank" rel="noopener noreferrer">Cloudflare domain setup</a>
   </form><p class="muted">Development URLs are rate-limited. Anonymous file access has not been checked.</p>`;
  const list=body.querySelector('.history-public-list'),feedback=body.querySelector('[role=status]'),
   enable=body.querySelector('[data-enable]'),refresh=body.querySelector('[data-refresh]'),form=body.querySelector('form');
  const controls=[enable,refresh,form.querySelector('button')];
  let busy=false;
  function render(info){
   const links=info.file?.urls??[];
   renderPublicUrlCards(list,links,async url=>{
    try{await navigator.clipboard.writeText(url);if(current())feedback.textContent='URL copied.';}
    catch{if(current())feedback.textContent='Could not copy the URL. Check clipboard access.';}
   });
   list.hidden=!links.length;
   enable.hidden=links.length>0||info.managedPublicAccess!=='disabled'||info.domainCheckComplete!==true;
   feedback.textContent=domainStatus(info);
  }
  async function run(message,work){
   if(busy||!current())return;
   busy=true;controls.forEach(control=>{control.disabled=true;});
   feedback.textContent=message;
   try{await work();}
   catch(error){if(current()){
    const details=[error.httpStatus&&'HTTP '+error.httpStatus,error.providerCodes?.length&&'Cloudflare '+error.providerCodes.join(', ')].filter(Boolean);
    feedback.textContent=(customErrors[error.code]??publicDomainError(error.code))+(details.length?' '+details.join(' · ')+'.':'');
   }}finally{busy=false;controls.forEach(control=>{control.disabled=false;});}
  }
  async function discover(){
   const info=await request('history-public-urls',params);
   if(current())render(info);
   return info;
  }
  refresh.onclick=()=>void run('Checking public domains…',discover);
  enable.onclick=()=>{
   if(busy||!confirm(`Enable public development URLs for ${location.bucketName}? Anyone who knows a file’s URL can read it in this entire bucket.`))return;
   enable.hidden=true;
   void run('Enabling public URL…',async()=>{
    const verified=await request('history-enable-public-urls',{...params,confirmed:true});
    if(!current())return;
    render(verified);feedback.textContent='Verifying…';await discover();
   });
  };
  form.onsubmit=event=>{
   event.preventDefault();
   const domain=domainName(form.elements.domain.value.trim());
   if(!domain||developmentalDomain(domain)){feedback.textContent=customErrors.CUSTOM_DOMAIN_INVALID;form.elements.domain.focus();return;}
   if(busy||!confirm(`Connect ${domain} to ${location.bucketName}? Anyone who knows a file’s URL can read it through this domain.`))return;
   void run('Connecting custom domain…',async()=>{
    const attached=await request('history-connect-domain',{...params,domain,confirmed:true});
    if(!current())return;
    for(const delay of [0,350,900,1800]){
     if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
     if(!current())return;
     const info=await discover();
     if(!current())return;
     if(info.domains.includes(domain)){feedback.textContent='Custom domain active.';return;}
     if(attached.state==='disabled'){feedback.textContent='Cloudflare lists this domain as disabled. Review it in the bucket’s settings.';return;}
     feedback.textContent='Cloudflare is still checking this domain. Refresh to check again.';
    }
   });
  };
  void run('Checking public domains…',discover);
 });
}
