param(
    [string]$Root = ".",
    [string[]]$Paths = @()
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath $Root).Path
. (Join-Path $repoRoot "scripts/agent-skill-registry.ps1")

if ($Paths.Count -eq 0) {
    $Paths = @(
        "README.md",
        "AGENTS.md"
    ) + @(
        Get-RepositorySkillNames | ForEach-Object { ".agents/skills/$_" }
    ) + @(
        "cmd",
        "configs",
        "deploy",
        "docs",
        "internal",
        "pkg",
        "types",
        "scripts",
        "web/app/README.md",
        "web/app/AGENTS.md",
        "web/app/app",
        "web/app/content",
        "web/app/design",
        "web/app/scripts",
        "web/app/tests"
    )
}
$failures = New-Object System.Collections.Generic.List[string]
$checkedLinks = 0
$checkedFiles = 0

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

function Get-MarkdownFiles {
    param([string[]]$Roots)

    $excludedFragments = @(
        "/node_modules/",
        "/build/",
        "/dist/",
        "/tmp/",
        "/data/",
        "/.git/",
        "/coverage/",
        "/test-results/",
        "/playwright-report/"
    )

    foreach ($path in $Roots) {
        $fullPath = Join-RepoPath $path
        if (-not (Test-Path -LiteralPath $fullPath)) {
            Add-Failure "missing markdown scan path: $path"
            continue
        }

        $item = Get-Item -LiteralPath $fullPath
        $items = if ($item.PSIsContainer) {
            Get-ChildItem -LiteralPath $fullPath -Recurse -File -Filter "*.md" -Force -ErrorAction SilentlyContinue
        } elseif ($item.Extension -eq ".md") {
            @($item)
        } else {
            @()
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
            if (-not $skip) {
                $file
            }
        }
    }
}

function ConvertTo-GitHubSlug {
    param([string]$Heading)

    $text = $Heading.Trim()
    $text = [regex]::Replace($text, '\s*\{#[^}]+\}\s*$', '')
    $text = [regex]::Replace($text, '<[^>]+>', '')
    $text = [regex]::Replace($text, '!\[([^\]]*)\]\([^)]+\)', '$1')
    $text = [regex]::Replace($text, '\[([^\]]+)\]\([^)]+\)', '$1')
    $text = $text -replace '[`*_~]', ''
    $text = $text.ToLowerInvariant()
    $text = [regex]::Replace($text, '[^\p{L}\p{N}\s_-]', '')
    $text = [regex]::Replace($text, '\s+', '-').Trim('-')
    return $text
}

function Get-MarkdownAnchors {
    param([string[]]$Lines)

    $anchors = New-Object "System.Collections.Generic.HashSet[string]"
    $counts = @{}

    for ($index = 0; $index -lt $Lines.Count; $index++) {
        $line = $Lines[$index]
        $headingMatch = [regex]::Match($line, '^(#{1,6})\s+(.+?)\s*#*\s*$')
        if ($headingMatch.Success) {
            $slug = ConvertTo-GitHubSlug -Heading $headingMatch.Groups[2].Value
            if ($slug.Length -gt 0) {
                if ($counts.ContainsKey($slug)) {
                    $counts[$slug] = [int]$counts[$slug] + 1
                    $anchors.Add("$slug-$($counts[$slug])") | Out-Null
                } else {
                    $counts[$slug] = 0
                    $anchors.Add($slug) | Out-Null
                }
            }
        }

        foreach ($match in [regex]::Matches($line, '<a\s+(?:[^>]*\s+)?(?:id|name)=["'']([^"'']+)["'']')) {
            $anchors.Add($match.Groups[1].Value) | Out-Null
        }
    }

    return $anchors
}

function Split-LinkTarget {
    param([string]$RawTarget)

    $target = $RawTarget.Trim()
    if ($target.StartsWith("<") -and $target.EndsWith(">")) {
        $target = $target.Substring(1, $target.Length - 2)
    } else {
        $target = [regex]::Match($target, '^\S+').Value
    }

    return $target.Trim()
}

function Test-IsExternalTarget {
    param([string]$Target)

    return $Target -match '^(?i)(https?:|mailto:|tel:|data:|javascript:|app:|file:|#?$)'
}

$markdownFiles = @(Get-MarkdownFiles -Roots $Paths)
$anchorCache = @{}

foreach ($file in $markdownFiles) {
    $checkedFiles++
    $relativeFile = Get-RelativePath $file.FullName
    try {
        $lines = @(Get-Content -LiteralPath $file.FullName -Encoding UTF8)
    } catch {
        Add-Failure "cannot read markdown file ${relativeFile}: $($_.Exception.Message)"
        continue
    }

    $anchorCache[$file.FullName] = Get-MarkdownAnchors -Lines $lines
}

foreach ($file in $markdownFiles) {
    $relativeFile = Get-RelativePath $file.FullName
    $lines = @(Get-Content -LiteralPath $file.FullName -Encoding UTF8)
    $inFence = $false

    for ($lineIndex = 0; $lineIndex -lt $lines.Count; $lineIndex++) {
        $line = $lines[$lineIndex]
        if ($line -match '^\s*(```|~~~)') {
            $inFence = -not $inFence
            continue
        }
        if ($inFence) {
            continue
        }

        foreach ($match in [regex]::Matches($line, '!?\[[^\]]*\]\(([^)\r\n]+)\)')) {
            $rawTarget = $match.Groups[1].Value
            $target = Split-LinkTarget -RawTarget $rawTarget
            if ($target.Length -eq 0 -or (Test-IsExternalTarget -Target $target)) {
                continue
            }

            $checkedLinks++
            $targetWithoutQuery = ($target -split '\?', 2)[0]
            $parts = $targetWithoutQuery -split '#', 2
            $pathPart = $parts[0]
            $fragment = if ($parts.Count -gt 1) { $parts[1] } else { "" }

            try {
                $pathPart = [System.Uri]::UnescapeDataString($pathPart)
                $fragment = [System.Uri]::UnescapeDataString($fragment)
            } catch {
                Add-Failure "${relativeFile}:$($lineIndex + 1) has invalid escaped link target: $target"
                continue
            }

            $resolvedPath = if ([string]::IsNullOrWhiteSpace($pathPart)) {
                $file.FullName
            } else {
                Join-Path $file.DirectoryName ($pathPart -replace '/', [System.IO.Path]::DirectorySeparatorChar)
            }

            if (-not (Test-Path -LiteralPath $resolvedPath)) {
                Add-Failure "${relativeFile}:$($lineIndex + 1) links to missing path: $target"
                continue
            }

            $resolvedItem = Get-Item -LiteralPath $resolvedPath
            if ($fragment.Length -gt 0 -and -not $resolvedItem.PSIsContainer -and $resolvedItem.Extension -eq ".md") {
                $resolvedFullName = $resolvedItem.FullName
                if (-not $anchorCache.ContainsKey($resolvedFullName)) {
                    try {
                        $anchorCache[$resolvedFullName] = Get-MarkdownAnchors -Lines @(Get-Content -LiteralPath $resolvedFullName -Encoding UTF8)
                    } catch {
                        Add-Failure "${relativeFile}:$($lineIndex + 1) cannot read anchor target $target"
                        continue
                    }
                }

                if (-not $anchorCache[$resolvedFullName].Contains($fragment)) {
                    Add-Failure "${relativeFile}:$($lineIndex + 1) links to missing markdown anchor: $target"
                }
            }
        }
    }
}

if ($failures.Count -gt 0) {
    Write-Host "documentation link check failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "documentation link check passed."
Write-Host "markdown files checked: $checkedFiles"
Write-Host "relative links checked: $checkedLinks"
