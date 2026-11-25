# Behavioral exploration — purpose beyond coverage

This document is mandatory alongside TEST-MATRIX.md. The counts in the matrix are workload budgets, not the primary objective. The purpose is to discover defects in real user journeys and interacting state transitions, including defects not predicted by the owner or existing tests. A thousand identical passing invocations provide limited evidence about behavior under varied conditions. Do not optimize for a large green count.

## Think from user intent, not API availability

Model users with goals (collect, organize, retrieve, recover, change preferences, abandon a task), incomplete information and changing intentions. Generate sequences that a person might actually perform, including actions interleaved with asynchronous work. A user expects to resume a task without understanding worker lifecycles, authorization internals or staging objects. The API must maintain correctness regardless of GUI navigation. Use existing production APIs for fast exploration and real browser tests for GUI/native boundaries. Do not create a new public API or replace production paths with test-only logic.

For every journey predict desired final state independently from the implementation: exact object keys and contents, untouched objects, active view, selected account/destination, expected menu visibility, pending work, receipts, durable preferences and user-visible feedback. Derive allowed intermediate/terminal outcomes from documented contracts; if a contract is unclear, document ambiguity instead of inventing an expected result. A successful return is not itself the oracle. Check negative space too: what must NOT change, appear, disappear, repeat or be overwritten.

## Behavioral dimensions to combine

| Dimension | Representative variations |
|---|---|
| Pace | deliberate, quick consecutive clicks, double activation, burst then idle, interrupted task, return after hours |
| Intent | save here, switch destination, organize before saving, retrieve older file, change mind, cancel, resume |
| Starting state | clean profile, established profile, stale menu, logged out, reconnect required, restored session, pending work, large archive |
| Destination | one/multiple buckets, root of isolated test prefix, shallow/deep, identical folder names in different buckets, empty/populated, renamed/deleted folder |
| Mode | Simple/Narrow/Depth; switch before dispatch, after menu opens, while prior job pending, after restart; preserve intended selection or reject stale intent |
| Inputs | valid images of varied sizes/formats, duplicate names with same/different bytes, Unicode, long names, invalid names, unavailable source, supported non-image inputs |
| Timing | UI navigation before completion, late or duplicated completion, out-of-order listing, worker wake/eviction, expiry at boundary, retry/reconnect before/after result |
| Presentation | all supported themes, narrow and wide Shelf, collapsed panels, keyboard/mouse, closed/reopened UI, concurrent notifications |
| Storage/network | controlled latency, transient error, timeout before/after commit, quota/storage failure fixture, interrupted verification, offline/reconnect |
| History/Queue | empty/large archives, active filters, multiple pending/completed jobs, dismissed vs cancelled, late receipts, old and new records |

Use pairwise coverage across compatible dimensions, targeted three-way or higher-order combinations where lifecycle/auth/destination/async state interact, and seeded stateful sequences. Do not enumerate the full Cartesian product blindly. Keep a deliberate mix of normal workflows, boundary workflows, interrupted workflows and adversarial timing. Most simulated users should behave normally, not continuously inject errors. Proposed scenario mix for offline generation: 60% ordinary, 25% interruption/change of mind, 15% controlled faults or boundary states; adjust after observing coverage and defects. These are design targets, not observed customer telemetry.

## Concrete predicted behavior examples (not exhaustive; Codex must expand)

| ID | User behavior | What to look for |
|---|---|---|
| B01 | User opens native menu, changes destination settings in another window, selects old menu item. | Stale intent must not silently save into a different destination; resolve according to actual identity contract or reject clearly. |
| B02 | User saves five images, switches Simple to Depth while transfers are active, then saves another. | In-flight destinations remain correct; new dispatch uses new valid menu; no duplicates or lost receipts. |
| B03 | User creates folder, immediately saves into it before refresh completes. | Correct inventory/menu reconciliation; no phantom destination or false success. |
| B04 | User uploads three files, navigates Back twice and opens another bucket before completion. | Original destination pinned, current view not hijacked by late refresh, actual results visible in relevant context. |
| B05 | User opens picker in folder A, cancels, changes to B, opens picker again. | No cancelled upload created; new request targets B, not cached A. |
| B06 | User chooses duplicate filename, changes mind at conflict prompt or selects keep/skip/replace. | Actual policy honored, no silent overwrite, cancel leaves state unchanged. |
| B07 | User renames a folder or deletes an owned test file while an earlier listing is pending. | Stale listing must not resurrect item; identity checks and truthful conflicts; no unrelated mutation. |
| B08 | User previews an image, rapidly presses next/previous, then switches theme. | Correct image, stable Immersive View, no stale image actions or runaway requests. |
| B09 | User searches screen, changes date/provider filter, clears search as a late result arrives. | Latest query/filter wins, correct results, no empty-range lie or stale result. |
| B10 | User closes Shelf immediately after clicking save, reopens after worker idles. | No dependency on open UI for accepted work where contract supports it; reconciliation, no lost/duplicate receipt. |
| B11 | User reconnects after expiration, immediately opens native right-click menu. | Menu available in supported context; no repeated login prompts, correct saved destinations and auth identity. |
| B12 | User logs out or switches account while an operation is pending. | No cross-account leakage or retargeting; allowed cancellation/reconciliation, truthful status. |
| B13 | User retries after timeout but provider already committed original operation. | Reconcile operation identity before retry; no duplicate commit or false failure/success. |
| B14 | User cancels active Queue job, then dismisses completed item. | Cancellation and dismissal are different; preserve durable evidence and correct terminal state. |
| B15 | User dismisses success toast, saves again immediately, then old timer fires. | New toast not dismissed by old timer; no resurrection or duplicate notification. |
| B16 | User opens disconnected Files view, navigates to Remotes and back after 10 seconds. | Transient notice obeys scope and expiry, actual reconnect control still works. |
| B17 | User alternates screenshot and right-click saves with overlapping filenames. | Distinct operation IDs and source metadata, correct receipts, concurrency behavior, no accidental overwrite. |
| B18 | User has two buckets with identical folder hierarchy and switches repeatedly. | Account/bucket/key identities distinct in native menus, Explorer, History and cache. |
| B19 | User returns next morning after browser restart and searches a file saved yesterday. | Persistent preferences, menu, records and search remain functional; no needless setup or lost destinations. |
| B20 | User repeats ordinary save/create/rename/search/upload/delete journeys over growing archive. | Look for gradual latency drift, retained timers/listeners, memory growth, stale caches, resource exhaustion and degradation absent in short runs. |

These are examples of reasoning, not a closed checklist. Codex must invent additional plausible journeys based on inspected production code and observed state transitions. Include cases from prior regressions as well as new hypotheses. Do not assume every action is legal in every state: generator should model preconditions and explicitly exercise rejected actions in controlled cases.

## Discovery method

1. Build a small independent state model with expected inventory and hashes, menu mode/configuration, connection and destination identity, UI intent, operation identities and expected durable records. Compare implementation outcomes against this model after individual transitions and at quiescence.
2. Generate reproducible sequences with variable order, timing and initial conditions. Add deliberate scheduling barriers at dispatch, staging, final commit, verification and record persistence where existing test seams support them; do not add production backdoors. Use controlled clocks for fixture time, true elapsed time for actual soak.
3. Track coverage of meaningful transitions, interleavings, modes and outcome classes, not just lines/functions and iteration count. Report unique behavioral combinations explored, untested combinations, and where the oracle cannot establish truth.
4. Use stateful/property-based or model-based testing with recorded seed and minimal dependencies. Automatically minimize failing sequences where safe; preserve full original failure trace, then replay exact scenario and add a permanent targeted regression.
5. Investigate surprising signals even if tests pass: repeated retries, menu reconciliation churn, unexpected calls, rising latency, stale pending state, staging leftovers, inconsistent records, misleading messages or persistent resource growth. Classify actual defect vs test-harness flaw vs expected behavior. Do not silently normalize errors or relax assertions to get green.
6. Expand scenarios guided by findings: if a bug involves stale identity, probe adjacent account/bucket/mode/navigation transitions; if a bug involves timing, vary completion order, idle duration, cancellation and restart boundary. Use a holdout set of seeds after fixes to avoid overfitting the exact reproduction.
7. Keep safety controls from README mandatory. All destructive and fault-injection work is isolated; live provider use is opt-in and bounded, never randomized against personal files. Native UI evidence and live evidence are separate from fixture evidence.

## What Codex must deliver beyond pass counts

- A behavioral coverage map with user intent, initial state, sequence, predicted invariants, observed outcomes and evidence layer.
- A discovery report: hypotheses tested, unexpected behaviors, new scenarios inspired by findings, minimized reproductions, fixes and retests.
- A list of high-risk untested combinations, unsupported capabilities, unresolved ambiguity and evidence gaps.
- Distribution of scenario lengths and meaningful transitions, unique seeds, fault timing and actual run durations. Avoid inflating totals with assertions or retries.
- A concise judgment of which supported user journeys are trustworthy based on evidence and which require further work. No claim of year-long reliability from finite tests.

Success means increasingly dependable ordinary use despite varied human behavior and asynchronous system conditions, not merely reaching the test count. Coverage remains necessary, but discovery, correctness and reproducibility are the reasons the lab exists.
