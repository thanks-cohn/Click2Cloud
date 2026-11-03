// Click2Cloud: pure, side-effect-free menu compiler.
// The Portal and Chrome native adapter must consume this same output.
const ROOT = 'c2c:root';
const CLOUDFLARE = 'c2c:cloudflare';
const MODES = new Set(['simple', 'narrow', 'depth']);

export class MenuConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MenuConfigurationError';
  }
}

const cmp = (a, b) => a === b ? 0 : a < b ? -1 : 1;

export function normalizePath(path = '') {
  if (typeof path !== 'string' || path.startsWith('/') || path.includes('\\')) {
    throw new MenuConfigurationError('Folder paths must be relative R2 key paths');
  }
  const stripped = path.endsWith('/') ? path.slice(0, -1) : path;
  if (stripped === '') return '';
  const pieces = stripped.split('/');
  if (pieces.some(p => !p || p === '.' || p === '..')) {
    throw new MenuConfigurationError('Invalid, empty, or traversing folder component: ' + path);
  }
  return pieces.join('/');
}

// Fixed-length, deterministic ID independent of input order, locale and UI runtime.
function stableId(input) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(input)) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return 'c2c:' + hash.toString(16).padStart(16, '0');
}

function ancestors(path) {
  const parts = path.split('/');
  return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
}

function folderName(path) {
  return path.split('/').at(-1);
}

/**
 * Compiles a *real* menu specification. It does not perform I/O or upload files.
 * @param {object} input
 * @param {'simple'|'narrow'|'depth'} input.mode
 * @param {string} input.bucket actual Cloudflare R2 bucket
 * @param {string[]} input.folders normalized bucket-relative discovered paths
 * @param {object} input.config {simple:[], narrow:[], depth:{maxDepth:number}}
 * @param {object[]} input.flatProviders authenticated non-Cloudflare leaf destinations
 * @returns {{schemaVersion:number, mode:string, nodes:Array}}
 */
export function compileMenu({ mode, bucket, folders = [], config = {}, flatProviders = [] }) {
  if (!MODES.has(mode)) throw new MenuConfigurationError('Unsupported mode: ' + mode);
  if (typeof bucket !== 'string' || !bucket) throw new MenuConfigurationError('Missing R2 bucket');

  const discovered = new Set();
  for (const raw of folders) {
    const normalized = normalizePath(raw);
    if (normalized) for (const parent of ancestors(normalized)) discovered.add(parent);
  }
  const nodes = [];
  const byId = new Map();
  const siblingLabels = new Map();
  function add({ id, parentId = null, label, kind, intent = null, key }) {
    if (!label || !['menu', 'action'].includes(kind)) {
      throw new MenuConfigurationError('Invalid menu node: ' + key);
    }
    if (byId.has(id)) throw new MenuConfigurationError('Duplicate stable ID: ' + id);
    if (parentId !== null && !byId.has(parentId)) {
      throw new MenuConfigurationError('Missing parent: ' + parentId);
    }
    const siblingKey = JSON.stringify([parentId, label]);
    if (siblingLabels.has(siblingKey)) {
      throw new MenuConfigurationError('Sibling label collision: ' + label);
    }
    siblingLabels.set(siblingKey, true);
    const node = { id, parentId, label, kind, intent, key };
    byId.set(id, node);
    nodes.push(node);
    return id;
  }
  const intentFor = path => ({ provider: 'cloudflare', bucket, path });
  add({ id: ROOT, label: 'REDOWN', kind: 'menu', key: 'root' });
  add({ id: CLOUDFLARE, parentId: ROOT, label: 'Cloudflare R2', kind: 'menu', key: 'provider:cloudflare' });

  const flat = [...flatProviders].sort((a, b) => cmp(a.label, b.label) || cmp(a.id, b.id));
  for (const provider of flat) {
    if (!provider.id || !provider.label || provider.id === 'cloudflare') {
      throw new MenuConfigurationError('Invalid flat provider configuration');
    }
    add({
      id: stableId('flat:' + provider.id),
      parentId: ROOT,
      label: provider.label,
      kind: 'action',
      intent: { provider: provider.id, destinationId: provider.destinationId ?? null },
      key: 'flat:' + provider.id
    });
  }

  const checkDestination = destination => {
    if (typeof destination !== 'object' || destination === null) {
      throw new MenuConfigurationError('Invalid destination');
    }
    const path = normalizePath(destination.path ?? '');
    if (path && !discovered.has(path)) {
      throw new MenuConfigurationError('Undiscovered destination: ' + path);
    }
    return path;
  };

  if (mode === 'simple') {
    const simple = [...(config.simple ?? [])].map(item => ({
      ...item, normalizedPath: checkDestination(item)
    })).sort((a, b) => cmp(a.label ?? folderName(a.normalizedPath), b.label ?? folderName(b.normalizedPath)) || cmp(a.normalizedPath, b.normalizedPath));
    for (const destination of simple) {
      const path = destination.normalizedPath;
      add({
        id: stableId('simple:' + bucket + ':' + path + ':' + (destination.id ?? '')),
        parentId: CLOUDFLARE,
        label: destination.label || (path ? folderName(path) : bucket),
        kind: 'action',
        intent: intentFor(path),
        key: 'simple:' + path
      });
    }
  } else {
    const selected = new Map();
    let pathSet = new Set();
    if (mode === 'narrow') {
      for (const item of config.narrow ?? []) {
        const path = checkDestination(item);
        if (!path) throw new MenuConfigurationError('Narrow requires a folder path');
        if (selected.has(path)) throw new MenuConfigurationError('Duplicate configured Narrow path: ' + path);
        selected.set(path, item.label || folderName(path));
        for (const ancestor of ancestors(path)) pathSet.add(ancestor);
      }
    } else {
      const maxDepth = config.depth?.maxDepth ?? 10;
      if (!Number.isSafeInteger(maxDepth) || maxDepth < 1) {
        throw new MenuConfigurationError('Depth must be a positive integer');
      }
      pathSet = new Set([...discovered].filter(p => p.split('/').length <= maxDepth));
    }
    const sortedPaths = [...pathSet].sort((a, b) => (a.split('/').length - b.split('/').length) || cmp(a, b));
    for (const path of sortedPaths) {
      const childExists = [...pathSet].some(p => p.startsWith(path + '/'));
      const intendedDestination = mode === 'depth' || selected.has(path);
      const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : null;
      const parentId = parentPath === null ? CLOUDFLARE : stableId(mode + ':' + bucket + ':' + parentPath);
      const id = stableId(mode + ':' + bucket + ':' + path);
      add({
        id, parentId, label: selected.get(path) || folderName(path),
        kind: childExists || !intendedDestination ? 'menu' : 'action',
        intent: childExists || !intendedDestination ? null : intentFor(path),
        key: mode + ':' + path
      });
      // Chrome submenu parents cannot also dispatch a save. Give them an explicit leaf.
      if (childExists && intendedDestination) {
        add({
          id: stableId(mode + ':' + bucket + ':' + path + ':save-here'),
          parentId: id,
          label: 'Save here',
          kind: 'action',
          intent: intentFor(path),
          key: mode + ':save-here:' + path
        });
      }
    }
  }
  return { schemaVersion: 1, mode, nodes };
}
