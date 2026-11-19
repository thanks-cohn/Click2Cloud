import {assertExportIdentity, exportError, exportModes} from './object-exports.mjs';

const encode = text => new TextEncoder().encode(text);
const max32 = 0xffffffff;
const limits = {png:8*1024*1024, entries:65534};
const crcTable = Uint32Array.from({length:256}, (_, byte) => {
  for(let bit=0;bit<8;bit++)byte = (byte>>>1)^((byte&1)?0xedb88320:0);
  return byte;
});
function crcUpdate(crc, bytes) {
  for (const byte of bytes) crc = (crc>>>8)^crcTable[(crc^byte)&255];
  return crc;
}
const checksum = bytes => (crcUpdate(0xffffffff,bytes)^0xffffffff)>>>0;
function record(length, fields) {
  const bytes = new Uint8Array(length), view = new DataView(bytes.buffer);
  for (const [offset,width,value] of fields) {
    if (width===2) view.setUint16(offset,value,true);
    else view.setUint32(offset,value,true);
  }
  return bytes;
}
// ZIP32 STORE, UTF-8 names, and streamed data descriptors. Only the directory
// records stay resident; awaiting every write propagates the sink's backpressure.
function zipWriter(write, signal) {
  const central = [], names = new Set();
  let offset = 0;
  async function writeBytes(bytes) {
    signal?.throwIfAborted();
    if (offset + bytes.length >= max32) throw exportError('ZIP32_LIMIT');
    await write(bytes);
    offset += bytes.length;
  }
  async function add(path, produce) {
    const filename = encode(path);
    if (names.has(path) || filename.length>65535 || central.length>=limits.entries) throw exportError('ZIP_ENTRY_INVALID');
    names.add(path);
    const start = offset, flags = 0x808;
    await writeBytes(record(30,[[0,4,0x04034b50],[4,2,20],[6,2,flags],[12,2,33],[26,2,filename.length]]));
    await writeBytes(filename);
    let size = 0, crc = 0xffffffff;
    await produce(async bytes => {
      size += bytes.length;
      crc = crcUpdate(crc,bytes);
      await writeBytes(bytes);
    });
    crc = (crc^0xffffffff)>>>0;
    await writeBytes(record(16,[[0,4,0x08074b50],[4,4,crc],[8,4,size],[12,4,size]]));
    central.push([record(46,[[0,4,0x02014b50],[4,2,20],[6,2,20],[8,2,flags],[14,2,33],[16,4,crc],[20,4,size],[24,4,size],[28,2,filename.length],[42,4,start]]),filename]);
    return {path,size,crc32:crc.toString(16).padStart(8,'0')};
  }
  async function finish() {
    const start = offset;
    for (const [header,name] of central) { await writeBytes(header); await writeBytes(name); }
    await writeBytes(record(22,[[0,4,0x06054b50],[8,2,central.length],[10,2,central.length],[12,4,offset-start],[16,4,start]]));
    return offset;
  }
  return {add, finish, json:(path,value)=>add(path,write=>write(encode(JSON.stringify(value))))};
}

const pngSignature = [137,80,78,71,13,10,26,10];
const pngKeyword = encode('org.click2cloud.tags');
function pngChunks(bytes) {
  if (!pngSignature.every((byte,index)=>bytes[index]===byte)) throw exportError('PNG_FORMAT_INVALID');
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const chunks = [];
  for(let at=8;at+12<=bytes.length;) {
    const size=view.getUint32(at), end=at+size+12;
    if (end>bytes.length) break;
    const type=String.fromCharCode(...bytes.subarray(at+4,at+8)), data=bytes.subarray(at+8,end-4);
    if (checksum(bytes.subarray(at+4,end-4))!==view.getUint32(end-4)) throw exportError('PNG_FORMAT_INVALID');
    const owned=type==='iTXt'&&pngKeyword.every((byte,index)=>data[index]===byte)&&data[pngKeyword.length]===0;
    chunks.push({at,end,type,data,owned});
    if(type==='IEND'&&size===0&&end===bytes.length&&chunks[0].type==='IHDR'&&chunks.some(chunk=>chunk.type==='IDAT'))return chunks;
    at=end;
  }
  throw exportError('PNG_FORMAT_INVALID');
}
export function embedPngTags(bytes,tags) {
  if (bytes.length>limits.png) throw exportError('PNG_EMBED_LIMIT');
  const chunks=pngChunks(bytes), payload=encode(JSON.stringify(tags)), chunk=new Uint8Array(12+pngKeyword.length+5+payload.length);
  const view=new DataView(chunk.buffer);
  view.setUint32(0,chunk.length-12);
  chunk.set(encode('iTXt'),4);
  chunk.set(pngKeyword,8);
  chunk.set(payload,8+pngKeyword.length+5);
  view.setUint32(chunk.length-4,checksum(chunk.subarray(4,chunk.length-4)));
  const oldSize=chunks.filter(item=>item.owned).reduce((total,item)=>total+item.end-item.at,0);
  const output=new Uint8Array(bytes.length-oldSize+chunk.length);
  output.set(pngSignature);
  let offset=8;
  for (const item of chunks) {
    if (item.owned) continue;
    if (item.type==='IEND') { output.set(chunk,offset); offset+=chunk.length; }
    output.set(bytes.subarray(item.at,item.end),offset);
    offset+=item.end-item.at;
  }
  const read=pngChunks(output).find(item=>item.owned);
  if (new TextDecoder().decode(read?.data.subarray(pngKeyword.length+5))!==JSON.stringify(tags))throw exportError('PNG_TAG_READBACK_FAILED');
  return output;
}

function archivePath(key, prefix) {
  const relative = key.slice(prefix.length);
  const segments = relative.split('/');
  if (!relative || !key.startsWith(prefix) || segments.some(segment =>
    !segment || segment==='.' || segment==='..' || /[\\:<>"|?*\x00-\x1f\x7f]/.test(segment) ||
    /[. ]$/.test(segment) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment))) return null;
  return 'files/'+relative;
}
export function downloadJob(now=Date.now(), jobId=crypto.randomUUID()) {
  const createdAt = new Date(now).toISOString(), stamp = createdAt.replace(/[-:.]/g,'');
  if (!/^[a-zA-Z0-9-]+$/.test(jobId)) throw exportError('DOWNLOAD_JOB_INVALID');
  return {jobId,createdAt,receiptName:'RRReceipt-'+stamp+'-'+jobId+'.json'};
}
export function canEmbedTags(file) {
  return /\.png$/i.test(file.key) && file.size>0 && file.size<=limits.png;
}
async function bufferedRead(file,read) {
  const bytes = new Uint8Array(file.size);
  let offset = 0;
  await read(file, chunk => { bytes.set(chunk,offset); offset+=chunk.length; });
  if (offset!==bytes.length) throw exportError('RANGE_RESPONSE_INVALID');
  return bytes;
}
export async function prepareTaggedPng(file, tags, read) {
  return embedPngTags(await bufferedRead(file,read),tags);
}

export async function streamDownloadArchive({source, inventory, mode, recursive, job, outputName, write, read, metadata, signal, onProgress, forceCompanion=false}) {
  if (!exportModes.includes(mode)) throw exportError('DOWNLOAD_MODE_INVALID');
  const expectedBytes = inventory.files.reduce((bytes,file)=>bytes+(file.size??0),0);
  if (expectedBytes>=max32) throw exportError('ZIP32_LIMIT');
  const zip=zipWriter(write,signal), dispositions=[], paths=new Set(), parents=new Set();
  let written=0, sourceBytes=0, archivedBytes=0, tagged=0;
  for (const file of inventory.files) {
    signal?.throwIfAborted();
    const path=archivePath(file.key,source.prefix), collisionKey=path?.normalize('NFC').toLowerCase();
    const row={key:file.key,relativePath:file.key.slice(source.prefix.length),source:{size:file.size,etag:file.etag,version:file.version,lastModified:file.lastModified,contentType:file.contentType},archive:null,state:'skipped'};
    dispositions.push(row);
    if (file.key.endsWith('/') && file.size===0) { row.reason='DIRECTORY_MARKER'; continue; }
    const ancestors=collisionKey?.split('/').slice(0,-1).map((_,index,parts)=>parts.slice(0,index+1).join('/'))??[];
    if (!path || paths.has(collisionKey) || parents.has(collisionKey) || ancestors.some(parent=>paths.has(parent))) {
      row.reason=path?'ARCHIVE_PATH_COLLISION':'ARCHIVE_PATH_INVALID'; continue;
    }
    if (!Number.isSafeInteger(file.size)||file.size<0||!file.etag) { row.reason='OBJECT_IDENTITY_UNAVAILABLE'; continue; }
    paths.add(collisionKey);for(const parent of ancestors)parents.add(parent);
    let observed, taggedImage;
    try {
      if (mode!=='original') {
        observed=await metadata(file);
        assertExportIdentity(file,observed);
        if (mode==='tags' && observed.availability!=='observed')row.metadataWarning='TAG_METADATA_UNAVAILABLE';
        if (mode==='tags' && observed.tags?.length && !forceCompanion && canEmbedTags(file)) {
          try { taggedImage=await prepareTaggedPng(file,observed.tags,read); }
          catch (error) { if (!['PNG_FORMAT_INVALID','PNG_TAG_READBACK_FAILED'].includes(error.code)) throw error; }
        }
      }
    } catch (error) {
      signal?.throwIfAborted();
      row.state=error.code==='OBJECT_CHANGED'?'changed':'failed';
      row.reason=error.code??'EXPORT_OBJECT_UNAVAILABLE';
      continue;
    }
    const tags=observed?.tags??[];
    row.source.tags=observed?.availability==='observed'?(tags.length?'present':'absent'):'unobserved';
    row.archive=await zip.add(path,async writeEntry=>{
      if(taggedImage){await writeEntry(taggedImage);return;}
      let size=0;
      await read(file,async bytes=>{size+=bytes.length;if(size>file.size)throw exportError('RANGE_RESPONSE_INVALID');await writeEntry(bytes);});
      if(size!==file.size)throw exportError('RANGE_RESPONSE_INVALID');
    });
    row.state='written';
    row.mode=taggedImage?'embedded-tags':'original';
    row.tagReadback=!!taggedImage;
    if (mode==='metadata' || mode==='tags' && tags.length && !taggedImage) {
      const suffix=mode==='metadata'?'.metadata.json':'.tags.json';
      row.sidecar=await zip.json('_click2cloud/metadata/'+dispositions.length+suffix,mode==='metadata'?observed:{schema:'click2cloud.object-tags/1',key:file.key,tags,reason:'Embedding unavailable for this file'});
      row.mode=mode==='metadata'?'original-with-metadata':'original-with-tags-companion';
    }
    written++;sourceBytes+=file.size;archivedBytes+=row.archive.size;if(tags.length)tagged++;
    onProgress?.({files:written,bytes:archivedBytes,errors:dispositions.length-written});
  }
  const errors=dispositions.filter(row=>row.reason&&row.reason!=='DIRECTORY_MARKER').map(({key,reason})=>({key,code:reason}));
  for(const row of dispositions)if(row.metadataWarning)errors.push({key:row.key,code:row.metadataWarning});
  const complete=inventory.complete&&!errors.length;
  const stats={expectedItems:inventory.files.length,expectedBytes,written,sourceBytes,archivedBytes,tagged,errors:errors.length};
  const scope={provider:source.provider,accountId:source.accountId,bucketName:source.bucketName,prefix:source.prefix};
  const summary={schema:'click2cloud.directory-download/1',...job,source:scope,mode,outputName,complete,
    inventory:{complete:inventory.complete,pages:inventory.pages,code:inventory.code??null,consistency:'paginated-list-with-strong-etag-and-size-checked-reads'},
    stats,errors,objects:dispositions,evidence:{source:'SOURCE_LISTED',entries:'ZIP_ENTRY_WRITTEN',delivery:'UNCONFIRMED_AT_RECEIPT_CREATION',unexpectedEntries:[]}
  };
  if(mode!=='original')await zip.json('_click2cloud/manifest.json',{
    schema:'click2cloud.download-manifest/1',source:scope,mode,complete,stats,errors,
    files:dispositions.map(({key,archive,sidecar,state,mode})=>({key,path:archive?.path,sidecar:sidecar?.path,state,mode}))
  });
  if(recursive)await zip.json('_click2cloud/'+job.receiptName,summary);
  const bytes=await zip.finish();
  return {state:complete?'completed':'partial',evidence:'ARCHIVE_FINALIZED',bytes,files:written,errors:errors.length,...(recursive?{receiptName:job.receiptName}:{})};
}
