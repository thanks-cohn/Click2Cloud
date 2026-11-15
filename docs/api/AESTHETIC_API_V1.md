# Aesthetic API 1.0 — implemented contract

An aesthetic changes how Click2Cloud looks, never how it works. This module is independent of the privileged engine API `3+1.1`. Standard and High Polish use the same host. Standard removes all aesthetic variables and restores the pre-existing stylesheet. High Polish is the first declarative package, not a second theme engine. Light/Dark remains the existing independent product preference.

Source: `src/aesthetic/host.mjs`, `src/aesthetic/packages.mjs`, trusted adapter `extension/aesthetic.css`. Settings → Appearance → High Polish Mode calls `host.apply({id})` directly, without invoking engine methods, reloading pages, re-registering menus or restarting jobs. The existing gallery/History loading selection is independent.

## Actual JavaScript exports

```js
import {createAestheticHost, validateAesthetic, AESTHETIC_API_VERSION,
        AESTHETIC_PREFERENCE_KEY, tokenTypes} from './src/aesthetic/host.mjs';
const host = createAestheticHost({root: document.documentElement,
                                storage: chrome.storage.local});
await host.restore();
host.validate(manifest);                 // {valid, errors: string[]}
host.register(manifest);                 // same result; copies inert data
await host.apply({id:'high-polish'});      // default persist:true
host.getActive();                        // {apiVersion,id,version,error}
await host.resetToStandard();            // apply standard, persist selection
await host.apply({id:'standard',persist:false}); // session only
```

Only trusted application code instantiates the host with a DOM root and storage adapter (`get(key)` / `set(object)` promises). The package receives neither. Registration validates before cloning; duplicate IDs return `PACKAGE_ALREADY_REGISTERED`. Registration failure leaves the active visual intact. Applying an unknown ID falls back to Standard and returns `PACKAGE_UNAVAILABLE`. Incompatible manifests cannot enter the registry. Reset/apply removes every prior host-owned CSS variable before applying the new selection. No style elements, observers, RAF, network, Blob URLs or per-toggle listeners are allocated.

`restore()` reads `aestheticPreferenceV1: {schemaVersion:1,id}` from extension-local storage, separately from CURRENT, credentials and animation media. Absent preference means Standard. Invalid/future/missing packages fall back without overwriting the saved preference. A newer user choice wins over a delayed restore. Writes are serialized; `PREFERENCE_WRITE_FAILED` leaves the selected appearance active for the session and reports the persistence failure. Read failure returns Standard with `PREFERENCE_READ_FAILED`. No migration of existing engine data is performed. Future storage schemas require an explicit migration; v1 never guesses at unknown schemas.

## Package manifest and validation

See `aesthetic-high-polish.example.json` (the actual built-in manifest) and `AESTHETIC_PACKAGE_V1.schema.json`. Fields: `schemaVersion:1`, lowercase safe `id` (≤48 characters), `name` (1–80 characters), semver `version`, exact `compatibleApiVersion:"1.0"`, `tokens`. Unknown fields and token names are rejected. The runtime validator is authoritative, including numeric bounds. Package versions identify content; API compatibility is deliberately exact in v1.

DTCG-style flat semantic token names use `{$type,$value}`. These are a bounded interoperable subset, not a claim to implement the whole DTCG standard. `tokenTypes` exports the complete inventory:

| Category | Tokens | Accepted values |
| --- | --- | --- |
| color | background, surface, raised, text, muted, border, accent, selection, focus | `$type:"color"`, `$value:{light,dark}` with 6/8-digit hex colors |
| typography | family, size | `fontFamily`: bounded literal family list; `dimension`: 12–48px |
| spacing | unit, page, card | `dimension`: 0–48px |
| geometry | control, surface, overlay | `dimension`: 0–48px |
| elevation | overlay | `shadow`: `0 Npx Npx #RRGGBBAA` (N 0–99) |
| motion | feedback | `duration`: integer 0–200ms |
| state | disabled | `number`: 0.4–1 |

Full names include the category (`color.text`, `geometry.control`). Missing non-Standard tokens receive the trusted High Polish defaults so a partial package cannot accidentally leave unresolved color variables. CSS names map dots to hyphens under `--a-`, e.g. `--a-geometry-control`, `--a-color-text-light`. Core surface aliases (`--panel`, etc.) are mapped by the adapter according to `data-theme`. Switching changes only host-owned variables and `data-aesthetic`. The Standard package has no tokens.

## Semantic adapter inventory and limits

The trusted stylesheet maps tokens to existing semantic markup: application header/nav/footer; `.page`, `.card`, headings; labels/forms/buttons and focus/disabled/hover; Remotes connection cards; Explorer toolbar/address/tree/table/grid; `#context`, `#toolbar-overflow`, header menu; `dialog`, `.dialog-head/body/foot`; gallery controls/frame; `.history-page/row/line/status/preview`; Settings, recovery/manifest and diagnostics controls. Source identity/status text, ordering, command authority, row heights used by virtualization, saved splitter geometry and native menus remain owned by their existing modules. History status dots keep their established semantic colors. No aesthetic owns image read scheduling or `mountLoadingVisual`.

All aesthetic selectors are scoped under the active non-Standard root. The sheet follows existing unlayered CSS deliberately (putting it in a lower-priority CSS layer would lose to the baseline). It never changes `display` of functional controls, pointer authority, z-index/overlay ownership, focusability, command order or cloud state. `prefers-reduced-motion` uses the baseline's important rule. Surface colors switch immediately to avoid transient contrast loss; only border feedback transitions. The overlay fix belongs to `explorer-layout.mjs` and works in both modes.

## Isolation / public extension points

Packages are JSON data: no executable JS, raw CSS, URLs, assets, arbitrary selectors/properties, storage, extension APIs, file handles or network. Registering data does not grant capabilities. This run ships only built-ins: no public install/import/marketplace or plugin execution. A future product can compile a vetted semantic adapter against a new compatible API; it cannot pass arbitrary CSS to this host. Expanding token types or semantic hooks requires compatibility review and tests. The bounded v1 token adapter intentionally cannot express every future aesthetic by itself.

Tests: `node --test tests/aesthetic.test.mjs`, `node scripts/test-aesthetic-browser.mjs`, plus the complete existing test suite and shared History/Explorer browser checks. Visual quality is a design review with screenshots, not something unit tests can certify. See `docs/evidence/explorer-aesthetic-foundation/` for evidence and explicit environment blockers.
