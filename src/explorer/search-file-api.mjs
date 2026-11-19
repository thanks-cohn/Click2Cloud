import {digest} from '../cloudflare/wire.mjs';
import {ancestors,normalizeTarget} from '../core/menu-identity.mjs';
import {createDirectoryInventoryStore} from './directory-inventory-store.mjs';
import {createDirectorySearch} from './directory-search.mjs';

const mutations=new Set(['mkdir','copy','move','rename','delete','createBucket','upload','remoteIngest']);
const parentPrefix=key=>key.replace(/\/$/,'').replace(/[^/]+$/,'');
const bucketScope=({provider,connectionId,accountId,bucketName})=>({provider,connectionId,accountId,bucketName});
const withAncestors=target=>['',...ancestors(target.prefix)].map(prefix=>({...target,prefix}));
const sameBucket=(scope,target)=>scope.provider===target.provider&&scope.connectionId===target.connectionId&&scope.accountId===target.accountId&&scope.bucketName===target.bucketName;
const includesDirectory=(scope,target)=>sameBucket(scope,target)&&(scope.prefix===undefined||
  (scope.recursive?target.prefix.startsWith(scope.prefix):target.prefix===scope.prefix));
const fail=code=>{throw Object.assign(Error(code),{code});};

export function fileMutationScopes(operation,input) {
  if(!mutations.has(operation))return [];
  const source=input.source&&normalizeTarget(input.source);
  if(operation==='createBucket')return [{provider:'cloudflare',connectionId:'cloudflare:'+input.accountId,accountId:input.accountId,bucketName:input.name}];
  if(operation==='mkdir')return withAncestors(source);
  if(operation==='upload')return withAncestors({...source,prefix:parentPrefix(input.key??source.prefix)});
  const destination=input.destination&&normalizeTarget(input.destination);
  if(operation==='remoteIngest')return withAncestors(destination);
  const affected=[];
  if(operation==='copy'||operation==='move')affected.push(...withAncestors(destination));
  for(const entry of input.entries??(input.entry?[input.entry]:[])){
    if(operation!=='copy'){
      affected.push(...withAncestors({...source,prefix:parentPrefix(entry.key)}));
      if(entry.folder)affected.push({...source,prefix:entry.key,recursive:true});
    }
    if(entry.folder&&(destination||operation==='rename')){
      const target=destination??{...source,prefix:parentPrefix(entry.key)};
      const leaf=operation==='rename'?input.newName??input.name:entry.key.replace(/\/$/,'').split('/').at(-1);
      if(leaf)affected.push({...target,prefix:target.prefix+leaf+'/',recursive:true});
    }
  }
  return [...new Map(affected.filter(Boolean).map(scope=>[JSON.stringify(scope),scope])).values()];
}

// The optional inventory is a read-through facade over the same provider File API.
// It owns no credential, CURRENT configuration, write dispatch, or receipt.
export function attachFilenameSearch(fileApi,{oauth,store=createDirectoryInventoryStore(),clock=Date.now,assertConnected=()=>{},readFilePage,onWrite=()=>{}}={}){
  const pending=new Map(),remotePending=new Map(),recentlySettled=new Set();
  const search=createDirectorySearch({store,clock,isPending:source=>[...pending.values()].some(scopes=>scopes.some(scope=>includesDirectory(scope,source))),
    async authorize(source){
      assertConnected();
      if(source.provider!=='cloudflare'||source.connectionId!=='cloudflare:'+source.accountId)fail('SCOPE_UNAUTHORIZED');
      const authority=await oauth.authority();
      assertConnected();
      if(!authority.sessionId||!authority.accounts?.some(account=>account.id===source.accountId))fail('AUTH_REQUIRED');
      const scopes=[...(authority.scopes??[])].sort();
      if(authority.scopeEvidence==='provider-returned'&&!scopes.includes('workers-r2-bucket-item.read')&&!scopes.includes('workers-r2.read'))fail('INSUFFICIENT_SCOPE');
      return digest([authority.sessionId,scopes,authority.scopeEvidence??null]);
    },
    async readPage(source,cursor,{signal}){
      const input={source,...(cursor?{cursor}:{})};
      const result=await (readFilePage??fileApi.run)('list',input,{signal});
      if(result.state!=='completed')fail(result.code??(/^[A-Z][A-Z0-9_]+$/.test(result.error??'')?result.error:'PROVIDER_READ_FAILED'));
      return result.data;
    }
  });

  async function invalidate(criteria,options){
    let timer;
    try{
      const update=search.invalidate(criteria,options);
      // A stalled optional database cannot hold a provider operation open.
      // The search owner retains the in-flight fence until the transaction settles.
      await Promise.race([update,new Promise(resolve=>{timer=setTimeout(resolve,250);})]);
    }catch{}finally{clearTimeout(timer);}
  }
  const invalidateAll=scopes=>invalidate(scopes);
  function beginWrite(scopes){
    if(!scopes.length)return null;
    const id=Symbol();
    pending.set(id,scopes);
    const ready=invalidateAll(scopes);
    return {ready,async finish(){
      try{await ready;await invalidateAll(scopes);}
      finally{pending.delete(id);}
    }};
  }
  function noteRemoteWrite(value){
    const d=value.destination;
    const {operationId,state}=value;
    if(!operationId||value.kind&&value.kind!=='save')return;
    const previous=remotePending.get(operationId);
    if(state!=='pending'&&previous){
      remotePending.delete(operationId);
      rememberSettled(operationId);
      return previous.finish();
    }
    if(!d||d.provider!=='cloudflare-r2'||d.connectionId!=='cloudflare:'+d.accountId)return;
    const scope={...bucketScope({...d,provider:'cloudflare'}),prefix:d.prefix?d.prefix.replace(/\/$/,'')+'/':''};
    if(state==='pending'){
      if(recentlySettled.has(operationId))return;
      const current=remotePending.get(operationId)??beginWrite(withAncestors(scope));
      remotePending.set(operationId,current);
      return current.ready;
    }
    rememberSettled(operationId);
    return invalidateAll(withAncestors(scope));
  }
  function rememberSettled(operationId){
    recentlySettled.add(operationId);
    while(recentlySettled.size>256)recentlySettled.delete(recentlySettled.values().next().value);
  }
  const readResult=async task=>{
    const id=crypto.randomUUID();
    try{return {id,state:'completed',data:await task()};}
    catch(error){
      return {id,state:error.name==='AbortError'?'cancelled':'failed',code:error.code??'PROVIDER_READ_FAILED'};
    }
  };
  return Object.freeze({...fileApi,capabilities:Object.freeze([...fileApi.capabilities,'searchDirectoryNames']),
    listDirectory({source,cursor=''},{signal,fresh=false}={}){
      return readResult(()=>search.listingPage(normalizeTarget(source),cursor,{signal,fresh}));
    },
    async run(operation,input={},options={}){
      if(operation==='searchDirectoryNames')return readResult(()=>search.search(input,options));
      if(!mutations.has(operation))return fileApi.run(operation,input,options);
      // Malformed mutation intent must still be handled by the existing File API.
      let write;
      try{
        const scopes=fileMutationScopes(operation,input);
        write=beginWrite(scopes);
        if(write)onWrite(scopes);
      }catch{}
      await write?.ready;
      try{return await fileApi.run(operation,input,options);}
      finally{await write?.finish();}
    },
    invalidateDirectorySearch:invalidate,
    noteRemoteWrite
  });
}
