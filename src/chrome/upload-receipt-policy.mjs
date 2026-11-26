export const uploadReceiptSettingsKey='uploadReceiptSettingsV1';
export const uploadReceiptDefaults=Object.freeze({files:false,folders:false,largeOnly:false,sizeEnabled:true,
 countEnabled:true,sizeBytes:200_000_000,count:50,combine:'or'});

export function uploadReceiptSettings(value){
  const policy={...uploadReceiptDefaults,...value};
  if(['files','folders','largeOnly','sizeEnabled','countEnabled'].some(key=>typeof policy[key]!=='boolean')||
     !Number.isSafeInteger(policy.sizeBytes)||policy.sizeBytes<1||!Number.isSafeInteger(policy.count)||policy.count<1||
     !['and','or'].includes(policy.combine)||(policy.largeOnly&&!policy.sizeEnabled&&!policy.countEnabled))
    throw Error('UPLOAD_RECEIPT_INVALID_PREFERENCE');
  return Object.fromEntries(Object.keys(uploadReceiptDefaults).map(key=>[key,policy[key]]));
}

export function qualifyUploadReceipt(value,mode,items){
  const policy=uploadReceiptSettings(value);
  const plannedBytes=items.reduce((sum,item)=>sum+item.size,0),plannedCount=items.length;
  const exceeded=[];
  if(policy.sizeEnabled&&plannedBytes>policy.sizeBytes)exceeded.push('size');
  if(policy.countEnabled&&plannedCount>policy.count)exceeded.push('count');
  const enabled=policy[mode==='folder'?'folders':'files'];
  const qualifies=enabled&&(!policy.largeOnly||exceeded.length>0&&
    (policy.combine==='or'||exceeded.length===Number(policy.sizeEnabled)+Number(policy.countEnabled)));
  return {policy,mode,plannedBytes,plannedCount,qualifies,
    reason:!qualifies?null:policy.largeOnly?exceeded.join('+'):'category-enabled'};
}

export async function readUploadReceiptSettings(storage){
  const raw=(await storage.get(uploadReceiptSettingsKey))[uploadReceiptSettingsKey];
  try{return uploadReceiptSettings(raw);}catch{return {...uploadReceiptDefaults};}
}
