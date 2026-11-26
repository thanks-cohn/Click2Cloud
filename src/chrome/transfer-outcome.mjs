const retryable=new Set(['HTTP_429','HTTP_502','HTTP_503','HTTP_504','TRANSIENT_API_FAILURE',
 'EXPLORER_NETWORK_ERROR','EXPLORER_REQUEST_TIMEOUT','REQUEST_TIMEOUT','NETWORK_ERROR']);

export const retryableTransferCode=code=>retryable.has(code);

export function transferRetryDelay(attempt,retryAfterMs,random=Math.random){
 const jitter=Math.round(Math.min(8000,250*2**(attempt-1))*(.75+.5*random()));
 return Math.max(Number.isSafeInteger(retryAfterMs)&&retryAfterMs>=0?retryAfterMs:0,jitter);
}

export function transferOutcomeClass(state,code){
 if(state==='verified')return 'verified';
 if(state==='uncertain')return 'uncertain-publication';
 if(state==='cancelled')return 'cancelled';
 if(code==='HTTP_429')return 'throttled';
 if(retryableTransferCode(code))return 'transient';
 if(/REVOKED/.test(code??''))return 'revoked';
 if(/AUTH|HTTP_40[13]|INSUFFICIENT_SCOPE/.test(code??''))return 'auth-required';
 if(/QUOTA|DISK_EXHAUSTED/.test(code??''))return 'storage-exhausted';
 if(/CONFLICT|CHANGED/.test(code??''))return 'conflict';
 return state==='partial'?'partial':'permanent';
}
