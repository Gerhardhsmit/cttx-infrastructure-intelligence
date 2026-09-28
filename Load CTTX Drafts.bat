@echo off
rem Load CTTX drafts into Outlook (gerhard@cttx.co.za Drafts). Never sends.
cd /d "%~dp0"
echo Updating from GitHub...
call :clearlock || goto :busy
git checkout claude/elegant-pascal-1jsjwa
rem
git pull --ff-only || (
  echo First attempt failed, trying again in 15 seconds...
  timeout /t 15 /nobreak >nul
  call :clearlock || goto :busy
  git pull --ff-only || goto :pullfail
)
echo.
echo Self-checking the loader...
python outbound-communication\test_no_send.py >nul 2>&1 || goto :fail
python outbound-communication\test_loader.py >nul 2>&1 || goto :fail
echo Self-check passed.
echo.
python outbound-communication\load_drafts.py --from-repo
echo.
pause
exit /b 0

:clearlock
rem A leftover .git\index.lock blocks every update. Remove it only when no git process is running.
if not exist ".git\index.lock" exit /b 0
tasklist /FI "IMAGENAME eq git.exe" 2>nul | find /I "git.exe" >nul && exit /b 1
del /f ".git\index.lock" >nul 2>&1
echo Removed a leftover git lock file.
exit /b 0

:busy
echo.
echo Another git process is still running in this folder. Nothing was loaded and nothing was sent.
echo Close any other black windows, wait a minute, then run Load CTTX Drafts again.
pause
exit /b 1

:pullfail
echo.
echo COULD NOT DOWNLOAD THE LATEST DRAFTS FROM GITHUB - nothing was loaded and nothing was sent.
echo Take a photo of this window and send it to Claude.
pause
exit /b 1

:fail
echo.
echo LOADER SELF-CHECK FAILED - nothing was loaded and nothing was sent.
echo Tell Claude: "Load CTTX Drafts self-check failed".
pause
exit /b 1
