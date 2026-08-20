param(
    [string]$Path = "docs/release/operational-observation-template.md",
    [switch]$SelfTest
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$targetPath = if ([System.IO.Path]::IsPathRooted($Path)) {
    $Path
} else {
    Join-Path $repoRoot $Path
}
$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure {
    param([string]$Message)
    $failures.Add($Message) | Out-Null
}

function Get-RequiredFragments {
    return @(
        "<!-- operational-observation-template:v1 -->",
        "<!-- operational-section:scope -->",
        "<!-- operational-section:preparation -->",
        "<!-- operational-section:record-template -->",
        "<!-- operational-section:iam-policy-reload -->",
        "<!-- operational-section:iam-notification-outbox -->",
        "<!-- operational-section:system-maintenance -->",
        "<!-- operational-section:traffic-probe -->",
        "<!-- operational-section:conclusion -->",
        "internal/app/adapters.IAMPolicyReloadScheduler",
        "internal/app/adapters.IAMNotificationOutboxScheduler",
        "internal/app/adapters.SystemMaintenanceScheduler",
        "internal/app/adapters.TrafficProbeScheduler",
        "auth.casbin_reload_interval_seconds",
        "auth.notification_retry_interval_seconds",
        "auth.notification_retry_batch_size",
        "auth.notification_retry_max_attempts",
        "system.maintenance_cleanup_interval_seconds",
        "system.maintenance_cleanup_batch_size",
        "/admin/notification-outbox",
        "/admin/probes",
        "/admin/traffic-hijack",
        "/admin/operation-records",
        "/admin/error-logs",
        "/health",
        "/ready",
        "GET /api/v1/iam/notification-outbox",
        "iam policy reload retry failed",
        "iam policy reload retry completed",
        "iam notification outbox dispatch completed",
        "iam notification outbox dispatch failed",
        "system maintenance cleanup completed",
        "system maintenance cleanup failed",
        "notification.retry",
        "media/chunks/<session-id>/",
        "trace id",
        "token hash",
        "Token",
        "Cookie"
    )
}

function Test-ObservationTemplateContent {
    param([string]$Content)

    foreach ($fragment in Get-RequiredFragments) {
        if (-not $Content.Contains($fragment)) {
            Add-Failure "missing required operational observation fragment: $fragment"
        }
    }
}

if ($SelfTest) {
    $failures.Clear()
    Test-ObservationTemplateContent "incomplete operational observation template"
    if ($failures.Count -eq 0) {
        throw "operational observation self-test failed; incomplete template was not rejected"
    }

    $failures.Clear()
    $validContent = @(
        Get-RequiredFragments
    ) -join [Environment]::NewLine
    Test-ObservationTemplateContent $validContent
    if ($failures.Count -ne 0) {
        throw "operational observation self-test failed; valid template fragments were rejected: $($failures -join '; ')"
    }

    Write-Host "operational observation template self-test passed."
    exit 0
}

if (-not (Test-Path -LiteralPath $targetPath)) {
    throw "operational observation template does not exist: $Path"
}

$content = Get-Content -Raw -Encoding UTF8 -LiteralPath $targetPath
Test-ObservationTemplateContent $content

if ($failures.Count -gt 0) {
    Write-Host "operational observation template check failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "operational observation template check passed."
Write-Host "required fragments checked: $((Get-RequiredFragments).Count)"
