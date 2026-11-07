@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is needed to run this preview. Install Node.js, then run this file again.
  pause
  exit /b 1
)
node serve.cjs --open
if errorlevel 1 pause
