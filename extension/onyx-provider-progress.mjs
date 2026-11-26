// Onyx presentation only. Never estimate transfer percentages or modify a job.
export function paintProviderUploadProgress(root,jobs){
 if(!root)return;
 for(const [provider,selector] of [['google','[data-provider=google]'],['onedrive','[data-provider=onedrive]'],['dropbox','[data-provider=dropbox]'],['cloudflare','.remote-cloudflare']]){
  const meta=root.querySelector(selector+' .onyx-provider-meta'),bar=meta?.querySelector('.onyx-provider-transfer');
  if(!bar)continue;
  const active=jobs.filter(job=>job.provider===provider&&!job.terminal&&['working','uploading','verifying'].includes(job.status));
  meta.toggleAttribute('data-onyx-transfer',active.length>0);
  bar.hidden=!active.length;
  bar.removeAttribute('aria-valuenow');
  bar.style.removeProperty('--onyx-transfer-percent');
  if(!active.length){bar.removeAttribute('aria-label');bar.removeAttribute('aria-valuetext');continue;}
  const name={google:'Google Drive',onedrive:'OneDrive',dropbox:'Dropbox',cloudflare:'Cloudflare R2'}[provider];
  const phase=active.every(job=>job.status==='verifying')?'Verifying':active.some(job=>job.status==='uploading')?'Uploading':'Working';
  bar.setAttribute('aria-label',name+' transfer progress');
  bar.setAttribute('aria-valuetext',phase+(active.length>1?' ('+active.length+' transfers)':''));
  if(active.length===1&&active[0].status==='uploading'&&Number.isFinite(active[0].progress)&&active[0].progress>=0&&active[0].progress<=100){
   const percent=active[0].progress;
   bar.setAttribute('aria-valuenow',String(percent));
   bar.setAttribute('aria-valuetext',phase+' '+percent+'%');
   bar.style.setProperty('--onyx-transfer-percent',percent+'%');
  }
 }
}
