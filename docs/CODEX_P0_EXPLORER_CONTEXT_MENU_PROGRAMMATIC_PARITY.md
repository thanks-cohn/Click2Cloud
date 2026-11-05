# CODEX P0 — Real Explorer Context Menus, Scriptable V3+1, Working Cloud Saves & Left-Side Cloudflare Login

**Owner request:** November 5, 2026  
**Repository:** `thanks-cohn/Click2Cloud`  
**Purpose:** This is a **Codex implementation request**, to be used with `first-use-report.md` and the existing scaffold implementation request. **It is not a completed-feature or test report.**

Read first: `AGENTS.md`, `first-use-report.md`, `docs/CODEX_P0_BUILD_SCAFFOLD_V3P1_AGENT_READY.md`, `scaffold/README.md`, `scaffold/gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md`, `docs/UNIVERSAL_FILE_API_EXTRACTION.md`. Resolve any conflict in favor of the owner's requirements in this document. Inspect actual repository code and report what exists; don't assume prior assistant commits have been tested.

## 0. What the owner actually wants

The owner requested a Codex task, **not for the assistant to independently prototype random source changes**. A previous assistant committed preliminary changes to `main` attempting a menu overlay and headless API. These edits are **not acceptance evidence**. Before building on them, audit their syntax, integration, security, UI behavior and implementation completeness; freely correct/refactor/revert them. Keep REDOWN production unchanged.

The goal is a **real right-click menu inside Click2Cloud Explorer** with the same nesting, route identities, situations and save behavior that V3+1 registers in Chrome. The Explorer is both the everyday human interface **and a first-class programmable test surface**. Codex/Python/JS automation must be able to inspect an exact, structured menu tree and choose a specific legitimate action without guessing from pixels or labels.

**The menu must actually save file bytes to the selected cloud destination.** The authoritative file backend is REDOWN's existing Universal File API as extracted into Click2Cloud. V3+1 controls right-click configuration/compilation/dispatch and owns Chrome native contextMenus. Do not build a second file API, a parallel upload pathway, or resurrect REDOWN's buggy old V3 context menu.

**The Click2Cloud Explorer's Cloudflare LOGIN button belongs in the LEFT SIDEBAR, borrowing REDOWN's UI placement and aesthetic. KEEP CLICK2CLOUD'S OWN OAUTH IMPLEMENTATION AND CLIENT ID.** Do not transplant REDOWN's OAuth identity, tokens or sessions.

## 1. P0 first-use defect: right-click appends buttons to a row

Owner experienced: right-click an Explorer folder → four controls appear **inside the row**. Right-click again → a duplicate set is appended. This repeats indefinitely. It is a confirmed code-level issue in the earlier `extension/app.mjs` implementation: constructing a new menu and doing `row.append(menu)` on every contextmenu.

**Replace with a true context menu:**

- A single floating, cursor-anchored overlay for each active Explorer context. Do not change row height, attach controls inside rows, or accumulate menus/listeners.
- Close/replace the old overlay on a subsequent right-click; close on Escape, outside click, navigation, view change, scroll or losing focus. Keep focus restoration correct.
- Keyboard-operable `role=menu`/`menuitem`, Arrow Up/Down/Right/Left, Home/End, Enter/Space and Escape. Screen reader labels, disabled reasons, focus handling and mouse hover must work.
- Show natural fly-out nesting, edge-aware positioning, and deep submenu behavior; don't open offscreen or make submenus unreachable with pointer movement.
- For a **folder** context, show the proper Explorer actions, including `Open`, `+ Right Click`, `Default Save Selection`, `Manage Destinations`, plus normal file operations only where really implemented. The four actions are menu items, **not row buttons**.
- For a **file** context, show the configured V3+1 cloud-save menu **with the same visible Simple/Narrow/Depth/Flat contribution, natural folder nesting, enabled/disabled state and exact save targets as Chrome native right-click**. File actions may coexist in separately defined groups; no duplicate rendering engine.
- The entire Explorer menu, including submenu rows, is a projection from an inspectable shared model, not a separate ad-hoc set of label-based event handlers.

## 2. P0 design: programmable *situational* menu that a computer can inspect

The owner wants to give Python or another automated client a **situation** (selected source file or folder, provider/account/bucket, menu context, current config, authorization, available folders and native generation), then inspect *exactly the menu a human should see*.

Implement or complete a versioned headless menu service, using the existing canonical MenuSpec, stable item/action IDs, authoritative route resolver and permission-gated engine. A practical contract may have these names (choose exact stable names after inspecting current endpoints):

- `describeContextMenu({context,source,target,sessionInfo?})` — returns structured ordered hierarchy for a particular authorized situation.
- `inspectMenuTree({generation,parentId,cursor,limit})` — read-only paginated tree inspection; exhaustive across nesting levels.
- `inspectMenuItem({generation,itemId})` — stable item ID, parent, label, kind, provider/route identity, enabled/disabled and why.
- `inspectNativeRegistration({generation})` — desired generation vs compiled, applied, Chrome ACK and observed rendering, each a separate evidence class.
- `resolveMenuAction({generation,itemId,context})` — **pure/read-only** resolution against current permissions, no saving.
- `dispatchExplorerSave(...) ` / a unified permitted `dispatchSave(...)` — **real, privileged**, idempotent provider action using the same save dispatcher; never accessible through the read-only Glaciaring debug interface.
- `getOperationOutcome({operationId})` — typed state and provider verification evidence, with safe error codes and uncertainty.
- Inspect entire state transitions after config edits and cloud folder mutations. Add scenario fixtures for offline model testing, explicitly marked **simulated**, alongside real authorized integration tests.

The same versioned hierarchy drives the on-screen Explorer menu **and** the Chrome menu compiler; do not maintain two independent trees. Expose node roles, sibling order, precise parent/child relationships, normalized exact destination targets, stable IDs, scope, current visibility combination, completion/coverage of Depth index, disabled reasons and menu generation. No private token, file-content, source provenance or credential leaks in exported trees, logs or scripts.

**Python must not require screenshot OCR or coordinate clicking to understand the menu.** Use a secure explicit local host/IPC bridge or another bounded authorized script interface consistent with the existing gateway/scaffold; no unprotected localhost server. For DOM UI automation, the menu's stable `data-item-id` and relevant ARIA semantics should match the same model. An agent should not be allowed to impersonate a user to perform effectful writes: explicit scoped grants and appropriate user consent remain mandatory.

**Proof distinction:** A simulated menu traversal, an engine model, Explorer DOM rendering, actual Chrome contextMenu registration/ACK, observed Chrome menu appearance and verified cloud upload are DIFFERENT results. Never equate them.

## 3. P0 real cloud save from both right-click contexts

### Explorer source

Right-click a real cloud file in Explorer → V3+1 nested destination choices → select an authorized destination → **read actual source bytes through the existing Universal File API** (`stat`/`readStream` or suitable streaming implementation) → use normal save-intent resolver and upload/verification through Universal File API to the exact target → independent byte/readback verification → truthful success. No silent timer-based “success.” Never send source URL, page URL, link URL or other browsing provenance to destination provider APIs.

### Chrome source

Right-click a supported image/link on a web page → native REDOWN/Click2Cloud provider menu with identical configured nesting/targets → authorized browser source capture → shared save resolver and provider upload → verify exact final cloud bytes → success only after confirmation. The native event is not simulated by a DOM menu. Keep exact target identities and auth boundaries. Avoid pop-outs, additional destination setup pages or fake uploads.

### Shared security + outcome contract

- One `SaveIntent`, source-aware acquisition, destination authority check, transport, upload, verification and final receipt.
- Byte-only upload/provider metadata: filename/extension and necessary destination metadata, not browsing/source URL provenance.
- Respect provider OAuth scopes, host permissions, Cloudflare Worker authorization and backend size limits; do not lie about “unlimited” support. Never blindly repeat uncertain writes.
- The extracted `src/explorer/r2-adapter.mjs` is a source reference, **not proof that the necessary Worker transport is implemented**. `extension/background.mjs` previously returned `AUTHORIZED_WORKER_TRANSPORT_UNAVAILABLE` for non-enumeration messages and indexed new buckets as `workerReady:false`. Fix the authenticated transport and independently verify bytes in an authorized disposable test bucket before claiming any real save works.
- Preserve REDOWN's Universal File API as the file-operation authority. Do not treat the V3+1 menu engine as a second Explorer backend.

## 4. P0 Cloudflare login: CLICK2CLOUD OAuth, left sidebar button

**Explicit final owner decision:** Reuse the **appearance/placement** of REDOWN's Cloudflare LOGIN in the **left-hand Explorer sidebar**, but **KEEP the existing Click2Cloud OAuth implementation**, in `src/auth/cloudflare-oauth.mjs`, and its own public client ID/callback. Do **NOT** copy REDOWN's old OAuth client, extension ID, cookies, auth tokens or saved sessions.

The current UI places `Connect Cloudflare` in Remotes and opens a technical browser prompt asking the user to type registered permission scope IDs. Remove this prompt as a user step. Maintain PKCE S256, state, redirect match and token lifecycle; configure only the **verified** OAuth scope IDs in trusted source/config consistent with the owner's registered Cloudflare client. Do not guess arbitrary scope strings, secretly widen permissions or bypass Cloudflare consent.

**Sidebar UX:**

1. The Explorer layout always shows a visible Cloudflare account/connection area in the **LEFT sidebar**.
2. Signed out: show **Log in to Cloudflare** button in that left panel, with a polished REDOWN-inspired style. Explorer shell remains visible with honest disconnected placeholders.
3. Click: immediately trigger the existing Click2Cloud OAuth authorization-code + PKCE login. Standard Cloudflare consent can still appear, but the user never types scope IDs, client IDs, Worker secrets or callbacks.
4. Signed in: replace login state with current connected account selector and buckets/roots on the left; show clear connection status and access to **Log out**, **Reconnect** and **Switch account** when safe/available.
5. Handle expired/refused OAuth with succinct actionable error and retry, no repeated popup loops; no false connected/saving-ready indicators.
6. Authentication and write capability are distinct. Successful OAuth alone must not mark Worker/R2 save operations as ready.
7. Reuse *UI patterns* from REDOWN `extension/beta/explorer.html` and related style if authorized; do not merge REDOWN's old V3 engine or auth implementation. Account security must remain Click2Cloud-specific.

**Acceptance:** On freshly installed Click2Cloud, click the visible LEFT SIDEBAR login once, authorize through Cloudflare, return to populated authorized accounts/buckets, with **no technical scopes prompt**. Verify actual client callback, token refresh/reconnect and the permission failure path.

## 5. Preserve other first-use requirements

This request supplements, not replaces, `first-use-report.md`. Carry forward:

- Explorer **Back / Forward / Up / Refresh**, polished REDOWN-like GUI backed by the Universal File API, and genuine Upload/New Folder/other file operations.
- Owner's Depth workflow: + Right Click → Depth → check bucket → choose level 10 → Save once → discover existing real folder levels through level 10 without visiting folders manually; auto-register Chrome menu, showing honest progress if incomplete.
- A persistent indexed folder hierarchy per provider/account/bucket in IndexedDB or equivalent survives mode changes and MV3 restart. **Unchecking Show Depth or a bucket checkbox MUST NOT clear that bucket's cached hierarchy** or chosen depth preference. Rechecking restores quickly without unnecessary full scan.
- Confirmed Explorer folder create/rename/move/copy/delete updates indexed folders automatically, even with Depth hidden. Failed/uncertain mutations trigger targeted reconciliation, not invented successful updates.
- Simple, Narrow, Depth are independent saved configs. “Show in Chrome” changes visibility only. Flat is an exclusive display override. Removing a mode or bucket from view must remove its native entries without deleting index/config. Fix save-only UI causing duplicate destinations.
- No user-triggered scan button, mandatory bucket backup or waiting for manual Refresh. A whole-cloud outline backup is for **recovery**, not a prerequisite for fast menu switching or updates.

## 6. Focused acceptance and deliverables

**Installed Chrome acceptance first; no giant synthetic scenario marathon.**

1. Right-click the same folder 20+ times. Exactly **one** cursor-positioned menu, no row growth, no accumulated inline controls or stale listeners. Verify click-away, Escape, next right-click, keyboard, deep submenus and edge positioning.
2. Right-click file → inspect genuine configured nested V3+1 menu (Simple/Narrow/Depth/Flat). Compare its full tree, exact IDs/targets, ordering and enabled status with the headless API and the compiled Chrome native MenuSpec. Do not claim Chrome native rendering is proven solely by DOM parity.
3. Python/JS program submits realistic “situations” and inspects full nested menu, calls a read-only route resolution, tests permissions, creates/reviews authorized configuration changes. Demonstrate generated event and precise outcome evidence, not screen scraping.
4. Actual Chrome installed extension: inspect native registered menus and at least one live source save. Confirm Chrome ACK and actual observed native nesting separately from model tests.
5. Explorer cloud-file right-click → actual authorized cloud save to a different destination; independent final-byte/filename/path verification. If unavailable, return explicit blocked state rather than counterfeit success.
6. Left sidebar Cloudflare login with Click2Cloud OAuth, no manual scope input; handle unauthorized/reconnect; list real accounts/buckets.
7. Depth 10 existing 4-level tree and index persistence; hiding/rechecking Depth/bucket never loses index; confirmed Explorer folder create propagates automatically.
8. Explorer Back/Forward/Up/Refresh and normal real Upload/New Folder operations.
9. MV3 restart/reload, revised menu generation, simultaneous Show changes, stale/uncertain saves, permissions and network errors do not duplicate actions or lose configuration.

**Codex deliverables:** Commit concrete source and tests on the designated development branch (follow `AGENTS.md`), do not alter REDOWN production; provide final changed paths/commit, exact build SHA, `npm test`, extension build instructions, live-versus-simulated evidence, remaining blocked acceptance and user-visible demo instructions. State PASS / FAIL / BLOCKED / NOT TESTED honestly. Do not unilaterally release/deploy or change Cloudflare billable resources.

**Minimum owner-visible outcome:** A real LEFT sidebar Cloudflare login; one real right-click overlay instead of infinitely appended row buttons; nested Explorer file menu inspectable by scripts with the same canonical V3+1 action IDs/targets as native Chrome; actual bytes-only, verified saves where authorized. Nothing less should be called done.
