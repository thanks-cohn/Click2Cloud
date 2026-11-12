# Experimental — Tailscale-Linked Remote Computers as Save Destinations and Orchestration Nodes

**Recorded:** 2026-11-12
**Status:** Experimental product idea only; not implemented or deployed.
**Products:** Click2Cloud as minimal functional test baseline; future REDOWN machine-like UX; optional desktop/native companion.

## Founder vision

**What if we could link computers in different physical locations and treat each as a save destination?**

A user browsing the web on Computer A could choose **Save to Home PC**, **Save to Office PC**, **Send to Workshop Machine**, or **Save to Selected Server**. The designated, authorized destination computer would obtain the file itself where technically and legally permitted, write it to the exact user-approved folder, and return verified completion evidence.

This could become a network of privately connected computers, with Click2Cloud dispatching user-authorized tasks between machines. The user's current machine operates as a control panel rather than an automatic store-and-forward staging location.

**First connectivity candidate: Tailscale.** Use the user's existing private Tailscale **tailnet** to discover permitted machines and connect to a small authenticated receiver/agent running on each participating computer. Tailscale provides private network connectivity and access policy; **it does not automatically provide Click2Cloud's file ingestion, agent, folder permissions or orchestrator**. We build those product-specific pieces separately.

## Why Tailscale first

- A tailnet links user-approved devices over a private overlay network across locations. Devices have Tailscale IP addresses and, where enabled, MagicDNS names.
- Start with supported Tailscale desktop clients on the user's authorized PCs/servers. Restrict connectivity with Tailscale grants/access controls; add application-level device enrollment and authentication rather than assuming network membership alone is sufficient.
- The receiver could expose a small API reachable only to approved tailnet peers, potentially using **Tailscale Serve** for an internal HTTPS endpoint where appropriate. **Do not use public Funnel for the initial private prototype.**
- Device discovery should confirm identity and authorization and must not enumerate/assume unrestricted access to other tailnet machines.
- Tailscale is the **initial transport adapter**, not a permanent lock-in; later consider direct LAN, user-managed WireGuard/VPN, or another secure connector behind a common interface.

Reference reading: https://tailscale.com/docs/concepts/tailnet ; https://tailscale.com/docs/how-to/connect-to-devices ; https://tailscale.com/docs/features/tailscale-serve ; https://tailscale.com/docs/manage

## Proposed experience

1. User installs/starts a small, opt-in Click2Cloud/REDOWN receiving agent on a computer they own or are authorized to use.
2. The agent joins an authorized tailnet and advertises a minimal set of approved capabilities: destination alias, available roots, approximate free space, online/offline, file-type/size policies, and optional future workflow capabilities.
3. In Click2Cloud, user explicitly pairs and approves the machine, names it (Home, Workshop, Office), selects allowed destination directory roots, and confirms permission boundaries.
4. While browsing, user chooses **Save directly to [remote device]/[approved folder]** using the existing destination picker. It is treated as a new destination *type*, not as a fake cloud provider.
5. Click2Cloud creates a durable user-initiated save intent with a correlation ID and sends a scoped, authenticated request to the receiver.
6. When authorized and feasible, the **receiver fetches eligible source bytes directly from the source URL to its own storage**. That means the browsing machine need not download and store those bytes. The receiver performs size/type checks, atomic temporary-file write, finalization and verification before issuing a receipt.
7. The sender's History/Shelf displays queued, pending, executing, verified, blocked, or failed states plus destination, timestamps, and safe retry/recovery controls. An acknowledgment is **not** proof of complete file transfer.

### Honesty about 'direct' delivery

- **Web -> destination PC, without local staging on browsing PC** is possible for accessible remote sources if the *destination agent* can fetch the file using its own network/authorization.
- This is **not** possible for every page asset. Browser-only cookies, short-lived signed URLs, CORS/anti-hotlink measures, inaccessible/private authenticated content, expired URLs, DRM, or receiver-side network restrictions can prevent remote fetch. Don't silently forward browser cookies, access tokens or user authentication to the remote agent.
- Where permitted and explicitly accepted, an alternate **browser/PC -> destination PC** encrypted upload may be offered. Label it correctly as a locally relayed transfer, not as true source-to-remote direct fetch.
- A Chrome MV3 extension alone is not a reliable arbitrary persistent peer receiver or a universal network/filesystem bridge. Initial prototype should use a native desktop companion or trusted authorized service with an intentionally narrow local interface.

## Orchestration: a network of machines, not just destinations

With multiple paired devices, experiment with **declarative, approval-scoped workflows**:

- Route eligible saves based on file type, explicit destination selection, device availability, approved folder, geographic location (user-provided label only) or available storage budget.
- Replicate a verified file to a second approved machine for redundancy, while showing independent transfer receipts.
- Run benign preconfigured operations such as checksum verification, thumbnail generation, backup indexing or conversion on participating devices.
- Wait for results before moving to the next step: for example **Device A received verified bytes AND Device B reports enough space -> send second copy**.
- Use typed dependency conditions (e.g., `&&`, `||`, bounded numerical thresholds and deadlines), with signed job receipts, retry policies, cancellation, and explicit partial-failure states. A simple CMD `&&` by itself only tests process exit status, not arbitrary inter-device result conditions.
- Keep automation bounded: no unrestricted command execution, shell access or silent remote code push as an ordinary saved-file feature; any later automation capabilities require their own explicit device-side user authorization and permissions.

## Security, trust, and privacy — essential prerequisites

- **Explicit enrollment** of machines and individual authorized directories. Never assume all tailnet peers or all local disks are fair game.
- Application-level mutual authentication/authorization, scoped short-lived credentials, per-job signatures/nonces, replay protection, cancellation/revocation, audit trail and user-visible job history; do not persist unencrypted keys in extension local storage or exported diagnostics.
- Limit source fetching to ordinary HTTPS URLs and approved content types. Validate DNS/redirect targets and block remote agent access to loopback, link-local, metadata endpoints, internal services and other forbidden destinations to mitigate SSRF. No arbitrary local path supplied by the browsing page.
- Protect the receiver against malicious filenames, path traversal, symlink escapes, disk exhaustion and concurrent writes. Agent has access only to directories the user granted.
- Agent never silently deletes, overwrites or executes incoming files; use collision-safe names, quarantine/scan where appropriate, and explicit opt-in for subsequent processing.
- Restrict who can inspect destination status; avoid leaking local filenames, paths, raw source URLs, tailnet names and machine identities in public diagnostics. RAW logs should be explicitly private and exportable locally.
- Use local encrypted transport via approved Tailscale connectivity but enforce app-level permissions too; a connected tailnet is *not* a substitute for authenticating the request.
- Never auto-pair devices, open public inbound ports, or expose a receiver to the general internet as part of setup.

## Reliability and recovery

- Durable on-disk queue on both controller and receiver; event IDs, bounded in-memory buffers and transparent append failures.
- Idempotent request/transfer IDs and content checksums prevent repeat clicks/retries from generating unwanted duplicate files. Don't count a job as successful until independently verified at destination.
- Recover correctly after remote computer sleeps, loses network, changes identity, runs out of disk, reboots, or loses permissions.
- Support offline queuing but never claim the destination accepted a request it has not seen.
- Keep original user files, settings, provider credentials and existing diagnostics intact.

## Initial Tailscale proof-of-concept (non-destructive)

1. Two user-authorized computers on the same tailnet, with network access restricted to the required service.
2. A minimal authenticated receiver on Computer B, configured to write *only* to one selected test folder.
3. From Computer A, use Click2Cloud's plain test UI to submit one safe, public HTTPS file URL as a save intent; have B attempt the fetch directly.
4. Verify bytes/digest, file location and receipt on B. Confirm A did not stage the actual bytes when direct mode is selected.
5. Test denied enrollment, offline B, expired URL, blocked source, path escape attempt, quota/full disk, duplicate request and interrupted transfer; return truthful failure states.
6. Extend to three computers and one declarative approval-scoped workflow only after the two-device path is reliable.
7. Compare against REDOWN's future richer UI via the same intent and receipt contracts.

## Relationship to other project directions

This is distinct from cloud storage and from REDOWN's Windows native Explorer upload project: **destination devices are computers, not cloud accounts**, and a target device may fetch a web resource itself. It complements the ideas for headless native integration, conditional orchestration and historical diagnostics. Keep this as a separate experimental branch of development; no existing provider APIs, code, accounts or user files should change solely because of this document.

**Ownership rule:** The user controls which computers participate, which folders can receive files, and whether any subsequent multi-machine action is allowed.
