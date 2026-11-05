# Click2Cloud V3+1 — Primary Codex outcome: installed MV3 Chrome extension, real OAuth, real native menu

**Owner decision (2026-11-05):** The PRIMARY deliverable is an **unpacked Chrome extension** whose Explorer configures the **real Chrome right-click menu**. Codex's existing Cloudflare Workers and R2 test prefix are **live test infrastructure**, NOT simulated cloud stand-ins. OAuth is required to authenticate the separately installed Click2Cloud extension.

These requirements override earlier `localhost`-first and `SIMULATED cloud`-as-the-acceptance-path wording in `scaffold/gui/README.md` and `TEST_JOURNEYS.md`. [OAuth scope and redirect extraction](./REDOWN_OAUTH_EXTRACTION.md) is mandatory.

## Exact installation target

1. Produce a complete MV3 extension folder containing `manifest.json`, registered service worker, real Explorer GUI, OAuth login code, menu composer/registrar, save dispatcher, and assets; package/build it to a documented exact path (example: `dist/chrome-unpacked/`).
2. Install via `chrome://extensions` → Developer mode → **Load unpacked**, selecting **the folder**, not a zip. The Chrome extension must load without REDOWN V3 installed.
3. Click the toolbar icon: open Click2Cloud GUI (Remotes by default) with a visible **File Explorer** entry. File Explorer exposes actual authorized Cloudflare accounts/buckets/folder tree, **+ Right Click** and **Manage Destinations**. **NO separate hierarchy/Depth button beside + Right Click.** Local folder right-click includes **+ Right Click** and **Default Save Selection**.
4. **Connect Cloudflare** uses a valid Click2Cloud OAuth app/client and Chrome extension-specific redirect. Authorized sign-in must work after installation; permissions as audited in `REDOWN_OAUTH_EXTRACTION.md`. Neither REDOWN's account token nor Cloudflare worker's bound secret may masquerade as a browser OAuth session.
5. Chrome's real native context menu follows the SAVED popup **Show in Chrome: Simple/Narrow/Depth individual ON/OFF, All, or exclusive Flat**. The popup's Depth tab saves per-bucket **DISPLAY** participation/depth (default 10; NO hardcoded cap), independent of Recovery Mode crawl depth. All selects all three. Flat renders ONE actionable `REDOWN → Cloudflare` leaf without a Cloudflare submenu, bound to the user-designated **Default Save Selection** exact authorized folder. Saving/hiding a mode never deletes its configuration. No old exclusive-global-mode selector or Explorer hierarchy toggle.
6. A Chrome right-click on an actual web image/link with a selected destination must dispatch the real save, verify the authorized R2 object under the disposable test prefix, and show success ONLY after actual provider confirmation/readback.
7. A label change or destination removal in the GUI updates actual Chrome menu registrations with callback/generation acknowledgment. Restarting the MV3 worker must restore menus from saved state; no fake success.
8. Exactly the approved Manage Destinations popup: top Simple/Narrow list filter, 20/page, X config removal, in-place editor and Back below switch, Save fixed bottom; native Chrome `Manage Destinations` item can be hidden in Settings without disabling GUI access.
9. **Settings → Recovery Mode** provides Weekly (Monday default) or Daily schedules, Simple Recovery ON/OFF, Narrow Recovery ON/OFF, and expandable bucket Recovery ON/OFF + independent per-bucket **recovery crawl depth without arbitrary cap**. Persist this policy, popup Show/Flat/default target, per-bucket Depth DISPLAY choices, and known folder graph in independently durable `menu-config`, `depth-config`, `depth-index` and `recovery-policy` CURRENT + ordered deltas + dated immutable weekly/daily backups (`weekly.json` latest validated alias). Recover accidental deletion by explicit earlier restore point and corruption by verified replay. Uninstall survival only when external store survives.
10. Report PASS/FAIL/BLOCKED for every item after **real loaded-Chrome testing and actual Cloudflare API/Worker/R2 receipts**, not screenshots of an HTML simulation.

## Live test / safety boundary

Read-only Cloudflare inspection on 2026-11-05 confirms the `click2cloud-v3p1-r2-lab` Worker, its deployments, and bindings to REDOWN Workers (including `REDOWN_ROOT`), plus the actual `redown` R2 bucket. **Lab Worker's workers.dev subdomain is disabled**. Codex must establish a correct **authorized extension-to-management-API / Worker service path**. A service binding alone cannot authenticate a browser extension. No public route or magic localhost token workaround may be assumed.

Only use the repository's documented disposable `__redown_v3plus1_lab__/` R2 prefix for live write/delete tests. Do not change REDOWN production extension, production Worker scripts, unrelated bucket content, OAuth consent grants, billing or public access to make a test pass. If a new OAuth app registration / redirect grant is required, report the precise BLOCKED prerequisite while implementing everything else possible; never fake login.

## Why a browser GUI preview is insufficient

`chrome.contextMenus` exists inside the installed extension and represents actual Chrome menu structures, native submenus, event handlers and service-worker lifecycle. A local HTML menu can provide a convenient preview but **does not pass** menu registration, click/save or OAuth acceptance. The **installed extension is the actual product**.

## Codex handoff — run in this order

1. Read `scaffold/README.md`, `scaffold/gui/README.md`, `scaffold/gui/TEST_JOURNEYS.md`, `scaffold/gui/REDOWN_OAUTH_EXTRACTION.md`, this file.
2. Build the extension folder and GUI shell; load it in a real browser and prove no boot errors.
3. Integrate Click2Cloud-specific Cloudflare OAuth + connection/Refresh state and real listing, without copying REDOWN's extension identity or secrets.
4. Build popup three-tab config + bottom **Show Simple/Narrow/Depth/All/Flat** selector, Explorer folder **Default Save Selection**, NO hierarchy button, and a Show-filtered composite V3+1 compiler/controller; wire real Chrome contextMenus with exact Flat target and native ACK.
5. Save a disposable object to real R2 through an authorized Worker path; verify independent readback and correct bucket/prefix.
6. Implement dedicated Settings Recovery Mode Weekly/Daily + Simple/Narrow ON/OFF + independent per-bucket recovery scopes/levels; build four separate durable recovery namespaces and focused crash/deletion/restart/reinstall/backup verification. Do not run or expand the old 1,000-scenario project.
7. Supply the exact unpacked extension directory, install steps, actual Chrome test receipts and PASS/FAIL/BLOCKED matrix. Never claim unexecuted features were tested.

**Status: Required future implementation. This handoff does not itself install an extension or establish an OAuth session.**
