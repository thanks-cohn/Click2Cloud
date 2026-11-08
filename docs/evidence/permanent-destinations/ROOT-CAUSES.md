# Destination permanence: proven causes and remaining uncertainty

Reference source before repair: `a6a0d92` (runtime source inherited from `f062983`; intervening owner instructions are documentation). Branch: `dev/p0-permanent-destinations`. `baseline-current-store.mjs` is the exact pre-repair persistence module used for paired execution in real Chromium IndexedDB. Its SHA256 is recorded in verification. `permanenceBefore` in the canonical workings JSON preserves the original behavior/source snapshot.

## First proven destructive boundary

`src/persistence/current-store.mjs:commitProduct` compared each requested mode config with `savedProduct.configs[mode]` when no independent `mode:<mode>` record existed. If identical, it skipped the mode write. The same transaction replaced the legacy product envelope with normalized product preferences, which do not contain embedded configs. Consequently **neither copy of those mode configurations remained after the commit**. A subsequent `read` silently defaulted absent modes to empty configurations.

The regression executes the original module and repaired module against separate real IndexedDB databases with the same legacy product: one Simple hidden Quick target, one Narrow target, one Depth scope and custom Default. A routine theme commit reproduces:

| Boundary | Original module | Repaired module |
| --- | --- | --- |
| Read legacy product | 1 Simple / 1 Narrow / 1 Depth | Same |
| Commit theme through CURRENT | Embedded configs dropped; unchanged standalone configs not written | Every missing standalone mode materialized atomically before product envelope replacement |
| Read committed state | **0 / 0 / 0** | **1 / 1 / 1**, exact Simple entries retained |

This proves a real implementation defect. It does **not** prove the owner's specific Windows profile had this legacy record shape; that requires read-only inspection of that profile and its journal. No owner database was accessed or reset.

A second destructive race existed: a mode writer could increment its mode revision while the product revision stayed unchanged. A stale `commitProduct` checked only the product revision and could overwrite that newer mode with its stale snapshot. The regression now proves `REVISION_CONFLICT` and retained saved target. Both revision fences remain inside the same IndexedDB readwrite transaction.

Missing/corrupt rows previously looked like first install. The repair uses a tiny record-presence integrity marker in the **existing** state store; it does not duplicate configuration. Legacy journals/completed setup records and existing native-registration evidence can establish prior state before a marker exists. Known missing/corrupt/conflicting records fail visibly and stop initialization. Null/undefined mode records and corrupt markers cannot become silent fresh defaults. Backup restore also refuses an existing legacy product-only installation instead of overwriting it as “empty.” No automatic guessed recovery or destructive migration was added.

## Why repeated setup prompts could appear without lost approval

The actual existing OAuth disconnect removes its own `chrome.storage.local` token key, not IndexedDB mode/approval records. Account approval already lived at `setup:approval:<accountId>`, independent of session ID, and is retained. There was no source evidence of OAuth intentionally deleting it.

However, the old read-only readiness path returned `SETUP_APPROVAL_REQUIRED` when no target remained, **without inspecting retained account approval**. The Shelf could therefore offer “Authorize automatic setup” even with approval present. It now distinguishes saved approval (`SETUP_RESUME_REQUIRED`), genuinely never-approved setup, and a missing approval record where completed initialization is known (`SETUP_APPROVAL_RECORD_MISSING`). The last case is recovery, not fabricated consent or a renewed setup prompt.

Global saved-state precedence was also incomplete: some setup guards checked only Cloudflare destinations for the currently selected account. Hidden/inactive assignments, other accounts/providers and all mode scopes must instead protect against fallback. The repaired `hasAssignments/hasSaved` guard is global, runs before fallback and is rechecked before provider preparation/completion. An existing Default-only target can be linked locally without changing its identity; saved assignments without Default remain unchanged. Worker upgrades preserve exact choices and return the specific existing-Worker action/target.

Regression evidence separates two facts: the misleading approval state was code-reproducible; actual loss of the owner's approval record has **not** been demonstrated. Missing approval stops safely; it is never silently recreated as consent. Existing live OAuth grants remain necessary and separate.

## Missing redown Default

The paired storage regression proves destination loss, not loss of a correctly stored custom Default. No blanket “restore redown” patch is appropriate. Saved Default/assignments always win. Only a successful durable read proving all modes empty and no Default permits the next authorized login to initialize editable Simple `redown` root plus Default using retained account consent. Existing regression tests cover first setup, last-destination deletion, next login, read failure, concurrent additions, other-account/provider entries and exact custom choices. Passive status/startup/deletion do not provision.

## Explorer's second-click defect

The original top-tab `show('explorer')` only rendered the pane. `loadTree()` ran from separate Open File Explorer buttons. Disconnect also discarded transient location/history, while the background location was stored only in session storage.

The top tab and other entrypoints now invoke one coalesced `enterExplorer` path. The trusted API selects among current authorized accounts/buckets: durable last explicit location, saved Default, selected/sole account's real redown, or an unambiguous bucket; ambiguity asks for a choice. The GUI expands/selects the tree and lists the selected location on the first click. Explicit `navigateExplorer` persists the account-bound location in the existing CURRENT database; automatic entry does not overwrite intentional preference or Default. Offline UI preserves saved orientation without pretending cached files are live. Navigation epochs discard stale entry replies and permit a new reconnect entry even while an old request remains pending.

## Architecture and verification boundaries

One CURRENT database, one V3+1 API/engine, existing OAuth/approval ledger, existing compiler/registrar and Universal File API remain. No new Worker, bucket, OAuth registration, remote mutation or REDOWN change is needed for these repairs. Native Cloudflare transfer Worker source is unchanged; no production update is required for this persistence release.

Browser tests use real Chromium/IndexedDB, the actual Shelf/API/persistence code, plus synthetic provider/OAuth/Chrome callbacks. Additional tests execute the **actual OAuth owner** through refresh, 403, 503, revoked refresh, declined login, disconnect and PKCE reconsent while checking unchanged real IndexedDB and approval. Full Chromium process restart uses the same profile and origin. These do not prove actual installed Windows consent, native menu rendering or live R2 outcome. The separate genuine unpacked-extension test must record its exact revision and any installation-policy blocker. Old live Cloudflare evidence remains historical, not a new Windows pass.
