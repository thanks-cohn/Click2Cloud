# Codex handoff — Simple Cloudflare R2 eligibility, no nested menu before activation

Target repo: `thanks-cohn/Click2Cloud`
Branch: `feature/original-vs-assisted-depth-proposals`
Scope: `simple/original_proposition/` and eventual isolated Simple integration. **Do not touch the other menu modes.**

Read `README.md`, `reference/simple-v3-original.mjs`, `src/cloudflare-simple-gate.mjs`, and `tests/cloudflare-simple-gate.test.mjs`. Verify the original Simple V3 route/label/menu behaviors before any adapter changes.

Implement an authenticated **Cloudflare connection + active R2 subscription** eligibility gate in the provider contribution layer. If the Cloudflare session is missing/expired/unknown, render exactly ONE flat root child `Cloudflare`; clicking it invokes REDOWN's existing Cloudflare login/connection flow, NOT an R2 URL. If the session is verified but R2 is inactive/unknown, retain the same one-row flat `Cloudflare`; clicking it opens the official R2 Overview `https://dash.cloudflare.com/?to=/:account/r2/overview`. Neither onboarding action ever uses save dispatch. If both pass but there is no valid writable destination, keep setup leaf; with one verified save target preserve direct flat save; with 2+ use the original flat-destination Simple submenu. No fake R2 subscription check inferred from stale cache or token; define fail-closed fallback. Preserve all sibling providers and the REDOWN root.

Write separate tests for the native registry contribution, account activation/expiration, login-versus-R2 click dispatch, and the setup click listener. Ensure a previously registered save action is invalidated when R2 entitlement expires. Prove zero uploads, history successes and counters on setup clicks. Do not provision an R2 subscription or charge the user automatically; Cloudflare owns checkout. Keep production REDOWN unchanged until explicit transplant approval.

**Other S3-compatible providers do not need Cloudflare R2.** Never apply this Cloudflare gate globally.

Report completed source changes, exact test results and remaining installed-browser/cloud acceptance gaps.
