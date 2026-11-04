// No remote listener is created here. A trusted extension host supplies authority.
import { REASON_CODES } from './catalog.mjs';
const freeze = value => {
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;
};
const ERROR_CODES=new Set(['AUTH_REQUIRED','DIAGNOSTIC_GRANT_REQUIRED','EXPORT_GRANT_REQUIRED','INVALID_REQUEST','INVALID_VERSION','UNKNOWN_METHOD','GENERATION_UNAVAILABLE','SNAPSHOT_EXPIRED','CURSOR_INVALID','SCOPE_LIMIT','QUERY_FAILED','PAGE_TOO_LARGE']);
const numeric = x=>Number.isSafeInteger(x)&&x>=0;
const knownReason = value=>REASON_CODES.includes(value)?value:'UNKNOWN';
const shape = (input,allowed) => input&&typeof input==='object'&&!Array.isArray(input)&&Object.keys(input).every(k=>allowed.includes(k));
const safeBuild=b=>typeof b==='string'&&/^[a-f0-9]{7,40}$/.test(b)?b:'local-build';
const failure=code=>{throw Object.assign(new Error(code),{code});};

export function createDiagnosticAuthorizer({extensionId,allowedPaths=['/extension/workbench.html'],readSession,readGrant,clock=Date.now}={}) {
  return async (request,context={})=>{
    const sender=context.sender;let url;
    try {url=new URL(sender?.url);}catch{return false;}
    if(!extensionId||sender?.id!==extensionId||url.protocol!=='chrome-extension:'||url.hostname!==extensionId||!allowedPaths.includes(url.pathname))return false;
    const [session,grant]=await Promise.all([readSession?.(),readGrant?.()]);
    if(session?.authenticated!==true||grant?.debug!==true||!numeric(grant.expiresAt)||grant.expiresAt<=clock())return false;
    return {debug:true,export:grant.export===true,expiresAt:grant.expiresAt};
  };
}

/** Version 1 closed, read-only local interface. Private routes remain inside the host. */
export function createAgentDebugApi({diagnostics,getMenu=()=>null,getEvidence=()=>null,resolveAction=()=>({state:'blocked',code:'ACTION_UNAVAILABLE'}),diffMenus,authorize=()=>false,build='local-build',clock=Date.now,snapshotTtlMs=300000,maxSnapshots=8,maxExportBytes=65536}={}) {
  if(!diagnostics?.snapshot||!diagnostics?.manifest)throw TypeError('Diagnostic store required');
  const snapshots=new Map(), aliases=new Map(), reverseAliases=new Map();let serial=0,requestSerial=0;
  function alias(kind,value){if(value===null||value===undefined)return null;const key=kind+':'+String(value);if(!aliases.has(key)){if(aliases.size>=20000)failure('SCOPE_LIMIT');const a=kind+'-'+(aliases.size+1);aliases.set(key,a);reverseAliases.set(a,value);}return aliases.get(key);}
  function raw(value){return reverseAliases.get(value)??value;}
  function gap(code,extra={}){return {code,...extra};}
  function envelope(result,gaps=[],cursor=null){return freeze({schemaVersion:'1.0',requestId:++requestSerial,build:safeBuild(build),completeness:gaps.length||cursor?'partial':'complete',gaps,result,cursor});}
  function fail(code){return envelope({state:'blocked',code:ERROR_CODES.has(code)?code:'QUERY_FAILED'},[gap(ERROR_CODES.has(code)?code:'QUERY_FAILED')]);}
  function store(kind,scope,data){
    for(const [id,s]of snapshots)if(s.expiresAt<=clock())snapshots.delete(id);
    while(snapshots.size>=maxSnapshots)snapshots.delete(snapshots.keys().next().value);
    const id=++serial;snapshots.set(id,{kind,scope,data,expiresAt:clock()+snapshotTtlMs});return id;
  }
  function readCursor(cursor,kind,scope){
    if(typeof cursor!=='string'||!/^\d+:\d+$/.test(cursor))failure('CURSOR_INVALID');
    const [id,offset]=cursor.split(':').map(Number),s=snapshots.get(id);
    if(!s||s.expiresAt<=clock())failure('SNAPSHOT_EXPIRED');
    if(s.kind!==kind||s.scope!==scope)failure('CURSOR_INVALID');return {id,offset,data:s.data};
  }
  function page(kind,scope,input,create){
    const limit=input.limit===undefined?64:input.limit;if(!numeric(limit)||limit<1||limit>256)failure('INVALID_REQUEST');
    const read=input.cursor?readCursor(input.cursor,kind,scope):null;
    let data=read?read.data:create();
    if(!read&&data.gaps.length>64){
      const allGaps=data.gaps;
      data={...data,rows:[...data.rows,...allGaps.map(value=>({kind:'gap',...value}))],summary:{...data.summary,totalGapCount:allGaps.length,gapRowsPaginated:true},gaps:[...allGaps.slice(0,64),{code:'ADDITIONAL_GAPS_PAGINATED',total:allGaps.length,availableAs:'kind:gap rows'}]};
    }
    const id=read?read.id:store(kind,scope,data),offset=read?read.offset:0;
    if(offset>data.rows.length)failure('CURSOR_INVALID');
    const rows=data.rows.slice(offset,offset+limit),cursor=offset+rows.length<data.rows.length?`${id}:${offset+rows.length}`:null;
    return envelope({...data.summary,rows,total:data.rows.length,offset,snapshotId:id},data.gaps,cursor);
  }
  function safeMenu(spec,evidence) {
    const desired=numeric(spec.generation)?spec.generation:null;
    const generatedGeneration=evidence?.generated?.generation??null;
    const ack=evidence?.acknowledgedGeneration??evidence?.appliedGeneration??null;
    const gaps=[];
    if(generatedGeneration===null)gaps.push(gap('GENERATED_PLAN_UNKNOWN'));
    else if(generatedGeneration!==desired)gaps.push(gap('GENERATED_GENERATION_MISMATCH',{desiredGeneration:desired,generatedGeneration}));
    const generatedRows=new Map((evidence?.generated?.rows||[]).map(row=>[row.itemId??row.id,row]));
    const ackRows=new Map((evidence?.acknowledgements||[]).filter(row=>row.itemId).map(row=>[row.itemId,row]));
    const rows=(spec.rows||spec.nodes||[]).map(row=>{
      const id=row.id??row.itemId, planned=generatedRows.get(id),ackRow=ackRows.get(id),changed=[];
      if(planned){const props=planned.properties||planned;
        for(const [field,wanted,actual]of [['parentId',row.parentId??row.parent??null,props.parentId??null],['label',row.label??row.title,props.title],['type',row.type,props.type],['enabled',row.enabled!==false,props.enabled!==false],['visible',row.visible!==false,props.visible!==false]])if(wanted!==actual&&!(field==='label'&&row.type==='separator'))changed.push(field);
        if(JSON.stringify(row.contexts)!==JSON.stringify(props.contexts))changed.push('contexts');
        if((row.actionId??null)!==(planned.actionId??null))changed.push('actionId');
      }
      if(generatedGeneration===desired&&!planned)gaps.push(gap('GENERATED_ITEM_MISSING',{itemId:alias('item',id)}));
      if(changed.length)gaps.push(gap('GENERATED_ITEM_MISMATCH',{itemId:alias('item',id),fields:changed}));
      if(!ackRow)gaps.push(gap('NATIVE_ITEM_ACK_UNKNOWN',{itemId:alias('item',id)}));
      else {
        if(ackRow.state!=='acknowledged')gaps.push(gap(ackRow.state==='failed'?'NATIVE_ITEM_ACK_FAILED':ackRow.state==='uncertain'?'NATIVE_ITEM_ACK_UNCERTAIN':ackRow.state==='blocked'?'NATIVE_ITEM_ACK_BLOCKED':'NATIVE_ITEM_ACK_UNKNOWN',{itemId:alias('item',id),reason:knownReason(ackRow.code)}));
        if(!numeric(ackRow.generation)||!numeric(ackRow.epoch))gaps.push(gap('NATIVE_ITEM_ACK_PROVENANCE_UNKNOWN',{itemId:alias('item',id)}));
        else {if(ackRow.generation!==desired)gaps.push(gap('NATIVE_ITEM_ACK_STALE_GENERATION',{itemId:alias('item',id)}));if(numeric(evidence?.epoch)&&ackRow.epoch!==evidence.epoch)gaps.push(gap('NATIVE_ITEM_ACK_STALE_EPOCH',{itemId:alias('item',id)}));}
      }

      return {id:alias('item',id),parentId:alias('item',row.parentId??row.parent),siblingIndex:numeric(row.siblingIndex??row.index)?(row.siblingIndex??row.index):0,type:row.type==='separator'?'separator':'normal',label:row.role==='separator'?'':'Private label '+alias('label',row.label??row.title??id),contexts:(row.contexts||[]).filter(x=>['all','page','frame','selection','link','editable','image','video','audio','launcher','browser_action','page_action','action','tab'].includes(x)),enabled:row.enabled!==false,visible:row.visible!==false,role:['branch','save','separator','navigation'].includes(row.role)?row.role:'unknown',origin:{mode:['simple','nested','depth'].includes(row.origin?.mode)?row.origin.mode:'provider',provider:alias('provider',row.origin?.provider)},reason:knownReason(row.reason),actionId:alias('action',row.actionId),targetAlias:row.target?alias('target',row.actionId??id):null,native:{generated:generatedGeneration===desired&&!!planned,acknowledgement:ackRow?{state:['acknowledged','blocked','failed','uncertain'].includes(ackRow.state)?ackRow.state:'unknown',code:knownReason(ackRow.code)}:{state:'unknown',code:'NATIVE_ACK_UNKNOWN'},changed}};
    });
    const desiredIds=new Set((spec.rows||spec.nodes||[]).map(row=>row.id??row.itemId));
    const extras=(evidence?.generated?.rows||[]).filter(row=>!desiredIds.has(row.itemId??row.id)).map(row=>{
      const props=row.properties||row,id=alias('item',row.itemId??row.id);
      gaps.push(gap('GENERATED_ITEM_EXTRA',{itemId:id}));
      return {kind:'generated-extra',id,parentId:alias('item',props.parentId??row.parentId),type:props.type==='separator'?'separator':'normal',label:props.type==='separator'?'':'Private label '+alias('label',props.title),actionId:alias('action',row.actionId),native:{generation:generatedGeneration,evidenceClass:'generated'}};
    });
    const duplicateOmissions=new Map();
    const omissions=(spec.omissions||[]).map((row,index)=>{
      const target=row.target;
      const candidateKey=target?JSON.stringify([target.provider,target.connectionId,target.accountId,target.bucketName??target.container,target.prefix??target.path]):String(row.candidate??row.id??'unknown-'+index);
      const placement=String(row.placement??row.parentId??row.itemId??row.kind??'');
      const key=candidateKey+':'+placement,duplicate=duplicateOmissions.get(key)||0;duplicateOmissions.set(key,duplicate+1);
      return {id:alias('omission',key+':'+duplicate),kind:'omission',candidate:alias('candidate',candidateKey),code:knownReason(row.code??row.reason),origin:['simple','nested','depth'].includes(row.origin?.mode)?row.origin.mode:'unknown'};
    });
    if(spec.coverage?.complete===false||spec.coverage?.inventoryComplete===false)gaps.push(gap('INVENTORY_PARTIAL'));
    if(spec.coverage?.omissionsDropped)gaps.push(gap('OMISSIONS_DROPPED',{count:spec.coverage.omissionsDropped}));
    if(spec.coverage?.rowsDropped)gaps.push(gap('MENU_ROWS_DROPPED',{count:spec.coverage.rowsDropped}));
    if(ack===null)gaps.push(gap('NATIVE_ACK_UNKNOWN'));
    else if(ack!==desired)gaps.push(gap('STALE_GENERATION',{desiredGeneration:desired,acknowledgedGeneration:ack}));
    if(!evidence?.observed)gaps.push(gap('INSTALLED_CHROME_NOT_OBSERVED'));
    else {if(evidence.observed.complete!==true)gaps.push(gap('NATIVE_OBSERVATION_PARTIAL'));if(evidence.observed.rendering!==true)gaps.push(gap('NATIVE_RENDERING_NOT_OBSERVED'));if(evidence.observed.generation!==desired)gaps.push(gap('OBSERVED_GENERATION_MISMATCH'));}
    return {rows:[...rows,...omissions,...extras],gaps,summary:{generation:desired,mode:['simple','nested','depth'].includes(spec.mode)?spec.mode:'unknown',revision:numeric(spec.revision)?spec.revision:null,inventoryRevision:numeric(spec.inventoryRevision)?spec.inventoryRevision:null,evidence:{desired:{generation:desired,state:'model'},generated:{generation:generatedGeneration,state:generatedGeneration===null?'unknown':generatedGeneration===desired?'generated':'mismatch'},acknowledged:{generation:ack,state:ack===null?'unknown':ack===desired?'acknowledged':'stale'},observed:{state:evidence?.observed?'reported-observation':'unknown',complete:evidence?.observed?.complete===true,rendering:evidence?.observed?.rendering===true}},redaction:'Private labels, routes, provider and target identities replaced with scoped aliases.'}};
  }
  function safeTrace(snapshot){
    return {rows:[...snapshot.events.map(e=>({kind:'signal',...e})),...snapshot.candidates.map(c=>({kind:'candidate',...c})),...snapshot.edges.map(e=>({kind:'edge',...e}))],gaps:snapshot.gaps,summary:{scope:snapshot.scope,status:snapshot.status,stats:snapshot.stats,coverage:diagnostics.manifest().map(({stage,source,tests,coverage,boundaryLimit})=>({stage,source,tests,coverage,boundaryLimit})),evidenceClass:'local-boundary-observation',redaction:'Only source-owned enums and numeric correlation identities are captured.'}};
  }
  const schemas={
    describeEngine:['version'],inspectMenu:['version','generation','itemId','cursor','limit'],
    inspectOperation:['version','operationId','view','cursor','limit'],getDiagnosticSnapshot:['version','operationId','cursor','limit'],
    simulateMenuAction:['version','generation','itemId','actionId','fixtureContext'],diffMenuGenerations:['version','generation','compareTo','cursor','limit'],
    exportReceipt:['version','operationId','cursor','limit']
  };
  async function request(method,input={},context={}) {
    try {
      if(!schemas[method])failure('UNKNOWN_METHOD');
      if(!shape(input,schemas[method]))failure('INVALID_REQUEST');
      if(input.version!==undefined&&input.version!==1&&input.version!=='1.0')failure('INVALID_VERSION');
      const grant=await authorize({method,input},context);
      if(grant!==true&&grant?.debug!==true)failure('DIAGNOSTIC_GRANT_REQUIRED');
      if(grant?.expiresAt!==undefined&&grant.expiresAt<=clock())failure('DIAGNOSTIC_GRANT_REQUIRED');
      if(method==='exportReceipt'&&grant?.export!==true)failure('EXPORT_GRANT_REQUIRED');
      if(method==='describeEngine'){
        const snapshot=diagnostics.snapshot();
        return envelope({modules:diagnostics.manifest().map(({stage,source,tests,coverage,boundaryLimit})=>({stage,source,tests,coverage,boundaryLimit})),stats:snapshot.stats,status:snapshot.status,capabilities:['inspectMenu','inspectOperation','getDiagnosticSnapshot','simulateMenuAction','diffMenuGenerations','exportReceipt'],executionAuthority:false},snapshot.gaps);
      }
      if(method==='inspectMenu'){
        if(!numeric(input.generation))failure('INVALID_REQUEST');
        return page(method,String(input.generation)+':'+(input.itemId??''),input,()=>{
          const spec=getMenu(input.generation);if(!spec)failure('GENERATION_UNAVAILABLE');
          const data=safeMenu(spec,getEvidence(input.generation));
          if(input.itemId){const wanted=raw(input.itemId);const row=(spec.rows||spec.nodes||[]).find(x=>(x.id??x.itemId)===wanted);if(!row)failure('INVALID_REQUEST');
            const ids=new Set([row.id??row.itemId]);let grew=true;while(grew){grew=false;for(const child of spec.rows||spec.nodes||[])if(ids.has(child.parentId??child.parent)&&!ids.has(child.id??child.itemId)){ids.add(child.id??child.itemId);grew=true;}}
            data.rows=data.rows.filter(x=>ids.has(raw(x.id)));
          }return data;
        });
      }
      if(['inspectOperation','getDiagnosticSnapshot','exportReceipt'].includes(method)){
        if(input.operationId!==undefined&&!numeric(input.operationId))failure('INVALID_REQUEST');
        if(method==='inspectOperation'&&(input.operationId===undefined||!['timeline','graph',undefined].includes(input.view)))failure('INVALID_REQUEST');
        let result=page(method,String(input.operationId??'all')+':'+(input.view??''),input,()=>safeTrace(diagnostics.snapshot({operationId:input.operationId})));
        if(method==='exportReceipt'){
          const exported={...result,export:{authorized:true,bytes:0,maxBytes:maxExportBytes,transmission:'none; local user handoff only'}};
          for(let i=0;i<3;i++)exported.export.bytes=new TextEncoder().encode(JSON.stringify(exported)).length;
          if(exported.export.bytes>maxExportBytes)failure('PAGE_TOO_LARGE');
          result=freeze(exported);
        }return result;
      }
      if(method==='simulateMenuAction'){
        if(!numeric(input.generation)||(!input.itemId&&!input.actionId)||!shape(input.fixtureContext||{},['context','acknowledgedGeneration','authorizedTargets','authorized','authorizedTargetAliases']))failure('INVALID_REQUEST');
        const spec=getMenu(input.generation);if(!spec)failure('GENERATION_UNAVAILABLE');
        let itemId=raw(input.itemId);
        if(!itemId){const action=raw(input.actionId);itemId=(spec.rows||spec.nodes||[]).find(x=>x.actionId===action)?.id;}
        const fixture=input.fixtureContext||{},evidence=getEvidence(input.generation);
        const selected=(spec.rows||spec.nodes||[]).find(row=>(row.id??row.itemId)===itemId);
        let authorizedTargets=fixture.authorizedTargets;
        if(fixture.authorized===true&&selected?.target)authorizedTargets=[selected.target];
        if(Array.isArray(fixture.authorizedTargetAliases)&&selected?.target&&fixture.authorizedTargetAliases.includes(alias('target',selected.actionId??selected.id)))authorizedTargets=[selected.target];
        const result=resolveAction(spec,{itemId,generation:input.generation,acknowledgedGeneration:fixture.acknowledgedGeneration??evidence?.acknowledgedGeneration??evidence?.appliedGeneration,context:fixture.context||'image',authorizedTargets});
        return envelope({simulation:true,state:result.state,code:knownReason(result.code),generation:input.generation,itemId:alias('item',itemId),actionId:alias('action',result.action?.actionId),targetAlias:result.action?alias('target',result.action.actionId):null,authority:'fixture only; live authorization must be checked separately',effects:{capture:0,providerWrites:0,historyWrites:0,successEffects:0}},[{code:'LIVE_AUTHORITY_NOT_PROBED'}]);
      }
      if(method==='diffMenuGenerations'){
        if(!numeric(input.generation)||!numeric(input.compareTo))failure('INVALID_REQUEST');
        return page(method,input.compareTo+':'+input.generation,input,()=>{
          const previous=getMenu(input.compareTo),next=getMenu(input.generation);if(!previous||!next)failure('GENERATION_UNAVAILABLE');
          const before=safeMenu(previous,getEvidence(input.compareTo)),after=safeMenu(next,getEvidence(input.generation));
          const a=new Map(before.rows.filter(x=>x.id).map(x=>[x.id,x])),b=new Map(after.rows.filter(x=>x.id).map(x=>[x.id,x]));
          const rows=[];for(const [id,row]of a){if(!b.has(id))rows.push({kind:'removed',itemId:id,owner:row.origin});else {const updated=b.get(id);const fields=Object.keys(row).filter(k=>JSON.stringify(row[k])!==JSON.stringify(updated[k]));if(fields.length)rows.push({kind:'changed',itemId:id,fields,owner:updated.origin,before:row,after:updated});}}
          for(const [id,row]of b)if(!a.has(id))rows.push({kind:'added',itemId:id,owner:row.origin,after:row});
          return {rows,gaps:[...before.gaps,...after.gaps],summary:{from:input.compareTo,to:input.generation,evidenceClass:'logical-model-diff',status:rows.length?'CHANGED':'UNCHANGED'}};
        });
      }
      failure('UNKNOWN_METHOD');
    } catch(error){return fail(error?.code);}
  }
  return Object.freeze({request,...Object.fromEntries(Object.keys(schemas).map(method=>[method,(input={},context={})=>request(method,input,context)]))});
}
