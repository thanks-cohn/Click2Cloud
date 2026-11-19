# WORKER_SETUP_REQUIRED — audited and investigated read-only

**Yes: this issue was investigated, not merely copied into a TODO.** No production transport, provisioning, OAuth, Worker bindings, account selection, saved destinations or cloud resources were changed. The live P1 remains **OPEN / BLOCKING**; its physical cause is **UNKNOWN**. The user has no additional incident details or diagnostic artifact to supply.

## Evidence and limits

The authoritative report is [P1 incident](../../Issues_and_Bugs/Bugs/P1_DEPTH_DESTINATION_WORKER_SETUP_REQUIRED_2026-11-13.md): build 0.3.19 / `bd8da5e`; Simple and Narrow objects arrived; a Depth save near Images failed with `REPAIR_REQUIRED` / `WORKER_SETUP_REQUIRED`. The clicked row is unknown. It could be a nested Save here or a terminal folder. Neither is assigned as the culprit.

The baseline for this investigation is `a11dcf55b293a10cb8270084fee084db098221ec`, which retains the reported transport mechanism. This investigation has no original operation ID/timestamp, canonical target, stored plan, owner browser profile, or R2 readback. No new live reproduction occurred. Chromium's administrator policy rejects unpacked extension loading. No Cloudflare binding or authorized test destination is supplied; no attempt to repair/provision/write was made.

## Traced path and error provenance

1. `src/modes/depth/index.mjs:project` derives root, intermediate branch Save here and terminal leaf targets from the exact selected scope and inventory. The label is not used for account/bucket/prefix resolution.
2. `src/core/menu-spec.mjs:compileMenuSpec` composes placement IDs, target-derived action IDs and route provenance. The only change here clarifies a sole flattened root's displayed bucket label; its ID and target stay identical.
3. `src/chrome/registrar.mjs:handleClick` reads the applied generation and menu item ID, runs `beforeClick` and fresh target authorization, then resolves the action. `extension/background.mjs:beforeClick` calls `nativeReady` and compares prior/current action IDs. `resolveMenuAction` rejects missing/stale/disabled/unbound/unauthorized rows.
4. `extension/background.mjs:getAuthorization` uses `remoteReady(target)`, cached for ten seconds by **full target key**. `remoteReady` calls `remote.status(target)`; a false readiness can lead the existing attention path to `cloudflare.invoke`, not a successful save.
5. `src/core/engine.mjs:save` rechecks durable/current/native generations and exact authorized target, then sends that resolved target to the existing remote transport. It does not select a Worker based on mode name or the words Save here.
6. `src/cloudflare/deployment.mjs:lookup` normalizes `remoteDestination(target)` then loads `digest([accountId,bucketName])`. Root and all prefixes of one account/bucket address **the same plan**. Different buckets/accounts must not borrow a working plan.
7. `src/cloudflare/transport.mjs:cap` checks OAuth account membership first. It then rejects a plan if **missing, state != ready, account mismatch, bucket mismatch, or protocol mismatch**, using the same `WORKER_SETUP_REQUIRED` code. Current code loses which of those five checks failed. No field-specific production diagnostic was added because that shared change is outside the demonstrated Depth cause.
8. Subsequent checks are distinct: code digest mismatch uses `WORKER_UPGRADE_APPROVAL_REQUIRED`; prefix scope escape uses `WORKER_DESTINATION_SCOPE_REQUIRED`; invalid Worker URL uses `WORKER_ADDRESS_INVALID`; missing account authority uses `SCOPE_UNAUTHORIZED`. A different prefix alone cannot explain the specific setup-required branch when the account/bucket/plan are truly identical.
9. `src/cloudflare/onboarding.mjs:checkFresh` calls `transport.status(target)` for the requested destination and returns `REPAIR_REQUIRED` unless READY. `invoke` opens the existing attention surface with the Worker code. `extension/app.mjs:names` renders “Prepare Cloudflare in Remotes before saving.” This message does not prove global Cloudflare setup is absent; one bucket's plan can fail while another works.
10. A successful remote save requires scoped capability, transfer, independent verification, and truthful completion/history. A failure does not establish that a particular R2 object was written. Opening Save Results is observational UI; no causal evidence links it to this failure.

## Executed controls

`tests/depth-scope-regression.test.mjs` uses the production transport with synthetic OAuth, a synthetic signed plan and an injected response boundary. No remote host is contacted.

| Control | Observed result | What it establishes |
| --- | --- | --- |
| Same account/bucket, root prefix | READY | Valid plan works for root in fixture |
| Same account/bucket, Images/ | READY | Intermediate folder prefix reuses same plan with current scoped capability |
| Same account/bucket, Images/same/ | READY | Terminal leaf prefix does not independently demand provisioning |
| Missing plan | WORKER_SETUP_REQUIRED | Missing bucket preparation fails closed |
| Plan bucket mismatch | WORKER_SETUP_REQUIRED | No cross-bucket borrowing |
| Plan account mismatch | WORKER_SETUP_REQUIRED | No cross-account borrowing |
| Pending plan | WORKER_SETUP_REQUIRED | Unfinished deployment is not ready |
| Wrong protocol | WORKER_SETUP_REQUIRED | Unsupported transport is not ready |

The generated matrix also compares **888 exact save target/action/item identities** across 384 scenarios, including branches and leaves, same-named folders and distinct accounts/buckets. The existing registrar→engine routing fixture exercises ten distinct object keys in an in-memory sink. These are **not real Chrome clicks or real R2 writes**.

## Correlation decisions

- `SCOPE_UNAUTHORIZED` in the separately described pasted diagnostic is **not proven to be this attempt**. It is a resolver/authority observation, whereas setup-required describes Worker plan readiness. Retain separate incidents until operation/timestamp correlation exists.
- `NATIVE_APPLY_INCOMPLETE` originates from failed Chrome create acknowledgments in `registrar.apply`. It does **not** identify a missing Worker plan. Both could coexist, but neither proves the other caused this save failure.
- Successful Simple/Narrow controls are useful only after comparing their exact account and bucket. If they share those with the failed Depth target, inspect stored plan identity, worker epoch and generation timing. If they differ, one working bucket is not evidence another is prepared.

## Narrow next reproduction, when an authorized operator can run it

Use an existing safe test destination, without changing the owner's unrelated configuration. Record one native clicked `menuItemId`, parent/role, full canonical target (account alias permitted), desired/applied generation, build source digest, operation IDs and timestamps. Inspect only plan presence/state/account/bucket/protocol/code digest metadata, never its secret. Compare root, intermediate Save here and terminal leaf in the same bucket, then a different bucket. Retain failure provenance and verify actual object key/readback for each successful click. Do not deploy, reset OAuth, switch buckets or broaden authority as a diagnostic shortcut.

**Resolution gate:** demonstrate the offending action and exact failed comparison, make only a proven Depth-specific repair if needed, and repeat native Chrome → R2 target/readback. Until then, this is investigated but **not fixed**, and the merge recommendation remains **NOT READY**.
