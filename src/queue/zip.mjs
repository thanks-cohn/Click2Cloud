import {incrementalSHA256} from '../recorder/archive-stream.mjs';
import {zipWriter} from '../explorer/download-archive.mjs';

const encoder = new TextEncoder();
export function createHistoryZip(write, signal) {
  const archive = zipWriter(write,signal);
  return {
    async entry(filename, chunks) {
      const hash=incrementalSHA256();
      let peakChunkBytes=0;
      const result=await archive.add(filename,async send=>{
        for await(const chunk of chunks){
          const bytes=typeof chunk==='string'?encoder.encode(chunk):chunk;
          hash.update(bytes);
          peakChunkBytes=Math.max(peakChunkBytes,bytes.length);
          await send(bytes);
        }
      });
      return {filename,bytes:result.size,sha256:hash.digest(),peakChunkBytes};
    },
    finish:archive.finish
  };
}

// The file returned by OPFS is disk backed. A lock keeps another Shelf from
// reclaiming a staged download while it is still being written or transferred.
export async function withHistoryDownload(filename, write, {signal, download} = {}) {
  return navigator.locks.request('redown-history-file-export', {signal}, async () => {
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle('redown-history-transfer', {create:true});
    const staging = 'transfer';
    const handle = await directory.getFileHandle(staging, {create:true});
    const writer = await handle.createWritable();
    let url;
    try {
      const receipt = await write(bytes => writer.write(bytes));
      signal?.throwIfAborted();
      await writer.close();
      const file = await handle.getFile();
      if (receipt.bytes !== file.size) throw Error('HISTORY_DOWNLOAD_SIZE_MISMATCH');
      // An untyped OPFS File is treated as text by Chromium and can have its
      // requested suffix rewritten. A typed slice retains the file-backed bytes.
      url = URL.createObjectURL(file.slice(0,file.size,'application/octet-stream'));
      if (download) await download(url, filename);
      else await saveDownload(url, filename, signal);
      return receipt;
    } finally {
      if (url) URL.revokeObjectURL(url);
      await writer.abort().catch(() => {});
      await directory.removeEntry(staging).catch(() => {});
    }
  });
}

async function saveDownload(url, filename, signal) {
  signal?.throwIfAborted();
  const id = await chrome.downloads.download({url, filename});
  await new Promise((resolve, reject) => {
    function finish(error) {
      chrome.downloads.onChanged.removeListener(onChange);
      signal?.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve();
    }
    function abort() {
      void chrome.downloads.cancel(id).catch(() => {});
      finish(signal.reason);
    }
    function check(state) {
      if (state === 'complete') finish();
      else if (state === 'interrupted') finish(Error('HISTORY_DOWNLOAD_INTERRUPTED'));
    }
    function onChange(delta) {
      if (delta.id === id && delta.state) check(delta.state.current);
    }
    chrome.downloads.onChanged.addListener(onChange);
    signal?.addEventListener('abort', abort, {once:true});
    if (signal?.aborted) abort();
    void chrome.downloads.search({id}).then(([item]) => {
      if (item) check(item.state);
      else finish(Error('HISTORY_DOWNLOAD_UNAVAILABLE'));
    }, finish);
  });
}
