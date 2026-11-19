# Minor fix — right-click ANY eligible Explorer folder → Make Default automatically

**Status:** Requested, not yet implemented.

The user wants to **right-click any accessible Cloudflare R2 folder** in the Explorer tree or file listing and choose **Make Default**, with **no Destinations Manager trip, manual Simple entry creation, bucket/prefix forms, extra setup wizard or unnecessary confirmation**. The action should automatically make that **exact folder** the default save location by creating or reusing a **Simple-mode destination** for its exact bucket+prefix.

## One-click user behavior

1. Explorer right-click on **any folder**, including a folder that has **never been added to Destinations Manager** (and bucket root where eligible) → **Make Default**.
2. Derive the **exact normalized target** from that folder's existing authorized provider/account/connection/bucket/full prefix; do not ask the user to type it, select a mode, or repeat a known account.
3. If an exact **Simple** destination already exists, reuse it. Otherwise **automatically create one Simple destination record** for that target, without deleting other Simple/Narrow/Depth records or changing unrelated destinations.
4. Set `product.defaultTarget` to precisely this target in the **same coherent canonical config mutation/transaction** where feasible; reconcile the native right-click menu using the established safe pipeline. Ensure a real **Simple** route reaches the chosen folder, not an invented shortcut to a different prefix or a fake selected-default indicator.
5. Provide unobtrusive outcome feedback: `Default: <folder>` only **after actual save/menu readiness is verified**. If native menu application, access or background setup fails, do not report success; preserve/recover the last known-good default where possible. Retry must be idempotent and not duplicate destinations.

## API-driven without extra complexity

- Extend/reuse the **existing** `commitConfigChange`/`makeDefault` and destination configuration logic; if necessary compose `createDestination(mode: 'simple', target)` + `makeDefault(target)` into the existing atomic config change call and use one idempotency key. Prefer a single well-defined scriptable call where already supported; **no new public API, Worker architecture, second dispatcher or special-case UI-only state**.
- The existing context-menu descriptor/permission check should enable **Make Default** for any valid, authorized folder **even without a pre-existing saved Simple destination**. Do not require manually configured `Show in Chrome` or preexisting saved destination as an unnecessary prerequisite; make the exact Simple route available through the current supported menu configuration where it can be done without altering other modes.
- **No additional user interaction** for already authorized configuration changes or routine operations. Reuse the user's explicit `Make Default` click, existing account authorization and existing permitted setup capabilities. **Do not bypass genuine OAuth/provider permission requirements or silently perform a new chargeable Worker/R2 provisioning grant**; if new authorization truly is required, fail with a concise actionable reason rather than claiming one-click success. Avoid unnecessary automatic setup/approval popups.
- Do not confuse the currently displayed folder with its parent: test a deeply nested prefix and both tree and list right-click targets.

## Grounding and focused tests

- `extension/app.mjs` already renders `action('Make Default', ... change({type:'makeDefault',target:t}))` for directories, but it currently wraps it with `offerFilePreparation`, which can produce a setup dialog; the desired common case is one-click.
- `src/api/service.mjs` already has `commitConfigChange`, `makeDefault`, `saveTargets` and native menu readiness validation. The existing implementation may only infer a Simple target if certain display conditions hold: make **Simple destination creation and exact target mapping reliable** rather than dependent on a hidden preconfigured destination.
- Verify existing Simple destination, brand-new nested folder, bucket root, two same-named folders in different buckets/accounts, unauthorized folder, duplicate repeated clicks, native-apply incomplete and restart persistence. No extra full UI test matrix.

**Scope:** This affects choosing the default for future saves only; it must not upload the currently selected file, replay past save attempts, alter History or modify unrelated destinations.
