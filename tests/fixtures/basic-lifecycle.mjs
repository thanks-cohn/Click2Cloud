// Serialized into a Chromium page. Chrome APIs and provider HTTP are fixtures;
// the packaged MV3 modules, card DOM, and IndexedDB implementation are real.
export async function basicLifecycleFixture({build, manifest, transient = null}) {
  const id = 'ajppphdiamdobknpamcheohmdbdbeoal';
  const base = location.origin + build;
  const read = name => JSON.parse(localStorage.getItem('fixture:' + name) ?? '{}');
  const write = (name, value) => localStorage.setItem('fixture:' + name, JSON.stringify(value));
  const events = new Map(), alarms = new Set();
  const counts = {acl: 0, localReads: 0, localWrites: 0, credentialWrites: 0, sessionWrites: 0,
    basicOpens: 0, basicTransactions: 0, maxBasicHandles: 0, providerReads: 0,
    providerWrites: 0, popups: 0, tabOpens: 0, timersCreated: 0, maxTimers: 0};
  const event = name => {
    const listeners = new Set();
    events.set(name, listeners);
    return {addListener: listener => listeners.add(listener), removeListener: listener => listeners.delete(listener)};
  };
  const emit = (name, ...args) => { for (const listener of events.get(name) ?? []) listener(...args); };
  const storage = area => ({
    setAccessLevel: async () => { counts.acl++; },
    get: async keys => {
      if (area === 'local') counts.localReads++;
      const data = read(area);
      if (keys == null) return data;
      return Object.fromEntries((typeof keys === 'object' && !Array.isArray(keys)
        ? Object.keys(keys) : [keys].flat()).map(key => [key, data[key] ?? keys?.[key]]));
    },
    set: async values => {
      counts[area + 'Writes']++;
      if (Object.keys(values).some(key => key.startsWith('redownRemoteBasicV1:auth:'))) counts.credentialWrites++;
      write(area, {...read(area), ...values});
    },
    remove: async keys => {
      const data = read(area);
      for (const key of [keys].flat()) delete data[key];
      write(area, data);
    },
  });
  const runtime = {
    id, getManifest: () => manifest, getURL: path => base + '/' + path,
    onMessage: event('message'), onInstalled: event('installed'), onStartup: event('startup'),
    async sendMessage(message) {
      emit('message', message, {id}, () => {});
      return undefined;
    },
  };
  const sender = {id, url: runtime.getURL('extension/app.html'), origin: location.origin + build};
  // runtime.getURL('') and sender.origin must have the same exact mock origin.
  function send(message, from = sender) {
    return new Promise((resolve, reject) => {
      let retained = false, responded = false;
      for (const listener of events.get('message')) {
        if (listener(message, from, result => { responded = true; resolve(result); }) === true) retained = true;
        if (responded) break;
      }
      if (!retained && !responded) reject(Error('FIXTURE_NO_MESSAGE_HANDLER'));
    });
  }
  const fixture = window.basicLifecycle = {
    send, emit, read, write, counts, transient, rejectGoogle: false, withholdSource: false, toolbar: [],
    call: (op, input = {}) => send({channel: 'redown-basic-v1', api: 1, op, input}),
    snapshot: () => ({
      ...counts, listeners: Object.fromEntries([...events].map(([k, v]) => [k, v.size])),
      alarms: alarms.size, activeTimers: timers.size, openBasicHandles: handles.size,
      configuredMenuItems: Object.keys(read('menus')).length,
    }),
  };
  const recordToolbar = () => fixture.toolbar.push({at:performance.now(), state:
    fixture.iconGreen ? (fixture.badgeGreen ? 'both' : 'icon') : fixture.badgeGreen ? 'badge' : 'idle'});
  Object.defineProperty(globalThis, 'chrome', {configurable: true, value: {
    runtime, storage: {local: storage('local'), session: storage('session'), onChanged: event('storage')},
    commands: {onCommand: event('command')},
    contextMenus: {
      onClicked: event('menu.click'),
      create(row, cb) { return acknowledge(row.id, row, cb, 'create'); },
      update(id, row, cb) { return acknowledge(id, row, cb, 'update'); },
      remove(id, cb) { return acknowledge(id, null, cb, 'remove'); },
      removeAll(cb) { counts.removedAll = (counts.removedAll ?? 0) + 1; write('menus', {}); cb(); },
    },
    action: {onClicked: event('action'), setBadgeText: async ({text}) => { fixture.badge = text; },
      setBadgeBackgroundColor: async ({color}) => { fixture.badgeGreen = color === '#087a35'; recordToolbar(); },
      setIcon: async ({path}) => { fixture.iconGreen = path[16].includes('-success-'); recordToolbar(); }},
    alarms: {onAlarm: event('alarm'), create: async name => { alarms.add(name); }},
    windows: {getCurrent: async () => ({id: 1}), onRemoved: event('window.removed')},
    sidePanel: {setOptions: async () => {}, onOpened: event('panel.opened'), onClosed: event('panel.closed')},
    identity: {
      getRedirectURL: name => 'https://' + id + '.chromiumapp.org/' + name,
      getAuthToken: async ({interactive, scopes}) => {
        if (interactive) counts.popups++;
        if (fixture.rejectGoogle) throw Error('Browser provider connection failed. Private details.');
        return {token: 'synthetic-google', grantedScopes: scopes};
      },
      launchWebAuthFlow: async options => {
        counts.popups++;
        const url = new URL(options.url);
        if (!fixture.oneDrive || !options.interactive || url.hostname !== 'login.microsoftonline.com' ||
            url.searchParams.get('code_challenge_method') !== 'S256') throw Error('Unexpected fixture consent');
        const callback = new URL(url.searchParams.get('redirect_uri'));
        if (callback.href !== 'https://' + id + '.chromiumapp.org/onedrive') throw Error('Unexpected fixture callback');
        callback.searchParams.set('state', url.searchParams.get('state'));
        callback.searchParams.set('code', 'fixture-code');
        return callback.href;
      },
    },
    permissions: {contains: async ({origins}) => !(fixture.withholdSource && origins.includes('https://files.example/*'))},
    downloads: {download: async options => { fixture.zip = options; return 7; }},
    tabs: {create: async () => { counts.tabOpens++; return {id: 2}; }, get: async id => ({id, windowId: 1})},
  }});
  function acknowledge(id, row, callback, op) {
    const menus = read('menus');
    if (op === 'create' && menus[id]) runtime.lastError = {message: 'Cannot create item with duplicate id ' + id};
    else if (op !== 'create' && !menus[id]) runtime.lastError = {message: 'Cannot find menu item with id ' + id};
    else {
      if (row) menus[id] = {...menus[id], ...row};
      else delete menus[id];
      write('menus', menus);
    }
    try { callback(); } finally { delete runtime.lastError; }
  }

  const timers = new Set(), schedule = globalThis.setTimeout, clear = globalThis.clearTimeout;
  globalThis.setTimeout = (callback, delay, ...args) => {
    const timer = schedule(() => { timers.delete(timer); callback(...args); }, delay);
    timers.add(timer);
    counts.timersCreated++;
    counts.maxTimers = Math.max(counts.maxTimers, timers.size);
    return timer;
  };
  globalThis.clearTimeout = timer => { timers.delete(timer); clear(timer); };

  const handles = new Set(), open = indexedDB.open.bind(indexedDB);
  indexedDB.open = (name, version) => {
    if (name !== 'redown-remote-basic-v1') return open(name, version);
    counts.basicOpens++;
    if (fixture.transient === 'blocked') {
      const request = {};
      queueMicrotask(() => request.onblocked?.());
      fixture.releaseOpen = () => {
        const opened = instrument(open(name, version));
        return new Promise((resolve, reject) => {
          opened.onsuccess = () => { request.result = opened.result; request.onsuccess(); resolve(); };
          opened.onerror = () => reject(opened.error);
        });
      };
      return request;
    }
    return instrument(open(name, version));
  };
  function instrument(request) {
    request.addEventListener('success', () => {
      const db = request.result, close = db.close.bind(db), transaction = db.transaction.bind(db);
      handles.add(db);
      counts.maxBasicHandles = Math.max(counts.maxBasicHandles, handles.size);
      db.close = () => { handles.delete(db); close(); };
      db.transaction = (...args) => { counts.basicTransactions++; return transaction(...args); };
    });
    return request;
  }

  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' ? input : input.url ?? input.href);
    if (url.origin === location.origin) return fetchOriginal(input, options);
    if (url.hostname === 'www.googleapis.com' && url.pathname.endsWith('/about')) {
      counts.providerReads++;
      return Response.json({user: {permissionId: 'fixture-account'}});
    }
    if (url.hostname === 'api.dropboxapi.com') {
      counts.providerReads++;
      if (url.pathname.endsWith('get_current_account'))
        return Response.json({account_id: 'fixture-account', root_info: {home_namespace_id: '1001'}});
      if (url.pathname.endsWith('list_folder')) return Response.json({entries: []});
    }
    if (url.hostname === 'graph.microsoft.com' && /^\/v1\.0\/me(?:\/drive\/root)?$/.test(url.pathname)) {
      counts.providerReads++;
      return Response.json({id: url.pathname.endsWith('root') ? 'fixture-root' : 'fixture-account'});
    }
    if (fixture.oneDrive) {
      const name = 'one-click.txt', objectId = 'fixture-onedrive-object';
      const bytes = new TextEncoder().encode('Fixture OneDrive object');
      if (url.hostname === 'login.microsoftonline.com' && url.pathname.endsWith('/token')) {
        const form = new URLSearchParams(options.body);
        if (form.get('code') !== 'fixture-code' || !form.get('code_verifier')) throw Error('Unexpected token exchange');
        counts.tokenExchanges = (counts.tokenExchanges ?? 0) + 1;
        return Response.json({access_token: 'synthetic-onedrive', refresh_token: 'synthetic-refresh', expires_in: 3600,
          scope: 'Files.ReadWrite User.Read offline_access'});
      }
      if (url.hostname === 'files.example' && url.pathname === '/' + name && options.credentials === 'omit')
        return new Response(bytes, {headers: {'Content-Type': 'text/plain'}});
      if (url.hostname === 'graph.microsoft.com' && url.pathname.endsWith(`/fixture-root:/${name}:/createUploadSession`)) {
        counts.providerWrites++;
        return Response.json({uploadUrl: 'https://fixture.1drv.com/upload'});
      }
      if (url.hostname === 'fixture.1drv.com' && options.method === 'PUT') {
        if (new Headers(options.headers).has('authorization') || String(options.body) !== String(bytes))
          throw Error('Unexpected fixture upload data');
        counts.providerWrites++;
        return Response.json({id: objectId, name}, {status: 201});
      }
      if (url.hostname === 'graph.microsoft.com' && url.pathname.endsWith('/items/' + objectId)) {
        counts.providerReads++;
        if (counts.providerWrites !== 2) throw Error('Attempted readback without a write');
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        const sha256Hash = [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('');
        return Response.json({id: objectId, name, size: bytes.length, parentReference: {id: 'fixture-root'}, file: {hashes: {sha256Hash}}});
      }
    }
    if (options?.method && !['GET', 'HEAD'].includes(options.method)) counts.providerWrites++;
    throw Error('FIXTURE_NETWORK_DISALLOWED');
  };
  await import(base + '/extension/background.mjs');
  fixture.mount = async () => {
    const {createBasicProviderCards} = await import(base + '/extension/basic-provider-cards.mjs');
    const section = document.createElement('div');
    document.body.replaceChildren(section);
    const cards = createBasicProviderCards({runtime: {
      sendMessage: message => fixture.messageOverride ? fixture.messageOverride(message) : send(message),
    }, document});
    cards.mount(section);
  };
}
