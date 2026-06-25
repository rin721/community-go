param(
    [int]$Port = 19999,
    [string]$Config = "configs/config.example.yaml",
    [string]$WorkDir = "tmp/ai/runtime-smoke",
    [string]$Binary = "tmp/console-runtime-smoke.exe",
    [int]$TimeoutSeconds = 45
)

$ErrorActionPreference = "Stop"

function Resolve-RepoPath {
    param([string]$Path)
    if ([System.IO.Path]::IsPathRooted($Path)) {
        return $Path
    }
    return (Join-Path (Get-Location).Path $Path)
}

function Wait-ForEndpoint {
    param(
        [string]$Url,
        [scriptblock]$Validate,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $lastError = $null
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
            if (& $Validate $response) {
                return $response
            }
            $lastError = "Unexpected response from $Url"
        } catch {
            $lastError = $_.Exception.Message
        }
        Start-Sleep -Milliseconds 500
    }
    throw "Endpoint check timed out: $Url; last error: $lastError"
}

function Get-ResponseText {
    param($Response)

    if ($Response.Content -is [byte[]]) {
        return [System.Text.Encoding]::UTF8.GetString($Response.Content)
    }
    return [string]$Response.Content
}

$repoRoot = (Get-Location).Path
$workPath = Resolve-RepoPath $WorkDir
$binaryPath = Resolve-RepoPath $Binary
$configPath = Resolve-RepoPath $Config
$stdoutPath = Join-Path $workPath "server.out.log"
$stderrPath = Join-Path $workPath "server.err.log"

New-Item -ItemType Directory -Force -Path $workPath | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $binaryPath) | Out-Null

$env:APP_SERVER_PORT = [string]$Port
$env:APP_DB_DRIVER = "sqlite"
$env:APP_DB_SQLITE_PATH = (Join-Path $workPath "app.db")
$env:APP_STORAGE_DRIVER = "local"
$env:APP_STORAGE_LOCAL_BASE_PATH = (Join-Path $workPath "uploads")
$env:APP_LOG_FILE_PATH = (Join-Path $workPath "app.log")
$env:APP_AUTH_SIGNING_KEY = "runtime-smoke-signing-key-change-me-32-bytes"
$env:APP_AUTH_REFRESH_TOKEN_PEPPER = "runtime-smoke-refresh-pepper-32-bytes"
$env:APP_AUTH_MFA_SECRET_KEY = "runtime-smoke-mfa-secret-key-32-bytes"
$env:AUTH_SIGNING_KEY = $env:APP_AUTH_SIGNING_KEY
$env:AUTH_REFRESH_TOKEN_PEPPER = $env:APP_AUTH_REFRESH_TOKEN_PEPPER
$env:AUTH_MFA_SECRET_KEY = $env:APP_AUTH_MFA_SECRET_KEY

Write-Host "Building console server..."
& go build -mod=readonly -o $binaryPath ./cmd/console
if ($LASTEXITCODE -ne 0) {
    throw "go build failed with exit code $LASTEXITCODE"
}

$process = $null
try {
    Write-Host "Starting console server on http://127.0.0.1:$Port ..."
    $process = Start-Process -FilePath $binaryPath `
        -ArgumentList @("server", "--config=$configPath") `
        -WorkingDirectory $repoRoot `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath `
        -WindowStyle Hidden `
        -PassThru

    $baseUrl = "http://127.0.0.1:$Port"
    $checks = @(
        @{
            Name = "health"
            Url = "$baseUrl/health"
            Validate = { param($r) $r.StatusCode -eq 200 -and (Get-ResponseText $r) -match '"status"\s*:\s*"ok"' }
        },
        @{
            Name = "ready"
            Url = "$baseUrl/ready"
            Validate = { param($r) $r.StatusCode -eq 200 -and (Get-ResponseText $r) -match '"status"\s*:\s*"ready"' }
        },
        @{
            Name = "openapi"
            Url = "$baseUrl/openapi.yaml"
            Validate = { param($r) $r.StatusCode -eq 200 -and (Get-ResponseText $r) -match '("?openapi"?\s*:\s*"?3)' }
        },
        @{
            Name = "admin"
            Url = "$baseUrl/admin"
            Validate = { param($r) $r.StatusCode -eq 200 -and (Get-ResponseText $r) -match '__reactRouterContext|console-hydrate' }
        }
    )

    $results = foreach ($check in $checks) {
        $response = Wait-ForEndpoint -Url $check.Url -Validate $check.Validate -TimeoutSeconds $TimeoutSeconds
        [pscustomobject]@{
            Name = $check.Name
            Url = $check.Url
            StatusCode = $response.StatusCode
        }
    }

    $results | Format-Table -AutoSize
    Write-Host "Runtime smoke passed. Logs: $workPath"
} finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
        $process.WaitForExit()
    }
}
