# REDOWN 0.3.24 — Queue/History V2 Owner-Locked Foundation and Acceptance

**Date:** 2026-11-24
**Status:** Specification / implementation gate only. THIS COMMIT DOES NOT IMPLEMENT OR VALIDATE QUEUE V2.

## Identity and source of truth

| Role | Exact value |
|---|---|
| Repository | `thanks-cohn/Click2Cloud` |
| Authorized 0.3.24 source base | `cd4c8dd3bc11700376d30da050d6050a0eb1edb9` |
| Verified reference tag | `redown-0.3.24-KNOWN-GOOD-FOUNDATION-2026-11-23` |
| Only implementation branch | `codex/queue-history-v2-0324-verified-2026-11-24` |
| Three source specification documents | original Markdown from `1c1e6ea23f0f062740463d923fb53a8efdbbd544`, copied into this branch |
| Explicitly forbidden previous implementation | `codex/queue-history-v2-2026-11-24` and local `queue-v2-review` |
| Do-not-use as foundation | `main`, 0.3.23, 0.3.25, documentation-donor application tree |

**Original 0.3.24 product version:** `package.json` and `extension/manifest.json` both reported `0.3.24` at the reference tag. Verify this locally before implementation. This documentation branch's future changes MUST maintain ancestry to this exact commit.

## Stop/continue protocol

1. Read `AGENTS.md` and these three files fully: `11.23.2026/CODEX_REQUEST_QUEUE_AND_UX.md`, `11.23.2026/queue-final.md`, `11.23.2026/FINAL_CONSISTENCY_AUDIT.md`.
2. Before a code edit print `git branch --show-current`, `git rev-parse HEAD`, `git merge-base HEAD cd4c8dd3bc11700376d30da050d6050a0eb1edb9`, `git status -sb`, and the version in `package.json` and `extension/manifest.json`. STOP if branch or merge-base is wrong. Do not checkout, merge or cherry-pick from the forbidden Queue branch.
3. Inventory original 0.3.24 runtime and visual features; write a locked parity matrix BEFORE implementation. Four Remotes cards and their controls are non-negotiable.
4. Implement isolated Queue/History observers of verified canonical source API receipts. Keep legacy History and Diagnostics operational. Only approved UX tweaks allowed. All dependency/security changes out of scope unless release-blocking and separately justified.
5. At each checkpoint build and test 0.3.24-derived app, verify that all four Remotes cards and Cloudflare R2 work remain intact, and record regressions. Independently validate ZIP and pagination under 100,000-record loads. Pass tests do not certify Chrome integration.
6. Report changed files, precise commits, branch identity, parity, recorded evidence, unresolved risk, and explicit real Chrome / provider acceptance state. If a preservation gate fails, do not claim completion or tell the owner to install the build.

## Mandatory visual Remotes contract

On entry to Remotes, preserve the existing architecture and order:

1. `All Your Clouds.` / `One Place.` heading.
2. Three vertically stacked Basic provider cards: `Google Drive`, `OneDrive`, `Dropbox`. Preserve logos, status, controls and connected behaviors from `extension/basic-provider-cards.mjs`.
3. `The Future is NOW.` / `True Remote is Here.` heading.
4. Separate `Cloudflare R2` card with original auth, setup, readiness, saved location and recovery behavior.

Place an existing Sign In/Login or Reconnect control top-right when applicable. Place GO TO then Refresh at bottom-left where those actions exist; no invented controls. Honor themes, palettes, a11y and responsive sizing. Never substitute placeholders for the three Basic providers.

## Screenshot shortcut owner change (approved)

In Screenshots → `Screenshot Shortcut` dropdown **when creating a NEW rule**, preselect the existing `Alt+Q` screenshot command instead of initial blank. **Keep None/blank as a valid, user-selectable option.** Other existing shortcut options remain. Editing a pre-existing rule must preserve the stored selection; a saved None remains None. This is only a UI initial default—no automatic Chrome shortcut assignment or capture. `src/screenshot/rules.mjs` and Chrome command bindings must not be silently mutated. Handle unassigned Alt+Q honestly.

**Specific original 0.3.24 finding:** `extension/screenshot-page.mjs` has `shortcutField(form,value,bindings)` which offers the empty option; new-rule mount calls `shortcutField(form,null,bindings)` around the `mount` flow. Change only the NEW-rule default, keep editor calls with stored values intact.

## Execution / safety requirements

- All provider save engines, right-click and screenshots work when Queue, archive or UI fails.
- No reduction in pre-existing features, no storage wipes or forced migrations, no fake confirmation or status.
- Retention defaults Unlimited; optional capped retention user-edited, no 100k hard cap; Live Jobs != archive. Clear All requires explicit separate confirmation.
- Large-history queries and ZIP streaming must remain memory-bounded. ZIP complete downloadable path must be tested in actual extension Chrome where available; report blocked/unverified evidence accurately.
- Default nav: `Files | Remotes | Queue | ⋯`; Settings, History, and other eligible tabs in More during alpha (Downloads NEVER in More). Remote V1 keeps its legacy Settings cards. New UI themes must preserve feature access even where a settings card is intentionally hidden by owner instructions.
- Preserve old History during alpha; Queue contains Live Jobs and independently mountable complete History V2. Permanent History replacement is deferred.

## Acceptance checklist

- [ ] Git branch and immutable 0.3.24 ancestry checked.
- [ ] Original four Remotes cards present, connected to their original services and action controls.
- [ ] Original Basic-provider auth, reconnect, status, save and pending-save recovery retained; Cloudflare unmodified.
- [ ] Screenshot new-rule defaults to Alt+Q; None remains selectable; existing rules unchanged.
- [ ] Screenshot Chrome shortcuts accurately represented without silent rebinding.
- [ ] Existing History, Explorer, settings, screenshot capture and Diagnostics preserved.
- [ ] Queue/History real receipt source coverage by provider, screenshot and save action documented.
- [ ] Lazy pagination including editable page number and deep jumps checked against 100k records.
- [ ] Complete ZIP integrity independently validated, memory behavior measured, limitations reported.
- [ ] Real Chrome load, right-click, reconnect and transfers tested when accessible and never simulated as real.
- [ ] No source imports or code copied from `codex/queue-history-v2-2026-11-24`.
- [ ] Only owner-approved scope changed; clear checkpoint hashes and regressions included.

---

## OWNER-APPROVED HISTORY V2 PER-CARD DOWNLOAD (2026-11-24)

Read `11.23.2026/CHANGE_REQUEST_HISTORY_V2_CARD_DOWNLOAD.md` and implement it in this run, on this 0.3.24-derived branch ONLY. Every History V2 result card must show a text-labeled **Download** action in the collapsed visible action row, in Full and Compact presets, without expansion or More/menu/preview. Active downloads retrieve the real cloud file using pre-existing authorized provider/file capabilities. For unavailable capabilities retain a visible disabled, explained control; screenshots with multiple output destinations must identify the selected output. Reuse existing download services; never rewrite save engines/auth, generate a fake file, create a new save event or conflate with the complete History ZIP. Bounded resources and all themes required.

- [ ] Every collapsed Full/Compact History V2 card visibly offers Download or an explained disabled state, keyboard accessible and responsive.
- [ ] Real supported provider download route verified; missing/auth/permission/404/stale receipt scenarios do not invent success.
- [ ] Screenshot multi-destination results select the exact intended file, never arbitrarily; download failure does not block saving.
- [ ] **Settings → Queue** always shows Export Complete History ZIP, distinct from per-card file Download, even when automatic cleanup is ON; full export integrity verified. No Downloads menu entry; old History/Diagnostics remain intact.

---

## OWNER-APPROVED 0.3.26 RELEASE IDENTITY + NAVIGATION VISIBILITY

This work branch **already sets REDOWN version 0.3.26** in its source manifest, package, lockfile and source build-info. The original immutable Git base is still 0.3.24 at `cd4c8dd3`. **These two facts must not be conflated.** Preserve the source version bump; build and test that the generated extension manifest and actual Chrome extension entry report version **0.3.26**. See the full owner override `11.23.2026/CHANGE_REQUEST_VERSION_0326_NAV_VISIBILITY.md`.

**FINAL OWNER RULE:** The **More menu is the actual three-dot `⋯` button**. Settings → Customize Navigation offers **Main tab / More menu / Gone** for eligible sections **other than Settings**, which has ONLY **Main tab / More menu**; **Settings can never be Gone**. Reject or normalize invalid persisted `settings=gone` to `more`. Default main **Files | Remotes | Queue | ⋯**; Settings, History and other eligible sections initially in More, excluding Downloads. Gone only hides navigation, not data. Save preferences and preserve access to Settings. The always-visible **Export Complete History ZIP** belongs inside **Settings → Queue**, regardless of the 15-minute history Hide/Delete/OFF state. A History V2 toolbar shortcut is optional and must reuse the same ZIP exporter; the detailed `Export Queue History` subsection remains conditional on cleanup OFF.
- [ ] Each eligible section except Settings offers Main tab / More menu / Gone; Settings offers **Main tab / More menu only** and cannot be removed.
- [ ] Only Files, Remotes, Queue are default main tabs; Settings/History default to More; no Downloads in More.
- [ ] Gone hides eligible non-Settings navigation without deleting data or stopping work; Settings always remains reachable in Main or the three-dot More menu.


- [ ] Current source, generated manifest, package and actual installed Chrome extension identify **REDOWN 0.3.26** (when browser access exists).
- [ ] Settings → Customize Navigation has per-tab Main tab / More menu / Gone selector, durable choices, recovery access and Reset to Defaults.
- [ ] History can be Main / More / Gone, while Settings can only be Main / More; all choices persist across restart, theme and narrow widths.
- [ ] Original immutable 0.3.24 ancestry and all existing four Remotes cards preserved; no 0.3.25 source merge.

## FINAL ACCEPTANCE CLARIFICATION — SETTINGS PROTECTED / ZIP HOME / AGENT-NATIVE

**FINAL OWNER RULE:** The **More menu is the actual three-dot `⋯` button**. Settings → Customize Navigation offers **Main tab / More menu / Gone** for eligible sections **other than Settings**, which has ONLY **Main tab / More menu**; **Settings can never be Gone**. Reject or normalize invalid persisted `settings=gone` to `more`. Default main **Files | Remotes | Queue | ⋯**; Settings, History and other eligible sections initially in More, excluding Downloads. Gone only hides navigation, not data. Save preferences and preserve access to Settings. The always-visible **Export Complete History ZIP** belongs inside **Settings → Queue**, regardless of the 15-minute history Hide/Delete/OFF state. A History V2 toolbar shortcut is optional and must reuse the same ZIP exporter; the detailed `Export Queue History` subsection remains conditional on cleanup OFF.

**GUIDING AGENT-NATIVE PHILOSOPHY:** Human simplicity outside; machine-operable, observable and verifiable shared internal operations inside, **where practical and safe**. Prefer UI and agents exercising the same production contract. Synthetic evidence may cover 100,000 History records, 10,000 simulated queued jobs, expirations, provider outages, corrupt state, restarts and interruptions, but do not simulate real cloud uploads at impossible concurrency or claim mocks are provider proof. Keep simulation/integration/real-provider evidence distinct; preserve permissions, APIs, save engines and architecture without public privileged test endpoints.

**OWNER UX PLACEMENT OVERRIDE — 2026-11-24:** In each applicable Remotes card, keep **Login or Reconnect in the padded TOP-RIGHT** based on provider state. Put **GO TO** then **Refresh** together at the **BOTTOM-LEFT**, **LEFT-ALIGNED**, with the same spacing and functional handlers. Never put GO TO/Refresh at bottom-right. Maintain responsive fit, accurate status and all supported themes; this is a layout-only request.

**FINAL OWNER ORDER — REMOTES CARD BUTTONS:** In the **BOTTOM-LEFT** action row, display **GO TO first (left)** and **Refresh second (right)**, left-aligned, with existing functionality intact. **Login or Reconnect remains TOP-RIGHT**. This supersedes all prior reverse-order instructions. Do not move the pair to bottom-right.
