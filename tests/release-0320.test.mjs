import test from 'node:test';
import assert from 'node:assert/strict';
import {createEngineApi,toolRegistry,validate} from '../src/api/service.mjs';
import {createAgentClient} from '../src/api/client.mjs';
import {createAgentGateway} from '../src/api/gateway.mjs';
import {createShortcutStore,listCommands,normalizeChord,resolveBindings,shortcutStorageKey} from '../src/api/shortcuts.mjs';
import {applyConfigChanges,productState} from '../src/api/config.mjs';
import {createDailyBadge,countVerifiedSaves,nextLocalMidnight} from '../src/chrome/daily-badge.mjs';
import {developmentalDomain,directoryUrlFiles,simpleDirectoryUrls,formatUrlExport,listExportInventory,metadataBudget,normalizedTags,objectUrls,verifiedDomains} from '../src/explorer/object-exports.mjs';
import {downloadJob,embedPngTags,streamDownloadArchive} from '../src/explorer/download-archive.mjs';
import {describeExplorerContextMenu} from '../src/api/explorer-context-menu.mjs';
import {cycleDivider,normalizeDividerMode} from '../src/explorer/layout.mjs';

const source={provider:'cloudflare',accountId:'fixture',connectionId:'cloudflare:fixture',bucketName:'test-bucket',prefix:'images/'};
const file={key:'images/pic, café.png',etag:'v1',size:3};
const storage=()=>{
  const values={};
  return {values,get:async key=>({[key]:values[key]}),set:async update=>Object.assign(values,structuredClone(update))};
};
const active=domain=>({domain,enabled:true,status:{ownership:'active',ssl:'active'}});
function createFixture(readManagedDomain) {
  const preferences=storage(), calls=[], commands=listCommands(toolRegistry);
  let options={urls:false,tags:false,metadata:false};
  const api=createEngineApi({engine:{},
    current:{read:async()=>{throw Error('CURRENT_MUST_NOT_LOAD');}}, authorize:async ({actor,params})=>actor==='fixture'&&(!params.source||params.source.accountId===source.accountId),
    shortcutStore:createShortcutStore(preferences,commands),
    oauth:{status:async()=>({state:'CONNECTED',accounts:[{id:source.accountId}]})},
    readExportOptions:async()=>options,
    readManagedDomain,
    readCustomDomains:async()=>[active('cdn.example'),active('images.example'),{...active('inactive.example'),enabled:false}],
    fileApi:{run:async(operation,input)=>{
      calls.push({operation,input});
      if(operation==='listRaw')return {state:'completed',data:{entries:input.cursor?[]:[file],cursor:input.cursor?'':'next'}};
      if(operation==='stat')return {state:'completed',data:{object:{...file,customMetadata:{'click2cloud-tags':'["café"]',access_token:'fixture-private'}}}};
      assert.fail('Unexpected operation '+operation);
    }}
  });
  const gateway=createAgentGateway({api}), handle=gateway.grant({actor:'fixture',methods:toolRegistry.map(tool=>tool.name),expiresAt:Date.now()+60000});
  return {calls,client:createAgentClient({gateway,handle,authenticatedActor:'fixture'}),enable:()=>{options={urls:true,tags:true,metadata:true};}};
}
test('canonical shortcut methods advertise UI and API commands and reject invalid or collided keys', async()=>{
  const {client}=createFixture(), invoke=client.invoke;
  const commands=(await invoke('listCommands')).data.commands;
  assert.equal(commands.filter(command=>command.kind==='ui').length,2);
  assert.equal(commands.find(command=>command.kind==='api').method,'refreshExplorer');
  const id='explorer.focusSearch';
  assert.equal((await invoke('getShortcutBindings')).data.bindings[id],'Ctrl+Shift+F7');
  assert.equal((await invoke('setShortcutBinding',{commandId:id,chord:'Shift+Control+F4'})).data.bindings[id],'Ctrl+Shift+F4');
  assert.equal((await invoke('setShortcutBinding',{commandId:id,chord:'Ctrl+Shift+F9'})).code,'SHORTCUT_COLLISION');
  assert.equal((await invoke('setShortcutBinding',{commandId:id,chord:'Ctrl+Shift+T'})).code,'SHORTCUT_INVALID_OR_RESERVED');
  assert.equal((await invoke('setShortcutBinding',{commandId:id,chord:null})).data.bindings[id],null);
  assert.equal((await invoke('resetShortcutBindings')).data.bindings[id],'Ctrl+Shift+F7');
  assert.equal(normalizeChord('A'),null);
});
test('The divider cycles through both true extremes in each mode and releases the retired F8 command',()=>{
  for(const [mode,sequence] of [['alternate',[0,50,100,50]],['left',[0,50]],['right',[100,50]]]){
    let position=50,nextExtreme=0;
    for(let press=0;press<12;press++){
      ({position,nextExtreme}=cycleDivider(position,mode,nextExtreme));
      assert.equal(position,sequence[press%sequence.length]);
    }
    assert.deepEqual(cycleDivider(36,mode,nextExtreme),{position:50,nextExtreme:0});
  }
  assert.equal(normalizeDividerMode('unknown'),'alternate');
  const commands=listCommands(toolRegistry),historical={version:1,overrides:{
    'explorer.toggleToolbarRows':'Ctrl+Shift+F8','explorer.focusSearch':'Ctrl+Shift+F4'}};
  const bindings=resolveBindings(commands,historical);
  assert.equal(bindings['explorer.toggleToolbarRows'],undefined);
  assert.equal(bindings['explorer.focusSearch'],'Ctrl+Shift+F4');
  assert.equal(normalizeChord('Ctrl+Shift+F8'),'Ctrl+Shift+F8');
});
test('shortcut storage serializes concurrent changes and keeps prior bindings on failure',async()=>{
  const preferences=storage(),catalog=listCommands(toolRegistry),store=createShortcutStore(preferences,catalog);
  const id='explorer.resetPanelSplit', other='explorer.focusSearch';
  await store.set(id,'Ctrl+Shift+F4');
  await Promise.all([store.set(other,'Ctrl+Shift+F3'),store.set('file.refreshExplorer','Ctrl+Shift+F2')]);
  assert.equal((await createShortcutStore(preferences,catalog).read())[id],'Ctrl+Shift+F4');
  assert.equal(resolveBindings(catalog,{version:1,overrides:{[id]:'B'}})[id],'Ctrl+Shift+F9');
  const snapshot=structuredClone(preferences.values[shortcutStorageKey]);
  preferences.set=async()=>{throw Error('STORAGE_FAILURE');};
  await assert.rejects(store.set(id,'Ctrl+Shift+F1'));
  assert.deepEqual(preferences.values[shortcutStorageKey],snapshot);
});
test('Explorer Make Default adds an exact Simple row once and preserves established choices',()=>{
  const configs={simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}};
  const previous={...source,prefix:'old/'};
  const state={product:productState({defaultTarget:previous}),configs};
  const change={type:'makeDefault',ensureSimple:true,target:source};
  const schema=toolRegistry.find(tool=>tool.name==='commitConfigChange').inputSchema;
  validate(schema,{changes:[change],expectedRevision:0,idempotencyKey:'fixture'});
  const after=applyConfigChanges(state,[change]);
  assert.deepEqual(after.product.defaultTarget,source);
  assert.deepEqual(after.configs.simple.destinations[0].target,source);
  assert.equal(applyConfigChanges(after,[change]).configs.simple.destinations.length,1);
  assert.deepEqual(state.product.defaultTarget,previous);
});
test('badge counts verified receipt identities at completion and rolls over in the configured timezone',async()=>{
  let now=Date.parse('2026-11-02T05:59:59Z'), listener, alarm, text, unavailable=false;
  const timezone='America/Chicago', local=storage();
  const verified={kind:'save',operationId:'one',state:'verified',at:now-20000,updatedAt:now,proofKind:'independent-head-version-size',receipt:{key:'file'}};
  const rows=[verified,verified,{...verified,kind:'readiness',operationId:'probe'},{...verified,state:'partial',operationId:'two'}];
  assert.equal(countVerifiedSaves(rows,now,timezone),1);
  assert.equal(nextLocalMidnight(now,timezone),Date.parse('2026-11-02T06:00:00Z'));
  const badge=createDailyBadge({chrome:{storage:{local},action:{setBadgeText:async value=>{text=value.text;},setBadgeBackgroundColor:async()=>{}},
    alarms:{onAlarm:{addListener:fn=>{listener=fn;}},create:async(name,value)=>{alarm={name,...value};}}},
    clock:()=>now,readPreferences:async()=>({timezone}),readHistory:async()=>{if(unavailable)throw Error('IDB');return rows;}});
  await badge.refresh();assert.equal(text,'1');
  const jobId='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  await Promise.all([badge.recordLocal(jobId,999),badge.recordLocal(jobId,999)]);assert.equal(text,'1k+');
  now=alarm.when;listener(alarm);await badge.refresh();assert.equal(text,'0');
  await badge.recordLocal(jobId,999);assert.equal(text,'0');
  unavailable=true;await badge.refresh();assert.equal(text,'!');assert.equal(alarm.when,now+60000);
  unavailable=false;await badge.refresh();assert.equal(text,'0');
});
test('trusted file API enforces flags, account scope, exact object and active custom domains',async()=>{
  const {client,calls,enable}=createFixture();
  assert.equal((await client.invoke('getPublicUrls',{source})).code,'PUBLIC_URL_EXPERIMENT_DISABLED');
  assert.equal((await client.invoke('getExportObjectMetadata',{source,key:file.key})).code,'EXPORT_METADATA_EXPERIMENT_DISABLED');
  enable();
  assert.equal((await client.invoke('getPublicUrls',{source:{...source,accountId:'foreign'}})).code,'PERMISSION_DENIED');
  assert.equal((await client.invoke('getPublicUrls',{source,key:'different/pic.png'})).code,'SOURCE_SCOPE_MISMATCH');
  assert.equal((await client.invoke('getPublicUrls',{source,domains:['inactive.example']})).code,'DOMAIN_NOT_VERIFIED');
  const links=(await client.invoke('getPublicUrls',{source,key:file.key})).data.file;
  assert.equal(links.urls.length,2);
  assert.match(links.urls[0].url,/pic%2C%20caf%C3%A9\.png$/);
  const metadata=(await client.invoke('getExportObjectMetadata',{source,key:file.key})).data;
  assert.deepEqual(metadata.tags,['café']);
  assert(!JSON.stringify(metadata).includes('fixture-private'));
  const inventory=await listExportInventory(async(source,cursor)=>(await client.invoke('listDirectoryObjects',{source,...(cursor?{cursor}:{})})).data,source);
  assert.equal(inventory.pages,2);assert.equal(inventory.files.length,1);assert(inventory.complete);
  assert(calls.every(call=>['listRaw','stat'].includes(call.operation)));
});
test('directory link exports retain one-to-many grouping, identity, CSV quoting and partial markers',()=>{
  const domains=verifiedDomains([active('cdn.example'),active('images.example')]);
  const files=[objectUrls(source,file.key,domains),objectUrls(source,'images/sub/pic, café.png',domains),objectUrls(source,'images/no.png',[])];
  assert.notEqual(files[0].objectId,files[1].objectId);
  const json=JSON.parse(formatUrlExport(source,files,false,'json'));
  assert.deepEqual(json.files,files);
  assert.deepEqual(json.counts,{files:3,urls:4,multiUrlFiles:2});
  assert.equal(json.complete,false);
  const csv=formatUrlExport(source,files,false,'csv');
  assert(csv.includes('"pic, café.png"'));assert(csv.includes('"no-urls"'));
  const txt=formatUrlExport(source,files,false,'txt');
  assert.equal(txt.split('\n').filter(line=>line.startsWith('FILE ')).length,3);
});
test('tag budget preserves Unicode and reserves the 100 bytes exactly once',()=>{
  assert.deepEqual(normalizedTags([' cool ','cafe\u0301','café','🐈']),['cool','café','🐈']);
  const base=metadataBudget({existing:''},['🐈','"']).used;
  assert.deepEqual(metadataBudget({existing:'a'.repeat(8092-base)},['🐈','"']),{used:8092,limit:8092,remaining:0,reserved:100,fits:true});
  assert.equal(metadataBudget({existing:'a'.repeat(8093-base)},['🐈','"']).fits,false);
});
function zipEntries(bytes){
  const eocd=bytes.length-22, entries=new Map();
  assert.equal(bytes.readUInt32LE(eocd),0x06054b50);
  let offset=bytes.readUInt32LE(eocd+16);
  for(let n=0;n<bytes.readUInt16LE(eocd+10);n++){
    assert.equal(bytes.readUInt32LE(offset),0x02014b50);
    const length=bytes.readUInt16LE(offset+28),size=bytes.readUInt32LE(offset+24),start=bytes.readUInt32LE(offset+42);
    const name=bytes.subarray(offset+46,offset+46+length).toString(),body=start+30+bytes.readUInt16LE(start+26);
    assert(!entries.has(name));entries.set(name,bytes.subarray(body,body+size));offset+=46+length;
  }
  return entries;
}
test('all directory modes produce exactly one reconciled ZIP receipt and intact original files',async()=>{
  for(const mode of ['original','tags','metadata']){
    const chunks=[],job=downloadJob(Date.parse('2026-11-19T14:23:53.123Z'),'unique');
    const entry={...file,key:'images/sub/example.webp'};
    const output=await streamDownloadArchive({source,inventory:{files:[entry],complete:true,pages:2},mode,recursive:true,job,outputName:'images.zip',
      write:async bytes=>chunks.push(bytes),read:async(_file,write)=>write(new Uint8Array([1,2,3])),
      metadata:async file=>({...file,tags:['fixture'],availability:'observed'})});
    const zip=zipEntries(Buffer.concat(chunks));
    assert.equal(output.state,'completed');
    assert.deepEqual(zip.get('files/sub/example.webp'),Buffer.from([1,2,3]));
    assert.equal([...zip.keys()].filter(key=>key.includes('RRReceipt-')).length,1);
    const receipt=JSON.parse(zip.get('_click2cloud/RRReceipt-20261119T142353123Z-unique.json'));
    assert.equal(receipt.stats.written,1);assert.equal(receipt.stats.sourceBytes,3);assert.equal(receipt.inventory.pages,2);
    assert.equal(receipt.objects[0].archive.path,'files/sub/example.webp');
    assert.equal(receipt.evidence.delivery,'UNCONFIRMED_AT_RECEIPT_CREATION');
    assert.equal(zip.has('_click2cloud/manifest.json'),mode!=='original');
  }
});
test('ZIP marks omitted source paths partial and interruption emits no finalized result',async()=>{
  const args={source,inventory:{files:[file,{...file,key:'images/../unsafe.txt'}],pages:1,complete:true},mode:'original',recursive:true,
    job:downloadJob(0,'test'),outputName:'out.zip',write:async()=>{},read:async(_file,write)=>write(new Uint8Array([1,2,3]))};
  assert.equal((await streamDownloadArchive(args)).state,'partial');
  await assert.rejects(streamDownloadArchive({...args,read:async()=>{throw Error('DISCONNECTED');}}),/DISCONNECTED/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(streamDownloadArchive({...args,signal:controller.signal}),{name:'AbortError'});
  const empty=await streamDownloadArchive({...args,inventory:{files:[],complete:true,pages:1}});
  assert.equal(empty.files,0);assert.equal(empty.state,'completed');
});
test('PNG tag encoding preserves existing image bytes outside added text and rejects corrupt PNG',()=>{
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==','base64');
  const tagged=embedPngTags(png,['🐈','café']);
  assert.deepEqual(Buffer.from(tagged.subarray(0,png.length-12)),png.subarray(0,png.length-12));
  assert.deepEqual(embedPngTags(tagged,['🐈','café']),tagged);
  assert.throws(()=>embedPngTags(png.subarray(0,30),[]),{code:'PNG_FORMAT_INVALID'});
});
test('download action descriptors preserve the plain action and nest only selected experimental options',()=>{
  for(const folder of [true,false])for(let mask=0;mask<8;mask++){
    const tags=!!(mask&1),metadata=!!(mask&2),nest=!!(mask&4),nested=nest&&(tags||metadata);
    const {items}=describeExplorerContextMenu(source,{entry:{key:file.key,folder},exports:{tags,metadata,nest}});
    const download=items.filter(item=>item.id.startsWith('explorer.download'));
    assert.equal(download.length,1+Number(tags)+Number(metadata));
    assert.equal(download[0].label,nested?'Download original':'Download');
    assert(download.every(item=>item.group===(nested?'Download':undefined)));
  }
});

test('paged inventory and grouped URL export handle 10,000 files with bounded source pages',async()=>{
  let pages=0;
  const inventory=await listExportInventory(async(_source,cursor)=>{
    const start=Number(cursor??0);
    pages++;
    return {entries:Array.from({length:1000},(_,index)=>({key:'images/'+(start+index)+'/photo.png'})),
      nextCursor:start<9000?String(start+1000):null};
  },source);
  const domains=['cdn.example','images.example','files.example'];
  const files=inventory.files.map(file=>objectUrls(source,file.key,domains));
  assert.equal(pages,10);assert.equal(inventory.complete,true);
  assert.equal(new Set(files.map(file=>file.objectId)).size,10000);
  const result=JSON.parse(formatUrlExport(source,files,true,'json'));
  assert.deepEqual(result.counts,{files:10000,urls:30000,multiUrlFiles:10000});
});

test('failed native ACK compensates Explorer Make Default and retains the previous configuration',async()=>{
  const prior={...source,prefix:'previous/'};
  let state={product:productState({defaultTarget:prior}),configs:{simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}},generation:{desired:0,applied:0}};
  let applyCount=0;
  const api=createEngineApi({
    current:{read:async()=>structuredClone(state),findRetry:async()=>null,commitProduct:async next=>{
      assert.equal(next.expectedRevision,state.product.revision);
      const revision=state.product.revision+1;
      state={...state,product:{...next.product,revision},configs:next.configs};
      return {after:revision,replayed:false};
    }},
    engine:{getEvidence:()=>({}),compile:async()=>({}),apply:async()=>++applyCount===1?{state:'partial',code:'NATIVE_APPLY_INCOMPLETE'}:{state:'completed'}},
    getInventory:async()=>({scopes:[{target:{...source,prefix:''},authorized:true,folders:[source.prefix]}]}),
    authorize:async()=>true,
    prepareFileWorker:async(target,options)=>{
      assert.deepEqual(target,source);
      assert.deepEqual(options,{authorizeSetup:false,requireWriteProof:true,useSavedApproval:true});
    }
  });
  const result=await api.invoke({version:'3+1.1',method:'commitConfigChange',params:{
    changes:[{type:'makeDefault',ensureSimple:true,target:source}],expectedRevision:0,idempotencyKey:'fixture-native-fail'
  }},'gui');
  assert.equal(result.code,'NATIVE_APPLY_INCOMPLETE');assert.equal(applyCount,2);
  assert.deepEqual(state.product.defaultTarget,prior);assert.deepEqual(state.configs.simple.destinations,[]);
});

test('directory URL modes share exact immediate scope and preserve all file types and domain groups',()=>{
  const keys=['a.png','b.cbz','奇妙.pdf','nested/skip.jpg','nested/','', 'extensionless','audio.wav','movie.webm'];
  const objects=keys.map(key=>({key:source.prefix+key})).concat({key:'images-old/sibling.png'});
  const all=directoryUrlFiles(source,objects,new Set(['all']));
  assert.deepEqual(all.map(o=>o.key),['a.png','b.cbz','奇妙.pdf','extensionless','audio.wav','movie.webm'].map(key=>source.prefix+key));
  assert.deepEqual(directoryUrlFiles(source,objects,new Set(['images','audio','video'])).map(o=>o.key),['a.png','audio.wav','movie.webm'].map(key=>source.prefix+key));
  assert.deepEqual(directoryUrlFiles(source,objects,new Set()),[]);
  const domains=['pub-assets.r2.dev','cdn.example','cdn.example'];
  const files=all.slice(0,3).map(({key})=>objectUrls(source,key,domains));
  assert.deepEqual(JSON.parse(formatUrlExport(source,files,true,'json')).counts,{files:3,urls:6,multiUrlFiles:3});
  assert.deepEqual(simpleDirectoryUrls(files,true).text.trimEnd().split('\n'),[
    'https://cdn.example/images/a.png','https://cdn.example/images/b.cbz','https://cdn.example/images/%E5%A5%87%E5%A6%99.pdf']);
  const devOnly=all.slice(0,3).map(({key})=>objectUrls(source,key,['pub-assets.r2.dev']));
  assert.equal(simpleDirectoryUrls(devOnly,true).count,0);
  assert.equal(simpleDirectoryUrls(devOnly,false).developmental,3);
  assert(developmentalDomain(devOnly[0].urls[0].domain));
  const root={...source,prefix:''};
  assert.deepEqual(directoryUrlFiles(root,[{key:'root'},{key:'archive/item'}],new Set(['all'])),[{key:'root'}]);
});
test('Get URL adds only provider-confirmed managed endpoints and reports partial discovery',async()=>{
  let result={enabled:true,domain:'pub-assets.r2.dev'};
  const fixture=createFixture(async target=>{assert.deepEqual(target,source);if(!result)throw Error('Unavailable');return result;});
  fixture.enable();
  const get=()=>fixture.client.invoke('getPublicUrls',{source,key:file.key});
  assert.equal((await get()).data.file.urls.at(-1).provenance,'cloudflare-r2-enabled-managed-domain');
  result={...result,enabled:false};
  assert.equal((await get()).data.file.urlCount,2);
  result=null;
  assert.equal((await get()).data.domainCheckComplete,false);
  assert.equal((await get()).data.file.urlCount,2);
});
