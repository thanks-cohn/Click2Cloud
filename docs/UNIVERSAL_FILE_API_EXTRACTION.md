# REDOWN Universal File API extracted into Click2Cloud V3+1

**Source:** `thanks-cohn/REDOWN`, default branch, 2026-11-03.  
**Destination:** `thanks-cohn/Click2Cloud`, `main`, `src/explorer/`.

## Actual source files copied without modifications

| REDOWN path | Click2Cloud path | Original Git blob SHA |
|---|---|---|
| `extension/beta/file-api.mjs` | `src/explorer/file-api.mjs` | `3feb05ad7ce54e9e0a2c502f81b1a13e19852481` |
| `extension/beta/configuration.mjs` | `src/explorer/configuration.mjs` | `cacd58e7e516c82237be2fb13b511695384ebd9c` |
| `extension/beta/r2-adapter.mjs` | `src/explorer/r2-adapter.mjs` | `f40d7c848d8d5d4cc5b45b6d99a9bf86f0ff6727` |

All three destination blob hashes were checked against the source after GitHub commit and are byte-identical. REDOWN source was not edited. `src/explorer/index.mjs` is Click2Cloud's **new** authenticated-host injection entrypoint. `tests/universal-file-api.test.mjs` checks the extracted API's real operation semantics, path normalization, outcome states and injected R2 listing transport, **not** live Cloudflare data.

### What this gives V3+1

The existing `createFileApi(adapter)` is already a coherent operation surface with `run(operation,input,options)`, `batch(...)`, capability inspection, cancellation/progress, preferences, and partial/failed/uncertain outcomes.

The R2 provider adapter actually implements bucket enumeration, paginated object listing, metadata, upload staging/byte verification, Worker-backed copy/move/rename/delete, true-remote `remoteIngest`, previews, download, public URLs and more. **Not all operations have production/live parity.** Keep route-specific size limits and explicitly reported unknown outcomes; neither this extraction nor a green test suite proves larger-file support.

The production origin uses these real dependencies:

```text
REDOWN Beta Explorer UI
  → createFileApi(adapter) + source/destination model
  → createR2Adapter({send, http})
  → REDOWN authenticated Chrome background messages + Cloudflare management API
  → existing per-bucket REDOWN Workers and bound R2 buckets
```

Click2Cloud must retain **the same transport/adapter and operation contracts** so its V3+1 compiler and Portal can reuse them:

```text
Canonical V3+1 MenuSpec (Simple / Narrow / Depth)
        ↓ canonical SaveIntent resolved against authorized profiles
Shared Click2Cloud/Chrome dispatcher
        ↓
Universal File API (list/stat/upload/remoteIngest/copy/move/... )
        ↓
Provider adapter (R2 initially; others only when actually supported)
        ↓
Trusted authenticated host transport
        ↓
Existing real REDOWN Worker service / Cloudflare R2
```

### Critical boundary: Worker service bindings are not the entire Explorer API

`createR2Adapter` in the original source assumes **Chrome extension background message handlers** and the private `RedownCloudflareApi` transport. A Cloudflare Worker build has neither `chrome.runtime` nor the owner's Chrome OAuth session. **A copied source file does not magically create a functional Cloudflare Worker-based API.**

The V3+1 lab already has direct service bindings to all 19 existing REDOWN-protocol Workers. Codex must build an authenticated, narrow lab adapter with owner-approved test scope before exercising live routes. Existing service bindings give a real network path but not the per-bucket private Worker token. The new `redown-redown-404399` Worker has a separate lab-held secret; the other deployed REDOWN Workers have their own different per-Worker secrets. Do not copy their tokens into source, build logs, or browser UI and do not impersonate customer sessions.

The source R2 adapter's `remoteIngest` sends source URL metadata to the REDOWN background/Worker under the historical true-remote design. The latest Click2Cloud privacy contract demands browser-fetched **bytes, filename and minimal destination metadata only** to destination providers. These are **not equivalent architectures**. Codex must explicitly reconcile that contract before shipping: do not silently assume historical `remoteIngest` provides the newer URL-privacy promise. Preserve working REDOWN paths until the new privacy-correct route passes actual integration tests.

### Nonnegotiable next steps

1. Treat this copied API as the authoritative reference and integration seam; **do not implement a second file API** in Click2Cloud.
2. Integrate V3+1 discovery, directory pills, destinations and real Portal file operations by calling `api.run()`; give the menu compiler pure normalized tree snapshots. The compiler must never perform network or write operations.
3. Give each provider adapter explicit capability and auth status, preserving typed `uncertain` and `partial` outcomes.
4. Add authorized live adapter implementations that exercise the *actual* REDOWN Workers through Service Bindings, plus the existing R2 management API where required. Never let an unauthenticated Portal surface or arbitrary URL invoke the storage service bindings.
5. Test existing REDOWN Worker routing, real pagination, retry/429/5xx behavior, true original-byte checks, exact folder identity, cross-Worker read/copy, upload confirmation and safe cleanup **only within approved disposable prefixes**.
6. Preserve REDOWN production untouched and make the migration reversible after installed-Chrome parity.

**Run:** `npm test` and inspect the Click2Cloud Cloudflare Builds status. The currently deployed lab Worker is still a smoke endpoint; source extraction by itself is not an integrated live Explorer API.
