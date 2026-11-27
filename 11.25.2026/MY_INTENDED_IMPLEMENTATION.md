# MY INTENDED IMPLEMENTATION

Owner direction — November 27, 2026
Scope: ReDown Part 2 and Part 3. Read alongside the current master roadmap, the two CODEX_REQUEST.md files and the Media & Manifest annex. This document explains the intended implementation and interaction philosophy; it does not authorize bypassing inherited reliability, authorization, evidence or release gates.

## 1. Extend what already works

I do not want ReDown redesigned just because we are adding providers or configurable gestures. Our existing screenshot, right-click and folder-selection interactions demonstrate the simplicity I want. In Simple mode, the customer can select a folder and save through right-click; Narrow and other existing modes retain their established behavior. The controls are direct. The customer should not need to study the program before using it.

I want the remaining workflows to follow that same principle: familiar controls, minimal setup, a direct action and a trustworthy result. Keep working code, existing themes and the current production engine. Add only the missing capability or shared boundary that is genuinely necessary.

## 2. Screenshot to Cloud: extend the existing destination controls

Add a cloud-provider dropdown to the existing screenshot location configuration. Do not build a separate screenshot application for every provider.

- Cloudflare R2: selecting it brings up the existing working Cloudflare setup, including its established bucket, directory/prefix and rule behavior. Reuse rather than replace it.
- Google Drive, OneDrive and Dropbox: select the connected account where needed, then use a straightforward destination dropdown for the supported ReDown folder, original cloud location, account-default mode or an already authorized existing folder. Do not require arbitrary remote directory creation.
- Preserve existing screenshot rules and working assignments. Provider choice should only change the relevant destination controls.
- The missing basic-cloud screenshot functionality is implemented by connecting the existing capture mechanism to the shared authorized save engine, not by inventing four capture engines.
- Built-in redown mode uses the approved same-account original-location fallback immediately when redown is not already verified ready; prepare redown independently. No extra fallback dialog or notification. Explicit arbitrary folder targets retain their normal authorization and error semantics.

The customer should be able to select a cloud, choose the location and finish configuring the screenshot action. Use the existing layout and controls wherever possible.

## 3. Release unnecessary shortcut assignments, preserve the useful ones

I want the customer to have a useful selection of available shortcuts rather than find that all the convenient choices are already occupied by ReDown.

**Owner-approved shortcut defaults (November 27, 2026; baseline inspected at 0.3.32.4 / ade3a1b60ccef6728c236236cd95030fb8cc8652; revised owner decision):** Keep Alt+Q and Ctrl+Shift+Y for screenshots, Alt+Shift+H for Shelf/History, Alt+Shift+F to open Explorer and focus search, and Ctrl+Shift+F7 for Explorer-local filename search. Release these seven inherited ReDown assignments: Ctrl+Shift+F9 divider cycle, Ctrl+X cut, Shift+F10 item context menu, Ctrl+Shift+N new folder, F2 rename, F5 refresh and Backspace parent navigation. Keep their underlying actions available via the existing interface; divider cycle remains a settings option and assignable action with no default chord. Additional refresh remains unassigned. Remove the actual default dispatch handlers for released keys (including F2 preview rename where applicable), not just the displayed labels; ordinary browser/OS/text-editing behavior must remain intact. Retain the separate Menu key where supported and existing keyboard-accessible UI paths for context menus and all released actions. Preserve Ctrl+C/V/A, Delete, Enter, Escape, filename type-to-select, arrows/Home/End/Page Up/Down, Shift/Ctrl selection modifiers, left/right column resize and preview navigation, and preview-only +/− zoom. Selection modifiers are explicitly retained. Scope contextual actions appropriately. Restore Defaults must not reintroduce any of the seven released assignments. Preserve unrelated explicit user customizations; distinguish inherited defaults from explicit custom overrides and keep supported intentional rebindings editable/releasable. Released keys are candidates only if the actual trigger, scope, layout, browser/OS reservations and protected editing behavior permit them; Ctrl+Shift+N (Chrome Incognito), F5 (browser refresh) and other browser-owned keys are not automatically available for Chrome-wide use. Offer only verified eligible free choices; do not expand interception or bypass browser reservations. Test fresh install, migration, reload, restore defaults, manual rebinding, dropdown filtering, release of all seven default handlers, retained controls and ordinary browsing/editing; confirm zero ReDown dispatch for released keys unless explicitly rebound in an eligible context. Keep the implementation simple and reuse existing handlers and registry.


## 4. Shortcut dropdowns should prevent conflicts naturally

Use one shared source of truth for shortcut assignments and their availability.

- An occupied key combination should not appear as an available option in another shortcut dropdown. The current assignment remains visible when editing its own action.
- Recalculate available choices after a successful assignment, edit, release, removal or applicable scope/layout change. Do not maintain separate, inconsistent lists for Screenshots and Shortcut + Click.
- Only offer technically supported, unoccupied choices. Check canonical equivalent keys, conflicting immediate versus held triggers, ambiguous overlapping chords, scope and keyboard layout. Do not mistake a suggestion for proof of browser registration.
- Users may also enter a supported key combination manually. If it is already in use, show the old action/target and the requested new action/target.
- Let the customer keep the old assignment (cancel the conflicting change), override it, or edit the old assignment to a different available combination. One deliberate Save applies the selected changes together; Cancel leaves the existing working configuration unchanged.
- Validate the entire proposed configuration before applying. No silent override, duplicate active dispatch or apparent success when browser-managed registration is unavailable. When a real browser settings action is necessary, make that limitation clear rather than claiming it was performed programmatically.

The ordinary dropdown path should avoid most conflicts. The existing conflict-resolution design is the fallback for manual entry and actual stale/conflicting settings, not an extra step on every save.

## 5. Shortcut + Click: one simple section

Create a straightforward Shortcut + Click section/tab within the existing shortcut/settings experience. Reuse the screenshot location controls and available-shortcut dropdown behavior. Do not introduce a complicated workflow builder.

The intended setup is:

1. Choose or enter a supported two- or three-key chord.
2. Select a provider and connected account where necessary.
3. Choose the destination (existing R2 bucket/prefix controls for R2; simple supported location controls for basic clouds).
4. Save the binding.

Support multiple independently editable bindings. Use existing add/edit/remove/disable affordances where suitable. Once configured, the customer holds the chord, clicks an eligible source, and saves. Releasing the chord returns to ordinary browsing. No routine extra confirmation, opening Explorer or opening the shelf for an already authorized save. Match the directness of our existing screenshot and right-click interactions.

The genuinely new functionality is chord recognition and its connection to the existing authorized save path, plus the basic-cloud screenshot integration. Inspect and preserve any working predecessor code first. Use one shared recognizer/registry and destination resolver, not provider-specific shortcut engines. Preserve actual browser gesture, permission, focus and capture constraints. A direct API call is not proof that an actual browser gesture works.

## 6. Make the simple interaction fully agent-testable

I want Codex to test these workflows through their programmable equivalents thousands of times where practical before I receive a qualified candidate. The same production functions should serve human actions and agent tests. The visual interface is not a second implementation of the business logic.

For example, a scripted chord-click test configures a binding, feeds normalized press/click/release and lifecycle events through the production recognizer, checks the recognized source and destination, submits through shared save admission, verifies the resulting bytes independently, and verifies Queue, History, receipts and allowance accounting. Valid eligible gestures must produce exactly one dispatch; invalid or ordinary gestures must produce zero. Test the complete chain, not only a direct downstream save call.

Apply this philosophy throughout ReDown: screenshots, right-click, file/folder upload and retrieval, account connection/recovery, settings and rules, Explorer, Queue, History, media, manifests and licensing. Inventory meaningful human actions and their existing or minimally extended programmable equivalents, expected outcomes, authorization boundaries, independent assertions and regression coverage. Visual-only behavior can be checked with browser interaction, DOM and rendered evidence rather than inventing unnecessary APIs.

Use isolated fixtures and seeded combinations, reusable fast/extended/replay commands and bounded redacted receipts. Preserve actual browser integration and authorized live-cloud verification as separate evidence layers. No test-only shortcut around ordinary authorization, no production fault controls and no separate simplified transfer engine. Test real browser registration, capture, event wiring and representative GUI behavior before handoff wherever the environment permits. My final manual verification should focus on actual Windows behavior, live-cloud acceptance, aesthetics and usability, rather than finding elementary logic bugs that Codex could have caught. The inherited 45-minute session limit, minute-35 handoff preparation and minute-45 push remain; incomplete work is a checkpoint, not a qualified release candidate.

## 7. Implementation boundary

Do not turn simplicity into a large speculative framework. Reuse existing functions, services and internal scoped APIs; add targeted interfaces only where needed for actual functionality or verification. The current Part 2 prerequisite repairs and shared production contracts come first; Part 3 completes the actual all-provider screenshot and chord-click experiences and their packaged qualification. Preserve the approved monthly 100-save free tier, $12/year unlimited proposal, existing folder behavior and reliability requirements.

The customer sees direct, easy controls. Codex sees callable, observable and verifiable behavior behind those controls.

**Do not multiply the interfaces. Multiply the supported destinations and actions behind familiar interfaces.**
