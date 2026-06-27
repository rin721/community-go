param(
    [int]$Port = 19998,
    [string]$BackendDir = "backend",
    [string]$Config = "configs/config.example.yaml",
    [string]$WorkDir = "tmp/ai/frontend-community-api-smoke",
    [string]$Binary = "tmp/ai/frontend-community-api-smoke/console-server.exe",
    [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"

function Resolve-RepoPath {
    param([string]$Path)

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return $Path
    }
    return (Join-Path $repoRoot $Path)
}

function Get-ResponseText {
    param($Response)

    if ($Response.Content -is [byte[]]) {
        return [System.Text.Encoding]::UTF8.GetString($Response.Content)
    }
    return [string]$Response.Content
}

function ConvertFrom-JsonResponse {
    param($Response)

    return Get-ResponseText $Response | ConvertFrom-Json
}

function Wait-ForJsonEnvelope {
    param(
        [string]$Url,
        [scriptblock]$Validate,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $lastError = $null
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
            $json = ConvertFrom-JsonResponse $response
            if ($response.StatusCode -eq 200 -and $json.code -eq 0 -and (& $Validate $json)) {
                return $json
            }
            $lastError = "Unexpected response from $Url"
        } catch {
            $lastError = $_.Exception.Message
        }
        Start-Sleep -Milliseconds 500
    }
    throw "Endpoint check timed out: $Url; last error: $lastError"
}

function Invoke-JsonEnvelope {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null,
        [object]$WebSession = $null,
        [hashtable]$Headers = @{}
    )

    $options = @{
        Method = $Method
        TimeoutSec = 10
        Uri = $Url
        UseBasicParsing = $true
    }
    if ($null -ne $Body) {
        $options["Body"] = ($Body | ConvertTo-Json -Depth 8)
        $options["ContentType"] = "application/json"
    }
    if ($null -ne $WebSession) {
        $options["WebSession"] = $WebSession
    }
    if ($Headers.Count -gt 0) {
        $options["Headers"] = $Headers
    }

    $response = Invoke-WebRequest @options
    $json = ConvertFrom-JsonResponse $response
    if ($response.StatusCode -ne 200 -or $json.code -ne 0) {
        throw "Unexpected API result from $Url"
    }
    return $json
}

function Get-SessionCookieValue {
    param(
        [object]$WebSession,
        [string]$Url,
        [string]$Name
    )

    $uri = [Uri]$Url
    $cookie = $WebSession.Cookies.GetCookies($uri) | Where-Object { $_.Name -eq $Name } | Select-Object -First 1
    if ($null -eq $cookie -or [string]::IsNullOrWhiteSpace($cookie.Value)) {
        throw "Expected session cookie '$Name' after community account signup"
    }
    return $cookie.Value
}

function Assert-NoControlConsoleIdentity {
    param(
        [object]$Payload,
        [string]$Name
    )

    $json = $Payload | ConvertTo-Json -Depth 12
    foreach ($term in @("orgId", "roles", "permissions")) {
        if ($json -match ('"' + [regex]::Escape($term) + '"')) {
            throw "$Name exposed control-console identity field '$term'"
        }
    }
}

function Set-ProcessEnv {
    param(
        [System.Diagnostics.ProcessStartInfo]$StartInfo,
        [string]$Name,
        [string]$Value
    )

    $environment = $StartInfo.Environment
    if ($null -eq $environment) {
        $environment = $StartInfo.EnvironmentVariables
    }

    if ($environment.ContainsKey($Name)) {
        $environment[$Name] = $Value
        return
    }
    $environment.Add($Name, $Value)
}

function Format-ProcessArgument {
    param([string]$Value)

    if ($Value -notmatch '[\s"]') {
        return $Value
    }
    return '"' + ($Value -replace '"', '\"') + '"'
}

function Start-BackendProcess {
    param(
        [string]$FilePath,
        [string]$WorkingDirectory,
        [string[]]$Arguments,
        [hashtable]$Environment
    )

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $FilePath
    $startInfo.Arguments = ($Arguments | ForEach-Object { Format-ProcessArgument $_ }) -join " "
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.RedirectStandardOutput = $false
    $startInfo.RedirectStandardError = $false
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true

    foreach ($key in $Environment.Keys) {
        Set-ProcessEnv -StartInfo $startInfo -Name $key -Value $Environment[$key]
    }

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo

    if (-not $process.Start()) {
        throw "Failed to start backend process"
    }

    return [pscustomobject]@{
        Process = $process
    }
}

$repoRoot = (Resolve-Path -LiteralPath ".").Path
$backendPath = Resolve-RepoPath $BackendDir
$workPath = Resolve-RepoPath $WorkDir
$binaryPath = Resolve-RepoPath $Binary
$configPath = Join-Path $backendPath $Config

New-Item -ItemType Directory -Force -Path $workPath | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $binaryPath) | Out-Null

Write-Host "Building backend community smoke server..."
Push-Location $backendPath
try {
    & go build -mod=readonly -o $binaryPath ./cmd/console
    if ($LASTEXITCODE -ne 0) {
        throw "go build failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

$process = $null
try {
    $envOverrides = @{
        "APP_SERVER_PORT" = [string]$Port
        "APP_DB_DRIVER" = "sqlite"
        "APP_DB_SQLITE_PATH" = (Join-Path $workPath "app.db")
        "APP_STORAGE_DRIVER" = "local"
        "APP_STORAGE_LOCAL_BASE_PATH" = (Join-Path $workPath "uploads")
        "APP_LOG_FILE_PATH" = (Join-Path $workPath "app.log")
        "APP_AUTH_SIGNING_KEY" = "frontend-community-smoke-signing-key-32"
        "APP_AUTH_REFRESH_TOKEN_PEPPER" = "frontend-community-smoke-refresh-pepper-32"
        "APP_AUTH_MFA_SECRET_KEY" = "frontend-community-smoke-mfa-secret-key-32"
        "AUTH_SIGNING_KEY" = "frontend-community-smoke-signing-key-32"
        "AUTH_REFRESH_TOKEN_PEPPER" = "frontend-community-smoke-refresh-pepper-32"
        "AUTH_MFA_SECRET_KEY" = "frontend-community-smoke-mfa-secret-key-32"
    }

    Write-Host "Starting backend community smoke server on http://127.0.0.1:$Port ..."
    $server = Start-BackendProcess `
        -FilePath $binaryPath `
        -WorkingDirectory $backendPath `
        -Arguments @("server", "--config=$configPath") `
        -Environment $envOverrides
    $process = $server.Process

    $baseUrl = "http://127.0.0.1:$Port/api/v1/public/community"
    $status = Wait-ForJsonEnvelope -Url "$baseUrl/status" -TimeoutSeconds $TimeoutSeconds -Validate {
        param($json)
        $json.data.mode -eq "go" -and $json.data.basePath -eq "/api/v1/public/community" -and ($json.data.endpoints -contains "/home")
    }
    $homePayload = Wait-ForJsonEnvelope -Url "$baseUrl/home" -TimeoutSeconds $TimeoutSeconds -Validate {
        param($json)
        $json.data.categories.Count -gt 0 -and $json.data.latest.items.Count -gt 0 -and $json.data.dynamics.items.Count -gt 0
    }
    $categories = Invoke-JsonEnvelope -Url "$baseUrl/categories"
    if ($categories.data.Count -lt 1) {
        throw "Community categories endpoint returned no categories"
    }

    $videos = Invoke-JsonEnvelope -Url "$baseUrl/videos?category=home&limit=8"
    if ($videos.data.items.Count -lt 1) {
        throw "Community videos endpoint returned no videos"
    }

    $firstVideo = $homePayload.data.latest.items[0]
    $clientId = "community-smoke-client"
    $interaction = Invoke-JsonEnvelope -Url "$baseUrl/videos/$($firstVideo.slug)/interactions/like" -Method "POST" -Body @{
        clientId = $clientId
    }
    if ($interaction.data.liked -ne $true -or $interaction.data.clientId -ne $clientId) {
        throw "Community interaction endpoint did not persist like state"
    }

    $notifications = Invoke-JsonEnvelope -Url "$baseUrl/notifications?clientId=$clientId&limit=8"
    if ($notifications.data.clientId -ne $clientId -or $notifications.data.items.items.Count -lt 1) {
        throw "Community notifications endpoint did not return the interaction notification"
    }

    $search = Invoke-JsonEnvelope -Url "$baseUrl/search?q=Aoi&limit=8"
    if ($search.data.videos.items.Count -lt 1) {
        throw "Community search endpoint returned no matching videos"
    }

    $accountSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $runId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $accountEmail = "community-smoke-$runId@example.com"
    $accountName = "community_smoke_$runId"
    $signup = Invoke-JsonEnvelope -Url "$baseUrl/auth/signup" -Method "POST" -WebSession $accountSession -Body @{
        displayName = "Community Smoke"
        email = $accountEmail
        password = "Password123!"
        username = $accountName
    }
    Assert-NoControlConsoleIdentity -Payload $signup.data -Name "community signup"
    if ($signup.data.status -ne "authenticated" -or -not $signup.data.session.sessionId -or -not $signup.data.session.account.handle) {
        throw "Community signup endpoint did not return an authenticated community session"
    }

    $session = Invoke-JsonEnvelope -Url "$baseUrl/auth/session" -WebSession $accountSession
    Assert-NoControlConsoleIdentity -Payload $session.data -Name "community session"
    if ($session.data.account.displayName -ne "Community Smoke") {
        throw "Community session endpoint did not keep the compact community account identity"
    }

    $csrfToken = Get-SessionCookieValue -WebSession $accountSession -Url $baseUrl -Name "console_csrf"
    $accountHeaders = @{
        "X-CSRF-Token" = $csrfToken
    }
    $accountFollow = Invoke-JsonEnvelope -Url "$baseUrl/account/users/rin721/follow" -Method "POST" -WebSession $accountSession -Headers $accountHeaders
    if ($accountFollow.data.following -ne $true -or $accountFollow.data.clientId -notmatch "^account:") {
        throw "Community account follow endpoint did not persist account-scoped follow state"
    }

    $accountDynamic = Invoke-JsonEnvelope -Url "$baseUrl/account/dynamics" -Method "POST" -WebSession $accountSession -Headers $accountHeaders -Body @{
        body = "Account smoke dynamic from API verification"
        videoId = $firstVideo.id
    }
    if ($accountDynamic.data.authorName -ne $session.data.account.displayName) {
        throw "Community account dynamic endpoint did not use the signed-in community account; expected author=$($session.data.account.displayName), got author=$($accountDynamic.data.authorName)"
    }

    $accountHistory = Invoke-JsonEnvelope -Url "$baseUrl/account/videos/$($firstVideo.slug)/history" -Method "POST" -WebSession $accountSession -Headers $accountHeaders -Body @{
        progressSeconds = 42
    }
    if ($accountHistory.data.video.id -ne $firstVideo.id -or $accountHistory.data.progressSeconds -ne 42) {
        throw "Community account history endpoint did not persist the playback progress"
    }

    $accountHistoryList = Invoke-JsonEnvelope -Url "$baseUrl/account/history?limit=8" -WebSession $accountSession
    if ($accountHistoryList.data.authenticated -ne $true -or $accountHistoryList.data.clientId -notmatch "^account:" -or $accountHistoryList.data.items.items.Count -lt 1) {
        throw "Community account history list did not return account-scoped data"
    }

    $accountFeed = Invoke-JsonEnvelope -Url "$baseUrl/account/feed/following" -WebSession $accountSession
    if ($accountFeed.data.authenticated -ne $true -or $accountFeed.data.followingCount -lt 1 -or $accountFeed.data.dynamics.items.Count -lt 1) {
        throw "Community account following feed did not return account-scoped data"
    }

    $accountNotifications = Invoke-JsonEnvelope -Url "$baseUrl/account/notifications?limit=8" -WebSession $accountSession
    if ($accountNotifications.data.clientId -notmatch "^account:" -or $accountNotifications.data.items.items.Count -lt 1) {
        throw "Community account notifications endpoint did not return account-scoped notifications"
    }

    $results = @(
        [pscustomobject]@{ Name = "status"; Url = "$baseUrl/status"; Detail = "mode=$($status.data.mode)" }
        [pscustomobject]@{ Name = "home"; Url = "$baseUrl/home"; Detail = "categories=$($homePayload.data.categories.Count), videos=$($homePayload.data.latest.items.Count), dynamics=$($homePayload.data.dynamics.items.Count)" }
        [pscustomobject]@{ Name = "categories"; Url = "$baseUrl/categories"; Detail = "count=$($categories.data.Count)" }
        [pscustomobject]@{ Name = "videos"; Url = "$baseUrl/videos?category=home&limit=8"; Detail = "count=$($videos.data.items.Count)" }
        [pscustomobject]@{ Name = "interaction"; Url = "$baseUrl/videos/$($firstVideo.slug)/interactions/like"; Detail = "liked=$($interaction.data.liked), clientId=$($interaction.data.clientId)" }
        [pscustomobject]@{ Name = "notifications"; Url = "$baseUrl/notifications?clientId=$clientId&limit=8"; Detail = "count=$($notifications.data.items.items.Count), clientId=$($notifications.data.clientId)" }
        [pscustomobject]@{ Name = "search"; Url = "$baseUrl/search?q=Aoi&limit=8"; Detail = "videos=$($search.data.videos.items.Count)" }
        [pscustomobject]@{ Name = "account-signup"; Url = "$baseUrl/auth/signup"; Detail = "status=$($signup.data.status), handle=$($signup.data.session.account.handle)" }
        [pscustomobject]@{ Name = "account-following"; Url = "$baseUrl/account/feed/following"; Detail = "following=$($accountFeed.data.followingCount), dynamics=$($accountFeed.data.dynamics.items.Count)" }
        [pscustomobject]@{ Name = "account-history"; Url = "$baseUrl/account/history?limit=8"; Detail = "count=$($accountHistoryList.data.items.items.Count), clientId=$($accountHistoryList.data.clientId)" }
        [pscustomobject]@{ Name = "account-notifications"; Url = "$baseUrl/account/notifications?limit=8"; Detail = "count=$($accountNotifications.data.items.items.Count), clientId=$($accountNotifications.data.clientId)" }
    )

    foreach ($result in $results) {
        Write-Host ("[{0}] {1} | {2}" -f $result.Name, $result.Detail, $result.Url)
    }
    Write-Host "Frontend community API smoke passed."
    Write-Host "Set NUXT_PUBLIC_API_BASE_URL=$baseUrl for split-port Nuxt integration."
    Write-Host "Temporary smoke workspace: $workPath"
} finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
        $process.WaitForExit()
    }
    foreach ($path in @($binaryPath, (Join-Path $workPath "app.db"), (Join-Path $workPath "uploads"), (Join-Path $workPath "app.log"))) {
        if (Test-Path -LiteralPath $path) {
            Remove-Item -LiteralPath $path -Recurse -Force
        }
    }
}
