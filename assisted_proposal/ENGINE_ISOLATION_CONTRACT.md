# Assisted V3+1 — Independent Engine Ownership Contract

**Date:** November 3, 2026. **Status:** Proposed contract, not shipped integration.

This file defines the isolation of **Simple**, **Narrow**, **Depth**, and the **optional Time Machine**. It is distinct from `depth/README.md`, which governs the Depth subsystem only.

## Four private authorities; no cross-mode dependencies

| Owner | Config/revision authority | Its own data and optional history | May publish | Absolutely must not |
|---|---|---|---|---|
| Simple | `simpleConfigRevision` | Flat shortcut IDs, labels, default/explicit destinations, order; small config undo/history where desired | Finished Simple menu descriptors | Import/edit Narrow/Depth/Time Machine state or run Depth enumeration |
| Narrow | `narrowConfigRevision` | Independently selected exact paths, aliases, natural tree expression; optional config undo | Finished Narrow menu descriptors | Import/edit Simple/Depth/Time Machine state; auto-include unchosen folders |
| Depth | `depthConfigRevision`, `depthInventoryGeneration` (separate) | Participating bucket scopes, independent full-known directory inventory, reconciliation cursor, directory delta events, selected *menu* depth | Finished Depth descriptors, verified inventory observations via neutral event contract | Edit Simple/Narrow settings; import RFIS; use tracking selections to filter folder inventory |
| Time Machine / RFIS | `timeMachineSettingsRevision`, `timeMachineEventGeneration` | Tracking selections, durable file identity/placement records, historical events, as-of queries, retention policy | Its own historical query/view results; may subscribe to neutral verified provider events | Edit or increment Depth/Simple/Narrow revisions, publish Chrome menu descriptors, or create cloud folders on mere tracking selection |

The **neutral menu registry** is not a fifth mode: it receives exactly **one selected mode's** finished descriptors, composes provider sibling rows and native action IDs, registers with Chrome, and routes clicks through an authorized dispatch interface. It never reads or mutates private journal, scan, alias, or historical state.

The **provider adapter/event distribution** is neutral infrastructure, with authenticated listing and confirmed operations per exact provider/account/bucket identity. A shared verified provider event may independently be consumed by Depth and Time Machine, but **neither calls into the other or writes the other's store**. This is event fan-out, not coupling.

## Critical distinction: tracking ≠ cloud mutation

**IF** the user adds an *existing directory* to Time Machine **tracking**, **THEN**:
- Time Machine's selection revision changes and it may schedule its **own** scoped history observation.
- Depth's destination settings, inventory generation, discovery frontier, cached graph, Chrome menu signature, IDs, order and routing remain **byte-for-byte unchanged**.
- Simple and Narrow configs remain unchanged.
- No provider directory create/delete/move is issued. No native menu rebuild is triggered.

**IF** the user actually **creates, deletes, or moves a directory in the provider** via a verified REDOWN operation or independently confirmed remote observation, **THEN** Depth may update its own folder graph and reproject *affected* menu descriptors. Time Machine may *independently* record file/placement history if entitled/tracking; it has no authority to initiate Depth's update.

**IF** the user changes Depth's menu display depth 1→10→2→10, **THEN** its full-known folder inventory, deltas, and Time Machine histories remain unchanged. Only the menu projection revision/signature can change.

## Storage: independence without gigabytes of duplication

- Do **not** create four competing giant inventories of all remote folders.
- Depth owns its provider-scoped **folder structure** and directory-change journal; it is not Time Machine's complete file biography.
- Time Machine owns file IDs, placements, as-of reconstruction and historical evidence needed for `What Was Here?`, `What Changed?`, `Find This File?`. File history exists separately only where enabled/authorized.
- Simple/Narrow need small independent **config persistence** and optional change audit/undo, not obligatory full directory snapshots.
- Each storage transaction writes one owner's records/generation. A shared provider event may generate independent scoped transactions; one subsystem's failure is reported independently and never pretends the other has committed.
- Private provider namespaces bind exact connection/account/bucket identity; a label or folder path alone is never an authorization credential.
- A neutral immutable *verified observation* may be shared as an input without making the subsystems share a mutable source of truth.

## State-transition invariants (regression tests required)

1. Add/remove/rename Time Machine **tracking** selection: Depth config hash, inventory generation, native menu plan hash, action IDs/targets and Simple/Narrow config hashes stay exactly equal.
2. Create a real cloud folder while Time Machine is disabled: Depth gets its own confirmed update without depending on Time Machine.
3. Inject a Time Machine crash or corrupted historical segment: Depth's previously registered menu and authorized destinations continue functioning; history reports incomplete/recovery failure separately.
4. Inject Depth discovery failure/partial listing: no Time Machine event deletion or history rewrite; known folder graph preserved.
5. Switch among Simple/Narrow/Depth: no foreign storage writes, no scans caused solely by switching, no Time Machine sequence changes.
6. Compile identical configs/known graph twice: deterministic menu entries/IDs and exact account/bucket/prefix routes.
7. Attempt a stale native ID after scope or permission revocation: fail closed and do not silently fall back to the default destination.
8. Two bucket paths with the same name in two connected accounts remain separate in BOTH inventories/histories.
9. When one neutral provider event reaches both Depth and Time Machine, each commits or fails independently with its own acknowledged sequence; neither claims the other's success.

## Documentation authority and scope

- [Depth contract](depth/README.md) describes Depth only.
- [Time Machine architecture](TIME_MACHINE_ARCHITECTURE.md) describes file history and as-of queries only.
- [Storage/checkpoints](STORAGE_AND_CHECKPOINTS.md) describes reusable storage patterns, **not permission for cross-owner writes**.
- [Scan and Update](SCAN_AND_UPDATE.md) describes scoped remote reads and verified differences.

**Not implemented:** These isolation invariants are design acceptance requirements. Source-extracted V3 still lives under `../original_proposition/src/modes/`; no new runtime writes or provider accounts are changed by this documentation.
