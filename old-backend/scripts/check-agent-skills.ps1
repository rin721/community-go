param(
    [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath $Root).Path
$skillsRoot = Join-Path $repoRoot ".agents/skills"
$failures = New-Object System.Collections.Generic.List[string]

. (Join-Path $repoRoot "scripts/agent-skill-registry.ps1")
$repositorySkills = @(Get-RepositorySkillNames)

function Add-Failure {
    param([string]$Message)
    $failures.Add($Message) | Out-Null
}

function Get-ScalarField {
    param(
        [string]$Content,
        [string]$Field
    )

    $pattern = "(?m)^\s*$([regex]::Escape($Field)):\s*(?:""([^""]+)""|'([^']+)'|([^\r\n#]+))\s*(?:#.*)?$"
    $match = [regex]::Match($Content, $pattern)
    if (-not $match.Success) {
        return ""
    }

    foreach ($index in 1..3) {
        $value = $match.Groups[$index].Value.Trim()
        if ($value.Length -gt 0) {
            return $value
        }
    }

    return ""
}

function Get-RepositoryLegacyPatterns {
    return @(
        ('cmd[/\\]' + 'aoi'),
        ('go run \./cmd/' + 'aoi'),
        ('go build .* \./cmd/' + 'aoi'),
        ('github\.com/rei0721/go-' + 'scaffold'),
        ('go-' + 'scaffold'),
        ('go_' + 'scaffold')
    )
}

function Test-RepositoryLegacyResidue {
    param(
        [string]$SkillName,
        [string]$RelativePath,
        [string]$Content
    )

    foreach ($pattern in Get-RepositoryLegacyPatterns) {
        if ($Content -match $pattern) {
            Add-Failure "legacy entry residue in ${RelativePath}: $pattern"
        }
    }
}

function Test-RepositorySkillCommandDrift {
    param(
        [string]$SkillName,
        [string]$Content
    )

    if ($SkillName -eq "aoi-admin-build-ci-governance") {
        if ($Content -match 'check-ci-docker-evidence\.ps1\s+-Path\b') {
            Add-Failure "stale CI Docker evidence command in .agents/skills/$SkillName/SKILL.md: use -RunId/-CommitSha or -LogPath, not -Path"
        }
        if ($Content -notmatch 'check-ci-docker-evidence\.ps1\s+-RunId\s+<workflow-run-id>\s+-CommitSha\s+<commit-sha>') {
            Add-Failure "missing GitHub Actions evidence command in .agents/skills/$SkillName/SKILL.md"
        }
        if ($Content -notmatch 'check-ci-docker-evidence\.ps1\s+-LogPath\s+<docker-smoke-ci\.log>') {
            Add-Failure "missing downloaded log evidence command in .agents/skills/$SkillName/SKILL.md"
        }
    }
}

function Test-SkillGitlinks {
    try {
        Push-Location $repoRoot
        $entries = @(git ls-files -s -- ".agents/skills" 2>&1)
        if ($LASTEXITCODE -ne 0) {
            Add-Failure "cannot inspect tracked skill entries: $($entries -join [Environment]::NewLine)"
            return
        }
    } finally {
        Pop-Location
    }

    foreach ($entry in $entries) {
        if ($entry -match '^160000\s+[0-9a-f]{40}\s+\d+\s+(?<path>\.agents/skills/.+)$') {
            Add-Failure "skill must be self-contained instead of a gitlink/submodule: $($Matches.path)"
        }
    }
}

function Test-SkillMetadata {
    param(
        [System.IO.DirectoryInfo]$SkillDir,
        [bool]$IsRepositorySkill
    )

    $skillName = $SkillDir.Name
    if ($skillName -notmatch '^[a-z0-9][a-z0-9-]{0,63}$') {
        Add-Failure "invalid skill directory name: $skillName"
    }

    $skillPath = Join-Path $SkillDir.FullName "SKILL.md"
    if (-not (Test-Path -LiteralPath $skillPath)) {
        Add-Failure "missing SKILL.md: .agents/skills/$skillName"
        return
    }

    try {
        $content = Get-Content -LiteralPath $skillPath -Raw -Encoding UTF8
    } catch {
        Add-Failure "cannot read SKILL.md for ${skillName}: $($_.Exception.Message)"
        return
    }

    $frontmatterMatch = [regex]::Match($content, "(?s)^---\r?\n(.*?)\r?\n---\r?\n")
    if (-not $frontmatterMatch.Success) {
        Add-Failure "missing YAML front matter in .agents/skills/$skillName/SKILL.md"
        return
    }

    $frontmatter = $frontmatterMatch.Groups[1].Value
    $declaredName = Get-ScalarField -Content $frontmatter -Field "name"
    $description = Get-ScalarField -Content $frontmatter -Field "description"

    if ($declaredName -ne $skillName) {
        Add-Failure "skill name mismatch in ${skillName}: front matter name is '$declaredName'"
    }
    if ([string]::IsNullOrWhiteSpace($description)) {
        Add-Failure "missing description in .agents/skills/$skillName/SKILL.md"
    }

    if ($IsRepositorySkill) {
        $templateResiduePatterns = @(
            '(?i)\bTODO\b',
            '\[TODO',
            'Structuring This Skill',
            'Resources \(optional\)',
            'Replace this'
        )
        foreach ($pattern in $templateResiduePatterns) {
            if ($content -match $pattern) {
                Add-Failure "template residue in .agents/skills/$skillName/SKILL.md: $pattern"
            }
        }
        Test-RepositoryLegacyResidue -SkillName $skillName -RelativePath ".agents/skills/$skillName/SKILL.md" -Content $content
        Test-RepositorySkillCommandDrift -SkillName $skillName -Content $content
    }

    $openAIPath = Join-Path $SkillDir.FullName "agents/openai.yaml"
    if ($IsRepositorySkill -and -not (Test-Path -LiteralPath $openAIPath)) {
        Add-Failure "missing agents/openai.yaml for repository skill: $skillName"
        return
    }

    if (Test-Path -LiteralPath $openAIPath) {
        try {
            $openAIContent = Get-Content -LiteralPath $openAIPath -Raw -Encoding UTF8
        } catch {
            Add-Failure "cannot read agents/openai.yaml for ${skillName}: $($_.Exception.Message)"
            return
        }

        if ($openAIContent -notmatch '(?m)^interface:\s*$') {
            Add-Failure "missing interface block in .agents/skills/$skillName/agents/openai.yaml"
        }

        $displayName = Get-ScalarField -Content $openAIContent -Field "display_name"
        $shortDescription = Get-ScalarField -Content $openAIContent -Field "short_description"
        $defaultPrompt = Get-ScalarField -Content $openAIContent -Field "default_prompt"

        if ([string]::IsNullOrWhiteSpace($displayName)) {
            Add-Failure "missing display_name in .agents/skills/$skillName/agents/openai.yaml"
        }
        if ([string]::IsNullOrWhiteSpace($shortDescription)) {
            Add-Failure "missing short_description in .agents/skills/$skillName/agents/openai.yaml"
        } elseif ($shortDescription.Length -lt 25 -or $shortDescription.Length -gt 64) {
            Add-Failure "short_description length should be 25-64 characters in .agents/skills/$skillName/agents/openai.yaml"
        }
        if ([string]::IsNullOrWhiteSpace($defaultPrompt)) {
            Add-Failure "missing default_prompt in .agents/skills/$skillName/agents/openai.yaml"
        } elseif ($defaultPrompt -notlike "*`$$skillName*") {
            Add-Failure "default_prompt must mention `$$skillName in .agents/skills/$skillName/agents/openai.yaml"
        }

        if ($IsRepositorySkill) {
            Test-RepositoryLegacyResidue -SkillName $skillName -RelativePath ".agents/skills/$skillName/agents/openai.yaml" -Content $openAIContent
        }
    }
}

if (-not (Test-Path -LiteralPath $skillsRoot)) {
    Add-Failure "missing skill root: .agents/skills"
} else {
    $skillDirs = @(Get-ChildItem -LiteralPath $skillsRoot -Directory | Sort-Object Name)
    if ($skillDirs.Count -eq 0) {
        Add-Failure "no skills found under .agents/skills"
    }

    Test-SkillGitlinks

    foreach ($requiredSkill in $repositorySkills) {
        if (-not (Test-Path -LiteralPath (Join-Path $skillsRoot $requiredSkill))) {
            Add-Failure "missing repository skill: $requiredSkill"
        }
    }

    foreach ($skillDir in $skillDirs) {
        Test-SkillMetadata -SkillDir $skillDir -IsRepositorySkill ($repositorySkills -contains $skillDir.Name)
    }
}

if ($failures.Count -gt 0) {
    Write-Host "agent skills check failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "agent skills check passed."
Write-Host "skills checked: $($skillDirs.Count)"
Write-Host "repository skills checked: $($repositorySkills.Count)"
