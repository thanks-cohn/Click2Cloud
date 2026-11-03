# One tree picker, two isolated destination intents

**Owner clarification, 2026-11-03.** The **cloud's whole navigable hierarchy appears in the destination SETUP/Explorer picker**. It does **not** mean the Simple Chrome right-click menu displays that hierarchy. The tree is read through a **neutral authorized provider listing adapter**—not via Depth's private index, cache, scan journal, or menu code.

## Exact interaction

1. User opens a visual cloud tree: `redown ▸ Photos ▸ Weddings ▸ 2026`.
2. Every folder / bucket has a selectable **circle**. Clicking the circle on `2026` selects **that precise account, bucket and full prefix**, not an inferred label. This opens a compact popup adjacent to that selected location.
3. Popup offers label choices: **Use default** (lowest directory name `2026`; if root, `redown`), **Use bucket name** (`redown`), or **Custom menu title** (text input, e.g. `Wedding Archive`).
4. Popup asks the intended **presentation mode: Simple or Narrow**. Default to Simple for an ordinary flat shortcut; Narrow deliberately includes the complete parent chain. Show a live preview *before* committing.
5. **Simple** stores only its own `{destinationId, provider/account/bucket, prefix, menuLabel}` and projects ONE flat shortcut (e.g. `REDOWN → Cloudflare → Wedding Archive`).
6. **Narrow** (future rewrite) stores its own independent selected route and expresses `REDOWN → Cloudflare → redown → Photos → Weddings → Wedding Archive`. When the label is not custom, use final actual folder `2026`. The prefix remains exactly `Photos/Weddings/2026`.
7. If another destination already uses the same displayed label, ask **Already exists—use anyway? Yes/No**, without rewriting identity or silently deduplicating. Account scope matters. Yes permits an intentional duplicate label, with unique internal menu IDs; No returns to label editor.

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

A circle selecting a location should bring up the above popup, not silently toggle two modes. If the circle is currently checked, allow user to uncheck the destination via a clear separate action/checkbox without deleting cloud content. Keep the selected tree nodes visible for later manual rechecking.
