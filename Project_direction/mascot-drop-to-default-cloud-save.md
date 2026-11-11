# Product Direction — Mascot Drop-to-Default Cloud Save

**Added:** 2026-11-10
**Products:** REDOWN and Click2Cloud
**Status:** Future product-direction idea; not implemented

## Concept
Much like Chutey, REDOWN and Click2Cloud can feature a small mascot, preferably positioned in the **bottom-left** of the interface. The mascot acts as a direct drag-and-drop target: users drag local files onto the mascot, and the application sends those files to the user's currently configured **Default Location** in the relevant cloud provider.

## User experience
1. A mascot is visible or can be summoned at the bottom-left, without obstructing normal work.
2. Users drag one or multiple files onto the mascot.
3. On drop, the app resolves the same Default Location used by its existing destination system (not an arbitrary bucket or folder).
4. The upload begins only if the provider session, permissions, destination and upload capability are ready; if not, offer targeted reconnection or repair without losing the intended save.
5. Show actual upload progress and a verified success receipt only after the cloud provider confirms storage. On failure, preserve enough context to retry and do not display false success.

## Shared direction
- **REDOWN:** Chutey-like mascot for dropping files directly into REDOWN's default cloud destination.
- **Click2Cloud:** Equivalent mascot drop target, relying on Click2Cloud's default-location resolution and its API-first save/upload mechanism.
- Keep GUI and API behavior in parity. The mascot is a friendly entry point to the real upload API, not a separate unreliable upload implementation.
- Maintain privacy: send file bytes and needed filename/path metadata to the provider, not unrelated webpage/source URLs.
- Explore Chutey-style personality/animation as an optional layer; core drop-to-default functionality should work independently of animation.

## Mascot animation identity — dimensional pocket

The mascot doesn't simply accept files or show a conventional upload spinner. **It flips up, opens its dimensional pocket, and absorbs the dropped files into it.** The pocket is an absurd little portal to the user's default cloud destination.

- The physical performance should be **ludicrous, exaggerated, playful, and unpredictable**: outrageous flips, rubbery deformation, impossible pocket geometry, comic anticipation, and satisfying absorption.
- Drag-hover can trigger an anticipatory pose; a valid drop triggers the flip/open/absorb sequence. Multiple files can tumble or cascade in without implying unsupported operations.
- This theatrical absorption is distinct from verified completion: the mascot may swallow the files as the request is accepted, but must not show a final success celebration, increment success counters, or claim storage until provider verification succeeds.
- If the upload fails, the character may react comically, but the interface must clearly communicate the failed or pending state and enable retry.
- Favor cheap, responsive animation so the mascot never harms upload performance or UI responsiveness. Motion reduction/accessibility should be supported.

**Creative rule:** The dimensional pocket is the mascot's defining gesture, not merely a generic drag-and-drop highlight.

## Design / engineering considerations for later
- Decide whether the bottom-left target lives inside the app/extension UI or as an optional desktop overlay, respecting browser restrictions on drag-and-drop and desktop-wide overlays.
- Support multiple files, clear accepted/rejected file feedback, cancellation, progress, collisions, and retry without unintended duplicate uploads.
- Resolve Default Location **at drop time**, and never silently create or substitute a destination if the user's configured one is unavailable.
- Preserve the normal verified receipt and History / GO TO behavior.

**Product promise:** “Drag a file onto the mascot; it goes straight to your default cloud folder.”
