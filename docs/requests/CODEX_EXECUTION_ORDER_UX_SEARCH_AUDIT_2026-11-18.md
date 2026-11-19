# CODEX MASTER EXECUTION REQUEST — UX → IMPLEMENT FILENAME SYSTEM → FINAL READ-ONLY ARCHITECTURE AUDIT

**Date:** 2026-11-18  
**Repo:** `thanks-cohn/Click2Cloud`  
**Order:** Exact sequence below. **Finish and report each step before beginning the next.** Work on an isolated feature branch, never `main`. Do not touch the ReDown repo's code or live Cloudflare resources.

## STEP 1 — IMPLEMENT UX fixes first

Follow [CODEX_SCOPED_EXPLORER_HEADER_GALLERY_UI_2026-11-18.md](CODEX_SCOPED_EXPLORER_HEADER_GALLERY_UI_2026-11-18.md).

This includes: sun/moon **at far upper-right of the FIRST header row always**, especially at default Shelf size, never wrapping to row two; compact tabs; bottom footer removed to give gallery space; floating LEFT Manage Destinations; Debug Mode–only Review Save Results, Remotes Cloudflare status/Save results, and More → Help · Diagnose; debug-only Settings Recovery Mode, Save Whole Cloud and Connection cards; wrap long redirect URL and narrow button labels; remove redundant Minimal “Login and usage”; eliminate redundant generic New Folder Worker/cost prompt without bypassing real authorization/consent; independent keyboard shortcuts for 1↔2 toolbar rows and 50/50 folder/gallery reset; preserve accessibility, errors, History and all normal save flows.

**Do not enable a nonfunctional filename search UI during Step 1.** Prepare the responsive slot if convenient, preserve existing navigation until Step 2.

Deliver: scoped committed implementation, tests, default-size screenshots, failures/limitations.

## STEP 2 — IMPLEMENT the complete filename search + IndexedDB system

Follow [CODEX_IMPLEMENT_FILENAME_SEARCH_INDEXEDDB_2026-11-18.md](CODEX_IMPLEMENT_FILENAME_SEARCH_INDEXEDDB_2026-11-18.md). **This is an authorized implementation, NOT a design-only research task.**

Ship the real current-directory immediate-child filename/folder-name search in the shared File API, persisted metadata inventory in IndexedDB, efficient warm local querying without repeated R2 listing, safe complete/partial/fresh/stale semantics, pagination, transactional/generation fencing, invalidation after verified changes, account isolation, crash/restart/concurrency/eviction/DB-failure fallbacks, and the working responsive GUI Search field before Explorer More with **Enter** to search. Reuse the existing in-memory listing reader; do not build an independent search engine in the GUI. The old read-only IndexedDB architecture note is now **archived background**, not an instruction to stop at design. Future `:nested` is architectural preparation only, not V1 implementation.

Deliver: committed real API/IndexedDB/UI implementation, regression suite, benchmark evidence and exact acceptance results. Do not claim complete if acceptance gates fail.

## STEP 3 — FINAL, STRICTLY READ-ONLY cloud operations architecture investigation

Follow [CODEX_FINAL_READ_ONLY_CLOUD_ENGINE_ARCHITECTURE_DECISION_2026-11-18.md](CODEX_FINAL_READ_ONLY_CLOUD_ENGINE_ARCHITECTURE_DECISION_2026-11-18.md).

Examine current Click2Cloud and full ReDown source/evidence and recommend the most reliable, simplest, least error-prone, scalable architecture, minimizing unnecessary Workers/messages/mutable state while preserving authorization, verified receipts and safe recovery. Challenge the hybrid premise. **Do not edit any code, docs, configuration or cloud resources during Step 3.** Produce an evidence-cited decision and future migration plan only.

## Global constraints

- Step 1 and Step 2 may modify only Click2Cloud on a dedicated branch. Protect working Simple/Narrow/Depth right-click saves, Explorer CRUD, credentials, receipts, permissions and themes. No `main` changes.
- Do not change ReDown or deploy/provision Workers or modify production R2 as part of these tasks. Use authorized local mocks/fixtures; report unverified live Chrome/Cloudflare behavior.
- Separate completion reports per step with changed paths/commit SHAs, tests and remaining risks.
- **Key instruction: the user explicitly changed Step 2 from RESEARCH to IMPLEMENTATION. Do not stop at a design report.**
