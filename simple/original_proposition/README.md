# Simple / Original Proposition — Cloudflare R2 Onboarding Gate

**Owner directive:** November 3, 2026. **Scope: SIMPLE ONLY.** Nothing in this directory defines or changes another menu mode.

## Product decision

Cloudflare **must not expose nested right-click destinations until BOTH necessary eligibility checks pass**:

1. REDOWN can confirm the user has an authenticated/connected Cloudflare account.
2. REDOWN can independently confirm that the connected Cloudflare account has **an active R2 subscription/entitlement**.

If **either** check fails, is unknown, or the session is expired, the entire Cloudflare contribution to the REDOWN right-click menu consists of **one flat item**, titled exactly `Cloudflare`. Clicking that item is **onboarding navigation**, **not a save attempt**: open [Cloudflare's R2 dashboard overview](https://dash.cloudflare.com/?to=/:account/r2/overview), where Cloudflare can authenticate the user and present its R2 enable/checkout flow. Do not show a submenu, bucket headings, false save animations or successful History entries. Do not launch an unrelated REDOWN Shelf page first.

Cloudflare's own current documentation says an R2 subscription must be added through **Storage & databases → R2 → Overview**, and R2 includes some free monthly usage. Do not describe R2 activation as necessarily a charge or claim that the user has paid. Source: https://developers.cloudflare.com/r2/get-started/ (verified November 3, 2026).

**If both checks pass**, the Cloudflare submenu becomes **eligible** but only real, prepared destinations may be shown. Eligibility alone must never invent an existing bucket or write access. If no writable/authorized R2 destination exists, retain a single flat Cloudflare setup action and lead the user through authorized bucket preparation (e.g. the intended lowercase `redown` root) instead of a fake save.

To preserve the original Simple UX: after both checks, **exactly one valid default save target** allows a direct, one-click flat `Cloudflare` save leaf. With **multiple** eligible paths/bucket roots, project one `Cloudflare` parent and flat configured save rows (existing Simple label/order contracts apply). A parent with children cannot simultaneously be a native save leaf. Retain Home behavior from the *original Simple* projection unless a separately approved tweak changes it; do not use another mode's logic to decide this.

## Required gate truth table

| Cloudflare session | R2 subscription | Authorized save targets | Native Cloudflare row | Click action |
|---|---|---|---|---|
| Missing / unknown / expired | Any | Any | One **flat Cloudflare** | Open R2 Overview (login / subscribe) |
| Verified | Missing / unknown / inactive | Any | One **flat Cloudflare** | Open R2 Overview (activate / checkout) |
| Verified | Active | 0 | One **flat Cloudflare** | Open R2 setup / prepare bucket, not save |
| Verified | Active | 1 | One **flat Cloudflare** | Verified direct save to exact target |
| Verified | Active | 2+ | One **Cloudflare submenu** | Flat authorized Simple destinations |

Do not equate `workerUrl`, a cached profile, or a successful Cloudflare sign-in by itself with confirmed live subscription and bucket access. Use a provider-readiness service that returns a reliable tri-state result (verified active / inactive / unknown), and fail closed as setup while the result is unresolved. A successful entitlement check does not substitute for an authorized destination check. Revalidate when session/subscription/profile state changes and reject stale native save IDs.

## This is Cloudflare-specific, not a universal S3 tax

**Other S3-compatible storage providers do NOT require a Cloudflare R2 subscription.** Each provider's own account, entitlement, credentials and destination capabilities are independent. Cloudflare's R2 activation gate must not hide, disable or reparent Google Drive, Dropbox, OneDrive or other S3 providers. The REDOWN root remains available, with flat sibling provider contributions as independently authorized.

## Implementation sources and requirements

- Original preserved Simple logic: `reference/simple-v3-original.mjs` copied byte-for-byte from `original_proposition/src/modes/simple-v3.mjs`; it represents V3 projection/parity, not this activation-gated behavior.
- Pure reference decision model: `src/cloudflare-simple-gate.mjs`; no network, Chrome, credential or cloud operations.
- Unit contracts: `tests/cloudflare-simple-gate.test.mjs`.
- Engine integration should gate **before** invoking Simple's existing `simpleProjection()`, in the provider contribution boundary; its `simpleTargets()` remains unchanged until separate explicitly scoped tweaks are approved.
- When setup click is selected, open verified official R2 Overview URL using a browser tab. Never treat it as a file source URL or cloud upload.
- Only confirmed upload receipts trigger SUCCESS! and History success.

## Verification

Test all five truth-table branches, unknown/stale eligibility, account swaps, revocation, no bucket, multiple buckets, registry ID collisions, rapid login activation, native parent-to-leaf transition, Chrome service-worker wake, and unaffected sibling providers. The setup destination must be tested in a real Chrome session with a test account. No direct production REDOWN rollout is authorized by this proposal.

**Implementation status:** Simple reference model and tests only. Live Cloudflare login/entitlement checks and Chrome native registration wiring are pending.
