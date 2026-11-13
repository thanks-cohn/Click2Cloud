# CODEX REQUEST — App-wide near-instant responsiveness, silent normal mode, Debug switch, and logic2real audit

**Date:** 2026-11-13 (America/Chicago)  
**Repository:** `thanks-cohn/Click2Cloud`  
**Start branch:** `codex/depth-working-first-implementation`; record actual starting SHA before working  
**Priority:** **P0 FIRST: FIX ALL THREE TRASH BUTTONS**; only then app-wide responsiveness, silent Debug Mode, and logic2real investigation  
**Status:** Owner-directed request; no implementation or live acceptance is implied  
**Do not merge to main without owner approval.**

## P0 FIRST / SHIP-BLOCKING GATE — Trash buttons before everything else

**Highest-priority owner directive (2026-11-13): RIGHT-CLICK SAVING CURRENTLY WORKS; ALL THREE TRASH BUTTONS DO NOT. Preserve working right-click saving.**

**Execution priority is mandatory, not optional:**

1. **First, capture a minimally invasive baseline** of the existing working right-click save path and current stored configuration/menu; do not make changes or delay the repair with a comprehensive performance audit. This is a safety snapshot/acceptance baseline, not permission to reset, migrate or copy private secrets.
2. **Immediately diagnose and FIX Trash in Simple, Narrow and Depth** using [P0_ALL_MODES_TRASH_BUTTON_REPAIR_REQUEST.md](P0_ALL_MODES_TRASH_BUTTON_REPAIR_REQUEST.md). Work from the shared click/confirmation handler outward; test whether `window.confirm` is swallowed by the extension modal, whether handlers are firing and whether the Save commit actually persists. Verify exactly one user-selected config row/scope is removed per explicit action; do not touch R2 files.
3. **Gate all remaining work on Trash verification**. At minimum: all three modes show confirmation → Cancel preserves → Confirm stages exact entry → Save commits → reopen persists → native menu no longer includes selected entry; run working right-click save regression. If one tab still fails, continue fixing Trash before moving on. If a test is blocked by installed-Chrome access, report that explicitly, provide exact manual acceptance steps, and complete every verifiable source/fixture gate before proceeding; do not claim installed PASS.
4. **Only after the Trash gate**, implement Debug OFF silence, Debug ON switch, and scoped performance improvements; then complete the larger logic2real audit and comparison. The full audit can record baseline evidence earlier but **may not displace the Trash repair as first development priority**.
5. Document the repairs and measured outcomes so the user's working Chrome right-click save remains a **non-regression invariant**. No general refactor or UX redesign disguised as a Trash fix.

**The core defect to communicate in the handoff and checkpoint name is: “RIGHT-CLICK SAVE WORKS, BUT TRASH DOES NOT — SIMPLE, NARROW, DEPTH.”** Do not mislabel this as broken right-click saving. The current save path should be preserved, not “repaired” as part of deletion.

---

## 0. Read this first — owner's exact intent

> The owner wants the whole Click2Cloud application to feel nearly instantaneous wherever possible, especially the native right-click menu opening and save dispatch. Their ordinary interface should be **as silent as possible**. The **little floating status/debug box must NOT APPEAR AT ALL while Debug Mode is OFF**. No three-message chain, debug statements, modal spam or floating diagnostics in normal use. Add a discoverable Settings **Debug Mode ON/OFF** switch if there is none; if one exists on the executing branch, make it correctly enforce this behavior.
>
> Independently, conduct a thorough **logic2real** comparison: what the rules/docs and configured intent say SHOULD happen, what the actual source and built extension DO, and what the installed Chrome experience REALLY shows. We need the discrepancies, with evidence, to cross-compare intent against implementation.
>
> **P0 first:** All three Trash buttons are broken while right-click saving works. Fix and test Trash in **Simple, Narrow and Depth** before pursuing other improvements. See the mandatory ship-blocking gate above and [the focused Trash repair request](P0_ALL_MODES_TRASH_BUTTON_REPAIR_REQUEST.md).

**Strict boundaries:** Do not redesign the right-click menu, alter the owner's configured choices, auto-delete duplicate `2D` entries, conflate Narrow/Depth/Simple, reset storage, reauthorize accounts, recreate Workers, modify Cloudflare R2 objects, force uninstall/reinstall, rewrite the cloud transport or queue from scratch, disable security checks or declare a remote save successful without verification. **Audit menu logic2real gaps; don't silently change their intended menu behavior without owner instruction.** Small, proven changes that improve responsiveness and reduce unwanted UI noise are authorized. Preserve current crash-recovery and headless right-click reliability.

## 1. First establish what's already implemented (do not reinvent it)

Inspect the actual starting revision, installed build and relevant historical docs:

- `extension/app.mjs`: global `const status=s=>{...}` renders the floating `#status` element; numerous `status(...)` calls. `renderSettings()` currently shows Theme, Gallery, Right-click, etc. On the inspected revision **there is no user-facing Settings Debug Mode toggle**. Verify at execution time.
- `extension/app.css`: fixed floating `#status` styling and existing visibility rules. Owner explicitly wants this floating box **ABSENT** when Debug OFF, not merely different text.
- `architecture/debug.md`: an existing architecture requirement specifies a Settings Debug entry near the bottom, OFF by default, persistent across Shelf reload and ON exposing detail. Build upon this, don't create a competing configuration concept.
- `src/chrome/debug-host.mjs`, `src/glaciaring/agent-api.mjs`, existing diagnostic APIs and evidence: a protected developer debug interface does NOT imply an ordinary user-facing Debug toggle, and a UI preference is NOT a privileged debug grant.
- `src/modes/depth/native-click.mjs`: `createDepthFeedback` stores `lastDepthClick`, may emit Chrome OS notifications for non-completed outcomes, sends a `depth-click-outcome` message, and sets a badge. Classify and measure these before attributing the owner's approximately three statements.
- `src/chrome/registrar.mjs`: applying a changed native menu currently uses `chrome.contextMenus.removeAll()` followed by individual registered menu item creations. Determine whether premature or too-frequent application causes observable right-click delay, missing menus or stale generation. Do NOT assume optimization is safe; registration consistency is critical.
- `extension/background.mjs`: `beforeClick` awaits `nativeReady()`, which may reconcile; inspect service-worker startup, authorization, actual save dispatch, cached vs uncached readiness, Depth-specific recovery and repeated status calls.
- `src/api/config.mjs`, `src/api/service.mjs`, `src/persistence/current-store.mjs`: canonical state, commit revision, idempotency and durability; preserve invariants.
- `src/core/menu-spec.mjs`, `src/modes/{simple,nested,depth}/`, `src/chrome/registrar.mjs`, `architecture/depth.md`, `Issues_and_Bugs/`, relevant `codex/11.13.2026-0355/` rules and acceptance documents: sources for logic2real matrix.
- Existing project-wide latency issues in `Issues_and_Bugs/Bugs/P0_WHOLE_SHELF_EXPLORER_LATENCY_STUTTER_REDOWN_PARITY_PLUS_2026-11-08.md` and `P0_EXPLORER_CONTEXT_MENU_LATENCY_AND_RESPONSIVENESS_2026-11-07.md`. Reuse evidence and avoid claiming previous work solved the owner's live performance complaint.

Track **FACT (observed)** vs **SOURCE EXPLANATION (supported)** vs **HYPOTHESIS (unverified)** separately.

## 2. Debug OFF — the floating box is completely invisible

**This is a hard acceptance requirement, not a suggestion:**

1. When Debug Mode is **OFF**, the little global floating `#status` box **must not render visibly, open, flash, linger, or reappear** during normal use, including right-click save, Depth recovery, Shelf startup, manager edits, remote readiness checks, benign retries and success. Prefer removing/hiding the visible presentation (while preserving essential internal evidence) rather than merely shortening its messages. Even if `status()` is invoked repeatedly, the box remains visually absent.
2. Silence routine low-level diagnostic statements, operation IDs, generation numbers, setup phase chatter and redundant success notifications in every normal-use surface—Shelf, extension popup, menu flows, and OS notifications. Avoid OS notification chains and repeated “not saved” messages for intermediate stages of one eventually successful save.
3. **Real failures must not be suppressed as if saves succeeded.** Authentication expiry, failed writes, unverified or uncertain saves, data integrity warnings and required user action remain discoverable via a **quiet non-floating** mechanism: e.g. one concise local inline error at the relevant action, restrained error badge with click-through to actual results/History, or an explicit attention panel if indispensable. No debug-coded message dump. The global floating box remains absent even for failure in Debug OFF.
4. With Debug OFF, successful, verified saves need no intrusive success popup. They should still be reflected in durable History/Queue and the destination's verified receipt. Do not confuse silence with no useful feedback: native actions should acknowledge promptly through a small non-floating contextual cue only if needed, never by implying verified completion before receipt.
5. Keep any **single deliberate user confirmation** for deletion or sensitive action. Do not turn ordinary saves into confirmation-heavy interactions.
6. Debug OFF must be applied **as early as possible on UI boot**; prevent a one-frame floating-box flash due to late Settings load. Accessible/non-debug in-place errors are allowed, floating `#status` is not.

## 3. Debug ON — a real Settings preference with useful, bounded diagnostics

- Inventory the actual Settings. If a working user Debug Mode switch exists, **reuse it**. Otherwise add **Settings → Debug Mode [OFF/ON]** near the bottom according to `architecture/debug.md`.
- Initial/default value **OFF** for existing/new users unless they explicitly opted in. Persist per Chrome profile across Shelf reopens and restarts via the existing canonical settings/persistence or a narrowly scoped, validated UI preference. Do not reset/migrate unrelated saved user config.
- Toggle must apply immediately to all applicable UI surfaces. Turning OFF immediately hides the floating box and detailed overlays even if the last action wrote a status; turning ON lets the user inspect recent safe diagnostic events.
- Debug ON may expose the existing floating `#status` box and structured in-app timelines or an inspection panel with per-operation codes, phase timings, menu generation, readiness and save outcome. **Still no spam**: coalesce repeated events for the same operation, bound retention/UI rate, offer explicit expand/copy and filter.
- Do not make Debug a second engine, external telemetry upload or new log database. Reuse trusted diagnostics, lifecycle records and Health/receipt APIs. Preserve minimum safe outcome evidence with Debug OFF, so a problem is diagnosable when Debug is turned ON later.
- Switching Debug ON **must not unlock privileged `debug-host` functionality**, sensitive exports or unconsented raw collection; retain existing document-scoped grants. Never print tokens, secrets, OAuth credentials, cookies or private object data.
- UI presentation preference must NOT alter native save code path, authorization, menu generation, storage or reliability.

### Explicit check for the owner's little box

Test with **Debug OFF and three consecutive right-click saves** (including a Depth entry that is slow or temporarily not ready): **zero appearances/flashes** of the floating `#status` box, zero repeated technical Chrome notifications; record the actual outcomes quietly. Turn Debug ON: details should be inspectable, then OFF again: **immediate silence**.

## 4. Whole-product latency — profile before touching code

Measure independent phases rather than calling every delay “right-click is slow”:

**A. Native menu appears** — right mouse-button gesture → Chrome's actual visible context menu (cold and warm extension, selected providers, single/multiple buckets, large branching tree). Chrome owns rendering; be explicit what extension registration/work can and cannot affect.

**B. Native save begins** — selecting a menu save action → extension event/worker wake → target resolution → operation accepted/recorded → request dispatched. Avoid preventable recomputation/reconciliation on the click path. Do not move authorization checks to the wrong trust boundary or hide failures.

**C. Native save completes** — remote authorization/readiness checks → source fetch → upload → actual R2/Worker result → receipt verification; separate true network latency from UI latency. Compare Simple, Narrow and Depth and explain any Depth-specific extra waits/recovery.

**D. Shelf and popup** — opening/boot, Remotes connection, Destinations Manager navigation, three mode tabs, edit/Trash/Save, Settings, Explorer file navigation, previews, History and Queue if already present. Audit main-thread stalls, full-dialog rerenders, unnecessary IPC and memory/cache misuse without destabilizing state.

**E. User-visible diagnostic overhead** — capture each of the owner's “three debug statements”: originating function/event, sequence, timing, whether repeated intermediate state or an actual final failure, popup/notification type, whether it delayed or merely cluttered interactions.

**Instrumentation/acceptance:**
- Record before/after **gesture → first visible response** (aspirational same frame / ~under 100 ms on a typical desktop where achievable), menu-open latency, click → dispatch, click → verified receipt, Shelf first meaningful paint, manager interaction latency. For each record p50/p95, sample count and environment where practical. Don't assert a timing not measured.
- Collect traces for cold/warm worker, first-after-login, already-authorized, expired authorization, offline, huge Depth menu, three modes combined, duplicate-labeled Narrow paths, single-flat provider route. Mark every test **PASS/FAIL/BLOCKED/NOT TESTED**.
- Inspect menu generation frequency, `removeAll` churn, `beforeClick` `nativeReady` blocking, duplicate remote `status` calls, potentially avoidable registration or network waits, background cold start, unnecessary queued retries, rendering/reconciliation locks. Hypotheses require timestamped evidence.
- When improvement is possible, make the **smallest targeted change proven by trace**. Prefer fast local UI response and nonblocking safe pipeline; preserve verified remote completion and no duplicate uploads.
- **Never sacrifice correct save targets, exactly-once/idempotency semantics, menu generation stability, Depth hierarchy, authorization, durable persistence, privacy or crash recovery for latency.**
- OS/provider network time is not controllable: clearly state any remaining bottlenecks and realistic limits.

## 5. logic2real gap — mandatory intent/source/real-Chrome comparison

This is **not simply a code review**. First establish the intended contract, then independently check code/projection, emitted native plan, Chrome registration/ACK, installed real menu and real save effect.

Define each discrepancy explicitly:

`owner-approved desired behavior and saved configuration → pure projector/spec → Chrome plan → Chrome ACK / visible context menu → chosen action ID/target → actual saved R2 object + receipt → persisted UI/History`.

For **each independently testable rule**, create a traceability row with at least:

| Rule / scenario | Intent / rule citation | Saved configuration | Current code / branch condition | Compiled menu rows and IDs | ACK / visible Chrome reality | Actual click/save target & receipt | Gap | Severity / recommended fix | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Mandatory scenario matrix:
1. Simple only; Narrow only; Depth only; all three enabled; all three disabled (without deleting config).
2. One Depth bucket root-only and no real child folders → sensible flat action; one bucket with descendants → navigable tree with `Save here` for parents; two buckets with no descendants; multiple branching buckets; maxDepth 5 and 6 against real ten-level hierarchy with multiple siblings; ensure per-bucket depth cutoffs don't mutate cloud folders.
3. Two Narrow presentations inside existing Depth trees: one custom per-level labels, one original labels; ensure both actions exist and target correctly even if physically overlapping Depth destinations.
4. Cloudflare bucket `valentiens` with child `2D`: owner expects `Cloudflare → valentiens → 2D` and optional `Save here`. **The current compiler may omit an unlabeled Narrow bucket-root branch**. Record difference as logic2real/contract mismatch; do not silently implement bucket-label redesign in this task.
5. Special `redown` bucket may retain established compact/flat root behavior, with `Save here` and descendants still reachable. Distinguish intentional exception from missing bucket.
6. Repeated Narrow `2D` destination presentations, some with same `targetKey` but different stable IDs; global Default matched by physical target vs individual presentation; independent edit, hide and delete behavior. **Do not auto-clean up duplicates or change Default semantics in this task.**
7. Trash Simple/Narrow/Depth: real button click → confirmation → exact ID/scope staging → Save receipt → persistence → native menu absence, without cloud deletion.
8. Menu startup/reload/update, saved-vs-registered generation disagreement, context menu appearing slowly or not at all, stale click, provider auth expiry, Worker recovery and error message duplication.
9. Quick Select, Default and hidden entries; no destructive cross-mode coupling or menu action pointing to a different bucket/prefix than specified.
10. Negative scenario: one mode hidden should not erase its config or silently remove another enabled mode's routes. Native ACK is not proof of visible menu or remote save.

**Three independent truth levels:**
- **INTENT:** exact owner rule, stored config and documented expected behavior; cite current/historical requirement and note superseded/conflicting docs.
- **IMPLEMENTATION:** actual source condition and reproducible projector/registrar behavior on starting SHA; explicitly distinguish pure-compiler deterministic output from runtime/transport behavior.
- **REALITY:** installed Chrome visible menu and actually saved R2 receipts on authorized test resources. A simulated browser fixture or ACK callback is **not** real installed user behavior. Mark missing real evidence **UNVERIFIED**, never PASS.

Deliver:
- `LOGIC2REAL_MATRIX.md` with PASS/FAIL/UNVERIFIED per rule, mismatch descriptions, concrete counterexamples and exact code references.
- `TIMING_BEFORE_AFTER.md` with measured latencies by phase and environment.
- `MESSAGE_AUDIT.md` mapping every visible floating box/popup/OS notification source and showing debug OFF vs ON behavior.
- `CHANGES_AND_TESTS.md` listing narrowly justified code edits, regression tests, affected paths, branch SHA, remaining gaps and independent functional verification.
- If already-existing equivalent evidence docs exist, extend them without fabricating results, rather than duplicating files.

**Important:** Investigation is authorized for all logic2real gaps. **Implementation of unrelated menu-layout/behavioral corrections is NOT authorized** by this request; document the mismatch and propose a separate scoped fix for owner review.

## 6. P0 Trash repair — FIRST IMPLEMENTATION AND VERIFICATION GATE

Complete [P0_ALL_MODES_TRASH_BUTTON_REPAIR_REQUEST.md](P0_ALL_MODES_TRASH_BUTTON_REPAIR_REQUEST.md) as part of the work:
- Simple, Narrow and Depth Trash must each **respond promptly**, present one deliberate reliable confirmation, stage exactly one selected stable entry/scope, and make the shared Save persist its removal.
- Deleted menu config gone after re-open/restart/native reconciliation. Cloud files untouched. Identically named Narrow presentations remain independent even if they share `targetKey`.
- A success-looking draft state before Save or Chrome ACK must not be mistaken for durable deletion. Any error must have an unobtrusive non-floating recovery path with Debug OFF.

## 7. Required verification and stopping conditions

1. Debug **OFF**: `#status` **never appears**, including on initial load and through repeated saves; low-level OS notifications do not spam; genuine failures remain accessible through non-floating, actionable UI.
2. Debug **ON**: detailed safe status and event diagnostics appear intentionally, without uncontrolled toast/modal/OS notification spam. Toggle persists and applies immediately. Privileged debug APIs remain restricted.
3. Meaningful latency reductions shown with measured before/after results; distinguish menu opening, menu action dispatch, remote receipt and Shelf UI. Any remaining delay attributed honestly and left as an explicit gap.
4. All three Trash buttons work and persist; no changes to cloud objects, other destinations or unselected scopes.
5. logic2real report covers **intent / code / compiled spec / ACK / actual Chrome / real destination**, includes conflicting/legacy rules, and states exact mismatches and evidence quality. No “zero gap” claims based only on simulations.
6. No regressions in native saving, provider security, storage stability, Default/Quick, user choices, independent modes, Depth recursion, headless fallback, real history or UI ability to access errors.
7. All code and docs committed on isolated work branch; report commit(s), files, numbers, PASS/FAIL/BLOCKED/UNVERIFIED, owner test instructions and gaps. **Do not merge main**.

**Success:** Click2Cloud feels immediate where genuinely possible, normally **silent with no floating status box**, explicitly debuggable in Settings, actually deletes selected Simple/Narrow/Depth entries, and produces a trustworthy side-by-side **logic2real evidence report** so the owner can determine what to fix next. No unexplained claims, no destructive shortcuts.
