@echo off
setlocal
if not exist "lab-local\.venv\Scripts\redown-lab.exe" goto install
set "LAB=lab-local\.venv\Scripts\redown-lab.exe"
set "MODE=%~1"
set "COUNT=%~2"
if not "%COUNT%"=="100" if not "%COUNT%"=="555" if not "%COUNT%"=="1000" goto usage
set "COMMON=--execution completion --authorization-minutes 75 --execution-seconds 3600 --benchmark-seconds 2400 --transfer-seconds 300 --concurrency 1 --retry-reserve 2 --approve-cost-usd 4 --live"

if /i "%MODE%"=="download" goto download
if /i "%MODE%"=="selection" goto selection
if /i "%MODE%"=="fixtures" goto fixtures
if /i "%MODE%"=="faults" goto faults
if /i "%MODE%"=="upload" goto upload
if /i "%MODE%"=="round-trip" goto roundtrip
goto usage

:fixtures
py -3 "%~dp0part1-fixtures.py" create "lab-local\part1-fixtures-%COUNT%" --files %COUNT%
exit /b %ERRORLEVEL%

:faults
set "REDOWN_OWNER_FIXTURE_FILES=%COUNT%"
set "REDOWN_RELIABILITY_FAULTS=1"
node scripts\verify-python-lab.mjs
exit /b %ERRORLEVEL%

:upload
"%LAB%" campaign --input "lab-local\part1-fixtures-%COUNT%\input" --output "part1-upload-%COUNT%" --expect-files %COUNT% --audit-seconds 300 %COMMON%
exit /b %ERRORLEVEL%

:roundtrip
"%LAB%" campaign --input "lab-local\part1-fixtures-%COUNT%\input" --output "part1-round-trip-%COUNT%" --expect-files %COUNT% --operations round-trip --verification sha256 --retain-downloads --audit-seconds 300 %COMMON%
exit /b %ERRORLEVEL%

:download
if "%~3"=="" goto usage
"%LAB%" download-campaign --run "%~3" --retain-downloads %COMMON%
exit /b %ERRORLEVEL%

:selection
if "%~3"=="" goto usage
"%LAB%" download-selection --output "part1-selection-%COUNT%" --download-to "%~3" --expect-files %COUNT% --inventory-requests 32 --inventory-traffic-bytes 4194304 %COMMON%
exit /b %ERRORLEVEL%

:install
echo Run npm ci and npm run build:extension, then install the Laboratory as described in HANDOFF.md.
exit /b 2

:usage
echo Usage  %~nx0 fixtures^|faults^|upload^|round-trip^|download^|selection 100^|555^|1000 [run directory or selected local output directory]
exit /b 2
