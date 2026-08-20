param(
    [string]$Repo = "",
    [string]$RunId = "",
    [string]$CommitSha = "",
    [string]$WorkflowName = "CI",
    [string]$ArtifactName = "docker-smoke-evidence",
    [string]$LogPath = "",
    [string]$DownloadDir = "tmp/ai/ci-docker-evidence",
    [switch]$SkipDownload,
    [switch]$SelfTest
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure {
    param([string]$Message)
    $failures.Add($Message) | Out-Null
}

function Invoke-Checked {
    param(
        [string]$Executable,
        [string[]]$Arguments
    )

    $output = & $Executable @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "$Executable $($Arguments -join ' ') failed: $($output -join [Environment]::NewLine)"
    }
    return ($output -join [Environment]::NewLine)
}

function Get-DefaultRepo {
    $remote = Invoke-Checked -Executable "git" -Arguments @("config", "--get", "remote.origin.url")
    $trimmed = $remote.Trim()

    if ($trimmed -match "github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)(\.git)?$") {
        return "$($Matches.owner)/$($Matches.repo)"
    }

    throw "cannot infer GitHub repository from remote.origin.url: $trimmed"
}

function Test-DockerSmokeLogContent {
    param([string]$Content)

    foreach ($fragment in @(
            "Checking Docker smoke endpoints",
            "health",
            "ready",
            "openapi",
            "admin",
            "Docker smoke passed for image"
        )) {
        if (-not $Content.Contains($fragment)) {
            Add-Failure "docker smoke log is missing fragment: $fragment"
        }
    }
}

function Test-RunMetadata {
    param(
        [object]$Run,
        [string]$ExpectedCommitSha,
        [string]$ExpectedWorkflowName
    )

    if ($Run.status -ne "completed") {
        Add-Failure "workflow run is not completed: $($Run.status)"
    }
    if ($Run.conclusion -ne "success") {
        Add-Failure "workflow run conclusion is not success: $($Run.conclusion)"
    }
    if (-not [string]::IsNullOrWhiteSpace($ExpectedCommitSha)) {
        $expected = $ExpectedCommitSha.Trim()
        if (-not $Run.headSha -or -not $Run.headSha.StartsWith($expected, [StringComparison]::OrdinalIgnoreCase)) {
            Add-Failure "workflow run headSha does not match expected commit: expected $expected, got $($Run.headSha)"
        }
    }
    if (-not [string]::IsNullOrWhiteSpace($ExpectedWorkflowName) -and $Run.workflowName -ne $ExpectedWorkflowName) {
        Add-Failure "workflow name does not match: expected $ExpectedWorkflowName, got $($Run.workflowName)"
    }
}

function Test-ArtifactMetadata {
    param(
        [object[]]$Artifacts,
        [string]$ExpectedArtifactName
    )

    $artifact = @($Artifacts | Where-Object { $_.name -eq $ExpectedArtifactName } | Select-Object -First 1)
    if ($artifact.Count -eq 0) {
        Add-Failure "workflow run is missing artifact: $ExpectedArtifactName"
        return $null
    }

    $selected = $artifact[0]
    if ($selected.expired -eq $true) {
        Add-Failure "workflow artifact is expired: $ExpectedArtifactName"
    }
    if ($selected.size_in_bytes -le 0) {
        Add-Failure "workflow artifact is empty: $ExpectedArtifactName"
    }
    return $selected
}

if ($SelfTest) {
    $failures.Clear()
    Test-DockerSmokeLogContent (@(
        "Starting Docker smoke container console-platform-ci-smoke on http://127.0.0.1:19998 ...",
        "Checking Docker smoke endpoints ...",
        "health       http://127.0.0.1:19998/health",
        "ready        http://127.0.0.1:19998/ready",
        "openapi      http://127.0.0.1:19998/openapi.yaml",
        "admin        http://127.0.0.1:19998/admin",
        "Docker smoke passed for image console-platform:ci."
    ) -join [Environment]::NewLine)
    if ($failures.Count -ne 0) {
        throw "ci docker evidence self-test failed; valid smoke log was rejected"
    }

    $failures.Clear()
    Test-DockerSmokeLogContent "Docker smoke passed for image console-platform:ci."
    if ($failures.Count -eq 0) {
        throw "ci docker evidence self-test failed; incomplete smoke log was accepted"
    }

    $failures.Clear()
    Test-RunMetadata ([pscustomobject]@{
            status = "completed"
            conclusion = "success"
            headSha = "abcdef123456"
            workflowName = "CI"
        }) "abcdef" "CI"
    $null = Test-ArtifactMetadata @([pscustomobject]@{
                name = "docker-smoke-evidence"
                expired = $false
                size_in_bytes = 1024
            }) "docker-smoke-evidence"
    if ($failures.Count -ne 0) {
        throw "ci docker evidence self-test failed; valid run metadata was rejected"
    }

    $failures.Clear()
    Test-RunMetadata ([pscustomobject]@{
            status = "completed"
            conclusion = "failure"
            headSha = "abcdef123456"
            workflowName = "CI"
        }) "abcdef" "CI"
    if ($failures.Count -eq 0) {
        throw "ci docker evidence self-test failed; failed run metadata was accepted"
    }

    Write-Host "ci docker evidence self-test passed."
    exit 0
}

Push-Location $repoRoot
try {
    if ([string]::IsNullOrWhiteSpace($CommitSha)) {
        $CommitSha = (Invoke-Checked -Executable "git" -Arguments @("rev-parse", "HEAD")).Trim()
    }

    if (-not [string]::IsNullOrWhiteSpace($LogPath)) {
        $fullLogPath = if ([System.IO.Path]::IsPathRooted($LogPath)) {
            $LogPath
        } else {
            Join-Path $repoRoot $LogPath
        }
        if (-not (Test-Path -LiteralPath $fullLogPath)) {
            throw "docker smoke log does not exist: $LogPath"
        }
        Test-DockerSmokeLogContent (Get-Content -Raw -Encoding UTF8 -LiteralPath $fullLogPath)
    }

    if (-not [string]::IsNullOrWhiteSpace($RunId)) {
        if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
            throw "GitHub CLI is not available. Install gh or pass -LogPath with a downloaded docker-smoke-ci.log."
        }

        if ([string]::IsNullOrWhiteSpace($Repo)) {
            $Repo = Get-DefaultRepo
        }

        $runJson = Invoke-Checked -Executable "gh" -Arguments @(
            "run", "view", $RunId,
            "--repo", $Repo,
            "--json", "databaseId,status,conclusion,headSha,url,workflowName"
        )
        $run = $runJson | ConvertFrom-Json
        Test-RunMetadata -Run $run -ExpectedCommitSha $CommitSha -ExpectedWorkflowName $WorkflowName

        $artifactJson = Invoke-Checked -Executable "gh" -Arguments @(
            "api",
            "repos/$Repo/actions/runs/$RunId/artifacts"
        )
        $artifactResponse = $artifactJson | ConvertFrom-Json
        $artifact = Test-ArtifactMetadata -Artifacts @($artifactResponse.artifacts) -ExpectedArtifactName $ArtifactName

        if (-not $SkipDownload -and $null -ne $artifact) {
            $resolvedDownloadRoot = if ([System.IO.Path]::IsPathRooted($DownloadDir)) {
                $DownloadDir
            } else {
                Join-Path $repoRoot $DownloadDir
            }
            $targetDir = Join-Path $resolvedDownloadRoot ("run-{0}-{1}" -f $RunId, (Get-Date -Format "yyyyMMddHHmmss"))
            New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

            Invoke-Checked -Executable "gh" -Arguments @(
                "run", "download", $RunId,
                "--repo", $Repo,
                "--name", $ArtifactName,
                "--dir", $targetDir
            ) | Out-Null

            $downloadedLog = Get-ChildItem -LiteralPath $targetDir -Recurse -File -Filter "docker-smoke-ci.log" |
                Select-Object -First 1
            if ($null -eq $downloadedLog) {
                Add-Failure "downloaded artifact does not contain docker-smoke-ci.log"
            } else {
                Test-DockerSmokeLogContent (Get-Content -Raw -Encoding UTF8 -LiteralPath $downloadedLog.FullName)
                Write-Host "downloaded docker smoke evidence: $($downloadedLog.FullName)"
            }
        }

        Write-Host "workflow run: $($run.url)"
    }

    if ([string]::IsNullOrWhiteSpace($RunId) -and [string]::IsNullOrWhiteSpace($LogPath)) {
        throw "pass -RunId to check a GitHub Actions run or -LogPath to check a downloaded docker-smoke-ci.log."
    }

    if ($failures.Count -gt 0) {
        Write-Host "ci docker evidence check failed:" -ForegroundColor Red
        foreach ($failure in $failures) {
            Write-Host " - $failure" -ForegroundColor Red
        }
        exit 1
    }

    Write-Host "ci docker evidence check passed."
} finally {
    Pop-Location
}
