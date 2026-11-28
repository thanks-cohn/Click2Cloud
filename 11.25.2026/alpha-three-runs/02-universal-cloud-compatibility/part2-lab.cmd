@echo off
setlocal
if /i "%~1"=="right-click" goto right_click
if /i not "%~1"=="faults" goto usage
if not "%~2"=="8" if not "%~2"=="24" if not "%~2"=="100" if not "%~2"=="555" if not "%~2"=="1000" goto usage
if exist "lab-local\.venv\Scripts\python.exe" (
  "lab-local\.venv\Scripts\python.exe" scripts\profile-python-lab.py --files %~2
) else (
  py -3 scripts\profile-python-lab.py --files %~2
)
exit /b %ERRORLEVEL%

:right_click
set "PYTHONPATH=%CD%\11.25.2026\live-python-lab\python"
if exist "lab-local\.venv\Scripts\python.exe" (
  "lab-local\.venv\Scripts\python.exe" -m redown_live_lab right-click-fixture %2 %3 %4 %5 %6 %7 %8 %9
) else (
  py -3 -m redown_live_lab right-click-fixture %2 %3 %4 %5 %6 %7 %8 %9
)
exit /b %ERRORLEVEL%

:usage
echo Usage  %~nx0 faults 8^|24^|100^|555^|1000
echo Usage  %~nx0 right-click [--seed N] [--cases N] [--case N] [--timeout-seconds N]
echo Run from the repository root after npm ci.
exit /b 2
