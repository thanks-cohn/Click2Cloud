# ReDown commercial V1 — skills, requirements and acceptance checklist
November 26, 2026. Subordinate to ALPHA_MASTER_EXECUTION_ROADMAP.md (authoritative sequence) and active Run 2/3 requests. STAGE_CODEX_REQUEST.md is the Media & Manifest annex of unified Run 3. Historical stage numbering, default-folder/Lab exclusions, prohibition on current Run 2, and fixed 0.3.31 version are superseded. This checklist does not waive inherited gates or authorize independent branch execution.

## Product scope
Four clouds. Right-click, Capture, Hold + Click, Save, Done. Google Drive, OneDrive, Dropbox and Cloudflare R2, with $12/year proposed unlimited ReDown usage (provider limits still apply) and monthly 10 general saves + four 10-save feature bonuses (right-click, screenshot, chord-click, manual upload) for basic clouds collectively (Google Drive/OneDrive/Dropbox), and the same allowance for Cloudflare R2 separately; up to 50 per group, 100 per enrollment month, no carryover. Manual uploads/retrieval, direct screenshots and multiple editable chord-to-destination bindings on all four providers are mandatory V1. Preserve the default redown folder with opt-out, explicit destinations and R2 bucket/prefix behavior. Keep the Python Laboratory internal. Defer generic S3, auto-rerouting and nonessential expansion.

## P0 — essential functionality
### Right-click reliability
- [ ] Menu always appears after login.
- [ ] Menu survives browser restarts, updates and MV3 service worker suspension.
- [ ] Save Here works at every intended folder level.
- [ ] No routine manual repair or refresh required.
### Cloud compatibility
- [ ] Google Drive: verified saving and authentication.
- [ ] OneDrive: verified saving and authentication.
- [ ] Dropbox: verified saving and authentication.
- [ ] Cloudflare R2: complete automatic error recovery.
- [ ] Always prepare standard redown in both destination modes, with optional direct-to-drive routing; automatic same-account original-destination fallback on any redown resolution/creation failure, no popup/toast/confirmation or separate warning, actual destination recorded in receipts, no duplicate writes. Test denied, timed-out, conflicting and uncertain folder creation across all three basic providers. No new arbitrary directory creation for basic-cloud shortcuts in V1.
- [ ] First save starts at authorized original location while redown lookup/creation is still pending; only new jobs whose resolved intent selects redown switch to verified redown, no notification or movement of earlier saves.
- [ ] Basic-cloud local-folder upload is flat: recursive local discovery, no nested cloud creation, safe automatic filename suffixes, no overwrites, stable per-child mapping and fixed batch destination after possible publication. R2 hierarchy and existing remote download hierarchy preserved. Test name races, same basename/different bytes, same bytes/different files and partial failure; independently verify mapped copies.
### Screenshot and chord-click reliability (mandatory V1)
- [ ] Actual Screenshot to Cloud verified on all four providers, multiple editable screenshot routes and shared Shortcut API with held-click/Explorer/shelf actions.
- [ ] Agent-native shortcut contracts reuse production recognition, registry, validation and dispatch; focused/seeded pairwise and targeted stateful campaigns cover existing bindings, conflicts, invalid input, lifecycle, faults, permission and destination/usage invariants. Independent expected/actual assertions, bounded redacted receipts, reproducible seeds and fast/extended/replay commands. Codex executes affordable suites and packaged browser regressions before ready handoff; real browser input/capture/provider evidence distinct from fixtures. Owner performs necessary environment/live gates, not first-line debugging. No production test bypass or keylogging.
- [ ] Show existing assignment; Override or change its keys; one Save updates both settings; Cancel preserves both. No ambiguous dispatch, failed edit preserves working settings, release all configurable assignments and explicit defaults restoration; fixed/browser-owned controls are protected.
- [ ] Actual held two-/three-key chord + click verified on all four providers.
- [ ] Separate Screenshots page and Shortcuts tab; all screenshot configuration on Screenshots, no duplicate rows. Multiple independently editable screenshot/chord bindings; exactly ReDown folder / Account default for all three basic clouds, existing R2 bucket/prefix controls. Preserve legacy explicit targets without silent migration and unrelated manual/Save Here destinations.
- [ ] Shared filtered shortcut availability; cross-page conflict handling; verify actual browser-managed assignment. Seven approved default releases, protected selection/navigation/editing controls, Cut removed while Copy/Paste/Move and admitted-job recovery remain. Restore Defaults cannot reinstate released keys. See the required owner UX references.
- [ ] Exact destination, no duplicate or overlapping chord dispatch, ordinary clicks unaffected, no hardcoded immutable binding, no unnecessary prompts.
- [ ] Shared capture/source, destination, admission, accounting and verified completion contracts; no independent engine.
- [ ] Provider-specific outage containment; healthy providers remain usable without silent redirection.
- [ ] Media & Manifest annex verified using canonical versioned configuration and authorized reads.
### Transfer reliability
- [ ] Resolve inherited MemoryError and TRANSPORT_UNAVAILABLE with reproducible focused faults and resource evidence; reconstruct/check historic receipts without changing the frozen manifest, separate integrity/location/retained-restart/performance verdicts; required owner gates remain pending until evidenced.
- [ ] Automatic safe retries for temporary provider failures.
- [ ] Recover from network interruptions.
- [ ] Prevent duplicate publications and unsafe overwrites.
- [ ] Verify every successful save.
- [ ] Continue processing after individual failures; ready accounts do not wait on unrelated initialization, capture, UI, thumbnails, media, manifest or metadata sync. Test each fault independently. Source unavailable: actionable Retry/Recapture without false success. Media loading may wait for transfer resources; bounded buffers and prompt cleanup.
- [ ] Support low local disk space.
### Authentication
- [ ] Simple initial login.
- [ ] Automatic token refresh where supported.
- [ ] Detect expired authorization.
- [ ] One-click reconnection when user authorization is needed.
- [ ] Preserve settings and destinations after reconnection.
### Commercial infrastructure
- [ ] Monthly free tier: 10 general plus 10 right-click, 10 screenshot, 10 chord-click and 10 manual-upload credits for basic clouds collectively, and the same five pools for R2 separately (50 each/100 per month). Matching bonus first, then same-group general; one verified file = one credit including folder children. No double debit or borrowing across groups/features; exactly one validated enrollment-anniversary renewal, no carryover or clock-change reset, no reset on reinstall with surviving enrollment evidence, approved new enrollment after conclusive evidence-free reinstall; disclosed cloud-backed persistence across supported providers, no false promise of unrelated-account identity enforcement.
- [ ] rdata.txt continuity per RDATA_CONTINUITY_SPECIFICATION.md: fixed symbolic pool state, distinct inside/outside replicas on eligible clouds; Google Drive appDataFolder only if already independently authorized (not required for Alpha), local anchor, bounded independent sync, no folder prerequisite, no unrelated file overwrite, disclosed purpose; versioned generic starter message projection (owner may replace later) and permanent footer, no decorative text authority. Test crash-safe local settlement, newest valid compatible cloud recovery, conservative lowest remaining per pool for genuine comparable conflicts, no stale-period debit, no new consumer charges/badge/History/animation/rules from internal operations; recovery and renewal may update allowance; earliest validated same-entitlement anchor, stale versus divergent revisions, deduplicated reservations, free remote Explorer management versus charged external uploads, owned metadata excluded from Lab workloads and Screenshot Manifest, bounded coalesced sync, template version changes, deletion, corruption, rollback, conflicts, all-absent reinstall versus unknown checks, local-only continuity, short-month anniversary and explicit removal. Ordinary deterrence accepted; no strict global enforcement claim.
- [ ] First-visit ReDown-only allowance sticky: two groups, ten slim progress bars, accurate counts from shared state; persist user minimize, never auto-reopen, compact button only after confirmed full exhaustion, hide after verified paid activation, restore on expiry; show next renewal date and restore current-period credits at validated renewal without re-expanding a user-minimized sticky. No UI failure, stale state, pending reservation, unavailable provider or checkout flow blocks authorized saves/retrieval. Verify actual packaged UI, keyboard and compact layout.
- [ ] Reliable $12/year license activation.
- [ ] Restore paid licenses after reinstalling.
- [ ] Prevent duplicate usage deductions; failed/cancelled-before-publication operations, reads, previews and paid operations do not consume trial credits; retries reuse reservation. Test all ten pools, 9/10/11 boundaries, spillover and independent exhaustion, 50/100 monthly totals, period renewal, stale copies, cross-period retries and late confirmations, and one clear choice before publishing an over-budget batch. First enrollment/all-absent policy approved; inspect actual different pre-release legacy scheme if present. Preserve paid and valid current-policy state.
### Testing and diagnostics
- [ ] Automatic JSON receipts.
- [ ] Preserve evidence after logout, expiration or crashes (recover durable records on restart).
- [ ] Extend Python Laboratory to all four providers.
- [ ] Application-wide action coverage matrix and actual shared production equivalents for every meaningful supported action, affordable seeded campaigns plus browser checks, independent bytes/state/receipt/accounting assertions, reusable failure replay and permanent regressions. Codex performs affordable diagnosis/repair/retest; owner performs necessary environment/live acceptance and optional stress campaigns. No simulated pass substituted for browser/provider evidence.
- [ ] Separate development tools from the public alpha interface.

## Engineering competencies
| Skill | Importance |
|---|---|
| Chrome Manifest V3 lifecycle management | Critical |
| Context menu architecture | Critical |
| OAuth and token management | Critical |
| Cloud provider API integration | Critical |
| Idempotent transfer operations | Critical |
| Automatic retry and recovery | Critical |
| Durable local and cloud state | Critical |
| Concurrent operation management | High |
| Automated fault injection | Critical |
| Python acceptance testing | High |
| Privacy and permission management | Critical |
| Payment and license management | Critical |
| Chrome Web Store compliance | Critical |
| Accessible, intuitive UX design | High |
| Automated release verification | High |

## ASAP acceptance targets
| Test | Current evidence |
|---|---|
| Live R2 upload/readback | 578/578 uploaded and 578 independent SHA-256 matches; historical workload FAIL and location audit FAIL; retained restart verification pending |
| 555 uploads with injected failure recovery | Pending |
| 1,000 right-click saves | Needs formal verification |
| 1,000 Google Drive saves | Pending |
| 1,000 OneDrive saves | Pending |
| 1,000 Dropbox saves | Pending |
| 100 login/reconnection cycles | Pending |
| 100 browser restart cycles | Pending |
| 100 uninstall/reinstall allowance tests | Pending |
| 24-hour sustained operation | Pending |
| Seven-day lifecycle simulation | Pending |
| Paid license recovery | Pending |

Targets are proposed, not proven results or unconditional live execution instructions. Use authorized QA destinations, synthetic benign files, bounded budgets and truthful distinctions between fixture and live evidence. No real payment or provider mutations without authorization.

## Current progress (discussion/evidence snapshot, not a repository-wide audit)
| System | State |
|---|---|
| Core right-click functionality | Existing |
| Cloudflare transfer engine | Live tested |
| Basic cloud integrations | Needs validation |
| Python Laboratory | Operational |
| Durable receipts | Operational |
| Automatic transient recovery | Specified |
| Cloud usage continuity | Specified |
| Default redown folder | Specified |
| Commercial licensing | Needs validation |
| Public alpha packaging | Pending |

## Deliberately postpone from V1
Generic S3, automatic download rerouting, advanced explorer functionality, extra animations, cloud-to-cloud transfers, mobile applications, desktop expansion, aggressive concurrency optimization. Four-provider screenshots and configurable chord-click are mandatory V1, not deferred features. Retain existing development work except the explicitly owner-approved cloud-file Cut removal and seven default releases; preserve other underlying functionality.

## Execution order
Follow the current master roadmap and Part 2 execution index on the authorized continuation branch; no separate checklist execution sequence. Preserve Onyx as separate final work only if expressly authorized. The objective is dependable service, not an adoption or uptime guarantee.

- [ ] Chrome-first shortcut qualification per SHORTCUTS_TAB_SPECIFICATION.md: official docs, four suggested defaults, useful proven additional manual commands only (16 optional isolated probe), actual getAll/command delivery, supported scoped held-click/local handlers, protected/reserved input, actual registration and capture permission/rate/tab identity, scope/layout/restart/update/conflicts; separate synthetic and actual browser evidence. No unsupported API or scope/permission bypass; no fixed slot-count gate.

- [ ] Screenshot original context validated before/after capture; tab/window/navigation changes, switch-away-and-back and uncertain bytes discarded before publication; exactly one actionable failure notification/recapture request, no forced UI opening, no wrong-tab auto-capture, no unintended write, no credit deduction or success feedback. Normal silent redown fallback unchanged.
- [ ] Freeze admission entitlement classification across retry/late settlement; paid expiry does not charge admitted paid files, premium activation does not erase admitted free reservations, downloads and existing remote management remain free. Verify ordinary production evidence separately from independent Lab reopened SHA-256/count/path verification; no mandatory full readback for ordinary saves. Account default binding follows selected resolver and rules; original-cloud opt-out retains legacy default; only resolved redown jobs switch. Older reference docs subordinate to frozen active requirements.


**Permanent customer-journey regression:** inherit the active Part 2 cross-stage table and contextual shortcut specification, including isolated first-use Simple/Narrow/Depth without Depth prerequisite, existing background scheduler durability, source/retry, cancellation/uncertainty, cross-version jobs and reservations, valid local accounting under optional failures, Silent/Normal, per-domain identical chord different destinations, specificity, real permission/revocation and closed/unfocused Shelf input. Record actual supported browser/capture/provider evidence independently, rerun relevant inherited cases at every checkpoint and the full applicable matrix at 2G and Part 3. No new testing framework or relaxation of existing gates.


**MANDATORY VISION-FIRST READING:** After verifying the authorized checkout and reading AGENTS.md, read in full `docs/engineering-vision/PERMANENT_ENGINEERING_VISION.md`, `docs/engineering-vision/CUSTOMER_EXPERIENCE_VISION.md`, then `docs/engineering-vision/README.md`, before interpreting the execution index or any implementation request. Understand the desired customer journey and decided architecture; apply them to every ordinary engineering decision. Do not spend a session researching alternative architectures. The active index still assigns scope and the latest explicit owner product decisions remain authoritative.

**Contextual shortcut completeness gate:** Follow `11.25.2026/SHORTCUTS_TAB_SPECIFICATION.md`, especially the source-reviewed implementation completeness contract. 2D must deliver working scoped registry/migration, actual site-registration and revocation lifecycle, trusted sender/resolver/dispatcher and real packaged browser input proof, not just types or mocked handlers. Part 3 delivers the complete settings-to-verified-save vertical slice with the same chord on distinct enabled domains across all four providers and different R2 prefixes, Shelf closed/open-unfocused, persisted edits, recovery, conflict/negative cases and actual supported browser/authorized provider evidence. Distinguish explicit site opt-in from the existing broad manifest grants; do not promise a new Chrome prompt or selected-site-only extension permission isolation. Preserve current commands and screenshot capture permissions; no speculative command slots, duplicate engine or silent downgrade. No half-implemented contextual workflow qualifies for public Alpha.


**Latest owner acceptance:** Google Drive drive.file only, My Drive/ReDown new save targets, authorized retrieval only. Preserve healthy compatible Workers across updates, no digest-only redeploy; independently ready Simple/Narrow/Depth; crash recovery does not block unrelated eligible work; immutable account identity and thin provider adapters; bounded rolling local retention with configurable settings and protected unresolved claims. Follow active Part 2 owner decisions and inherited Part 3 regression. No new framework, scope or phase.
