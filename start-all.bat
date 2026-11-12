@echo off
setlocal
title PathFinder — Launcher

echo =======================================================
echo          PathFinder — Full Stack Launcher
echo =======================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting backend (FastAPI on Port 8000)...
start "PathFinder Backend (Port 8000)" cmd /k "python run.py --reload --no-browser"

echo [2/3] Waiting for backend to be ready...
timeout /t 3 /nobreak >nul

echo [3/3] Starting frontend (Vite on Port 5173)...
start "PathFinder Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo [4/4] Synchronizing servers...

rem Wait for backend API to be live (prevents ECONNREFUSED on first requests)
set /a attempts=0
:WAIT_BACKEND
curl.exe -s -f http://127.0.0.1:8000/api/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo       [+] Backend API is live on http://127.0.0.1:8000
    goto WAIT_FRONTEND
)
set /a attempts+=1
if %attempts% geq 25 (
    echo       [!] Backend start timed out. Continuing to frontend...
    goto WAIT_FRONTEND
)
timeout /t 1 /nobreak >nul
goto WAIT_BACKEND

rem Wait for frontend Vite dev server
:WAIT_FRONTEND
set /a f_attempts=0
:FRONTEND_LOOP
curl.exe -s -f http://localhost:5173 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo       [+] Frontend Dev Server is live on http://localhost:5173
    goto READY
)
set /a f_attempts+=1
if %f_attempts% geq 15 goto READY
timeout /t 1 /nobreak >nul
goto FRONTEND_LOOP

:READY
echo.
echo =======================================================
echo  PathFinder is ready! Opening browser once...
echo  - Frontend: http://localhost:5173
echo  - Backend:  http://127.0.0.1:8000
echo =======================================================
echo.
start http://localhost:5173
exit /b 0
