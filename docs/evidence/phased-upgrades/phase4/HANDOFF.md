# Phase 4 — stable image geometry

Runtime revision: `e6994d901948773934c32a011ec8e926e2449eae`. Gallery-only layout repair; canonical read/decode/download, Worker, authorization, destinations and storage are unchanged.

**Cause:** the dialog/section was auto-sized from decoded image intrinsic dimensions. Hidden/loading/error images reserved no height. Header titles could wrap, moving controls. A responsive fixed-size gallery dialog now owns a flex frame before reading, with image `object-fit: contain` and error/status inside the same reserved space. Long titles truncate visually, preserving filenames. Non-gallery dialogs are unaffected. Existing grid thumbnails already reserve 72px; no thumbnail engine change.

**Measured:** same production browser GUI, 1280×850 viewport: maximum position/size delta **470.3125px before → 0px after**, across pending/portrait/landscape/square/GIF/large JPEG/decode-error/rapid navigation. True viewport resize to360×640 is explicitly permitted and tested. See raw DOM rectangles in browser/results.json, screenshots and before/assets.json for exact asset revisions. Before result intentionally records FAIL for the old geometry; other25 browser regressions pass. After26 gates PASS, including real decoded pixels and byte-identical OPFS downloads with fixture auth/HTTP/picker. No invented Windows performance or installed-extension pass.

**Installed:** a fresh unpacked build at this exact revision was attempted. Browser155 on managed Linux blocks unpacked extensions: UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR; response null. No policy bypass. Receipt installed/real-shelf-receipt.json.

**Scope:** no loader/media module, gallery navigation polish or provenance yet. Next phase5 must build on this reserved container; keep visual-only loader lifecycle separate from object bytes. Phase6 follows5; phase7 follows verified menu phases. No production resources deployed/updated. Existing live Phase3 R2 receipts remain separate from these fixture-based browser results.
