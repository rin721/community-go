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

function Get-RelativePath {
    param([string]$FullName)
    if ($FullName.Length -le $repoRoot.Length) {
        return $FullName
    }
    return $FullName.Substring($repoRoot.Length + 1).Replace("\", "/")
}

function Test-RequiredPath {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath (Join-RepoPath $Path))) {
        Add-Failure "missing required replacement path: $Path"
    }
}

function Test-RemovedPath {
    param([string]$Path)
    if (Test-Path -LiteralPath (Join-RepoPath $Path)) {
        Add-Failure "removed plugin path is present: $Path"
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

function Test-FileContentDoesNotMatch {
    param(
        [System.IO.FileInfo]$File,
        [string[]]$Patterns,
        [string]$Label
    )

    $relative = Get-RelativePath $File.FullName
    try {
        $content = Get-Content -LiteralPath $File.FullName -Raw -Encoding UTF8
    } catch {
        Add-Failure "cannot read $relative for $Label scan: $($_.Exception.Message)"
        return
    }

    foreach ($pattern in $Patterns) {
        if ($content -match $pattern) {
            Add-Failure "$Label residue in ${relative}: $pattern"
        }
    }
}

function Get-OptionalFileItem {
    param([string]$Path)

    $fullPath = Join-RepoPath $Path
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        return $null
    }

    try {
        return Get-Item -LiteralPath $fullPath -ErrorAction Stop
    } catch {
        return $null
    }
}

function Get-TextFiles {
    param([string[]]$Roots)

    $extensions = @(
        ".go", ".ts", ".tsx", ".js", ".mjs", ".json", ".yaml", ".yml",
        ".ps1", ".py", ".sh", ".css", ".html", ".mod"
    )
    $specialNames = @("Dockerfile", ".env.example")
    $excludedFragments = @(
        "/node_modules/",
        "/build/",
        "/dist/",
        "/tmp/",
        "/data/",
        "/.git/",
        "/coverage/",
        "/test-results/",
        "/playwright-report/",
        "/configs/config.local.yaml",
        "/docs/",
        "/README.md",
        "/AGENTS.md"
    )

    foreach ($root in $Roots) {
        $fullRoot = Join-RepoPath $root
        if (-not (Test-Path -LiteralPath $fullRoot)) {
            continue
        }

        try {
            $item = Get-Item -LiteralPath $fullRoot -ErrorAction Stop
        } catch {
            continue
        }
        $items = if ($item.PSIsContainer) {
            Get-ChildItem -LiteralPath $fullRoot -Recurse -File -Force -ErrorAction SilentlyContinue
        } else {
            @($item)
        }

        foreach ($file in $items) {
            $relative = "/" + (Get-RelativePath $file.FullName)
            $skip = $false
            foreach ($fragment in $excludedFragments) {
                if ($relative -like "*$fragment*") {
                    $skip = $true
                    break
                }
            }
            if ($skip) {
                continue
            }

            if ($extensions -contains $file.Extension -or $specialNames -contains $file.Name) {
                $file
            }
        }
    }
}

Push-Location $repoRoot
try {
    $removedPaths = @(
        "internal/plugin",
        "pkg/plugin",
        "pkg/pluginapi",
        "_examples/remote-plugins",
        "docs/api/plugin-protocol",
        "docs/architecture/distributed-plugin-system.md",
        "docs/modules/plugins.md",
        "configs/examples/plugins-remote-rpc.example.yaml",
        "internal/config/app_plugins.go",
        "internal/config/app_plugins_test.go",
        "internal/app/initapp/plugins_test.go",
        "internal/migrations/20260615000100_create_plugin_registry.sql",
        "internal/migrations/20260615000200_add_plugin_instance_transport.sql",
        "web/app/app/lib/api/plugins.ts",
        "web/app/app/routes/admin/plugins.tsx"
    )
    foreach ($path in $removedPaths) {
        Test-RemovedPath $path
    }

    $replacementPaths = @(
        "internal/modules",
        "internal/modules/README.md",
        "docs/extension/adding-modules.md",
        "docs/extension/module-blueprint.md",
        "docs/maintenance/module-extension-plugin-removal-audit-2026-06-23.md",
        "docs/maintenance/pr-split-plan-2026-06-23.md"
    )
    foreach ($path in $replacementPaths) {
        Test-RequiredPath $path
    }

    $pluginPatterns = @(
        "(?m)^\s*plugins\s*:",
        "internal/plugin",
        "pkg/plugin",
        "pkg/pluginapi",
        "/api/v1/plugins",
        "/plugin-api",
        "remote-plugins",
        "plugin-protocol"
    )

    $configFiles = @(
        ".env.example",
        "configs/config.example.yaml",
        "deploy/config.production.example.yaml",
        "deploy/docker-compose.production.example.yml"
    )
    if (Test-Path -LiteralPath (Join-RepoPath "configs/examples")) {
        $configFiles += Get-ChildItem -LiteralPath (Join-RepoPath "configs/examples") -File -Include "*.yaml", "*.yml" -Recurse |
            ForEach-Object { Get-RelativePath $_.FullName }
    }
    foreach ($path in $configFiles) {
        $file = Get-OptionalFileItem -Path $path
        if ($null -ne $file) {
            Test-FileContentDoesNotMatch -File $file -Patterns $pluginPatterns -Label "plugin config"
        }
    }

    $productionRoots = @(
        "cmd",
        "internal",
        "pkg",
        "types",
        "configs",
        "deploy",
        ".github",
        "scripts",
        "script",
        "Dockerfile",
        ".env.example",
        "web/app/app",
        "web/app/scripts"
    )
    $productionFiles = @(Get-TextFiles -Roots $productionRoots | Where-Object {
            $relative = Get-RelativePath $_.FullName
            $relative -notmatch '(^|/)(README|AGENTS)\.md$' -and
            $relative -notmatch '(_test\.go|\.test\.(ts|tsx|js|jsx))$' -and
            $relative -notmatch '(^|/)scripts/check-(open-source-readiness|plugin-removal)\.ps1$'
        })
    foreach ($file in $productionFiles) {
        Test-FileContentDoesNotMatch -File $file -Patterns $pluginPatterns -Label "plugin production"
    }

    $moduleDocs = Get-ContentUtf8 -Path "docs/extension/module-blueprint.md"
    if (-not $moduleDocs.Contains("internal/modules")) {
        Add-Failure "module blueprint must describe internal/modules as the extension path"
    }

    if ($failures.Count -gt 0) {
        Write-Host "plugin removal check failed:" -ForegroundColor Red
        foreach ($failure in $failures) {
            Write-Host " - $failure" -ForegroundColor Red
        }
        exit 1
    }

    Write-Host "plugin removal check passed."
    Write-Host "removed paths checked: $($removedPaths.Count)"
    Write-Host "replacement paths checked: $($replacementPaths.Count)"
    Write-Host "config files scanned: $($configFiles.Count)"
    Write-Host "production files scanned: $($productionFiles.Count)"
} finally {
    Pop-Location
}
