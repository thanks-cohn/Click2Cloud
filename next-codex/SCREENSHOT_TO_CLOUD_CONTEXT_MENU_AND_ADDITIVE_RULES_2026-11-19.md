# New feature — Screenshot-to-Cloud destination picker, additive rules, per-rule shortcuts

**Owner additions:** November 19, 2026. **Status:** New implementation request, NOT already implemented in the inspected 0.3.20 branch. Read [the code-audited delta-only handoff](NEXT_RUN_DEDUPLICATED_CODE_AUDIT_AND_RULES_2026-11-19.md). Do not recreate the existing V3+1.1 File API, shortcut registry, Explorer, download ZIP, native save or History systems.

## 1. Entry points and their distinct actions

1. **Browser right-click menu → Screenshot → choose destination**. Display genuine authorized provider/account/bucket/folder locations for a **user-initiated** screenshot; select one exact location and send the captured image **to that one location only**. Optionally include an explicitly distinct **Use matching Screenshot Rules** action for all matching destinations. The location picker must not silently use a previous/default bucket or some other saved destination. **Separate action in Click2Cloud File Explorer: right-click ANY authorized directory → `Screenshot2Here` opens shortcut-to-folder CONFIGURATION, not an immediate capture.** Detailed contract in §2B.
2. **Top-right Shelf More ▾ → Screenshot** opens the simple screenshot rule creator/list, not an immediate screenshot or full manager. The form has **THREE explicit inputs, in this order**: (1) website/hostname/exact URL; (2) **OPTIONAL shortcut (blank is meaningful)**; (3) exact cloud **destination folder**. Then Save, then clickable saved cards. The cards must visibly distinguish shortcut-bound rules from **additive website rules with no shortcut**. Only clicking an individual saved card opens THAT rule's full manager; **Screenshot2Here** stays a separate quick directory/shortcut assignment popup. More order: Rules → Screenshot → Settings.
3. **Two complementary kinds of screenshot rules:** **Shortcut-bound rules** are user-triggered captures (hotkey plus their own site condition and primary destination). **No-shortcut rules** are active **additive routing rules**, NOT disabled rules: whenever a user triggers ANY valid Click2Cloud screenshot shortcut, automatically include the destinations of all enabled, website-matching no-shortcut rules **in addition to the triggering shortcut's original destination**. A blank-shortcut rule never captures by itself, nor requires a separate 'apply rules' command. One user gesture → one screenshot capture → one browser-to-trusted-Worker upload → Worker writes to each distinct authorized destination if technically supported. Don't trigger other shortcut-bound rules merely because the same site matches. Don't capture passively. Respect existing Chrome permission/shortcut scope limits.

## 2. More → Screenshot: simple URL-and-shortcut creation, then saved cards

**Owner-required information hierarchy, in this order:**

1. **Website/URL target** at the top: a single visible, clear input to enter a domain/hostname/full URL, paired with the explicit four-level scope selector described below. All-websites selection requires no URL input.
2. **Optional screenshot shortcut** immediately **underneath** website/URL input; blank means an **additive website rule** that adds its destination whenever a screenshot is already triggered on a matching page. When filled, it binds a capture shortcut and must pass existing collision checks.
3. **Cloud destination is the THIRD VISIBLE INPUT**, below the shortcut, with a clearly labeled selected authorized account/bucket/folder and a Choose Folder action. This is required for BOTH shortcut-bound and blank-shortcut additive rules. Only use `redown/screenshots/` as a default when genuinely authorized; do not make it an invisible caption.
4. **Save / Add Rule**, then **Saved Screenshot Rules** cards below, 25 per page. Show **'Shortcut · Ctrl+Shift+F6'** for a shortcut-bound rule, or **'Additive website rule · No shortcut'** for a blank-shortcut rule, plus site scope, exact destination, name and status. Click a saved card to open only that rule's full manager (§2A).

The top-level page is a **lightweight create-and-browse surface, not a full editor or a dashboard of manager tools**. Don't put an always-open comprehensive edit form or a "Manage shortcut" / "Manage all" button elsewhere on the page. Keep secondary naming (default Rule 1, Rule 2 ...), options and destination selection concise. A complete edit form is shown ONLY in the modal entered through a saved card.

The top **New Screenshot Rule** form uses these simple creation fields; it does NOT edit existing rule records:
- **Name** (editable; empty defaults to `Rule 1`, `Rule 2`, ... independent screenshot-rule numbering; stable underlying IDs, no renumbering on deletion).
- **Screenshot shortcut website/URL matching — FOUR mutually exclusive levels:** **(1) All websites** (permitted active browser pages); **(2) Entire domain + subdomains** (e.g. `google.com` matches `google.com`, `mail.google.com`, `maps.google.com` and all their pages, NOT `notgoogle.com`); **(3) Exact hostname** (e.g. `google.com` matches any page on `google.com` such as `google.com/search` and `google.com/preferences`, but NOT `mail.google.com`; selecting `mail.google.com` matches that host's pages only, not `foo.mail.google.com`); **(4) Specific full URL** (e.g. `https://google.com/search` matches that normalized scheme, exact hostname and exact path only, not `/preferences`). Provide distinct clear labels for (2) vs (3)—do not ambiguously label both "Specific website or subdomain". Exact-URL query matching may be optional and explicitly configurable; ignore fragments by default, never silently widen scope. Canonicalize safely using hostname label boundaries, NOT substring matching; use the trusted active-tab URL at capture time and keep sensitive query strings out of Secure diagnostics. The chosen shortcut routes its authorized screenshot only to its scope's exact destination.
- **Destination**: authorized provider/account/bucket and exact directory prefix; choose via real destination picker, not free-typed unverified targets.
- **OPTIONAL shortcut input is SECOND; clearly labeled cloud destination input is THIRD**. Blank means a valid additive website routing rule, not an error or disabled rule. Filled shortcut means a user-triggered capture rule with collision checks. Set/Change/Remove for saved rules happens through their own card manager (§2A); `Screenshot2Here` is a destination-only quick assignment. Reuse existing `src/api/shortcuts.mjs` and `extension/shortcut-settings.mjs` rather than creating another shortcut engine.
- **Save** on the top Screenshot tab **creates a new rule only**, and after confirmed persistence adds its card beneath the form; edits to existing saved rules are available **only via clicking their cards** and saving through that card's full popup. No accidental enabling if destination/capture prerequisites are missing.

Under the setup and **Save** button, **Saved Screenshot Rules** shows TWO distinct kinds of **clickable** card: **Shortcut destination card** (shows chord and primary destination) and **Additive website destination card** (shows 'No shortcut — adds a destination when matching screenshots are taken'). Both show name, site/URL scope, exact destination, Activate/Disable and far-right X Delete. Clicking the card body opens the **full Edit Screenshot Rule popup**; a small pencil button is not required. X deletes only this rule, never cloud data; retain keyboard accessibility, a safe confirmation as appropriate, and no accidental capture from clicking X. Disabled rules remain visible. Persist across restart. Show **25 rules per page** then Prev/Next + page number starting on rule 26. 25 is page size, not a total cap. Keep a separate saved list for general **Rules** (download routing) with the same 25-per-page, X-delete and Activate/Disable pattern.

## 2A. The ONLY full rule manager: click its saved card in More → Screenshot

**Distinct workflow:** More ▾ → Screenshot has precisely **three clear form inputs — Website/URL → optional Shortcut → Destination folder — then Save**, with saved shortcut-bound and no-shortcut additive cards underneath. **The FULL MANAGER for a saved rule is accessible EXCLUSIVELY by clicking that specific card inside this Screenshot tab.** Do not open the full rule manager from a general top-of-page button, from Settings, from the global More dropdown entry, or from the `Screenshot2Here` quick popup. The card body is the editor trigger; keyboard Enter/Space on the focused card does the same. The card's independent Activate/Disable switch and far-right X Delete do NOT open the manager or trigger a screenshot.

**This per-card manager popup is intentionally DIFFERENT from Screenshot2Here**. `Screenshot2Here` is a small, quick context-menu **assignment popup**, not a rule manager: it sets/reassigns only a shortcut's **destination** to the right-clicked folder. The comprehensive **Edit Screenshot Rule** manager is reachable ONLY from the saved card and allows the user to inspect/edit ALL properties of that existing rule:

- **Name** (existing/custom, editable).
- **Shortcut** (current key chord; Set/Change/Remove using the canonical shortcut registry, with collision checking).
- **Website/URL match scope** using the **four separate choices** above: All websites; Entire domain + subdomains; Exact hostname; Specific full URL. Show the relevant domain/hostname/URL input only for that selection. Changing the scope is an explicit edit, not an incidental effect of editing the destination.
- **Cloud destination** (currently authorized account, bucket and exact folder, with Change/Browse), plus clear current path.
- **Enabled/Disabled** state (or expose the switch exclusively on the card; in either case keep it synchronized).
- **Cancel / Save** footer and close X; edits are **staged until Save** and discard on Cancel/close. Confirm actual persistence before stating Saved. Keep the user on the same screenshot-rules list/page and update that card in place; no duplicated rule or shortcut binding. Use one stable rule ID throughout.

**Full per-card manager semantics:** A **Shortcut Destination** card opens the manager with its existing key chord, primary destination and match scope. An **Additive Website Destination · No shortcut** card opens the SAME full manager with shortcut intentionally BLANK and clearly labeled **"Automatically add this folder to screenshots taken by matching Click2Cloud shortcuts"**. Do not treat blank as a validation failure. If the owner chooses to add a key to that card, it becomes a shortcut-bound capture rule after Save; if the owner deliberately removes a key from an existing rule, the saved rule becomes an additive no-shortcut website rule after Save (with clearly explained consequences). Disabling the additive card stops extra copies but never disables the independent original screenshot shortcut. Both kinds of saved cards are accessed via More → Screenshot only; Shortcut2Here stays the fast folder assignment path.

**Example layout:**

```text
More ▾ → Screenshot
  New Screenshot Rule [setup and Save]
  Saved Screenshot Rules
    [ Ctrl+Shift+F6  ·  Rule 1  ·  All websites     (ON)   X ] ← click card
    [ Ctrl+Alt+P     ·  Product Pages · shop.example.com (ON) X ]
                         ↓
  ┌──────── Edit Screenshot Rule ─────────── X ┐
  │ Rule name       [ Product Pages          ] │
  │ Shortcut        [ Ctrl+Alt+P ] [Change]    │
  │ Match scope:                                │
  │  ( ) All websites                           │
  │  ( ) Entire domain and subdomains           │
  │  (●) Exact hostname    [shop.example.com]  │
  │  ( ) Specific full URL                      │
  │ Destination     [ Cloudflare / photos/products ] │
  │                              [Cancel] [Save]│
  └─────────────────────────────────────────────┘
```

**Scoping and reassignment:** Opening the full editor must prefill the saved rule, not start a new rule. Editing `shop.example.com` from Exact hostname to Entire domain + subdomains affects only this rule, after Save. Conversely, **Screenshot2Here** selecting this existing shortcut and replacing its destination **must retain its previous matching scope and name**, unless the user later deliberately edits them here. Both interfaces use the same existing persisted rule and shortcut registry, never competing settings or diagnostic systems.

**Tests:** In More → Screenshot, enter `shop.example.com` with Exact hostname selected; the shortcut input is directly **below** the website field; choose destination and Save → a saved card appears beneath. Clicking the card is the **only path to its full manager**, which preloads the current shortcut, exact destination and preselected scope; change name, destination, scope and shortcut → Save → same card updates without duplication after restart. Cancel/close leaves everything unchanged. Toggle and X on card do not open edit. With 26+ rules, paginate then click/edit a card on page 2 without moving or losing others. Creating/reassigning via `Screenshot2Here` updates that card but **never opens the full manager**.

## 2B. File Explorer directory right-click → Screenshot2Here (shortcut destination manager)

**This is a new owner-required QUICK ASSIGNMENT popup—not the full manager, not a route to the full manager, and not a request to screenshot File Explorer.** The sole full-manager entrypoint remains clicking the rule's own card under **More → Screenshot**.

On **right-click of a directory in Click2Cloud File Explorer**, show **`Screenshot2Here`**. Clicking it opens a **compact, aesthetically organized quick assignment popup** with the selected authorized **Cloudflare account → bucket → exact folder path** prefilled as the proposed destination, plus two ways to assign a screenshot shortcut:

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

## 2C. Owner-specified DEFAULT Screenshot Rule — Redown screenshots

Create or offer a **first-run default Screenshot Rule preset** with the following clear, user-editable values:

- **Rule name:** `Rule 1` (or `Screenshots` if a distinct descriptive preset label is required; do not silently renumber any existing user rule).
- **Website match:** **All websites** (only for explicit user-triggered capture, not passive/background automatic capture).
- **Destination:** Cloudflare R2 **bucket `redown`**, folder prefix **`screenshots/`**. The owner's `redown/screenshots` means **bucket = `redown`, prefix = `screenshots/`**, not a literal object key or a different bucket. Resolve the real currently authorized Cloudflare account/connection and confirm `redown` exists/has authorized write access before allowing this rule to be active. Never silently substitute another bucket, destination or default folder if `redown` is unavailable.
- **Suggested shortcut:** **`Ctrl+Shift+F6`**, selected as the initial default because the current Search / toolbar layout / panel reset shortcuts use F7 / F8 / F9. It is a *suggested*, editable binding, not an assertion that Chrome will accept it in every focus/context. Before registration, verify Chrome/browser command-key constraints, reservations, collisions with all existing user-remapped bindings and other Screenshot Rules, and availability of a legitimate capture gesture. If unavailable, show a clear conflict and ask the user to choose another shortcut rather than hijacking or overwriting one.
- **Trigger semantics:** With the preset enabled and authorized, `Ctrl+Shift+F6` captures ONE visible-page screenshot. The primary destination stays **`redown/screenshots/`**. **Automatically ADD** every enabled no-shortcut website rule matching the active page (e.g. `google.com → redown/google/`). **The browser submits the screenshot ONCE to the trusted Worker**, which fans out to every distinct authorized matching destination (subject to verified Worker capabilities). Other shortcut-bound rules are not automatically triggered. The 'Use matching rules' action is optional and NOT needed for blank-shortcut additive rules.
- **Onboarding / authorization:** Display these values in the Screenshot Rules editor on first use. Save/persist the preset in the same rules store, with a stable ID; **do not silently upload content or enable invalid routing** merely by offering a default. If authorization, shortcut registration or capture permissions are not available, show the preset as pending/disabled with a truthful explanation and an explicit Activate path. The user may edit its name, website condition, target, shortcut and toggle, or delete it.
- **Object filename:** a collision-safe screenshot filename under `screenshots/` with observed UTC timestamp and random/unique suffix (e.g. `screenshots/Screenshot-<timestamp>-<id>.png`). Preserve the exact destination in receipt/readback.

**Default preset acceptance:** Open Screenshot Rules for the first time on an authorized R2 account with accessible `redown`: see the `Rule 1` preset for `redown/screenshots/` and proposed `Ctrl+Shift+F6`. With no other active matching additive rule, one screenshot reaches only `redown/screenshots/`. After adding a no-shortcut rule for `google.com → redown/google/`, the SAME shortcut taken on `google.com` produces ONE capture, ONE browser upload to the Worker and server-side writes to BOTH exact directories, with separate results. On unrelated hosts, only the original target receives the screenshot. If the account, bucket or shortcut is unavailable, show a blocked state, not a silent fallback.

## 3. Screenshot rule matching is ADDITIVE, not exclusive

Unlike ordinary browser-download reroute rules, **Screenshot Rules are intentionally ADDITIVE**. When the user presses ANY supported active screenshot shortcut, one screenshot is captured and its existing shortcut destination is retained. Every enabled **NO-SHORTCUT** website rule whose domain/hostname/exact URL matches adds an additional destination **automatically**, without a separate menu action. One capture may yield multiple desired cloud objects, **but the extension uploads the screenshot only ONCE to the existing trusted Worker**, and that Worker fans out to each unique authorized destination via multiple server-side writes. Deduplicate only exactly identical provider/account/bucket/prefix targets, not distinct cloud locations; no rule collision for overlapping site matches. Provide independent verified/failed/unknown status per target. One failure produces partial completion, not a false complete status. Rules with their own different shortcuts do not auto-trigger.

**Routing semantics:** A shortcut-bound rule initiates one screenshot only if its OWN site/URL scope matches, and contributes its primary destination. Every active **no-shortcut** matching site rule adds a destination to that same capture, even if the screenshot was triggered by a different shortcut. No-shortcut rules do **NOT** trigger screenshots on their own. A separate 'Use matching Screenshot Rules' action may explicitly fan out, but is not necessary for normal shortcut captures. Never register two identical shortcuts; disabled rules do not run. `Screenshot2Here` changes only its chosen shortcut's primary folder, leaving additive rules untouched. The extension sends image bytes to the Worker ONCE, not once per target.

## 3A. ONE browser upload → EXISTING trusted Worker fan-out

**Owner's transfer architecture requirement:** When a single screenshot matches the original shortcut's primary destination and one or more additive website destinations, **do NOT upload the same image separately from Chrome for every destination**. Resolve and authorize the exact destination set first; capture the image ONCE; send the payload **ONCE** from the extension to the **existing trusted Cloudflare Worker/gateway**, which performs the multiple R2/cloud writes inside the trusted server environment. Example:

```text
Ctrl+Shift+F6 at https://google.com/search
  → ONE Chrome capture
  → ONE extension-to-Worker image upload (+ signed, scoped list of intended targets)
  → trusted Worker:
      1. redown/screenshots/    [primary]
      2. redown/google/         [matching no-shortcut rule]
  → per-destination results + one correlated overall result
```

**This reduces duplicate *browser uploads*, not the number of required cloud writes.** If there are 3 destinations, server-side processing still produces 3 objects, and each must be checked independently. Use one capture ID, one transfer/job ID, stable per-target child IDs, idempotent per-target object keys, bounded memory/streaming, truthful partial success and existing shared diagnostics/Raw/Secure export paths.

**Grounded architectural limitation (audited source):** `src/cloudflare/worker.mjs` currently validates a **single** capability destination against deployment `ACCOUNT_ID`/`BUCKET_NAME`; `right2cloud-module/src/cloudflare-worker.mjs` has a **single-target** writer. **Multi-target Worker fan-out is NOT implemented** in 0.3.20. Codex must design a **narrow, explicit screenshot fan-out extension to this existing trusted Worker**, not another Worker service, gateway, API, recorder, or general save pipeline. Validate every target's account, bucket and prefix through actual authorized server-side bindings or scoped grants. The existing Worker may only access its configured bucket; **do NOT claim arbitrary buckets or cross-account clouds can be written without additional permitted bindings/capabilities**. Support verified same-bucket multi-prefix fan-out first. Add other authorized buckets/accounts only when securely supported, explicitly configured and tested. Do not widen old save capability permissions or let the client forge a destination list.

**Transfer/verification conditions:** Never replay the full image body from the browser to each target. The Worker may need a bounded body buffer or appropriate safe spool for its multiple writes; enforce actual screenshot size limits, retry/lease semantics and byte-integrity checks. A failed second write must not erase the first successful copy or fabricate full success. Preserve per-target receipt/size/checksum evidence and partial/unknown semantics through the existing recorder and exporter. Ensure screenshot content is never logged. Avoid broad Worker redesign or source save-engine changes. If a safe single-upload multi-target path is not viable, **do not mark the screenshot fan-out as implemented**; report concrete blocker and do not silently fall back to N repeated browser uploads while claiming this contract is met.

**Proof tests:** (1) Primary `redown/screenshots/` plus no-shortcut `google.com → redown/google/` yields **exactly one browser-side screenshot capture, one inbound Worker upload, two independently verified server-side objects**. (2) Two additional overlapping no-shortcut rules yield one inbound upload and three writes, not three browser uploads. (3) Different URL/no-match yields only primary destination. (4) Same exact destination listed twice yields one cloud write. (5) One failed bucket write yields partial status with preserved successful copy and no secret leakage. (6) Worker rejects any forged/unbound bucket/account/prefix and does not affect normal right-click saves.

## 4. Capture, authorization and reliability boundaries

- Only capture browser-visible content the Chrome extension actually has permission/user gesture to capture. Don't promise full-page, hidden tab, entire desktop, or restricted scheme capture. A rule match alone does **NOT** auto-capture a page. Trigger must be user-initiated (right-click screenshot, explicit UI button, or eligible supported shortcut).
- Verify the tab identity at capture time; don't use attacker-controlled document data to route. Store screenshots in exact authorized bucket/prefix, collision-resistant filename (UTC timestamp + stable ID), preferably PNG with actual reported MIME type, without needless local Downloads-folder staging.
- Reuse the existing authenticated provider/File API/shortcut abstractions where technically appropriate; check whether Chrome commands/extension keyboard event APIs can support the chosen shortcut scope (Shelf-focused vs Chrome-wide). If Chrome-global bindings are unavailable or conflict, show the correct limitation rather than claiming to intercept OS-global shortcuts.
- Avoid unrelated permission expansion, unapproved cloud mutations and exposure of private page content to arbitrary accounts; require user-selected destinations and the intended capture consent. Do not create a separate screenshot transfer engine if a safe minimal adapter on the existing verified transfer API suffices.
- Distinguish capture success, upload accepted, cloud object actually verified, partial multi-destination completion and unknown states. Record small machine-inspectable per-destination diagnostics **using the EXISTING shared recorder/export infrastructure and separate event categories/operation IDs**—**never a second recorder or event store**. These events remain outside **right-click save History** and outside **bulk ZIP-only RRReceipt**. Support the current Raw/Secure exporter with scoped workflow ZIPs. Failure of diagnostics must not alter transfer outcome; see [the unified diagnostics contract](LIGHTWEIGHT_DIAGNOSTICS_AND_RAW_SECURE_ZIPS_FOR_RULE_TRANSFERS_2026-11-19.md).
- A screenshot may have multiple destinations from **overlapping no-shortcut website rules** plus the triggering shortcut's primary folder; no collision. Only one browser upload is allowed and the existing trusted Worker handles the fan-out with separate per-target results. Do not confuse shortcut uniqueness with additive routing.
- If real capture/upload is blocked by permissions/capabilities, deliver the saved-rule UI only with honest disabled/pending-capture states and the exact blocker. Never show a fake "uploaded" success.

## 5. Required focused acceptance

1. **More** contains **Rules**, **Screenshot**, **Settings** in that exact order. Screenshot opens a dedicated screenshot-rule editor, not a capture.
2. In Chrome right-click, Screenshot permits choosing an actual authorized R2 bucket and nested directory, and the screenshot goes to that exact location only.
3. Create one active **shortcut-bearing** rule for `example.com → bucket A/photos`, then two active **NO-SHORTCUT additive** rules for `example.com → bucket B/backups` and exact host `shop.example.com → bucket C/shops`. Press the first rule's shortcut on `shop.example.com` **only if its configured scope includes subdomains**, yielding ONE screenshot, ONE browser upload to the existing Worker and THREE separate authorized cloud writes with independently verifiable results. On `example.com` only the matching primary and backup destinations are written; on unrelated sites the site-restricted shortcut must not capture or upload. No substring matching of lookalike hosts.
4. Create 26 screenshot rules => page 1 has 25, page 2 has 1; edit, X-delete, enable/disable and restart persist correctly. General download Rules uses the same management controls and pagination independently.
5. Assign a unique shortcut to screenshot `Rule 2`; pressing it on a matching host causes ONE capture and ONE browser-to-Worker upload, then server-side writes to **Rule 2's primary folder PLUS every enabled matching NO-SHORTCUT additive rule destination**, never triggering other shortcut-bearing rules. Disable one additive rule → its target is omitted but the primary remains. Reject key collisions including F7/F8/F9; disabled triggering rules cannot initiate captures.
6. **Screenshot2Here directory popup:** test new shortcut input, 30 existing shortcuts in scrollable chooser, replace-one shortcut old/new path confirmation, no duplicate command, retained exact-URL matcher, Save-only persistence, Cancel, conflicted shortcut validation, and UI/Settings sync after restart.
7. **Screenshot Rules card → Edit popup:** click any saved card (including on page 2 of pagination) to open populated full rule editor; edit name, shortcut, domain/hostname/full-URL scope, cloud destination and enabled state; Save updates one rule only, Cancel/X discards. Card's Activate/Disable and X Delete do not inadvertently open the editor or take screenshots. Confirm complete domain matches all subdomains, exact hostname excludes subdomains, exact URL excludes unrelated page paths.
8. Genuine Chrome capture/capability, exact target routing, proper consent, safe error reporting, and receipts are proven in focused fixtures and (only if available) authorized Chrome/R2 disposable-object checks. Mark anything not exercised as unverified.

**Do not reimplement the already built shortcut registry, Chrome save menus, general download ZIP, or filename-search system. No broad Worker redesign.**
