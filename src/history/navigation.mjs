// 3+1.1 openRemoteResult: exact recorded identity, all file types, read-only.
export async function locateSavedResult(saved,fileApi){
 const fail=code=>{throw Object.assign(Error(code),{code});};
 if(!saved?.receipt||saved.state!=='verified')fail('VERIFIED_RESULT_REQUIRED');
 const r=saved.receipt,d=r.destination??saved.destination;
 if(!d||typeof r.key!=='string'||!r.key||r.key.endsWith('/'))fail('RESULT_LOOKUP_FAILED');
 const prefix=r.key.slice(0,r.key.lastIndexOf('/')+1),target={provider:'cloudflare',connectionId:d.connectionId,accountId:d.accountId,bucketName:d.bucketName,prefix};
 // Reject corrupt records escaping the recorded destination; never guess an account.
 if(d.prefix&&!r.key.startsWith(d.prefix.replace(/\/$/,'')+'/'))fail('RESULT_LOOKUP_FAILED');
 const checked=await fileApi.run('stat',{source:target,key:r.key});if(checked.state!=='completed')fail('RESULT_LOOKUP_FAILED');
 const o=checked.data?.object;if(!o)fail('RESULT_NOT_FOUND');
 if(Number(o.size)!==r.size||r.etag&&o.etag!==r.etag||r.version&&o.version&&o.version!==r.version)fail('RESULT_CHANGED');
 return {target,highlightKey:r.key};
}
