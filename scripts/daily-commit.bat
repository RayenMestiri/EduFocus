@echo off
REM Script: scripts/daily-commit.bat
REM Usage: Run from scheduled Task Scheduler job. Adjust author/email as needed.

cd /d "%~dp0\.."
set TIMESTAMP=%DATE% %TIME%
echo Updated: %TIMESTAMP% > .github\daily-heartbeat.txt

git add .github/daily-heartbeat.txt


git push origin HEADngit commit -m "chore: local daily heartbeat" --author="Your Name <you@example.com>" || echo No changes to commit