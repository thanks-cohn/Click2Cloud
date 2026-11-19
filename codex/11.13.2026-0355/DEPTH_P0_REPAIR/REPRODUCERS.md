# Reproducers
Run from repository root: `node --test tests/depth-p0-click.test.mjs`.

The baseline-control test disables the new Depth wrapper, retains production registrar/action resolver/engine, gives a complete native ACK and stale negative readiness, and simulates a now-ready setupOnly fallback. Result: FRESH_CLICK_REQUIRED and zero upload calls. This matches the source contract mismatch; it does not identify the owner's historical action.

The paired emitted-listener test uses actual asynchronous create callbacks and production registrar/engine. Enable the wrapper; fresh scoped status becomes READY; the existing authorization cache observation updates; root, Images/ branch Save here and Images/Artwork/ terminal dispatch reach the injected remote boundary with exact identity. Expected fixture keys: probe.txt, Images/probe.txt, Images/Artwork/probe.txt. Injected boundary reports verification; these are not Cloudflare receipts/readback.

Other named tests inject PREPARED/missing plan/network/scope rejection, five plan identity causes, native root/parent/leaf creation errors, removeAll error, callback timeout, cold worker metadata with no current ACK, revoked membership, unsafe exception text, uncertain/partial dispatch and storage failure. Unknown/uncertain is never automatically retried. Simple control bypasses the entire Depth lifecycle.

Real Chromium production-IDB/UI test: `node scripts/test-depth-click-history.mjs`. It records a blocked depth-click, opens Save Results, verifies metadata and absent receipt controls, reloads and verifies retained kind/result. Provider/IPC are fixtures. No real native callback or R2 write occurs.

Evidence keys: depth-click:<UUID> is a click attempt; terminal cause links the remote operation ID where available. stage JSON includes item/parent/role/actionKind/mode, desired/ACK generation, native code, boundary and safe Worker subreason. No source URL, plan secret or token is serialized. A click with failed durable storage remains a known limitation; depthRecordCode reports that failure.
