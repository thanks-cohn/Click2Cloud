# CODEX NEXT RUN — Must Do (November 22, 2026)

**Status:** Prep request only. Creating this file does **not** authorize the assistant preparing it to edit application code, run an implementation, deploy, merge, or publish. When the owner explicitly starts a new Codex implementation run and supplies this file, Codex should carry out the two scoped changes below.

## Repository, branch, and precedence

- **Destination (sole writable repository):** `thanks-cohn/Click2Cloud`
- **Existing authorized branch (sole writable branch):** `codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`
- **Read-only references if needed:** `thanks-cohn/REDOWN` `main`; `thanks-cohn/redown-basic` `main`.
- **This is the sole task list for THIS subsequent, separately initiated Codex run.** Do not import any additional work from older `codex-request-*`, `NEXT_CODEX_*`, backlog documents, or the large `codex-request-redown-aesthetic-polish-cloudflare-independent-menus-2026-11-21.md`. That earlier specification is **design/context reference only** here, particularly for the existing Remotes heading and Aesthetic API. Do not treat it as a parallel implementation queue.
- Exactly **two user-facing modifications** are authorized: the **Reconnect** label and the new **TRUE REMOTE subheader**. Tests directly required for these modifications are in scope; broader unrelated fixes are not.
- Preserve Cloudflare R2 TRUE REMOTE, Basic provider OAuth, authorization and approvals, History, Explorer, original native right-click routes and verified saves. No new service worker or separate appearance engine.

## MUST DO 1 — Connected provider button says “Reconnect”

- In the Remotes provider cards, replace the visible connected-state button label `Reconnect / Approve` (also any `Reconnect/Approve` variation) with exactly **`Reconnect`**.
- Keep the disconnected-state button label **`Sign In`**. Retain the existing **`Refresh`** and **`GO TO`** actions.
- **Presentation-only wording change:** preserve the existing underlying reconnect/reauthorization/approval operation, OAuth scopes, permission checks, click handler, error recovery, and truthful status. If approval is required, the user must still be able to complete it through the existing flow.
- Apply the correct label consistently across Frames, Golden Age, Oceania and other existing themes, including any responsive provider-card view and accessibility text where appropriate. Do not replace authorization logic with a fake reconnect.

## MUST DO 2 — Add exact subtitle under the TRUE REMOTE pyramid

The Remotes page has a centered, two-line headline positioned **between Dropbox and the original Cloudflare R2 card**. Keep the existing two-line pyramid/perspective appearance:

```text
           The Future is NOW.
         True Remote is Here.
      Nothing Downloads to Your Computer!
```

**Precise visual requirement:**
1. **First line:** exact text `The Future is NOW.`, centered, smaller than the second line.
2. **Second line:** exact text `True Remote is Here.`, centered and **visibly larger / dominant** to give the first two lines a pyramid-like, widening perspective.
3. **NEW SUBHEADER underneath:** exact text **`Nothing Downloads to Your Computer!`**, horizontally centered and **clearly smaller than the dominant second line**. Treat it as a separate subordinate explanatory subtitle, **not** a third equal-size heading or an enlarged new pyramid tier.
4. All three lines keep their **exact punctuation, capitalization and wording**. Use deliberate balanced spacing and responsive typography. Do not merge, left-align, truncate or position the interlude inside a provider card.
5. Style coherently under the **existing Aesthetic API** for Frames, Golden Age, Oceania, light/dark palettes, narrow/wide Chrome/Edge panels, zoom, accessibility and reduced-motion preferences.
6. **Truthful claim boundary:** the new subtitle describes the **Cloudflare R2 TRUE REMOTE Worker-based save path** (bytes fetched and sent remotely, not downloaded to the user's computer). Do not present it as a guarantee for Google Drive, OneDrive, Dropbox, optional local fallback or operations that intentionally cache/download bytes locally. No transfer-engine rewrite is authorized to support this copy. Keep its placement with the Cloudflare R2 interlude so its scope is clear.

## Tests / acceptance

- Connected cards show **Reconnect** (never `Reconnect / Approve`); disconnected cards show **Sign In**. Buttons still invoke the same functioning authorization/approval flows. Test the existing action wiring and accessible labels.
- The Remotes layout continues to show `All Your Clouds. One Place.` above Basic cards, Google Drive → OneDrive → Dropbox, **the centered three-line interlude** and then the original Cloudflare R2 card.
- Visual checks in **Frames, Golden Age, Oceania** show the **first line smaller, second line largest and centered, subtitle smaller below**, including narrow side panels without overlap or clipping. Keep existing theme selection working.
- Run focused UI tests and relevant regression checks. Verify existing Cloudflare and Basic save/menu behavior remains unchanged; report real-browser tests separately from simulated ones.
- Identify any pre-existing test failure separately from regressions. The tagged pre-Codex baseline `redown-pre-aesthetics-menu-codex-2026-11-21` documents a `depth-plan-recovery.test.mjs` `AUTHORIZATION_REVOKED` failure. Do not silently label it a new regression or automatically expand scope to repair it.

## Delivery instructions for the later Codex implementation run

- Make actual implementation changes **only when the owner starts that Codex run**, not during this prep/documentation task.
- Keep changes minimal and reviewable. Commit and **push** completed implementation to GitHub on the **same authorized branch**, with exact commit hashes and a concise PASS / FAIL / UNVERIFIED test report.
- Do **not** merge into `main`, create a new branch, force-push, deploy Cloudflare infrastructure, publish to the Chrome Web Store or cut a release.

**Explicitly out of scope:** all other aesthetics redesign, native right-click menu dependency repairs, additional diagnostics exports, History changes, OAuth rewrites, worker repairs, database/storage changes and any tasks imported from older Codex request files. This follow-up is **only** the Reconnect label and the subordinate TRUE REMOTE subtitle.
