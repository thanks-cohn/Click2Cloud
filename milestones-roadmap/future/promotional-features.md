# Future promotional features — Click2Cloud
**Recorded:** 2026-11-16  
**Status:** Future concepts, not verified or shipped capabilities.  
**Parent:** [November 16 roadmap](../11.16.2026.md)

These ideas may become promotional differentiators after isolated implementation, real-Chrome testing, R2 verification, privacy review, and accurate claims approval.

## Product delivery order — owner decision (2026-11-19)
**Finish ReDown → finish Chutey → build the native desktop app.** The optional desktop app should reuse Chutey's proven file handling/Worker API contracts and shared Universal File API where portable, making authorized Chutey functionality available to users with the necessary product and cloud permissions. The Worker remains a cloud runtime, not a binary transplanted directly into a native application.

Detailed sequencing and architecture: [ReDown → Chutey → Native Desktop](REDOWN_CHUTEY_NATIVE_DESKTOP_DEPENDENCY_ORDER_2026-11-19.md).

## Screenshot hotkey → chosen R2 destination and Live Assets
- Configurable screenshot shortcut saving a user-authorized capture directly to a selected bucket/folder.
- Optional rules turn verified cloud screenshots into private asset collections or explicitly published website/gallery feeds; a website needs an actual manifest/event integration.
- Test shortcut collisions, capture permissions, image format, correct destination, privacy, and failure states.
- Promotion: [Live Assets — Screenshot to Website](../../marketing/promoted-features/LIVE_ASSETS_SCREENSHOT_TO_WEBSITE_2026-11-19.md).

## Automatic Download-to-Cloud — preserve disk space
- Major promoted feature: optional rules route **eligible browser download intents** to a selected cloud bucket, avoiding local file staging when the source can be fetched TRUE REMOTE.
- Specify rule order, preview, manual override, permission boundaries, and safe fallback; never silently intercept all browser downloads.
- Never silently override an intentional manual destination or store unnecessary provenance.
- Promotion: [Automatic Download-to-Cloud](../../marketing/promoted-features/AUTOMATIC_DOWNLOAD_TO_CLOUD_PRESERVE_DISK_SPACE_2026-11-19.md).

## Customizable right-click destinations
- Highlight Simple, Narrow and Depth menu configuration, quick destination selection, visibility controls, and destination management once real-world behavior is verified.
- Correct target identity and isolation between menu engines are essential.

## Recoverable right-click menu
- A potential promotional demonstration of restoring configured menu layouts from durable, validated journals, CURRENT state, and snapshots.
- The restored menu must still respect authorization and real Chrome applied-state acknowledgements.
- Do not claim production-ready recovery without installed-browser evidence.

## WE GOT THE RECEIPTS! — customer-friendly, programmatically inspectable proof
- Promote a delightful **human-readable Save Receipt** paired with the same canonical **versioned JSON/JSONL evidence record** for audits, scripts and developer integrations.
- Distinguish **Job Accepted**, **Transferring**, **Stored**, **Independently Verified**, **Partial**, **Failed** and **Unknown**. Include exact destination, per-object evidence, retries and aggregate counts for bulk jobs.
- Separate privacy-redacted exports from explicitly requested raw forensic records; never expose credentials. Do not confuse an acknowledgement or ETag with full integrity proof.
- Promotion: [WE GOT THE RECEIPTS!](../../marketing/promoted-features/WE_GOT_THE_RECEIPTS_2026-11-19.md).

## S3-compatible multi-cloud transfer + durable background jobs
- After ReDown and Chutey are stable, expand Worker-side destination adapters for compatible S3 providers, including MEGA S4 **only after actual server-side write and independent verification**.
- Proposed UX: “Copy all files in R2 /Directory X to MEGA S4 /Directory Y”; confirm scope, authorization and conflict policy, then persist the job and run bounded, resumable tasks in the cloud.
- After durable server acceptance, browser and native app may disconnect **only when Cloudflare itself has valid, explicitly authorized access to both source and destination**. Cloudflare Workflows/Queues/checkpoints, not Worker RAM, retain progress.
- The optional native app handles local-file/OS-dependent or longer client-side jobs and reuses the shared file API/receipt contracts; it is not a prerequisite for server-side unattended transfers.
- Promotion: [S3 Multi-Cloud Powerhouse](../../marketing/promoted-features/S3_MULTICLOUD_DURABLE_JOBS_2026-11-19.md).

## Future demonstration ideas
- Shortcut screenshot into a bucket; route content from different websites or formats to different folders.
- Show a custom right-click hierarchy leading to the correct stored object.
- Show post-restart recovery and a transparent save receipt/diagnostic trail.

## Release gating
- [ ] Working implementation
- [ ] Real-browser verification
- [ ] Exact destination/data verification
- [ ] Authorization and privacy checks
- [ ] Error handling and safe fallbacks
- [ ] Approved truthful promotional wording

The established Click2Cloud sub-milestones remain: 100-save baseline → Bit o' Polish and Remote V1 → 200-save regression → Get URL → verified Chutey drag/drop. These are subordinate to the owner's portfolio-level sequence **ReDown first → Chutey second → native desktop third**. Future promotional documents do not authorize interrupting the release-critical reliability work.
