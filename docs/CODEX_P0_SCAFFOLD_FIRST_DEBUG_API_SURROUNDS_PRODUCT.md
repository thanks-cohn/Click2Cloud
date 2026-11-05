# P0 OWNER DIRECTIVE — /scaffold IS THE PRODUCT END GOAL; GLACIARING SURROUNDS IT

**Repository:** `thanks-cohn/Click2Cloud`  
**Implementation branch:** `feat/glaciaring-agent-debug`  
**Status:** Owner-approved controlling specification; documentation is not implementation evidence.  
**Priority:** P0, supersedes conflicting older mode/UI and testing-sequence assumptions.

## The authority hierarchy (unambiguous)

1. **`/scaffold` defines the FINAL Click2Cloud product and user experience.** It is the acceptance target—not an optional reference, mockup, or a visual wrapper around a diagnostics lab. Read the actual scaffold documents and implement their behaviors faithfully.
2. **The real V3+1 engine powers `/scaffold`.** Shape/refactor the engine and its adapters to serve that user experience. The engine is not authorized to redefine the scaffold in order to preserve legacy V3 architecture.
3. **Build and extend the Glaciaring Debug API AROUND that real engine, UI/controller actions, Chrome native menu and provider boundaries.** Glaciaring observes, traces, diagnoses and tests the same real operations users perform. It does not become a second engine, a mandatory execution proxy, a competing user experience or the product's organizing principle.
4. **Scenario Laboratory, golden cases and agent tooling support convergence to `/scaffold`.** Test numbers and code architecture never outrank the functional product contract. Implement a real vertical slice first, then harden it with comprehensive debug instrumentation and independently checked oracles. Retain mandatory safety/coverage and live-browser/provider/recovery release gates.

**Rule:** If implementation behavior conflicts with scaffold behavior, the scaffold wins; redesign the implementation. If actual browser/provider/security capabilities prevent the exact outcome, disclose the precise constraint and implement the closest safe transparent representation only where genuinely necessary. Never silently weaken the scaffold to achieve green tests.

## Mandatory reading order

1. `scaffold/README.md` — owner-authoritative UX, composite menu and popup rules.
2. `scaffold/gui/README.md` — Explorer, Remotes, extension UI and navigation.
3. `scaffold/gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md` — native Chrome + real R2 acceptance.
4. `scaffold/gui/TEST_JOURNEYS.md` and `scaffold/gui/demo-fixtures.json` — product acceptance journeys.
5. `scaffold/MENU_DESTINATIONS_DURABLE_RECOVERY.md` — independent menu and Depth recovery.
6. `scaffold/gui/REDOWN_OAUTH_EXTRACTION.md` — separate Click2Cloud auth.
7. `AGENTS.md`, `docs/CODEX_BUILD_REAL_V3_PLUS_ONE_NOW.md`, `docs/CODEX_AUTONOMOUS_V3P1_RUNBOOK.md`, `docs/V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md`.
8. `docs/CODEX_GLACIARING_IMPLEMENTATION_REQUEST.md`, `docs/V3P1_GLACIARING_AGENTIC_DEBUG_API_SEED.md`, `docs/CODEX_EXPAND_GOLDEN_500_TO_1000_AND_VALIDATE_V3P1.md`.

Existing exhaustive debugging, reliability and security requirements still apply *where compatible with* the newer scaffold. Update conflicting older golden expectations; never manufacture passes by modifying tests without source-backed owner intent.

## Product behaviors that are NOT negotiable

- The installed **Chrome MV3 extension** starts at Remotes and offers real File Explorer, authorized Cloudflare account/bucket/folder listings, a top `+ Right Click` action, an immediately adjacent Depth tree-icon toggle/level selector and Manage Destinations.
- **Simple and Narrow are independently saved types that coexist in the same native menu**; do NOT implement an exclusive global Simple/Narrow active mode. Simple uses flat destination leaves and optional label; Narrow uses natural ancestor branch hierarchy and optional per-level menu aliases.
- **Depth is an ADDITIVE, independent ON/OFF overlay** of all authorized indexed directories to selected level. Turning Depth OFF removes only generated nodes. Never hide, delete, or reset saved Simple/Narrow items, aliases, IDs, ordering, or remembered Depth level. Never quietly rescan the whole cloud on a Depth UI toggle.
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
6. **Run scaffold-first acceptance journeys continuously**, then expand/exercise independent golden scenarios for fault, scale, security and mode interactions. Include native browser, OAuth, provider, backup recovery and negative-path proof. Report PASS/FAIL/BLOCKED/NOT_TESTED truthfully; benchmark diagnostic cost and repair regressions.
7. Commit/push on isolated development branch; show exact extension package path, Chrome installation steps, OAuth callback to register, screenshot/receipt proof, remaining blockers and scaffold-journey completion table. Do not transplant to REDOWN or publish a production release without separate authorization.

**Success means the user can ACTUALLY use `/scaffold` as their Chrome right-click product, while Codex can diagnose every supported critical operation via Glaciaring. It does NOT mean 1,000 green tests, a polished menu illustration, a worker-only build, or a debug-oriented developer demo.**
