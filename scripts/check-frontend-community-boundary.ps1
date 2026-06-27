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
    }
)

$failures = New-Object System.Collections.Generic.List[string]

function Get-RelativePath {
    param([string]$Path)

    $relative = [System.IO.Path]::GetRelativePath($repoRoot, $Path)
    return $relative.Replace([char]92, [char]47)
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
        foreach ($check in $checks) {
            $matches = [regex]::Matches($content, $check.Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($match in $matches) {
                $beforeMatch = $content.Substring(0, $match.Index)
                $lineNumber = ($beforeMatch -split "`r?`n").Count
                $relativePath = Get-RelativePath -Path $file.FullName
                $failures.Add("${relativePath}:${lineNumber} $($check.Name): $($match.Value)") | Out-Null
            }
        }
    }
}

if ($failures.Count -gt 0) {
    Write-Host "frontend community boundary check failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "frontend community boundary check passed."
