import {writeHistoryZip} from '../src/history-v2/zip.mjs';

async function downloadFile(file, filename, downloads, signal) {
  const url = URL.createObjectURL(file);
  let id;
  let wake = () => {};
  const notify = change => { if(change.id===id) wake(); };
  const cancel = () => wake();
  downloads.onChanged.addListener(notify);
  signal?.addEventListener('abort',cancel);
  try {
    signal?.throwIfAborted();
    id = await downloads.download({url,filename,saveAs:false,conflictAction:'uniquify'});
    if(!Number.isInteger(id)) throw Error('HISTORY_DOWNLOAD_UNAVAILABLE');
    for(;;) {
      if(signal?.aborted) {
        await downloads.cancel(id).catch(()=>{});
        signal.throwIfAborted();
      }
      // Register before reading to avoid losing a transition between search and wait.
      const changed = new Promise(resolve => { wake=resolve; });
      const [item] = await downloads.search({id});
      if(item?.state==='complete') return id;
      if(item?.state!=='in_progress') throw Error('HISTORY_DOWNLOAD_INTERRUPTED');
      if(signal?.aborted)continue;
      await changed;
    }
  } finally {
    signal?.removeEventListener('abort',cancel);
    downloads.onChanged.removeListener(notify);
    URL.revokeObjectURL(url);
  }
}

// FileSystemFileHandle.getFile returns a disk-backed File. There is no ZIP-sized JS Blob.
export function downloadHistoryZip(records, metadata, options={}) {
  return deliverHistoryFile('zip',writer=>writeHistoryZip(writer,records,metadata,options),options);
}

export async function deliverHistoryFile(format, write, {signal,downloads=chrome.downloads}={}) {
  if(!['zip','json','jsonl','csv'].includes(format))throw Error('HISTORY_FORMAT_INVALID');
  return navigator.locks.request('click2cloud-history-v2-zip', {signal}, async () => {
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle('history-v2-export-staging',{create:true});
    // A closed Shelf can leave staging files. The origin lock proves no live writer owns these.
    for await(const [name] of directory.entries()) if(/\.(zip|jsonl?|csv)$/.test(name)) await directory.removeEntry(name);
    const name = `${crypto.randomUUID()}.${format}`;
    const handle = await directory.getFileHandle(name,{create:true});
    let writer;
    try {
      writer = await handle.createWritable();
      const result = await write(writer);
      signal?.throwIfAborted();
      await writer.close();
      writer = null;
      const file = await handle.getFile();
      if(file.size!==result.archiveBytes) throw Error('HISTORY_ZIP_FILE_MISMATCH');
      const downloadId = await downloadFile(file,'click2cloud-history-v2.'+format,downloads,signal);
      return {...result,downloadId};
    } finally {
      await writer?.abort().catch(()=>{});
      await directory.removeEntry(name).catch(()=>{});
    }
  });
}
