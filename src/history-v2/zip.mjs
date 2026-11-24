// ZIP32, stored entries, UTF-8 names, data descriptors. Await each sink write.
export const zipBlockBytes = 256 * 1024;
const zipLimit = 0xfffffffe;
const encoder = new TextEncoder();
const crcTable = Uint32Array.from({length:256}, (_, byte) => {
  for(let i=0;i<8;i++) byte=(byte>>>1)^((byte&1)?0xedb88320:0);
  return byte;
});
const hex = bytes => [...bytes].map(byte => byte.toString(16).padStart(2,'0')).join('');
function binary(size, signature) {
  const fields = new DataView(new ArrayBuffer(size));
  fields.setUint32(0,signature,true);
  return fields;
}

export async function writeHistoryZip(sink, records, metadata, {signal, onProgress = () => {}} = {}) {
  const entries = [];
  let offset = 0;
  let written = 0;
  const providers = Object.create(null), outcomes = Object.create(null), proofs = Object.create(null);
  const write = async bytes => {
    signal?.throwIfAborted();
    if(offset + bytes.byteLength > zipLimit) throw Error('HISTORY_ZIP_SIZE_LIMIT');
    await sink.write(bytes);
    offset += bytes.byteLength;
  };
  async function entry(filename, chunks) {
    const name = encoder.encode(filename);
    const start = offset;
    const header = binary(30,0x04034b50);
    header.setUint16(4,20,true);
    header.setUint16(6,0x0808,true);
    header.setUint16(12,33,true); // DOS date: 1980-01-01
    header.setUint16(26,name.length,true);
    await write(new Uint8Array(header.buffer));
    await write(name);
    let crc = 0xffffffff, size = 0, used = 0;
    // Chained SHA-256 over fixed blocks. The extra prefix keeps only one digest in memory.
    const block = new Uint8Array(32 + zipBlockBytes);
    async function flush() {
      if(!used) return;
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256',block.subarray(0,32+used)));
      await write(block.subarray(32,32+used));
      block.set(digest);
      used = 0;
    }
    for await(const chunk of chunks) {
      signal?.throwIfAborted();
      const bytes = encoder.encode(chunk);
      if(bytes.length > zipBlockBytes) throw Error('HISTORY_ZIP_RECORD_TOO_LARGE');
      for(let first=0; first<bytes.length;) {
        const count = Math.min(bytes.length-first,zipBlockBytes-used);
        block.set(bytes.subarray(first,first+count),32+used);
        for(let i=first;i<first+count;i++) crc=(crc>>>8)^crcTable[(crc^bytes[i])&255];
        first += count;
        used += count;
        size += count;
        if(used===zipBlockBytes) await flush();
      }
    }
    await flush();
    crc = (crc^0xffffffff)>>>0;
    const descriptor = binary(16,0x08074b50);
    descriptor.setUint32(4,crc,true);
    descriptor.setUint32(8,size,true);
    descriptor.setUint32(12,size,true);
    await write(new Uint8Array(descriptor.buffer));
    entries.push({filename,name,start,size,crc,digest:hex(block.subarray(0,32))});
  }
  async function* lines() {
    for await(const item of records) {
      written++;
      for(const [counts,key] of [[providers,item.provider],[outcomes,item.status],[proofs,item.verification?.level]]) {
        counts[key??'unavailable'] = (counts[key??'unavailable']??0)+1;
      }
      yield JSON.stringify(item)+'\n';
      if(written%512===0) onProgress(written,metadata.expectedRecords);
    }
  }
  await entry('history.jsonl',lines());
  if(written!==metadata.expectedRecords) throw Error('HISTORY_EXPORT_COUNT_MISMATCH');
  const dataset = entries[0];
  const manifest = {
    schemaVersion:1,exporterVersion:1,...metadata,writtenRecords:written,providers,outcomes,proofs,
    sort:['orderAt DESC','recordId DESC'],
    files:[{name:dataset.filename,bytes:dataset.size,crc32:dataset.crc.toString(16).padStart(8,'0'),
      integrity:{algorithm:'SHA-256 chain',blockBytes:zipBlockBytes,initialDigest:'32 zero bytes',digest:dataset.digest}}]
  };
  await entry('manifest.json',[JSON.stringify(manifest)+'\n']);
  const directory = offset;
  for(const {name,start,size,crc} of entries) {
    const header = binary(46,0x02014b50);
    header.setUint16(4,20,true);
    header.setUint16(6,20,true);
    header.setUint16(8,0x0808,true);
    header.setUint16(14,33,true);
    header.setUint32(16,crc,true);
    header.setUint32(20,size,true);
    header.setUint32(24,size,true);
    header.setUint16(28,name.length,true);
    header.setUint32(42,start,true);
    await write(new Uint8Array(header.buffer));
    await write(name);
  }
  const end = binary(22,0x06054b50);
  end.setUint16(8,entries.length,true);
  end.setUint16(10,entries.length,true);
  end.setUint32(12,offset-directory,true);
  end.setUint32(16,directory,true);
  await write(new Uint8Array(end.buffer));
  return {writtenRecords:written,archiveBytes:offset,writerBufferBytes:zipBlockBytes+32};
}
