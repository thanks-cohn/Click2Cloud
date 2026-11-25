# REDOWN Basic in REDOWN Remote

See the [provider reliability verification](REDOWN_PROVIDER_RELIABILITY_2026-11-22.md)
for the November 22 storage, OAuth, Shelf and local acceptance updates.

The integration branch builds on the REDOWN 0.3.23 alpha base
`400c0509a36e76c2c5bd5ef5c5426fa5d5709db9`. The read-only source is
[REDOWN Basic main at `75a738803e61cf7fa62c50328aa6ca5cc2cd70dc`](https://github.com/thanks-cohn/redown-basic/tree/75a738803e61cf7fa62c50328aa6ca5cc2cd70dc).
The generated MV3 package retains extension ID `ajppphdiamdobknpamcheohmdbdbeoal`
and the existing `/cloudflare` callback.

| Basic source | Host location and ownership |
| --- | --- |
| `extension/lib/api.js` | `src/basic/lib/api.js` validates Basic API v1 and authorizes the Shelf sender. `src/basic/host.mjs` initializes durable storage for saves, History and diagnostics separately from provider status, auth and navigation. |
| `extension/lib/auth.js`, `extension/providers/index.js` | `src/basic/lib/auth.js` and `src/basic/providers/index.js` handle independent provider grants, uploads and readback. Public clients are in the host manifest and `src/basic/config.js`. |
| `extension/lib/{coordinator,source,store,common,zip}.js` | `src/basic/lib/` owns source fetching, durable attempts and ledger, local history and diagnostic events/ZIP. The Basic IndexedDB and credential keys use a REDOWN Remote Basic namespace. |
| `extension/vendor/fflate.js` | `src/basic/vendor/` preserves the Basic copy of fflate 0.8.2 and its MIT license. REDOWN's source license accompanies the transplant. |
| `extension/shelf.js` card actions | `extension/basic-provider-cards.mjs` provides Sign In, Reconnect, Refresh, GO TO and recent outcome feedback inside the host Remotes page. Host CSS owns the appearance. |
| `extension/background.js` source selection | Existing `extension/background.mjs` dispatches the three canonical provider actions to the Basic coordinator after native acknowledgement and context resolution. Existing visibility settings still apply. |

## Internal Shelf API

From the REDOWN Shelf at `extension/app.html`:

```js
const reply = await chrome.runtime.sendMessage({
  channel: 'redown-basic-v1',
  api: 1,
  op: 'providers.checkSaveReadiness',
  input: {provider: 'onedrive'}
});
```

Only the same extension and its Shelf document can call this API. It returns
`{ok:true,value}` or `{ok:false,error:{code,message,nextAction}}`. Run
`api.describe` to inspect the currently supported input contracts. Providers
are `google`, `onedrive`, and `dropbox`.

- `providers.list`, `providers.getStatus`, `providers.checkSaveReadiness`,
  `providers.goTo`
- `auth.connect`, `auth.reconnect`, `auth.refresh`
- `saves.start`, `saves.getAttempt`
- `history.list`, `history.get`, `history.latestOutcome`, `history.delete`,
  `history.clear`, `counter.get`
- `history.readImagePreview` and `history.cancelImagePreview` for bounded,
  receipt-bound reads from the saved provider
- `settings.get`, `settings.update` for History page size and diagnostics retention
- `diagnostics.list`, `diagnostics.getForAttempt`, `diagnostics.clear`,
  `diagnostics.exportZip`

New Basic History data and diagnostics stay available through their own API.
The host's File API 3+1.1, tabs and Cloudflare History keep their existing
ownership. A previously installed standalone Basic extension keeps its own
storage. Diagnostics exports are local and capped at 16 MiB. Review them
before sharing because sanitized URLs can still include private paths.

Dropbox's History repair uses the optional `previewId` in
`auth.reconnect` only after a user chooses **Allow Dropbox image previews**.
The confirmed receipt binds the OAuth request to its saved account and
namespace. The existing save scopes stay in the request and the flow adds
the registration's `files.content.read` scope. The new grant is committed
only after identity and scope verification. The action leaves pending
saves alone and retries only the selected preview.

A native click uses the selected image, media, or link URL. Chrome's existing
site access and the source server's CORS policy determine whether the extension
can fetch it. A failed source read can offer a Chrome permission prompt for
the source's specific scheme and host. Granting access leaves the next save
gesture to the user. A protected source or CDN redirect can still fail.

Each source is bounded to 32 MiB, with at most two concurrent Basic saves
per worker. Adapters confirm identity, filename and size alongside a provider
checksum or streamed byte comparison. Only durable confirmation counts.
Interrupted or ambiguous writes remain uncertain and require checking the
destination before initiating another save. Recent card outcomes expose a
safe projection of the attempt without credentials or source paths.

## Appearance

Frames is a selectable host theme with an independent stored palette in
Settings. Frames and Minimal use the five Settings color and typography
palettes. Remote V1, Golden Age, Oceania, and the three Nostalgia variants
retain their established appearance. The provider cards use host surfaces,
controls, typography and focus states in every theme. The four sections are
one column from the slogan through the Cloudflare R2 card.

## OAuth and release gates

| Provider | Code configuration | Live proof |
| --- | --- | --- |
| Google Drive | Chrome identity, supplied public extension client, `drive.file` | Verify exact client registration, Drive API and consent/test users. Browser consent, refresh and native save/readback are unverified. |
| OneDrive | Supplied Entra client and `/onedrive` callback, state and PKCE, `Files.ReadWrite`, `User.Read`, `offline_access` | Verify the registered return URI, supported accounts and Chrome Origin/CORS behavior for the SPA token exchange. Browser consent, refresh and native save/readback are unverified. |
| Dropbox | Supplied app key and owner-confirmed `/dropbox` registration with PKCE/offline access. Requests account info, metadata read and content write. | Verify browser consent, refresh, app folder/access model and native save/readback. |
| Cloudflare R2 | Existing identity, callback and save workflow | Windows Chrome native save and live R2 Rename/byte readback remain unverified. |

In an authorized Windows Chrome profile, load the generated package with the
same extension ID. Connect each provider on Remotes, then save a disposable
known-byte image or link through its native menu item. Independently check the
destination object ID, final filename and bytes/hash. Compare the Basic History
attempt with the confirmed-only count, including one known failure and a
worker restart. Exercise reconnect and the source-site permission flow. For R2,
test the existing approved destination, then Rename through Explorer, preview
and immersive view with a live object readback.

## Local verification commands

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build:extension
npm run test:focused
node --test right2cloud-module/tests/module.test.mjs
npm run check:api-docs
C2C_AESTHETIC_EVIDENCE=work/foundation/basic-integration node scripts/test-aesthetic-browser.mjs
```

The maintained focused suite passed 630 tests, including 102 Basic tests.
The Right2Cloud module suite passed 49 tests. The Aesthetic browser fixture
passed 29 gates, including 160 theme, palette, mode and width combinations.
The broader product browser suite stops at its older quiet-login expectation
on both the integration tree and the pre-change branch tip. That fixture now
observes the existing owner-approved bucket/Worker setup during login.

The Aesthetic browser suite uses Chromium and provider fixtures. The provider tests use
deterministic responses and IndexedDB fixtures, including independent adapter
readback and interrupted-write test cases. The installed-extension Rename
probe was blocked by the cloud browser's unpacked-extension administrator
policy. Live OAuth, native menu rendering and actual destination bytes require
the Windows/provider checks above.
