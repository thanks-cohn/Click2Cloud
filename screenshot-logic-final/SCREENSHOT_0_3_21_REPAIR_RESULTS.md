# Click2Cloud 0.3.21 screenshot repair results

Branch `codex/click2cloud-0.3.21-screenshot-repair` is based on `d66f1661e9f009516f3b4d39348141cb22d099af` from `codex/click2cloud-0.3.21`. The tested extension build is from commit `bcfd153a9570b97b03c9273ccfe0ea045225798b`. The implementation started in `334670e9779889bc1dbfb5a42b523722a3f60d6f`.

**Installed Chrome save pipeline passed against a local HTTPS R2 API fixture. LIVE-R2 NOT RUN.** Chrome for Testing 158.0.8127.36 ran the unpacked 0.3.21 extension on Linux. It took real visible-tab screenshots from physical X11 shortcut events and a native right-click. The HTTPS server supplied fixture OAuth API responses and stored the PNG bytes for independent readback. Live Cloudflare credentials and an authorized live test bucket were unavailable. Windows Chrome and the owner's actual OAuth grant remain unverified.

## What the browser actually saved

- Alt+Q with Shelf closed captured a 5,198-byte viewport PNG and verified `redown/screenshots/Screenshot-42969f34-c387-4faa-ac5e-791a7eb1dda1-1.png`. The account had an existing fixture `redown` bucket and no Worker record or folder marker.
- Three folder selections across two buckets and one Save produced one rule with all three paths and zero uploads. The test deselected and reselected a folder and used Escape to discard an editor draft. The deleted default card stayed deleted after reopening the page.
- Ctrl+Shift+Y with Shelf closed captured once and sent the same PNG to three exact keys. History showed 2 of 3 verified after the fixture returned HTTP 403 for `qa-screenshots/Three/`. That bucket had a stale Worker record. After restoring access, **Retry unconfirmed files** read the original third key, PUT the original PNG to that key, and verified it. The other two files kept their original proof.
- The actual browser context menu opened the one-off picker and saved only to `redown/Native/` while the three-folder automatic rule was active. The protected Chrome page produced a capture failure with zero upload. The existing Shelf History shortcut also opened and closed History.
- The screenshot recorder channel produced a SECURE ZIP with two screenshot receipts from the run. It contained the direct proof method, provider status, and a timestamped trace with zero reported gaps for the retried capture. The export omitted the source hostname, private destination paths, and PNG payload.

Capture `c6459373-fbc7-4f47-b0c1-4753ecd2b484` matched rule `cd38f59a-6f16-4cec-ba78-96a48af7508b`. Its 5,198-byte PNG had SHA-256 `1fce931ea6f1a7b6ed97acc625e4aab2ecd79bc1bb2b5da9b3ab3f68582a33b6`. Both Chrome commands supplied a tab. The extension corroborated it with the active tab and primary document. The fixture and the extension independently hashed the stored bytes.

| Output | Exact fixture key | First attempt | After Retry |
| --- | --- | --- | --- |
| 1 | `redown/One/Screenshot-c6459373-fbc7-4f47-b0c1-4753ecd2b484-1.png` | GET and SHA-256 confirmed | Existing proof retained |
| 2 | `redown/Two/Screenshot-c6459373-fbc7-4f47-b0c1-4753ecd2b484-2.png` | GET and SHA-256 confirmed | Existing proof retained |
| 3 | `qa-screenshots/Three/Screenshot-c6459373-fbc7-4f47-b0c1-4753ecd2b484-3.png` | HTTP 403 `R2_BUCKET_ACCESS_DENIED` | Same key and bytes, GET and SHA-256 confirmed |

## Code path

Previously, screenshot delivery resolved a prepared Worker and one bucket binding before any screenshot upload. Saving a new rule also required a verified folder marker. Now a shortcut freezes the rule plan, checks the active window and document before and after a single Chrome capture, and sends the PNG through the existing OAuth wrapper to the Cloudflare R2 Object API. The PUT uses literal path separators and segment encoding, and at most three outputs run concurrently. Each verified output has a successful exact-key GET with matching byte length and SHA-256. Readback precedes a repeated PUT after a lost response or a History retry. A different object at the same key stops the retry with a conflict. The cached PNG has a one-hour retention limit and shares a 48 MiB local budget.

The fresh default card uses an existing authorized `redown` bucket and the virtual `screenshots/` prefix. Existing rules are loaded with their IDs, targets, activation, and dedup settings. Profiles with prior rules get a setup offer that they can configure or dismiss. A deleted default card stays deleted. Normal delivery uses the direct API. The Worker screenshot endpoint and its distinct historical proof are available through the legacy code path.

The repair request supersedes the frozen test matrix's single Worker transfer and single-bucket expectations. Count one Chrome capture and one direct PUT per unique output on the successful first attempt, with an exact-key GET per output. The separate legacy fixture still checks one Worker transfer and its R2 HEAD proof. See [Cloudflare Upload Object](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/upload/) and [Cloudflare Get Object](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/get/).

## Changed files

- Delivery, capture, and OAuth. `src/cloudflare/screenshot-direct-upload.mjs`, `src/cloudflare/transport.mjs`, `src/auth/cloudflare-oauth.mjs`, `src/chrome/visible-tab-screenshot.mjs`, `src/screenshot/capture.mjs`, `src/screenshot/retry-cache.mjs`, `extension/background.mjs`, and `extension/screenshot-background.mjs`.
- Rules, selection, and results. `src/screenshot/rules.mjs`, `extension/screenshot-page.mjs`, `extension/app.css`, `extension/app.mjs`, `extension/history-page.mjs`, `src/history/model.mjs`, `extension/recorder-panel.mjs`, and `src/recorder/schema.mjs`.
- Packaging and tests. `extension/manifest.json`, `package.json`, `package-lock.json`, `tests/screenshot.test.mjs`, `scripts/test-screenshot-browser.mjs`, and `.github/workflows/test.yml`.
- Documentation. `11.2026/workings/right-click-workings.json` updates CURRENT only. `latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md` records source ownership. This report provides the acceptance evidence.

## Test results

| Command or check | Result |
| --- | --- |
| `npm run build:extension` and `unzip -tq Click2Cloud-0.3.21-screenshot-repair.zip` | Passed. Package, source manifest, and built manifest are 0.3.21. Stable ID `ajppphdiamdobknpamcheohmdbdbeoal`. |
| `C2C_CHROME_EXECUTABLE=/path/to/chrome C2C_SCREENSHOT_NATIVE_MENU=1 xvfb-run -a -s '-screen 0 1400x1000x24' node scripts/test-screenshot-browser.mjs` | Seven checks passed in real installed Chrome on X11, with the local HTTPS provider fixture. The environment used a separate Xvfb display with Python Xlib. The CI job installs Chrome for Testing, Xvfb, Python Xlib, and ImageMagick. |
| `node --test tests/screenshot.test.mjs tests/workings.test.mjs` | 20 passed. Includes lost PUT responses, absent or different bytes, OAuth refresh and missing issued item grants, cross-account fixtures, dedup, retry expiry, capture error classification, old and new ZIP proofs, and immutable baseline guards. |
| `npm run test:focused` | 489 passed, including Simple/Narrow/Depth and CURRENT/profile regressions. |
| `npm run test:engine-api` | 9 passed. |
| `node --test right2cloud-module/tests/module.test.mjs` | 49 passed. |
| `C2C_CHROME_EXECUTABLE=/usr/bin/chromium C2C_RECOVERY_EVIDENCE=work/current-recovery node scripts/test-current-recovery-browser.mjs` | 30 checks passed with real Chromium IndexedDB, including process kill and same-profile reopen. Three expected historical failure cases reproduced. |
| `C2C_CHROME_EXECUTABLE=/usr/bin/chromium C2C_BOOT_EVIDENCE=work/boot-login node scripts/test-boot-login-browser.mjs` | Existing failure reproduced on both the fetched baseline and the repair. The test timed out after 30 seconds waiting for the exact `Log in` button at line 21. This is also the failed assertion in [baseline CI](https://github.com/thanks-cohn/Click2Cloud/actions/runs/44778346552). |
| Real Cloudflare OAuth, R2 PUT, and exact-key GET | **LIVE-R2 NOT RUN.** The OAuth integration fixture checks grant handling and refresh. The live provider's response to the issued owner grant still needs verification. |

## Install and verify with your R2 account

1. Download and extract the [0.3.21 extension ZIP](https://raw.githubusercontent.com/thanks-cohn/Click2Cloud/b5a6fffe253a7b8d7894db244f79b5e2ff08443b/artifacts/Click2Cloud-0.3.21-screenshot-repair.zip). For an existing unpacked install, keep the same Chrome profile and extension entry, copy the new files over the existing unpacked folder, and click **Reload** in `chrome://extensions`. For a first install, use **Developer mode → Load unpacked** and select the extracted `click2cloud` folder containing `manifest.json`. Confirm version **0.3.21**.
2. Open **More → Screenshot**. In the rule form, choose the website scope, open **Choose folders**, browse with the chevron, check one or more folder rows, and click **Save** once. For a single-rule test, turn off other matching cards, including **Default Screenshots** if it points elsewhere.
3. Close Shelf. Focus `https://example.com/` and press **Alt+Q**. Open **History** and expand the latest screenshot. It should list the exact chosen destination and **R2 GET · SHA-256 verified**. Repeat with **Ctrl+Shift+Y** to verify a distinct capture. View assignments at `chrome://extensions/shortcuts` if either key fails to trigger.
4. In the Cloudflare dashboard, open **R2 Object Storage**, select the exact bucket and key from History, and download the PNG. Compare its SHA-256 to `captured.sha256` in your local RAW **Settings → Debug → Export scope → Screenshot captures** ZIP, in `screenshot-receipts.jsonl`. On Windows, run `Get-FileHash -Algorithm SHA256 .\Screenshot-<id>-1.png`. On macOS or Linux, run `shasum -a 256 Screenshot-<id>-1.png` with the real filename.
5. Repeat with three folders. If a destination returns 403, restore access to that bucket and click **Retry unconfirmed files** in the same History entry. Check that the previously verified files keep their keys and the recovered file uses its original key. An offline test also exercises live retry: leave the original webpage open, disconnect the network, press a shortcut, reconnect, and retry from that same entry while the PNG is cached.
6. For a one-off, right-click the webpage and choose **Click2Cloud → Screenshot → Choose folder…**. Select one directory, then click **Capture and save**. For support, use the Screenshot captures scope and export the **SECURE ZIP**.

### Build from source

```bash
git clone --branch codex/click2cloud-0.3.21-screenshot-repair https://github.com/thanks-cohn/Click2Cloud.git
cd Click2Cloud
git switch --detach bcfd153a9570b97b03c9273ccfe0ea045225798b
npm ci --ignore-scripts --no-audit --no-fund
npm run build:extension
```

Load `dist/click2cloud` in Chrome. SHA-256 of the published extension ZIP is `da4abb8c9e5410495f4bb4ff2262a89a340809fe5b5d15e47740e3f65701f5ff`.

The downloadable ZIP, browser log, checksum, and fixture SECURE ZIP are published on the [build branch](https://github.com/thanks-cohn/Click2Cloud/tree/b5a6fffe253a7b8d7894db244f79b5e2ff08443b/artifacts).
