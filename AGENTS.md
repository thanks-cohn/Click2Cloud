# AGENTS.md — Click2Cloud /scaffold-first engineering instructions

## PRIORITY OWNER RULE — NOVEMBER 6, 2026: ONE CLOUDFLARE ITEM, AUTOMATIC `redown` DEFAULT

**AUTHORITATIVE FOR ALL NEXT CODEX WORK AFFECTING THE NATIVE RIGHT-CLICK MENU OR DEFAULT DESTINATION.** This owner-approved rule supersedes conflicting menu-layout, naming, default-selection, mode-visibility and run-cadence language in earlier November 5 requests, `scaffold/README.md`, historical examples, and existing source code. **Apply this rule through the existing single V3+1 compiler, registrar, dispatcher and versioned File API.** Preserve non-conflicting Simple/Narrow/Depth customization, OAuth, security, provider capability, backup and recovery requirements.

### First-run zero-configuration rule (MANDATORY)

- The flat native **Cloudflare** entry is registered **immediately on extension installation**, even with **zero** configured cloud accounts, **zero** R2 buckets, or **zero** saved destinations. A missing bucket must NOT hide, disable beyond clickability, nest, duplicate, or relabel this entry.
- **New account; does `redown` already exist?** YES → reuse that exact bucket. NO → as part of the user's authorized/approved initial setup, create lowercase `redown` exactly once; verify Worker readiness and select the bucket's root as the default. **Other buckets are irrelevant**: do not require the user to find, pick, activate in a custom menu, or create a destination manually.
- Clicking the flat Cloudflare entry **before authorization/readiness** opens only the compact provider-specific **One Click Away!** connection/setup surface (and any real provider-required consent). On completing approved initial setup, all subsequent clicks save **directly** to `redown`. Never promise or report a save before an actual authorized R2 write and verification.
- **One configured Cloudflare save destination** → flat **Cloudflare** leaf. **Two or more configured destinations** → one **Cloudflare** submenu with `redown` and the user's added destinations. Remove the last extra → the exact same flat **Cloudflare** leaf returns. The primary `redown` choice stays present until the user explicitly removes it.
- Preserve intentional changes: a user-selected different default wins, intentional bucket deletion is not undone, multiple Cloudflare accounts require explicit account selection. These exceptions do not impose any manual configuration on a new single-account user.

### Mandatory native Chrome presentation

```text
INITIAL / THE ONLY CLOUDFLARE DESTINATION:
[Chrome's extension grouping, if Chrome supplies one]
  Google Drive
  Dropbox
  OneDrive
  Cloudflare                   <-- a single clickable leaf; saves to authorized redown/

AFTER AN ADDITIONAL CLOUDFLARE DESTINATION EXISTS:
[Chrome's extension grouping, if Chrome supplies one]
  Google Drive
  Dropbox
  OneDrive
  Cloudflare                   <-- ONE submenu, no duplicate Cloudflare R2 sibling
    redown                     <-- original initial bucket, until explicitly removed
    Photos                     <-- example user-configured extra location

AFTER THE ADDITIONAL DESTINATION IS REMOVED:
  Google Drive
  Dropbox
  OneDrive
  Cloudflare                   <-- flat direct-save leaf again
```

- **Exactly one native provider item labeled `Cloudflare`** (not separate `Cloudflare` and `Cloudflare R2`). `Cloudflare R2` remains a valid *service/type label in setup/API*, but the native menu label is **Cloudflare**. Other three providers remain single flat entries. No extra extension-authored REDOWN grouping under Chrome's own extension group.
- **Default Cloudflare save destination = lowercase bucket `redown`, root prefix `redown/` meaning the root of bucket `redown` (object prefix `''`).** After authorized initial first-use setup, create or reuse that bucket once, verify the Worker write/readback, and make it the initial save destination without requiring manual destination editing. No claim of READY before actual authorization and verified readiness.
- **`redown` remains an available selected/menu destination until the user explicitly removes it.** An explicitly chosen different default is honored; the user's selection must never be silently reset to `redown`. Intentional bucket deletion/removal is respected, and a deleted bucket is not automatically recreated. With one remaining user-selected destination, the Cloudflare item is again a direct leaf to that exact destination.
- **Cloudflare has one direct leaf when exactly one destination is configured, and exactly one submenu when an additional destination exists.** No duplicate provider entry, no forced extra nesting, no artificial need to enable Flat or enter Simple/Narrow/Depth to make the first save work. Specialized Simple/Narrow/Depth custom hierarchies are opt-in; preserve saved user configuration without allowing default duplicate providers.
- **READY click:** choose Cloudflare -> begin real TRUE REMOTE save immediately to exact target -> independent R2 verification -> matching Explorer/History update. No dashboard, activation page, configuration detour, or new tab for a ready save.
- **Not connected:** show the compact provider-specific extension-owned `One Click Away!` login card and use the real existing authorization owner. No false successful save. Provider-controlled OAuth window may be needed. R2 activation and approved infrastructure setup occur only when genuinely necessary, never silently.
- Native menu projection, in-app Explorer destination context menu and typed API must agree on one canonical action identity and result. The underlying meaningful actions remain programmatically accessible where feasible. Test Chrome's actual rendered entries, not only a simulated model.
- Acceptance matrix: first run, existing `redown`, extra destination added, extra removed, custom default, deliberately removed `redown`, disconnected account, revoked authorization, worker restart, and real verified save. Fail the checkpoint on duplicate Cloudflare items or a ready click opening the dashboard.

**Codex working cadence:** Work continuously for approximately **30 minutes**, completing as many connected P0 roadmap milestones as practical; milestones are checkpoints **within the same working session**, not one-per-run limits. After each checkpoint advance to the next useful task. At the end provide a detailed handoff with commits, actual tests, live-proof status, remaining failures and next actions. Do not invent elapsed time if the environment cannot measure it.

**Read first:** `docs/CODEX_SMALL_MILESTONES_TO_SURPASS_REDOWN_2026-11-06.md`, `foundations/cloudflare/README.md`, `foundations/other_clouds/README.md`; use earlier consolidated November 5 directions only where consistent with the latest rule.

## HISTORICAL NOVEMBER 5 OWNER REQUEST — NONCONFLICTING REQUIREMENTS ONLY

**HISTORICAL REFERENCE:** [docs/CODEX_FINAL_V3P1_GUI_WINDOWS_EXPLORER_LOGIN_AND_API_2026-11-05.md](docs/CODEX_FINAL_V3P1_GUI_WINDOWS_EXPLORER_LOGIN_AND_API_2026-11-05.md). Use the non-conflicting UX and functional requirements below, with November 6 rules above taking precedence: quiet one-click provider login, conventional Windows-style Explorer, Light/Dark theme, Simple Hide/Quick row toggles with pencil/trash preserved, Narrow Select-to-hide menu levels, explicit Default Location only, future-only Favorite Cloud marker, user-controlled provider nesting/Quick priority, 7+ entry optional suggestion, and UNIVERSAL secure typed programmatic API coverage. It overrides conflicting UI/threshold/layout text in the earlier November 5 addenda and older scaffold descriptions, while preserving non-conflicting real-engine, OAuth, recovery, privacy, authorization and evidence requirements below. Do NOT include the removed V3-versus-V3+1 comparison roadmap in this implementation request. Implement actual code and real acceptance, not only another proposal. Work only on feat/glaciaring-agent-debug; do not deploy or merge without authorization.


## ADDITIONAL ENGINEERING REFERENCES — SUBJECT TO NOVEMBER 6 OWNER RULE

**AFTER THE PRIORITY RULE AND CURRENT MILESTONE ROADMAP, CONSULT THESE REFERENCES:**
1. docs/CODEX_P0_BUILD_SCAFFOLD_V3P1_AGENT_READY.md — single comprehensive IMPLEMENTATION REQUEST for this run.
2. scaffold/README.md — final product UI and mode semantics.
3. scaffold/gui/README.md and scaffold/gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md — actual installed MV3 product, native Chrome acceptance and GUI.
4. scaffold/MENU_DESTINATIONS_DURABLE_RECOVERY.md and scaffold/RESTORE_RIGHT_CLICK_MENU.md — external recovery and last-CURRENT one-click menu restore.
5. scaffold/WHOLE_CLOUD_OUTLINE_EXPORT.md — silent, indefinite, incremental metadata capture, same-account OAuth auto-resume.
6. scaffold/gui/REDOWN_OAUTH_EXTRACTION.md and scaffold/gui/TEST_JOURNEYS.md — auth and focused real-product acceptance.
7. docs/CODEX_P0_SCAFFOLD_FIRST_DEBUG_API_SURROUNDS_PRODUCT.md — Glaciaring remains the observer, NOT product.
8. Existing src/core, src/persistence, src/chrome, src/explorer, src/glaciaring implementation as source evidence, not as authority to override /scaffold.

**Do not read, run, expand or prioritize the historic 500/1,000 golden scenario atlas, 1,000-case Codex task, Scenario Laboratory or M0–M10 expansion during this build.** This project needs the real product, not a giant synthetic test initiative. Older references remain non-controlling where they conflict with the November 6 priority owner rule and continuous-session roadmap. Current milestone tasks are active checkpoints, not the retired synthetic scenario atlas. Do focused actual browser, account, upload, recovery, and agent API tests only.

## WHAT TO BUILD

- ONE real headless V3+1 domain engine and canonical CURRENT data model serving installed Chrome Explorer GUI, native context menu, future desktop clients and permission-gated agent/LLM tools; one existing Universal File API and provider ownership. No parallel implementation, mock-only GUI, hidden popup or duplicate click dispatcher.
- File Explorer + Right Click popup (three configuration tabs Simple/Narrow/Depth) with Show Simple/Narrow/Depth/All/Flat **only INSIDE POPUP immediately above Save**. NO Explorer hierarchy toggle. An explicit Flat choice is an optional direct-save override to the user's exact Default Save Selection folder; **it is never required for the automatic one-destination Cloudflare flat leaf**. Preserve hidden configs.
- Native Chrome contextMenus with actual ACK, exact immutable route IDs, safe reconciling across MV3 worker restarts. Real Click2Cloud-specific OAuth and authorized Cloudflare R2/Worker save with verified provider receipt; independent flat Drive/Dropbox/OneDrive adapters only when actually available/verified.
- Settings Recovery Mode: Weekly Monday default / Daily, independent Simple/Narrow backup toggles, separate per-bucket unlimited-depth recovery crawl, two external Windows Backup Location choices, atomic CURRENT, monthly journals, dated weekly/daily snapshots, and **Restore My Right-Click Menu** from CURRENT/journal into IndexedDB/Chrome menu without rescanning cloud.
- Settings bottom **Save Whole Cloud**: checkbox multiselect Cloudflare + supported S3 accounts, read-only full bucket/key outline, no scan depth or week deadline, one activation then silent continuous Weekly/Daily updates indefinitely, dated start/end ISO-week JSON exports. OAuth loss quietly pauses; next NORMAL successful same-account login automatically resumes without nagging, login interference or extra consent.
- Fully programmatically accessible versioned/typed/domain API and secure local agent command gateway for introspection, menu configuration, restore, authorized saves and future MCP/ChatGPT integrations. Existing Glaciaring diagnostic API remains READ ONLY and low-overhead; it never issues writes. Agent access requires explicit scoped grants and appropriate confirmation. No public arbitrary endpoint.
- Preserve REDOWN repository and production resources unchanged. No tokens, browsing provenance, or cloud credentials in diagnostic exports, backup JSON, log files or public API; don't enlarge OAuth scopes or trigger cloud billing without consent.

## RULES FOR ENGINEERING AND EVIDENCE

1. Read actual branch content; never claim an OAuth/module/GUI exists merely because docs mention it. Current feature branch's manifest is a diagnostic lab, not finished extension.
2. Work incrementally from existing core/menu/registrar/current-store/glaciaring code, **refactor if needed to fit scaffold**. Build real vertical slices and verify the installed extension early.
3. Browser/menu/source/provider/readback and external disk backups are independent proof classes. A fixture, fake menu, service binding, timer or local IndexedDB is NOT proof of those external operations.
4. Preserve exact identities and account permissions; never guess buckets or fallback to unrelated accounts. A disconnected recovered menu is visible but cannot save until reauthorized. Deleting configuration NEVER deletes cloud objects.
5. Record PASS, FAIL, BLOCKED and NOT TESTED truthfully with real receipts and blockers. If external OAuth registration, native companion or browser testing unavailable, say exactly what is missing and implement unaffected code. No fabricated success.
6. Glaciaring instrumentation must not change execution or capture sensitive values. Same real engine is used by GUI and authorized agent commands. Debug API cannot mutate; simulation endpoints are not cloud writes.
7. Keep the repo's own focused useful tests when relevant; do NOT read/run/expand the 1,000-case scenario project.
8. Work on feat/glaciaring-agent-debug; do not publish, transplant, merge or deploy to main or REDOWN production without explicit owner authorization.

**Definition of done (subject to November 6 priority rule):** Real /scaffold product usable as installed Chrome extension, four initial flat provider entries, one Cloudflare direct save into authorized `redown/` without entering the menu editor, single Cloudflare submenu when extra destinations exist, verified R2 live upload, responsive Explorer, restore from external backup, quiet continuous Whole Cloud outline, programmatic agent-ready domain service and honest current-branch evidence. An MCP/ChatGPT connector is a future opt-in adapter, not something to pretend already connected.
