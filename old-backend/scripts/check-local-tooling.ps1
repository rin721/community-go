param(
    [switch]$RequireReleaseTools,
    [switch]$RequireDocker,
    [switch]$RequireBash
)

$ErrorActionPreference = "Stop"

$rows = New-Object System.Collections.Generic.List[object]
$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure {
    param([string]$Message)
    $failures.Add($Message) | Out-Null
}

function Resolve-FirstCommand {
    param([string[]]$Names)

    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command) {
            return $command
        }
    }

    return $null
}

function Get-ToolVersion {
    param(
        [string]$Command,
        [string[]]$Arguments
    )

    try {
        $output = & $Command @Arguments 2>$null
        if ($LASTEXITCODE -ne 0) {
            return ""
        }
        return (($output | Select-Object -First 1) -join "").Trim()
    } catch {
        return ""
    }
}

function Add-ToolCheck {
    param(
        [string]$Name,
        [string[]]$Commands,
        [string]$Scope,
        [bool]$Required,
        [string[]]$VersionArguments = @("--version"),
        [string]$Note = ""
    )

    $command = Resolve-FirstCommand -Names $Commands
    if ($command) {
        $version = Get-ToolVersion -Command $command.Name -Arguments $VersionArguments
        $rows.Add([pscustomobject]@{
                Tool = $Name
                Scope = $Scope
                Status = "available"
                Command = $command.Name
                Version = $version
                Note = $Note
            }) | Out-Null
        return $true
    }

    $status = if ($Required) { "missing" } else { "missing optional" }
    $rows.Add([pscustomobject]@{
            Tool = $Name
            Scope = $Scope
            Status = $status
            Command = ($Commands -join " | ")
            Version = ""
            Note = $Note
        }) | Out-Null
    if ($Required) {
        Add-Failure "$Name is required for $Scope but was not found on PATH."
    }
    return $false
}

Add-ToolCheck -Name "git" -Commands @("git") -Scope "repository checks" -Required $true | Out-Null
Add-ToolCheck -Name "go" -Commands @("go") -Scope "backend build and tests" -Required $true -VersionArguments @("version") | Out-Null
Add-ToolCheck -Name "node" -Commands @("node") -Scope "React WebUI toolchain" -Required $true | Out-Null

$pnpm = Resolve-FirstCommand -Names @("pnpm")
if ($pnpm) {
    $rows.Add([pscustomobject]@{
            Tool = "pnpm"
            Scope = "React WebUI commands"
            Status = "available"
            Command = $pnpm.Name
            Version = Get-ToolVersion -Command $pnpm.Name -Arguments @("--version")
            Note = ""
        }) | Out-Null
} else {
    $corepack = Resolve-FirstCommand -Names @("corepack.cmd", "corepack")
    if ($corepack) {
        $rows.Add([pscustomobject]@{
                Tool = "pnpm"
                Scope = "React WebUI commands"
                Status = "available via corepack"
                Command = $corepack.Name
                Version = Get-ToolVersion -Command $corepack.Name -Arguments @("--version")
                Note = "release scripts use corepack pnpm fallback"
            }) | Out-Null
    } else {
        $rows.Add([pscustomobject]@{
                Tool = "pnpm"
                Scope = "React WebUI commands"
                Status = "missing"
                Command = "pnpm | corepack"
                Version = ""
                Note = "install pnpm or enable corepack"
            }) | Out-Null
        Add-Failure "pnpm or corepack is required for React WebUI commands but was not found on PATH."
    }
}

Add-ToolCheck -Name "python" -Commands @("python", "py") -Scope "release package scripts" -Required ([bool]$RequireReleaseTools) | Out-Null
Add-ToolCheck -Name "gh" -Commands @("gh") -Scope "CI Docker artifact evidence" -Required ([bool]$RequireReleaseTools) | Out-Null
Add-ToolCheck -Name "docker" -Commands @("docker") -Scope "Docker image and container smoke" -Required ([bool]$RequireDocker) | Out-Null
Add-ToolCheck -Name "bash" -Commands @("bash") -Scope "Linux/macOS/CI docker smoke script" -Required ([bool]$RequireBash) | Out-Null

$rows | Format-Table -AutoSize

if ($failures.Count -gt 0) {
    Write-Host "local tooling check failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host " - $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "local tooling check passed."
Write-Host "missing optional tools should be recorded as external evidence gaps when relevant."
