# Screenshot Hotkey Routing — Capture Directly to a Chosen Cloud Destination
**Status:** Project direction / proposed feature (not implemented)
**Products:** Click2Cloud routing/queue/provider engine; potential REDOWN screenshot UX integration
**Recorded:** 2026-11-12

## Vision
Let the user assign keyboard shortcuts to screenshot capture actions and precise cloud targets. One shortcut captures a region and saves it to Cloudflare R2 bucket A; another captures the active window and saves to bucket B; another sends a full-screen capture to a chosen Google Drive folder. No repeated destination picker is required when a valid configured mapping exists. User-chosen routing profiles, rather than hardcoded cloud accounts or buckets, define where each action goes.

## Core interaction
- User creates, edits, disables, deletes and reassigns named **Screenshot Routing Profiles** with a unique keyboard shortcut, capture mode, provider/account/destination/bucket/prefix or folder, image format and optional post-upload action.
- Supported capture intentions: **selected region**, **active browser window/tab where supported**, and **full display** where the available platform and user-granted capture permissions allow it.
- Example configurable mappings (illustrative; never presume these specific chords are free):
  - Ctrl+Shift+1 -> select region -> Cloudflare R2 / project-images -> copy verified cloud URL.
  - Ctrl+Shift+2 -> active window/tab -> Cloudflare R2 / bug-reports -> include diagnostic receipt.
  - Ctrl+Shift+3 -> full display -> Google Drive / Screenshots.
  - Ctrl+Shift+0 -> user-selected default screenshot profile.
- Separate optional flow: capture with the **Windows Snipping Tool (Win+Shift+S)**, then invoke a Click2Cloud action to upload the already-captured clipboard image to a specified profile. Clipboard access requires appropriate permissions and support; an extension cannot assume background arbitrary clipboard access.
- For capture modes blocked by browser/OS constraints, provide a clear supported fallback, not a misleading silent capture. A companion desktop app/native host may be needed for genuinely global hotkeys, arbitrary screen regions, other applications' windows, or reliable clipboard integration.

## Screenshot Routing Profile model
A profile has a stable ID and user-visible name; enabled state; capture source/mode; shortcut assignment and shortcut scope (browser vs desktop/global); exact destination reference (provider, account, bucket/container and prefix/folder); filename template and image format; optional copy-link/open-history behavior; and user-approved failure fallback. Resolve destinations using the canonical saved destination configuration without creating, deleting, replacing or silently retargeting buckets.

Do not couple profiles to physical key numbers: users must be able to move a shortcut to a different existing destination and vice versa. Detect conflicts with existing browser/OS shortcuts and other extension commands. Show supported key combinations per platform and make shortcuts configurable via supported Chrome extension command settings or a companion application's shortcut manager, not by claiming every chord can be registered.

## Proposed architecture
`Shortcut/Clipboard Intent -> Permission + Capture Adapter -> Screenshot Blob -> Profile Resolver -> Durable Upload Queue -> Existing Provider Adapter -> Verified Remote Receipt -> Shelf/History + Diagnostics`

- This is a **local screenshot upload** because the image is captured on the user's device. Do **not** label it TRUE REMOTE, which is for eligible source-to-cloud transfers without device staging.
- Reuse Click2Cloud's existing provider readiness, authorization, destination routing, durable upload queue, deduplication/idempotency, conflict policy (KEEP BOTH where selected), retries, independent verification, Shelf/History and diagnostics. Avoid a parallel unverified upload path.
- The capture adapter should be implementation-specific: Chrome extension tab/window capture has bounded browser API capabilities; OS-level screen snipping and global hotkeys generally need an explicitly installed and permitted desktop/native companion.
- A browser extension may provide a built-in region-selector over an accessible captured tab, but cannot claim universal desktop-region capture. Capture of protected/unsupported surfaces should fail clearly.
- On unsupported shortcut, permission denial, expired OAuth, missing target, offline provider or failed verification: show truthful status, keep the pending screenshot safely if user-approved and technically possible, offer retry/alternative routing, and do not claim successful cloud delivery.
- Record capture request, selected profile and exact destination ID, timestamps, queue/transfer/verification stages, retry outcome, and user-approved diagnostic provenance. Avoid collecting sensitive screen contents, clipboard contents or full page URLs in diagnostics by default. Exact source/page/host URLs, when applicable, belong only in separate explicitly selected local-only diagnostic mode with review before export.
- An uploaded URL should be copied only when independently verified and shareable according to provider permissions; otherwise present an object location/receipt without fabricating a public link.
- Reuse the API-first configuration and job lifecycle in both Shelf and browser UI; no UI-only side path.

## UX expectations
- Compact Screenshot Shortcut Manager: profile name, capture type, key chord, destination, post-upload action, enabled state, and permission/readiness badge.
- Quick create from an existing destination; preview the exact provider/account/bucket/prefix before enabling.
- Default profile plus configurable exception profiles; optional confirmation before capture/upload for sensitive workflows.
- History entry for each attempt, including failure/retry, originating profile, capture mode, and verified destination; no phantom success or premature counters.
- Clear distinction between (1) extension-only capture, (2) desktop-companion capture, and (3) user-initiated Snipping Tool/clipboard upload.

## Implementation phases
1. **Feasibility + permissions:** assess Chrome MV3 `commands`, `tabs.captureVisibleTab`, `desktopCapture` / relevant current screen-capture APIs, browser shortcut limits, and Windows companion/native messaging constraints; enumerate supported capture scopes per platform and privacy prompts.
2. **Browser-first MVP:** configurable shortcut to capture the current tab, resolve one named destination profile, enqueue a local screenshot, verify provider upload, record correct History/diagnostics. Add tab-region selection if reliable.
3. **Multiple profiles:** independent key-to-profile assignments, editable destinations, conflict detection, configurable filename, fallback and copy-link settings.
4. **Extended capture paths:** full display/other-window capture or Windows Snipping Tool clipboard routing only where actual permissions/platform support allow it; evaluate native companion if needed.
5. **Reliability polish:** offline retries, explicit permission recovery, browser restart behavior, dedupe, accessibility, privacy controls, and empirical end-to-end testing.

## Acceptance criteria
1. Two different shortcuts route screenshots into two different user-selected buckets/folders, with accurate verified receipts.
2. Changing a profile's destination changes subsequent uploads only; existing saved profiles and provider destinations are preserved through restart/relogin.
3. Unbound, conflicting or OS-reserved key combinations are rejected or handled transparently; no phantom capture.
4. Screenshot mode and upload mechanism are correctly represented; local capture is never mislabeled as TRUE REMOTE.
5. Failed capture/authorization/upload/verification is visible in History and recoverable without false counters, lost user configuration or silent rerouting.
6. The user's permissions and privacy choices govern screen/clipboard access; no automatic exposure of private screenshots or URLs.
7. The flow uses tested shared APIs/queue/provider contracts and respects existing higher-priority reliability and configuration-preservation work.

## Relationship to other directions
Complements `Project_direction/AUTOMATIC_FILE_TYPE_CLOUD_ROUTING_2026-11-12.md`: file-type routing classifies browser downloads, whereas screenshot routing captures local pixels through a shortcut/clipboard event. Both share destinations, queueing, verification and diagnostics but have different permissions, payload sources, and transfer classification.

**Non-goals:** bypass OS/browser screen-capture protections, silently record a user's screen, assume all shortcuts work globally, manufacture public URLs for private objects, or introduce automatic cloud resource provisioning.
