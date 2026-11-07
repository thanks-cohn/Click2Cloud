# Click2Cloud — November 6 rule conflict audit and Codex handoff

**Status:** controlling documentation reconciled; source implementation and live acceptance still require repair and verification.  
**Next Codex starting point:** latest `main`, then a new development branch. The older `feat/glaciaring-agent-debug` branch diverged (at audit: 140 commits behind `main`, 6 ahead) and does not contain the new foundation diagrams/roadmap. Preserve the old feature branch and REDOWN production unchanged. No merge/release/deploy until owner approval.

## Source precedence (explicit and deterministic)

1. `AGENTS.md` — November 6 priority owner rule and execution contract.
2. `foundations/cloudflare/README.md`, especially diagrams **2A** (destination-count and deletion) and **2B** (Settings provider visibility).
3. `foundations/other_clouds/README.md` — Google Drive, Dropbox and OneDrive provider login/menu actions.
4. `docs/CODEX_SMALL_MILESTONES_TO_SURPASS_REDOWN_2026-11-06.md` — continuous-session progress milestones and acceptance.
5. November 5 `docs/CODEX_FINAL_V3P1_GUI_WINDOWS_EXPLORER_LOGIN_AND_API_2026-11-05.md`, `docs/CODEX_P0_BUILD_SCAFFOLD_V3P1_AGENT_READY.md` and `scaffold/README.md` — **non-conflicting** older UI/engine/backup/authorization specifications only.
6. Current source code — implementation evidence and defects to fix; not authority to reverse owner-approved behavior.

## Audit findings and settled precedence

| Potential contradiction | Controlling resolution |
| --- | --- |
| Always show four providers vs Settings hide toggles | **Default ON for all four.** Settings explicit OFF hides that provider and its entire native submenu/shortcuts; it never removes its authorization, real cloud data, or saved destinations. |
| `Cloudflare R2` vs `Cloudflare` vs an extra `REDOWN` menu layer | Native provider title is exactly **Cloudflare**, one provider row. Cloudflare R2 is a service name in setup/API only. No duplicated provider row or extension-added REDOWN group beneath Chrome's own grouping. |
| Existing bucket vs assigned destination | A bucket merely existing or being discovered **does not** appear in the native menu. The user explicitly selects/assigns a destination for the menu. Count distinct, active, displayed Cloudflare save targets, not account-wide bucket totals, hidden choices, disabled modes, or duplicate projections. |
| One location vs Simple always nests / Flat mode required | **0 active targets:** flat Cloudflare launches Manage Destinations if previously initialized/authorized. **1 active target:** flat Cloudflare saves directly to that exact target. **2+ active targets:** one Cloudflare submenu with individual leaves. Normal first use requires no editor/Flat toggle. Explicit custom display modes preserve user data; they cannot create a second provider row. |
| `redown` default vs changing or deleting it | Approved initial setup alone may create/reuse exact lowercase bucket `redown` once; R2 object prefix is exactly `''` at bucket root. Custom default wins. Explicit remote deletion/unassignment of `redown` persists; there is no automatic recreation. With one other active destination, Cloudflare becomes flat to that survivor. With none, click opens Manage Destinations. A temporary API failure cannot be mistaken for deletion. |
| First use automatic `redown` vs quiet OAuth login | Login itself performs only identity authorization. The **separately approved initial setup** reuses or creates `redown`, prepares Worker, verifies R2 write/readback, and establishes initial default. Already initialized returning users never rerun it just because the menu is empty. |
| Hide provider vs delete assignment vs delete real bucket | They are three distinct operations. Hide is reversible visibility only; remove assignment edits menu config; a bucket deletion requires an explicit authorized remote operation. Never equate the three. |
| No assigned destinations, logged out vs signed in | Logged-out → compact `One Click Away!` sign-in; after reauthorization, initialized user → Manage Destinations. Signed-in returning user → directly Manage Destinations. No fabricated save or bucket recreation. |
| Milestone plan vs per-milestone session limit | Codex works continuously for **approximately 30 minutes**, completes multiple related milestones as practical, commits coherent changes, and provides a detailed handoff at the end. Milestone numbers are progress checkpoints, not run limits. |
| Feature branch vs current authoritative docs/code | Start from latest **main** on a fresh development branch. The old `feat/glaciaring-agent-debug` branch does not have the November 6 documents and has diverged; do not make it the next-run starting point. |
| Simulation vs actual pass | Unit/fixture tests support diagnosis. Actual Chrome native menu, actual authorized Worker→R2 operation, independent provider verification, and Explorer responsiveness require their own evidence. Mark missing external proofs honestly. |

## Critical known source-implementation gaps (not rule conflicts)

1. `src/core/menu-spec.mjs` still creates a Cloudflare provider action plus other Cloudflare menu structures in composite mode; it currently labels one as `Cloudflare R2`. Codex must converge to one canonical Cloudflare row and correct leaf/submenu transitions.
2. `src/cloudflare/onboarding.mjs` has initialized/removal safeguards and a returning-user `CHOOSE_DESTINATION` case; the current routing to Manage Destinations and persistent deletion semantics need actual installed-Chrome validation.
3. `extension/app.mjs` previously re-sorted files per selected row, a likely Explorer freeze cause. The UI needs a measured repair using REDOWN's cached ordering/visible-row rendering as behavioral reference without importing old engines.
4. Settings now has per-provider checkboxes using the versioned `setProviderMenuVisibility` change and a compiler visibility filter. They still require focused tests, persistence/backup verification, and real Chrome ACK/restore validation.
5. Prior GitHub Actions runs passed the focused test step but failed during `right2cloud-module/tests/module.test.mjs`, preventing the extension build step from running. Review the actual failing assertion/log and repair it; verify the latest run rather than inferring every failure has the same cause.
6. Connected main branch and historical feature branch differ materially; do not copy old code over the newer main baseline or reintroduce obsolete controls.

## Codex instruction — approximately 30 minutes continuous work

Read `AGENTS.md`, this audit, `foundations/cloudflare/README.md` (especially diagrams 2A/2B), `foundations/other_clouds/README.md` and `docs/CODEX_SMALL_MILESTONES_TO_SURPASS_REDOWN_2026-11-06.md`. Use the latest `main` as source and create a fresh development branch for this implementation. REDOWN is a **read-only behavior/reference**; do not move over its legacy engines.

**Work continuously for approximately 30 minutes and pursue as many connected P0 fixes as practical.** The priority order is: Chrome extension startup → one correct native Cloudflare provider row and four default flat providers → exact approved `redown` setup and destination-count menu transitions → actual right-click TRUE REMOTE upload/verification → File Explorer left/right-click responsiveness and API performance → Settings provider show/hide persistence + native ACK. Work on independent fixes even if installed Chrome or R2 access is externally blocked.

**Honor the exact decision rules:** Cloudflare native row is visible by default. Zero active assigned destinations after initialization routes a connected user to **Manage Destinations**; initial never-configured users use minimal sign-in/approved first-time setup. One active destination is a direct flat Cloudflare leaf. Two or more active chosen destinations are child actions under the one Cloudflare submenu. A second bucket that merely exists does nothing. Explicit deletion of `redown` never recreates it; one surviving destination becomes flat. Settings can hide any of the four providers without disconnecting or deleting cloud resources. Ready Cloudflare clicks save immediately to the exact authorized destination and are independently verified. Actual root of bucket `redown` has key prefix `''`.

Use the single existing V3+1 core/menu compiler, native registrar, action resolver, typed API and Universal File API. Build small coherent commits with regression tests. Avoid arbitrary product-imposed caps, fake success, duplicate provider owners, new dashboards as ready-save detours, silent cloud resource creation, speculative engine rewrites, or destructive profile reset. Keep provider credential protections and explicit authorization for billable or destructive actions.

At the end of the approximately 30-minute working window provide a **handoff**: every commit, before→after behavior, tests that actually passed/failed, native Chrome proof, R2 receipt/readback proof, performance measurements, blockers, and the next useful actions. When a validation environment is unavailable, describe what remains unverified without presenting simulations as live proof. Keep implementation commits on the new development branch; no merge, publish, or deployment without owner authorization.
