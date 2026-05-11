# start-dev.ps1
# -----------------------------------------------------------------------------
# Starts the full Code Mentor development stack in one command:
#   1. Docker infrastructure -> MSSQL, Redis, Azurite, Seq, Qdrant, AI service
#   2. Backend (.NET 10 API on :5000) in a new PowerShell window
#   3. Frontend (Vite dev server on :5173) in a new PowerShell window
#
# Equivalent to the 3-window flow documented in TEAMMATE-SETUP.md, but
# automated. The Docker stack runs detached in the background. Backend and
# frontend each get their own visible PowerShell window so you can read
# their logs and Ctrl+C them when you're done.
#
# Usage (from the project root):
#   powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
#
# Common variants:
#   .\start-dev.ps1 -Build           force docker-compose --build (rebuilds AI image,
#                                    needed only after ai-service code changes)
#   .\start-dev.ps1 -SkipDocker      don't touch docker (already running)
#   .\start-dev.ps1 -SkipBackend     don't launch the backend window
#   .\start-dev.ps1 -SkipFrontend    don't launch the frontend window
#   .\start-dev.ps1 -NoNpmInstall    skip the auto npm install gate
#   .\start-dev.ps1 -OpenBrowser     open http://localhost:5173 at the end
#   .\start-dev.ps1 -Stop            tear down the docker stack (compose down)
#
# Default behavior is FAST: no --build (re-uses the existing AI image),
# no npm install if node_modules exists, no browser open. First-time runs
# should pass -Build at least once to build the AI service image.
#
# Prerequisites: Docker Desktop running, .NET 10 SDK, Node 20+, and a .env
# file at the repo root (copy from .env.example and set OPENAI_API_KEY).
# -----------------------------------------------------------------------------

[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$SkipDocker,
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$NoNpmInstall,
    [switch]$OpenBrowser,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"

# Resolve paths so the script works regardless of caller's current directory
$root         = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath  = Join-Path $root "backend"
$frontendPath = Join-Path $root "frontend"
$composeFile  = Join-Path $root "docker-compose.yml"
$envFile      = Join-Path $root ".env"

function Write-Section($title) {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
}

function Test-Cmd($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Test-PortInUse($port) {
    # Returns $true if something is already LISTENing on $port on 127.0.0.1.
    $listener = $null
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
        $listener.Start()
        return $false
    } catch {
        return $true
    } finally {
        if ($listener) { $listener.Stop() }
    }
}

# ---------------- Stop mode ----------------
if ($Stop) {
    Write-Section "Tearing down Docker stack"
    if (-not (Test-Cmd "docker-compose")) {
        Write-Host "docker-compose not found. Is Docker Desktop installed?" -ForegroundColor Red
        exit 1
    }
    docker-compose -f $composeFile down
    Write-Host ""
    Write-Host "Docker stack stopped." -ForegroundColor Green
    Write-Host "Note: backend/frontend windows (if open) were NOT closed -- Ctrl+C them manually." -ForegroundColor Yellow
    exit 0
}

# ---------------- Preflight ----------------
Write-Section "Preflight checks"

if (-not (Test-Path $envFile)) {
    Write-Host ".env not found at $envFile" -ForegroundColor Red
    Write-Host "Run:  Copy-Item .env.example .env   then set OPENAI_API_KEY=sk-..." -ForegroundColor Yellow
    exit 1
}
Write-Host "  .env present" -ForegroundColor Green

if (-not $SkipDocker -and -not (Test-Cmd "docker-compose")) {
    Write-Host "docker-compose not found. Install Docker Desktop and ensure it's running." -ForegroundColor Red
    exit 1
}
if (-not $SkipBackend -and -not (Test-Cmd "dotnet")) {
    Write-Host "dotnet not found. Install .NET 10 SDK." -ForegroundColor Red
    exit 1
}
if (-not $SkipFrontend -and -not (Test-Cmd "npm")) {
    Write-Host "npm not found. Install Node.js 20 LTS or newer." -ForegroundColor Red
    exit 1
}
Write-Host "  required tools present" -ForegroundColor Green

# ---------------- 1) Docker ----------------
if (-not $SkipDocker) {
    Write-Section "1/3 - Docker stack  (mssql, redis, azurite, seq, qdrant, ai-service)"

    $composeArgs = @("-f", $composeFile, "up", "-d")
    if ($Build) { $composeArgs += "--build" }

    Write-Host "  > docker-compose $($composeArgs -join ' ')" -ForegroundColor DarkGray
    docker-compose @composeArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "docker-compose failed (exit $LASTEXITCODE). Is Docker Desktop running?" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "  Docker stack is up. Container status:" -ForegroundColor Green
    docker ps --filter "name=codementor-" --format "    {{.Names}}   {{.Status}}"
} else {
    Write-Host ""
    Write-Host "Skipping Docker (-SkipDocker)." -ForegroundColor Yellow
}

# ---------------- 2) Backend ----------------
if (-not $SkipBackend) {
    Write-Section "2/3 - Backend (.NET 10 API on :5000) -- new window"

    if (Test-PortInUse 5000) {
        Write-Host "  Port 5000 already in use -- backend looks already running. Skipping new window." -ForegroundColor Yellow
        Write-Host "  (If this is wrong, find the process via 'netstat -ano | findstr :5000' and stop it.)" -ForegroundColor DarkGray
    } else {
        # Build the command for the child PowerShell window. Backtick-escape $Host so
        # it is evaluated in the CHILD, not the parent.
        $beCmd = "`$Host.UI.RawUI.WindowTitle='Code Mentor - Backend'; " +
                 "Write-Host 'dotnet run --project src/CodeMentor.Api' -ForegroundColor Cyan; " +
                 "dotnet run --project src/CodeMentor.Api"

        # Single-string -ArgumentList form so the -Command value with spaces stays intact.
        Start-Process powershell `
            -ArgumentList "-NoExit -NoProfile -Command `"$beCmd`"" `
            -WorkingDirectory $backendPath `
            -WindowStyle Normal | Out-Null

        Write-Host "  Backend window launched. Watch for: 'Now listening on: http://localhost:5000'." -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "Skipping backend (-SkipBackend)." -ForegroundColor Yellow
}

# ---------------- 3) Frontend ----------------
if (-not $SkipFrontend) {
    Write-Section "3/3 - Frontend (Vite on :5173) -- new window"

    if (Test-PortInUse 5173) {
        Write-Host "  Port 5173 already in use -- frontend looks already running. Skipping new window." -ForegroundColor Yellow
        Write-Host "  (If this is wrong, find the process via 'netstat -ano | findstr :5173' and stop it.)" -ForegroundColor DarkGray
    } else {
        $nodeModulesPath = Join-Path $frontendPath "node_modules"
        $needsInstall    = (-not $NoNpmInstall) -and (-not (Test-Path $nodeModulesPath))

        $feParts = @("`$Host.UI.RawUI.WindowTitle='Code Mentor - Frontend'")
        if ($needsInstall) {
            $feParts += "Write-Host 'Running npm install (first time, ~2-3 min)...' -ForegroundColor Yellow"
            $feParts += "npm install"
        }
        $feParts += "Write-Host 'npm run dev' -ForegroundColor Cyan"
        $feParts += "npm run dev"
        $feCmd = $feParts -join '; '

        Start-Process powershell `
            -ArgumentList "-NoExit -NoProfile -Command `"$feCmd`"" `
            -WorkingDirectory $frontendPath `
            -WindowStyle Normal | Out-Null

        Write-Host "  Frontend window launched. Watch for: 'Local: http://localhost:5173/'." -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "Skipping frontend (-SkipFrontend)." -ForegroundColor Yellow
}

# ---------------- Summary ----------------
Write-Section "All set"
Write-Host "  Frontend     http://localhost:5173"               -ForegroundColor White
Write-Host "  Backend API  http://localhost:5000"               -ForegroundColor White
Write-Host "  AI service   http://localhost:8001/health"         -ForegroundColor White
Write-Host "  Seq logs     http://localhost:5341"               -ForegroundColor White
Write-Host "  Qdrant       http://localhost:6333/dashboard"     -ForegroundColor White
Write-Host ""
Write-Host "  Demo learner: learner@codementor.local / Demo_Learner_123!" -ForegroundColor DarkGray
Write-Host "  Admin:        admin@codementor.local   / Admin_Dev_123!"   -ForegroundColor DarkGray
Write-Host ""
Write-Host "  First run? After backend is up, in its window: Ctrl+C, then:" -ForegroundColor DarkGray
Write-Host "    dotnet run --project src/CodeMentor.Api -- seed-demo"      -ForegroundColor DarkGray
Write-Host "    dotnet run --project src/CodeMentor.Api"                   -ForegroundColor DarkGray
Write-Host ""
Write-Host "  To stop docker:  .\start-dev.ps1 -Stop   (backend/FE windows: Ctrl+C manually)" -ForegroundColor DarkGray

if ($OpenBrowser -and -not $SkipFrontend) {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:5173"
}
