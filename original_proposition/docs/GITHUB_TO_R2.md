# Can a complete GitHub repository be stored in Cloudflare R2?

**Yes.** R2 stores arbitrary objects with path-like keys. A repository checkout can be uploaded preserving each relative path. Empty directories require optional trailing-slash zero-byte marker objects; Git itself doesn't track empty directories.

But **GitHub is the source-of-truth for code**. Storing source files in R2 does not automatically make them executable, deploy a web app, expose Git commits or provide version control. The Portal web UI should be hosted with a suitable frontend/backend deployment (for example Cloudflare Pages/Workers), and it should use R2 for storage and test objects.

For an existing GitHub repository, the simplest large-scale transfer is a controlled CI/CLI synchronization, not manually uploading a ZIP. One example from a checkout:

```sh
aws s3 sync . s3://redown/project-source/ \
  --endpoint-url "https://ACCOUNT_ID.r2.cloudflarestorage.com" \
  --exclude ".git/*" --exclude "node_modules/*"
```

This requires **separately scoped** R2 S3 API credentials in the environment; do not commit credentials into GitHub or expose them in chats. It is an example, **not executed**. For large repositories, use a dedicated prefix, dry-run/preflight, verification and a reversible sync; avoid `--delete` without an explicit cleanup authorization.

The connected GitHub and Cloudflare tools can also copy accessible individual source files into R2, but many-file binary syncs are better performed by a script or GitHub Actions. You do **not** need to upload a ZIP to Cloudflare first. If a repository is private, it must be available through the connected GitHub account or approved credentials.
