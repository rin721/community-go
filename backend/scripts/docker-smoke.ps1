param(
    [string]$ImageName = "console-platform:local",
    [string]$ContainerName = "console-platform-smoke",
    [int]$HostPort = 19998,
    [int]$ContainerPort = 9999,
    [int]$TimeoutSeconds = 90,
    [switch]$SkipBuild,
    [switch]$KeepContainer
)

$ErrorActionPreference = "Stop"

function Invoke-Docker {
    param([string[]]$Arguments)

    & docker @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "docker $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Get-ResponseText {
    param($Response)

    if ($Response.Content -is [byte[]]) {
        return [System.Text.Encoding]::UTF8.GetString($Response.Content)
    }
    return [string]$Response.Content
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
        Start-Sleep -Milliseconds 750
    }
    throw "Endpoint check timed out: $Url; last error: $lastError"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI is not available. Install Docker or run this script on a Docker-enabled host."
}

$originalLocation = (Get-Location).Path
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$containerExists = $false

try {
    if (-not $SkipBuild) {
        Write-Host "Building Docker image $ImageName ..."
        Invoke-Docker -Arguments @("build", "-t", $ImageName, ".")
    }

    $existing = & docker ps -a --filter "name=^/$ContainerName$" --format "{{.Names}}"
    if ($existing -eq $ContainerName) {
        Write-Host "Removing existing smoke container $ContainerName ..."
        Invoke-Docker -Arguments @("rm", "-f", $ContainerName)
    }

    Write-Host "Starting Docker smoke container $ContainerName on http://127.0.0.1:$HostPort ..."
    $runArgs = @(
        "run",
        "--detach",
        "--name", $ContainerName,
        "--publish", "${HostPort}:${ContainerPort}",
        "--env", "APP_SERVER_HOST=0.0.0.0",
        "--env", "APP_SERVER_PORT=$ContainerPort",
        "--env", "APP_DB_DRIVER=sqlite",
        "--env", "APP_DB_SQLITE_PATH=/app/data/docker-smoke.db",
        "--env", "APP_STORAGE_DRIVER=local",
        "--env", "APP_STORAGE_LOCAL_BASE_PATH=/app/data/uploads",
        "--env", "APP_LOG_FILE_PATH=/app/logs/docker-smoke.log",
        "--env", "APP_AUTH_NOTIFICATION_DRIVER=debug",
        "--env", "APP_AUTH_SIGNING_KEY=docker-smoke-signing-key-change-me-32-bytes",
        "--env", "APP_AUTH_REFRESH_TOKEN_PEPPER=docker-smoke-refresh-pepper-32-bytes",
        "--env", "APP_AUTH_MFA_SECRET_KEY=docker-smoke-mfa-secret-key-32-bytes",
        $ImageName
    )
    Invoke-Docker -Arguments $runArgs
    $containerExists = $true

    $baseUrl = "http://127.0.0.1:$HostPort"
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
    Write-Host "Docker smoke passed for image $ImageName."
} catch {
    if ($containerExists) {
        Write-Host "Docker container logs from ${ContainerName}:"
        & docker logs --tail 200 $ContainerName
    }
    throw
} finally {
    if ($containerExists -and -not $KeepContainer) {
        Invoke-Docker -Arguments @("rm", "-f", $ContainerName)
    } elseif ($containerExists) {
        Write-Host "Keeping smoke container $ContainerName for inspection."
    }
    Set-Location $originalLocation
}
