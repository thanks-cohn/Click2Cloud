# P1 — Full-suite intermittently fails Depth save: STALE_GENERATION / AUTHORIZATION_LOST

**Logged:** 2026-11-14  
**Status:** OPEN — intermittent, not root-caused; **not confirmed in installed Chrome or live Cloudflare R2**  
**Area:** Full-suite tests / Depth / native menu-generation consistency / authorization recheck  
**Environment:** Owner's Windows CMD, separate worktree `C:\\Users\\jg202\\Click2Cloud-diagnostics-test`  
**Tested branch:** `feat/base01-two-tier-diagnostics` (initially inspected at `4878aa26d989b4344cccb92481db5273f6bcf6a1`; exact local worktree HEAD at failure not separately captured)  
**Test:** `tests/depth-plan-recovery.test.mjs`, first test, especially assertions near lines 83–85  
**Related Codex request:** `codex/11.14.2026/P1_V2_TWO_TIER_NONBLOCKING_RIGHT_CLICK_DIAGNOSTICS_CODEX_REQUEST.md`

## Full-suite — observed results

- **Full suite run:** 384/385 passed, 1 failed. The first observed failure in `tests/workings.test.mjs` was a stale source fingerprint for `extension/app.css`, subsequently traced to a Windows LF/CRLF checkout difference (index LF / working file CRLF).
- **Full suite run:** 383/385 passed, 2 failed: a stale fingerprint for `extension/app.html` (same LF/CRLF pattern), plus Depth saving returned `{state:"blocked",code:"STALE_GENERATION"}` rather than the test's expected `completed` on a Narrow A control after Depth B recovery (near line 85).
- **Isolated Depth run:** `node --test tests/depth-plan-recovery.test.mjs` passed **4/4** after stylesheet/HTML line endings were normalized. This is evidence of intermittency, **not proof of a production race**.
- **Subsequent full suite:** 384/385 passed, with only `extension/app.mjs` stale fingerprint. The Depth test passed in that run.
- **Most recent full suite supplied by owner:** **384/385 passed, 1 failed**. Depth B save for the 12-level prefix returned `{state:"uncertain",code:"AUTHORIZATION_LOST"}`, where the test expects `completed` (near line 83). The returned safe timings were: `dispatchPreparationMs=23`, `intentAuthorizationMs=24`, `capabilityMs=1`, `authorizationRecheckMs=76`, `workerRequestMs=111`, `verificationMs=20`, `durationMs=232`. This was a **local fixture/workerd test**, not a live Cloudflare failure. No credentials or private source URLs recorded here.
- Full-suite results above were obtained in Windows after local newline normalization of certain worktree files. Those temporary changes were **not** a product fix and must not be committed as such.

## Investigation needed (do not pre-judge root cause)

1. Reproduce the Depth test both in isolation and under the full test runner, including multiple repetitions and parallel/serial execution. Record the exact Git HEAD, Node version, relevant timing and complete safe failure output.
2. Identify why the *same* test sometimes produces `STALE_GENERATION` and sometimes `AUTHORIZATION_LOST`; determine whether test fixture concurrency, scheduling, a mutable generation, legitimate authorization expiry/rechecks, or an application regression is involved. **None of these explanations is confirmed.**
3. Trace authoritative current generation, native acknowledged generation, and the exact target permission at each `await` boundary; distinguish an intentionally blocked/uncertain save (safe behavior) from the unexpected reason it arose.
4. Compare with protected `milestone/a-sure-winner-base-0.1` and with the recorder enabled/disabled on the same disposable fixtures, to evaluate possible diagnostic overhead without claiming causation.
5. Preserve the source's safety contract: NEVER bypass authorization, suppress `STALE_GENERATION`, treat `uncertain` as verified, blindly retry remote writes, or loosen assertions simply to obtain a green suite.
6. Separately harden Windows checkout/test reproducibility: `tests/workings.test.mjs` hashes exact bytes and can fail when Git converts LF to CRLF. Prefer tracked binary-stable source policy/test-harness validation over manual per-file normalization; don't erase the integrity requirement.

## Acceptance criteria

- Repeatable full-suite PASS without fixture cross-talk, plus isolated Depth PASS on Windows; any fixture flakiness must be corrected or explicitly isolated with preserved evidence.
- Exact authorization and menu-generation invariants continue to reject genuinely stale/unauthorized operations and never misreport verified saves.
- Diagnostics OFF/BASIC/EXPANSIVE comparisons demonstrate no regression under representative concurrent/slow conditions.
- Real Chrome/native right-click and independent R2 readback remain **NOT VERIFIED** until owner-authorized physical acceptance. Do not close this item based solely on synthetic tests.

**Documentation-only issue. No app code, tests, configuration, Cloudflare resources or existing milestone tags are modified by this log.**
