# Final verification results

Execution: Node v24.22.1, Linux; real Chromium 155.0.8059.79 for isolated Settings tests. Suites executed sequentially. Safe test profiles only; original user configuration/profile was not read, cleared or replaced.

| Gate | Result | Evidence |
|---|---|---|
| `npm run build:extension` | PASS; original extension ID retained | build.txt |
| `npm run test:focused` | 444/444 PASS | focused.txt |
| `npm test` | 513/513 PASS | full.txt |
| Manifest/schema/API/provider focused tests | 18/18 PASS | targeted.txt |
| Canonical provisioner/signed transport/local Workerd/R2/DO | 1/1 PASS; four restored mode/ancestor saves with independent bytes/provenance | workerd.txt |
| Ordinary Settings, Debug off, offline export, real browser download/import, pending draft reopen, clean-profile round trip, native callback tree, one-Yes creation | PASS; zero page errors | browser/results.json, browser.txt |
| Picker cancellation and save close | PASS; separate picker-port check | browser.txt |
| Genuine unpacked extension / side panel | BLOCKED: UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR; exit 2 | installed/real-shelf-receipt.json |
| Owner-authorized LIVE Cloudflare QA setup | 2 buckets + 28 zero-byte markers created and independently read back | live-buckets.json, live-folders.json |
| Installed Windows native menu and restored live R2 saves | NOT VERIFIED in this runner | Separate owner acceptance required |
| Protected tags | Both resolve to their original exact commits | HANDOFF.md |
| Working tree whitespace check | PASS (`git diff --check`) | Final Git verification |

The 37-destination result is an isolated fixture: 6 configured Simple, 6 configured Narrow and 25 Depth actions discovered from the fixture provider inventory. It is not the owner's complete historical manifest and not a new 37/37 live Windows/R2 claim. The actual live QA buckets also contain the Simple/Narrow paths; normal full Depth discovery may expose these additional folder actions, according to existing bucket/depth semantics.

The informed Create Yes test invokes the actual provider owner and real canonical deployment/transport code under fixture management/OAuth. It is not a cloud deployment. The separately authorized real bucket/folder creation used the connected Cloudflare API; no production Worker was deployed or updated. Original protected milestone tags and REDOWN resources remain unchanged.

Remaining logic2real gaps: installed extension policy blocks genuine Chrome loading; no owner Chrome OAuth/session or original exact 37-target config is mounted; new-profile signing material is intentionally excluded and may require the disclosed private Worker setup; provider-denied scope changes, signing renewal and Worker upgrades remain distinct blocked repairs. External Recovery/native Windows known-folder support was not rewritten. Optional anonymous shareable blueprints remain outside the personal-restore format.
