# ReDown public alpha — skills, requirements and acceptance checklist
Roadmap reference — 2026-11-26. Companion to STAGE_CODEX_REQUEST.md and ALPHA_MASTER_EXECUTION_ROADMAP.md. This is a cross-branch planning checklist, not authorization to expand Part 3 or change its prerequisite gates.

## Product scope
One feature. Four clouds. Right-click, Save, Done. Google Drive, OneDrive, Dropbox and Cloudflare R2, with $12/year proposed unlimited ReDown usage (provider limits still apply). Keep the Python Laboratory internal. Defer generic S3 and nonessential customer-facing functionality.

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
- [ ] Default redown folder with optional direct-to-drive mode.
### Transfer reliability
- [ ] Automatic safe retries for temporary provider failures.
- [ ] Recover from network interruptions.
- [ ] Prevent duplicate publications and unsafe overwrites.
- [ ] Verify every successful save.
- [ ] Continue processing after individual failures.
- [ ] Support low local disk space.
### Authentication
- [ ] Simple initial login.
- [ ] Automatic token refresh where supported.
- [ ] Detect expired authorization.
- [ ] One-click reconnection when user authorization is needed.
- [ ] Preserve settings and destinations after reconnection.
### Commercial infrastructure
- [ ] Cloud-backed free allowance persistence.
- [ ] Prevent ordinary reinstall abuse, without deceptive storage or privacy violations.
- [ ] Reliable $12/year license activation.
- [ ] Restore paid licenses after reinstalling.
- [ ] Prevent duplicate usage deductions.
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
| 555 live R2 uploads | 554/555 confirmed |
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

## Deliberately postpone from public alpha
Generic S3, advanced explorer functionality, Screenshot to Cloud expansion, extra animations, cloud-to-cloud transfers, mobile applications, desktop expansion, aggressive concurrency optimization. Retain existing development work; do not delete working features simply because they are not alpha requirements.

## Original proposed Codex execution list (historical planning reference)
1. Automatic recovery, receipts and interruption handling.
2. Cloud usage continuity and save destination selection.
3. Right-click reliability and authentication audit.
4. Multi-provider Laboratory integration.
5. Live acceptance testing across all four providers.
6. Commercial licensing and public alpha packaging.
7. Final regression and release audit.

The companion master roadmap refines this order and adds Part 3 and Onyx. Each session should have a focused specification, reproducible scripts, durable receipts and a bounded execution window. The objective is dependable service for the first 1,000 paying customers, as a foundation for broader adoption; no adoption or release guarantees.
