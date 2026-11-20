# Get URL activation and verification

On the experimental branch base `132731193960cb9dc0e3510410ccadfd68812d64`, the Explorer browser fixture reproduced the report. Yes opened the editor with zero provider writes. Recheck found no URL, and reopening the same file asked again.

The repair uses the existing Cloudflare OAuth transport and trusted API sender. Get URL and Recheck check the exact saved object and read the selected bucket's managed and custom domains. When both reads establish that the bucket has no usable domain, the dialog offers bucket-wide consent. Yes runs the separate provision command. It rechecks the bucket and sends a single managed-domain PUT when needed. It requires an independent GET that confirms the enabled setting and supplies the hostname. The same dialog displays the exact object URL beneath the custom-domain input and refreshes its inventory, preserving the existing custom-domain links. The input checks existing associations, and links to the Cloudflare dashboard for setup.

## Repeatable checks

- `node --test tests/get-url.test.mjs tests/release-0320.test.mjs tests/shelf-message-boundary.test.mjs` exercises the API and provider boundaries, including two concurrent requests, account and agent approval checks, exact object identity, pagination, malformed reads, and denial.
- `node scripts/test-release-0320-browser.mjs` exercises the production dialog in Chromium with fixture messages. It checks zero writes on Recheck, in-place refresh and input retention after Yes, stale dialog results, keyboard copy, and TXT/grouped exports.
- `npm run build:extension` creates the unpacked extension at `dist/click2cloud`. Load that directory from Chrome's Extensions page to install the build. The build command checks the registered extension ID and OAuth callback.
- `C2C_CHROME_EXECUTABLE=/path/to/chrome node scripts/test-get-url-browser.mjs` exercises the unpacked extension through its actual MV3 message and OAuth transport. It uses a disposable profile and a local HTTPS fixture. Set `C2C_GET_URL_EVIDENCE` to a directory to capture the consent and verified URL views. The installed-browser test also runs in the repository's Chrome for Testing job.

The managed Codex Chromium returned `Loading of unpacked extensions is disabled by the administrator.` Live Cloudflare configuration and anonymous object delivery require separate evidence. All provider writes in the automated checks target the fixture.
