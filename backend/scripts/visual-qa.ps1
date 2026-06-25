param(
    [switch]$All,
    [string]$Grep = "",
    [int]$MinimumScreenshots = 12,
    [switch]$KeepExisting
)

$ErrorActionPreference = "Stop"

$originalLocation = (Get-Location).Path
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputDir = Join-Path $repoRoot "tmp/qa/visual-qa"
$defaultGrep = "public home renders|authenticated admin dashboard reads backend-supported overview APIs|setup owner step validates password confirmation without submitting it|public announcements route|admin announcements route"

function Invoke-External {
    param(
        [string]$Executable,
        [string[]]$Arguments
    )

    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Executable $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Invoke-Pnpm {
    param([string[]]$Arguments)

    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        Invoke-External -Executable "pnpm" -Arguments $Arguments
        return
    }

    if (Get-Command corepack.cmd -ErrorAction SilentlyContinue) {
        Invoke-External -Executable "corepack.cmd" -Arguments (@("pnpm") + $Arguments)
        return
    }

    throw "pnpm is not available. Install pnpm or enable it with corepack."
}

function Assert-ChildPath {
    param(
        [string]$ChildPath,
        [string]$ParentPath
    )

    $fullChild = [System.IO.Path]::GetFullPath($ChildPath)
    $fullParent = [System.IO.Path]::GetFullPath($ParentPath).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $prefix = $fullParent + [System.IO.Path]::DirectorySeparatorChar
    if (-not $fullChild.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "refusing to operate outside repository: $fullChild"
    }
}

Set-Location $repoRoot

try {
    if ($All -and $Grep.Trim().Length -gt 0) {
        throw "Use either -All or -Grep, not both."
    }

    if ($Grep.Trim().Length -gt 0 -and -not $PSBoundParameters.ContainsKey("MinimumScreenshots")) {
        $MinimumScreenshots = 2
    }

    if (-not $KeepExisting) {
        Assert-ChildPath -ChildPath $outputDir -ParentPath $repoRoot
        if (Test-Path -LiteralPath $outputDir) {
            Remove-Item -LiteralPath $outputDir -Recurse -Force
        }
    }

    $playwrightArgs = @(
        "--dir", "web/app",
        "exec",
        "playwright",
        "test",
        "-c",
        "playwright.visual.config.ts",
        "tests/e2e/smoke.spec.ts",
        "--project=desktop",
        "--project=mobile"
    )

    if (-not $All) {
        $effectiveGrep = if ($Grep.Trim().Length -gt 0) {
            $Grep
        } else {
            $defaultGrep
        }
        $playwrightArgs += @("-g", $effectiveGrep)
    }

    Invoke-Pnpm -Arguments $playwrightArgs

    $screenshots = @(Get-ChildItem -LiteralPath $outputDir -Recurse -Filter "*.png" -ErrorAction SilentlyContinue)
    if ($screenshots.Count -lt $MinimumScreenshots) {
        throw "visual QA produced $($screenshots.Count) screenshot(s), expected at least $MinimumScreenshots."
    }

    Write-Host "visual QA passed."
    Write-Host "screenshots: $($screenshots.Count)"
    Write-Host "output: $outputDir"
    $screenshots |
        Sort-Object FullName |
        Select-Object -First 20 |
        ForEach-Object { Write-Host (" - " + $_.FullName.Substring($repoRoot.Length + 1)) }
} finally {
    Set-Location $originalLocation
}
