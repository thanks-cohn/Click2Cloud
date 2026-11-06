# Windows Chrome live acceptance — repair 0.3.2

**NOT EXECUTED here.** Installed extension is administrator blocked; existing Worker data plane is proxy CONNECT403. App fixtures/local workerd are separate evidence. This run did not deploy/mutate user cloud resources. Actual setup/probe creates billable Worker/DO/R2 resources only after explicit in-product approval. Retained readiness/spool objects are disclosed in setup.

## CMD build and load

Install Node.js 22+ and Git. For a fresh checkout in CMD:

```bat
cd /d "%USERPROFILE%"
git clone https://github.com/thanks-cohn/Click2Cloud.git
cd Click2Cloud
npm ci
npm run build:extension
```

For an existing clean checkout instead: `cd /d "C:\path\to\Click2Cloud"`, `git switch main`, `git pull --ff-only`, `npm ci`, `npm run build:extension`. Preserve local changes; do not reset/clean storage. Open `chrome://extensions`, enable Developer mode, Load unpacked, select `%USERPROFILE%\Click2Cloud\dist\click2cloud` (or your checkout's equivalent). If already installed, rebuild then press Reload on its existing card. Do not load the repository root or `extension` subfolder. Chrome policy must permit unpacked extensions; do not bypass administrator policy.

Confirm extension version0.3.2, ID `ajppphdiamdobknpamcheohmdbdbeoal`, OAuth callback `https://ajppphdiamdobknpamcheohmdbdbeoal.chromiumapp.org/cloudflare`. API `describeCapabilities` exposes build revision/sourceDigest, version3+1.1 and remoteProtocol `click2cloud-remote-2`. Record executing build and Worker codeDigest separately. A source pull alone does not reload Chrome or upgrade a Worker.

## Owner acceptance sequence

1. On a regular website containing an actual downloadable image/link/video/audio, right-click that file. Chrome may group extension entries under Click2Cloud. Confirm Google Drive, Dropbox, OneDrive, Cloudflare R2 are available in that order. Adding/removing the last custom destination, changing Flat/Show or restarting Chrome must preserve provider access. Three non-R2 providers must report unimplemented, with no fake save.
2. Click Cloudflare R2. If disconnected, complete existing first-party OAuth. A fresh click is required after login; the old source is never replayed. Select the exact authorized account if ambiguous. Only an actual NOT_ACTIVATED result offers official activation. Permission/network failures must not be mislabeled inactive.
3. Approve initial setup in Remotes → Cloudflare. Existing lowercase redown is reused; only a genuinely new first setup may create it once. Inspect disclosed Worker/DO/readiness/storage consequences before approving. If already using a chosen account/bucket/folder, preserve it. Never accept a surprise default replacement or recreated deleted bucket. Old Worker plans require the explicit Repair control; ready clicks do not deploy automatically.
4. Verify setup reaches Ready only after Worker-generated readiness bytes are independently read back. Record setup operation, selected target and codeDigest. If response is lost, use `inspectCloudflareSetup` with original key and read-only receipt/probe status; never issue a blind new setup/save operation to resolve uncertainty.
5. For your own chosen folder, use Explorer's Default Location action (or keep the approved initial default). The next fresh native right-click → Cloudflare R2 must start saving directly, with no Dashboard/tab/popup/auth replay. Record native acknowledged generation, remote operation ID, transfer state and duration. A green menu ACK is not file proof.
6. In Save results inspect the exact operation. Require verified receipt key, account/bucket/prefix, size, ETag/version/opID and fresh independent HEAD. Read the actual object through authorized R2 GET, compare SHA-256 with separately obtained original test bytes, and inspect provider metadata: no source/page/referrer URL, cookie or credentials. Store only sanitized receipt/hash evidence, never tokens/signed source URLs.
7. Keep Explorer open on the destination during another save. After canonical receipt verification it must refresh and show correct exact filename/extension/path. Test Refresh and History GO TO/highlight. An unrelated folder must not be navigated automatically. History must survive reload and pages beyond100 entries; old uncertain operations must remain inspectable. Confirm duplicate same operation never dispatches again.
8. Repeat known-length >64 MiB, unknown-length >8 MiB, and active >65-second transfers with your own eligible public HTTPS test sources outside the former two sites. Inspect retained `.click2cloud-transfers` objects/cost for unknown lengths. Do not claim success above R2 conditional single-PUT support or beyond durable active-source lifetime. Direct pinned TCP cannot reach Cloudflare-owned IPs; choose a non-Cloudflare source or record SOURCE_EGRESS_UNAVAILABLE honestly.
9. Download a larger saved object through the independent Download action to a user-selected disk path. Require streamed progress and matching hash; changing remote ETag mid-download must abort instead of combining versions. Preview-only memory limits must not be advertised as download/file limits.
10. Negative tests: localhost/private/metadata/obfuscated literals, mixed DNS answers and private redirects must fail before storage write; no source credentials forwarded. Revocation/disconnect/stale generation/foreign account cannot report success. Concurrent same-name saves must never overwrite: unique conditional keys or explicit CONFLICT. Cancellation/lost response/postwrite persistence failure must remain uncertain until read-only proof, never trigger blind replay. Delete Default Location/selected bucket intentionally: no automatic recreation on next click.

No fixed public test URL guarantees this pathway: public websites may block compute clients, return authentication/HTML pages, use Cloudflare-hosted IPs or change content. Use controlled eligible HTTPS files with known bytes and stable identity for acceptance; distinguish source denial, secure egress failure and R2 failure.

## Programmatic equivalents

Trusted GUI and scoped local-agent callers use the same versioned owner, not an external HTTP debug endpoint. Use `describeCapabilities`/tool schemas and `src/api/service.d.ts` for exact closed parameters. Agents require explicit method/account grants; auth/provisioning requires separate confirmation. Do not paste secrets into console commands.

| Action | API |
| --- | --- |
| OAuth/account readiness | loginBegin/loginStatus/loginCancel, listAccounts, selectCloudflareAccount, checkCloudflareR2 |
| Activation/setup/repair | openCloudflareActivation, approveCloudflareSetup, repairCloudflareDestination, inspectCloudflareSetup |
| Exact destination/default/removal | commitConfigChange: createDestination/makeDefault/clearDefault; listDestinations |
| Menu inspection/ACK/save | previewContextMenu, previewNativeMenu, inspectNativeACK, getEngineHealth, invokeProviderAction, dispatchSave |
| Status/reconciliation/cancel | inspectRemoteHistory, inspectRemoteReceipt (optional explicit target), cancelRemoteOperation |
| Explorer refresh/navigation/download | refreshExplorer, navigateExplorer, openRemoteResult, listFolders, fileMetadata, readFileChunk (ETag continuation) |

Inspect outer API envelope **and nested readiness/transfer state**: completed inspection is not READY; written/202/uncertain is not verified. A HEAD receipt alone is not source-content hash proof. Private Explorer→R2 and local-file→R2 are unavailable; GUI/API must say so and never stage browser bytes as TRUE REMOTE.

## Exact evidence to retain

Build SHA/digest, Chrome version/extension ID, actual menu screenshot and generation, fresh-click operation ID, readiness/setup receipt, selected target, Worker executing codeDigest, final receipt, independent R2 readback byte count/hash, metadata field names, Explorer screenshot/key and negative outcomes. Exclude credentials, signed source queries and account tokens. Until these owner-executed gates pass, status remains PARTIAL / live blocked.
