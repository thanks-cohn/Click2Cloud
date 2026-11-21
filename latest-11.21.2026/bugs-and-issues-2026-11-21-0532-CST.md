# Click2Cloud — Bugs and Issues — 2026-11-21 05:32 CST

**Recorded:** November 21, 2026, 05:32 America/Chicago (user report)
**Affected area:** History, Gallery/Preview, rename interactions, Cloudflare R2
**Reported against:** Latest local Click2Cloud branch `codex/minimal-baseline-palette-fonts-quiet-screenshots-2026-11-20` (v0.3.22 target; confirm installed build/version during reproduction)
**Status:** USER-REPORTED / REQUESTED — NOT FIXED OR VERIFIED
**Scope:** Track and resolve; do not change customer data or cloud resources merely to make a test pass.

## 1. History must support Gallery-quality previews for the entire retained history (P1)

**Owner requirement:** “History files need to be able to be previewed just like the gallery with no cap, being able to go back all the way to the beginning of time.”

### Expected behavior
- Every eligible file in **History** can open the same established preview experience as Gallery: preview the selected image/file, navigate previous/next through History results, and use existing zoom, immersive/lightbox, keyboard and close behavior wherever supported by that file type.
- No arbitrary **UI result limit** (such as only the latest 50/100/500 items) should prevent scrolling/browsing back through the **oldest retained history entry**. Preserve chronological continuity and stable ordering.
- Support cursor-based pagination or incremental historical reads, virtualized rows and bounded decoded-thumbnail/preview caches. **Unlimited browsable history must not mean loading all records or all image bytes into RAM.** Older records should load as the user reaches them. Do not cause the Shelf to freeze or crash with thousands/tens of thousands of entries.
- Show historical entries that actually exist in retained storage; **do not invent or silently reconstruct records that were already deleted or pruned**. If earlier data was lost due to retention caps, report that limitation as a separate data-retention finding rather than falsely claiming full historical reach.
- Preserve provider/account identity, original file references and authorization boundaries. Missing, moved, deleted or unauthorized objects should show an understandable unavailable state without breaking navigation or truncating other history.
- Keep current Gallery preview features intact and prefer reusing their existing preview/immersive path instead of creating a second independent, crash-prone renderer.

### Acceptance checks
1. Preview a recently saved History image; next/previous works as in Gallery.
2. Scroll and/or navigate through more entries than any existing initial page limit; reach and preview the **oldest retained** eligible image.
3. Reopen History after service-worker restarts and Shelf reloads; ordering, cursor and continuity remain correct.
4. Test large historical fixtures (e.g., 100 / 2,500 / 10,000+ entries) with bounded memory, no unbounded network fetch or duplicate image reads.
5. Test unavailable historical objects and multi-account history; no wrong-account preview or mistaken success.

## 2. Rename directly from History by clicking the filename (P1)

**Owner requirement:** “One should be able to rename things from the History page: just click the name, rename.”

### Expected behavior
- In History, click the filename to enter a clear **inline rename** interaction, matching Gallery/Preview behavior and making the operation easy to discover.
- Existing filename is populated and selected for editing; **Enter** confirms, **Escape** cancels, and a clear confirmation/cancel affordance is available. Avoid disruptive setup dialogs for an otherwise authorized rename.
- Use the existing canonical provider rename/move capability, not a UI-only text substitution. Keep extension/file-type handling sensible, validate names and conflicts, preserve exact bucket/prefix/account authority, and never move an object to a different destination unintentionally.
- Refresh History and visible Gallery/Preview state after the verified remote rename, including any relevant display URL/metadata and future navigation. Keep historical receipts truthful: do not rewrite an original save receipt to claim that the object originally used its renamed path.
- Handle missing objects, conflicts, auth expiry, temporary network failure and uncertain outcomes without false success or lost History state.

### Acceptance checks
1. Click an eligible filename in History, rename, press Enter -> remote rename verified and History reflects the result.
2. Escape / cancel -> no remote mutation.
3. Rename while Preview or Gallery is open -> all visible representations update consistently.
4. Auth or provider errors -> clear, actionable state, no silent corruption.
5. Large History remains responsive during edit and refresh.

## 3. Preview rename regression: erroneous “Cloudflare setup” gate (P0/P1: user-visible broken core operation)

**Owner-observed popup (exact text):**

> Rename needs Cloudflare setup. Review the selected destination in Remotes.

**Reported behavior:** A rename attempted from **Preview** now shows this popup. The owner states that **rename worked before** and should remain instant and simple.

### Expected behavior
- An already-connected, authorized Cloudflare account with access to the existing object should allow rename directly from Preview **without asking the user to revisit Remotes or re-run unrelated Cloudflare bucket/Worker setup**.
- Trace the exact guard and API call that emits the popup. Establish whether the failing condition is an actual missing required authority/capability, stale or incorrectly scoped configuration, a renamed feature path, or an inadvertent dependency on right-click destination initialization.
- Distinguish *rename authority* from *initial save destination setup*. Do not require provisioning/recreating `redown`, reconnecting OAuth, rebuilding native menus, or resetting CURRENT simply to rename an existing accessible object.
- If the required authorization really is unavailable or expired, clearly explain that specific condition and offer legitimate reconnection; **do not bypass security checks or fabricate a successful rename**.
- Ensure preview, Gallery and History rename routes share a reliable canonical operation and consistent errors. Maintain accurate remote verification and no wrong-object rename.

### Reproduction
1. In the installed Click2Cloud extension, open Gallery and preview an existing Cloudflare R2 object.
2. Attempt to rename the previewed item.
3. Observe popup: “Rename needs Cloudflare setup. Review the selected destination in Remotes.”
4. Compare to a previously working version and identify the first regression-producing commit; confirm whether the account is still authenticated, object is accessible and ordinary preview/listing works.

### Acceptance checks
1. Authorized existing Cloudflare object: rename succeeds through Preview without the setup popup or a detour to Remotes.
2. Works even when right-click native destination setup is absent **if the rename's own valid permissions and provider requirements are satisfied**.
3. Genuine expiry/missing authority: clear precise failure with no unauthorized mutation.
4. Preview, Gallery and History rename behavior remain consistent after reload and Chrome worker suspension.
5. Regression test specifically asserts that the *setup-required* message is not emitted for a valid existing-object rename.

## Implementation and safety constraints
- Treat this as a **bug report and request**, not confirmation that code has been modified or bugs fixed.
- Preserve all persisted History, destinations, approved account identities, OAuth state, original receipts and user data. No destructive resets, implicit Cloudflare provisioning or unauthorized mutations.
- Prefer shared, tested Gallery preview/rename mechanisms; keep memory, DOM and thumbnail cache budgets bounded.
- Include real installed-Chrome observations in final verification, and distinguish simulated fixtures from actual Cloudflare object mutations.
- Preserve the independent native right-click save path; History/Preview UI changes must not make save availability less reliable.

## Requested next Codex outcome
Identify root causes, implement minimal verified fixes on a separate branch, test with long History datasets and real authorized rename where available, and publish an evidence-backed report with exact changes, known limitations and reproducible steps.
