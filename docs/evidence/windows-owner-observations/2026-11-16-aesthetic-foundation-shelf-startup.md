# Owner Windows observation — Click2Cloud Aesthetic Foundation Shelf startup (2026-11-16)

**Status: owner-observed Shelf launch without crash in both daily-use and throwaway Chrome profiles. This is not a verified live-save result or a regression root-cause finding.**

## Exact implementation under test
- Repository: `thanks-cohn/Click2Cloud`.
- Branch: `implement/explorer-aesthetic-foundation-2026-11-15`.
- Commit SHA: `e188dc7f86b522207226bf30f8f6c25fec2a0a1e` (latest implementation checkpoint examined on 2026-11-16).
- Working copy used: `C:\Users\jg202\Click2Cloud-Aesthetic-Test`.
- Extension build output: `C:\Users\jg202\Click2Cloud-Aesthetic-Test\dist\click2cloud`.
- Protected annotated checkpoint tag **`click2cloud-aesthetic-shelf-working-2026-11-16`** was created and independently verified on GitHub; it resolves to this exact implementation commit. Existing protected historical tags must not be moved.

## Direct owner observations
1. The Aesthetic Foundation installation **showed no signs of crashing** during the owner's initial inspection; the Shelf **could open**.
2. A **previously tried Click2Cloud version** failed more severely: the Shelf would not open at all. The exact failing branch/SHA has **not yet been identified**; do not claim this report pins the first bad commit.
3. Owner subsequently reported the Shelf opens without observed crashes in **both daily-use and disposable Chrome profiles**. No long-duration stability or real cloud-save acceptance is claimed.
4. Opening the Shelf does not establish OAuth readiness, persistence durability, native right-click behavior or live Cloudflare R2 save verification.

## Updated owner observation — daily-use and throwaway Chrome profiles
- On 2026-11-16 the owner explicitly reports that commit `e188dc7f86b5` **opens its Shelf successfully in both a disposable Chrome profile and the daily-use Chrome profile**.
- **No Shelf crashes were observed in either profile** during those checks. This is owner-observed startup stability, not a claim about long-duration stability or successful provider saves.
- The earlier, unidentified version whose Shelf failed to open still needs its exact SHA identified. Do not assume which change repaired it.
- GitHub annotated tag `click2cloud-aesthetic-shelf-working-2026-11-16` was pushed and independently verified to resolve to `e188dc7f86b522207226bf30f8f6c25fec2a0a1e`.

## Next intended development: URL features (not in checkpoint)
- Continue from the preserved Aesthetic Foundation checkpoint on a **new branch**; do not overwrite or move the working tag.
- The proposed `implement/explorer-aesthetic-plus-urls-2026-11-15` is a **planned next implementation step** for URL functionality, including saved-file/public URL behavior subject to explicit authorization and existing privacy/security rules; at last branch inspection it did **not exist** on GitHub.
- Investigate the earlier unidentified Shelf-will-not-open version separately, including pinned SHAs and independent Chrome profile evidence. Do not call the earlier crash fixed based solely on successful launches of this checkpoint.

## Independent automated test-run failure
- The Windows Node/Python automated test run failed on the 10,000-event **SECURE** recorder ZIP verifier: `MemoryError` during `zipfile.ZipFile.read()` in `scripts/verify-recorder-zip.py`.
- The corresponding 10,000-event **RAW** recorder ZIP test passed.
- Subsequently Node terminated with `FATAL ERROR: Zone Allocation failed - process out of memory`.
- The owner machine was previously reported with approximately 4 GiB RAM and low remaining C: drive capacity; resource pressure is plausible, but **a production extension memory defect and the root cause of the older Shelf-startup failure are not established**.
- Do not conflate the Node/Python test-process crash with a Chrome extension/Shelf crash. Treat full-suite result as FAILED/resource-limited, not a green PASS.

## Isolated Chrome test command (CMD)
```bat
start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --user-data-dir="%LOCALAPPDATA%\C2C-Aesthetic-Throwaway-20261116" --no-first-run --no-default-browser-check "chrome://extensions"
```
Then manually Load unpacked `C:\Users\jg202\Click2Cloud-Aesthetic-Test\dist\click2cloud`.

## Required follow-up evidence
- Check extension load, first Shelf open, repeated close/open, tab navigation, Chrome restart and standalone profile isolation.
- Record the Chrome extension-service-worker console errors and exact action/time if a crash occurs, using redacted logs.
- Record branch SHA/build revision and separately mark PASS/FAIL/BLOCKED/NOT VERIFIED per gate.
- Identify the old Shelf-will-not-open SHA by examining old test profiles/checkouts before attributing a regression.
- Preserve existing Chrome profile and Git tags; do not reset stored user configuration to make a test pass.
- Real OAuth and provider save/readback tests require separate explicit authorization and disposable test resources.

This document is an owner test note only; it changes no runtime source, branches under test, tags, or extension identities.
