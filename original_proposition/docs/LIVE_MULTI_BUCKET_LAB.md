# Live multi-bucket R2 test matrix — 2026-11-03

Created four additional Cloudflare R2 buckets. The original `redown` test bucket is preserved.

| Bucket | R2 managed r2.dev | Expected behavior |
|---|---|---|
| redown-bucket-1 | enabled (public development URL) | Signed-out object GET is permitted by key |
| redown-bucket-2 | disabled (private) | Signed-out object GET must be rejected |
| redown-bucket-3 | enabled (public development URL) | Signed-out object GET is permitted by key |
| redown-bucket-4 | disabled (private) | Signed-out object GET must be rejected |

Cloudflare R2 managed-domain GET API confirmed each state. **Actual unauthenticated HTTP GET from the public Internet was not yet confirmed by this session's browser tool** and remains an E2E acceptance test.

Public URLs, returned by Cloudflare API:
- `https://pub-6bbb29e7e8f84a588d1fb9ef24469e4c.r2.dev` (redown-bucket-1)
- `https://pub-e15c613d733c482ea98486f8cb15ae8a.r2.dev` (redown-bucket-3)

All four buckets have:
- 19 isolated, zero-byte, trailing-slash directory markers rooted under `__click2cloud_lab__/` with shared, repeated, and 12-depth folders;
- an actual 78-byte `__click2cloud_lab__/access-probe.txt` object with deliberately non-sensitive, test-only contents;
- no modifications to unrelated bucket data.

Fixtures support multi-bucket Simple, Narrow, Depth, duplication, and public/private routing acceptance. Do not expose personal files in public buckets. The Cloudflare-managed `r2.dev` endpoints are rate-limited development URLs, not production serving domains.

## Larger GitHub corpora (verified via GitHub's recursive Git Trees API)

- [apache/tika](https://github.com/apache/tika): 5,291 Git-tracked blob files, about 289,033,501 bytes; many Java source files plus a wide range of test PDFs, DOCX, office archives, MP3s and more. `git clone --depth 1 https://github.com/apache/tika.git`
- [jooy2/sample-assets](https://github.com/jooy2/sample-assets): 694 Git-tracked blob files, about 165,035,108 bytes; stronger focus on multimedia, documents and synthetic datasets. `git clone --depth 1 https://github.com/jooy2/sample-assets.git`

No bulk copy of these repositories into R2 has been performed yet. Mirror to a dedicated prefix with manifest of relative paths, byte length and digest to verify copy completeness. `git` does not track empty directories. Respect the repositories' licenses and do not expose unknown test fixtures publicly.

## GitHub repository ZIP support

See [issue #1](https://github.com/thanks-cohn/Click2Cloud/issues/1) for the proposed live GitHub Download ZIP → R2 feature. The public repo ZIP includes a snapshot of one ref, not full `.git` history. It is not yet implemented.
