# Main integration evidence

The owner's later instruction, "push to main pls", authorizes this merge and push.
It supersedes the earlier feature-only restriction for this integration. It does
not authorize deployment, provider provisioning, publication or billing changes.

Parents: previous `main` `d5d4f8ab2f2737c2b8220bdb98bfd6d068fb27c3`, feature branch
`bdbb08c1cca0c3aac25de712e673887ae46d847a`.

The histories diverged. Conflicting product surfaces now use the consolidated
GUI/API implementation. Main-only documentation and independent changes remain.
In particular, main's Explorer context-menu inspection, canonical nested menu
preview and exact source-file save path are retained as typed V3+1.1 tools
(`inspectExplorerContextMenu`, `previewContextMenu`, `dispatchExplorerSave`). The
last one reads through the existing Universal File API and invokes the existing
engine's protected save/verification dispatcher. No second uploader was created.
The old composite entrypoint is a wrapper around the canonical compiler. Natural
Narrow menu IDs remain stable when no levels are hidden; the reviewed legacy
menu fixture passes without regenerating expected IDs.

The earlier main CURRENT envelope migrates without scans or guessed identity:
revision, independent mode data, exact default location, visibility and recovery
policy survive. Ancestor aliases migrate to level metadata, including bucket
labels. Both mode-record and product-only storage variants are supported. A real
Chromium IndexedDB check verifies read, migration, atomic commit and revision
continuity. Old OAuth records without verified account identity show disconnected
and require normal login instead of being reported as Connected.

| Check | Result | Evidence |
| --- | --- | --- |
| Current Node test suite | PASS: 140/140 | `npm-test.txt` |
| Focused owner-contract checks | PASS: 111/111 | `focused-tests.txt` |
| Extension build + registered stable identity | PASS | `build.txt` |
| Actual browser GUI/API/IndexedDB/migration tests | PASS, fixture tier | `browser-results.json`, fixture screenshots |
| Retained source-file save dispatcher | PASS, isolated provider double | `main-merge-compatibility.test.mjs`; not live cloud-write proof |
| Product background module boot | PASS, fake Chrome transports | `browser-results.json`; not an installed MV3 assertion |
| Native install, rendering/click/restart | BLOCKED | Administrator blocks unpacked extensions; policy preserved |
| Live OAuth consent | BLOCKED | Cloudflare sign-in destination outside enforced network policy |
| Live verified native/Explorer upload | BLOCKED | No installed/user-authorized host or authenticated Worker mutation transport |
| Full live-save release acceptance | FAIL / incomplete | Same functional integration gap recorded by the feature report |
| Windows native companion/uninstall recovery; long-duration OAuth | BLOCKED / NOT TESTED | Same limits as the feature report |

There are now 36 schema-discovered tools. `service.d.ts` is the current typed
contract. Version negotiation remains explicit (`version:"3+1.1"`). Three
superseded test modules (`engine-api-focused.test.mjs`,
`cloudflare-oauth.test.mjs`, `oauth-focused.test.mjs`) assert historical v1
request/preview shapes or removed OAuth exports. Their source is retained;
`tests/run.mjs` explicitly excludes them and runs the current contract, source,
migration and OAuth replacements. They are not counted as passing current tests.
The historical v1 documentation is labeled accordingly. The JSON-lines agent
client and legacy IndexedDB test entrypoint invoke the current API/test surface.

No historic 500/1,000 scenario atlas was run or expanded. No deployed Worker,
production bucket, REDOWN repository or billing configuration was modified. The
feature acceptance report is retained as its original feature-branch evidence;
this directory records the later merged-source verification.
