# P0 — Connected Cloudflare, but Explorer AND Settings blocked by CONFIGURATION_RECORD_MISSING

**Owner-reproduced on 2026-11-08, Click2Cloud v0.3.13 main df92b33, Windows Chrome, existing user profile.** Status: OPEN. First occurrence observed after connecting Cloudflare following the 0.3.13 boot/login repair. This sequence does not prove OAuth caused deletion. **Alpha-blocking state integrity/persistence incident.**

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
