# Message and floating-status audit

Baseline source: `b0d11f1b` from the immutable `/tmp/c2c-silent-before` archive. Working owner requirement: **RIGHT-CLICK SAVE WORKS, BUT TRASH DOES NOT — SIMPLE, NARROW, DEPTH.** This read-only audit does not supersede the Trash-first gate. No save, readiness, authorization, transport, registrar or confirmation logic was changed by this audit.

Evidence labels: **FACT** is an executed local observation; **SOURCE** identifies a checked mechanism; **HYPOTHESIS** requires physical correlation. Production-app browser tests below run real Chromium and IndexedDB with fixture IPC/provider responses; they are not installed Chrome native-menu or R2 evidence.

## Central source and all origin categories

**SOURCE:** `extension/app.mjs:21` owns the floating `#status` presentation. It suppresses only three text patterns (`N items`, `Ready ·`, `Saved N`); every other nonempty text can unhide it, including ordinary progress and success. `extension/app.css:47` positions it fixed, bottom-right, z-index 7. The baseline HTML starts hidden, but later status calls have no Debug guard. Baseline Settings (`renderSettings`) has no user Debug toggle. The protected developer debug host is a different permission boundary.

All calls to that central presenter on the baseline fall in the following categories. Line anchors identify baseline source, not future moving lines. Generic wrappers mean every underlying API can also enter the common failure category.

| Origin category | Baseline app.mjs anchors / owners | Examples and classification | Quiet Debug-OFF destination |
| --- | --- | --- | --- |
| API/channel/generic event errors | 46,49 `api`; 99 `listen`; 614 header/theme handlers | Transport/receiver/timeouts, typed operation failure, event exception; real failures must remain available | Relevant action's existing inline status/error, restrained badge/results; never floating |
| Recovery/data integrity | 58–81 `inspectRecovery`, restore/rebuild and private-copy flows | Blocked recovery, preservation progress/readback, restored/native-pending result | Explicit recovery card/dialog's local text; retain its deliberate confirmations and safety warnings |
| Committed configuration | 95–96 `change` | Durable configuration saved, native ACK/backup or destination-readiness warning | Existing manager Save feedback; do not imply cloud upload |
| Authentication/account/authorized setup | 112,116,120,132,156 `login`, setup finish/resume; 181 `focusShelf`; 634 authorization catch | Sign-in required/progress, connected/setup result, prepared but original click unsaved, provider denial | Remotes/setup card and one required action; no phase chatter or repeated success toast |
| Provider/explorer tree/listing | 36 `enterExplorer`; 191,208,213 tree/listing loaders; 242,247–248 navigate/loadListing | Reconnect/choose location, listing errors/previous results, item count | Existing tree/empty/listing inline error; count already filtered, not a reason to expose floating status |
| Explorer view/open/preview/context action | 226 view change; 258,262,314 opening/gallery errors; 342 context wrapper | UI/config failure, object/preview denial | Relevant file/preview/context UI; typed failure retained |
| File operations/clipboard | 349–350 Copy/Cut; 369 runFileAction; 375 cloud-save chooser | Items staged for paste/move, verified mutation, explicit save result | Existing action context/History; confirmation remains where intentionally required |
| Settings preferences/recovery/whole cloud | 591–592,600,604,606,609–611 | Preference write failure, backup readback, enable/stop job results, disconnect | Settings' local control/status, not global floating text |
| History/receipt/cancellation | 658 receipt inspection; 661 cancellation | Receipt read failure and cancelled/unconfirmed state | Existing receipt dialog/result row; distinguish uncertain from failed/verified |
| Streaming download | 666,669,672 | Preparing, per-chunk byte progress, local completion | Download-local progress/explicit result; do not emit global per-chunk box updates in normal mode |
| Depth native outcome event | 678 `depth-click-outcome` | Completed/blocked/uncertain message forwarded from Depth feedback | Durable attempt/remote receipt and quiet result/badge; Debug ON can inspect safe details |
| Shelf/provider navigation and connection events | 679–682,692 | Shelf opened/attention, connection-changed/focus, engine navigation errors | Existing relevant attention surface; do not add another popup chain |
| Remote operation event | 683–690 `remote-result` | Accepted/pending-stage chatter; completed verification; failure/uncertainty; reconciliation errors | History/result row and one final quiet failure cue. Debug ON may show bounded correlated stages |

Direct local non-floating surfaces already exist: `destination-save-status`, recovery cards, selected setup card, connection status, `remote-summary`, listing/preview errors, receipt dialog, `loading-visual-result`, and explicit Help/Diagnose. They are not the floating element. Do not globally suppress essential failures merely by hiding `#status`; route necessary action/error text to appropriate existing non-floating surfaces. A Settings Debug preference must never issue developer/debug-export grants.

## Distinct notification/badge/attention channels

| Owner | SOURCE behavior before change | Why messages can multiply | Required boundary |
| --- | --- | --- | --- |
| `background.mjs:46–49 recordRemote` → runtime `remote-result` | Every persisted transport pending/final result broadcasts safe result metadata | Accepted → progress → verified can each update app status | Preserve durable records and verification; change only presentation/rate after Trash gate |
| `src/modes/depth/native-click.mjs:createDepthFeedback` | Retains lastDepthClick; non-completed result creates per-operation Chrome notification + `!` badge; all results broadcast depth-click-outcome | A final Depth outcome can follow the transport's already verified/failure message | No technical OS notification chain in Debug OFF; quiet actual failure stays discoverable |
| `src/chrome/provider-panel.mjs:gesture/attend/notify` | User gesture may open Shelf; attend writes session attention; auto-attention disabled or unavailable late opening invokes notification + `!`; sends shelf-attention | Failed opening/provider attention and Depth feedback can both notify for one blocked intent | Preserve needed user-gesture/explicit attention; distinguish one indispensable request from low-level phase chatter |
| `background.mjs` registrar `onOutcome` | Retains lastSave and sets/clears action badge | Same operation may have remote record, Depth outcome and registrar final observation | Badge is a quiet state cue, not a verified upload receipt; do not change dispatch to reduce visible messages |
| `app.mjs:focusShelf`, shelf-attention and connection handlers | Remotes render and selected destination status refresh | Opening a needed panel can replace the current floating text again | Preserve chosen target and recovery controls; avoid repeated floating statements |

**SOURCE, not a live claim:** the attention adapter's `autoOpenAttention` preference is not Debug Mode. Disabling Debug must not silently alter authorization or the user's chosen automatic attention policy. A developer diagnostic page such as `extension/mirror.mjs` is explicitly user-opened and grant-gated; it is not evidence that ordinary Settings already exposes a Debug preference.

## Executed baseline sequence (synthetic messages)

**FACT:** `TIMING_HARNESS.mjs`, headless Chromium 156.0.8078.79, production app/CURRENT, fixture IPC and a synthetic stored receipt, observed four successive nonempty visible fixed-box texts:

| Relative sequence | Text | Baseline presentation |
| --- | --- | --- |
| 1 | Saving remotely · accepted | `hidden=false`, computed `display=block` |
| 2 | Saving remotely · transfer.upload | same visible box |
| 3 | Saved and independently verified. | same visible box |
| 4 | Depth save completed; inspect its verified remote receipt. | same visible box |

Raw timestamped MutationObserver entries are in [timing-before.json](timing-before.json). This deliberately injected sequence proves the central renderer can expose repetitive progress/final notifications. **It does not identify the owner's exact “approximately three statements”, prove an actual upload, or confirm any OS notification was physically displayed.** Native OS/Shelf delivery remains unverified under the extension installation policy.

One further **SOURCE** truthfulness risk: `renderRemotes` requests all remote history and labels every last non-readiness state except verified/uncertain as “Not saved.” A pending attempt can therefore look terminal. This is not proof it caused the owner's messages. If this quiet summary is reused for Debug-OFF errors, preserve pending/partial/blocked distinctions; do not create false “not saved” or false verified claims.

## Minimal justified next steps after the Trash gate

1. Central presentation gate: hidden by default in HTML/CSS before async preference loading; even repeated status calls cannot expose #status while Debug OFF. Turning OFF hides it immediately. Do not touch save predicates, normal delete confirmation or remote completion truth.
2. Reuse one narrow validated profile UI preference for a discoverable Settings Debug switch, default OFF. Preserve existing user config/durable outcomes and protected debug-host grants. No extra engine, remote telemetry or log database.
3. Present ordinary errors in an existing quiet action/result/attention surface; retain records/badge. Silence routine success/progress and coalesce repeated technical notifications for the same operation. A real uncertainty must remain uncertain.
4. Debug ON can inspect recent safe details at a bounded rate. Existing result/health/receipt owners already retain evidence; avoid new per-folder checks or diagnostic work on the critical click path.
5. Preserve actual save code. There is no evidence here justifying removing authorization/readiness checks, changing native ACK, rewriting queues, changing menu depth/scrolling or changing saved targets for responsiveness.

## After presentation changes and executed evidence

After the Trash fixture gate passed, checked current source at the frozen after snapshot:

- `extension/app.mjs` applies the existing new `createDebugPreference` presentation owner, default OFF, to the document immediately. Central status calls keep the box hidden while OFF and send necessary action/error context to an existing non-floating footer feedback/results control. Settings includes a bottom-positioned Debug switch and explicit safe support-report inspection. This grants no new API or cloud authority.
- `src/chrome/debug-preference.mjs` stores only validated boolean `uiDebugMode`, listens for profile storage changes, prevents late startup values from overriding a newer toggle and fails closed OFF on preference write failure. Toggle/reload/cross-document assertions are owned by the dedicated preference/UI tests, not inferred from this source summary.
- `src/modes/depth/native-click.mjs:createDepthFeedback` retains lastDepthClick, badge and outcome broadcast, and no longer calls Chrome OS notifications. Structured state/safe code accompany the existing message so presentation can distinguish pending from attention without parsing the transfer engine.
- `src/chrome/provider-panel.mjs:notify` now uses only a quiet badge; session attention and existing explicit/user-gesture Shelf opening remain. Debug ON inspection stays in app rather than re-enabling technical notification spam.
- Remotes' quiet summary now handles pending/partial/uncertain distinctly rather than labeling every nonverified result “Not saved.” No upload truth, consent or recovery behavior is rewritten by this presentation change.

**FACT:** rerunning the same synthetic four-stage message sequence against actual production app/IDB with fixture IPC yielded **zero visible #status observations** while Debug OFF. Raw entries are in [timing-after.json](timing-after.json), with source hashes in [timing-provenance.json](timing-provenance.json). This is observed DOM/computed-style invisibility in headless Chromium, not actual installed Chrome/R2 operation or physical OS delivery. The same verified synthetic receipt inspection still runs; the test does not manufacture positive real-cloud evidence.

**SOURCE:** the two notification owners have no `notifications.create` call after the change. Tests asserting zero adapter notification calls do not independently establish every Windows OS surface, so the physical silence check remains UNVERIFIED until an authorized installed run. No native save/reconcile/readiness optimization was performed: removing presentation spam is not evidence that network completion became faster.


Dedicated Debug UI evidence now reports **11/11 checks PASS**, **1,524 visibility samples and zero OFF violations**; raw [debug-ui-source.json](debug-ui-source.json) and [quiet inline-failure screenshot](debug-off-inline-feedback.png). Unlike the timing harness, that test actually toggles/persists the presentation preference, checks late events/reload/cross-document updates and failed enable/disable writes, and confirms the existing debug grant remains denied. It still uses fake storage/provider/lifecycle boundaries and does not establish live native saving or Windows notification delivery. The untouched save pipeline is a separate regression gate.

Final test-only addition: the dedicated Debug browser fixture also exercised the quiet footer at 320px with blocked/uncertain outcomes, both action buttons inside the viewport and keyboard navigation retained. This passed without any CSS/source change; screenshot: [320px quiet feedback](debug-off-320px-feedback.png). Native/R2 evidence status is unchanged.

Explicit History/receipt/advanced diagnostic inspection remains available independently of Debug Mode. OFF hides automatic floating status and the Settings Debug section; it does not remove deliberately requested receipt/operation evidence or revoke protected debug grants. The ordinary passive path has no floating box or technical OS notification chain.
