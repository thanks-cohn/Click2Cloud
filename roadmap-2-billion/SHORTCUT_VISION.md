# My Vision for ReDown Shortcuts

*Founder’s vision — November 26, 2026*

**Your keys. Your clouds. Your rules.**

## Freedom to make the computer one's own

I want ReDown to give people the freedom to decide what their keyboard does for them. I do not want to prescribe a permanent combination of keys for every operation, or make the user learn my preferred arrangement. I want them to create an arrangement of their own, change their mind tomorrow, and change it again whenever they feel like it.

A person may have little use for some of the shortcuts they already know. I want ReDown to let them release any of its own unnecessary assignments and repurpose available combinations wherever the browser permits it. I would preserve familiar copying and pasting with Ctrl+C and Ctrl+V by default, but I do not want Ctrl+X, for example, to be artificially excluded from the available combinations merely because it traditionally means Cut. Reassignment must be deliberate, and ordinary editing must remain intact outside the recognized ReDown gesture. Browser- and operating-system-reserved shortcuts cannot be promised to be replaceable, and ReDown must not interfere with another application's settings or security boundaries.

The user, not the developer, should decide how ReDown fits into their day.

## Hold. Click. Save.

I want a person to hold a chord of two or three configurable keys, click something they want to keep, and have it saved to the destination they chose beforehand. They should be able to keep the chord held and deliberately click several distinct eligible items, then release it to return to ordinary browsing.

I want several such shortcuts to coexist. One chord might save to a particular Cloudflare R2 bucket and directory; another might save to Dropbox's redown folder; another to a custom directory in Google Drive; another to OneDrive's original cloud destination without the redown folder. They might also choose a binding that follows their account's current default instead of a fixed folder. They should not have to open ReDown or change a global setting each time they want to send a file somewhere else.

These are illustrative routes, not prescribed keys or mandatory folders. The exact combinations and destination choices belong to the user.

Cloudflare is our reference implementation because its accessible API allowed us to explore the concept. The first commercial release should generalize that behavior across Cloudflare R2, Google Drive, OneDrive and Dropbox. Screenshot to Cloud should enjoy the same freedom of destination and multiple independently configurable shortcut assignments. Screenshot keypress, held chord + click, Explorer and shelf controls share one registry so overlapping triggers cannot dispatch accidentally. We should not maintain four separate gesture systems or four independent transfer engines.

## A shortcut is an assignment, not a permanent obligation

I want an understandable Shortcuts section where the user can create, change, disable, remove and release ReDown's assignments. They should see which keys are used, what action they perform, and where a saving action will send its content. They should be able to release all ReDown shortcuts without erasing destinations, rules, files or other settings, and restore defaults only by choice.

When a person wants to use an already assigned combination, I want ReDown to tell them plainly what it belongs to. For example:

> This shortcut is currently assigned to Screenshots. Override the existing assignment or change its keys, then press Save.

Show the previous and new action and destination directly in settings. They may select Override to release the old assignment, or enter different keys for the old action. One Save applies both chosen settings together. Cancel leaves both unchanged; an invalid or failed change must preserve or restore the working settings. I do not want a separate complex transaction system. If the browser or operating system reserves the keys, explain the limitation and allow them to choose another combination. Do not pretend ReDown can release shortcuts belonging to Chrome, Windows or unrelated applications.

I want the conflict dialog during configuration, not every time someone saves. Once a binding has been configured and authorized, the normal experience is simply hold, click, save.

## The Shortcut API

To deliver that freedom reliably, I want one internal Shortcut API. It should own the canonical binding registry, recognition and validation of gestures, conflict detection, reassignment, lifecycle state and dispatch to existing production actions. It should be lightweight, event-driven, versioned, programmatically inspectable and testable through our existing scoped interfaces. I do not want a new public service or a duplicate execution engine.

Screenshot capture, Click & Save, Explorer actions and shelf controls should follow consistent assignment rules wherever technically supported. Each action may have different prerequisites and trigger semantics, but the user should not need to learn a different settings system for each one. Browser command triggers and held-key page gestures must remain distinct where their APIs require it.

The Shortcut API should determine what the user intends to do. The shared Destination API resolves the authorized provider, account, folder or bucket/prefix. The Universal Save API carries out and verifies the operation, handles recovery and usage accounting, and supplies the outcome to History, receipts and the optional animation. Shortcut configuration should reuse canonical destination and manifest schemas rather than introduce a competing settings store.

## The rules that make freedom dependable

- A supported chord must be editable. There should be no hardcoded immutable ReDown user-facing assignment.
- One deliberate eligible gesture must dispatch one intended action. Exact matching and conflict validation must prevent duplicate or overlapping chords from sending two saves.
- An explicit destination-bound chord must honor its selected provider, account and arbitrary selected folder. The built-in redown mode is the deliberate exception: if the standard folder is not already ready, start saving to the same account's authorized original cloud destination while redown is prepared independently, without a fallback notification. New saves use redown when ready; earlier saves remain where they started. Record the actual location in the receipt. No cross-account/provider redirection. Keep V1 simple: reuse existing folder choices, do not implement new arbitrary directory creation for basic-cloud shortcuts. An account-default binding follows the documented rule/default precedence.
- A change to the binding must not retarget work already admitted. A disconnected or missing target should be repairable, not secretly substituted.
- Configuration survives restart and compatible updates; transient armed state does not. Release, blur, navigation, tab or window changes, and cancellation clear stale gesture state.
- Ordinary clicks, typing and text editing should continue normally outside an intentional supported gesture. No global keylogging, arbitrary keystroke storage or permission bypass.
- Reuse existing authorized access. Necessary browser and provider permissions must be respected, but do not repeatedly ask for consent during normal authorized saves.
- Acceptance feedback and verified completion must be distinct. One logical save gets one confirmed receipt and at most one applicable usage debit; retry must not create a second save or charge.
- If one provider fails, isolate its failure and allow other authorized provider bindings to keep working when shared infrastructure permits. Never quietly move an intended file to another cloud.

## Engineering before ornament

I want these principles established before we expand the interactions: Part 2 should define or consolidate the shared Shortcut API, versioned binding and destination contracts, migration and deterministic fixtures on the accepted reliability foundation. Unified Part 3 should implement and qualify the actual configurable interaction and screenshots on all four providers, and reuse the same configuration in the Media & Manifest work. These are V1 requirements, not V2 aspirations.

The Laboratory should be able to verify assignment, replacement, overlapping combinations, keyboard layouts, focus and restart behavior, destination accuracy, provider-local failures and recovery. Synthetic gesture tests must be distinguished from real installed-browser actions and authorized provider verification. The aim is no silent misdirection, duplicate dispatch, unexpected exception or unnecessary prompt in the supported acceptance cases. I want a year of dependable use, not a promise that bugs will never occur. The product should be maintained and critical repairs should remain available.

## The experience I want to sell

I want ReDown to be useful enough that a person who rearranges their computer around it finds themselves using it naturally every day. I want them to feel free to change their mind without fighting the software.

The one-time lifetime allowance of thirty remote saves and thirty right-click saves gives them an opportunity to experience the product. The proposed twelve-dollar annual subscription offers unlimited ReDown saving subject to provider limits. Counting and migration details still need to be settled; reliable and disclosed usage continuity must not complicate the ordinary gesture.

My ambition is one billion paying customers. That is an aspiration, not a forecast. To pursue it, I want the most demanding engineering to result in the fewest unnecessary actions for the customer. A keyboard, a mouse, the cloud they already use, and the freedom to decide what happens next.

**ReDown. Shortcuts. Shortcuts everywhere.**

**Hold. Click. Save.**

**One good year for twelve dollars.**

---

Companion: [My Vision for ReDown](VISION.md) and [Roadmap to Two Billion](README.md). This document expresses the product vision; it is not evidence of completed implementation or permission to bypass the active Codex acceptance gates.
