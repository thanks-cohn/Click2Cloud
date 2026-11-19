# Depth exact-bucket recovery — implementation evidence

Implemented on `codex/depth-working-first-implementation`, starting at the requested
`dda03fe022424302427dcffc0d1b3ee3a7442131`. No owner Chrome state, credentials,
saved destinations, REDOWN files or live cloud resources were reset or changed.

The established defect was an absent per-bucket plan for Depth B while Narrow A
had a different, working physical bucket. Depth preflight returned before setup;
the old generic resume selected initialization/Default and printed readiness
unconditionally. See `src/modes/depth/native-click.mjs`,
`src/cloudflare/onboarding.mjs` and `extension/app.mjs:resumeWorkerSetup`.

The native path now calls the typed `recoverCloudflareDestination` with the exact
clicked target. Existing valid account/bucket setup approval permits preparation;
otherwise the exact-target Shelf card requests informed approval. The real
provisioner generates/persists the plan and key, deploys the approved Worker/DO,
verifies scoped capabilities and a real readiness object, persists verified proof,
rechecks status and regenerates the selected bucket's canonical native menu.
Default and Simple/Narrow configuration are preserved. Stale code or signing-key
renewal requires explicit authorization; mismatched ownership or prefix scope
cannot be bypassed. Interrupted setup retains Worker/key/operation identity;
pending probes are inspected, including a different prefix in the same bucket.
The clicked source is never retained/replayed: after preparation, a new click
uses the existing common saver. UI readiness requires fresh proof plus exact
current native ACK; preparation never claims the original click saved.

## Executed checks

| Check | Result |
| --- | --- |
| `node --test tests/depth-working-save.test.mjs` | 3 passed |
| Recovery/deployment/UI/current-workings targeted checks | 30 passed |
| `npm run test:focused` | 348 passed, 0 failed |
| `npm test` | 416 passed, 1 pre-existing golden-menu failure, 417 total |
| `npm run build:extension` | Passed; v0.3.19, `dist/click2cloud` |
| Production app in Chromium with synthetic RPC | 4 passed |
| Existing boot browser runner | 9 passed, 2 historical failures reproduced, 1 known Quick assertion failure |

The full-suite failure is `tests/golden-menu.test.mjs`'s reviewed golden drift.
It also fails on isolated clean `dda03fe`; current Simple/Narrow/Depth compiler
output is byte-identical to that clean commit. Golden fixtures were preserved.
The independent boot runner fails at `scripts/test-boot-login-browser.mjs:31`
because it expects `quick:true` and receives `quick:false`; no Simple/Narrow
behavior or assertion was changed to hide it.

Both Windows fixture paths now use `fileURLToPath`. Windows execution itself was
not available. The CURRENT source map and typed diagnostic/reliability registries
are synchronized; historical workings snapshots remain immutable. `app.css`
already matched its committed digest at `dda03fe` and was left unchanged.

## Proof boundary and remaining physical gate

`tests/depth-plan-recovery.test.mjs` starts with A ready and B's registry key
absent. It exercises actual provisioner FormData/module construction, the typed
API, native callbacks, signed transport and real workerd/R2. It verifies B's
persisted digest key, capability and readiness object, current native ACK, then
independently reads `abc` from B root/intermediate/leaf/depth-12 saved objects.
Narrow/Simple A save before and after with unchanged IDs/configuration/plan.
Reconstructed hosts reuse the plan without another deployment/readiness write.
This is **local workerd/R2 evidence, not live Cloudflare R2**. Source/network
fixtures and synthetic browser RPC are explicitly bounded in the tests.

**LIVE PHYSICAL GATE NOT VERIFIED.** Chromium 155 rejected unpacked loading with
`UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR`; no policy was bypassed. The
owner's authenticated Windows Chrome/profile was unavailable. No actual
Cloudflare deployment, owner OAuth grant, native rendered Depth click or live
R2 source-object readback was verified in this run. Restricted-scope expansion
remains blocked rather than silently broadening an existing plan.

Owner-side completion:

1. Check out the pushed commit, run `npm.cmd run build:extension`, and reload the
   existing extension from `dist/click2cloud` without uninstalling or clearing it.
   Confirm build revision via `describeCapabilities` and the existing extension
   ID `ajppphdiamdobknpamcheohmdbdbeoal`.
2. Right-click an eligible public link/image into the formerly failing Depth B
   scope. Retained approval prepares B automatically. If approval/upgrade/renewal
   is required, use the selected-destination authorization card after checking
   the exact account/bucket/folder and disclosed Worker/R2 usage.
3. After preparation/ACK, make a **new** right-click to that same B prefix.
   Inspect Save results for a verified remote receipt. Independently list/GET
   the exact R2 object and compare account, bucket, prefix/key, operation ID,
   byte length, content hash and menu provenance. A green preparation message
   or readiness probe is not evidence of this source save.
4. Repeat permitted root, intermediate and leaf targets, then existing Narrow
   and Simple controls. Restart Chrome and repeat to check retained plan reuse.
   Read-only `checkCloudflareR2({accountId,target})`, `inspectNativeACK`, and
   `inspectRemoteReceipt` provide separate transport/menu/receipt evidence.

The compiled output's `src/build-info.mjs` identifies the exact committed source
revision and digest. The distributed verification report records that final SHA.
