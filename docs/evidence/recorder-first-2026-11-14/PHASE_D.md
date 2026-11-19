# Phase D — integration and bounded large export

Build/import-policy and 55 module/authority/MV3 tests pass. The first full focused
run failed 1/416 because the two new completion timing codes had not been registered
in the existing closed diagnostic vocabulary. Registration repaired that integration
error without weakening unknown-code rejection. Subsequent suites passed 416/416,
then four 418/418 runs; the last two use the final production source. All logs remain.

The expanded timing/availability schema made the 100,000-event SECURE archive exceed
the original 256 MiB payload budget. That attempt failed explicitly and produced no
truncated archive. The bounded native Blob budget is now 512 MiB. Final-source
100k RAW and SECURE both complete in one action/file; exact byte sizes, hashes and
independent verification are in phase-d-stress-final.json. One decoded page is still
processed at a time. Oversize rejection has a deterministic regression. Final-source
0/102/10k RAW/SECURE all pass separately. Complete synthetic artifacts are in
final-exports/ as lossless .zip.gz; final-artifacts.json records original ZIP hashes.

Final checks also cover zero-duration throughput denominators, explicit unavailable
proof reasons, and a newly selected run refusing to reuse an older run's snapshot.
Actual rolling-IDB export retains 123/123 rows even with durable high-water 261;
recovery exports keep unconfirmed gaps PARTIAL and preserve migrated rows/capacity.
UI cancellation and interrupted read checks remain green.

The first HTTP module-worker harness timed out across a worker update. It lacked
an activation fence before sending RPC to registration.active. Waiting for the
requested script's activated state makes the readiness prerequisite explicit;
three subsequent worker runs pass Basic Debug OFF, consented finite Expansive,
automatic RAW/SECURE downloads, Stop/Debug OFF/process restart and adjacent startup
failure feedback. This is harness/runtime evidence, not the cause of the Windows
Miniflare /capabilities issue. The expected unsupported dynamic-import negative
control remains reproduced separately.

A genuine unpacked-extension capability probe used a fresh disposable profile and
was BLOCKED by UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR. No policy bypass or
normal profile modification occurred. CHROME_INSTALLED and LIVE_R2 remain NOT
VERIFIED; page/worker browser and local workerd proof are explicitly separate.
