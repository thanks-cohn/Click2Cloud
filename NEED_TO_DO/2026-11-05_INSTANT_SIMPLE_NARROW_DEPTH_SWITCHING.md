# NEED TO DO — Instant V3 Menu Mode Switching and Correct Simple Default

**Date:** November 5, 2026  
**Product:** Click2Cloud / REDOWN V3+1  
**Priority:** P0 UX/performance defect  
**Status:** OPEN; documentation only, not implemented or benchmarked in installed Chrome.  
**Owner directive:** Preserve the existing V3 engine and canonical menu semantics. This is not permission to modify runtime files, merge a PR, or deploy.

## Observed problem

The owner sees a noticeable, unacceptable delay switching from **Nested → Depth** to **Simple** in REDOWN's right-click setup. All mode transitions should feel immediate after the local authorized folder index and configuration have been populated:

- Depth → Simple: particularly cheap, because Simple must not traverse the Depth hierarchy.
- Simple ↔ Narrow: Narrow uses only explicitly saved destinations and their necessary ancestor paths.
- Simple ↔ Depth / Narrow ↔ Depth: Depth uses the already normalized, locally cached directory graph and configured depth; must not need repeat R2 discovery merely because the selected presentation changed.
- Switching back to a previously configured mode must not erase or recompute unrelated configuration.

**No network scans or OAuth setup as a side effect of an ordinary mode switch.** The editor should respond immediately even if applying the resulting Chrome native menu needs additional asynchronous work. Distinguish **mode selected / editing ready** from **native menu applied** honestly.

## Updated owner model — Simple marker, Narrow nesting, Depth hierarchy

**Latest owner clarification (November 5, 2026):** The previous text allowing *multiple menu choices inside Simple* is **superseded**. Do not confuse selecting multiple stored destinations with exposing multiple actions in the Simple projection.

### Simple — one marked destination, one flat Cloudflare action

1. User browses/selects an **authorized bucket or folder location** in Right-click Setup.
2. User assigns that selected location the **Simple marker** (the one effective Simple destination for the current Cloudflare context). Preserve its exact profile/account/bucket/prefix identity and saved metadata/menu label; the visible Chrome leaf still reads **Cloudflare**.
3. In **Simple mode**, the native menu is always a direct single Cloudflare action:

```text
REDOWN
└── Cloudflare           [direct save to the location marked Simple]
```

4. Clicking this flat **Cloudflare** row saves directly into the exact authorized **Simple-marked location**. There is **no extra submenu, redown child, Home row, or intervening folder hierarchy**.
5. **Default / first run:** When no explicit Simple marker has been set and the sole ready default is the authorized `redown` bucket root, use that root as the effective Simple destination. Clicking `REDOWN → Cloudflare` saves to `redown/`. Do not invent a destination if no authorized root is available: show an honest setup/disconnected state without routing to the wrong bucket.
6. Only **one effective Simple marker** should govern a given Cloudflare flat action at once. Selecting a new Simple-marked location supersedes the previous selection atomically while preserving all underlying saved destinations and independent Narrow/Depth configurations; collisions/multiple accounts must never silently redirect a save. Resolve the configured default Cloudflare identity explicitly where more than one account/bucket could match.
7. **Multiple configured save choices are still supported**, but their **nested multi-choice presentation belongs in Narrow**, not under Simple. A saved Menu Label is used where that destination is presented as a choice (e.g., Narrow), not to create additional Simple leaves.
8. Google Drive, Dropbox, OneDrive and other flat provider rows remain independent; do not put them under Cloudflare or change their existing auth/save behavior.

### Narrow — the straightforward nesting option

**Narrow is the user's simple, manually configured nesting mode.** It takes the paths the user explicitly selected, preserves custom Menu Labels, and constructs only the necessary parent/child hierarchy to expose those choices. It **does not** scan unrelated cloud directories, inherit all Depth folders, or become a second Simple-default marker.

- Multiple destinations and labels can coexist in Narrow, including distinct folders or authorized bucket roots.
- Natural hierarchy and explicit `Save here` when appropriate must remain correct; preserve collision handling and exact destination IDs.
- Switching from Simple to Narrow reuses the existing configured route records. Switching back returns immediately to the one Simple-marked location.

### Depth — automatic full-depth projection of cached authorized folders

Depth projects the authorized discovered folder index up to the selected depth, including eligible unconfigured folders. It may have many rows but should use the local CURRENT/IndexedDB index once populated, rather than delaying the selector on network rescan. An incomplete/stale index must be reported truthfully, and unavailable/revoked routes must fail closed.

### Acceptance examples

**No explicit Simple selection, only default `redown` active:** `REDOWN → Cloudflare` directly saves to `redown` bucket root.

**User marks `redown/Art/Photos` Simple:** `REDOWN → Cloudflare` directly saves to `redown/Art/Photos` with one click, **not** `REDOWN → Cloudflare → Art → Photos`.

**User configured `redown/Art/Photos` and `redown/Work/Docs` for Narrow:** Narrow displays only those configured routes and necessary ancestors with their labels. Simple still shows just one flat Cloudflare leaf aimed at the independently Simple-marked location.

**Mode switching is inexpensive:** `Depth → Simple → Narrow → Simple` does not rescan folders or alter the Simple marker, Narrow entries, Depth setting, or cloud files; editor response is immediate and native registration remains truthful.

## CURRENT / IndexedDB / JSON clarification

The owner asks why mode switching cannot simply fall back to existing CURRENT/JSON.

**Source-observed architecture in REDOWN:**
- `extension/right-click-current.js` stores logical authoritative **CURRENT** in IndexedDB (`redown-right-click-current` database, `state`, `records`, `journal`, `pointers`, `backups`).
- `extension/background.js` stores a *logical JSON snapshot* under the Chrome storage key **`right-click.json`**, including configuration revision, chosen presentation, saved destination identities and inventory. This is not proof of an independent on-disk `CURRENT.json` file.
- A missing warm in-memory snapshot should first read valid canonical IndexedDB CURRENT; a valid, identity/revision-matched JSON snapshot can help restore a missing inventory. Never promote stale snapshots over revoked authorization or a newer committed CURRENT generation.
- Simple must work immediately from **configured eligible destinations**; it does not require a complete Depth directory scan or a fully populated Level inventory.
- Narrow is derived only from configured paths plus ancestors. Depth derives from the locally cached valid discovered tree; if that cache is incomplete/invalid for the requested scope, show the known authorized configuration and a truthful refresh status, not an invented complete Depth menu.

## Source-backed performance suspects — investigate, do not assume

**REDOWN integration (observed in source, exact installed-device time not measured):**

1. `extension/beta/right-click-v3-ui.js` changes presentation optimistically, but awaits `setRightClickV3Presentation` and acknowledges after background processing.
2. `extension/background.js` calls `ensureV3Only()`, which currently reaches `restoreDurableV3()`, and uses `commitV3Current` for a presentation preference; IndexedDB's `commitPatch` performs broad reads including `getAll()`.
3. The presentation handler subsequently **awaits `rebuildMenus()`**, and a `chrome.storage.onChanged` listener can schedule another rebuild; some changes also schedule `refreshV3Inventory()`.
4. `extension/right-click-v3.js::project()` already branches to `simpleProjection()` before Depth projection, so Simple does not inherently require new remote directory discovery. Its `simpleProjection` already produces one direct Cloudflare leaf when there are no additional eligible choices.

Potential delay sources are therefore **storage restore/transaction cost, serialized update queues, duplicate native registration, background worker startup, unnecessary refresh/invalidation, UI acknowledgement or rendering**, not automatically the V3 projection itself. Instrument before fixing; preserve verified safety and authorization.

**Click2Cloud standalone compiler (source-observed computational opportunities, not proof of REDOWN latency):**
- `src/core/menu-compiler.mjs::compileMenu()` currently builds a discovered-folder ancestor set **before** branching to Simple, so Simple pays a full-folder preprocessing cost.
- Depth and Narrow currently evaluate `[...pathSet].some(p => p.startsWith(path + '/'))` for every path, which can cause quadratic child lookup with a large tree.
- Introduce/reuse a canonical pre-indexed parent/children adjacency map and normalized path lookup, and avoid full-folder work for Simple/Narrow; do not create a competing source of truth or change compiler output IDs unintentionally.

## Requested correction / acceptance contract

- [ ] Measure end-to-end **mode click → UI ready → local projection complete → native registration acknowledged** separately, for warm and cold worker/cache.
- [ ] On a valid warmed canonical snapshot, **instant visual switching** with no blocking network operation; aim for under **100 ms p95 click-to-editor response** on ordinary hardware. This is a performance target requiring measured evidence, not a claim.
- [ ] Simple and Narrow scale primarily with their **configured destination count**, not the entire Depth inventory. Avoid unnecessary full IndexedDB scans or journal/backups work for simple presentation preference changes.
- [ ] Depth uses the valid local canonical JSON/indexed folder state and obeys depth/authorization/completeness rules; no unrequested scan on every switch.
- [ ] Update only affected UI/projection/native menu entries where safe; deduplicate rebuilds, and do not block visible editor feedback on native menu registration.
- [ ] If native Chrome registration remains pending, communicate pending/applied/retry status truthfully without freezing the selector, applying stale menu generations or allowing an old mode's action IDs to save.
- [ ] Test **Depth → Simple → Narrow → Depth** repeatedly on a warm populated tree and on cold worker start; prove no unexpected cloud reads on warm transitions and preserve independent saved mode configurations.
- [ ] Test **only `redown` active** → exactly one direct actionable `REDOWN → Cloudflare` leaf to its root; **Simple-marked non-root location** → same flat leaf routes to the selected exact path; **multiple Narrow destinations** → labeled nested choices; changing Simple marker preserves Narrow/Depth and never silently redirects across accounts.
- [ ] Test thousands of indexed folders, large configured route sets, malformed/stale/revoked snapshots, simultaneous settings windows, crashes/restarts, and menu registration failures; no false success.
- [ ] Produce reproducible trace/benchmarks and root-cause explanation **before** changing engine internals. No copy/paste alternate compiler, new engine, broad refactor or blanket cache invalidation.

**One-line contract:** Once CURRENT is populated and authorized, switching Simple/Narrow/Depth is an inexpensive local projection. **Simple = select one authorized location, assign the Simple marker, then `REDOWN → Cloudflare` saves directly there with no submenu (default: authorized `redown` root). Narrow = manually configured labeled nesting for multiple routes. Depth = cached indexed folder hierarchy.**

**This file is a NEED_TO_DO note, not a Codex implementation command, and changes no application code.**
