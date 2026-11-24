import {imageDimensions, imageType} from '../../explorer/image-preview.mjs';

export const retainedPreviewLimit = 256 * 1024;
export const livePreviewLimit = 4 * 1024 * 1024;
const imageMimes = {png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', avif:'image/avif'};
const allowedMimes = new Set(Object.values(imageMimes));
export const previewError = code => Object.assign(Error(code),{code});

export function previewMime(mime, filename) {
  const declared = typeof mime === 'string' ? mime.split(';')[0].trim().toLowerCase() : '';
  if (allowedMimes.has(declared)) return declared;
  if (declared && declared !== 'application/octet-stream') return null;
  const extension = typeof filename === 'string' && /\.([a-z]+)$/i.exec(filename)?.[1].toLowerCase();
  return Object.hasOwn(imageMimes,extension) ? imageMimes[extension] : null;
}

export function encodePreview(bytes, mime) {
  if (typeof bytes.toBase64 === 'function') return `data:${mime};base64,${bytes.toBase64()}`;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset,offset+8192));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

// AVIF dimensions are declared in the image properties in the ISO BMFF meta box.
function avifDimensions(bytes) {
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const type = offset => String.fromCharCode(...bytes.subarray(offset,offset+4));
  const ftypEnd = bytes.length >= 16 && view.getUint32(0);
  if (!ftypEnd || ftypEnd < 16 || ftypEnd > Math.min(4096,bytes.length) || type(4) !== 'ftyp') throw previewError('IMAGE_BYTES_INVALID');
  const isBrand = at => ['avif','avis'].includes(type(at));
  let brand = isBrand(8);
  for (let at = 16; !brand && at+4 <= ftypEnd; at+=4) brand = isBrand(at);
  if (!brand) throw previewError('IMAGE_BYTES_INVALID');
  const levels = ['meta','iprp','ipco','ispe'];
  let dimensions, boxes = 0;
  function scan(start,end,depth) {
    for (let at = start; at+8 <= end;) {
      if (++boxes > 2048) throw previewError('IMAGE_HEADER_UNAVAILABLE');
      let size = view.getUint32(at), header = 8;
      if (size === 1 && at+16 <= end && !view.getUint32(at+8)) {
        size = view.getUint32(at+12);
        header = 16;
      }
      if (size === 0) size = end-at;
      const stop = at+size, body = at+header;
      if (size < header || stop > end) throw previewError('IMAGE_BYTES_INVALID');
      if (type(at+4) === levels[depth]) {
        if (depth < 3) scan(body+(depth === 0 ? 4 : 0),stop,depth+1);
        else if (body+12 <= stop) {
          const size = {width:view.getUint32(body+4),height:view.getUint32(body+8)};
          checkDimensions(size);
          dimensions = size;
        }
      }
      at = stop;
    }
  }
  scan(ftypEnd,bytes.length,0);
  if (!dimensions) throw previewError('IMAGE_HEADER_UNAVAILABLE');
  return dimensions;
}

function checkDimensions({width,height}) {
  if (!width || !height || width > 8192 || height > 8192 || width*height > 16*1024*1024) {
    throw previewError('PREVIEW_DIMENSIONS_LIMIT');
  }
}

export function validatePreviewImage(bytes, mime) {
  if (mime === 'image/avif') return avifDimensions(bytes);
  if (imageType(bytes) !== mime) throw previewError('IMAGE_BYTES_INVALID');
  const dimensions = imageDimensions(bytes,mime);
  checkDimensions(dimensions);
  return dimensions;
}

export function decodePreview(data, mime, limit) {
  const prefix = `data:${mime};base64,`;
  if (typeof data !== 'string' || !allowedMimes.has(mime) || !data.startsWith(prefix) ||
      data.length > prefix.length + 4*Math.ceil(limit/3)) throw previewError('IMAGE_BYTES_INVALID');
  let bytes;
  try {
    const base64 = data.slice(prefix.length);
    bytes = typeof Uint8Array.fromBase64 === 'function' ? Uint8Array.fromBase64(base64,{lastChunkHandling:'strict'}) :
      Uint8Array.from(atob(base64), character => character.charCodeAt(0));
  } catch { throw previewError('IMAGE_BYTES_INVALID'); }
  if (bytes.length > limit) throw previewError('PREVIEW_SIZE_LIMIT');
  validatePreviewImage(bytes,mime);
  return bytes;
}
