# Direct source trace

REDOWN origin: https://github.com/thanks-cohn/REDOWN.git. Pinned working HEAD: `a6c17f8d0be22131d5cc38b060da4f8f3544800f`.
Click2Cloud origin: https://github.com/thanks-cohn/Click2Cloud.git. Existing authorized working branch `work`, HEAD `c859fa43d7faf1d3719b252ec1279379140561e1`, unchanged. Request fetched from `feat/glaciaring-agent-debug`, FETCH_HEAD `59ccbc3e2aef94f1d96b86901b4fe5a20fa98de2`; neither checkout switched/reset/pulled. The current REDOWN checkout contains the complete inspected path; no alternative branch was assumed necessary.

Every REDOWN reference below is to that pinned SHA. Line references describe source, not a live run. No previous extraction/preservation documents were used as evidence for this assignment.

## Call graph and trust boundaries

| Source anchor in extension/background.js | Caller → operation → callee/output | Authority, effects and failures |
|---|---|---|
| :2935 native onClicked | Chrome info/tab → getProfiles, resolveActiveRightClick → saveResolvedRightClick | Native input is not authorization. UI/other-provider dispatch is excluded. |
| :2416 resolveActiveRightClick | saved settings/profiles → RedownRightClickV3.resolve | Existing menu/state resolver owns exact profile/prefix; replaced by host-authorized immutable destination. No resolver code imported. |
| :2971 saveResolvedRightClick; :2993–3016 generic path | info.srcUrl/linkUrl/pageUrl → selectedUrl; resolved profile/owner/prefix → ingestCloudflareAtPrefix → verifyCloudflareReceipt → recordTransfer/notify | Special Hitomi ZIP branch is separate, excluded. Generic branch checks HTTPS for v3 IDs; emits success only after verifier. Failure catches notify/record, but does not fully classify ambiguous writes. |
| :753 selectedUrl, :768 basenameFromUrl | event → media URL before link before page URL; URL pathname → decoded filename | Input extraction retained/adapted without tab, history, page provenance or registration. |
| :2038 ingestCloudflareAtPrefix | account/bucket → preparedProfile; prefix → cleanExplorerPrefix; optional capabilities → authenticated fetch POST | Sends sourceUrl, folder, exactFolder, filename, publicBaseUrl. Checks returned key folder and records byte count. No request deadline here. Replaced with explicit-capability ports and typed receipt. |
| :1643 cleanExplorerPrefix | prefix → validates dot segments/NUL and appends slash | Candidate uses exact prefix without trailing slash; no silent normalization. |
| :1682 preparedProfile → :1659 workerAcceptsProfile | account/bucket → stored profile; authenticated capabilities handshake | workerVersion≥5, safeTransfers/storageBound required. noProvision blocks absent preparation; otherwise can call provisionCloudflareProfile. Candidate requires prepared trusted capability; no repair fallback. |
| :1120 provisionCloudflareProfile, :1155 | embedded WORKER_SOURCE → secret substitution + STORAGE binding metadata → cfFetch Workers script upload/subdomain | This establishes which Worker actually serves extension requests. Entire deployment/provisioning path rejected. Standalone worker/src/index.js is not the extracted extension Worker. |
| :55 embedded WORKER_SOURCE; :396 auth; :441–445 route gate | request bearer → shared secret; authorized POST → JSON body | Original binding authority depends on provisioned per-bucket STORAGE. Candidate authenticate port resolves principal, connection/account/bucket/prefix, expiry, binding and limits; client cannot choose env binding. Public routes and diagnostic wire excluded. |
| :653–670 remote ingest | sourceUrl + exact folder + cleanName → checkedFetch → content length/type → filenameWithInferredExtension → uniqueKey | Candidate only explicit remote-save route. No unrelated management actions. |
| :209 checkedFetch → :57 privateHost | HTTPS source → fetch manual redirects (up to 5) | Original initial credentials rejected, but redirect credential checks differ; private-host checks cover limited ranges. Candidate revalidates credentials/host/port on every hop and requires exact trusted host allowlist. No cookies/referrer forwarded. |
| :149 uniqueKey; :164 putNewDownload | requested key → head probes/suffix → put onlyIf If-None-Match:* | Keep Both is race-safe against overwrite through conditional create; a race can fail, not silently replace. Candidate retains suffix search and conditional put. |
| :692–731 known/unknown source bodies | known length → limiter → FixedLengthStream → putNewDownload; unknown → chunk buffer → Uint8Array → putNewDownload | Actual env.STORAGE.put is awaited. Original MAX_BYTES defaults to 300 MiB; unknown buffers up to that policy. Candidate requires limits, separate buffer cap, exact length enforcement, deadline. No universal platform guarantee claimed. |
| :675–686 original metadata | sourceUrl/publicPath/publicUrl/import attribution → R2 metadata | Provenance inheritance deliberately rejected. Candidate stores only operationId and contentType. |
| :734 response | key/filename/public URLs/bytes/type → extension | Candidate no public URL, only exact destination/key/size/etag/version/operation identity. |
| :2085 verifyCloudflareReceipt → :1699 callBucketWorker → :515 headObject | separate authenticated POST action headObject → STORAGE.head; compare key,size,etag,customMetadata.sourceUrl; recheck chrome.storage OAuth session | Independent of original ingest response but same Worker trust domain. Candidate independent HEAD port compares operation identity, exact destination, size, etag, version. No source metadata or Chrome state. No cryptographic content proof is inferred from ETag. |

The actually invoked transport helper callBucketWorker uses RedownCloudflareApi.boundedFetch (30-second ordinary timeout), authenticated prepared profile and read/write classification; repair behavior exists for ordinary calls, but verification passes allowRepair=false. Candidate requires authenticatedRequest/verifyObject to be read/write specific and never repair.

## Existing tests inspected

`tests/popup-folders.test.mjs:5` extracts message-handler snippets into VM doubles; its verifier dependency is absent in that harness, so it is not evidence of working live saves. Its next test inspects exactFolder/capability behavior with mocked fetch. Neither covers real R2. Candidate tests instead execute the new Worker handler and writer end to end with injected fake infrastructure.

## Read-only future V3+1 seam (pinned Click2Cloud HEAD above)

`extension/background.mjs:58` configures an Explorer save provider; current send/authorization paths explicitly report unconfigured Worker transport. Its registrar dispatch around :65 maps Chrome info to engine.save. `src/core/engine.mjs:40` resolves and authorizes a native save; :78 calls captureSelectedBytes and :80 dispatchSave. `src/core/source-capture.mjs:4` currently stages bytes locally (default 32 MiB). `src/core/save-dispatcher.mjs:11` uploads bytes and independently verifies provider receipts. `src/chrome/registrar.mjs:78` owns native save dispatch. These are existing-runtime observations, not candidate dependencies.

Future integration needs a separately reviewed remote-source dispatch seam after existing source/destination authorization and before local byte capture, mapping the exact existing destination to this module. Do not call this module after local capture and call that TRUE REMOTE. Keep registrar/menu ownership, History/counter and scoped callable API ownership in V3+1. Native and programmatic clients must invoke the same authorized operation. No integration changes were made here.
