# REDOWN 0.3.30 verification

The repair branch started from the owner’s specifications at `3e3bf92`, with REDOWN 0.3.29 at `31cce6680b5a3d76eb6b4e6bd1b7e4d82c5ebe69`. The package version is 0.3.30 and the extension ID is `ajppphdiamdobknpamcheohmdbdbeoal`. The manifest comparison found a version-only change. The packaged Worker digest is `WII8-sbOYHDudzbYd5B6X64NzhFwTIYRPhaqJM4_TdI` in both versions. The packaged Console Era PNG also matches the baseline by SHA-256.

## First-use destinations

The cold Simple fixture reproduced `TARGET_NOT_DISCOVERED` before Worker setup on the 0.3.29 build. Simple and Narrow shared a validation path that required the selected folder or bucket to be present in the menu inventory. Explorer can expose a valid target before the menu inventory has observed it. Depth submits a scope change, so it bypasses that particular create-destination guard. The owner’s installed profile and the exact event that warmed its inventory were unavailable for inspection.

When the inventory lacks the target, the existing R2 File API now verifies the exact bucket or prefix under the current authorized account. A nonroot prefix needs an exact-prefix object or folder marker. On a valid selection, the existing destination save path persists configuration, prepares the selected Worker when needed, verifies capability and readiness, and reconciles Chrome’s native menu. Healthy scoped Simple targets reuse their Worker. Transient capability failures get bounded read retries. The existing setup lock and durable probe ledger protect against repeat preparation and ambiguous writes.

Repair Me uses the authorized recovery API for the affected configured targets. It appears after an eligible Worker failure and remains available after an unsuccessful repair. A verified Worker and native-menu acknowledgement clear the recovery state. Remotes retains the Remote V1 review control and the existing explicit permission and setup flows.

## Dropbox History

The reported error reproduced on a confirmed Dropbox record with no usable retained image and a grant without `files.content.read`. The 0.3.29 comparison found the preview loader and the Dropbox grant check unchanged from 0.3.28. Ordinary Dropbox OAuth requests the three scopes required to save. The read scope is enabled in the existing registration, and a user must explicitly authorize it for live previews when the existing grant lacks it. The incident’s onset at 0.3.29 on the owner’s profile remains unverified.

History first checks the retained preview. A supported, confirmed Dropbox image with an unavailable retained preview can offer **Allow Dropbox image previews**. The existing PKCE flow binds that grant to the saved record’s account and namespace. Denial and account mismatch preserve the previous grant. After approval, History retries that image read without starting a save. The 256 KiB retained limit, 4 MiB live limit, image validation, and cancellation still apply.

## Visual references and captures

Chrome uses the supplied sculpted reference for Liquid Black and Pure Chrome. Both appearances keep the existing Remotes layout, with the orange Cloudflare action and the approved crescent geometries. Golden Age uses Pinterest’s classic Gestalt tokens, including red `#E60023`, neutral light and dark surfaces, rounded controls and the existing image-first masonry. The stylesheet uses Gestalt’s native system-font stack as the locally available alternative to Pin Sans. The screenshots show the REDOWN application running in the Chromium fixture. [Approved Chrome reference](../reliability-lab/mockups/liquid-black-remotes.html) · [Pinterest product UI, figure 1](https://www.pinterestcareers.com/media/554n4aaq/introducing-multi-modal-search-at-pinterest-a-new-user-experience.pdf#page=2) · [Gestalt tokens](https://www.npmjs.com/package/gestalt-design-tokens/v/177.0.12) · [Gestalt buttons](https://github.com/pinterest/gestalt/blob/master/packages/gestalt/src/Button.css)

| Chrome | Golden Age |
| --- | --- |
| [Liquid Black](screenshots/chrome-dark-365.png) | [Dark](screenshots/golden-age-dark-365.png) |
| [Pure Chrome](screenshots/chrome-light-365.png) | [Light](screenshots/golden-age-light-365.png) |

## Executed checks

Node 24.22.1 and Chromium 155.0.8059.79. The browser scripts ran with isolated provider, Chrome API and account fixtures. The Worker integration also ran the production Worker in local workerd with synthetic source bytes, R2 and Durable Object bindings.

| Check | Result |
| --- | --- |
| Baseline `npm test` | 827 passed, one failed in `tests/depth-scope-regression.test.mjs` |
| Candidate `npm test` | 834 passed, the same baseline failure in `tests/depth-scope-regression.test.mjs` |
| `node --test --test-isolation=none tests/{depth-plan-recovery,basic-auth,release-0327,cloudflare-setup-ui,aesthetic,workings}.test.mjs` | 117 passed |
| `node scripts/test-click-and-done-browser.mjs` | All six mode orderings in six fresh browser profiles. Eighteen exact fixture saves after configuration persistence and registrar acknowledgement. A seventh profile exercised the contextual repair button through an outage, a failed repair and successful recovery. The repair itself did not replay a save. |
| `C2C_BASELINE_BUILD=work/redown-0330/baseline C2C_0328_EVIDENCE=work/redown-0330/browser node scripts/test-0328-browser.mjs` | 15 packaged UI checks. Coverage includes 34 appearance combinations at 320 and 920 px and 60 protected Remotes baseline style comparisons. Queue geometry, Unicode History truncation, Dropbox consent and preview retry, connection states, Refresh, both Chrome appearances and theme persistence passed. |
| `C2C_BASELINE_BUILD=work/redown-0330/baseline node scripts/test-console-save-notice-browser.mjs` | Four palettes, exact Large baseline geometry at a fitting viewport, both positions, three sizes, hover, keyboard dismissal, reduced motion, deduplication and expiry passed. Background fixtures also cover the master/open-Shelf preference combinations, a claimed renderer with a lost acknowledgement, a Shelf opening during delivery and the intentional native fallback. |
| `npm run build:extension` and `npm run check:api-docs` | Passed. 78 engine methods and three shortcuts. |
| `C2C_HEADLESS=1 C2C_SHELF_EVIDENCE_DIR=work/redown-0330/installed npm run test:shelf:extension` | Blocked before loading the genuine extension. Chromium returned `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`. |
| Windows native notification and live Cloudflare R2 / Dropbox | Unverified. No live-provider operations were performed. |

The installed Chrome and live-provider P0 gates remain open. The native menu receipts and remote readbacks above describe fixture execution.
