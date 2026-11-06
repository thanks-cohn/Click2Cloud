# V3+1.1 implementation and acceptance — November 5, 2026

Repository: `thanks-cohn/Click2Cloud`. Branch: `feat/glaciaring-agent-debug`.
Baseline: `89efb77cbfc644551f9cdcdac8f77352d0699e6c`.

**Overall release acceptance: BLOCKED / INCOMPLETE.** The build, focused source tests,
real-browser fixture tests, and independent temporary-disk recovery tests pass.
An installed extension, normal human Cloudflare consent, and a live native save
with provider readback have **not** been established. No merge, deployment,
production object change, Worker publication, or billing change was performed.

## What is implemented

- Product MV3 manifest and build; action opens Remotes. Stable independent extension
  ID `ajppphdiamdobknpamcheohmdbdbeoal` is derived from the Click2Cloud public key
  recovered from this repository's implementation ancestor `1e8045e`. The build
  verifies that ID against the registered callback.
- Dark/Light GUI; conventional resizable account/bucket/folder navigation, toolbar,
  breadcrumbs, Details/List columns, real-provider listing adapter, pagination,
  folder double-click, row selection, arrow/Enter/Escape/Shift+F10/Ctrl selection.
  Unsupported remote mutations are not presented as available file operations.
- Single destination editor with Simple/Narrow/Depth and popup-only Show settings.
  Draft cancellation, immutable clicked target, Narrow aliases and selected-level
  Hide/Show, direct Simple Hide/Quick toggles, pencil, confirmed configuration-only
  deletion, 20-row manager pages, explicit Make Default, organization popup.
- Composite projection inside the existing canonical compiler; existing mode
  projectors, identity/resolver, native registrar, engine, capture and verified
  save dispatcher remain the owners. Quick leaves precede providers; exact default
  deduplication, selective Other Clouds placement, and 7-entry suggestion signature.
  No new competing menu/compiler/uploader backend.
- Registered Cloudflare public PKCE client, exact verified scopes/callback,
  account verification before Connected, refresh coordination, cancellation and
  generation fencing. No technical scope-entry prompt, provisioning, menu
  reconciliation, outline scan, or navigation is performed by login itself.
- 33 typed/schema-validated V3+1.1 domain tools, shared by GUI and the separate local
  agent gateway: connections/auth, provider reads, files, destinations/configuration,
  settings, paged menu inspection, desired/native ACK, recovery and outline jobs,
  and source-account-aware save dispatch. Transactional CURRENT configuration
  fences and durable retry records; one-operation save reservations prevent
  replaying uncertain writes. Grants bind actor, methods, accounts and expiry;
  effectful agent calls need separate host approval. Diagnostics remain read-only.
- CURRENT migration preserves existing mode records/IDs and adds product preferences.
  Configs, preferences and retry receipt commit in one IndexedDB transaction.
  Encrypted export/restore includes the new state. OAuth credentials, provider
  tokens, source URLs, file bytes and grant handles are excluded from backups.
- External filesystem recovery adapter, verified CURRENT/journals, rolling monthly
  journals, dated weekly/daily checkpoints, copy/readback before root switch, and
  restore without cloud rescanning. Simple/Narrow history toggles filter dated
  checkpoints; canonical CURRENT/journals always preserve both configurations.
  A partial checkpoint cannot silently clear excluded modes during restore.
- Independent per-bucket bounded-page recovery crawls, with depths unrelated to
  Chrome display depth, through the existing Universal File API. Whole Cloud jobs
  persist opt-in subscriptions and page coverage externally, pause without auth UI,
  and resume on normal same-account authorization. Explicit disconnect suppresses
  resume until the user enables the account again. Small exports contain full pages;
  above 8 MiB of inline metadata, exports explicitly identify a chunk-manifest form.

## Evidence classes and current result

| Gate | Result | Evidence / limit |
| --- | --- | --- |
| Build + stable identity | PASS | `build-results.txt`; unpacked directory below |
| Focused source tests | PASS | 107 passed, 0 failed; `focused-results.txt`; explicit allowlist, no retired atlas |
| Actual background module boot | PASS, fixture transport tier | Product background imported in a browser with fake Chrome transports; startup and API discovery passed; not installed MV3 evidence |
| Real browser GUI/API wiring | PASS, fixture tier | `browser-results.json`; actual app/modules and browser IndexedDB, fake provider/OAuth/native callbacks |
| Exact clicked Make Default; Simple Hide/Quick/edit/cancel | PASS, fixture tier | Browser assertions and `destinations-fixture.png` |
| 20-level Narrow hide 11–18 then Save | PASS, fixture tier | Browser editor and source assertions; target remains all 20 levels, draft does not mutate CURRENT |
| Additive modes, Flat, Quick order/default dedupe | PASS, source tier | Focused compiler/resolver tests; not native Chrome rendering |
| Organization 4+2=6 / 4+3=7 / 5+2=7 / 6+1=7 | PASS, source tier | Trigger/dismissal tests; no native screenshot |
| Theme, small viewport, keyboard/folder navigation | PASS, browser fixture tier | Four clearly labeled fixture screenshots and browser assertions |
| Revisions/replay/permission/version/restore | PASS, browser/source tier | API checks in browser JSON; scoped identity/expiry/revocation unit checks; diagnostic write denial tests |
| Real external files, year rollover and corrupted CURRENT replay | PASS, temporary POSIX disk tier | Recovery tests use actual filesystem, checksums/readback and separate month journals |
| OAuth registration/account bucket discovery | PASS, environment-credential read-only tier | `provider-read-only.json`; registration scopes/grants/callback, 20 buckets; **not extension OAuth** |
| Installed Chrome extension/native ACK | BLOCKED | Chromium 155 policy: `ExtensionInstallBlocklist: ["*"]`; actual CDP load rejected as disabled by administrator. Policy unchanged |
| Native menu pixels/click/MV3 kill-and-reconcile | BLOCKED | No permitted installed extension. Fake callbacks are not counted as Chrome ACK |
| Normal human provider login | BLOCKED | `dash.cloudflare.com` is outside enforced egress allowlist; network request failed. No real consent/token issued |
| Live native/Explorer save + final provider readback | BLOCKED | Installed extension + user OAuth unavailable; lab Worker public subdomain and previews both disabled. No authenticated Worker mutation transport configured |
| Definition of done: verified, usable live saves | FAIL acceptance target | Current extension host deliberately gates all mutations before staging until a real authorized Worker transport is supplied. This is an unfinished integration, not a successful save |
| Windows Automatic/Documents paths and uninstall recovery | BLOCKED | Windows/native companion absent; user-authorized directory adapter exists, but no known-folder guarantee or Windows uninstall proof |
| 2-hour live refresh/rotation; real provider revoke/reauth | NOT TESTED | PKCE/session tests use controlled responses; no long-duration consent session |
| Screen-reader audit, Windows/high-DPI/native appearance | NOT TESTED | DOM labels/focus/responsive CSS exist; no manual assistive-technology/Windows acceptance |
| Other provider uploads | NOT TESTED / unavailable | Drive/Dropbox/OneDrive/MEGA are not advertised as connected or working |
| Large-cloud retention/quota/8-MiB chunk-manifest export | NOT TESTED | No automatic historical deletion; full single-file streaming export above inline budget remains a gap |

Earlier vocabulary and initialization-race failures were fixed before the final
verification. Final passing tests do not supersede the blocked or failed product
acceptance rows. Screenshots contain labeled fixture accounts/files, not live
provider listings. Read-only management credentials were never substituted for
Click2Cloud's user OAuth or a verified native save.

## Build and install

```sh
npm run build:extension
npm run test:focused
npm run test:browser
```

Load `/workspace/Click2Cloud/dist/click2cloud` as an unpacked extension in a Chrome
profile whose policy permits developer extensions. Open Click2Cloud using its
extension toolbar action. The first view is Remotes. Exact registered callback:

`https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare`

The generated directory is the installable unpacked build. No CRX signature or
Chrome Web Store publication is claimed.

## Source inventory and API use

Retained/refactored: `src/core/{engine,menu-spec,menu-identity,action-resolver,
source-capture,save-dispatcher}.mjs`, mode projectors, CURRENT/schema, registrar,
Universal File API/R2/save-provider, read-only Glaciaring/debug host. The public
extension identity, initial auth lifecycle, local gateway and filesystem/job
adapters were recovered from `1e8045e`, inspected and adapted to this branch.
Product UI/build, expanded API schemas/types/client, permission owner, recovery
crawl and focused product tests were added. REDOWN was read only.

Runtime contracts: `src/api/service.mjs` (`toolRegistry`), `service.d.ts`,
`client.mjs`, `gateway.mjs`, `permissions.mjs`. Built package includes generated
`api-tools.json`. No localhost/public server, external Chrome message listener,
content-script command route, or installed MCP/ChatGPT connector exists.

Trusted extension DevTools can inspect `click2cloud.api` and `click2cloud.ready`.
A host-owned API request is `{version:"3+1.1", method, params}`. GUI requests pass
through the exact allowlisted app document; agents must use an independently
issued gateway handle and authenticated actor. Grant issue/approve/revoke methods
are trusted host hooks, not API tools. Creating a grant is explicit opt-in; it
never conveys provider authorization or bypasses human OAuth consent.

Configuration writes use `commitConfigChange({changes, expectedRevision,
idempotencyKey})`; `previewConfigChange` returns the canonical menu diff. All
changes include typed operation receipts. Native application and external backup
receipts are separate from the committed configuration revision. Account IDs in
saved-record mutations are resolved before authorization, preventing ID-based
cross-account edits. Menu generation fences and the existing dispatcher's independent
provider verification still gate saves.
