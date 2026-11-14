# Independent Windows acceptance (not executed here)

Use a fresh checkout, not the owner's working profile or checkout. From Windows CMD:

```cmd
git -c core.autocrlf=true clone --branch fix/mv3-recorder-suite-reliability https://github.com/thanks-cohn/Click2Cloud.git Click2Cloud-MV3-review
cd Click2Cloud-MV3-review
scripts\test-windows-recorder.cmd
```

Choose an unused directory name. The script installs locked dependencies, checks
canonical source bytes, runs ten independent isolated and ten full suites with
OFF/BASIC/EXPANSIVE fixture modes, collects safe fixture traces, tests 49 module
cases and builds. It does not install an extension, touch a Chrome profile, reset
a checkout, provision a Worker, or write any real cloud objects. If a test fails,
keep all logs and the first failing `*-trace\depth-plan-recovery.json`. A retry
that passes is not a repair. Do not manually convert source files one by one.

The hash contract is SHA-256 of repository LF bytes. `.gitattributes` makes Git
materialize those same bytes for fingerprinted text roots even with autocrlf.
No expected hash was replaced to accommodate CRLF; binary PNG bytes are protected.
For an old checkout with user changes, preserve them first. This script deliberately
does not reset or rewrite such a checkout; the clean review clone is the test target.

## Installed MV3 gate

1. Record Windows version, Chrome version, checkout SHA and build `src/build-info.mjs`.
2. Start Chrome with a new empty data directory (a unique path) and no browser sign-in:

   ```cmd
   "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --user-data-dir="%TEMP%\C2C-MV3-manual-%RANDOM%"
   ```

   Never reuse the normal Chrome data directory. The extension has the same stable
   ID as Base 0.1 and must not replace it in the everyday profile.
3. In this disposable profile, open `chrome://extensions`, enable Developer mode
   only if policy allows it, then load `dist\click2cloud`. If policy blocks loading,
   preserve the error and mark BLOCKED. Do not bypass policy.
4. Inspect the extension's service worker before opening Shelf. Keep the earliest
   startup exception/module path and event chronology, sanitized of URLs/tokens.
   Verify the ID is `ajppphdiamdobknpamcheohmdbdbeoal`. No uncaught module-evaluation
   error is expected. Node/import-policy tests do not prove this installed gate.
5. Open the genuine side panel. Debug OFF should leave BASIC available; Debug ON
   should reveal recorder controls without automatically starting rich recording.
   In this empty, unauthenticated profile, a delivered save gesture may legitimately
   block on authorization; BASIC must record that as blocked/uncertain, not verified.
6. Start a consented finite recording, verify ACTIVE with run ID and committed count,
   Stop and verify STOPPED. Repeat with a small cap and enough delivered actions to
   reach LIMIT_REACHED. Stop must remain accessible while Start is pending.
7. Select the same committed snapshot. Download SECURE and, only for this synthetic
   test data, consented RAW. Independently unzip every downloaded part, verify the
   manifest privacy field and file hashes, N/A fields, first/last sequences and gaps.
   Never attach real user RAW data or signed URLs to a public issue or PR.
8. Turn Debug OFF, restart Chrome using the same disposable directory, then reopen
   the panel. BASIC continues where storage works; stopped rich runs remain stopped.
   Epoch gaps stay UNKNOWN, not a fabricated crash diagnosis. Repeat extension Reload
   only in this disposable profile, preserving data and old archives.
9. Optional automation of the existing genuine-side-panel probe:

   ```cmd
   set "C2C_CHROME_EXECUTABLE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
   set "C2C_HEADLESS=1"
   set "C2C_SHELF_EVIDENCE_DIR=%TEMP%\C2C-genuine-Shelf"
   call npm run test:shelf:extension
   ```

   The runner creates its own disposable profile. It respects extension policy and
   may return BLOCKED. Its capability probe is not itself a recorder/native-save pass.

## Native save / cloud permission boundary

No real Cloudflare mutation is authorized merely by running these local tests.
Only after the owner approves an account and disposable bucket/prefix may actual
Simple/Narrow/Depth native saves be tested and each object independently read back.
Repeat with BASIC, EXPANSIVE and injected recorder/storage faults. Count each real
provider write once; keep uncertain receipts uncertain and never replay for metrics.
Do not redeploy a Worker, alter OAuth, clear CURRENT, reset extension storage or
reuse the normal owner profile to make acceptance pass.

`SERVICE_UNAVAILABLE · worker-capability` remains a separate unresolved provider
observation. A CLAIMS Durable Object failure is not an OAuth/recorder diagnosis.
Collect safe evidence; do not replace or deploy infrastructure under this task.
