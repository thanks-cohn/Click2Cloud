# Portable menu manifests implementation

Branch: `implement/portable-menu-manifest-2026-11-14`, from latest requested source HEAD `384961b15dab4e199b4e7a0b3b868ef45a910d72`. No push or merge. The final response identifies the local implementation commit.

The protected tags still resolve to their original commits:

- `click2cloud-rightclick-v3-pre-manifest-2026-11-14` → `e8a2463db27568a02b9b8b12d56efc4a550c55c6`
- `click2cloud-rightclick-v3-live-verified-2026-11-14` → `156ed15c0de5afe3c6d59f4a635db23962ab8600`

Ordinary Settings now has Export Menu Manifest and Import Menu Manifest, outside Debug and independent of recorder. Personal exports include every configured Simple/Narrow route, distinct same-key presentations, exact physical bucket/prefix and account hints, hidden flags, custom level labels/visibility, order, Quick, Default, show/Flat, provider visibility/placement, and selected Depth buckets/maxDepth. Discovery listings, credentials, setup ledgers, native generations and diagnostics are excluded. The format is closed version 1, bounded to 2 MiB / 4096 configured entries. Unsupported versions and anonymous blueprints fail explicitly. The optional shareable-blueprint format is not offered in this release.

The GUI uses eight typed `3+1.1` methods: `exportMenuManifest`, `getMenuManifestDraft`, `previewMenuManifest`, `inspectManifestBindings`, `discardMenuManifest`, `commitMenuManifest`, `provisionMenuManifest`, `undoMenuManifest`. Ownership and permission details are in the updated engine/API documentation and CURRENT workings map. The ordinary discovered-target gate in `commitConfigChange` remains intact.

Import stages a separate durable private draft and offers read-only preview, verified automatic original-account matching, per-bucket explicit account mapping, Add + Skip identical, Add alongside for distinct Narrow routes, and checkbox-selected local replacements. Existing Default/preferences are preserved; importing into an empty valid CURRENT restores the saved preferences. Optional preference replacement is explicit. Missing/corrupt established CURRENT blocks activation and directs the user to existing Recovery. An import is not a recovery bypass.

Readiness separates existing exact bucket + scoped capability, valid unmaterialized logical prefix, disconnected account, denied access, unknown state and Worker repair. Child permission does not authorize ancestor Save here. Unmatched account slots are never guessed from bucket names. Depth inventory is refreshed by the existing discovery owner, with an import budget of 256 requests / 4096 folders per bucket; exhausted coverage remains partial.

When incomplete, Partial Yes commits only verified targets and keeps the original intended menu pending. Partial No reveals Create Yes / No. The exact feasible account/bucket/Worker/prefix/probe effects and possible charges are shown before Create Yes. That single Yes authorizes the unchanged plan: no second/per-folder confirmation. The actual provider owner rechecks existence and issued grants, creates missing R2 buckets, uses the existing canonical private Worker provisioner and signed readiness probe, independently verifies, and preserves progress. Existing scope expansion, code-upgrade, signing-renewal and unavailable OAuth grants remain explicit blockers. An uncertain bucket POST is inspected instead of blindly retried; an uncertain probe resumes by operation ID. Created cloud resources are never deleted on rollback. Product imports do not create folder markers: prefixes are logical future keys. All targets must verify before complete Apply.

Apply uses one atomic CURRENT commit with revision/token/idempotency fences. Separate status reports configuration saved, native ACK and remote verification. Undo requires a validated saved preimage, its durable commit receipt and unchanged current revision. A failed/inert checkpoint or concurrent edit cannot replace live settings.

## Evidence and before/after matrix

| Area | Before | After and evidence | Remaining logic2real gap |
|---|---|---|---|
| Settings with Debug off | No manifest controls | Production DOM/handlers, real Chromium keyboard/download test | Installed Windows rendering still separate |
| Export | Recovery-only encrypted backup | Personal closed JSON; offline persisted read, cancelled picker truth | Physical owner disk/save picker not exercised |
| Existing location import | Per-row reconstruction required | One file → 6 Simple + 6 Narrow + 25 discovered Depth fixture actions; exact parent-path/target tree and Default compare | Original owner 37 target list is not mounted |
| Independent hidden presentations | No portable restoration | Round-trip hidden/Quick/Flat/level labels/same-key multiplicity tests | Existing owner profile untouched |
| Partial/create | No manifest flow | Restart-safe pending draft, Partial Yes, No/No, one-Yes provider creation, lost reply and permission tests | Real extension OAuth/scopes remain independent of connector identity |
| Exact save | No imported targets | Actual canonical provisioner + signed transport + local Workerd/R2/DO; Simple, Narrow leaf, ancestor and Depth exact-key byte/provenance readbacks | Not installed Chrome or live R2 restored-save proof |
| Live QA setup | Both QA buckets absent in connected account | Owner explicitly authorized creation; both buckets and 28 zero-byte markers independently read back | Does not prove native saves or Worker readiness |
| Configuration loss/ACK/storage | Existing integrity guards | No bypass; tests cover stale revision/token, quota-like failure, lost commit reply, replay, account loss, checkpoint Undo and native ACK partial | Owner's historical CURRENT deletion cause remains unknown |

The safe QA fixture uses the request's two bucket names, Simple/Narrow A/B/C in each, and a clearly defined new Depth layout: first bucket root, C2C-QA, Depth, L1…L5 chain, Sibling01…Sibling14 (22); second bucket root, C2C-QA, Depth (3). This yields 25 Depth actions. It is not represented as the exact historical owner layout. The JSON exports only two configured Depth scopes; the 25 folder actions come from current inventory, never an exported stale listing.

`browser/Personal-Restore.json` is the usable synthetic personal manifest sample. `browser/restored-menu-tree.json` is the after tree. `browser/results.json` describes the real Chromium / fixture provider proof boundary. `live-buckets.json` and `live-folders.json` are actual Cloudflare connector receipts; they contain no tokens or private signing material. Test logs and final counts are in `RESULTS.md`.

## Windows test without resetting the existing installation

This branch is local until the owner approves a push. After that approved publication, an existing single-branch clone can fetch/build it in Windows CMD:

```cmd
git fetch origin implement/portable-menu-manifest-2026-11-14 && git switch -c review/portable-menu-manifest FETCH_HEAD && npm ci && npm run build:extension
```

1. Preserve the existing profile and unpacked extension directory. Do not uninstall or clear extension storage. Load the built files through the existing installation's directory and click Reload at `chrome://extensions`. The manifest key and extension ID `ajppphdiamdobknpamcheohmdbdbeoal` are unchanged.
2. Open Shelf → Settings with Debug off. Export a Personal Restore Manifest and keep the private file. Hidden routes and inactive modes are included.
3. Import the file; review counts, labels and physical bucket/prefix hints. Existing authorized same-account locations bind automatically. On a new isolated Chrome profile, reconnect Cloudflare once and refresh bindings; signing material is deliberately not exported, so a missing local private Worker connection may need the disclosed setup plan.
4. For incomplete imports, use Partial Yes, or Partial No → Create Yes/No. Create Yes applies only to the exact disclosed feasible writes and does not grant Cloudflare permissions. No second approval for the unchanged plan.
5. Apply and inspect configuration/native status separately. Verify representative Simple, Narrow leaf, Narrow ancestor and Depth saves in R2. Do not treat a native ACK as independent cloud readback.

No production Worker code, OAuth identity, REDOWN resources, original destinations or protected tags were changed by the live QA setup. The implementation builds the same extension ID and uses the existing canonical deployment/transport owners. No push/merge approval has been assumed.
