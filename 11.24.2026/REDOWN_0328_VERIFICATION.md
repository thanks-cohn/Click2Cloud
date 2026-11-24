# REDOWN 0.3.28 verification

The implementation began at `445d85ccab242d24d6e5cce91fe4627863cfdfd0` on `codex/redown-0328-history-consolidation`. The product commit is `2e23e98`. The package, lockfile, source build information and packaged MV3 manifest report 0.3.28. The manifest's other fields, extension ID, OAuth registrations, Chrome command registrations and packaged Cloudflare Worker digest match the starting build.

## History and Queue

History uses the existing paged, indexed archive and reconciles retained CURRENT and Basic receipts. History cleanup starts Off. Older stored Hide values without an explicit opt-in marker were indistinguishable from the earlier default. Existing explicit deletion policies and storage caps retain their existing safeguards. Clear and capped retention preserve the original receipt stores and prevent excluded records from returning through backfill. The archive settings cover display, metadata, export and independent Basic Image and URL expansion. Supported renames update the archive's exact file reference after the existing file API verifies the result. The original receipt retains its identity and metadata. History and Explorer share the immersive controller.

Queue uses its existing virtualized job window. Completed and cancelled rows default to 15 minutes. Errors default to 60 minutes and have a separate Never remove option. Expiry and dismissal affect only the job projection. An interrupted transport may leave a job with an unresolved remote outcome. If the reply leaves open the possibility of live work, Clear All and retention leave that job visible until receipt inspection resolves its liveness. The display keeps bounded descriptors and reads progress reported by the save engines.

## Provider behavior

| Provider | Cancellation and retry | History actions |
| --- | --- | --- |
| Cloudflare R2 | Before dispatch, cancel aborts locally. After submission it uses the Worker’s existing signed stop route and waits for the outcome. A pre-write interruption, verified write or unconfirmed receipt produces a distinct result. The client offers receipt inspection for uncertainty. Ordinary R2 saves have no safe source replay workflow, so Queue offers no Retry for them. | Verified ordinary saves with an exact key and strong version can download, open and rename through the existing authorized file API. |
| Google Drive | Cancels authorization waiting, source transfer and upload preparation before the final PUT. Once the final PUT begins, the existing independent confirmation flow owns the result. Google’s uncommitted upload session expires on the provider. | Retained previews and bounded live image reads use the existing grant. Queue retry can use a short-lived, exact source and account descriptor. History has no general download or rename adapter for Basic. |
| OneDrive | Cancels authorization waiting, source transfer and nonfinal upload fragments. A cancelled upload session receives a best-effort DELETE. Once the final fragment is sent, confirmation owns the result. | Retained previews and bound, bounded live reads are available. Retry also checks the original drive root. |
| Dropbox | Cancels authorization waiting, source transfer and nonfinal append requests. Uncommitted sessions expire on Dropbox. Once session finish begins, confirmation owns the result. | Retained previews are available. The default grant lacks `files.content.read` for a live preview. Retry also checks the original namespace. |
| Cloudflare screenshots | The capture and direct R2 delivery engine has no general abort boundary. Queue represents that limit. Eligible failures use the original PNG recovery window and compare remote bytes before replay. Check receipt runs readback only and leaves any remaining retry eligibility intact. | Original deterministic capture keys, the receipt inspection links and public URL controls remain tied to the captured output. |

Basic retries use up to four descriptors per provider in trusted Chrome session storage for up to 10 minutes. They retain the original source and binding, require an explicit activation, and create a linked attempt. A changed account or an uncertain final write blocks replay. The retry window can end when Chrome closes, the source expires or newer descriptors replace old ones. Source bytes and upload buffers are released when cancellation can stop them. A committed write is never undone by Queue.

## Evidence

| Command or comparison | Result |
| --- | --- |
| `npm run build:extension` | Passed. The packaged 0.3.28 manifest and Worker digest were checked against the starting commit. |
| `npm run check:api-docs` | Passed for 78 typed methods and three shortcut commands. |
| `npm test` | 821 of 822 passed. The failing non-Narrow/non-Depth menu composition golden-digest fixture also failed on the starting commit. Its expected digests and menu projection remain unchanged. The starting run passed 809 of 811 and also had a stale source map. The updated map passes. |
| `node --test --test-isolation=none tests/{release-0328,basic-intent,queue-history-v2,workings,reliability-ratchet}.test.mjs` | 40 passed. Includes concurrent and stalled cancellation, final-write races, account-bound retry, retention and replay guards. |
| `node --test --test-isolation=none tests/cloudflare-integration.test.mjs` | Seven passed in local Workerd, including a stalled save, the signed stop route, cancellation settlement and absence of a destination object in local R2. OAuth and public source responses were fixtures. |
| `node scripts/test-0328-browser.mjs` | Seven Chromium fixture gates passed. The suite checks Cloudflare layout and setup consent, Basic card feedback and previews, Queue clear, History rename and immersion, metadata, keyboard settings, favorites, and layout across 64 theme, mode and width combinations. |
| `scripts/benchmark-history-v2.mjs` with `C2C_HISTORY_V2_FIXTURE=1` | The 100,000-record run exported 46.8 MiB. CRC, SHA-256 and all ordered identities verified. The slowest sampled deep page read was 59.4 ms, with 100 records in each export batch and about 29.1 MiB peak sampled JavaScript heap. |
| Same benchmark with `C2C_HISTORY_V2_COUNT=200000 C2C_HISTORY_V2_RETENTION=1` | Capped rollover and explicit clearing of 200,000 indexed records passed. Replayed records stayed excluded and a new record remained visible. |
| `C2C_HEADLESS=1 npm run test:shelf:extension` | Blocked by Chromium policy `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`. Installed Chrome, native menu presentation, real OAuth and live-provider save and cancellation were not verified. |

The archive upgrade adds an expiry index and normalizes job projections. It preserves original receipt data and existing archive exclusions. Earlier builds that explicitly open the previous IndexedDB version can reject the upgraded projection database. Keep the browser profile and receipt databases in place when diagnosing or reverting.
