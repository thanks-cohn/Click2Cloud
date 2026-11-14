# Promoted Feature: Creator URL Library — Cloudflare R2 custom-domain URLs at scale

**Recorded:** 2026-11-14 (America/Chicago)  
**Project:** **Click2Cloud**, by Tinker & Co. (this is a Click2Cloud product direction, not a ReDown implementation request)  
**Priority:** **FUNDAMENTAL PRODUCT GOAL / PROMOTED FEATURE** — not merely an experimental enhancement.  
**State:** Owner-defined product and marketing goal; **not** evidence of an implemented, deployed, tested or currently purchasable feature.

## Core owner vision

> “Transferred your domain to Cloudflare? Just type in your domain, and give all objects in your bucket a free URL. Just right-click on them and get URL, voilà! Premium allows them to do this bulk-wise for directories.”
>
> “For creators this is huge: save it all to a bucket, then add a URL, and suddenly export all your URLs in a few clicks!”
>
> “This ease of use justifies our $5 a month alone, along with UNLIMITED FREE REMOTE.”

**The promise:** **Turn saved cloud media into an organized, URL-addressable creator library with only a few clicks.**

Click2Cloud should present the best practical properties of Cloudflare's object-storage ecosystem through a radically simple interface: remote saving, bucket-based asset organization, customer-domain linking, individual object URLs, and convenient *bulk URL generation/export* for whole directory-like collections.

This is a founding product pillar and a prominent marketing feature; it is not hidden as a niche technical tool.

## Hero creator journey

1. **Save media remotely** into an authorized Cloudflare R2 bucket, ideally using existing Click2Cloud right-click capture and destination selection.
2. **Connect a domain** through an accurately guided, authorized Cloudflare R2 custom-domain configuration. Give the user a simple domain entry point, followed by verification and any necessary DNS/zone or domain ownership steps.
3. **Get URL on one object:** right-click a saved object and choose **Get URL → Copy**. Use the *actual* object key and configured public endpoint; do not invent or guess a URL from a filename.
4. **Get URLs in bulk:** select a folder/prefix/directory and choose **Export URLs**. Paginate across every eligible object under the selected prefix, clearly track counts, and provide a downloadable CSV and/or JSON manifest plus a copyable list of URLs.
5. **Reuse everywhere:** creators can use those links in websites, CMSs, portfolios, galleries, product catalogs, apps and publishing workflows, subject to public hosting policies, valid permissions and real resource accessibility.

**Headline UX goal:** *Save it to a bucket. Connect your domain. Export every media URL in a few clicks.*

### Functional product principles

- **Single-object Get URL should be frictionless** wherever a compatible configured endpoint exists. Preserve a read-only URL lookup/copy flow when public hosting is already configured.
- **Bulk export is the premium differentiator.** Support selected directory/prefix and optionally bucket-wide traversal with explicit confirmation and an exact scope preview. Nested objects under the prefix must not be silently omitted.
- **Direct URL vs sharing link:** Distinguish canonical directly fetchable object URL, private authenticated link, and share link. Never promise every provider can give a public direct-media URL. Initial support targets Cloudflare R2; other providers may be added through provider-specific adapters.
- **Domain correctness:** Transferring the registration of a domain to Cloudflare is *not* required for R2 custom domains. What matters is Cloudflare-managed DNS/zone and supported, authorized custom-domain configuration for the R2 bucket. Explain prerequisites; do not market “type any domain and it works” when configuration is pending.
- **Cloudflare reality:** A configured URL isn't independently verified live accessibility. Separate configured, DNS/TLS pending, reachable, blocked and unknown states; optionally verify using authorized bounded checks. Avoid presenting R2's development-oriented r2.dev endpoint as the intended public-production custom domain.
- **Privacy and consent:** Saved objects and buckets remain private by default. Explain clearly that attaching a public bucket custom domain may expose objects at guessable URLs and that anyone with a valid URL can access public objects. Require explicit, appropriately scoped authorization for enabling public access, modifying domain/DNS settings or bulk publishing; mere Get URL or preview must never silently publish an entire bucket.
- **Security and provenance:** Respect exact bucket, account, prefix and encoded keys; prevent path and encoding errors; never disclose private contents, credentials or signed tokens through logs, analytics, clipboard history or exports beyond explicit user actions. Do not assume a CSV export changes bucket permissions.
- **Performance:** Bulk exports require bounded pagination, rate-limit awareness, progress, cancellation, truthful partial results, resumability where justified, and clear per-object failures; avoid freezing File Explorer or interrupting the primary right-click save path.
- **Link lifecycle:** Make future capabilities possible: regenerate/export manifest, remove an object, revoke public access by appropriate provider configuration, map renamed/moved keys to changed URLs, recognize custom-domain changes and distinguish old links from current links.
- **Simple integration:** Build atop Click2Cloud's existing provider API, File Explorer and right-click architecture. One canonical URL owner, not parallel URL engines. Keep crash-proof right-click saving and saved configuration independent of bulk-link work.

## Pricing and packaging — owner proposal

- **Proposed premium price: $5/month.** The owner considers one-click creator library URL export powerful enough to justify this price *by itself*.
- **Proposed additional headline benefit: “UNLIMITED FREE REMOTE.”** Preserve that exact owner marketing concept as a product goal. Before publishing, explicitly decide whether “unlimited free remote” means unlimited transfers **included in the paid plan** or an **unlimited free tier** for everyone, and define which remote-saving operations and providers are covered. Do not advertise a contradictory or unimplemented entitlement.
- Previous discussions considered **$12/year** remote access and **10 introductory remote transfers**. Those were earlier pricing experiments, **not a settled policy**. This $5/month premium creator proposition is an additional or revised direction; it does not silently erase earlier discussions or establish final subscription tiers.
- “Unlimited” requires an operational and economic design, including provider-specific costs, abuse mitigation, fair-use terms where genuinely needed, customer-owned R2 bills, potential egress/request charges and sustainability. Do not claim zero infrastructure cost or that public files always incur no charge. The user may separately owe Cloudflare storage/request/DNS/custom-domain-related charges according to their provider plan.
- **Basic/free path (proposed):** individual Get URL for eligible authorized objects using already-configured publication endpoints.
- **Premium path (proposed):** folder/prefix/bucket bulk URL manifest export and creator-oriented batching, subject to final entitlement design.

## Suggested marketing language (not yet a verified claim)

**Click2Cloud — From bucket to links in a few clicks.**

“Save your media remotely, connect your domain, and export a directory of usable links in minutes.”

“Right-click to get a URL. Upgrade to export entire collections.”

“Built for creators: your assets, your bucket, your domain, your links.”

**Avoid:** “Every file gets a free public URL automatically,” “any domain works by typing it,” “zero hosting fees,” or “unlimited free transfers” until provider capabilities, account permissions and commercial terms genuinely support the exact wording.

## Acceptance criteria for a future implementation project

1. A creator with authorized Cloudflare R2 access can discover/select a bucket, connect a supported custom domain via verified setup, and obtain an object URL with a context-menu action.
2. A selected directory/prefix with many nested objects yields a complete, deterministic manifest across pagination, preserving key-to-URL correspondence, with clear errors and proof of counts.
3. URL rows are correct for edge-case keys (spaces, Unicode, reserved characters, empty path components where supported, and folder prefixes) and the actual R2 root-domain behavior.
4. No implicit public-access mutation occurs while merely listing objects, previewing, right-clicking Get URL, or generating a manifest; explicit publish/enable changes present their scope and require consent.
5. Domain ownership, DNS, TLS readiness and actual URL fetchability are separately reported; an API success alone doesn't imply reachable public content.
6. Large exports are responsive, cancelable and partially recoverable; do not disturb existing saved destinations, permissions, context menu, or remote transfers.
7. Premium entitlement is checked honestly for bulk workflows, with price and unlimited/free-remote semantics agreed before public marketing. No false paywall bypass and no false “unlimited” promises.
8. Verify simulated contract tests separately from installed-browser end-to-end flow, live R2 credentials, real DNS/custom domains and copied-link accessibility. Do not claim tested implementation from this document.

## Explicit boundary

This record **establishes long-term product intent and promotional priority only**. It does not authorize Cloudflare writes, domain transfer, bulk publication, new pricing/billing, extension source edits, customer notifications, deployment or changing the ReDown project.
