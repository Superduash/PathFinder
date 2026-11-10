@echo off
setlocal enabledelayedexpansion
title PathFinder — Launcher

echo =======================================================
echo          PathFinder — Full Stack Launcher
echo =======================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting PathFinder backend (FastAPI + Uvicorn)...
start "PathFinder Backend (Port 8000)" cmd /k "python run.py"

echo.
echo [2/3] Waiting for backend API to be ready on http://127.0.0.1:8000...
:WAIT_LOOP
powershell -Command "try { $res = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -UseBasicParsing -TimeoutSec 1; if ($res.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo       Backend is live and responding!
) else (
    timeout /t 1 /nobreak >nul
    goto WAIT_LOOP
)

echo.
echo [3/3] Starting frontend development server (Vite)...
cd frontend
start "PathFinder Frontend (Vite)" cmd /k "npm run dev"

echo.
echo =======================================================
echo  PathFinder is running!
echo  - Backend API: http://127.0.0.1:8000
echo  - Frontend Dev Server: http://localhost:5173
echo =======================================================
echo.
timeout /t 3 >nul
start http://localhost:5173
exit /b 0

