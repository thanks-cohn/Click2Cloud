# Codex: quiet screenshots + Minimal as true base UI, color/font-only styling experiment

**Owner request, November 20, 2026. Execute on this dedicated experimental branch.**
Branch: \`codex/minimal-baseline-palette-fonts-quiet-screenshots-2026-11-20\`.
Base: the verified screenshot-repair branch HEAD \`6b91b750c3a2b972e9dfc83588ef430cf81fd377\`.
**Do not change the working repair branch or main. Keep exact screenshot upload code, OAuth and save engine unaffected.**

## Outcome

1. The user does NOT want permanent system notifications every time a screenshot is taken. A successful Alt+Q or Ctrl+Shift+Y should not create a Windows/Chrome desktop notification; neither should ordinary retry outcomes. History and unobtrusive in-app status must still work.
2. The user wants a new experimental UI architecture in which the **Minimal interface itself is the baseline structure**. CSS must NOT build "Minimal" as a secondary theme layered over a bigger UI. Instead CSS/presentation tokens should primarily provide **color schemes and font choices**, applied to the same minimal baseline layout. No full theme changes to component layout, spacing architecture, content visibility, menu structure or feature accessibility just because a palette changes.
3. Show real before/after browser visual evidence and functional test results. The user wants a practical, simpler UX rather than an abstract aesthetic framework.

## A. Notification fix (first and smallest task)

Existing source: \`extension/screenshot-background.mjs\`, in the \`notify(job,{recorded})\` callback. After \`send({channel:'screenshot-result',...})\`, it **unconditionally invokes \`chrome.notifications.create('screenshot-'+job.plan.operationId,...)\`** for every completed screenshot, whether verified, failed or partial.

- Stop unsolicited persistent OS notifications for screenshot successes and routine screenshot failures, including retries. **Default screenshot desktop notifications: OFF.** History is the source of record; the existing Shelf/in-app screenshot status may present concise nonblocking transient feedback.
- A small OPTIONAL setting \`Desktop screenshot notifications\` may be offered, OFF by default, if simple enough; don't let that preference stall the basic change. An opted-in behavior should be clearly labeled and not force persistent notifications by default. No duplicate notification per output. No timers/notification-clearing hacks that depend on an MV3 worker staying awake.
- Keep any other existing non-screenshot notifications alone unless clearly demonstrated to be the same bug. Don't remove \`notifications\` from the manifest unless a repo-wide usage search proves it's unused.
- A screenshot still captures, uploads, retries, updates History and maintains independent verified receipts exactly as before, whether the Shelf is closed or open.
- Add tests: default no chrome.notifications.create after successful, blocked, failed or retried screenshot; existing screenshot-result and History events remain; opt-in behavior tested if included.

## B. Minimal structure must be the bottom/base UI, not CSS "making Minimal"

Review exact source:
- \`src/aesthetic/host.mjs\`: currently defaults to high-polish in restore(), paints Minimal by inheriting highPolish tokens plus minimal overrides. The API also permits geometry/spacing/visibility tokens.
- \`src/aesthetic/packages.mjs\`: highPolish and minimal packages both specify layout geometry and typography; Minimal has visibility.hide rules.
- \`extension/aesthetic.css\`: currently applies layout/spacing/card borders/shadows/brand structure and visibility rules based on data-aesthetic, and Minimal-specific exceptions.
- \`extension/app.css\`: existing foundational styles.
- \`extension/app.mjs\`: currently uses \`isMinimal()\` to change error text and status behavior, and Settings Appearance selects three structural themes with a palette picker limited to high-polish.
- \`tests/aesthetic.test.mjs\`: existing theme behavior tests, to update rather than silently weaken.

Implement in this separate branch:
1. Move the **Minimal structural layout** into a single stable baseline component/layout CSS and markup. It must render correctly without \`data-aesthetic=minimal\` selectors. The user should see a tidy, clean Minimal surface even when no optional skin stylesheet loads.
2. The presentation customization should influence **colors and typography**, not layout composition. Define a small CSS variable contract (background/surface/text/muted/border/accent/selection/focus plus font family, optionally weight/size if the user changes those). Palette choice should NOT modify visibility, navigation items, page arrangement, spacing hierarchy, action positions, Worker setup behavior or cloud functionality.
3. Keep the five familiar palette options—Original Rose, Ocean Blue, Emerald Forest, Amethyst, Sunset Amber—with proper light/dark variants. Add a straightforward **Font** selector using available system font stacks; no external font fetching, no bundled font files, no new web fonts required. Persist palette/font separately. Include readable preview or immediately visible result.
4. Fresh install default is Minimal structure, with a sensible default palette/font. Existing users' screenshot rules, OAuth, Cloudflare destinations, History, debug settings and saved preferences survive branch reload. Do not reset \`chrome.storage\` or silently discard already selected colors; use deliberate compatibility/migration logic for prior aesthetic preferences, with deterministic behavior and tests.
5. Remove special Minimal-only behavior gates that hide genuinely useful actions, diagnostic availability, labels or controls. If dense technical explanation should normally stay out of sight, use a user-invoked disclosure rather than a theme-dependent data-aesthetic selector. Never conflate a color palette with a debug/functional permission.
6. Bit o' Polish and Remote V1 remain intact on **the original repair branch**. This is an alternate experimental *branch*, not an irreversible migration of main. Do not import old theme-specific geometry back into the new Minimal baseline.
7. Keep user interaction responsive at compact and desktop widths, in light/dark mode, with focus/keyboard accessibility. No horizontal overflow, hidden Save buttons, broken select controls, or palette-induced layout jumps.

## C. Prove no save regressions

Do not touch screenshot transfer logic unless a focused test proves required. After the visual work, run:
- \`npm run build:extension\`
- Focused screenshot capture/rules and History/receipts tests
- Aesthetic tests covering default Minimal, palette persistence, font persistence, and no palette-driven DOM/geometry changes
- Existing Simple/Narrow/Depth save regression tests
- Real installed Chrome browser smoke where runnable, with the screenshot local HTTPS R2 fixture; distinguish fixtures from live R2.

Acceptance:
- Press Alt+Q on a normal HTTPS page: screenshot saves to exact configured R2 key, same R2 GET/SHA-256 verified receipt, **zero unsolicited desktop notification**.
- Ctrl+Shift+Y same. Retry only unresolved outputs, no new popups or duplicate files.
- Startup and all palette choices have same Minimal layout/visible controls; switching colors or fonts doesn't replace/remount the main interface or alter save behavior.
- Works on a fresh profile and after reloading the user's existing profile; no accidental theme or screenshot settings loss.
- Branch commit + changelog + screenshots or browser evidence, and precise installed test steps. No claim of live Cloudflare success unless actually observed.

## Codex execution and delivery

Make the actual source changes on this branch, not merely a report. Commit and push. Report exact files, commit SHA, tests and failures. Provide a working built extension artifact or unambiguous build commands. Don't merge to main or replace the known working screenshot repair branch without owner approval. **Prioritize fixing the notification spam immediately, then the separate Minimal-first palette/font experiment.**
