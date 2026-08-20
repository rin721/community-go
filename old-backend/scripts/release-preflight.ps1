param(
    [switch]$Full,
    [switch]$IncludeRuntimeSmoke,
    [switch]$IncludeDocker,
    [switch]$IncludeVisualQA,
    [switch]$IncludePackage,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

$originalLocation = (Get-Location).Path
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$results = New-Object System.Collections.Generic.List[object]

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

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    $startedAt = Get-Date
    Write-Host "==> $Name"
    try {
        & $Action
        $results.Add([pscustomobject]@{
                Name = $Name
                Status = "passed"
                Seconds = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 2)
                Error = ""
            }) | Out-Null
    } catch {
        $results.Add([pscustomobject]@{
                Name = $Name
                Status = "failed"
                Seconds = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 2)
                Error = $_.Exception.Message
            }) | Out-Null
    }
}

Set-Location $repoRoot

try {
    Invoke-Step -Name "local tooling" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-local-tooling.ps1"
        )
    }

    Invoke-Step -Name "entry brand convergence" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-entry-brand-convergence.ps1"
        )
    }

    Invoke-Step -Name "plugin removal" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-plugin-removal.ps1"
        )
    }

    Invoke-Step -Name "error/result boundaries" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-error-result-boundaries.ps1"
        )
    }

    Invoke-Step -Name "agent skills" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-agent-skills.ps1"
        )
    }

    Invoke-Step -Name "documentation README coverage" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-doc-readmes.ps1"
        )
    }

    Invoke-Step -Name "documentation links" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-doc-links.ps1"
        )
    }

    Invoke-Step -Name "open-source readiness" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-open-source-readiness.ps1"
        )
    }

    Invoke-Step -Name "deployment guardrails" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-deployment-guardrails.ps1"
        )
    }

    Invoke-Step -Name "worktree convergence" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-worktree-convergence.ps1"
        )
    }

    Invoke-Step -Name "release evidence template" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-release-evidence.ps1",
            "-TemplateMode"
        )
    }

    Invoke-Step -Name "operational observation template" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-operational-observation-template.ps1"
        )
    }

    Invoke-Step -Name "release evidence validator self-test" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-release-evidence.ps1",
            "-SelfTest"
        )
    }

    Invoke-Step -Name "CI Docker evidence checker self-test" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-ci-docker-evidence.ps1",
            "-SelfTest"
        )
    }

    Invoke-Step -Name "package SQLite boundary" -Action {
        Invoke-External -Executable "powershell" -Arguments @(
            "-ExecutionPolicy", "Bypass",
            "-File", "scripts/check-package-sqlite-boundary.ps1"
        )
    }

    $goTestPackages = if ($Full) {
        @("./...")
    } else {
        @("./internal/config", "./internal/transport/http", "./types/...")
    }
    Invoke-Step -Name "go tests" -Action {
        Invoke-External -Executable "go" -Arguments (@("test") + $goTestPackages + @("-count=1", "-mod=readonly"))
    }

    if ($Full) {
        Invoke-Step -Name "go vet" -Action {
            Invoke-External -Executable "go" -Arguments @("vet", "./...")
        }

        Invoke-Step -Name "server build" -Action {
            Invoke-External -Executable "go" -Arguments @(
                "build",
                "-mod=readonly",
                "-o",
                "./tmp/console-preflight-server.exe",
                "./cmd/console"
            )
        }
    }

    if (-not $SkipFrontend) {
        Invoke-Step -Name "web i18n lint" -Action {
            Invoke-Pnpm -Arguments @("--dir", "web/app", "lint:i18n")
        }

        if ($Full) {
            Invoke-Step -Name "web typecheck" -Action {
                Invoke-Pnpm -Arguments @("--dir", "web/app", "typecheck")
            }

            Invoke-Step -Name "web build" -Action {
                Invoke-Pnpm -Arguments @("--dir", "web/app", "build")
            }
        }
    } elseif ($IncludeVisualQA) {
        Invoke-Step -Name "visual QA" -Action {
            throw "-IncludeVisualQA cannot be used with -SkipFrontend."
        }
    }

    if ($IncludeVisualQA) {
        Invoke-Step -Name "visual QA" -Action {
            Invoke-External -Executable "powershell" -Arguments @(
                "-ExecutionPolicy", "Bypass",
                "-File", "scripts/visual-qa.ps1"
            )
        }
    } else {
        Invoke-Step -Name "visual QA script syntax" -Action {
            $null = [scriptblock]::Create((Get-Content -LiteralPath "scripts/visual-qa.ps1" -Raw))
        }
    }

    if ($IncludePackage) {
        Invoke-Step -Name "package dry run" -Action {
            Invoke-External -Executable "python" -Arguments @(
                "scripts/package.py",
                "--dry-run",
                "--target",
                "linux/amd64",
                "--version",
                "preflight"
            )
        }
    }

    if ($IncludeRuntimeSmoke) {
        Invoke-Step -Name "runtime smoke" -Action {
            Invoke-External -Executable "powershell" -Arguments @(
                "-ExecutionPolicy", "Bypass",
                "-File", "scripts/runtime-smoke.ps1"
            )
        }
    }

    if ($IncludeDocker) {
        Invoke-Step -Name "docker smoke" -Action {
            Invoke-External -Executable "powershell" -Arguments @(
                "-ExecutionPolicy", "Bypass",
                "-File", "scripts/docker-smoke.ps1"
            )
        }
    } else {
        Invoke-Step -Name "docker smoke scripts syntax" -Action {
            $null = [scriptblock]::Create((Get-Content -LiteralPath "scripts/docker-smoke.ps1" -Raw))
            $shellContent = Get-Content -LiteralPath "scripts/docker-smoke.sh" -Raw -Encoding UTF8
            if (-not $shellContent.StartsWith("#!/usr/bin/env bash")) {
                throw "scripts/docker-smoke.sh must start with a Bash shebang."
            }
            if ($shellContent.Contains("`r`n")) {
                throw "scripts/docker-smoke.sh must use LF line endings for Linux CI."
            }
            foreach ($fragment in @("/health", "/ready", "/openapi.yaml", "/admin")) {
                if (-not $shellContent.Contains($fragment)) {
                    throw "scripts/docker-smoke.sh is missing endpoint check: $fragment"
                }
            }
        }
    }

    Invoke-Step -Name "git diff whitespace" -Action {
        Invoke-External -Executable "git" -Arguments @("diff", "--check")
    }

    Write-Host ""
    $results | Format-Table -AutoSize

    $failed = @($results | Where-Object { $_.Status -ne "passed" })
    if ($failed.Count -gt 0) {
        Write-Host "release preflight failed:" -ForegroundColor Red
        foreach ($item in $failed) {
            Write-Host " - $($item.Name): $($item.Error)" -ForegroundColor Red
        }
        exit 1
    }

    Write-Host "release preflight passed."
} finally {
    Set-Location $originalLocation
}
