@echo off
setlocal
rem Run from the root of a NEW review checkout, never the owner's active profile.
for /f %%B in ('git branch --show-current') do set "C2C_BRANCH=%%B"
if not "%C2C_BRANCH%"=="fix/mv3-recorder-suite-reliability" (
  echo Wrong branch. Use a separate review checkout of fix/mv3-recorder-suite-reliability.
  exit /b 1
)
git status --short
git rev-parse HEAD
node --version
node -e "if(Number(process.versions.node.split('.')[0])<22)throw Error('Node >=22 required')"
if errorlevel 1 exit /b 1
call npm ci --cache "%TEMP%\c2c-review-npm-cache" --ignore-scripts --no-audit --no-fund
if errorlevel 1 exit /b 1
git ls-files --eol src extension right2cloud-module/src
node --test tests/checkout-integrity.test.mjs tests/mv3-import-policy.test.mjs
if errorlevel 1 exit /b 1
set "C2C_REVIEW_OUT=%TEMP%\c2c-mv3-reliability-%RANDOM%-%RANDOM%"
node scripts/repeat-reliability.mjs root=. "out=%C2C_REVIEW_OUT%" full=10 isolated=10 jobs=1 trace=1 modes=1
if errorlevel 1 exit /b 1
node --test right2cloud-module/tests/module.test.mjs
if errorlevel 1 exit /b 1
call npm run build:extension
if errorlevel 1 exit /b 1
echo Local suite and build completed. No extension was installed or deployed.
echo Results: %C2C_REVIEW_OUT%
endlocal
