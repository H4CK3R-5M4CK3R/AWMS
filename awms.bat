@echo off
title AWMS - Android Web Management Service
cd /d "%~dp0"

echo ==============================================================
echo   Starting AWMS (Android Web Management Service)...
echo ==============================================================

if not exist "dist\index.js" (
  echo [AWMS] Building project first...
  call npm run build
)

node dist\index.js %*
if errorlevel 1 (
  echo.
  echo [AWMS] Error encountered. Press any key to exit.
  pause >nul
)
