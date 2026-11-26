@echo off
setlocal
pushd "%~dp0..\.." || exit /b 2
"lab-local\.venv\Scripts\redown-lab.exe" campaign --input "lab-local\input" --output "owner-600" --operations upload --execution completion --benchmark-seconds 2400 --execution-seconds 3600 --inventory-seconds 1800 --transfer-seconds 300 --inactivity-seconds 120 --request-seconds 30 --upload-seconds 300 --verification-seconds 300 --authorization-minutes 75 --audit-seconds 300 --audit-requests 24 --audit-operations 56 --audit-traffic-bytes 8388608 --concurrency 1 --verification production --expect-files 600 --file-budget 600 --provider-requests 160000 --operation-budget 750 --traffic-bytes 8589934592 --temp-disk-bytes 1073741824 --approve-cost-usd 2.00 --live
set "REDOWN_CAMPAIGN_EXIT=%ERRORLEVEL%"
popd
exit /b %REDOWN_CAMPAIGN_EXIT%
