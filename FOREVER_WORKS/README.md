# FOREVER WORKS — REDOWN V3/Click2Cloud canonical extraction handoff

**Updated:** November 5, 2026. This directory contains source-backed documentation extracted from REDOWN for future Codex work in Click2Cloud. These are specifications and evidence pointers, not implementation, tested parity, or authorization to transplant.

## Read order for Codex

1. [REDOWN CURRENT + V3 source extraction](./REDOWN_CURRENT_V3_SOURCE_EXTRACTION_2026-11-05.md) — first read: actual REDOWN implementation, source-pinned links, IndexedDB CURRENT/JSONL, V3 functions, native Chrome menu, Cloudflare TRUE REMOTE, verified receipts, other provider isolation, known bugs and owner overrides.
2. [Codex execution / parity contract](./CODEX_REBUILD_FROM_REDOWN_CURRENT_V3_EXTRACTION_2026-11-05.md) — exact Click2Cloud target seams, phased KEEP/ADAPT/REJECT plan, tests, performance measurements, worker/Chrome evidence, migration gates and stop conditions.
3. [Owner's latest instant switching and mode marker requirement](../NEED_TO_DO/2026-11-05_INSTANT_SIMPLE_NARROW_DEPTH_SWITCHING.md) — Simple is ONE marked location and a flat REDOWN → Cloudflare TRUE REMOTE leaf; Narrow is manually configured labeled nesting; Depth is the cached directory hierarchy. Do not implement older Simple extra-submenu behavior.
4. [V3+1 complete target contract](../docs/V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md) and [autonomous runbook](../docs/CODEX_AUTONOMOUS_V3P1_RUNBOOK.md) — historical broader plan; reconcile dated conflicts explicitly rather than silently overriding TRUE REMOTE.

## Central invariant

**Cloudflare TRUE REMOTE:** The browser sends an authorized source URL and destination control metadata to a matching Cloudflare Worker; the Worker fetches the file remotely and writes it to R2, with provider read-back verification before success.

**Other clouds:** Drive/Dropbox/OneDrive use separate browser-byte upload paths and may not receive the original source URL as provider metadata.

**Mode is not transport:** Simple/Narrow/Depth choose the destination only; none may replace Cloudflare TRUE REMOTE with browser downloading.

**Status:** Documents only. Source reference REDOWN commit: 0fe8f7dce301027ad53e1958e037b82652c57088. REDOWN repository itself remains unchanged by this extraction.
