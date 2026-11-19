// Runs the production File API, R2 listing adapter and local inventory in Chromium.
// The provider pages are synthetic REST responses. No Cloudflare account is used.
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(process.env.C2C_SEARCH_BENCH ?? '/tmp/c2c-filename-search-benchmark.json');
const stepOne = 'ccf9223';
const coldSamples = positiveInteger('C2C_SEARCH_COLD_SAMPLES', 7);
const warmRounds = positiveInteger('C2C_SEARCH_WARM_ROUNDS', 5);
const providerDelayMs = Number(process.env.C2C_SEARCH_PROVIDER_DELAY_MS ?? 5);
assert(Number.isFinite(providerDelayMs) && providerDelayMs >= 0, 'Provider delay must be nonnegative');
const scenarios = [
  {name:'100-flat', inventoryEntries:100, scopes:1, directoryEntries:100},
  {name:'10000-flat', inventoryEntries:10000, scopes:1, directoryEntries:10000},
  {name:'1000000-partitioned', inventoryEntries:1000000, scopes:100, directoryEntries:10000, prefix:'partition-042/'},
  {name:'1000000-flat-capacity', inventoryEntries:1000000, scopes:1, directoryEntries:1000000, bounded:true}
];
const selected = (process.env.C2C_SEARCH_BENCH_CELLS ?? '').split(',').filter(Boolean);
const cells = selected.length ? scenarios.filter(cell => selected.includes(cell.name)) : scenarios;
assert.equal(cells.length, selected.length || scenarios.length, 'Unknown or duplicate benchmark scenario');

function positiveInteger(variable, fallback) {
  const value = Number(process.env[variable] ?? fallback);
  assert(Number.isSafeInteger(value) && value > 0, variable + ' must be a positive integer');
  return value;
}

const sourcePaths = [
  'src/explorer/index.mjs', 'src/explorer/file-api.mjs', 'src/explorer/r2-adapter.mjs',
  'src/explorer/search-file-api.mjs', 'src/explorer/directory-search.mjs', 'src/explorer/directory-inventory-store.mjs'
];
const git = (...args) => execFileSync('git', args, {cwd:root, encoding:'utf8'}).trim();
const source = Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, createHash('sha256').update(await readFile(resolve(root,path))).digest('hex')])));
assert(!git('show', `${stepOne}:src/explorer/file-api.mjs`).includes('searchDirectoryNames'), 'Unexpected Step 1 search baseline');

const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://fixture').pathname;
    if (path === '/') return response.writeHead(200, {'Content-Type':'text/html'}).end('<title>Filename search benchmark</title>');
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root) || !file.endsWith('.mjs')) return response.writeHead(404).end();
    response.writeHead(200, {'Content-Type':'text/javascript'}).end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});

const evidence = {
  evidenceClass:'Production File API and IndexedDB in local Chromium with a synthetic paged R2 REST listing',
  baseline:{commit:git('rev-parse',stepOne), filenameSearch:'absent'},
  code:{head:git('rev-parse','HEAD'), sha256:source},
  methodology:{
    coldSamples, warmRounds, providerDelayMs, maxRecordsPerProviderPage:1000,
    cold:'A new database and search owner for each sample. Record first response and total time to real completion or explicit limits.',
    warm:'Restart the inventory and search owner with the last saved IndexedDB, then rotate independent substring queries.',
    partitioned:'Generate pages on demand for the specified 10,000-child directory in the synthetic million-entry bucket. No recursive listing.',
    flatCapacity:'Use the released cache and scan limits. Incomplete searches are measured without treating an unseen late hit as absent.',
    storage:'Chromium isolated-origin quota usage estimate after the last cold fill; this includes IndexedDB allocation overhead.',
    memory:'Chromium JS heap sampled every 5 ms during each operation; renderer-only estimate excludes the browser database process and brief unsampled peaks.',
    avoided:'The number of provider calls a complete re-list would require for the exact directory, minus measured warm provider calls. No live R2 latency is inferred.'
  },
  cells:[]
};

let browser;
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
try {
  browser = await chromium.launch({
    executablePath:process.env.C2C_CHROME_EXECUTABLE ?? '/usr/bin/chromium',
    headless:true,
    args:['--no-sandbox','--enable-precise-memory-info','--js-flags=--expose-gc']
  });
  evidence.browser = browser.version();
  for (const cell of cells) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      const sample = await page.evaluate(runCell, {cell, coldSamples, warmRounds, providerDelayMs});
      evidence.cells.push(sample);
      console.log(JSON.stringify({name:sample.name,cold:sample.cold.durationMs,warm:sample.warm.durationMs,complete:sample.complete,bytes:sample.storage.chromiumUsageBytes}));
    } finally {
      await context.close();
    }
  }
} catch (error) {
  evidence.error = error.stack;
  throw error;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  await mkdir(dirname(output), {recursive:true});
  await writeFile(output, JSON.stringify(evidence,null,2)+'\n');
}

async function runCell({cell, coldSamples, warmRounds, providerDelayMs}) {
  const [{createClick2CloudFileApi},{attachFilenameSearch},{createDirectoryInventoryStore}] = await Promise.all([
    import('/src/explorer/index.mjs'), import('/src/explorer/search-file-api.mjs'), import('/src/explorer/directory-inventory-store.mjs')
  ]);
  const size = cell.directoryEntries;
  const source = {provider:'cloudflare', connectionId:'cloudflare:benchmark', accountId:'benchmark', bucketName:'search-benchmark', prefix:cell.prefix ?? ''};
  const dbName = 'c2c-filename-benchmark';
  const pageSize = 50;
  let requests = 0;

  // Numeric prefixes make page boundaries deterministic. Each deliberately
  // selected substring is independently checked against its assigned slots.
  function fixtureEntry(index) {
    const id = String(index).padStart(7,'0');
    if (index === size - 1) return {key:source.prefix+id+'-Needle-Tail.txt', folder:false};
    if (index % 211 === 7) return {key:source.prefix+id+'-Contact-Sheets/', folder:true, marker:index%2===0};
    if (index % 113 === 11) return {key:source.prefix+id+'-SE\u0301RIE-CAFE\u0301.json', folder:false};
    if (index % 137 === 13) return {key:source.prefix+id+'-Archive-Report-2026.pdf', folder:false};
    const names = ['team-invoice.csv','IMG-0374.jpeg','night-meeting-notes.txt','kitchen-sample.mp4','diagram-draft.svg','IMG-9934.jpeg','monthly-backup.zip','travel-receipts.pdf'];
    return {key:source.prefix+id+'-'+names[index % names.length], folder:false};
  }

  const noOtherTransport = () => { throw new Error('Unexpected non-listing transport'); };
  const fileApi = createClick2CloudFileApi({send:noOtherTransport,http:{boundedFetch:noOtherTransport,async request(path,{signal}={}) {
    signal?.throwIfAborted();
    const request = new URL(path,'https://fixture.invalid');
    if (request.pathname !== '/accounts/benchmark/r2/buckets/search-benchmark/objects' || request.searchParams.get('delimiter') !== '/' || (request.searchParams.get('prefix') ?? '') !== source.prefix) throw new Error('Listing escaped the explicit directory');
    requests++;
    const offset = Number(request.searchParams.get('cursor') ?? 0);
    const end = Math.min(size, offset + 1000);
    const objects = [], delimited = [];
    for (let index=offset; index<end; index++) {
      const {key,folder,marker} = fixtureEntry(index);
      if (folder && !marker) delimited.push(key);
      else objects.push({key, size:folder?0:1900+(index%26107), etag:`fixture-${index}`, uploaded:'2026-11-18T00:00:00.000Z'});
    }
    if (providerDelayMs) await new Promise(resolve => setTimeout(resolve,providerDelayMs));
    signal?.throwIfAborted();
    return Response.json({success:true,result:{objects,delimited,truncated:end<size,cursor:end<size?String(end):''}});
  }}});

  function start() {
    const store = createDirectoryInventoryStore({dbName});
    const api = attachFilenameSearch(fileApi,{store,oauth:{authority:async () => ({
      sessionId:'fixture-authorized-session',accounts:[{id:'benchmark'}],
      scopeEvidence:'provider-returned',scopes:['workers-r2-bucket-item.read']
    })}});
    return {store,async search(query,pageToken){
      const result = await api.run('searchDirectoryNames',{source,query,pageSize,...(pageToken?{pageToken}:{})});
      if (result.state !== 'completed') throw new Error('Search File API failed: '+(result.code??result.error??result.state));
      return result.data;
    }};
  }

  async function removeDatabase() {
    await new Promise((resolve,reject) => {
      const deletion = indexedDB.deleteDatabase(dbName);
      deletion.onsuccess = resolve;
      deletion.onerror = () => reject(deletion.error);
      deletion.onblocked = () => reject(new Error('Benchmark inventory connection leaked'));
    });
  }

  async function inventorySize() {
    const db = await new Promise((resolve,reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve,reject) => {
        const transaction = db.transaction(['entries','directories'],'readonly');
        const count = transaction.objectStore('entries').count();
        const directories = transaction.objectStore('directories').getAll();
        transaction.onabort = () => reject(transaction.error);
        transaction.oncomplete = () => resolve({
          indexedEntries:count.result,
          estimatedPolicyBytes:directories.result.reduce((sum,item)=>sum+(item.published?.bytes??0)+(item.working?.bytes??0),0)
        });
      });
    } finally {
      db.close();
    }
  }

  const heap = () => performance.memory?.usedJSHeapSize ?? null;
  async function measure(action) {
    globalThis.gc?.();
    const heapBefore = heap();
    let peakHeap = heapBefore;
    const sampleHeap = () => {if (heapBefore !== null) peakHeap = Math.max(peakHeap,heap());};
    const sampler = setInterval(sampleHeap,5);
    const calls = requests, start = performance.now();
    try {
      const value = await action();
      const durationMs = performance.now() - start;
      sampleHeap();
      return {...value,durationMs, providerCalls:requests-calls, sampledPeakHeapBytes:peakHeap, sampledHeapGrowthBytes:heapBefore===null?null:peakHeap-heapBefore};
    } finally {
      clearInterval(sampler);
    }
  }

  const specialCounts = {folder:0, unicode:0, report:0};
  for (let index=0; index<size-1; index++) {
    if (index%211===7) specialCounts.folder++;
    else if (index%113===11) specialCounts.unicode++;
    else if (index%137===13) specialCounts.report++;
  }
  const warmQueries = [
    {query:'act-SHEE', name:'folder substring', total:specialCounts.folder},
    {query:'RIE-CAFÉ', name:'composed to decomposed Unicode', total:specialCounts.unicode},
    {query:'ORT-2026.p', name:'case and extension substring', total:specialCounts.report},
    {query:'needle-tail', name:'final provider page', total:1},
    {query:'absent-substring-zzzzz', name:'complete miss', total:0}
  ];
  const folded = value => value.normalize('NFC').toLowerCase();
  function verify(result, query, expected) {
    const keys = new Set();
    for (const entry of result.entries) {
      const id = Number(entry.key.slice(source.prefix.length).split('-')[0]);
      const fixture = Number.isSafeInteger(id) && id >= 0 && id < size && fixtureEntry(id);
      if (!fixture || fixture.key !== entry.key || fixture.folder !== entry.folder || keys.has(entry.key) || !folded(entry.key.slice(source.prefix.length)).includes(folded(query))) throw new Error('Incorrect exact key/folder match for '+query);
      keys.add(entry.key);
    }
    if (result.complete && (keys.size !== Math.min(expected,pageSize) || (expected>pageSize) !== Boolean(result.nextPageToken))) throw new Error('Wrong complete match count/continuation for '+query+' ('+keys.size+' of '+expected+')');
    return keys.size;
  }

  const cold = [], warm = [];
  const initialUsage = (await navigator.storage.estimate()).usage ?? 0;
  let owner;
  for (let i=0; i<coldSamples; i++) {
    await removeDatabase();
    owner = start();
    const {query,total} = warmQueries[3];
    cold.push(await measure(async () => {
      const started = performance.now();
      let result=await owner.search(query), responses=1;
      const firstResponseMs = performance.now()-started;
      const tokens = new Set();
      while (!result.complete && result.nextPageToken && responses<48) {
        if (tokens.has(result.nextPageToken)) throw new Error('Search continuation made no progress');
        tokens.add(result.nextPageToken);
        result=await owner.search(query,result.nextPageToken);
        responses++;
      }
      const matches = verify(result,query,total);
      if (!cell.bounded && (!result.complete || matches!==1)) throw new Error('Cold search did not reach the final provider page');
      return {firstResponseMs,responses,complete:result.complete,matches,source:result.source,code:result.code??null};
    }));
    await owner.store.close();
  }

  const inventory = await inventorySize();
  if (!cell.bounded && inventory.indexedEntries!==size) throw new Error('Persistent inventory row count differs from scoped provider entries');
  const storage = {chromiumUsageBytes:Math.max(0,((await navigator.storage.estimate()).usage??0)-initialUsage),...inventory};
  owner = start();
  for (let i=0; i<warmRounds; i++) for (const {name,query,total} of warmQueries) {
    const observation = await measure(async () => {
      const result=await owner.search(query);
      const matches=verify(result,query,total);
      if (!cell.bounded && (!result.complete || result.stale || result.source!=='cache')) throw new Error('Fresh persisted query did not use complete IndexedDB data');
      return {name,query,complete:result.complete,stale:result.stale,matches,expectedInFullDirectory:total,source:result.source,code:result.code??null};
    });
    if (!cell.bounded && observation.providerCalls!==0) throw new Error('Warm persisted query called the provider');
    warm.push(observation);
  }
  const paginatedQuery = !cell.bounded && warmQueries.find(item=>item.total>pageSize);
  let paginatedResults;
  if (paginatedQuery) {
    const before = requests;
    const first = await owner.search(paginatedQuery.query);
    const second = await owner.search(paginatedQuery.query,first.nextPageToken);
    const keys = new Set([...first.entries,...second.entries].map(entry=>entry.key));
    if (!first.complete || !second.complete || second.nextPageToken || keys.size!==paginatedQuery.total || requests!==before) throw new Error('Search pagination did not enumerate distinct cached matches');
    paginatedResults = {query:paginatedQuery.query, matches:keys.size, providerCalls:requests-before};
  }
  await owner.store.close();
  await removeDatabase();

  const distribution = values => {
    const sorted = values.filter(value=>value!==null).toSorted((a,b)=>a-b);
    const percentile = p => sorted[Math.ceil(sorted.length*p)-1] ?? null;
    return {samples:sorted.length,p50:percentile(.5),p95:percentile(.95),max:sorted.at(-1)??null};
  };
  const summarize = observations => ({
    durationMs:distribution(observations.map(r=>r.durationMs)),
    providerCalls:distribution(observations.map(r=>r.providerCalls)),
    sampledPeakHeapBytes:distribution(observations.map(r=>r.sampledPeakHeapBytes)),
    sampledHeapGrowthBytes:distribution(observations.map(r=>r.sampledHeapGrowthBytes)),
    observations
  });
  return {...cell, complete:cold.every(s=>s.complete)&&warm.every(s=>s.complete), storage, paginatedResults,
    cold:{...summarize(cold),firstResponseMs:distribution(cold.map(r=>r.firstResponseMs))}, warm:summarize(warm),
    fullRelistCalls:Math.ceil(size/1000), avoidedPerCompleteWarmQuery:warm.filter(s=>s.complete).length ? distribution(warm.filter(s=>s.complete).map(s=>Math.ceil(size/1000)-s.providerCalls)) : null};
}
