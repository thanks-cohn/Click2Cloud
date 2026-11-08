# P0 permanent destinations repair — 0.3.10

**Runtime source:** `9f8c26dee905c94cd0f5a982ef725279af712207`, branch `dev/p0-permanent-destinations`, based on latest observed main `b5c56a6`. Implementation is committed; production resources and REDOWN are unchanged. The subsequent evidence/documentation commit does not change runtime source.

**Local regression result: PASS. Windows installed-Chrome release acceptance: BLOCKED / NOT VERIFIED.** This report does not close the owner's Windows report based on fixture results.

## Proven causes and repairs

[ROOT-CAUSES.md](ROOT-CAUSES.md) gives the exact failing boundaries and before/after evidence. The original persistence module is preserved and executed against real IndexedDB, not reimplemented in a mock.

- Legacy migration could drop embedded configs on the first otherwise ordinary CURRENT commit without writing standalone mode rows. Real before/after: original **1/1/1 → 0/0/0**; repaired **1/1/1 → 1/1/1**. The owner's precise Windows record shape remains unobserved; this is a reproduced source defect, not an invented profile diagnosis.
- A stale product snapshot could overwrite a newer mode write because only product revision was fenced. Both product and per-mode revisions now protect the same atomic transaction.
- Absent/corrupt established records could silently appear as fresh empty configuration. Presence-only metadata in the existing database and prior journal/native registration evidence stop initialization instead. Null/undefined records, conflicts and legacy-product-only backup overwrite are guarded. No user database is cleared or migrated destructively.
- Some fallback decisions were account/provider filtered. ANY saved assignment in ANY mode/account/provider or Default now blocks redown initialization. Default-only links its exact target; saved assignments without Default remain intact. Only confirmed global emptiness on the next explicit authorized login permits approved, verified redown initialization. Concurrent saved changes abort it.
- Read-only empty-target status previously returned new setup approval even if account consent existed. Retained consent now reports resume; a known initialized account with missing approval reports a recovery error. No consent is synthesized. Ready setups use read-only checks; Worker upgrades remain explicit existing-resource repair.
- Top Explorer navigation rendered without loading the tree. It now uses canonical `enterExplorer`, with durable explicit location → valid saved Default → selected/sole account actual redown/unambiguous bucket, or explicit account/bucket choice. A removed last bucket in account A can fall through to the valid Default in account B.
- Connection notifications now refresh the open Explorer without a Remotes detour; offline labels remain, stale async status/entry replies are ignored, reconnect loads the tree/list without another open action. Remotes remains the initial startup tab.
- Manager works offline, includes Simple/Narrow/Depth counts and rows, and distinguishes saved Default and current availability. Depth inspection/removal uses the canonical API/config transaction. No second engine/store/registrar.
- Release stays on the same extension ID/client and OAuth profile. Windows build output uses `fileURLToPath`, correcting the misleading `C:\C:\...` printed path in the owner's earlier log; actual Windows build execution remains owner verification.

## Evidence

| Gate | Result |
| --- | --- |
| Focused unit/integration/workerd suite | **251 PASS / 0 FAIL**; [focused.txt](focused.txt). Includes real workerd/R2/DO source tests, same canonical save/file actions, global fallback, retained/missing approval, account mismatch, read failures, concurrency and native callback generation/routing. |
| Immutable baseline/CURRENT drift | **4 PASS**; [workings.txt](workings.txt). Original and pre-permanence snapshots remain immutable. |
| Real Chromium app/IndexedDB | **27 PASS / 3 BLOCKED / 1 NOT_TESTED**; [browser/browser-results.json](browser/browser-results.json). Receipt pins runtime revision and `runtimeSourceDirty:false`. Provider/OAuth/native Chrome callbacks are fixtures, except actual OAuth code is exercised with synthetic transport. |
| Configuration lifecycle | 1, 2, 100, 1000 entries **per mode** retain exact product/config JSON through disconnect, database reopen, login/reconcile. Chronological counts, Default, selected account, approval, native generations and SHA256 fingerprints are in the browser receipt. Same persistent profile survives full Chromium process restart with matching configuration fingerprint and 1000/1000/1000 records. |
| Actual OAuth implementation | Refresh success, provider403/503, revoked refresh, declined login, disconnect and full PKCE reconsent/account verification preserve the real IndexedDB config/approval. Synthetic provider responses/Chrome storage, not owner Cloudflare consent. |
| Setup resource reuse | Existing-ready fixture lifecycle has **zero** bucket creation/Worker preparation calls and retained approval. First/last-destination fallback and interrupted recovery separately tested. No live resource provisioning performed this run. |
| Explorer | First top-tab click produces expanded selected tree and file list; one recorded fixture sample **89ms**, not a p95 or Windows performance claim. Background notification and visible reconnect restore without a second open action. API fallback tests include multiple accounts and removed prior bucket. |
| Genuine unpacked extension | **BLOCKED: UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR** on Chromium155.0.8059.79. [real-shelf-receipt.json](real-shelf-receipt.json) records exact source/build/Worker digests, describeCapabilities request and null response because installation was denied. No policy bypass. |
| Build/identity | PASS; [build.txt](build.txt). Version0.3.10, ID `ajppphdiamdobknpamcheohmdbdbeoal`. Windows path conversion library check passes; [windows-path.txt](windows-path.txt), not a Windows build claim. |
| Actual Cloudflare/R2 | **NOT RERUN for this repair**. Existing live restoration byte-readback receipts remain historical. Worker module sources are identical to the prior tested implementation; no update/deployment is needed for this repair. New Windows click/receipt/GO TO remains unverified. |

## Windows acceptance — preserve the existing profile and extension

Use this **repair branch**, not an old main build. Do not uninstall the extension, clear its storage, reset the repository, or create a different Chrome profile. Save or commit unrelated local changes before switching branches.

```bat
cd /d "%USERPROFILE%\Click2Cloud-FRESH"
git status --short
git fetch origin
git switch dev/p0-permanent-destinations
git pull --ff-only
npm ci
npm run test:focused
npm run build:extension
git rev-parse HEAD
```

At `chrome://extensions`, reload the existing extension using the existing `dist\click2cloud` directory. Confirm version **0.3.10** and ID **ajppphdiamdobknpamcheohmdbdbeoal**. Use the same Chrome profile. Do not reapprove setup or deploy a Worker simply to install this persistence repair. An already-outdated Worker may still separately require its existing explicit update; record that state, do not conflate it with renewed bucket setup consent.

1. Before logout, open Manage Destinations. Record Simple/Narrow/Depth totals, chosen Default, a custom prefix, Quick/hidden/order choices and the current source revision. Trusted `getConfiguration` and paginated `listDestinations` return saved data while disconnected. Keep account identifiers/private prefixes local; do not paste tokens, raw storage or credentials.
2. Disconnect. The same entries and Default must remain visible with reconnect status. Reload Chrome/extension; compare. A missing/corrupt-state error must stop setup, not create new destinations. Do not clear storage to bypass it; preserve the profile and use validated recovery.
3. Log into the same account. Existing destinations remain exact; no new setup consent is requested for retained approval. Distinguish real OAuth reconsent, existing Worker upgrade, missing bucket and missing-approval recovery from first-run setup. Never confirm new resources just to force a green state.
4. Click top **File Explorer once**. The connected left tree and preferred/default actual bucket should be selected with a listing. Navigate to a custom folder, restart, and repeat; reconnect while Explorer is visible should restore it automatically. Multiple accounts without valid preference should ask for a choice.
5. With an existing READY target, make a new ordinary right-click save. Inspect receipt and independent R2 object bytes/key, History and GO TO. Repeat with image and collision filename, then restart. This is the remaining actual Windows/cloud acceptance gate, not established by the synthetic provider tests.
6. Optionally, in a controlled owner test configuration, intentionally remove the last assignment and clear Default. Deletion/status alone must not recreate it. The next explicit authorized login should reuse existing redown and retained setup approval, persist ordinary editable Simple root + Default after verification. Any surviving mode/account/provider assignment cancels fallback. Do not delete real buckets or Workers for this test.

Stop and capture safe method/code/revision/count evidence if a gate fails. Missing/deleted browser storage cannot be magically reconstructed by this repair; no automatic guessed recovery is offered. Actual owner-profile data loss, real OAuth renewal and current Windows native saving must be independently observed before release acceptance.

The newly added Explorer latency/Grid/address/single-manager owner work items remain separate outstanding UX work; this persistence repair does not claim they are implemented. No merge to main or production deployment is performed by this branch delivery.
