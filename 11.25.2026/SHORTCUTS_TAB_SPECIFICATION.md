# ReDown — Shortcuts Tab Specification

Owner-approved interaction direction, November 27, 2026
Reference: MY_INTENDED_IMPLEMENTATION.md and the approved interactive Shortcuts tab prototype. Part 2 establishes shared contracts and safe migration; Part 3 implements the actual UI and all-provider screenshot/chord-click workflows. This document controls the new shortcut destination selectors and supersedes earlier proposals to expose extra basic-cloud destination modes in those selectors. Preserve existing reliability, authorization, usage, scope and release requirements.

## 1. Intent and visual structure

Extend the working ReDown experience rather than redesign the application. A single Shortcuts tab in the existing navigation gives customers direct control over screenshot keys, Shortcut + Click routes and ordinary configurable Explorer/History assignments. Reuse the existing theme/Aesthetic API and shelf layout, including Onyx; the approved prototype is a layout reference, not literal production CSS, hardcoded data or proof of functionality.

In top-to-bottom order:
- Shortcuts heading.
- Screenshots: existing two assigned rows, showing action, actual configured provider/destination and key; select a row/key to edit. Support additional independently editable screenshot bindings where browser capabilities permit. Existing Screenshots tab remains the place for its full website-rule, capture and manifest settings; both views read/write the same canonical bindings.
- Shortcut + Click: saved binding rows showing key, provider and location; a simple Add shortcut control and inline editor. On the empty first visit, showing the inline editor immediately is acceptable and matches the approved prototype. One short instruction: Hold your shortcut and click an image to save. Do not force a configuration or tutorial.
- Explorer & History: existing History, Open Explorer search, Focus filename search and optional Divider cycle. Divider cycle is unassigned by default. Keep the current settings choice for divider behavior.
- Collapsible Built-in controls: retained copy/paste, select all, selection, navigation, open/dismiss, delete and relevant context-specific controls.
- Existing shared footer, scroll and navigation behavior. No extra permanent status footer, fake online indicator or prototype text in production.

Use clean compact rows, subtle separators, existing minimal underline dropdown styling, readable labels and theme-aware focus states. No nested bulky cards, unnecessary dialogs, page overlay or forced shelf opening. Editor labels: Shortcut, Provider, Location (basic clouds) or Bucket and Directory (R2), plus Cancel and Save. Show account selector only where needed to disambiguate authorized accounts. Preserve accessibility, narrow shelf layout, keyboard focus and scrolling; use existing accessible controls rather than new custom dropdown framework.

## 2. Exact provider and destination controls

Provider choices: Cloudflare R2, Google Drive, OneDrive, Dropbox; list actual connected/eligible accounts and explain unavailable connection where relevant. Do not manufacture accounts, buckets or directories. Selecting a provider determines the displayed fields.

| Provider | Location controls for a newly configured screenshot or chord-click binding |
|---|---|
| Google Drive | ReDown folder / Account default |
| OneDrive | ReDown folder / Account default |
| Dropbox | ReDown folder / Account default |
| Cloudflare R2 | Existing authorized bucket selector and existing directory/prefix controls |

For all three basic providers, the Location dropdown has EXACTLY TWO choices: ReDown folder and Account default. No third Original cloud location option, no separate Existing folder/custom folder option, no directory text field or folder picker in this new binding editor. Same choices in both shortcut and screenshot destination configuration. Do not introduce an arbitrary folder creation workflow. On R2 use the existing working setup, including root/prefix and applicable rule behavior; do not flatten or replace it.

ReDown folder explicitly requests the standard visible redown folder for the selected authorized account. Account default uses the selected account's existing approved default resolver (including applicable rules and opt-out/original behavior as defined in Part 2); it is not a separate new root selector. Keep account identity explicit when multiple accounts exist; do not silently use another account.

This is a simplification of the screenshot/chord configuration UI, not a prohibition on existing explicit Save Here/manual Explorer destinations or internal canonical target descriptors. Preserve unrelated file operations and existing R2 destinations. If an older authorized basic-cloud binding or imported manifest contains a legacy explicit root/custom target that cannot be represented by the two new choices, preserve the original stored intent and explain its existing destination without silently mapping it to a different target. Require a deliberate user choice of one of the two modes to replace that legacy intent; unresolved imports must be explicit and must not dispatch to guessed targets. Do not offer root/custom as extra choices in a new binding editor. Inspect real predecessor data before deciding whether any such legacy records exist.

## 3. Mandatory silent fallback — done and done

For a basic-cloud ReDown folder binding, if a verified usable redown folder is already ready, save there. Otherwise immediately start saving to the selected account's authorized default/original save destination, using the existing Part 2 same-account fallback resolver. Do not wait for folder discovery, creation, a retry or verification. If the account's configured default itself normally uses redown, resolve its authorized original location without recursively retrying redown. Do not reroute to another provider/account or unrelated arbitrary target.

Independently prepare/reuse redown with bounded lifecycle-triggered work. If it cannot be created, is denied, deleted, ambiguous, conflicting, times out, or its creation acknowledgement is uncertain, the ordinary save simply uses that account's default/original location. No warning, confirmation, fallback toast, popup, forced repair, wait or extra customer step. Normal verified completion feedback is unchanged. Record the actual destination in the operation receipt and History. If default/original is not authorized or the actual file transfer fails, present the existing truthful actionable error; no bypass and no false success.

Once redown becomes verified ready, only new ReDown-folder operations switch to it. Do not move old files. If a previously verified redown folder becomes unusable during dispatch, fallback is allowed only when nonpublication is established per the Part 2 frozen-operation/batch contract. An uncertain file publication is not permission to create a second copy. Independently recover/reconcile the original operation. Account-default bindings follow existing account preferences and rules. Explicit redown binding takes precedence over applicable rules; fallback changes only the unavailable standard folder, not the chosen account, feature allowance group or source.

## 4. Shortcut choices and conflicts

One canonical registry feeds every available-shortcut dropdown (screenshots, held chords, configurable Explorer/History). Show only actually eligible unoccupied candidates for the relevant action, trigger and scope; keep the row's own current assignment visible while editing. Recompute after saved changes, actual browser registration changes, relevant layout/scope changes, disable/remove or release. Do not hardcode the prototype's illustrative candidate pool. Respect Chrome/OS reserved shortcuts, AltGr/layout, protected editing, supported command slots and overlapping two-/three-key held chords. Ordinary browsing and typing must remain normal.

Provide Custom… to enter a supported combination. If it is in use, show the existing assignment/action and target plus the requested action/target. Offer Keep existing (cancel conflicting change), Override (old assignment becomes unassigned), or Change existing shortcut (choose another eligible free key). One Save applies the chosen changes together after validating the complete proposed configuration; Cancel changes nothing. No duplicate active dispatch or pre-Save override. If registration/persistence fails, preserve or restore previous working state where possible and show actual browser constraints. For Chrome-managed assignments that require chrome://extensions/shortcuts, expose the real required action and confirm actual registration; do not claim arbitrary dynamic registration. The ordinary available-dropdown path should not invoke a conflict dialog.

Retained defaults: Alt+Q and Ctrl+Shift+Y screenshots; Alt+Shift+H Shelf/History; Alt+Shift+F open Explorer search; Ctrl+Shift+F7 local filename search. Keep Ctrl+C/V/A, Delete, Enter, Escape, filename selection, navigation, selection modifiers, column and preview controls and zoom. Release Ctrl+Shift+F9, Ctrl+X, Shift+F10, Ctrl+Shift+N, F2, F5 and Backspace as inherited ReDown assignments. Additional refresh remains unassigned. Keep underlying actions for the other six; remove the cloud-file Cut feature entirely (per MY_INTENDED_IMPLEMENTATION.md), preserving ordinary text editing, Copy/Paste, direct Move and supported drag/drop. Do not reintroduce released defaults through Restore Defaults. Retain legitimate unrelated customizations, use safe migration, no claim that released keys are necessarily available in Chrome. Keep the Menu key where supported and ensure context menu is keyboard-accessible even on keyboards without it.

## 5. Configuration and runtime

One setup for each independent route:
1. Choose or enter an eligible shortcut.
2. Select provider/account.
3. Choose one of the supported destination controls above.
4. Save.

Rows can be added, edited, disabled or removed using existing direct UI conventions; existing configured row shows actual key and destination, unassigned is truthful. Save validates current scope, binding revision and selected destination. Editing/cancelling cannot alter any admitted transfer. Use versioned stable binding IDs and shared settings persistence; no competing store. Reuse shared configuration/manifest operations and canonical resolver. No credential export. Do not implicitly perform a capture or file write while configuring or importing.

Screenshot: reuse the existing R2 capture path as reference; provider-neutral captured bytes enter the same authorized production save engine for all four clouds. Preserve capture gesture, permissions, rate limits and selected current tab. No deferred capture of a different tab.
Shortcut + Click: hold two or three configured keys, deliberately primary-click an eligible item, submit exactly one logical operation through existing shared save path. Stay armed for distinct eligible clicks while held; disarm on release, focus/visibility loss, navigation, tab/window/frame change or cancellation. No duplicate event bubbling, auto-repeat dispatch, synthetic-page-event bypass, arbitrary key logging or broad new permissions. No interception of ordinary editing or unarmed clicks. Verify source, sender, scope, provider/account and frozen destination. Preserve queue, retries, existing normal feedback, one verified receipt and exactly one allowance settlement for successful logical save. No new transfer engine.

## 6. Agent-native implementation and qualification

Human UI and authorized programmatic equivalents use the same actual registry, validation, resolver, recognizer, source and transfer services. Reuse existing scoped interfaces, add only missing callable boundaries. No public test endpoints, separate simulator implementing business rules, production fault controls or authorization bypass.

Document the meaningful actions and inputs, expected outputs, authorization boundaries and independent assertions. Test list/availability, editing, validation, save/cancel, override/reassign, disable/remove, release/restore defaults, import/export, capture-source and normalized press/click/release/lifecycle inputs. Programmatically execute complete screenshot and chord-click paths through shared production admission, publication fixture, independent content verification, Queue/History, receipts and usage state. Exactly one dispatch for eligible authorized gesture; zero for invalid/unarmed/conflicting inputs. Verify real browser input, registration, capture, DOM wiring and live authorized provider publication separately; a direct API call alone proves none of those.

Required acceptance matrix:
- Both screenshot and chord-click editors: all three basic providers display exactly ReDown folder and Account default; R2 displays existing bucket/directory controls; no extra basic-cloud destination fields. Switching provider updates controls correctly; Cancel leaves previous binding unchanged.
- Each basic provider, both actions and both destination modes: correct account, actual target, exact file bytes, one verified receipt/credit. ReDown folder ready, absent, creation pending, denied, timeout, conflict, uncertain creation, deleted/stale folder; default/original save starts before optional preparation completes, no fallback notification, later new operations use ready redown. Actual transfer failure is truthful, unknown publication reconciled without duplicates.
- Multiple accounts, default preference and rule changes, opt-out, provider switch, existing legacy configurations, manifest round-trip, reload, restart, stale edit/import, conflict and rollback. No silent target change or lost working config.
- Dropdown filtering and actual scope/layout validation; retained and released keys; Cut absence; supported explicit rebindings; protected editing, navigation and accessibility. Include Chrome command limitations.
- Chord timing, release order, repeated distinct clicks, focus/visibility, overlapping chords, worker restart, unsupported contexts, revoked permissions, capture failures, provider fault isolation, allowance boundaries and exact source integrity.
- Packaged UI/theme/narrow shelf, keyboard access, focus, error feedback, no duplicate settings stores, no unrelated UI or transfer regressions. Verify ordinary right-click/manual upload/retrieval continue independently.

Use seeded pairwise and targeted higher-order/stateful cases, affordable thousands of lightweight permutations when practical, independent oracles and reproducible bounded receipts with exact seed/case/version/expected/actual. Supply fast/extended/replay commands. Codex runs affordable focused/seeded and packaged tests before a qualified handoff. Owner handles necessary installed Windows/live-cloud acceptance and optional longer scripted campaigns, not first-line logic debugging. Keep max 45 minutes per session, begin handoff preparation by minute 35, push/handoff by minute 45; additional bounded sessions if required. Report PASS/FAIL/BLOCKED/NOT_TESTED honestly. All inherited prerequisite repair, monthly ten-pool allowance, provider, media/manifest and commercial release gates remain in force.

**Customer experience: choose a shortcut, choose a cloud, choose a location, save. If redown cannot be made, use the account default. Done.**
