// Extension-local route authorization. Merely knowing the protocol or accessing
// a content page never grants diagnostics, simulation or exports.
export function createDebugHost({ runtime, api, getMenu, getEvidence, clock = Date.now, grantTtlMs = 300000, exportTtlMs = 30000 } = {}) {
  const allowedUrl = runtime.getURL('extension/mirror.html');
  const grants = new Map();
  function allowed(sender) { return sender?.id === runtime.id && sender.url === allowedUrl; }
  const blocked = code => ({ version: 1, state: 'blocked', code });
  async function request(message, sender) {
    if (!allowed(sender)) return blocked('SENDER_DENIED');
    if (!message || message.version !== 1 || typeof message.method !== 'string') return blocked('INVALID_DEBUG_REQUEST');
    const key = sender.documentId;
    if (!key) return blocked('DOCUMENT_ID_REQUIRED');
    // The allowlisted document emits this only from a trusted button gesture.
    // Grants are document-bound, expire, and confer no live action authority.
    if (message.method === 'authorizeDebug' && message.userGesture === true) {
      if (!grants.has(key) && grants.size >= 64) grants.delete(grants.keys().next().value);
      grants.set(key, { debug: true, export: false, expiresAt: clock() + grantTtlMs, exportExpiresAt: 0 });
      return { version: 1, state: 'completed', code: 'DEBUG_AUTHORIZED' };
    }
    if (message.method === 'revokeDebug') { grants.delete(key); return { version: 1, state: 'completed', code: 'DEBUG_REVOKED' }; }
    const grant = grants.get(key);
    if (!grant || grant.expiresAt <= clock()) { grants.delete(key); return blocked('DEBUG_AUTHORIZATION_REQUIRED'); }
    if (message.method === 'authorizeExport') {
      if (message.userGesture !== true) return blocked('EXPORT_USER_GESTURE_REQUIRED');
      grant.export = true; grant.exportExpiresAt = clock() + exportTtlMs;
      return { version: 1, state: 'completed', code: 'ONE_EXPORT_PAGE_AUTHORIZED' };
    }
    // Exact labels/routes stay inside the local trusted UI. The portable agent
    // API below exports only scoped aliases and source-owned diagnostic facts.
    if (message.method === 'inspectCanonicalMenu') return { version: 1, state: 'completed', data: { menu: getMenu(), evidence: getEvidence() } };
    const allowedMethods = new Set(['describeEngine', 'inspectMenu', 'inspectOperation', 'getDiagnosticSnapshot', 'simulateMenuAction', 'diffMenuGenerations', 'exportReceipt']);
    if (!allowedMethods.has(message.method)) return blocked('READ_ONLY_METHOD_REQUIRED');
    const authorization = { debug: true, export: false, expiresAt: grant.expiresAt };
    if (message.method === 'exportReceipt') {
      const authorized = grant.export && grant.exportExpiresAt > clock();
      grant.export = false; grant.exportExpiresAt = 0;
      if (!authorized) return blocked('EXPORT_AUTHORIZATION_REQUIRED');
      authorization.export = true;
    }
    const args = message.args ?? {};
    if (message.method === 'inspectMenu' && !api) return { version: 1, state: 'completed', data: { menu: getMenu(), evidence: getEvidence() } };
    if (!api?.[message.method]) return blocked('DIAGNOSTIC_API_UNAVAILABLE');
    return api[message.method](args, { sender: { id: sender.id, url: sender.url, documentId: key }, grant: authorization });
  }
  return Object.freeze({ request, authorize: (_request, context) => context?.grant ?? false });
}
