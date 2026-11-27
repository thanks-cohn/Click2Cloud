import {WAITING, WEB_SOURCE_PERMISSIONS} from '../src/basic/save-protocol.mjs';

const providers = [
  ['google', 'Google Drive', 'google-drive.png'],
  ['onedrive', 'OneDrive', 'onedrive.png'],
  ['dropbox', 'Dropbox', 'dropbox.png'],
];
const actionTimeout = {
  'auth.connect': 120000,
  'auth.reconnect': 120000,
  'auth.refresh': 45000,
  'auth.disconnect': 45000,
  'providers.getStatus': 45000,
  'saves.resume': 120000,
};
const failure = (code, message) => Object.assign(Error(message), {code});

export function createBasicProviderCards({runtime, document, permissions, pulseEnabled = () => true}) {
  const stack = document.createElement('div');
  stack.className = 'remote-providers';
  const cards = new Map();
  function paintActivity(card) {
    card.activity.textContent = card.timer ? 'Success!' : card.active ? 'Working…' :
      card.problem ? 'Needs attention' : '';
    card.activity.hidden = !card.activity.textContent;
    card.activity.toggleAttribute('data-success', !!card.timer);
    card.detailToggle.textContent=card.activity.textContent||'Details';
    if(!card.info.textContent.trim())setDetails(card,false);
  }
  function setDetails(card,open){
    card.detailToggle.setAttribute('aria-expanded',String(open));
    card.info.toggleAttribute('data-onyx-details-open',open);
  }
  function clearSuccess(card) {
    clearTimeout(card.timer);
    card.timer = null;
    card.animation?.cancel();
    card.animation = null;
    paintActivity(card);
  }
  function success(card, id) {
    if (id && card.lastSuccess === id) return;
    if (id) card.lastSuccess = id;
    if (!pulseEnabled() || !stack.isConnected || document.hidden || card.active) return;
    clearSuccess(card);
    card.timer = setTimeout(() => clearSuccess(card), 920);
    paintActivity(card);
    if (!document.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      card.animation = card.activity.animate([
        {opacity:.72,transform:'translateY(0)'},
        {opacity:1,transform:'translateY(-2px)',offset:.38},
        {opacity:.72,transform:'translateY(0)'}
      ],{duration:460,iterations:2,easing:'ease-in-out'});
    }
  }
  async function call(op, provider, extra) {
    const response = Promise.resolve().then(() =>
      runtime.sendMessage({channel: 'redown-basic-v1', api: 1, op, input: {provider, ...extra}})).catch(() => {
      throw failure('BASIC_MESSAGE_REJECTED', 'The provider service connection closed. Reopen the Shelf and try again.');
    });
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(failure('BASIC_MESSAGE_TIMEOUT',
        'The provider service took too long to respond. Check for an open sign-in window, or reopen the Shelf.')),
      actionTimeout[op] ?? 12000);
    });
    const reply = await Promise.race([response, timeout]).finally(() => clearTimeout(timer));
    if (reply?.ok === false && typeof reply.error?.code === 'string' && typeof reply.error.message === 'string') {
      throw failure(reply.error.code, [reply.error.message, reply.error.nextAction].filter(Boolean).join(' '));
    }
    if (reply?.ok !== true || (op !== 'saves.pending' && (!reply.value || typeof reply.value !== 'object'))) {
      throw failure('BASIC_MESSAGE_INVALID', 'The provider service returned no usable response. Reopen the Shelf and try again.');
    }
    return reply.value;
  }
  function paintPending(card, item) {
    if (!WAITING.has(item?.state) || typeof item.id !== 'string') item = null;
    card.pending = item;
    card.continueSave.hidden = !item;
    if (!item) return;
    const needsAccess = item.state === 'AWAITING_SOURCE' && card.offered !== item.id;
    card.continueSave.textContent = needsAccess ? 'Allow web access and continue' : 'Continue save';
    card.continueSave.title = needsAccess ? 'Chrome may ask to grant REDOWN access to HTTP and HTTPS sites.' : '';
  }
  function paint(card, status) {
    card.isReady = status.ready === true && status.connected === true;
    const authenticated = card.isReady && status.authorized !== false;
    const reconnect = status.phase === 'reconnect-needed';
    // A transient passive check must not turn the primary sign-in action into Refresh.
    const disconnected = !status.connected && [undefined,'disconnected','checking','network-temporary'].includes(status.phase);
    const section = card.connect.closest('.remote-provider');
    const wasAuthenticated = section.hasAttribute('data-onyx-connected');
    card.hadConnection = status.reason === 'AUTH_SIGNED_OUT' ? false : card.hadConnection || authenticated || status.connected === true || reconnect;
    const canSignOut = status.connected === true;
    if(!canSignOut && document.activeElement === card.signOut)card.connect.focus({preventScroll:true});
    card.signOut.hidden = !canSignOut;
    const onyx = document.documentElement.dataset.aesthetic === 'onyx';
    card.connect.textContent = authenticated ? 'Connected' : reconnect || (onyx && disconnected && card.hadConnection) ? 'Reconnect' :
      disconnected ? 'Connect' : status.phase === 'connecting' ? 'Connecting…' : 'Check connection';
    card.connect.toggleAttribute('data-authenticated',authenticated);
    section.toggleAttribute('data-onyx-connected',authenticated);
    // Keep keyboard focus on the active control when the provider state changes.
    // The status response, never the animation, determines availability.
    if(onyx && wasAuthenticated !== authenticated){
      const go = section.querySelector('[data-go]');
      if(authenticated && document.activeElement === card.connect)go.focus({preventScroll:true});
      else if(!authenticated && document.activeElement === go)card.connect.focus({preventScroll:true});
    }
    card.connect.title = authenticated ? 'Reconnect ' + card.label : '';
    if(authenticated)card.connect.setAttribute('aria-description',card.connect.title);
    else card.connect.removeAttribute('aria-description');
    card.operation = authenticated || reconnect || (disconnected && card.hadConnection) ? 'auth.reconnect' : disconnected ? 'auth.connect' : 'auth.refresh';
    card.availability.textContent = status.ready || !status.connected && ['AUTH_REQUIRED','AUTH_SIGNED_OUT','DISCONNECTED',undefined].includes(status.reason)
      ? '' : [status.message, status.nextAction].filter(Boolean).join(' ');
    paintActivity(card);
  }
  for (const [id, label, icon] of providers) {
    const section = document.createElement('section');
    section.className = 'card remote-provider';
    section.setAttribute('aria-labelledby', 'remote-provider-' + id);
    section.dataset.provider=id;
    section.innerHTML = `<div class="remote-provider-heading">
        <img src="icons/${icon}" width="24" height="24" alt="">
        <div class="remote-provider-title"><h2 id="remote-provider-${id}">${label}</h2><span class="onyx-provider-meta"><span class="onyx-free-caption">${({google:'15 GB Free',onedrive:'5 GB Free',dropbox:'2 GB Free'})[id]}</span><button type="button" data-signout hidden aria-label="Sign out of ${label}">Sign out</button><span class="onyx-provider-transfer" role="progressbar" aria-valuemin="0" aria-valuemax="100" hidden><span class="onyx-transfer-fill"></span></span></span></div>
      </div>
      <p role="status" class="remote-provider-activity" data-activity hidden></p>
      <button type="button" class="onyx-provider-detail-toggle" aria-expanded="false" aria-controls="remote-provider-info-${id}">Details</button>
      <div class="remote-provider-info" id="remote-provider-info-${id}">
        <p class="muted" role="status" data-feedback></p>
        <p class="muted" role="status" data-navigation></p>
        <p class="muted" data-availability></p>
      </div>
      <div class="remote-provider-actions">
        <button type="button" class="primary" data-connect>Connect</button>
        <button type="button" data-refresh aria-label="Refresh ${label}" title="Refresh ${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M5.5 8a7.5 7.5 0 0 1 12.4-2L20 9M4 15l2.1 3a7.5 7.5 0 0 0 12.4-2"/></svg></button>
        <button type="button" data-go id="remote-provider-go-${id}" aria-labelledby="remote-provider-go-${id} remote-provider-${id}"><svg class="onyx-browse-outline" aria-hidden="true" focusable="false" viewBox="0 0 92 44" width="92" height="44"><path d="M91.5 22 V8 A7.5 7.5 0 0 0 84 .5 H0"/><path d="M91.5 22 V36 A7.5 7.5 0 0 1 84 43.5 H0"/></svg><span class="legacy-go-label">GO TO</span><span class="onyx-browse-label"><span class="onyx-browse-word">BROWSE</span><span class="onyx-browse-symbol" aria-hidden="true"><svg class="onyx-folder-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M3 7V5a2 2 0 0 1 2-2h4l3 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 9h18"/></svg><svg class="onyx-folder-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M3 19V5a2 2 0 0 1 2-2h4l3 3h7a2 2 0 0 1 2 2v2"/><path d="M3 19l3-9h16l-3 9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span></span></button>
      </div>
      <button type="button" data-continue hidden>Continue save</button>`;
    const get = key => section.querySelector('[data-' + key + ']');
    const card = {
      label, connect: get('connect'), refresh: get('refresh'), signOut: get('signout'),
      availability: get('availability'), continueSave: get('continue'), activity: get('activity'),
      detailToggle:section.querySelector('.onyx-provider-detail-toggle'),info:section.querySelector('.remote-provider-info'),
      operation: 'auth.connect', revision: 0, attemptRevision: 0, active: 0,
    };
    cards.set(id, card);
    card.detailToggle.onclick=()=>setDetails(card,card.detailToggle.getAttribute('aria-expanded')!=='true');
    section.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&card.info.hasAttribute('data-onyx-details-open')){
        event.preventDefault();event.stopPropagation();setDetails(card,false);card.detailToggle.focus({preventScroll:true});
      }
    });
    section.addEventListener('focusout',event=>{
      if(!section.contains(event.relatedTarget))setDetails(card,false);
    });
    async function action(button, op, changesStatus = true) {
      if (button.getAttribute('aria-disabled') === 'true') return;
      if (changesStatus) card.revision++;
      const revision = card.revision;
      const buttons = changesStatus ? [card.connect, card.refresh, card.signOut] : [button];
      for (const control of buttons) control.setAttribute('aria-disabled', 'true');
      if(changesStatus)card.refresh.setAttribute('aria-busy','true');
      const feedback = get(changesStatus ? 'feedback' : 'navigation');
      delete feedback.dataset.code;
      card.problem=false;
      feedback.textContent = '';
      card.active++;
      clearSuccess(card);
      let completed = false;
      try {
        const result = await call(op, id);
        if (changesStatus && revision === card.revision) paint(card, result);
        completed = changesStatus ? result.ready === true && result.connected === true && card.isReady : result.opened === true;
      } catch (error) {
        card.problem=true;
        feedback.textContent = error.message;
        feedback.dataset.code = error.code;
      } finally {
        for (const control of buttons) control.removeAttribute('aria-disabled');
        if(changesStatus)card.refresh.removeAttribute('aria-busy');
        card.active--;
        paintActivity(card);
      }
      if (completed) success(card);
    }
    card.connect.onclick = () => action(card.connect, card.operation);
    card.refresh.onclick = () => action(card.refresh, 'auth.refresh');
    card.signOut.onclick = () => { if(!card.signOut.hidden)void action(card.signOut, 'auth.disconnect'); };
    const go = get('go');
    go.onclick = () => action(go, 'providers.goTo', false);
    card.continueSave.onclick = async () => {
      const item = card.pending, feedback = get('feedback');
      if (!item || card.continueSave.disabled) return;
      card.continueSave.disabled = true;
      card.active++;
      clearSuccess(card);
      let confirmed = false;
      try {
        if (item.state === 'AWAITING_SOURCE' && card.offered !== item.id) {
          card.offered = item.id;
          // Call directly from the gesture. Chrome owns the approval and may
          // require changing Site access in its own UI.
          let grant;
          try { grant = await permissions?.request?.({origins: [...WEB_SOURCE_PERMISSIONS]}); } catch {}
          if (!grant) {
            if (card.pending?.id === item.id) paintPending(card, item);
            feedback.textContent = 'Approve REDOWN’s site access in Chrome, then continue this save.';
            return;
          }
        }
        feedback.textContent = 'Continuing the pending save…';
        const result = await call('saves.resume', id, {id:item.id});
        if (card.pending?.id === item.id) paintPending(card, WAITING.has(result.state) ? result : null);
        feedback.textContent = WAITING.has(result.state) ? result.message ?? '' : '';
        confirmed = result.state === 'SAVED' && result.confirmed === true;
      } catch (error) {
        if (error.code === 'PENDING_SAVE_NOT_FOUND' && card.pending?.id === item.id) paintPending(card, null);
        card.problem=true;
        feedback.textContent = error.message;
      } finally {
        card.continueSave.disabled = false;
        card.active--;
        paintActivity(card);
      }
      if (confirmed) success(card,item.id);
    };
    stack.append(section);
  }
  let loaded = false;
  function mount(placeholder) {
    placeholder.replaceWith(stack);
    if (loaded) return;
    loaded = true;
    for (const [id, card] of cards) {
      const revision = card.revision;
      void call('providers.getStatus', id).then(status => {
        if (revision === card.revision) paint(card, status);
      }, error => {
        if (revision !== card.revision) return;
        card.availability.textContent = error.message;
        card.problem=true;
        paintActivity(card);
      });
      const attempt = card.attemptRevision;
      void call('saves.pending', id).then(item => {
        if (attempt === card.attemptRevision) paintPending(card, item);
      }, () => {});
    }
  }
  function onStatus(status) {
    const card = cards.get(status?.provider);
    if (!card || typeof status.ready !== 'boolean' || typeof status.connected !== 'boolean') return;
    card.revision++;
    paint(card, status);
  }
  function onAttempt(item) {
    const card = cards.get(item?.provider);
    if (!card) return;
    card.attemptRevision++;
    if (WAITING.has(item.state)) paintPending(card, item);
    else if (card.pending?.id === item.id) paintPending(card, null);
    if (item.state === 'SAVED' && item.confirmed === true && !card.active) success(card,item.id);
  }
  function showRecovery(provider) {
    const card = cards.get(provider === 'google-drive' ? 'google' : provider);
    if (!card) return;
    card.connect.closest('.remote-provider').scrollIntoView({block: 'nearest'});
  }
  return {mount, onStatus, onAttempt, showRecovery, clearSuccesses(){for (const card of cards.values()) clearSuccess(card);}};
}
