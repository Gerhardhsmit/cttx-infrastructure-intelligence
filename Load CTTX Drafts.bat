@echo off
rem Load CTTX prospect drafts into Outlook (gerhard@cttx.co.za Drafts). Never sends.
cd /d "%~dp0"
echo Updating drafts from GitHub...
git checkout claude/elegant-pascal-1jsjwa
git pull --ff-only
echo.
python outbound-communication\load_drafts.py --from-repo
echo.
pause
