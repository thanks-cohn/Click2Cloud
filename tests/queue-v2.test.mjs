import test from 'node:test';
import assert from 'node:assert/strict';
import {readOwnerAttempt,exportRecord} from '../src/history-v2/records.mjs';
import {calendarPath,selectHistoryRange} from '../src/history-v2/calendar.mjs';
import {writeHistoryZip} from '../src/history-v2/zip.mjs';
import {historyCardFlags} from '../extension/history-v2-view.mjs';
import {navigationPreferences,navigationDefaults} from '../extension/navigation.mjs';

const base={kind:'save',state:'verified',proofKind:'independent-head-version-size',operationId:'attempt-1',at:100,updatedAt:200,
  destination:{bucketName:'retained',accountId:'fixture-id',prefix:'reports/'},receipt:{key:'reports/report.pdf',version:'object-version',size:100}};

test('Queue V2 normalizes actual attempt identity independently of the object and presentation',()=>{
  const [record]=readOwnerAttempt(base);
  const [second]=readOwnerAttempt({...base,operationId:'attempt-2'});
  assert.notEqual(record.recordId,second.recordId);
  assert.equal(record.objectId,second.objectId);
  assert.equal(record.orderAt,200);
  assert.equal(record.requestedAt,100);
  assert.equal(record.status,'verified');
  assert.equal(readOwnerAttempt({...base,kind:'file-action'}).length,0);
  assert.equal(readOwnerAttempt({...base,kind:'depth-click'}).length,0);
  assert.equal(readOwnerAttempt({...base,kind:'readiness'}).length,0);
});

test('Queue V2 does not promote missing proof or invent progress',()=>{
  assert.equal(readOwnerAttempt({...base,proofKind:null})[0].status,'uploaded');
  const [job]=readOwnerAttempt({...base,state:'pending',proofKind:null,receipt:null});
  assert.equal(job.status,'working');assert.equal(job.progress,null);assert.equal(job.terminalAt,null);
});

test('Queue V2 retains one screenshot card per observed destination with each timestamp',()=>{
  const shot={kind:'screenshot-to-cloud',state:'partial',operationId:'capture-attempt',at:100,updatedAt:500,screenshot:{
    finishedAt:'2026-11-23T16:40:30.000Z',plan:{captureId:'fixture-action',outputs:[{outputId:'first',target:{bucketName:'test'},key:'one.png'},{outputId:'second',target:{bucketName:'test'},key:'two.png'}]},
    outputs:[{outputId:'first',state:'confirmed',at:'2026-11-23T16:40:01.000Z',verification:'direct-r2-get-sha256'},{outputId:'second',state:'unknown',at:'2026-11-23T16:40:20.000Z'}]}};
  const records=readOwnerAttempt(shot);
  assert.equal(records.length,2);assert.notEqual(records[0].recordId,records[1].recordId);
  assert.deepEqual(records.map(row=>row.terminalAt),['2026-11-23T16:40:01.000Z','2026-11-23T16:40:20.000Z'].map(Date.parse));
  assert.deepEqual(records.map(row=>row.status),['verified','uncertain']);
  assert.equal(records[0].sourceRecordId,shot.operationId);
});

test('History V2 exports safe URL metadata and stable correlation IDs',()=>{
  const [record]=readOwnerAttempt({...base,historyContext:{sourceURL:'https://files.example/file?se=123&signature=secret#fragment',hostPageURL:'javascript:alert(1)'}});
  assert.equal(record.sourceUrl,'https://files.example/file');assert.equal(record.hostUrl,null);
  const safe=exportRecord(record);
  assert.equal(safe.sourceUrl,null);assert.equal(safe.attemptId,base.operationId);assert.equal(safe.recordId,record.recordId);
  assert.equal(exportRecord(record,{privacy:false}).sourceUrl,'https://files.example/file');
});

test('calendar ranges use local civil days with DST and year boundaries',()=>{
  const timezone='America/Chicago';
  for(const [day,hours] of [['2026-03-08',23],['2026-11-01',25]]) {
    const {from,to}=selectHistoryRange({range:'custom',start:day,end:day,timezone});assert.equal((to-from)/3600000,hours);
  }
  const now=Date.parse('2026-01-02T18:00:00Z');
  assert.equal(calendarPath(now,timezone,now)[0].name,'Today');
  assert.equal(calendarPath(Date.parse('2025-12-31T18:00:00Z'),timezone,now)[0].name,'Earlier This Week');
  assert.deepEqual(calendarPath(Date.parse('2024-08-14T18:00:00Z'),timezone,now).map(group=>group.name),['2024','August','Week 2','2024-08-14']);
  assert.throws(()=>selectHistoryRange({range:'custom',start:'2026-02-30',end:'2026-12-01'}),/DATE_RANGE_INVALID/);
});

test('Navigation sanitizes persisted preferences with Downloads excluded',()=>{
  assert.deepEqual(Object.keys(navigationDefaults),['explorer','remotes','queue','settings','history','screenshot']);
  const prefs=navigationPreferences({history:true,settings:false,downloads:true,queue:'bad'});
  assert.equal(prefs.history,true);assert.equal(prefs.settings,false);assert.equal(prefs.queue,true);
  assert(!Object.hasOwn(prefs,'downloads'));
});

test('Card flags change only recognized presentation fields',()=>{
  assert.equal(historyCardFlags('full',{showSourceUrl:false}).showSourceUrl,false);
  assert.equal(historyCardFlags('compact').showImagePreview,true);
  assert.equal(historyCardFlags('compact').showHostUrl,false);
  assert.throws(()=>historyCardFlags('full',{showHostUrl:'false'}),/HISTORY_CARD_FLAG_INVALID/);
  assert.throws(()=>historyCardFlags('full',{reduceExport:true}),/HISTORY_CARD_FLAG_INVALID/);
});

test('History ZIP rejects count mismatch and stops writing on cancellation',async()=>{
  let writes=0;
  await assert.rejects(writeHistoryZip({async write(){writes++;}},[],{expectedRecords:1}),/COUNT_MISMATCH/);
  assert(writes>0);
  const controller=new AbortController();
  await assert.rejects(writeHistoryZip({async write(){controller.abort();}},[],{expectedRecords:0},{signal:controller.signal}),{name:'AbortError'});
});
