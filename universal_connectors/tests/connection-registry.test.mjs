import test from 'node:test';
import assert from 'node:assert/strict';
import {composeConnectionRegistry,nativeActionId,nativeConnectionId,inventoryNamespace} from '../src/connection-registry.mjs';
const mk=(connectionId,providerKind,menuLabel,activeMode='simple')=>({
  kind:'s3',connectionId,providerKind,accountId:'account-1',endpointId:'endpoint',
  menuLabel,activeMode,ready:true,presentation:'leaf',
  entries:[{id:'root',parentId:null,title:menuLabel,type:'action',
    action:{kind:'save',target:{connectionId,bucketId:'redown',prefix:''}}}]
});
const cloud=mk('cloudflare-1','cloudflare-r2','Cloudflare');
const mega={...mk('mega-s4-1','mega-s4','MEGA S3','depth'),presentation:'submenu',entries:[
  {id:'photos',parentId:null,title:'Photos',type:'branch'},
  {id:'photos-send',parentId:'photos',title:'Save here',type:'action',
    action:{kind:'save',target:{connectionId:'mega-s4-1',bucketId:'photos',prefix:'Photos'}}},
  {id:'projects',parentId:null,title:'Projects',type:'action',
    action:{kind:'save',target:{connectionId:'mega-s4-1',bucketId:'photos',prefix:'Projects'}}}
]};
const native=(id,providerKind,title)=>({kind:'native',connectionId:id,providerKind,
  accountId:id,endpointId:'native',menuLabel:title,activeMode:null,ready:true,presentation:'leaf',
  entries:[{id:'save',parentId:null,title,type:'action',action:{kind:'save',target:{connectionId:id}}}]});
const others=[
  native('drive','google-drive-native','Google Drive'),
  native('one','onedrive-native','OneDrive'),
  native('drop','dropbox-native','Dropbox')
];
test('Cloudflare Simple and MEGA S4 Depth appear concurrently with proper sibling order',()=>{
 const r=composeConnectionRegistry([mega,others[2],cloud,others[1],others[0]]);
 const labels=r.entries.filter(e=>e.parentId==='c2c:redown:root').map(e=>e.title);
 assert.deepEqual(labels,['Cloudflare','Google Drive','OneDrive','Dropbox','MEGA S3']);
 assert.equal(r.entries.find(e=>e.title==='Cloudflare').type,'action');
 assert.equal(r.entries.find(e=>e.title==='MEGA S3').type,'branch');
 assert.equal(r.resolve(nativeActionId(mega,'depth','photos-send'),[cloud,mega,...others]).action.target.connectionId,'mega-s4-1');
});
test('another S3 provider may use Narrow without altering existing connections',()=>{
 const other={...mk('other-2','amazon-s3','Amazon S3','narrow'),presentation:'submenu',entries:[
 {id:'folder',title:'Folder',type:'branch'},
 {id:'A',parentId:'folder',title:'Weddings',type:'action',action:{kind:'save',target:{connectionId:'other-2',bucketId:'b',prefix:'a'}}},
 {id:'B',parentId:'folder',title:'Weddings',type:'action',action:{kind:'save',target:{connectionId:'other-2',bucketId:'b',prefix:'a'}}}]};
 const r=composeConnectionRegistry([cloud,mega,other]);
 assert.equal(r.entries.filter(x=>x.title==='Weddings').length,2);
 assert.notEqual(nativeActionId(other,'narrow','A'),nativeActionId(other,'narrow','B'));
 assert.equal(r.resolve(nativeActionId(other,'narrow','B'),[cloud,mega,other]).action.target.prefix,'a');
});
test('mode change in MEGA S3 does not alter Cloudflare action ID or index namespace',()=>{
 const first=composeConnectionRegistry([cloud,mega]);
 const changed={...mega,activeMode:'simple',presentation:'leaf',entries:mk('mega-s4-1','mega-s4','MEGA S3').entries};
 const second=composeConnectionRegistry([cloud,changed]);
 assert.equal(first.entries.find(x=>x.title==='Cloudflare').id,second.entries.find(x=>x.title==='Cloudflare').id);
 assert.equal(inventoryNamespace(mega,'photos'),inventoryNamespace(changed,'photos'));
 assert.equal(second.resolve(nativeActionId(mega,'depth','projects'),[cloud,changed]),null);
});
test('MEGA native provider has independent menu ID even alongside MEGA S3',()=>{
 const regular=native('mega-native-1','mega-native','MEGA');
 const r=composeConnectionRegistry([cloud,mega,regular]);
 assert.ok(r.entries.some(x=>x.title==='MEGA'));
 assert.ok(r.entries.some(x=>x.title==='MEGA S3'));
 assert.notEqual(nativeConnectionId(regular),nativeConnectionId(mega));
});
test('two S3 connections with matching names and buckets never share IDs or journals',()=>{
 const second={...mk('mega-s4-2','mega-s4','MEGA S3','depth'),
   accountId:'account-2',endpointId:'endpoint-2'};
 const r=composeConnectionRegistry([cloud,mega,second]);
 assert.equal(r.entries.filter(x=>x.title==='MEGA S3').length,2);
 assert.notEqual(nativeConnectionId(mega),nativeConnectionId(second));
 assert.notEqual(inventoryNamespace(mega,'photos'),inventoryNamespace(second,'photos'));
});
test('revocation blocks save routes without changing unrelated connection routes',()=>{
 const r=composeConnectionRegistry([cloud,mega]);
 const bad=[cloud,{...mega,ready:false}];
 assert.equal(r.resolve(nativeActionId(mega,'depth','projects'),bad),null);
 assert.equal(r.resolve(nativeConnectionId(cloud),bad).connectionId,'cloudflare-1');
});
test('Cloudflare setup leaf is not mistaken for a save receipt',()=>{
 const setup={...cloud,ready:true,entries:[{id:'setup',parentId:null,title:'Cloudflare',type:'action',
   action:{kind:'setup',reason:'r2-activation-required'}}]};
 const r=composeConnectionRegistry([setup,mega]);
 assert.equal(r.resolve(nativeConnectionId(setup),[setup,mega]).action.kind,'setup');
});
test('invalid reused connection ID, wrong mode and orphan child fail closed',()=>{
 assert.throws(()=>composeConnectionRegistry([cloud,cloud]),/Duplicate connection/);
 assert.throws(()=>composeConnectionRegistry([{...mega,activeMode:'bad'}]),/valid per-connection mode/);
 assert.throws(()=>composeConnectionRegistry([{...mega,entries:[
  {id:'orphan',parentId:'missing',title:'lost',type:'action',action:{kind:'save'}}
 ]}]),/Parent must precede/);
});
test('native connection stays a flat leaf; no accidental submenu',()=>{
 const invalid={...others[0],presentation:'submenu'};
 assert.throws(()=>composeConnectionRegistry([invalid]),/Native provider must be flat/);
});
test('bucket scopes distinguish endpoint and account even if container name matches',()=>{
 assert.notEqual(inventoryNamespace(mega,'photos'),inventoryNamespace({...mega,endpointId:'other-region'},'photos'));
 assert.notEqual(inventoryNamespace(mega,'photos'),inventoryNamespace({...mega,accountId:'another'},'photos'));
});
