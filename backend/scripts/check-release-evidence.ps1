param(
    [string]$Path = "docs/release/release-evidence-template.md",
    [switch]$TemplateMode,
    [switch]$SelfTest
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$targetPath = if ([System.IO.Path]::IsPathRooted($Path)) {
    $Path
} else {
    Join-Path $repoRoot $Path
}
$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure {
    param([string]$Message)
    $failures.Add($Message) | Out-Null
}

function Test-Contains {
    param(
        [string]$Content,
        [string]$Needle,
        [string]$Label
    )

    if (-not $Content.Contains($Needle)) {
        Add-Failure "missing ${Label}: $Needle"
    }
}

function Get-TextFromCodepoints {
    param([int[]]$Codepoints)

    return -join ($Codepoints | ForEach-Object { [string][char]$_ })
}

function Get-BlockedPlaceholderTerms {
    return @(
        "TBD",
        "TODO",
        "not run",
        "not verified",
        "not tested",
        "skipped",
        (Get-TextFromCodepoints @(0x672A, 0x6267, 0x884C)),
        (Get-TextFromCodepoints @(0x672A, 0x9A8C, 0x8BC1)),
        (Get-TextFromCodepoints @(0x672A, 0x68C0, 0x67E5)),
        (Get-TextFromCodepoints @(0x65E0, 0x6CD5, 0x6267, 0x884C)),
        (Get-TextFromCodepoints @(0x5F85, 0x8865, 0x5145)),
        (Get-TextFromCodepoints @(0x5F85, 0x786E, 0x8BA4)),
        (Get-TextFromCodepoints @(0x5360, 0x4F4D))
    )
}

function Test-BlockedPlaceholderTerms {
    param([string]$Content)

    foreach ($term in Get-BlockedPlaceholderTerms) {
        if ($Content -match "(?im)$([regex]::Escape($term))") {
            Add-Failure "unfilled production evidence placeholder: $term"
        }
    }
}

function Split-MarkdownTableRow {
    param([string]$Line)

    $trimmed = $Line.Trim()
    if (-not $trimmed.StartsWith("|")) {
        return $null
    }
    if (-not $trimmed.EndsWith("|")) {
        return $null
    }

    return @($trimmed.Trim("|").Split("|") | ForEach-Object { $_.Trim() })
}

function Test-MarkdownTableSeparator {
    param([string[]]$Cells)

    if ($null -eq $Cells -or $Cells.Count -eq 0) {
        return $false
    }
    foreach ($cell in $Cells) {
        if ($cell -notmatch "^:?-{3,}:?$") {
            return $false
        }
    }
    return $true
}

function Test-UnfilledEvidenceTableCells {
    param([string]$Content)

    $requiredHeaders = @(
        (Get-TextFromCodepoints @(0x7ED3, 0x679C)),
        (Get-TextFromCodepoints @(0x8BC1, 0x636E)),
        (Get-TextFromCodepoints @(0x76EE, 0x6807, 0x73AF, 0x5883, 0x503C))
    )
    $lines = $Content -split "\r?\n"
    $headers = $null

    for ($index = 0; $index -lt $lines.Count; $index++) {
        $cells = Split-MarkdownTableRow $lines[$index]
        if ($null -eq $cells) {
            $headers = $null
            continue
        }
        if (Test-MarkdownTableSeparator $cells) {
            continue
        }

        $nextCells = $null
        if ($index + 1 -lt $lines.Count) {
            $nextCells = Split-MarkdownTableRow $lines[$index + 1]
        }
        if ($null -ne $nextCells -and (Test-MarkdownTableSeparator $nextCells)) {
            $headers = $cells
            continue
        }

        if ($null -eq $headers) {
            continue
        }

        $max = [Math]::Min($headers.Count, $cells.Count)
        for ($column = 0; $column -lt $max; $column++) {
            if ($requiredHeaders -contains $headers[$column] -and [string]::IsNullOrWhiteSpace($cells[$column])) {
                Add-Failure "unfilled production evidence table cell: line $($index + 1), column $($headers[$column])"
            }
        }
    }
}

if ($SelfTest) {
    foreach ($term in Get-BlockedPlaceholderTerms) {
        $failures.Clear()
        Test-BlockedPlaceholderTerms "release evidence result: $term"
        if ($failures.Count -eq 0) {
            throw "release evidence self-test failed; blocker was not detected: $term"
        }
    }

    $failures.Clear()
    Test-BlockedPlaceholderTerms "release evidence result: passed with link to target logs"
    if ($failures.Count -ne 0) {
        throw "release evidence self-test failed; valid content was rejected"
    }

    $resultHeader = Get-TextFromCodepoints @(0x7ED3, 0x679C)
    $evidenceHeader = Get-TextFromCodepoints @(0x8BC1, 0x636E)
    $targetValueHeader = Get-TextFromCodepoints @(0x76EE, 0x6807, 0x73AF, 0x5883, 0x503C)

    $failures.Clear()
    Test-UnfilledEvidenceTableCells (@(
        "| compensation path | expected evidence | $resultHeader | note |",
        "| --- | --- | --- | --- |",
        "| IAM policy reload scheduler | target log evidence |  |  |"
    ) -join [Environment]::NewLine)
    if ($failures.Count -eq 0) {
        throw "release evidence self-test failed; empty compensation result was not detected"
    }

    $failures.Clear()
    Test-UnfilledEvidenceTableCells (@(
        "| config item | $targetValueHeader | $evidenceHeader |",
        "| --- | --- | --- |",
        "| auth.notification_retry_interval_seconds | 60 | deployment config snapshot |"
    ) -join [Environment]::NewLine)
    if ($failures.Count -ne 0) {
        throw "release evidence self-test failed; filled evidence table was rejected"
    }

    Write-Host "release evidence self-test passed."
    exit 0
}

if (-not (Test-Path -LiteralPath $targetPath)) {
    throw "release evidence file does not exist: $Path"
}

$content = Get-Content -Raw -Encoding UTF8 -LiteralPath $targetPath

$requiredMarkers = @(
    "<!-- release-evidence:v1 -->",
    "<!-- release-section:basic-info -->",
    "<!-- release-section:change-scope -->",
    "<!-- release-section:migration-evidence -->",
    "<!-- release-section:backup-evidence -->",
    "<!-- release-section:config-secrets -->",
    "<!-- release-section:verification-commands -->",
    "<!-- release-section:smoke-tests -->",
    "<!-- release-section:observability -->",
    "<!-- release-section:compensation-observation -->",
    "<!-- release-section:rollback-plan -->",
    "<!-- release-section:post-release-observation -->"
)
foreach ($marker in $requiredMarkers) {
    Test-Contains -Content $content -Needle $marker -Label "marker"
}

$requiredCommandFragments = @(
    "powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1",
    "powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1",
    "powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1",
    "powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1",
    "powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1",
    "powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1",
    "powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1",
    "powershell -ExecutionPolicy Bypass -File scripts/check-deployment-guardrails.ps1",
    "powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1",
    "powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1",
    "go test ./internal/config ./internal/transport/http -count=1 -mod=readonly",
    "go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console",
    "pnpm --dir web/app typecheck",
    "pnpm --dir web/app lint:i18n",
    "pnpm --dir web/app build",
    "powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1",
    "powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1",
    "powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1",
    "bash scripts/docker-smoke.sh",
    "iam policy reload retry completed",
    "iam notification outbox dispatch completed",
    "system maintenance cleanup completed",
    "git diff --check",
    "db migrate status",
    "db migrate up"
)
foreach ($fragment in $requiredCommandFragments) {
    Test-Contains -Content $content -Needle $fragment -Label "command"
}

$requiredSmokePaths = @("/health", "/ready", "/openapi.yaml", "/", "/setup", "/admin")
foreach ($path in $requiredSmokePaths) {
    Test-Contains -Content $content -Needle "| ``$path`` |" -Label "smoke path"
}

$requiredSecretNames = @(
    "APP_AUTH_SIGNING_KEY",
    "APP_AUTH_REFRESH_TOKEN_PEPPER",
    "APP_AUTH_MFA_SECRET_KEY"
)
foreach ($secretName in $requiredSecretNames) {
    Test-Contains -Content $content -Needle $secretName -Label "secret name"
}

$requiredEvidenceMarkers = @(
    "<!-- release-field:docker-image-digest -->",
    "<!-- release-field:container-resource-limits -->",
    "<!-- release-field:graceful-shutdown -->",
    "<!-- release-field:deployment-tag -->"
)
foreach ($marker in $requiredEvidenceMarkers) {
    Test-Contains -Content $content -Needle $marker -Label "evidence marker"
}

$secretLeakPatterns = @(
    '(?im)APP_AUTH_SIGNING_KEY\s*[:=]\s*(?!<|masked|redacted|not-recorded|not-set)\S{12,}',
    '(?im)APP_AUTH_REFRESH_TOKEN_PEPPER\s*[:=]\s*(?!<|masked|redacted|not-recorded|not-set)\S{12,}',
    '(?im)APP_AUTH_MFA_SECRET_KEY\s*[:=]\s*(?!<|masked|redacted|not-recorded|not-set)\S{12,}',
    '(?im)(password|token|secret)\s*[:=]\s*(?!<|masked|redacted|not-recorded|not-set)\S{12,}'
)
foreach ($pattern in $secretLeakPatterns) {
    if ($content -match $pattern) {
        Add-Failure "possible secret value in release evidence: $pattern"
    }
}

if (-not $TemplateMode) {
    $fullWidthColon = [string][char]0xFF1A
    $placeholderPatterns = @(
        "(?im)^\s*-\s*.+$fullWidthColon\s*$",
        '(?im)^\|\s*`[^`]+`\s*\|\s*\|\s*\|',
        '(?im)^\|\s*`?/[^|`]+`?\s*\|\s*\|\s*\|'
    )
    foreach ($pattern in $placeholderPatterns) {
        if ($content -match $pattern) {
            Add-Failure "unfilled production evidence placeholder: $pattern"
        }
    }
    Test-BlockedPlaceholderTerms $content
    Test-UnfilledEvidenceTableCells $content
}

if ($failures.Count -gt 0) {
    Write-Host "release evidence check failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

if ($TemplateMode) {
    Write-Host "release evidence template check passed."
} else {
    Write-Host "release evidence check passed."
}
