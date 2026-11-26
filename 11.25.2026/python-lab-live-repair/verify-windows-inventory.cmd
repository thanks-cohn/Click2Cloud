@echo off
setlocal
pushd "%~dp0..\.." || exit /b 1
if not exist "lab-local\.venv\Scripts\python.exe" (
  echo Run the virtual environment and editable-install commands in HANDOFF.md first.
  popd
  exit /b 2
)
"lab-local\.venv\Scripts\python.exe" -m unittest discover -s "11.25.2026\live-python-lab\python\tests" -v
set "RE_DOWN_TEST_EXIT=%ERRORLEVEL%"
popd
exit /b %RE_DOWN_TEST_EXIT%
