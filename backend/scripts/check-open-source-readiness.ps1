param(
    [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath $Root).Path
$failures = New-Object System.Collections.Generic.List[string]

. (Join-Path $repoRoot "scripts/agent-skill-registry.ps1")

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

function Test-RequiredContent {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Label
    )

    $fullPath = Join-RepoPath $Path
    if (-not (Test-Path -LiteralPath $fullPath)) {
        Add-Failure "cannot check missing required content path: $Path"
        return
    }

    try {
        $content = Get-Content -LiteralPath $fullPath -Raw -Encoding UTF8
    } catch {
        Add-Failure "cannot read $Path for required content scan: $($_.Exception.Message)"
        return
    }

    if ($content -notmatch $Pattern) {
        Add-Failure "missing required content in ${Path}: $Label"
    }
}

function Get-RelativePath {
    param([string]$FullName)
    if ($FullName.Length -le $repoRoot.Length) {
        return $FullName
    }
    return $FullName.Substring($repoRoot.Length + 1).Replace("\", "/")
}

function Get-TextFiles {
    param([string[]]$Roots)

    $extensions = @(
        ".go", ".ts", ".tsx", ".js", ".mjs", ".json", ".yaml", ".yml",
        ".md", ".ps1", ".py", ".sh", ".css", ".html", ".mod"
    )
    $specialNames = @("Dockerfile", ".env.example", "LICENSE")
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
        "/docs/api/openapi.yaml",
        "/docs/maintenance/",
        "/docs/testing/docker-static-proof-2026-06-23.md",
        "/docs/testing/runtime-smoke-2026-06-22.md",
        "/docs/release/preflight-2026-06-23.md",
        "/scripts/check-agent-skills.ps1",
        "/scripts/check-entry-brand-convergence.ps1",
        "/scripts/check-open-source-readiness.ps1",
        "/scripts/check-plugin-removal.ps1"
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
    if ($relative -eq "AGENTS.md" -or $relative -eq "scripts/check-doc-links.ps1") {
        $content = $content -replace '\.agents/skills/aoi-admin-[a-z0-9-]+', ''
    }
    if ($relative -eq "scripts/agent-skill-registry.ps1") {
        $content = $content -replace 'aoi-admin-[a-z0-9-]+', ''
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

Push-Location $repoRoot
try {
    $repositorySkillPaths = foreach ($skillName in Get-RepositorySkillNames) {
        ".agents/skills/$skillName/SKILL.md"
        ".agents/skills/$skillName/agents/openai.yaml"
    }

    $requiredPaths = @(
        "README.md",
        "logo.png",
        "AGENTS.md",
        "scripts/agent-skill-registry.ps1"
    ) + $repositorySkillPaths + @(
        "cmd/README.md",
        "cmd/console/README.md",
        "configs/README.md",
        "deploy/README.md",
        "docs/README.md",
        "docs/architecture/layers.md",
        "docs/architecture/error-result-contracts.md",
        "docs/backlog/known-gaps.md",
        "docs/build/docker-and-ci.md",
        "docs/extension/module-blueprint.md",
        "docs/testing/test-matrix.md",
        "docs/workflows/iam-cli.md",
        "docs/workflows/db-cli.md",
        "docs/testing/visual-qa-full-2026-06-23.md",
        "docs/release/preflight-checklist.md",
        "docs/release/release-evidence-template.md",
        "docs/release/operational-observation-template.md",
        "docs/maintenance/open-source-readiness.md",
        "docs/maintenance/maintenance-guide.md",
        "docs/maintenance/refactor-roadmap-2026-06-23.md",
        "docs/maintenance/final-open-source-readiness-audit-2026-06-23.md",
        "docs/maintenance/entry-brand-convergence-audit-2026-06-23.md",
        "docs/maintenance/worktree-convergence-2026-06-23.md",
        "docs/maintenance/pr-split-plan-2026-06-23.md",
        "docs/maintenance/docker-smoke-script-audit-2026-06-23.md",
        "docs/maintenance/ci-docker-evidence-check-audit-2026-06-23.md",
        "docs/maintenance/release-preflight-script-audit-2026-06-23.md",
        "docs/maintenance/release-evidence-validator-audit-2026-06-23.md",
        "docs/maintenance/visual-qa-runner-audit-2026-06-23.md",
        "scripts/README.md",
        "scripts/check-entry-brand-convergence.ps1",
        "scripts/check-deployment-guardrails.ps1",
        "scripts/check-local-tooling.ps1",
        "scripts/check-error-result-boundaries.ps1",
        "scripts/check-agent-skills.ps1",
        "scripts/check-doc-readmes.ps1",
        "scripts/check-doc-links.ps1",
        "scripts/check-plugin-removal.ps1",
        "scripts/check-worktree-convergence.ps1",
        "scripts/check-release-evidence.ps1",
        "scripts/check-operational-observation-template.ps1",
        "scripts/check-ci-docker-evidence.ps1",
        "scripts/check-package-sqlite-boundary.ps1",
        "scripts/release-preflight.ps1",
        "scripts/visual-qa.ps1",
        "scripts/runtime-smoke.ps1",
        "scripts/docker-smoke.ps1",
        "scripts/docker-smoke.sh",
        "internal/README.md",
        "internal/app/README.md",
        "internal/config/README.md",
        "internal/middleware/README.md",
        "internal/migrations/README.md",
        "internal/modules/README.md",
        "internal/modules/iam/README.md",
        "internal/modules/system/README.md",
        "internal/modules/announcements/README.md",
        "internal/ports/README.md",
        "internal/transport/README.md",
        "pkg/README.md",
        "types/README.md",
        "types/auth/README.md",
        "types/constants/README.md",
        "types/errors/README.md",
        "types/result/README.md",
        "web/app/README.md",
        "web/app/app/README.md",
        "web/app/app/components/console/README.md",
        "web/app/app/features/README.md",
        "web/app/app/lib/api/README.md",
        "web/app/app/routes/README.md",
        "web/app/app/stores/README.md",
        "web/app/app/theme/README.md"
    )

    foreach ($path in $requiredPaths) {
        Test-RequiredPath $path
    }

    $requiredContentChecks = @(
        @{
            Path = "AGENTS.md"
            Pattern = "scripts/check-local-tooling\.ps1"
            Label = "root agent rules must expose the local tooling check"
        },
        @{
            Path = "docs/README.md"
            Pattern = "scripts/check-local-tooling\.ps1"
            Label = "engineering docs entry must expose the local tooling check"
        },
        @{
            Path = "docs/testing/test-matrix.md"
            Pattern = "scripts/check-local-tooling\.ps1"
            Label = "test matrix must expose the local tooling check"
        },
        @{
            Path = "scripts/README.md"
            Pattern = "scripts/check-local-tooling\.ps1"
            Label = "scripts README must document the local tooling check"
        },
        @{
            Path = "AGENTS.md"
            Pattern = "scripts/check-doc-links\.ps1"
            Label = "root agent rules must expose the documentation link check"
        },
        @{
            Path = "docs/README.md"
            Pattern = "scripts/check-doc-links\.ps1"
            Label = "engineering docs entry must expose the documentation link check"
        },
        @{
            Path = "docs/testing/test-matrix.md"
            Pattern = "scripts/check-doc-links\.ps1"
            Label = "test matrix must expose the documentation link check"
        },
        @{
            Path = "docs/workflows/iam-cli.md"
            Pattern = "scripts/package\.py --target windows/amd64 --output build/releases --skip-web-build"
            Label = "IAM CLI workflow must use the current package.py skip-web-build flag"
        },
        @{
            Path = "scripts/README.md"
            Pattern = "scripts/check-doc-links\.ps1"
            Label = "scripts README must document the documentation link check"
        },
        @{
            Path = "scripts/release-preflight.ps1"
            Pattern = "scripts/check-doc-links\.ps1"
            Label = "release preflight must run the documentation link check"
        },
        @{
            Path = "docs/README.md"
            Pattern = "maintenance/refactor-roadmap-2026-06-23\.md"
            Label = "engineering docs entry must link the refactor roadmap"
        },
        @{
            Path = "docs/README.md"
            Pattern = "maintenance/pr-split-plan-2026-06-23\.md"
            Label = "engineering docs entry must link the PR split plan"
        },
        @{
            Path = "docs/README.md"
            Pattern = "maintenance/final-acceptance-gap-audit-2026-06-23\.md"
            Label = "engineering docs entry must link the final acceptance gap audit"
        },
        @{
            Path = "docs/maintenance/README.md"
            Pattern = "refactor-roadmap-2026-06-23\.md"
            Label = "maintenance index must link the refactor roadmap"
        },
        @{
            Path = "docs/maintenance/README.md"
            Pattern = "pr-split-plan-2026-06-23\.md"
            Label = "maintenance index must link the PR split plan"
        },
        @{
            Path = "AGENTS.md"
            Pattern = "scripts/check-error-result-boundaries\.ps1"
            Label = "root agent rules must expose the error/result boundary gate"
        },
        @{
            Path = "docs/README.md"
            Pattern = "scripts/check-error-result-boundaries\.ps1"
            Label = "engineering docs entry must expose the error/result boundary gate"
        },
        @{
            Path = "docs/architecture/error-result-contracts.md"
            Pattern = "scripts/check-error-result-boundaries\.ps1"
            Label = "error/result contract doc must reference the boundary gate"
        },
        @{
            Path = "scripts/README.md"
            Pattern = "scripts/check-error-result-boundaries\.ps1"
            Label = "scripts README must document the boundary gate"
        },
        @{
            Path = "scripts/release-preflight.ps1"
            Pattern = "scripts/check-error-result-boundaries\.ps1"
            Label = "release preflight must run the boundary gate"
        },
        @{
            Path = "scripts/release-preflight.ps1"
            Pattern = "scripts/check-operational-observation-template\.ps1"
            Label = "release preflight must run the operational observation template gate"
        },
        @{
            Path = "scripts/README.md"
            Pattern = "scripts/check-operational-observation-template\.ps1"
            Label = "scripts README must document the operational observation template gate"
        },
        @{
            Path = "docs/release/preflight-checklist.md"
            Pattern = "scripts/check-operational-observation-template\.ps1"
            Label = "release preflight checklist must document the operational observation template gate"
        },
        @{
            Path = "scripts/release-preflight.ps1"
            Pattern = "scripts/check-package-sqlite-boundary\.ps1"
            Label = "release preflight must run the package SQLite boundary gate"
        },
        @{
            Path = "scripts/README.md"
            Pattern = "scripts/check-package-sqlite-boundary\.ps1"
            Label = "scripts README must document the package SQLite boundary gate"
        },
        @{
            Path = "docs/testing/test-matrix.md"
            Pattern = "scripts/check-package-sqlite-boundary\.ps1"
            Label = "test matrix must expose the package SQLite boundary gate"
        },
        @{
            Path = "docs/release/preflight-checklist.md"
            Pattern = "scripts/check-package-sqlite-boundary\.ps1"
            Label = "release preflight checklist must document the package SQLite boundary gate"
        },
        @{
            Path = "docs/build/docker-and-ci.md"
            Pattern = "scripts/check-package-sqlite-boundary\.ps1"
            Label = "Docker and CI doc must document the package SQLite boundary gate"
        },
        @{
            Path = ".agents/skills/aoi-admin-platform-maintenance/SKILL.md"
            Pattern = "scripts/check-error-result-boundaries\.ps1"
            Label = "platform maintenance skill must list the boundary gate"
        },
        @{
            Path = ".agents/skills/aoi-admin-docs-governance/SKILL.md"
            Pattern = "scripts/check-error-result-boundaries\.ps1"
            Label = "docs governance skill must list the boundary gate"
        },
        @{
            Path = ".agents/skills/aoi-admin-error-result-governance/SKILL.md"
            Pattern = "scripts/check-error-result-boundaries\.ps1"
            Label = "error/result governance skill must list the boundary gate"
        }
    )

    foreach ($check in $requiredContentChecks) {
        Test-RequiredContent -Path $check.Path -Pattern $check.Pattern -Label $check.Label
    }

    Test-FileContentDoesNotMatch `
        -File (Get-Item -LiteralPath (Join-RepoPath "docs/workflows/iam-cli.md")) `
        -Patterns @("--skip-web-generate") `
        -Label "stale package flag"

    $ciEvidenceNarrativeFiles = @(
        "docs/README.md",
        "docs/backlog/known-gaps.md",
        "docs/testing/test-matrix.md",
        "docs/testing/runtime-smoke-2026-06-22.md",
        "docs/maintenance/open-source-readiness.md",
        "docs/maintenance/final-acceptance-gap-audit-2026-06-23.md",
        "docs/maintenance/ci-docker-evidence-check-audit-2026-06-23.md",
        "docs/maintenance/docker-smoke-script-audit-2026-06-23.md",
        "docs/maintenance/release-preflight-script-audit-2026-06-23.md",
        "docs/maintenance/worktree-convergence-2026-06-23.md",
        "docs/release/preflight-2026-06-23.md"
    )
    $ciEvidenceOverclaimPatterns = @(
        "CI 已在",
        "GitHub Actions 已在",
        "CI 虽已"
    )
    foreach ($path in $ciEvidenceNarrativeFiles) {
        $file = Get-OptionalFileItem -Path $path
        if ($null -ne $file) {
            Test-FileContentDoesNotMatch -File $file -Patterns $ciEvidenceOverclaimPatterns -Label "CI evidence overclaim"
        }
    }

    try {
        & (Join-RepoPath "scripts/check-doc-readmes.ps1") -Root $repoRoot
    } catch {
        Add-Failure "documentation README coverage failed: $($_.Exception.Message)"
    }

    try {
        & (Join-RepoPath "scripts/check-doc-links.ps1") -Root $repoRoot
    } catch {
        Add-Failure "documentation link check failed: $($_.Exception.Message)"
    }

    $removedPaths = @(
        "cmd/aoi",
        "internal/plugin",
        "pkg/plugin",
        "pkg/pluginapi",
        "_examples/remote-plugins",
        "docs/ai",
        "ai",
        ".ai",
        "docs/api/plugin-protocol",
        "docs/architecture/distributed-plugin-system.md",
        "docs/modules/plugins.md",
        "configs/examples/plugins-remote-rpc.example.yaml",
        "web/app/app/lib/api/plugins.ts",
        "web/app/app/routes/admin/plugins.tsx",
        "web/app/app/components/aoi",
        "web/app/app/i18n/locales/en.json",
        "web/app/app/theme/packages/builtin/aoi"
    )

    foreach ($path in $removedPaths) {
        Test-RemovedPath $path
    }

    $localePaths = @(
        "web/app/app/i18n/locales/zh-CN.json",
        "web/app/app/i18n/locales/en-US.json",
        "configs/locales/ui/zh-CN.yaml",
        "configs/locales/ui/en-US.yaml",
        "configs/locales/api/zh-CN.yaml",
        "configs/locales/api/en-US.yaml",
        "configs/locales/system/zh-CN.yaml",
        "configs/locales/system/en-US.yaml",
        "configs/locales/validation/zh-CN.yaml",
        "configs/locales/validation/en-US.yaml"
    )
    foreach ($path in $localePaths) {
        Test-RequiredPath $path
    }

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

    $pluginConfigPatterns = @(
        "(?m)^\s*plugins\s*:",
        "plugin-api",
        "/api/v1/plugins",
        "/plugin-api",
        "remote-plugins",
        "plugin-protocol"
    )
    foreach ($path in $configFiles) {
        $file = Get-OptionalFileItem -Path $path
        if ($null -ne $file) {
            Test-FileContentDoesNotMatch -File $file -Patterns $pluginConfigPatterns -Label "plugin config"
        }
    }

    $deliveryRoots = @(
        "AGENTS.md",
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
        "docs/README.md",
        "docs/architecture",
        "docs/environment",
        "docs/extension",
        "docs/modules",
        "docs/onboarding",
        "docs/release",
        "docs/runtime",
        "docs/structure",
        "docs/testing",
        "web/app/README.md",
        "web/app/AGENTS.md",
        "web/app/app",
        "web/app/content",
        "web/app/design",
        "web/app/scripts",
        "web/app/tests"
    )
    $brandFiles = @(Get-TextFiles -Roots $deliveryRoots)
    $pluginRoots = @(
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
    $pluginFiles = @(Get-TextFiles -Roots $pluginRoots | Where-Object {
            $relative = Get-RelativePath $_.FullName
            $relative -notmatch '(^|/)(README|AGENTS)\.md$' -and
            $relative -notmatch '(_test\.go|\.test\.(ts|tsx|js|jsx))$'
        })

    $legacyBrandPatterns = @(
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
    $pluginDeliveryPatterns = @(
        "internal/plugin",
        "pkg/plugin",
        "pkg/pluginapi",
        "/api/v1/plugins",
        "/plugin-api",
        "remote-plugins",
        "plugin-protocol"
    )

    foreach ($file in $brandFiles) {
        Test-FileContentDoesNotMatch -File $file -Patterns $legacyBrandPatterns -Label "legacy brand"
    }

    $rootReadmeForbiddenPatterns = @(
        ("github\.com/rei0721/go-" + "scaffold"),
        ("go-" + "scaffold"),
        ("go_" + "scaffold"),
        ("cmd/" + "ao" + "i"),
        ("X-A" + "oi")
    )
    Test-FileContentDoesNotMatch -File (Get-Item -LiteralPath (Join-RepoPath "README.md")) -Patterns $rootReadmeForbiddenPatterns -Label "legacy root README"

    foreach ($file in $pluginFiles) {
        Test-FileContentDoesNotMatch -File $file -Patterns $pluginDeliveryPatterns -Label "plugin delivery"
    }

    $agentGuideForbiddenPatterns = @(
        'docs/ai',
        '(^|[^.])\.ai\b'
    )
    $maintenanceGuidePath = Join-RepoPath "docs/maintenance/maintenance-guide.md"
    Test-FileContentDoesNotMatch -File (Get-Item -LiteralPath $maintenanceGuidePath) -Patterns $agentGuideForbiddenPatterns -Label "maintenance guide agent rule"

    if ($failures.Count -gt 0) {
        Write-Host "open-source readiness check failed:" -ForegroundColor Red
        foreach ($failure in $failures) {
            Write-Host " - $failure" -ForegroundColor Red
        }
        exit 1
    }

    Write-Host "open-source readiness check passed."
    Write-Host "required paths checked: $($requiredPaths.Count)"
    Write-Host "removed paths checked: $($removedPaths.Count)"
    Write-Host "brand files scanned: $($brandFiles.Count)"
    Write-Host "plugin delivery files scanned: $($pluginFiles.Count)"
} finally {
    Pop-Location
}
