@echo off
setlocal
cd /d "%~dp0.."
if errorlevel 1 exit /b 1
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is missing. Install Node 24 LTS from https://nodejs.org, then try again.
  pause
  exit /b 1
)
node -e "if (Number(process.versions.node.split('.')[0]) < 22) process.exit(1)"
if errorlevel 1 (
  echo Node.js 22 or later is required. Node 24 LTS is recommended.
  pause
  exit /b 1
)
rem Web preview uses built-in Node modules; npm install is not needed.
node scripts/start.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
endlocal
