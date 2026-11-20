# Screenshot-to-Cloud 0.3.21 — Mandatory Codex Test Matrix

**Authority:** [README.md](README.md) is the FINAL frozen owner contract. This is its executable acceptance companion. Run fixtures where possible and real installed Chrome + disposable authorized R2 tests separately. Never report a mock as proof of browser/Worker/R2 success.

## 1. Command dispatch and capture

| ID | Setup/action | Expected |
|---|---|---|
| S01 | New install; inspect actual Chrome `commands.getAll()` | BOTH `Alt+Q` and `Ctrl+Shift+Y` requested as manifest defaults, with real registered assignment status shown truthfully |
| S02 | Shelf CLOSED, ordinary Google page, one matching active rule; press Alt+Q | 1 central command signal, 1 Chrome visible-tab capture, 1 browser image upload, configured output only |
| S03 | Same as S02, press Ctrl+Shift+Y | Identical rule matching/capture behavior; a NEW independent capture/output ID |
| S04 | Alt+Q and Ctrl+Shift+Y pressed separately | 2 distinct signals, 2 screenshot captures, 2 inbound uploads; no one-key takeover or fallback hierarchy |
| S05 | One default shortcut unassigned by Chrome; other assigned | Assigned key works independently, UI labels only real assignment, no automatic keypress synthesis |
| S06 | Both keys unassigned | No fake screenshot; simple helpful assignment hint, user can still use explicit one-off right-click Screenshot |
| S07 | F7/F8/F9 in Click2Cloud Explorer UI | Search/toolbar/split continue working with no screenshot command collision |
| S08 | Shortcut pressed on unsupported Chrome-internal page / absent permissions | Truthful capture failure, no cloud write/false receipt; other ordinary websites unaffected |
| S09 | Rapid independent commands and tab switching | No blunt time debounce; real Chrome capture rate limitations reported accurately; never upload wrong-tab pixels |

## 2. Rule creation, scope and cardinality

| ID | Setup/action | Expected |
|---|---|---|
| R01 | Open More dropdown on 0.3.21 | `Screenshot` first-class option immediately above `Settings`, NO `Rules`/Auto-Reroute entry |
| R02 | Screenshot form save `example.com → R2/photos/` | New card directly beneath; Save does NOT capture or upload |
| R03 | Only one saved active website card exists; press Alt+Q on example.com | Screenshot works; no hidden shortcut-bearing anchor/primary rule required |
| R04 | Rule A Google→photos/, Rule B All sites→general/; Google page | Both output intents included; no priority or suppression |
| R05 | Same cards on unrelated supported website | Only Rule B matches |
| R06 | Rule conditions exact host `mail.google.com` vs domain+subdomains `google.com` | Correct host boundary; no false match on `notgoogle.com` |
| R07 | One rule with three OR conditions all matching and one destination | That rule contributes ONE target intent, not three |
| R08 | One rule with no website conditions | All supported ordinary websites match on user shortcut |
| R09 | Disable Rule A, reenable, then delete using far-right X | Only A affected; disabled card remains visible; X removes rule only, not its cloud objects |
| R10 | 26+ cards, edit first/last and restart | Exactly 25 per page; all persist with stable IDs/names; no hard global count cap |
| R11 | File Explorer right-click Screenshot2Here to target X | Creates/updates normal website→folder rule with NO shortcut selection; saving config does not capture |
| R12 | Browser right-click Screenshot → exact target X with many automatic matching cards | ONLY X receives file, independent of additive shortcut rules |
| R13 | Full card editor changes websites/destinations | Edits only selected immutable ruleId; no chord controls or duplicate destination entries within a card |

## 3. Capture identity and matching determinism

| ID | Setup/action | Expected |
|---|---|---|
| C01 | No matching active rules | 0 captures, 0 Chrome→Worker uploads, 0 R2 writes |
| C02 | 100 matching active rules to the same folder, dedup ON | ONE capture, ONE browser upload, ONE R2 file |
| C03 | Same as C02, dedup OFF | ONE capture, ONE upload, 100 distinct physical R2 objects with distinct keys |
| C04 | 100 matching rules to 3 unique R2 folders, dedup ON | ONE capture, ONE upload, exactly 3 verified R2 objects |
| C05 | Rules overlap by website and share directory | Each rule contributes once; ON group by canonical directory, OFF by distinct rule→directory association |
| C06 | Two authorized accounts/buckets with same folder label | Separate canonical identities; never merge by display name |
| C07 | Prefix differences in case or meaningful path | Do not erroneously merge case-sensitive R2 key prefixes |
| C08 | Two independent keypresses on identical page | Different signalId/captureId; new cloud file per action; no historical dedup |
| C09 | Rule toggled/deleted/directory changed during ongoing upload | Already frozen capture plan remains unchanged except real authorization failure; next keypress reflects new settings |
| C10 | Switch tab after matching but before/during `captureVisibleTab(windowId)` | Re-check active tab/window/navigation; abort if identity uncertain, no wrong-tab cloud upload |

## 4. Worker, retry and receipts

| ID | Setup/action | Expected |
|---|---|---|
| W01 | 1 matching target and existing Cloudflare account/bucket | Authenticated screenshot-specific Worker write succeeds; object independently verified |
| W02 | 3 authorized same-bucket folder targets | One inbound screenshot image, 3 physical writes; no second browser upload |
| W03 | 2 of 3 writes succeed, third fails | Aggregate PARTIAL, independent per-target statuses and exact destinations |
| W04 | Retry third output from W03 | Same captureId/outputId/target key; successful first two NOT duplicated |
| W05 | Worker accepted request but output not confirmed in R2 | Pending/unknown/failure; NEVER falsely show completed solely from Worker HTTP acceptance |
| W06 | Chrome/Worker restarts after partial writes | Resume only when original image bytes recoverable; otherwise honest un-retryable failure, NOT a new screenshot labeled retry |
| W07 | Target bucket/account is unsupported by current Worker binding | Accurate blocked/failed target result; no silent alternate folder writes |
| W08 | RAW receipt export vs SECURE export | Same real operation evidence; RAW retains detailed operational metadata, SECURE redacts sensitive links; no embedded screenshot/file payloads by default |
| W09 | Recorder write/export fails | Underlying file-save path does not silently fail or report a fake verified save due to logging error |

## 5. UI/theme/release coexistence

| ID | Setup/action | Expected |
|---|---|---|
| U01 | Fresh profile, Settings Appearance | Bit o' Polish is default aesthetic, Original Rose its default color palette; Minimal and Remote V1 remain selectable |
| U02 | Switch any of 5 Bit o' Polish palettes then Dark↔Light | Same Bit o' Polish aesthetic, recolored correctly, independent light/dark mode, persisted |
| U03 | More Screenshot, Settings, Explorer, History and right-click | No accidental Auto-Reroute Rules UI, no regression to existing features |
| U04 | npm tests/browser tests and built extension | Actual 0.3.21 in package/manifest/bundle after verified release; real Chrome and R2 claims distinguished from mocks |

## Test/report protocol

Use fixture names, exact commands, source file/line, passing/failing test totals, commit SHA and tested environment. Include one explicit screenshot job receipt showing matching rule IDs, number of distinct physical cloud files and per-output verification. Preserve existing Simple/Narrow/Depth saved-target tests and Current/Profile recovery; do not replace old assertions with weaker ones just to achieve green test output. DO NOT test Auto-Reroute as part of the 0.3.21 feature implementation; that belongs in the separate 0.3.22 request.