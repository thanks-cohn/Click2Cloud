# AGENTS.md — Click2Cloud /scaffold-first engineering instructions

## CURRENT OWNER-APPROVED CODEX REQUEST — NOVEMBER 5, 2026

**READ THIS FIRST:** [docs/CODEX_FINAL_V3P1_GUI_WINDOWS_EXPLORER_LOGIN_AND_API_2026-11-05.md](docs/CODEX_FINAL_V3P1_GUI_WINDOWS_EXPLORER_LOGIN_AND_API_2026-11-05.md). This is the ONE controlling final UX and functional scope for the next Codex implementation pass: quiet one-click provider login, conventional Windows-style Explorer, Light/Dark theme, Simple Hide/Quick row toggles with pencil/trash preserved, Narrow Select-to-hide menu levels, explicit Default Location only, future-only Favorite Cloud marker, user-controlled provider nesting/Quick priority, 7+ entry optional suggestion, and UNIVERSAL secure typed programmatic API coverage. It overrides conflicting UI/threshold/layout text in the earlier November 5 addenda and older scaffold descriptions, while preserving non-conflicting real-engine, OAuth, recovery, privacy, authorization and evidence requirements below. Do NOT include the removed V3-versus-V3+1 comparison roadmap in this implementation request. Implement actual code and real acceptance, not only another proposal. Work only on feat/glaciaring-agent-debug; do not deploy or merge without authorization.


## ACTIVE OWNER-APPROVED CODEX MISSION

**READ FIRST:**
1. docs/CODEX_P0_BUILD_SCAFFOLD_V3P1_AGENT_READY.md — single comprehensive IMPLEMENTATION REQUEST for this run.
2. scaffold/README.md — final product UI and mode semantics.
3. scaffold/gui/README.md and scaffold/gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md — actual installed MV3 product, native Chrome acceptance and GUI.
4. scaffold/MENU_DESTINATIONS_DURABLE_RECOVERY.md and scaffold/RESTORE_RIGHT_CLICK_MENU.md — external recovery and last-CURRENT one-click menu restore.
5. scaffold/WHOLE_CLOUD_OUTLINE_EXPORT.md — silent, indefinite, incremental metadata capture, same-account OAuth auto-resume.
6. scaffold/gui/REDOWN_OAUTH_EXTRACTION.md and scaffold/gui/TEST_JOURNEYS.md — auth and focused real-product acceptance.
7. docs/CODEX_P0_SCAFFOLD_FIRST_DEBUG_API_SURROUNDS_PRODUCT.md — Glaciaring remains the observer, NOT product.
8. Existing src/core, src/persistence, src/chrome, src/explorer, src/glaciaring implementation as source evidence, not as authority to override /scaffold.

**Do not read, run, expand or prioritize the historic 500/1,000 golden scenario atlas, 1,000-case Codex task, Scenario Laboratory or M0–M10 expansion during this build.** This project needs the real product, not a giant synthetic test initiative. Existing older instructions in docs/*, archived runbooks or milestone files are historical, non-controlling references and cannot countermand this AGENTS or the controlling /scaffold contract. Do focused actual browser, account, upload, recovery, and agent API tests only.

## WHAT TO BUILD

- ONE real headless V3+1 domain engine and canonical CURRENT data model serving installed Chrome Explorer GUI, native context menu, future desktop clients and permission-gated agent/LLM tools; one existing Universal File API and provider ownership. No parallel implementation, mock-only GUI, hidden popup or duplicate click dispatcher.
- File Explorer + Right Click popup (three configuration tabs Simple/Narrow/Depth) with Show Simple/Narrow/Depth/All/Flat **only INSIDE POPUP immediately above Save**. NO Explorer hierarchy toggle. Flat = one direct REDOWN → Cloudflare leaf to exact user-selected Default Save Selection folder. Preserve hidden configs.
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

**Definition of done:** Real /scaffold product usable as installed Chrome extension, saved configuration/direct Flat/composite native menus, verified R2 live upload, restore from external backup, quiet continuous Whole Cloud outline, programmatic agent-ready domain service and honest current-branch evidence. An MCP/ChatGPT connector is a future opt-in adapter, not something to pretend already connected.
