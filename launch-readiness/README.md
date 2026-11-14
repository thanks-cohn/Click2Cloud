# Click2Cloud Launch Readiness

**Purpose:** Non-destructive release acceptance plans, test matrices, and future validation evidence. This directory contains **test plans, not proof of release readiness**. No application behavior is changed by these documents.

## Base 0.1 — A SURE WINNER milestone

- [Exhaustive launch-readiness checklist: 248 scenarios](base-0.1/CLICK2CLOUD_EXHAUSTIVE_LAUNCH_READINESS_CHECKLIST_2026-11-13.md) — covers repeated cold boots, crashes, service-worker/Shelf restarts, native right-click saving, Simple/Narrow/Depth, configuration and cloud recovery, OAuth failures, data integrity, performance, and a 2,000-verified-save campaign.

**Reference source milestone:** `milestone/a-sure-winner-base-0.1` at `0d50ab82c10555ae49d617b90be588057a1fa6b6`.

**Safety:** Run destructive/corrupt-storage/fault-injection scenarios only in isolated test Chrome profiles and disposable Cloudflare test prefixes. Never reset or erase the owner's actual Chrome profile to make a test pass.

**Reporting:** For each case distinguish `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`, and `N/A`. Distinguish installed Chrome + live R2 proof from source/module fixtures. Preserve known issues and exact build revisions.
