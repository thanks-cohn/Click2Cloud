# P0 Shelf → engine communication

Implementation commit: `3a19ac1723458ff137037fb6d5f09b330e54f52e` on `dev/p0-shelf-engine-communication`, from main `d01a2c09cc3fa4f29862c1a3984845c139edd5a5`.

Status: implementation and local regressions PASS; genuine installed Shelf acceptance BLOCKED here. Do not treat this report as a verified repair on Windows Chrome.

## Reproduced failure mechanism

Before this repair, `src/chrome/trusted-sender.mjs:trustedAppSender` required a nonempty `sender.documentId`. Chrome's [official MessageSender documentation](https://developer.chrome.com/docs/extensions/reference/api/runtime#type-MessageSender) makes documentId optional; the fetched public reference excerpt is saved in official-runtime-reference.json. The existing background listener returned false without responding whenever that condition failed, even when Chrome supplied the correct extension ID and exact `extension/app.html` URL. The engine being initialized did not affect this earlier guard.

The Shelf awaited runtime.sendMessage. When it received undefined, it constructed an error with an undefined code; bootstrap replaced that with ENGINE_UNAVAILABLE. Separately, any ready/invoke rejection became ENGINE_UNAVAILABLE in the background. Thus the reported engine message concealed at least three distinct failure stages. A prematurely closed port is consistent with the response lifecycle failing, but the owner's exact Windows sender fields were not captured in this run. Missing documentId is a source-reproduced defect, not a fabricated observation of the owner's machine. A different URL/origin will now produce its actual rejection reason.

## Actual call and response path

1. `extension/app.mjs:api` sends `{channel:'engine',version:'3+1.1',method,params}`. Bootstrap requests getConfiguration, loginStatus, describeCapabilities, then Shelf context.
2. The one `extension/background.mjs` runtime listener preserves the separate existing diagnostic mirror route; unrelated channels are ignored.
3. Engine requests use `appSenderDecision` from the existing trusted-sender owner. Chrome-supplied sender.id must match runtime.id, and sender.url must match the exact app path with only optional fragment navigation. Query/path/origin changes remain rejected. If sender.origin exists it must match the extension origin. Optional documentId, when present, must be a nonempty string. No message-body identity is trusted. There are no new web-accessible pages, content scripts, external-message handlers, host permissions or API grants.
4. A rejected engine request receives a versioned blocked envelope: UNTRUSTED_APP_SENDER with a fixed reason such as APP_URL_MISMATCH. It never invokes the engine.
5. An accepted request returns **literal true**, waits for the existing ready promise, then awaits the existing `api.invoke(...,'gui')`. The existing listener already used literal true before this change; this is not a new asynchronous-listener workaround.
6. The API result is returned through the same respond callback. Startup rejection, an unexpected invocation exception, or an invalid result receive structured ENGINE_STARTUP_FAILED / ENGINE_INVOCATION_FAILED / ENGINE_RESPONSE_INVALID envelopes. Fixed stages and sanitized constant cause codes/known DOM exception names are retained; raw exception text, credentials and user data are not exported.
7. The Shelf distinguishes ENGINE_NO_RESPONSE, ENGINE_RECEIVER_MISSING, ENGINE_RESPONSE_CHANNEL_CLOSED, ENGINE_MESSAGE_SEND_FAILED, invalid envelope and explicit engine/API failure. Bootstrap displays method/stage/reason/cause and retains its existing Retry. The app no longer invents ENGINE_UNAVAILABLE for an undefined response.

A browser crash, service-worker termination or a closed document cannot be forced to return a structured response; the Shelf now identifies those transport outcomes instead of silently treating them as an engine result. Normal accepted requests and handled failures settle through the sole listener. No second engine, listener, public endpoint, transport retry or cloud-operation replay was added.

## Preservation and build identity

Version is now **0.3.4** so a rebuilt installation is distinguishable from 0.3.3. The manifest public key and extension ID `ajppphdiamdobknpamcheohmdbdbeoal` are unchanged. OAuth, CURRENT/destination storage, menus, Cloudflare provisioning and user-data owners were not changed or migrated. No Chrome profile was reset. REDOWN and live Cloudflare resources were untouched.

The permanent workings JSON preserves its original baseline digest and adds ENTRY_MESSAGE and ENTRY_CLIENT_RESPONSE to CURRENT, with fresh runtime source hashes and errors. Runtime and tests/map are committed together. The acceptance receipt pins the subsequent clean committed build via sourceRevision plus sourceDigest.

## Automated checks and evidence classes

- `tests/shelf-message-boundary.test.mjs`: optional metadata acceptance; exact ID/path/fragment provenance; malformed/conflicting metadata and attacker URLs rejected.
- `scripts/test-product-browser.mjs`: real Chromium executes actual app/background modules with a **local Chrome transport fixture**. The actual background listener answers a valid request without documentId, rejects a changed URL with the exact reason, answers invalid API requests, and reports startup rejection while holding its callback channel. Actual app startup distinguishes undefined, closed port, absent receiver, explicit denial and invalid envelope. These are not installed-extension receipts.
- `scripts/test-shelf-extension.mjs`: **real unpacked extension only**, isolated disposable profile, real runtime messages and the real production app. Chrome must confirm a SIDE_PANEL context and a distinct genuine Shelf target. It checks service-worker readiness, Shelf describeCapabilities (including the exact build), structured invalid-method response, actual Shelf bootstrap/reload, and real query-changed page denial. It does not stub runtime.sendMessage, inject sender objects or substitute an ordinary tab for the Shelf. It never starts OAuth or calls a cloud-write API. playwright-core is the one development dependency added for this portable browser runner; no browser or production dependency is bundled.

Managed Chromium in this environment declares `ExtensionInstallBlocklist: ["*"]`. The unpacked load attempt returned `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`. No policy was bypassed. `real-shelf-receipt.json` records BLOCKED, the exact request and a null response because no Shelf response could be obtained. No installed-Shelf PASS is claimed. Real Windows consent/account/cloud behavior is outside this communication-only test and was not exercised.

Recorded checks: **192/192 focused tests**, **13/13 real-Chromium local-fixture gates**, extension build and strict TypeScript API declaration check PASS. See focused.txt, target.txt, build.txt, types.txt, browser/browser-results.json and real-shelf-receipt.json. The genuine acceptance result is **BLOCKED**, not PASS. Baseline remains immutable; CURRENT now has 64 behavior entries and 76 runtime source hashes.

## Run the genuine test in Windows CMD

After obtaining this implementation branch, run these commands in the Click2Cloud checkout. They build the same-key extension and launch an isolated instance of installed Google Chrome; your normal Chrome profile is not used or cleared.

```bat
npm ci
npm run build:extension
npm run test:shelf:extension
```

If Chrome is installed at a nonstandard location:

```bat
set "C2C_CHROME_EXECUTABLE=C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run test:shelf:extension
```

Receipt: `docs\evidence\shelf-engine\real-shelf-receipt.json`; a genuine Shelf screenshot is saved when supported. Exit code 0 means all genuine acceptance gates passed; 2 means administrator-blocked; 1 means failed acceptance. A headless Linux attempt can use `C2C_HEADLESS=1`; a headed Windows run is the intended owner reproduction. Do not change managed browser policy to make this test green.

For the owner's existing extension, rebuild and click Reload on chrome://extensions for this same ID. This repair does not require uninstalling the extension, clearing storage or reauthorizing Cloudflare. Existing authorization still needs to be valid. If startup remains blocked, its displayed method/stage/reason plus the real receipt are the next evidence, rather than another generic engine-unavailable guess.
