# CODEX — START HERE: REDOWN 0.3.24 QUEUE/HISTORY V2 + APPROVED UX

**THIS IS A NEW RUN. DO NOT RESUME THE OLD QUEUE BRANCH.**

**AUTHORIZED IMPLEMENTATION BRANCH:** `codex/queue-history-v2-0324-verified-2026-11-24`.
**IMMUTABLE SOURCE BASE:** REDOWN 0.3.24, `cd4c8dd3bc11700376d30da050d6050a0eb1edb9` (tag `redown-0.3.24-KNOWN-GOOD-FOUNDATION-2026-11-23`).
**FORBIDDEN BRANCH:** `codex/queue-history-v2-2026-11-24` — IGNORE IT. DO NOT merge/rebase/cherry-pick/copy implementation from it. The earlier failed Queue V2 implementation and its test results are NOT implementation inputs. Also do not start from `main` / 0.3.23 / 0.3.25.

Before editing any code, run and report:

```bat
git branch --show-current && git rev-parse HEAD && git merge-base HEAD cd4c8dd3bc11700376d30da050d6050a0eb1edb9 && git status -sb && node -p "require('./package.json').version"
```

**STOP** if current branch != `codex/queue-history-v2-0324-verified-2026-11-24`, or merge-base != `cd4c8dd3bc11700376d30da050d6050a0eb1edb9`. Do not silently switch branches to make it work.

READ IN FULL AND IN ORDER:
1. `11.23.2026/BASELINE_AND_ACCEPTANCE_0324.md`
2. `AGENTS.md`
3. `11.23.2026/CODEX_REQUEST_QUEUE_AND_UX.md`
4. `11.23.2026/queue-final.md` (canonical Queue/History V2 spec, subject to the 0.3.24 foundation override)
5. `11.23.2026/FINAL_CONSISTENCY_AUDIT.md`

**TASK:** Build complete, modular Queue V2 + chronology-first, full-parity History V2 and only approved UX. BEFORE coding, audit 0.3.24 baseline features, create a preservation matrix, then work in reviewable checkpoints.

**P0 MUST NOT REGRESS:** Four Remotes cards (Google Drive, OneDrive, Dropbox, Cloudflare R2); original Basic-provider service/auth/save/Continue save; Cloudflare; Simple/Narrow/Depth right-click; Explorer; screenshots; legacy History; Diagnostics; storage/recovery; original themes and UI identities. No provider placeholders. Queue/History never blocks saves.

**ADDITIONAL APPROVED SCREENSHOTS UX:** For NEW screenshot rule `Screenshot Shortcut` dropdown, preselect `Alt+Q`. **None/blank MUST remain a selectable option** and other options preserved. Do not change existing saved rule values, Chrome actual shortcuts, or capture behavior. Test new, None, edit, persistence and real bindings.

**SCOPE:** Live Jobs above full History V2 during alpha; legacy History kept intact; modular source adapters to 0.3.24 authentic receipts; complete bounded-memory ZIP; unlimited/optional capped retention and explicit Clear All; indexed lazy pagination, 100k benchmark; nav + Settings + approved theme/Remotes button placement; API-driven observability with appropriate authority. No final History cutover, no deferred work, no Diagnostics edits, no provider rewrite.

**GATES:** Read-only baseline first, source contract evidence, four-card visual/functional parity, screenshot dropdown tests, repeat regression checks at every checkpoint, honest real Chrome evidence separate from mocks, accurate ZIP completeness/CRC/memory measurements. Any failure of pre-existing provider or Remotes parity is a BLOCKER, not success.

Commit ONLY on `codex/queue-history-v2-0324-verified-2026-11-24`; provide actual commit SHA(s), changed files, precise tests/evidence and unresolved blockers. No claim of installation readiness until every preservation gate is satisfied.
