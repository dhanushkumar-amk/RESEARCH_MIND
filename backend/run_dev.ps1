$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonExe = Join-Path $projectRoot "venv\Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Error "Virtual environment Python not found at $pythonExe"
}

Set-Location $projectRoot
& $pythonExe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
