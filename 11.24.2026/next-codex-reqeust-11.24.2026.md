# Next Codex request — November 24, 2026

Follow-up requirements, separate from the authoritative 0.3.28 implementation specification. Audit the actual implementation before editing.

## 1. Screenshots tab — remove default setup card
- Remove the entire visible Default Screenshots card, including “All websites · redown / screenshots/” and “Choose a destination to activate.”
- Remove its container, borders, padding and reserved space. Do not replace it with another tutorial or setup suggestion.
- Preserve underlying default screenshot destination logic, rules, shortcuts, capture and genuine operation-specific recovery.

## 2. Remotes — clean initial provider presentation
- On first use, before any connection attempt, show neither “Not connected” nor the expandable “Connection details” section on provider cards. The initial status area should be empty and occupy no unnecessary space.
- This supersedes the earlier suggestion to display “Not connected” on initially disconnected Basic cards. Apply consistently wherever these initial-state messages appear, including Cloudflare as applicable.
- Preserve provider names, icons, existing card designs, Sign In/login actions and button positioning. Do not substitute another status label, setup hint or empty accordion.
- Keep actionable errors and relevant connection details accessible when an actual connection attempt or recovery requires them; do not suppress genuine failures or necessary consent. Preserve authentication, reconnect, verification, diagnostic data and successful-save feedback.
- Verify fresh installation, disconnected state, successful sign-in, failed sign-in, reconnect, all themes and narrow Shelf widths. Avoid unrelated changes to provider engines.
