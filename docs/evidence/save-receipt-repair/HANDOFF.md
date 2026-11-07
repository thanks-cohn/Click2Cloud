# 0.3.8 — targeted receipt and remote-save repair

**Receipt inspection fixed and locally/browser verified. End-to-end live save is NOT yet certified.** This branch starts at main `6dc4142c795a7173f47b34aed2ec3b879337c820`. No REDOWN change, production Worker deployment, OAuth registration change, bucket creation, destination reset, merge or push.

Runtime commit: `a44c9d07426edb73c067c26ec1074b70194d0a33` on `dev/p0-save-receipt-repair`. **234 focused tests PASS; 18 browser fixture gates PASS, 3 BLOCKED, 1 NOT TESTED.** The browser gates do not prove Windows native-menu or live-cloud success.

## Confirmed causes and repairs

1. `src/api/service.mjs` derived the API envelope from the returned object's state. A successful `inspectRemoteReceipt` of a blocked transfer therefore became a blocked API call. It now returns `completed / OK` after a successful authorized inspection, preserving the original transfer `state`, `code`, receipt and separate reconciliation inside `data`. Actual authorization, lookup/transport exceptions and response authorization still fail normally; there is no success bypass.
2. `extension/app.mjs` assigned an async Inspect handler without catching rejection. The viewer now immediately displays the saved result, then renders the inspected result or a visible inspection error alongside that saved result. The notification consumer also reads inspection data rather than assuming that a successfully read blocked transfer is an API error. Existing History is not cleared or reinterpreted as a verified save.
3. The production DoH fetch used `redirect:'error'`. Actual workerd rejects that mode before issuing the request. This reproduces the pre-write TypeError and explains why tests replacing production egress missed it. Manual DNS redirect handling now fails closed on non-success responses; it never follows a DNS redirect.
4. The TLS call supplied `ALPNProtocols`. Actual workerd throws `ERR_OPTION_NOT_IMPLEMENTED` for that option, matching Cloudflare's implementation. It is removed. Live diagnostics then exposed the Node TLS wrapper's outbound connection rejection. The Worker now uses the native Cloudflare socket transport, awaiting TCP open before starting TLS with explicit `expectedServerHostname`; Node/injected TLS remains the existing local test seam. Validated literal-IP routing, original-host TLS certificate checking, public-address/redirect guards and credential omission remain in force. This does not fall back to unpinned fetch or disable TLS verification.

`right2cloud-module/src/cloudflare-worker.mjs` now reports a single bounded structured diagnostic identifying request/authentication/claim/writer/source fetch/destination preparation/authorization recheck/prepared-state persistence/write. Source diagnostics further identify DNS/connect/TLS/headers and fixed failure reasons/runtime codes. No exception message, stack, URL, hostname, request header, provider response body or secret is exported. Known provider/security codes remain intact; unexpected pre-write exceptions become `REMOTE_STAGE_FAILED`. A possibly begun write remains uncertain. The parser also normalizes ArrayBuffer versus Uint8Array socket chunks: a real-workerd injected ArrayBuffer fixture reproduced silent byte loss before this change, and passes afterward. This local reproduction is separate from the unresolved live EOF. The imported saver and existing IndexedDB result store retain only whitelisted diagnostic fields, so History, the canonical API and the viewer keep the same evidence.

There is one transfer engine, API, OAuth owner and menu owner. Provisioning source is unchanged. Version is **0.3.8** with the same extension identity, client, callbacks, scopes and saved-state format.

## Evidence classes

- `focused.txt`: full focused source/domain/security/runtime suite. Includes real local workerd/R2/Durable Object writes and independent local object proof; those tests explicitly replace source egress and do not establish remote-account success.
- `browser/browser-results.json`: actual Chromium app/API/IndexedDB using simulated OAuth/provider. The new gate seeds a blocked receipt, opens it successfully, verifies a completed inspection envelope, then forces a real API transport failure and checks visible error + retained original result with zero uncaught page errors. The persisted diagnostic rejects an injected URL field. Screenshot: `browser/failed-receipt-visible-inspection-error.png`.
- `tests/save-receipt-repair.test.mjs`: actual workerd reproduction of unsupported ALPN; production egress DNS redirect handling; native socket boundary test with an explicitly injected socket verifying literal IP, original hostname and TCP-before-TLS ordering; unexpected source/prepare exception diagnostics; blocked receipt envelope and genuine inspection failure. The injected socket is not a network proof.
- `baseline-live-attempt.json`: actual original-main Worker code on the previously authorized isolated Worker. Capabilities passed; save and operation inspection both returned `blocked / REQUEST_FAILED`, reproducing the Windows symptom.
- `live-attempts.json`: chronological intermediate live failures and deployment-propagation mismatches, retained rather than relabeled successful.
- `live-provider.json`: latest actual provider-backed attempt. Environment API-token authorization is distinct from Windows OAuth. The harness only reuses the previously approved isolated Worker bound to existing `redown` and restricts operations to `__click2cloud_true_remote_test__/`. It never selects or updates the user's production Worker.
- `real-shelf-receipt.json`: exact-source unpacked-extension attempt; inspect its actual result. Managed Chrome installation policy blocked earlier attempts, and fixture results never substitute for an installed Windows native click.

No R2 save is certified without a verified Worker receipt **and** independent provider-backed S3 readback. The live harness includes that gate and only deletes an exact newly verified test object after identity reinspection. A pre-write failure does not reach readback or cleanup. The owner's 57-byte readiness proof is accepted as their live evidence; it is not evidence of a source download or of these repaired ordinary saves.

## Remaining live blocker — ordinary saves NOT fixed end to end

The final isolated build passes authenticated capability checks, then the source stream ends before a complete HTTP response header block can be parsed (**empty buffer at the failing line read**), before `destination.prepare` or any possible destination write. Both the live save and its separate operation lookup retain:

```json
{"state":"blocked","code":"SOURCE_HTTP_INVALID","diagnostic":{"kind":"remote-save-stage","stage":"source.fetch","sourceStage":"headers","sourceReason":"http-empty-response","errorKind":"Error","causeCode":"SOURCE_HTTP_INVALID"}}
```

This is a real failed provider-backed attempt, not a simulated failure. Earlier builds exhibited a Node TLS connection rejection; native socket attempts exposed the next boundary and also failed for multiple unrelated public fixtures. The underlying reason for the prematurely ending native TLS/HTTP stream remains **unresolved**. The evidence does not establish whether it is a Cloudflare socket/runtime problem or another transport defect; do not label it a proven account permission issue, provider constraint, or network-policy block. Successful connection/open-stage progression is not independent proof of a completed TLS/HTTP transfer.

No ordinary object reached R2, so independent provider S3 readback and true end-to-end success are **NOT TESTED / BLOCKED**, not PASS. No test objects needed cleanup. Only the previously authorized isolated test Worker was updated; production setup/resources were not changed. An intermediate diagnostic's broad `outbound-address-blocked` classification was narrowed in the final implementation because a generic proxy rejection alone cannot establish a forbidden address.

Next engineering action: isolate why the native socket returns EOF before complete HTTP response headers, under this exact final code digest and account, while retaining IP pinning and original-host certificate verification. Do not replace it with unpinned fetch, remove authorization, retry the old failed operations, or add a second save engine. **This branch is a reviewed repair candidate with an explicitly unresolved live transport failure, not a certified working-save release.** Windows steps below are acceptance/reproduction steps, not a claim that repeating setup will fix the remaining failure.

## Windows acceptance — retain everything

After these branch commits are available in your checkout:

```bat
npm ci
npm run build:extension
```

1. Reload the existing extension at `chrome://extensions`; confirm **0.3.8**, ID `ajppphdiamdobknpamcheohmdbdbeoal`. Do not uninstall, clear storage, disconnect/reconsent, delete `redown`, change defaults or repeat initial setup approval.
2. Open Save results. Inspect one old `blocked / REQUEST_FAILED` operation: the dialog must open normally, retain its original state/code, and display reconciliation separately. If inspection cannot reach Cloudflare, it must display the actual inspection error and retain the original saved result without an uncaught exception.
3. **The isolated live save remains blocked. Keep your production Worker unchanged unless you deliberately choose to reproduce this candidate.** Updating the extension does not silently replace the deployed Worker. Explicitly update only the existing selected destination's Worker through the existing repair API. The following in the **Shelf's DevTools console** uses the current saved target/revision and does not print credentials:

   ```js
   const call = (method, params = {}) => chrome.runtime.sendMessage({channel:'engine', version:'3+1.1', method, params});
   const config = await call('getConfiguration');
   if (config.state !== 'completed') throw Error(config.code);
   const target = config.data.product.defaultTarget;
   if (target?.provider !== 'cloudflare') throw Error('Select your existing Cloudflare default first.');
   const repaired = await call('repairCloudflareDestination', {accountId:target.accountId, target, expectedRevision:config.data.product.revision, idempotencyKey:crypto.randomUUID()});
   console.log({state:repaired.state, code:repaired.code});
   ```

   This is an explicit deployment/repair action to your existing Worker and may incur Cloudflare usage. Existing setup approval, Worker identity/key, bucket and selected target are reused. If it fails, inspect its precise result; do not repeatedly provision or approve setup. Allow rollout propagation before retrying read-only status.
4. After actual readiness succeeds, make a **fresh** right-click save of a small public HTTPS file. Do not replay the old four failed operations. Inspect the new result: a failure must carry bounded stage diagnostics, not crash the viewer. Copy only the safe diagnostic object and code if further investigation is needed.
5. To accept end-to-end success, independently open/read the exact new object in the selected R2 bucket, compare bytes/size, inspect a verified receipt, and use History GO TO to locate that same key in Explorer. Repeat with an image and a second ordinary save, preserving collision behavior and the existing destination/default. Native Chrome success cannot be inferred from these local tests.

**Remaining live failure must be reported as a blocker, not a successful repair of the whole workflow.** See the latest provider receipt and verification summary for the final observed boundary.
