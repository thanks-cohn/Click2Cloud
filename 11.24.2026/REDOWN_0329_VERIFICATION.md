# REDOWN 0.3.29 verification

The release branch started at `8126fc6e294987ebda7f451099d40898cceae954`.
The packaged extension version is 0.3.29 and the extension ID is
`ajppphdiamdobknpamcheohmdbdbeoal`. The packaged Cloudflare Worker digest
matches 0.3.28.

## Implementation

- Remotes keeps its provider controls and contextual recovery. The permanent
  review shortcut appears in Remote V1. Save receipts remain available in
  History and in Inspect save diagnostics under Help · Diagnose.
- Get URL defaults to On. Cloudflare History Media defaults to Expand all
  images and leaves Details, Public URLs, and Error independent. Stored
  explicit preferences retain precedence. Loading remains limited to visible
  cards, with at most two outstanding preview reads.
- History matches partial text and numbers against retained record metadata.
  It scans ordered IndexedDB records in bounded batches, limits results to
  the active display range, and cancels obsolete queries. The records and
  their source receipts require no migration or rebuild.
- The 10-second footer uses an absolute deadline and a dismiss button.
  Reconnect feedback belongs to the Files browsing attempt. The approved
  Console Era v2 reveal uses the provider palettes and timeline from the
  reference. The bundled 256 × 253 RGBA PNG is a Lanczos reduction of the
  approved 1261 × 1247 original. The original SHA-256 is
  `0e10d0bea5f3513892256c240374b29301f6dcc0be2c9bf8e62e2e4a5ad2401d`.
- Upload uses the existing Cloudflare R2 File API. The ordinary multi-file
  picker sends one file at a time to the current bucket and folder. The
  background performs its existing staged byte comparison and signed move,
  and Explorer refreshes after confirmed writes. The File API retains
  cancellation, the Keep conflict policy, and recovery keys on uncertainty.

## Evidence and limits

- Build and API documentation check passed. The API inventory contains
  78 methods and 3 shortcuts.
- The Chromium archive benchmark searched 25,000 synthetic retained
  records for `OBJect-75` and found 250 matches in 839 ms. It also validated
  ZIP CRC, checksums, and order for all 25,000 records.
- The Console Era Chromium fixture checked all four palettes and exact
  animation delays and durations, reduced motion, narrow layout, keyboard
  dismissal, duplicate suppression, and expiry.
- The packaged Shelf Chromium fixture passed 13 checks, including rapid
  Preview navigation and the 320 px and 920 px layout matrix across 32
  appearance modes. The header recalculates overflow when a theme or a
  loaded font changes tab widths.
- Upload tests cover the independently callable File API and the packaged
  Explorer picker with fixture transport. They exercise exact folder
  targeting, sequential files, confirmation, conflicts, cancellation, and
  listing refresh.
- The full suite has a menu-composition snapshot mismatch reproduced on
  the untouched branch baseline in `tests/depth-scope-regression.test.mjs`.
- Genuine installed Shelf, native notification, and Windows acceptance
  remain unverified. Chromium returned
  `UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR` before loading the build.
  No live Cloudflare uploads or production provider writes were performed.
