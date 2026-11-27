# ReDown commercial V1 — skills, requirements and acceptance checklist
November 26, 2026. Subordinate to ALPHA_MASTER_EXECUTION_ROADMAP.md (authoritative sequence) and active Run 2/3 requests. STAGE_CODEX_REQUEST.md is the Media & Manifest annex of unified Run 3. Historical stage numbering, default-folder/Lab exclusions, prohibition on current Run 2, and fixed 0.3.31 version are superseded. This checklist does not waive inherited gates or authorize independent branch execution.

## Product scope
Four clouds. Right-click, Capture, Hold + Click, Save, Done. Google Drive, OneDrive, Dropbox and Cloudflare R2, with $12/year proposed unlimited ReDown usage (provider limits still apply) and one-time lifetime 30 general saves + four 10-save feature bonuses (right-click, screenshot, chord-click, manual upload) for basic clouds collectively (Google Drive/OneDrive/Dropbox), and the same allowance for Cloudflare R2 separately; up to 70 per group, 140 total, no recurring reset. Manual uploads/retrieval, direct screenshots and multiple editable chord-to-destination bindings on all four providers are mandatory V1. Preserve the default redown folder with opt-out, explicit destinations and R2 bucket/prefix behavior. Keep the Python Laboratory internal. Defer generic S3, auto-rerouting and nonessential expansion.

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
- [ ] Default redown folder with optional direct-to-drive mode; automatic same-account original-destination fallback on any redown resolution/creation failure, no popup/toast/confirmation or separate warning, actual destination recorded in receipts, no duplicate writes. Test denied, timed-out, conflicting and uncertain folder creation across all three basic providers. No new arbitrary directory creation for basic-cloud shortcuts in V1.
- [ ] First save starts at authorized original location while redown lookup/creation is still pending; only new jobs switch to verified redown, no notification or movement of earlier saves.
- [ ] Basic-cloud local-folder upload is flat: recursive local discovery, no nested cloud creation, safe automatic filename suffixes, no overwrites, stable per-child mapping and fixed batch destination after possible publication. R2 hierarchy and existing remote download hierarchy preserved. Test name races, same basename/different bytes, same bytes/different files and partial failure; independently verify mapped copies.
### Screenshot and chord-click reliability (mandatory V1)
- [ ] Actual Screenshot to Cloud verified on all four providers, multiple editable screenshot routes and shared Shortcut API with held-click/Explorer/shelf actions.
- [ ] Show existing assignment; Override or change its keys; one Save updates both settings; Cancel preserves both. No ambiguous dispatch, failed edit preserves working settings, release all and explicit defaults restoration.
- [ ] Actual held two-/three-key chord + click verified on all four providers.
- [ ] Multiple independently editable chord bindings; redown, legacy/root, custom folder, account default and R2 bucket/prefix modes as applicable.
- [ ] Exact destination, no duplicate or overlapping chord dispatch, ordinary clicks unaffected, no hardcoded immutable binding, no unnecessary prompts.
- [ ] Shared capture/source, destination, admission, accounting and verified completion contracts; no independent engine.
- [ ] Provider-specific outage containment; healthy providers remain usable without silent redirection.
- [ ] Media & Manifest annex verified using canonical versioned configuration and authorized reads.
### Transfer reliability
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
- [ ] One-time lifetime trial: 30 general plus 10 right-click, 10 screenshot, 10 chord-click and 10 manual-upload credits for basic clouds collectively, and the same five pools for R2 separately (70 each/140 total). Matching bonus first, then same-group general; one verified file = one credit including folder children. No double debit or borrowing across groups/features; no day/month/year reset; disclosed cloud-backed persistence across supported providers, no false promise of unrelated-account identity enforcement.
- [ ] Prevent ordinary reinstall abuse, without deceptive storage or privacy violations. Implement actual versioned JSON replicas using native application storage or disclosed authorized existing-folder/original-location fallback; no dependence on redown creation. Verify tamper/rollback/deletion/conflict and replica outage recovery; no new free entitlement from missing records, no blocking a valid accounted save merely because replica sync is pending. Read known authorized locations on connect/reinstall; no whole-cloud scan, opaque disclosed record ID, no size-based counters or scattered markers. Resolve policy and authority limits before public release.
- [ ] Reliable $12/year license activation.
- [ ] Restore paid licenses after reinstalling.
- [ ] Prevent duplicate usage deductions; failed/cancelled-before-publication operations, reads, previews and paid operations do not consume trial credits; retries reuse reservation. Test all ten pools, 9/10/11 and 29/30/31 boundaries, spillover and independent exhaustion, 70/140 totals, and one clear choice before publishing an over-budget batch. Legacy migration and first enrollment policy remain approval gates.
### Testing and diagnostics
- [ ] Automatic JSON receipts.
- [ ] Preserve evidence after logout, expiration or crashes (recover durable records on restart).
- [ ] Extend Python Laboratory to all four providers.
- [ ] Automated lifecycle and regression testing.
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
Generic S3, automatic download rerouting, advanced explorer functionality, extra animations, cloud-to-cloud transfers, mobile applications, desktop expansion, aggressive concurrency optimization. Four-provider screenshots and configurable chord-click are mandatory V1, not deferred features. Retain existing development work; no deletion of working features.

## Original proposed Codex execution list (historical planning reference)
1. Automatic recovery, receipts and interruption handling.
2. Cloud usage continuity and save destination selection.
3. Right-click reliability and authentication audit.
4. Multi-provider Laboratory integration.
5. Live acceptance testing across all four providers.
6. Commercial licensing and public alpha packaging.
7. Final regression and release audit.

The authoritative master roadmap supersedes this historical list, defines current Run 2 and unified Run 3, and preserves Onyx as separate final work. Start from the approved 0.3.32.4 candidate or explicitly approved descendant; no historical downgrade. Each session should have a focused specification, reproducible scripts, durable receipts and a bounded execution window. The objective is dependable service for the first 1,000 paying customers, as a foundation for broader adoption; no adoption or release guarantees.
