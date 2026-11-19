# CODEX IMPLEMENTATION REQUEST — MAKE PORTABLE MENU MANIFESTS REAL
## Click2Cloud: Settings → Export Menu Manifest / Import Menu Manifest; restore real Simple, Narrow and Depth right-click destinations without rebuilding them

**Owner request:** Implement a working feature **in this next Codex run**, not just another concept/draft.  
**Current GitHub repository:** `thanks-cohn/Click2Cloud`  
**Source baseline:** `fix/narrow-bucket-speed-depth-2026-11-14`, whose **protected PRE-MANIFEST tag** `click2cloud-rightclick-v3-pre-manifest-2026-11-14` points to `e8a2463db27568a02b9b8b12d56efc4a550c55c6`.  
**Earlier immutable working checkpoint:** `click2cloud-rightclick-v3-live-verified-2026-11-14` → `156ed15c0de5afe3c6d59f4a635db23962ab8600` (original 37/37 installed Chrome/R2 destination tests).  
**Implementation discipline:** Create a **new implementation/review branch** from current request-bearing HEAD. Do not rewrite, move, force-push or delete protected tags. Do not push or merge without the owner's explicit authorization.

### The owner’s product requirement (read this first)

**This has one practical purpose: the owner must NEVER have to manually recreate dozens of configured right-click locations after changing a computer, Chrome profile or extension installation.** They should be able to click **Export Menu Manifest** in **normal Settings**, keep a local file, then click **Import Menu Manifest** and restore the same Simple/Narrow/Depth menu design and *its real cloud destinations* once the appropriate account is authorized. Do not deliver only a JSON preview, a partial backend scaffold, a developer-only command, or a Debug-only feature. Make the full end-user path work in the shipped Chrome MV3 extension.

**Both buttons MUST be visible, accessible and usable from Settings with Debug Mode OFF.** These are ordinary product settings, independent of Flight Recorder, Glaciaring, Debug, developer tools and any debug-enabled preference. Import/Export must not start or stop forensic recording and cannot require turning on Debug. Keep existing Settings, right-click, Recovery, and Debug sections intact.

**Definition of success in one line:**
`Settings → Export Menu Manifest → choose and save file → Settings → Import Menu Manifest → inspect preview → safely bind existing cloud locations, optionally create explicitly authorized missing ones → Apply → native right-click menu restored → real save to exact target works.`

This request implements the owner's design stored under `/portable-futures/Click2Cloud_Portable_Menu_Manifest_Export_Import_Activation_Draft.md` in their ChatGPT Library. That Library file is conceptual, may not be mounted in Codex, and must not be a dependency: **the authoritative complete requirements appear below.** The original proposed V1/V2/V3 sequence is superseded for this run: **local export + local import + actual binding + owner-approved missing-location creation all belong in THIS implementation**. Cloud-hosted template galleries, public sharing, import-by-URL and cross-device auto-sync remain future work.

# Gate 0 — Audit real source, make a protected baseline, establish logic2real gap

Read before edits: `AGENTS.md`, `latest/right-click-rules/ENGINE-AND-API-DOCUMENTATION.md`, `11.2026/workings/right-click-workings.json`, current `src/api/config.mjs`, `src/api/service.mjs`, `src/persistence/current-store.mjs`, `src/modes/{simple,nested,depth}/index.mjs`, `src/core/menu-spec.mjs`, `src/core/menu-identity.mjs`, `src/chrome/registrar.mjs`, `extension/app.mjs`, `extension/background.mjs`, and existing Cloudflare R2 inventory/provisioning/transport owners. Inspect applicable tests before designing new code.

Specific verified source facts at request-writing time (recheck current code):
- `extension/app.mjs:renderSettings` builds the **ordinary Settings page**, currently with Right-click menu/Recovery sections and an appended **Debug** card; the debug card separately hides `#debug-details`. Insert the two product buttons under **Settings → Right-click menu → Portable menu manifests** (or an immediately adjacent clearly labeled Settings card), **outside** any Debug element/condition.
- `src/api/config.mjs` owns product state, `configs.simple.destinations`, `configs.nested.destinations` (user-facing **Narrow**), `configs.depth.scopes`, display settings, Quick/Default and mutations. This structure includes IDs, custom per-level labels/hidden flags, order, visibility and exact physical target.
- `src/core/menu-identity.mjs` distinguishes a physical destination `provider + connectionId + accountId + bucketName + prefix` from a visual presentation. Export/import must preserve this distinction.
- `src/api/service.mjs` has typed `3+1.1` methods `getConfiguration`, `previewConfigChange`, `commitConfigChange`, `listAuthorizedBuckets`, `listFolders`, `inspectNativeACK`, etc., and currently rejects newly configured targets it has not discovered. **Do not bypass this check to force imports.** Design a proper, minimal import+binding+provision workflow that fits the existing canonical API ownership.
- `src/persistence/current-store.mjs` protects established CURRENT against data loss and supports durable transactional changes. **Never interpret a missing/corrupt CURRENT record as empty and then overwrite it with a manifest.**
- Existing recovery/profile backup is **NOT** the same thing as a portable menu manifest. Do not repurpose encrypted profile backups as the user-facing JSON format or require Chrome-closed filesystem copies.

Before touching implementation: record branch/HEAD/tag/dirty status; generated expected menu tree; CURRENT schema/revisions; existing menu export/import (if any); actual Settings visibility with Debug OFF; and native/remote evidence limitations. Add a before/after matrix: **source behavior, expected product behavior, test proof class, and remaining logic2real discrepancy**. Benchmark startup or menu effects as needed. Do not confuse a concept document with implemented behavior.

# Gate A — The TWO production Settings buttons (mandatory)

Place a clearly labeled ordinary Settings card near the Right-click menu controls:

~~~text
Settings
  Right-click menu
    [existing provider visibility settings...]

  Portable menu manifests
    Save your Simple, Narrow and Depth destinations and restore them later.
    [ Export Menu Manifest ]    [ Import Menu Manifest ]
    No Debug Mode required.
~~~

**Export Menu Manifest**:
1. Works when Debug is OFF; from the normal Shelf Settings UI. It must be directly discoverable without enabling Flight Recorder, opening Diagnose, or invoking DevTools.
2. Read the **real persisted canonical configuration** (not just currently visible Chrome rows; not a fresh reconstructed default). Include every configured Simple/Narrow/Depth entry by default, including intentionally hidden entries and mode show flags: the purpose is **complete personal restoration**. Clearly preview/count visible and hidden entries; user may optionally select a subset. Do not drop hidden, disabled/offline, same-target-but-different-presentation routes.
3. **Default format: "Personal Restore Manifest"**. Preserve exact physical *nonsecret* bucket names and relative prefixes and sufficiently specific nonsecret account/connection matching hints to relink the user's own authenticated Cloudflare account automatically when unambiguous. This is critical: a portable anonymous blueprint alone would force manual reconstruction. Warn that exported folder/bucket names can be private, and let the user choose the path/filename and save locally.
4. Optional **"Shareable Blueprint"** mode strips actual account identifiers, real bucket/path names where private, and substitutes logical aliases; import requires explicit mapping. It must not silently use somebody else's cloud account.
5. Preserve user-visible custom Narrow level labels, visibilityMode `all/hide-all/custom`, per-level hidden settings, distinct presentation identities/duplicate target routes, route label, order, hidden eye, Quick selections, selected Default, provider-visibility flags, mode checkmarks including Flat, Depth selected buckets and per-bucket maxDepth, and relevant menu placement/configuration choices. Distinguish a configured route from the automatically discovered Depth inventory.
6. Write a valid, versioned, strictly schema-checked **.json** via Chrome-supported local download/save. Report the actual outcome truthfully; a user cancelling file selection is not a successful export. Local data leaves the device only when the user expressly chooses a future upload (NOT part of this release).
7. Export **NO** OAuth access/refresh tokens, Cloudflare API secrets, Worker signing material, private setup approval/authorization ledgers, native context-menu IDs/ACK/generation, recorder flight logs, user browsing/source URLs, file contents, or remote object listings. Exact bucket/path hints in a *personal* manifest are data to protect, not credentials or authorization.

**Import Menu Manifest**:
1. Works when Debug is OFF, including when no cloud account is connected. Accept a user-chosen local `.json` file with ordinary file input or the browser-supported file picker. No network URL import and no public server upload.
2. Parsing/validation is local, non-executing and bounded; invalid/malicious files cannot affect CURRENT, remote cloud or the native menu. Show a **read-only import preview**, counts of Simple/Narrow/Depth, real/custom labels, physical hints, mode flags, default/Quick and existing-vs-imported changes.
3. Let the user choose **Add alongside / Skip identical / Replace explicitly selected entries** with nondestructive Add+Skip as default. Do not silently clear an existing Default, destroy separately configured Narrow presentations, change provider visibility, or delete existing destinations. A personal **Restore this saved menu** path may offer an **explicit full replacement** after a precise destructive-local-diff warning, checkpoint and owner confirmation. Remote cloud files are never deleted by local replacement.
4. Keep pending import state as a **separate durable draft**, not as fake authoritative CURRENT destinations or active native save rows; preserve it across Shelf close/restart so an interrupted import resumes without reselecting the file. It must be clearly distinguishable from existing Recovery/profile backup and must not masquerade as a verified restoration point. Allow Cancel / Discard pending draft without changing the current live menu.
5. If CURRENT is unavailable/corrupt, block any overwriting import-commit and offer the existing recovery workflow; do not silently treat missing source as first installation or "empty menu".

**Zero-debug acceptance:** With `debugPreference.enabled===false` and `#debug-details` hidden, both buttons are visible, keyboard accessible, invoke real handlers, produce usable files/import previews, and can complete restoration. Toggling Debug has no effect on these two controls or their authorization. Test cold boot/reopen and offline export.

# Gate B — Concrete versioned schema and exact round trip

Build small isolated modules such as `src/manifest/schema.mjs`, `export.mjs`, `import-plan.mjs`, `binding.mjs` (actual names may differ), with strict versioned validation and transformation to/from existing canonical configurations.

A conceptual shape (final implementable schema may differ):

~~~json
{
  "kind": "click2cloud.menu-manifest",
  "schemaVersion": 1,
  "purpose": "personal-restore",
  "exportedProductVersion": "0.3.19",
  "providerBindings": [
    {
      "slot": "r2-primary",
      "provider": "cloudflare",
      "preferredAccountHint": "nonsecret-original-account-identity",
      "preferredConnectionHint": "nonsecret-original-connection-identity",
      "bucketName": "click2cloud-qa"
    }
  ],
  "show": {"simple": true, "nested": true, "depth": true, "flat": false},
  "providerVisibility": {"cloudflare": true, "google-drive": true, "dropbox": true, "onedrive": true},
  "simple": [
    {"id": "portable-route-1", "bindingSlot": "r2-primary", "prefix": "C2C-QA/Simple/A/", "label": "Simple A", "hidden": false, "quick": false, "order": 0}
  ],
  "narrow": [
    {
      "id": "portable-presentation-1",
      "bindingSlot": "r2-primary",
      "prefix": "C2C-QA/Narrow/A/",
      "label": "A",
      "visibilityMode": "all",
      "levels": [{"prefix": "C2C-QA/", "label": "C2C-QA", "hidden": false}],
      "hidden": false,
      "quick": false,
      "order": 1
    }
  ],
  "depth": [
    {"bindingSlot": "r2-primary", "bucketName": "click2cloud-qa", "maxDepth": 5, "hidden": false}
  ],
  "preferences": {"defaultRouteId": null, "modePresentationFlags": {}}
}
~~~

**This is illustrative only.** In particular, the final schema MUST distinguish **each physical bucket** and provider connection as its own binding slot, and support many accounts/buckets with correct route-to-bucket association. Avoid an example mistake where a single slot would imply every route is in one bucket. Do not treat imported IDs as locally authoritative/native Chrome IDs; remap IDs deterministically or preserve safe unconflicted menu identities through the canonical transactional writer.

Export → Import to same authorized profile/account must reproduce the original user-visible menu tree and exact physical destinations **without re-entering 37 targets**. On a new profile/account, require interactive OAuth login if needed, auto-match only when verified and unambiguous, and present targeted mapping only for unmatched bucket/connection slots. Preserve independent presentations sharing one physical prefix. Depth must refresh **real** folder inventory on the new device, not trust exported stale inventory.

Test personal round trips, shareable alias-only imports, Unicode/whitespace/punctuation in legal prefixes, two QA buckets with identical prefixes, two accounts with similarly named buckets, different connections, hidden/Quick/Default/Flat, multiple narrow presentations at same key, old-schema rejection/migration, and no secret leakage. Import must never silently select a different account because its bucket has the same name.

# Gate C — **FIRST wire existing real locations** (zero provisioning)

Once preview is staged, the import wizard should try **read-only** to bind each desired location to a currently authorized Cloudflare connection, actual bucket and exact prefix:
- Same-account + same-bucket + identical prefix gets priority only after the identity and access are verified; never use a filename/menu label as authority.
- If several accounts could match, ask **Which connected account?** and show the actual scope. If the target bucket is absent in the selected account, report missing bucket. If account not connected, report needs login rather than "missing". If enumeration/permission fails, report UNKNOWN/NO_PERMISSION rather than "does not exist".
- For R2, a folder is generally a virtual **object-key prefix**. A prefix that currently contains no objects is NOT evidence that the path is invalid; display **valid logical prefix, not materialized**, separately from missing bucket and missing exact write capability. A configured path may become observable when a later save creates an object; do not falsely claim a materialized folder was provisioned.
- Prove exact current capabilities for every bound route and newly offered Narrow ancestor `Save here`: permission on a child does not grant permission on root; broader authority may not be assumed. Worker/session/transport readiness is distinct from bucket existence.
- Present a concise status table: **Existing + ready**, **Existing but needs login/permission/Worker**, **Bucket missing**, **Virtual prefix not yet materialized**, **Ambiguous mapping**, **Not checked/unknown**, **Not supported**. Every item has an exact physical provider/account/bucket/prefix preview and a safe next action.
- If all mapped targets are genuinely ready, **Apply imported menu** performs an explicit, durable local config commit and reconciles the one native Chrome menu. No remote buckets/folders are created. The user can immediately save to the restored locations.
- A user may need to reconnect Cloudflare once on a new Chrome profile; that is expected and is not license to reconstruct all locations manually.
- Do not synchronously scan entire R2 buckets or block Settings startup while analyzing a manifest; use bounded/paged/cancellable reads and show incomplete inventory honestly.

# Gate D — Exact owner-confirmed missing-location decision flow

**This conditional sequence is required UI behavior and required tested business logic, not documentation filler. The owner's single informed “YES, create missing cloud locations and fulfill the original manifest” is itself explicit consent for the exact listed cloud creations. Do NOT add a redundant second confirmation screen. Provider OAuth/API privileges are distinct from the user's consent; ask for a provider grant only where the account genuinely lacks the technical authorization.**

After binding existing locations, **if not all required manifest destinations can be verified as present/ready**, display a comprehensible summary and these user choices:

~~~text
Some manifest locations could not be matched or verified.
  Ready existing matches: 23
  Missing / unmaterialized / unresolved: 14

Before the decision, show a readable exact creation plan, selected account,
resource names, costs/side effects, and distinctly blocked unknown/unauthorized
items. The YES choice below authorizes the listed feasible writes.

Maintain a partial implementation?             [Yes] [No]

  YES:
    Activate only the existing, verified, authorized matches.
    Preserve the rest in a clearly labeled Pending/Unbound import draft
    so the exact original desired menu can be completed later.
    Never install missing/unverified entries as clickable native save actions.

  NO:
    Create missing cloud locations and fulfill the original manifest?
                                                  [Yes] [No]

      YES:
        This explicit YES approves the exact cloud creation plan already shown:
          - actual missing R2 buckets and chosen account
          - virtual prefixes to be used and whether marker objects are needed
          - permission/Worker readiness requirements and scope
          - potential charges/irreversible cloud effects
        Begin the authorized, feasible creations immediately; do NOT ask
        a redundant second YES/NO confirmation or one prompt per location.
        Verify each created location independently. If current Cloudflare
        OAuth/API authority is insufficient, request the required provider
        authorization rather than misrepresenting consent as API access.
        Bind all completed targets and apply the complete imported menu ONLY
        if every required target has verified authority/readiness.
        On partial creation failure, keep imported draft pending and report
        exactly which remote resources exist; never silently roll them back.

      NO:
        Cancel activation. Existing live configuration/menu remain unchanged.
        Keep/discard the unapplied draft as the user chooses.
~~~

**Nuances required for correctness:**
- A location with **permission denied**, disconnected provider, Worker unready or unresolved account identity cannot be "created" to circumvent authorization. Show appropriate blocking remedy/reconnect. Missing unknown != confirmed nonexistent. Do not misclassify them simply to get through the YES/NO wizard.
- **Creating missing R2 buckets** is a cloud provisioning operation authorized by the owner's informed YES to the specific reviewed creation plan; the manifest file alone is never authorization. Show scope/billing/correct-account impact BEFORE that YES; no repeat consent prompt for the same unchanged plan. Recheck existence immediately before create and reconcile provider timeout/uncertain outcomes read-only instead of blind retry. Do not create `redown` or a default as a fallback for imported targets.
- **Creating R2 directory locations:** directories are virtual prefixes. If a prefix does not yet have objects, use the normalized desired prefix for future saves; only materialize a visible **empty-folder marker object** when that specific write and effect are disclosed in the creation plan accepted by the owner's YES and the existing canonical provider API supports it. Do not claim a real physical directory was created just because a logical prefix string exists. Preserve exact prefixes and trailing-slash semantics.
- If a Cloudflare Worker/signing scope needs authorized preparation, route it through existing approved setup/repair owners; the creation-plan YES is not itself a Cloudflare OAuth grant or an authorization to deploy arbitrary Worker code. Respect existing durable approvals and request any genuinely distinct provider grant or security-sensitive setup consent only where required, rather than showing duplicate confirmations for the approved resource list.
- Support **idempotent resume** of interrupted create-plan operations. Never duplicate billable buckets or marker objects; uncertain writes remain uncertain until verified. Persist only safe approval/progress metadata (no token/secret in manifest). Remote provisioning is not transactionally reversible; never delete remotely created resources automatically on local rollback.
- This request *does* demand a real implementation path for the user's **Create missing locations? YES** choice when provider capabilities and explicit account authorization permit it. If the existing API lacks a permissioned R2 bucket-create or marker-create method, implement a minimal bounded, typed, consent-gated capability in its canonical owner. Do **not** replace this path with a stub while claiming the feature is complete. If a provider truly cannot support creation under current grants, show honest BLOCKED with reason, not fabricated success.
- Show the exact provider/account-scoped plan BEFORE the creation choice. One informed YES to 'Create missing cloud locations and fulfill the original manifest?' approves the entire feasible listed plan: no second approval dialog and no per-folder repetition. If the plan materially changes, show the changed plan and ask again; unrelated OAuth/API grants may still be necessary.

# Gate E — Safe, atomic, idempotent local activation (do not lose the original menu)

The existing `commitConfigChange` currently validates newly created targets against discovered inventory and is not an unrestricted "replace everything" endpoint. Do not loosen that gate globally.

Implement a strictly scoped typed API for `previewMenuManifest` / `inspectManifestBindings` / `commitMenuManifest` and narrowly scoped explicit missing-location provisioning as needed (exact names can differ), using the same engine, authorize/confirm callbacks, `CURRENT` transaction integrity, configuration revision, idempotency and native registrar. The GUI must use the canonical typed API, not write IndexedDB or cloud directly to bypass it.

- **Preview** is side-effect-free and may run without cloud authorization. A staged manifest is not live configuration. No current menu mutation before explicit final Apply.
- **Commit** re-reads CURRENT and live account proof, verifies a one-use preview/plan token, expected revision, mapping, route readiness, conflict choices and user authorization. It atomically writes the relevant validated Simple/Narrow/Depth configs + relevant display/Quick/Default preferences in one CURRENT state transition, not an unsafe series of independent per-row saves that can leave half the menu installed.
- **Add/skip/replace** preserve existing entries and Default unless explicitly approved. If a target/presentation already exists, don't silently duplicate on repeated imports. Separately configured Narrow presentations with the same physical target can coexist when their presentation identities differ. Preserve order, labels, show flags and hidden status. Avoid generating permanent IDs from a remote file path alone.
- **After commit**, run canonical compilation and Chrome menu reconciliation; show CONFIGURATION SAVED separately from NATIVE ACKNOWLEDGED, and both separately from R2 SAVE VERIFIED. An incomplete native ACK must not erase configuration or report installed success. Retain recovery action for later reconcile.
- **Partial choice:** commit only ready matched routes; retain unmatched routes/depth bucket intentions as separate pending draft and show counts. Do not create fake account/bucket targets and do not grant authority by synthesizing "READY".
- **Undo before Apply** simply discards draft. **Undo after Apply** restores the previous local configuration only through a user-confirmed validated checkpoint and current revision; don't blindly overwrite concurrent user edits and never delete cloud objects.
- **After account loss/revocation**, retain saved menu intent/configuration but disable ineligible save actions rather than erasing them; reauthorization restores actionability after proof.
- **Failure-proof:** crash during staging, import, remote creation or commit; stale revision; tabs concurrently modifying destinations; quota/IndexedDB errors; interrupted Chrome ACK; account switch; OAuth revocation; same manifest imported twice—all must leave previously saved configurations intact or provide truthful, recoverable partial state.
- No unexpected network calls on ordinary right-click, startup, Settings visit or Export; heavyweight binding checks happen only after user imports or explicitly refreshes readiness.

# Gate F — Acceptance proof: owner can restore the existing 37-destination test layout

Create a realistic SAFE fixture mirroring the owner's already-known test hierarchy across two buckets:
- `click2cloud-qa` and `click2cloud-qa-2`
- Simple 6 A/B/C locations, Narrow 6 A/B/C locations
- Depth 25 selected locations including 5-level chain + 14 sibling locations (do not forge a live listing; fixture only)
- Distinct custom Narrow titles for second bucket (e.g. `C2C-QA2/Narrow/A`) still map to physical `C2C-QA/Narrow/A/`
- Root and ancestor `Save here` behavior separately permission checked.
- Preserve mode display state, hidden entries, separate same-target presentations, Default and Quick.

**True export/import test:** Populate canonical config, export through Settings using Debug OFF, import in a **clean isolated fixture/profile** (not by wiping owner's actual Chrome profile), reconnect/mock authorized Cloudflare, prove binding to the correct bucket/prefix, apply and inspect deterministic native `parentId` tree and real action resolver. Repeat import and ensure no duplicate routes, no Default loss and no unexpected R2 writes.

**Remote case matrix:**
1. All destinations exist/readable + authorized: **zero cloud creations**, exact menu restored.
2. Some missing; partial YES: only verified routes active, missing routes pending and resumable.
3. Some missing; partial NO, create NO: existing active menu unchanged.
4. Some missing; partial NO, create YES: **actual provider-owner cloud creation** under exact user approval, independent readback, complete activation if verified.
5. Creation partially fails or times out: created resources reported, no blind retry; local menu/draft recoverable.
6. Missing root with child-like labels, two accounts same-named bucket, incorrect Worker prefix scope, unknown inventory, provider disconnected: no guessed binding/provisioning.
7. R2 virtual prefix absent with no objects: properly distinguish valid unmaterialized prefix from truly missing bucket; optional marker writes must be expressly listed in the creation plan approved with the single YES.
8. Signed/authorized exact-target save via one restored Simple, Narrow leaf, Narrow permitted `Save here`, Depth folder action. Verify physical key and operation/provenance metadata in realistic integration; **LIVE R2** only when genuinely exercised with owner approval.
9. Imported malicious/oversized JSON, traversal, duplicate IDs, stale schema, injected script labels, secrets, denied permissions, stale generation/revision, simultaneous imported sessions and canceled picker: reject safely and preserve original user settings.
10. **With Debug OFF**, regular Settings exposes both actual buttons and performs export/import independently of recorder. Accessibility: keyboard focus, read-only diff, progress, cancellation and clear status.

Run `npm run build:extension`, `npm run test:focused`, `npm test` and targeted manifest/native/provider tests **sequentially** (prior parallel suites collided in diagnostic ZIP output). If running real Chrome MV3 and user-authorized live QA buckets isn't possible, clearly report those cases NOT VERIFIED—never pass a local Workerd fixture off as installed Chrome/R2 evidence. Keep previously working 37/37 semantics and protected milestone intact.

# Gate G — Handoff, code quality, and owner's immediate next test

- Report actual implementation branch/commit, changed files, API methods, manifest sample `*.json`, screenshots/UI or generated menu tree, test logs, failure matrix, and **before/after round trip** showing 37 destinations restored from one file rather than 37 manual entries.
- State exactly which **missing-location YES** operations are implemented and which are conditional or blocked under real account authority. Explain how R2 virtual prefixes are handled without misleading users.
- Give owner a short **Windows CMD command** to fetch/build your branch from an existing `--single-branch` clone, and exact Chrome steps that preserve original extension ID and saved profile. Don't require uninstall/clear storage/reset to test.
- The product feature is not done if the user still needs to manually recreate A/B/C paths on import. Explicit mapping of unmatched accounts is acceptable; manual re-entry of all original destination rows is not.
- Do not turn this into a general backup rewrite, public template marketplace, mandatory cloud sync, GitHub integration, automatic Worker deployment, another menu compiler or a new cloud provider.
- Maintain exact local privacy and security boundaries, update the source↔API documentation and CURRENT workings map in the implementation changeset, preserve immutable history, and report remaining installed/live gaps honestly.

**Bottom-line instruction to Codex:** **Deliver both Settings buttons as real production UI with Debug OFF; make Personal Restore export/import reconstruct all actual right-click destinations; link what already exists; implement the owner's partial YES/NO → informed single-YES create-missing flow (no redundant confirmation) with safe permission-gated cloud creation; preserve the working IT WORKS/pre-manifest baselines. This next run should remove the need to reconstruct every location by hand.**
