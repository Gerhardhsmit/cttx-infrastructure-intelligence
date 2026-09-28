@echo off
rem Load CTTX prospect drafts into Outlook (gerhard@cttx.co.za Drafts). Never sends.
cd /d "%~dp0"
echo Updating drafts from GitHub...
git checkout claude/elegant-pascal-1jsjwa
git pull --ff-only
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
:fail
echo.
echo LOADER SELF-CHECK FAILED - nothing was loaded and nothing was sent.
echo Tell Claude: "Load CTTX Drafts self-check failed".
pause
exit /b 1
