# P1 — Clean Minimal Remotes: hide selected-save setup and Save-unavailable warnings; one Cloudflare card heading

**Requested:** November 19, 2026. **Status:** Next-Codex implementation task, not yet implemented.

## Exact user-facing presentation

- The **Minimal** theme's Remotes page must remain a **simple Cloudflare login/connection page with basic existing features**. Do not render technical destination-preparation/status content in its normal view, including when a save fails or a Cloudflare/Chrome menu acknowledgment is incomplete.
- **Never show the entire "Selected save destination" section/card in Minimal**, including the selected account/bucket/prefix, errors like `NATIVE_APPLY_INCOMPLETE`, the text beginning `Preparation uses this exact bucket and folder. Cloudflare may charge...`, the button `Inspect / prepare selected destination`, and all related selected-destination preparation/authorization disclosures **inside that technical card**. This applies even if Debug Mode is enabled and after reconnect/re-render. The corresponding code should remain available to non-Minimal/authorized technical flows rather than disabling functionality.
- **Also completely remove from Minimal Remotes this exact sentence:** `Save unavailable. Review the setup options below or check History.` Do not replace it with another unsolicited "check History" setup warning. Do not show detailed code strings, account/bucket details or long repair paragraphs as substitute messaging. Basic concise login/reconnect state can remain.
- **Remove the duplicate Cloudflare heading inside the Remotes card:** currently the outer card heading is `☁ Cloudflare R2` and the inserted connection component emits a second `☁ Cloudflare` strong title below it. The user wants **ONE heading, the top `☁ Cloudflare R2` only**. Remove the inner `☁ Cloudflare` heading rather than keeping a title+subtitle hierarchy; preserve the useful connection **status** (Connected/Not connected/Signing in…) and Log in, Reconnect, Open File Explorer, Sign out, etc. This duplicate-title correction should apply throughout Remotes rendering, including Minimal, without introducing an empty heading or duplicate on subsequent refreshes.

## Grounded implementation notes

- `extension/app.mjs` `selectedSetupMarkup()` (around line 203 on the inspected branch) unconditionally builds `<div class="card" id="selected-save-setup">...`; `renderRemotes()` (around line 242) inserts `${selectedSetupMarkup()}` for every theme. **Explicitly conditionally OMIT the entire node in Minimal**, not merely its technical status span. Follow existing presentation/theme mode detection, rather than touching Cloudflare authority, storage or business logic.
- The extra warning is currently created in `renderRemotes()` as `<p class="minimal-only" role="status">Save unavailable. Review the setup options below or check History.</p>`. **Delete that content/conditional for Minimal**, not just its CSS styling. Guard comparable after-error rendering paths against reintroducing it.
- `renderRemotes()` creates `<h2>☁ Cloudflare R2</h2>` and `renderConnection()` inserts `<strong>☁ Cloudflare</strong>` in `#remotes-connection`. **Keep the outer h2, remove the nested duplicate strong**, maintaining the underlying connection controls and status.
- Keep required ordinary Cloudflare authentication, reconnect and permissions-related flows accessible through their appropriate existing supported UI, without introducing extra login or confirmation prompts. Preserve existing right-click save engine, account state and working preparation API, and do not alter History, receipts or the Worker architecture.

Additional UI-boundary reminder: `renderRemotes()` may also call `workerUpdateMarkup(cloudflareState)`, `workerFailureMarkup(cloudflareState?.diagnostic)` and `ordinarySetupReview()`. Inspect their output when Minimal is selected; if they inject the same technical preparation/repair disclosures into Minimal, **omit those from its normal Remotes rendering too** rather than reintroducing the material through a different component. Keep concise basic connection controls visible. Underlying required authorization behavior must remain functional through the proper non-Minimal/authorized flow.

## Focused acceptance

1. In Minimal Remotes: **no** `Selected save destination` card, selected bucket/account, `Inspect / prepare selected destination` button or technical `NATIVE_APPLY_INCOMPLETE` paragraph, regardless of save readiness or reconnect.
2. In Minimal Remotes: exact text `Save unavailable. Review the setup options below or check History.` is absent, including after a failed save and view refresh.
3. Remotes has **exactly one** Cloudflare heading, `☁ Cloudflare R2`, without the additional `☁ Cloudflare` title, whether signed in or signed out.
4. Sign-in, reconnect, account status, basic navigation, other existing aesthetics/technical flows, and verified right-click saves continue to work.
5. Use focused tests for these requirements; **do not add a blanket responsive/theme/aesthetic test matrix**.

**This is UI presentation cleanup, not a request to disable setup authorization when actually needed, modify cloud resources or change saved destinations.**
