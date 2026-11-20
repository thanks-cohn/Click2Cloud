import {objectETag} from './file-api.mjs';

const encoder = new TextEncoder();
export const TAG_KEY = 'click2cloud-tags';
export const TAG_BUDGET = 8092;
export const MAX_EXPORT_FILES = 20000;
export const exportModes = Object.freeze(['original', 'tags', 'metadata']);
const privateField = /token|secret|signature|password|authorization|cookie|credential|api[-_]?key|^x-amz-|^x-goog-|diagnostic|source.*url|page.*url/i;
const privateValue = /(?:bearer\s+\S+|[?&](?:[^=]*(?:token|signature|credential|secret|key|auth)[^=]*)=)/i;

export function exportError(code) { return Object.assign(Error(code), {code}); }
export function normalizedTags(tags) {
  return [...new Set(tags.map(value => {
    if (typeof value !== 'string' || /[\x00-\x1f\x7f]/.test(value)) throw exportError('TAGS_INVALID');
    return value.normalize('NFC').trim();
  }).filter(Boolean))];
}
export function metadataBudget(metadata, tags) {
  const custom = {...metadata, [TAG_KEY]: JSON.stringify(normalizedTags(tags))};
  const used = encoder.encode(JSON.stringify(custom)).length;
  return {used, limit: TAG_BUDGET, remaining: Math.max(0, TAG_BUDGET-used), reserved: 100, fits: used <= TAG_BUDGET};
}
export function objectTags(object) {
  const metadata = object.customMetadata ?? object.custom_metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {tags: [], availability: 'unobserved'};
  const value = metadata[TAG_KEY];
  const tags = value === undefined ? [] : JSON.parse(value);
  if (!Array.isArray(tags)) throw exportError('TAGS_INVALID');
  return {tags: normalizedTags(tags), availability: 'observed'};
}
export function safeObjectMetadata(object, source) {
  const custom = object.customMetadata ?? object.custom_metadata, http = object.httpMetadata ?? object.http_metadata;
  const missing = [], redacted = [];
  const clean = (record, field) => {
    if (!record || typeof record !== 'object') { missing.push(field); return null; }
    return Object.fromEntries(Object.entries(record).filter(([key, value]) => {
      const keep = typeof value === 'string' && !privateField.test(key) && !privateValue.test(value);
      if (!keep) redacted.push(field);
      return keep;
    }));
  };
  const text = (...values) => values.find(value => typeof value === 'string' && !privateValue.test(value)) ?? null;
  const data = {
    schema: 'click2cloud.object-metadata/1', provider: source.provider, bucket: source.bucketName, key: object.key,
    size: Number.isSafeInteger(Number(object.size)) && object.size != null ? Number(object.size) : null,
    contentType: text(object.contentType, object.content_type, http?.contentType), etag: text(object.etag),
    version: text(object.version), lastModified: text(object.uploaded, object.last_modified),
    httpMetadata: clean(http,'httpMetadata'), customMetadata: clean(custom,'customMetadata')
  };
  for (const name of ['contentType','etag','version','lastModified']) if (data[name] === null) missing.push(name);
  return {...data, missing: [...missing,'publicUrlMappings'], redacted: [...new Set(redacted)]};
}

export function verifiedDomains(records) {
  if (!Array.isArray(records)) throw exportError('DOMAIN_LIST_UNAVAILABLE');
  const active = records.filter(item => item?.enabled === true && item.status?.ownership === 'active' && item.status?.ssl === 'active');
  return [...new Set(active.map(item => domainName(item.domain)).filter(Boolean))].sort();
}
export function domainName(value) {
  if (typeof value !== 'string' || !/^[a-z\d.-]+$/i.test(value)) return null;
  const domain = value.toLowerCase().replace(/\.$/,'');
  return domain.length <= 253 && domain.includes('.') && /[a-z]/.test(domain.split('.').at(-1)) &&
    domain.split('.').every(label => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/.test(label)) ? domain : null;
}
export const developmentalDomain = domain => typeof domain === 'string' && domain.endsWith('.r2.dev');
export function verifiedDevelopmentDomain(record) {
  const domain = domainName(record?.domain);
  return record?.enabled === true && developmentalDomain(domain) ? domain : null;
}

const mediaExtensions = {
  images: /\.(apng|avif|bmp|gif|heic|heif|ico|jpe?g|jfif|jxl|png|svgz?|tiff?|webp)$/i,
  audio: /\.(aac|aiff?|alac|amr|flac|m4a|mp3|oga|ogg|opus|wav|weba|wma)$/i,
  video: /\.(3gp|avi|flv|m4v|mkv|mov|mp4|mpe?g|ogv|webm|wmv)$/i
};
export function directoryUrlFiles(source, objects, types) {
  return objects.filter(object => {
    const {key} = object;
    if (object.folder || !key.startsWith(source.prefix)) return false;
    const relative = key.slice(source.prefix.length);
    if (!relative || relative.includes('/')) return false;
    if (types.has('all')) return true;
    const family = object.contentType?.toLowerCase().split('/')[0];
    const known = {image:'images',audio:'audio',video:'video'}[family];
    // Prefer a provider media MIME type. Extensions cover generic or missing MIME metadata.
    return known ? types.has(known) : [...types].some(type => mediaExtensions[type]?.test(relative));
  });
}
export function objectUrls(source, key, domains) {
  const valid = typeof key === 'string' && key.startsWith(source.prefix) && !key.endsWith('/') &&
    key.split('/').every(part => part && part !== '.' && part !== '..' && !part.includes('\\'));
  const urls = valid ? [...new Set(domains)].map(domain => ({
    url: 'https://' + domain + '/' + key.split('/').map(encodeURIComponent).join('/'),
    domain, status: 'verified-domain', provenance: developmentalDomain(domain)
      ? 'cloudflare-r2-enabled-managed-domain' : 'cloudflare-r2-active-custom-domain'
  })) : [];
  return {objectId: JSON.stringify([source.provider,source.accountId,source.bucketName,key]), bucket: source.bucketName,
    key, relativePath: key.slice(source.prefix.length), urlCount: urls.length, urls};
}
export function simpleDirectoryUrls(files, preferCustom) {
  const urls = new Map();
  for (const file of files) {
    const choice = preferCustom ? file.urls.find(item => !developmentalDomain(item.domain)) : file.urls[0];
    if (choice) urls.set(choice.url, choice);
  }
  const links = [...urls.values()];
  return {text:links.length ? links.map(item => item.url).join('\n')+'\n' : '',
    count:links.length, missing:files.length-links.length, developmental:links.filter(item => developmentalDomain(item.domain)).length};
}
export function formatUrlExport(source, files, complete, format) {
  const counts = {files: files.length, urls: files.reduce((sum,file) => sum + file.urlCount,0), multiUrlFiles: files.filter(file => file.urlCount > 1).length};
  const header = {schema:'click2cloud.directory-urls/1', source, complete, counts};
  if (format === 'json') return JSON.stringify({...header,files},null,2);
  if (format === 'txt') return [JSON.stringify(header),...files.flatMap(({urls,...file}) =>
    ['FILE '+JSON.stringify(file),...urls.map(url => JSON.stringify(url)),'END FILE'])].join('\n')+'\n';
  if (format !== 'csv') throw exportError('URL_EXPORT_FORMAT_INVALID');
  const cols = ['objectId','bucket','key','relativePath','urlCount','urlIndex','url','domain','status','provenance','complete','fileCount','urlTotal','multiUrlFiles','scope'];
  const quote = value => '"' + String(value ?? '').replaceAll('"','""') + '"';
  const summary = [null,source.bucketName,null,null,null,null,null,null,'summary',null,complete,counts.files,counts.urls,counts.multiUrlFiles,JSON.stringify(source)];
  const rows = files.flatMap(file => (file.urls.length ? file.urls : [{status:'no-urls'}]).map((url,index) => [
    file.objectId,file.bucket,file.key,file.relativePath,file.urlCount,file.urlCount?index+1:null,
    url.url,url.domain,url.status,url.provenance,complete,counts.files,counts.urls,counts.multiUrlFiles,JSON.stringify(source)
  ]));
  return [cols,...(rows.length?rows:[summary])].map(row => row.map(quote).join(',')).join('\r\n')+'\r\n';
}
export async function listExportInventory(list, source, {signal, onProgress} = {}) {
  const files = new Map(), seen = new Set();
  let cursor, pages = 0;
  do {
    signal?.throwIfAborted();
    let page;
    try { page = await list(source,cursor); }
    catch (error) {
      signal?.throwIfAborted();
      if (!pages) throw error;
      return {files:[...files.values()],complete:false,pages,code:error.code??'EXPORT_LIST_FAILED'};
    }
    pages++;
    for (const object of page.entries) {
      if (typeof object.key !== 'string' || !object.key.startsWith(source.prefix)) throw exportError('EXPORT_SCOPE_MISMATCH');
      if (files.has(object.key)) throw exportError('EXPORT_DUPLICATE_SOURCE');
      if (files.size >= MAX_EXPORT_FILES) throw exportError('EXPORT_FILE_LIMIT');
      files.set(object.key, object);
    }
    onProgress?.({scanned:files.size});
    cursor = page.nextCursor;
    if (cursor && (seen.has(cursor) || pages >= MAX_EXPORT_FILES)) return {files:[...files.values()],complete:false,pages,code:'EXPORT_PAGINATION_INVALID'};
    seen.add(cursor);
  } while (cursor);
  return {files:[...files.values()],complete:true,pages};
}

export function assertExportIdentity(expected, observed) {
  if (objectETag(expected.etag) !== objectETag(observed.etag) || Number(expected.size) !== Number(observed.size) ||
      (expected.version && expected.version !== observed.version)) throw exportError('OBJECT_CHANGED');
}
