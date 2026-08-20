param(
    [string]$Root = ".",
    [string]$Python = "python"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath $Root).Path
$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure {
    param([string]$Message)
    $failures.Add($Message) | Out-Null
}

function Test-Contains {
    param(
        [string]$Text,
        [string]$Needle,
        [string]$Label
    )

    if (-not $Text.Contains($Needle)) {
        Add-Failure "missing ${Label}: $Needle"
    }
}

function Invoke-PackageDryRun {
    param([string[]]$Arguments)

    Push-Location $repoRoot
    try {
        $output = & $Python @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }

    $text = ($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
    if ($exitCode -ne 0) {
        Add-Failure "$Python $($Arguments -join ' ') failed with exit code $exitCode"
        if ($text) {
            Add-Failure "command output: $text"
        }
    }
    return $text
}

function Test-PackageSource {
    $packageScript = Join-Path $repoRoot "scripts/package.py"
    if (-not (Test-Path -LiteralPath $packageScript)) {
        Add-Failure "missing scripts/package.py"
        return
    }

    $content = Get-Content -LiteralPath $packageScript -Raw -Encoding UTF8
    Test-Contains -Text $content -Needle "CGO_DISABLED_SQLITE_NOTE" -Label "package SQLite note constant"
    Test-Contains -Text $content -Needle '"cgoEnabled": opts.cgo' -Label "manifest CGO flag"
    Test-Contains -Text $content -Needle '"sqliteRuntimeAvailable": opts.cgo' -Label "manifest SQLite runtime flag"
    Test-Contains -Text $content -Needle 'f"CGO_ENABLED={''1'' if opts.cgo else ''0''}."' -Label "package README CGO line"
    Test-Contains -Text $content -Needle 'f"SQLite runtime: {''available'' if opts.cgo else ''unavailable''}."' -Label "package README SQLite line"
}

Push-Location $repoRoot
try {
    $baseArgs = @(
        "scripts/package.py",
        "--dry-run",
        "--target",
        "linux/amd64",
        "--version",
        "sqlite-boundary",
        "--skip-web-build"
    )

    $noCgoOutput = Invoke-PackageDryRun -Arguments $baseArgs
    Test-Contains -Text $noCgoOutput -Needle "CGO_ENABLED: 0" -Label "CGO disabled dry-run output"
    Test-Contains -Text $noCgoOutput -Needle "SQLite runtime: unavailable" -Label "SQLite unavailable dry-run output"
    Test-Contains -Text $noCgoOutput -Needle "SQLite runtime: unavailable with CGO_ENABLED=0" -Label "CGO disabled SQLite warning"
    Test-Contains -Text $noCgoOutput -Needle "use MySQL/Postgres" -Label "non-SQLite database guidance"
    Test-Contains -Text $noCgoOutput -Needle "--cgo" -Label "SQLite rebuild guidance"

    $cgoOutput = Invoke-PackageDryRun -Arguments ($baseArgs + @("--cgo"))
    Test-Contains -Text $cgoOutput -Needle "CGO_ENABLED: 1" -Label "CGO enabled dry-run output"
    Test-Contains -Text $cgoOutput -Needle "SQLite runtime: available" -Label "SQLite available dry-run output"

    Test-PackageSource

    if ($failures.Count -gt 0) {
        Write-Host "package SQLite boundary check failed:" -ForegroundColor Red
        foreach ($failure in $failures) {
            Write-Host " - $failure" -ForegroundColor Red
        }
        exit 1
    }

    Write-Host "package SQLite boundary check passed."
    Write-Host "dry-run variants checked: 2"
} finally {
    Pop-Location
}
