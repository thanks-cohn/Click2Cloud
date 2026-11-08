# P0 — Connected Cloudflare, but Explorer AND Settings blocked by CONFIGURATION_RECORD_MISSING

**Owner-reproduced on 2026-11-08, Click2Cloud v0.3.13 main df92b33, Windows Chrome, existing user profile.** Status: OPEN. First occurrence observed after connecting Cloudflare following the 0.3.13 boot/login repair. This sequence does not prove OAuth caused deletion. **Alpha-blocking state integrity/persistence incident.**

**FULL ENGINEERING ASSIGNMENT:** [CODEX P0 forensic CURRENT loss, safe recovery, root-cause repair and permanent invariants](../../docs/requests/CODEX_P0_CURRENT_STATE_LOSS_FORENSIC_RECOVERY_HARDENING_2026-11-08.md). This incident remains OPEN until original user-profile data integrity and actual Windows Chrome behavior are verified; documentation commits alone do not resolve it.

## Exact evidence from owner

Remotes reports **Cloudflare: Connected**, and correctly says login is separate from save readiness. But both **File Explorer** and **Settings** are replaced with:

> Saved configuration records are missing. Stop setup and use validated recovery; existing data was not overwritten.

Remotes has **Local service diagnostics**:
`{"code":"CONFIGURATION_RECORD_MISSING","method":"getConfiguration","stage":"current-read","diagnostic":{"stage":"current-read"}}`.

User confirms Explorer did not show this message before updating/connecting. No proof of deleted user destinations or R2 objects. Explicitly protect their existing login, IndexedDB, native registration, menu destinations, Default, approval, cloud files and backups.

## New decisive owner evidence — direct read works, generation guard fires

**2026-11-08, same Windows profile; read-only DevTools execution in the extension service-worker context.** Owner ran the safe diagnostic from the previous incident report:

- `await click2cloud.current.read()` **resolved successfully**; `s.generation.desired === 0`.
- `(await chrome.storage.local.get('nativeRegistration')).nativeRegistration.desired.generation === 583`.
- Console's trailing `undefined` is only the normal return value of `console.log`; it is not a failure.

**Confirmed immediate blocker:** `extension/background.mjs:readCurrent()` checks `prior?.desired?.generation > 0 && saved.generation.desired === 0` and deliberately throws `CONFIGURATION_RECORD_MISSING`. These precise live values satisfy that condition. This is **not** a failure to open IndexedDB or the `current-store.mjs:loadState` required-row exception on this read. However, successful validation can still supply default generation zero when the underlying persisted `generation` row is *absent*; this evidence **does not prove** whether generation was lost vs previously never stored vs native metadata stale.

**Next read-only investigation (no resetting):** determine whether an actual `generation` row exists in the CURRENT IndexedDB `state` object store (report presence and numeric desired only); inspect safe journal generation-event counts, configurationIntegrity marker required symbolic IDs, product/mode row presence and non-sensitive destination counts, nativeRegistration desired/applied generation and ACK status. Do not dump destination names, provider account IDs, credentials or URLs. Validate historical upgrade/registration sequencing against source and journal. Reconcile only when enough evidence proves safe non-destructive course.

**CRITICAL:** Do **not** suggest or execute `chrome.storage.local.remove('nativeRegistration')`, `clear()`, `indexedDB.deleteDatabase()`, blindly setting generation 583, forcing generation 0 into native registration, or bypassing the readCurrent guard. A workaround that merely hides this error while silently discarding old destination bindings is unacceptable.

## Further owner live proof: generation record is physically absent

**2026-11-08, owner installed Windows Chrome extension, service-worker DevTools read-only IndexedDB inspection.** The owner queried `indexedDB.databases()` and opened `click2cloud-current-v1`, then `db.transaction('state','readonly').objectStore('state').get('generation')`. Result:

```json
{"generationRecordPresent":false,"generationDesired":null}
```

Earlier same-session read-only outputs: `click2cloud.current.read()` = success with default `generation.desired:0`; `nativeRegistration.desired.generation:583`.

**Confirmed:** the `generation` key is physically missing in CURRENT's `state` store; its desired=0 is a `defaultGeneration()` substitution from `src/persistence/current-store.mjs`, not a persisted zero. The existing `extension/background.mjs:readCurrent()` prior native registration guard is exactly the observed immediate blocker. Still **not** proven whether this was deleted, left unpersisted by a migration, or is a mismatch from another lifecycle. Do not assert the user's destinations are missing because generation is missing; the `current.read()` succeeded and validated other required record invariants. Auth is independently working.

**Highest-value next gate:** inspect metadata-only presence of `product`, `mode:simple`, `mode:nested`, `mode:depth`, `configurationIntegrity` in the same CURRENT state store, and summarize the existing bounded `journal` by event kinds and `generation` events' *numeric desired only*. Compare available journal generation event progression and current native registration's desired/applied metadata with the last known valid user saved configuration. Do not print raw state/config/journal objects, account IDs, filenames, tokens, object keys or paths. Preserve records; no reset/clear/manual generation write. Only formulate a narrow owner-approved recovery after evidence proves the safe source of truth.

## Latest Windows owner evidence: CURRENT has no product/config records or relevant journal

**2026-11-08, owner real Chrome service worker, read-only IndexedDB inspection.** All checks refer to `click2cloud-current-v1` / object stores `state` and `journal`.

- `current.read()`: `result="OK", generation.desired=0` (the module substitutes `defaultGeneration()` for missing row).
- `nativeRegistration.desired.generation=583` in `chrome.storage.local`.
- `state.get("generation")`: absent.
- `state.getAllKeys()` presence flags: `product=false`, `mode:simple=false`, `mode:nested=false`, `mode:depth=false`, `generation=false`, `configurationIntegrity=false`.
- `journal.openCursor()` counters: `generationEvents=0`, `configEvents=0`, `productEvents=0`, `lastGeneration=null`, `highestGeneration=null`.

**Revised conclusion:** CurrentStore is readable but its six relevant configuration records are **all absent** and the associated journal supplies no restoration evidence. `current.read()` returning successfully is **not proof that a user's saved settings survived**: it synthesizes valid empty defaults in absence of integrity/journal provenance. The preserved Chrome-native `nativeRegistration` at generation 583 indicates a historically compiled right-click menu existed, so treating this as an ordinary fresh install is unsafe. This strongly suggests missing/unavailable CURRENT state relative to the prior native registration; it does not establish whether records were cleared, replaced, stored under a different extension origin/profile/database, or lost during a prior lifecycle event. **Do not accuse the login flow of deletion without evidence.**

**Recovery leads, ordered and read-only first:** (1) check if other named IndexedDB databases or a different Chrome extension origin/profile contain older CURRENT (metadata only); (2) inspect **counts and safe metadata only** from CURRENT `state` and `checkpoints` (the six flags and journal counters do not prove every store is empty); (3) inspect persisted native-registration `desired` plan and `appliedGeneration`/ACK metadata without exposing actual account IDs, paths, labels or full rows, to determine whether historically selected destinations can be inferred from the stored snapshot; (4) inspect independently verified external recovery sources/backups, if actually present, without assuming documentation means backups exist. No copy/restore/recompile until source of truth and missingness are established. Save any original evidence/snapshot locally before approved mutation.

**Acceptance addition:** regression fixture for `current.read()` returning synthesized empty defaults while Chrome storage retains generation 583 and a nonempty historical menu. Must never silently regenerate default `redown`, reset menu, or silently classify as fresh install. Ideally provide privacy-preserving UI/API diagnostic differentiating `CURRENT_MISSING_ESTABLISHED_STATE`, `NATIVE_REGISTRATION_STALE`, and `CURRENT_UNINITIALIZED` based on evidence. If no safe complete recovery source exists, report exactly what can/cannot be recovered, preserve existing storage and require explicit owner choice.

## Source-backed two-branch fault analysis — DO NOT GUESS

There are at least TWO distinct emitters of **the exact same error code**:

A. `src/persistence/current-store.mjs:loadState` — the integrity marker `configurationIntegrity.required` or historical journal requires `product` / `mode:simple` / `mode:nested` / `mode:depth` and one or more records (including permitted embedded legacy equivalents) are absent. This may be genuine record loss or a version/migration mismatch. Read-only classify which *symbolic IDs* are missing and why, and whether the checkpoint/journal/recovery evidence is valid; do not dump private saved values.

B. `extension/background.mjs:readCurrent` — `current.read()` succeeds, but persisted `chrome.storage.local.nativeRegistration.desired.generation > 0` while `current.read().generation.desired === 0`. This is treated as missing CURRENT; may be an actual missing generation record, a legitimate historical migration, or a stale native-registration stamp. **Never drop the guard without evidence**; compare registration history/acknowledgment, saved product/target configuration, journal/checkpoints and generation semantics first. Diagnose whether the native registration is stale versus actual lost CURRENT.

`src/api/service.mjs:loadCurrent` normalizes both into `current-read`; `extension/app.mjs:show` displays the same message for Explorer and Settings when `state` is unavailable. Authentication works because 0.3.13 correctly made `loginBegin/loginStatus` independent of CURRENT.

**Crucial distinction**: one code does not identify which of A/B fired. Preserve precise structured, privacy-safe **origin/subreason** diagnostics through the existing trusted API, preferably `getEngineHealth` or the same `getConfiguration` error envelope, with no new diagnostic backend or raw storage dump.

## Mandatory repair

1. Reproduce both emitters separately in current installed-profile-compatible fixtures, including old 0.3.12 → 0.3.13 migration and previously registered Chrome menus.
2. Add **read-only preflight and safe evidence** for local CURRENT rows, integrity marker, journal/checkpoints and native-registration generation. Report field-presence booleans and symbolic record names/counts only; do not report credentials, raw keys, object names, private paths, tokens, account IDs, stored configs or history.
3. **Preserve before mutate.** Snapshot current records and native-registration *safely and locally*, establish verified recovery paths; never clear storage/IndexedDB, un/reinstall, auto-create/redown or overwrite user choices. No fabricated blank configuration, no blind resetting `nativeRegistration`, no forced new-user initializers, no replay of uncertain uploads.
4. If stale/incompatible marker or native-generation metadata is conclusively found with independently intact authoritative CURRENT, implement the **smallest migration-safe, idempotent reconciliation** using the existing CurrentStore/registrar owner, transaction fences and validation. Prefer reconstruction from verified journal/checkpoints/known backup only after verifying identity and conflicts; require explicit user authorization for any potentially destructive restore or ambiguous selection. Keep all actual saved Simple/Narrow/Depth, favorites, quicks, Default, signed-in session and approval intact.
5. If records are genuinely missing/conflicting, **do not hide the condition**: explain actual blocking items and provide read-only preview/recovery controls while keeping Remotes and OAuth functional. Preserve previously selected account. Where separate API authority permits it, Explorer may offer verified **read-only** authenticated browsing without reconstructing or mutating missing menu settings; never fake current Default or allow unsafe save.
6. Settings should keep safe view-only/help/recovery or independent controls accessible, rather than replacing the entire tab with a paragraph. Actions depending on CurrentStore must be explicitly disabled with accurate explanation.
7. No cross-API/duplicate persistence scheme; use existing typed `getConfiguration`, `getEngineHealth`, CurrentStore, registrar, recovery. GUI and programmatic status must agree. Only show Ready to Save after actual readiness and independent provider proof.
8. Add regression tests for A and B, valid 0.3.12 migrations, missing generation record, stale native registration, valid product with modes embedded, genuinely absent product/mode, corrupt marker, journal/checkpoint disagreement, reconnect/log out/Chrome reopen, auth-only login, no writes on read or failed repair and side panel tab navigation. Real installed Windows Chrome acceptance required; fixture PASS isn't live proof.

## Acceptance

After authorized safe repair, existing configuration is read without `CONFIGURATION_RECORD_MISSING`; Explorer and Settings reopen and show original choices, not empty defaults. Login remains connected, no unsolicited setup, native Chrome menu exact targets unchanged or safely reconciled, and real saves still require independent verification. If restoration requires data not present, report BLOCKED transparently and ask owner before any destructive operation.

**Do NOT change REDOWN or modify cloud resources.**

## November 8 implementation update — P0 remains OPEN

Development branch `dev/p0-current-recovery`, production repair `84f0e19`, version 0.3.14. [Forensic handoff, source inventory, state matrix and preview-only Windows procedure](../../docs/evidence/current-recovery/FORENSIC-HANDOFF.md); [source-pinned verification](../../docs/evidence/current-recovery/verification.json).

The original-source six-row-loss/native-583 failure was reproduced in isolated real Chromium IndexedDB. CurrentStore now distinguishes established absence, guards all configuration/generation/setup writers, commits a complete durable boundary and revalidates native/save authority. Existing recovery APIs can preview and apply verified complete sources without fabricating revision zero; exact preimage readback, conflict/fingerprint checks and idempotency precede restoration. Safe health/recovery UI stays available independently of login. Partial native projection and legacy unbound/mixed backups are not falsely accepted.

The original physical deletion cause remains UNKNOWN. The original Windows profile and an independent owner backup are not available in the workspace; no owner recovery was attempted or claimed, and no cloud resources were mutated. Keep this incident OPEN until preservation and original-profile Windows acceptance actually succeed. Fixture passes do not close it.
