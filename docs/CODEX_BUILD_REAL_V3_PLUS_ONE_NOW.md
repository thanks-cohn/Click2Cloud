# CODEX — Build the REAL Click2Cloud V3+1 engine (P0)

**Authoritative repository: `thanks-cohn/Click2Cloud`.** NOT `thanks-cohn/REDOWN`.

**Purpose:** Finish the new, separate Click2Cloud V3+1 engine in this repo. Do not make REDOWN production changes or transplant the unfinished engine before passing independent acceptance gates.

## Start from real code, not a mockup
Read `README.md`, `docs/ARCHITECTURE.md`, `docs/LIVE_MULTI_BUCKET_LAB.md`, `docs/REAL_R2_TEST_TREE.md`, `docs/TRANSPLANT_AND_ROLLBACK.md`, `docs/CLOUDFLARE_BUILDS_CLICK2CLOUD.md`, `src/core/menu-compiler.mjs`, `src/core/save-dispatcher.mjs`, and `tests/menu-compiler.test.mjs`. Run `npm test` and record actual baseline results.

This repo currently has a **pure single-bucket compiler and minimal confirmed-upload dispatcher**. It does **not** have the real authenticated R2 provider adapter, working Portal, native Chrome adapter, full multi-bucket engine or verified live deployments. Implement those components in this repository instead of declaring documentation completion.

## P0 deliverables (actual code and tests)

1. **Canonical, versioned state:** connection IDs, provider kind, actual account, R2 bucket, exact prefix, revision, discovered/paginated folder nodes, scope and freshness, configured endpoints, labels, explicit default, chosen mode and depth. Persistent snapshots and migrations with rollback/checkpoints; never infer authorization from cached names.
2. **One deterministic, pure menu compiler:** produce validated actionable IDs and stable MenuSpec for Portal and Chrome. Support multiple Cloudflare R2 buckets and independent S3 providers. Default simple label = last folder name, else bucket. Reject or explicitly resolve exact sibling/label collisions via user choice. No path collisions across accounts/buckets. No raw secret in IDs, logs, menu labels or exports.
3. **Mode independence:** Simple flat, Narrow only manually selected authorized endpoints + natural ancestors, Depth all discovered eligible folders to per-bucket configured 1–10+ levels. Depth changes and partial scans never erase the underlying tree. Configuring one mode cannot mutate another's endpoints.
4. **True production Chrome semantics:** REDOWN provider root; Cloudflare direct-save leaf when one verified default; when extra destinations exist it expands to configured siblings then actual separator then **Home last**, saving to the same exact default. No 'Home' navigation fallthrough. Google Drive/Dropbox/OneDrive stay flat provider leaves and never drive the R2 projection. Preserve exact route IDs, idempotent registration, update/retry, MV3 restart. Follow owner-approved semantics from REDOWN's `NEED_TO_DO/CODEX/logic-tables.md` as input, but implement the independent engine **here**, not by modifying REDOWN's production extension.
5. **A working Portal, not a simulation:** real in-app right-click on an authorized user image or real cloud file must present the same pure MenuSpec and dispatch an original-byte cloud save. No uploading compressed previews or local disk staging when a supported fetch/stream path exists. UI polished, keyboard accessible, responsive, cancel/retry. A separate educational example, if added, must be clearly isolated from this real Portal.
6. **Intuitive path editor:** one typeable autocompleting path field with no focus loss; three independently side-scrollable Parents/Siblings/Children pill rows; click to navigate; explicit Simple/Narrow/Depth settings; per-bucket depth; explicit + add, remove, duplicate-label Yes/No and Save Changes / Apply with truthful browser ack.
7. **Real R2 provider:** authenticated listing with delimiter/pagination, real empty folder markers, download and upload integrity, safe retries, explicit failure/partial states, KEEP BOTH conflict handling, per-operation identities and receipts. Respect least privilege; do not send source page/link/image URLs or browsing provenance to provider APIs; only original bytes, filename/extension and minimum protocol metadata. No true-remote claim without measured browser-to-cloud E2E proof.
8. **One dispatcher and trustworthy receipts:** real Portal and Chrome call the same `SaveIntent` dispatcher; confirmed success/history/counters/celebration **only** after real provider-confirmed receipt. A click pulse may acknowledge dispatch immediately but must not count as saved. No false positive on login failure, timeout, ambiguous upload or retry.

## Lab & CI safety

The **correct** Cloudflare account Git connection is now `thanks-cohn/Click2Cloud` (repo ID `1444247809`). The isolated Worker is `click2cloud-v3p1-r2-lab`. Root `wrangler.toml` now targets that lab Worker only. The worker entrypoint `src/lab-worker.mjs` is currently an inert smoke response with `workers_dev=false`, **not** the completed engine.

**Automatic Worker Builds are not yet active:** Cloudflare requires a dedicated build token UUID and Worker-level build configuration; do not assume a registered repository grants Codex cloud access. Never write scoped Cloudflare tokens, R2 access keys or secrets into GitHub. Do not reuse production Worker tokens. It is acceptable to ship tested source commits while Cloudflare build authorization is pending.

Five actual Cloudflare buckets exist for testing: `redown`, `redown-bucket-1` through `redown-bucket-4`. Verified connector canary PUT/list/DELETE for each bucket was completed November 3, 2026; **this does not verify Click2Cloud app uploads**. Fixture keys and public/private expectations are in `docs/LIVE_MULTI_BUCKET_LAB.md` and `docs/REAL_R2_TEST_TREE.md`. Bound live tests to existing dedicated fixture prefixes only, never delete unrelated objects, never expose private content to public R2 domains.

Do not configure deployment to `REDOWN`, `remote-asset-ingest`, or an existing customer Worker. Do not turn on public Worker routes as part of setup.

## Acceptance gate

- Property tests: input permutation stability, collision handling, Unicode/path safety, large/deep/wide trees, per-provider isolation, per-mode independence, cross-account repeated names.
- Integration: Cloudflare paginated discovery across five buckets; private/public access distinction; byte identity and provider read-back; no provenance leakage; auth revoke, expiry, interrupted transfer, restart, ambiguous receipts.
- Portal: actual right-click on real image → meaningful menu → verified real object in R2, source unchanged.
- Native Chrome: true `chrome.contextMenus` registration and click, Simple leaf/submenu/Home-last transitions, Narrow, Depth, startup and recovery. Chrome-native test evidence is separate from DOM mock proofs.
- `npm test` plus new focused tests and code quality checks. Report PASS/FAIL/BLOCKED/NOT_TESTED accurately; don't claim a live pass from fixtures.

**Execution:** implement actual code now in `thanks-cohn/Click2Cloud`, commit in small coherent changes, publish branch and pull request for review, attach actual test receipts and remaining Cloudflare deployment blocker. Do not stop at further design documents.
