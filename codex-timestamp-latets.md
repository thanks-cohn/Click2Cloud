# Latest Codex follow-up — persistent Explorer filename Search

**Recorded:** November 19, 2026 (America/Chicago)  
**Source branch:** `codex/click2cloud-0.3.20`  
**Status:** NEXT CODEX RUN — REQUESTED, NOT YET IMPLEMENTED OR VERIFIED.

> **User requirement:** "For the search bar it should only disappear when Esc is pressed or the X on the far right. It should never disappear when the user presses Enter."

## Required behavior

1. **Enter searches; it does NOT close Search.** In Explorer, pressing **Enter** in the filename-search input runs the current-directory filename search through the **existing `searchDirectoryNames` API**, while keeping the same search field/pop-out **visible and usable**, with the query still displayed. This applies to success, empty matches, loading, error, and repeated Enter submissions.
2. **Only explicit dismissal closes an open Search panel:** **Escape** or the new, clearly visible **X close button at the far right of the Search bar**. Do not auto-dismiss Search after Enter, search completion, a file-list repaint, a harmless focus change or clicking results. Ordinary navigation away from Explorer may still tear down that view as expected.
3. **Place X inside the Search field area, at the far right.** It must be a genuine button (`aria-label="Close filename search"`) with reliable pointer and keyboard accessibility. Avoid confusing the browser's native `type=search` clear-X with this **Close** control; provide a deliberate single close behavior. Keep X usable both when Search is in its anchored pop-out and when the field is shown inline, without adding a duplicate search input.
4. **Escape and X ONLY hide Search — the active search RESULTS STAY DISPLAYED.** When a filename search has been run for the current folder, pressing Escape or clicking the far-right X closes only the visible Search field/pop-out. **Do NOT clear the query, reset the filtered results, switch the file list back to the unfiltered directory, abort/undo the search, or silently call `clearFilenameSearch()` as a side effect of closing.** Results remain in Explorer even while the search field is hidden. If Search is opened again without the user explicitly deleting or clearing the previous search, **the old query is already filled in and the same search results are still shown**; the user can continue editing or rerun it. The existing separately named **Clear search** action and deliberate user deletion of the query may clear/reset search as appropriate. Keep ordinary safe invalidation when the folder/account/auth scope genuinely changes so results are never reused for a different folder.
5. **No accidental reparent/overflow disappearance:** If Search is open, responsive toolbar layout must not move it into a hidden More panel on Enter or subsequent render. It may remain an anchored pop-out. Maintain selected folder scope, composition/IME input handling, focus accessibility, and keyboard navigation.
6. After Enter, keep the search field visible even if focus moves deliberately to the results; repeat search without reopening. Do not use the layout-wide `hide()` method as a side effect of a search submission.

## Identified current code behavior to repair

- **`extension/app.mjs`**: `#filename-search-form` submit handler currently checks `input.closest('#toolbar-overflow,#filename-search-popout')` and, when true, calls **`explorerLayoutUI.hide()`** and focuses `#files` **before** `searchDirectoryNames(input.value)`. That is the direct cause of Search disappearing on Enter. Remove that automatic dismissal; submit the API search while leaving Search open.
- **`extension/app.mjs`**: `#filename-search` Escape listener currently calls `clearFilenameSearch()` in some cases. Separate **dismiss** from **clear** to meet the new contract, and avoid double Escape handling with the pop-out keyboard listener.
- **`extension/explorer-layout.mjs`**: `closeSearch()`, `focusSearch()`, search-panel `keydown` handler and responsive reparenting determine whether the pop-out is visible. Add a small explicit close hook reused by X and Escape, keep one source of truth, preserve the established search API and existing shortcut/remapping behavior.
- **`extension/app.mjs`** already has a separate `#clear-search` action; distinguish that from the new Search-bar X Close control.

## Focused acceptance tests (required)

- In one-row Explorer with Search in a **pop-out**, type `photo`, press **Enter** → query runs and Search **stays open**. Press Enter again → search reruns and stays open.
- Repeat with Search visible **inline** and with Search reached from **More/shortcut**.
- Zero matches and API errors do not close Search; `photo` remains editable.
- Click a result or focus the files list → Search remains visible until explicitly dismissed.
- **Escape** dismisses **only the Search field**; filtered filename results remain displayed while hidden. Reopening Search in the same folder restores the exact old query and existing results unless the user deliberately cleared/deleted them.
- **X** at far right dismisses only the Search field just like Escape (without changing results), and is keyboard-focusable and screen-reader labeled.
- **Clear search** and intentional user deletion of the query are the ways to reset the query/results; neither hiding Search nor reopening it automatically clears anything.
- Search for `photo`, see filtered results, press Escape or X: the filtered results **remain visibly filtered in Explorer**, even though the Search field closes; reopen using Search/shortcut → input is prefilled with `photo`, and previous results remain until deliberately replaced or cleared.

- No duplicate forms, no search on each keystroke, no provider upload/write, and no regression to filename inventory, correct cloud folder, Ctrl+Shift+F7 Search shortcut, F8/F9 controls, or right-click saves.

## Scope and handoff

This is a small **next-run Explorer UX fix**. Do not rewrite the search engine, replace the File API, modify Chrome right-click History, or add unrelated cloud/Worker architecture. Implement on a **separate next implementation branch** derived from `codex/click2cloud-0.3.20`; verify Chrome-facing behavior, commit and push the fix, and report the exact commit SHA and focused test evidence.

**Priority:** This new requirement supersedes older search instructions anywhere they suggest Enter may close the Search panel or Escape must silently clear the active search.

---

# Additional P1 bug — Get URL must show the actual public URL after bucket activation

**Owner report:** November 19, 2026. **Status:** Reported in the installed 0.3.20 build; NOT fixed or verified. **Next Codex run requirement.**

> The user right-clicks an object → **Get URL** → agrees to **Allow Public URL?**, but no usable public URL appears. If the R2 bucket already has public access activated (or it becomes publicly available through the approved setup), that object's **Get URL must visibly display its actual public URL**.

## User-facing contract

1. For an existing **public, active and authorized** Cloudflare R2 bucket endpoint, **Get URL on a file immediately shows the real complete public URL**, without forcing the owner to re-enter a domain. Support actual verified custom domains and any other genuinely enabled, provider-supported public endpoint (e.g. `r2.dev` when R2's public development URL is enabled), subject to real capability and security checks. **Do not assume every bucket has an endpoint**.
2. If no public endpoint is active, show the agreed **`Allow Public URL?` Yes / No** first-time gate. **No** makes no changes. **Yes** must lead to an understandable, working, explicitly authorized setup for the selected bucket—not a dead-end field asking for an unknown domain. If enabling public access would expose the entire bucket, plainly explain that scope and require the corresponding deliberate consent; do not silently make a private bucket public. If this build cannot actually configure the endpoint, show the exact missing Cloudflare setup step and provide a reliable **re-check/refresh** path when the user completes it.
3. **After successful public-endpoint activation and provider verification, automatically refresh Get URL and show the selected object's URL in the SAME flow**, without asking the user to right-click again, retype the domain, or restart Explorer.
4. The Get URL result must display the **full copyable clickable URL** for the **exact account + bucket + complete object key**, including nested prefixes, escaped spaces/Unicode, and a verified hostname. Provide a working **Copy URL** control with clear success/error feedback, and optionally **Open URL**. For multiple valid public domains show all valid URLs clearly labeled; don't force an empty selection first.
5. Distinguish **Cloudflare-reported public mapping active** from **actual anonymous access to the object verified** (HEAD/GET as appropriate). If an active endpoint is inaccessible because of WAF, Access rules, object existence, disabled public access, DNS/TLS or other problems, show a precise actionable reason and **do not claim a working public link was verified**. Never guess a domain or invent a URL.
6. If the user right-clicks a **directory/prefix** rather than an actual file, don't fabricate a standalone folder object URL. Instead, after a valid public mapping exists, present the existing directory URL export flow showing correct grouped object URLs.
7. Retain feature-flag scope, existing Cloudflare authentication, private-by-default policy and API-first design. This is a missing/unfinished Get URL workflow, not permission for blanket bucket exposure, arbitrary Cloudflare mutations, new Worker topology or additional unrelated features.

## Required Get URL layout — URL directly UNDER the domain input, always visible

**The result area must be directly below the domain entry field, not somewhere else in the popup and not hidden until a separate Copy/Save action.** When `Get URL` opens for a file, the panel should look and behave like:

```text
Get URL
Connected Domain with Cloudflare?
Domain: [your-domain.example             ]
Public URL:
https://your-domain.example/exact/path/to/image.png     [Copy]
[Other verified public URL(s), if any]
```

- **Always render a dedicated Public URL row beneath the input** when the Get URL panel is shown. If the selected bucket already has an active, verified public endpoint, **immediately fill it with the selected file's actual complete object URL**. Never require typing into the domain box again for an already-authorized mapping.
- As the user selects or enters a domain, update the field **only once that domain is verified as actively linked to this exact bucket**. Show the URL and Copy control as soon as verification succeeds, without requiring `Copy selected URLs`, a Save click, another right-click or a popup restart. Render multiple URLs as distinct rows directly beneath the input when several verified endpoints exist.
- The **X / close** control must not erase any cloud mapping; closing the popup is not a revoke. Preserve the selected object identity and its exact key throughout.
- If **no public endpoint exists**, the Public URL row remains visibly present with **`No public URL available yet — connect or activate a public endpoint for this bucket.`** and an actionable **Recheck** control. Do **not** display a guessed URL or a clickable dead link.
- A verified endpoint mapping is distinct from verified anonymous object reachability. If live accessibility has not been confirmed, show the real derived URL with an honest `Reachability not checked` or blocked status, never claim successful public delivery without evidence.
- Validate UI order and accessibility: input immediately followed by `Public URL`, a selectable/copyable full URL for an active mapping, keyboard-accessible Copy button and status/error region; correct long-name wrapping without clipping.

**Additional acceptance check:** Start with an already-public bucket, right-click a nested image, choose Get URL: without typing anything, the actual URL is visible **directly under the domain input**. If a domain is newly activated during the current flow, that same row populates immediately after the verification refresh.

## Additional P1 Minimal cleanup — remove generic "action needs attention" message

The owner explicitly requires that **Minimal theme must never display** the generic fallback message `This action needs attention. Review the current panel or History.` (including the common uncapitalized rendering). This includes Minimal Remotes and any other ordinary Minimal panel, during/after failed actions, retries, reconnects and view refreshes. Don't replace it with another vague "Review current panel or History" message. Keep appropriate concise login/reconnect status, actual failure evidence, existing History and accessible non-Minimal/Debug diagnostics.

**Source identified:** `extension/app.mjs` `quietFeedback(value,attention)` writes the exact message to `#action-feedback` as its final required-attention fallback; `status()` invokes that function. Fix the Minimal theme's presentation at this source as well as the existing Minimal Remotes cleanup; hiding only the selected-destination card will not fix this banner. Do not disable actual error reporting, save safety checks, or diagnostics.

**Acceptance:** Trigger an unclassified error while Minimal is active → no generic action-needs-attention banner; change views/retry/reconnect → it stays absent. Other aesthetics retain their technical feedback. Existing authenticated operation, failure handling, History and receipts are unchanged.

See also: `Issues_and_Bugs/Issues/P1_MINIMAL_REMOTES_HIDE_SETUP_AND_DUPLICATE_CLOUDFLARE_TITLE_2026-11-19.md`.

---

## Owner clarification — Get URL is BOTH a result viewer and a configuration tool (P1)

**User clarification (November 19, 2026):** Get URL must simultaneously display the object's existing public URL(s) **and** allow the user to add or select additional eligible public domains. Do not choose between "show result" and "configure domain"; **both functions belong in the same Get URL window**.

### Required live UI and copy behavior

```text
Get URL
Connected Cloudflare domain
Domain: [add or select a domain      ] [Add / Verify] [Copy All URLs]

Public URLs
┌─────────────────────────────────────────────────────┐
│ https://existing-domain.example/photos/image.png    │ ← click card to copy
├─────────────────────────────────────────────────────┤
│ https://second-domain.example/photos/image.png      │ ← click card to copy
└─────────────────────────────────────────────────────┘
  (scroll vertically inside this list if there are many)
```

1. **Existing URLs first, automatically:** As soon as Get URL opens on a file, render **every currently verified public endpoint for the exact account/bucket/object** directly beneath the domain input. No need to type, re-add, select, Save, or click a preliminary "Copy selected URLs" button to reveal them.
2. **Domain configuration stays live:** Keep the input and existing domain-verification/setup controls visible and functional in the SAME window. When the user adds/selects another domain, verify that the endpoint is actually active for the exact bucket; then **append that file's real URL to the visible list immediately**, without closing/reopening the popup. Do not treat unverified typed text as an active link; explain missing setup and offer Recheck.
3. **Copy one by clicking the URL card itself:** Display **each verified public URL as its own small, clean, minimalist card immediately beneath the domain input**. The **entire card is the Copy control**: clicking anywhere on the card copies that card's full URL to the clipboard. **Do not require a separate Copy button within each URL card.** Make the cards keyboard-accessible (focusable button semantics, Enter/Space copies), readable with long URLs, and give subtle visible/accessible "Copied" or error feedback. Clicking a card **copies; it must not navigate to the website**. An optional distinct Open affordance must not interfere with card-to-copy behavior.
4. **Scrollable list + Copy All:** Place all minimalist URL cards in one bounded-height list **directly beneath the domain input**. For one/few URLs show the cards normally; **when many URLs exceed the available height, display an internal vertical scrollbar** and scroll *the cards only*, not the entire Get URL window. Maintain visible, readable URL text with sensible wrapping and accessible keyboard scrolling. Place the persistent **Copy All URLs button immediately BESIDE the domain input field, in the same input/action row** (not below the cards, not below the list, and not in a footer). Keep both visible while scrolling the cards; on narrow screens preserve their clear visual grouping, with the button still associated with the input row. Copy All copies **all currently displayed verified-mapping URLs for that object** (including those scrolled out of view), one full URL per line, in displayed order. Dedupe repeated mappings; never include unverified text, placeholders, other objects, or other buckets. Disable if none are available and announce the copied count or failure. No preliminary checkbox selection.
5. **Keep both modes together:** A newly verified site/domain adds a new URL row while all previous URL rows stay visible. Copy one, Copy All, input and Recheck remain available in the same flow. If there is no public endpoint, render the persistent empty-state Public URL section and Recheck instead of any invented URL. Do not silently enable public access.
6. **Mapping versus reachability:** Clearly distinguish a verified Cloudflare endpoint mapping from a successful unauthenticated request to the object. Present truthful status on each row and never label untested anonymous delivery as tested. Rendering a derived URL for a verified mapping is acceptable when reachability status is accurately labeled.
7. **Directories:** A directory/prefix has no fabricated standalone URL; retain grouped per-object directory export and only offer Copy All when the concrete URLs being copied and their scope are unambiguous.

### Required acceptance tests for this clarification

- Already-public bucket with two domains: immediately see two minimalist URL cards beneath the domain input; clicking anywhere on either card copies **only** that URL, without a separate per-card Copy button; Copy All copies exactly those two URLs on separate lines.
- Start with one verified domain and add a second verified domain: second URL appears immediately in the same window without losing the first. Copy All now copies both.
- Enter an inactive or mismatched domain: no fake URL row, truthful explanation and Recheck; previously verified URLs remain visible.
- Spaces, Unicode, prefixes and duplicate filenames across buckets: every copy operation yields only the fully encoded exact-object URL(s).
- Copy errors display feedback rather than silently failing; controls are keyboard accessible; the list remains visible through copying, verification, and ordinary focus changes.
- With many verified domains, the cards appear in a **bounded scrolling list** with a vertical scrollbar; scrolling the list does not hide the input or **Copy All, which must be immediately beside the input in the same row**; Copy All includes even the off-screen cards.

**This clarifies and supersedes any earlier instructions implying Get URL is only a setup form, only a copy dialog, or that new domains must be selected again after verification.**

---

## Current 0.3.20 implementation evidence and likely cause

- `extension/explorer-exports.mjs`: `urls()` calls `getPublicUrls`, shows **`Allow Public URL?`** when `info.domains.length === 0`, and **Yes** merely opens `urlEditor(...)`. The editor asks “Connected Domain with Cloudflare? Add it...” and verifies a manually entered domain. It does not activate public access or complete a one-click public URL outcome.
- `src/api/service.mjs`: `getPublicUrls` computes `verifiedDomains(await readCustomDomains(source))`, currently based on active custom domains. This omits an independently enabled provider-supported `r2.dev` endpoint unless there is separate verified support. The API returns `file: objectUrls(...)` only after that domain list and object existence checks.
- `src/explorer/object-exports.mjs`: `objectUrls()` derives links from domain + encoded full key and labels the mapping `verified-domain`. Audit how the distinction between **mapping verified** and **object anonymously reachable** is expressed, and do not mark actual reachability verified without observation.
- The 0.3.20 export protocol says “this build verifies existing Cloudflare associations and leaves all domain administration with Cloudflare.” If setup cannot be performed directly, update the UI to **guide, refresh and finish Get URL reliably** after the user authorizes/configures it, rather than letting Yes appear to have succeeded when no link exists.

## Focused acceptance tests

- Bucket with **one active verified public domain**, file nested several folders → Get URL immediately lists a complete correctly encoded URL and Copy succeeds.
- Bucket with **public `r2.dev` endpoint** but no custom domain → surface correct usable URL if supported and verified; otherwise explain why unavailable.
- Bucket with **no public endpoint** → No exits privately, Yes begins clear setup; after actual permitted activation/verification, the chosen file's public URL appears **without a second right-click**.
- Bucket with **two active public endpoints** → all actual available URLs shown, no empty dialog.
- Active mapped domain but **anonymous GET denied** → truthful blocked/unverified result, not a fabricated successful public URL.
- Two objects with equal filenames in different paths or buckets → correct full-key URLs, never cross-account links. Include spaces, Unicode and special characters.
- Directory Get URL continues to export per-file URLs, not a fictional directory object link.
- No unexpected public exposure, no new entries in ordinary right-click save History, and no regression to ordinary saves.

**Priority:** Fix this alongside persistent Search in this same next-run task. The core customer promise “Get URL” means an actual usable, displayed link when the object really is publicly accessible.
