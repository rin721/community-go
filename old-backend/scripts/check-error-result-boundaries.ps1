param(
    [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath $Root).Path
$failures = New-Object System.Collections.Generic.List[string]
$candidates = New-Object System.Collections.Generic.List[string]
$allowed = New-Object System.Collections.Generic.List[string]

$allowlist = @(
    @{
        Path = "pkg/token/token.go"
        Pattern = '_\s*=\s*mac\.Write\(\[\]byte\(raw\)\)'
        Reason = "hash.Hash Write never returns a meaningful runtime error"
    },
    @{
        Path = "internal/app/cliapp/adapters/control_watcher.go"
        Pattern = '_\s*=\s*os\.Remove\(controlPath\)'
        Reason = "matched control file cleanup is best-effort; process metadata prevents stale control reuse"
    },
    @{
        Path = "pkg/utils/ip.go"
        Pattern = '_\s*=\s*l\.Close\(\)'
        Reason = "temporary listener close after bind probe has no caller-visible state"
    },
    @{
        Path = "pkg/utils/get_available_port.go"
        Pattern = '_\s*=\s*l\.Close\(\)'
        Reason = "temporary listener close after port probe has no caller-visible state"
    }
)

function Add-Failure {
    param([string]$Message)
    $failures.Add($Message) | Out-Null
}

function Normalize-RelativePath {
    param([string]$Path)
    return $Path.Replace("\", "/")
}

function Get-RepoRelativePath {
    param(
        [string]$BasePath,
        [string]$FullPath
    )

    $prefix = $BasePath.TrimEnd("\", "/") + [System.IO.Path]::DirectorySeparatorChar
    if ($FullPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $FullPath.Substring($prefix.Length)
    }

    return $FullPath
}

function Test-AllowlistedIgnoredError {
    param(
        [string]$RelativePath,
        [string]$Line
    )

    foreach ($item in $allowlist) {
        if ($RelativePath -eq $item.Path -and $Line -match $item.Pattern) {
            $allowed.Add("${RelativePath}: $($item.Reason)") | Out-Null
            return $true
        }
    }

    return $false
}

$scanDirs = @("internal", "pkg", "types")
$ignoredErrorPattern = '_\s*=\s*.*\b(err|Error|Close|Rollback|Commit|Remove|Mkdir|Write|Sync|Load|Save|Delete|Create|Update|Send|Publish|Flush|Stop|Shutdown|Kill|Release)\b'

foreach ($dir in $scanDirs) {
    $fullDir = Join-Path $repoRoot $dir
    if (-not (Test-Path -LiteralPath $fullDir)) {
        continue
    }

    $files = Get-ChildItem -LiteralPath $fullDir -Recurse -File -Filter "*.go" |
        Where-Object { $_.Name -notlike "*_test.go" -and $_.FullName -notmatch '[\\/](doc|examples)[\\/]' }

    foreach ($file in $files) {
        $relative = Normalize-RelativePath -Path (Get-RepoRelativePath -BasePath $repoRoot -FullPath $file.FullName)
        $lines = Get-Content -LiteralPath $file.FullName -Encoding UTF8
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
            $trimmed = $line.Trim()
            if ($trimmed.StartsWith("//")) {
                continue
            }
            if ($line -notmatch $ignoredErrorPattern) {
                continue
            }

            $location = "${relative}:$($i + 1)"
            $candidates.Add($location) | Out-Null
            if (-not (Test-AllowlistedIgnoredError -RelativePath $relative -Line $line)) {
                Add-Failure "ignored error requires explicit handling or allowlist: ${location}: $trimmed"
            }
        }
    }
}

if ($failures.Count -gt 0) {
    Write-Host "error/result boundary check failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "error/result boundary check passed."
Write-Host "ignored error candidates checked: $($candidates.Count)"
Write-Host "allowlisted best-effort cases: $($allowed.Count)"
