// Read-only, resumable discovery over the extracted REDOWN Universal File API.
// No provisioning or write authorization is inferred from folder observations.
import {normalizePrefix,ancestors} from '../core/menu-identity.mjs';
import {operationIdentity} from '../core/boundary-observation.mjs';
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
const emit = (sink, event) => { try { (typeof sink === 'function' ? sink : sink?.emit)?.(event); } catch {} };
const identity = t => JSON.stringify([t.provider,t.connectionId,t.accountId,t.bucketName]);
const normalizePath = path => normalizePrefix(path).replace(/\/$/,'');

export function createInventoryDiscovery({fileApi,sink,clock=()=>Date.now(),maxFolders=10000}={}) {
  if (typeof fileApi?.run !== 'function') throw TypeError('An authenticated Universal File API is required');
  if (!Number.isSafeInteger(maxFolders) || maxFolders < 1) throw TypeError('Invalid folder budget');
  let revision=0, scan=null, busy=false;
  function snapshot() {
    return freeze({schemaVersion:1,revision,scopes:(scan?.scopes??[]).map(s=>({
      ...s.target,folders:[...s.folders].sort(),complete:!s.prefix&&s.frontier.length===0&&!s.error,
      coveragePrefix:s.prefix?s.prefix+'/':'',requestedComplete:s.frontier.length===0&&!s.error,
      observedAt:s.observedAt,authorized:false,workerReady:false,
      // These remain runtime authority checks, never properties granted by listing.
      authorizationEvidence:'unknown',workerEvidence:'unknown',
      scanState:s.error?'partial':s.frontier.length?'pending':'completed',
      reason:s.error??(s.frontier.length?'INVENTORY_PARTIAL':s.prefix?'INVENTORY_SCOPED_COMPLETE':'INVENTORY_COMPLETE'),
      remainingBranches:s.frontier.length
    })),complete:Boolean(scan)&&scan.scopes.every(s=>!s.prefix&&!s.frontier.length&&!s.error),requestedComplete:Boolean(scan)&&scan.scopes.every(s=>!s.frontier.length&&!s.error)});
  }
  function begin(targets) {
    if (busy) throw Object.assign(Error('Discovery is running'),{code:'SCAN_BUSY'});
    if (!Array.isArray(targets)||targets.length>100) throw TypeError('Invalid discovery scopes');
    const seen=new Set();
    const scopes=targets.map(t=>{
      if (![t.provider,t.connectionId,t.accountId,t.bucketName].every(v=>typeof v==='string'&&v.length>0)) throw TypeError('Exact target identity required');
      const target={provider:t.provider,connectionId:t.connectionId,accountId:t.accountId,bucketName:t.bucketName};
      if (seen.has(identity(target))) throw TypeError('Duplicate discovery scope');
      seen.add(identity(target));
      const prefix=normalizePath(t.prefix??'');
      return {target,prefix,folders:new Set(prefix?[prefix]:[]),frontier:[{prefix,cursor:'',seen:new Set()}],observedAt:0,error:null};
    });
    scan={scopes,next:0}; revision++; return snapshot();
  }
  async function resume({pageBudget=16,signal,operationId=0}={}) {
    operationId=operationIdentity({operationId});
    if (!scan) throw Error('Begin a discovery scan first');
    if (busy) {emit(sink,{stage:'inventory.scan',outcome:'blocked',code:'SCAN_BUSY',operationId,revision});return {state:'blocked',code:'SCAN_BUSY',snapshot:snapshot()};}
    if (!Number.isSafeInteger(pageBudget)||pageBudget<1||pageBudget>1000) throw TypeError('Invalid page budget');
    busy=true;
    try {
      for(let page=0;page<pageBudget;page++) {
        if (signal?.aborted) { emit(sink,{stage:'inventory.scan',outcome:'cancelled',code:'CANCELLED',operationId,revision}); return {state:'cancelled',snapshot:snapshot()}; }
        // Round-robin scopes; one failed bucket cannot hide its healthy siblings.
        let s;
        for(let n=0;n<scan.scopes.length;n++) {
          const candidate=scan.scopes[scan.next++%scan.scopes.length];
          if (!candidate.error&&candidate.frontier.length) {s=candidate;break;}
        }
        if(!s) break;
        const node=s.frontier[0];
        emit(sink,{stage:'inventory.page',outcome:'started',code:'INVENTORY_PAGE_STARTED',operationId,revision});
        let result;
        try { result=await fileApi.run('list',{source:{accountId:s.target.accountId,bucketName:s.target.bucketName,prefix:node.prefix?node.prefix+'/':''},cursor:node.cursor},{signal}); }
        catch { result={state:'failed',code:'TRANSPORT_FAILED'}; }
        // Every observed page/error can change the snapshot, including a partially
        // ingested page that later fails validation. Fence all such changes.
        revision++;
        if(result?.state!=='completed' || !Array.isArray(result.data?.entries)) {
          s.error=result?.state==='uncertain'?'INVENTORY_UNCERTAIN':result?.state==='cancelled'?'INVENTORY_CANCELLED':'INVENTORY_PAGE_FAILED';
          emit(sink,{stage:'inventory.page',outcome:result?.state==='cancelled'?'cancelled':'failed',code:s.error,operationId,revision}); continue;
        }
        try {
          for(const entry of result.data.entries) {
            if(!entry.folder) continue;
            const path=normalizePath(entry.key);
            if(path===node.prefix)continue; // A current-folder marker is evidence, not a child.
            if(!path || (node.prefix && !path.startsWith(node.prefix+'/')) || (!node.prefix&&path.startsWith('/'))) throw Error('Invalid provider path');
            // Providers may expose a descendant before an explicit ancestor marker.
            // Scan natural ancestors too; otherwise their unseen siblings could be lost.
            for(const ancestor of ancestors(path).map(p=>p.replace(/\/$/,''))) {
              if(s.prefix&&ancestor!==s.prefix&&!ancestor.startsWith(s.prefix+'/'))continue;
              if(!s.folders.has(ancestor)) {
                if(s.folders.size>=maxFolders) throw Object.assign(Error('Folder budget reached'),{code:'INVENTORY_BUDGET'});
                s.folders.add(ancestor);s.frontier.push({prefix:ancestor,cursor:'',seen:new Set()});
              }
            }
          }
          const cursor=result.data.cursor??'';
          if(typeof cursor!=='string') throw Error('Invalid cursor');
          if(cursor) {
            if(cursor===node.cursor||node.seen.has(cursor)) throw Object.assign(Error('Repeated cursor'),{code:'CURSOR_REPEATED'});
            node.seen.add(cursor);node.cursor=cursor;
          } else s.frontier.shift();
          s.observedAt=clock();
          emit(sink,{stage:'inventory.page',outcome:'ok',code:cursor?'INVENTORY_PARTIAL':'INVENTORY_PAGE_COMPLETE',operationId,revision});
        } catch(error) {
          s.error=error.code==='CURSOR_REPEATED'?'CURSOR_REPEATED':error.code==='INVENTORY_BUDGET'?'INVENTORY_BUDGET':'INVENTORY_INVALID_PATH';
          emit(sink,{stage:'inventory.page',outcome:'failed',code:s.error,operationId,revision});
        }
      }
      const value=snapshot();
      emit(sink,{stage:'inventory.scan',outcome:value.complete?'ok':'partial',code:value.complete?'INVENTORY_COMPLETE':'INVENTORY_PARTIAL',operationId,revision});
      return {state:value.complete?'completed':'partial',snapshot:value};
    } finally {busy=false;}
  }
  return Object.freeze({begin,resume,snapshot});
}
