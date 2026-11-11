# Start backend with reload and frontend dev server in parallel
$ErrorActionPreference = "Stop"

Write-Host "Starting PathFinder in development mode..." -ForegroundColor Cyan

$backendJob = Start-Job -ScriptBlock {
    python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
}

Set-Location frontend
npm run dev

Stop-Job $backendJob
Remove-Job $backendJob
