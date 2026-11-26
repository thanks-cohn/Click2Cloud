@echo off
setlocal
if "%~1"=="" goto usage
if "%~2"=="" goto usage
rem Open the owner's existing Chrome profile and two explicit benign QA pages.
rem The owner performs actions on the actual Windows native menu.
start "" chrome.exe "chrome://extensions/"
start "" chrome.exe "%~1"
echo Reload the unpacked candidate and confirm extension ID ajppphdiamdobknpamcheohmdbdbeoal.
echo Use Settings and Remotes to log in to the selected QA account.
echo Right-click the benign link or image and use the selected REDOWN native menu leaf.
echo Verify the exact object and one Queue/History success. End the service worker, then right-click and save a second benign link.
echo With Chrome closed, reopen the same existing profile. Check saved destinations, menu, reconnect and Save Here.
echo Open Explorer and follow the single, selected-files ZIP and recursive ZIP smoke cases for %~2.
echo Record evidence and mark each step PASS, FAIL, BLOCKED or NOT_TESTED in the handoff.
exit /b 0
:usage
echo Usage  %~nx0 [owner-approved public HTTPS QA fixture page] [exact QA bucket/prefix label]
exit /b 2
