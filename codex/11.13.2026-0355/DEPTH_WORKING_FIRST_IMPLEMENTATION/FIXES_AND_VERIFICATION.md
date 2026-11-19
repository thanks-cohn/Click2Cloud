# Depth working-first repairs and verification

Baseline: `102ac7777d94b7507aa0b8bb7c37f2337869751f`, fetched from the requested `codex/depth-working-first-implementation` branch; initial tree clean. Implementation remains on that branch. No merge, resource deployment, OAuth change, dependency/lockfile change, user configuration change or menu redesign.

## Production defects repaired

| Files | Before → after | Scope / safety |
| --- | --- | --- |
| `src/modes/depth/native-click.mjs` | **A:** rejected optional pending click-record write prevented run. Both observational writes are now best-effort; failure returns `depthRecordCode` without changing authoritative result. | Only Depth click observations. Required CURRENT, generation, native ACK, source, transport/operation and receipt/history checks remain in existing engine/transport. |
| Same module + `extension/background.mjs` | **B:** lastDepthClick write rejection skipped notification, badge and message. Existing feedback body is moved to `createDepthFeedback`; optional persistence is caught independently. | Same existing channels and messages; no new store/UI/logging service. Pending/partial/uncertain never called saved. Actual notification delivery remains a physical gate. |
| `native-click.mjs`, background Depth wiring, `src/chrome/registrar.mjs`, `src/core/engine.mjs` | **E:** Depth depended on a stale shared negative readiness snapshot and fixed it by mutating the cache used by working modes. Depth now passes fresh authorization through this native invocation only; no shared cache write. Cold/recovering callbacks also retain that function. | Registrar installs it only through the Depth hook. Engine chooses it only for a bound Depth-origin row, otherwise its original getAuthorization runs. Current OAuth/account/status, exact target, native ACK/config/session and signed transport checks remain mandatory. No second upload path. |
| `native-click.mjs` | Follow-up lookup was named PLAN_MISSING as though it were the rejecting read. Its reason now explicitly reads `FOLLOWUP_PLAN_MISSING` (or corresponding FOLLOWUP predicate). | No shared transport change or claim of an atomic snapshot. A genuinely missing plan still blocks, with no invented secret/provisioning. |

Required CURRENT/source/native checks were not weakened. An optional attempt record is distinct from required canonical/remote-operation persistence. Observation failure does not automatically retry dispatch; failed verification does not become success.

## Reproduced before → passing after

Baseline production native-click imported from a preserved Git archive with injected optional history-write rejection: **STORAGE_UNAVAILABLE, zero dispatches**. The exact baseline background feedback callback evaluated with rejected local.set: **zero channels attempted**. See EVIDENCE/before.json.

After: `tests/depth-working-save.test.mjs` uses production `createProvisioner.lookup` and markVerified, canonical menu/registrar and async native-listener callback, engine, signed transport, existing Worker bundled into **real local workerd/Miniflare with local R2 and Durable Objects**. Source HTTPS, OAuth, browser APIs, registry storage and the host authorization callback are explicit boundary fixtures; this is not an installed Chrome/background process or live Cloudflare account.

- Starts with a deployed-plan fixture lacking write proof; actual scoped capability reports PREPARED. A real local Worker readiness probe writes/reads storage, then production markVerified records the proof.
- Simple and Narrow controls save with local independent `bucket.get(...).text() === 'abc'` before and after Depth. No mode implementation changed.
- Root, Images intermediate Save here and Images/Artwork leaf callbacks save via the existing engine/transport with **every optional click-history write failing**. Each actual local R2 receipt key stays under the exact selected prefix and its body independently reads `abc`. Existing keep-both conflicts can suffix the filename; no filename assumption substitutes for checking the receipt key.
- Stale negative shared observations stay byte-identical during Depth saves. Same-target protected-mode calls remain blocked when their original observations are negative, even if a Depth authorization function is supplied to engine.save. With their existing positive observations they still save. No readiness grant is borrowed between modes.
- Stable empty registry, foreign account/bucket/connection, restricted-prefix root, expired authority and changed durable generation fail without unintended object writes. The valid restricted descendant remains READY. Three prefixes use one production account/bucket registry key.
- Required CURRENT read failure produces STORAGE_UNAVAILABLE and **zero additional object writes**, despite optional history already failing.
- Forced independent verification failure leaves an actual local object but **does not return verified**. No automatic replay or fabricated receipt.
- Changing ready→pending→missing lookup produces setup-required with explicitly FOLLOWUP diagnostic attribution, not a false claim about the earlier rejecting snapshot.
- Production `createDepthFeedback` with local.set rejection still attempts notification, badge and runtime message; an uncertain result says “not confirmed”.

The prior small callback test's storage-error expectation was corrected from “do not run” to a successful safe dispatch; it no longer encodes the optional logging bug as desired behavior. Existing 5/20-sibling, beyond-ten-depth and 384-case projection/identity tests remain in the regressions. These fixture counts do not certify actual Chrome scroll rendering or owner R2 arrival.

## Checks executed

| Check | Baseline | Final |
| --- | --- | --- |
| `npm run test:focused` | 319/319 | 319/319 |
| `npm test` | 387/388; Simple golden mismatch | 390/391; same Simple golden mismatch |
| `node --test tests/depth-working-save.test.mjs` | new tests; A/B baseline reproductions above | 3/3, including local workerd/independent local R2 checks |
| Depth click/scope/shape, native registrar and workings checks | retained baseline tests | 54/54 (`regression.log`) |
| `node --test right2cloud-module/tests/module.test.mjs` | unchanged source | 49/49 |
| `npm run build:extension` | pinned existing source/tooling | PASS, same extension ID/version; build.json |
| `node scripts/test-depth-click-history.mjs` | retained earlier result | PASS in real Chromium/IndexedDB with fixture IPC/provider; fresh artifacts copied here and historical tracked evidence restored unchanged |
| `C2C_HEADLESS=1 ... npm run test:shelf:extension` | prior administrator restriction | BLOCKED, runner exit 2: UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR |

Logs retain the runner's underlying outcomes; full-suite exit 1 remains a failed full-suite check, not an overall PASS. The reported separate Quick browser CI assertion was not reproduced or altered; its stale draft/Save script assumptions remain outside these repairs. Required native acceptance was attempted and blocked; UI/IDB fixture testing continues independently. No formatter/expectation rewrite hides a failure.

## Noninterference and existing target setup

No changes to Simple/Narrow mode source, menu compiler/spec/identity, configuration schema, current-store implementation, OAuth, provisioner, Worker, wire protocol or shared upload/verification code. The registrar's original authority/ACK algorithm remains; only an optional internal Depth authorization function is carried through to the guarded engine branch. No `snapshots.set` is executed by the Depth preflight anymore. Mixed local controls verify same-target positive/negative behavior; existing full-suite checks cover additional session/restart/uncertain state cases. The new integration is not an exhaustive concurrent browser/reconnect matrix; physical controls remain below.

A stable missing plan is an exact account/bucket prerequisite, not a reason to silently use Narrow's redown destination. Existing explicit repair requires exact configured membership (Depth stores roots); generic Resume can select Default, and repair can rebuild/probe/update setup state. For a restricted prefix, root may itself be unauthorized. This run does not call or change those setup paths, widen scope, copy a key or invent credentials. Public evidence still does not establish whether the historical Depth target and Narrow control were the same account/bucket/profile/time.

## Single remaining acceptance gate: owner Windows Chrome → real R2

Local production-path repairs are verified; **physical Depth saving is UNVERIFIED, not release-ready**. On the owner's existing authorized profile, build/reload this branch's `dist/click2cloud` **in place** (do not remove the extension/clear data), confirm current complete native ACK, then click a permitted root, intermediate Save here and leaf using one approved disposable source. Match click ID → remote operation → actual receipt key and independently read the correct R2 object/version/size; repeat working Simple/Narrow controls. If that exact bucket genuinely lacks a plan, use only an explicitly authorized exact-target remedy after confirming its scope/effects; never borrow the control bucket or probe an unauthorized root. No automatic retry of uncertain writes.

This is one physical acceptance gate, separate from completed A/B/E source repairs. Historical PLAN_MISSING may still describe a legitimate missing private prerequisite. Chrome policy cannot be bypassed here, and no live Cloudflare test credentials/destination were supplied. No live save or successful physical notification is fabricated.
