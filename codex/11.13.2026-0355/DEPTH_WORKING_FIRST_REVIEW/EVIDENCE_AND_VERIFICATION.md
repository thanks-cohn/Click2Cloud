# Review evidence and verification

## Scope, baseline and evidence discipline

Fetched `origin/codex/depth-p0-click-save` at **c7e75ce727cc81b78148d9e4c1f0510311dd44b0**. Initial working tree was clean. Created isolated proposal branch **codex/depth-working-first-proposal-review**. The fetched commits after local `6beaccf` changed only bug/proposal/request documentation; application implementation is unchanged from that published repair. Reviewed the entire initial proposal, its later implementation request as context, relevant AGENTS guidance, the live bug record, previous repair audit/evidence and actual code/tests. Current user scope is documents only and overrides older implementation mandates.

No application, test, dependency, configuration, Worker, OAuth or user-data changes were made. No new test files, APIs, diagnostics, services or native/cloud operations were added. The only committed additions are the four Markdown proposal documents in this review directory. The diagnostic code blocks here are read-only synthetic or owner-local instructions, not an implementation shipped in the app.

Three parallel read-only checks independently examined Worker/setup semantics, click/authorization boundaries and evidence/test validity. Their findings were reconciled against source; authorship is not a substitute for the source/probes below.

## Evidence hierarchy

- **Owner live report, retained:** the specific Depth attempt at generation 26 with worker-stage failure; the independent positive Narrow object. See [original proposal §2](../DEPTH_RIGHT_CLICK_WORKING_FIRST_PROPOSAL_FOR_CODEX.md) and [bug record](../../../Issues_and_Bugs/Bugs/P0_DEPTH_NATIVE_MENU_CLICK_NO_SAVE_NO_VISIBLE_RESPONSE_2026-11-13.md). The review does not possess private target/plan data or establish same account/bucket/time/profile.
- **Source facts:** exact behavior at the audited commit, indexed below. A checked branch is not a successful installed save.
- **Fresh local checks:** existing offline tests and two production-module, synthetic-boundary probes, run in this review. They do not contact Cloudflare or mutate owner/browser storage.
- **Prior-run evidence only:** native administrator block, Chromium history/UI pass, full-suite result and earlier callback metrics retained under `DEPTH_P0_REPAIR/EVIDENCE`. No fresh native Chrome or real R2 result is claimed here.
- **Inference/unknown:** historical plan race, target mismatch, lost private state, resource/profile mismatch and any successful future Depth cloud result. Explicitly conditional in the ledger/plan.

## Source index at audited commit

Paths are relative to repository root; line numbers identify the audited snapshot, stable symbols make later rechecking possible.

| Ref | Source / significant facts |
| --- | --- |
| S01 | [native-click.mjs:4–43](../../../src/modes/depth/native-click.mjs#L4): plan reason from later lookup, pending observation write before dispatch, feedback swallowed on exception |
| S02 | [deployment.mjs:33–69](../../../src/cloudflare/deployment.mjs#L33): explicit prepare approval; absent plan makes new name/secret; matching account/bucket digest lookup; pending/rebuild effects |
| S03 | [transport.mjs:7–27](../../../src/cloudflare/transport.mjs#L7): current authority/capability, repeated lookup, prefixScope, protocol/code/verifiedTargets proof and READY/PREPARED |
| S04 | [transport.mjs:28–48](../../../src/cloudflare/transport.mjs#L28): existing saver, upload/poll/recheck/independent verification and partial completion |
| S05 | [wire.mjs:4–11](../../../src/cloudflare/wire.mjs#L4): canonical Cloudflare connection, remote destination representation, keep-both and digest |
| S06 | [background.mjs:40–44](../../../extension/background.mjs#L40): exact local storage namespace, remote transport and shared readiness snapshots |
| S07 | [background.mjs:83–134](../../../extension/background.mjs#L83): Depth bounded/pending inventory, per-prefix readiness work and target projection |
| S08 | [background.mjs:136–165](../../../extension/background.mjs#L136): authorization/readiness conflation, Depth shared-cache refresh, storage-gated feedback, source/dispatch and common transport |
| S09 | [engine.mjs:63–100](../../../src/core/engine.mjs#L63): durable/current ACK and target binding, setup-only fallback, existing remote path and verified result handling |
| S10 | [action-resolver.mjs:11–39](../../../src/core/action-resolver.mjs#L11): native ID/generation/context/action/authority guards; no target lookup by display text |
| S11 | [registrar.mjs:125–219](../../../src/chrome/registrar.mjs#L125): create/ACK failure, original fallback, Depth wrapper and cold metadata classification |
| S12 | [onboarding.mjs:7,28–60](../../../src/cloudflare/onboarding.mjs#L7): exact saved targets, current readiness, Default/account selection and initialization |
| S13 | [onboarding.mjs:85–148](../../../src/cloudflare/onboarding.mjs#L85): exact repair membership, other-account Default guard, rebuild/probe and metadata changes |
| S14 | [onboarding.mjs:151–161](../../../src/cloudflare/onboarding.mjs#L151): attention fallback, setupOnly FRESH_CLICK_REQUIRED, subsequent existing save |
| S15 | [app.mjs:127–129](../../../extension/app.mjs#L127) and [588–590](../../../extension/app.mjs#L588): initializer Resume versus explicit target repair |
| S16 | [depth/index.mjs:5–42](../../../src/modes/depth/index.mjs#L5): root scope/configured limit, target-keyed actual hierarchy and bounded omissions |
| S17 | [depth-inventory.mjs:4–20](../../../src/explorer/depth-inventory.mjs#L4): immediate folder validation, pagination failures and deliberate boundary completeness |
| S18 | [menu-identity.mjs:14–51](../../../src/core/menu-identity.mjs#L14), [menu-spec.mjs:86–168](../../../src/core/menu-spec.mjs#L86): canonical paths, separate scope/target/native identities, collision handling, intentional attention and root label |
| S19 | [current-store.mjs:267–269](../../../src/persistence/current-store.mjs#L267), [app.mjs:601–612](../../../extension/app.mjs#L601): attempt kind/remote history and separate receipt presentation |
| S20 | [depth-p0-click.test.mjs:12–14](../../../tests/depth-p0-click.test.mjs#L12): injected readiness, registry, cache/fallback and verified-return boundaries; helper and cold-worker/storage tests are useful with these limits |
| S21 | [depth-scope-regression.test.mjs:15–44](../../../tests/depth-scope-regression.test.mjs#L15): mixed flag, resolver supplied target and baseline plan hashes; no cloud proof |
| S22 | [logic2real-depth-save.test.mjs:108–145](../../../tests/logic2real-depth-save.test.mjs#L108): actual registrar/engine with in-memory object sink, not R2 arrival |
| S23 | [test-phased-narrow-browser.mjs:19–28](../../../scripts/test-phased-narrow-browser.mjs#L19): obsolete selectors/immediate persisted reads versus [app.mjs:344–374](../../../extension/app.mjs#L344) and [476–498](../../../extension/app.mjs#L476), which stage then Save |
| S24 | [test-depth-click-history.mjs:16–26](../../../scripts/test-depth-click-history.mjs#L16): synthetic IPC/direct seeded click record; real UI/IDB only |

## Fresh existing test executions

Run from `/workspace/Click2Cloud` using existing dependencies; no source/tests installed or modified. Counts below are runner counts, not independent proof categories or exhaustive scenario coverage.

| Command | Fresh result | What it establishes / excludes |
| --- | --- | --- |
| `node --test tests/depth-p0-click.test.mjs tests/depth-scope-regression.test.mjs tests/logic2real-depth-save.test.mjs` | **36/36 pass** | Existing callback/projection/fixture routes. It includes injected READY/verified responses; no production browser or cloud acceptance. |
| `node --test tests/canonical-menu.test.mjs tests/composition-remaining.test.mjs tests/latest-quick-rules.test.mjs tests/destination-ready.test.mjs` | **39/39 pass** | Canonical projection, composition/Quick and scoped status behavior at supplied boundaries. No claim of complete mixed-mode live isolation. |
| `node --test tests/golden-menu.test.mjs` | **1/2 pass, 1 fails**, diff `simple` | Freshly confirms retained golden mismatch. This is a failed check, not an overall pass. No implementation or golden expectation changed. |

The delegated click audit also ran the overlapping click/scope subset (21/21); do not add that to the 36 as independent coverage. The historical full offline **387/388** result is retained in [prior final-full.log](../DEPTH_P0_REPAIR/EVIDENCE/final-full.log), not rerun in this document-only review. The specific historical CI Quick true/false assertion remains UNVERIFIED here. Static script-contract drift is confirmed; it must not be presented as a reproduced protected-mode defect or as the proven cause of that CI report. No full browser acceptance/build/native reinstallation was needed to validate Markdown-only changes.

## Probe P1 — a later PLAN_MISSING need not describe the rejecting read

Executed with production transport/status and the current Depth reason helper; all inputs are synthetic. No secret is supplied and signature/fetch are never reached because the pending plan fails first. No storage writes.

```sh
node --input-type=module - <<'JS'
import {createRemoteTransport} from './src/cloudflare/transport.mjs';
import {workerPlanReason} from './src/modes/depth/native-click.mjs';
import {PROTOCOL} from './src/cloudflare/wire.mjs';
const target={provider:'cloudflare',connectionId:'cloudflare:fixture',accountId:'fixture',bucketName:'fixture-bucket',prefix:'Images/'};
let reads=0;
const plan={state:'ready',accountId:'fixture',bucketName:'fixture-bucket',protocol:PROTOCOL};
const lookup=async()=>++reads===1?plan:reads===2?{...plan,state:'pending'}:null;
const transport=createRemoteTransport({
  oauth:{authority:async()=>({accounts:[{id:'fixture'}]})},lookup,
  fetch:async()=>{throw Error('No remote request expected');}
});
const status=await transport.status(target);
const diagnosticReason=workerPlanReason(await lookup(target),target);
console.log(JSON.stringify({status,diagnosticReason,lookupReads:reads,actualRejectingPlanState:'pending'}));
JS
```

Observed:

```json
{"status":{"state":"blocked","code":"WORKER_SETUP_REQUIRED"},"diagnosticReason":"PLAN_MISSING","lookupReads":3,"actualRejectingPlanState":"pending"}
```

This demonstrates attribution ambiguity under changing state. It does **not** prove such a change occurred in the owner's profile, nor that a stable null lookup is wrong.

## Probe P2 — production registry identity and unsupported connection rejection

Executed production `createProvisioner.lookup` with injected metadata-only reads; request/store callbacks throw if invoked. No cloud request, Worker or secret, and no registry mutation.

```sh
node --input-type=module - <<'JS'
import {createProvisioner} from './src/cloudflare/deployment.mjs';
const keys=[];
const provisioner=createProvisioner({
  request:async()=>{throw Error('No cloud request permitted');},
  readModule:async()=>{throw Error('No module read needed');},
  load:async key=>{keys.push(key);return null;},
  store:async()=>{throw Error('No storage write permitted');}
});
const t={provider:'cloudflare',connectionId:'cloudflare:fixture',accountId:'fixture',bucketName:'fixture-bucket',prefix:''};
for(const prefix of ['', 'Images/', 'Images/Artwork/'])await provisioner.lookup({...t,prefix});
await provisioner.lookup({...t,bucketName:'second-bucket'});
await provisioner.lookup({...t,accountId:'other',connectionId:'cloudflare:other'});
console.log(JSON.stringify({
  sameAccountBucketAcrossThreePrefixes:keys[0]===keys[1]&&keys[1]===keys[2],
  differentBucketDifferentKey:keys[0]!==keys[3],
  differentAccountDifferentKey:keys[0]!==keys[4],reads:keys.length
}));
try{await provisioner.lookup({...t,connectionId:'second-connection'});}
catch(e){console.log(JSON.stringify({secondConnectionSameAccount:e.code}));}
JS
```

Observed:

```json
{"sameAccountBucketAcrossThreePrefixes":true,"differentBucketDifferentKey":true,"differentAccountDifferentKey":true,"reads":5}
{"secondConnectionSameAccount":"DESTINATION_INVALID"}
```

The digest's correctness here does not prove the owner's target selected the same key or that the entry existed at the old click. It establishes the production key function to use in the minimal comparison/test.

## Review validation and decision

- Ledger covers every initial proposal section and all mandatory seed topics, with additional independently supported deficiencies.
- Final plan explains each significant retained/changed/rejected recommendation and its evidence, trade-off and verification gate.
- Diagnostic snippet is proposed owner-local read-only observation, not executed on owner data or a new application facility.
- Final commit path check must show only `codex/11.13.2026-0355/DEPTH_WORKING_FIRST_REVIEW/*.md`; no staged changes elsewhere. Markdown references and code-block syntax are checked before committing.
- **Review deliverable complete; runtime implementation not performed. Depth release remains NOT READY on the available evidence.** No app behavior or real-save fidelity can improve from a document commit.

Second-pass source review caught two additional safety qualifications: store API reads can initialize host ACL/schema machinery on an uninitialized profile, so the final local snippet reads only a pre-existing DB transaction and aborts upgrades; configured-root association must never authorize a root probe outside prefixScope. Operator instructions expect a proper scope block for an unauthorized root. No owner-local snippet was executed in this review.
