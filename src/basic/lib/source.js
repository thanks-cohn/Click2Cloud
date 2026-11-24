import { fail, sourceUrl } from "./common.js";
import {encodePreview, retainedPreviewLimit} from './preview.mjs';
import { publicAddress } from "../../../right2cloud-module/src/public-address.mjs";
export const MAX_SOURCE_BYTES = 32 * 1024 * 1024;
const redirectStatus = new Set([301, 302, 303, 307, 308]);

export function publicSource(value) {
  const url = new URL(sourceUrl(value));
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const literal = host.includes(":") || /^\d+(?:\.\d+)*$/.test(host);
  if (literal ? !publicAddress(host) : (
    !host.includes(".") || host.endsWith(".") || /(?:^|\.)(localhost|local|internal|lan|onion|home\.arpa)$/.test(host)
  )) throw fail("SOURCE_PRIVATE_ADDRESS", "Private or local addresses cannot be used for provider saves.");
  url.hash = "";
  return url;
}

export function browserSourceAccess(permissions) {
  return async url => {
    try {
      return await permissions.contains({origins: [url.protocol + "//" + url.hostname + "/*"]});
    } catch {
      throw fail("SOURCE_ACCESS_CHECK_FAILED", "Chrome could not check web source access.",
        "Review REDOWN's site access in Chrome and try the save again.");
    }
  };
}

async function readSource(url, fetch, hasAccess, signal) {
  const permissionRequired = () => fail("SOURCE_PERMISSION_REQUIRED",
    "Chrome has withheld access to the file's website.",
    "Allow REDOWN web source access in Chrome.");
  const redirectError = () => fail("SOURCE_REDIRECT_UNAVAILABLE",
    "The browser could not verify this file redirect.",
    "Select the direct file at its final address.");
  for (let hop = 0; hop <= 5; hop++) {
    signal.throwIfAborted();
    if (!await hasAccess(url)) throw permissionRequired();
    signal.throwIfAborted();
    let response;
    try {
      response = await fetch(url.href, {
        credentials: "omit", redirect: "manual", signal,
        referrerPolicy: "no-referrer", cache: "no-store",
      });
    } catch (error) {
      signal.throwIfAborted();
      if (!await hasAccess(url)) throw permissionRequired();
      throw error;
    }
    if (response.type === "opaqueredirect" || response.redirected) {
      void response.body?.cancel().catch(() => {});
      throw redirectError();
    }
    if (!redirectStatus.has(response.status)) return {response, url};
    const location = response.headers.get("Location");
    void response.body?.cancel().catch(() => {});
    const next = location && URL.parse(location, url);
    if (!next || hop === 5 || (url.protocol === "https:" && next.protocol === "http:"))
      throw redirectError();
    url = publicSource(next.href);
  }
}
const EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "application/zip": ".zip",
  "video/mp4": ".mp4",
  "audio/mpeg": ".mp3",
};
export function sanitizeFilename(value, mime = "application/octet-stream") {
  let name = String(value || "download")
    .normalize("NFC")
    .replace(
      /[\u0000-\u001f\u007f<>:"/\\|?*#%\u202a-\u202e\u2066-\u2069]/g,
      "_",
    )
    .replace(/[. ]+$/, "")
    .replace(/^\.+/, "")
    .trim();
  if (!name) name = "download";
  const ext = /\.[A-Za-z0-9]{1,12}$/.exec(name)?.[0] || EXT[mime] || "";
  let stem = name.endsWith(ext) && ext ? name.slice(0, -ext.length) : name;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) stem = "_" + stem;
  return (stem || "download").slice(0, 150 - ext.length) + ext;
}
function dispositionName(header) {
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header || "");
  if (encoded)
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {}
  return (
    /filename\s*=\s*"([^"]+)"/i.exec(header || "")?.[1] ||
    /filename\s*=\s*([^;]+)/i.exec(header || "")?.[1]?.trim()
  );
}
export async function acquireSource(
  input,
  {
    fetch = globalThis.fetch,
    maxBytes = MAX_SOURCE_BYTES,
    timeoutMs = 45000,
    hasAccess = async () => true,
  } = {},
) {
  const initial = publicSource(input.sourceUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const {response, url} = await readSource(initial, fetch, hasAccess, controller.signal);
    if (!response.ok)
      throw Object.assign(fail(
        "SOURCE_HTTP_ERROR",
        `The source returned HTTP ${response.status}.`,
        "Open the original resource and check access before retrying.",
      ), {httpStatus: response.status});
    if (response.status === 206 || response.headers.has("content-range"))
      throw fail(
        "SOURCE_PARTIAL_REJECTED",
        "The resource returned a partial file.",
        "Use a direct full-file download link.",
      );
    const mime = (
      response.headers.get("content-type") || "application/octet-stream"
    )
      .split(";")[0]
      .toLowerCase()
      .trim();
    if (/html|xhtml/.test(mime))
      throw fail(
        "SOURCE_HTML_REJECTED",
        "The resource is a web page or sign-in page, not a downloadable file.",
        "Choose the direct file or image URL.",
      );
    const headerLength = response.headers.get("content-length");
    const declared = headerLength === null ? null : Number(headerLength);
    if (declared !== null && (!Number.isSafeInteger(declared) || declared < 0))
      throw fail("SOURCE_LENGTH_MISMATCH", "The resource declared an invalid length.");
    if (declared !== null && declared > maxBytes)
      throw fail(
        "SOURCE_TOO_LARGE",
        "This resource exceeds the 32 MiB in-memory transfer limit.",
        "Download this resource using the provider website instead.",
      );
    if (!response.body)
      throw fail("SOURCE_EMPTY", "The resource contains no readable bytes.");
    // Allocate the source once. A growable backing store avoids retaining
    // chunk arrays and a second full copy when a length is unknown.
    const length = !response.headers.get("content-encoding") ? declared : null;
    const grow = length === null && typeof ArrayBuffer.prototype.resize === "function" &&
      typeof ArrayBuffer.prototype.transferToFixedLength === "function";
    const buffer = grow ? new ArrayBuffer(0, {maxByteLength: maxBytes}) : new ArrayBuffer(length ?? maxBytes);
    const reader = response.body.getReader();
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const end = size + value.byteLength;
        if (end > maxBytes)
          throw fail(
            "SOURCE_TOO_LARGE",
            "This resource exceeds the 32 MiB in-memory transfer limit.",
          );
        if (length !== null && end > length)
          throw fail("SOURCE_LENGTH_MISMATCH", "The resource length did not match its response.");
        if (grow && end > buffer.byteLength)
          buffer.resize(Math.min(maxBytes, Math.max(end, buffer.byteLength * 2)));
        new Uint8Array(buffer).set(value, size);
        size = end;
      }
    } finally {
      void reader.cancel().catch(() => {});
    }
    if (!size) throw fail("SOURCE_EMPTY", "The resource is empty.");
    // Chrome's Web IDL rejects resizable backing buffers in TextDecoder,
    // Web Crypto and request bodies. Transfer detaches the growable buffer.
    const bytes = new Uint8Array(grow ? buffer.transferToFixedLength(size) : buffer, 0, size);
    const encoding=bytes[0]===0xff&&bytes[1]===0xfe?'utf-16le':bytes[0]===0xfe&&bytes[1]===0xff?'utf-16be':'utf-8';
    const prefix = new TextDecoder(encoding)
      .decode(bytes.subarray(0, 4096))
      .replace(/^\uFEFF/, "")
      .trimStart();
    if (
      /^(?:<!doctype\s+html|<(?:html|head|body|form|meta|title|script)\b|(?:<!--[^]*?-->|<\?xml[^]*?\?>)\s*<(?:html|head|body|form|meta)\b)/i.test(
        prefix,
      )
    )
      throw fail(
        "SOURCE_HTML_REJECTED",
        "The resource contains HTML, possibly a login or error page.",
        "Choose a direct downloadable file.",
      );
    // With transparent HTTP compression Content-Length describes encoded bytes, not decoded bytes.
    if (
      length !== null && length !== size
    )
      throw fail(
        "SOURCE_LENGTH_MISMATCH",
        "The resource length did not match its response.",
        "Retry from the original file link.",
      );
    let pathName;
    try {
      pathName = decodeURIComponent(
        url.pathname.split("/").pop(),
      );
    } catch {
      pathName = "download";
    }
    const filename = sanitizeFilename(
      dispositionName(response.headers.get("content-disposition")) ||
        input.filename ||
        pathName,
      mime,
    );
    let preview;
    if (size <= retainedPreviewLimit && /^image\/(png|jpeg|gif|webp|avif)$/.test(mime)) preview = encodePreview(bytes,mime);
    return { bytes, filename, mime, preview };
  } catch (e) {
    if (typeof e.code === "string") throw e;
    throw fail(
      controller.signal.aborted ? "SOURCE_TIMEOUT" : "SOURCE_UNAVAILABLE",
      controller.signal.aborted
        ? "The resource timed out."
        : "The browser could not read the resource.",
      "Check connectivity and use a direct file address that Chrome can read.",
    );
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
