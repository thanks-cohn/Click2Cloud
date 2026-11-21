# The goal is for the right-click menu to ALWAYS be accessible.

> **P0 CRITICAL — November 21, 2026. Implement a dependable native Chrome right-click menu in Click2Cloud 0.3.22, using hard-won first principles from REDOWN's actual source, failures, and repair tests.**
>
> **"ALWAYS" means every supported Chrome context where the user has not intentionally hidden the relevant entry, including BEFORE login, IMMEDIATELY AFTER login/reconnect, after extension/Chrome restart, after MV3 worker suspension/wake, and when R2/Worker/network/setup is unavailable.** It does not promise an extension can override Chrome's restricted pages, an uninstalled/disabled extension, a worker that Chrome refuses to load, or a browser-wide failure. No opening the Shelf, clicking Retry, refreshing a page, manually rebuilding, or restarting Chrome should be necessary to make an eligible native entry appear.
>
> **The menu's visibility is separate from permission to save.** An unauthorized/unready item must open truthful login/attention/Manage; a READY item must save to the exact authorized destination and deliver a verifiable receipt. Never substitute fake save success for menu availability.

**OWNER PRIORITY:** This is a **release-blocking P0**, not a design brainstorm. Repair the existing Click2Cloud canonical engine/registrar and verify installed Chrome behavior. Do not stop at recording an issue, and do not allow UI polish, screenshots, Search, Get URL or nonessential features to displace native right-click availability.

**Target:** GitHub repository **thanks-cohn/Click2Cloud**, working branch **codex/minimal-baseline-palette-fonts-quiet-screenshots-2026-11-20** (manifest version **0.3.22** as inspected). **Immutable pre-repair tag**: [redown-0.3.22-BROKEN-pre-repair-2026-11-21](https://github.com/thanks-cohn/Click2Cloud/tree/redown-0.3.22-BROKEN-pre-repair-2026-11-21), pointing to commit **91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32**. Never move, rewrite, delete or retarget this tag. Do not accidentally base the repair on the separate 0.3.21 branch or tag.

**Document status:** A source-grounded request/audit, **NOT a committed code repair or certification**. The owner reports absent native menus; the precise installed-Chrome cause remains **unverified**. The REDOWN implementation is likewise only partly browser-verified as described by its own audit. This handoff must not be mistaken for a green release.

---

## Controlling November 21 addition — zero crash during bursts; live History; logged-out screenshot exception

**This section overrides earlier "screenshots out of scope" and generic queue/checkpoint wording only to the extent necessary for these explicit owner-approved P0 behaviors.**

- **Right-click ALWAYS accessible on eligible Chrome pages**—including while many saves or screenshots are being handled. Keep native menu registration independent of slow upload/capture/History work. No full menu rebuild on every click.
- **Fast succession of saves or screenshots must never destabilize the extension.** Bound actual expensive concurrency, active image/PNG memory, uploads, listeners and in-flight promises. A single click must not cause an extension-related ~2 GB RAM spike; repeated gestures must not cause worker/Shelf crash or runaway growth. No needless global lock, expensive per-click checkpoint series or sluggish scheduler. On genuine quotas, report a truthful busy/rate-limit status without losing the native menu.
- **Automatic live History for accepted operations:** right-click saves and authenticated screenshot results should appear/update in the open History without refresh/reopening. Use the existing durable record + \`remote-result\` and \`screenshot-history-changed\` notifications, not a second History pipeline. Preserve unlimited historical records while avoiding whole-archive scans and full preview decoding per burst.
- **NO History entry for logged-out screenshot shortcut:** Check actual auth before persisting the first screenshot job or attempting to capture/cache image bytes. A logged-out shortcut may show transient login feedback but must add **zero** History rows, failed/pending ghost records or retry-cache PNGs. A screenshot accepted while logged in must remain in History even if later authorization/upload fails.
- **Explicit screenshot source problem to inspect:** \`src/screenshot/capture.mjs:start\` creates a pending job and invokes \`void checkpoint(job)\` before user authority is checked by the delivery path; \`finish\` also records a failed operation. Fix this boundary without hiding genuine already-accepted attempts. The active Set guards IDs rather than obvious global burst capacity; up to 3 upload workers **per capture** can multiply concurrency.
- **History source performance problem to inspect:** \`extension/history-page.mjs\` uses a 150ms coalesced refresh, but exceeding 64 distinct dirty operation IDs can request a full archive reload. In long-running History, this is a burst performance risk; improve targeted reconciliation and preserve scroll/focus/lazy previews.
- **Acceptance tests:** 100/500/1,000 rapid native saves; 10/50/100 rapid screenshot shortcuts; mixed save/screenshot; open/closed History live updates; logged-out shortcut bursts creating zero records; real Windows Chrome peak/post-idle process RAM, latency, callbacks, active image bytes, worker restarts and verified R2 receipts. Count mocks and real evidence separately. No silent accepted-command loss or false success.

**The detailed newer controlling implementation request is [next-codex/NEXT_CODEX_REQUEST_2026-11-21_P0_RIGHT_CLICK_ALWAYS_AND_LONGEVITY.md](next-codex/NEXT_CODEX_REQUEST_2026-11-21_P0_RIGHT_CLICK_ALWAYS_AND_LONGEVITY.md); its B01–B09 gates are mandatory before Milestone B.** Remote-job scheduling is optional and evidence-gated; do not install a heavyweight one as a default.

---

## 1. First principles extracted from REDOWN — adapt the proven engineering, not its entire application

**Actual REDOWN version inspected:** [REDOWN main at c78babc314acc5891203e95b169f027756e956c1](https://github.com/thanks-cohn/REDOWN/tree/c78babc314acc5891203e95b169f027756e956c1). Functional references:

- [REDOWN extension/background.js — native menu owner, reconciliation, recovery and startup](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/background.js#L2487-L2660) and [startup/wake handlers](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/extension/background.js#L2836-L2848).
- [REDOWN docs/boot/IMPLEMENTATION.md](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/docs/boot/IMPLEMENTATION.md) — explicit confirmed source failures versus unproven owner incident, before/after fixtures, remaining limits.
- [REDOWN original P0 menu emergency repair report](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/FOREVER_WORKS/v3/P0_TOOLBAR_AND_CONTEXT_MENU_EMERGENCY_REPAIR.md) — the earlier catastrophic empty-menu failure on create rejection after removeAll.
- [REDOWN tests/boot.test.mjs](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/tests/boot.test.mjs) and [before/after local fixture](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/docs/boot/verification/before-after.json).
- [REDOWN NEED_TO_DO/fundamentals.md §5A](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/NEED_TO_DO/fundamentals.md#L242-L260) and [installed-Chrome owner checklist](https://github.com/thanks-cohn/REDOWN/blob/c78babc314acc5891203e95b169f027756e956c1/docs/reliability/TOOLBAR_AND_MENU_OWNER_CHECKLIST.md).

### Principle A — **The native menu is an independent, pre-registered entrypoint.**

Chrome presents entries the extension previously registered; opening a right-click must not wait for IndexedDB traversal, Cloudflare OAuth, R2 listing, Worker deployment, folder discovery, Shelf startup, theme rendering, URL retrieval or a network round trip. Make a small, correct native entry available as early as permitted. Establishing **visibility** must not require having even one configured destination. Keep exact source authorization and destination resolution on **click**, not as a prerequisite to rendering.

**REDOWN evidence:** Its current \`ensureMenuAccess()\` creates/updates the existing **REDOWN** root and **Manage destinations…** before fetching complex menu configuration. It only runs provider work when required to compose the remaining projection. REDOWN's root is its presentation choice; **do not mechanically insert a new REDOWN root into Click2Cloud** if that violates the established flat provider menu contract. Preserve Click2Cloud's own immediately clickable, enabled **Cloudflare** provider entry and the existing attention/Manage access, plus other enabled provider entries, as defined by \`AGENTS.md\` and the right-click rules.

### Principle B — **Never destroy a known working menu to create a replacement.**

REDOWN's earlier code did \`contextMenus.removeAll()\` before rebuilding. A single child \`create\` callback rejection then cleared all entries again, leaving no functional recovery root. This failure mechanism was reproduced with its real background source under simulated Chrome APIs, and it motivated the later repair. Its newer implementation performs **update existing → create missing → selectively remove obsolete**, preserving known-good entries and a recovery path. It has **zero ordinary full resets** in its documented before/after worker fixture (before: one reset on fresh load and one on missing-cache wake).

For Click2Cloud, **remove the routine full-tree \`chrome.contextMenus.removeAll()\` apply strategy**. Compute the next correct, parent-first projection first, then reconcile the minimal changed entries in a serialized lane. Preserve existing usable entries throughout ordinary updates, and retain the current provider-level recovery action if a child fails. Chrome does not offer an atomic menu transaction; specify honest intermediate and recovery behavior, not an impossible claim of perfect atomicity.

### Principle C — **A missing cache or failed inventory is not permission to erase the native menu.**

REDOWN treats absent \`rightClickNativeIds\` as incomplete knowledge, **not** proof Chrome has no menu entries. It tries \`update\` first and \`create\` on genuinely missing IDs. A callback that times out can mean Chrome created the entry without delivering the callback; blindly trying a second \`create\` or \`removeAll\` can cause duplicates or destroy viable entries. Handle ambiguous outcomes by stable identity, callback errors, observed evidence and conservative reconciliation. Local CURRENT cannot be synthesized from "there are no Chrome rows."

**Click2Cloud preservation requirement:** In \`extension/background.mjs\`, \`readCurrent()\` already fences \`nativeRegistration.desired.generation>0\` against a new generation-zero CURRENT. **Keep and respect this fence**. If established CURRENT is missing/corrupt/locked, never overwrite it, reset user settings, invent the default bucket or treat it as new installation. Still preserve or restore the **existing local provider/Manage entrypoint** where Chrome and the known safe configuration permit it. Report a specific configuration recovery state rather than making every menu vanish.

### Principle D — **One native-menu writer; serialized, coalesced reconciliation.**

REDOWN's menu writer owns all menu writes in \`background.js\`. Overlapping startup, Settings Apply and storage-change triggers join one active \`rebuildMenus\` sequence with at most one trailing pass; native callbacks are acknowledged in that lane. The later version avoids repeated independent full rebuilds.

Click2Cloud already has a canonical \`createChromeRegistrar\`, menu compiler, typed \`3+1.1\` API, \`nativeQueue\`, \`nativeAttempt\` and generation machinery. **Extend those; do not create a parallel ReDown registrar or second \`contextMenus.onClicked\` listener.** Coalesce same desired generation; serialize parent/child changes, reject stale generations and avoid doing destructive work during repeated OAuth or background events. Maintain stable native item IDs and the correct unique item-to-action-to-target mapping.

### Principle E — **Worker activation and browser startup are different triggers.**

REDOWN explicitly reconciles on **each successful worker evaluation** as well as \`runtime.onInstalled\` and \`runtime.onStartup\`. Its emergency audit documents how relying on install/browser-start only leaves missing menus uncorrected on routine MV3 worker wake. A Chrome page refresh need not generate either lifecycle event.

Add safe **worker-load reconciliation** to Click2Cloud's normal MV3 ESM startup, *after synchronous event listeners are registered*. It must be low-cost, idempotent, single-owner, and preserve existing rows until the canonical desired state is known. Do not wait for cloud setup, and do not start an always-on heartbeat. Keep native-menu recovery separate from Shelf rendering so failure of the Shelf cannot remove the right-click entry.

**Startup caveat:** REDOWN also includes a guarded classic \`service-worker.js\` wrapper that tries to preserve its toolbar entry when the larger core \`importScripts\` fails. Click2Cloud uses an **ES module service worker**, so **do not copy** REDOWN's classic wrapper or add duplicate click handlers. Apply the underlying idea: validate the actual bundled ESM dependency graph, register vital listeners early, make optional features noncritical, record the first failing import/evaluation stage, and retain available local fallback entrypoints. No extension can autonomously recover if Chrome refuses to start its only service worker.

### Principle F — **Successful login MUST request menu reconciliation, independent of cloud setup outcome.**

Authentication, resource readiness, native menu registration and actual remote save are **different operations**. ReDown's strong lesson is its independent local menu access. **Do not claim REDOWN's own OAuth wrapper is perfect or that it explicitly reconciles every login:** the inspected \`connectCloudflare()\` simply delegates to the auth owner, while other state-change/setup paths may rebuild menus.

Click2Cloud must provide the missing *explicit* event transition: after successful first login/reconnect/reconsent, schedule the **same canonical registrar reconciliation** even if Cloudflare initialization is blocked, declined, offline or has no saved destination. Never let reconciliation failure negate OAuth success or initiate unauthorized Worker/R2 mutations. For users with saved targets, preserve their exact config, Default, Quick, Simple, Narrow and Depth entries. For genuinely new users, enabled provider actions must appear with login/setup attention rather than vanish. Do not replay a source click after login.

### Principle G — **Durable desired state and Chrome acknowledgement are not visual proof.**

REDOWN distinguishes desired/applied generations, attempt IDs, last acknowledged timestamp, interrupted worker epochs and failed native calls. It has tests showing recovery from interrupted generations and absent ID caches without clearing surviving menu entries. Its \`BOOT\` status explicitly labels **native visible rows "not-verifiable"** because Chrome's create/update ACK does **not** prove the actual OS menu appeared.

Keep Click2Cloud's desired/applied generation, \`nativeRegistration\` and diagnostics; accurately report \`planned\`, \`applying\`, \`acknowledged\`, \`partial\`, \`failed\`, \`unknown\` and **real installed native rendering** as distinct. Do not mark "fixed" because \`previewNativeMenu\`, fixtures, \`inspectNativeACK\`, a good heartbeat or mocked Chrome passed. The real browser must demonstrate the entry in its context menu.

### Principle H — **Failures must leave an understandable way to recover.**

ReDown tries to preserve a working root/Manage action when child registration fails and provides a bounded, truthful BOOT repair/debug path. If Chrome forbids APIs, no code should claim recovery. Local problems must surface specific operator-visible diagnostic states; routine error handling must not silently swallow the cause.

Click2Cloud must restore **its own existing** provider action/attention/Manage access, show a concrete failure code if the native projection fails, and provide a repair path if Chrome permits it. **Manual repair is an emergency fallback, never the ordinary requirement for the menu to appear.** Do not add unrelated launch surfaces or surprise new tabs. Preserve the current Shelf/side-panel gesture and provider-specific attention behavior.

### Principle I — **Registration availability is not remote-save correctness.**

An entry may exist while its account is offline, its token expired, its selected bucket unavailable or its CURRENT generation changed. Click-time resolver must revalidate canonical identity, user settings, exact source, actual account/bucket/prefix and permission; then either deliver the real verified R2 save or report action-required/blocked. Do not use stale menu labels as authority; do not silently route to \`redown\` if the intended saved destination fails.

### Principle J — **Fault-injection tests must reproduce failure mechanisms, not only ideal paths.**

ReDown has harness tests for a missing native ID cache with existing Chrome entries, lost \`create\` callbacks, interrupted generations, stale child absence, 20 worker activations, single listeners, preservation of history, and bounded explicit repair. Its docs correctly say these are **harness tests**, and installed Chrome acceptance remains OPEN. Copy the test **categories and evidentiary honesty** into Click2Cloud's own test suite, not necessarily its code.

---

## 2. Exact defects and risks in the pinned broken Click2Cloud 0.3.22 source

Read and diagnose at the **pre-repair tag** (NOT 0.3.21):

1. [\`src/chrome/registrar.mjs\`](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/src/chrome/registrar.mjs#L112-L191): \`createChromeRegistrar.apply()\` **unconditionally** \`await native('removeAll', [])\` after clearing its acknowledged state, then recreates entries one by one. If a parent fails, descendants are blocked; if \`removeAll\` succeeds and the worker terminates or a create is rejected, previously registered items are gone. It persists the desired generation separately and may report partial/uncertain outcomes. **This is a proven source-level hazard, not yet proof it caused the owner's Chrome symptom.**
2. [\`extension/background.mjs\`](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/extension/background.mjs#L402-L414): \`nativeReady()\` checks acknowledged generation and otherwise calls canonical \`api.reconcile\`. It is wired into \`runtime.onInstalled\` and \`runtime.onStartup\`, **but no unconditional \`nativeReady()\` call appears at this module's end on normal worker evaluation**. The event handlers \`.catch(()=>{})\` also suppress failures. An existing \`beforeClick\` path can call \`nativeReady()\`, but cannot rescue a wholly absent menu without a click.
3. [\`extension/background.mjs\` OAuth hookup](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/extension/background.mjs#L45-L60): \`onConnected\` clears snapshots and emits \`connection-changed\`, **but does not directly request native reconciliation**. Other UI callbacks may help in certain states, but that must be traced rather than assumed.
4. [\`src/api/service.mjs\` login flow](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/src/api/service.mjs#L365-L394): after CONNECTED, \`finishInitialization\` reconciles if Cloudflare setup **completes**; \`applyCurrent\` also runs if initialization does not complete **and** \`hasSaved\` is true. If initialization is blocked with **no saved target**, an explicit native apply does not appear in that conditional branch. Authentication succeeds separately, which is good; native availability is not guaranteed by that branch. Treat this as a **high-priority reproduction hypothesis**, not established installed cause.
5. [\`src/api/service.mjs\` typed API](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/src/api/service.mjs): \`applyCurrent\`, \`reconcileNativeMenu\`, \`loginBegin\`, \`commitConfigChange\`, typed authorization and generation checks already exist. **Reuse them.**
6. [\`extension/manifest.json\` on the broken tag](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/extension/manifest.json): manifest version **0.3.22** includes \`contextMenus\` permission and the established extension key. **A missing permission declaration is not the observed source-level explanation**. Do not change extension ID, OAuth redirect or authorizations as a speculative fix.
7. [\`AGENTS.md\`](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/AGENTS.md) establishes persisted-user-config precedence, non-destructive recovery, the normal owner-authorized Login→readiness/initialization path and the **zero-config enabled Cloudflare native entry**. It also contains historical superseded overrides: resolve according to latest controlling owner intent and current actual source; **do not use the new reliability fix to silently reselect buckets, restore a deliberately removed destination, create Cloudflare resources without established approval, or rewrite Settings**.
8. [Right-click source ↔ API map](https://github.com/thanks-cohn/Click2Cloud/blob/91aad92e11ccd3ad28bbc4c40ca1ec3be614ec32/latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md) and \`11.2026/workings/right-click-workings.json\` document the canonical Simple/Narrow/Depth/Quick/Default contract. Reconciliation refactoring must preserve these rules and update **expressed logic and tests** whenever source behavior changes.

**Important source-versus-symptom distinction:** The owner has reported the *native* Chrome right-click entry disappearing. This is not the Shelf Explorer context menu, not a wrong bucket, not a failed cloud upload, and not a confirmed Chrome-wide crash. Identify the first missing transition with real diagnostics before attributing causality.

---

## 3. Required implementation, in order (P0)

### Phase 0 — Preserve evidence and the known-bad baseline

- Keep tag **\`redown-0.3.22-BROKEN-pre-repair-2026-11-21\`** immutable. Work on a new repair branch from the verified 0.3.22 source/current handoff head, not by changing the tag.
- Capture \`git rev-parse HEAD\`, source/build manifest, installed extension ID, matching unpacked extension path, current visible provider settings, sanitized \`nativeRegistration\` state, and Chrome \`chrome://extensions\` worker errors. Distinguish the repo branch from the installed unpacked build: a Git checkout does not automatically reload Chrome's \`dist/click2cloud\`.
- Determine: entire Chrome context menu absent vs only Click2Cloud native entries absent; page/image/link; Chrome restricted tab vs normal site; fresh vs existing auth; actual worker started vs failed import; API registration rejection vs intentionally hidden item vs missing CURRENT.
- **Read-only first**. Do not clear extension data, delete/replace CURRENT, reauthorize without need, reset profiles, delete buckets or modify live R2 as a diagnostic maneuver.

### Phase 1 — Independent minimum entrypoint before login/network

- Within Click2Cloud's one canonical registrar, immediately register/reconcile the already-approved minimal clickable provider entries according to visibility settings, **including one flat Cloudflare entry with zero connections/destinations**. When unready, click opens the existing provider-specific attention/login or Manage behavior. Do not create fake actionable destinations.
- The minimum entrypoint survives optional inventory, Depth discovery, remote transport, Screenshot, Shelf rendering, History, Get URL and marketing/UI module failure.
- **Do not insert an extra REDOWN root**: ReDown's root/Manage is an *availability design pattern*. Click2Cloud's contract uses Chrome's grouping and flat provider actions; preserve exact existing labels, provider visibility, one Cloudflare item, Simple/Narrow/Depth topology and the typed action identities.

### Phase 2 — Non-destructive incremental registrar (highest-risk core fix)

- Replace the ordinary \`removeAll\` transaction in \`src/chrome/registrar.mjs\` with a **plan-first, parent-before-child, stable-ID** diff/reconcile: update existing properties where valid, create truly absent IDs, remove only demonstrably obsolete IDs in a safe dependency/order sequence.
- In Chrome APIs, \`update\` cannot freely reorder sibling positions or move parents. For structural/reorder cases, perform the **narrowest necessary** targeted subtree replacement, preserving the minimal provider/login recovery entries. Label-only/activation-status changes should not induce full menu churn.
- Treat missing/corrupt native-ID cache, generation ambiguity and callback timeout as **uncertain, not empty**. Do not delete unknown valid rows just because an in-memory cache was lost. Account for a create that succeeded but lost its callback; retry through update/missing-ID probes and deterministic IDs, not repeated blind create.
- Preserve usable old entries until safely superseded. Stale old items must revalidate CURRENT on click and fail closed if their target was deleted or unauthorized. Keep unique IDs, parent hierarchy, contexts and user-visible ordering.
- If configuration read/projection fails, retain known-good entries and the minimal provider/Manage action; make the failure diagnostic. Do not commit a fabricated empty state, mark an unacknowledged menu "applied", or use \`removeAll\` as a routine recovery shortcut.
- Preserve single-writer serialized native apply (no second registration owner), durable desired/applied generation receipts, and exact action-to-target routing. Limit repeat/overlap work with single-flight/coalescing; do not promise impossible atomic Chrome native updates.

### Phase 3 — Repair all lifecycle triggers, especially login

- Install/start: pre-register essentials and request canonical desired projection after safe local state hydration.
- **Each actual MV3 worker activation:** register event handlers synchronously and request one bounded, nonblocking native reconciliation. Do **not** rely exclusively on \`onStartup\`: that fires on browser start, not every worker wake. No busy loop or keepalive interval.
- **Successful first Login / reconnect / reconsent:** even if initialization fails, no destinations exist, a permission is genuinely missing, R2 is offline, or a Worker is unready, independently schedule native provider-action reconciliation. Ensure the moment OAuth completes, enabled native entries remain visible on a supported page. Do not block OAuth success on registration. Do not duplicate a command/API call already in flight; join the same registrar lane.
- Destination edits, provider visibility ON/OFF, Simple/Narrow/Depth mode, Quick Select and Default: reconcile immediately after the validated CURRENT transaction, with exact generations and existing effective rules. Never rebuild due merely to opening the Shelf.
- On disconnect/revocation: provider entries remain according to explicit visibility settings, but save attempts truthfully require attention. Never delete stored destination membership.
- When native registration genuinely cannot succeed due to Chrome API restrictions, preserve independent Shelf/toolbar access, report a specific actionable code and leave last-known configuration intact. Do not claim "always" means bypassing Chrome policy.

### Phase 4 — Observability and explicit recovery without extra storage or a new engine

- Reuse \`nativeRegistration\`, CurrentStore/IndexedDB, \`chrome.storage.local\`, existing diagnostics and RAW/SECURE exports. Persist only small bounded menu **metadata** (generation, item IDs, state/ACK class, worker epoch, error code, attempt ID/timestamps). **No downloaded file bytes, no local staging folder, no new database, no arbitrary durable full-history duplication, no background polling loop** for this repair.
- Add source-identifiable stage/status events: worker evaluated, listener installed, minimal entry requested/acknowledged, CURRENT read, desired compiled, native apply started/partial/completed, Login CONNECTED, Login→reconcile scheduled/completed/blocked, OAuth status, registration callback error/timeout, click accepted and exact action outcome. Do not expose secrets or arbitrary original URLs in Secure exports.
- Preserve RAW receipts as the user's explicit higher-detail forensic option, separately from redacted SECURE receipts. Chrome ACK, physically rendered native menu, provider storage result and readback are distinct proof classes.
- Provide a deterministic bounded **explicit** repair control through existing diagnostics/Settings API if recovery fails; successful normal operation must never require users to invoke it. Healthy-repair/no-op must not churn native entries or write user configuration.

### Phase 5 — Only after P0 menu availability passes

- Retest separately tracked [GitHub issue #20](https://github.com/thanks-cohn/Click2Cloud/issues/20): Shelf More/sun-moon overlap after expanding then shrinking, including Emerald Forest. **P1; do not let this distract from the P0**.
- The Chrome-owned display-title change to **REDOWN** was committed on a different 0.3.21 branch, but **the tagged 0.3.22 manifest still says \`Click2Cloud\`**. If integrating it later, do so as an explicitly separate branding commit preserving ID and OAuth, not as a purported native-menu repair. Do not accidentally downgrade 0.3.22 by borrowing the older manifest.
- Preserve 0.3.21 Screenshot final logic and defer the separate 0.3.22 Auto-Reroute work unless the owner separately directs it. No unnecessary Worker/Cloudflare migrations.

---

## 4. Acceptance matrix — must be tested and reported truthfully

For each case, report **fixture PASS/FAIL** separately from **installed Windows Chrome PASS/FAIL/BLOCKED/NOT TESTED**. A simulated native ACK is never an installed visual PASS. Include actual expected native rows, source action, CURRENT generation and whether no extra remote mutation occurred.

| ID | Reproduction / injected failure | Required result |
| --- | --- | --- |
| R01 | Brand-new extension, never logged in, no saved destinations | Enabled Cloudflare entry exists, clickable, shows correct One Click Away/login attention; no remote write |
| R02 | Immediately after first successful Login with no saved target | Entry remains visible without Shelf reopening/tab refresh/reload; authorized setup separately reports outcome |
| R03 | First Login succeeds but Cloudflare setup is blocked/denied/times out | Login success retained, native provider entry remains, truthful attention; no fake default |
| R04 | Existing saved destinations; logout then login/reconnect/reconsent | Same persisted Simple/Narrow/Depth/Quick/Default and exact target IDs; menu available promptly |
| R05 | Worker service suspends/wakes; no \`onStartup\` event | Menu remains/reappears without manual rebuild; exactly one native owner/listener |
| R06 | Chrome browser restart, extension update/reload, multiple ordinary tabs/windows | Supported-context menu remains available; no ghost/duplicate or wrong-profile routing |
| R07 | \`contextMenus.create\` fails for a child after some entries are registered | Previously good provider/Manage access survives; partial error is visible; retry can recover |
| R08 | Native \`create\` callback lost or timed out although Chrome created the row | No blind full reset/duplicate ID; conservative same-ID reconciliation; status remains uncertain until proven |
| R09 | Missing in-memory or durable native ID cache while Chrome still holds items | Preserve surviving items; no \`removeAll\`; restore metadata safely if possible |
| R10 | CURRENT read fails or historical record missing/corrupt while prior native generation exists | Preserve state, fail closed for unsafe saves, do not synthesize zero-config or delete saved destinations |
| R11 | Shutdown/error midway after CURRENT commit but before native ACK | Desired/applied mismatch retained; next activation recovers; no false "applied" result |
| R12 | Concurrent Login + startup + Settings Apply + worker wake | One serialized canonical writer; only newest desired generation acknowledged; no clearing or repeated full reset |
| R13 | Simple one target; Narrow selected ancestors; Depth exact bounded discovery | Exact original menu projection, no imaginary folders or redundant bucket layers |
| R14 | Default, Quick Select, multiple accounts, multiple real destinations | Exact user-selected targets and order; failed one provider does not erase the others |
| R15 | Toggle provider OFF then ON (including Cloudflare) | OFF intentionally suppresses that provider only; ON restores it without OAuth/config deletion |
| R16 | Temporary Cloudflare/R2/Worker outage or token expiration | Native entry stays visible; click shows accurate auth/repair/error, never bogus successful save |
| R17 | First explicit eligible click after successful Login on an actual image/link/page | Exact authorized save or honest blocked outcome with readable receipt; no lost gesture or wrong bucket |
| R18 | Chrome-restricted pages, disabled extension, worker refusing to load | Explicitly document platform limitation/actual Chrome Errors; no false guarantee |
| R19 | No-op desired menu; repeated healthy worker activations (at least 20 in harness) | Stable rows/IDs, no native reset, no duplicate listeners, minimal writes/CPU |
| R20 | Parent create failure, removal failure, callback timeout and malformed plan | Preserve independent recovery entry; specific diagnostics; no broken partially promoted applied generation |
| R21 | All permitted page/image/link contexts, including before/after login, in **real Windows Chrome** | User visually confirms item, clicks it, and traces target/status independently of API ACK |
| R22 | Retest in original Chrome profile without clearing existing extension data | Owner's absence symptom specifically resolved or remains OPEN with precise blocker |

**Additional runtime verification:** Measure cold/warm native-menu availability and startup/reconcile latency without blocking first right-click on network; compare source/tagged bad baseline versus repaired branch, not version string alone. Do not assert a time threshold without measuring the actual browser. Run source lint/type/syntax, relevant focused unit/integration suites, build, fault injections, native Chrome render checks and authorized end-to-end R2 readback only with explicit test permission. A working emulator does not prove Chrome's UI.

**Evidence from REDOWN is not Click2Cloud evidence:** REDOWN's BOOT report includes harness 47/47 focused tests and a 20-activation fixture, but its own installed-Chrome run was blocked. An older REDOWN emergency focused suite passed 98 tests, while the broader reliability suite remained incomplete/failed and installed Chrome was unavailable. Do not convert those source reports into a claim Click2Cloud or even the owner's ReDown browser is fixed.

---

## 5. Scope/safety firewall — preserve the whole product

- **No destructive reset.** Never delete, rewrite or silently synthesize CURRENT, IndexedDB, local saved profiles, account identity, authorization, Default, Quick, Simple/Narrow/Depth, visible/hidden provider settings, History, diagnostics, user setup approval or cloud buckets. Missing state is a fault, not evidence of an empty new installation.
- **No credential or infrastructure changes** as a speculative menu fix. Keep the same extension manifest key/ID, OAuth redirect, permissions and authorized Cloudflare R2/Worker configuration. No unapproved billable provisioning, public access enabling, object deletion or account mutations.
- **No separate menu engine, no root-label duplication.** REDOWN is a **read-only reference**. Reuse Click2Cloud's own V3+1.1 engine, compiler, \`createChromeRegistrar\`, typed API, native dispatcher and existing GUI. Ensure exactly one native registrar/click owner, no added conflicting scripts.
- **No local downloads / no heavy storage.** The native menu uses Chrome registration + small existing browser configuration/metadata; the actual file remains a TRUE REMOTE upload. No download→disk→re-upload requirement or new local file cache. Existing IndexedDB/\`chrome.storage.local\` still preserve tiny config and receipts.
- **No unsupported guarantees.** Browser restrictions, worker parse/evaluation failures, Chrome API denial and erased extension profiles cannot be magically corrected by a service worker. Explain blocked cases and independent alternatives.
- **Keep the user's current visual/theming, Screenshot, File Explorer, Get URL and History behavior** outside this scoped reliability repair. Test nonregression; don't expand into a redesign.

## 6. Deliverables and completion contract for Codex

1. A **source-level causal audit**: before/after code paths at the pinned 0.3.22 tag, exact lost-menu reproduction and all remaining hypotheses clearly labeled. Show where the login→native reconcile signal originates, how it becomes durable and when it is acknowledged.
2. Actual **scoped implementation commits** for incremental non-destructive menu registration, worker-load and post-login reconciliation, protected minimum provider entry, truthful state and diagnostics. No work-in-progress-only pseudo code or empty "fixed" claim.
3. **Tests added** for each relevant R01–R22 scenario, especially no-destination blocked-login, callback-lost, create failure, missing cache, worker activation and CURRENT integrity fence. Include pre/post fixture comparison, output and exact regression counts.
4. Update the source↔API documentation and \`11.2026/workings/right-click-workings.json\` to reflect implemented **expressed logic**, not merely proposed rules. Keep original pre-change artifacts protected. Record new owner-approved exceptions explicitly if needed, without silently changing menu semantics.
5. Build and compare **the actual loaded extension**: tag \`redown-0.3.22-BROKEN-pre-repair-2026-11-21\` vs repaired commit. Include installed extension path, source/build SHA, Chrome version, native screenshots or independent UI evidence, mode/target click results and sanitized error receipts. When installed Chrome is unavailable, report **BLOCKED**, never "verified".
6. An honest final handoff: changed files, commit SHAs, tests PASS/FAIL/BLOCKED, confirmed vs suspected causes, any still-open defects, user-state preservation proof, remaining risk and minimal reproduction instructions. **Only after actual installed-Chrome acceptance should a separate FIXED/verified tag be proposed**; do not retag the known-bad baseline.

### Single acceptance statement

**The user can open Chrome, right-click an eligible page/image/link, and see the enabled Click2Cloud provider action immediately—even if the Shelf is closed, OAuth is expired, the Worker is unreachable, cloud discovery failed, or a previous menu-update attempt was interrupted. Successful login/reconnect does not make the menu vanish. Clicking then either saves to the exact authorized cloud destination with a verifiable receipt or clearly explains why authorization/readiness is required. Existing saved state is never erased.**

**This is the release gate.**
