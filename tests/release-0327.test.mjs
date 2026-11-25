import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setImmediate as tick, setTimeout as delay} from 'node:timers/promises';
import {normalizeNavigation,navigationDefaults} from '../extension/navigation.mjs';
import {normalizeHistoryV2View,historyV2FieldVisible,hasHistoryV2Value,createHistoryV2Preference,historyV2ViewKey} from '../extension/history-v2-preferences.mjs';
import {authorizeDropboxHistoryPreview,loadBasicHistoryImage} from '../extension/basic-history-preview.mjs';
import {createApi} from '../src/basic/lib/api.js';
import {decodePreview,encodePreview,livePreviewLimit} from '../src/basic/lib/preview.mjs';
import {createAdapters} from '../src/basic/providers/index.js';
import {basicReceipt} from '../src/queue/receipts.mjs';
import {createVisualFeedbackPreference,normalizeVisualFeedback,feedbackAccentKey,visualFeedbackKey} from '../src/aesthetic/visual-feedback.mjs';
import {createProjectileFeedback,projectileStyle} from '../src/aesthetic/projectile.mjs';
import {createClosedShelfSaveNotice} from '../src/chrome/save-notice.mjs';

const image = readFileSync(new URL('./fixtures/images/picture.png',import.meta.url));
const preview = encodePreview(image,'image/png');
const attempt = provider => ({id:`save-${provider}`,provider,state:'SAVED',confirmed:true,objectId:`obj-${provider}`,filename:'photo.png',
  mime:'image/png',bytes:image.length,destination:{accountId:'fixture-account',...({onedrive:{rootId:'root'},dropbox:{namespace:'root'}}[provider])}});

function memoryStorage(data={}) {
  const listeners = new Set();
  return {onChanged:{addListener:listener=>listeners.add(listener)}, local:{get:async key=>({[key]:structuredClone(data[key])}),
    async set(values) {
      Object.assign(data,structuredClone(values));
      for (const listener of listeners) listener(Object.fromEntries(Object.entries(values).map(([key,newValue])=>[key,{newValue}])),'local');
    }
  }};
}

test('Old placement objects keep their order, send excess main tabs to More and keep Settings reachable',()=>{
  assert.deepEqual(normalizeNavigation(),navigationDefaults);
  const value = normalizeNavigation({history:'main',settings:'main',queue:'main',explorer:'main',remotes:'main',screenshot:'main'});
  const order = Object.keys(value);
  assert.deepEqual(order,['history','settings','queue','explorer','remotes','screenshot']);
  assert.deepEqual(Object.values(value),['main','main','main','main','more','more']);
  const serialized = Object.fromEntries(Object.entries({...value,order}).sort());
  assert.deepEqual(Object.keys(normalizeNavigation(serialized)),order);
  assert.equal(normalizeNavigation({settings:'gone',screenshot:'gone'}).settings,'more');
  assert.equal(normalizeNavigation({settings:'gone',screenshot:'gone'}).screenshot,'gone');
});

test('History V2 defaults to hiding unavailable rows, composes independent provider choices and leaves legacy untouched',async()=>{
  const legacy = {range:'weekly',previews:'all'};
  const storage = memoryStorage({historyPreferences:legacy});
  const view = createHistoryV2Preference(storage);
  await view.ready;
  assert.deepEqual(view.value,{hideNA:true,providers:{}});
  assert(historyV2FieldVisible(view.value,'google','bytes',hasHistoryV2Value(0)),'zero is available');
  assert(historyV2FieldVisible(view.value,'onedrive','proof',hasHistoryV2Value(false)),'false is available');
  const observed=[];
  view.subscribe(value=>observed.push(value));
  await view.update(value=>({...value,providers:{google:{bytes:false,fictional:false}}}));
  await view.update(value=>({...value,hideNA:false}));
  const reloaded = createHistoryV2Preference(storage);
  await reloaded.ready;
  assert.equal(observed.length,2);
  assert.deepEqual(reloaded.value,{hideNA:false,providers:{google:{bytes:false}}});
  assert(historyV2FieldVisible(reloaded.value,'google','mime',false));
  assert(!historyV2FieldVisible(reloaded.value,'google','bytes',true));
  assert(historyV2FieldVisible(reloaded.value,'dropbox','bytes',true));
  assert.deepEqual((await storage.local.get('historyPreferences')).historyPreferences,legacy);
  await storage.local.set({[historyV2ViewKey]:null});
  assert.deepEqual(reloaded.value,normalizeHistoryV2View());
});

test('All three Basic providers resolve retained previews through history.get without a provider read or indexed base64',async()=>{
  for (const provider of ['google','dropbox','onedrive']) {
    const row = {...attempt(provider),preview};
    const [record] = basicReceipt(row);
    assert(!JSON.stringify(record).includes('base64'));
    const calls = [];
    const runtime = {async sendMessage(message){calls.push(message);return {ok:true,value:row};}};
    const result = await loadBasicHistoryImage(record,new AbortController().signal,runtime);
    assert.deepEqual(Buffer.from(await result.blob.arrayBuffer()),image);
    assert(result.retained);
    assert.deepEqual(calls.map(({op,input})=>[op,input]),[['history.get',{id:row.id}]]);
    await assert.rejects(loadBasicHistoryImage({...record,destination:{account:'someone-else'}},new AbortController().signal,runtime),{code:'PREVIEW_RECORD_UNAVAILABLE'});
  }
  const old = {...attempt('google'),destination:undefined,preview};
  const result = await loadBasicHistoryImage(basicReceipt(old)[0],new AbortController().signal,{sendMessage:async()=>({ok:true,value:old})});
  assert(result.retained);
  assert.throws(()=>decodePreview('data:image/png;base64,PHN2Zy8+', 'image/png', 1024),{code:'IMAGE_BYTES_INVALID'});
});

function previewApi(row, {scopes=[], identity = Object.values(row.destination), fetch, authorization, reconnect, afterAuth}={}) {
  const calls = [];
  const runtime = {id:'fixture',getURL:path=>`chrome-extension://fixture/${path}`};
  const sender = {id:runtime.id,url:runtime.getURL('extension/app.html'),documentId:'shelf-one'};
  const api = createApi({chrome:{runtime},durable:async()=>({store:{getAttempt:async id=>id===row.id?row:null}}),
    afterAuth,auth:{reconnect,authorization:authorization ?? (async()=>({identity,scopes,accessToken:'fixture-read',isCurrent:()=>true}))},
    previewAdapters:createAdapters({fetch:async (url,options)=>{
      calls.push({url,options});
      return fetch ? fetch(url,options) : new Response(image,{headers:row.provider==='dropbox'?
        {'Dropbox-API-Result':JSON.stringify({id:row.objectId,size:row.bytes})}:undefined});
    }})});
  const message = (op,input,from=sender)=>api.message({api:1,op,input},from);
  const input = {id:row.id,objectId:row.objectId,accountId:row.destination.accountId,provider:row.provider,requestId:'fixture-request'};
  return {calls,read:(changes,from)=>message('history.readImagePreview',{...input,...changes},from),
    cancel:from=>message('history.cancelImagePreview',{requestId:input.requestId},from),message,sender};
}

test('Live provider previews use exact saved IDs and bound grants with no source URL or provider writes',async()=>{
  for (const provider of ['google','dropbox','onedrive']) {
    const row = attempt(provider), f = previewApi(row,{scopes:['files.content.read']});
    const result = await loadBasicHistoryImage(basicReceipt(row)[0],new AbortController().signal,{
      sendMessage:({op,input})=>f.message(op,input)
    });
    assert.match(result.label,/Live image/);
    assert.deepEqual(Buffer.from(await result.blob.arrayBuffer()),image);
    assert.equal(f.calls.length,1);
    const [{url,options}] = f.calls;
    assert.equal(options.credentials,'omit');
    if (provider==='dropbox') {
      assert.equal(url,'https://content.dropboxapi.com/2/files/download');
      assert.deepEqual(JSON.parse(options.headers['Dropbox-API-Arg']),{path:row.objectId});
    } else assert(url.includes(row.objectId));
    assert.equal((await f.read({objectId:'wrong'})).error.code,'PREVIEW_ACCOUNT_UNAVAILABLE');
    assert.equal((await f.read({}, {...f.sender,url:'https://fixture.invalid/'})).error.code,'CALLER_DENIED');
    assert.equal(f.calls.length,1);
  }
  const dropbox = previewApi(attempt('dropbox'));
  assert.equal((await dropbox.read()).error.code,'PREVIEW_READ_SCOPE_MISSING');
  assert.equal(dropbox.calls.length,0);
  const changed = previewApi(attempt('onedrive'),{identity:['fixture-account','different-root']});
  assert.equal((await changed.read()).error.code,'AUTH_ACCOUNT_CHANGED');
  assert.equal(changed.calls.length,0);
});

test('Preview reads cap size and concurrent requests and can be cancelled only by the initiating Shelf',async()=>{
  const large = previewApi({...attempt('google'),bytes:livePreviewLimit+1});
  assert.equal((await large.read()).error.code,'PREVIEW_SIZE_LIMIT');
  assert.equal(large.calls.length,0);
  for (const [status,code] of [[401,'PROVIDER_AUTH_REVOKED'],[403,'PROVIDER_PERMISSION'],[404,'RESULT_NOT_FOUND']]) {
    const f = previewApi(attempt('google'),{fetch:async()=>new Response(null,{status})});
    assert.equal((await f.read()).error.code,code);
  }
  let releaseSecond;
  const other = new Promise(resolve=>{releaseSecond=resolve;});
  const f = previewApi(attempt('google'),{fetch:(_url,{signal})=>new Promise((resolve,reject)=>{
    signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
    void other.then(()=>resolve(new Response(image)));
  })});
  const first = f.read(), second = f.read({requestId:'second-request'});
  await tick();
  assert.equal((await f.read({requestId:'third-request'})).error.code,'PREVIEW_BUSY');
  assert.equal((await f.cancel({...f.sender,documentId:'different-shelf'})).value.cancelled,false);
  assert.equal((await f.cancel()).value.cancelled,true);
  assert.equal((await first).error.code,'PREVIEW_ABORTED');
  releaseSecond();
  assert((await second).ok);
  const controller = new AbortController();
  const row = attempt('google'), calls = [];
  const loading = loadBasicHistoryImage(basicReceipt(row)[0],controller.signal,{sendMessage:async({op,input})=>{
    calls.push({op,input});
    return op==='history.get' ? {ok:true,value:row} : op==='history.readImagePreview' ? new Promise(()=>{}) : {ok:true};
  }});
  await tick();
  controller.abort();
  await assert.rejects(loading,{name:'AbortError'});
  assert.deepEqual(calls.map(({op})=>op),['history.get','history.readImagePreview','history.cancelImagePreview']);
  assert.equal(calls[1].input.requestId,calls[2].input.requestId);
});

test('Dropbox missing-scope History can recover a confirmed image without resuming a save',async()=>{
  const row={...attempt('dropbox'),preview:'unusable retained bytes'}, scopes=[], granted=[];
  const fixture=previewApi(row,{scopes,reconnect:async(provider,identity)=>{
    granted.push([provider,identity]);scopes.push('files.content.read');return {provider,ready:true};
  },afterAuth:()=>assert.fail('History consent must not resume a save')});
  const runtime={sendMessage:({op,input})=>fixture.message(op,input)};
  const record=basicReceipt(row)[0],signal=new AbortController().signal;
  await assert.rejects(loadBasicHistoryImage(record,signal,runtime),{code:'PREVIEW_READ_SCOPE_MISSING'});
  assert.equal(fixture.calls.length,0);
  await authorizeDropboxHistoryPreview(record,runtime);
  assert.deepEqual(granted,[['dropbox',['fixture-account','root']]]);
  assert.deepEqual(Buffer.from(await (await loadBasicHistoryImage(record,signal,runtime)).blob.arrayBuffer()),image);
  const oversized=previewApi({...row,bytes:livePreviewLimit+1});
  assert.equal((await oversized.message('auth.reconnect',{provider:'dropbox',previewId:row.id})).error.code,'PREVIEW_RECORD_UNAVAILABLE');
  assert.equal((await fixture.message('auth.reconnect',{provider:'dropbox',previewId:'missing'})).error.code,'PREVIEW_RECORD_UNAVAILABLE');
});

test('Projectile speeds have distinct bounded distributions and burst intensity decays on accepted clicks only',async()=>{
  const random = () => .5;
  for (const [speed,duration] of [['slow',850],['normal',475],['fast',250]]) {
    const value = normalizeVisualFeedback({speed});
    assert.equal(projectileStyle(value,null,0,random).duration,duration);
    assert(projectileStyle(value,null,0,()=>.1).duration<duration);
    assert(projectileStyle(value,null,0,()=>.9).duration>duration);
  }
  let now = 10000;
  const storage = memoryStorage({[feedbackAccentKey]:'#789abc',[visualFeedbackKey]:{colors:'theme'}});
  const preferences = createVisualFeedbackPreference(storage), calls=[];
  const chrome = {storage,sidePanel:{getLayout:async()=>({side:'left'})},tabs:{sendMessage:async (...args)=>calls.push(args)}};
  const projectile = createProjectileFeedback({chrome,preferences,clock:()=>now,random});
  const accept = () => {
    const info = {frameId:2};
    projectile.arm(info,{id:17});
    return projectile.forClick(info);
  };
  accept();
  await tick();
  assert.equal(calls.length,0);
  const first = accept();first();first();
  await tick();
  assert.deepEqual(calls.map(([tab,m,options])=>[tab,m.side,m.style.color,options.frameId]),[[17,'left','#789abc',2]]);
  now+=100;accept()();await tick();
  const initial=calls[0][1].style, burst=calls[1][1].style;
  assert(burst.duration<initial.duration && burst.white>initial.white && burst.brightness>initial.brightness);
  for (let i=0;i<18;i++) accept()();
  await tick();
  assert.equal(calls.length,4);
  now+=15000;
  await storage.local.set({[feedbackAccentKey]:'#fedcba'});
  accept()();await tick();
  const cooled=calls.at(-1)[1].style;
  assert.equal(cooled.duration,initial.duration);
  assert.equal(cooled.color,'#fedcba');
  await preferences.update(value=>({...value,rapidClicks:false}));
  now+=1100;accept()();await tick();
  assert.equal(calls.at(-1)[1].style.duration,initial.duration);
  await preferences.update(value=>({...value,projectile:false}));
  assert.equal(calls.at(-1)[1].stop,true);
  const sent=calls.length;accept()();await tick();assert.equal(calls.length,sent);
});

test('Closed-Shelf notices coalesce verified outcomes and clear only the stale REDOWN success ID',async()=>{
  const preferences = createVisualFeedbackPreference(memoryStorage());
  const delivered = [], cleared = [];
  const chrome = {runtime:{getURL:path=>path,sendMessage:async()=>false},
    tabs:{query:async()=>[{id:9,windowId:1}],sendMessage:async(_,message)=>{delivered.push(message);return true;}},
    notifications:{create:async()=>assert.fail('native success notice'),clear:async id=>cleared.push(id)}};
  const notice = createClosedShelfSaveNotice({chrome,preferences,isClosed:async()=>true});
  notice.saved('google');
  notice.saved('google','first');notice.saved('onedrive','last');
  await delay(175);
  assert.deepEqual(delivered.map(event=>event.provider),['onedrive']);
  await preferences.update(value=>({...value,notifications:false}));
  await tick();
  assert(delivered.at(-1).stop);
  assert.deepEqual(cleared,['redown-verified-save','redown-verified-save']);
  notice.saved('dropbox','muted');
  await delay(165);
  assert.equal(delivered.length,2);
});

test('Verified save notices select one surface and report an unavailable custom renderer',async()=>{
  const preferences=createVisualFeedbackPreference(memoryStorage());
  const deliveries=[],native=[],observations=[];
  let closed=false,pageAvailable=true;
  const chrome={runtime:{getURL:path=>path,sendMessage:async message=>{deliveries.push(message);return !closed;}},
    tabs:{query:async()=>[{id:17,windowId:18}],sendMessage:async (tab,message)=>{
      assert.equal(tab,17);deliveries.push(message);return pageAvailable;
    }},notifications:{create:async (_,notification)=>native.push(notification.message),clear:async()=>{}}};
  const notice=createClosedShelfSaveNotice({chrome,preferences,isClosed:async()=>closed,observe:code=>observations.push(code)});
  notice.saved('cloudflare','r2:1');
  await delay(165);
  assert.deepEqual(deliveries.map(message=>message.surface),['shelf']);
  assert.deepEqual(native,[]);
  closed=true;
  notice.saved('cloudflare','r2:1');
  notice.saved('dropbox','basic:2');
  await delay(165);
  assert.deepEqual(deliveries.filter(message=>!message.stop).map(message=>[message.id,message.surface]),[
    ['r2:1','shelf'],['basic:2','app'],['basic:2','page']
  ]);
  assert.deepEqual(native,[]);
  pageAvailable=false;
  notice.saved('google','basic:3');
  await delay(165);
  assert.deepEqual(native,[]);
  assert.equal(observations.at(-1),'CUSTOM_NOTICE_SURFACE_UNAVAILABLE');
  await preferences.update(value=>({...value,notifications:false}));
});

test('Success preferences gate every surface and preserve saved subordinate values',async()=>{
  assert.deepEqual(
    ['notifications','notificationsWhileOpen','notificationHover','notificationPosition','notificationSize'].map(key=>normalizeVisualFeedback({})[key]),
    [true,true,true,'bottom-right','large']
  );
  for(const notifications of [false,true])for(const notificationsWhileOpen of [false,true]){
    const saved={notifications,notificationsWhileOpen,notificationHover:false,notificationPosition:'center',notificationSize:'small'};
    const preferences=createVisualFeedbackPreference(memoryStorage({[visualFeedbackKey]:saved}));
    await preferences.ready;
    let closed=false;
    const sent=[],fallback=[];
    const chrome={runtime:{getURL:path=>path,sendMessage:async message=>{if(!message.stop)sent.push(message);return false;}},
      tabs:{query:async()=>[{id:3,windowId:4}],sendMessage:async(_,message)=>{sent.push(message);return false;}},
      notifications:{create:async()=>fallback.push(true),clear:async()=>{}}};
    const notice=createClosedShelfSaveNotice({chrome,preferences,isClosed:async()=>closed});
    notice.saved('google','open');
    await delay(180);
    assert.deepEqual(sent.map(x=>x.surface),notifications&&notificationsWhileOpen?['shelf']:[]);
    assert.equal(fallback.length,0);
    closed=true;
    notice.saved('dropbox','closed');
    await delay(180);
    assert.deepEqual(sent.filter(x=>x.id==='closed').map(x=>x.surface),notifications?['app','page']:[]);
    assert(sent.every(x=>x.position==='center'&&x.size==='small'&&x.hover===false));
    await preferences.update(value=>({...value,notifications:false}));
    assert.deepEqual(Object.fromEntries(Object.keys(saved).map(key=>[key,preferences.value[key]])),{...saved,notifications:false});
  }
});

test('A claimed renderer with a lost acknowledgement never duplicates delivery and suppression is window scoped',async()=>{
  const preferences=createVisualFeedbackPreference(memoryStorage());
  let listener,closed=true,windowId=7,late;
  const shown=[],fallback=[];
  const chrome={runtime:{id:'fixture',getURL:path=>path,onMessage:{addListener:fn=>listener=fn},sendMessage:async()=>false},
    tabs:{query:async()=>[{id:windowId+10,windowId}],sendMessage:async(tab,message)=>{
      if(message.stop){shown.push({stop:message.windowId});return false;}
      const granted=await new Promise(resolve=>listener({channel:message.channel,token:message.token,claim:true},
        {id:'fixture',tab:{id:tab,windowId:message.windowId},frameId:0},resolve));
      if(!granted)return false;
      shown.push({id:message.id,window:message.windowId});
      return new Promise(resolve=>{late=resolve;});
    }},notifications:{create:async()=>fallback.push(true)}};
  const notice=createClosedShelfSaveNotice({chrome,preferences,isClosed:async id=>id===7?closed:true});
  notice.saved('dropbox','late');
  await delay(850);
  late(true);
  assert.deepEqual(shown,[{id:'late',window:7}]);
  assert.equal(fallback.length,0);
  await preferences.update(value=>({...value,notificationsWhileOpen:false}));
  notice.shelfOpened(8);
  await tick();
  assert.equal(shown.length,1);
  closed=false;
  notice.shelfOpened(7);
  await tick();
  assert.deepEqual(shown.at(-1),{stop:7});
  windowId=8;
  notice.saved('google','invalidated');
  await preferences.update(value=>({...value,notifications:false}));
  await preferences.update(value=>({...value,notifications:true}));
  await delay(180);
  assert.equal(shown.length,2);
  assert.equal(fallback.length,0);
});

test('The delivery engine follows a Shelf opening to the custom Shelf surface',async()=>{
  const preferences=createVisualFeedbackPreference(memoryStorage());
  let closed=true;
  const surfaces=[];
  const chrome={runtime:{getURL:path=>path,sendMessage:async message=>{
    if(message.stop)return false;
    surfaces.push(message.surface);
    if(message.surface==='app'){closed=false;return false;}
    return message.surface==='shelf';
  }},tabs:{query:async()=>[{id:1,windowId:2}]},
  notifications:{create:async()=>surfaces.push('native')}};
  const notice=createClosedShelfSaveNotice({chrome,preferences,isClosed:async()=>closed});
  notice.saved('dropbox','surface-change');
  await delay(185);
  assert.deepEqual(surfaces,['app','shelf']);
  await preferences.update(value=>({...value,notifications:false}));
});

test('each window claims its own custom notice, and an unrelated window cannot claim it',async()=>{
  const preferences=createVisualFeedbackPreference(memoryStorage()), rendered=[];
  let listener,focusedWindow=1;
  const chrome={runtime:{id:'fixture',getURL:path=>path,onMessage:{addListener:value=>listener=value},
    sendMessage:async()=>false},tabs:{query:async()=>[{id:focusedWindow+10,windowId:focusedWindow}],
    sendMessage:async(tab,message)=>{
      if(message.stop)return true;
      const claim={channel:message.channel,token:message.token,windowId:message.windowId,claim:true};
      const ask=(windowId,frameId)=>new Promise(resolve=>listener(claim,{id:'fixture',tab:{id:tab,windowId},frameId},resolve));
      assert.equal(await ask(message.windowId+1,0),false);
      assert.equal(await ask(message.windowId,1),false);
      assert.equal(await ask(message.windowId,0),true);
      rendered.push([message.windowId,message.id]);
      return true;
    }},notifications:{create:async()=>assert.fail('native success notice')}};
  const notice=createClosedShelfSaveNotice({chrome,preferences,isClosed:async()=>true});
  notice.saved('google','window-one');
  focusedWindow=2;
  notice.saved('dropbox','window-two');
  await delay(200);
  assert.deepEqual(rendered.sort(),[[1,'window-one'],[2,'window-two']]);
  await preferences.update(value=>({...value,notifications:false}));
});
