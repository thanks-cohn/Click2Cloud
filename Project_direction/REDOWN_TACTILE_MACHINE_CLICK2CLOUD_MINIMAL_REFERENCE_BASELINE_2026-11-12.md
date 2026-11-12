# Product Direction — REDOWN as a Tactile Machine; Click2Cloud as a Minimal Reference Baseline

**Recorded:** 2026-11-12
**Applies to:** REDOWN and Click2Cloud
**Status:** Long-term project vision and reliability/testing direction; **not a claim of implemented parity or a request to rewrite either product now**.
**Repository of record for this direction:** Click2Cloud, `Project_direction/`.

## Foundational product distinction

> **REDOWN should feel like a physical machine people operate. Click2Cloud should be the abstract, feature-reduced control version that proves the machine's core workflows work.**

These are intentionally different faces of the same category of cloud workflow, not competitors with indistinguishable styling.

### REDOWN — an interactive machine

REDOWN is the expressive flagship product. Its Shelf, Explorer, right-click destinations, animations, visual feedback, sounds if enabled, and operational controls should convey the feeling of interacting with a crafted physical machine: immediate response, deliberate controls, visible state transitions, predictable cause and effect, and trustworthy feedback.

- Physicality is a **UX metaphor**, not a claim of real hardware or permission for skeuomorphic clutter.
- Strong visual identity, depth, weight, mechanical-feeling state transitions, and memorable controls may be part of its brand.
- Feedback must be truthful: a satisfying success animation or counter movement follows a verified provider receipt, not merely a click or optimistic API acknowledgment.
- Physical-feeling polish must never conceal a failure, block the base cloud workflow, slow down critical operations, or compromise accessibility.
- Gracefully degrade optional visuals; preserve keyboard use, reduced-motion preferences, clear text statuses and responsive behavior.
- Treat the advanced UI as a layer atop reliable cloud functionality, not a prerequisite for completing saves.

### Click2Cloud — a clean, abstract reference instrument

Click2Cloud is the **functional baseline/control**: a deliberately plain, light, minimum-CSS alternative used to test, understand and compare REDOWN's essential cloud capabilities.

- Provide the smallest understandable UX for essential operations: choose provider/account/destination, authenticate via supported sanctioned flow, save, see status, see verified result or actionable failure, inspect recent attempts, retry when safe.
- Prefer native/simple HTML controls, restrained layout and colors, minimal animations, straightforward labels and low JavaScript/UI complexity.
- Do **not** replicate REDOWN's physical-machine styling or add decorative features simply for visual parity.
- Click2Cloud must remain a **real usable fallback**, not a mock screen that always returns success; failure, incomplete and uncertain states must be displayed honestly.
- The benchmark should be intentionally feature-reduced rather than permanently feature-frozen; new core features earn inclusion when needed for a meaningful controlled comparison.
- Minimum CSS does **not** mean poor accessibility, poor error reporting, absent validation or weaker security.

## Core engineering purpose — a diagnostic control

If REDOWN's fancy interface, lifecycle, Shelf, context menu, or optional features misbehave, compare an equivalent supported operation with Click2Cloud's lean path.

**Question to answer:** Is the failure in the underlying provider/auth/destination/transfer contract, Chrome extension lifecycle, or in REDOWN-specific UI/orchestration layers?

Keep common **contracts**, not necessarily a single inseparable implementation:
- A versioned testable operation contract: source intent -> selected provider/account/destination -> authorization/readiness -> dispatch -> transfer -> independent verification/receipt -> truthful history/error state.
- Stable correlation IDs, standardized statuses/errors and test fixture formats across both products.
- Independent UI rendering and as much independent execution/bootstrapping as practicable for a meaningful baseline. Explicitly document shared dependencies because a bug in shared code could affect both products and invalidate a naive diagnosis.
- Avoid a second uncontrolled production save engine just for aesthetics: intentionally select which parts are shared and which are isolated, and test both shared components and independent integration paths.
- No automatic copying of authentication secrets between apps. Test the same provider/account/destination only through authorized connections; don't expose tokens or sensitive URLs in public diagnostics.

## Controlled comparison workflow

For each reproducible issue, record:
1. **Environment:** exact app/commit/version, browser/build, extension state, OS, approximate free disk space, connection state, and test time.
2. **Input:** same authorized source file/URL type and size class; same intended cloud provider/account/destination and route, where practical.
3. **Execution:** attempt a bounded, safe test through REDOWN; attempt the equivalent in Click2Cloud with independently observed timing/state.
4. **Evidence:** record dispatch, provider acceptance, actual verification, History receipt, retries, user-visible state, worker/page reload if seen, and explicit failure codes. Separate local recording from independently verified remote delivery.
5. **Interpretation:** 
   - Both fail similarly: inspect common provider/API/credentials/network/contracts and shared dependencies first.
   - REDOWN fails but Click2Cloud succeeds: inspect REDOWN-specific UX, Shelf, menus, orchestration, lifecycle and optional modules.
   - Click2Cloud fails but REDOWN succeeds: inspect baseline's own implementation and platform constraints; do not assume REDOWN is always superior.
   - Both succeed: do not declare an intermittent failure solved; compare repeatability, latency, dropped events and user-facing truthfulness.
6. **Privacy:** secure/redacted diagnostic bundle by default; raw URLs/errors may contain secrets, so explicit consent, local-only handling and review before any sharing.

Run controlled **small** test batches first, especially after a crash; do not stress-test unstable user accounts or trigger unintended repeated remote writes merely to gather data. Preserve attempts across restart and distinguish the Chrome browser's normal MV3 worker sleep/update from a proven crash.

## Architecture and design safeguards

- Maintain a **thin Click2Cloud baseline** with sharply defined core scope. REDOWN can evolve into a more tactile, visual and powerful product while the baseline stays comparatively boring and observable.
- Feature-rich REDOWN changes should be compared with the baseline at contract boundaries. Avoid requiring complex animations, 3D rendering, or other optional visual components for core saves.
- Keep strict Chrome CSP, permissions and security. Do not add unsafe-eval / wasm-unsafe-eval to make the visual experience work; temporarily disable incompatible optional rendering and restore only through a reviewed, compatible implementation.
- Independent smoke tests for ordinary Chrome reload/update, worker reactivation, right-click save, Shelf open, Options open, provider readiness, exact destination, and successful/failed receipt.
- Make release comparisons objective: same test fixtures, versioned evidence and clear pass/fail/unknown outcomes. Baseline health does not guarantee REDOWN health or universal provider availability.
- Protect user settings, tokens, queue jobs, saved destinations, History and diagnostics across updates. Never treat failed storage reads as permission to erase them.
- Preserve existing working implementations and documented scopes; this direction does **not** authorize an immediate rewrite of Click2Cloud V3+1 or REDOWN.

## Intended user-facing contrast

| Dimension | REDOWN flagship | Click2Cloud control baseline |
| --- | --- | --- |
| Experience | Tactile, crafted machine; characterful controls and visual feedback | Abstract, clean, utilitarian, low-CSS interface |
| Complexity | Advanced explorer, optional polish, rich interaction | Essential workflow only; few moving parts |
| Success indication | Satisfying but verified | Plain but verified |
| Failure indication | Detailed, visible, recoverable | Plain, equally specific, recoverable |
| Debugging role | Full real-world product under test | Reference implementation / fallback for comparison |
| Long-term standard | Never sacrifice reliability for decoration | Never sacrifice real functionality for simplicity |

## Future decision rule

**When REDOWN breaks, Click2Cloud is the control sample—not an excuse to leave REDOWN broken.**

The aim is to know what happened, where, when, how, and why to the extent observable. A plain alternative helps isolate problems, while REDOWN remains free to deliver the distinctive physical-machine experience its users enjoy.

**This document captures product intent.** Each implementation should follow a separately scoped, reviewed plan with focused tests and real-browser acceptance evidence.
