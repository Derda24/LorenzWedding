@echo off
cd /d "%~dp0"
git add -A
git status
git commit -m "Update: featured data, index, and new images" 2>nul || echo Nothing to commit or already committed.
git push origin main
pause
