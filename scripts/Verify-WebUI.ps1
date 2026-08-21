[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repositoryRoot
try {
    go run ./cmd/app webui generate --check
    if ($LASTEXITCODE -ne 0) { throw 'WebUI registry check failed' }

    $webuiRoot = (& node webui/scripts/project-layout.mjs --field webuiRoot).Trim()
    if ([string]::IsNullOrWhiteSpace($webuiRoot)) { throw 'layout did not provide webui root' }
    Push-Location $webuiRoot
    $previousCI = $env:CI
    try {
        # 固定非交互语义，避免本地终端与 CI 对 node_modules 清理行为分叉。
        $env:CI = 'true'
        $pnpmVersion = (& corepack pnpm --version).Trim()
        if ($pnpmVersion -ne '10.22.0') { throw "pnpm 10.22.0 is required, found $pnpmVersion" }
        & corepack pnpm install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) { throw 'pnpm install --frozen-lockfile failed' }
        & corepack pnpm lint
        if ($LASTEXITCODE -ne 0) { throw 'pnpm lint failed' }
        & corepack pnpm lint:modules
        if ($LASTEXITCODE -ne 0) { throw 'pnpm lint:modules failed' }
        & corepack pnpm typecheck
        if ($LASTEXITCODE -ne 0) { throw 'pnpm typecheck failed' }
        & corepack pnpm test
        if ($LASTEXITCODE -ne 0) { throw 'pnpm test failed' }
        & corepack pnpm build
        if ($LASTEXITCODE -ne 0) { throw 'pnpm build failed' }
    } finally {
        $env:CI = $previousCI
        Pop-Location
    }
} finally {
    Pop-Location
}
