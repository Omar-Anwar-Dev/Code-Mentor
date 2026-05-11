# setup.ps1
# -----------------------------------------------------------------------------
# One-shot first-time setup for a fresh clone of Code Mentor.
# Run this once after cloning from GitHub. It will:
#
#   1. Verify prerequisites are installed (Docker, .NET 10, Node 20+)
#   2. Create the .env file and prompt for your OpenAI API key
#   3. Build & start the Docker infrastructure (~3 min first time)
#   4. Wait for the MSSQL container to be healthy
#   5. Run database migrations and seed demo data (admin + demo learner)
#   6. Install frontend npm dependencies
#   7. Launch the stack via start-dev.ps1 (unless -NoStart)
#
# Time budget: ~5-8 minutes on first run. After this, use .\start-dev.ps1
# for daily development (which takes ~30 seconds since everything is cached).
#
# Usage (from the project root):
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
#
# Optional flags:
#   -OpenAIKey sk-...   non-interactive key (instead of being prompted)
#   -NoStart            don't auto-launch the stack at the end
#   -Force              overwrite an existing API key + re-run npm install
#
# Prerequisites the user must install themselves first:
#   - Docker Desktop  (https://www.docker.com/products/docker-desktop)
#   - .NET 10 SDK     (https://dotnet.microsoft.com/download/dotnet/10.0)
#   - Node.js 20 LTS  (https://nodejs.org)
# -----------------------------------------------------------------------------

[CmdletBinding()]
param(
    [string]$OpenAIKey,
    [switch]$NoStart,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Resolve paths so the script works no matter the caller's CWD
$root         = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath  = Join-Path $root "backend"
$frontendPath = Join-Path $root "frontend"
$composeFile  = Join-Path $root "docker-compose.yml"
$envFile      = Join-Path $root ".env"
$envExample   = Join-Path $root ".env.example"
$startDev     = Join-Path $root "start-dev.ps1"

function Write-Section($title, $estimate) {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    if ($estimate) {
        Write-Host ("  {0,-50}  ({1})" -f $title, $estimate) -ForegroundColor Cyan
    } else {
        Write-Host "  $title" -ForegroundColor Cyan
    }
    Write-Host "================================================================" -ForegroundColor Cyan
}

function Test-Cmd($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

# ---------------- Banner ----------------
Write-Host ""
Write-Host "================================================================" -ForegroundColor Magenta
Write-Host "  Code Mentor -- First-time setup" -ForegroundColor Magenta
Write-Host "================================================================" -ForegroundColor Magenta
Write-Host "  Will run 6 steps automatically. Time budget: ~5-8 minutes."
Write-Host "  After this is done, use .\start-dev.ps1 every day (~30 sec)."
Write-Host ""

# ---------------- 1) Prerequisites ----------------
Write-Section "1/6 - Prerequisites"

$missing = @()
if (-not (Test-Cmd "docker"))         { $missing += "Docker Desktop" }
if (-not (Test-Cmd "docker-compose")) { $missing += "docker-compose (ships with Docker Desktop)" }
if (-not (Test-Cmd "dotnet"))         { $missing += ".NET 10 SDK" }
if (-not (Test-Cmd "node"))           { $missing += "Node.js 20 LTS or newer" }
if (-not (Test-Cmd "npm"))            { $missing += "npm (ships with Node.js)" }

if ($missing.Count -gt 0) {
    Write-Host "Missing required tools:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Install them, then re-run setup.ps1." -ForegroundColor Yellow
    Write-Host "  Docker:  https://www.docker.com/products/docker-desktop" -ForegroundColor DarkGray
    Write-Host "  .NET:    https://dotnet.microsoft.com/download/dotnet/10.0" -ForegroundColor DarkGray
    Write-Host "  Node:    https://nodejs.org" -ForegroundColor DarkGray
    exit 1
}

Write-Host ("  docker  ({0})" -f (docker --version)) -ForegroundColor Green
Write-Host ("  dotnet  ({0})" -f (dotnet --version)) -ForegroundColor Green
Write-Host ("  node    ({0})" -f (node --version))   -ForegroundColor Green
Write-Host ("  npm     ({0})" -f (npm --version))    -ForegroundColor Green

Write-Host "  Verifying Docker daemon is running..." -ForegroundColor DarkGray
docker info --format "{{.ServerVersion}}" *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Docker daemon is not reachable. Start Docker Desktop and wait for the whale icon to be steady." -ForegroundColor Red
    exit 1
}
Write-Host "  docker daemon reachable" -ForegroundColor Green

# ---------------- 2) .env setup ----------------
Write-Section "2/6 - Environment file (.env) + OpenAI API key"

if (-not (Test-Path $envExample)) {
    Write-Host ".env.example not found at $envExample. Aborting." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $envFile)) {
    Copy-Item -Path $envExample -Destination $envFile
    Write-Host "  Created .env from .env.example" -ForegroundColor Green
} else {
    Write-Host "  .env already exists (will keep existing values unless -Force)" -ForegroundColor DarkGray
}

# Detect whether a real key is already in .env
$envContentRaw = Get-Content -Raw $envFile
$hasRealKey = $envContentRaw -match 'OPENAI_API_KEY=(sk-[A-Za-z0-9_\-]{20,})'

if ($Force -or -not $hasRealKey) {
    if (-not $OpenAIKey) {
        Write-Host ""
        Write-Host "  Need your OpenAI API key (starts with 'sk-...')." -ForegroundColor Yellow
        Write-Host "  Get one: https://platform.openai.com/api-keys" -ForegroundColor DarkGray
        Write-Host "  Cost expectation: a few cents per submission/audit." -ForegroundColor DarkGray
        Write-Host ""
        $OpenAIKey = Read-Host "  Paste OPENAI_API_KEY"
        $OpenAIKey = $OpenAIKey.Trim()
    }

    if ([string]::IsNullOrWhiteSpace($OpenAIKey)) {
        Write-Host "No key provided. Aborting." -ForegroundColor Red
        exit 1
    }
    if (-not $OpenAIKey.StartsWith("sk-")) {
        Write-Host "Key doesn't start with 'sk-'. Aborting (check what you pasted)." -ForegroundColor Red
        exit 1
    }

    # Rewrite both OPENAI_API_KEY and AI_ANALYSIS_OPENAI_API_KEY lines
    $lines = Get-Content $envFile
    $newLines = $lines | ForEach-Object {
        if ($_ -match '^\s*OPENAI_API_KEY\s*=')              { "OPENAI_API_KEY=$OpenAIKey" }
        elseif ($_ -match '^\s*AI_ANALYSIS_OPENAI_API_KEY\s*=') { "AI_ANALYSIS_OPENAI_API_KEY=$OpenAIKey" }
        else { $_ }
    }
    # Write UTF-8 without BOM so docker-compose's env loader doesn't choke
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($envFile, $newLines, $utf8NoBom)
    Write-Host "  OpenAI key written to .env" -ForegroundColor Green
} else {
    Write-Host "  OPENAI_API_KEY already set (use -Force to overwrite)" -ForegroundColor Green
}

# ---------------- 3) Docker stack ----------------
Write-Section "3/6 - Docker stack (mssql, redis, azurite, seq, qdrant, ai-service)" "first build: ~3 min"

Write-Host "  > docker-compose -f docker-compose.yml up -d --build" -ForegroundColor DarkGray
docker-compose -f $composeFile up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "docker-compose failed (exit $LASTEXITCODE). Common causes:" -ForegroundColor Red
    Write-Host "  - Docker Desktop is not running" -ForegroundColor Red
    Write-Host "  - Port 1433/5341/6379/8001 already in use by another process" -ForegroundColor Red
    Write-Host "  - .env file has invalid characters in MSSQL_SA_PASSWORD" -ForegroundColor Red
    exit 1
}
Write-Host "  Docker stack started." -ForegroundColor Green

# ---------------- 4) Wait for MSSQL healthy ----------------
Write-Section "4/6 - Waiting for MSSQL to be healthy" "up to 2 min"

$maxWaitSec = 120
$waited     = 0
$interval   = 3
$healthy    = $false

while ($waited -lt $maxWaitSec) {
    $status = (docker inspect codementor-mssql --format "{{.State.Health.Status}}" 2>$null)
    if ($LASTEXITCODE -eq 0 -and $status -eq "healthy") {
        $healthy = $true
        break
    }
    $shown = if ($status) { $status } else { "starting" }
    Write-Host "  ...$shown (waited ${waited}s)" -ForegroundColor DarkGray
    Start-Sleep -Seconds $interval
    $waited += $interval
}

if (-not $healthy) {
    Write-Host ""
    Write-Host "MSSQL did not become healthy within ${maxWaitSec}s." -ForegroundColor Red
    Write-Host "Inspect: docker logs codementor-mssql" -ForegroundColor Yellow
    exit 1
}
Write-Host "  MSSQL is healthy." -ForegroundColor Green

# ---------------- 5) Backend bootstrap (seed-demo) ----------------
Write-Section "5/6 - Backend bootstrap (migrations + seed-demo)" "first run: ~1-2 min"

Push-Location $backendPath
try {
    Write-Host "  > dotnet run --project src/CodeMentor.Api -- seed-demo" -ForegroundColor DarkGray
    dotnet run --project src/CodeMentor.Api -- seed-demo
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "seed-demo failed (exit $LASTEXITCODE). See the error above." -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}
Write-Host "  Backend bootstrap complete (admin + demo learner seeded)." -ForegroundColor Green

# ---------------- 6) Frontend npm install ----------------
Write-Section "6/6 - Frontend dependencies (npm install)" "first run: ~2-3 min"

$nodeModulesPath = Join-Path $frontendPath "node_modules"
if ((Test-Path $nodeModulesPath) -and -not $Force) {
    Write-Host "  node_modules already present; skipping. (Use -Force to reinstall.)" -ForegroundColor DarkGray
} else {
    Push-Location $frontendPath
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "npm install failed (exit $LASTEXITCODE)." -ForegroundColor Red
            exit 1
        }
    } finally {
        Pop-Location
    }
    Write-Host "  Frontend dependencies installed." -ForegroundColor Green
}

# ---------------- Summary ----------------
Write-Section "Setup complete"
Write-Host "  Stack URLs:"                                         -ForegroundColor White
Write-Host "    Frontend     http://localhost:5173"                -ForegroundColor White
Write-Host "    Backend API  http://localhost:5000"                -ForegroundColor White
Write-Host "    AI service   http://localhost:8001/health"         -ForegroundColor White
Write-Host "    Seq logs     http://localhost:5341"                -ForegroundColor White
Write-Host ""
Write-Host "  Demo accounts (already seeded):"                     -ForegroundColor White
Write-Host "    Demo Learner: learner@codementor.local / Demo_Learner_123!" -ForegroundColor White
Write-Host "    Admin:        admin@codementor.local   / Admin_Dev_123!"   -ForegroundColor White
Write-Host ""
Write-Host "  Daily use: .\start-dev.ps1   (skips everything done above)"  -ForegroundColor Green
Write-Host ""

# ---------------- Optional auto-launch ----------------
if (-not $NoStart) {
    if (Test-Path $startDev) {
        Write-Host ""
        Write-Host "================================================================" -ForegroundColor Yellow
        Write-Host "  IMPORTANT: two new PowerShell windows are about to open" -ForegroundColor Yellow
        Write-Host "================================================================" -ForegroundColor Yellow
        Write-Host "  - One runs the BACKEND   (dotnet run, port 5000)"
        Write-Host "  - One runs the FRONTEND  (npm run dev, port 5173)"
        Write-Host ""
        Write-Host "  Do NOT close those windows -- they ARE the running stack." -ForegroundColor Yellow
        Write-Host "  Do NOT run 'dotnet run' or 'npm run dev' yourself in this terminal --" -ForegroundColor Yellow
        Write-Host "  the stack is already started; doing it again will fight for the ports." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  When you want to stop everything: .\start-dev.ps1 -Stop" -ForegroundColor DarkGray
        Write-Host "                                    + Ctrl+C the two windows" -ForegroundColor DarkGray
        Write-Host ""
        Start-Sleep -Seconds 4

        Write-Section "Launching the stack now"
        & $startDev -SkipDocker -NoNpmInstall -OpenBrowser
    } else {
        Write-Host "start-dev.ps1 not found alongside setup.ps1. To start manually:" -ForegroundColor Yellow
        Write-Host "  Window 1: cd backend;  dotnet run --project src/CodeMentor.Api" -ForegroundColor Yellow
        Write-Host "  Window 2: cd frontend; npm run dev"                              -ForegroundColor Yellow
    }
}
