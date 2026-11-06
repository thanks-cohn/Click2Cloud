# Click2Cloud MV3 product

Run `npm run build:extension` and load `dist/click2cloud` through Chrome's **Load
unpacked** in a profile that permits developer extensions. Click the toolbar action
to open Remotes. The stable ID is `ajppphdiamdobknpamcheohmdbdbeoal`.

The app uses V3+1.1 through `src/api/service.mjs`; schemas/types accompany the build.
OAuth uses the owner-registered Click2Cloud identity, not REDOWN credentials.
Login never provisions a bucket, starts a scan or navigates to another app view.

**Current acceptance is incomplete.** The implementation host supports real OAuth
and management reads when permitted, but requires an authenticated Worker mutation
transport before enabling saves. The available lab Worker has no public/preview
route; it was not deployed or modified. Windows known-folder backups require a
native companion. A separately user-authorized filesystem directory is supported.

See `docs/evidence/final-v3p1/ACCEPTANCE.md` for the independent PASS / FAIL /
BLOCKED / NOT TESTED evidence. Fixture browser screenshots are not live provider,
installed native menu, or verified upload proof.
