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
2. `11.23.2026/CHANGE_REQUEST_VERSION_0326_NAV_VISIBILITY.md`
3. `AGENTS.md`
4. `11.23.2026/CODEX_REQUEST_QUEUE_AND_UX.md`
5. `11.23.2026/queue-final.md` (canonical Queue/History V2 spec, subject to the 0.3.24 foundation override)
6. `11.23.2026/FINAL_CONSISTENCY_AUDIT.md`
7. `11.23.2026/CHANGE_REQUEST_HISTORY_V2_CARD_DOWNLOAD.md`
8. `11.23.2026/CHANGE_REQUEST_0326_HEADER_REMOTES_EXPLORER_PARITY.md`

**TASK:** Build complete, modular Queue V2 + chronology-first, full-parity History V2 and only approved UX. BEFORE coding, audit 0.3.24 baseline features, create a preservation matrix, then work in reviewable checkpoints.

**P0 MUST NOT REGRESS:** Four Remotes cards (Google Drive, OneDrive, Dropbox, Cloudflare R2); original Basic-provider service/auth/save/Continue save; Cloudflare; Simple/Narrow/Depth right-click; Explorer; screenshots; legacy History; Diagnostics; storage/recovery; original themes and UI identities. No provider placeholders. Queue/History never blocks saves.

**ADDITIONAL APPROVED SCREENSHOTS UX:** For NEW screenshot rule `Screenshot Shortcut` dropdown, preselect `Alt+Q`. **None/blank MUST remain a selectable option** and other options preserved. Do not change existing saved rule values, Chrome actual shortcuts, or capture behavior. Test new, None, edit, persistence and real bindings.

**SCOPE:** Live Jobs above full History V2 during alpha; legacy History kept intact; modular source adapters to 0.3.24 authentic receipts; complete bounded-memory ZIP; unlimited/optional capped retention and explicit Clear All; indexed lazy pagination, 100k benchmark; nav + Settings + approved theme/Remotes button placement; API-driven observability with appropriate authority. No final History cutover, no deferred work, no Diagnostics edits, no provider rewrite.

**GATES:** Read-only baseline first, source contract evidence, four-card visual/functional parity, screenshot dropdown tests, repeat regression checks at every checkpoint, honest real Chrome evidence separate from mocks, accurate ZIP completeness/CRC/memory measurements. Any failure of pre-existing provider or Remotes parity is a BLOCKER, not success.

Commit ONLY on `codex/queue-history-v2-0324-verified-2026-11-24`; provide actual commit SHA(s), changed files, precise tests/evidence and unresolved blockers. No claim of installation readiness until every preservation gate is satisfied.

---

**NEW OWNER-APPROVED HISTORY V2 FEATURE — ALWAYS-VISIBLE CARD DOWNLOAD:** Read `11.23.2026/CHANGE_REQUEST_HISTORY_V2_CARD_DOWNLOAD.md` in full before implementation. Every collapsed History V2 save-result card MUST have a readily visible, text-labeled **Download** button on its normal action row; users MUST NOT expand the card, use Details/More, or open the preview to download the actual saved cloud file. Use existing authorized provider APIs where supported, truthful visible disabled/unavailable states otherwise; include screenshot output differentiation; preserve compact/full themes, accessibility, safe resource usage, ZIP export and independent save engines. This is REQUIRED acceptance scope, not deferred.

---

## MANDATORY RELEASE VERSION + USER NAVIGATION VISIBILITY (OWNER OVERRIDE)

Read `11.23.2026/CHANGE_REQUEST_VERSION_0326_NAV_VISIBILITY.md` **in full as a current instruction**, not deferred scope. The base remains exact 0.3.24 commit `cd4c8dd3`, but the CURRENT approved branch has intentionally been bumped to **0.3.26**: preserve that bump; final generated `dist/click2cloud/manifest.json`, packaged build metadata and Chrome `chrome://extensions` must present **REDOWN 0.3.26**. Do not revert current branch version to 0.3.24 merely because the baseline is 0.3.24.

**FINAL OWNER NAVIGATION RULE:** The More menu is the three-dot **`⋯`** control, not a hamburger or fixed tab. Settings → Customize Navigation is a *placement selector*, not On/Off. For Files, Remotes, Queue, History and other eligible tabs, choices are **Main tab / More menu / Gone**. **Settings is the exception: Main tab / More menu ONLY, and can NEVER be Gone**; reject and safely repair invalid saved `gone` state for Settings. Default main bar **Files | Remotes | Queue | ⋯**, with **Settings, History and all other eligible sections in the three-dot More menu** (except Downloads, which is excluded by prior rule). Gone removes only navigation visibility, never data, services or saving. Persist choices, implement Reset to Defaults, ensure accessible responsive behavior and test in real Chrome. Full details: `11.23.2026/CHANGE_REQUEST_VERSION_0326_NAV_VISIBILITY.md`.

**FINAL OWNER HISTORY ZIP PLACEMENT:** The persistent **Export Complete History ZIP** control belongs inside **Settings → Queue** and is *always visible and operable* there, even with the 15-minute cleanup/Hide policy ON. The separate, more detailed **Export Queue History** Settings subsection may remain conditional on cleanup OFF. A History V2 toolbar shortcut may exist as a second entry point into the **same** exporter, but it cannot be the sole or primary access path. Archive export is distinct from individual card Download and from Diagnostics. Verify full retained/range-selected data, consistent manifest/counts/checksums, no credentials, bounded memory and real unpacked-Chrome execution.

**GUIDING PHILOSOPHY — AGENT-NATIVE ENGINEERING WHERE PRACTICAL:** Build for human simplicity outside and programmatically operable, observable, verifiable internals. Human clicks and controlled tests/agents invoke the SAME existing authorized application operations; no duplicated saving/permission logic. Provide deterministic stress/failure simulations (100k synthetic History records, up to 10k synthetic/projected queued jobs—not real concurrent provider uploads; termination/restart; expired auth; provider outage; bad data; interrupted operations), structured invariants and reproducible evidence. Distinguish simulation, real Chrome integration, and authorized real-provider proof. Do not add privileged public HTTP APIs, production test bypasses, secret exposure or broad refactors. This is a guiding design preference, not authority to expand scope.

**LATEST OWNER REMOTES CARD PLACEMENT (REQUIRED):** On applicable Remotes cards, show **Login OR Reconnect in the padded TOP-RIGHT** (according to actual auth state), and place **GO TO followed by Refresh together at the BOTTOM-LEFT**, **left-aligned** in that order. Do not position these two buttons bottom-right. Preserve existing handlers, card contents, all four providers, themes and responsive layout. The bottom-left GO TO → Refresh order supersedes any earlier Refresh → GO TO instruction.

**FINAL OWNER ORDER — REMOTES CARD BUTTONS:** In the **BOTTOM-LEFT** action row, display **GO TO first (left)** and **Refresh second (right)**, left-aligned, with existing functionality intact. **Login or Reconnect remains TOP-RIGHT**. This supersedes all prior reverse-order instructions. Do not move the pair to bottom-right.

## LATEST OWNER 0.3.26 POST-IMPLEMENTATION VISUAL REPAIR — MANDATORY

**LATEST OWNER UX OVERRIDE (POST-0.3.26 ALPHA):** Read `11.23.2026/CHANGE_REQUEST_0326_HEADER_REMOTES_EXPLORER_PARITY.md` before modifying UI. **Sign In OR Reconnect bottom-left** of each applicable Remotes card; **GO TO followed by Refresh bottom-right**, right-aligned (auth action is NOT top-right). Cloudflare Sign In/Reconnect restores the original wide horizontal appearance, not a squeezed button. The application navigation **three-dot `⋯` is ALWAYS the far-right header control** (including narrow/custom tab configurations); preserve theme access. **File Explorer must regain its original full visual length/extent from 0.3.24**, with before/after viewport-matched browser proof. This overrides all older contradictory layout directions. Preserve 0.3.26 functionality, providers and engine behavior; implement as focused layout repair, not a redesign.
