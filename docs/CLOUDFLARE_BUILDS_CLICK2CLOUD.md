# Cloudflare Workers Builds — Click2Cloud (correct repository)

This applies to **`thanks-cohn/Click2Cloud`**, not `thanks-cohn/REDOWN`.

## Verified on November 3, 2026

- Cloudflare account-level GitHub repository connection was created for `thanks-cohn/Click2Cloud` (GitHub repository ID `1444247809`).
- Existing isolated Cloudflare Worker: `click2cloud-v3p1-r2-lab`, Worker tag `ecb1f7aea5434d24b1ed2c7809787362`.
- This repo now has its own Wrangler config with the **exact same** Worker name and an intentionally inert smoke entrypoint.
- **Worker-level automatic Builds configuration is not yet connected.** GitHub repo registration and Workers Builds deployment are different API resources.
- No production REDOWN Worker or bucket may be targeted by these build scripts.
- No Cloudflare secrets or credentials are stored in this repository.

## Worker-level connection to finish in Cloudflare

Under Workers & Pages > `click2cloud-v3p1-r2-lab` > Settings > Builds > Connect, choose:
- GitHub: `thanks-cohn/Click2Cloud`
- Branch: `main` (the existing Click2Cloud source branch)
- Root directory: `/`
- Build command: `npm test`
- Deploy command: `npx wrangler deploy`
- Build token: **create a new user-scoped dedicated token** for this isolated Worker in Cloudflare; do not reuse another production Worker's token.
- Disable preview deploys while the engine is under construction.

Cloudflare Builds via API requires a valid dedicated `build_token_uuid`; the connected Cloudflare OAuth session does not expose the underlying secret or have API Tokens Read/Write rights. Therefore an account-level Git connection alone must not be represented as an active automatic deployment.

## Scope of live verification

R2 test buckets `redown`, `redown-bucket-1`, `redown-bucket-2`, `redown-bucket-3`, `redown-bucket-4` were verified by the Cloudflare connector in this conversation through bounded object PUT/list/DELETE tests. That is separate from Codex, Worker deployment, Chrome, and actual save E2E tests.

The current `src/lab-worker.mjs` is a harmless smoke target only. It has **no R2 bindings**, no upload actions, and cannot be called proof of a completed V3+1 Portal. Codex should implement the actual shared compiler, provider adapters, Portal and Chrome bindings in the existing source tree and keep this Worker isolated until deliberate release readiness.

Official: https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/
