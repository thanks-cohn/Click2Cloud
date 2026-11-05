# Canonical Menu Twin & Convergence — Owner Intent for V3+1

**Status:** Owner-approved design reference, **not an implementation or a claim about rendered Chrome UI**.  
**Companion:** [Glaciaring: minimal traversal](GLACIARING_MINIMAL_TRAVERSAL_OWNER_INTENT.md), [Glaciaring design seed](../V3P1_GLACIARING_AGENTIC_DEBUG_API_SEED.md), [functional behavior contract](../V3P1_COMPLETE_CONDITION_TO_BEHAVIOR_CONTRACT.md).  
**Scope:** The lifecycle of a human/agent-inspectable right-click menu, deterministic Chrome projection, independent mode changes, and safe iterative regression prevention.

## 1. The essential wish

**The right-click menu exists logically before Chrome paints it.** Instead of repeatedly describing every submenu and UI interaction, the owner and a coding agent can inspect or edit **the same exact canonical menu model**. Chrome is one rendering/dispatch surface of that model. A diagnostic human/agent mirror is another.

The user can say “make the Chrome menu match this” and show the desired outcome as a versioned menu tree. The agent can inspect every row, nested depth, label, sibling order, separator, destination identity and enabled state, compare the generated plan to the desired logical result, and produce focused changes without rebuilding unrelated engine modules.

This is a **logical digital twin**, **not a literal copy of native Chrome pixels or a hidden Chrome-internals API**.

## 2. One authoritative plan, many surfaces

```text
Independent Simple / Nested-Narrow / Depth settings
       + immutable discovered inventory
       + separately owned provider fragments
                      |
                      v
             Pure, canonical MenuSpec
                 /        |        \
                v         v         v
       Human mirror   Agent API    Chrome registrar
                 \        |        /
                  Shared action resolver
                           |
                   Authorized dispatcher
                           |
                  Provider receipt/History
```

The **MenuSpec** is authoritative for native item ID, action ID, parent, sibling index, type, title, enabled state, contexts, origin mode, reason codes, exact target identity and optional omissions. It cannot contain credentials. Labels never determine authority. Two appearances of the same action may have different item IDs. A submenu branch is not also a save leaf; provide an explicit **Save here** child when needed.

**No presentation surface is permitted to invent, reroute, or silently omit an action.** An omission index should record bounded/capability/unavailable/incomplete cases, with honest coverage.

## 3. Agent and human action pairing

- A **human native click** uses the Chrome menu ID and resolves it against the acknowledged plan and current authorization.
- A **human mirror click** resolves the same action ID using the same pure resolver and an independently authorized live-action pathway.
- An **agent diagnostic selection** resolves the same action and context **as simulation only**, with **zero** cloud writes, URL fetches, History edits, success effects or privileged API calls.
- Live agent execution, if ever supported, requires **separate explicit authority** and scoped actions. Access to read-only introspection never authorizes execution.
- All action paths reject stale generations, revoked accounts and changed destinations. They never silently reroute to the default/root.

**Logical equivalence** means the same canonical intended action, not that Chrome renders native menu fonts, animation or screen geometry identical to a web preview.

## 4. Iterative convergence toward the desired outcome

| Layer | Question | Required evidence |
|---|---|---|
| **Desired** | What should the menu logically contain? | Reviewed, versioned expected MenuSpec / golden tree |
| **Generated** | What instructions did the compiler produce? | Pure deterministic output and digest |
| **Acknowledged** | Which creation, update and deletion operations did Chrome confirm? | Per-item API results and matching applied generation |
| **Observed** | What was independently seen in installed Chrome? | Native browser test or explicitly labeled manual evidence, where available |
| **Diff** | Where does desired differ from generated, acknowledged or observed? | Structured changed/missing/extra/reordered/disabled/action-mismatch entries; evidence gaps explicit |
| **Corrected** | What smallest owning module can fix the difference? | Focused patch + mode-isolation and provider-parity tests |
| **Remembered** | How do we ensure it stays correct? | Known-good baseline, versioned golden tests, rollback generation |

**Convergence is a controlled engineering and verification loop**, not self-rewriting source code in production. A newly requested behavior becomes a reviewed target. Only changes proven not to break already accepted invariants become the next known-good baseline.

When Chrome cannot express a requested behavior, the agent must report a native capability constraint and propose a valid representation. A visually accurate mirror is never proof that the native menu matches.

## 5. Every nested row must be inspectable without screenshots

The agent should answer, programmatically:
- What are all direct and nested children of a given menu item? In what order?
- Where are the **separator**, **Home**, **Save here** and **Manage** entries? Does Home mean *save to the default* or *navigate to Explorer*? Never confuse them.
- Which precise action does a row resolve to? Is it writable and currently authorized?
- Why does a selected Simple destination appear flat, a Nested one under its natural ancestors, or a Depth node despite not being manually configured?
- Why is a desired candidate missing: not configured, stale inventory, partial discovery, permission denied, unprepared Worker, menu budget or unsupported native behavior?
- If two labels match, are they distinct provider/connection/account/bucket/prefix identities?
- What changed between the last accepted generation and the current one, and which mode or provider owns the difference?
- Did Chrome acknowledge the change? Did a real Chrome test independently observe it?

All answers must carry source/revision provenance and distinguish **desired, compiled, acknowledged and observed** evidence classes.

## 6. Prevent mode and provider regressions

Simple, Nested/Narrow and Depth each own separate config, version, validator, projector, migration and tests. Their output is composed through a stable shared MenuSpec. They cannot write each other's settings. Google Drive, Dropbox and OneDrive remain independently owned flat provider menu fragments with unchanged dispatch authority.

For every focused change, require a **change-impact boundary report**:
1. Which mode/provider/file was intended to change?
2. Which canonical menu nodes/actions actually changed?
3. Which unrelated configs, routes and provider fragments did **not** change?
4. Which known-good golden scenarios still pass?
5. Were any new unobserved/unknown gaps introduced?
6. Did the native menu achieve a matching acknowledgement, and was installed-browser parity tested separately?

No new S3 adapter should require rewriting Simple, Nested, Depth or the shared MenuSpec public contract. A module can be replaced if it preserves the relevant interface contract and the other modules' behavior.

## 7. Example invariant

**Desired:** In Simple, Photography is a flat direct destination. In Nested, the configured Photography folder appears under Images, with its real natural ancestors. In Depth, the folder tree follows authorized inventory up to its configured depth. All versions resolve the same physical target when Photography is selected.

**Agent proof:** The menu tree, IDs, exact action identity and snapshots can be compared directly; changes to Nested must leave Simple and Depth config hashes identical. Chrome registration is checked against expected generations. An installed-Chrome smoke test provides separate rendering/click evidence.

## 8. Codex acceptance criteria

- Generate, inspect, serialize and diff the **entire** bounded MenuSpec and omission index without Chrome.
- Let a person edit and preview desired logical menu outcomes, and give an agent a stable inspectable equivalent derived from the **same** source of truth.
- Test human/agent action equivalence using the same pure resolver; diagnostics must never cause live writes.
- Register the real Chrome menu through one trusted registrar, track desired/applied generations and report unknown visual details honestly.
- Intentionally regress a Simple route while changing Nested; catch it against an accepted baseline before deployment.
- Change Depth implementation in isolation; Simple, Nested and unrelated provider plans remain byte-equivalent.
- Demonstrate a structured desired/generated/acknowledged/observed **diff** with explicit unknowns and the smallest responsible code boundary.
- Benchmark on/off diagnostics and reject any diagnostic system that causes measurable right-click responsiveness regression beyond measured budgets.

**Owner's summary:** *Show an agent exactly what I want the menu to be, let it produce the same logical outcome in Chrome, and remember what already works so future improvements don't break it. Glaciaring then minimizes how much code the agent needs to traverse when a mismatch occurs.*
