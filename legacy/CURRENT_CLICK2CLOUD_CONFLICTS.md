# Current Click2Cloud prototype conflicts with the latest V3+1 contracts

**This is a new-repository code/proposal gap, not a historical REDOWN V3 regression.** It was identified while comparing current Click2Cloud files against the author's latest manager and independent-engine decisions. It belongs in `/legacy` because it is a dangerous **carryover of early design assumptions** that Codex might otherwise preserve.

## Exact source conflict matrix

| Current source (new Click2Cloud) | What it actually does | Latest owner decision / fix |
|---|---|---|
| [`src/core/menu-compiler.mjs`](../src/core/menu-compiler.mjs), `add()` | Throws `Sibling label collision` for two entries sharing one parent+title | **Two entries with identical visible titles may coexist** when they have separate immutable action IDs. Preserve both actions and exact routes |
| Same file, `Narrow selected Map` | Throws `Duplicate configured Narrow path` | **Multiple destination entries may target the same exact folder** in one mode; coalesce navigational ancestors but emit distinct independently addressable save leaves |
| Same file, `checkDestination()` | Rejects a selected prefix not currently in a single submitted discovered-folder Set | A valid authorized user-selected location may be stale/partially enumerated. Distinguish `not authorized`, `unverified/stale` and `invalid syntax`; never invent existence nor erase a previously valid selection because listing was partial |
| Same file, `simple` sort | Sorts by visible menu label and path | Preserve explicit user order, plus owner-defined initial `redown`-first bucket defaults; renaming a title must not unexpectedly reorder a user's menu |
| Same file, `stableId` for Narrow | Derives action identity from exact bucket+path | **Destination ID must be the immutable saved record ID**, not a hash of path. Same path/label may have multiple distinct saved actions |
| Same file, root Cloudflare container | Always renders `Cloudflare R2` as a submenu in an early standalone compiler | New Simple Cloudflare is **one flat setup/login or default-save leaf** until login/R2 eligibility and multiple actually selected destinations make a submenu useful |
| [`README.md`](../README.md) | Calls the early prototype fully functional, uses “one canonical configuration/shared canonical tree”, and says duplicate canonical destinations / sibling label collisions should be rejected | New modular proposed design uses **independent per-mode configs and separate Depth inventory**; distinguish existing prototype functions from unimplemented browser/R2 integration |
| [`src/registry/mode-registry.mjs`](../src/registry/mode-registry.mjs) | Exposes Simple/Depth but explicitly reserves Narrow for a later rewrite | Correct **current status**, not a released three-mode registry. Native Narrow acceptance remains OPEN |
| [`shared_destination_picker/src/location-picker-intent.mjs`](../shared_destination_picker/src/location-picker-intent.mjs) | Old helper emits `requiresDuplicateConfirmation` for same visible title | Owner's latest **tiny popup** has Simple/Narrow, optional title, preview and Add/Cancel; no blocking additional duplicate-title confirmation. Retire or adapt helper before wiring UI |

## Implementation action, not automatic changes

- Keep the original early compiler/tests as a historical baseline or refactor them **only in a focused Codex implementation task** after new mode-specific compiler tests exist.
- Replace de-duplication by path/title with unique immutable `destinationId` and native namespaced action IDs. Validate duplicate **IDs** strictly, but never reject intended duplicate target/title aliases.
- Keep separate config revision CAS for Simple/Narrow; preserve the latest selected mode and native registrar receipt through asynchronous edits.
- Distinguish concrete working **reference models** (`destination_manager/src`, `simple/original_proposition/src`, `assisted_proposal/depth/src`) from a real installed Chrome extension or provider implementation.
- Execute side-by-side golden fixture tests: original compiler old shape vs new intentional duplicate/leaf/branch behavior; do not silently edit prior assertions into green.

**This document changes no executable compiler or released menu.** It is explicitly an implementation warning to stop accidental revival of superseded semantics.
