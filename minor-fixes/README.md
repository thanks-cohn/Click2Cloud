# Minor fixes — Click2Cloud Explorer and future provider tabs

**Requested:** November 19, 2026. **Status:** Specifications only; not implemented.

Small, isolated UX improvements. Preserve the existing right-click save engine, cloud permissions, History, API-first design and current Worker architecture. Use focused acceptance tests; no blanket viewport/theme test matrix.

## Implement in the next Codex run

1. [One-row Explorer toolbar: show Refresh when space allows](ONE_ROW_EXPLORER_REFRESH_WHEN_SPACE.md)
2. [Remove the redundant "Cloud connections" heading](EXPLORER_REMOVE_CLOUD_CONNECTIONS_LABEL.md)
3. [Rename image immediately inline, without a new popup](IMAGE_RENAME_INLINE_NO_POPUP.md)
4. [Right-click any eligible folder → Make Default, automatically creating its Simple destination](RIGHT_CLICK_ANY_FOLDER_MAKE_DEFAULT_SIMPLE.md)

## Major future capabilities — separate proposal

[**major-fixes.md**](major-fixes.md) captures the proposed **Auto-Reroute Downloads to Cloud** (enabled in Settings; type/site → selected cloud folder; byte-streaming where truly possible), **Screenshot to Cloud** via the existing API-backed shortcut system, and **per-job timestamps, filenames, file sizes and cloud-side comparison evidence**. Diagnostics must remain **separate, bounded, expandable and non-blocking** so they never interfere with existing transfers, History, ZIP receipts or the save engine. **Do not include these major features in the current 0.3.20 run without separate authorization.**

## Future only — do NOT implement as part of 0.3.20

5. [Cloud provider tabs](FUTURE_CLOUD_PROVIDER_TABS.md): eventually turn the Cloudflare provider indicator into a tab next to other authorized connected providers, so users can switch clouds without a separate navigation page. Do not invent functioning providers or build this during the present run.

See the [next-Codex master request](../next-codex/CODEX_NEXT_EXPLORER_SEARCH_UI_AND_WORKER_IMPLEMENTATION_2026-11-18.md). The bulk-receipt ZIP-only and unchanged-History requirements still apply.
