# Delivery sequence: ReDown → Chutey → Native Desktop

**Recorded:** 2026-11-19  
**Authority:** Owner's strategic sequencing decision  
**Status:** Future execution order, not proof of implementation

## Non-negotiable product order

1. **Finish ReDown first.** Establish the reliable flagship/browser extension, with sound destination identity, verified saves, queue/history, portable receipts, and realistic live-browser/provider stress evidence. Avoid unrelated desktop feature work stealing focus.
2. **Finish Chutey second.** Restore and complete Chutey's working experience, cloud drag-and-drop and shared file-handling/transfer behaviors; prove its Worker, cloud permissions, source/destination operations, API contracts, durable state and reliability with actual tests. Preserve Chutey as its own product and brand.
3. **Only then build the new native desktop app.** Reuse the best proven Chutey Worker-side functionality and shared Universal File API/transfer contracts, instead of reinventing a separate uploader, provider abstraction, queue or receipts engine.

## The important architectural distinction

A **Cloudflare Worker is a server-side executable**, not itself a Windows/macOS/Linux desktop application. **Do not copy/paste an entire Worker and assume it will run in a desktop process.** Instead, extract/reuse portable business logic and contracts where runtime-compatible (provider adapters, path/destination logic, manifests, receipt schemas, verification, job commands) and keep environment-specific executors behind adapters:

- **Extension client:** ordinary browser interactions, context menus and supported short transfers; thin client of the canonical API.
- **Chutey service/Worker:** cloud-side operations with server authorization, bounded streaming, persistent cloud jobs and independently verified outcomes.
- **Native desktop:** optional client/agent with local file-system/clipboard/window integration, OS-protected credential vault, native job executor for data available only on the device, and Chutey interaction where the user's product entitlement **and** provider/resource authorization permit it.
- **Durable cloud job controller:** for approved source/destination accounts, server-persisted job records with Cloudflare Workflows/Queues (or another justified durable executor) so remote-to-remote S3 transfers need not depend on an open browser or running desktop app.

The new native app should be a **powerful first-class client of the same API**, not a separate competing backend. Reuse code only after checking Chutey's actual portability, security boundaries and compatibility; share contracts rather than blindly cloning dependencies.

## Native app: Chutey immediately available when permitted

On installation and authorized connection, the desktop app should expose the already-proven Chutey capabilities for eligible users: cloud browsing, drag-and-drop/copy-paste support where compatible, provider file operations, transfer queue and verified receipts. A license/product entitlement is not a substitute for cloud-account permissions: show each distinctly, and do not silently grant access, lift scopes, publish assets, or expose long-lived credentials.

**“Install the native desktop app and your authorized Chutey workflows are already there.”** This is the intended seamless experience, not a current shipped claim.

## Long jobs: choose the right executor

- **Browser-only / extension mode:** keep normal browser interactions minimal; it may require the browser to remain open for some jobs.
- **Native-app mode:** execute local-file and OS-dependent jobs while the desktop application/computer remains running; use persisted checkpoints, retries and protected credentials.
- **Cloud-unattended mode:** submit a durable, narrowly authorized server job (e.g. **copy all objects under R2 prefix X to MEGA S4 prefix Y**); once Cloudflare confirms durable acceptance and holds approved server-side access to both endpoints, the browser and native app can disconnect. Workflows/Queues process bounded transfers/checkpoints; no single Worker invocation keeps limitless in-memory state.
- The third mode **cannot** continue using only a credential held locally on a powered-off desktop or an expired browser login. Make secure server-side delegated credentials explicitly opt-in and revocable. Remote jobs must be designed for provider, network, multipart and service limits, not marketed as unconditional infinite processes.

## Shared proof: WE GOT THE RECEIPTS!

Across ReDown, Chutey and the native application, **one canonical, versioned receipt/evidence contract** should record durable job acceptance, per-object transfers, independent remote verification, resume/retries and aggregate outcomes. Present customer-pleasing summary cards **and** programmatically inspectable JSON/JSONL, with raw/secure-redacted exports. Accepted is not completed, completed is not independently verified, partial is not success.

## Related promoted material

- [Click2Cloud S3 Multi-Cloud Powerhouse](../../marketing/promoted-features/S3_MULTICLOUD_DURABLE_JOBS_2026-11-19.md)
- [Automatic Download-to-Cloud](../../marketing/promoted-features/AUTOMATIC_DOWNLOAD_TO_CLOUD_PRESERVE_DISK_SPACE_2026-11-19.md)
- [WE GOT THE RECEIPTS!](../../marketing/promoted-features/WE_GOT_THE_RECEIPTS_2026-11-19.md)
- [Click2Cloud Live Assets](../../marketing/promoted-features/LIVE_ASSETS_SCREENSHOT_TO_WEBSITE_2026-11-19.md)
- [Experimental Native Credential Broker](../../marketing/promoted-features/experimental/NATIVE_CREDENTIAL_BROKER_2026-11-14.md)

## Release gates for beginning native-desktop construction

- [ ] ReDown's prioritized browser save workflows are stable and independently verified.
- [ ] Chutey's target Worker and file API functionality are shown to work in actual browser/cloud scenarios.
- [ ] Document portable modules vs Worker-only runtime integrations (and OS-only native capabilities).
- [ ] Establish shared API, provider adapter, manifest, queue and receipt schemas.
- [ ] Define safe native-to-Chutey feature authorization, product entitlement and cloud credential lifecycle.
- [ ] Verify minimal native shell talking to canonical API with no forked upload/receipt engines.
- [ ] Only then expand long-running desktop jobs and unattended cloud S3 jobs under tested capability gates.

**Do not reorder the high-level plan merely to chase novel features. Finish ReDown, finish Chutey, then build the native desktop app.**
