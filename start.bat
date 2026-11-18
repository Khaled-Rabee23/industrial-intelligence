@echo off
cd /d "%~dp0"
node --version >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed or is not on PATH.
  echo Install Node.js 20 or newer, then reopen this window.
  pause
  exit /b 1
)
echo Starting Industrial Intelligence local server...
echo Open http://127.0.0.1:8787 in your browser.
node server.mjs
pause
