param(
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $Root
try {
    Write-Host "Checking removed plugin runtime paths..."
    foreach ($path in @("internal/plugin", "pkg/plugin", "pkg/pluginapi", "_examples/remote-plugins", "docs/api/plugin-protocol")) {
        if (Test-Path $path) {
            throw "removed plugin path still exists: $path"
        }
    }

    Write-Host "Checking plugin runtime references do not reappear..."
    $pluginRuntimeRefs = rg -n "internal/plugin|pkg/plugin|pkg/pluginapi|_examples/remote-plugins|/api/v1/plugins|plugin\.(register|heartbeat|unregister|invoke|listCapabilities)" cmd internal pkg types web/app/app configs deploy scripts --glob "!**/*_test.go" --glob "!**/*.md" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $pluginRuntimeRefs
        throw "plugin runtime references still exist"
    }

    Write-Host "Checking business modules do not import reusable infrastructure packages directly..."
    $moduleInfraImports = rg -n 'github\.com/open-console/console-platform/pkg/' internal/modules --glob "*.go" --glob "!**/*_test.go" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $moduleInfraImports
        throw "business modules must depend on local contracts or app-injected capabilities instead of pkg implementations"
    }

    Write-Host "Checking config loader does not scan implicit directories..."
    $implicitConfigScanning = rg -n "WalkDir|filepath\.Walk|ReadDir|Glob" internal/config pkg/configloader --glob "*.go" --glob "!**/*_test.go" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $implicitConfigScanning
        throw "config loader must use explicit config sources instead of directory scanning"
    }

    Write-Host "Checking Go package graph..."
    go list ./... | Out-Null

    if (-not $SkipTests) {
        Write-Host "Running import boundary tests..."
        go test ./internal -count=1 -mod=readonly
    }

    Write-Host "Architecture checks passed."
}
finally {
    Pop-Location
}
