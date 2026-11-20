# Minimal baseline and Explorer experiment

- Get URL now reads all usable public domains for the exact bucket and selected file. Explicit consent enables the bucket’s managed development URL and requires independent Cloudflare readback. Existing links and newly confirmed links appear beneath the input in the same dialog. [Get URL implementation](../docs/evidence/get-url-activation.md)
- Screenshot results reach Shelf status and History without routine desktop notifications. The Chrome webpage screenshot submenu is retired. File Explorer’s Screenshot2Here still configures rules for the selected folder. Both capture shortcuts use the existing direct R2 PNG upload and SHA-256 verification.
- Minimal is the default layout. Five palettes pair local fonts with light and dark colors. Remote V1 is the second theme. Old Bit o’ Polish selection resolves to Minimal while keeping its saved palette.
- Screenshot History shows one authenticated image preview and a destination card for every saved output. Each card has its own GO TO and URLs disclosure. Connecting a custom domain requires a Cloudflare Zone ID in the bucket’s account. A previously associated hostname in the same zone can supply that ID. The public links reflect provider configuration.
- Ctrl+Shift+F8 is free. The toolbar separator still supports resizing and keyboard control. Ctrl+Shift+F9 cycles the split through center and the selected extremes. Ctrl+Shift+F7 works inside Explorer. For browser-wide search, assign the new “Open File Explorer and focus filename search” command in `chrome://extensions/shortcuts`, for example Alt+Shift+F.
- The More menu says Screenshots. Settings places Remove Default Location at the bottom when a default exists. A connected Explorer places Sign Out beside Manage Destinations. Remotes retains Open File Explorer and gives its existing heading and subtitle distinct spacing.

Build with `npm ci` and `npm run build:extension`. Load the resulting `dist/click2cloud` directory using Chrome’s Load unpacked control. The build checks the registered extension ID and OAuth callback.

The browser acceptance tests use disposable profiles and an HTTPS Cloudflare fixture. Preview, configuration readback and byte verification in that fixture are separate from live account activation and anonymous access.
