# Minor fix — remove unnecessary "Cloud connections" heading in Explorer

**Status:** Requested, not yet implemented.

In the Explorer cloud-navigation pane, remove the visible **"Cloud connections"** heading. The provider/account/folder tree already communicates what this area contains; the extra words use space without helping.

- The current text is in `extension/app.html` under the Explorer `aside`: `<h2>Cloud connections</h2>`.
- Remove or visually omit the redundant heading while preserving the `aside`, `#connection`, `#tree`, all account/folder controls, and layout. Keep a concise non-visible accessible name on the `aside` so the navigation remains identifiable without visible clutter.
- Do not remove the **Cloudflare** provider identity or login/connection status, and do not change actual cloud connections, authorization or Explorer API.
- Verify the text is absent and tree/account navigation still works, with no unnecessary whitespace at the top.
