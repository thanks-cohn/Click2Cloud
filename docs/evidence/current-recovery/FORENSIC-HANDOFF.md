# CURRENT loss: forensic repair and recovery handoff

P0 remains OPEN for the original Windows profile. Implementation branch: `dev/p0-current-recovery`; baseline `3805acbe1bce14db88077acf5d688fa83bf76b2e` (main, 0.3.13). Production commits: `84f0e19`, `bac7886`, `122cc45`, `05f6d5e`, `9ab8527`; final tested production source **`9ab852767a74b207d082011f66bd1cbe65534834`** (0.3.14). The latter commits correct a provider-callback name collision, reject contradictory partial history, preserve opaque handles/backup provenance and keep absent-database backup status read-only. Final test/build pins, counts and performance are in `verification.json`. No main merge, deployment, cloud resource mutation or REDOWN edit is included.

## What is known, and what is not

**Owner evidence, not a profile capture in this environment:** Windows Chrome retains native desired generation 583 and a connected OAuth session. The six CURRENT configuration rows and configuration/product/generation journal events are absent in `click2cloud-current-v1`. Other rows, checkpoints, other authorized same-origin databases and independently retained files were not inspected on that original machine. The original profile is not mounted here. No exact owner configuration, forensic copy or usable owner backup was obtained. Test profiles and repository evidence are not recovery sources for the owner.

**Proven source mechanism / reproduced equivalent:** baseline CurrentStore synthesizes product/modes/generation defaults when neither its integrity marker nor configuration journal survives. Its direct read resolves with generation zero. The independent background native-generation fence rejects that result as CONFIGURATION_RECORD_MISSING. `baseline.json` records the original source, real Chromium IndexedDB and execution of the actual extracted background read function with synthetic native 583 evidence. This is a reproduction of the guard failure chain, not a record of the owner's lost destinations or an authenticated Windows run. The early direct-store receipt did not execute OAuth; its historical OAuth annotation is explicitly qualified. A separate later corroboration in `original-shelf/results.json` executes the unchanged 0.3.13 Shelf/background with genuine browser IndexedDB and dependency-fixture OAuth: CONNECTED, direct desired=0, configuration blocked, native583 and raw rows preserved, zero non-auth cloud work.

The protected failure prevents a configuration-dependent setup/save. Removing the native snapshot, changing 583 to zero, manufacturing empty records, or relaxing that guard would hide loss rather than restore preferences. Those actions were not performed.

**Original destructive trigger: UNKNOWN.** No available event trace identifies when/how the records disappeared. No claim that OAuth deleted them is supported. The first harmful *logical* operation found is treating absence without local provenance as fresh defaults; that does not identify the earlier physical deletion. The report does not confuse these two causes.

## Source and history inventory

| Owner | Actual behavior before repair | Evidence / effect of repair |
|---|---|---|
| `src/persistence/current-store.mjs:open/transact` | One fixed database name, version 1, stores state/journal/checkpoints. Upgrade creates stores. Version change closes connection. No production database deletion/clear. | Same database/version/identity. Rejected opens retry; blocked requests cannot leave late untracked connections. Strict-durability write transactions, atomic boundary, explicit readback. |
| `loadState` | Marker requires only recorded product/modes; legacy config/product journal supplies presence evidence. Missing generation otherwise defaults to zero. Missing all sources makes defaults appear valid. | External native/provenance plus internal marker/journal/checkpoint/setup history distinguish established loss. Direct reads/writers reject missing boundary. Fresh reads explicitly say FRESH_VERIFIED. |
| `commitProduct`, `saveModeConfig`, `generationChange` | Product/modes and generation may be separate transitions; generation writer does not validate whole configuration. Mode-only writes can establish partial boundaries. | Every configuration/generation/setup writer validates and materializes the complete boundary in its existing transaction; existing rows win. Journal/idempotency remain owned here. |
| Integrity / journal | Integrity introduced in `9f8c26d`; presence marker shares config transaction, but can disappear with data. Journal retention is 4096 events; old events are pruned one at a time. | Internal provenance plus minimal Chrome-local establishment metadata; no shadow destinations. Journal/checkpoint presence is historical evidence, not an empty-install signal. |
| `restoreEncrypted` | Authenticated encrypted bundle, restore-only-into-empty guard, one transaction. | Established/history-bearing installs must use preview-bound recovery, not the empty-store route. Fresh encrypted restores materialize a full boundary/read back. |
| Legacy `product.configs` | Read-only normalization; explicit commit persists modes. No destructive migration. | Legacy paths retained; conflicting embedded/separate modes block. Old valid configs preserved through cross-version fixture. |
| `src/chrome/registrar.mjs` | Serial desired plan → Chrome-local prepare → removeAll/create → callbacks → persisted ACK. Prepare write failure still allowed native mutation. | Failed prepare stops before clear. Production beforeApply validates CURRENT before prepare and again before clear. Previous-process ACK is never new Chrome proof. |
| `src/core/engine.mjs` | Desired generation persisted before registration; Current ACK after actual callback success. Retained plans could outlive local authority. | Missing CURRENT or changed menu intent blocks direct engine saves; generation and intent rechecked before remote authorization. WeakMap binds compiled intent without another configuration store; visual preferences do not invalidate saves. |
| `extension/background.mjs` | Separate post-read native>0/Current0 guard. Normal login already independent after boot repair. | CurrentStore receives safe establishment evidence; bounded CURRENT_STORE vs BACKGROUND_NATIVE_FENCE origin/subreason. Existing guard retained. One sender handler/API/engine. |
| External recovery | Explicit user-authorized directory handle in CURRENT, checksum/readback files and journals; no native Windows companion. Independent namespace writes could silently combine an absent/stale Depth/policy with menu defaults. | Final verified boundary manifest binds all three namespaces. Missing/mixed/legacy-unbound evidence is blocked, not declared complete. No automatic folder creation/attachment. |

Read-only history comparison `0222969` (0.3.12) → `df92b33` (owner 0.3.13) shows CurrentStore changes to rejected-open caching and closed-connection retry, not config deletion or a DB-name/version migration. The baseline main `3805acb` has the same production `src`, `extension` and Worker source as owner `df92b33` (empty source diff), so the equivalent uses the actual failing production code. The complete local Git history is not shallow. Historical `clear()` matches in background are in-memory readiness caches; CURRENT's production state deletion is bounded retry-key eviction, and journal deletion is bounded retention. These do not explain all six rows plus zero journal. No production `indexedDB.deleteDatabase`, state.clear or storage.clear path was found in the audited owners. Test utilities intentionally deleting records are isolated fixtures and are not extension build inputs.

Not established: browser/profile mismatch, alternate old database, origin/storage eviction/policy action, external wipe, a still-unobserved legacy/version transition, accidental devtools mutation, or partial independent recovery/import. Stable manifest key and ID are source-verified; this does not prove which Windows profile the owner opened. There is no evidence to attribute the deletion to any one hypothesis.

## Storage timeline and atomicity limits

1. **Fresh:** read metadata; no history proof permits explicitly identified fresh defaults. Read-only health/preview do not create a missing database.
2. **Explicit configuration/setup commit:** validate prior state/revisions; atomically persist product, all modes, generation, integrity/provenance and relevant journal/retry/checkpoint; await strict transaction completion; validate a separate durable read; retain minimal external establishment metadata. A prior saved destination/default is never replaced by initialization.
3. **Menu:** compile current intent; persist desired generation durably; queued registrar validates CURRENT; persist native prepare; validate again; remove/create with actual callbacks; record native outcome; acknowledge exact generation in CURRENT. A failure stays pending/blocked, never a fake ACK.
4. **Shelf/reload/login:** Remotes/auth stay independent; no implicit provision/reconcile. State-dependent actions use the same CURRENT fence.
5. **Loss:** evidence identifies established missing/corrupt state. No menu clear, setup, default initialization, save or silent reset. Inspection stays read-only; original metadata remains.
6. **Explicit recovery:** validated preview → immutable candidate+evidence digest → separate owner confirmation → verified external preimage → recheck evidence/conflicts inside one recovery transaction → durable readback → compile restored CURRENT → exact native ACK. Retried idempotency key does not create a second revision/menu.

Chrome local, IndexedDB, filesystem and native menu callbacks cannot share an atomic transaction. A crash after CURRENT commit but before external provenance/native ACK can leave committed state and an incomplete response; existing retry records/readback and local integrity keep it explicit. A successful browser transaction is not a promise against disk hardware loss or deletion of every independent copy.

## Recovery sources and preservation coverage

| Candidate | Actual availability / interpretation |
|---|---|
| Original same-origin CURRENT rows | Owner reports six absent. Remaining records/checkpoints uninspected on Windows. Do not overwrite surviving rows. |
| Complete contiguous local journal | Implemented validation/reconstruction and exercised with real IndexedDB. Requires product, all modes and generation, closed bundle validation and chain continuity. Mode checkpoints alone are partial. |
| Independent external CURRENT/journals | Supported only if a directory is already explicitly authorized and accessible; checksum + schema + cross-namespace manifest required. None located for the owner here. |
| Earlier unbound external backup | Reported RECOVERY_BOUNDARY_UNVERIFIED; not automatically upgraded into trusted completeness. Manual forensic review may establish a separate verified source later. |
| Native MenuSpec generation 583 | Partial projection only. Cannot recover hidden/mode-only destinations, all aliases/preferences/default/approvals. Preview reports PARTIAL_PROJECTION_ONLY_NOT_RESTORABLE; no fabricated restoration. |
| Other same-origin databases | Health reports same-origin DB count, not names/values. No cross-origin/profile probing. Actual owner inventory remains pending. |
| Encrypted portable bundle | Existing fresh-store import remains. Recovery from an owner-supplied bundle into a damaged established profile is not a new GUI upload path in this repair. Preserve/review it separately; do not reset the original to enable import. |

Before apply, the existing authorized external recovery owner retains `current-evidence-<checksum>.json`, checks its checksum and exact JSON readback. It contains private local records and must remain in the owner's private selected directory, never posted to an issue/chat. Evidence covers JSON configuration/journal/checkpoint/other JSON records exactly. Filesystem handles are opaque capabilities: the snapshot identifies their presence/kind; it does **not** export/recreate them. Recovery leaves them and unrelated setup/history records in the original database unchanged. This is not a full Chrome-profile forensic image. For the real incident, preserve a separate complete local profile copy before changing the installed extension or approving recovery.

Candidate/evidence changes reject with RECOVERY_EVIDENCE_CHANGED; surviving configuration disagreement rejects CONFIGURATION_CONFLICT; incomplete/stale/mixed sources block. Backup preservation failure prevents CURRENT/native mutation. A candidate schema/checksum is integrity evidence, not a cryptographic attestation from Cloudflare. The owner must review exact identities locally in the preview; tokens/consent are not manufactured or transferred. No cloud read/write is needed by recovery.

## State / behavior matrix

OAuth is orthogonal to every row. Connected never means configured/ready/verified-save.

| State | Reads and GUI | Configuration/native writes | Recovery / readiness |
|---|---|---|---|
| FRESH_VERIFIED | Explicit fresh status; Remotes/auth usable | Explicit authorized first config/setup may establish boundary; no login-time provisioning | No historical intent inferred |
| ESTABLISHED_VALID | Normal canonical configuration | Expected revisions, atomic commits, exact generation/intent | Readable does not imply cloud readiness |
| ESTABLISHED_MISSING | Safe counts + recovery card in Remotes/Settings/Explorer; no guessed locations | Block config/setup/save/native clear | Preview surviving sources only |
| ESTABLISHED_CORRUPT | Typed validation failure; independent login remains | Block; preserve rows | Validated recovery or forensic review |
| RECOVERY_AVAILABLE | Existing requestRestorePreview returns available + proof + local candidate review | Preview writes nothing | Separate confirmation and external preservation required |
| RECOVERY_CONFLICT | Explain disagreement/staleness | No automatic merge/overwrite | Preserve and review independently |
| RECOVERY_APPLYING | GUI disables repeated apply; canonical recovery API serializes; fingerprint/retry guarded | One transaction after verified preimage; unrelated rows preserved | Failures visible; no cloud effects |
| RESTORED_PENDING_NATIVE_ACK | Restored CURRENT readable; desired/applied differ or no current-process ACK | Only canonical reconcile | No fake save-ready result |
| READY | Valid CURRENT + exact current-generation Chrome callbacks | Save still requires actual provider authority/transport | Success only after independently verified provider result |
| NATIVE_REGISTRATION_STALE | Valid CURRENT takes precedence over stale native metadata | Only recompile from validated CURRENT | Native metadata never becomes configuration |

Invariants C2C-PERSIST-1…7 are source-linked in the CURRENT workings map, focused CI guard and production-browser regression gates. Existing immutable historical baselines are unchanged; `currentLossBefore` retains the relevant exact pre-repair source hashes. No additional engine/API backend/configuration system was added.

## Why prior tests missed the incident

The earlier 272 focused tests mostly exercised mocked Current owners and isolated provider behavior. The 14 boot fixtures removed **one mode while the integrity marker/journal survived**, or injected a transient open error. They did not combine six physically missing configuration rows, zero config journal and an independent native generation 583. Thus they tested the marker emitter but not complete provenance loss across stores. A native-click fixture also had a no-op generation persistence stub; it has been corrected to model actual desired/applied writes now that saves enforce durable authority.

The expanded actual Shelf fixture seeds the owner-equivalent lost boundary plus connected login, checks CURRENT_STORE diagnostics, safe Settings recovery inspection, zero config/cloud/native mutation and unchanged raw records. Real IDB tests exercise every observed put/add boundary, initial-boundary writes, checkpoints, transaction aborts, response loss/retry, concurrent commits, store reopen, schema/version-change/open errors, complete journal and external recovery, conflicts, stale proof, preservation failure, corrupt inputs, worker termination, full Chromium SIGKILL/restart and same-origin version upgrades. Final receipts distinguish actual browser IndexedDB, real Web Workers, dependency-fixture Chrome APIs/files, actual installed extension and real owner Windows evidence.

## Final measured verification

Final production pin: `9ab852767a74b207d082011f66bd1cbe65534834`; build source digest `5f99ee63011610f0f0373debc9e491176400ee6bf969c615a355f797e6e58f7b`. The Worker code digest remains `IwTaIK4em1_mwIygmpbfULfJWUZln3ggKnG5suyu-NA`.

| Verification | Outcome |
|---|---|
| Focused suite | 275 PASS / 0 FAIL |
| Existing remote module CI suite | 49 PASS / 0 FAIL; pre-existing main expectation failure reproduced (48/49) and corrected without Worker source changes |
| Original 0.3.13 actual Shelf/background lost-state corroboration | REPRODUCED: Connected + generation0 + CONFIGURATION_RECORD_MISSING + native583, with raw fixture rows unchanged |
| Immutable baseline + invariant/source guards | 8 PASS / 0 FAIL (additional targeted run after freezing pre-loss snapshot) |
| Real Chromium CURRENT crash/migration/recovery | 24 PASS + 1 baseline REPRODUCED / 0 FAIL |
| Actual Shelf/background with dependency-fixture Chrome/OAuth | 15 PASS + 2 earlier boot baseline REPRODUCED / 0 FAIL; 50 Shelf opens + 50 document reloads |
| Broader product browser | 30 PASS / 3 BLOCKED / 1 NOT_TESTED; independent fixture/local-provider verification remains distinct from Cloudflare live |
| Image/gallery preservation | 15 PASS / 0 FAIL |
| Startup comparison | 2 PASS; 30 reload samples per version |
| Genuine unpacked extension | BLOCKED: UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR; actual describeCapabilities response remains null, never claimed successful |

Same-environment startup comparison (production 0.3.13 baseline vs final 0.3.14, synthetic saved configuration, real DOM/IDB and fixture Chrome, no provider network):

| Timing, milliseconds | Before p50 / p95 | After p50 / p95 |
|---|---|---|
| Reload to visible Remotes | 96.6 / 147.6 | 93.9 / 121.9 |
| Reload to configuration response plus two animation frames | 266.8 / 349.3 | 250.3 / 267.0 |
| Warm CURRENT reads, separate 100-sample isolated test | 0.6 / 1.7 | 0.5 / 1.2 |

These samples do not establish a statistically attributable improvement or Windows/native-menu input latency. No context-menu rendering/pointer handler was changed; necessary store/authority checks run at configuration/native/save boundaries. The earlier 50-reload acceptance run measured 394/825 ms p50/p95 while several browser/workerd suites ran concurrently; the separate 30+30 comparison avoids interpreting that contention as a product regression. Strict commit durability plus separate readback adds intentional write-boundary work; original-machine write latency, OS power loss, actual managed/quota failures and installed native-menu latency remain unverified.

All final browser receipts identify clean production source. Additional startup-benchmark mode and immutable-baseline assertion are test-only changes after the runtime pin. Source hashes and build/source identity are retained in verification.json. The existing GitHub workflow now runs the real-IDB crash/recovery guard with full baseline history and the hosted Chrome executable; hosted CI itself is NOT TESTED until this branch is authorized for publication. The same configurable-executable runner passes locally. A pre-existing remote-module CI assertion expected only operationId metadata despite main retaining approved redacted source provenance; its failure was reproduced against unchanged baseline and the test now checks exact redacted metadata, timestamp and absence of the fixture secret. Worker production bytes are unchanged. No run against the owner's profile took place.

## Reproduction and Windows preview-only acceptance

Isolated developer tests (no owner/cloud state):

```bat
npm ci
npm run test:focused
npm run build:extension
node scripts/test-current-recovery-browser.mjs
node scripts/test-boot-login-browser.mjs
```

Browser runners currently expect `/usr/bin/chromium` (or the documented executable override for the boot/installed runners) and baseline archives. Linux baseline preparation: `mkdir -p /tmp/c2c-current-baseline /tmp/c2c-boot-before`, then archive `3805acb` and `0222969` respectively using `git archive <sha> | tar -x -C <directory>`. Do not run destructive fault injection in the owner's profile. Existing source tests use disposable names/profiles only.

For the original Windows machine:

1. **Before reload/repair**, close Chrome completely and retain a private copy of the complete original Chrome user-data/profile directory at an explicitly chosen protected local location. Verify the copy locally (including extension IndexedDB, Local Extension Settings and browser profile metadata), retaining checksums. Do not upload it. This task did not obtain/verify that copy; no owner restore is approved by this document alone.
2. After preservation and delivery of the reviewed development branch (this run keeps commits local and does not publish/merge it), switch to that checkout and run `npm ci`, `npm run test:focused`, then `npm run build:extension`; reload the **existing** `dist/click2cloud` extension in the same profile. Confirm version 0.3.14 and ID `ajppphdiamdobknpamcheohmdbdbeoal`. Do not uninstall, clear storage, change manifest key or delete nativeRegistration.
3. Open Shelf: Remotes first; existing OAuth connection remains independent. Settings/Explorer must show **Local configuration needs recovery** for the lost case. Choose **Inspect recovery** only. It reads safe health and existing candidates; it must not create cloud resources, erase old native menus, initialize redown or write CURRENT.
4. Optional service-worker read-only API: `await click2cloud.api.invoke({version:'3+1.1',method:'getEngineHealth',params:{}},'gui')`; then `requestRestorePreview` with the same envelope. Share only safe health/status/code, never candidate configuration or a raw database/native dump.
5. If no complete candidate exists, STOP and preserve the profile. Generation 583 alone is insufficient. If a complete source is found, review its exact accounts, destinations, prefixes, aliases, hidden/Quick/default settings locally. A separate owner-approved recovery can then retain the verified preimage and apply that fingerprint. No revision-zero bypass.
6. Only after actual restoration and exact native ACK, verify original Explorer/Settings, approval/history continuity, repeated Shelf opens, extension reload and full Chrome restart. Real R2 save acceptance remains separate and only under the owner's existing write authorization. This run did not mutate cloud resources or verify an owner save.

## External gates and limits

Original deletion timing/cause and exact owner destinations: UNKNOWN / unavailable. Owner-profile forensic copy, same-profile recovery, actual Windows Chrome, real MV3 termination/restart and provider-backed save: BLOCKED or NOT TESTED. Actual unpacked Chrome installation policy result is recorded separately under `installed/`. Do not convert a Linux Chromium dependency fixture, Node filesystem backup test, local workerd R2 test or callback ACK into a Windows/OAuth/Cloudflare live pass. Old unbound/partial backup import and native partial-salvage reconstruction are deliberately not automatic recovery paths. If all copies are lost, unknown preferences cannot be reconstructed; the safeguard is explicit detection and refusal to silently overwrite them.
