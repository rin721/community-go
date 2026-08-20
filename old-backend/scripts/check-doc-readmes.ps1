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

function Join-RepoPath {
    param([string]$Path)
    return Join-Path $repoRoot $Path
}

function Test-ReadmeDirectory {
    param([string]$Path)

    $directory = Join-RepoPath $Path
    if (-not (Test-Path -LiteralPath $directory -PathType Container)) {
        Add-Failure "missing required directory: $Path"
        return
    }

    $readme = Join-Path $directory "README.md"
    if (-not (Test-Path -LiteralPath $readme -PathType Leaf)) {
        Add-Failure "missing README.md: $Path"
        return
    }

    try {
        $content = Get-Content -LiteralPath $readme -Raw -Encoding UTF8
    } catch {
        Add-Failure "cannot read README.md in ${Path}: $($_.Exception.Message)"
        return
    }

    if ([string]::IsNullOrWhiteSpace($content)) {
        Add-Failure "empty README.md: $Path"
        return
    }

    if ($content -notmatch "(?m)^#\s+") {
        Add-Failure "README.md has no markdown title: $Path"
    }
}

Push-Location $repoRoot
try {
    $requiredReadmeDirectories = @(
        ".",
        "cmd",
        "cmd/console",
        "configs",
        "deploy",
        "docs",
        "scripts",
        "internal",
        "pkg",
        "types",
        "web/app",
        "web/app/app",

        "docs/api",
        "docs/architecture",
        "docs/backlog",
        "docs/build",
        "docs/environment",
        "docs/extension",
        "docs/maintenance",
        "docs/modules",
        "docs/onboarding",
        "docs/overview",
        "docs/release",
        "docs/runtime",
        "docs/structure",
        "docs/testing",
        "docs/workflows",

        "internal/app",
        "internal/config",
        "internal/middleware",
        "internal/migrations",
        "internal/modules",
        "internal/modules/announcements",
        "internal/modules/iam",
        "internal/modules/system",
        "internal/ports",
        "internal/transport",

        "pkg/authorization",
        "pkg/cache",
        "pkg/cli",
        "pkg/configloader",
        "pkg/crypto",
        "pkg/database",
        "pkg/executor",
        "pkg/hostmetrics",
        "pkg/httpserver",
        "pkg/i18n",
        "pkg/logger",
        "pkg/mail",
        "pkg/mfa",
        "pkg/migrator",
        "pkg/processx",
        "pkg/rpcserver",
        "pkg/sqlgen",
        "pkg/storage",
        "pkg/token",
        "pkg/utils",
        "pkg/web",
        "pkg/yaml2go",

        "types/auth",
        "types/constants",
        "types/errors",
        "types/result",

        "web/app/app/components",
        "web/app/app/components/console",
        "web/app/app/features",
        "web/app/app/hooks",
        "web/app/app/i18n",
        "web/app/app/lib",
        "web/app/app/lib/api",
        "web/app/app/lib/charts",
        "web/app/app/lib/markdown",
        "web/app/app/providers",
        "web/app/app/routes",
        "web/app/app/stores",
        "web/app/app/styles",
        "web/app/app/theme",
        "web/app/content",
        "web/app/design",
        "web/app/scripts",
        "web/app/tests"
    )

    $uniqueDirectories = $requiredReadmeDirectories | Sort-Object -Unique
    foreach ($directory in $uniqueDirectories) {
        Test-ReadmeDirectory $directory
    }

    if ($failures.Count -gt 0) {
        Write-Host "documentation README coverage check failed:" -ForegroundColor Red
        foreach ($failure in $failures) {
            Write-Host " - $failure" -ForegroundColor Red
        }
        throw "documentation README coverage check failed."
    }

    Write-Host "documentation README coverage check passed."
    Write-Host "README directories checked: $($uniqueDirectories.Count)"
} finally {
    Pop-Location
}
