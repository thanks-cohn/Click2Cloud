# Click2Cloud promoted features — File Explorer Get URL and Send to Another Cloud

**Recorded:** November 15, 2026  
**Product:** Click2Cloud, by Tinker & Co.  
**Priority:** KEY PRODUCT / MARKETING PILLARS; user-requested scope for a **future implementation run**, not proof of an implemented or shipped feature.  
**Related:** [Creator URL Library](CREATOR_URL_LIBRARY_BULK_EXPORT_AND_REMOTE_2026-11-14.md), [multi-select and directory uploads](MULTI_SELECT_PASTE_DIRECTORY_UPLOAD_AND_R2_CREDENTIALS_2026-11-14.md), [mock commercials](mock-commercial.md).

## Owner intent, as clarified

Click2Cloud's **internal File Explorer** should offer right-click actions on actual cloud files:

1. **Get URL** — retrieve an existing working public object URL, or invite the user to **Make Public URL…** with explicit authorization and an understandable Cloudflare domain setup.
2. **Send to another cloud…** — transfer the selected file, and eventually selected files/folders, into a separately connected provider, with remote-to-remote operation rather than requiring a manual download then re-upload.

The **Get URL popup should retain a secondary domain-entry/help region even after the selected file has a URL**. Suggested microcopy:

> **Connect your website domain**  
> *Have a domain managed through Cloudflare? Connect a suitable domain or subdomain to this R2 bucket so its files can have addresses under your own domain.*

Use an appropriately labeled `Domain or subdomain` input, e.g. `assets.example.com`, rather than the ambiguous placeholder “input your URL?”. The field stays accessible below the current URL display, allowing a user to connect or switch a domain later.

This is an **Explorer object context menu** distinct from Chrome's native page/image right-click-to-save menu. Never accidentally insert these cloud-management commands into the website right-click menu.

## Feature A: Get URL for a cloud object

### Expected UX

**Case 1: Existing valid URL**
- Right-click actual file → **Get URL**.
- Popup displays the actual configured public URL(s), their endpoint/domain, availability state and **Copy URL** / **Open URL**.
- Below the URL(s), **always** show the optional expandable `Connect your website domain` region and instructional italic copy. A domain being already connected does not remove the option to review/change permitted domain configurations.

**Case 2: No public URL**
- Right-click actual file → **Get URL**.
- State `No public URL configured` without inventing a link.
- Offer **Make Public URL…**, which explains choices and account/domain requirements. Show the same visible custom-domain field below.
- An eligible authorized custom domain is the preferred production path; `r2.dev` is intended for development/test traffic, not production hosting.
- The user must explicitly approve any public-access change after a clear scope preview. Show DNS, zone ownership, activation and accessibility state honestly; a submitted domain is not by itself a functioning public URL.

**Important Cloudflare reality:** Direct public R2 bucket domains can make objects throughout the bucket publicly accessible, not just the one file the user right-clicked. **Never** treat `Make Public URL` as authorization to silently expose a bucket. For individual-object sharing with the rest private, investigate a separately authorized, access-controlled single-file delivery/proxy or time-bound link mechanism; distinguish it from standard direct public R2 custom domains.

### Object URL correctness

- Derive URLs from the verified, configured public endpoint and **actual R2 object key**, with proper percent-encoding; support names with spaces, Unicode and special characters.
- Verify the bucket/domain linkage and public configuration; represent status as active, pending, disabled, inaccessible, unknown or not configured.
- Do not generate or publish public links when the bucket is private. Never enable public access merely from viewing History, clicking a preview, right-clicking, or clicking Get URL before informed confirmation.
- If a custom domain is subsequently connected, previously saved eligible objects can receive newly available URL representations; update the **current URL view** without falsifying historical save-time records.
- Support future **Export URLs** for selected folders/prefixes or buckets (creator URL library), including full pagination, CSV/JSON, progress and accurate counts. Treat premium pricing/entitlements as separate product decisions.
- Keep URL retrieval separate from sharing a private signed URL; never leak signed credentials or private authorization tokens in logs/exports.

## Feature B: Send to Another Cloud (critical promoted feature)

### Expected user experience

In **Click2Cloud File Explorer**, right-click any eligible stored object:

```
example-photo.jpg
  Get URL
  Send to another cloud… >
    Google Drive
    OneDrive
    Dropbox
    [other connected providers as adapters support]
  Copy / Download / existing actions
```

- Show only providers that have real connected, authorized write capability; disconnected providers may be displayed as `Connect account…` with truthful availability.
- Choose target provider, account, folder and **Copy** operation. **Never delete the original by default.** A future Move flow must explicitly describe source deletion and verify destination before offering removal.
- Perform the transfer **from remote source to remote destination** without forcing a manual Downloads-folder round-trip. Depending on APIs and capability, it may be provider-server copy, streamed through an authorized relay, or streamed via browser/native client if a direct service-to-service route is unavailable. Do not call all routes “server-side” or “zero device bandwidth” if bytes pass through the client.
- Preserve original filename and bytes where possible, user-selected target folder, and relevant metadata only when the destination supports it. Report unsupported metadata transformations.
- Verify the saved destination independently and surface a receipt with source and destination identities; history should reflect the operation with its actual status, no fabricated success.
- Support skip/rename/overwrite decisions, non-destructive defaults, conflicts, quotas, provider rate limits, session expiry, cancellation, bounded transfer concurrency, partial completion and resumability.
- Later support multi-select, folder/prefix recursive **Copy to another cloud** preserving relative paths and showing exact projected object count and size. R2 prefixes are virtual folders; do not pretend empty prefixes are physical directories.
- Keep storage credentials scoped, user-authorized and isolated by account. Do not silently configure new provider accounts or widen permissions.

### Distinguish from the existing web page save

**Website Chrome right-click:** Save an online source into a configured cloud destination.  
**Click2Cloud Explorer right-click:** Copy an existing cloud object to another connected cloud, or generate/get its public URL.  
Neither command should destabilize the current native Chrome Simple, Narrow, Depth, Quick Select, Default saving engines.

## Marketing priority and positioning

This is a **primary promoted-feature direction**, not a buried experimental idea. The coherent creator journey is:

**Save from the web → organize in cloud → get a shareable URL on your own domain → send the file to another cloud.**

Suggested concepts (do not market as shipped until verified):
- **“Your files. Your links. Your clouds.”**
- **“Right-click once. Make it linkable—or send it anywhere you connect.”**
- **“Save from the web. Publish with your domain. Copy between clouds.”**

A practical promotional demo can start with a Cloudflare R2 image, get its actual URL using the user's verified domain, then **Send to Google Drive**. Show correct destination, transfer progress and verified receipt, rather than a fake instant copy.

## Implementation/acceptance for the next run

1. Start with existing File Explorer context menu and Cloudflare R2 URL/domain APIs. No new parallel file-explorer controller.
2. `Get URL` uses real R2 object identity and public access state; shows Copy/Open when valid; prompts `Make Public URL…` when not; keeps **domain entry/help below the URL** even when a link already exists.
3. A publish request shows whether the action affects an entire bucket; require explicit consent; never expose live existing QA buckets without owner authorization.
4. `Send to another cloud` requires a connected destination and copies bytes without deleting the original; verify destination and truthful History outcome.
5. Test with image **and non-image** types, nested keys, Unicode keys, cross-provider auth failures, collisions, disabled public domains, private buckets, and partial transfer failures.
6. For bulk URL and bulk cloud-to-cloud transfers, measure pagination, restart, integrity, resumability and long-tail performance; avoid blocking normal native right-click saving.
7. Keep implementation and marketing claims separate: screenshots/tests, real Chrome checks, remote account checks, and independent file verification are separate gates.

**Current state:** Documentation/marketing requirement only. No production/cloud changes, public domain connections, transfer jobs, pricing decisions or new code are authorized by this document.
