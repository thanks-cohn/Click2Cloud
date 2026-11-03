# Live Cloudflare R2 fixture — 2026-11-03

- Bucket: `redown` (Standard storage, eastern North America, Cloudflare default jurisdiction)
- Isolated fixture prefix: `__redown_v3plus1_lab__/`
- Verified listing result: 133 zero-byte trailing-slash object keys; 0 failed writes
- Deepest fixture key: `__redown_v3plus1_lab__/depth-spine/level-01/level-02/level-03/level-04/level-05/level-06/level-07/level-08/level-09/level-10/level-11/level-12/level-13/level-14/level-15/`
- Maximum folder depth relative to fixture prefix: 16 (`depth-spine` + 15 nested `level-NN` folders)
- Fixture objects are not code files; R2 is object storage. Trailing slash zero-byte objects make empty virtual folders persist.

Verified grouping:

| Group | Markers | Purpose |
|---|---:|---|
| prefix root | 1 | Isolation root |
| depth-spine | 16 | Deep menus and depth cutoffs |
| wide | 61 | 12 branches × four children, plus parents |
| duplicate-leaves | 10 | Repeated names under distinct ancestors |
| empty-leaves | 13 | Empty destination enumeration |
| mode-isolation | 3 | Separate Simple/Narrow/Depth projections |
| case-sensitive | 3 | Case-variant sibling names |
| shared-parents | 7 | Common path names under separate parents |
| names | 19 | Spaces, mixed case, Unicode, emoji, punctuation, numeric names |

Use Cloudflare R2's authenticated List Objects with prefix and delimiter. Paginate whenever the response is truncated. **Do not delete or bulk-rewrite data outside the isolated prefix.**

Note: No actual Portal upload, true-remote download or Chrome registration integration has been validated by creating this fixture alone.
