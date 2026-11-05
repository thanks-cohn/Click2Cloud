# Scaffold — Restore My Right-Click Menu

**Status: mandatory implementation specification; documentation only.** Applies to installed Chrome MV3 Click2Cloud extension and external Windows recovery companion.

## Product goal

User uninstalls Click2Cloud, Chrome IndexedDB becomes corrupt, or cache/profile data disappears. The user's independent recovery files remain on Windows. User reinstalls extension, opens Settings → Recovery Mode and clicks **Restore My Right-Click Menu**. Their last valid Simple, Narrow, Depth, popup Show/All/Flat and exact Flat destination settings are restored to IndexedDB and ACTUAL native Chrome contextMenus **without a cloud-wide rescan**, as rapidly as local validation and native registration permit.

This is a DIFFERENT button and operation from Save Whole Cloud. Whole Cloud is continuous metadata-outline backup and is not necessary to restore the native right-click menu.

## Settings UI

- Show passive **Backup Found** if the authorized native companion finds independent recovery data while browser working store is missing/damaged. Do not hijack login or initiate unsolicited OAuth.
- Main button: **Restore My Right-Click Menu**.
- If no readable backup found: **Choose Existing Backup Folder**.
- If two different valid backups exist: show source location, valid checkpoint time, config revision, counts and completeness; allow user to pick. Do not automatically overwrite a healthy local configuration with an older file.
- For a deliberate delete that must be undone: **Choose Earlier Backup**; older checkpoint recovery is explicit.
- Preview: counts of Simple and Narrow destinations, Depth enabled display buckets and levels, Show Simple/Narrow/Depth/All/Flat state, exact Flat default cloud connection/bucket/folder, cached Depth index status and any providers requiring reconnect.
- Display distinct **Backup Validated**, **IndexedDB Restored**, **Native Chrome Menu Applied**, **Pending Provider Reconnect** states. Do not claim full cloud save availability without actual auth.
- If working menu is nonempty, confirm replacing it or offer a safe reviewed merge; never silently replace live user work.

## Backup discovery outside Chrome

The Windows native companion checks BOTH user-approved candidate roots:
1. Automatic/default: %LOCALAPPDATA%\Click2Cloud\Recovery\
2. Documents: the REAL Windows Documents known-folder path + Click2Cloud\Backups\

Check files only with authorized companion/filesystem permissions. A Chrome extension cannot arbitrarily search local Windows folders; if the companion is not installed/reachable or files have been moved, offer a user-granted path/backup-folder selection. Do not call inaccessible roots empty, and do not assume IndexedDB is uninstall-safe.

## Exact recovery sequence

1. **Safety/preflight:** detect missing/damaged working IndexedDB and prevent initial empty-state setup from overwriting valid external backup files. Load external manifests for menu-config, depth-config, depth-index, recovery-policy separately.
2. **Integrity:** validate format/schema/checksums, namespace, exact immutable connection/account IDs, global sequence/generation, event deduplication and journal continuity. Never import OAuth tokens, S3 secrets or browsing-source URLs.
3. **Latest valid:** prefer verified latest CURRENT.json, plus any valid journal/YYYY-MM.jsonl entries after CURRENT. If missing/corrupt, find latest valid immutable weekly/daily snapshot (weekly.json is pointer or latest verified copy) and replay contiguous valid deltas. Dynamic YYYY-MM rolls across years. Gap/tampering stops at last independently verified state; report Partial Recovery.
4. **Restore right-click configuration:** Simple exact targets/IDs/titles/order; Narrow exact ancestor chains/aliases; Depth enabled-for-DISPLAY bucket identities and saved displayed depths; popup-only saved Show Simple/Narrow/Depth/All/Flat selection; Flat Default Save Selection exact authorized account/bucket/folder; independent per-bucket recovery crawl depths, backup policies and cached verified Depth directory index. Isolate broken namespaces so an invalid index cannot erase menu configurations.
5. **Rehydrate real working IndexedDB** through existing V3+1 canonical CURRENT store/revision and atomic migration/fencing logic. Treat this as a local configuration restore, not as an authorized cloud write. Preserve external source and dated backups.
6. **Rebuild Chrome menu NOW:** compile the actual one composite MenuSpec from restored saved Show choices and cached verified directory knowledge; invoke one native chrome.contextMenus registrar with real Chrome callback/generation ACK. No manual menu recreation, no full remote scan, no separate hierarchy toggle, no duplicate registrations.
7. **Reconnect safety:** credentials are not stored in backup JSON. Show restored menu structure while disconnected, but make any unauthenticated target disabled/refuse on click until the real connection is reauthorized. NEVER route to another account/bucket or imply upload success. After a normal successful login to the SAME account, quietly revalidate and make its actions available without re-entering destination setup.
8. **Post-restore:** verify menu identity/revision/count, last applied ACK and backup-root linkage. If cached Depth index is stale/partial, render only verified known nodes and later reconcile incrementally, preserving manual Simple/Narrow entries. Restore Whole Cloud background subscription data separately if present and user opted in.

## Acceptance (real installed Chrome, not simulation)

- Uninstall/reinstall while external root survives, press Restore, verify exact original Simple/Narrow labels/ID ordering, Depth displayed paths, Show/Flat state and one-click default target; native Chrome ACK confirmed without cloud listing.
- Restore latest CURRENT newer than last Monday backup, using valid subsequent deltas. Corrupt CURRENT, fallback to latest verified immutable snapshot and replay across monthly journals. Stop on missing/corrupt delta safely.
- Two locations contain different recovery data: show choice, avoid blind overwrite. Companion inaccessible: manual backup folder selection or truthfully blocked; no phantom discovery.
- Restore while provider OAuth missing: visible recovered setup but no unauthorized upload. Next NORMAL successful same-account login reactivates verified targets; login to different account must not silently rebind.
- Test exact Flat leaf, no Cloudflare nested submenu; Show:Narrow-only still only Narrow; Depth corrupted should not remove Simple/Narrow; restore after intentional deletion requires explicit older checkpoint.
- Glaciaring explains every verify/replay/IndexedDB/native ACK/auth boundary. Agent commands for restoration MUST use same source-owned flow with privileged restore grant and preview, not debug-api write authority.

**Owner promise:** The menu the user built should come back from their last verified local recovery files with a single Settings button—even after reinstall. It does not depend on rediscovering the whole cloud or repeatedly bothering the user at login.
