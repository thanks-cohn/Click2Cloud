# Click2Cloud Promoted Features — Multi-select, Paste, Whole-directory Upload & Scoped R2 Credentials

**Recorded:** 2026-11-14  
**Product:** Click2Cloud, by Tinker & Co.  
**Classification:** Promoted feature directions and technical investigation, **not** assertions of shipped functionality.  
**Related:** [mock-commercial.md](mock-commercial.md) and [Creator URL Library](CREATOR_URL_LIBRARY_BULK_EXPORT_AND_REMOTE_2026-11-14.md)

## Vision

Creators should be able to work with whole collections of files rather than processing one item at a time: select many assets, move the relevant links or files into another program, upload an entire local directory to Cloudflare R2 without flattening its tree, and turn a bucket prefix into a structured list of object URLs.

The UI should also make Cloudflare credential setup manageable. Users should be able to select permissions and scope, securely connect a configuration once, and let long-running authorized jobs finish or resume without repeatedly pasting tokens.

## Feature 1: Multi-select, copy, and paste

- In Click2Cloud File Explorer, support Ctrl+click to toggle individual files, Shift+click for range selection, and platform-conventional Cmd modifiers on macOS. Handle selection across pagination/virtualization without losing the selected set.
- Offer distinct actions, never ambiguously label all of them 'Copy': **Copy URLs**, **Copy Paths/Keys**, **Export Selected URLs (CSV/JSON)**, **Download Selected**, and **Copy as Files to Clipboard** *only where technically supported*.
- **Browser paste:** copying newline-delimited URLs / tabular text is feasible as text; a web application must be capable of consuming that text or an imported manifest. Do not promise pasted links magically upload the media bytes.
- **Native desktop paste:** investigate OS clipboard file-list formats, security boundaries, browser extension permissions and whether a signed desktop helper is necessary. Provide an explicit fallback such as **Download/Export Selected** where native file clipboard integration cannot be guaranteed.
- Make access explicit and avoid silently publishing private objects. The user must choose whether to copy private identifiers, authenticated links, or verified public URLs.
- Market the workflow as **'Select multiple assets. Copy once. Paste where supported.'**, not universal 'Paste files anywhere' until real Windows/macOS/Linux/browser testing validates the claim.

## Feature 2: Upload an entire local directory to Cloudflare R2

- From the browser or supported native companion, choose **Upload Directory → Cloudflare R2**, select an authorized local folder and destination bucket/prefix, inspect the resulting target layout, and explicitly confirm.
- Preserve relative directory paths in R2 object keys. R2 is object storage, not a conventional filesystem: visually reconstructed 'folders' are prefixes, and truly empty directories need a documented convention if preservation is desired.
- Support nested files, Unicode names, duplicates/collisions, very large directories, bounded concurrency, per-object progress, retries, cancellation, checksums or integrity validation where feasible, and recoverable resume.
- Preview counts and total bytes when practical; require clear overwrite/skip/rename conflict policy before uploading.
- Correctly distinguish **local directory upload** from **true remote URL transfer**. Local uploads necessarily send the device's file bytes over the network; the '20 GB saved without touching the laptop' message only applies to supported server-side transfers from remote sources.
- Future cross-cloud directory import may be explored separately rather than silently promised under local-folder upload.
- Market: **'Upload a whole project. Keep its structure.'**

## Feature 3: Guided Cloudflare credential creation, scope and configuration — INVESTIGATION

### Proposed user journey

1. In **Click2Cloud → Cloudflare R2 → Add Configuration**, choose **Create new credentials** (guided) or **Use existing credentials**.
2. The app presents an easy, least-privilege scope selector: **account**, **specific bucket(s)**, and **operations** such as **Object Read Only** or **Object Read & Write**. Show admin permissions only for explicit operations needing them, with a warning that full administrative access is unnecessary for basic object saves.
3. Let the user set a descriptive name and an expiration where the Cloudflare credential type supports it. Offer a 'long-running jobs' preset based on scoped durable parent credentials plus shorter-lived job/session authorization, not unbounded wide-access tokens.
4. For an initial version, guide the user through the official **Cloudflare dashboard's R2 API-token creation page**, where Cloudflare controls generation and one-time presentation of the Access Key ID and Secret Access Key. Provide concise instructions for choosing the requested permissions and bucket scope.
5. For a later integrated version, investigate whether the user can explicitly authorize a Cloudflare API token creation operation. Cloudflare's token creation API supports issuing R2-compatible credentials, but this requires suitable **API Tokens Write** privileges and an intentionally managed credential-creation trust boundary. Never ask users for a global API key or wider token just to save a few clicks; prefer Cloudflare-managed authorization or dashboard handoff unless securely justified.
6. After generation, show **Access Key ID**, masked **Secret Access Key** with deliberate one-time reveal, **Cloudflare account ID**, jurisdiction-specific **S3 endpoint**, **selected bucket(s)**, **permissions**, and **expiration**. Explain that Cloudflare shows the secret once and Click2Cloud cannot recover it after it is lost.
7. Offer **Copy ID**, **Copy Secret**, and **Save Securely to Configuration**, plus a clearly labeled **Export encrypted configuration** option for supported clients. A plaintext config export should be opt-in, strongly warned, and never automatically saved in a public downloads directory. **Do not recommend screenshots for secrets**: screenshots are easily synced, shared, indexed, or exposed. Prefer a password manager or encrypted vault.
8. Verify the credentials using a harmless operation appropriate to their scope (e.g., list objects for a selected permitted bucket), and report separately: **Valid**, **Insufficient Permission**, **Expired/Revoked**, **Wrong Account/Endpoint**, and **Network Error**. Never conflate those conditions.
9. Let users reuse saved configurations for future jobs; show masked metadata, selected scope, expiry status, last verified time and user-controlled rotate/revoke/remove actions. Removing a saved local copy must not be falsely presented as revoking the token in Cloudflare.

### Scoping model and what Cloudflare supports

- **R2 account/user API tokens** can have permissions such as **Object Read Only** and **Object Read & Write**, restricted to specific buckets where supported. Account tokens may remain valid until manually revoked or a configured expiry; they are not automatically immortal.
- **Temporary R2 credentials** are short-lived and bucket-specific; Cloudflare supports restricting them to certain **prefixes/object paths** and permissions, with API TTL up to **7 days**. They cannot exceed the parent token's permissions.
- The product must not confuse **R2 S3 API credentials** (access key ID + secret access key) with **Cloudflare API tokens** for management operations (Bearer tokens). Creating tokens through the API requires suitable user/account permission and is distinct from accessing R2 via S3.
- Individual object permissions, prefix constraints, token expiry, and account/domain management vary by credential type; the UI must only enable scope controls actually enforced by that credential route.
- Sources for engineering verification:
  - https://developers.cloudflare.com/r2/api/tokens/
  - https://developers.cloudflare.com/fundamentals/api/how-to/create-via-api/
  - https://developers.cloudflare.com/r2/api/s3/temporary-credentials/
  - https://developers.cloudflare.com/api/resources/r2/subresources/temporary_credentials/methods/create/

### Security and persistence requirements

- **Never place reusable parent secrets in extension source code, localStorage, analytics, crash reports, URLs, or unencrypted exported files.** A browser extension cannot make a secret completely tamper-proof against the user/device; design around short-lived, limited credentials where possible.
- When true-remote processing uses Tinker & Co. infrastructure, only send secrets through protected channels, keep them in an appropriately encrypted server-side secret store with strict account isolation, and obtain informed consent before storing customer Cloudflare credentials.
- Use short-lived scoped job credentials when appropriate. Do not embed the parent credential in queued-job metadata, debug output or browser-facing API responses.
- Password manager support and secure copy are desirable; auto-expire temporary reveals, hide after navigating away, and avoid any 'copy all secrets' default.
- Never claim that a copied secret can be recovered from Cloudflare later; lost secrets may require rotating the credential.

## Feature 4: Long-running, resumable jobs

- Persist a durable job record with **account ID, authorized bucket, prefix, object inventory / cursor, progress, retry count and intent**, separated from encrypted stored credentials.
- Support idempotent per-object transfer, bounded concurrency, upload resumability where available, checkpoints, cancellation, revoked-credential detection, and non-destructive recovery after browser close or worker restart.
- A long-lived parent token is **not** itself a guarantee of a long-running job. Job orchestration, credentials, and cloud/network failure recovery are separate requirements.
- Where short-lived job credentials expire before a job completes, a trusted scheduler can mint a new scoped session only while parent authorization and the customer's membership remain valid; do not ask the customer to paste a fresh temporary token for every retry.
- If parent credentials have expired or been revoked, stop safely, preserve retriable state, and ask the user to reconnect. Never silently escalate scope.
- Large folder uploads from a local computer cannot keep transferring after that machine goes offline unless the bytes have first been staged by an intentionally authorized service; do not use remote-job language to imply impossible offline local uploads.

## Acceptance criteria before promotion as a shipped feature

1. Ctrl/Shift selection works on actual Windows and macOS browsers, with deterministic behavior for many items and proper keyboard accessibility.
2. Clipboard link copy/paste succeeds in named supported browser tools. Native paste of file bytes is described and advertised only for environments proven to support it.
3. An entire nested folder uploads into an authorized R2 bucket with exact relative structure, complete counts, collision policy, retry/cancel behavior and realistic client/network limitations.
4. A user can securely establish a reusable R2 configuration without re-entering keys for every job, and can select real permission and bucket scopes. Prefix-only controls are advertised only for credential types actually enforcing them.
5. No secret leaks through user-interface telemetry, exported manifests, screenshots encouraged by the app, logs or extension packages. Copy/reveal/download operations are user-initiated and adequately warned.
6. Jobs recover from ordinary restart/network faults and respond correctly to token expiration/revocation and account membership status. No false completion or indefinite 'unlimited' claims.
7. All capabilities are validated with live, consented Cloudflare R2 credentials separately from mock API tests. No product ad is released as a factual demonstration until validated.

**Scope:** Documentation and promotion planning only. Does not authorize changes to deployed code, user accounts, provider credentials, pricing, or cloud configuration.
