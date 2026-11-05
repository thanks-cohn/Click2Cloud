# Click2Cloud — V3+1 /scaffold Chrome Product

**Current Codex mission:** Build the REAL Click2Cloud V3+1 product described in [the /scaffold specification](scaffold/README.md), following the [comprehensive Codex build request](docs/CODEX_P0_BUILD_SCAFFOLD_V3P1_AGENT_READY.md). Read [AGENTS.md](AGENTS.md) for the current engineering charter. Glaciaring observes the actual product; it is not a second engine. Older runbooks and legacy testing plans are historical references only and do not control this implementation.

**Development branch:** feat/glaciaring-agent-debug. REDOWN is read-only; do not transplant to production without explicit authorization.

## Target product — authoritative owner decisions

- Installable independent Chrome MV3 extension: Remotes by default, real File Explorer and real native Chrome right-click menus powered by one canonical V3+1 engine and Universal File API.
- ONE + Right Click popup: Simple, Narrow and Depth configuration tabs. **Show Simple / Narrow / Depth / All / Flat is INSIDE the popup, immediately above Save**, nowhere else. No Explorer hierarchy button. Hidden destinations remain stored.
- Simple flat leaves, Narrow configured ancestor branches and Depth discovered bucket trees coexist when selected by the popup. Depth DISPLAY bucket depth default 10 but has no app-defined maximum. Independent Google Drive/Dropbox/OneDrive remain flat native leaves.
- Explorer folder context menu exposes + Right Click, Default Save Selection and Manage Destinations. **Flat** becomes a single directly clickable REDOWN → Cloudflare menu leaf saving to the selected exact folder, without additional Cloudflare nesting.
- Real Click2Cloud-specific Cloudflare OAuth, authorized account/bucket discovery and verified Worker/R2 save. Existing Worker bindings do NOT replace user OAuth. A menu or test fixture does not prove a real upload.
- Settings Recovery Mode: Weekly Monday default or Daily, Simple/Narrow recovery ON/OFF, independent per-bucket recovery crawl depths, choice of external Windows Backup Location, CURRENT and monthly journals and dated snapshots.
- **Restore My Right-Click Menu** uses external validated CURRENT and journals (or verified historical checkpoint) to rehydrate IndexedDB and ACK actual Chrome contextMenus immediately without rescanning the entire cloud.
- **Save Whole Cloud** at bottom of Recovery Mode: multi-select authorized Cloudflare/S3 accounts; one activation maintains each account's read-only complete bucket/key outline **silently forever**, with dated ISO week-range JSON snapshots, resumable multi-week listing, paused auth and silent resume after next normal same-account login; never interrupt login.
- Headless **agent-ready V3+1 API** with versioned typed read/inspect/configure/restore commands and optional future MCP/ChatGPT connector through authorized private companion. Glaciaring remains read-only inspection/diagnostic; privileged agent commands use a separate scoped authorized gateway over the SAME engine.

See [GUI contract](scaffold/gui/README.md), [real Chrome acceptance](scaffold/gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md), [durable backup](scaffold/MENU_DESTINATIONS_DURABLE_RECOVERY.md), [fast menu restore](scaffold/RESTORE_RIGHT_CLICK_MENU.md), and [silent whole-cloud capture](scaffold/WHOLE_CLOUD_OUTLINE_EXPORT.md).

## Current implementation — inspect before claiming completion

The development branch contains useful modules: src/core/engine.mjs, menu-spec.mjs, menu-compiler.mjs, action-resolver.mjs, src/chrome/registrar.mjs, src/persistence/current-store.mjs, src/glaciaring/agent-api.mjs and src/explorer modules.

**These are NOT evidence of a complete /scaffold product.** The checked extension/manifest.json is still a Glaciaring diagnostic lab manifest, and production GUI/OAuth/native-save/external recovery must be built or directly verified. src/glaciaring/agent-api.mjs currently reports executionAuthority:false and offers only diagnostic inspection/fixture-based simulations. The comprehensive Codex request establishes the real agent-ready service/authorized command gateway to build.

Run existing repository tests when relevant to the actual implementation, but do NOT pursue the old 500/1,000-scenario expansion project in this run. Real installed Chrome menus, Cloudflare auth/verified R2 read-back, filesystem recovery and agent security require focused independent evidence.

## Existing R2 laboratory

The repository documents a disposable Cloudflare R2 test area under the real redown bucket (see docs/REAL_R2_TEST_TREE.md and fixtures as available). Tests may act only in the explicitly authorized isolated prefix, never unrelated customer or production objects, and only through legitimately granted provider access. A Cloudflare Worker/service binding alone does not establish an accessible browser route.

## Engineering invariants

1. ONE canonical saved model and MenuSpec, exact immutable provider/account/bucket/prefix identity, and one native registrar/dispatcher for all UI and authorized agent paths.
2. Saving configuration does not imply that its mode is displayed; Show/Flat selection changes visibility without destroying other configs. Popup-only display selection.
3. Native Chrome applied state requires actual browser ACK; provider success requires actual confirmation/read-back; external backup protection requires validated independent filesystem receipt.
4. Never guess account routes, leak browsing provenance/secret credentials, create unapproved buckets, silently change billing or run a public unsafe debug listener. Unauthorized/deleted/restored targets cannot save until revalidated.
5. Separate Depth DISPLAY levels from Settings RECOVERY crawl depth, and separate immutable historical checkpoint cadence from continuously updated CURRENT/journals.
6. Chrome reinstall restoration uses valid local backup and cached index without a full provider scan; missing OAuth pauses provider actions, not the restored menu identity.
7. Whole Cloud capture never nags, interrupts normal login or silently renews unauthorized scopes; it can be stopped explicitly and respects provider rate limits and browser responsiveness.
8. Glaciaring observation is non-mutating and non-blocking. All authorized agent command tools use the same first-party domain service with explicit scopes/grants; external MCP/ChatGPT connectivity is opt-in and not yet established.
9. Honest PASS/FAIL/BLOCKED/NOT_TESTED proof. No test fixture or documentation alone is a completed installed extension.

## Codex start

Read [docs/CODEX_P0_BUILD_SCAFFOLD_V3P1_AGENT_READY.md](docs/CODEX_P0_BUILD_SCAFFOLD_V3P1_AGENT_READY.md) and implement it on feat/glaciaring-agent-debug. Deliver actual code, unpacked extension location, install instructions, verified browser/provider/recovery/agent results and exact blockers; do not merely write a design proposal.
