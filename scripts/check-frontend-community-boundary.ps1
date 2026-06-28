param(
    [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath $Root).Path
$scanRoots = @(
    "frontend/app",
    "frontend/shared",
    "frontend/server/api/mock",
    "frontend/i18n/locales"
)
$extensions = @(".vue", ".ts", ".json")
$backendScanRoots = @(
    "backend/internal/modules/community",
    "backend/internal/app/initapp",
    "backend/internal/migrations"
)
$backendExtensions = @(".go", ".sql")
$visibleTerms = @(
    @(0x7EC4, 0x7EC7),
    @(0x79DF, 0x6237),
    @(0x540E, 0x53F0),
    @(0x63A7, 0x5236, 0x53F0),
    @(0x7BA1, 0x7406, 0x5458),
    @(0x5E73, 0x53F0, 0x7BA1, 0x7406, 0x5458),
    @(0x7CFB, 0x7EDF, 0x7BA1, 0x7406, 0x5458),
    @(0x7AD9, 0x70B9, 0x7BA1, 0x7406, 0x5458)
)
$visiblePattern = ($visibleTerms | ForEach-Object {
    $term = $_
    -join ($term | ForEach-Object { [char]$_ })
}) -join "|"
$checks = @(
    @{
        Name = "control-console visible wording"
        Pattern = $visiblePattern
    },
    @{
        Name = "control-console identity fields"
        Pattern = '\b(tenant|tenantId|organization|organizationId|orgId|orgs|platform_owner|permissionCode|permissionScope|userRole|roleId|roleName|roles)\b'
    },
    @{
        Name = "control-console account wording"
        Pattern = '\b(admin|administrator|consoleUser|controlConsole)\b'
    },
    @{
        Name = "frontend docs route reference"
        Pattern = '(?:to|href|path)\s*[:=]\s*(["''])/docs(?:[/#?][^"'']*)?\1|navigateTo\(\s*(["''])/docs(?:[/#?][^"'']*)?\2'
    }
)
$routeChecks = @(
    @{
        Name = "docs page route"
        Paths = @(
            "frontend/app/pages/docs.vue",
            "frontend/app/pages/docs/index.vue",
            "frontend/app/pages/docs"
        )
    },
    @{
        Name = "control-console page route"
        Paths = @(
            "frontend/app/pages/admin.vue",
            "frontend/app/pages/admin",
            "frontend/app/pages/console.vue",
            "frontend/app/pages/console",
            "frontend/app/pages/organizations.vue",
            "frontend/app/pages/organizations"
        )
    },
    @{
        Name = "frontend app mock module"
        Paths = @(
            "frontend/app/mocks"
        )
    }
)

$failures = New-Object System.Collections.Generic.List[string]

function Get-RelativePath {
    param([string]$Path)

    $rootPath = [System.IO.Path]::GetFullPath($repoRoot).TrimEnd([char]92, [char]47)
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    if ($fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relative = $fullPath.Substring($rootPath.Length).TrimStart([char]92, [char]47)
    } else {
        $relative = $fullPath
    }
    return $relative.Replace([char]92, [char]47)
}

function Test-RelativePathPrefix {
    param(
        [string]$Path,
        [string]$Prefix
    )

    return $Path -eq $Prefix -or $Path.StartsWith("$Prefix/")
}

$allowedMockEndpointPaths = @(
    "frontend/app/composables/useAoiApi.ts",
    "frontend/app/composables/useAoiAuthApi.ts"
)
$allowedLegacyCategoryPaths = @(
    "frontend/app/utils/communityCategories.ts"
)
$mockImportPattern = '(?:from\s+["''][^"'']*(?:/mocks|shared/mocks)|import\(\s*["''][^"'']*(?:/mocks|shared/mocks))'
$mockEndpointPattern = '/api/mock'
$hardcodedCategoryPattern = '(?:categorySlug\s*:\s*["'']design["'']|categorySlug\s*\|\|\s*["'']design["'']|category\s*:\s*["'']home["'']|selectedCategory\s*:\s*["'']home["'']|videos\?category=home)'
$backendProductionChecks = @(
    @{
        Name = "backend community_categories production storage"
        Pattern = '\bcommunity_categories\b'
        Extensions = @(".go", ".sql")
    },
    @{
        Name = "backend community demo seed insert"
        Pattern = '(?m)^\s*INSERT\s+INTO\s+community_[a-z0-9_]+\b'
        Extensions = @(".go", ".sql")
    },
    @{
        Name = "backend hardcoded production category default"
        Pattern = '(?:CategorySlug|category_slug|category|Category)\s*(?::|=|=>|IN\s*\(|,)?\s*["''](?:home|design)["'']'
        Extensions = @(".go", ".sql")
    },
    @{
        Name = "backend production mock/demo/fixture branch"
        Pattern = '\b(?:mock|fixture|demo)\b'
        Extensions = @(".go")
    }
)

function Get-LineNumber {
    param(
        [string]$Content,
        [int]$Index
    )

    return (($Content.Substring(0, $Index)) -split "`r?`n").Count
}

foreach ($routeCheck in $routeChecks) {
    foreach ($routePath in $routeCheck.Paths) {
        $absolutePath = Join-Path $repoRoot $routePath
        if (Test-Path -LiteralPath $absolutePath) {
            $relativePath = Get-RelativePath -Path $absolutePath
            $failures.Add("${relativePath} $($routeCheck.Name)") | Out-Null
        }
    }
}

foreach ($scanRoot in $scanRoots) {
    $absoluteRoot = Join-Path $repoRoot $scanRoot
    if (-not (Test-Path -LiteralPath $absoluteRoot)) {
        continue
    }

    $files = Get-ChildItem -LiteralPath $absoluteRoot -Recurse -File |
        Where-Object { $extensions -contains $_.Extension }

    foreach ($file in $files) {
        $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
        $relativePath = Get-RelativePath -Path $file.FullName
        foreach ($check in $checks) {
            $matches = [regex]::Matches($content, $check.Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($match in $matches) {
                $lineNumber = Get-LineNumber -Content $content -Index $match.Index
                $failures.Add("${relativePath}:${lineNumber} $($check.Name): $($match.Value)") | Out-Null
            }
        }

        if (Test-RelativePathPrefix -Path $relativePath -Prefix "frontend/app") {
            $mockImportMatches = [regex]::Matches($content, $mockImportPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($match in $mockImportMatches) {
                $lineNumber = Get-LineNumber -Content $content -Index $match.Index
                $failures.Add("${relativePath}:${lineNumber} frontend app imports mock fixture: $($match.Value)") | Out-Null
            }
        }

        $mockEndpointAllowed = $allowedMockEndpointPaths -contains $relativePath -or (Test-RelativePathPrefix -Path $relativePath -Prefix "frontend/server/api/mock")
        if (-not $mockEndpointAllowed) {
            $mockEndpointMatches = [regex]::Matches($content, $mockEndpointPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($match in $mockEndpointMatches) {
                $lineNumber = Get-LineNumber -Content $content -Index $match.Index
                $failures.Add("${relativePath}:${lineNumber} hardcoded mock endpoint outside API client/mock server: $($match.Value)") | Out-Null
            }
        }

        $legacyCategoryAllowed = $allowedLegacyCategoryPaths -contains $relativePath -or (Test-RelativePathPrefix -Path $relativePath -Prefix "frontend/shared/mocks")
        if (-not $legacyCategoryAllowed) {
            $categoryMatches = [regex]::Matches($content, $hardcodedCategoryPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($match in $categoryMatches) {
                $lineNumber = Get-LineNumber -Content $content -Index $match.Index
                $failures.Add("${relativePath}:${lineNumber} hardcoded production category default: $($match.Value)") | Out-Null
            }
        }
    }
}

foreach ($scanRoot in $backendScanRoots) {
    $absoluteRoot = Join-Path $repoRoot $scanRoot
    if (-not (Test-Path -LiteralPath $absoluteRoot)) {
        continue
    }

    $files = Get-ChildItem -LiteralPath $absoluteRoot -Recurse -File |
        Where-Object {
            $backendExtensions -contains $_.Extension -and
            -not $_.Name.EndsWith("_test.go", [System.StringComparison]::OrdinalIgnoreCase)
        }

    foreach ($file in $files) {
        $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
        $relativePath = Get-RelativePath -Path $file.FullName

        foreach ($check in $backendProductionChecks) {
            if ($check.Extensions -notcontains $file.Extension) {
                continue
            }
            $matches = [regex]::Matches($content, $check.Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($match in $matches) {
                $lineNumber = Get-LineNumber -Content $content -Index $match.Index
                $failures.Add("${relativePath}:${lineNumber} $($check.Name): $($match.Value)") | Out-Null
            }
        }
    }
}

if ($failures.Count -gt 0) {
    Write-Host "community boundary check failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "community boundary check passed."
