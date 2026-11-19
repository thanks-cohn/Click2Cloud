# Strictly Depth-scoped changes
- src/modes/depth/native-click.mjs: new mode-owned preflight/lifecycle, exact account/status checks, read-only plan discriminator, safe click-attempt record and terminal feedback. No writes to cloud/configuration and no retries.
- src/chrome/registrar.mjs: original handler body retained as handleClickBase. Wrapper calls new hook only for origin.mode=depth. On cold start optional readDepthClickRow retrieves only persisted Depth metadata; historical ACK never authorizes. Other modes retain original dispatch/resolve/application path. ACK application and hierarchy untouched.
- extension/background.mjs: wire Depth hook, exact-target fresh READY observation, lastDepthClick + notification/badge + open-Shelf status message. Known Depth attention rows request Shelf only during the original gesture. No promise that Chrome accepts opening it.
- src/persistence/current-store.mjs: preserve only the new kind=depth-click instead of coercing it to save. Existing state schema/store and all other kind normalization retained; no migration.
- extension/app.mjs: only depth-click records get dedicated details without receipt/GO TO/cancel buttons; trusted Depth outcome messages update existing status. Existing remote records render unchanged.
- Required CURRENT hashes and source/API notes updated. No menu compiler, projection, depth/sibling bounds, scroll, OAuth, deployment, transport or unrelated mode implementations changed.

The fresh READY observation is stored by the existing full target key; it cannot borrow another bucket/connection/account. It may refresh a physical target observation shared with another presentation, just as existing inventory refresh does, but does not bypass existing authorization or change any other mode implementation. Scope/permission checks run again in the original engine and transport.

No shared registrar redesign was made: a failed unrelated create can still invalidate complete ACK. Changing that authority model would affect other modes and requires separate review. This patch reports the failure for Depth rather than pretending upload succeeded.
