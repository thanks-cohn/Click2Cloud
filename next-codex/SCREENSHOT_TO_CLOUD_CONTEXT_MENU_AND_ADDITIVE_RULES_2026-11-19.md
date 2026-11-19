# New feature — Screenshot-to-Cloud destination picker, additive rules, per-rule shortcuts

**Owner additions:** November 19, 2026. **Status:** New implementation request, NOT already implemented in the inspected 0.3.20 branch. Read [the code-audited delta-only handoff](NEXT_RUN_DEDUPLICATED_CODE_AUDIT_AND_RULES_2026-11-19.md). Do not recreate the existing V3+1.1 File API, shortcut registry, Explorer, download ZIP, native save or History systems.

## 1. Entry points and their distinct actions

1. **Browser right-click menu → Screenshot → choose destination**. Display genuine authorized provider/account/bucket/folder locations for a **user-initiated** screenshot; select one exact location and send the captured image **to that one location only**. Optionally include an explicitly distinct **Use matching Screenshot Rules** action for all matching destinations. The location picker must not silently use a previous/default bucket or some other saved destination. **Separate action in Click2Cloud File Explorer: right-click ANY authorized directory → `Screenshot2Here` opens shortcut-to-folder CONFIGURATION, not an immediate capture.** Detailed contract in §2B.
2. **Top-right Shelf More ▾ → Screenshot** opens the **Screenshot Rules management screen**, not an immediate screenshot. Put **Rules**, then **Screenshot**, then **Settings**, before the existing remaining menu items. **Rules** manages automatic browser-download routing and **Screenshot** manages user-triggered screenshot routing. Keep their saved rule lists and permissions separate, sharing only well-tested UI and API primitives.
3. **Per-Screenshot-Rule keyboard shortcut**: Every screenshot rule may optionally be assigned a shortcut/hotkey in its own row/editor, in addition to **website/hostname/EXACT-URL matching**. When pressed from a supported Chrome context, the shortcut captures the visible authorized page and sends it to **the named rule's exact cloud folder if the current URL matches that rule's selected scope** (or if it is an intentionally All-sites rule). No automatic override of a site-specific restriction. One shortcut activates its bound rule, not every unrelated site rule; the explicitly separate **Use matching Screenshot Rules** action fans out to all matching enabled rules. If no match, clearly report that this shortcut has no applicable rule here; never silently upload to another bucket. Capture must always be user-triggered. Verify Chrome-wide shortcut support or mark the binding scope as Shelf-only if that is the only supported context; do not invent unrestricted global hotkeys.

## 2. Screenshot Rules page: editable editor above the list

The top **New / Edit Screenshot Rule** form has:
- **Name** (editable; empty defaults to `Rule 1`, `Rule 2`, ... independent screenshot-rule numbering; stable underlying IDs, no renumbering on deletion).
- **Website/URL scope for screenshot SHORTCUT**: **All websites**, entire site/domain (`example.com`, with clearly stated apex/subdomain semantics), **specific hostname/subdomain** (`shop.example.com` only), explicit wildcard (`*.example.com`), OR **specific full URL** (`https://shop.example.com/products/item`). User decides **where the screenshot made with THAT shortcut goes** for this exact scope. For exact URL matches, compare a normalized trustworthy tab origin + path, and include query only when explicitly chosen; ignore URL fragment by default, never match a different path/host/lookalike suffix by substring. For domain scopes, never treat `evil-example.com` as `example.com`. Read the actual active tab URL at capture time, not webpage-injected or edited string. Avoid logging private query parameters. Retain distinct rules for different sites/hosts/pages instead of forcing one global target.
- **Destination**: authorized provider/account/bucket and exact directory prefix; choose via real destination picker, not free-typed unverified targets.
- **Optional shortcut**: a clear **Set shortcut / Change / Remove** control in the rule editor, with persisted command binding, collision feedback and a concise description: "Take screenshot and send to this destination." Prefer the existing `src/api/shortcuts.mjs` canonical shortcut validation/storage and `extension/shortcut-settings.mjs` UI conventions, not a competing key engine.
- **Save**: only confirm after actual persistence, then immediately render the new/edited rule below. No accidental enabling if destination/capture prerequisites are missing.

Under the setup and **Save** button, **Saved Screenshot Rules** shows organized compact cards/rows each with name, site condition, exact destination, optional keyboard shortcut, **Activate/Disable switch**, Edit affordance and **X delete at the far right**. X deletes only this rule, never cloud data; retain keyboard accessibility, a safe confirmation as appropriate, and no accidental capture from clicking X. Disabled rules remain visible. Persist across restart. Show **25 rules per page** then Prev/Next + page number starting on rule 26. 25 is page size, not a total cap. Keep a separate saved list for general **Rules** (download routing) with the same 25-per-page, X-delete and Activate/Disable pattern.

## 2B. File Explorer directory right-click → Screenshot2Here (shortcut destination manager)

**This is a new owner-required configuration shortcut, not a request to screenshot the File Explorer.**

On **right-click of a directory in Click2Cloud File Explorer**, show **`Screenshot2Here`**. Clicking it opens a **compact, aesthetically organized popup** with the selected authorized **Cloudflare account → bucket → exact folder path** prefilled as the proposed destination, plus two ways to assign a screenshot shortcut:

1. **Type/capture a new keyboard shortcut** in an input (validate with the already built canonical shortcut resolver and Chrome keyboard constraints), or
2. **Choose an existing Screenshot shortcut** from a **bounded-height, vertically scrollable list** of all existing screenshot bindings, showing each chord, the rule name, site/URL scope, and current destination. The list has one clear selected state. A user can have more than 25 rules elsewhere; this chooser must scroll rather than overflow the popup.

**[Save]** is the single durable commit action, with Cancel/Close. Do not change any mapping before Save. When an **existing shortcut** is selected, saving **REPLACES that specific shortcut rule's existing destination with the selected directory**, without inventing a second rule, renaming the shortcut, modifying its user-defined website/hostname/exact-URL matcher, or changing other saved rules. Show **old destination → new destination** clearly before Save. When a **new shortcut** is entered, create a new screenshot rule bound to the exact selected directory; the user may optionally specify site/URL scope, or use the **All websites** default and refine it later on Screenshot Rules page. Reject shortcut conflicts, including already registered chords, unless the user intentionally selects the existing screenshot binding to **reassign** (in which case reuse its same command ID, not a second conflicting binding).

**Important distinctions:** this `Screenshot2Here` choice **does not take a screenshot at Save time**. A later user-triggered key press sends an authorized capture to the newly saved exact folder if that shortcut's site/URL scope matches. No silent cloud file creation, no forced default, no cross-account fallback. Existing **additive, overlapping Screenshot Rules** remain available for the separate **Use matching Screenshot Rules** action, and editing one shortcut's target **does not delete or rewrite other matches/destinations**. For intentional multi-destination fan-out use multiple distinct matching rules and their own locations; **reassigning one chosen binding is a scoped replacement, not a system-wide replacement**.

Save persists through extension restart, updates the Screenshot Rules page and the shortcut Settings view consistently via the existing storage/command registry, and gives a concise saved status only after persistence. No separate shortcut registry, second event pipeline, second screenshot engine, or parallel settings store. If Chrome forbids dynamic global shortcut registration, show exactly where the shortcut works and an actionable supported configuration route; never claim it works everywhere.

```text
Screenshot2Here
Destination: Cloudflare R2 / redown / screenshots/events/

Shortcut
[ Press your new shortcut                         ]

Or select an existing Screenshot shortcut:
┌──────────────────────────────────────────────────┐
│ Ctrl+Shift+F6 · Rule 1 · All websites             │
│    Current: redown/screenshots/                   │
│ Ctrl+Alt+P · Product Pages · shop.example.com     │
│    Current: photos/products/                     │
│              (scroll if many)                    │
└──────────────────────────────────────────────────┘

[Cancel]                                [Save]
```

**Acceptance:** (a) Choose an authorized nested folder and enter a new available chord → one persisted shortcut rule points to that exact folder. (b) Open another folder, choose existing `Ctrl+Shift+F6` from scrollable list → review old/new destinations → Save → same rule/chord now points only to the newly chosen folder and retains its URL scope; no duplicate command/rule created. (c) Cancel/close/change folder before Save leaves existing mapping unchanged. (d) A conflicting new chord is rejected; selecting its *existing screenshot rule* for reassignment is allowed. (e) Shortcut on unrelated hostname or URL must not capture/upload for a scoped rule; exact full URL triggers only at matching path and optional query mode; other additive site rules remain intact. (f) Shortcut list long enough to scroll, keyboard and screen reader accessible; canceled authorization/missing target does not claim Save success.

## 2A. Owner-specified DEFAULT Screenshot Rule — Redown screenshots

Create or offer a **first-run default Screenshot Rule preset** with the following clear, user-editable values:

- **Rule name:** `Rule 1` (or `Screenshots` if a distinct descriptive preset label is required; do not silently renumber any existing user rule).
- **Website match:** **All websites** (only for explicit user-triggered capture, not passive/background automatic capture).
- **Destination:** Cloudflare R2 **bucket `redown`**, folder prefix **`screenshots/`**. The owner's `redown/screenshots` means **bucket = `redown`, prefix = `screenshots/`**, not a literal object key or a different bucket. Resolve the real currently authorized Cloudflare account/connection and confirm `redown` exists/has authorized write access before allowing this rule to be active. Never silently substitute another bucket, destination or default folder if `redown` is unavailable.
- **Suggested shortcut:** **`Ctrl+Shift+F6`**, selected as the initial default because the current Search / toolbar layout / panel reset shortcuts use F7 / F8 / F9. It is a *suggested*, editable binding, not an assertion that Chrome will accept it in every focus/context. Before registration, verify Chrome/browser command-key constraints, reservations, collisions with all existing user-remapped bindings and other Screenshot Rules, and availability of a legitimate capture gesture. If unavailable, show a clear conflict and ask the user to choose another shortcut rather than hijacking or overwriting one.
- **Trigger semantics:** While the preset is **enabled and its destination/capture permission is valid**, pressing its shortcut **takes one authorized visible-page screenshot** and sends it to `redown/screenshots/` only. It does NOT fan out to other matching screenshot rules. The explicit **Apply matching rules** action, by contrast, uses all enabled matches and additive fan-out.
- **Onboarding / authorization:** Display these values in the Screenshot Rules editor on first use. Save/persist the preset in the same rules store, with a stable ID; **do not silently upload content or enable invalid routing** merely by offering a default. If authorization, shortcut registration or capture permissions are not available, show the preset as pending/disabled with a truthful explanation and an explicit Activate path. The user may edit its name, website condition, target, shortcut and toggle, or delete it.
- **Object filename:** a collision-safe screenshot filename under `screenshots/` with observed UTC timestamp and random/unique suffix (e.g. `screenshots/Screenshot-<timestamp>-<id>.png`). Preserve the exact destination in receipt/readback.

**Default preset acceptance:** Open Screenshot Rules for the first time on an authorized R2 account with accessible `redown`: see the `Rule 1` preset for `redown/screenshots/` and proposed `Ctrl+Shift+F6`. With user authorization and no shortcut collision, Activate/Save then trigger the key; only `redown/screenshots/` receives one screenshot. If `redown` or the key is unavailable, show a specific blocked state, do not auto-route elsewhere, and preserve the user's existing rules.

## 3. Screenshot rule matching is ADDITIVE, not exclusive

Unlike ordinary browser-download reroute rules (which must avoid multiple accidental copies), **Screenshot Rules are intentionally additive**. A single user-triggered "Use matching Screenshot Rules" action may match multiple enabled rules and send the **one captured screenshot** to *every distinct authorized destination* that matches the current website/subdomain. There are NO rule collisions merely because site conditions overlap, and no first-winner priority. Deduplicate only **exactly identical destination identities** (provider+account+bucket+prefix), not different buckets or folders. Distinct destinations each get an independent verified/failed/unknown result and exact-key receipt. 3 targets, 2 successes, 1 failure => report partial delivery without lying about overall verification.

**Per-rule shortcut behavior is intentionally different**: pressing a specific rule's shortcut is an explicit **single-destination capture conditioned on that rule's All-sites / domain / exact-host / exact-full-URL matcher**. Site/URL restrictions MUST be honored, rather than silently overridden. If no match, report not applicable and do not upload. An explicit separately labeled **Apply matching Screenshot Rules** action uses site filters and fans out to every distinct matching target; overlaps are not errors. Never invoke two distinct per-rule shortcuts from one key chord: validate bindings against F7/F8/F9 and user remaps. A disabled rule's shortcut does nothing. Reassigning an existing shortcut through **Screenshot2Here** changes ONLY its target, preserving its match scope and other rules.

## 4. Capture, authorization and reliability boundaries

- Only capture browser-visible content the Chrome extension actually has permission/user gesture to capture. Don't promise full-page, hidden tab, entire desktop, or restricted scheme capture. A rule match alone does **NOT** auto-capture a page. Trigger must be user-initiated (right-click screenshot, explicit UI button, or eligible supported shortcut).
- Verify the tab identity at capture time; don't use attacker-controlled document data to route. Store screenshots in exact authorized bucket/prefix, collision-resistant filename (UTC timestamp + stable ID), preferably PNG with actual reported MIME type, without needless local Downloads-folder staging.
- Reuse the existing authenticated provider/File API/shortcut abstractions where technically appropriate; check whether Chrome commands/extension keyboard event APIs can support the chosen shortcut scope (Shelf-focused vs Chrome-wide). If Chrome-global bindings are unavailable or conflict, show the correct limitation rather than claiming to intercept OS-global shortcuts.
- Avoid unrelated permission expansion, unapproved cloud mutations and exposure of private page content to arbitrary accounts; require user-selected destinations and the intended capture consent. Do not create a separate screenshot transfer engine if a safe minimal adapter on the existing verified transfer API suffices.
- Distinguish capture success, upload accepted, cloud object actually verified, partial multi-destination completion and unknown states. Record small machine-inspectable per-destination diagnostics separate from the existing **right-click save History**, **bulk ZIP-only RRReceipt**, and existing recorder. Failure of diagnostics must not alter transfer outcome.
- A screenshot-specific rule may have multiple destinations by creating multiple overlapping rules; no conflict. Do not confuse **per-rule keyboard shortcut uniqueness** with **additive matching**.
- If real capture/upload is blocked by permissions/capabilities, deliver the saved-rule UI only with honest disabled/pending-capture states and the exact blocker. Never show a fake "uploaded" success.

## 5. Required focused acceptance

1. **More** contains **Rules**, **Screenshot**, **Settings** in that exact order. Screenshot opens a dedicated screenshot-rule editor, not a capture.
2. In Chrome right-click, Screenshot permits choosing an actual authorized R2 bucket and nested directory, and the screenshot goes to that exact location only.
3. Create `Rule 1` with `example.com → bucket A/photos`, `Rule 2` with `example.com → bucket B/backups`, and a third explicit matching wildcard rule for `shop.example.com → bucket C/shops`. Trigger **Use matching Screenshot Rules** at the matching hostname => exactly 3 intended destinations, one captured image, independent results. Nonmatching site uses only matching rules, never substring hostname lookalikes.
4. Create 26 screenshot rules => page 1 has 25, page 2 has 1; edit, X-delete, enable/disable and restart persist correctly. General download Rules uses the same management controls and pagination independently.
5. Assign a unique shortcut to screenshot `Rule 2`; pressing that shortcut => only its precise destination receives a screenshot, no other additive rules fire. Reject shortcut conflicts with other rule shortcuts and existing F7/F8/F9 bindings; remaps and deletion remain consistent. Disabled rule's shortcut cannot trigger upload.
6. **Screenshot2Here directory popup:** test new shortcut input, 30 existing shortcuts in scrollable chooser, replace-one shortcut old/new path confirmation, no duplicate command, retained exact-URL matcher, Save-only persistence, Cancel, conflicted shortcut validation, and UI/Settings sync after restart.
7. Genuine Chrome capture/capability, exact target routing, proper consent, safe error reporting, and receipts are proven in focused fixtures and (only if available) authorized Chrome/R2 disposable-object checks. Mark anything not exercised as unverified.

**Do not reimplement the already built shortcut registry, Chrome save menus, general download ZIP, or filename-search system. No broad Worker redesign.**
