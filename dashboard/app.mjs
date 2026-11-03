// The dashboard is deliberately a narrow right-click infrastructure workbench,
// not another File Explorer. It is host-integrated, never a fake cloud simulator.
import {createClick2CloudFileApi} from '../src/explorer/index.mjs';
import {createRedownDashboardBridge} from '../src/dashboard/redown-bridge.mjs';
import {createDashboardControls} from '../src/dashboard/controls.mjs';

const $=id=>document.getElementById(id);
let controls=null,lastBuckets='';
const safeLocation=()=>{
  const raw=$('bucket').value;
  if(!raw)return null;
  const b=JSON.parse(raw);
  return {accountId:b.accountId,bucketName:b.bucketName,prefix:$('prefix').value||''};
};
const paint=s=>{
  $('status').textContent=s.message||'Ready to check Cloudflare.';
  $('inventory-summary').textContent=s.accounts.length+' accounts · '+s.buckets.length+' buckets'+
    (s.location?' · '+s.entries.length+' entries in '+s.location.bucketName+'/'+(s.location.prefix||''):'');
  $('activation-status').textContent='Bucket activation: '+s.activation.status+
    ' · '+s.activation.ready+'/'+s.activation.total+' prepared · native menu '+
    (s.activation.menuRegistered?'registered':'not verified');
  $('prepare').dataset.state=s.activation.status;
  $('refresh').disabled=s.phase==='refreshing'||s.phase==='activating';
  $('prepare').disabled=!bridge?.activationHostReady||s.phase==='refreshing'||s.phase==='activating';
  const b=JSON.stringify(s.buckets);
  if(lastBuckets!==b){
    const prior=$('bucket').value;
    $('bucket').replaceChildren(new Option('All connected accounts and buckets',''));
    for(const target of s.buckets){
      const value=JSON.stringify(target);
      $('bucket').add(new Option(target.bucketName+' · '+target.accountId,value));
    }
    if([...$('bucket').options].some(o=>o.value===prior))$('bucket').value=prior;
    lastBuckets=b;
  }
  $('entries').replaceChildren(...s.entries.slice(0,250).map(e=>{
    const el=document.createElement('li');
    el.textContent=(e.folder?'📁 ':'📄 ')+(e.displayName||e.key||'Unknown entry');
    return el;
  }));
};
let bridge;
try{
  bridge=createRedownDashboardBridge();
  controls=createDashboardControls({
    fileApi:createClick2CloudFileApi({send:bridge.send,http:bridge.http}),
    readAuth:bridge.readAuth,readActivation:bridge.readActivation,
    activateBuckets:bridge.activateBuckets,onChange:paint
  });
  $('refresh').onclick=async()=>{await controls.refresh(safeLocation());};
  $('prepare').onclick=async()=>{await controls.activate();};
  $('bucket').onchange=()=>{$('prefix').value='';};
  await controls.hydrate();
  if(!bridge.activationHostReady){
    $('activation-status').textContent='This standalone page cannot perform bucket activation: the original REDOWN background allows only its authenticated Explorer sender. A host integration is required.';
    $('prepare').disabled=true;
  }
}catch(error){
  $('status').textContent=String(error?.message||'REDOWN host unavailable.');
  $('refresh').disabled=true;$('prepare').disabled=true;
}
