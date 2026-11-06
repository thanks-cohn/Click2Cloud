# Other clouds — right-click and minimal login diagrams

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
