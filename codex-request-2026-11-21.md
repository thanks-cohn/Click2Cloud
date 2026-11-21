# REDOWN 0.3.23 — Codex implementation request (November 21, 2026)

**Repository:** `thanks-cohn/Click2Cloud`  
**Task status:** Implementation request for the **next user-triggered Codex run**; this document's creation does **not** itself authorize running or editing application source code in the current documentation session.  
**Detailed source of truth:** [`codex-next-1248-11212026.md`](./codex-next-1248-11212026.md) — owner feedback, exact error chain, UX contracts, scope clarifications and release-gate tests. Read that file fully **before editing code**. Where there is uncertainty, preserve the owner's latest narrower instructions described here.

## Objective

Make REDOWN feel like a familiar, premium, stable Windows File Explorer while retaining its existing Cloudflare R2 saving engine and crash-resilient MV3 architecture. **P0: eliminate the recurring ordinary Rename regression across all three surfaces and prove the fix before touching optional UX changes.** The owner reports this bug across five versions and will not accept a superficial workaround.

**Owner's contract: `Rename → enter new name → Save → DONE.`** No extra setup ritual for a bucket whose file-write authorization is already valid. Do not add a Worker, bypass actual authorization, relabel a failed remote write as success, or suppress a real error merely to hide the message.

## Execution order and release gates

1. **P0: Reproduce and repair ordinary single-file Rename FIRST** (details below). Add tests that fail on the old behavior, then repair and verify. Do not begin the seven UX areas before addressing and assessing this release blocker.
2. **Audit all other requested behavior before implementing.** Keep pre-existing working features; implement only missing/defective pieces. Favor small, isolated, reversible modules over broad refactors.
3. Complete the seven requested areas below, respecting dependencies and preventing cross-feature changes to the save engine. If a higher-priority regression or safety issue appears, fix or report it rather than pushing cosmetic work through.
4. Run appropriate existing test/build commands, new focused tests, and browser-level checks. Report what was *actually* tested, not just what compiled. **No release-ready claim without real Rename verification.**
5. Work on a dedicated Codex branch, commit and push completed changes with a clear report. **Do not merge to `main`, deploy, change production Cloudflare resources, rotate credentials, reset user profiles, or create new infrastructure** without separately explicit authorization.

## P0 — Reliable Rename in Explorer, preview and immersive

### Existing defect and suspected code path

The user repeatedly sees:

> Rename needs Cloudflare setup. Review the selected destination in Remotes.

Current code evidence from the detailed specification:
- `extension/app.mjs` `fileActionGUI('rename')` calls a rename handler without authorizing setup; the UI maps `FILE_SETUP_APPROVAL_REQUIRED` to the above error.
- `src/api/service.mjs` calls `prepareFileWorker(...)` **before** the actual rename.
- `src/cloudflare/onboarding.mjs` `ensureFileWorker` may reject an existing destination when its preparation/readiness plan does not match. The *exact live cause is not yet proven*; inspect bucket/account/prefix identity, planned versus deployed Worker version and digest, session state, plan freshness and required scopes rather than guessing.
- The normal preview's `bindInlineRename` uses the same file-action path and also fails.
- `extension/app.css` currently has `#dialog[data-immersive] #dialog-title{pointer-events:none}`, which blocks clicking the immersive filename.

### Required outcome

- **File Explorer:** select an existing file → Rename from menu or F2 → edit name → Save/Enter → remotely verified new name.
- **Normal image preview:** rename from its title using the current supported interaction; no Cloudflare setup loop.
- **Immersive image view:** **single-click the visible filename** to edit it; F2 also works. Enter saves; Escape cancels editing without leaving immersive mode. Preserve the full-screen black viewer and navigation/zoom.
- Use **one shared, authorized Rename operation** beneath all three UI entry points, with consistent conflict handling and truthful result reporting. A completed rename refreshes filename, key, selection, preview title and gallery navigation without leaving stale state; preserve the extension unless the user intentionally edits it.
- Reuse existing cloud write authorization and transport. A genuinely unprepared or unauthorized bucket must receive a truthful, specific explanation and safe authorized recovery—not an invented permission claim, silent provisioning, or fake rename.
- Preserve source bytes and prevent overwrites; use existing verification/receipts, confirm the new key, handle the old key appropriately, and treat uncertain results as uncertain.
- **Reproduce first:** capture the failing readiness state and add a deterministic regression test that fails before the fix, passes after it. Do not accept a cosmetic text change as repair.
- **Hard release gate:** test actual Rename against a safely disposable object in a permitted R2 test bucket, in real Windows Chrome, across Explorer / preview / immersive. Test repeated operations, nested folders, cold boot, reopen, reconnection, MV3 service-worker suspension/restart, stale and current plans, extension reload, collision, error/authorization conditions, and changed right-click default destination. Verify remotely and after refresh. Use authorized test credentials only, never production-destructive test objects.
- Provide root cause, minimal code change evidence, before/after regression results and real R2 verification. If live R2/browser tests cannot run, mark **UNVERIFIED / NOT RELEASE-READY**, not “permanently fixed.”

## Seven scoped improvements after P0

### 1 — Internal cloud clipboard + real Windows image clipboard
- Preserve REDOWN's existing Copy/Cut/Paste references and actions; wire familiar Explorer-only Ctrl+C/X/V.
- Where permitted, Ctrl+C on images should also put actual compatible image data (such as PNG) on the Windows clipboard, independently reporting whether internal copy and external clipboard write succeeded. Test pasting into a real receiving application, including ChatGPT where available.
- Do not promise multi-image external pasting without proving Chrome/Windows/receiving-app support. Bound read size, image pixels, concurrency and temporary allocations; release bytes promptly, no additional image cache or Worker.
- **No Copy/Paste transfer dashboard or workflow redesign.**

### 2 — Full-width filenames in **List view only**
- The one-column `Name` header and filenames should use all available file-pane width after moving the navigation divider, and only truncate when width genuinely runs out.
- Do not apply this single-column rule to **Details** or **Grid**. Preserve virtualization, resizing, sorting and all theme variants. Test extreme splitter positions.

### 3 — Modular Aesthetic API busy cursors + tiny bottom-right mini-toast
- Five selectable/persistent cursor styles: **System Default, Classic Hourglass, Spinning Ring, Arrow + Busy, REDOWN Pulse**. The busy graphic stays small beside the pointer and is shown only while a real operation is pending; respect reduced motion and fallback safely.
- Complement it with **one small themed bottom-right notification tile**. Its **own compact background** is required: complementary foreground/background colors, tasteful padding, rounded corners, optional subtle shadow/border; unobtrusive and never blocking clicks.
- Exact tone: `Copying…` → `Copied!`, `Pasting…` → `Pasted!`, `Moving files…` → `Moved!`, `Renaming…` → `Renamed!`, `Deleting…` → `Deleted!`, `Creating folder…` → `Created!`. The completion claim must follow the actual operation result. Brief accurate failure text where necessary, then automatic dismissal.
- **No progress panels, transfer percentages, destination readouts, counts, verbose notices, activity dashboard, costly idle animation or extra remote infrastructure.** Cursors and toast are optional presentation; their failure must never affect saving.

### 4 — Windows-style marquee selection
- Click-and-drag from blank file-pane space to rubber-band select files in upward, downward and diagonal directions; support Ctrl/Shift semantics and bounded edge autoscroll.
- Work across **List, Details and Grid** while preserving efficient virtualization. Do not mount entire directories or compute against all rows every pointer frame. Clean up pointer state on Escape, cancellation, navigation or Shelf closure. Do not conflict with folder drag-and-drop or divider resizing. Stress test large directories.

### 5 — Familiar Windows Explorer behavior and shortcuts
Audit for existing support first, then complete: **F2 Rename**, **Delete**, **Ctrl+C/X/V**, **F5 Refresh**, **Backspace to parent**, **type-to-select**, **Ctrl+Shift+N New Folder**, drag files onto folders to move, selection/clipboard persistence, and resizable **Details** columns.
- Scope handlers to focused File Explorer and preserve native Chrome text-editing/extension shortcuts.
- **Delete key:** must use the exact existing right-click Delete operation and obey `File Explorer Settings → Confirm before deleting cloud files`. Checked → existing confirmation; unchecked → no additional confirmation. Never bypass existing authorization and remote verification.
- List **every supported shortcut** under **Settings → Keyboard Shortcuts**, alongside existing shortcuts. For uneditable keys show **Fixed / Not customizable**, rather than hiding them; label scope as Explorer-only or Chrome-wide.
- For Cut, do not remove originals until verified destination success. Verify actual destination when Paste is invoked. No duplicated file-operation engines.

### 6 — Remotes heading: exactly two intact sentences
Display precisely two separate lines without dividing the second sentence after `True`:

```text
The Future Is Now.
True Remote Is Here.
```

Responsive to narrow Chrome side-panel widths, tasteful across all themes, no overflow or backend changes.

### 7 — History hero copy
Remove the existing technical opening paragraphs about saved files/attempts, operation count/timezone and retention/settings instructions from the visible History intro. Replace the hero with the owner's **exact** slogan:

> The Rest is History

No added generic subtitle. Keep actual History records, pagination, timezone-aware rendering, operation totals, settings, exports, retention semantics and receipts working as before. Technical information may remain in appropriate discreet controls but not the marketing hero.

## Nonnegotiable stability and scope boundaries

- **No new Cloudflare Workers, servers, infrastructure, queues, remote relays, or background services.** Existing authorized cloud file operations may depend on REDOWN's *current* Worker/transport; reuse them without building another subsystem. Never weaken security solely to eliminate a setup prompt.
- No backend overhaul, new permanent image caches, large memory increases, endless animations or broad invasive refactors for these UI requests.
- Preserve native Chrome right-click saving, existing destinations and user preferences, credentials/OAuth identity and extension ID, Get URL, screenshot capture, History and receipt verification, Explorer pagination/virtualization, and all Aesthetic API themes/palettes.
- **No bulk Rename, auto-numbered Rename, or speculative new features.** Ordinary single-file Rename is the release blocker.
- Keep code and tests modular, explain any changed APIs/contracts, verify no cross-feature regressions.
- Prefer measured evidence and concise user-facing messages over unverified assurances.

## Required final Codex report

Provide:
1. **P0 root cause and exact repair**, with failing-before/passing-after tests; say whether real Chrome/R2 Rename verification passed or remained unverified.
2. **Implementation matrix** for all seven scoped areas: implemented, already working, partial/blocked (with reasons).
3. **Test evidence:** commands, counts, relevant browser screenshots, real clipboard paste results, virtualization stress checks, theme responsiveness, and right-click/save regression status.
4. **GitHub branch/commit link** and any unresolved risks, specifically calling out missing live verification. **Do not merge or deploy.**

The detailed acceptance checklist and diagnostic reasoning are in [`codex-next-1248-11212026.md`](./codex-next-1248-11212026.md); they remain part of this request. Read and honor both documents.