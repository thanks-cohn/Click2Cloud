# Click2Cloud Cloudflare OAuth — new independent implementation

**Implementation source:** [`cloudflare-oauth.mjs`](./cloudflare-oauth.mjs)  
**Tests:** [`tests/cloudflare-oauth.test.mjs`](../../tests/cloudflare-oauth.test.mjs)  
**Current status:** OAuth PKCE client code is committed; **new Cloudflare OAuth client is NOT registered**, and the actual Click2Cloud MV3 extension/background integration is NOT built yet. No live sign-in can be claimed.

## What changed versus REDOWN

This is **new Click2Cloud code**, not REDOWN's OAuth client ID, old `cloudflareAuth` state, manifest key or tokens.

- Own `click2cloud:cloudflare:auth` key. Access/refresh credentials must be stored only in **Chrome trusted extension contexts** using `chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})`; code refuses to store tokens otherwise. No tokens in `CURRENT.json`, menu backup or DOM.
- Authorization code + **PKCE S256**; secure random state and verifier per sign-in, launch via `chrome.identity.launchWebAuthFlow({interactive:true})`, redirect via `chrome.identity.getRedirectURL('cloudflare')`, verify exact callback and consume state before code redemption.
- Cloudflare public client (`token_endpoint_auth_method:'none'`) needs no embedded secret. Refresh token renewal with a cross-context lock, session generation checks; user may have to sign in again after revocation.
- REAL account listing verifies consent before reporting `connected`. Menu configuration is **never** erased on OAuth disconnect/expiration.
- Only extension-background-owned code can call `getAccessToken()` / `apiRequest()`; do not expose auth module to untrusted web pages or return tokens over runtime messages.

## Cloudflare account-side prerequisite — currently blocked

On 2026-11-05, the connected Cloudflare API returned **HTTP 403** when reading `GET /accounts/<account>/oauth_clients`: it requires **OAuth Client Read** and its creation requires **OAuth Client Write**. This connector cannot currently create the new OAuth application. No registration was attempted with invented credentials.

**Manual creation in Cloudflare dashboard** (until an authorized OAuth Clients Write API token/connector is available):

1. Open **Cloudflare → Manage Account → OAuth clients → Create client**.
2. Client name: `Click2Cloud V3+1`. **Response type:** `code`. **Grant types:** `authorization_code` and `refresh_token`. **Token endpoint authentication method:** `none` (public client with PKCE S256; DO NOT embed a client secret).
3. **Redirect URI:** `https://<actual-click2cloud-extension-id>.chromiumapp.org/cloudflare`. This is the literal result of `chrome.identity.getRedirectURL('cloudflare')` inside the FINAL installed Click2Cloud extension, whose ID must be fixed/stable for reinstall. **Do not use REDOWN's extension ID.**
4. **Scopes:** `workers-r2.read`, `workers-r2.write`, `workers-scripts.read`, `workers-scripts.write`. Cloudflare's authenticated `/oauth/scopes` endpoint confirmed each remains recognized as of 2026-11-05. Review broad Worker-script write permissions with consent.
5. For private owner testing, keep client visibility **Private**. Private OAuth clients are limited to members of their Cloudflare parent account. A future public release requires publisher-domain verification and separate visibility review.
6. Copy the returned **Client ID** (a public identifier) to the Click2Cloud extension's **trusted build configuration** and use `createClick2CloudCloudflareOAuth({clientId})` in its service worker. Do not copy any secret, REDOWN client ID or token into the source tree.

**No final redirect can be selected until the extension's manifest/ID is stable.** Codex's installation run must first produce a stable extension identity and then request the Cloudflare registration step when required.

## Example background-only integration

```js
// Trusted Chrome extension service worker (NOT a web page/content script)
import {createClick2CloudCloudflareOAuth} from '../src/auth/cloudflare-oauth.mjs';
import {CLOUDFLARE_CLIENT_ID} from './click2cloud-private-build-config.mjs';

const cloudflare = createClick2CloudCloudflareOAuth({
  clientId:CLOUDFLARE_CLIENT_ID
});
// On actual explicit user gesture, call cloudflare.connect() via a narrow
// extension message. Return ONLY connected status/account IDs, never tokens.
// The service worker alone calls cloudflare.apiRequest('/accounts?...').
// The real R2 Worker test and native Chrome contextMenus use the SAME
// authorized account/destination identities, not an OAuth simulation.
```

**Integration caveat:** The existing `src/dashboard/redown-bridge.mjs` / `dashboard/app.mjs` are still a REDOWN-host reference requiring REDOWN's privileged runtime. Do NOT secretly relabel them as functional Click2Cloud auth. Codex must replace that dashboard host with Click2Cloud's own MV3 service worker bridge using this new module. See `scaffold/gui/CHROME_EXTENSION_LIVE_ACCEPTANCE.md`.

## Test status

The module and test source passed a syntax/shape inspection in this conversation. The Node test suite, live Cloudflare consent, unpacked Chrome extension sign-in, and Worker/R2 saves **have not been executed or verified in this turn**. Run `npm test` in a real checkout (Node >=20), then load the extension and complete actual OAuth account verification and right-click tests.

## Official references

- https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/
- https://developers.cloudflare.com/fundamentals/oauth/integrate-with-cloudflare/
- https://developers.cloudflare.com/api/resources/iam/subresources/oauth_clients/methods/create/
