@echo off
rem Scheduled, non-interactive version of "Load CTTX Drafts". Never sends.
rem Pulls the loader branch and loads only NEW drafts into gerhard@cttx.co.za Drafts.
rem Register once (run in cmd from the repo folder):
rem   schtasks /Create /TN "CTTX Load Drafts" /SC WEEKLY /D MON,TUE,WED,THU,FRI /ST 08:30 /TR "\"%CD%\Load CTTX Drafts (scheduled).bat\"" /F
cd /d "%~dp0"
set LOG=%USERPROFILE%\Desktop\CTTX Prospect Drafts\_scheduled.log
if not exist "%USERPROFILE%\Desktop\CTTX Prospect Drafts" mkdir "%USERPROFILE%\Desktop\CTTX Prospect Drafts"
echo ===== %DATE% %TIME% >> "%LOG%"
git checkout claude/elegant-pascal-1jsjwa >> "%LOG%" 2>&1
git pull --ff-only >> "%LOG%" 2>&1
python outbound-communication\test_no_send.py >> "%LOG%" 2>&1 || goto :fail
python outbound-communication\test_loader.py >> "%LOG%" 2>&1 || goto :fail
python outbound-communication\load_drafts.py --from-repo >> "%LOG%" 2>&1
exit /b 0
:fail
echo LOADER SELF-CHECK FAILED - nothing loaded, nothing sent. >> "%LOG%"
exit /b 1
