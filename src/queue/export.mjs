import {createHistoryZip, withHistoryDownload} from './zip.mjs';

const urlFields = ['sourceUrl','hostUrl','originalUrl','remoteUrl','publicUrl','previewUrl'];
function safeExportRecord(record, privacy) {
  const {metadata, ...safe} = record;
  for (const field of urlFields) {
    try {
      const url = new URL(record[field]);
      if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw Error();
      safe[field] = privacy && ['sourceUrl','hostUrl','originalUrl'].includes(field) ? null : url.origin;
    } catch { safe[field] = null; }
  }
  if (privacy) { safe.hostTitle = null; safe.hostname = null; }
  // Provider custom metadata may contain arbitrary opaque strings or JSON.
  return {...safe, metadata:null};
}

export async function writeHistoryExport(store, write, {
  from = 0, end = Number.MAX_SAFE_INTEGER, timezone = 'UTC', privacy = false,
  includeScreenshots = true, format = 'zip', signal, onProgress, sourceCoverage = []
} = {}) {
  return store.snapshot(async () => {
    let total = 0, before, peakBatchRecords = 0, peakTextBytes = 0;
    const providers = {}, outcomes = {}, proofLevels = {};
    const encoder = new TextEncoder();
    const bump = (map, key) => {
      const label = key && /^[a-z0-9_-]{1,80}$/i.test(key) ? key : 'unavailable';
      map[label] = (Object.hasOwn(map,label) ? map[label] : 0) + 1;
    };
    const boundary = {from,end,timezone,includeScreenshots,privacy};
    const kind=includeScreenshots?undefined:'save';
    const expected=(await store.page({from,end,kind})).total;
    async function* records(render) {
      while (true) {
        signal?.throwIfAborted();
        const rows = await store.batch({from,end,before,kind});
        if (!rows.length) return;
        peakBatchRecords = Math.max(peakBatchRecords, rows.length);
        const lines = [];
        for (const row of rows) {
          const record = safeExportRecord(row,privacy);
          lines.push(render(record,total));
          total++;
          bump(providers,record.provider);
          bump(outcomes,record.status);
          bump(proofLevels,record.proofLevel);
        }
        const text = lines.join('');
        peakTextBytes = Math.max(peakTextBytes,text.length * 2 + lines.reduce((n,line)=>n+line.length*2,0));
        if (text) yield text;
        const last = rows.at(-1);
        before = [last.sortAt,last.recordId];
        onProgress?.({total,expected});
      }
    }
    if (format !== 'zip') {
      let bytes = 0;
      const send = async text => {
        signal?.throwIfAborted();
        const chunk = encoder.encode(text);
        await write(chunk);
        bytes += chunk.length;
      };
      const quote = v => {
        let value = String(v ?? '');
        if (/^[=+@\-\r\t]/.test(value)) value = "'" + value;
        return '"' + value.replaceAll('"','""') + '"';
      };
      const keys = ['recordId','attemptId','provider','kind','filename','status','terminalAt','destination','proofLevel','sourceUrl','hostUrl','remoteUrl'];
      if (format === 'json') await send('[');
      if (format === 'csv') await send(keys.join(',')+',recordJson\r\n');
      for await (const chunk of records((row,index) => {
        if (format === 'csv') return [...keys.map(key=>quote(typeof row[key]==='object'?JSON.stringify(row[key]):row[key])),
          quote(JSON.stringify(row))].join(',')+'\r\n';
        return (format==='json' && index ? ',' : '')+JSON.stringify(row)+(format==='jsonl' ? '\n' : '');
      })) await send(chunk);
      if (format === 'json') await send(']');
      if (expected !== total) throw Error('HISTORY_EXPORT_COUNT_MISMATCH');
      return {bytes,total,peakBatchRecords,peakTextBytes};
    }
    const zip = createHistoryZip(write, signal);
    const file = await zip.entry('history.jsonl',records(row=>JSON.stringify(row)+'\n'));
    if (expected !== total) throw Error('HISTORY_EXPORT_COUNT_MISMATCH');
    const manifest = {
      schema:'redown.history-export/1', exporterVersion:1, createdAt:new Date().toISOString(),
      selection:boundary, snapshot:'Archive locked for duration of indexed read', sort:['sortAt DESC','recordId DESC'],
      expectedRecords:expected, writtenRecords:total, providers, outcomes, proofLevels, sourceCoverage,
      urlPolicy:'Only HTTP(S) origins are included. Credential-bearing URLs and arbitrary provider metadata are excluded.',
      files:[{name:file.filename, bytes:file.bytes, sha256:file.sha256}]
    };
    await zip.entry('manifest.json',[JSON.stringify(manifest,null,2)+'\n']);
    const bytes = await zip.finish();
    return {bytes,total,peakBatchRecords,peakTextBytes,peakChunkBytes:file.peakChunkBytes,manifest};
  });
}

export function downloadHistoryExport(store, options = {}) {
  return withHistoryDownload('redown-history.'+(options.format ?? 'zip'),
    write => writeHistoryExport(store,write,options),options);
}
