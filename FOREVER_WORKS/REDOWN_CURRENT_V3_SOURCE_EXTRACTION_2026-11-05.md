# FOREVER WORKS — REDOWN CURRENT + Right-click V3: Source-Backed Extraction

**Extraction date:** 2026-11-05  
**Reference repository (READ ONLY):** thanks-cohn/REDOWN  
**Reference commit:** 0fe8f7dce301027ad53e1958e037b82652c57088  
**Destination repository:** thanks-cohn/Click2Cloud  
**Status:** Source inspection and implementation handoff, NOT completed transplant, live-browser verification, or approval to edit REDOWN.

## 0. Read this before doing anything

This document separates three categories that MUST NOT be confused:

- **[SOURCE]** directly implemented in the pinned REDOWN source; interface and file paths cited.
- **[OWNER-NEW]** subsequent, authoritative owner requirements that may supersede REDOWN's older behavior, especially a **single Simple marker** and instantaneous mode switching.
- **[TARGET/GAP]** proposals or not-yet-demonstrated Click2Cloud capabilities; DO NOT represent them as already implemented, tested, or production-ready.

**The right-click menu chooses WHERE a file is saved. The provider-specific transport chooses HOW. For Cloudflare R2, the original working REDOWN pathway is TRUE REMOTE. These are separate axes.** Rebuilding the menu must NEVER quietly change the transfer to browser byte-fetch.

No secret values, raw account identifiers, user URLs or personal file contents belong in evidence output, fixtures, or this documentation. Do not publish or change real R2 objects without explicit scoped authorization. REDOWN's proprietary code is a behavioral reference: preserve valid rights and do not release or sublicense it through a newly written spec.

## 1. SOURCE MAP: exact code seam and responsibility

| Reference (permalink to pinned REDOWN) | Responsibility |
| --- | --- |
| [extension/right-click-v3.js](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/right-click-v3.js) | V3 data validation, saved destination ancestry, mode configuration, Simple/Narrow/Level(Depth) projection, inventory discovery, identity, resolve, migration, bounded limits |
| [extension/right-click-current.js](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/right-click-current.js) | CURRENT IndexedDB schema, state/records/journal/pointers/backups, canonical transactions, directory records, partial-scan persistence, generations and acknowledgments |
| [extension/right-click-backup.js](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/right-click-backup.js) | Backup schema validation, encrypted export/import, passphrase key derivation and redaction |
| [extension/background.js](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js) | V3 messages, identity checks, CURRENT commits/mirrors/recovery, discovery, snapshots, native Chrome registration, source URL selection, TRUE REMOTE Worker, verification, History and multicloud dispatch |
| [extension/beta/right-click-v3-ui.js](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/beta/right-click-v3-ui.js) | Sole V3 setup editor, tree UI, mode and bucket selection, keyboard/focus, queued autosave, revision/reconciliation, Apply, Reload |
| [extension/beta/right-click-v3.css](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/beta/right-click-v3.css) | Scoped editor appearance, responsive controls, reduced motion |
| [extension/entry-bootstrap.js](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/entry-bootstrap.js) | Browser-toolbar / worker-lifecycle entry and resilient Shelf/popup launch (preserve boot isolation) |
| [extension/manifest.json](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/manifest.json) | MV3 declared contextMenus/permissions/host wiring |
| [extension/cloudflare-api.js](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/cloudflare-api.js) | Authenticated Cloudflare API access, bounded requests/credential refresh and source-specific read services |
| [docs/beta/EXPLORER.md](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/docs/beta/EXPLORER.md) | Historical production TRUE REMOTE path and Beta Explorer adapter boundary; verification limitations |
| [FOREVER_WORKS/v3/MENU_PRESENTATION_IMPLEMENTATION.md](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/FOREVER_WORKS/v3/MENU_PRESENTATION_IMPLEMENTATION.md) | Historical implementation record: native menu, cached inventory, original presentation contract |
| [final-review/V3_VS_V3PLUS1_SOURCE_AUDIT_2026-11-03.md](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/final-review/V3_VS_V3PLUS1_SOURCE_AUDIT_2026-11-03.md) | Earlier KEEP/ADAPT/REJECT audit; do not treat historical proposals as current source |
| [tests/right-click-v3.test.mjs](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/tests/right-click-v3.test.mjs) | Source tests for V3 validation/projection/UI, transaction/rebuild/dispatch integration (60 named test blocks in pinned file) |
| [tests/right-click-current.test.mjs](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/tests/right-click-current.test.mjs) | CURRENT/indexed graph, journal, backup rollover, crash/ack/invalidation |
| [tests/right-click-backup.test.mjs](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/tests/right-click-backup.test.mjs) | Encrypted backup and safe restore checks |
| [tests/right-click-dispatch.test.mjs](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/tests/right-click-dispatch.test.mjs) | Five native source contexts and chooser intent handling |
| [tests/entry-point-reliability.test.mjs](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/tests/entry-point-reliability.test.mjs) | Native root/management recovery, MV3 wake, registration failure, worker restart |
| [tests/google-drive.test.mjs](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/tests/google-drive.test.mjs), [tests/dropbox.test.mjs](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/tests/dropbox.test.mjs), [tests/onedrive.test.mjs](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/tests/onedrive.test.mjs) | Per-provider adapter and native sibling isolation, fixture-level tests |

**Evidence level:** These files were fetched directly from the repository at the above commit. This extraction is **static/source-level evidence and references tests present in the repository**; it is not a newly executed test suite or an observed, current user's installed Chrome session.

## 2. Canonical V3 destination and mode model [SOURCE]

**Config:** empty() returns version=1, revision=0, destinations=[]. Destination rows contain stable ID, profileId, accountId, bucketName, parentId (nullable), exact prefix, user Menu Label, enabled flag. Optional defaultBucket selects a particular ready redown root. Additional stored independent settings include rightClickV3Presentation, rightClickV3LevelScopes and rightClickActivatedBuckets.

**Validation** ([right-click-v3.js lines 1–33](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/right-click-v3.js#L1-L33)):
- At most 200 destinations; unique restricted IDs, labels 1–60 chars, path prefix <=900 UTF-8 bytes with safe slash segments; prepared profile must match type Cloudflare R2, profile/account/bucket plus Worker URL/token.
- Disabled ancestor => descendants ineligible. Broken parents, repeated IDs, cycles, wrong-account ancestry, invalid prefixes rejected, not silently reparented.
- **Present limitation:** legacy hierarchy validation has a 7-edge parent-chain cap. This is not the requested future flexible depth.
- Saved user label is distinct from provider/account/bucket/folder identity; labels never authorize a destination by themselves.
- Migration gathers eligible V3 and legacy shortcuts/trees into versioned V3 records, preserving a separate recovery list when a parent or legacy item is invalid ([lines 272–300](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/right-click-v3.js#L272-L300)).

**Presentation:** {style:'simple'|'nested', nested:'narrow'|'level', depth:1..10}. Values are validated; switching Simple does not discard previous nested selection/depth. Depth called **Level** in REDOWN source and **Depth** in owner-facing architecture. Mode is independent of actual destination revision and cloud files ([lines 69–96](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/right-click-v3.js#L69-L96)).

**Current source projection** ([lines 192–270](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/right-click-v3.js#L192-L270)):
- Simple: simpleTargets() chooses the ready redown root from explicit defaultBucket / a unique eligible default and also gathers configured extra eligible destinations + activated buckets; simpleProjection() emits the direct **REDOWN → Cloudflare** leaf when no extra options exist. If extras exist, CURRENT SOURCE emits a Cloudflare submenu with labeled extra entries and Home/possible More. **This extra-choices-in-Simple behavior is superseded by the latest owner requirements; it must not be imported into Click2Cloud unquestioningly.**
- Narrow: builds a natural trie from explicitly configured eligible paths and their necessary slash ancestors; applies custom labels to configured nodes; parents with children gain a Save here leaf when actionable; groups per authorized account/bucket. It does not enumerate arbitrary unrelated folders ([lines 34–61](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/right-click-v3.js#L34-L61)).
- Depth/Level: uses explicitly selected participating buckets and discovered local inventory, includes authorized unconfigured folders up to selected depth, uses real folder names, creates Save here leaves for parents. At most 300 projection entries, with incomplete/overflow messaging ([lines 168–190](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/right-click-v3.js#L168-L190)).
- project() branches by selected presentation; resolve() rechecks current projection and actual matching prepared profile/identity rather than trusting labels or an obsolete menu ID.
- Contexts registered for V3: **link, image, video, audio, page**.

**[OWNER-NEW] The final Simple/Narrow/Depth distinction for Click2Cloud, superseding the old Simple extra-options model:**
1. **Simple = one effective user-marked authorized location**; selecting a bucket/folder marks it Simple. Clicking the SINGLE native flat **REDOWN → Cloudflare** leaf TRUE REMOTE saves exactly there. When no explicit mark exists and only default authorized redown root exists, default is redown root. No extra submenu / Home / redown child for Simple. Keep underlying configured paths intact when marker changes; account ambiguity fails closed.
2. **Narrow = manually selected labeled nesting**, with as many configured options as needed; use only explicitly configured routes and their required ancestor paths. Existing saved labels matter here. No arbitrary cloud folder scan.
3. **Depth = automatic indexed hierarchy** to selected depth, may include unconfigured authorized folders; use cached graph and report incomplete state honestly.
4. All modes retain separate settings, one canonical authority, no transfer-engine replacement.

See [current Click2Cloud NEED_TO_DO](../NEED_TO_DO/2026-11-05_INSTANT_SIMPLE_NARROW_DEPTH_SWITCHING.md) for the latest owner clarification and performance defect.

## 3. CURRENT IndexedDB and durable JSON model [SOURCE]

[right-click-current.js](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/right-click-current.js) creates IndexedDB database **redown-right-click-current** version 1, with object stores **state**, **records**, **journal**, **pointers**, **backups**. There is **no source-confirmed literal runtime file named CURRENT.json**.

- readState(): reads state + records, reconstructs inventory nodes for matched namespace/profile identities; invalid identity/generation makes inventory stale/incomplete rather than inventing fresh truth.
- commitPatch(): single read/write transaction across all five stores. Safely filters sensitive fields; writes changed canonical records, scoped journal events, pointer generations, dated backups and state. Failing transaction should roll back graph, pointer, journal and config together.
- Each directory record is keyed by provider/account/bucket/Worker endpoint namespace plus directory prefix. Partial scans append/update observed rows; do not infer deletion of untouched files/folders from partial discovery.
- Period policy supports daily (default), weekly and off, with dated backup creation on rollover. **Off disables dated rollover, not the journal**. Backups are not copies of auth tokens.
- generations() returns desired committed versions; acknowledge() marks matching generations applied after a matching native Chrome receipt, guarding stale acknowledgments.
- dump() produces versioned export with JSONL journal; restore() validates and restores into suitable clean profile, without restoring credentials.
- [right-click-backup.js](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/right-click-backup.js) validates identity/schema, rejects plaintext credentials, encrypts export using PBKDF2-SHA256 (210,000 iterations) + AES-GCM, requires passphrase length >=12 and imposes a 32 MiB bundle cap.
- CURRENT's protection and recovery are distinct from browser storage cache. No untrusted JSON export, stale cache or journal replay may silently restore revoked provider authorization.

**Runtime bridge** ([background.js lines 2214–2258](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js#L2214-L2258)):
- CURRENT IndexedDB owns canonical menu data; chrome.storage.local is a compatibility mirror.
- commitV3Current persists patch to canonical IndexedDB then mirrors to storage.local.
- restoreDurableV3 rehydrates/mirrors from CURRENT and handles migration, without granting cloud credentials.
- **Observed performance problem:** even a presentation-only change traverses ensureV3Only/restoreDurableV3, readState/getAll and commitPatch's broad getAll across stores before background menu registration. These are currently implemented code paths, not measured wall-clock attribution.

**Snapshot** ([background.js lines 2354–2377](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js#L2354-L2377)): chrome.storage.local key **right-click.json** contains schema version, config revision, presentation, authorized bucket/destination identifiers, inventory, desired/applied menu generation. It is a logical JSON object/snapshot, not an authority override for newer CURRENT or a claim that a physical .json file exists.

## 4. Folder inventory, source truth and recoverability [SOURCE]

[Inventory functions lines 93–190](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/right-click-v3.js#L93-L190):
- inventoryKey binds Level bucket scopes revision, depth, prepared profile identity, account/bucket, Worker URL to a cached snapshot.
- Limits observed: depth <=10; native menu entries <=300; discovery of <=500 new folders / <=5,000 known nodes / <=80 pages / <=20 seconds; 5-minute inventory freshness TTL. Bounded per-page 8-second max; paging rejects repeated cursor and unexplained truncation.
- Discovery uses paginated Cloudflare R2 listing by prefix/delimiter, preserves remembered authorized folder nodes from matching prior snapshots, tracks frontier and incomplete results.
- Incomplete, unauthorized, stale, partial or timed-out discoveries are NOT permission to invent destinations or delete known objects. Project authorized remembered paths with an honest incomplete/refresh status where safe; fail closed when required identities cannot be validated.
- Activation of a bucket and opting it into Depth must remain separate conceptual decisions. The current code has coupled cases; do not silently mutate mode configurations when simply activating infrastructure.
- Background refreshV3Inventory runs only in Nested/Level mode and can use the cached right-click.json inventory. Alarm rechecks every five minutes only while Level selected ([background.js lines 2378–2407, 2799–2807](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js#L2378-L2407)).
- Discovery and bucket activation are not required for **mode selector responsiveness** when the local valid graph is already populated.

## 5. Chrome native menu compiler/registrar and click routing [SOURCE]

**Actual menu registration** ([background.js lines 2425–2621](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js#L2425-L2621)):
- ROOT_MENU_ID registers REDOWN. Base Manage destinations… stays accessible even if destination registration fails.
- ensureMenuAccess() update-or-create root and management; do not remove both during normal reconciliation.
- Pure V3 project() produces a parent-first plan; buildMenus() composes that plan with flat sibling provider fragments.
- Validates IDs and parent-before-child hierarchy; associates exact canonical destination for internal plan but passes only presentation fields to native Chrome.
- Native registrar uses contextMenus.update/create/remove, captures runtime.lastError on callback and times out at 5 seconds if Chrome doesn't acknowledge.
- Stores known native IDs. Unchanged JSON plan avoids destructive rewrites; label-only edits use updates. Structural sibling reorder may require controlled remove/re-create because Chrome cannot update sibling order in place; keep root + management.
- applicationKey is a SHA-256 digest over V3 config, mode, scopes, inventory, profiles and other provider revisions. Stored rightClickMenuStatus distinguishes applying/registered/superseded/failed and matching acknowledged generation; stale ACK is not a fresh success.
- Serializes menu rebuilds and coalesces pending requests; installed/started/worker-woken service worker also reconciles rather than waiting for user right-click.
- On failed registration, preserve a recoverable REDOWN root/Manage route and saved settings, not false success.
- Click-time route resolves exact latest committed identity and authorization; invalid/stale IDs do not become a save to a default bucket.

**Handler behavior** ([background.js lines 2934–3060](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js#L2934-L3060)):
- Other-provider menu IDs are dispatched to their own adapters before Cloudflare V3 resolution.
- Setup/Manage IDs navigate to the existing Explorer setup. Overflow More destinations currently opens a chooser tab (a known UX limitation, not desired for ordinary right-click saves).
- Selected URL precedence: media srcUrl, then linkUrl, then pageUrl; page/source context is retained in REDOWN-owned History, not indiscriminately forwarded to other providers.
- One user gesture maps to at most one intended save. V3 target is resolved against committed model at click time; no stale menu snapshots used as authorization.
- Success requires provider-verified result; a visual click/droplet animation acknowledges the attempt and is NOT an upload receipt.

## 6. DEFINING FEATURE: Cloudflare R2 TRUE REMOTE [SOURCE; PRESERVE EXACTLY]

**This section is essential. Do not replace or mislabel TRUE REMOTE as browser fetch+upload.**

### Real sequence
1. Chrome right-click resolves an authorized Cloudflare V3 menu action to **profile/accountId/bucketName/prefix**. For Simple it is the marked/default path; Narrow/Depth only determine how to choose the path.
2. The background identifies the source URL (srcUrl > linkUrl > pageUrl) and validates public HTTPS for ordinary V3 saves.
3. Background calls **ingestCloudflareAtPrefix(profile, sourceUrl, prefix, filename, receipt, noProvision=true)**. It ensures a prepared Worker/profile, checks exact path capabilities as needed, then POSTs only **control metadata + bearer authorization** to the correct bucket Worker, including **sourceUrl, exact folder and filename**. Browser does **NOT** download original file bytes for this path.
4. The **Cloudflare Worker** validates Bearer secret, source URL and redirects (public HTTPS; private hosts and unsafe redirects rejected), makes the **remote HTTP fetch itself**, then streams fetched bytes directly into bound **Cloudflare R2 STORAGE**.
5. Worker chooses Keep Both/collision-resistant key and returns actual key/filename/byte count; if known Content-Length it uses a length-bounded FixedLengthStream and TransformStream. **With unknown Content-Length it buffers chunks to produce a fixed-size R2 body**; do NOT overstate this as constant-memory streaming in every case.
6. Background checks returned key/folder exactly, then **independently HEADs the R2 object**; key, size, ETag and source URL metadata must match. It also checks a live valid Cloudflare login session before marking verified and recording successful History/counter.
7. Failure or uncertain receipt => failure/unverified History, not green success and not an automatic repeat that may duplicate an already written object.

**Pinned source:**
- Worker checkedFetch/SSRF controls: [background.js lines 209–225](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js#L209-L225)
- Embedded Worker ingest and known/unknown-length bodies: [background.js lines 653–729](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js#L653-L729)
- Background POST and receipt verification: [background.js lines 2038–2110](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js#L2038-L2110)
- Click resolution / source selection: [background.js lines 2934–3030](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js#L2934-L3030)
- Preservation description: [docs/beta/EXPLORER.md TRUE REMOTE](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/docs/beta/EXPLORER.md#L39-L49)

### TRUE REMOTE privacy and capability realities
- **Cloudflare Worker DOES receive the source URL** to fetch the file and the current implementation stores sourceUrl inside R2 object customMetadata. This is an intentional distinction from the other providers' **no-provenance byte-only uploads**. Do not falsely claim the Worker never sees a URL.
- Source constraints: public HTTPS; Worker-side network access, redirect/SSRF validation, source availability, Cloudflare runtime limits, R2 quotas and explicit profile MAX_BYTES all apply. Embedded Worker default env.MAX_BYTES falls back to **314,572,800 bytes (300 MiB)**, NOT a guarantee of 5 TB or unlimited capacity.
- If source requires browser-session cookies, a protected file URL or browser-only credentials, TRUE REMOTE may fail. Do not silently send cookies/passwords to Worker or substitute local browser transfer under the same label.
- Private/public asset URLs are independent of successful storage and must not be advertised as public unless provider confirms public access.
- The Click2Cloud V3+1 contract currently describes a different byte-only privacy pathway for Cloudflare; **it is a product-design conflict to resolve explicitly by preserving TRUE REMOTE for the Cloudflare menu and keeping browser-byte flow for Drive/Dropbox/OneDrive.** No implicit rewrite of user-selected transfer strategy.

## 7. Other cloud providers are separate transports [SOURCE]

REDOWN uses **one native provider-level menu framework** but independently dispatched upload contracts:
- **Google Drive:** Flat sibling action, browser obtains source bytes and uploads using scoped Drive API; never divert into Cloudflare V3; folder ID/account identity must be exact. Local tests exist, live OAuth/Chrome proof has previously been reported incomplete.
- **Dropbox:** Flat sibling action, browser byte fetch then Dropbox API streaming/session behavior, exact account/root, bounded retries and verified receipt. No page/source URL in provider upload metadata.
- **OneDrive:** Flat sibling action, browser byte fetch/upload to Microsoft endpoint subject to OAuth/domain/permissions and receipt check; do not route to Cloudflare V3.
- Future additional S3 providers are **siblings**, never subordinate to Cloudflare. Their actual remote-vs-browser transfer capabilities must be independently specified/verified.
- No other provider ever causes Cloudflare mode switches to regenerate its unrelated menu or change its auth state.
- An OAuth 'connected' badge is not a verified upload. The user-facing success animation/counter must depend on authoritative provider receipt, not click feedback or timer.

Source: [background.js provider composition lines 2520–2620](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js#L2520-L2620), [dispatch lines 2934–2959](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js#L2934-L2959), and the provider-specific tests above.

## 8. Setup editor, actions, concurrency, permissions [SOURCE]

[extension/beta/right-click-v3-ui.js](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/beta/right-click-v3-ui.js):
- A single active V3 setup tree in Explorer with separate mode radio controls and Level bucket pickers.
- Add/edit/rename/delete enabled destination rows, inline form + path, per-bucket expansion, parent/child hierarchy, filter/search, manual/explicit folder browse, checkbox inclusion, reorder and undo.
- Keyboard tree roving focus, safe Escape/cancel on inline edits, no stealing focus while typing, controlled expansion and typeahead only when intended.
- Draft edits are validated and saved via background-only privileged handlers; UI is not itself permitted to write cloud objects.
- Autosave is optimistic with revision expected values, queued edits and sessionStorage draft recovery; conflicts in another window halt automatic destructive reconciliation.
- Mode changes are optimistic in the UI, but **currently wait through savePresentation → background CURRENT commit → rebuildMenus → acknowledgement**. Chrome update can therefore make the selector feel slow. This is a SOURCE-WITNESSED dependency chain but **not a measured device-level root cause**.
- 'Save Changes' is a separate Apply that waits on pending saves and verifies current applicationKey matched the native Chrome acknowledgment. The UI distinguishes persisted changes from Chrome-applied state.
- Folder browse uses explicit cfDestinationFolders reads. A future canonical auto-displayed tree can remove unnecessary Browse gating only after correctness/permission validation.

**Privileged message sender scope** ([background.js lines 2172–2211, 2408–2415](https://github.com/thanks-cohn/REDOWN/blob/0fe8f7dce301027ad53e1958e037b82652c57088/extension/background.js#L2172-L2211)): snapshot, presentation, scope, save/apply are limited to expected extension pages; setup edits must originate from Explorer. Keep sender trust checks when ported.

**Bucket activation:** Background owns activated accounts/buckets, provisioning and retries. It can maintain persistent activation job states and Worker health. Activating bucket infrastructure is not automatically the same as authorizing the bucket as a user-facing menu destination. See the existing Click2Cloud activation runbook for explicit work still outstanding.

## 9. Present limitations and migration hazards — do not blindly copy

| Actual REDOWN source limitation | Required Click2Cloud posture |
| --- | --- |
| Old Simple permits extra configured choices/submenu | **Replace with owner's one Simple marker → single Cloudflare leaf; configure multiple choices in Narrow** |
| Menu switch waits for full CURRENT/rebuild ack and storage listener may trigger another rebuild | Optimistic local switch, bounded local projection, serialized native apply without blocking UI; measure each stage and dedupe |
| CURRENT commitPatch uses getAll over five stores even for a small settings patch | Scope writes/reads by changed records when safe; preserve transaction/journal/backups/ack semantics |
| Depth cache key includes depth and has TTL; switching depth may invalidate a previously observed tree | Reuse valid per-node indexed folder graph across depth changes; reproject locally; refresh separately on real freshness/permission change |
| Depth <=10, menu budget 300, discovery <=500 additions / <=80 pages / <=20s | Treat as current limits; adapt to safe larger scopes, Chrome native constraints, lazy/partial completeness; never advertise unlimited without tests |
| Current Simple fallback/Root uses specific ready redown identity and may list activated extra buckets | One explicit effective authorized Simple marker, nonambiguous account selection, no silent extra provider rows |
| Separate chooser tab when native menu overflows | Keep an honest bounded fallback, avoid extra pages in ordinary supported paths; do not fabricate >Chrome max native menus |
| Manual Browse folder gate in existing editor | Prefer cached tree; lazy discovery with transparent status; no focus loss |
| TRUE REMOTE unknown-length sources buffered in Worker | Preserve current correct behavior but measure memory/size and improve separately; don't misrepresent as limitless streaming |
| Cloudflare Worker stores sourceUrl metadata; future byte-only contract conflicts | Preserve TRUE REMOTE as a deliberate transport with honest privacy note; do not apply browser-byte privacy expectation to it |
| All behavior not personally revalidated in installed Windows Chrome | Separate unit/mock/fixture/Cloudflare Build proof from real native gesture + live R2 HEAD + exact downloaded-byte validation |

**Transplant status:** REDOWN V3 is a *reference*, not an excuse to replace it today. Existing Click2Cloud compiler (`src/core/menu-compiler.mjs`) is pure but not yet an end-to-end parity proof; it currently constructs a Cloudflare submenu and normalizes folder data before every mode, both of which require revision. See [CODEX EXTRACTION EXECUTION CONTRACT](./CODEX_REBUILD_FROM_REDOWN_CURRENT_V3_EXTRACTION_2026-11-05.md).

## 10. IF/THEN/OR invariants Codex must carry into Click2Cloud

1. IF exactly one authorized Simple marker exists, THEN REDOWN → Cloudflare is one actionable native leaf that routes to that marked account/bucket/prefix via Cloudflare TRUE REMOTE.
2. IF no marker exists AND a uniquely authorized redown default exists, THEN route flat Cloudflare to that redown root; ELSE no invented default.
3. IF multiple destinations are deliberately configured for selection, THEN expose them through Narrow as labeled natural nesting; no arbitrary inventory.
4. IF Depth selected, THEN project the cached authorized directory graph to chosen depth, including unconfigured folders; ELSE no full Depth traversal for Simple/Narrow.
5. IF mode changes AND cached authority/config is valid, THEN update editor locally immediately, reproject cheaply, and reconcile Chrome asynchronously; ELSE show clear pending/error, never falsely 'Applied'.
6. IF native ID clicked, THEN re-resolve against latest committed exact profile/account/bucket/prefix and current permissions; ELSE reject stale/disconnected IDs without saving elsewhere.
7. IF selected provider is Cloudflare, THEN source URL goes to authorized Worker and Worker fetches/uploads to R2; browser must not stage original bytes; verify by R2 HEAD+receipt before success.
8. IF selected provider is Google/Dropbox/OneDrive, THEN use the corresponding browser-byte provider adapter with no original source provenance disclosed to that provider; verify provider receipt before success.
9. IF directory listing is partial, stale, or fails, THEN keep verified authorized previous nodes and report incomplete state; NEVER infer deletion or mint nonexistent paths.
10. IF CURRENT transaction fails, THEN config/journal/pointer/backup must roll back together; IF new native menu registration fails, THEN saved CURRENT persists and REDOWN root/Manage remains accessible.
11. IF source URL cannot be fetched safely by Worker, THEN fail with accurate cause; do not call it success and do not automatically convert TRUE REMOTE to browser byte upload.
12. IF user toggles only presentation, THEN do not change source files, provider credentials, bucket activation, previously configured other modes, saved cloud objects, or default transport.

## 11. Source-bound acceptance / proof requirements

Run relevant pinned tests in Click2Cloud's compatible harness and add equivalent port-specific coverage: pure projections; Simple marker; Narrow/Depth distinction; deterministic IDs; cross-account same labels; CURRENT crash/journal/ack; stale account and revoked auth; source context precedence; Chrome create/update/remove callbacks + startup/restoration; profile activation/refresh separation; true remote Worker fetch and verified R2 object; other-provider flat siblings; side-effect-free mode switching; real Chrome right-click gesture where possible.

**Required proof ladder**: static code extraction ≠ prior fixture tests ≠ current fresh unit tests ≠ actual Chrome native callback ≠ Worker live upload ≠ provider-confirmed object/byte integrity. State exactly which rung was reached.

**Use next:** [Codex-ready staged porting contract](./CODEX_REBUILD_FROM_REDOWN_CURRENT_V3_EXTRACTION_2026-11-05.md), then current [Click2Cloud V3+1 runbook](../docs/CODEX_AUTONOMOUS_V3P1_RUNBOOK.md) and [owner mode note](../NEED_TO_DO/2026-11-05_INSTANT_SIMPLE_NARROW_DEPTH_SWITCHING.md). Where historical target docs disagree, resolve against this dated owner update and actual source before implementing; do not silently mutate REDOWN.

**END — source extraction, not shipped implementation.**
