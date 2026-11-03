# Simple original proposition — Automatic buckets and one-click redown default

**Owner's latest Simple-only UX decision (2026-11-03).** Everything in this directory belongs to **Simple**, not Narrow or Depth.

## Zero manual setup

Once the user connects Cloudflare, activates R2, and selects the intended account if necessary:

1. REDOWN automatically **looks for the exact lowercase R2 bucket `redown`** on that authorized account, even when several unrelated buckets already exist.
2. If it exists, reuse it; if missing, create **exactly one** `redown` bucket after user-authorized setup, then re-list and verify. A failed/unknown creation does not get blindly retried; inspect provider state first.
3. Prepare and verify a writable destination at `redown/` (bucket root; empty prefix). Set this as Simple's initial default **only if no intentional user default has been selected**; preserve later user changes.
4. Discover all other authorized, writable R2 bucket roots via the lightweight bucket-list API. Automatically include them as Simple flat destination rows. This is not an unbounded folder-tree scan.
5. No user should need to switch to Narrow, manually enter bucket names, or visit a setup form merely to show their newly created R2 bucket root in the Simple menu. Periodic/activation refresh can discover new buckets; keep explicit manual hide selections.

## Menu lifecycle

```text
Not logged in:
  REDOWN → Cloudflare                [flat: connect Cloudflare]

Connected but R2 not activated:
  REDOWN → Cloudflare                [flat: open R2 Overview]

Connected + R2 active; redown missing or unprepared:
  REDOWN → Cloudflare                [flat: prepare redown; no false save]

Connected + R2 active; redown ready; only default is selected:
  REDOWN → Cloudflare                [FLAT SAVE directly to redown root]

User creates additional buckets, auto included:
  REDOWN → Cloudflare ▶
              redown                  [root, ALWAYS FIRST]
              bucket-1                [other eligible R2 root]
              bucket-2                [other eligible R2 root]
              ...                     [additional verified roots]

User UNCHECKS bucket-1, bucket-2, and all other additional buckets:
  REDOWN → Cloudflare                [FLAT SAVE directly to redown root]
```

The right-click row `Cloudflare` becomes a submenu only when **multiple visible Simple destinations** exist. The default `redown` root is a protected baseline and not uncheckable in this bootstrap UI; unchecking all refers to *all additional bucket checkboxes*. Never duplicate `redown` in the submenu as a second Home row. This supersedes any older proposal that required a second Home entry when a root-level `redown` save item already exists.

**The top-level REDOWN menu, Google Drive, Dropbox, OneDrive and other independent S3 providers are unaffected.** Cloudflare's R2 entitlement is not a requirement for other providers.

## Bucket selection persistence

- Additional verified bucket roots are visible/checked **automatically by default**.
- Unchecking one bucket hides **only its menu row**; it neither deletes the cloud bucket nor touches the directory journal.
- Unchecking the last additional bucket **locks in flat-only Cloudflare mode** via `autoIncludeNew=false`. Subsequent newly discovered buckets remain unselected; REDOWN does not violate an explicit flat-only preference. The user can recheck an individual bucket or enable `Auto-show new buckets` again.
- Save these visibility preferences under the **exact connected account ID**, with their own `simpleBucketSelection.revision`. Do not overwrite, reset or borrow selections on an account swap.
- A newly created bucket appears after the next verified bucket-list refresh. Do not invent it before Cloudflare confirms its existence and writable destination is prepared. Cloudflare R2 bucket discovery is distinct from Depth's folder index.

## Implementation status & artifacts

- `src/cloudflare-simple-gate.mjs`: pure progressive on/off routing and deterministic auto-selected bucket menu model.
- `src/simple-redown-bootstrap.mjs`: injected asynchronous idempotent first-run bucket coordinator; **no live credentials or Cloudflare provider API calls by itself**.
- `tests/cloudflare-simple-gate.test.mjs` and `tests/simple-redown-bootstrap.test.mjs`: executable local contract tests.
- `reference/simple-v3-original.mjs`: unchanged historical V3 Simple algorithm baseline.
- `CODEX_REQUEST.md`: integration instructions with Chrome/R2 and transactional storage.

Reference: REDOWN's real `extension/background.js` already has `setupRedownQuickDestination` at approximately line 1056 that creates/reuses `redown`, but the global Activate Buckets flow only lists existing buckets and is not a guaranteed automatic first-run call. Integrate the existing routine safely; do not rebuild from scratch or write only `chrome.storage.local` when IndexedDB CURRENT is supposed to be authoritative.

**This is a proposed isolated Simple reference implementation, not a claim that REDOWN production already does it.**
