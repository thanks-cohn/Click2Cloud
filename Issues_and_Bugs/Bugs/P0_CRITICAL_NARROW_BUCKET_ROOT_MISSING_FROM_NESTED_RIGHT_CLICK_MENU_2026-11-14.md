# P0 CRITICAL — Narrow bucket-root save choice missing inside bucket submenu

**Reported:** 2026-11-14  
**Status:** OPEN — owner-observed; installed-Chrome reproduction and root cause not yet verified  
**Severity:** P0 / CRITICAL — right-click destination omission and possible wrong-target substitution  
**Area:** Click2Cloud V3+1, Cloudflare R2, Narrow (internal name `nested`), Chrome right-click menu and + Right Click destination editor.

## Exact owner report

In Narrow mode, a bucket appears as the first nested submenu that exposes its children, but **the bucket-root save option itself is missing from that submenu**. The user must presently create a separate **Simple** entry to save to the root. This is an unwanted workaround, not the intended behavior. When attempting to configure the bucket root as a Narrow selection, the UI appeared to select the topmost child; the precise mechanism has not been confirmed.

**Important: Do not misinterpret this requirement.** The user does **not** want the bucket root as a sibling of the bucket submenu and does **not** want the bucket root restricted to Simple mode. The bucket must remain the submenu parent. Its **first actionable child** should save directly to the bucket root; the remaining children are folders.

## Expected Chrome right-click hierarchy (illustrative)

```text
Right-click
  Cloudflare R2 >
    my-bucket >
      Save to my-bucket/     <-- save to root (empty prefix)
      Photos/
      Documents/
      Backups/
```

An explicitly configured Narrow bucket must retain its submenu and offer the root destination inside it, ahead of descendants. Preserve independent Simple/Narrow/Depth configuration, visibility, aliases and ordering. Do not silently add a separate Simple destination or force the user to do so.

## Observed vs expected

- **Observed:** Narrow produces nested child-folder choices but lacks a root save action inside the bucket menu.
- **Observed:** selecting/configuring the root seems to choose the first/top child in the picker; determine whether this is a UI selection, persisted target, menu projection, or actual save-target defect.
- **Expected:** bucket root is selectable/configurable and appears as first action inside the existing bucket submenu, with correct persisted target `{bucketName: "my-bucket", prefix: ""}`.
- **Expected:** clicking this action saves `filename.ext` at the bucket root, not `photos/filename.ext` or another child.
- **Expected:** child actions continue saving to their own exact prefixes.

## Investigation leads (not established root cause)

Review Narrow tree construction, `ancestors(prefix)`, hidden-level and selected-level handling, alias/title mapping, destination normalization, menu projection, and empty-prefix serialization. The current `extension/app.mjs` includes a Narrow editor that derives `paths = ancestors(captured.prefix)`; its selection UI and child-level restrictions warrant inspection. Trace all the way from selected UI target to stored config, generated `chrome.contextMenus` item payload and actual verified cloud object key. Empty string `prefix: ""` must not be treated as a missing target or replaced by the first folder.

## Acceptance / regression tests

1. With an authorized R2 bucket containing at least two child folders, add/select its root as Narrow; verify the picker truly retains root with empty prefix.
2. Rebuild the Chrome right-click menu: the bucket is a submenu parent; **first child** is a bucket-root save action; subsequent entries are configured folders.
3. Save to root via right-click and independently verify the exact R2 object key is `filename.ext`, with no inserted child prefix; never claim success without provider confirmation.
4. Save to each child and verify corresponding exact prefixes.
5. Verify menu regeneration, extension restart, reconnect and settings edits do not switch root to first child or duplicate/displace the bucket parent.
6. Test empty bucket, single child, multiple children, hidden child, custom label, multiple buckets, and Simple/Narrow/Depth display combinations.
7. Preserve explicit saved choices, prevent changes to other modes, and ensure normal permission and worker readiness rules are unchanged.
8. Capture installed-Chrome reproduction, before/after menu structure, persisted target, API inputs, test results and independent R2 verification. Mark not-run scenarios NOT TESTED rather than PASS.

**No fix is claimed by this report. Do not mutate production buckets or reset user destinations to investigate.**

## Codex investigation-and-fix assignment

[CODEX P0 CRITICAL — isolate, trace and fix the Narrow bucket-root submenu action without disturbing Simple/Depth or other unfinished work](../../docs/requests/CODEX_P0_CRITICAL_NARROW_BUCKET_ROOT_ISOLATE_TRACE_FIX_2026-11-14.md). Assignment committed, **not implemented**. Requires read-only source tracing, surgical helper extraction only where justified, exact Chrome menu parent/child routing, regression gates, and owner-installed Chrome acceptance before closure.
