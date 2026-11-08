// Presentation equivalents for navigateExplorer/getConfiguration. Never grants
// account access or mutates a target; callers verify discovered buckets via API.
export function cloudPath(target,key=target?.prefix??''){
 return target?'cloudflare://'+encodeURIComponent(target.accountId)+'/'+encodeURIComponent(target.bucketName)+'/'+key.split('/').map(encodeURIComponent).join('/'):'';
}
export function parseCloudPath(value){
 const m=/^cloudflare:\/\/([^/]+)\/([^/]+)\/(.*)$/.exec(value);if(!m)throw Error('Enter a complete cloudflare://account/bucket/path location.');
 const decode=s=>decodeURIComponent(s),accountId=decode(m[1]),bucketName=decode(m[2]),key=m[3].split('/').map(decode).join('/');
 if(!accountId||!bucketName||/[\\\x00-\x1f]/.test(key)||key.split('/').some(p=>p==='.'||p==='..'))throw Error('Invalid cloud location.');
 const file=key&&!key.endsWith('/'),prefix=file?key.slice(0,key.lastIndexOf('/')+1):key;
 return {target:{provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName,prefix},key:file?key:null};
}
export function middlePath(value,width,measure){
 if(measure(value)<=width)return value;let left=value.indexOf('/',value.indexOf('://')+3)+1;if(left<1)left=0;const tail=value.slice(value.lastIndexOf('/',value.endsWith('/')?value.length-2:value.length)+1);let suffix=tail,head=value.slice(0,left);
 while(measure(head+'…/'+suffix)>width&&(head.length>0||suffix.length>1)){if(head.length>suffix.length)head=head.slice(0,-1);else suffix=suffix.slice(1);}
 return head+'…/'+suffix;
}
