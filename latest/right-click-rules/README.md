# Click2Cloud — Latest Right-Click Rules

## Engine implementation and API traceability

For a source-verified explanation of the **actual current right-click engine**, every menu configuration control's corresponding trusted API operation, state changes, Chrome registration pipeline and the documentation/test contract, see **[`ENGINE-AND-API-DOCUMENTATION.md`](ENGINE-AND-API-DOCUMENTATION.md)**.

This rules document describes the *desired* Quick Select/Cloudflare behavior. The engine/API document marks current behavior separately so a new engineer or Codex does not mistake an approved rule for implemented and tested behavior.


**Owner-approved design clarification — November 7, 2026**  
**Status:** Normative owner rule. Implemented in restoration source `9e8a16d` with local and browser-fixture evidence; installed Chrome rendering remains BLOCKED. This document alone is not proof.
**Scope:** Cloudflare default destination, Quick Select, and native Chrome menu placement.

## 1. Primary rule — Quick Select does not force Cloudflare to nest

**When the user has two assigned Cloudflare destinations and ONE is selected as Quick Select, Cloudflare should remain a FLAT direct-save entry to the default destination; the other should appear as a separate Quick Select leaf beside the ordinary provider entries.**

The user expects a normal right-click save with **Cloudflare** to go straight to their **Default** (for example, the `redown` bucket root), without requiring another submenu hover. Quick Select should **promote** a selected destination out of the ordinary Cloudflare destination list instead of leaving an unnecessary duplicate in the Cloudflare submenu.

Chrome can group all extension-owned entries under **Click2Cloud**. It is acceptable for the Quick Select entry to appear as a sibling of Google Drive, Dropbox, OneDrive and Cloudflare **within that Click2Cloud grouping**. It need not be a separate top-level Chrome extension grouping.

### Exact illustrated case

Configured:
- `redown` — Cloudflare R2 bucket, Default = YES, Quick Select = NO.
- `4chan` — Cloudflare R2 bucket, Default = NO, Quick Select = YES.

**Desired Chrome menu:**

```text
Click2Cloud >
  Google Drive
  Dropbox
  OneDrive
  Cloudflare           [DIRECT SAVE -> redown]
  4chan                [QUICK SELECT -> 4chan]
```

Not:

```text
Click2Cloud >
  4chan
  Google Drive
  Dropbox
  OneDrive
  Cloudflare >
    redown
    4chan               [DUPLICATE]
```

Cloudflare must not turn into a submenu merely because `4chan` is assigned as Quick Select.

## 2. Precise logical distinction

- **Assigned/configured destination:** A destination retained in the user's settings.
- **Default destination:** The intended direct-save target when the user selects the single **Cloudflare** provider leaf in the flat presentation.
- **Quick Select destination:** An independently displayed direct-save shortcut, normally a sibling of the provider entries in the extension-owned menu.
- **Destinations remaining under Cloudflare:** The unique Default target, if available/applicable, **plus** the other active, non-hidden, non-Quick destinations that still require presentation there.

**Count only destinations that remain under Cloudflare when deciding whether Cloudflare should be a submenu.** Do not count Quick Select shortcuts a second time as if they still require a Cloudflare child. Do not count discovered-but-unassigned buckets, duplicate mode projections, or invisible/disabled presentations as extra destination choices.

The Default remains reachable through the canonical Cloudflare leaf, even if a user also enables Quick Select on that same destination. Avoid automatically showing a redundant shortcut to the identical Default; preserve the stored preference and present an intelligible user choice instead of silently deleting data.

### Decision table

| Configured destinations | Desired Cloudflare presentation | Quick sibling |
| --- | --- | --- |
| `redown` only (Default) | Flat **Cloudflare → redown** | None |
| `redown` (Default) + `4chan` (Quick) | Flat **Cloudflare → redown** | **4chan** |
| `redown` (Default) + `4chan` (not Quick) | **Cloudflare → {redown, 4chan}** submenu | None |
| `redown` (Default) + `4chan` (Quick) + `Photos` (not Quick) | **Cloudflare → {redown, Photos}** submenu | **4chan** |
| `redown` (Default and Quick) + `4chan` (not Quick) | **Cloudflare → {redown, 4chan}**; default remains included | Avoid redundant `redown` Quick by default |
| All non-default assigned destinations are Quick | Flat Cloudflare → Default | Separate Quick leaves |
| User explicitly removed Default/last assignment | Follow existing 0-destination/remaining-destination and deletion rules; never silently recreate `redown` | Quick presentation alone must not restore deleted assignments |

**Availability is not a shortcut to false success.** A saved Quick item that requires setup (e.g. `4chan · Set up`) may continue to display the actual setup state, but it must never claim to have saved a file. Menu layout and provider readiness must be evaluated separately and truthfully.

## 3. Historical defect before restoration

As audited on Click2Cloud main around commit `9dfe415`:

- `src/modes/simple/index.mjs`: a configured Simple destination projects a normal save row and retains `quick: destination.quick === true`.
- `src/core/menu-spec.mjs` (composite compiler): unique Cloudflare destination candidates are collected as `active`; Quick Select destinations are additionally added as root-level rows. The compiler then uses **`active.length === 1`** for a flat Cloudflare leaf; otherwise it creates a Cloudflare submenu using **all** active destinations. Thus a Quick destination can appear **twice**.
- `extension/app.mjs`: the manager's Quick Select action sets the destination's `quick` property through `updateDestination`, but does not remove it from the normal assigned destination list.
- `src/chrome/registrar.mjs`: registers the structure produced by the canonical menu specification, using `parentId`; Chrome is not independently inventing the repeated Cloudflare child.
- `src/core/menu-compiler.mjs` is a separately present pure compiler; identify its actual production usage before altering anything. Do **not** create another menu owner to address this.

This duplication is the **current intended composition of two existing rules**, but **not the owner's desired combined outcome**. Treat it as a **product rule collision**, not evidence of the user choosing the wrong options or of stale Chrome context-menu entries.

## 4. Required behavioral and API parity

Implement through **the existing single compiler/registrar/resolver and trusted V3+1 API**, not a second engine. The GUI, native menu, state store and programmatic API must agree on:
- Which destination is Default.
- Which destination is Quick Select.
- Which exact target is invoked by every visible leaf.
- Which entries remain inside Cloudflare.
- Why Cloudflare is flat or nested.
- What happens if the user removes, hides, disables, changes the Default, or changes Quick Select status.

Configuration and preview APIs should expose the same computed menu topology that Chrome registers. Verify programmatic changes appear in Chrome and GUI state, and GUI changes appear in API readback. Preserve one source of truth and deterministic routing decisions for fixed inputs/state; do not mistake external cloud availability for a deterministic outcome.

**Do not change the main functional goal:** Click2Cloud must retain REDOWN-equivalent working right-click saves. No phantom success. Existing provider, OAuth, cloud-resource consent and default-deletion invariants remain authoritative unless explicitly superseded here.

## 5. Required acceptance tests

1. `redown` Default + `4chan` Quick => **flat Cloudflare → redown** and a distinct **4chan** Quick leaf beside providers. No `4chan` under Cloudflare.
2. Toggle Quick OFF for `4chan` => Cloudflare changes to a submenu with `redown` and `4chan`; the former Quick leaf disappears.
3. Add `Photos` non-Quick while `4chan` stays Quick => Cloudflare submenus only `redown` and `Photos`; `4chan` stays a Quick sibling.
4. Toggle Quick ON for `Photos` => Cloudflare returns flat to `redown`; `Photos` and `4chan` are independently addressable Quick leaves.
5. Toggle Quick on the Default `redown` => Default remains directly accessible via Cloudflare, without accidental duplicate/default switching. Document the deliberate redundant-shortcut handling.
6. Every leaf resolves to the correct account/bucket/prefix; no menu IDs or label collisions; no ghost menu entries after native rebuild, extension restart or preference update.
7. Hidden, removed, unavailable, or unassigned destinations do not accidentally cause Cloudflare to nest or to recreate an intentionally removed default. Setup-pending entries display honest readiness/attention.
8. Test both **`previewNativeMenu`/native ACK** and **actual installed Chrome rendering**. Fixture preview is not real Chrome proof.
9. Programmatic changes and GUI changes yield identical persistent state and menu topology, including after restart.
10. Successful saves require actual independent provider confirmation; blocked Quick/setup actions cannot increment counters, claim SUCCESS or create a false GO TO.

## 6. Consumer control, not forced simplification

**Do not impose an arbitrary numerical limit on Quick Select shortcuts.** Let users choose shortcuts. Keep the destination manager's capabilities (Simple/Narrow/Depth, rename, default, visibility, remove, provider assignment and API parity) intact. A user may intentionally choose an expanded/nested presentation where supported; that must be clear, explicit and testable rather than an accidental side effect of Quick Select.

The goal is **directness without hiding functionality**: Cloudflare ordinarily saves to the Default; extra Quick shortcuts are sibling actions; Cloudflare nests only when more than one destination still needs to live underneath it.

## 7. Change controls

**This document is documentation-only and does NOT authorize the present assistant to change source, configuration, user selections, Chrome registration, Cloudflare Workers, or R2.** A subsequent Codex implementation must audit the latest source, preserve a pre-change behavior map in `11.2026/workings/right-click-workings.json`, implement the necessary actual fix, test the matrix above, and update the CURRENT map and evidence as required by the master contract. Do not modify REDOWN. Do not silently deploy production resources.

**OWNER RULE:** Quick Select is an alternative menu placement. **`redown` Default + `4chan` Quick means FLAT Cloudflare → `redown`, plus `4chan` as a separate Quick leaf.** No unnecessary duplicate. No forced submenu. No lost capability. NO BLOAT.
