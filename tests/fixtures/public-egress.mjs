// TEST ONLY. Bundler substitution makes network simulation explicit; production has no fixture flag.
export async function publicFetch(url,options){
 const path=new URL(url).pathname;
 if(['/large.bin','/unknown.bin','/slow.bin'].includes(path)){
  const total=path==='/large.bin'?70*1024*1024:path==='/unknown.bin'?9*1024*1024:67;let at=0;
  return new Response(new ReadableStream({async pull(c){if(at===total){c.close();return;}if(path==='/slow.bin'&&at>0)await new Promise(r=>setTimeout(r,1000));const n=path==='/slow.bin'?1:Math.min(65536,total-at);c.enqueue(new Uint8Array(n).fill(37));at+=n;}}),{headers:{'content-type':'application/octet-stream',...(path==='/unknown.bin'?{}:{'content-length':String(total)})}});
 }
 return globalThis.fetch(url,options);
}
