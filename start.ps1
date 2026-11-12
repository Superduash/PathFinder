#!/usr/bin/env pwsh
# PathFinder Quick Start Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PathFinder - Starting Both Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot

# Start Backend
Write-Host "[1/2] Starting Backend (Python/FastAPI)..." -ForegroundColor Yellow
$backendJob = Start-Process -FilePath "python" -ArgumentList "run.py", "--reload", "--no-browser" -WorkingDirectory $projectRoot -PassThru -WindowStyle Normal
Write-Host "       Backend PID: $($backendJob.Id)" -ForegroundColor Green

# Wait for backend to be ready
Write-Host "[2/2] Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Test backend health
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "       Backend is READY ✓" -ForegroundColor Green
} catch {
    Write-Host "       Warning: Backend may still be starting..." -ForegroundColor Yellow
}

# Start Frontend
Write-Host ""
Write-Host "[3/3] Starting Frontend (Vite)..." -ForegroundColor Yellow
Set-Location "$projectRoot\frontend"
$frontendJob = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Normal
Write-Host "       Frontend PID: $($frontendJob.Id)" -ForegroundColor Green

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PathFinder is Running!" -ForegroundColor Green
Write-Host "  Backend:  http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Gray

# Open browser
Start-Sleep -Seconds 1
Start-Process "http://localhost:5173"

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Process -Id $backendJob.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendJob.Id -Force -ErrorAction SilentlyContinue
}
