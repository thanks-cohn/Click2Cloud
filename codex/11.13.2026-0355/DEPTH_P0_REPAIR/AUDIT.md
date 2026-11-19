# Depth P0 audit — code defects versus reported live incident
Baseline: `2904ff9bb1f28b82986a0f8022d38d970c014d3a`, clean fetched `codex/depth-repair-audit`. Work isolated on `codex/depth-p0-click-save`. Version 0.3.19, extension ajppphdiamdobknpamcheohmdbdbeoal. Original CSS/root clarification retained. Chromium 156.0.8078.79 Linux runs ordinary DOM tests but rejects unpacked extensions. No live Cloudflare authority/test destination available. No OAuth, Worker, binding, destination or cloud mutation performed.

## Boundary audit (stable symbols)
| Boundary | Owner / expected condition | Failure and downstream result | Observability |
| --- | --- | --- | --- |
| Selection / inventory | depth/index.mjs:createConfig/project; depth-inventory.mjs:discoverDepthScope | Hidden excluded; stale/unwritable disabled; setupProvider may make unready rows attention-clickable | Existing omissions and preview |
| Composite | core/menu-spec.mjs:compileMenuSpec | Exact target-derived action IDs and placement-derived item IDs; no projection edits in this run | Existing root-qualified and nested Save here retained |
| Native application | chrome/registrar.mjs:apply/generateChromePlan | remove/create callback failures invalidate complete ACK; descendants blocked | NATIVE_APPLY_INCOMPLETE distinct from Worker status |
| Listener / restart | registrar:handleClick; background:beforeClick/nativeReady | Persisted Depth row can classify the attempt, but cannot grant current ACK; original nativeReady still governs | New Depth-only wrapper records early blocked outcome |
| Authorization | background:getAuthorization/remoteReady | Account membership AND cached exact readiness historically become resolver authorizedTargets; a stale negative becomes SCOPE_UNAUTHORIZED | Confirmed loss of reason at this boundary |
| Fallback | registrar:handleClickBase dispatches providerAction; background dispatch ignores supplied fallback action and calls engine.save by menu ID | Engine may call setupOnly; current READY then returns FRESH_CLICK_REQUIRED without transfer | Confirmed reproducer, zero uploads; not proof of original Windows cause |
| Depth preflight | modes/depth/native-click.mjs:createDepthNativeClick | Fresh account membership and scoped transport.status; non-READY records specific failure, no provisioning | READY refreshes only this exact target's readiness observation; engine still rechecks authority and ACK |
| Worker plan | transport.mjs:cap; deployment.mjs:lookup | Account/bucket digest; no prefix-specific Worker requirement. Five plan failures share setup-required code | New mode-local PLAN_MISSING/NOT_READY/ACCOUNT_MISMATCH/BUCKET_MISMATCH/PROTOCOL_MISMATCH |
| Transfer / completion | engine.mjs:save; transport.mjs:save | Existing scoped grant, transfer, independent readback, completion guards retained | No new transfer implementation or optimistic success |
| Feedback/history | Depth wrapper; current-store:recordRemoteResult; app:remoteHistory | Previously pre-transport outcomes could exist only as lastSave/badge; missing history looked like no response | Separate kind=depth-click, UUID and metadata, no fabricated receipt; notification/badge and open Shelf status |

## Risk candidates resolved or distinguished
4A/4C/4D: confirmed cached-negative readiness → attention → FRESH_CLICK_REQUIRED in callback fixture. Fresh READY preflight now reaches existing exact-target save. Genuine unready paths block with feedback rather than entering the mismatched fallback. Shared provider fallback implementation is unchanged for other modes.
4B: mock root/parent/leaf/removeAll/timeout failures reproduced; no authority bypass or shared ACK redesign. Feedback records failure. This does not establish why the owner's Chrome create call failed.
4E: five rejection predicates classified read-only; prefix change alone does not cause setup-required. READY versus PREPARED remains distinct.
4F: blocked attempts now have durable click records and notifications attempted; missing storage cannot be promised durable. Transfer receipts remain separate.
4G: not a demonstrated bug: complete=false describes unknown descendants beyond selected boundary, while listedDepth >= maxDepth prevents stale classification. Failed pages still throw. No discovery semantics changed.
4H: twenty siblings and a fourteen-level path exercised without caps. Exact existing 384-case menu matrix unchanged. Actual Chrome volume/scroll behavior unobserved; no cap or flattening introduced.

The reported WORKER_SETUP_REQUIRED, NATIVE_APPLY_INCOMPLETE, retained SCOPE_UNAUTHORIZED and current apparent no-op remain separate incidents. No operation/timestamp evidence correlates them. Never attribute the old Images failure to Save here rather than a terminal folder.
