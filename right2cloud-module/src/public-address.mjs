// IANA special-use ranges are excluded; these are address boundaries, never a website list.
export function publicAddress(raw){
 let host=String(raw).toLowerCase().replace(/^\[|\]$/g,'');
 if(host.includes(':')){
  try{host=new URL('https://['+host+']/').hostname.slice(1,-1);}catch{return false;}
  const [left,right]=host.split('::'),a=left?left.split(':'):[],b=right?right.split(':'):[];
  const words=host.includes('::')?[...a,...Array(8-a.length-b.length).fill('0'),...b]:a;
  if(words.length!==8||words.some(w=>!/^[0-9a-f]{1,4}$/.test(w)))return false;
  const n=words.reduce((v,w)=>(v<<16n)|BigInt(parseInt(w,16)),0n),inRange=(base,bits)=>(n>>BigInt(128-bits))===(base>>BigInt(128-bits));
  // Global unicast only. Exclude protocol assignments, documentation and transition networks.
  return inRange(0x20000000000000000000000000000000n,3)&&!inRange(0x20010000000000000000000000000000n,23)&&!inRange(0x20010db8000000000000000000000000n,32)&&!inRange(0x20020000000000000000000000000000n,16)&&!inRange(0x3fff0000000000000000000000000000n,20);
 }
 const p=host.split('.');if(p.length!==4||p.some(x=>!/^\d{1,3}$/.test(x)||Number(x)>255))return false;
 const n=p.reduce((v,x)=>v*256+Number(x),0),range=(base,bits)=>Math.floor(n/2**(32-bits))===Math.floor(base/2**(32-bits));
 return ![[0,8],[0x0a000000,8],[0x64400000,10],[0x7f000000,8],[0xa9fe0000,16],[0xac100000,12],[0xc0000000,24],[0xc0000200,24],[0xc0586300,24],[0xc0a80000,16],[0xc6120000,15],[0xc6336400,24],[0xcb007100,24],[0xe0000000,3]].some(([b,m])=>range(b,m));
}
export function sourceURL(raw){
 let u;try{u=new URL(raw);}catch{throw Object.assign(Error('SOURCE_INVALID'),{code:'SOURCE_INVALID'});}
 const h=u.hostname.replace(/^\[|\]$/g,'');
 if(u.protocol!=='https:'||u.username||u.password||h.endsWith('.')||(!h.includes('.')&&!h.includes(':'))||/(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(h)||((h.includes(':')||/^\d+(\.\d+)*$/.test(h))&&!publicAddress(h)))throw Object.assign(Error('SOURCE_DENIED'),{code:'SOURCE_DENIED'});
 u.hash='';return u;
}
