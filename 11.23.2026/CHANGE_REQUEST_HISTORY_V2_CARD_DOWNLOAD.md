# OWNER-APPROVED ADDITION — HISTORY V2 INLINE DOWNLOAD PER CARD
**Date:** 2026-11-24
**Implementation scope:** The current Queue/History V2 + approved UX run on branch `codex/queue-history-v2-0324-verified-2026-11-24`, deriving exclusively from REDOWN 0.3.24 commit `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`.
**Priority:** Mandatory acceptance requirement. This request supplements the existing authoritative `queue-final.md` and is explicitly approved; it does not authorize unrelated feature work.

## User-visible behavior

Every **History V2 save-result card** must display a clearly labeled, readily accessible **Download** action in its **always-visible, collapsed card header/action row**, alongside filename/status/GO TO where space permits. A user must **never need to expand a card, open a Details/More menu, navigate to a Downloads page, or enter a preview/lightbox** just to initiate the download.

- Download means **download the actual saved cloud file to the user's device**, not download the metadata card, not export the History archive, and not perform a second cloud save.
- Include files from every actually supported provider and screenshots **where an existing authorized download/file API supports it**. Where one screenshot card has multiple saved destination outputs, give each distinct downloadable output a clearly identified visible action or an equally obvious no-expansion output choice; do not silently choose an arbitrary location or wrong file.
- Never fake provider support. For entries lacking a verified downloadable remote object, valid location, necessary authorization or provider capability, **keep the Download action visible but disabled** with accessible, meaningful context (e.g. "Download unavailable: reconnect provider" or "No downloadable file recorded"). Do not claim that a cloud save implies an accessible object.
- Active downloadable cards must have an operative Download control. The label must be textual **Download** (an icon may supplement it); do not replace with an icon-only ambiguous affordance. Follow all selected themes/palettes, keyboard focus/ARIA, narrow/responsive layouts, and compact/full History presets. No action clipping or hover-only discovery.
- Reuse the verified existing download capability/receipts of the REDOWN 0.3.24 File API, Basic provider APIs and Cloudflare flow where supported. Investigate authentic source/receipt fields and capability limitations before implementation; do **not** reimplement provider saving/auth engines, open unrestricted network access, bypass Chrome/provider permissions, or create hidden generic fetch shortcuts. Resolve only the exact saved object, detect stale/missing/changed objects, and surface normal errors truthfully.
- Prefer bounded streaming/passthrough existing download mechanisms. Do not bulk-buffer large files or preload file bytes when History renders, scrolls, loads or exports. Clicking one card must not hydrate other cards. UI failure must not affect actual saves or unrelated downloads.
- Download is a **read-only cloud-file retrieval** and must not become a new History save attempt, mutate cloud objects, lose auth, alter old History, or interfere with the complete History ZIP exporter. The standalone Downloads navigation entry remains excluded from More under the separately approved navigation rule; existing download backend/services remain available.

## Required automated and browser acceptance

1. Verify a visible **Download** text control on every collapsed History V2 result card in both Full and Compact presets and across supported themes / narrow widths, with no Details/More expansion, hover state or preview open.
2. Test successful one-click download of an already verified real destination via its authentic provider-owned download API; record provider, operation ID, filename, payload size/hash/readback when feasible and evidence/proof class. Keep unsupported provider cases disabled and explicitly described, not silently omitted.
3. Test offline, expired auth/reconnect, 403, missing/moved/changed remote object, unknown receipt/location, filename safety, large download, interrupted retry and multiple screenshot outputs, with truthful states and no accidental second cloud save.
4. Verify keyboard activation, disabled-action accessibility, no full History rerender or unexpected scroll/focus jump, no unbounded memory, and unchanged successful right-click saving when History/Download fails.
5. Prove the per-card Download is distinct from **Export Complete History ZIP** and does not create a new History save record. Document any provider whose actual download capability remains UNVERIFIED/BLOCKED; do not certify coverage with mocks.

**Release gate:** A visually present but dead button, one concealed behind card expansion, or a silently unsupported provider path **does not satisfy this request**. Report any blocker rather than claiming finished.

## Boundary

No change to the immutable 0.3.24 source foundation, old Queue branch prohibition, independent save engines, legacy History during alpha, Diagnostics, deferred work or permanent History cutover. This is an owner-approved addition to the current run, not a new standalone Downloads tab.
