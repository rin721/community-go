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

function Test-RequiredPath {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath (Join-RepoPath $Path))) {
        Add-Failure "missing required path: $Path"
    }
}

function Test-RemovedPath {
    param([string]$Path)
    if (Test-Path -LiteralPath (Join-RepoPath $Path)) {
        Add-Failure "removed path is present: $Path"
    }
}

function Get-ContentUtf8 {
    param([string]$Path)
    $fullPath = Join-RepoPath $Path
    if (-not (Test-Path -LiteralPath $fullPath)) {
        Add-Failure "missing file for content check: $Path"
        return ""
    }
    return Get-Content -LiteralPath $fullPath -Raw -Encoding UTF8
}

function Test-Contains {
    param(
        [string]$Path,
        [string]$Needle,
        [string]$Label
    )

    $content = Get-ContentUtf8 -Path $Path
    if (-not $content.Contains($Needle)) {
        Add-Failure "$Path is missing ${Label}: $Needle"
    }
}

function Test-DoesNotMatch {
    param(
        [string]$Path,
        [string[]]$Patterns,
        [string]$Label
    )

    $content = Get-ContentUtf8 -Path $Path
    if ($Path -eq "AGENTS.md") {
        $content = $content -replace '\.agents/skills/aoi-admin-[a-z0-9-]+', ''
    }
    foreach ($pattern in $Patterns) {
        if ($content -match $pattern) {
            Add-Failure "$Label residue in ${Path}: $pattern"
        }
    }
}

Push-Location $repoRoot
try {
    $requiredPaths = @(
        "go.mod",
        "README.md",
        "logo.png",
        "AGENTS.md",
        ".env.example",
        "Dockerfile",
        "cmd/README.md",
        "cmd/console/main.go",
        "cmd/console/openapi_contract_test.go",
        "cmd/console/README.md",
        ".github/workflows/ci.yml",
        "scripts/package.py",
        "deploy.sh",
        "script/install.sh",
        "deploy/config.production.example.yaml",
        "deploy/docker-compose.production.example.yml",
        "configs/config.example.yaml"
    )
    foreach ($path in $requiredPaths) {
        Test-RequiredPath $path
    }

    $removedPaths = @(
        ("cmd/" + "ao" + "i")
    )
    foreach ($path in $removedPaths) {
        Test-RemovedPath $path
    }

    Test-Contains -Path "go.mod" -Needle "module github.com/open-console/console-platform" -Label "neutral module path"
    Test-Contains -Path "Dockerfile" -Needle "./cmd/console" -Label "current Go entry"
    Test-Contains -Path "Dockerfile" -Needle "/app/console-server" -Label "current runtime binary"
    Test-Contains -Path ".github/workflows/ci.yml" -Needle "./cmd/console" -Label "CI build entry"
    Test-Contains -Path ".github/workflows/ci.yml" -Needle "console-platform:ci" -Label "CI Docker image"
    Test-Contains -Path ".github/workflows/ci.yml" -Needle "scripts/docker-smoke.sh" -Label "CI Docker smoke"
    Test-Contains -Path "scripts/package.py" -Needle 'DEFAULT_BINARY_NAME = "console-server"' -Label "release binary name"
    Test-Contains -Path "scripts/package.py" -Needle '"./cmd/console"' -Label "release build entry"
    Test-Contains -Path "deploy/config.production.example.yaml" -Needle "Console Platform" -Label "configurable neutral product name"
    Test-Contains -Path "deploy/config.production.example.yaml" -Needle "console-platform" -Label "configurable neutral product code"
    Test-Contains -Path "configs/config.example.yaml" -Needle "Console Platform" -Label "local neutral product name"
    Test-Contains -Path "configs/config.example.yaml" -Needle "console-platform" -Label "local neutral product code"
    Test-Contains -Path "deploy/docker-compose.production.example.yml" -Needle "console-platform" -Label "compose service naming"
    Test-Contains -Path "deploy.sh" -Needle "console-platform" -Label "deploy default naming"
    Test-Contains -Path "script/install.sh" -Needle "console-platform" -Label "install temp directory naming"

    $legacyPatterns = @(
        ("github\.com/rei0721/go-" + "scaffold"),
        ("go-" + "scaffold"),
        ("go_" + "scaffold"),
        ("ao" + "i-" + "admin"),
        ("ao" + "i_" + "admin"),
        ("Ao" + "i Admin"),
        ("A" + "oi\b"),
        ("cmd/" + "ao" + "i"),
        ("X-A" + "oi")
    )
    $entryFiles = @(
        "go.mod",
        "AGENTS.md",
        ".env.example",
        "Dockerfile",
        "cmd/README.md",
        "cmd/console/README.md",
        ".github/workflows/ci.yml",
        "scripts/package.py",
        "deploy.sh",
        "script/install.sh",
        "deploy/config.production.example.yaml",
        "deploy/docker-compose.production.example.yml",
        "configs/config.example.yaml"
    )
    foreach ($path in $entryFiles) {
        Test-DoesNotMatch -Path $path -Patterns $legacyPatterns -Label "legacy entry/brand"
    }

    $rootReadmeForbiddenPatterns = @(
        ("github\.com/rei0721/go-" + "scaffold"),
        ("go-" + "scaffold"),
        ("go_" + "scaffold"),
        ("cmd/" + "ao" + "i"),
        ("X-A" + "oi")
    )
    Test-DoesNotMatch -Path "README.md" -Patterns $rootReadmeForbiddenPatterns -Label "legacy root README"

    if ($failures.Count -gt 0) {
        Write-Host "entry and brand convergence check failed:" -ForegroundColor Red
        foreach ($failure in $failures) {
            Write-Host " - $failure" -ForegroundColor Red
        }
        exit 1
    }

    Write-Host "entry and brand convergence check passed."
    Write-Host "required paths checked: $($requiredPaths.Count)"
    Write-Host "removed paths checked: $($removedPaths.Count)"
    Write-Host "entry files scanned: $($entryFiles.Count)"
} finally {
    Pop-Location
}
