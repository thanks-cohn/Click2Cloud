# REDOWN fixture library

This directory is a development-only QA resource; do not include it in the extension package. No private user data or executable installer payloads. Treat all fixtures as inert bytes; never execute or automatically extract/open them.

## Already vendored: 44 files
- 20 CC0 synthetic files (healthy, malformed, empty, mismatched extension) from [ARADURU](https://github.com/teamaraduru-hub/araduru-file-format-test-corpus/tree/316e1f03b6f13d3c84e68c61bb7f16af112465bd).
- 24 small synthetic files from [File Format Samples](https://github.com/Ponze08/file-format-samples/tree/ff0ca4d3bec30157c82ed9e130ffd37cd157908d), MIT license retained. Includes MP4, WebM, MKV, MOV, AVI, PNG, JPEG, SVG, GIF, WebP, ICO, WAV, MP3, FLAC, OGG, M4A, ZIP, TAR, JSON, CSV, HTML and CSS.
- Each copied file's Git blob SHA matched its upstream file. Upstream SHA-256 manifests retained; run independent hash checks before execution. No live provider tests performed here.

## On-demand realistic sizes
Pinned CC0 catalog from [loremfile](https://github.com/kumarprabhashanand/loremfile/tree/b10ec296ed8b38201ac8478245bfa35e0d04716f), version 1.17.0: 376 selected entries, including compressed and malformed content, realistic short clips, and size boundary files up to 100 MB. Large files are not committed. Download into a separate local input folder using Python standard library. Default is a dry plan; explicit --download, byte budget, and free-space check required.

From repo root:
```cmd
python 11.26.2026\fixture-library\fetch-fixtures.py --output lab-local\fixture-input --profile smoke
python 11.26.2026\fixture-library\fetch-fixtures.py --output lab-local\fixture-input --profile smoke --download
```
Profiles: smoke, small (<1 MiB), normal (1–8 MiB), large (8 MiB–100 MB), malformed, all. Increase budget only when disk and provider limits permit. Do not upload the catalog or license files as test payloads by accident; use the samples subdirectories or an explicit manifest. Current lab still has an 8 MiB per-file ceiling; larger fixtures are for the next implementation. Malformed content does not imply transfer failure: opaque storage must preserve exactly the original bytes.

See CODEX_REQUEST.md for the next implementation requirements. This branch adds fixture infrastructure and requirements, not a completed laboratory upgrade.
