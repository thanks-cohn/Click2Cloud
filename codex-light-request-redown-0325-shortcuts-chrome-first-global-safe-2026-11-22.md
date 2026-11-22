# Lightweight Codex handoff — REDOWN 0.3.25 shortcuts

Work ONLY in `thanks-cohn/Click2Cloud`, branch `codex/redown-basic-api-integration-0323-alpha-base-2026-11-21`. Do NOT switch branches or modify another repo.

Read and execute the entire canonical request:
`codex-request-redown-0325-latent-shortcut-causal-audit-2026-11-22.md`

**Crucial release distinction:** 0.3.23 (`5e1cb5f`) is my known-good *behavioral* baseline, NOT proof its code had no latent defects. 0.3.24 (`cd4c8dd3`) coincided with/exposed the regression; investigate cause instead of assuming that revision created every bug. Produce the fixed isolated version **0.3.25**.

**Non-negotiable first priority:** ALL supported keyboard shortcuts MUST complete their intended actions when set **In Chrome**, in **official Windows Google Chrome**. Prioritize exactly these four browser commands: Alt+Q screenshot, secondary screenshot Ctrl+Shift+Y, Files finder/search (my assigned Ctrl+Shift+F), History pop-out/toggle. Keep remaining shortcuts functioning inside the focused Shelf. Test real captured PNG, actual search focus, real History toggle, receipts and saved settings—not just command events or graceful errors.

**Secondary task:** Make these shortcuts work in **Global** wherever Chrome legitimately permits, **without ANY regression to In Chrome**. Test foreground/background/tabless Chrome; do not capture the wrong tab, fake permissions/success, silently change assignments or bypass Chrome restrictions. If Global is blocked by Chrome, document exactly why, provide safe feedback and keep In Chrome perfect. Global improvements must never be allowed to break the primary mode.

Audit source, exact Chrome errors, user gesture timing, activeTab/host grants, async focus, cold MV3 worker, fresh/in-place upgrades, 0.3.23↔0.3.24 comparisons and existing Codex candidate fixes. Document **latent flaw vs activation trigger vs introduced regression vs browser restriction**, with reproducible evidence. Add deterministic tests and actual Chrome verification wherever available; Linux/Edge is not Windows Chrome proof.

Preserve all user data, extension identity, custom keys, provider saves, verified receipts, cloud destinations, History and UI. Defer optional desktop capture until Chrome P0 passes. Update the causal report and risk register, build/package exactly **0.3.25**, commit/push on the authorized branch, and explicitly label any unverified Windows cases. Do not declare release-ready without the Windows Chrome primary acceptance evidence.
