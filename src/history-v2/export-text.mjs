const encoder=new TextEncoder();
const csv=value=>{
  let text=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);
  if(/^[=+@\-\t\r]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
};

export async function writeHistoryText(writer,records,{format,expectedRecords,selection,signal,onProgress}) {
  let archiveBytes=0, writtenRecords=0, fields=null;
  const write=async text=>{
    signal?.throwIfAborted();
    const bytes=encoder.encode(text);
    await writer.write(bytes);
    archiveBytes+=bytes.length;
  };
  const meta={schemaVersion:1,selection,expectedRecords};
  if(format==='json')await write('{"export":'+JSON.stringify(meta)+',"records":[');
  if(format==='jsonl')await write(JSON.stringify({export:meta})+'\n');
  for await(const record of records) {
    if(format==='csv'&&!fields){fields=Object.keys(record);await write(fields.map(csv).join(',')+'\r\n');}
    if(format==='json')await write((writtenRecords?',':'')+JSON.stringify(record));
    else if(format==='jsonl')await write(JSON.stringify(record)+'\n');
    else await write(fields.map(key=>csv(record[key])).join(',')+'\r\n');
    if(++writtenRecords%512===0)onProgress?.(writtenRecords,expectedRecords);
  }
  if(writtenRecords!==expectedRecords)throw Error('HISTORY_EXPORT_COUNT_MISMATCH');
  if(format==='json')await write('],"writtenRecords":'+writtenRecords+'}\n');
  if(format==='jsonl')await write(JSON.stringify({writtenRecords})+'\n');
  if(format==='csv'&&!writtenRecords)await write('recordId\r\n');
  return {archiveBytes,writtenRecords};
}
