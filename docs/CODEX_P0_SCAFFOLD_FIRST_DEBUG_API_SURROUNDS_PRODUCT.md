# P0 OWNER DIRECTIVE — /scaffold IS THE PRODUCT END GOAL; GLACIARING SURROUNDS IT

**Repository:** `thanks-cohn/Click2Cloud`  
**Implementation branch:** `feat/glaciaring-agent-debug`  
**Status:** Owner-approved controlling specification; documentation is not implementation evidence.  
**Priority:** P0, supersedes conflicting older mode/UI and testing-sequence assumptions.

## The authority hierarchy (unambiguous)

1. **`/scaffold` defines the FINAL Click2Cloud product and user experience.** It is the acceptance target—not an optional reference, mockup, or a visual wrapper around a diagnostics lab. Read the actual scaffold documents and implement their behaviors faithfully.
2. **The real V3+1 engine powers `/scaffold`.** Shape/refactor the engine and its adapters to serve that user experience. The engine is not authorized to redefine the scaffold in order to preserve legacy V3 architecture.
3. **Build and extend the Glaciaring Debug API AROUND that real engine, UI/controller actions, Chrome native menu and provider boundaries.** Glaciaring observes, traces, diagnoses and tests the same real operations users perform. It does not become a second engine, a mandatory execution proxy, a competing user experience or the product's organizing principle.
4. **No 1,000-scenario project this run.** Do NOT read, run, extend or prioritize the 500/1,000 golden atlas, scenario-expansion requests or M0–M10 Scenario Laboratory. This run is for the real `/scaffold` product using the existing Glaciaring Debug API around its engine. Perform only focused real-product tests that establish the specific scaffold behaviors, authorization, native Chrome registration, upload receipts and recovery. Do not let broad synthetic testing distract from delivering the product.

**Rule:** If implementation behavior conflicts with scaffold behavior, the scaffold wins; redesign the implementation. If actual browser/provider/security capabilities prevent the exact outcome, disclose the precise constraint and implement the closest safe transparent representation only where genuinely necessary. Never silently weaken the scaffold to achieve green tests.

## Mandatory reading order

1. `scaffold/README.md` — owner-authoritative UX, composite menu and popup rules.
2. `scaffold/gui/README.md` — Explorer, Remotes, extension UI and navigation.
3. `scaffold/gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md` — native Chrome + real R2 acceptance.
4. `scaffold/gui/TEST_JOURNEYS.md` and `scaffold/gui/demo-fixtures.json` — product acceptance journeys.
5. `scaffold/MENU_DESTINATIONS_DURABLE_RECOVERY.md` — independent menu and Depth recovery.
6. `scaffold/gui/REDOWN_OAUTH_EXTRACTION.md` — separate Click2Cloud auth.
7. `AGENTS.md`, `docs/CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md`, `docs/CODEX_AUTONOMOUS_V3P1_RUNBOOK.md`, `docs/V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md`.
8. `src/glaciaring/agent-api.mjs`, `src/glaciaring/index.mjs`, `src/glaciaring/catalog.mjs`, `src/chrome/debug-host.mjs` — the existing Debug API implementation. Do NOT read the 500/1,000-scenario expansion request.

Existing exhaustive debugging, reliability and security requirements still apply *where compatible with* the newer scaffold. Update conflicting older golden expectations; never manufacture passes by modifying tests without source-backed owner intent.

## Product behaviors that are NOT negotiable

- The installed **Chrome MV3 extension** starts at Remotes and offers real File Explorer, authorized Cloudflare account/bucket/folder listings, top `+ Right Click`, an immediately adjacent **hierarchy display-only** tree-icon toggle, and Manage Destinations. Right-clicking a folder in Explorer shows a local `+ Right Click` action opening the same popup for that folder.
- **Simple and Narrow are independently saved types that coexist in the same native menu**; do NOT implement an exclusive global Simple/Narrow active mode. Simple uses flat destination leaves and optional label; Narrow uses natural ancestor branch hierarchy and optional per-level menu aliases.
- **The `+ Right Click` popup has THREE choices: Simple | Narrow | Depth.** Simple and Narrow create exact clicked-folder destinations; the Narrow-only Menu Titles tab manages ancestor aliases. **Depth is the third option**, showing all authorized buckets with **independent bucket ON/OFF checkboxes and depth values (default 10 for new buckets)**. **The user MUST click the popup's Save button to commit per-bucket Depth settings.** Cancel/Escape discards drafts. No Depth-specific selected-folder target or title alias.
- **The Explorer hierarchy/tree button has ONLY a display role:** show/hide in Chrome's real native right-click menu the already-SAVED Depth projection for enabled buckets at their SAVED individual levels. It must not open or replace the editor, modify bucket settings, commit drafts, or trigger an R2 scan. Visibility may persist separately. OFF removes only generated Depth rows; Simple/Narrow and committed per-bucket Depth settings survive unchanged.
- Creation popup: Setup contains optional Menu Title + Simple/Narrow switch; **Menu Titles tab appears ONLY for Narrow** and shows immutable real path segments left with editable optional aliases right; final-row alias synchronizes with Setup title. Save/Cancel fixed at bottom; switching back to Simple hides the extra tab but preserves unsaved draft values.
- Manage Destinations: **ONE pop-out** with Simple/Narrow **filter, not converter**; up to 20 saved rows per page; row edit stays inside same window, Back directly below switch, Escape returns/discards; X deletes **only menu configuration**, never cloud data; exact canonical destination ID retained on edit.
- Compositor merges manually saved Simple, Narrow and optionally generated Depth with deterministic collision-safe account/bucket/path identities; provider siblings Google Drive/Dropbox/OneDrive remain flat. `REDOWN → Cloudflare` can be the default direct-save leaf only in the scaffold's default-only case. Native Chrome and GUI use **one canonical MenuSpec and action resolver**.
- No false success: actual authorized file bytes and provider-confirmed receipt + independent readback before successful outcome, counters or celebration. Browser-native right-click and Worker/R2 behavior must be tested; a DOM menu is insufficient.
- Reuse the extracted Universal File API and verified REDOWN protocol/capabilities rather than inventing a second file engine. REDOWN production remains unchanged. Chrome context menu must be an actual installed-browser adapter with reliable MV3 restart repair.
- Distinct recovery ownership: menu-config CURRENT/journal/external backups updated on edits (weekly historical default/daily optional) and separately versioned Depth index CURRENT/journal/backups; local IndexedDB alone cannot promise uninstall survival.

## Glaciaring: surround the product, DO NOT put the product inside Glaciaring

Preserve and extend `src/glaciaring/{agent-api,index,catalog}.mjs`, `src/chrome/debug-host.mjs`, production `src/core/*` and native registrar as appropriate:

```text
     OWNER'S END PRODUCT: /scaffold
     Remotes / Explorer / creation + management popups
                   |
        real user gestures + state
                   v
      real V3+1 configuration/controller
         -> canonical MenuSpec -> native Chrome registrar
         -> exact SaveIntent -> Universal File API -> verified provider receipt
                   |
        Glaciaring instruments these SAME boundaries:
        context -> inputs -> decision -> effects -> ACK/receipt -> recovery
                   |
        authorized agent queries + scenario oracles + fault evidence
```

Glaciaring is a **parallel, low-overhead observation and inspection layer** attached to real product boundaries; it must not be on the critical path where a diagnostic error can block or change an ordinary save. Debug OFF and Debug ON must produce the same protected user-visible behavior and cloud writes. Every important scaffold gesture/action/state/branch must have a safe programmatic inspection handle and meaningful failure reason. Track desired/generated/Chrome ACK/independently observed separately, plus upload confirmation vs uncertain results. Do not expose OAuth tokens, private URLs, source provenance or arbitrary privileged mutations to diagnostics. No public debug proxy.

Prioritize diagnosing authentic user-facing scaffold issues: popup state, title synchronization, Simple/Narrow coexistence, Depth additive composition, duplicate names, exact location resolution, persistence, Chrome ID/ACK, auth/connect/reconnect, source capture, provider receipts and post-restart reconciliation.

## The specific new Cloudflare OAuth registration (owner provided)

**Public OAuth Client ID:** `59535938bc4cc093003b4385a7e2b005`.

The owner selected **Workers Content Read-Only**, **Workers Editor**, **Workers R2 Storage Read**, **Workers R2 Storage Write** as required permissions. These are dashboard labels; **inspect the client's actual authorized OAuth scope IDs** instead of assuming that legacy `workers-scripts.read/write` strings are identical. Implement public-client Authorization Code + PKCE S256 and Refresh Token when issued. Use a stable Click2Cloud-specific extension identity and `chrome.identity.getRedirectURL('cloudflare')`; output its exact URI for the owner to register, separate from any provisional `https://redown.online/oauth/callback` registration. Do not reuse REDOWN's extension ID, tokens or secret. Target at least 2 hours of uninterrupted use through coordinated automatic renewal and secure rotated refresh-token persistence; do not falsely claim a guaranteed two-hour access-token TTL or promise silent renewal if Cloudflare invalidates authorization. Record proof, not merely fake-clock test results.

OAuth issuance, account verification, R2 entitlement, Worker readiness, native menu ACK and verified object write are independent states. No automatic scope approval/billing changes and no unsafe blanket production writes. Restrict live writes/deletes to the approved `__redown_v3plus1_lab__/` prefix.

## Execution sequence — product first, diagnostics built alongside it

1. **Compare present source with each scaffold journey**; produce a concise gap ledger identifying which existing pieces must be adapted, removed or preserved. Do not spend the whole run on an audit, proposal, benchmark or giant test atlas.
2. **Build the installable MV3 extension + functional /scaffold GUI**, with a real top-of-Explorer `+ Right Click`, one compact creation popup, one manager, and adjacent Depth toggle. Same real saved engine state—not decorative UI.
3. **Implement canonical composite menu** for Simple + Narrow + optional Depth; register actual Chrome right-click, handle exact click intent, track applied generations and restoration across worker restart. Build safe persistent user choices.
4. **Wire real Click2Cloud OAuth and authorized account/bucket discovery**, then a real original-byte save/readback through the trusted R2/Worker adapter. No simulation as success.
5. **Instrument these live functions with Glaciaring as the source-owned debug API**; extend `describeEngine`, `inspectMenu`, `inspectOperation`, diagnostics, diff, receipt and scenario hooks as needed without duplicating the engine.
6. **Test only actual scaffold-driven journeys and relevant negative paths**, including popup Save/Cancel, per-bucket depth=10 defaults, 2+ bucket depths, hierarchy toggle showing last saved configuration only, real browser/OAuth/provider/recovery, and Glaciaring boundary inspection. **Do not read, run, expand or create the 1,000-scenario test project.** Report PASS/FAIL/BLOCKED/NOT_TESTED honestly and fix user-facing failures.
7. Commit/push on isolated development branch; show exact extension package path, Chrome installation steps, OAuth callback to register, screenshot/receipt proof, remaining blockers and scaffold-journey completion table. Do not transplant to REDOWN or publish a production release without separate authorization.

**Success means the user can ACTUALLY use `/scaffold` as their Chrome right-click product, while Codex can diagnose every supported critical operation via Glaciaring. It does NOT mean 1,000 green tests, a polished menu illustration, a worker-only build, or a debug-oriented developer demo.**
