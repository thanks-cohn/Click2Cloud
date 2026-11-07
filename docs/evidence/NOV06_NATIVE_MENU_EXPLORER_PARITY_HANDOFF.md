# November 6 native-menu and Explorer implementation handoff

**PARTIAL — local implementation verified; installed Chrome and live Worker→R2 acceptance remain blocked/unverified.** Working branch: `dev/nov06-native-menu-explorer-parity`, based on latest main `eb5ee8bce185be21c1aa88a17a1ea06bd38884dc`. Code is committed locally; no merge, push, publication or deployment was performed. Extension/package build is 0.3.3, API3+1.1, remote protocol2; extension ID/key/OAuth callback are preserved.

The environment initially had no usable executor; this engineering window began after recovery. See `nov06-parity/verification.json` for measured elapsed time, final source digest, commands and checks. The saved repository configuration was read and left unchanged: Click2Cloud and REDOWN were already present, so no clone/removal was needed and no authentication retries were necessary. REDOWN remains on its existing clean branch at `a6c17f8d0be22131d5cc38b060da4f8f3544800f`; no checkout, source edit, commit or cloud operation was made there.

## Coherent implementation commits

- `906c7b22a736b534363fd291e4b6da916e051ad0` — Align native provider menus with Nov 6 assignment and login rules
- `e68a51ad40604ffa0afa4c6439a8b5998e393492` — Use Node 22 compatible test invocation in CI
- `aba4ff52a61ffaa17f67081e1a65ebaa6a042aee` — Keep Explorer responsive with cached ordering, windowed rows and concurrent reads
- `68ca4d0d0159f9b3ad2f651ab0af95938c55a8a0` — Identify repair build as 0.3.3 and clamp stale viewport offsets
- `4740416c0d0f0f4fbb389912a11e8bf13659bdf9` — Bound text preview DOM work without limiting file downloads
- `43def9b7f6c208fda528e270d8727a1f54c4cb94` — Keep explicit Flat default independent of inactive mode visibility
- `731ad164702cebde6dc2569e080fc77f94ef2314` — Bind programmatic provider actions to account scope before dispatch

The evidence-only commit containing this handoff follows these implementation commits. Exact final SHA is in Git history and the assistant handoff; it cannot be embedded self-referentially in its own commit.

A final account-scope regression also binds a programmatic provider action to its sole exact canonical target before reservation/dispatch, even when no global default exists; a foreign-account grant cannot send the save. Default-clear and derived-default configuration bindings remain checked.

## Actual before → after behavior

- **Native menu:** composite mode emitted a provider-action Cloudflare R2 row and additional Cloudflare/REDOWN structures. It now has one canonical provider ID: 0 active targets is a clickable provider action, 1 is a direct exact-target save, 2+ is one Cloudflare parent with distinct direct target children. The implicit initial default precedes newly assigned extras. Discovered buckets do not contribute. Mode duplicates are deduplicated; inactive/hidden custom assignments do not inflate count. Explicit Flat uses its default independently of hidden inactive modes. Configs, aliases and independent mode projections remain stored; November6 canonical native presentation takes precedence over old composite hierarchy assertions.
- **Exact target and removal:** deleting the last representation of the selected default assignment persists a sole active survivor as the new default, or null with removal marker if ambiguous/empty. Temporary availability failures never mutate assignments/defaults or recreate a bucket. Removing one mode's projection does not erase another mode's data. Default clearing remains a separate explicit command.
- **Visibility and Quick:** all four Settings toggles retain account/config data while hiding the complete provider branch. Restoring visibility restores the assigned shape. Quick shortcuts are explicit additional actions, not extra provider owners; a shortcut named Cloudflare is disambiguated as Quick: Cloudflare. A sole-target shortcut is absorbed by the canonical direct save. Future trusted flat-provider contributors replace their own canonical row rather than adding duplicate provider labels; no future adapter implementation is claimed.
- **Ready routing/startup:** native click uses registrar ACK and engine.save with exact current target, without the provider/onboarding dashboard route. Authorization no longer scans every configured/discovered destination. Startup compilation uses readiness observations instead of remote probes over all folders; write-time checks remain authoritative. Invalid/evicted generations are refused before scanning authorization. The toolbar remains independent of provider network calls. App startup failures expose Retry and preserve storage.
- **Unready/disconnected routing:** selected-provider compact `connect.html` popup is a client of the existing versioned API and OAuth owner. No automatic login or bucket creation on a native disconnected click; the card requires Sign in, then separate setup approval. Returning zero-active-target users go to existing Manage Destinations, including a hidden/inactive stored default. Explicit `openCloudflareDestinations` API opens the same manager. Ready clicks never enter this popup. Unimplemented providers show honest disabled availability, never fake OAuth/uploads.
- **Explorer:** cache sorted entries by listing/sort revision using one collator and key/index map; selection touches only changed attributes in visible rows. Fixed-height details/list rows render a viewport plus overscan, with logical head/tail spacers and no directory-count ceiling. Per-row listeners are replaced by delegation. End/Home/arrows, Ctrl/Shift selection, right-click preservation and Escape/context focus work without full-list sorts or selection-triggered network reads.
- **Navigation/data:** update navigation epoch before asynchronous API acknowledgement; ignore stale navigation/listing/preview completions. Cache bounded pages by exact location, coalesce pending reads and invalidate on Refresh, verified save and observed auth/account changes. Backend File API coalesces concurrent metadata reads only within a current session; it shares neither streams nor writes and rejects stale-session completion. Inspect reads no longer hold the configuration queue. Repeated Refresh while loading is ignored. Paging deduplicates keys and preserves selection/scroll. Tree expansion, keyboard travel, more-folder paging and completed-list pruning keep source identities and visible children consistent. Disconnect clears displayed/cache state without deleting configuration. Underlying IPC/provider fetch cancellation is not implemented; stale results are ignored and requests retain existing time bounds.
- **Context/preview:** supported Open, Preview and streaming Download remain API-backed. Unsupported Copy/Move/Rename/Delete/New Folder/Paste are disabled with a read-only capability explanation; no fake no-op success. Private Explorer→R2 has no authorized remote source and is disabled truthfully. Async previews fence stale completions and revoke object URLs; text DOM rendering is limited to a disclosed 512KiB preview slice, separate from full-file Download. Small control/preview/cache/viewport budgets are resource protections, not transfer/file-count limits.

## Native compliance matrix

These are production compiler/resolver/registrar tests and model artifacts, **not native rendered-menu proof**. See `nov06-parity/native-menu-matrix.json` and `tests/nov06-native-menu.test.mjs`.

| Scenario | Implemented canonical state | Evidence / external gate |
| --- | --- | --- |
| New install / no account / zero buckets | Google Drive, Dropbox, OneDrive, Cloudflare; four clickable flat entries | source + tests PASS; installed BLOCKED |
| Approved initial redown reuse/create | redown root prefix empty; one flat direct Cloudflare | existing setup/readback tests PASS locally; live NOT TESTED |
| Another bucket merely discovered | tree unchanged | compiler fixture PASS |
| Second/third assignment | one Cloudflare submenu; exact distinct active children | compiler + registrar tests PASS |
| Remove redown; Photos survives | persisted sole default Photos; flat Cloudflare → Photos | API mutation + routing tests PASS |
| Remove extras, leaving redown | flat exact redown target | transition tests PASS |
| Remove all after setup / hide all assignments | flat Cloudflare → Manage Destinations, no recreation | onboarding tests PASS; native click live BLOCKED |
| Google Drive OFF / Dropbox OFF / OneDrive OFF | selected provider completely absent; others retained | each toggle and restore PASS locally |
| Cloudflare OFF | no Cloudflare descendant or shortcut; targets retained | toggle and restore PASS locally |
| Hidden/disabled mode or duplicate mode target | no phantom increase in destination count | native tests PASS |
| Explicit Flat with hidden inactive mode | sole explicit default retained without changing hidden config | regression PASS |
| Multiple accounts / identical labels | exact distinct identities and disambiguated children; no account guessing | fixture PASS; OAuth account live NOT TESTED |
| Network/permission/Worker unavailable | target preserved, repair/error instead of fallback/recreation | local negatives PASS; current edge403 recorded |
| Ready native click / restart / stale ACK | exact engine save without provider/dashboard detour; stale blocked | registrar+engine fixture PASS; actual Chrome BLOCKED |

## Measured Explorer performance

Same Chromium155, machine, viewport1280×850, production app source, isolated local API fixture. Baseline is archived latest main `eb5ee8b`, not a reimplementation. Single synchronous click/context-handler samples; traversal is local fixture Refresh-to-render wall time, not live cloud latency or a statistically controlled benchmark. Full raw snapshots include heap, DOM/listener counts, request counts and observed long tasks. Reproduce with `scripts/measure-explorer.mjs`; baseline can be served from a temporary `git archive` without modifying REDOWN or the active checkout.

| Entries | Left click ms before → after | Right click ms before → after | Local traversal ms before → after | Live DOM data rows before → after |
| --- | --- | --- | --- | --- |
| 200 | 202.7 → 0.9 | 252.7 → 1.5 | 181 → 81 | 200 → 30 |
| 1,000 | 4629.2 → 0.8 | 4637.2 → 0.8 | 217 → 71 | 1000 → 30 |
| 10,000 | not sampled → 0.8 | not sampled → 1.2 | not sampled → 69 | not sampled → 30 |

The original 1000-row interaction pair generated a roughly nine-second main-thread long task, supporting the repeated-sort freeze diagnosis for large directories. Latest snapshots record the actual long-task durations; the new interaction pairs have no observed >50ms task. Original 1000-row DOM/listener snapshots were 13396 nodes/4873 listeners; windowed counts are in the after JSON. Heap samples are not forced-GC or peak-memory measurements and do not establish an overall memory reduction. Selection does not request listings; the raw request counts grow only for explicit refresh/navigation. End/Arrow reaches index9999, keeping a small DOM window; 2000-entry paginated results deduplicate a repeated key and preserve selection. Delayed old-folder completion cannot replace the newer view; startup retry and compact login/no-auto-provision are exercised.

REDOWN actual Explorer/model/right-click/startup/history modules were read at the preserved local SHA. Cached ordering, visible windows, request coalescing/cancellation and exact receipt navigation informed independent Click2Cloud changes; no legacy engine was imported. A comparable live full REDOWN UI benchmark was **not exercised**. We do not certify REDOWN performance/feature parity from source inspection or Click2Cloud fixture timings. The user's exact Windows profile freeze remains unverified.

## Verification and CI

See `nov06-parity/verification.json` and command output artifacts for final counts/versions. Required focused suite, module tests, build, type declarations, native transition tests, Explorer regression helpers, Chromium app fixtures and actual local workerd/R2 readback are separately labeled. Current local workerd executes real conditional R2 writes/HEAD/GET against local storage with explicitly injected sources: 70MiB known, 9MiB unknown and an active transfer beyond65s, plus claim restart, replay, foreign binding, collision and revocation negatives. This is not deployed networking or live R2 proof.

Actual GitHub baseline run42338284935 on main `eb5ee8b` failed its module-command step after focused tests succeeded; build was skipped. The exact workflow command rejects `--test-isolation=none` under Node22 locally. Its replacement passes all49 module tests under Node22. Job/run metadata is retained; archived full-log retrieval timed out, so no unseen remote stack trace is claimed. This development branch has not been pushed; new GitHub CI has **not run**. Local Node22 checks are not a green hosted run.

## Installed Chrome / cloud evidence and blockers

- **BLOCKED:** attempted actual unpacked-extension installation in Chromium; administrator policy rejects loading. App/IndexedDB/Chrome doubles and real background-module boot are labeled separately in browser-results.json. No administrator setting was altered and no user profile reset.
- **UNVERIFIED / HTTP403:** existing test Worker URL is now reachable at the Cloudflare edge, returning non-JSON HTML403 with a cf-ray header. This differs from the prior CONNECT403 but does not prove application authentication or execution. No protocol response, current build handshake, signed save, or independent live R2 readback was established.
- **PASS, declarations only:** authenticated Cloudflare settings GET200 confirms existing R2 redown/DO/signing-secret declarations. It does not prove OAuth scope sufficiency, signing-secret availability, data-plane permissions or an upload. No credentials are in artifacts.
- **No cloud mutation/deployment:** this branch is not deployed. Live OAuth consent, approved initial setup, actual native menu visual/click, Worker→R2 save and independent content equality still require owner-authorized acceptance in an environment permitting them. Prior deployment permission does not override this run's no-deployment instruction.

## Remaining defects / next actions

1. Load build0.3.3 in administrator-approved installed Windows Chrome, preserving storage. Record source digest/ACK, test all matrix transitions and actual native click without dashboard. Toolbar/app source fixtures do not replace this gate.
2. Resolve the existing Worker edge403 and establish its authorized protocol/build handshake; explicitly approve any deployment/upgrade before applying it. Run controlled disposable-source/object equality tests in the exact chosen R2 prefix and verify History/GO TO/Explorer.
3. Registered OAuth provisioning/DO scope sufficiency remains unproven. Never substitute a developer token result or enlarge scopes silently.
4. TRUE REMOTE architectural limitations inherited from the prior repair remain: direct pinned TCP cannot reach Cloudflare-owned IPs; HTTP/2-only sources unsupported; safe conditional multipart completion beyond the R2 single-PUT pathway is NOT_VERIFIED; waitUntil does not make a source stream eviction-safe beyond its documented protection. Spool parts/claims have retained storage/cost and need an authorized lifecycle policy. No browser-byte fallback or unlimited-capacity claim.
5. Implement real, separately authorized Explorer mutation/private-source ports before enabling disabled context actions. Drive/Dropbox/OneDrive adapters remain unimplemented; compact availability cards do not imply OAuth or upload support.
6. Run a comparable actual REDOWN/Click2Cloud browser performance baseline and representative Windows/live pagination/large-directory tests. Current snapshots prove a large-list local improvement, not complete parity or population latency guarantees. IPC reads ignore stale results but do not cancel already dispatched provider work; future cancellation can reduce wasted requests.
7. Review and explicitly authorize branch publication/merge/deployment. Source, retained configs, current REDOWN and production resources are preserved; no storage wipe or default recreation was used to hide defects.
