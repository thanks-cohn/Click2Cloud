# Click2Cloud 0.3.22 — SEPARATE Codex Run: Auto-Reroute

**Owner decision: November 20, 2026. Status: RESERVED FOR A LATER, SEPARATE CODEX RUN.** This file is NOT part of the Click2Cloud 0.3.21 Codex implementation request. Do not implement, scaffold, create a Rules menu/page, register download handlers, or modify the current 0.3.21 build for this feature.

## Scope firewall

- **0.3.21:** Screenshot-to-Cloud (More → Screenshot), existing Search/Get URL/Minimal UI/Destinations Manager fixes, Shelf/History shortcut, shared screenshot receipts, regressions and release.
- **0.3.22 (THIS SEPARATE RUN ONLY):** Automatic eligible browser-download-to-R2 routing; its own More → Rules entry, website+extension saved rule cards, Chrome-byte transfer to the existing Worker, actual download interception and verifiable R2 receipts.
- Preserve the frozen 0.3.21 Screenshot logic and both Chrome-scoped default shortcuts `Alt+Q` and `Ctrl+Shift+Y`. Do not change their listener semantics, screenshot UI, worker screenshot routes or Explorer F7/F8/F9 shortcuts.
- Start this later request from the latest released/merged **0.3.21** baseline, not historical 0.3.20 files. Use a separate Codex branch and report commit SHAs. Raise product version to **0.3.22** only when the new feature and regressions are genuinely verified.

## Binding complete architecture and UX specification

Read [`/auto-reroute/README.md`](../auto-reroute/README.md). That remains the complete owner-approved Auto-Reroute specification and is deferred wholesale to **0.3.22**, including its working-first implementation order, realistic Chrome limitations, and RAW/SECURE receipt policy.

### Simple, independent user interface

**More → Rules** is added in 0.3.22 as its OWN menu entry, alongside the already-shipped **More → Screenshot** and Settings. Rules is NOT an alias for Screenshot.

```text
More ▾
  Rules             ← new in 0.3.22
  Screenshot        ← already implemented in 0.3.21
  Settings

Auto-Reroute Rules
Website         [ example.com / All websites     ▾ ]
File extension  [ .zip                           ▾ ]
Saving to: Cloudflare R2 / authorized-folder/  [ Change ]
                                             [ Save ]

Saved Rules
Rule 1 · example.com · .zip · R2/authorized-folder/   [Active ON/OFF] [X]
```

- On **Save**, persist a new card directly underneath. The Save button does not start a download. Cards have independently controlled **Active/Inactive** toggle and **X Delete**; click card body to edit website scope, exact extension or authorized destination. Pagination: 25/page, unlimited total rules. Auto-name Rule 1, Rule 2, etc.
- Website matches the trustworthy **initiating website** where the download starts, not a guessed CDN source URL; support specific domain/subdomain/exact-host/exact-page scope and an explicit All websites choice.
- Download rule matching uses **one winning destination**, with explicit deterministic specificity/conflict handling. It is deliberately NOT the additive Screenshot rule engine.

### Working Auto-Reroute first (not merely UI)

1. Prove early control of ONE genuine eligible browser download action (start with a public PNG or ZIP where Click2Cloud can access the response). Do not claim to hijack every existing Chrome download: the Downloads API does not expose arbitrary already-running response bodies.
2. The Chrome extension obtains the ORIGINAL HTTP response bytes and streams them **from Chrome to the EXISTING trusted Click2Cloud Worker**, which writes the unchanged file into the selected authorized R2 bucket/prefix. Worker-side source-URL fetching is NOT equivalent, and Chrome Downloads-file staging is NOT the intended data path.
3. Verify the object really exists with the expected size/content and record an inspectable receipt; preserve RAW full operational receipts and a separate SECURE redacted mode through the existing recorder.
4. On unsupported/private/POST/blob/expiring/session-bound sources that cannot be intercepted, let Chrome perform its normal download, accurately report this capability limit, and do not silently claim a cloud save. iCloud-generated ZIPs require independent testing, not an assumed blanket guarantee.
5. After the small real transfer works, expand V1 to PNG/JPG/JPEG/GIF/WebP, MP4/WebM, ZIP/CBZ; optional AVIF only after proof. Centralize extensions in a capability registry. For large/unknown-length files, use bounded browser byte-streaming and appropriate multipart/known-length R2 transfers. Preserve original bytes (no media transcoding, ZIP extraction or URL-only shortcut).
6. Test installed Chrome, source response eligibility, real web page click, source/initiating website matching, redirects/Content-Disposition, accurate extension recognition (especially ZIP vs CBZ), original-browser/local download behavior, Worker retry, partial/uncertain receipts and independently verified disposable R2 writes. Differentiate DONE, NOT TESTED and BLOCKED and don't produce fake success from mocks.
7. Prioritize the working feature without speculative hardening or repeated consent dialogs, but continue to use existing OAuth login, already selected authorized destination and correct R2 object verification. Do not rewrite stable Simple/Narrow/Depth, Screenshot, History or File API subsystems.

## 0.3.22 acceptance/deliverable

- An actual supported website action results in ONE remote file created from the original bytes in Chrome and independently verified in R2, with a truthful user-readable receipt.
- An ineligible action behaves as a normal Chrome download and never disappears or produces an invented cloud-success report.
- Rules page works with Save, cards, Active toggle, X Delete and 25/page; R2 folder selection is explicit; Screenshot menu and both screenshot shortcuts still work exactly as 0.3.21.
- Provide a pushed implementation branch, tests, real Chrome/R2 evidence if available, exact commit SHAs, known limitations and a versioned 0.3.22 extension artifact only if ready.

**No 0.3.22 implementation is authorized by the 0.3.21 Codex run. This file is the separate later request.**
