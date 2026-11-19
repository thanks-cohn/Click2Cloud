import test from 'node:test';
import assert from 'node:assert/strict';
import {createDirectorySearch} from '../src/explorer/directory-search.mjs';
import {attachFilenameSearch,fileMutationScopes} from '../src/explorer/search-file-api.mjs';

const source={provider:'cloudflare',connectionId:'cloudflare:a',accountId:'a',bucketName:'origin',prefix:'docs/2026/'};
const destination={...source,bucketName:'backup',prefix:'archive/'};
const folder={key:'docs/2026/Projects/',folder:true};
const scopeNames=scopes=>scopes.map(scope=>scope.bucketName+'/'+scope.prefix+(scope.recursive?'*':'')).sort();
const unavailable=()=>{throw Object.assign(new Error(),{code:'INVENTORY_UNAVAILABLE'});};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};

test('filename cache invalidates affected parents, inferred ancestors and moved or deleted subtrees',()=>{
  const input={source,destination,entry:folder};
  assert.deepEqual(scopeNames(fileMutationScopes('mkdir',{source})),['origin/','origin/docs/','origin/docs/2026/']);
  assert.deepEqual(scopeNames(fileMutationScopes('upload',{source,key:'docs/2026/report.pdf'})),['origin/','origin/docs/','origin/docs/2026/']);
  assert.deepEqual(scopeNames(fileMutationScopes('copy',input)),['backup/','backup/archive/','backup/archive/Projects/*']);
  assert.deepEqual(scopeNames(fileMutationScopes('move',input)),['backup/','backup/archive/','backup/archive/Projects/*','origin/','origin/docs/','origin/docs/2026/','origin/docs/2026/Projects/*']);
  assert.deepEqual(scopeNames(fileMutationScopes('rename',{source,entry:folder,name:'Records'})),['origin/','origin/docs/','origin/docs/2026/','origin/docs/2026/Projects/*','origin/docs/2026/Records/*']);
  assert.deepEqual(scopeNames(fileMutationScopes('delete',{source,entry:folder})),['origin/','origin/docs/','origin/docs/2026/','origin/docs/2026/Projects/*']);
  assert.deepEqual(fileMutationScopes('createBucket',{accountId:'a',name:'new-bucket'}),[{provider:'cloudflare',connectionId:'cloudflare:a',accountId:'a',bucketName:'new-bucket'}]);
});

test('pending and uncertain mutations fence the affected inventory without interfering with the provider outcome',async()=>{
  const invalidations=[],dispatch=deferred(),release=deferred();
  const writes={capabilities:['list','mkdir'],async run(operation){
    assert.equal(operation,'mkdir');
    dispatch.resolve();
    await release.promise;
    return {state:'uncertain',code:'FILE_ACTION_UNCONFIRMED'};
  }};
  const api=attachFilenameSearch(writes,{
    oauth:{authority:async()=>({sessionId:'local-session',accounts:[{id:'a'}]})},
    store:{manifest:unavailable,invalidate:async scopes=>{invalidations.push(scopes);throw Error('Cache blocked');}},
    async readFilePage(_operation,{source}){return {state:'completed',data:{entries:[{key:source.prefix+'test.jpg',folder:false}],cursor:''}};}
  });
  const mutation=api.run('mkdir',{source,name:'New folder'});
  await dispatch.promise;
  try{
    const pending=await api.run('searchDirectoryNames',{source,query:'test'});
    assert.equal(pending.data.code,'SEARCH_PENDING_MUTATION');
    assert.equal(pending.data.complete,false);
    assert.equal(pending.data.stale,true);
    const unrelated=await api.run('searchDirectoryNames',{source:{...source,prefix:'other/'},query:'test'});
    assert.deepEqual(unrelated.data.entries.map(entry=>entry.key),['other/test.jpg']);
  }finally{release.resolve();}
  assert.equal((await mutation).state,'uncertain');
  assert.equal(invalidations.length,3); // Begin, search retry of the failed fence, and settle.
  assert.deepEqual(scopeNames(invalidations.at(-1)),['origin/','origin/docs/','origin/docs/2026/']);
  const readback=await api.run('searchDirectoryNames',{source,query:'test'});
  assert.equal(readback.data.source,'cloud');
  assert.deepEqual(readback.data.entries.map(entry=>entry.key),['docs/2026/test.jpg']);
});

test('cancellation during provider paging stops the subscriber and signals the outstanding R2 read',async()=>{
  const pending=deferred(),calls=[];
  const search=createDirectorySearch({store:{manifest:unavailable},authorize:async()=> 'authorized',
    async readPage(target,cursor,{signal}){
      calls.push(cursor);
      assert.deepEqual(target,source);
      if(!cursor)return {entries:[],cursor:'second'};
      pending.resolve(signal);
      await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
    }
  });
  const controller=new AbortController();
  const read=search.search({source,query:'test'},{signal:controller.signal});
  const providerSignal=await pending.promise;
  controller.abort();
  await assert.rejects(read,{name:'AbortError'});
  assert.equal(providerSignal.aborted,true);
  assert.deepEqual(calls,['','second']);
});

test('a changed OAuth authority cannot return a page or stale fallback',async()=>{
  let authority='original-session';
  const search=createDirectorySearch({store:{manifest:unavailable},authorize:async()=>authority,
    async readPage(){
      authority='replacement-session';
      return {entries:[{key:source.prefix+'test.jpg',folder:false}],cursor:''};
    }
  });
  await assert.rejects(search.search({source,query:'test'}),{code:'AUTH_SESSION_CHANGED'});
});

test('stalled IndexedDB invalidations do not hold a verified native save or file action open',{timeout:3000},async()=>{
  const api=attachFilenameSearch({capabilities:['mkdir'],run:async()=>({state:'completed'})},{
    store:{invalidate:()=>new Promise(()=>{})}
  });
  const target={...source,provider:'cloudflare-r2',prefix:'docs/2026'};
  await api.noteRemoteWrite({operationId:'save-123',state:'pending',destination:target});
  await api.noteRemoteWrite({operationId:'save-123',state:'verified',destination:target});
  assert.equal((await api.run('mkdir',{source,name:'activity'})).state,'completed');
});
