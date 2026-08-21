[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repositoryRoot
try {
    go run ./cmd/app webui generate --check
    if ($LASTEXITCODE -ne 0) { throw 'WebUI registry check failed' }

    Push-Location (Join-Path $repositoryRoot 'webui')
    try {
        pnpm install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) { throw 'pnpm install --frozen-lockfile failed' }
        pnpm lint
        if ($LASTEXITCODE -ne 0) { throw 'pnpm lint failed' }
        pnpm lint:modules
        if ($LASTEXITCODE -ne 0) { throw 'pnpm lint:modules failed' }
        pnpm typecheck
        if ($LASTEXITCODE -ne 0) { throw 'pnpm typecheck failed' }
        pnpm test
        if ($LASTEXITCODE -ne 0) { throw 'pnpm test failed' }
        pnpm build
        if ($LASTEXITCODE -ne 0) { throw 'pnpm build failed' }
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}
