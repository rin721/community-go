param(
    [int]$Port = 19998,
    [string]$BackendDir = "backend",
    [string]$Config = "configs/config.example.yaml",
    [string]$WorkDir = "tmp/ai/frontend-community-api-smoke",
    [string]$Binary = "tmp/ai/frontend-community-api-smoke/console-server.exe",
    [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Net.Http

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
            $statusOK = $response.StatusCode -eq 200
            $codeOK = $json.code -eq 0
            $validationOK = & $Validate $json
            if ($statusOK -and $codeOK -and $validationOK) {
                return $json
            }
            $content = Get-ResponseText $response
            if ($content.Length -gt 240) {
                $content = $content.Substring(0, 240)
            }
            $categoryCount = 0
            if ($null -ne $json.data -and $null -ne $json.data.categories) {
                $categoryCount = ($json.data.categories | Measure-Object).Count
            }
            $lastError = "Unexpected response from ${Url}: statusOK=$statusOK codeOK=$codeOK validationOK=$validationOK categoryCount=$categoryCount body=$content"
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
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300 -or $json.code -ne 0) {
        $content = Get-ResponseText $response
        if ($content.Length -gt 500) {
            $content = $content.Substring(0, 500)
        }
        throw "Unexpected API result from ${Url}: status=$($response.StatusCode) body=$content"
    }
    return $json
}

function Invoke-JsonProbe {
    param(
        [string]$Url,
        [object]$WebSession = $null
    )

    $handler = [System.Net.Http.HttpClientHandler]::new()
    if ($null -ne $WebSession) {
        $handler.CookieContainer = $WebSession.Cookies
    }
    $client = [System.Net.Http.HttpClient]::new($handler)
    try {
        $response = $client.GetAsync($Url).GetAwaiter().GetResult()
        $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        $json = $null
        if (-not [string]::IsNullOrWhiteSpace($text)) {
            try {
                $json = $text | ConvertFrom-Json
            } catch {
                $json = $null
            }
        }
        return [pscustomobject]@{
            Json = $json
            StatusCode = [int]$response.StatusCode
            Text = $text
        }
    } finally {
        $client.Dispose()
        $handler.Dispose()
    }
}

function Invoke-MultipartFileUpload {
    param(
        [string]$Url,
        [string]$FilePath,
        [string]$FileName,
        [object]$WebSession,
        [hashtable]$Headers = @{},
        [int64]$CategoryId = 0
    )

    $handler = [System.Net.Http.HttpClientHandler]::new()
    if ($null -ne $WebSession) {
        $handler.CookieContainer = $WebSession.Cookies
    }
    $client = [System.Net.Http.HttpClient]::new($handler)
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, $Url)
    $multipart = [System.Net.Http.MultipartFormDataContent]::new()
    $fileContent = $null
    try {
        foreach ($key in $Headers.Keys) {
            [void]$request.Headers.TryAddWithoutValidation($key, [string]$Headers[$key])
        }
        $bytes = [System.IO.File]::ReadAllBytes($FilePath)
        $fileContent = [System.Net.Http.ByteArrayContent]::new($bytes)
        $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("video/mp4")
        $multipart.Add($fileContent, "file", $FileName)
        $multipart.Add([System.Net.Http.StringContent]::new([string]$CategoryId), "categoryId")
        $request.Content = $multipart

        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        if (-not $response.IsSuccessStatusCode) {
            throw "Unexpected multipart upload status from ${Url}: $([int]$response.StatusCode) $text"
        }
        $json = $text | ConvertFrom-Json
        if ($json.code -ne 0) {
            throw "Unexpected multipart API result from $Url"
        }
        return $json
    } finally {
        if ($null -ne $fileContent) {
            $fileContent.Dispose()
        }
        $multipart.Dispose()
        $request.Dispose()
        $client.Dispose()
        $handler.Dispose()
    }
}

function Write-SmokeMediaFile {
    param([string]$Path)

    $bytes = [byte[]]@(
        0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70,
        0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 1,
        0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x32,
        0, 0, 0, 8, 0x6d, 0x64, 0x61, 0x74, 0
    )
    [System.IO.File]::WriteAllBytes($Path, $bytes)
}

function New-CommunityVideoSignature {
    param(
        [string]$Timestamp,
        [string]$Body,
        [string]$Secret
    )

    $keyBytes = [System.Text.Encoding]::UTF8.GetBytes($Secret)
    $messageBytes = [System.Text.Encoding]::UTF8.GetBytes("$Timestamp.$Body")
    $hmac = [System.Security.Cryptography.HMACSHA256]::new($keyBytes)
    try {
        $hashBytes = $hmac.ComputeHash($messageBytes)
        return "sha256=" + (($hashBytes | ForEach-Object { $_.ToString("x2") }) -join "")
    } finally {
        $hmac.Dispose()
    }
}

function Invoke-CommunityVideoJobCallback {
    param(
        [string]$Url,
        [string]$Secret,
        [object]$Body
    )

    $jsonBody = $Body | ConvertTo-Json -Depth 10 -Compress
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
    $headers = @{
        "X-Community-Video-Timestamp" = $timestamp
        "X-Community-Video-Signature" = (New-CommunityVideoSignature -Timestamp $timestamp -Body $jsonBody -Secret $Secret)
    }
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method "POST" -TimeoutSec 10 -Headers $headers -Body $jsonBody -ContentType "application/json"
    $payload = ConvertFrom-JsonResponse $response
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300 -or $payload.code -ne 0) {
        $content = Get-ResponseText $response
        if ($content.Length -gt 500) {
            $content = $content.Substring(0, 500)
        }
        throw "Unexpected video job callback result from ${Url}: status=$($response.StatusCode) body=$content"
    }
    return $payload
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

function Assert-NoDemoIds {
    param(
        [object[]]$Items,
        [string[]]$DemoIds,
        [string]$Name
    )

    foreach ($item in @($Items)) {
        if ($null -eq $item -or [string]::IsNullOrWhiteSpace([string]$item.id)) {
            continue
        }
        if ($DemoIds -contains [string]$item.id) {
            throw "$Name returned demo id '$($item.id)' in real API mode"
        }
    }
}

function Get-CollectionCount {
    param([object]$Value)

    if ($null -eq $Value) {
        return 0
    }
    if ($Value -is [System.Array]) {
        return $Value.Length
    }
    if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
        $count = 0
        foreach ($item in $Value) {
            $count++
        }
        return $count
    }
    return 1
}

function Ensure-CommunitySmokeCategory {
    param(
        [string]$ApiRoot,
        [object]$WebSession,
        [hashtable]$Headers,
        [string]$Slug = "smoke-video"
    )

    $catalog = Invoke-JsonEnvelope -Url "$ApiRoot/system/dictionaries" -WebSession $WebSession -Headers $Headers
    $dictionary = @($catalog.data.items | Where-Object { $_.code -eq "community.video.category" } | Select-Object -First 1)[0]
    if ($null -eq $dictionary) {
        $dictionary = (Invoke-JsonEnvelope -Url "$ApiRoot/system/dictionaries" -Method "POST" -WebSession $WebSession -Headers $Headers -Body @{
            code = "community.video.category"
            description = "Community video category dictionary for real API smoke tests"
            name = "Community video category"
            status = "active"
        }).data
    }

    if ($dictionary.status -ne "active") {
        $dictionary = (Invoke-JsonEnvelope -Url "$ApiRoot/system/dictionaries/$($dictionary.id)" -Method "PATCH" -WebSession $WebSession -Headers $Headers -Body @{
            status = "active"
        }).data
    }

    $activeItems = @($dictionary.items | Where-Object { $_.status -eq "active" -and -not [string]::IsNullOrWhiteSpace([string]$_.value) })
    $existingItem = $activeItems | Where-Object { [string]$_.value -eq $Slug } | Select-Object -First 1
    if ($null -ne $existingItem) {
        return [string]$existingItem.value
    }
    if ($activeItems.Count -gt 0) {
        return [string]$activeItems[0].value
    }

    $extra = @{
        accentColor = "#0f9fb7"
        description = "Smoke category created through system dictionary APIs"
    } | ConvertTo-Json -Compress
    $createdItem = Invoke-JsonEnvelope -Url "$ApiRoot/system/dictionaries/$($dictionary.id)/items" -Method "POST" -WebSession $WebSession -Headers $Headers -Body @{
        extra = $extra
        label = "Smoke Video"
        sort = 10
        status = "active"
        value = $Slug
    }
    return [string]$createdItem.data.value
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
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
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
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()

    return [pscustomobject]@{
        Process = $process
    }
}

function Stop-SmokeBackendProcess {
    param(
        [object]$Process,
        [string]$BinaryPath
    )

    $targets = @()
    if ($Process) {
        $targets += $Process
    }
    if (-not [string]::IsNullOrWhiteSpace($BinaryPath)) {
        $targets += @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $BinaryPath })
    }
    foreach ($target in ($targets | Where-Object { $_ } | Sort-Object Id -Unique)) {
        try {
            if (-not $target.HasExited) {
                Stop-Process -Id $target.Id -Force -ErrorAction SilentlyContinue
                [void]$target.WaitForExit(5000)
            }
        } catch {
            Write-Warning "Failed to stop smoke backend process $($target.Id): $($_.Exception.Message)"
        }
    }
}

function Remove-SmokePath {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
            return
        } catch {
            if ($attempt -eq 5) {
                Write-Warning "Failed to remove smoke path '$Path': $($_.Exception.Message)"
                return
            }
            Start-Sleep -Milliseconds (200 * $attempt)
        }
    }
}

$repoRoot = (Resolve-Path -LiteralPath ".").Path
$backendPath = Resolve-RepoPath $BackendDir
$workPath = Resolve-RepoPath $WorkDir
$binaryPath = Resolve-RepoPath $Binary
$configPath = Join-Path $backendPath $Config
$runId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

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
    $videoCallbackSecret = "frontend-community-smoke-video-callback-secret-32"
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
        "COMMUNITY_VIDEO_CLOUD_CALLBACK_SECRET" = $videoCallbackSecret
        "COMMUNITY_VIDEO_WORKER_ENABLED" = "false"
    }

    Write-Host "Starting backend community smoke server on http://127.0.0.1:$Port ..."
    $server = Start-BackendProcess `
        -FilePath $binaryPath `
        -WorkingDirectory $backendPath `
        -Arguments @("server", "--config=$configPath") `
        -Environment $envOverrides
    $process = $server.Process

    $apiRoot = "http://127.0.0.1:$Port/api/v1"
    $baseUrl = "$apiRoot/public/community"
    $adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $adminHeaders = @{}
    $status = Wait-ForJsonEnvelope -Url "$baseUrl/status" -TimeoutSeconds $TimeoutSeconds -Validate {
        param($json)
        $json.data.mode -eq "go" -and $json.data.basePath -eq "/api/v1/public/community" -and ($json.data.endpoints -contains "/home") -and $null -ne $json.data.setup
    }
    $setupDetail = "already-complete"
    if ($status.data.setup.required -eq $true -and $status.data.setup.completed -ne $true) {
        $setupUsername = "community_owner_$runId"
        $setupEmail = "community-owner-$runId@example.com"
        Invoke-JsonEnvelope -Url "$apiRoot/auth/setup/initial-admin" -Method "POST" -WebSession $adminSession -Body @{
            displayName = "Community Owner"
            email = $setupEmail
            orgCode = "community-smoke"
            orgName = "Community Smoke"
            password = "Password123!"
            username = $setupUsername
        } | Out-Null
        $setupDetail = "initialized-admin=$setupUsername"
        $adminHeaders = @{
            "X-CSRF-Token" = Get-SessionCookieValue -WebSession $adminSession -Url $apiRoot -Name "console_csrf"
        }

        $status = Wait-ForJsonEnvelope -Url "$baseUrl/status" -TimeoutSeconds $TimeoutSeconds -Validate {
            param($json)
            $json.data.mode -eq "go" `
                -and $json.data.basePath -eq "/api/v1/public/community" `
                -and ($json.data.endpoints -contains "/home") `
                -and $null -ne $json.data.setup `
                -and $json.data.setup.required -eq $false `
                -and $json.data.setup.completed -eq $true
        }
    }
    if ($adminHeaders.Count -eq 0) {
        throw "Community smoke requires setup admin session for system dictionary category preparation"
    }
    $smokeCategorySlug = Ensure-CommunitySmokeCategory -ApiRoot $apiRoot -WebSession $adminSession -Headers $adminHeaders
    $demoVideoIds = @(
        "video-aoi-alpha",
        "video-token-array",
        "video-dark-mode",
        "video-mobile-grid",
        "video-go-api",
        "video-sakura-accent",
        "video-music-stream",
        "video-game-room"
    )
    $demoDynamicIds = @(
        "dynamic-rin-alpha",
        "dynamic-design-sakura",
        "dynamic-backend-contract",
        "dynamic-frontend-mobile"
    )
    $homePayload = Wait-ForJsonEnvelope -Url "$baseUrl/home" -TimeoutSeconds $TimeoutSeconds -Validate {
        param($json)
        $null -ne $json.data
    }
    if ((Get-CollectionCount $homePayload.data.categories) -lt 1) {
        throw "Community home endpoint returned no category taxonomy in real API mode"
    }
    if ($null -ne $homePayload.data.announcement) {
        throw "Community home returned a hardcoded announcement in real API mode"
    }
    Assert-NoDemoIds -Items @($homePayload.data.latest.items) -DemoIds $demoVideoIds -Name "community home latest"
    Assert-NoDemoIds -Items @($homePayload.data.dynamics.items) -DemoIds $demoDynamicIds -Name "community home dynamics"
    if (@($homePayload.data.latest.items).Count -ne 0 -or @($homePayload.data.dynamics.items).Count -ne 0) {
        throw "Newly initialized real community database should not contain videos or dynamics before the smoke publishes one"
    }

    $categories = Invoke-JsonEnvelope -Url "$baseUrl/categories"
    if ($categories.data.Count -lt 1) {
        throw "Community categories endpoint returned no categories"
    }

    $videos = Invoke-JsonEnvelope -Url "$baseUrl/videos?limit=8"
    if (@($videos.data.items).Count -ne 0) {
        Assert-NoDemoIds -Items @($videos.data.items) -DemoIds $demoVideoIds -Name "community videos"
        throw "Newly initialized real community database should not contain videos before the smoke publishes one"
    }

    $accountSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
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

    $csrfToken = Get-SessionCookieValue -WebSession $accountSession -Url $baseUrl -Name "community_csrf"
    $accountHeaders = @{
        "X-Community-CSRF-Token" = $csrfToken
    }

    $consoleSessionProbe = Invoke-JsonProbe -Url "$apiRoot/me/session" -WebSession $accountSession
    if ($consoleSessionProbe.StatusCode -eq 200 -and $consoleSessionProbe.Json.code -eq 0) {
        throw "Community signup unexpectedly created an IAM console session: $($consoleSessionProbe.Text)"
    }

    $communityOrgProbe = Invoke-JsonEnvelope -Url "$apiRoot/orgs?keyword=community-$accountName&page=1&pageSize=20" -WebSession $adminSession
    $communityOrgs = @($communityOrgProbe.data.items | Where-Object { [string]$_.code -like "community-*" })
    if ($communityOrgs.Count -gt 0) {
        throw "Community signup unexpectedly created IAM community organizations: $($communityOrgs | ConvertTo-Json -Depth 8)"
    }

    $smokeMediaPath = Join-Path $workPath "community-smoke-review.mp4"
    Write-SmokeMediaFile -Path $smokeMediaPath
    $uploadedMedia = Invoke-MultipartFileUpload -Url "$baseUrl/account/submissions/upload" -WebSession $accountSession -Headers $accountHeaders -FilePath $smokeMediaPath -FileName "community-smoke-review.mp4"
    if (-not $uploadedMedia.data.mediaAssetId -or -not $uploadedMedia.data.url -or -not $uploadedMedia.data.mimeType -or -not $uploadedMedia.data.sizeBytes) {
        throw "Community account source upload endpoint did not return mediaAssetId/displayName/originalName/url/mimeType/sizeBytes"
    }
    $uploadedMediaAssetId = [string]$uploadedMedia.data.mediaAssetId

    $clientId = "community-smoke-client"
    $submission = Invoke-JsonEnvelope -Url "$baseUrl/account/submissions" -Method "POST" -WebSession $accountSession -Headers $accountHeaders -Body @{
        allowComments = $true
        categorySlug = $smokeCategorySlug
        description = "Smoke submission for review state verification"
        mediaAssetId = $uploadedMediaAssetId
        sensitive = $false
        sourceName = $uploadedMedia.data.displayName
        sourceSize = $uploadedMedia.data.sizeBytes
        sourceType = $uploadedMedia.data.mimeType
        tags = @("smoke", "review")
        title = "Community smoke review submission"
        visibility = "public"
    }
    if ($submission.data.status -ne "pending_review" -or -not $submission.data.id) {
        throw "Community account submission create endpoint did not return a pending review item"
    }
    if ([string]$submission.data.mediaAssetId -ne $uploadedMediaAssetId) {
        throw "Community account submission did not persist uploaded media asset linkage"
    }

    $reviewQueue = Invoke-JsonEnvelope -Url "$apiRoot/community/submissions?status=pending_review&limit=8" -WebSession $adminSession -Headers $adminHeaders
    $queuedSubmission = $reviewQueue.data.items.items | Where-Object { $_.id -eq $submission.data.id } | Select-Object -First 1
    if ($null -eq $queuedSubmission) {
        throw "Community review queue did not include the newly created submission"
    }

    $approvedSubmission = Invoke-JsonEnvelope -Url "$apiRoot/community/submissions/$($submission.data.id)/review" -Method "PATCH" -WebSession $adminSession -Headers $adminHeaders -Body @{
        reviewNote = "Smoke review approved"
        status = "approved"
    }
    if ($approvedSubmission.data.status -ne "approved" -or $approvedSubmission.data.reviewNote -ne "Smoke review approved" -or -not $approvedSubmission.data.reviewedAt) {
        throw "Community submission review endpoint did not persist approval state"
    }

    $videoJob = Invoke-JsonEnvelope -Url "$apiRoot/community/submissions/$($submission.data.id)/transcode" -Method "POST" -WebSession $adminSession -Headers $adminHeaders -Body @{
        durationSeconds = 128
        thumbnailUrl = "gradient:community-smoke-review"
    }
    if (-not $videoJob.data.id -or $videoJob.data.status -ne "queued" -or ([string]$videoJob.data.mediaAssetId) -ne $uploadedMediaAssetId -or $videoJob.data.attempt -ne 0 -or $videoJob.data.maxAttempts -lt 1) {
        throw "Community transcode endpoint did not create an asynchronous queued video job"
    }

    $accountSubmissionsQueued = Invoke-JsonEnvelope -Url "$baseUrl/account/submissions?limit=8" -WebSession $accountSession -Headers $accountHeaders
    $queuedSubmissionSummary = $accountSubmissionsQueued.data.items.items | Where-Object { $_.id -eq $submission.data.id } | Select-Object -First 1
    if ($null -eq $queuedSubmissionSummary -or $queuedSubmissionSummary.latestVideoJob.id -ne $videoJob.data.id -or $queuedSubmissionSummary.latestVideoJob.status -ne "queued") {
        throw "Community account submission list did not expose the queued latestVideoJob summary"
    }
    if ($queuedSubmissionSummary.latestVideoJob.PSObject.Properties.Name -contains "providerJobId" -or $queuedSubmissionSummary.latestVideoJob.PSObject.Properties.Name -contains "lockedBy" -or $queuedSubmissionSummary.latestVideoJob.PSObject.Properties.Name -contains "requestPayload") {
        throw "Community account latestVideoJob summary leaked internal video job fields"
    }

    $queuedJobs = Invoke-JsonEnvelope -Url "$apiRoot/community/video-jobs?status=queued&limit=8" -WebSession $adminSession -Headers $adminHeaders
    $queuedJob = $queuedJobs.data.items.items | Where-Object { $_.id -eq $videoJob.data.id } | Select-Object -First 1
    if ($null -eq $queuedJob) {
        throw "Community video job list did not include the queued transcode job"
    }

    $jobDetailBeforeCallback = Invoke-JsonEnvelope -Url "$apiRoot/community/video-jobs/$($videoJob.data.id)" -WebSession $adminSession -Headers $adminHeaders
    if ($jobDetailBeforeCallback.data.id -ne $videoJob.data.id -or -not $jobDetailBeforeCallback.data.requestPayload) {
        throw "Community video job detail did not expose the queued job request payload"
    }

    $runningJob = Invoke-CommunityVideoJobCallback -Url "$baseUrl/video-jobs/$($videoJob.data.id)/callback" -Secret $videoCallbackSecret -Body @{
        progress = 42
        providerJobId = "smoke-provider-$runId"
        status = "running"
    }
    if ($runningJob.data.status -ne "running" -or $runningJob.data.progress -ne 42 -or $runningJob.data.providerJobId -ne "smoke-provider-$runId") {
        throw "Community video job running callback did not update progress"
    }

    $accountSubmissionsRunning = Invoke-JsonEnvelope -Url "$baseUrl/account/submissions?limit=8" -WebSession $accountSession -Headers $accountHeaders
    $runningSubmissionSummary = $accountSubmissionsRunning.data.items.items | Where-Object { $_.id -eq $submission.data.id } | Select-Object -First 1
    if ($null -eq $runningSubmissionSummary -or $runningSubmissionSummary.latestVideoJob.id -ne $videoJob.data.id -or $runningSubmissionSummary.latestVideoJob.status -ne "running" -or $runningSubmissionSummary.latestVideoJob.progress -ne 42) {
        throw "Community account submission list did not expose the running latestVideoJob summary"
    }

    $hlsMasterUrl = "/api/v1/public/community/hls/smoke/$($videoJob.data.id)/master.m3u8"
    $callbackJob = Invoke-CommunityVideoJobCallback -Url "$baseUrl/video-jobs/$($videoJob.data.id)/callback" -Secret $videoCallbackSecret -Body @{
        durationSeconds = 128
        masterUrl = $hlsMasterUrl
        outputStorageKey = "community/videos/smoke/$($videoJob.data.id)/master.m3u8"
        progress = 100
        providerJobId = "smoke-provider-$runId"
        renditions = @(
            @{
                bitrateKbps = 2800
                height = 720
                id = "smoke-rendition-$($videoJob.data.id)-720p"
                playlistUrl = "/api/v1/public/community/hls/smoke/$($videoJob.data.id)/720p.m3u8"
                qualityLabel = "720p"
                storageKey = "community/videos/smoke/$($videoJob.data.id)/720p.m3u8"
                width = 1280
            }
        )
        status = "succeeded"
        thumbnailUrl = "gradient:community-smoke-review"
    }
    if ($callbackJob.data.status -ne "succeeded" -or -not $callbackJob.data.videoId -or $callbackJob.data.outputPublicUrl -ne $hlsMasterUrl -or $callbackJob.data.providerJobId -ne "smoke-provider-$runId" -or @($callbackJob.data.renditions).Count -lt 1) {
        throw "Community video job callback did not publish a succeeded HLS job"
    }

    $accountSubmissionsSucceeded = Invoke-JsonEnvelope -Url "$baseUrl/account/submissions?limit=8" -WebSession $accountSession -Headers $accountHeaders
    $succeededSubmissionSummary = $accountSubmissionsSucceeded.data.items.items | Where-Object { $_.id -eq $submission.data.id } | Select-Object -First 1
    if ($null -eq $succeededSubmissionSummary -or $succeededSubmissionSummary.latestVideoJob.id -ne $videoJob.data.id -or $succeededSubmissionSummary.latestVideoJob.status -ne "succeeded" -or $succeededSubmissionSummary.latestVideoJob.videoId -ne $callbackJob.data.videoId -or $succeededSubmissionSummary.latestVideoJob.outputPublicUrl -ne $hlsMasterUrl) {
        throw "Community account submission list did not expose the succeeded latestVideoJob summary"
    }

    $failedSubmission = Invoke-JsonEnvelope -Url "$baseUrl/account/submissions" -Method "POST" -WebSession $accountSession -Headers $accountHeaders -Body @{
        allowComments = $true
        categorySlug = $smokeCategorySlug
        description = "Smoke submission for failed transcode summary verification"
        mediaAssetId = $uploadedMediaAssetId
        sensitive = $false
        sourceName = $uploadedMedia.data.displayName
        sourceSize = $uploadedMedia.data.sizeBytes
        sourceType = $uploadedMedia.data.mimeType
        tags = @("smoke", "failed-job")
        title = "Community smoke failed transcode submission"
        visibility = "public"
    }
    if ($failedSubmission.data.status -ne "pending_review" -or -not $failedSubmission.data.id) {
        throw "Community failed-job submission create endpoint did not return a pending review item"
    }
    $approvedFailedSubmission = Invoke-JsonEnvelope -Url "$apiRoot/community/submissions/$($failedSubmission.data.id)/review" -Method "PATCH" -WebSession $adminSession -Headers $adminHeaders -Body @{
        reviewNote = "Smoke failed transcode approved"
        status = "approved"
    }
    if ($approvedFailedSubmission.data.status -ne "approved") {
        throw "Community failed-job submission review endpoint did not persist approval state"
    }
    $failedVideoJob = Invoke-JsonEnvelope -Url "$apiRoot/community/submissions/$($failedSubmission.data.id)/transcode" -Method "POST" -WebSession $adminSession -Headers $adminHeaders -Body @{
        durationSeconds = 64
        thumbnailUrl = "gradient:community-smoke-failed"
    }
    if (-not $failedVideoJob.data.id -or $failedVideoJob.data.status -ne "queued") {
        throw "Community failed-job transcode endpoint did not create a queued video job"
    }
    $failedCallbackJob = Invoke-CommunityVideoJobCallback -Url "$baseUrl/video-jobs/$($failedVideoJob.data.id)/callback" -Secret $videoCallbackSecret -Body @{
        errorMessage = "Smoke provider rejected the source for failure summary verification"
        failureCode = "smoke_provider_failed"
        progress = 73
        providerJobId = "smoke-failed-provider-$runId"
        status = "failed"
    }
    if ($failedCallbackJob.data.status -ne "failed" -or $failedCallbackJob.data.failureCode -ne "smoke_provider_failed" -or -not $failedCallbackJob.data.errorMessage) {
        throw "Community failed video job callback did not persist failure metadata"
    }
    $accountSubmissionsFailed = Invoke-JsonEnvelope -Url "$baseUrl/account/submissions?limit=8" -WebSession $accountSession -Headers $accountHeaders
    $failedSubmissionSummary = $accountSubmissionsFailed.data.items.items | Where-Object { $_.id -eq $failedSubmission.data.id } | Select-Object -First 1
    if ($null -eq $failedSubmissionSummary -or $failedSubmissionSummary.latestVideoJob.id -ne $failedVideoJob.data.id -or $failedSubmissionSummary.latestVideoJob.status -ne "failed" -or $failedSubmissionSummary.latestVideoJob.failureCode -ne "smoke_provider_failed" -or -not $failedSubmissionSummary.latestVideoJob.errorMessage) {
        throw "Community account submission list did not expose the failed latestVideoJob summary"
    }

    $publishedVideo = Invoke-JsonEnvelope -Url "$baseUrl/videos/$($callbackJob.data.videoId)"
    if ($publishedVideo.data.id -ne $callbackJob.data.videoId -or $publishedVideo.data.title -ne $submission.data.title -or $publishedVideo.data.sourceUrl -ne $hlsMasterUrl) {
        throw "Community generated video detail does not match the transcode callback output"
    }
    $hlsSource = @($publishedVideo.data.sources | Where-Object { $_.kind -eq "hls" -and $_.src -eq $hlsMasterUrl } | Select-Object -First 1)[0]
    if ($null -eq $hlsSource) {
        throw "Community generated video detail did not expose the HLS source from the video job callback"
    }
    if (-not $publishedVideo.data.uploader.handle) {
        throw "Community generated video did not expose a generated creator handle"
    }
    $firstVideo = $publishedVideo.data
    $firstVideoDetail = $publishedVideo
    $publishedCreatorHandle = $publishedVideo.data.uploader.handle

    $homeAfterPublish = Wait-ForJsonEnvelope -Url "$baseUrl/home" -TimeoutSeconds $TimeoutSeconds -Validate {
        param($json)
        $null -ne $json.data
    }
    if (@($homeAfterPublish.data.latest.items | Where-Object { $_.id -eq $callbackJob.data.videoId }).Count -ne 1) {
        throw "Community home endpoint did not include the generated published video"
    }
    Assert-NoDemoIds -Items @($homeAfterPublish.data.latest.items) -DemoIds $demoVideoIds -Name "community home latest after publish"
    Assert-NoDemoIds -Items @($homeAfterPublish.data.dynamics.items) -DemoIds $demoDynamicIds -Name "community home dynamics after publish"

    $videos = Invoke-JsonEnvelope -Url "$baseUrl/videos?limit=8"
    if (@($videos.data.items | Where-Object { $_.id -eq $firstVideo.id }).Count -ne 1) {
        throw "Community videos endpoint did not include the generated published video"
    }
    Assert-NoDemoIds -Items @($videos.data.items) -DemoIds $demoVideoIds -Name "community videos after publish"

    $interaction = Invoke-JsonEnvelope -Url "$baseUrl/videos/$($firstVideo.slug)/interactions/like" -Method "POST" -Body @{
        clientId = $clientId
    }
    if ($interaction.data.liked -ne $true -or $interaction.data.clientId -ne $clientId) {
        throw "Community interaction endpoint did not persist like state"
    }

    $comment = Invoke-JsonEnvelope -Url "$baseUrl/videos/$($firstVideo.slug)/comments" -Method "POST" -Body @{
        authorName = "Community Smoke"
        body = "Smoke comment for edit and delete verification"
        clientId = $clientId
    }
    if ($comment.data.ownedByCurrentClient -ne $true -or -not $comment.data.id) {
        throw "Community comment create endpoint did not return an owned comment"
    }

    $comments = Invoke-JsonEnvelope -Url "$baseUrl/videos/$($firstVideo.slug)/comments?clientId=$clientId&limit=8"
    $ownedComment = $comments.data.items | Where-Object { $_.id -eq $comment.data.id -and $_.ownedByCurrentClient -eq $true } | Select-Object -First 1
    if ($null -eq $ownedComment) {
        throw "Community comments list did not mark the current client comment as owned"
    }

    $updatedComment = Invoke-JsonEnvelope -Url "$baseUrl/videos/$($firstVideo.slug)/comments/$($comment.data.id)" -Method "PATCH" -Body @{
        body = "Updated smoke comment"
        clientId = $clientId
    }
    if ($updatedComment.data.body -ne "Updated smoke comment" -or $updatedComment.data.ownedByCurrentClient -ne $true) {
        throw "Community comment update endpoint did not persist the edited body"
    }

    $deletedComment = Invoke-JsonEnvelope -Url "$baseUrl/videos/$($firstVideo.slug)/comments/$($comment.data.id)?clientId=$clientId" -Method "DELETE"
    if ($deletedComment.data.deleted -ne $true -or $deletedComment.data.commentId -ne $comment.data.id) {
        throw "Community comment delete endpoint did not return a deletion receipt"
    }

    $dynamic = Invoke-JsonEnvelope -Url "$baseUrl/dynamics" -Method "POST" -Body @{
        authorName = "Community Smoke"
        body = "Smoke dynamic for edit and delete verification"
        clientId = $clientId
        videoId = $firstVideo.id
    }
    if ($dynamic.data.ownedByCurrentClient -ne $true -or -not $dynamic.data.id) {
        throw "Community dynamic create endpoint did not return an owned dynamic"
    }

    $dynamics = Invoke-JsonEnvelope -Url "$baseUrl/dynamics?clientId=$clientId&limit=8"
    $ownedDynamic = $dynamics.data.items.items | Where-Object { $_.id -eq $dynamic.data.id -and $_.ownedByCurrentClient -eq $true } | Select-Object -First 1
    if ($null -eq $ownedDynamic) {
        throw "Community dynamics list did not mark the current client dynamic as owned"
    }

    $updatedDynamic = Invoke-JsonEnvelope -Url "$baseUrl/dynamics/$($dynamic.data.id)" -Method "PATCH" -Body @{
        body = "Updated smoke dynamic"
        clientId = $clientId
    }
    if ($updatedDynamic.data.body -ne "Updated smoke dynamic" -or $updatedDynamic.data.ownedByCurrentClient -ne $true) {
        throw "Community dynamic update endpoint did not persist the edited body"
    }

    $deletedDynamic = Invoke-JsonEnvelope -Url "$baseUrl/dynamics/$($dynamic.data.id)?clientId=$clientId" -Method "DELETE"
    if ($deletedDynamic.data.deleted -ne $true -or $deletedDynamic.data.dynamicId -ne $dynamic.data.id) {
        throw "Community dynamic delete endpoint did not return a deletion receipt"
    }

    $feedDynamic = Invoke-JsonEnvelope -Url "$baseUrl/dynamics" -Method "POST" -Body @{
        authorName = "Community Smoke"
        body = "Smoke dynamic for following feed verification"
        clientId = $clientId
        videoId = $firstVideo.id
    }
    if ($feedDynamic.data.ownedByCurrentClient -ne $true -or -not $feedDynamic.data.id) {
        throw "Community feed dynamic create endpoint did not return an owned dynamic"
    }

    $notifications = Invoke-JsonEnvelope -Url "$baseUrl/notifications?clientId=$clientId&limit=8"
    if ($notifications.data.clientId -ne $clientId -or @($notifications.data.items.items).Count -lt 1) {
        throw "Community notifications endpoint did not return the interaction notification"
    }

    $search = Invoke-JsonEnvelope -Url "$baseUrl/search?q=Community%20smoke&limit=8"
    if (@($search.data.videos.items).Count -lt 1) {
        throw "Community search endpoint returned no matching videos"
    }

    $accountFollow = Invoke-JsonEnvelope -Url "$baseUrl/account/users/$publishedCreatorHandle/follow" -Method "POST" -WebSession $accountSession -Headers $accountHeaders
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
    if ($accountDynamic.data.ownedByCurrentClient -ne $true) {
        throw "Community account dynamic endpoint did not return an owned dynamic"
    }

    $updatedAccountDynamic = Invoke-JsonEnvelope -Url "$baseUrl/account/dynamics/$($accountDynamic.data.id)" -Method "PATCH" -WebSession $accountSession -Headers $accountHeaders -Body @{
        body = "Updated account smoke dynamic"
    }
    if ($updatedAccountDynamic.data.body -ne "Updated account smoke dynamic" -or $updatedAccountDynamic.data.ownedByCurrentClient -ne $true) {
        throw "Community account dynamic update endpoint did not persist the edited body"
    }

    $deletedAccountDynamic = Invoke-JsonEnvelope -Url "$baseUrl/account/dynamics/$($accountDynamic.data.id)" -Method "DELETE" -WebSession $accountSession -Headers $accountHeaders
    if ($deletedAccountDynamic.data.deleted -ne $true -or $deletedAccountDynamic.data.dynamicId -ne $accountDynamic.data.id) {
        throw "Community account dynamic delete endpoint did not return a deletion receipt"
    }

    $accountHistory = Invoke-JsonEnvelope -Url "$baseUrl/account/videos/$($firstVideo.slug)/history" -Method "POST" -WebSession $accountSession -Headers $accountHeaders -Body @{
        progressSeconds = 42
    }
    if ($accountHistory.data.video.id -ne $firstVideo.id -or $accountHistory.data.progressSeconds -ne 42) {
        throw "Community account history endpoint did not persist the playback progress"
    }

    $accountHistoryList = Invoke-JsonEnvelope -Url "$baseUrl/account/history?limit=8" -WebSession $accountSession
    if ($accountHistoryList.data.authenticated -ne $true -or $accountHistoryList.data.clientId -notmatch "^account:" -or @($accountHistoryList.data.items.items).Count -lt 1) {
        throw "Community account history list did not return account-scoped data"
    }

    $accountFeed = Invoke-JsonEnvelope -Url "$baseUrl/account/feed/following" -WebSession $accountSession
    if ($accountFeed.data.authenticated -ne $true -or $accountFeed.data.followingCount -lt 1 -or @($accountFeed.data.dynamics.items).Count -lt 1) {
        throw "Community account following feed did not return account-scoped data"
    }

    $accountNotifications = Invoke-JsonEnvelope -Url "$baseUrl/account/notifications?limit=8" -WebSession $accountSession
    if ($accountNotifications.data.clientId -notmatch "^account:" -or @($accountNotifications.data.items.items).Count -lt 1) {
        throw "Community account notifications endpoint did not return account-scoped notifications"
    }

    $logout = Invoke-JsonEnvelope -Url "$baseUrl/auth/logout" -Method "POST" -WebSession $accountSession -Headers $accountHeaders
    if ($logout.data.loggedOut -ne $true) {
        throw "Community logout endpoint did not return a logout receipt"
    }

    $anonymousAfterLogout = Invoke-JsonEnvelope -Url "$baseUrl/auth/session" -WebSession $accountSession
    if ($null -ne $anonymousAfterLogout.data) {
        throw "Community session endpoint still returned account data after logout"
    }

    $loginSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $login = Invoke-JsonEnvelope -Url "$baseUrl/auth/login" -Method "POST" -WebSession $loginSession -Body @{
        identifier = $accountEmail
        password = "Password123!"
    }
    Assert-NoControlConsoleIdentity -Payload $login.data -Name "community login"
    if (-not $login.data.sessionId -or $login.data.account.handle -ne $signup.data.session.account.handle) {
        throw "Community login endpoint did not return the original community account session"
    }

    $loginSessionProbe = Invoke-JsonEnvelope -Url "$baseUrl/auth/session" -WebSession $loginSession
    Assert-NoControlConsoleIdentity -Payload $loginSessionProbe.data -Name "community relogin session"
    if ($loginSessionProbe.data.account.displayName -ne "Community Smoke") {
        throw "Community session endpoint did not keep the compact identity after login"
    }

    $results = @(
        [pscustomobject]@{ Name = "status"; Url = "$baseUrl/status"; Detail = "mode=$($status.data.mode), setupRequired=$($status.data.setup.required), setupCompleted=$($status.data.setup.completed)" }
        [pscustomobject]@{ Name = "setup"; Url = "$apiRoot/auth/setup/initial-admin"; Detail = $setupDetail }
        [pscustomobject]@{ Name = "home-initial"; Url = "$baseUrl/home"; Detail = "categories=$(@($homePayload.data.categories).Count), videos=$(@($homePayload.data.latest.items).Count), dynamics=$(@($homePayload.data.dynamics.items).Count), announcement=$($null -ne $homePayload.data.announcement)" }
        [pscustomobject]@{ Name = "home-after-publish"; Url = "$baseUrl/home"; Detail = "videos=$(@($homeAfterPublish.data.latest.items).Count), dynamics=$(@($homeAfterPublish.data.dynamics.items).Count)" }
        [pscustomobject]@{ Name = "categories"; Url = "$baseUrl/categories"; Detail = "count=$(@($categories.data).Count)" }
        [pscustomobject]@{ Name = "videos"; Url = "$baseUrl/videos?limit=8"; Detail = "count=$(@($videos.data.items).Count), category=$smokeCategorySlug" }
        [pscustomobject]@{ Name = "interaction"; Url = "$baseUrl/videos/$($firstVideo.slug)/interactions/like"; Detail = "liked=$($interaction.data.liked), clientId=$($interaction.data.clientId)" }
        [pscustomobject]@{ Name = "comments"; Url = "$baseUrl/videos/$($firstVideo.slug)/comments"; Detail = "updated=$($updatedComment.data.body), deleted=$($deletedComment.data.deleted)" }
        [pscustomobject]@{ Name = "dynamics"; Url = "$baseUrl/dynamics"; Detail = "updated=$($updatedDynamic.data.body), deleted=$($deletedDynamic.data.deleted)" }
        [pscustomobject]@{ Name = "account-media-upload"; Url = "$baseUrl/account/submissions/upload"; Detail = "asset=$uploadedMediaAssetId, mime=$($uploadedMedia.data.mimeType), size=$($uploadedMedia.data.sizeBytes)" }
        [pscustomobject]@{ Name = "submissions"; Url = "$apiRoot/community/submissions/$($submission.data.id)/review"; Detail = "status=$($approvedSubmission.data.status), latest=$($succeededSubmissionSummary.latestVideoJob.status), failedLatest=$($failedSubmissionSummary.latestVideoJob.status), mediaAsset=$($submission.data.mediaAssetId)" }
        [pscustomobject]@{ Name = "video-job"; Url = "$apiRoot/community/video-jobs/$($videoJob.data.id)"; Detail = "status=$($callbackJob.data.status), video=$($callbackJob.data.videoId), hls=$($callbackJob.data.outputPublicUrl), renditions=$(@($callbackJob.data.renditions).Count)" }
        [pscustomobject]@{ Name = "notifications"; Url = "$baseUrl/notifications?clientId=$clientId&limit=8"; Detail = "count=$(@($notifications.data.items.items).Count), clientId=$($notifications.data.clientId)" }
        [pscustomobject]@{ Name = "search"; Url = "$baseUrl/search?q=Community%20smoke&limit=8"; Detail = "videos=$(@($search.data.videos.items).Count)" }
        [pscustomobject]@{ Name = "account-signup"; Url = "$baseUrl/auth/signup"; Detail = "status=$($signup.data.status), handle=$($signup.data.session.account.handle)" }
        [pscustomobject]@{ Name = "account-console-boundary"; Url = "$apiRoot/me/session"; Detail = "status=$($consoleSessionProbe.StatusCode), iamCommunityOrgs=$($communityOrgs.Count)" }
        [pscustomobject]@{ Name = "account-login"; Url = "$baseUrl/auth/login"; Detail = "session=$($login.data.sessionId), handle=$($login.data.account.handle)" }
        [pscustomobject]@{ Name = "account-logout"; Url = "$baseUrl/auth/logout"; Detail = "loggedOut=$($logout.data.loggedOut), anonymousSession=$($null -eq $anonymousAfterLogout.data)" }
        [pscustomobject]@{ Name = "account-dynamics"; Url = "$baseUrl/account/dynamics"; Detail = "updated=$($updatedAccountDynamic.data.body), deleted=$($deletedAccountDynamic.data.deleted)" }
        [pscustomobject]@{ Name = "account-following"; Url = "$baseUrl/account/feed/following"; Detail = "following=$($accountFeed.data.followingCount), dynamics=$(@($accountFeed.data.dynamics.items).Count)" }
        [pscustomobject]@{ Name = "account-history"; Url = "$baseUrl/account/history?limit=8"; Detail = "count=$(@($accountHistoryList.data.items.items).Count), clientId=$($accountHistoryList.data.clientId)" }
        [pscustomobject]@{ Name = "account-notifications"; Url = "$baseUrl/account/notifications?limit=8"; Detail = "count=$(@($accountNotifications.data.items.items).Count), clientId=$($accountNotifications.data.clientId)" }
    )

    foreach ($result in $results) {
        Write-Host ("[{0}] {1} | {2}" -f $result.Name, $result.Detail, $result.Url)
    }
    Write-Host "Frontend community API smoke passed."
    Write-Host "Use NUXT_BACKEND_ORIGIN=http://127.0.0.1:$Port with the Nuxt same-origin proxy for split-port integration."
    Write-Host "Temporary smoke workspace: $workPath"
} finally {
    Stop-SmokeBackendProcess -Process $process -BinaryPath $binaryPath
    foreach ($path in @($binaryPath, (Join-Path $workPath "app.db"), (Join-Path $workPath "uploads"), (Join-Path $workPath "app.log"))) {
        Remove-SmokePath -Path $path
    }
}
