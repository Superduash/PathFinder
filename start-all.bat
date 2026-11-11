@echo off
setlocal
title PathFinder — Launcher

echo =======================================================
echo          PathFinder — Fast Launcher
echo =======================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting backend (FastAPI)...
start "PathFinder Backend (Port 8000)" cmd /k "python run.py --no-browser"

echo [2/2] Starting frontend (Vite)...
start "PathFinder Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo Waiting for frontend server...

rem Fast polling for Vite (curl check, opens as soon as ready)
for /L %%i in (1,1,10) do (
    curl.exe -s -o nul http://localhost:5173 && goto READY
    timeout /t 1 /nobreak >nul
)

:READY
echo.
echo =======================================================
echo  PathFinder is live! Opening browser once...
echo  - Frontend: http://localhost:5173
echo  - Backend:  http://127.0.0.1:8000
echo =======================================================
echo.
start http://localhost:5173
exit /b 0
