# NEXT CODEX — Extend the existing API with command/shortcut metadata and publish a complete API Command Reference

**Requested:** November 19, 2026  
**Status:** IMPLEMENTATION REQUEST for next Codex, **not yet implemented or documented**.  
**Rule:** Extend the EXISTING versioned Click2Cloud V3+1.1 API and its `toolRegistry`. Do **not** create a parallel public API, permission model, dispatcher, or competing command catalog. Work on an isolated branch. No live Cloudflare operations or ReDown edits.

## Developer experience and architecture

Click2Cloud is meant to be pleasant to build on. A programmer should be able to expose a shortcut for any **eligible operation of the existing API** without a one-off DOM key handler. Treat the internal structure as a **Command and Shortcut Extension to the existing API**, consisting of *command metadata on canonical operations* and *one shortcut-binding resolver*. Settings is a GUI client of it, not the owner of command semantics.

In `src/api/service.mjs`, `toolRegistry` currently derives from versioned `definitions`, includes method name, scope, input/output schemas and effectful flag, and is exposed through `describeCapabilities`. The baseline inspected on November 19 has **70 declared methods: 62 main definitions + 8 menu-manifest definitions**, to be **recounted at the Codex run's actual HEAD**. These are not 70 separate APIs. `src/api/client.mjs`, `src/api/gateway.mjs`, and the File API are existing adapters/lower-level contracts, not replacements for the canonical host API.

### Requirements

1. Extend each eligible canonical API operation's registry descriptor with optional stable `commandId`, category/label, availability/context (Explorer, selected file, destination, active account, etc.), parameter binding constraints, permissions, potential effects, recommended default chord, `shortcutEligible`, and optional documentation description. Not every API method needs a default binding. Support future operations by metadata registration, not repeated Settings rewiring.
2. Permit presentation-only actions such as toolbar row toggle, reset panels 50/50, or focus Search via a **small trusted UI command adapter using the same logical catalog**. Avoid routing DOM state through cloud Workers or fabricating cloud API methods. Local UI actions should be visibly distinguished from API methods in generated documentation.
3. Where programmable management is needed, add a **small number of versioned methods inside the existing API** (illustratively `listCommands`, `getShortcutBindings`, `setShortcutBinding`, `resetShortcutBindings`). Reuse existing schemas, authentication, authorization, trusted sender checks and persistence. Do not expose an unauthenticated `shortcutServer` or arbitrary JavaScript/code invocation.
4. One shared shortcut resolver handles key-chord normalization, scope, user-chosen remapping, no duplicate bindings, safe reserved-key validation, IME/typing/dialog exclusion, atomic persistence, recovery on malformed storage, and immediate updates to open Shelf instances. Keep the existing F8/F9 behaviors by default, add the planned F7 Search pop-out as a user-remappable eligible action once implemented.
5. Dangerous/effectful commands (delete, overwrite, move, public access, Worker deployment, remote writes) **never bypass** the underlying API's contextual authorization, explicit consent, validation, idempotency, conflict policy, receipts or confirmation. Require valid actual account/bucket/target parameters; never silently select an arbitrary Default or auto-start a dangerous action on a shortcut. A developer may register shortcuts only against trusted named operation descriptors.
6. Future **Screenshot to Cloud** is an example of extensibility: when a separately authorized screenshot-capture function exists, it should get shortcut support from its existing API descriptor. **Do not implement screenshot capture/upload under this task.** Support future command palette/toolbar/automation trigger adapters without building those now.
7. The **Keyboard Shortcuts card at the VERY BOTTOM of ordinary Settings**, including Debug OFF, is only the GUI editor of this same registry. Show actual effective bindings and command availability, allow Change, Restore Defaults, cancellation and feedback. Keep "Toggle one or two toolbar rows" and "Reset panels to 50/50" **out of Explorer More entirely**. See [Settings UX issue](../Issues_and_Bugs/Issues/P1_USER_EDITABLE_KEYBOARD_SHORTCUTS_IN_SETTINGS_2026-11-19.md).
8. Keep focus-local Shelf shortcuts distinct from global Chrome hotkeys; future global shortcuts would require a separate `chrome.commands` integration **through the same command identity**, not a second API authority.

## MANDATORY FINISHED DOCUMENTATION ARTIFACT — 100% API method coverage

**Codex MUST CREATE and commit** the finished **`docs/api/API-COMMAND-REFERENCE.md`** on its implementation branch, *after the approved API and experimental feature changes are finalized*, so that the inventory reflects the **actual final HEAD**, not an earlier snapshot. The document must be useful to a public developer evaluating the API.

- Generate/discover the authoritative **complete set of exported V3+1.1 API methods from `toolRegistry` / `describeCapabilities`**. Cover **EVERY** callable method at the final HEAD: the current 70 baseline plus any legitimately added methods; do not assume the count remains 70. **One separately indexed entry per method** and a reproducible total by scope and category.
- For **each** method include: **exact name**, several clear non-repetitive plain-English sentences explaining *what it does, when to use it, its effect/limitations*, relevant parameter/input schema or concise signature (required/optional), returns and states, permission/actor scope, potential destructive/chargeable effect, current implementation status, and a concise validated call example where appropriate. Mention pagination, consistency, idempotency, receipt and confirmation caveats when relevant. Include links to source files for complex behaviors; avoid blanket generic descriptions.
- Explain the API's existing architecture and invocation model at the front: version, trusted-local transport, public-exposure limitations, authentication/permission checks and local client/gateway, ordinary provider File API vs host operations, Chrome extension contexts, and how to discover capabilities; do not imply a public HTTP API exists if it doesn't.
- Separately document **non-API UI commands** (toolbar rows, 50/50 split, filename Search pop-out) in a **Shortcut & UI Commands** appendix. Do not falsely count these as network/host API methods. Explain how third-party developers can make an eligible method shortcut-capable and how user Settings remaps it.
- Distinguish **implemented, experimental/flagged, future and unsupported** functions, explicitly noting screenshot-to-cloud as **future only** until it exists. Mark exact provider/Worker constraints rather than pretending all advertised operations are independently live-verified.
- Organize by sections such as Connection/Authentication, Remotes & Cloudflare, File Explorer and Metadata, Filename Search/IndexedDB, Destinations & Menus, Saves/Receipts/History, Backup/Recovery, Settings & Appearance, Operations/Provisioning, Introspection/Diagnostics, Manifest Import/Export, and Experimental. Use a linked table of contents, readable markdown tables and fully searchable headings. Include a compact quick-start with **read-only** sample calls.
- Do **not** publish OAuth tokens, secrets, user account IDs, raw signed URLs, saved diagnostic payloads or production endpoints in examples. Never insert invented successes, capabilities or response fields.
- Include documentation provenance: generated from commit SHA, API version, snapshot timestamp, count, and test results. A small generator may produce the inventory/schemas but **human-readable sentences require deliberate implementation-level review**, not a generic auto-generated one-liner masquerading as thorough documentation.

### Documentation regression/coverage test is required

Implement a test or script, e.g. `scripts/check-api-command-docs.mjs`, that reads the canonical registry and the documentation's explicit machine-readable method identifiers, validates:

1. **Exact set equality:** every actual API method is documented once, no missing/extra names, no accidental duplicate entries, accurate total.
2. API vs UI-only command classification is correct, and all eligible commands are represented in the binding catalog.
3. The doc records permission scope, input requirements, effectfulness and status for each method and catches stale registry changes.
4. At least lightweight editorial completeness validation: method descriptions are multiple meaningful sentences and not identical boilerplate; actionable examples have no credentials and use actual method signatures. Human source review still required.
5. Build, focused tests and full regression suite pass, or report failures honestly.

**Deliverables:** committed registry/shortcut implementation where authorized, **complete and verified developer API Command Reference document**, coverage-check script/tests, final method total, doc path, exact commit SHA, and explicit gaps. **No placeholder document and no "we will document later" acceptance.**

## Separate user-requested Remotes branding change (UI task)

On Remotes, make **"The Future is Now. True Remote is Here."** the **largest hero headline**. Use **"Nothing ever gets downloaded to your computer."** as its subtitle, with correct spelling and readable responsive wrapping. The existing **"Your clouds, one place."** must no longer compete as the larger heading: remove it from that visual hierarchy or place it as a smaller eyebrow if appropriate. `extension/app.mjs` currently renders `<h1>Your clouds, one place.</h1>` and a `minimal-only remotes-tagline` containing the tagline; adjust hierarchy and presentation consistently in supported aesthetics. Preserve truthful distinction between direct remote saves and any optional explicit user-selected local actions and do not hide Cloudflare setup/cost consent. See the main [next-Codex UX task](CODEX_NEXT_EXPLORER_SEARCH_UI_AND_WORKER_IMPLEMENTATION_2026-11-18.md).

## Stop conditions

Only Click2Cloud; no production mutations, OAuth changes, source of truth duplication, ReDown changes or launch of a new public API stack. Reuse the existing registry/permissions. Mark independently unverified provider behavior rather than promising it works.
