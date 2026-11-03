# Depth — Pure right-click menu expression and exact resolver

**Preserve the original V3 Depth UI behavior while replacing its index source with full-known graph.**

Example known folder graph:

```text
bucket root redown (level 0)
Photos (level 1)
  Weddings (level 2)
    2026 (level 3)
Projects (level 1)
  Docs (level 2)
```

For visible Depth 3, the projected native subtree under the neutral provider header should preserve the V3 semantics:

```text
REDOWN
  Cloudflare >
    redown >
      Save here              [exact bucket root]
      Photos >
        Save here            [exact Photos/]
        Weddings >
          Save here          [exact Photos/Weddings/]
          2026               [exact Photos/Weddings/2026/]
      Projects >
        Save here
        Docs
```

Level numbering and branch-target behavior must be checked against `reference/depth-v3-original.mjs` goldens. All display names are the actual provider folder names. Branches get a distinct `Save here` child; boundary leaves can be direct actions. Stable menu IDs map to exact `providerKind,connectionId,accountId,containerId,prefix`, not labels.

The pure `projectDepth({depthSettings,authorizedScopes,knownGraph,budget})` returns descriptors and action targets without network I/O, storage writes, or any imports from Simple, Narrow or Time Machine. A separate neutral registry owns the REDOWN root, Cloudflare heading, sibling-provider flattening, action registration, partial overflow indicators, and native callback acknowledgement.

The native 300-entry or other real Chrome limit restricts **presentation**, never completeness of stored folder knowledge. Reserve representation fairly across participating buckets. Hidden/omitted folders remain accessible by REDOWN Explorer. A stale or revoked click ID must fail closed; it must not save to the last visited bucket or to some automatic default.

**Do not implement Simple's R2 login/setup gates, auto-created redown bucket, checkbox visibility, or neutral tree-circle destination editor in Depth.** They live in the separate Simple/neutral picker contracts.
