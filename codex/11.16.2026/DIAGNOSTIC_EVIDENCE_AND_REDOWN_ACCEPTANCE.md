# Evidence, hypotheses and REDOWN benchmark — November 16, 2026

**For Codex Issue #16.** Read alongside [the full investigation brief](CODEX_P1_SIMPLE_DESTINATION_REDOWN_CROSS_REPO_PHASE1.md). This is a **sanitized evidence summary**, not a replacement for the original RAW archive or installed-Chrome test.

## A. The owner-observed contract: REDOWN reliability

The owner states that REDOWN has handled **1,000+ real right-click downloads**, including many Cloudflare logout/login cycles, with normal saves continuing to work. Treat this as credible operational *user testimony* and a priority behavioral benchmark, not as an instrumented measurement of 1,000 independent receipts.

The requested Click2Cloud behavior is:

1. After normal authorized login, a known, previously prepared destination should be usable without repetitive setup.
2. After creating another Simple destination, that target should either be ready or visibly offer the exact, minimal preparation action; **never appear silently broken**.
3. Changing Default or hiding/removing other choices must preserve the exact selected destination.
4. After logout, login, reconnect or Chrome MV3 worker restart: saved locations, one-time setup consent, Default and native menu identities remain durable. Only genuine provider reauthorization should interrupt a save; the user gets a fast resume path.
5. A successful save means **verified remote R2 bytes at the requested account/bucket/prefix**, not a green toast after click or menu ACK.

The REDOWN reference repository is `thanks-cohn/REDOWN` and is **read-only** for this request. It may have other known bugs. Inspect **how its working profile activation and menu path prevent this specific failure**, then carry over only what is appropriate.

## B. Original diagnostic archive, independently read

Source: `Click2Cloud-RAW-fca3ee81-0b38-4170-a45e-0163006bcc6f.zip` (owner-provided, not committed). Local snapshot ID `fca3ee81-0b38-4170-a45e-0163006bcc6f`. Affected `appVersion=0.3.19`, build `e188dc7f86b522207226bf30f8f6c25fec2a0a1e`.

| Sequence | Native menu generation | Observed outcome | Evidence |
| ---: | ---: | --- | --- |
| 1 | 3 | `SOURCE_DENIED` | unrelated blocked source |
| 2 | 3 | verified | `R2_HEAD_VERSION_SIZE`, authoritative receipt |
| 3 | 18 | verified | `R2_HEAD_VERSION_SIZE`, authoritative receipt |
| 4 | 19 | `WORKER_SETUP_REQUIRED` | no verified write |
| 5 | 20 | `WORKER_SETUP_REQUIRED` | no verified write |
| 6 | 20 | verified | `R2_HEAD_VERSION_SIZE`, authoritative receipt |
| 7 | 20 | `WORKER_SETUP_REQUIRED` | no verified write |
| 8 | 20 | verified | `R2_HEAD_VERSION_SIZE`, authoritative receipt |
| 9 | 20 | `WORKER_SETUP_REQUIRED` | no verified write |
| 10 | 20 | `WORKER_SETUP_REQUIRED` | no verified write |
| 11 | 21 | `WORKER_SETUP_REQUIRED` | no verified write |
| 12 | 21 | `WORKER_SETUP_REQUIRED` | no verified write |

Thus **4 verified, 7 setup-blocked, 1 source-blocked**. All are `cloudflare` + `simple`. The manifest reports `basicExpected=12`, `basicExported=12`, `richExpected=0`, `richExported=0`; `full-events.jsonl` is empty. Interleaved verified/blocked results at generation 20 argue against a universal outage. They do **not** prove which exact target was chosen per attempt, and they don't prove that every success went to `redown` by telemetry alone.

**Data hygiene:** RAW contains contextual source data. Do not commit the ZIP or expose raw URLs/tokens/cookies. If an instrumented capture is needed, log a privacy-safe opaque target ID, target change generation and per-stage outcome under the existing diagnostics/privacy contract.

## C. Grounded source-level comparison hypothesis

| Contract | REDOWN observed source | Click2Cloud observed source at `e188dc7` | Codex question |
| --- | --- | --- | --- |
| Prepared bucket gate | `extension/right-click-v3.js::prepared` matches profile/account/bucket and requires Worker URL/token; `eligible` gates menu choices | `src/modes/simple/index.mjs` composes from configured inventory; transport readiness is enforced separately | Can a configured Simple item become clickable before its exact target is prepared? |
| Per-bucket infrastructure | `extension/background.js` owns Worker/R2 setup; `right-click-current.js` namespaces by account/bucket/endpoint | `src/cloudflare/deployment.mjs` stores plan under digest(accountId,bucketName); `transport.mjs::cap` requires a matching ready plan | Does a new bucket get its own approved/reused plan, and is its selected identity preserved? |
| Config vs preparation | REDOWN profile activation is tied to `prepared` test | `src/api/service.mjs::commitConfigChange` commits changes and reports destination readiness; `onboarding.mjs::recoverCloudflareDestination` separately provisions/probes | Is the setup/recovery path actually invoked or presented for new Simple targets? |
| Login/reauth | Owner reports repeated logout/login without manual reconfiguration | Click2Cloud has OAuth, durable approval ledger, and exact authorization checks | Do we reverify/reuse existing grants and plan rather than require needless reapproval? |
| Exact click routing | REDOWN `resolve` chooses a prepared profile/prefix | Click2Cloud `extension/background.mjs` → `engine.mjs` → transport | Does Default or sole-choice selection ever use the wrong row, stale generation or old `redown` plan? |

The mismatch is a **testable candidate**, not a diagnosed fault. REDOWN's own `simpleTargets` special-cases `redown`, so Codex must verify custom-bucket and folder behavior rather than assuming every old branch is perfect.

## D. Controlled A/B to disambiguate the cause

Reproduce on same file/source with a known ready `redown` target and one new Simple target. Run two variants: (1) another folder/prefix **within** ready `redown`, and (2) a **distinct R2 bucket**. Record exact requested/compiled/clicked target using opaque stable fingerprints, approved setup state, provisioner lookup, capability result, displayed attention action and receipt destination. Toggle Default, then make it the only choice, without changing the requested target. Repeat across OAuth reconnect, native menu reconciliation and MV3 restart.

A same-bucket-folder success but new-bucket failure points toward per-bucket plan preparation. Both failures suggest selection, per-target capability, or UI-to-API orchestration. Only actual trace/tests can decide. No automatic unapproved writes during investigation.

## E. Acceptance evidence ledger

For each scenario, classify separately **PASS / FAIL / BLOCKED / NOT TESTED** in:
- Pure unit tests.
- Fake-browser/native-registration tests.
- Installed Windows Chrome menu and click observation.
- Live Cloudflare setup and remote receipt verification *after owner authorization*.

A PASS in one class **does not** imply PASS in another. Compare against the user's practical REDOWN benchmark: simple saves after each login, precise bucket/folder selection, and no repeated human work unless genuinely necessary.
