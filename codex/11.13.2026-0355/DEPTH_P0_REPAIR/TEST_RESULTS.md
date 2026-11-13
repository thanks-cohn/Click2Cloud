# Test results and evidence classes

Baseline archive: 2904ff9bb1f28b82986a0f8022d38d970c014d3a. Tests use pinned existing dependencies; no new packages or locks. Final exact totals and runner output are retained in EVIDENCE/*.log.

| Check | Baseline | Final / meaning |
| --- | --- | --- |
| Focused suite | 319/319 | 319/319; final-focused.log |
| Full offline | 370/371; historical Simple golden mismatch | 387/388; final-full.log; same mismatch retained |
| New Depth click tests | reproducer disables wrapper and proves zero-write FRESH_CLICK_REQUIRED | 17/17 |
| Existing Depth projection and noninterference | prior passing matrix | combined suite retains 384 matrix cases / 192 non-Depth byte-identical hashes |
| Module tests | unchanged implementation | 49/49 |
| Build | same ID/version | PASS; exact digest in build.json |
| Actual Chromium IDB/production UI | no prior Depth-click kind | PASS: blocked record persisted/reloaded, shown without fake receipt controls |
| Installed native Chrome | blocked before | still administrator-blocked; native/real R2 U |

## Required matrix coverage, including limitations
| Scenario | Generated / ACK | Click + authorization/status | Exact destination / remote evidence | Feedback |
| --- | --- | --- | --- | --- |
| Root, Images branch Save here, Artwork leaf | production plan; async mock ACK | emitted onClicked; fresh READY; original engine/auth rechecks | bucket root, Images/, Images/Artwork/; injected remote boundary only | completed attempt + related remote ID |
| 0/1/2/4 buckets, hidden/show, depth 1/4/5/10, same names | prior 384 cases and plan generation pass | route resolver assertions; no new live clicks | 888 original target/action/item identities retained by unchanged compiler | not live observed |
| Twenty siblings / fourteen-level path / selected depth 30 | full plan + mock ACK, no caps | emitted deep leaf passes | exact 14-level target passed to injected boundary | recorded |
| Ready vs PREPARED / missing / network / scope rejection | attention row preserved | unready blocks before engine; READY refreshes exact observation | no upload for blocked readiness | specific code, PLAN_MISSING when applicable |
| Pending / account / bucket / protocol mismatch | read-only discriminator controls | each safe plan reason asserted | no borrowing/provisioning | classified metadata |
| Native root/parent/leaf create failure, remove failure, timeout | runtime.lastError timing and callback uncertainty injected | complete ACK remains absent; zero uploads | blocked, not remote failure | durable attempt |
| Cold worker / persisted row / stale ACK | persisted metadata classifies only | no current ACK, no dispatch | blocked | wrapper invoked; physical restart U |
| Auth loss / hostile throw / storage failure | original protection retained | no upload on prerequisite loss | no token/URL leakage; failed record is explicit | attempted callback; physical delivery U |
| Uncertain / partial transfer | callback-level state returned unchanged | one dispatch; no automatic retry | remote ID correlated, no fabricated receipt | uncertain/partial retained |
| New folder / retry / discovery pages | original Depth tests retained | old suite covers retry/refresh/stale configs | real new folder/R2 U | old and new evidence distinct |
| Image/link/page/audio/video and permission combinations | existing resolver tests; new emitted harness uses link | full cross-product NOT run live | physical context behavior U | errors classified only where exercised |
| Save Results open/closed | production browser fixture can reopen/reload history | history presentation does not dispatch or inspect fabricated receipt | IDB persistence real, provider/IPC fake | PASS local UI; concurrent live save while open U |
| Verifier/history faults and safe repeated clicks | existing engine/transport tests; new wrapper uncertainty/storage tests | no universal replay added | real verifier/readback U | never changes uncertain to saved |
| Non-Depth | original handler body retained, 192 hashes byte-identical | new Simple control records no Depth preflight/feedback | no unrelated implementation edits | unchanged normal path |

No native screenshot, notification-open confirmation, real Chrome ACK timing, production Worker acceptance or R2 readback is claimed. The new remote boundary reports fixture verification; it is explicitly not a physical receipt. Root/intermediate/leaf logical expected keys are probe.txt, Images/probe.txt and Images/Artwork/probe.txt. The actual user incident's key is unknown.

Final combined Depth/scoring/registry suite: 40/40. Native smoke runner exit 2 means administrator-blocked, not PASS. Full-suite exit 1 is the retained baseline golden mismatch, not a successful full-suite result. New Depth-only tests exercise 17 cases; the 40-case combined count also includes prior suites.
