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
5. `scaffold/MENU_DESTINATIONS_DURABLE_RECOVERY.md` — Weekly/Daily Recovery Mode, independent menu-config, depth-config, depth-index and recovery-policy durability.
6a. `scaffold/WHOLE_CLOUD_OUTLINE_EXPORT.md` — REQUIRED Settings → Recovery Mode bottom Save Whole Cloud, multi-connected Cloudflare/S3 accounts, unlimited-week dated read-only outline, durable paused job automatically resuming on the next successful SAME-account OAuth login.
6. `scaffold/gui/REDOWN_OAUTH_EXTRACTION.md` — separate Click2Cloud auth.
7. `AGENTS.md` for essential repository constraints. Older Codex runbooks may be consulted only for specific engine/API details after reading the controlling scaffold, never as UI authority or a 1,000-scenario mandate.
8. `src/glaciaring/agent-api.mjs`, `src/glaciaring/index.mjs`, `src/glaciaring/catalog.mjs`, `src/chrome/debug-host.mjs` — the existing Debug API implementation. Do NOT read the 500/1,000-scenario expansion request.

Keep necessary authorization/security, Chrome registration and Glaciaring checks. Run only focused actual scaffold functional tests. Do not read, run or expand the old 1,000-scenario project.

## Product behaviors that are NOT negotiable

- Installed **Chrome MV3 extension** starts at Remotes and offers real Explorer with authorized accounts, buckets and folders, top `+ Right Click` and Manage Destinations. **NO separate hierarchy button in Explorer.** Right-clicking a folder INSIDE Explorer shows `+ Right Click`, `Default Save Selection` (binds Flat target), and Manage Destinations.
- **Simple, Narrow and Depth configurations are independently SAVED** and never destroyed when hidden. Actual native Chrome menu visibility is controlled only by a **Show in Chrome selection INSIDE the `+ Right Click` popup, immediately ABOVE its Save button**. No display controls outside the popup. Simple generates flat destination leaves, Narrow natural ancestor branches, Depth indexed bucket hierarchy.
- **The SAME `+ Right Click` popup has TOP configuration tabs Simple | Narrow | Depth.** Simple/Narrow create clicked-folder destinations, Narrow-only Menu Titles handles aliases, and Depth lists every authorized bucket with independent DISPLAY ON/OFF and depth (10 is DEFAULT, **not a maximum**). **Only INSIDE THIS POPUP, directly ABOVE its bottom Save/Cancel**, display `Show in Chrome: [Simple ON/OFF] [Narrow ON/OFF] [Depth ON/OFF] [All] [Flat]`. Simple/Narrow/Depth toggle independently; All enables all three; Flat is an EXCLUSIVE shortcut to one direct-action `REDOWN → Cloudflare` leaf using user-designated `Default Save Selection` folder, with no Cloudflare submenu. Save commits tab changes AND Show selections; Cancel/Escape discards. Visibility does not imply configuration deletion. No controls for menu visibility in Settings or elsewhere.
- **The old Explorer hierarchy/tree button is REMOVED.** There is **NO** display toggle beside `+ Right Click` or elsewhere outside popup. **Depth** appears in Chrome only when popup Show:Depth is saved ON AND at least one Depth-display bucket is saved ON; Simple/Narrow appear only when their respective popup Show toggles are ON. Flat shows no Cloudflare nesting. Native limits must be reported without hard-coded depth-10 cap. Per-bucket Depth RECOVERY depths and Weekly/Daily schedule are configured separately in Settings → Recovery Mode, not the popup.
- Creation popup: top three choices Simple/Narrow/Depth; Simple/Narrow Setup optional title, **Menu Titles tab ONLY for Narrow**, immutable source segments left and optional aliases right, final-row/title synchronizes. The **Show** controls stay visible INSIDE popup above anchored Save/Cancel for all three configuration choices. Leaving any configuration tab preserves its draft; cancel discards all drafts.
- Manage Destinations: **ONE pop-out** with Simple/Narrow **filter, not converter**; up to 20 saved rows per page; row edit stays inside same window, Back directly below switch, Escape returns/discards; X deletes **only menu configuration**, never cloud data; exact canonical destination ID retained on edit.
- Compositor uses the popup's COMMITTED Show choices to conditionally merge saved Simple, Narrow and Depth with collision-safe identity; **All = all three**; **Flat = one direct actionable `REDOWN → Cloudflare` leaf** with NO Cloudflare submenu and exact verified Flat default target chosen using Explorer folder's `Default Save Selection`. Other providers remain independent flat siblings. Persist old configuration when hidden. Native Chrome and GUI preview derive from ONE canonical MenuSpec and resolver.
- No false success: actual authorized file bytes and provider-confirmed receipt + independent readback before successful outcome, counters or celebration. Browser-native right-click and Worker/R2 behavior must be tested; a DOM menu is insufficient.
- Reuse the extracted Universal File API and verified REDOWN protocol/capabilities rather than inventing a second file engine. REDOWN production remains unchanged. Chrome context menu must be an actual installed-browser adapter with reliable MV3 restart repair.
- Settings → **Recovery Mode** (NOT Chrome Show) offers **Weekly (Monday default) or Daily**, Simple Recovery ON/OFF, Narrow Recovery ON/OFF, and expandable authorized buckets each with independent Recovery ON/OFF and crawl depth (no imposed limit). Distinguish popup Chrome DISPLAY depth from Settings RECOVERY crawl depth. Independently durable menu-config, depth-config, depth-index and recovery-policy CURRENT, delta journals and immutable weekly/daily snapshots, with current weekly.json pointer. External recovery necessary for uninstall survival; report true status.
- **Backup Location is a Settings choice ONLY**: select **Automatic (default)** = %LOCALAPPDATA%\Click2Cloud\Recovery\ managed by the authorized native companion, or **Documents** = Documents\Click2Cloud\Backups\ (resolve the user's actual Documents folder). Either selected location stores all actual durable recovery files, not exports only. On location change, copy/verify before switching, keep prior data on failure, do not silently write to both. The examples 2026-11.jsonl, 2026-W45.json are placeholders; **monthly journals automatically roll over for every YYYY-MM** with uninterrupted sequence/replay across year boundaries; dated weekly/daily snapshots are likewise dynamic. Do not cap recovery to example dates.

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
2. **Build installable MV3 extension + functioning /scaffold GUI** with top Explorer `+ Right Click`, one compact three-tab popup with internal Show:Simple/Narrow/Depth/All/Flat immediately above Save, exact Explorer `Default Save Selection` for Flat and one Manage Destinations manager. **DO NOT build an adjacent Depth/hierarchy toggle.** Same real saved engine state—not decorative UI.
3. **Implement a canonical Show-filtered composite menu** for saved Simple + Narrow + Depth/All or exclusive direct Flat default, register actual Chrome right-click, route clicks exactly and persist independent display/config/recovery policies. Track Chrome ACK and MV3 recovery.
4. **Wire real Click2Cloud OAuth and authorized account/bucket discovery**, then a real original-byte save/readback through the trusted R2/Worker adapter. No simulation as success.
5. **Instrument these live functions with Glaciaring as the source-owned debug API**; extend `describeEngine`, `inspectMenu`, `inspectOperation`, diagnostics, diff, receipt and scenario hooks as needed without duplicating the engine.
6. **Test only actual scaffold journeys**: internal popup Show combinations, All/Flat, exact Flat default, no Explorer toggle, popup Save/Cancel, independent recovery depth vs display depth and Weekly/Daily Simple/Narrow/Depth recovery, actual browser/OAuth/R2 and Glaciaring boundaries. **Do NOT read/run/expand the 1,000-scenario project.** Report PASS/FAIL/BLOCKED/NOT_TESTED honestly.
7. Commit/push on isolated development branch; show exact extension package path, Chrome installation steps, OAuth callback to register, screenshot/receipt proof, remaining blockers and scaffold-journey completion table. Do not transplant to REDOWN or publish a production release without separate authorization.

**Success means the user can ACTUALLY use `/scaffold` as their Chrome right-click product, while Codex can diagnose every supported critical operation via Glaciaring. It does NOT mean 1,000 green tests, a polished menu illustration, a worker-only build, or a debug-oriented developer demo.**
