# CODEX P0 / ALPHA RELEASE BLOCKER — Forensic investigation, safe recovery, definitive repair and permanent regression protection for missing CURRENT

**Owner:** Click2Cloud. **Incident:** November 8, 2026, Windows 11 / Chrome, extension 0.3.13, original profile. **Scope:** Click2Cloud repository only (`thanks-cohn/Click2Cloud`). **Status:** ENGINEERING ASSIGNMENT, NOT A FIX. Implement production code and tests; do not stop at an audit, summary, or another specification.

**READ FIRST, IN ORDER:**
1. `AGENTS.md` (especially Remotes-first/login-only, no-bloat, no-data-loss, API parity).
2. `Issues_and_Bugs/Bugs/P0_CONNECTED_BUT_EXPLORER_SETTINGS_CONFIG_RECORD_MISSING_2026-11-08.md` — complete incident and real installed-Chrome evidence.
3. `docs/evidence/remotes-boot/HANDOFF.md` and `docs/evidence/remotes-boot/SOURCE.md` — 0.3.13 repair, exact limitations and previous fixture successes.
4. `src/persistence/current-store.mjs`, `src/persistence/schema.mjs`, `src/persistence/backup.mjs`; `extension/background.mjs`, `src/api/service.mjs` / `service.d.ts`, `src/api/config.mjs`, `src/chrome/registrar.mjs`, `extension/app.mjs`, `src/recovery/*` where applicable, tests, and historical source commits.
5. Existing behavior baseline `11.2026/workings/right-click-workings.json` and the canonical menu/README docs. Understand which records are authority, which are observations, and which are intentionally disposable.

**Priority order:** (1) preserve the owner's existing profile/evidence; (2) independently establish cause and possible complete recovery; (3) fix the design and code; (4) prevent recurrence/detect before harm; (5) verify upgrades, Chrome lifecycle and actual Windows acceptance. **NO REDOWN EDITS. NO CLOUD RESOURCE MUTATIONS.**

---

## 0. EXACT INSTALLED-WINDOWS EVIDENCE — do not reinterpret as a normal empty install

From the *same existing Windows Chrome extension service worker*, the owner ran **read-only** commands:

```text
click2cloud.current.read(): OK
returned generation.desired: 0

chrome.storage.local.nativeRegistration.desired.generation: 583

IndexedDB database: click2cloud-current-v1
state["generation"] exists: false

state record-presence flags:
  product: false
  mode:simple: false
  mode:nested: false
  mode:depth: false
  generation: false
  configurationIntegrity: false

journal counts:
  generation events: 0
  config events: 0
  product events: 0
  last generation: null
  highest generation: null
```

The user reports both **File Explorer** and **Settings** show:
```text
Saved configuration records are missing. Stop setup and use validated recovery; existing data was not overwritten.
```
and Remotes' diagnostics show:
```json
{"code":"CONFIGURATION_RECORD_MISSING","method":"getConfiguration","stage":"current-read","diagnostic":{"stage":"current-read"}}
```
Cloudflare shows **Connected** after sign-in. **OAuth succeeding does not prove CURRENT survived**; it is stored separately. No evidence that R2 objects were deleted. No evidence that the login operation itself erased anything. Do not invent a cause.

**Source-level direct mechanism:**
- `current-store.mjs:loadState` silently defaults missing product/config/generation when there is no integrity marker or journal provenance, so `current.read()` can return a plausible *empty fresh profile* although a prior installation existed.
- `background.mjs:readCurrent` then sees `nativeRegistration.desired.generation > 0` but `saved.generation.desired === 0`, throws `CONFIGURATION_RECORD_MISSING` and blocks all state-dependent API actions. This guard is protecting the owner from replacing their saved targets; **do not remove it to make UI appear fixed**.
- The durable `generation` row is genuinely **absent**, NOT present with value zero.
- All six examined configuration rows are absent and journal counts are zero. We have **not** yet counted other state rows, checkpoints, other IndexedDB DBs, Chrome local storage keys or independently verified backup files. We have NOT proved irreversible loss or a particular trigger.

**Explicit question to answer:** How can a previously registered native MenuSpec reach generation **583** while the same installed extension origin presents an empty CURRENT config/journal? Was it an origin/profile/database mismatch, old migration/init path, failed storage lifecycle, overwritten/cleared CURRENT, wrong build ID, browser upgrade/reinstall, a real storage failure, or a historical missing-store issue? Provide evidence for the actual cause where possible. Distinguish **proven**, **reproduced-equivalent**, **plausible but unproven** and **ruled out**. The original exact moment of loss may be unobservable; state that honestly.

---

## 1. HARD STOP / evidence preservation (before any write)

1. Work on a fresh **development branch from the latest main**; capture baseline SHA, version, extension ID, OAuth client identity, API schema version and Chrome storage origin. Do not push runtime fixes to main, publish, install a changed extension in the owner's existing profile, or mutate Cloudflare resources without a separate request.
2. **Never run or suggest** `chrome.storage.local.clear()`, `chrome.storage.local.remove('nativeRegistration')`, `indexedDB.deleteDatabase()`, deletion of recovery/checkpoints, uninstall/reinstall, fresh Chrome profile substitution for owner acceptance, forced cache clear, `git reset --hard`, fake identity, blind default `redown` recreation, arbitrary generation writes (e.g. setting 583), or a reset of the registered native menu.
3. Treat `nativeRegistration.desired`, the existing OAuth session, setup consent ledger, any remaining `remote-result:*` entries, history, saved Explorer location, backup handles and extension identity as **forensic evidence** until specifically classified. Avoid running any background menu reconciliation that calls `chrome.contextMenus.removeAll` while the current persisted configuration is untrusted.
4. Obtain a *locally retained, privacy-protected* evidence copy of relevant original records BEFORE attempting a repair or migration. Backup mechanism must preserve exact values and be user-authorized; don't paste raw records to public GitHub, logs or this conversation. Do not include OAuth secrets in a diagnostics report. For copy/export code, enforce explicit authorization, a clear destination and readback/checksum; if blocked, **STOP and report**.
5. User has provided metadata-only inspection results already; do not require them to repeatedly print sensitive raw database objects. Deliver concise **read-only** browser diagnostic snippets if further owner inspection is essential. Never call a user-facing mutating script a diagnostic.

**Safety invariant: an intact historical registration plus missing CURRENT is NOT a fresh install.** No new-user init, no auto-provision, no empty-menu commit, no success animation, no accidental OAuth revocation or lost choices. Authentication remains available, and genuine corruption/recovery is surfaced truthfully.

---

## 2. FORENSICS — trace history, data lineage and every overwrite/loss path

Audit **actual source and commit history** for:
- All producers, consumers and deletions of `click2cloud-current-v1`, including `createCurrentStore`, database name/version, object stores, `onupgradeneeded`, `onversionchange`, `close`, transaction abort/commit, `generationChange`, `commitProduct`, `saveModeConfig`, `restoreEncrypted`, setup-ledger writes and any tests/utilities/scripts with `deleteDatabase`, `clear`, `remove` or rebuild behavior.
- CurrentStore's `configurationIntegrity` marker: when it first became mandatory, creation order, presence-only guard, last-known-good evidence and absent-marker compatibility; journal retention/pruning; checkpoints; default synthesis; implicit first-run detection.
- `chrome.storage.local.nativeRegistration`: when/how `desired`, `appliedGeneration`, `epoch`, `state` and MenuSpec are written, where `removeAll` occurs, what ACK actually proves, and the initial/updated registration lifecycle. Cross-store writes are not an atomic transaction; explicitly map failure windows between IndexedDB commit and Chrome storage update.
- Extension identity and profile consistency: packed/unpacked stable manifest key, exact extension ID `ajppphdiamdobknpamcheohmdbdbeoal`, Chrome profile, extension origin, new Chrome install vs in-place Reload, renamed folders, version/migration/recovery path; do not inspect another origin without authorization. Determine whether a different DB name/store might hold earlier CURRENT data.
- 0.3.12 → 0.3.13 boot repair: `readCurrent` prior-registration guard, moved native startup reconciliation, OAuth-only login, any new read path or old initializer side effects. **Sequence correlation is not causation**; compare earlier builds, product revisions and mutation behavior.
- Existing independent recovery: actually implemented `recovery.writeVerified`, `readVerified`, `inspectBackupRoots`, `getEngineHealth`, CurrentStore bundle/export, backup handles, native companion status and data availability. **Separate implemented capabilities from aspirational scaffolds**; don't promise automatic `%LOCALAPPDATA%/Click2Cloud/Recovery` restoration unless there is verified current implementation and accessible data.
- Auth and R2: verify `loginBegin/loginStatus` neither delete CURRENT nor trigger setup. Keep separate from state-read issue. Do not log access/refresh tokens, OAuth URLs, buckets, user filenames or provider paths.

Produce a **causal timeline** of first-run, commit, registration, reload, sign-in, explorer, settings and failure with exact source locations and evidence. Record minimum counterexample that triggers the bug (e.g. populated Chrome registration + absent CURRENT). Identify unprovable historic causes explicitly.

---

## 3. READ-ONLY PROFILE TRIAGE & SAFE RECOVERY CLASSIFICATION

Implement or use minimal, **existing trusted** read-only diagnostic surface; prefer extending `getEngineHealth` / `getConfiguration` safe error envelope, NOT a new service/daemon/diagnostic API.

Inspection should return ONLY:
- Database present/version, store names, record **presence flags** and counts (not values or sensitive IDs);
- product/mode config record presence and structural validation result, integrity marker presence, generation row present/absent, generation desired/applied numbers;
- journal/checkpoint record counts plus safe sequence/generation ranges, no actual before/current config objects;
- native registration presence, desired/applied generations, state/ACK class and row **counts by role/provider**, not actual target paths;
- presence/validated-status of *independent* recovery candidates and correct extension origin/profile evidence with no secret values;
- error source classification: `CURRENT_UNINITIALIZED`, `CURRENT_ESTABLISHED_BUT_MISSING`, `CURRENT_CORRUPT`, `CURRENT_CONFLICT`, `NATIVE_REGISTRATION_STALE`, `RECOVERY_CANDIDATE_AVAILABLE` etc. Derive codes from evidence; don't merge contradictory states.
- an optional locally generated operation/diagnostic ID to correlate *sanitized* logs.

Implement read-only inspection of remaining `state` and `checkpoints` safely; exact owner screenshots are **not** proof those stores are completely empty. Do not expose complete registration `desired.rows`, object names, folder prefixes, URLs or OAuth material over a public API or GitHub. If a complete user-owned backup is required, use explicitly approved secure local backup with clear sensitivity notices and no telemetry.

Recovery hierarchy (each independently validated):
1. **Verified original/current data in the correct extension origin**, or a previously used other DB/version within the same authorized origin; migrate only if provenance/schema/versions match.
2. **Existing verified checkpoint/journal/independent backup**, restored with full validation, conflict detection and explicit confirmation, preserving unique user edits.
3. **Saved nativeRegistration desired MenuSpec**, a *possible partial salvage candidate*, NEVER by itself a complete replacement for Simple/Narrow/Depth configurations, labels, hidden flags, Default or setup approvals. Inspect its completeness, timestamps, generation, chosen row targets and ownership only through trusted local processing. Offer exact preview of recoverable vs unavailable properties with owner consent; no silent inference of missing values.
4. If **no valid complete source survives**, report precise partial/blocked outcome. Preserve remaining data and identity; do not claim recovery succeeded, fabricate destinations, replay uncertain saves or automatically create `redown`. User may choose later to rebuild, separately from forensic recovery.

**Two-phase discipline:** first `inspectRecoveryCandidate` / preview (or existing appropriate method) with immutable snapshot, schema, provenance and conflicts; only then a separately authorized **atomic commit** with expected revision/identity/idempotency, subsequent readback, registrar reconcile based on verified restored state, and independent verification. If the current API doesn't support safe recovery because it demands a readable product revision, extend the **same canonical recovery owner** minimally rather than bypassing validation or fabricating revision 0. Abort on unknown, ambiguous or stale candidates.

---

## 4. DEFINITIVE CODE REPAIR — no false defaults, no global poisoning

**4A — Distinguish never-initialized from established-but-missing CURRENT.**
- New/fresh profile may initialize defaults only after proving *no prior establishment evidence*. Existing `nativeRegistration`, setup ledger, verified backup or prior journal/marker indicate establishment. Never classify as new solely because `product` and `generation` are absent. Store minimal durable establishment/provenance metadata when first committing valid state; not an alternate configuration store. Establish safe upgrade behavior for old profiles without it.
- `current.read()` must not respond with an apparently valid empty populated-user state when required records disappeared. Either return explicit `uninitialized` only when verified fresh, or a typed missing/unknown state for lost data. Keep closed schema, one authority, and no code paths that treat unknown as empty.
- Even if the safeguards detect loss, preserving data is different from successful recovery. Never present a recovered/ready state without validated source.

**4B — Durable commit and synchronization invariants.**
- Make CURRENT writes atomic within **one IndexedDB transaction** across product, each mode, generation metadata, integrity/establishment marker, journal/checkpoint and necessary idempotency evidence **as appropriate to existing architecture**. Preserve old/legacy records during migration until readback succeeds. Never independently advance native registration while CURRENT evidence is absent/uncommitted.
- Be exact about cross-storage limitations: Chrome storage and IndexedDB cannot share a transaction. Design a bounded, idempotent **prepare → durable CURRENT/readback → native apply/ACK → retain evidence** recovery protocol using current registrar/current-store owners; avoid a sprawling new transaction framework. If cross-store ordering fails, detection must prevent stale authorization and unsafe native saves, yet allow independent OAuth and Remotes.
- Avoid a fast-path that `removeAll`s an old valid native menu during unknown CURRENT. Correct behavior is safe refusal/attention, not auto-rebuild-from-empty. On legitimate changes, native ACK must reflect exactly the validated saved intent; a stale generation must never authorize a click.
- If a minimal last-known-good recovery copy is necessary, create it through the **existing recovery mechanism** with validation, independent readback/metadata, realistic lifetime and documented coverage (no false assumption that Chrome `local` survives uninstall or profile loss). No new shadow CURRENT or duplicate menu/boot engines. Backup failure must be **visible and truthful** and must not silently claim durability. Consider copies on separately failure-isolated storage only with user permission and performance constraints.

**4C — Recoverability, migrations and repairs.**
- Upgrade from existing real versions (`0.3.12`, `0.3.13`) without changing extension ID or OAuth client, losing account selections, permissions, Default, Quick Select, Simple/Narrow/Depth, exact aliases/prefixes/order/favorites, setup approvals, history or real cloud files.
- Validate fingerprints/evidence for provenance; don't trust native plan as the configuration database. If conflict, quarantine candidates and ask the user before any destructive/ambiguous action. Make repairs idempotent (second run must not create another revision or duplicate menu).
- Preserve intended explicit first-use setup only after separately authorized action, never on regular login. No automatic billing, Worker creation, R2 activation, `redown` resurrection, or reset to default.

**4D — Fast, boring, stable user experience.**
- Every Shelf open shows Remotes promptly; Cloudflare OAuth remains usable independently of corrupt CURRENT. A concise **Local configuration needs recovery** card should state what is known and provide **Inspect recovery** / safe follow-up, not apology/debug dump.
- Settings should retain read-only recovery/help/independent settings surface rather than replacing the whole tab with one error line; Explorer should offer authorized read-only browsing *only if truly independent and safe*, otherwise explain why navigation is blocked. No fake saved-location list or fake Save success.
- Low work at boot: don't synchronously full-scan buckets, enumerate thousands of files, run cloud write checks or write caches. Put heavy recovery checks behind explicit Inspect; cache only bounded proof, invalidate safely on real changes.
- Show meaningful, contextual reason for blocked right-click; never claim a transfer, upload, receipt or native menu ACK when not verified. No bottom-left raw status/debug text.

---

## 5. PERMANENT GUARDRAILS — machine-verifiable, not documentation-only

Create a concise state machine and exhaustive **behavior matrix** for:
`FRESH_VERIFIED`, `ESTABLISHED_VALID`, `ESTABLISHED_MISSING`, `ESTABLISHED_CORRUPT`, `RECOVERY_AVAILABLE`, `RECOVERY_CONFLICT`, `RECOVERY_APPLYING`, `RESTORED_PENDING_NATIVE_ACK`, `READY` (plus independent OAuth states). Specify allowed reads, writes, UI status, native menu mutations, readiness and recovery actions for each.

Invariants enforced in code and tests:
1. If **any proof of established install exists**, empty CURRENT never triggers first-run setup or a configuration overwrite without validated owner-approved migration/recovery.
2. No configuration commit succeeds without a durable validated product/modes/generation/integrity boundary and readback; no revision is reported merely from in-memory state.
3. No Chrome native menu apply or save uses an unverified missing CURRENT configuration or stale generation, even across worker restarts and concurrent user gestures.
4. A crash/power loss/quota exception/transaction abort at any mutation boundary leaves either the previous known-good state or an explicit recoverable/blocked state—not silent empty defaults.
5. Repeated retry/reload/login/boot is idempotent and does not create new buckets, save destinations, Workers, default selections or duplicate auth flows.
6. Connected ≠ configured ≠ authorized for selected target ≠ remote transport ready ≠ independently verified save. Failure in one layer does not impersonate another.
7. One canonical versioned domain API; GUI and Chrome native menus are adapters. Extend existing typed introspection/recovery operations only where meaningful; visual gestures remain UI-local. **NO BLOAT / NO COLLIDING APIS**.
8. **No absolute claim of 'never lose data'**: if ALL copies are deleted or storage is externally wiped, software cannot reconstruct unknown user preferences. The enforceable guarantee is **never silently discard/overwrite established user intent, always detect conflicts, and restore exactly whenever a verified independent copy exists**.

Include invariant IDs in the CURRENT behavior map and regression tests, source-linked, so future source changes cannot silently remove them. Add a targeted guard in existing CI/build tests for persistence/native registration code changes, not an extra custom CI infrastructure.

---

## 6. REQUIRED TEST MATRIX — real source, fault injection, upgrades, performance

**Before any fix:** reproduce original `main df92b33` (or actual closest failing baseline) with a correct fixture:
- Chrome local `nativeRegistration.desired.generation = 583` and a nonempty historical menu;
- `click2cloud-current-v1` opens but all six config rows absent; no config/product/generation journal entries;
- OAuth remains connected;
- `current.read()` returns synthesized generation 0; `getConfiguration` fails `CONFIGURATION_RECORD_MISSING`; Explorer/Settings blocked.
Prove baseline failure and save receipt. Then apply fix and re-run.

**Additional mandatory scenarios:**
- True brand-new install (no historical evidence) versus missing-generation only, missing-six-rows plus preserved native plan, intact historical 583 with stale *registration* metadata, journal-only, checkpoint-only, corrupt/conflicting product/modes, legacy embedded `product.configs`, mismatched default account/destination, mixed old/new schema versions.
- Fault injection at every actual IndexedDB transaction boundary: before write, after individual store puts but before commit, after commit before response, native registration written but CURRENT absent, CURRENT committed but Chrome registration pending, quota/security/blocked open, `onversionchange`, worker killed/restarted, browser killed/restarted, memory race during two config commits and auth updates.
- First install, old extension install/Reload, source checkout version change, same ID, multiple profiles (without crossing origin), 0.3.12→0.3.13→fixed, repeated 50+ Shelf opens and 50+ reloads, explicit login/logout/reconsent/cancellation/expiry, real Chrome native menu callbacks/ACK, offline Cloudflare, no setup side effects.
- 0 / 1 / many Simple/Narrow/Depth destinations, hidden/favorites/Quick Selects/defaults, approval ledger and remote-history continuity, provider placeholders, different account identity, no unverified RESTORE or source URL leakage.
- Recovery dry-run and apply from a **validated** complete backup, conflicting/stale backup rejection, partial native-plan-only salvage that does not pretend full reconstruction, none available, double-click/double-run idempotency, rollback on failure, post-readback and exact menu binding after authorized native ACK.
- Fuzz/property tests for model corruption, revision monotonicity, existing target preservation, bounded failure classification and transitions. Minimize dependence on golden snapshots alone.
- **Failure has a visible UI+API receipt**; genuine authorization/token refresh does not erase menu state; read-only diagnostics themselves do not write; tests assert zero cloud resource creation and zero fake success on all abnormal paths.
- Real Windows installed Chrome owner profile acceptance **separate from** fixture tests, including existing stored gen=583 evidence, authenticated session, original destinations, normal right-click, reload, browser restart, real R2 verified save when already authorized. **Do not run mutation/recovery against owner's real profile until backup and authorization are validated.**
- Performance guard: startup p50/p95 and normal context-menu responsiveness measured against current baseline; new durable safeguards must not introduce steady-state polling, expensive deep reads every pointer event, network at boot, unbounded cache or UI freezes.

Do NOT claim actual owner-profile restoration, installed Chrome pass, live OAuth or end-to-end R2 success when only fixture Chromium with mocked Chrome/provider passed. Mark **PASS / FAIL / REPRODUCED / BLOCKED / NOT TESTED** separately with source/commit/build hashes.

---

## 7. ACCEPTANCE / DELIVERY CONTRACT

Codex must deliver **actual production implementation** and:
1. Root-cause report: observed owner evidence, proven immediate failure, full causal graph, first harmful operation if discoverable, unknowns and confidence levels. Include storage timeline and **why previous 272 focused + 14 boot fixture passes missed this established-profile edge**. Do not claim earlier tests guaranteed something they didn't measure.
2. Forensic evidence inventory: where the exact original data might exist, candidate completeness and schema/provenance, what survived and what cannot be recovered, independent backups actually located. No raw secrets in repo.
3. Minimal source changes, no parallel CURRENT/boot/login/menu API, no stale code or dead compatibility paths, no new dependencies unless justified, closed typed schemas and rigorous error states.
4. Detailed release tests, reproducible fault injection, migration/recovery regression tests and documented state-machine/GUI↔API mappings.
5. Before/after evidence and windows commands for existing unpacked extension `dist/click2cloud`; same extension ID. **Do not instruct uninstall/clear storage**. An owner's local profile may need a separate, specifically approved recovery procedure; supply *preview-only first*.
6. Exact files changed, commits, tests, PERF comparisons, live external gates, unresolved safety limits and a documented no-regression checklist.
7. Update `Issues_and_Bugs/Bugs/P0_CONNECTED_BUT_EXPLORER_SETTINGS_CONFIG_RECORD_MISSING_2026-11-08.md`, register and CURRENT behavior map as evidence changes. Do not close P0 until verified, particularly on owner-profile Windows Chrome.

**DONE when:** an established installation missing CURRENT is detected distinctly from first run, no user settings are overwritten, recoverable data is restored only from verified evidence with owner's authorization, Explorer/Settings are correctly re-enabled after real restoration, native menu safely matches CURRENT, and cross-version/lifecycle corruption tests enforce this forever **as far as software can reasonably guarantee**. If surviving sources are insufficient, state BLOCKED and preserve the user's profile. An empty-default bypass is never acceptable.

**CORE PRINCIPLE: PRESERVE USER INTENT. PROVE BEFORE REPAIR. ONE BORING, FAST, TESTED CANONICAL PATH. NEVER QUIETLY START OVER.**
