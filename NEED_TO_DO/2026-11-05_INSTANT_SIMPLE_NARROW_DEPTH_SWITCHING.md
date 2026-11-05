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

## Nonnegotiable Simple menu rules

**Important: Simple may expose multiple configured options.** Do not forcibly restrict it to a single destination.

**Default when only the `redown` bucket/root is active and no other Simple destination is configured:**

```text
REDOWN
└── Cloudflare         [direct actionable save to authorized redown bucket root]
```

- **Cloudflare is one flat/direct leaf**, not an empty wrapper or another nested menu.
- Do not insert an unnecessary `redown` child, a redundant `Home` item, extra setup rows, or a second submenu merely to save to the root.
- The save target must be the actual authorized `redown` bucket root. Do not confuse visible menu labels with cloud path/identity.
- If the user has explicitly configured **additional eligible Simple destinations**, expose those choices using each saved **Menu Label**, retaining the user-intended destinations, collision rules, and correct action routing. A Cloudflare submenu may then be justified to list the multiple choices; do **not** collapse those choices into one or invent intermediate nested folder layers.
- Keep the separate Google Drive, Dropbox and OneDrive provider rows flat; changes to Cloudflare's mode must not alter their own branches.

**Illustrative multiple-option case (only when configuration warrants it):**

```text
REDOWN
└── Cloudflare
    ├── [User's configured Menu Label A]
    ├── [User's configured Menu Label B]
    └── [Default redown root / Home when legitimately offered]
```

The single-destination default and configured multi-destination case must both be covered by regression tests. The exact placement of authorized extra actions should honor existing V3 native-menu constraints and established behavior, without duplicate save routes.

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
- [ ] Test **only `redown` active** → exactly one direct actionable `REDOWN → Cloudflare` leaf; test **multiple Simple destinations** → correct saved Menu Labels, no gratuitous folder nesting, and verified exact destination routing.
- [ ] Test thousands of indexed folders, large configured route sets, malformed/stale/revoked snapshots, simultaneous settings windows, crashes/restarts, and menu registration failures; no false success.
- [ ] Produce reproducible trace/benchmarks and root-cause explanation **before** changing engine internals. No copy/paste alternate compiler, new engine, broad refactor or blanket cache invalidation.

**One-line contract:** Once CURRENT is populated and authorized, switching Simple/Narrow/Depth is an inexpensive local projection. **Only `redown` active = direct `REDOWN → Cloudflare` leaf. Extra explicitly configured Simple destinations = properly labeled, actionable choices.**

**This file is a NEED_TO_DO note, not a Codex implementation command, and changes no application code.**
