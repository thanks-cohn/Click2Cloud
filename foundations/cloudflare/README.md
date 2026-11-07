# Cloudflare foundation — Click2Cloud / REDOWN

> **Status:** Owner-approved product behavior and implementation foundation, **not yet an implemented or live-verified feature**.
>
> **Canonical location:** `/foundations/cloudflare/README.md`
>
> **Scope:** Cloudflare R2 first-use flow, native flat right-click entry, existing Shelf authorization, automatic `redown` bucket readiness and default destination, TRUE REMOTE-only transfer. Build around the existing V3+1 menu engine, Universal File API and isolated `right2cloud-module`; do not replace them.

## 1. Foundational user-experience decision chart

This chart is the **first-run onboarding reference only**. After initial setup, the post-onboarding flow below takes precedence and must preserve the user's own saved configuration. In the native menu the provider is labeled **Cloudflare**, although older onboarding diagrams use the service name Cloudflare R2.

```mermaid
flowchart TD
    A["User right-clicks a file → Cloudflare R2<br/>(flat, one-click provider item)"]
    B{"Cloudflare authorized<br/>in Click2Cloud?"}
    C["Launch the EXISTING Shelf Cloudflare OAuth login/consent"]
    D{"OAuth approved and<br/>account identity verified?"}
    E["Explain cancellation/error and offer Retry<br/>without claiming ready"]
    F{"R2 activated for<br/>the authorized account?"}
    G["Open official Cloudflare R2 activation page<br/>and mark setup pending"]
    H["On return / Continue / focus, recheck<br/>authorized R2 readiness via API"]
    I{"R2 now active?"}
    J["Show Activate R2 / Retry check<br/>without requiring a new login"]
    K{"Does bucket `redown` exist<br/>in the selected account?"}
    L["Create `redown` in that account<br/>with authorized R2 permissions"]
    M["Reuse existing `redown` bucket<br/>without deleting or replacing contents"]
    N["Prepare or reuse exact authorized<br/>Worker + bucket binding + durable claim controls"]
    O{"TRUE REMOTE write and<br/>independent readback verified?"}
    P["Keep Not Ready, show specific repair action<br/>and preserve setup progress"]
    Q["Set `redown/` as initial default ONLY<br/>if no user-chosen default exists"]
    R["Cloudflare READY: next right-click<br/>saves to `redown/` using TRUE REMOTE"]
    S["Already READY: this click saves<br/>directly using TRUE REMOTE"]

    A --> B
    B -- No --> C
    C --> D
    D -- No --> E
    D -- Yes --> F
    B -- Yes --> F
    F -- No --> G
    G --> H
    H --> I
    I -- No --> J
    J --> H
    I -- Yes --> K
    F -- Yes --> K
    K -- No --> L
    K -- Yes --> M
    L --> N
    M --> N
    N --> O
    O -- No --> P
    P --> N
    O -- Yes --> Q
    Q --> R
    B -- Yes, fully provisioned and freshly verified --> S
```

**Interpretation:** The ordinary *first* click may start onboarding instead of transferring. After readiness is established, the *next* click saves instantly. A pending source from before activation is **never replayed automatically** after OAuth, checkout, or uncertain upload. Do not confuse website sign-in with application authorization.

## 1A. Returning user — normal right-click decision chart (authoritative after onboarding)

**The R2 activation link is not an ordinary save step.** Once OAuth, R2 and the user-configured destination are ready, a normal right-click saves directly. The extension checks live authorization and exact destination readiness as needed, but must not reopen signup, overwrite a custom configuration, or silently restore a deleted bucket.

```mermaid
flowchart TD
    A["Right-click → Cloudflare R2"]
    B{"Click2Cloud OAuth<br/>valid for selected account?"}
    C["Open existing Shelf OAuth login"]
    D{"R2 usable?"}
    E["Only if confirmed inactive:<br/>offer R2 activation link"]
    F{"Saved Cloudflare<br/>destination configured?"}
    G{"Exact chosen bucket/path<br/>and TRUE REMOTE Worker ready?"}
    H["TRUE REMOTE save to THAT destination<br/>→ independent verification"]
    I["First-run setup still pending?<br/>User approved auto-setup?"]
    J["Create/reuse redown once<br/>and set initial destination"]
    K["Choose destination; preserve customization<br/>do NOT recreate redown"]
    L["Show Repair / Reconnect / Choose another<br/>Never silently fall back to redown"]
    M["No success; retain exact chosen destination"]

    A --> B
    B -- "No" --> C
    C -- "After authorization" --> D
    B -- "Yes" --> D
    D -- "Yes" --> F
    D -- "Confirmed inactive" --> E
    E -- "After activation / Check again" --> D
    D -- "Error / permission unknown" --> M
    F -- "Yes" --> G
    F -- "No" --> I
    I -- "Yes" --> J
    I -- "No / previously configured" --> K
    J --> G
    K -- "User chooses exact target" --> G
    G -- "Yes" --> H
    G -- "No, deleted / disconnected / inaccessible" --> L
    L -- "After explicit repair or new choice" --> G
```

### Returning-user rules (nonnegotiable)

1. **Existing valid custom destination wins.** The native Cloudflare item saves to the user's currently selected *exact* Cloudflare connection, account, bucket and folder prefix. `redown` was only the **initial first-run default**, never a permanent destination override.
2. **No repeated R2 link.** For an already activated account with valid authorization, no activation page appears. Show that page only when a trusted R2 readiness check actually establishes that activation is missing. An expired token prompts the existing Shelf OAuth flow instead; an API outage or missing permission is not interpreted as "R2 not purchased."
3. **If `redown` was deleted, disconnected or unbound but another configured destination works,** the Cloudflare flat menu saves to that other destination as normal. Do not search for or recreate `redown`.
4. **If the selected destination itself is deleted, disconnected, inaccessible, or its Worker binding is broken,** do not save elsewhere. Show "Destination unavailable" with **Reconnect / Repair / Choose another bucket**. A repair of a removed bucket or infrastructure requires explicit user authorization; no silent bucket recreation, surprise rebinding or upload replay.
5. **If the user removed their destination configuration after onboarding,** show Choose destination. Do not treat an empty config as first-run onboarding. A persisted `onboardingCompleted` / `defaultWasExplicitlyChosen` marker (or equivalent migration-safe state) distinguishes *never configured* from *intentionally removed*. Do not reset it merely because the user logged out, cleared a menu entry or deleted the original bucket.
6. **Cloudflare remains TRUE REMOTE only.** A successful save requires Worker-to-selected-bucket conditional write and independent verification. No browser-byte fallback, guessing, redirected destination, or success feedback after an unconfirmed transfer.
7. **No forced R2 polling every right-click.** Reuse a short-lived, explicitly validated readiness snapshot where safe, but revalidate authorization and exact target as required for secure dispatch. The Worker must remain authoritative at write time. Cache usability for UX, never as a substitute for upload authorization.
8. **Menu configuration is independent of transfer mode.** Existing Simple/Narrow/Depth/Quick Select/custom layouts are respected. This post-onboarding logic is an adapter/action routing rule behind the canonical V3+1 menu engine, not an alternate registrar or menu compiler.

**Example:** The user began at `Cloudflare R2 / redown /`, later changed their default to `Cloudflare R2 / photos / saved /`, then deleted `redown`. Their next Cloudflare right-click goes to `photos/saved/` after ordinary authorization and readiness checks. It does **not** ask them to activate R2 again or recreate `redown`.

**Different example:** They kept `redown/` selected and deleted that bucket. The next click reports that the selected destination is missing and offers repair or a new selection; it cannot silently create `redown` again or save to another bucket.

---

## 1B. Cloudflare — right-click and minimal login card

```mermaid
flowchart TD
    A["Right-click supported file → Cloudflare"] --> B{"Authorized and save-ready?"}
    B -- "YES" --> C["Save immediately to exact selected R2 bucket/folder"]
    C --> D["Verify TRUE REMOTE upload"]
    D --> E["Show verified file in Explorer + History"]
    B -- "NO: not signed in" --> F["SMALL Click2Cloud extension panel<br/>One Click Away!<br/><br/>[ Cloudflare R2 icon ]<br/>Cloudflare R2<br/>[ Sign in to Cloudflare R2 ]"]
    F --> G["User authorizes Cloudflare once"]
    G --> H["Complete only approved first-use R2 / redown readiness"]
    H --> I["Next fresh right-click → direct save"]
    B -- "NO: setup/connection needs attention" --> J["Show only the required setup or repair action<br/>in the compact provider panel"]
    J --> I
    A -. "Never during a ready save" .-> K["Full extension dashboard or extra setup tab"]
```

---

## 2. The native right-click default (before the user customizes it)

**NOVEMBER 6 OWNER PRIORITY — native menu projection (overrides older Simple/Flat examples):** At initialization render exactly one `Cloudflare` leaf which saves directly into bucket `redown` (root prefix) after its approved initial setup/readiness. No `Cloudflare R2` sibling or duplicated Cloudflare parent. When one additional Cloudflare destination is added, change that same item to **Cloudflare → redown / extra user destination**. When the extra destination is removed, return to the direct flat `Cloudflare` leaf. Keep `redown` available until the user explicitly removes it; honor an expressly changed default without silently reverting. With one remaining configured Cloudflare destination, that one destination is the leaf target. Additional hierarchy modes are deliberately configured options, never a prerequisite for this default. **These are presentation and routing rules for the single canonical engine, not permission to create cloud resources or new menu engines.** See `AGENTS.md` for exact acceptance and priority.

Inside Chrome's extension-created grouping, display **four direct, actionable, one-click provider entries in exactly this order**:

1. Google Drive
2. Dropbox
3. OneDrive
4. **Cloudflare** — last (R2 service; native name is Cloudflare)

No initial provider submenus, no unnecessary second REDOWN submenu, and no user-required Simple/Narrow/Depth configuration. Provider rows must remain clickable when disconnected: in that state the action is **connect/setup**, not save. When connected and ready, the same provider row is **save**. Connected providers must target their explicit configured destination; no guessed account or folder.

The owner may later customize layout, Quick Select, Simple/Narrow/Depth, provider organization or exact defaults using existing V3+1 tools. **Do not rebuild or replace the canonical MenuSpec, native registrar, action resolver or mode configurations.** The four-item first-run layout is a default *projection/registration policy*, not a new right-click engine.

## 3. Cloudflare login versus R2 activation

- The **Shelf's Cloudflare Log in/Connect button always launches Click2Cloud's existing first-party Cloudflare OAuth flow**, matching the current REDOWN-style authorization experience. Never substitute an API-token popup or Cloudflare R2 checkout for Shelf login.
- On a Cloudflare native right-click when not authorized, launch that **same trusted Shelf authorization action** (or bring the Shelf's Cloudflare connect surface forward and invoke it through the same API). There is **one** authorization owner, no parallel login implementation.
- After OAuth, inspect the exact authorized Cloudflare account and R2 API readiness. A Cloudflare website login or successful OAuth consent **does not prove R2 is activated**.
- If R2 is not active, open the official activation destination:
  `https://dash.cloudflare.com/?to=%2F%3Aaccount%2Fr2%2Foverview`
  (the navigation route must be verified against Cloudflare's current dashboard; use a safe official dashboard fallback if it changes).
- The user completes any Cloudflare-controlled account, billing or R2 activation step. **Click2Cloud never bills, subscribes, or accepts Cloudflare terms on the user's behalf.**
- Click2Cloud records `setupPending` for the authorized account, rechecks when the app is foregrounded or the user selects **Continue/Check R2**, and can offer another nonintrusive retry. Do not promise an automatic provider callback from R2 checkout or infinite background polling.
- Distinguish R2 not activated, insufficient OAuth scopes, account mismatch, API outage, and revoked authorization. Each gives a comprehensible next action rather than a generic login loop.

## 4. Automatic `redown` bucket and default

Once an authenticated API check establishes usable R2 access **and** the user has approved the extension's first-run auto-setup:

1. Read the selected account's bucket inventory or specifically check bucket `redown` with appropriately scoped credentials.
2. If `redown` exists and is accessible in that account, **reuse it**. Never clear, delete, reconfigure, or overwrite its objects.
3. If absent **during authorized first-run setup only**, call Cloudflare's R2 bucket-creation API to create the exact lowercase name `redown`. Treat already-exists races idempotently by re-reading the actual account. **Never infer permission to recreate `redown` solely from its later absence**; the user may have intentionally deleted or disconnected it.
4. Bind or verify the Worker to **that selected authorized account + exact bucket**, not an arbitrary bucket supplied by an untrusted menu item.
5. Prepare durable operation claims, authenticated Worker transport, source-host protections, scoped capability, and independent R2 HEAD/readback verification. A bucket's mere existence is **not** proof that TRUE REMOTE is functional.
6. After verified readiness, make `Cloudflare R2 / redown /` the **initial** default destination **only if the user has not explicitly chosen another default**. Subsequent logins/reconnects must not reset the user's choice. If the user later chooses a different Cloudflare folder, honor the configured destination.
7. Publish `READY` to native menu and Shelf using the **same canonical API state**. The user's next click saves instantly without another setup screen.

The first-run setup is an authorized, idempotent infrastructure action. Never create resources before the user has granted the relevant Cloudflare permissions and approved the automatic initial configuration. Provision only necessary resources; do not silently deploy unrelated functionality.

## 5. Permanent Cloudflare transfer rule: TRUE REMOTE ONLY

**Cloudflare R2 must never use browser-byte transfer as fallback.** Every Cloudflare right-click save is:
`native menu → existing V3+1 resolver → exact authorized save intent → isolated right2cloud-module → authenticated Cloudflare Worker remote HTTPS source fetch → conditional R2 write → independent authorized R2 HEAD/readback → verified outcome`.

- A readiness failure leads to a clear setup/repair action, **not** a browser fallback.
- The source file is fetched by the Worker; the browser does **not** stage the file bytes for the Cloudflare destination.
- Keep Both must be conditional/atomic; ambiguous writes remain uncertain and demand read-only reconciliation instead of blind retry.
- The destination writer receives minimal file data only: no original source URL, referring page or browsing provenance in R2 object metadata.
- Success feedback, History, counters and completion effects occur **only after** verified destination confirmation.
- Other providers (Google Drive/Dropbox/OneDrive and future S3 services) may use their own independent browser transfer initially; their later optional TRUE REMOTE support is a separate capability decision.

## 6. What is already present versus what still needs implementation

**Existing source boundaries at the time this foundation was recorded (2026-11-06):**
- V3+1 already has canonical MenuSpec, native registrar, Simple/Narrow/Depth projection, stable destination identities and an API.
- The existing Cloudflare OAuth path is in `src/auth/cloudflare-oauth.mjs`; Shelf runtime is in `extension/app.mjs`; menu/runtime dispatch is in `extension/background.mjs`, `src/core/engine.mjs`, `src/core/menu-spec.mjs` and `src/chrome/registrar.mjs`.
- `right2cloud-module/` is an **isolated extraction candidate**, with reported 49/49 local tests; it is **not integrated, deployed or live-verified**.
- The existing Click2Cloud application has not yet supplied/verified a working Worker mutation transport; the four-provider first-run native layout and unconnected click-to-onboard behavior are not yet wired end-to-end.

**Required implementation (not already fixed):**
- [ ] Default four-provider *flat* menu, in exactly the required order, including actionable disconnected entries, with native registration ACK and installed-Chrome validation.
- [ ] Route Cloudflare row's unready state to existing Shelf OAuth / readiness coordinator without creating a second menu owner.
- [ ] R2 activation handoff, resumable `setupPending`, foreground/API readiness check and explicit differentiation of permission vs subscription vs network failures.
- [ ] Idempotent `redown` bucket creation/reuse, correct account selection and user-default preservation.
- [ ] Authorized Worker/binding setup and secure durable operation/receipt ports required by `right2cloud-module`.
- [ ] Cloudflare TRUE REMOTE-only dispatcher branch **before** current browser byte capture.
- [ ] Independent live R2 write + HEAD/readback validation and comprehensive negative tests.
- [ ] Versioned, permission-gated programmatic API equivalents for every onboarding, readiness, bucket/default, save and inspection operation; GUI is a client of those operations.
- [ ] Regression tests proving Simple/Narrow/Depth, manual defaults, Quick Select and other providers are unchanged.
- [ ] Observable, separately measured menu dispatch, auth/status checks, provisioning and Worker transfer latency; no invented success or performance claims.

## 7. Acceptance scenarios (IF / THEN / ELSE)

| Given | When | Required outcome |
| --- | --- | --- |
| Brand-new user, no Click2Cloud Cloudflare authorization | Cloudflare R2 menu item clicked | Existing Shelf OAuth login flow starts; never silently uploads |
| OAuth granted, R2 not activated | Readiness check executes | Official R2 activation link; pending state preserved |
| R2 activated while user visits Cloudflare website | User returns/focuses Click2Cloud or selects Continue | Authenticated API rechecks account readiness; no website-cookie scraping |
| R2 ready, no `redown` bucket | Initial authorized setup runs | Create exactly `redown` once; verify bucket exists |
| R2 ready, bucket exists | Setup runs | Reuse `redown`, preserve objects and permissions |
| Multiple Cloudflare accounts | Setup begins | Use explicit authorized account selection; never guess account |
| Setup complete, no prior explicit default | Readiness reaches verified | `redown/` becomes initial default |
| User previously selected another default | Cloudflare reconnects | Existing chosen default remains unchanged |
| Cloudflare fully ready | User clicks Cloudflare R2 flat row | TRUE REMOTE transfer only; verified destination outcome |
| Worker unavailable or auth revoked | User clicks flat row | Clear non-success state/repair action; never browser fallback |
| Cloud provider not connected | User clicks its flat row | Provider's existing authorization flow, never misleading success |
| Native menu config or transfer preference changes | Menu is refreshed | Same canonical menu/action IDs and authorized targets; no duplicate registrar |
| Worker PUT outcome unclear | Save result received | Uncertain/read-only reconciliation; no automatic replay |

### Foundation invariant

**Four flat providers initially (Google Drive → Dropbox → OneDrive → Cloudflare). Existing Shelf OAuth for Cloudflare. Offer R2 activation only when actually unactivated. Create/reuse `redown` only during approved first-run initialization; it is the initial default, never a forced permanent destination. Always honor the user's configured exact Cloudflare target, and never silently recreate a removed bucket. Cloudflare TRUE REMOTE only. One V3+1 menu engine and Universal File API. Users should never have to configure buckets or Workers manually unless they deliberately customize or repair them.**
