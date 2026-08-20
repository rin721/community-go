param(
    [string]$Root = ".",
    [switch]$FailOnDirty,
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath $Root).Path
$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure {
    param([string]$Message)
    $failures.Add($Message) | Out-Null
}

function Invoke-Git {
    param([string[]]$Arguments)

    $output = & git @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed: $($output -join [Environment]::NewLine)"
    }
    return @($output)
}

function Get-NormalizedPath {
    param([string]$StatusLine)

    if ($StatusLine.Length -lt 4) {
        return ""
    }

    $path = $StatusLine.Substring(3)
    if ($path -match " -> ") {
        $parts = $path -split " -> "
        $path = $parts[$parts.Length - 1]
    }
    return $path.Trim('"').Replace("\", "/")
}

function Get-StatusKind {
    param([string]$StatusLine)

    $code = $StatusLine.Substring(0, [Math]::Min(2, $StatusLine.Length))
    if ($code -eq "??") {
        return "untracked"
    }
    if ($code.Contains("D")) {
        return "deleted"
    }
    return "modified"
}

function Get-TopLevel {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return "(unknown)"
    }

    $top = ($Path -split "/", 2)[0]
    $known = @("_examples", "cmd", "configs", "deploy", "docs", "internal", "pkg", "types", "web")
    if ($known -contains $top) {
        return $top
    }
    return "other"
}

Push-Location $repoRoot
try {
    $gitRoot = (Invoke-Git -Arguments @("rev-parse", "--show-toplevel") | Select-Object -First 1)
    if (-not $gitRoot) {
        throw "cannot resolve git root"
    }

    $statusLines = @(Invoke-Git -Arguments @("status", "--short") | Where-Object { $_ -ne "" })
    $items = @(
        foreach ($line in $statusLines) {
            $path = Get-NormalizedPath -StatusLine $line
            [pscustomobject]@{
                Kind = Get-StatusKind -StatusLine $line
                Code = $line.Substring(0, [Math]::Min(2, $line.Length)).Trim()
                Path = $path
                Top = Get-TopLevel -Path $path
            }
        }
    )

    $blockedPatterns = @(
        '(^|/)\.env$',
        '(^|/)configs/config\.yaml$',
        '(^|/)configs/config\.local\.yaml$',
        '^(tmp|data|coverage|test-results|playwright-report)(/|$)',
        '(^|/)node_modules(/|$)',
        '(^|/)__pycache__(/|$)',
        '\.py[cod]$',
        '^web/app/(build|dist|\.output|\.nuxt)(/|$)',
        '^build/releases(/|$)'
    )

    foreach ($item in $items) {
        foreach ($pattern in $blockedPatterns) {
            if ($item.Path -match $pattern) {
                if ($item.Kind -eq "deleted") {
                    continue
                }
                Add-Failure "runtime or generated path appears in worktree status: $($item.Path)"
                break
            }
        }
    }

    $trackedPaths = @(Invoke-Git -Arguments @("ls-files") | Where-Object { $_ -ne "" })
    foreach ($path in $trackedPaths) {
        $normalized = $path.Replace("\", "/")
        foreach ($pattern in $blockedPatterns) {
            if ($normalized -match $pattern) {
                Add-Failure "runtime or generated path is tracked by git: $normalized"
                break
            }
        }
    }

    if ($FailOnDirty -and $items.Count -gt 0) {
        Add-Failure "worktree is dirty; $($items.Count) status entries found"
    }

    $byKind = $items | Group-Object Kind | ForEach-Object {
        [pscustomobject]@{
            Kind = $_.Name
            Count = $_.Count
        }
    }
    $byTop = $items | Group-Object Top | Sort-Object Count -Descending | ForEach-Object {
        [pscustomobject]@{
            Top = $_.Name
            Count = $_.Count
        }
    }

    $summary = [pscustomobject]@{
        Total = $items.Count
        Modified = @($items | Where-Object { $_.Kind -eq "modified" }).Count
        Deleted = @($items | Where-Object { $_.Kind -eq "deleted" }).Count
        Untracked = @($items | Where-Object { $_.Kind -eq "untracked" }).Count
        ByTopLevel = $byTop
        Failures = @($failures)
    }

    if ($Json) {
        $summary | ConvertTo-Json -Depth 6
    } else {
        Write-Host "worktree convergence check"
        Write-Host "total entries: $($summary.Total)"
        Write-Host "modified: $($summary.Modified)"
        Write-Host "deleted: $($summary.Deleted)"
        Write-Host "untracked: $($summary.Untracked)"
        Write-Host ""
        if ($byTop.Count -gt 0) {
            $byTop | Format-Table -AutoSize
        }
    }

    if ($failures.Count -gt 0) {
        if (-not $Json) {
            Write-Host "worktree convergence check failed:" -ForegroundColor Red
            foreach ($failure in $failures) {
                Write-Host " - $failure" -ForegroundColor Red
            }
        }
        exit 1
    }

    if (-not $Json) {
        Write-Host "worktree convergence check passed."
    }
} finally {
    Pop-Location
}
