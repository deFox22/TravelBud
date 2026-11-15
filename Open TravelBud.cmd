@echo off
title TravelBud
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo TravelBud needs Node.js. Install it from https://nodejs.org and double-click this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo First run: installing TravelBud, this takes a minute...
  call npm install --silent
)

echo Building the latest version...
call npm run build --silent
if errorlevel 1 (
  echo The build failed. See the messages above.
  pause
  exit /b 1
)

echo.
echo   TravelBud is running at http://localhost:5173
echo   Keep this window open while you use it. Close it to stop.
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5173"
call npx vite preview --port 5173 --strictPort
