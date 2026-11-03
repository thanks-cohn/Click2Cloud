# Depth — Full-depth discovery and Scan and Update

## Initial inventory

Once participating bucket roots are authorized, run fair, resumable, paginated traversal until all **reachable** directory prefixes are known, regardless of current visible right-click Depth 1–10. Bound the number of pages, elapsed time, concurrency and memory **per worker slice**, not total discovery depth. Save exact per-scope prefix/cursor frontier after every verified page in the same transaction as changed records. Record `partial` truthfully until every requested frontier completes.

No network calls are required at the instant Chrome's pre-registered menu opens. Reopening the browser or switching Depth from 1→10→2→10 must read the retained graph, not start from bucket roots again. A provider feed, verified REDOWN folder operation, or user-requested exact-scope scan reconciles differences without repeated whole-cloud enumeration. External changes not yet observed are not asserted as current.

## Real Explorer context action

```text
Right-click a DIRECTORY in REDOWN Explorer:
  Scan and Update
     This Folder             — immediate children (fast)
     Folder and Subfolders   — recursive, bounded/resumable
```

Only the chosen provider/account/bucket/exact prefix is scanned. A recursive bucket-root request is bucket-wide; make that scope clear. Save all page/frontier progress and let large work resume without discarding known nodes.

- Add verified new child folder records and journal one semantic event per actual changed folder.
- For missing known children, do not tombstone unless the selected parent listing is demonstrably complete/authorized and provider absence/deletion guarantees support it.
- A repeated complete unchanged scan produces **zero** directory-change events (verification timestamp metadata may advance).
- On timeout, 401/403, 429, partial page, expired cursor or service-worker kill, preserve known data and report exact checked scope and remaining frontier.
- Clicking Scan and Update does NOT create cloud objects, increment remote-save counters, consume paid ZIP quota, trigger SUCCESS! or alter other mode settings.
- Shared provider change events may be delivered independently to Time Machine, but Time Machine settings NEVER drive Depth scans.

For directory identity, use full account scope, exact case and Unicode; R2 inferred prefixes and explicit markers must be distinguished by provider adapter. Avoid inferring move/rename from coincidentally similar names.
