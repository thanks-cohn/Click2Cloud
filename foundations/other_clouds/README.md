# Other clouds — right-click and minimal login diagrams

**NOVEMBER 7 MASTER PRECEDENCE:** [docs/CODEX_MASTER_2026-11-07_SINGLE_ENGINE_REDOWN_PARITY_AND_WORKINGS.md](../../docs/CODEX_MASTER_2026-11-07_SINGLE_ENGINE_REDOWN_PARITY_AND_WORKINGS.md) is the current source of desired behavior and [11.2026/workings/right-click-workings.json](../../11.2026/workings/right-click-workings.json) is the incomplete source-grounded actual-behavior bootstrap Codex must complete before refactoring. Older details here are historical when inconsistent: no automatic R2 activation/checkout website navigation or cloud actions if R2 is inactive/unknown; new user with active R2 gets one approved reuse-or-create redown setup and subsequent direct saves. The four-provider native menu rules and permanent redown deletion are unchanged. Use one current V3+1 engine and the existing trusted API.

**FINAL November 7 owner presentation rule:** [Master contract Sections 5/5A](../../docs/CODEX_MASTER_2026-11-07_SINGLE_ENGINE_REDOWN_PARITY_AND_WORKINGS.md) supersede the earlier popup-first description. When an unconnected provider is selected and Settings auto-attention is ON, open the **single REDOWN-style Shelf** with that provider's Log in button; user action begins real provider OAuth. OFF or Chrome Shelf-opening failure → an appropriate provider-specific notification. **No parallel popup login system**, no fake implemented provider adapters, and no changes to independent native menu visibility.

## Diagram 1 — Google Drive, Dropbox and OneDrive: visible from the start

```mermaid
flowchart TD
    A["Right-click a supported file, image, or link"] --> M["Click2Cloud native context menu"]
    M --> GD["Google Drive"]
    M --> DB["Dropbox"]
    M --> OD["OneDrive"]
    GD --> CHECK{"Selected provider authorized<br/>and ready to save?"}
    DB --> CHECK
    OD --> CHECK
    CHECK -- "YES" --> SAVE["SAVE IMMEDIATELY<br/>to the exact chosen/default location"]
    SAVE --> VERIFY["Verify actual provider upload"]
    VERIFY --> HISTORY["Update History and the matching File Explorer location"]
    CHECK -- "NO: not connected" --> CARD["Open compact Click2Cloud extension panel<br/>for the selected provider only"]
    CARD --> CONSENT["Tap Sign in to that provider<br/>and approve authorization once"]
    CONSENT --> READY["Remember authorized connection<br/>and ensure its selected destination is ready"]
    READY --> NEXT["Next fresh right-click saves directly"]
    CHECK -- "NO: destination or connection needs attention" --> REPAIR["Show only the required action<br/>in the compact provider panel"]
    REPAIR --> NEXT
```

## Diagram 2 — Already signed in and ready: save, nothing else

```mermaid
flowchart LR
    A["Right-click supported file"] --> B["Choose Google Drive, Dropbox or OneDrive"]
    B --> C["Use the selected provider's saved exact destination"]
    C --> D["SAVE NOW"]
    D --> E["Verified provider result"]
    E --> F["File visible in Explorer + History"]
    A -. "NEVER for a ready save" .-> X["Full dashboard / new setup tab"]
```

## Diagram 3 — Not connected: the entire mini extension panel

```mermaid
flowchart TD
    A["Right-click → Choose provider"] --> B{"Connected and ready?"}
    B -- "NO: not authorized" --> P["SMALL Click2Cloud extension panel<br/>NOT the full dashboard"]
    P --> CARD["One Click Away!<br/><br/>[ Provider icon ]<br/>Google Drive<br/>[ Sign in to Google Drive ]"]
    CARD --> OPTIONS["Same minimal card for Dropbox or OneDrive:<br/>only selected provider's icon, name and Sign in button"]
    OPTIONS --> APPROVE["User approves OAuth once"]
    APPROVE --> NEXT["Next fresh click → save directly"]
    B -- "YES" --> SAVE["Save immediately; no panel or dashboard"]
    B -- "Connected but destination unavailable" --> ACTION["Compact provider panel:<br/>only the needed destination/repair action"]
```


## Settings — choose which cloud providers appear in Chrome

All four providers start visible. In Settings → Right-click menu, Google Drive, Dropbox, OneDrive and Cloudflare each have an independent Show/Hide checkbox. Hiding a provider removes its Chrome menu entry, not its connection, files or saved destinations. Re-enabling it restores its configured menu action after native registration. The settings use the same versioned API that drives the GUI. See the companion Cloudflare diagram 2B in `foundations/cloudflare/README.md`.
