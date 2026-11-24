import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setImmediate as tick, setTimeout as delay} from 'node:timers/promises';
import {normalizeNavigation,navigationDefaults} from '../extension/navigation.mjs';
import {normalizeHistoryV2View,historyV2FieldVisible,hasHistoryV2Value,createHistoryV2Preference,historyV2ViewKey} from '../extension/history-v2-preferences.mjs';
import {loadBasicHistoryImage} from '../extension/basic-history-preview.mjs';
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

function previewApi(row, {scopes=[], identity = Object.values(row.destination), fetch, authorization}={}) {
  const calls = [];
  const runtime = {id:'fixture',getURL:path=>`chrome-extension://fixture/${path}`};
  const sender = {id:runtime.id,url:runtime.getURL('extension/app.html'),documentId:'shelf-one'};
  const api = createApi({chrome:{runtime},durable:async()=>({store:{getAttempt:async id=>id===row.id?row:null}}),
    auth:{authorization:authorization ?? (async()=>({identity,scopes,accessToken:'fixture-read',isCurrent:()=>true}))},
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

test('Closed-Shelf notices coalesce single verified outcomes and clear on opt-out',async()=>{
  const preferences = createVisualFeedbackPreference(memoryStorage());
  let closed = false;
  const created = [], cleared = [];
  const chrome = {runtime:{getURL:path=>path},notifications:{create:async(...args)=>created.push(args),clear:async id=>cleared.push(id)}};
  const notice = createClosedShelfSaveNotice({chrome,preferences,isClosed:async()=>closed});
  notice.saved('google');
  await delay(165);
  assert.equal(created.length,0);
  closed=true;
  notice.saved('google');notice.saved('onedrive');
  await delay(165);
  assert.equal(created.length,1);
  const [[id,shown]] = created;
  assert.deepEqual([shown.title,shown.message,shown.requireInteraction],['Saved!','at OneDrive',false]);
  await preferences.update(value=>({...value,notifications:false}));
  await tick();
  assert.deepEqual(cleared,[id]);
  notice.saved('dropbox');
  await delay(165);
  assert.equal(created.length,1);
});
