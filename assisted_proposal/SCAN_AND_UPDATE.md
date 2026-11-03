# Assisted proposal — Right-click Scan and Update

User-facing **Explorer directory context menu**:
```text
Scan and Update
  ├── This Folder (immediate children; fast default)
  └── Folder and Subfolders (recursive; bounded, resumable)
```

Both actions operate on the exact selected provider/connection/container/canonical prefix, **never** on a display label or unrelated active Explorer bucket. Unlike the original proposal's recursive default, the assisted design defaults to immediate children and explicitly labels the recursive option to avoid accidental million-folder traversals. Selecting a bucket root in recursive mode is a whole-bucket check; show its scope clearly.

**Algorithm:** resolve current permissions/identity; read provider listings with delimiter and pagination; perform a scope-bound, resumable scan; diff only sufficiently verified observed folder records with the materialized directory graph; append precisely the confirmed semantic changes as idempotent journal events; atomically update nodes/cursor/generation; then reconcile the current Depth menu through the neutral registrar. No full snapshot rewrite. A repeated unchanged scan yields zero folder-change events.

**External changes:** cannot always be detected instantly; provider-supported change feeds and this action complement each other. A partial scan, failed page, missing cursor, 401/403, timeout or incomplete subtree never authorizes a deletion. No silent "up to date" unless every requested page/branch completed. On R2, inferred folder prefixes may disappear when no objects or marker remain: don't confuse this with proof of a user-requested deletion.

**UX:** show checked prefix, recursive/shallow label, counts of *confirmed* added/changed/removed/unchanged, and completeness/progress. User may pause/resume the large recursive job; cancellation retains already committed changes and scan frontier. Unauthorized/list-unsupported providers get an actionable explanation rather than false success.

**Separation:** scanning is a Depth directory-index operation and never edits Simple or Narrow private settings. The independent optional Time Machine listener may record verified provider observations via the neutral event interface without becoming a dependency of Depth. Scanning never charges a ZIP/save quota, increments a transfer counter, or triggers SUCCESS! upload animations.

**Acceptance:** external deep folder add, repeated identical scan, verified deletion with complete parent listing, interrupted 10K+ scan, only one of four R2 test buckets affected, no Simple/Narrow config writes, no Time Machine loss, no partial-result tombstones.
