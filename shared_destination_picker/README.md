# One tree picker, two isolated destination intents

**Owner clarification, 2026-11-03.** The **cloud's whole navigable hierarchy appears in the destination SETUP/Explorer picker**. It does **not** mean the Simple Chrome right-click menu displays that hierarchy. The tree is read through a **neutral authorized provider listing adapter**—not via Depth's private index, cache, scan journal, or menu code.

## Exact interaction

1. User opens a visual cloud tree: `redown ▸ Photos ▸ Weddings ▸ 2026`.
2. Every folder / bucket has a selectable **circle**. Clicking the circle on `2026` selects **that precise account, bucket and full prefix**, not an inferred label. This opens a compact popup adjacent to that selected location.
3. Popup has just **Simple | Narrow**, an optional **Menu title** input (blank defaults to lowest folder name; at bucket root, bucket name), a small preview and **Add / Cancel**. Users can type the bucket name explicitly as a custom title; do not show a separate label-source chooser in the UI.
4. Popup chooses the **new entry's mode: Simple or Narrow**, defaulting to the currently active Simple/Narrow editor tab, with a live preview. A Narrow choice from the Simple editor saves a Narrow entry **without changing the currently active native menu**.
5. **Simple** stores only its own `{destinationId, provider/account/bucket, prefix, menuLabel}` and projects ONE flat shortcut (e.g. `REDOWN → Cloudflare → Wedding Archive`).
6. **Narrow** (future rewrite) stores its own independent selected route and expresses `REDOWN → Cloudflare → redown → Photos → Weddings → Wedding Archive`. When the label is not custom, use final actual folder `2026`. The prefix remains exactly `Photos/Weddings/2026`.
7. Two destinations may have the **same exact cloud path AND identical visible label**. Save both with distinct immutable IDs. No blocking duplicate-confirmation popup in this minimal Add flow; every entry can be individually renamed or deleted under **Existing Destinations**.

### Data flow boundary

```text
Neutral provider folder listing → Setup Tree Picker → neutral LocationSelectionIntent
   ├── choice Simple → Simple-only persistence + Simple projector
   └── choice Narrow → future Narrow-only persistence + Narrow projector
Both finished plans (never their internal configs) → neutral menu registry
```

The picker has **no imports of Simple, Narrow, Depth, or Time Machine**. The neutral selection event is delivered only to the chosen mode handler through a boundary. A successful Simple save NEVER writes Narrow settings and a Narrow selection NEVER changes Simple config. If the chosen mode is not the currently active mode, save the selection into that mode's configuration and offer an **explicit switch**; do not silently change the global selected mode.

The code in `shared_destination_picker/` is a **pure intent model and tests**, not a live UI or a rebuilt Narrow engine.

## The optional-bucket rule

At first valid R2 activation, Simple includes verified bucket roots automatically (with `redown` as protected default). Other buckets and manually selected folders are optional checkbox/circle destinations. Once the user **unchecks all optional destinations**, the only remaining Cloudflare Simple action is **one flat Cloudflare leaf saving to `redown/`**. From then on **nothing rechecks itself**: user must manually recheck each desired bucket or chosen path. A newly discovered bucket stays unselected. The initial automatic discovery behavior is only for a user who has not deliberately opted out.

A circle selecting a location opens the same minimal popup whether empty or already checked. The navigator only shows **empty ○ or checked ✓**, never counts. Clicking a checked circle can add another alias; **only Existing Destinations** can remove or rename an individual alias. A temporary checked appearance during an open popup does not persist until Add succeeds; Cancel restores the previous circle appearance.
