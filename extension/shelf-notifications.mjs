const LIMIT = 128;
const SESSION_KEY = 'redownShelfNoticeIdsV1';

export function createTransientNotice({paint, seen = new Set(), remember = () => {}}) {
  let current;
  function clear() {
    if (!current) return;
    clearTimeout(current.timer);
    current = null;
    paint(null);
  }
  function show(text, {error = false, key = null, explorer = false} = {}) {
    if (!text || (key !== null && seen.has(key))) return;
    if (key !== null) {
      seen.add(key);
      while (seen.size > LIMIT) seen.delete(seen.values().next().value);
      remember(seen);
    }
    clearTimeout(current?.timer);
    const notice = {text, error, explorer};
    current = notice;
    const dismiss = () => { if (current === notice) clear(); };
    notice.timer = setTimeout(dismiss, error ? 9000 : 5000);
    paint(notice);
    return dismiss;
  }
  return {show, clear};
}

// The tab session remembers only bounded digests of display identities.
// A reloaded Shelf can suppress a replay without restoring a notice or its text.
function noticeId(key) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}

export function createShelfNotifications(document) {
  const banner = document.getElementById('action-feedback');
  const message = document.getElementById('action-feedback-text');
  const live = document.getElementById('action-feedback-live');
  const window = document.defaultView;
  let seen = new Set();
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(SESSION_KEY));
    if (Array.isArray(stored)) seen = new Set(stored.slice(-LIMIT).filter(id => /^[a-z0-9]{1,7}$/.test(id)));
  } catch { /* Session storage is optional in an extension document. */ }
  const notices = createTransientNotice({seen,
    remember(keys) {
      try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify([...keys])); } catch {}
    },
    paint(notice) {
      banner.classList.toggle('explorer-mini-toast', notice?.explorer === true);
      banner.classList.toggle('notice-error', notice?.error === true);
      banner.hidden = !notice;
      message.textContent = live.textContent = notice?.text ?? '';
    },
  });
  banner.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') notices.clear(); });
  window.addEventListener('pagehide', notices.clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) notices.clear(); });
  return {
    show(text, {key = null, ...options} = {}) {
      if (text && !document.hidden) return notices.show(text, {...options, key: key === null ? null : noticeId(key)});
    },
    clear: notices.clear,
  };
}
