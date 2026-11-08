# NEXT CODEX RUN — Click2Cloud Manage Destinations: click to select, clear, or reselect Default

**Owner request (2026-11-08):** "Click2Cloud should be able to select and reselect default by clicking it in Manage Destinations."

**Scope:** Small, precise GUI usability improvement on the existing V3+1 Default API. Do **not** refactor onboarding, providers, menu engines or cloud transfer infrastructure for this.

## Current observed behavior (source: main 654af73)

- `extension/app.mjs:manager()` shows a **Make Default** button on destinations that are *not* Default. Clicking it invokes `change({type:'makeDefault',target:d.target})`.
- The currently selected Default shows a static **Default** badge instead of a clickable control. Therefore it cannot be deselected in Manage Destinations; Settings separately exposes **Remove Default Location**.
- `src/api/config.mjs` already supports `makeDefault` and `clearDefault`; `src/api/service.mjs` runs these via existing trusted `commitConfigChange`. Reuse this exact API and native menu reconciliation. No duplicate settings store or shadow default.

## Required exact GUI behavior

1. **Click a saved location row (or its clearly labeled selection control) in Manage Destinations** → it becomes the one active **Default** immediately after the API commit/native menu reconciliation succeeds. Show visible selected styling, a checkmark/star/radio-like indicator and the accessible name **Default destination: [label]**.
2. **Click the SAME selected Default again** → explicitly clear the Default using canonical `clearDefault`. Show **No default selected** and return the row to unselected styling. No deletion, disconnection, bucket mutation or reauth. Ensure any existing platform fallback semantics remain truthful and do not secretly reset to `redown`.
3. **Click a DIFFERENT saved location** → replace the previous Default atomically through `makeDefault`; previous row instantly loses its selected styling and new row gains it. Do not make user first clear the old Default.
4. All configured locations in **Simple, Narrow and Depth** Manager tabs may select the exact saved target, including a location in a different supported account. A destination's *saved configuration* and its *current transfer readiness* are separate facts; if disconnected, allow local Default configuration to persist where existing API permits but **do not** imply the cloud is Ready to Save.
5. Row click targets MUST NOT swallow edit, hide, Quick Select, remove, pagination or tab interactions. Accessible keyboard Enter/Space and tab focus must perform the same toggle; focus position, page and dialog scroll stay stable. Do not force a popup, additional confirmation or extra Save click for changing Default.
6. UI visibly displays the currently selected Default even when it is on a different Manager tab/page. If the Default points to an existing saved destination not present in current filter, show its exact current path/account in the Manager header, not a false claim that there is no Default.
7. Persist and reconcile Native Chrome right-click menu **using the existing canonical V3+1 compiler/registrar/ACK**; a Default change must affect the actual save choice as documented and must never select a wrong account, bucket, or folder. Existing contextual **Make Default** and Settings **Remove Default Location** remain consistent with the Manager.
8. Never destroy user destinations, settings, Quick Selects, explicit deleted-`redown` intent, Cloudflare approval records, credentials or History. Default is a pointer to an exact authorized target, not a separate bucket or new destination.
9. If an API commit/native ACK fails, maintain truthful UI and error states: don't display a new Default as fully applied when it is not. Recover/reinspect reliably rather than letting the row silently lie.

## Regression acceptance

- Manager: no Default → click A → A is Default → click A again → no Default → click B → B is Default → click A → A is Default; no extra confirmation.
- Cross tabs/pages/accounts: selecting A then B never leaves multiple Default indications; exact account/bucket/prefix survives reload, logout/reconnect, Chrome restart and service-worker restart.
- Confirm the actual native menu after each change and use a real verified save to prove correct routing when account and Worker are ready; do not call fixture ACK a live pass.
- Click edit/delete/hide/Quick/Pagination does **not** accidentally toggle Default; keyboard controls work.
- Confirm no automatic `redown` recreation, no OAuth or Worker setup from merely toggling Default, no additional `· Set up` native labels, and no bypass of `commitConfigChange` auth/revision validation.
- Update CURRENT behavior documentation and focused tests; preserve immutable baselines.

**User experience:** Open **Manage Destinations → click desired destination → Default set.** Click another to switch. Click selected destination again to clear. **No extra step.**

**NO BLOAT · ONE DEFAULT · ONE EXISTING API · NO DATA LOSS · RIGHT-CLICK SAVES TO THE EXACT USER CHOICE.**
