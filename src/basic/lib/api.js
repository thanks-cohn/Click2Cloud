import {trustedAppSender} from '../../chrome/trusted-sender.mjs';
import { PROVIDERS, providerId, fail, safeError } from "./common.js";
import { exportDiagnostics, zipDataUrl } from "./zip.js";
import {createHistoryPreviewReader} from './history-preview.js';
import {livePreviewLimit,previewMime} from './preview.mjs';
export const CONTRACTS = Object.freeze({
  "api.describe": {},
  "providers.list": {},
  "providers.getStatus": { provider: "provider" },
  "providers.checkSaveReadiness": { provider: "provider" },
  "providers.goTo": { provider: "provider" },
  "auth.connect": { provider: "provider" },
  "auth.reconnect": { provider: "provider", previewId: "string?" },
  "auth.refresh": { provider: "provider" },
  "saves.start": {
    provider: "provider",
    sourceUrl: "string",
    hostUrl: "string?",
    filename: "string?",
    requestId: "string?",
  },
  "saves.getAttempt": { id: "string" },
  "saves.pending": { provider: "provider" },
  "saves.resume": { provider: "provider", id: "string" },
  "history.list": { page: "integer?", pageSize: "integer?" },
  "history.latestOutcome": { provider: "provider" },
  "history.get": { id: "string" },
  "history.readImagePreview": {id:"string",provider:"provider",accountId:"string",objectId:"string",requestId:"string"},
  "history.cancelImagePreview": {requestId:"string"},
  "history.delete": { id: "string" },
  "history.clear": {},
  "counter.get": {},
  "settings.get": {},
  "settings.update": {
    pageSize: "integer?",
    diagnosticsEnabled: "boolean?",
    diagnosticsCap: "nullableInteger?",
  },
  "diagnostics.list": { page: "integer?", pageSize: "integer?" },
  "diagnostics.getForAttempt": {
    id: "string",
    page: "integer?",
    pageSize: "integer?",
  },
  "diagnostics.clear": {},
  "diagnostics.exportZip": {},
});
function validate(op, input) {
  const shape =
    typeof op === "string" && Object.hasOwn(CONTRACTS, op)
      ? CONTRACTS[op]
      : null;
  if (!shape) throw fail("UNKNOWN_OPERATION", "Unknown API operation.");
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw fail("INVALID_INPUT", "Input must be an object.");
  for (const key of Object.keys(input))
    if (!Object.hasOwn(shape, key))
      throw fail("INVALID_INPUT", `Unexpected input: ${key}.`);
  for (const [key, type] of Object.entries(shape)) {
    const value = input[key],
      optional = type.endsWith("?"),
      base = type.replace("?", "");
    if (value === undefined && optional) continue;
    const valid =
      base === "provider"
        ? PROVIDERS.some((p) => p.id === value)
        : base === "integer"
          ? Number.isSafeInteger(value)
          : base === "nullableInteger"
            ? value === null || Number.isSafeInteger(value)
            : typeof value === base;
    if (
      !valid ||
      (typeof value === "string" &&
        (value.length > 8192 || (key === "id" && !value.trim())))
    )
      throw fail("INVALID_INPUT", `Invalid input: ${key}.`);
  }
}
export function validateBasicRequest(message) {
  if (message?.api !== 1)
    throw fail("API_VERSION_UNSUPPORTED", "Expected API version 1.");
  const input = message.input === undefined ? {} : message.input;
  validate(message.op, input);
  return input;
}
export function createApi({auth, chrome, durable, afterAuth, previewAdapters}) {
  const previews = createHistoryPreviewReader({auth,adapters:previewAdapters,
    readAttempt:async id => (await durable()).store.getAttempt(id)});
  const describe = status => ({
    ...PROVIDERS.find(p => p.id === providerId(status.provider)),
    ...status,
  });
  const status = async provider => describe(await auth.snapshot(provider));
  async function invoke(op, input = {}, saveOptions, owner) {
    validate(op, input);
    switch (op) {
      case "api.describe":
        return {
          version: 1,
          operations: CONTRACTS,
          callers:
            "Internal background modules and same-extension extension/app.html. No websites, content scripts, or external extension callers.",
        };
      case "providers.list":
        return Promise.all(PROVIDERS.map((p) => status(p.id)));
      case "providers.getStatus":
        return status(input.provider);
      case "providers.checkSaveReadiness":
        return describe(await auth.status(input.provider));
      case "providers.goTo":
        await chrome.tabs.create({
          url: PROVIDERS.find((p) => p.id === input.provider).website,
        });
        return { opened: true };
      case "auth.connect":
      case "auth.reconnect": {
        let previewIdentity;
        if(input.previewId!==undefined){
          if(input.provider!=='dropbox')throw fail('INVALID_INPUT','Image read consent applies to Dropbox.');
          const row=await (await durable()).store.getAttempt(input.previewId);
          if(row?.id!==input.previewId||row.provider!=='dropbox'||row.state!=='SAVED'||row.confirmed!==true||
            !row.objectId||!row.destination?.accountId||!row.destination.namespace||
            !previewMime(row.mime,row.filename)||!Number.isSafeInteger(row.bytes)||row.bytes<1||row.bytes>livePreviewLimit)
            throw fail('PREVIEW_RECORD_UNAVAILABLE','The confirmed Dropbox image record is unavailable.');
          previewIdentity=[row.destination.accountId,row.destination.namespace];
        }
        const result = await auth[op === "auth.connect" ? "connect" : "reconnect"](input.provider,previewIdentity);
        if (result.ready&&!previewIdentity) afterAuth?.(input.provider);
        return describe(result);
      }
      case "auth.refresh":
        return describe(await auth.refresh(input.provider));
      case "history.readImagePreview":
        return previews.read(input,owner);
      case "history.cancelImagePreview":
        return previews.cancel(input.requestId,owner);
    }
    const {store: data, coordinator: saves} = await durable();
    switch (op) {
      case "saves.start":
        return saves.start(input, saveOptions);
      case "saves.pending":
        return saves.pending(input.provider);
      case "saves.resume":
        return saves.resume(input.provider, input.id);
      case "history.latestOutcome":
        return data.latestOutcome(input.provider);
      case "saves.getAttempt":
      case "history.get":
        return (await data.getAttempt(input.id)) || null;
      case "history.list":
        return data.historyList(input);
      case "history.delete":
        return data.historyDelete(input.id);
      case "history.clear":
        return data.historyClear();
      case "counter.get":
        return data.counter();
      case "settings.get":
        return data.settings();
      case "settings.update":
        return data.updateSettings(input);
      case "diagnostics.list":
        return data.diagnosticsList(input);
      case "diagnostics.getForAttempt":
        return data.diagnosticsForAttempt(input.id, {
          page: input.page,
          pageSize: input.pageSize,
        });
      case "diagnostics.clear":
        return data.diagnosticsClear();
      case "diagnostics.exportZip": {
        const { bytes, filename } = await exportDiagnostics(data);
        const downloadId = await chrome.downloads.download({
          url: zipDataUrl(bytes),
          filename,
          saveAs: true,
        });
        return { filename, downloadId };
      }
    }
  }
  return {
    invoke,
    async message(message, sender) {
      if (!trustedAppSender(chrome.runtime, sender))
        return {
          ok: false,
          error: {
            code: "CALLER_DENIED",
            message: "Only the REDOWN Shelf may call this API.",
          },
        };
      try {
        return {ok: true, value: await invoke(message.op, validateBasicRequest(message),undefined,sender.documentId ?? sender.url)};
      } catch (e) {
        return { ok: false, error: safeError(e) };
      }
    },
  };
}
