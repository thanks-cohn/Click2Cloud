# Depth V3+1 — Source map and preservation checklist

**Codex must begin here.** The full original source copies are in `reference/`. They are **not** the finished V3+1 engine.

| Baseline | Where | Responsibilities |
|---|---|---|
| Extracted Depth | `reference/depth-v3-original.mjs` | Original V3 folder discovery, level projection, exact menu IDs and routes |
| CURRENT & journal | `reference/current-v3-original.js` | Old IndexedDB records, journal, pointers, backups and transaction semantics; **contains mixed-mode fields and must not be imported into new Depth** |
| Full REDOWN V3 | [extension/right-click-v3.js](https://github.com/thanks-cohn/REDOWN/blob/main/extension/right-click-v3.js) | Around lines 68–190: `roots`, `inventoryKey`, `discover`, `levelProjection`; around 228–269: old combined `project`/`resolve` coupling to reject |
| Provider listing | [extension/background.js](https://github.com/thanks-cohn/REDOWN/blob/main/extension/background.js) | ~1478 `listObjectsPage` (provider query, delimiter and pagination) |
| Transactions | same source | ~2173–2245 `v3MenuTransaction`, `commitV3Current`, `restoreDurableV3` (study; split ownership) |
| Refresh and click | same source | ~2355–2420 `refreshV3Inventory`, resolver; old depth-bounded index to replace |
| Native registration | same source | ~2520–2620 `buildMenus` and native callbacks; place only in neutral registrar |
| Setup UI | [extension/beta/right-click-v3-ui.js](https://github.com/thanks-cohn/REDOWN/blob/main/extension/beta/right-click-v3-ui.js) | ~21–54 scope picker and ~67–107 Depth 1–10 control |
| REDOWN tests | [tests/right-click-v3.test.mjs](https://github.com/thanks-cohn/REDOWN/blob/main/tests/right-click-v3.test.mjs) | ~195–336 Level parity; ~435–513 CURRENT/restore |
| Owner's CURRENT-first rules | [NEED_TO_DO/fundamentals.md](https://github.com/thanks-cohn/REDOWN/blob/main/NEED_TO_DO/fundamentals.md) | Never discard known branches, true delta commits, Day/Week/Off |
| Full directory contract | [P0 persistent-tree work](https://github.com/thanks-cohn/REDOWN/blob/main/FOREVER_WORKS/v3/P0_PERSISTENT_RIGHT_CLICK_TREE_WORK_REQUEST.md) | Targeted repair, historical restore points, no repeated global reset |

## Two non-negotiable differences from V3

**Old:** V3 `inventoryKey` and discovery are coupled to the **visible menu depth**. It stops collecting deeper folders when display is 1–10. **New:** Depth inventory independently discovers the *full reachable authorized* hierarchy with bounded resumable jobs. A menu depth is **only a pure presentation filter**.

**Old:** Combined V3 `project/resolve` borrows Simple default and other mode logic. **New:** Depth owns only Depth state and outputs finished descriptors; the neutral registrar owns global ROOT/provider composition. Never import Simple, Narrow, Time Machine or their private state into Depth.

Keep original source/test goldens intact. Never claim a basic unit reference demonstrates Chrome native or real cloud parity.
