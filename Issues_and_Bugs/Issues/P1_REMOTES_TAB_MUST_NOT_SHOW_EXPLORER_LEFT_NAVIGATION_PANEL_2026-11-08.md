# P1 UX — Remotes is its own screen; hide File Explorer's left folder navigation

**Owner direction:** 2026-11-08 — “Remotes shouldn't show the File Explorer left panel; it should simply contain its own contents.”

**Status:** OPEN, source-backed. **Product:** Click2Cloud Shelf 0.3.11. This is a layout/navigation separation change, not a Cloudflare connection or file-transfer redesign.

## Actual

`extension/app.html` has a persistent `<aside aria-label="Cloud navigation">` with `#connection` and `#tree` **outside** the `#main` tab content. `extension/app.mjs:show(next)` calls `renderRemotes()` and controls some `#connection` visibility, but does not hide the `aside` when `view==='remotes'`. Therefore the File Explorer folder tree remains visible next to Remotes, consuming width and conflating two views. The owner does not want this.

## Required presentation contract

1. **Remotes tab:** Hide the entire File Explorer left pane (the `aside` containing the account/bucket/folder tree), not just its login portion. `#main` should occupy the available Shelf width with **only Remotes' own contents**: provider cards, connection/readiness, login/reconnect/repair actions and status, according to existing legitimate API states. Remotes should not be a split-pane Explorer.
2. **File Explorer tab:** Show the left tree and right file listing, retaining navigation, account/bucket/folder hierarchy, its independent saved scroll/expanded state and selection.
3. **Settings tab:** Do not show an unrelated Explorer tree by default; Settings should likewise use its own content width and settings controls. The user's explicit requirement is Remotes, so treat Settings behavior as consistent tab separation rather than a new screen redesign.
4. Tab switching `Remotes → Explorer → Remotes` must not lose current Explorer position, selected files, expanded tree, configured destinations, login status, current Default or other API state. Hiding a pane must not disconnect or clear it.
5. File Explorer's persistent shell/virtualization must remain fast; no re-fetching entire cloud inventory because a hidden tree becomes visible again. No duplicated DOM IDs or stale event listeners. Respect accessible hidden state, focus transfer and responsive side panel widths.
6. Implement via minimal `#shell` layout/view state or safe show/hide of the existing `aside`. Do **not** create a second cloud navigation tree or copy Explorer logic into Remotes.
7. Verify current login/attention view is reachable and understandable in Remotes when Explorer aside is absent. Do not hide the only Log in affordance without relocating/reusing existing authenticated UI controls.
8. Real Chrome visual tests for Remotes width, File Explorer tree restoration, Settings layout, narrow Shelf width, and repeated tab transitions. Fixture-only screenshots must be identified as such.

## Done

Selecting **Remotes** shows a **single full-width Remotes panel** with no Explorer folders/tree down the left. Selecting **File Explorer** restores its conventional two-pane view. No destructive cloud or storage changes.

**NO BLOAT · DISTINCT TABS · PRESERVE THE FILE EXPLORER STATE.**
