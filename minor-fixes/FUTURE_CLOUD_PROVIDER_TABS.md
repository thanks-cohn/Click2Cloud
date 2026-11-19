# Future idea ONLY — connected-cloud provider tabs in Explorer

**Status:** FUTURE ROADMAP IDEA, **NOT to be implemented in the current 0.3.20 task**.

Currently Explorer identifies **Cloudflare**. In a future multi-provider version, make this small provider indicator a **tab** and show one neighboring tab for **each other connected/authorized provider** (e.g., Google Drive, OneDrive, Dropbox). Clicking a tab would change the Explorer's active cloud account/folder listing to that provider.

- Show tabs based on actual connected providers, not mere marketing placeholders. Do not imply these providers already work in this extension.
- Preserve a provider/account-specific location/selection state when switching; avoid crossing provider identities or accidentally making cloud writes to another account.
- Reuse the same canonical File API/provider abstraction and permission model, with a scriptable concept of `activeProvider` only if genuinely useful later.
- The current release is **Cloudflare R2-only**. Do not implement these tabs, import multi-cloud logic, add OAuth scopes or expand Worker architecture during the next-Codex run. This item should remain a clearly separated future request.
