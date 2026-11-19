# November 17 follow-up: delayed NATIVE_APPLY_INCOMPLETE after “Cloudflare prepared”

**Tracking:** [Issue #16](https://github.com/thanks-cohn/Click2Cloud/issues/16) · [Nov 17 prior incident](OWNER_LIVE_TEST_LOGIN_PREPARE_REPAIR_SOURCE_FAILURE.md) · [Codex START HERE](../11.16.2026/START_HERE_SIMPLE_DESTINATION_REDOWN_REFERENCE.md).  
**Evidence class:** owner-reported installed-UI observation, after earlier blocked/repaired/verified attempts. No new diagnostics ZIP supplied. **Not evidence of a Codex repair regression**: the owner has not yet run the repair instructions.  
**Time:** November 17, 2026, after an unspecified period away on the phone; exact clock time, exact installed build, operation ID and Chrome API acknowledgment record are unknown.

## Exact latest message

> **Not saved · NATIVE_APPLY_INCOMPLETE · Cloudflare is prepared, but Chrome did not acknowledge the menu. Reload the existing extension and log in again; saved destinations remain.**

The user returned to Click2Cloud and this greeted them, *after* earlier observed Cloudflare preparation and a subsequently independently verified save. The owner did not report a new right-click immediately before this latest message. Do **not** infer an attempted new upload or a new save rejection at the time of reappearance.

## Clarified boundaries

- The displayed message explicitly asserts Cloudflare is prepared but the native Chrome menu is not acknowledged. This is different from `WORKER_SETUP_REQUIRED`, `REPAIR_REQUIRED`, and source fetch failures.
- **The message does not establish what actually failed underneath.** It could be a real `chrome.contextMenus.create` failure/timeout, callback uncertainty, a persisted generation mismatch, an in-flight native reconcile, or a stale/delayed UI status. These are distinct hypotheses to test.
- A full reload and OAuth login may repair in practice, but should **not** be mandatory recurring UX when only native menu reconciliation is needed. Do not erase or replace any saved destination, setup approval, Default, or known-good `redown` Worker plan; do not call new Cloudflare resource APIs to repair local Chrome registration.
- "Not saved" in a later Shelf/banner must be correlated with an actual operation. No prior verified result may be retrospectively represented as failed because a later menu-maintenance operation is partial.

## Source-level findings in Click2Cloud `main` checked Nov 17

1. `src/chrome/registrar.mjs::native()` uses `chrome.contextMenus[method](..., callback)`, checks `chrome.runtime.lastError` inside the callback, and times out at 3,000 ms by default. It records `CHROME_ACK_TIMEOUT`, `CHROME_API_ERROR`, or `CHROME_API_THROW` without leaking Chrome's potentially sensitive raw error message.
2. `src/chrome/registrar.mjs::apply()` generates a plan, checks CURRENT via `beforeApply`, persists applying state, calls `chrome.contextMenus.removeAll`, then creates rows sequentially. It makes parent/child acknowledgment dependencies explicit. On failed rows it records `NATIVE_APPLY_INCOMPLETE`; if all row ACKs complete but persistence fails it emits `PERSISTENCE_FAILED`. An uncertain `removeAll` can yield `CHROME_ACK_TIMEOUT` or `CHROME_API_ERROR` directly.
3. `src/api/service.mjs::nativeReadiness()` can overwrite a `READY` Cloudflare state to `NATIVE_APPLY_INCOMPLETE` when `evidence.pending`, `acknowledgedGeneration==null`, or desired/acknowledged generations differ. `finishInitialization()` also returns `NATIVE_APPLY_INCOMPLETE` for **any** noncompleted `reconcile()` state, so the wrapper may hide a more specific `native.code`. **Do not conclude a particular Chrome row definitely failed from the high-level message alone.**
4. `extension/background.mjs::nativeReady()` tries canonical API reconciliation when the native generation doesn't match CURRENT; it is called on `chrome.runtime.onInstalled`, `onStartup`, and before Chrome context-menu dispatch. Comment says native maintenance has explicit lifecycle/save owners, not Shelf open or OAuth. Determine whether reconciliation is triggered at the right moment **after Worker preparation**, whether it is finished before showing READY, and whether an idle MV3 service-worker restart leaves an unacknowledged native plan.
5. Cloudflare `transport.status` and `src/cloudflare/onboarding.mjs` readiness are distinct from Chrome menu acknowledgment. A Cloudflare-only READY status is not sufficient to infer a native menu ready for a specific Simple target.

**These findings describe current repository source, not verified code hash of the user's installed Click2Cloud.**

## Codex Phase 1 additions

A. **Time-order forensic timeline:** For each operation (login, prepare/repair, config commit, native apply, onStartup, save, rich-recorder actions), record privacy-safe event timestamp, operationId, extension worker epoch, selected target fingerprint, CURRENT desired/applied generation, registrar desired/ack generation, pending, lastOutcome, row acknowledgment counts and error codes. Differentiate latest physical operation from latest displayed banner.

B. **Exact Chrome acknowledgment inspection:** Use trusted versioned `inspectNativeACK` and `getEngineHealth` plus the existing diagnostics. Capture `acknowledgements` row list and failedItem count. Find whether failure is `CHROME_ACK_TIMEOUT`, `CHROME_API_ERROR`, `CHROME_API_THROW`, `PARENT_NOT_ACKNOWLEDGED`, `PERSISTENCE_FAILED`, `CURRENT_READ_UNAVAILABLE`, `STALE_GENERATION`, `REGISTRAR_STATE_WRITE_FAILED`, `GENERATION_CONFLICT`, `NATIVE_APPLY_INCOMPLETE` from a wrapper, or a different exception. Never silently rename all of these the same error.

C. **Lifecycle and race tests:** After `Prepared and verified`, validate native desired/acknowledged generation, per-row selected target, and actual installed context-menu behavior before calling complete. Simulate idle/return, MV3 worker suspension/restart, concurrent `nativeReady()` vs `reconcileNativeMenu`, timeout/callback delays, a parent-row failure, version/config-generation conflict, and failed persistence. Check whether manual preparation updated CURRENT/menus in the correct order.

D. **Correct auto-recovery:** If local menu registration alone is incomplete, reconcile **the same authorized and saved menu** through the canonical API, without forcing logout/login, changing provider authorization, redeploying Worker or clearing any user choice. Keep bounded backoff, detect persistent Chrome API blocks, and emit one durable actionable message only when recovery is genuinely blocked. Do **not** drop safety checks, claim ACK without Chrome callback or assume ACK proves rendered UI. Capture real Windows Chrome confirmation as a separate class of evidence.

E. **Status semantics:** Ensure `Not saved` is attached to a specific attempted save. A Chrome maintenance outcome that later appears should say "Right-click menu needs attention" rather than incorrectly changing a previously verified save to failed. Any verified provider receipt must remain immutable.

F. **REDOWN parity:** Inspect REDOWN's menu refresh/application and authentication lifecycle in addition to its profile readiness gate. Look for a tested approach that re-registers stable menus after state/authorization changes without needing a user to log out/in, but do not port its old architecture or bypass Click2Cloud's menu-generation and security constraints.

## Suggested acceptance tests

- Previously verified remote target + native ACK temporarily absent → safe automatic API reconciliation, same target/default, no Cloudflare changes, correct verified save on next right-click.
- Chrome API callback failure or timeout → preserve old/current state and show precise diagnostic; do not pretend it's ready.
- Child row failure because parent failed → truthful blocked state and safe retry; never register a wrong destination.
- 10+ minutes idle / MV3 suspension / return to Shelf → no belated stale `Not saved` banner and no user action required for already safe reconciled menu.
- Last verified save remains verified while unrelated menu reconciliation is pending/blocked.
- No repeated manual login for native-only repair, and no unapproved Cloudflare resource creation.

**No code fix, verified new test, or installed Chrome inspection was performed by this documentation update. Phase 1 still requires owner review before any selected repair/porting Phase 2.**


## November 17 follow-up: explicit login again still returns contradictory "· ready"

After receiving the earlier `NATIVE_APPLY_INCOMPLETE` warning, the owner **logged back in** to Click2Cloud and observed this **exact** new message:

> Cloudflare connected · Cloudflare is prepared, but Chrome did not acknowledge the menu. Reload the existing extension and log in again; saved destinations remain. · ready

**Important:** This is a separate observation from the earlier idle/return banner, and occurred **after a deliberate re-login**, directly challenging the UI's instruction to log in again. Do not claim the owner also reloaded the extension or that a new right-click was attempted; those actions were not reported.

### Exact source-level explanation for the trailing "ready"

In current GitHub `main`, `extension/app.mjs` login handler displays:

```js
status(result.state==='CONNECTED'
  ? (cloudflareState?.state==='completed'
      ? 'Ready to save · Cloudflare and Chrome verified.'
      : cloudflareState
        ? 'Cloudflare connected · '+(names[cloudflareState.code]??cloudflareState.code)+' · '+(cloudflareState.stage??'cloudflare-initialization')
        : 'Cloudflare connected.')
  : ...);
```

Thus **the final "ready" is a `cloudflareState.stage` string, not an independent assertion that the full native menu is acknowledged**. It can appear after an incomplete result if stage is populated as `ready`. In `src/api/service.mjs` the login route sets `initialization.stage` based on a `prepared.state==='completed'` branch and `finishInitialization` outcome, but can retain a stage like `ready` even when the resulting state is blocked/partial due to `NATIVE_APPLY_INCOMPLETE`. Codex must trace the exact intermediate object and verify this branch with a deterministic regression test; do not assume the installed build hash matches the current repo.

### Additional acceptance requirements

- A normal successful **re-login** with an already prepared Cloudflare destination must either automatically reconcile the native Chrome menu through the canonical API (and report real independent acknowledgement) or display an explicit **Cloudflare connected / Chrome menu NOT READY** status with the precise failed generation/ACK cause.
- Never append **"ready"** to a blocked or partial initialization status just because an earlier setup stage was called `ready`. Display **Ready to save** only when BOTH exact target Worker capability/readiness AND the expected native menu generation/selected row are actually acknowledged.
- Do not prescribe "log in again" for a native-only menu failure when the user has just done so; provide a bounded, safe local menu retry/reconcile action that preserves configuration, doesn't invoke new provider consent/resources, and reports persistent native errors with evidence.
- Preserve the previous separately reported **potential false verified save / missing object** as P0 [Issue #17](https://github.com/thanks-cohn/Click2Cloud/issues/17). Merely fixing the status text does not resolve either the native ACK failure or receipt-to-intended-target integrity.
