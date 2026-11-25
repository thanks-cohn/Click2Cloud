const LIMIT = 128;
const SESSION_KEY = 'redownShelfNoticeIdsV1';
export const shelfNoticeText = text => String(text??'').replace(/(?:\s*·\s*)?Review the current panel or History for details\./g,'').trim();

export function createTransientNotice({paint, seen = new Set(), remember = () => {}, clock = Date.now}) {
  let current;
  function clear() {
    if (!current) return;
    clearTimeout(current.timer);
    current = null;
    paint(null);
  }
  function show(text, {error = false, key = null, explorer = false, duration = error ? 9000 : 5000} = {}) {
    if (!text || (key !== null && seen.has(key))) return;
    if (key !== null) {
      seen.add(key);
      while (seen.size > LIMIT) seen.delete(seen.values().next().value);
      remember(seen);
    }
    clearTimeout(current?.timer);
    const notice = {text, error, explorer, key, expiresAt:clock()+duration};
    current = notice;
    const dismiss = () => { if (current === notice) clear(); };
    notice.timer = setTimeout(dismiss,duration);
    paint(notice);
    return dismiss;
  }
  return {show, clear, clearMatching(key){if(key!==null&&current?.key===key)clear();},
    expire(){if(current&&clock()>=current.expiresAt)clear();}};
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
  const footer = document.getElementById('footer-notice');
  const footerText = document.getElementById('footer-notice-text');
  const window = document.defaultView;
  let seen = new Set();
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(SESSION_KEY));
    if (Array.isArray(stored)) seen = new Set(stored.slice(-LIMIT).filter(id => /^[a-z0-9]{1,7}$/.test(id)));
  } catch { /* Session storage is optional in an extension document. */ }
  const remember = keys => {
      try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify([...keys])); } catch {}
  };
  const notices = createTransientNotice({seen,remember,
    paint(notice) {
      banner.classList.toggle('explorer-mini-toast', notice?.explorer === true);
      banner.classList.toggle('notice-error', notice?.error === true);
      banner.hidden = !notice;
      message.textContent = live.textContent = notice?.text ?? '';
    },
  });
  const footerNotices = createTransientNotice({seen,remember,paint(notice){
    if(!notice&&live.textContent===footerText.textContent)live.textContent='';
    footer.hidden=!notice;
    footerText.textContent=notice?.text??'';
    if(notice)live.textContent=notice.text;
  }});
  footer.querySelector('button').onclick=footerNotices.clear;
  banner.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') notices.clear(); });
  window.addEventListener('pagehide', notices.clear);
  window.addEventListener('pagehide', footerNotices.clear);
  window.addEventListener('focus',footerNotices.expire);
  document.addEventListener('visibilitychange', () => {
    footerNotices.expire();
    if (document.hidden) notices.clear();
  });
  return {
    show(text, {key = null, ...options} = {}) {
      const visible=shelfNoticeText(text);
      if (visible && !document.hidden) return notices.show(visible, {...options, key: key === null ? null : noticeId(key)});
    },
    showFooter(text,key=null){
      if(!document.hidden)return footerNotices.show(text,{duration:10000,key:key===null?null:noticeId('footer:'+key)});
    },
    clearMatching(key){if(key)notices.clearMatching(noticeId(key));},
    clear(){notices.clear();footerNotices.clear();},
  };
}
