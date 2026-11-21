@echo off
title AWMS - MCP Server (Static Port 7171)
cd /d "%~dp0"

echo ==============================================================
echo   Starting AWMS MCP Server on http://127.0.0.1:7171/sse ...
echo ==============================================================

if not exist "dist\index.js" (
  echo [AWMS] Building project...
  call npm run build
)

node dist\index.js --no-browser %*
if errorlevel 1 (
  echo.
  echo [AWMS] Error encountered. Press any key to exit.
  pause >nul
)
