# Depth — module plan, interfaces and ownership

## Target module layout (to be implemented by Codex)

```text
assisted_proposal/depth/
  src/scope-identity.mjs        exact namespace / prefix identity (reference exists)
  src/scan-diff.mjs             scoped verified child comparison (reference exists)
  src/depth-settings.mjs        opted-in scopes, display 1..10, independent revision
  src/directory-store.mjs       independent indexed CURRENT graph and transactions
  src/scan-frontier.mjs         paginated fair FULL-depth resumable traversal
  src/reconcile.mjs             verified add/remove/observation events only
  src/delta-journal.mjs         sequenced immutable directory changes
  src/snapshot-chain.mjs       adaptive immutable snapshot and delta indexes
  src/depth-projector.mjs      pure V3-compatible hierarchy presentation
  src/depth-resolver.mjs       exact registered action ID → scoped folder
  src/index.mjs                public Depth API only
  tests/                       unit, fault, replay and parity tests
```

Two reference modules do **not** constitute the implementation. Build the remainder in ordered phases.

## Public Depth-only APIs (TypeScript-like documentation)

```ts
type CloudScope={providerKind:string;connectionId:string;accountId:string;containerId:string};
type DepthSettings={revision:number;menuDepth:number;participatingScopes:CloudScope[]};
type DirectoryNode={scopeKey:string;prefix:string;parentPrefix:string|null;
  level:number;lastVerifiedAt:string|null;confidence:'verified'|'partial'|'stale'|'inferred'};
type FolderListingPage={immediateChildPrefixes:string[];nextCursor:string|null;complete:boolean};
type ProviderFolderReader={
  listFolderPage(scope:CloudScope,prefix:string,cursor:string|null):Promise<FolderListingPage>;
  verifyAuthorization(scope:CloudScope):Promise<boolean>;
};
type DepthMenuPlan={
  entries:Array<{id:string;title:string;parentId:string;type?:string}>;
  actionsById:Record<string,{scope:CloudScope;prefix:string}>;
  complete:boolean;warnings:string[];
};
type DepthEngine={
  setDisplayDepth(value:number,expectedRevision:number):Promise<void>;
  setParticipatingScopes(scopes:CloudScope[],expectedRevision:number):Promise<void>;
  ingestVerifiedObservation(observation:unknown):Promise<void>;
  scanAndUpdate(scope:CloudScope,prefix:string,recursive:boolean):Promise<unknown>;
  projectMenu(snapshot:unknown,settings:DepthSettings):DepthMenuPlan;
  resolveMenuAction(id:string):Promise<{scope:CloudScope;prefix:string}|null>;
};
```

All identities include exact provider/connection/account/container and exact prefix. Display labels are not IDs. All provider listing calls and provider change-feed hints come from **neutral authenticated adapters**; Depth never acquires credentials from another mode.

## Global separation

- Depth state revisions: `scopeRevision`, `depthSettingsRevision`, `inventoryGeneration`, `journalSequence` are separate monotonic domains.
- Simple flat destination selection and bootstrapping, Narrow chosen-route editor, and Time Machine file identity are **not** Depth modules, settings or dependencies. Do not implement the shared tree-circle picker here.
- The registry, outside Depth, composes REDOWN root, provider siblings, native Chrome callbacks and installed-menu acknowledgement. Depth calls no global `chrome.contextMenus.removeAll()`.
- Switching mode or changing the selected menu depth makes zero cloud listings solely because of that display choice.
- Provider event fan-out is neutral infrastructure: each owner independently decides whether to ingest a verified event. Time Machine tracking selections produce zero Depth writes.

Only the active mode's **finished menu descriptors** reach native registration.
