# Experimental — Native Credential Broker for Click2Cloud

**Recorded:** 2026-11-14 (America/Chicago)  
**Product:** Click2Cloud (Tinker & Co.)  
**Priority:** Experimental research, not shipped or security-approved functionality.  
**Owner motivation:** Keep Cloudflare credentials locally in a native desktop application so the browser extension can carry out authorized tasks without a repeated interactive OAuth login every session; support long-running jobs, reusable configurations, per-bucket access, and a smooth seven-day-or-longer signed-in experience where provider policy allows it.

## Proposed experience

1. A user installs the **optional Click2Cloud native desktop application** and its paired, authenticated browser extension.
2. In the desktop application's **Cloudflare connections** screen, the user selects **Add R2 connection**. They create scoped Cloudflare R2 access credentials in the official dashboard or through a separately authorized integration, or import existing access key ID and secret access key.
3. The user selects a named configuration, account, permitted buckets, and actual enforced permissions (e.g., object read-only or read/write). Configuration metadata is visible, while secrets are only shown when explicitly requested.
4. The native app stores reusable credentials in the operating system's protected credential store (Windows Credential Manager/DPAPI, macOS Keychain, or an appropriate Linux Secret Service/keyring, where available) instead of Chrome storage, project files, ordinary plaintext JSON, screenshots or a hosted server.
5. The extension establishes a mutually trusted local connection to the native host using the browser's documented **Native Messaging** mechanism (with a registered host manifest and narrowly permitted extension origins). The extension requests authorized high-level operations such as **list bucket**, **save to target**, **get object**, **upload directory**, or **get short-lived scoped job authorization**. Whenever feasible, **the native app performs requests on behalf of the extension rather than sending the parent secret to extension JavaScript**.
6. The user remains connected across ordinary browser restarts while the stored credential stays valid and explicitly authorized. The extension may show a **Connected via Desktop** indicator, active account/bucket, permission scope, credential expiry and last successful verification.
7. If a token expires, is revoked or lacks scope, explain the cause and offer **Reconnect / Replace Credential** without deleting saved destinations or the pending job queue.
8. For large jobs, a local job manager persists checkpoints and retries safely. Background work can continue while the browser is closed **if the native application is running**, network/credentials remain valid, and necessary data remains accessible. It cannot continue while the computer is shut down without separate, explicitly authorized remote staging infrastructure.

## Architectural distinction: eliminating OAuth prompts is not extending OAuth tokens

- **R2 S3 API access keys** are not OAuth access tokens. Account-owned R2 API tokens may remain valid until revoked or until a configured expiry. Some can be restricted to particular buckets and object permissions. Do not silently turn them into broad account-admin keys.
- **Native credentials instead of OAuth** is a possible *alternative authentication path for operations supported by R2 S3*. It **does not** automatically authorize all Cloudflare REST actions or Worker deployment/management endpoints currently using OAuth.
- Click2Cloud's existing Cloudflare OAuth module **already implements refresh-token renewal when Cloudflare actually issues a refresh token**. A request to 'make OAuth seven days' should be investigated as a source of repeat logins, not implemented by writing a fictitious `expiresAt`, ignoring 401s, or enlarging scopes without real provider approval.
- For sessions on the existing OAuth path, target **at least seven days without unnecessary interactive login** through proper refresh-token handling *if provider grant policy permits*. Distinguish refresh-token missing, invalid/rotated, revoked, permissions changed, browser storage changed, and state/UI bugs. Preserve readiness/connected truthfulness and independently available manual Reconnect.
- **Temporary R2 credentials** may last up to **604800 seconds (seven days)**, but are separate from OAuth and from durable parent credentials. Derive only narrow bucket/prefix/operation-scoped sessions when beneficial; don't put long-lived parent keys inside extension-delivered messages.

## Desktop-to-extension security requirements

- Use documented browser-native messaging with a registered native host; allow-list the exact extension ID and validate all incoming requests. Mutual identity is limited to what the platform supports; don't assume browser messaging alone prevents malicious local programs or a compromised extension.
- **Never hand raw permanent R2 secret access keys to arbitrary web pages or content scripts.** Prefer operation mediation inside the native process. Restrict extension calls through an allowlisted action schema with exact target accounts/buckets and user-granted capabilities.
- Protect against arbitrary file-system reads, shell-command injection, bucket escape, untrusted file paths, SSRF via source URLs, overbroad provider permissions, replay and confused-deputy behaviors. No generic network proxy that will sign any supplied destination URL.
- Before a sensitive operation (public bucket/domain exposure, destruction, credential replacement or broadened permissions), get explicit informed user confirmation. A mere right-click selection must not elevate scope.
- Encrypt the local vault using OS-protected secrets or application-approved encryption with secure key storage; ensure backup and cross-device sync do not unexpectedly expose secrets. Plaintext export is opt-in and discouraged; prefer password manager and encrypted backups.
- Protect logs/telemetry from access keys, OAuth tokens, credential-generated headers, signed URLs and unneeded personal file names. A **Copy Credential** control is explicitly user-directed with warning that clipboard contents may be exposed to other local processes.
- Provide local **Disconnect**, **Remove Stored Credentials**, **Rotate** and **Revoke at Provider** (only when supported and explicitly authorized). Deleting the local saved copy must not be represented as revocation on Cloudflare.
- Optional native app installation must be signed/notarized appropriately, consistently updated, and clearly explain what permissions it requests. Preserve a pure-extension sign-in path for users unwilling to install desktop software.

## Long-running jobs and session reliability

- Make job status durable across browser restarts; bound retries and concurrency, record verified per-object completion, and resume interrupted multipart uploads when safely supported.
- A '55-minute session' is an example work duration, not a Cloudflare OAuth time limit. Record actual elapsed time and file size benchmarks such as the proposed 100 images in six minutes only when measured.
- If the parent credential remains valid, the desktop broker may create/reissue narrower temporary job credentials as allowed. Recheck provider revocation and per-user scope rather than trusting old cached 'connected' UI.
- Browser-to-native messaging may disconnect or crash. Recover without duplicate side effects or secret exposure. Validate Chrome/Edge Windows first and later macOS/Linux as targeted.

## Research / implementation gates

1. Identify exactly which Click2Cloud operations currently require OAuth/Cloudflare REST and which can use R2's S3-compatible API with user-supplied keys.
2. Audit real reasons for repeated interactive login in the current OAuth flow: provider refresh-token issuance, storage persistence, refresh races, application policy, lost/rotated credentials, bad UI readiness, and non-idempotent retry paths. Never weaken existing scope/consent checks.
3. Prototype a minimal Windows native-message host with one registered extension ID, a vault-backed sample restricted R2 credential, and an explicit **list objects** operation. Confirm no raw secret ever reaches extension code.
4. Test browser close/reopen, host restart/crash, revoked/expired token, missing native host, incorrect extension ID, a denied bucket, and the full seven-day *elapsed* session objective with reproducible evidence or accurate simulated-clock tests.
5. Do not introduce forced OAuth bypass, automatic privileged Worker setup, persistent secret exposure, false 'seven-day token' labels or claims that all Cloudflare management actions work with object-storage keys.
6. Keep this experiment separate from stable Click2Cloud login and context-menu code until end-to-end reliability and safety are demonstrated.

## Cloudflare and browser references

- https://developers.cloudflare.com/r2/api/tokens/
- https://developers.cloudflare.com/r2/api/s3/temporary-credentials/
- https://developers.cloudflare.com/r2/examples/authenticate-r2-temp-credentials/
- https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- Current Click2Cloud OAuth implementation: `src/auth/cloudflare-oauth.mjs`

**Scope boundary:** Documentation of the user's proposed direction. No existing OAuth scopes, provider credentials, premium subscription policies, browser extension installations, native binaries, production code or deployed services are changed by this file.
