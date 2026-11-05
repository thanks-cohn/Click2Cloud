# Click2Cloud V3+1 — OAuth extraction from REDOWN (real Chrome testing)

**Status: reference-backed implementation contract, NOT a functioning OAuth login yet.**
**Owner requirement 2026-11-05:** Cloudflare Workers and disposable R2 test paths are Codex's live-test infrastructure. **OAuth in the independently installed Click2Cloud extension must work** so the user can connect Cloudflare, explore real buckets, create destinations and test a **real native Chrome right-click save**. Do not treat a simulated GUI or the existence of a Worker as a substitute for OAuth and browser testing.

## Exact REDOWN Cloudflare permissions and source

Reference (read-only REDOWN):
- [`extension/cloudflare-auth.js`](https://github.com/thanks-cohn/REDOWN/blob/main/extension/cloudflare-auth.js): authorization-code + PKCE S256 + OAuth callback and session lifecycle.
- [`extension/cloudflare-api.js`](https://github.com/thanks-cohn/REDOWN/blob/main/extension/cloudflare-api.js): Cloudflare management API bearer token handling, refresh lock, invalid-token classification, account session guard.
- [`extension/manifest.json`](https://github.com/thanks-cohn/REDOWN/blob/main/extension/manifest.json): current permissions, host permissions, extension identity and Google-specific OAuth declaration.
- [REDOWN OAuth setup](https://github.com/thanks-cohn/REDOWN/blob/main/SETUP.md): expected user login experience.

**Cloudflare OAuth scopes REDOWN currently requests (copy the permission intent, verify against Cloudflare registration):**
1. `workers-r2.read` — R2 account/bucket information access.
2. `workers-r2.write` — permission required for authorized R2 setup and mutations.
3. `workers-scripts.read` — inspect existing Worker scripts/configurations.
4. `workers-scripts.write` — deploy/repair Workers, ONLY when explicitly authorized; never trigger just for browsing, label changes or Refresh.

These are **Cloudflare OAuth scopes**, distinct from the Chrome extension manifest permissions. Favor least privilege where supported; do not silently escalate from read-only exploration into provisioning.

REDOWN endpoints: OAuth authorize `https://dash.cloudflare.com/oauth2/auth`, token `https://dash.cloudflare.com/oauth2/token`, management API `https://api.cloudflare.com/client/v4`.

### Chrome MV3 manifest permissions (minimize, feature-gated)

| Feature | Required Chrome permission/origin | Distinction |
|---|---|---|
| OAuth redirect and authentication | `identity`, `webNavigation`, `storage`, `alarms` | For REDOWN's redirect-listener approach. `chrome.identity.getRedirectURL('cloudflare')` determines the actual installed extension callback. |
| Native right-click menus | `contextMenus` | Needed to register `REDOWN → Cloudflare → saved destination` and receive clicks. |
| Cloudflare management | `https://api.cloudflare.com/*`, `https://dash.cloudflare.com/*` host access | Actual user-authorized account discovery, OAuth code redemption/refresh. |
| Selected Worker access | Verified authorized Worker origin / trusted transport capability | Do not assume the lab Worker has a public workers.dev URL. |
| Web file capture | `activeTab`/appropriate host access, optional `scripting` when truly required | Only request the capabilities needed for the supported right-click content; avoid copying REDOWN's entire broad host list without review. |
| Optional features | `notifications`, `sidePanel`, `downloads` | Add only if actually used by current Click2Cloud build. |

**Critical extension identity:** The independently installed Click2Cloud extension has its own ID, so its redirect is `https://<click2cloud-extension-id>.chromiumapp.org/cloudflare`. The Cloudflare OAuth client must permit that exact URI. REDOWN's public OAuth client ID and its redirect registration are NOT proof that Click2Cloud is registered. **Do not copy REDOWN's manifest `key`** to force the same extension identity; this could collide with a user's existing REDOWN installation. A properly registered Click2Cloud OAuth client and allowed redirect may require an action by the user/owner. No secrets, tokens or active auth states may be copied into the repository.

## OAuth state machine that Codex must implement

1. User explicitly clicks **Connect Cloudflare** inside the installed Click2Cloud Explorer / Remotes; open Cloudflare OAuth via a visible Chrome sign-in window (no invisible auto-login).
2. Generate cryptographically random `state` and PKCE `code_verifier`, derive SHA-256 S256 challenge, and use Click2Cloud's current `chrome.identity.getRedirectURL('cloudflare')`. Save *short-lived* OAuth attempt, tab/window identity and expiration in trusted `chrome.storage.session`; REDOWN uses a five-minute timeout alarm.
3. Register the callback listener synchronously in the MV3 service worker to survive suspension. Validate exact origin, path, matching login tab, unexpired attempt and constant-session state; claim/consume one-use authorization code once, reject duplicate callbacks and OAuth denial.
4. Exchange code with the registered Click2Cloud public client ID, exact redirect and PKCE verifier, without embedding client secrets in the extension. Track access token, refresh token if granted, expiry and a generation/session ID in **trusted extension storage**, never page DOM, debug logs, backup CURRENT JSON, or publicly accessible content scripts.
5. Verify the authorized Cloudflare account using API reads. **Token issued, account verified, R2 entitled, Worker prepared, and native menu applied** are separate states; never show ready when only one succeeds.
6. Refresh valid sessions with a lock (REDOWN uses `navigator.locks`), stable session-generation checks and retry rules that do not blindly repeat ambiguous writes. If refresh cannot succeed, show **Reconnect Cloudflare**, preserve all saved Simple/Narrow titles and Depth index.
7. On reconnect, match stable Cloudflare account and bucket IDs to saved destinations. Account mismatch MUST disable saves, not silently reroute to a different bucket. Logout removes authorization, never automatically deletes independently backed up menu configuration.
8. The installed extension's service worker owns privileged API calls and menu registration. The GUI is a trusted extension page and calls a narrow validated message API. Never route bearer tokens to an untrusted localhost origin.

## Workers: genuine test infrastructure, not user login

Connected Cloudflare inspection on 2026-11-05 confirmed a `click2cloud-v3p1-r2-lab` Worker and the real `redown` bucket. The Worker has recent deployments and service bindings including `REDOWN_ROOT`; its `workers.dev` subdomain is **disabled**. Its existence does not establish a publicly callable endpoint, valid user OAuth or successful object write. Codex must implement an **authorized route/service-binding strategy**, and never publish its secret token.

Limit live R2 writes/deletes to the documented `__redown_v3plus1_lab__/` disposable prefix or another explicitly authorized test path. Other REDOWN buckets/Workers are read-only compatibility references unless separately approved.

## Mandatory post-Codex real-world acceptance (not simulated)

- Build a true MV3 Chrome extension, load unpacked on Windows. Record extension ID and generated OAuth redirect URI.
- Connect Cloudflare through the **real user consent screen**; verify actual scopes/account, not simply presence of a token.
- In the extension's actual File Explorer, list the existing `redown` bucket via authorized Cloudflare APIs / Worker; select an actual folder under test prefix.
- Save the location as **Simple**, then create **Narrow** with several custom ancestor aliases; ensure **Depth** can be enabled simultaneously.
- Right-click a real external HTTPS image/link in a normal Chrome tab. Confirm **Chrome's actual native context menu** (not DOM HTML) shows the configured structure, with an exact stable destination ID.
- Click a leaf, route to the exact authorized account/bucket/prefix, send through the existing R2/Worker protocol and independently read back the exact saved object. **No false success** before a confirmed upload/readback.
- Restart Chrome and suspend/restart extension service worker; verify session/menus recover without prompting for unnecessary login (subject to valid OAuth grant).
- Revoke grant or expire refresh token; existing custom menus remain recoverable, but saves fail safely and the GUI offers reconnect.
- Verify no user account/billing/Worker provisioning occurs accidentally when testing just menu editing or file listing.

**No working OAuth, native registration or live save is claimed by this document.**
