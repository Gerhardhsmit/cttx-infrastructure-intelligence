@echo off
rem Scheduled, non-interactive version of "Load CTTX Drafts". Never sends.
rem Pulls the loader branch and loads only NEW drafts into gerhard@cttx.co.za Drafts.
rem Register once (run in cmd from the repo folder):
rem   schtasks /Create /TN "CTTX Load Drafts" /SC WEEKLY /D MON,TUE,WED,THU,FRI /ST 08:30 /TR "\"%CD%\Load CTTX Drafts (scheduled).bat\"" /F
cd /d "%~dp0"
set LOG=%USERPROFILE%\Desktop\CTTX Prospect Drafts\_scheduled.log
if not exist "%USERPROFILE%\Desktop\CTTX Prospect Drafts" mkdir "%USERPROFILE%\Desktop\CTTX Prospect Drafts"
echo ===== %DATE% %TIME% >> "%LOG%"
call :clearlock || goto :busy
git checkout claude/elegant-pascal-1jsjwa >> "%LOG%" 2>&1
git pull --ff-only >> "%LOG%" 2>&1 || (
  timeout /t 30 /nobreak >nul
  call :clearlock || goto :busy
  git pull --ff-only >> "%LOG%" 2>&1 || goto :pullfail
)
python outbound-communication\test_no_send.py >> "%LOG%" 2>&1 || goto :fail
python outbound-communication\test_loader.py >> "%LOG%" 2>&1 || goto :fail
python outbound-communication\load_drafts.py --from-repo >> "%LOG%" 2>&1
exit /b 0

:clearlock
if not exist ".git\index.lock" exit /b 0
tasklist /FI "IMAGENAME eq git.exe" 2>nul | find /I "git.exe" >nul && exit /b 1
del /f ".git\index.lock" >nul 2>&1
echo Removed a leftover git lock file. >> "%LOG%"
exit /b 0

:busy
echo Another git process was running - skipped this run, nothing loaded, nothing sent. >> "%LOG%"
exit /b 1

:pullfail
echo COULD NOT UPDATE FROM GITHUB - nothing loaded, nothing sent. >> "%LOG%"
exit /b 1

:fail
echo LOADER SELF-CHECK FAILED - nothing loaded, nothing sent. >> "%LOG%"
exit /b 1
