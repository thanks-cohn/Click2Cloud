function privateHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1" || h === "0.0.0.0") return true;
  const m = h.match(/^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[2]);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
async function checkedFetch(raw, hops = 5) {
  let url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || privateHost(url.hostname)) {
    throw new Error("Only public HTTPS source URLs are allowed");
  }
  for (let i = 0; i <= hops; i++) {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "REDOWN/0.3" } });
    if (![301,302,303,307,308].includes(res.status)) return res;
    const next = res.headers.get("location");
    if (!next) throw new Error("Remote redirect missing Location");
    url = new URL(next, url);
    if (url.protocol !== "https:" || privateHost(url.hostname)) throw new Error("Unsafe redirect blocked");
  }
  throw new Error("Too many redirects");
}
function extensionForContentType(contentType) {
  const type = String(contentType || "").split(";")[0].trim().toLowerCase();
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "model/gltf-binary": "glb",
    "model/gltf+json": "gltf",
    "application/pdf": "pdf"
  };
  return map[type] || "";
}
function filenameWithInferredExtension(filename, contentType) {
  const clean = cleanName(filename);
  if (/\.[a-z0-9]{1,10}$/i.test(clean)) return clean;
  const ext = extensionForContentType(contentType);
  return ext ? clean + "." + ext : clean;
}
function cleanName(value) {
  const name = String(value || "").split(/[?#]/)[0].split("/").pop()
    .replace(/[^a-zA-Z0-9._ -]/g, "-").replace(/^\\.+/, "").slice(0, 180);
  if (!name || name === "." || name === "..") throw new Error("Invalid filename");
  return name;
}
