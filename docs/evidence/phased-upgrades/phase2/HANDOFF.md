# Phase 2 — reversible Narrow visibility

Runtime commit:bc3e85a96421914c5d7308ce44180106331c9700. Representative gate PASS; actual installed acceptance remains BLOCKED by the Phase1 administrator-policy receipt. Focused suite300 PASS.

Root cause: the editor had only custom level flags; no reversible bulk presentation, and hiding the final level could replace or lose its actual leaf. Optional Narrow-only visibilityMode all/hide-all/custom now overlays retained custom flags. Show All reveals all ancestors; Hide All hides ancestors but keeps the deepest selected directory; Restore custom visibility restores preserved flags. Per-level edits select custom mode. The final level cannot be selected for hiding. Labels/target/config membership never change because of this switch.

Existing create/updateDestination API, closed schemas/types, configuration validation and the same projector own the behavior. Old configs without visibilityMode retain custom semantics. No new API owner or recovery machinery.

Browser proof uses real Shelf/API/IndexedDB/compiler and fixture Chrome/OAuth/provider boundaries; full, collapsed and mixed menus, repeated bulk/custom restoration, reload/relogin and exact target parity pass. Live proof uses the canonical menu/engine and unchanged existing isolated Worker, with callback ACK/environment authority explicitly substituted. Three actual saves in all/hide-all/custom independently read back identical bytes under the exact SAME physical prefix. No existing object/production deployment modified.

A repeat during concurrent test load exceeded the original5s test-only dialog wait; standard30s browser wait passed. The production code was unchanged by that harness adjustment. Native Windows rendering/click is not claimed.
