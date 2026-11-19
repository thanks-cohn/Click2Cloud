# Promoted Feature: Automatic Download-to-Cloud — Keep Your Disk Space

**Recorded:** 2026-11-19 (America/Chicago)  
**Product:** Click2Cloud by Tinker & Co.  
**Priority:** Major future promotional pillar / creator and everyday-user feature  
**Status:** Proposal and marketing direction; **not verified shipped functionality**  
**Existing technical direction:** [Automatic Cloud Routing](../../Project_direction/AUTOMATIC_FILE_TYPE_CLOUD_ROUTING_2026-11-12.md)  
**Companions:** [Creator URL Library](CREATOR_URL_LIBRARY_BULK_EXPORT_AND_REMOTE_2026-11-14.md), [Live Assets](LIVE_ASSETS_SCREENSHOT_TO_WEBSITE_2026-11-19.md), [Cross-provider S3 vision](S3_MULTICLOUD_DURABLE_JOBS_2026-11-19.md)

## Hero proposition

# Download to your cloud. Not your hard drive.

**Keep the files. Keep the space.**

A customer with limited disk space defines rules such as **ZIP → Cloudflare R2 / Archives**, **MP4 → R2 / Video**, or **downloads from a chosen website → a selected bucket**. For eligible remote-fetchable downloads, Click2Cloud recognizes the browser download intent and performs an authorized source-to-cloud save **without staging the file on the user's device**. The upload receives a verified destination receipt and becomes visible in their cloud collection.

This should be a prominent user-facing selling point, **not merely a small automatic file-type setting**.

## The story for an advertisement

A laptop flashes **“Only 500 MB free.”** The creator tries to obtain a large file and expects their computer to run out of space. They enable an approved rule: **Large ZIP files → My Cloud / Archives**. The supported downloadable file is delivered to the chosen R2 bucket; Click2Cloud displays the verified cloud location. The laptop has not absorbed the file. A small caption clarifies that the example uses a source compatible with true remote transfer.

**Closing line:** **“Your files don't have to live on your computer.”**

Alternative lines:
- **“Download to your clouds. Leave your disk alone.”**
- **“Your next download has a better destination.”**
- **“More room on your computer. More files in your cloud.”**

## Main product experience

1. **Opt in** with an Automatic Cloud Routing master switch that is OFF by default.
2. **Create routing rules** based on confirmed MIME type / extension, filename pattern, source website where permitted, file size if known, and user-selected destination. Rules have ordering, previews, conflicts, enable/disable, and overrides.
3. **Pick the routing policy**: Always route eligible downloads, Ask first, or Use normal browser Downloads.
4. **Resolve the exact destination** to an authorized existing provider/account/bucket/prefix; preserve that identity even if defaults change later.
5. **Assess remote feasibility**: public retrievable links can be transferred server-side; cookie-bound, POST-generated, blob: or ephemeral sources may be unsupported.
6. **Deliver through the canonical queue** and existing Worker/provider adapter when supported; verify the object at destination, return a receipt, and preserve the source provenance locally only as necessary for the user's queue/retry history.
7. **Safe fallback** when ineligible: clearly explain why, let the user allow an ordinary local download or approved local-upload mode, and never silently destroy, cancel or lose the original download.

### Illustrative rules

| When | Do |
| --- | --- |
| Downloading an eligible ZIP/7Z/RAR file | Save remotely into `r2://archives/` |
| Downloading an eligible video file | Route to the chosen Video bucket |
| Downloads initiated at a user-approved work site | Ask whether to save to that project's destination |
| Unknown MIME, login-gated source, or unsupported URL | Use safe user-selected fallback; don't claim remote save succeeded |
| No matching rule | Normal browser download |

## Engineering truth that marketing must respect

- The Chrome/Manifest V3 download APIs are detection mechanisms; they do **not** enable universal interception or access to all response bytes. Promise the workflow for **supported downloads** only.
- A fully remote transfer truly avoids staging payload bytes on disk. A browser-mediated local upload, screenshot capture, or local-download fallback **is not TRUE REMOTE**; label it honestly.
- Only suppress/replace a browser download when it is safe, authorized and lossless, with tested recovery from transfer failure. Do not claim the disk-space savings in a case that left a local copy.
- Use the existing source validation, routing configuration, durable queue, per-provider authorization and verification receipts. Do not introduce a parallel save engine or weaken right-click reliability.
- Avoid false success on response acceptance; confirm remote object identity, size, integrity when available, and allowed overwrite semantics.
- Keep source credentials/tokens private. Never log secrets or transfer sensitive browser cookies to a cloud Worker without explicit supported authorization.
- Respect site access restrictions; no security/DRM bypass.

## Relationship to Live Assets

Automatic download routing and screenshots are two input methods feeding the **same cloud collections**. A supported online file can be sent TRUE REMOTE; a screenshot is captured locally and then uploaded. Either can later appear in a collection manifest, URL export or user-approved publishing workflow.

## Proposed release gates

1. Working opt-in detection and normal-download fallback in real Chrome with zero lost downloads in tested scenarios.
2. At least one supported direct-link file type delivered TRUE REMOTE to a specific verified R2 bucket/prefix.
3. Rule editing, priority/conflict resolution and no accidental destination drift across browser restarts.
4. Honest handling of private/blob/POST sources; safe recovery of failures; correct queue/history/receipts.
5. Multiple file types and website-specific rules only after each is independently tested.
6. External marketing shows actual measured behavior and clearly separates proposed from shipped capabilities.
