# Legacy Simple — what to preserve, what to change

**Actual source:** [REDOWN V3 Simple projection & resolution](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/right-click-v3.js#L191-L267), [existing explicit `redown` provisioning](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/extension/background.js#L1043-L1096), [V3 Simple branding repair](https://github.com/thanks-cohn/REDOWN/blob/5041b5763541812c505c9cde6e8f79cb23a7b193/FOREVER_WORKS/v3/SIMPLE_CLOUDFLARE_AND_TOOLBAR_BRANDING_REPAIR.md). **New owner contract:** [Simple original proposition](../../simple/original_proposition/).

## Worth learning

1. **One ready root = one native leaf.** V3 `simpleTargets()` prefers an explicitly selected, prepared lowercase `redown` bucket, or exactly one ready candidate. If *no extra* shortcuts exist, `Cloudflare` itself becomes a save leaf. With extras, it becomes a submenu. Preserve this zero-extra simplicity in the new gate, with **live Cloudflare login + R2 capability + writable `redown` root** checks rather than only truthy Worker fields.
2. **The old default is ambiguous with multiple accounts.** Without a chosen default, several ready `redown` buckets yield no primary. New Simple must bind default by exact connection/account/bucket ID, require explicit account choice if ambiguous, and never silently choose another user's/account's bucket.
3. **Activated bucket roots and manually configured aliases are different inputs.** V3 appends activated eligible roots after configured shortcuts, deduping root paths and preserving array order. The new automatic bucket listing and editor preferences must be persisted separately; hiding an auto-suggested bucket needs a tombstone/override so refresh does not resurrect it.
4. **Old Simple handles identical labels by suffixing.** Cross-account duplicates get account disambiguation and same-label collisions may get `· 2` etc. This is **INTENTIONALLY DIFFERENT** from the owner's new permission for identical visible labels. Keep *unique internal action IDs* and add accessible exact-target disambiguation in **Existing Destinations**; do not silently rename the visible labels without owner instruction.
5. **The old default root alias was suppressed.** A manually configured alias to the same `redown/` root was omitted by `simpleTargets()`. New independent alias IDs must **not** be silently removed merely because they target the default root. Preserve a default `Cloudflare` save leaf if no optional entries remain.
6. **Save is distinct from navigation.** Old provider-local `Home` at the end is a **save** to bucket root; `redown-go-home` is navigation to the app, not a provider save. The owner's newer one-leaf `Cloudflare → redown/` contract supersedes the old separator/Home requirement where it would duplicate the default save row.
7. **Source validates destination IDs/labels/prefixes.** IDs `[A-Za-z0-9_-]{1,80}`; labels 1–60 chars; exact S3 prefix at most 900 UTF-8 bytes with slash and dot-segment checks. **ADAPT** validation and Unicode/case tests. Never derive identity from a label or use a UI input to authorize an unverified path.

## Important unfilled integration seams

- [ ] **Automatic `redown` creation is not globally guaranteed.** The explicit background `setupRedownQuickDestination()` creates/reuses and verifies `redown`, provisions a Worker and stores a default. `activateAllBuckets()` enumerates existing buckets; it is not a guaranteed invocation of that function. New onboarding must invoke idempotent, user-authorized first-run setup **independently of existing other buckets**, and verify write access before claiming ready.
- [ ] **One source of truth for the initial default.** Existing provisioning writes `rightClickV3` directly via `chrome.storage.local`; V3 CURRENT also has an IndexedDB writer. New Simple must have one CAS-authorized config writer and an accurately recoverable mirror; saved preferences cannot disappear on restart or races.
- [ ] **Manual-only rechecking after clear-all.** Newly discovered buckets default checked on first ready connection. But once user clears all extra bucket/folder entries, future bucket discovery may not automatically recheck them; recheck is manual. Clarify whether clearing one of several differs from clearing *all*—the current proposal addresses it logically, but no installed integration proves it.
- [ ] **Bucket-root versus alias ordering.** The user has specified `redown` first, then other bucket roots. With optional independently added aliases, order should be explicit and stable; no sorting by *label* that could change exact target routing.
- [ ] **Account/permission freshness.** An existing Worker URL or cached profile proves neither current R2 activation nor current write permission. Recheck on meaningful auth changes and click dispatch; fail closed if stale.
- [ ] **Native leaf↔submenu transition.** Chrome can't make a leaf save action and submenu parent the same thing at once. Install the new plan and route atomically *to the extent possible*; retain last usable registry state and retry on failure. Don't report Save after only menu creation or onboarding click.

## Intentional differences to test explicitly

```text
Unconnected: REDOWN → Cloudflare [login]
Connected, no R2: REDOWN → Cloudflare [official R2 overview]
R2 active, no verified redown: REDOWN → Cloudflare [authorized redown setup]
Verified redown, all extras unchecked: REDOWN → Cloudflare [DIRECT SAVE to redown/]
Verified multiple selected buckets: REDOWN → Cloudflare ▸ redown, bucket-1, ...
Two separately saved aliases, same title and path: TWO unique save actions
```

**Do not resurrect** V3's shared Simple/Narrow config, silent root-alias suppression, label-based deduplication, or skip of automatic default provisioning. Tests must compare both original known outcomes and these owner-approved differences.
