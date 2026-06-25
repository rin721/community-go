param(
    [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath $Root).Path
$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure {
    param([string]$Message)
    $failures.Add($Message) | Out-Null
}

function Get-RepoContent {
    param([string]$Path)

    $fullPath = Join-Path $repoRoot $Path
    if (-not (Test-Path -LiteralPath $fullPath)) {
        Add-Failure "missing required deployment file: $Path"
        return ""
    }
    return Get-Content -Raw -Encoding UTF8 -LiteralPath $fullPath
}

function Test-Contains {
    param(
        [string]$Content,
        [string]$Needle,
        [string]$Label
    )

    if (-not $Content.Contains($Needle)) {
        Add-Failure "missing ${Label}: $Needle"
    }
}

$dockerfile = Get-RepoContent "Dockerfile"
$compose = Get-RepoContent "deploy/docker-compose.production.example.yml"
$ci = Get-RepoContent ".github/workflows/ci.yml"
$dockerSmokePowerShell = Get-RepoContent "scripts/docker-smoke.ps1"
$dockerSmokeShell = Get-RepoContent "scripts/docker-smoke.sh"
$releaseTemplate = Get-RepoContent "docs/release/release-evidence-template.md"

foreach ($needle in @(
        "go build -trimpath -ldflags=`"-s -w`" -o /out/console-server ./cmd/console",
        "COPY --from=web-build /src/web/app/build/client /app/web/app/build/client",
        "USER app",
        "ENTRYPOINT [`"/app/console-server`"]"
    )) {
    Test-Contains -Content $dockerfile -Needle $needle -Label "Dockerfile guardrail"
}

foreach ($needle in @(
        "init: true",
        "stop_grace_period: `${APP_CONTAINER_STOP_GRACE_PERIOD:-30s}",
        "cpus: `${APP_CONTAINER_CPUS:-1.0}",
        "mem_limit: `${APP_CONTAINER_MEMORY_LIMIT:-512m}",
        "pids_limit: `${APP_CONTAINER_PIDS_LIMIT:-256}",
        "healthcheck:",
        "curl -fsS http://127.0.0.1:",
        "security_opt:",
        "no-new-privileges:true"
    )) {
    Test-Contains -Content $compose -Needle $needle -Label "Compose deployment guardrail"
}

foreach ($needle in @(
        "docker build -t console-platform:ci .",
        "bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke",
        "corepack prepare pnpm@10.22.0 --activate",
        '"codex/**"',
        "shell: pwsh",
        "./scripts/check-agent-skills.ps1",
        "./scripts/check-doc-readmes.ps1",
        "./scripts/check-doc-links.ps1",
        "./scripts/check-entry-brand-convergence.ps1",
        "./scripts/check-plugin-removal.ps1",
        "./scripts/check-deployment-guardrails.ps1",
        "./scripts/check-open-source-readiness.ps1"
    )) {
    Test-Contains -Content $ci -Needle $needle -Label "CI deployment and governance guardrail"
}

foreach ($content in @($dockerSmokePowerShell, $dockerSmokeShell)) {
    Test-Contains -Content $content -Needle "APP_AUTH_NOTIFICATION_DRIVER=debug" -Label "Docker smoke notification driver guardrail"
}

foreach ($needle in @(
        "<!-- release-field:docker-image-digest -->",
        "<!-- release-field:container-resource-limits -->",
        "<!-- release-field:graceful-shutdown -->",
        "<!-- release-field:deployment-tag -->"
    )) {
    Test-Contains -Content $releaseTemplate -Needle $needle -Label "release evidence guardrail"
}

if ($failures.Count -gt 0) {
    Write-Host "deployment guardrails check failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "deployment guardrails check passed."
