import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {createPublicEgress} from '../src/cloudflare/public-egress.mjs';import {sourceFetch,sourceMetadata,responseFilename} from '../right2cloud-module/src/source-fetch.mjs';import {createRemoteTransport} from '../src/cloudflare/transport.mjs';
const reference=readFileSync(new URL('./fixtures/redown/native-source-reference.js',import.meta.url),'utf8');
function redown(fetch){return vm.runInNewContext(reference+';({checkedFetch,privateHost,filenameWithInferredExtension})',{URL,fetch});}
test('paired actual REDOWN native-fetch behavior: direct text, image and validated relative redirects',async()=>{
 for(const hops of [0,2])for(const type of ['text/plain','image/png']){
  const fetcher=async raw=>{const u=new URL(raw),n=Number(u.pathname.slice(1));return n<hops?new Response(null,{status:302,headers:{location:'/'+(n+1)}}):new Response('abc',{headers:{'content-length':'3','content-type':type}});};
  const r=await redown(fetcher).checkedFetch('https://public.org/0');const c=await sourceFetch('https://public.org/0',{fetch:createPublicEgress({resolve:async()=>['93.184.216.34'],fetch:fetcher})});assert.equal(await r.text(),await new Response(c.body).text());assert.equal(c.length,3);assert.equal(c.contentType,type);
 }
 assert.equal(redown(()=>{}).filenameWithInferredExtension('photo','image/png'),responseFilename('photo','image/png'));
});
test('paired reference guard defect is not inherited: private literals and credential-bearing redirects never reach C2C fetch',async()=>{
 let reached=0;const r=redown(async()=>{reached++;return new Response('reference fixture');});await r.checkedFetch('https://127.0.0.1/private');assert.equal(reached,1,'Source-derived REDOWN regex does not block this literal; NOT a live exploit claim');
 let calls=0;await assert.rejects(sourceFetch('https://127.0.0.1/private',{fetch:async()=>{calls++;}}),{code:'SOURCE_DENIED'});assert.equal(calls,0);
 const f=createPublicEgress({resolve:async()=>['93.184.216.34'],fetch:async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://user:fixture@public.org/'}});}});await assert.rejects(sourceFetch('https://public.org/file',{fetch:f}),{code:'SOURCE_DENIED'});assert.equal(calls,1);
});
test('native response length, filename and useful provenance preserve content without leaking query credentials',async()=>{
 const s=await sourceFetch('https://public.org/file',{fetch:async()=>new Response('decoded',{headers:{'content-encoding':'gzip','content-length':'100'}})});assert.equal(s.length,null);assert.equal(await new Response(s.body).text(),'decoded');
 const meta=sourceMetadata('https://public.org/photo?id=42&filename=image&token=PRIVATE&X-Amz-Signature=PRIVATE');assert.equal(meta.sourceUrl,'https://public.org/photo?id=42&filename=image');assert.equal(meta.sourceRedacted,'true');assert(!JSON.stringify(meta).includes('PRIVATE'));assert.equal(sourceMetadata('https://public.org/a').sourceRedacted,'false');assert(new TextEncoder().encode(JSON.stringify(sourceMetadata('https://public.org/'+ 'a'.repeat(2000)))).length<2048);
 assert.equal(responseFilename('雪','image/jpeg'),'雪.jpg');assert.equal(responseFilename('chosen.bin','image/png'),'chosen.bin');
});
test('extension-required Worker digest blocks old READY projection without deployment or source fetch',async()=>{
 let calls=0;const t=createRemoteTransport({expectedCodeDigest:'required-new-build',oauth:{authority:async()=>({accounts:[{id:'a'}]})},lookup:async()=>({codeDigest:'old'}),fetch:async()=>{calls++;}});const r=await t.status({accountId:'a'});assert.equal(r.code,'WORKER_UPGRADE_APPROVAL_REQUIRED');assert.equal(calls,0);
});

test('ordinary page context preserves media/link precedence and shares safe remote acquisition',async()=>{const {sourceFromClick,responseFilename}=await import('../right2cloud-module/src/source-fetch.mjs');assert.equal(sourceFromClick({pageUrl:'https://public.org/article'}).url,'https://public.org/article');assert.equal(sourceFromClick({pageUrl:'https://public.org/article',linkUrl:'https://public.org/a.pdf'}).filename,'a.pdf');assert.equal(sourceFromClick({pageUrl:'https://public.org/article',linkUrl:'https://public.org/a.pdf',srcUrl:'https://public.org/a.png'}).filename,'a.png');assert.equal(responseFilename('article','text/html'),'article.html');assert.throws(()=>sourceFromClick({pageUrl:'file:///private'}));});
