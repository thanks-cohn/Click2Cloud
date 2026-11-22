const providers = [
  ['google', 'Google Drive', 'google-drive.png'],
  ['onedrive', 'OneDrive', 'onedrive.png'],
  ['dropbox', 'Dropbox', 'dropbox.png'],
];
const outcomes = {SAVED: 'Save verified', FAILED: 'Save failed', UNCERTAIN: 'Save could not be verified'};
const actionTimeout = {
  'auth.connect': 120000,
  'auth.reconnect': 120000,
  'auth.refresh': 45000,
  'providers.getStatus': 45000,
};
const failure = (code, message) => Object.assign(Error(message), {code});

export function createBasicProviderCards({runtime, document, permissions}) {
  const stack = document.createElement('div');
  stack.className = 'remote-providers';
  const cards = new Map();
  async function call(op, provider) {
    const response = Promise.resolve().then(() =>
      runtime.sendMessage({channel: 'redown-basic-v1', api: 1, op, input: {provider}})).catch(() => {
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
    if (reply?.ok !== true || (op !== 'history.latestOutcome' && (!reply.value || typeof reply.value !== 'object'))) {
      throw failure('BASIC_MESSAGE_INVALID', 'The provider service returned no usable response. Reopen the Shelf and try again.');
    }
    return reply.value;
  }
  function recent(id, result) {
    const {outcome, saveDetails, saveSummary, saveReason, sourceAccess} = cards.get(id) ?? {};
    if (!outcome || !outcomes[result?.state]) return;
    outcome.textContent = [outcomes[result.state], result.message, result.nextAction].filter(Boolean).join(' · ');
    outcome.dataset.saveState = result.state;
    saveDetails.hidden = result.state === 'SAVED';
    if (saveDetails.hidden) saveDetails.open = false;
    saveSummary.textContent = outcomes[result.state];
    saveReason.textContent = [result.message, result.nextAction].filter(Boolean).join(' ');
    sourceAccess.hidden = true;
    delete sourceAccess.dataset.origin;
    if (!permissions?.request || typeof result.sourceOrigin !== 'string') return;
    const source = URL.parse(result.sourceOrigin);
    if (!source || !['http:', 'https:'].includes(source.protocol) || source.origin !== result.sourceOrigin) return;
    sourceAccess.dataset.origin = source.origin;
    sourceAccess.textContent = 'Allow access to ' + source.hostname;
    sourceAccess.hidden = false;
  }
  function paint(card, status) {
    card.connect.textContent = status.connected ? 'Reconnect' : 'Sign In';
    card.operation = status.connected ? 'auth.reconnect' : 'auth.connect';
    card.readiness.textContent = status.ready ? 'Authorized for this provider.' :
      [status.message, status.nextAction].filter(Boolean).join(' ') || 'Sign in to authorize saves.';
    card.readiness.dataset.reason = status.reason ?? '';
    card.availability.textContent = !status.ready && status.reason && (status.connected || status.reason !== 'AUTH_REQUIRED')
      ? card.readiness.textContent : '';
  }
  for (const [id, label, icon] of providers) {
    const section = document.createElement('section');
    section.className = 'card remote-provider';
    section.setAttribute('aria-labelledby', 'remote-provider-' + id);
    section.innerHTML = `<div class="remote-provider-heading">
        <img src="icons/${icon}" width="24" height="24" alt="">
        <h2 id="remote-provider-${id}">${label}</h2>
      </div>
      <p class="sr-only" data-readiness id="remote-readiness-${id}">Checking authorization…</p>
      <div class="remote-provider-actions">
        <button type="button" class="primary" data-connect aria-describedby="remote-readiness-${id}">Sign In</button>
        <button type="button" data-refresh>Refresh</button>
        <button type="button" data-go aria-label="GO TO ${label}">GO TO</button>
      </div>
      <p class="muted" data-availability></p>
      <p class="muted" role="status" data-feedback></p>
      <p class="muted" role="status" data-navigation></p>
      <p class="sr-only" role="status" data-outcome></p>
      <details class="remote-provider-details" data-save-details hidden>
        <summary data-save-summary></summary><p class="muted" data-save-reason></p>
        <button type="button" data-source-access hidden></button>
      </details>`;
    const get = key => section.querySelector('[data-' + key + ']');
    const card = {
      connect: get('connect'), refresh: get('refresh'), readiness: get('readiness'),
      availability: get('availability'), outcome: get('outcome'), sourceAccess: get('source-access'),
      saveDetails: get('save-details'), saveSummary: get('save-summary'), saveReason: get('save-reason'),
      operation: 'auth.connect', revision: 0,
    };
    cards.set(id, card);
    async function action(button, op, changesStatus = true) {
      if (button.getAttribute('aria-disabled') === 'true') return;
      if (changesStatus) card.revision++;
      const revision = card.revision;
      const buttons = changesStatus ? [card.connect, card.refresh] : [button];
      for (const control of buttons) control.setAttribute('aria-disabled', 'true');
      const feedback = get(changesStatus ? 'feedback' : 'navigation');
      delete feedback.dataset.code;
      feedback.textContent = changesStatus ? 'Checking authorization…' : 'Opening provider…';
      try {
        const result = await call(op, id);
        if (changesStatus && revision === card.revision) paint(card, result);
        feedback.textContent = '';
      } catch (error) {
        feedback.textContent = error.message;
        feedback.dataset.code = error.code;
      } finally {
        for (const control of buttons) control.removeAttribute('aria-disabled');
      }
    }
    card.connect.onclick = () => action(card.connect, card.operation);
    card.refresh.onclick = () => action(card.refresh, 'auth.refresh');
    const go = get('go');
    go.onclick = () => action(go, 'providers.goTo', false);
    card.sourceAccess.onclick = async () => {
      const origin = card.sourceAccess.dataset.origin;
      if (!origin || card.sourceAccess.disabled) return;
      card.sourceAccess.disabled = true;
      try {
        const source = new URL(origin);
        const allowed = await permissions.request({origins: [source.protocol + '//' + source.hostname + '/*']});
        if (origin !== card.sourceAccess.dataset.origin) return;
        get('feedback').textContent = allowed
          ? 'Access granted. Right-click the source again to save.'
          : 'Source access was declined.';
        card.sourceAccess.hidden = allowed;
      } catch {
        if (origin === card.sourceAccess.dataset.origin) get('feedback').textContent = 'Source access could not be granted.';
      } finally {
        card.sourceAccess.disabled = false;
      }
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
        card.readiness.textContent = error.message;
        card.readiness.dataset.reason = error.code;
        card.availability.textContent = error.message;
      });
      void call('history.latestOutcome', id).then(result => {
        if (!card.outcome.dataset.saveState) recent(id, result);
      }, () => {});
    }
  }
  function onAttempt(attempt) {
    recent(attempt?.provider, attempt);
  }
  function onStatus(status) {
    const card = cards.get(status?.provider);
    if (!card || typeof status.ready !== 'boolean' || typeof status.connected !== 'boolean') return;
    card.revision++;
    paint(card, status);
  }
  function showRecovery(provider) {
    const card = cards.get(provider === 'google-drive' ? 'google' : provider);
    if (!card) return;
    if (!card.saveDetails.hidden) card.saveDetails.open = true;
    card.connect.closest('.remote-provider').scrollIntoView({block: 'nearest'});
  }
  return {mount, onAttempt, onStatus, showRecovery};
}
