const { spawn, spawnSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const repoRoot = path.resolve(__dirname, "..")
const backendPath = path.join(repoRoot, "backend")
const frontendPath = path.join(repoRoot, "frontend")
const workPath = path.join(repoRoot, "tmp", "ai", "frontend-community-page-smoke")
const screenshotsPath = path.join(workPath, "screenshots")
const backendBinaryPath = path.join(workPath, "console-server.exe")
const backendConfigPath = path.join(backendPath, "configs", "config.example.yaml")
const nuxtEntryPath = path.join(frontendPath, "node_modules", "nuxt", "bin", "nuxt.mjs")
const playwrightModulePath = path.join(repoRoot, "backend", "web", "app", "node_modules", "@playwright", "test")

const options = parseArgs(process.argv.slice(2))
const backendPort = Number(options["backend-port"] || 19997)
const frontendPort = Number(options["frontend-port"] || 3001)
const timeoutMs = Number(options["timeout-seconds"] || 90) * 1000
const backendBaseUrl = `http://127.0.0.1:${backendPort}`
const communityApiBaseUrl = `${backendBaseUrl}/api/v1/public/community`
const frontendBaseUrl = `http://127.0.0.1:${frontendPort}`
const runId = Date.now()

let backendProcess = null
let frontendProcess = null
let seededCommunity = null

main().catch(async (error) => {
  console.error(error.stack || error.message || String(error))
  await shutdown()
  cleanupBulkyArtifacts()
  process.exit(1)
})

async function main() {
  ensurePrerequisites()
  fs.rmSync(screenshotsPath, { force: true, recursive: true })
  fs.mkdirSync(screenshotsPath, { recursive: true })
  const adminSession = createCookieSession()

  console.log("Building backend community smoke server...")
  const build = spawnSync("go", ["build", "-mod=readonly", "-o", backendBinaryPath, "./cmd/console"], {
    cwd: backendPath,
    env: normalizedEnv(),
    stdio: "inherit",
    windowsHide: true
  })
  if (build.status !== 0) {
    throw new Error(`go build failed with exit code ${build.status}`)
  }

  backendProcess = startProcess(backendBinaryPath, ["server", `--config=${backendConfigPath}`], {
    cwd: backendPath,
    env: normalizedEnv({
      APP_SERVER_PORT: String(backendPort),
      APP_DB_DRIVER: "sqlite",
      APP_DB_SQLITE_PATH: path.join(workPath, "app.db"),
      APP_STORAGE_DRIVER: "local",
      APP_STORAGE_LOCAL_BASE_PATH: path.join(workPath, "uploads"),
      APP_LOG_FILE_PATH: path.join(workPath, "app.log"),
      APP_CORS_ALLOW_ORIGINS: frontendBaseUrl,
      APP_CORS_ALLOW_CREDENTIALS: "true",
      APP_AUTH_SIGNING_KEY: "frontend-page-smoke-signing-key-32",
      APP_AUTH_REFRESH_TOKEN_PEPPER: "frontend-page-smoke-refresh-pepper-32",
      APP_AUTH_MFA_SECRET_KEY: "frontend-page-smoke-mfa-secret-key-32",
      AUTH_SIGNING_KEY: "frontend-page-smoke-signing-key-32",
      AUTH_REFRESH_TOKEN_PEPPER: "frontend-page-smoke-refresh-pepper-32",
      AUTH_MFA_SECRET_KEY: "frontend-page-smoke-mfa-secret-key-32"
    }),
    logFile: path.join(workPath, "backend.log")
  })
  let status = await waitForJson(`${communityApiBaseUrl}/status`, (json) =>
    json.code === 0 &&
    json.data &&
    json.data.mode === "go" &&
    Array.isArray(json.data.endpoints) &&
    json.data.endpoints.includes("/home") &&
    json.data.setup
  )
  if (status.data.setup.required === true && status.data.setup.completed !== true) {
    const setupUsername = `community_page_owner_${runId}`
    await postJson(`${backendBaseUrl}/api/v1/auth/setup/initial-admin`, {
      displayName: "Community Page Owner",
      email: `community-page-owner-${runId}@example.com`,
      orgCode: "community-page-smoke",
      orgName: "Community Page Smoke",
      password: "Password123!",
      username: setupUsername
    }, adminSession)
    status = await waitForJson(`${communityApiBaseUrl}/status`, (json) =>
      json.code === 0 &&
      json.data &&
      json.data.mode === "go" &&
      Array.isArray(json.data.endpoints) &&
      json.data.endpoints.includes("/home") &&
      json.data.setup &&
      json.data.setup.required === false &&
      json.data.setup.completed === true
    )
    console.log(`Initialized backend setup for page smoke: ${setupUsername}`)
  }
  seededCommunity = await seedCommunityPageSmokeData(adminSession)
  console.log(`Seeded page smoke community video: ${seededCommunity.videoSlug}`)

  frontendProcess = startProcess(process.execPath, [nuxtEntryPath, "dev", "--host", "127.0.0.1", "--port", String(frontendPort)], {
    cwd: frontendPath,
    env: normalizedEnv({
      BROWSER: "none",
      CI: "1",
      NUXT_IGNORE_LOCK: "1",
      NUXT_BACKEND_ORIGIN: backendBaseUrl,
      NUXT_PUBLIC_API_BASE_URL: "/api/v1/public/community",
      NUXT_PUBLIC_AUTH_API_BASE_URL: "/api/v1",
      NUXT_PUBLIC_API_MOCK: "false"
    }),
    logFile: path.join(workPath, "frontend.log")
  })
  await waitForHtml(frontendBaseUrl)

  const { chromium } = require(playwrightModulePath)
  const browser = await chromium.launch({ headless: true })
  try {
    const results = []
    const viewports = [
      { name: "desktop", width: 1440, height: 900 },
      { name: "mobile", width: 390, height: 844 }
    ]
    for (let viewportIndex = 0; viewportIndex < viewports.length; viewportIndex++) {
      const viewport = viewports[viewportIndex]
      if (viewportIndex > 0) {
        console.log("Waiting for the real backend public auth rate-limit window before the next viewport...")
        await delay(61_000)
      }
      const context = await browser.newContext({ viewport })
      const page = await context.newPage()
      const consoleErrors = []
      const failedRequests = []

      page.on("console", (message) => {
        if (message.type() === "error") {
          const text = message.text()
          if (text.includes("Failed to load resource") && text.includes("401")) {
            return
          }
          if (text.includes("[nuxt] Error fetching app manifest")) {
            return
          }
          consoleErrors.push(text)
        }
      })
      page.on("requestfailed", (request) => {
        const url = request.url()
        if (!url.includes("/__nuxt") && !url.includes("/_nuxt/") && (url.startsWith(frontendBaseUrl) || url.startsWith(backendBaseUrl))) {
          failedRequests.push(`${request.method()} ${url}: ${request.failure()?.errorText || "failed"}`)
        }
      })

      const account = accountCredentials(viewport)
      const auth = await checkAuthPages(page, viewport, account)
      const home = await checkHomePage(page, viewport)
      const category = await checkCategoryPage(page, viewport)
      const search = await checkSearchPage(page, viewport)
      const creator = await checkCreatorPage(page, viewport)
      await ensureBrowserAccountSession(page, account, "account business flows")
      const accountFollow = await checkCreatorAccountFlow(page, viewport)
      const following = await checkFollowingPage(page, viewport)
      const video = await checkVideoPage(page, viewport)
      const history = await checkHistoryPage(page, viewport)
      const collections = await checkCollectionsPage(page, viewport)
      const notifications = await checkNotificationsPage(page, viewport)
      const upload = await checkUploadPage(page, viewport)
      const settings = await checkSettingsPage(page, viewport)
      await context.close()

      if (consoleErrors.length > 0) {
        throw new Error(`Browser console errors on ${viewport.name}: ${consoleErrors.join(" | ")}`)
      }
      if (failedRequests.length > 0) {
        throw new Error(`Failed requests on ${viewport.name}: ${failedRequests.join(" | ")}`)
      }

      results.push({ viewport: viewport.name, auth, home, category, search, accountFollow, following, video, creator, history, collections, notifications, upload, settings })
    }

    for (const result of results) {
      console.log(`[${result.viewport}] auth account=${result.auth.accountHandle}, relogin=${result.auth.relogin}; home videos=${result.home.videoCards}, dynamics=${result.home.dynamicCards}; category cards=${result.category.categoryCards}, maxCardWidth=${result.category.maxCategoryCardWidth}px; search videos=${result.search.videoCards}, creators=${result.search.creatorCards}; creator videos=${result.creator.videoCards}, stats=${result.creator.statCards}, followRoundTrip=${result.accountFollow.roundTrip}; following dynamics=${result.following.dynamicCards}, actions=${result.following.ownerActions}; video comments=${result.video.commentItems}, danmaku=${result.video.danmakuItems}, favorite=${result.video.favoriteActive}, watchLater=${result.video.watchLaterActive}; history cards=${result.history.cards}; collections favorites=${result.collections.favoriteCards}, watchLater=${result.collections.watchLaterCards}; notifications cards=${result.notifications.cards}, unreadAfterRead=${result.notifications.unreadAfterRead}; upload panels=${result.upload.panels}, stats=${result.upload.statCards}; settings panels=${result.settings.panels}, endpoints=${result.settings.endpoints}`)
    }
    console.log(`Frontend community page smoke passed. Screenshots: ${screenshotsPath}`)
  } finally {
    await browser.close()
    await shutdown()
    cleanupBulkyArtifacts()
  }
}

async function seedCommunityPageSmokeData(adminSession) {
  const apiRoot = `${backendBaseUrl}/api/v1`
  const clientId = `page-smoke-client-${runId}`
  const title = `Aoi page smoke real video ${runId}`
  const sourceUrl = `https://example.invalid/page-smoke-${runId}.mp4`
  const initialHome = await requestJson(`${communityApiBaseUrl}/home`)

  if (!Array.isArray(initialHome.data?.categories) || initialHome.data.categories.length < 1) {
    throw new Error("Community home endpoint returned no category taxonomy before page smoke seeding")
  }
  if ((initialHome.data?.latest?.items || []).length !== 0 || (initialHome.data?.dynamics?.items || []).length !== 0) {
    throw new Error("Fresh page smoke database should not contain videos or dynamics before API seeding")
  }
  if (!csrfToken(adminSession)) {
    throw new Error("Page smoke requires an admin session from initial setup before reviewing seeded submissions")
  }

  const submission = await requestJson(`${communityApiBaseUrl}/submissions`, {
    method: "POST",
    body: {
      allowComments: true,
      authorName: "Page Smoke Creator",
      categorySlug: "design",
      clientId,
      description: "Real API seeded submission for frontend page smoke verification",
      sensitive: false,
      sourceName: "page-smoke-real-video.mp4",
      sourceSize: 2048000,
      sourceType: "video/mp4",
      tags: ["page-smoke", "real-api"],
      title,
      visibility: "public"
    }
  })

  if (submission.data?.status !== "pending_review" || !submission.data?.id) {
    throw new Error(`Community submission seed did not enter pending review: ${JSON.stringify(submission)}`)
  }

  const reviewQueue = await requestJson(`${apiRoot}/community/submissions?status=pending_review&limit=8`, {
    session: adminSession
  })
  const queued = reviewQueue.data?.items?.items?.find((item) => item.id === submission.data.id)
  if (!queued) {
    throw new Error("Community review queue did not include the page smoke submission")
  }

  await requestJson(`${apiRoot}/community/submissions/${encodeURIComponent(submission.data.id)}/review`, {
    method: "PATCH",
    session: adminSession,
    headers: csrfHeaders(adminSession),
    body: {
      reviewNote: "Page smoke approved",
      status: "approved"
    }
  })

  const published = await requestJson(`${apiRoot}/community/submissions/${encodeURIComponent(submission.data.id)}/review`, {
    method: "PATCH",
    session: adminSession,
    headers: csrfHeaders(adminSession),
    body: {
      durationSeconds: 128,
      sourceUrl,
      status: "published",
      thumbnailUrl: "gradient:page-smoke-real-video"
    }
  })

  if (published.data?.status !== "published" || !published.data?.publishedVideoId) {
    throw new Error(`Community submission seed did not publish a video: ${JSON.stringify(published)}`)
  }

  const detail = await requestJson(`${communityApiBaseUrl}/videos/${encodeURIComponent(published.data.publishedVideoId)}`)
  if (detail.data?.title !== title || !detail.data?.slug || !detail.data?.uploader?.handle) {
    throw new Error(`Seeded video detail did not match the published submission: ${JSON.stringify(detail)}`)
  }

  await requestJson(`${communityApiBaseUrl}/videos/${encodeURIComponent(detail.data.slug)}/comments`, {
    method: "POST",
    body: {
      authorName: "Page Smoke Viewer",
      body: "Page smoke seeded comment",
      clientId
    }
  })

  await requestJson(`${communityApiBaseUrl}/dynamics`, {
    method: "POST",
    body: {
      authorName: "Page Smoke Creator",
      body: "Page smoke seeded dynamic",
      clientId,
      videoId: detail.data.id
    }
  })

  return {
    clientId,
    creatorHandle: detail.data.uploader.handle,
    creatorName: detail.data.uploader.displayName,
    searchQuery: "Aoi",
    sourceUrl,
    videoId: detail.data.id,
    videoSlug: detail.data.slug,
    videoTitle: title
  }
}

function requireSeededCommunity() {
  if (!seededCommunity) {
    throw new Error("Page smoke community data has not been seeded")
  }
  return seededCommunity
}

function accountCredentials(viewport) {
  const normalizedViewport = String(viewport.name || "viewport").replace(/[^a-z0-9]+/gi, "_").toLowerCase()

  return {
    displayName: `Page Smoke ${normalizedViewport}`,
    email: `community-page-${normalizedViewport}-${runId}@example.com`,
    password: "Password123!",
    username: `page_smoke_${normalizedViewport}_${runId}`
  }
}

async function checkAuthPages(page, viewport, account) {
  await page.goto(`${frontendBaseUrl}/register`, { waitUntil: "networkidle" })
  await page.waitForSelector(".auth-page .auth-panel", { timeout: timeoutMs })
  await setAoiTextFields(page, ".auth-panel .aoi-text-field", [
    account.username,
    account.displayName,
    account.email,
    account.password
  ])
  await submitForm(page, ".auth-panel")
  await page.waitForSelector(".auth-panel .aoi-status-message--success", { timeout: timeoutMs })
  await page.waitForFunction(() => document.cookie.includes("console_csrf="), null, { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "register")
  await verifySharedLayout(page, viewport, "register")

  await page.goto(`${frontendBaseUrl}/login`, { waitUntil: "networkidle" })
  await page.waitForSelector(".auth-session-card", { timeout: timeoutMs })
  await page.waitForFunction((displayName) => {
    return document.querySelector(".auth-session-card")?.textContent?.includes(displayName)
  }, account.displayName, { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "login-session")
  await verifySharedLayout(page, viewport, "login-session")

  await clickVisibleElement(page, ".auth-session-card .aoi-button")
  await page.waitForSelector(".auth-panel", { timeout: timeoutMs })
  await setAoiTextFields(page, ".auth-panel .aoi-text-field", [
    account.email,
    "WrongPassword123!"
  ])
  await submitForm(page, ".auth-panel")
  await page.waitForSelector(".auth-panel .aoi-status-message--danger", { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "login-error")
  await verifySharedLayout(page, viewport, "login-error")

  await setAoiTextFields(page, ".auth-panel .aoi-text-field", [
    account.email,
    account.password
  ])
  await submitForm(page, ".auth-panel")
  await page.waitForSelector(".auth-session-card", { timeout: timeoutMs })
  await page.waitForFunction((displayName) => {
    return document.querySelector(".auth-session-card")?.textContent?.includes(displayName)
  }, account.displayName, { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "login")
  await verifySharedLayout(page, viewport, "login")

  return {
    accountHandle: account.username,
    relogin: true
  }
}

async function ensureBrowserAccountSession(page, account, label) {
  const session = await page.evaluate(async ({ account: expectedAccount }) => {
    const request = async (pathName, options = {}) => {
      const response = await fetch(pathName, {
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...(options.headers || {})
        },
        ...options
      })
      const body = await response.json().catch(() => null)

      return {
        body,
        ok: response.ok,
        status: response.status
      }
    }
    const matchesAccount = (body) => {
      const accountData = body?.data?.account

      return Boolean(accountData) &&
        accountData.handle === expectedAccount.username &&
        accountData.displayName === expectedAccount.displayName &&
        !("roles" in accountData) &&
        !("permissions" in accountData) &&
        !("organization" in accountData)
    }

    let probe = await request("/api/v1/public/community/auth/session")
    if (probe.status === 200 && probe.body?.code === 0 && matchesAccount(probe.body)) {
      return {
        restored: false,
        session: probe.body.data
      }
    }

    const login = await request("/api/v1/public/community/auth/login", {
      body: JSON.stringify({
        identifier: expectedAccount.email,
        password: expectedAccount.password
      }),
      method: "POST"
    })
    if (login.status !== 200 || login.body?.code !== 0 || !matchesAccount(login.body)) {
      return {
        error: login.body || null,
        loginStatus: login.status,
        restored: false,
        session: null
      }
    }

    probe = await request("/api/v1/public/community/auth/session")
    return {
      restored: true,
      session: probe.status === 200 && probe.body?.code === 0 && matchesAccount(probe.body) ? probe.body.data : null,
      sessionStatus: probe.status
    }
  }, { account })

  if (!session.session) {
    throw new Error(`Community account session is not active before ${label}: ${JSON.stringify(session)}`)
  }

  return session
}

async function checkHomePage(page, viewport) {
  await page.goto(frontendBaseUrl, { waitUntil: "networkidle" })
  await page.waitForSelector(".brand-band", { timeout: timeoutMs })
  await page.waitForSelector(".video-card", { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "home")
  await verifySharedLayout(page, viewport, "home")

  return await page.evaluate(() => {
    const brandBand = document.querySelector(".brand-band")
    const brandInner = document.querySelector(".brand-band__inner")
    const readSurface = (element) => {
      const style = window.getComputedStyle(element)
      return {
        backgroundColor: style.backgroundColor,
        borderTopWidth: style.borderTopWidth,
        boxShadow: style.boxShadow
      }
    }
    const home = {
      dynamicCards: document.querySelectorAll(".community-pulse__card").length,
      hero: readSurface(brandBand),
      heroInner: readSurface(brandInner),
      videoCards: document.querySelectorAll(".video-card").length
    }

    if (document.querySelector(".page-state__title")?.textContent?.includes("失败")) {
      throw new Error("Home page rendered an API failure state")
    }
    if (home.videoCards < 1 || home.dynamicCards < 1) {
      throw new Error(`Home page did not render backend feed data: ${JSON.stringify(home)}`)
    }
    if (
      home.hero.backgroundColor !== "rgba(0, 0, 0, 0)" ||
      home.hero.borderTopWidth !== "0px" ||
      home.hero.boxShadow !== "none" ||
      home.heroInner.backgroundColor !== "rgba(0, 0, 0, 0)" ||
      home.heroInner.borderTopWidth !== "0px" ||
      home.heroInner.boxShadow !== "none"
    ) {
      throw new Error(`Home brand band surface is not transparent: ${JSON.stringify(home)}`)
    }

    return home
  })
}

async function checkCategoryPage(page, viewport) {
  await page.goto(`${frontendBaseUrl}/category`, { waitUntil: "networkidle" })
  await page.waitForSelector(".category-card", { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "category")
  await verifySharedLayout(page, viewport, "category")

  return await page.evaluate(() => {
    const text = document.body.innerText
    const cards = Array.from(document.querySelectorAll(".category-card")).map((element) => {
      const box = element.getBoundingClientRect()
      return {
        height: Math.round(box.height),
        width: Math.round(box.width)
      }
    })
    const maxCategoryCardWidth = cards.reduce((max, item) => Math.max(max, item.width), 0)
    const category = {
      categoryCards: cards.length,
      hasBackendCategory: text.includes("创作") || text.includes("知识"),
      maxCategoryCardWidth
    }

    if (document.querySelector(".page-state__title")?.textContent?.includes("失败")) {
      throw new Error("Category page rendered an API failure state")
    }
    if (category.categoryCards < 5 || !category.hasBackendCategory) {
      throw new Error(`Category page did not render backend category data: ${JSON.stringify(category)}`)
    }
    if (window.innerWidth >= 640 && maxCategoryCardWidth > 270) {
      throw new Error(`Category cards are too wide for the compact map layout: ${JSON.stringify({ cards, maxCategoryCardWidth })}`)
    }

    return category
  })
}

async function checkSearchPage(page, viewport) {
  const seed = requireSeededCommunity()
  await page.goto(`${frontendBaseUrl}/search`, { waitUntil: "networkidle" })
  await page.waitForSelector(".search-toolbar input", { timeout: timeoutMs })
  await page.fill(".search-toolbar input", seed.searchQuery)
  await page.press(".search-toolbar input", "Enter")
  await page.waitForURL((url) => new URL(url).searchParams.get("q") === seed.searchQuery, { timeout: timeoutMs })
  await page.waitForSelector(".search-results .video-card", { timeout: timeoutMs })
  await page.waitForLoadState("networkidle")
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "search")
  await verifySharedLayout(page, viewport, "search")

  return await page.evaluate((seeded) => {
    const text = document.body.innerText
    const search = {
      categoryCards: document.querySelectorAll(".search-results .category-card").length,
      creatorCards: document.querySelectorAll(".search-results .creator-card").length,
      hasBackendResult: text.includes(seeded.videoTitle),
      videoCards: document.querySelectorAll(".search-results .video-card").length
    }

    if (document.querySelector(".page-state__title")?.textContent?.includes("失败")) {
      throw new Error("Search page rendered an API failure state")
    }
    if (search.videoCards < 1 || !search.hasBackendResult) {
      throw new Error(`Search page did not render backend search data: ${JSON.stringify(search)}`)
    }

    return search
  }, seed)
}

async function checkFollowingPage(page, viewport) {
  await page.goto(`${frontendBaseUrl}/feed/following`, { waitUntil: "networkidle" })
  await page.waitForSelector(".following-page", { timeout: timeoutMs })
  await page.waitForSelector(".comment-composer", { timeout: timeoutMs })
  const dynamicPost = page.waitForResponse((response) => {
    return response.request().method() === "POST" &&
      response.url().includes("/api/v1/public/community/account/dynamics") &&
      response.status() === 200
  })
  await setAoiTextFields(page, ".comment-composer .aoi-text-field", [
    "Page smoke account author",
    "Page smoke owned dynamic"
  ])
  await submitForm(page, ".comment-composer")
  await dynamicPost
  await page.waitForSelector(".following-page .community-pulse__card", { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "following")
  await verifySharedLayout(page, viewport, "following")

  return await page.evaluate(() => {
    const following = {
      dynamicCards: document.querySelectorAll(".following-page .community-pulse__card").length,
      accountDynamicSubmitted: true,
      ownerActions: document.querySelectorAll(".following-page .community-pulse__actions .aoi-icon-button").length
    }

    if (document.querySelector(".page-state__title")?.textContent?.includes("失败")) {
      throw new Error("Following page rendered an API failure state")
    }
    if (following.dynamicCards < 1) {
      throw new Error(`Following page did not render account-scoped feed data: ${JSON.stringify(following)}`)
    }

    return following
  })
}

async function checkVideoPage(page, viewport) {
  const seed = requireSeededCommunity()
  // Keep this smoke focused on community data and page layout; media byte availability belongs to player/media checks.
  await page.route(/https?:\/\/.*\.mp4(\?.*)?$/i, async (route) => {
    await route.fulfill({
      body: Buffer.alloc(0),
      contentType: "video/mp4",
      headers: {
        "accept-ranges": "bytes",
        "content-length": "0"
      },
      status: 200
    })
  })
  await page.goto(`${frontendBaseUrl}/video/${encodeURIComponent(seed.videoSlug)}`, { waitUntil: "networkidle" })
  await page.waitForSelector(".video-watch", { timeout: timeoutMs })
  await page.waitForSelector(".aoi-video-player", { timeout: timeoutMs })
  await page.waitForSelector(".creator-card", { timeout: timeoutMs })
  await page.waitForSelector(".comment-thread", { timeout: timeoutMs })
  await page.waitForSelector(".comment-thread__item", { timeout: timeoutMs })
  await page.waitForSelector(".video-watch-details__actions .aoi-button", { timeout: timeoutMs })
  await clickVisibleElement(page, ".video-watch-details__actions .aoi-button", "收藏|Favorite|お気に入り")
  await waitForVisibleText(page, ".video-watch-details__actions .aoi-button", "已收藏|Favorited|お気に入り済み")
  await clickVisibleElement(page, ".video-watch-details__actions .aoi-button", "稍后看|Watch Later|あとで見る|後で見る")
  await waitForVisibleText(page, ".video-watch-details__actions .aoi-button", "已加入稍后看|Added to watch later|あとで見るに追加済み")
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "video")
  await verifySharedLayout(page, viewport, "video")

  return await page.evaluate((seeded) => {
    const text = document.body.innerText
    const playerBox = document.querySelector(".aoi-video-player")?.getBoundingClientRect()
    const video = {
      commentItems: document.querySelectorAll(".comment-thread__item").length,
      creatorCards: document.querySelectorAll(".creator-card").length,
      danmakuItems: document.querySelectorAll(".aoi-danmaku-layer__item").length,
      favoriteActive: /已收藏|Favorited|お気に入り済み/.test(text),
      hasBackendVideo: text.includes(seeded.videoTitle),
      playerHeight: Math.round(playerBox?.height || 0),
      playerWidth: Math.round(playerBox?.width || 0),
      watchLaterActive: /已加入稍后看|Added to watch later|あとで見るに追加済み/.test(text)
    }

    if (document.querySelector(".page-state__title")?.textContent?.includes("失败")) {
      throw new Error("Video page rendered an API failure state")
    }
    if (!video.hasBackendVideo || video.commentItems < 1 || video.creatorCards < 1) {
      throw new Error(`Video page did not render backend detail data: ${JSON.stringify(video)}`)
    }
    if (!video.favoriteActive || !video.watchLaterActive) {
      throw new Error(`Video page account interactions did not persist favorite and watch-later state: ${JSON.stringify(video)}`)
    }
    if (video.playerWidth < 280 || video.playerHeight < 150) {
      throw new Error(`Video player surface is not correctly framed: ${JSON.stringify(video)}`)
    }

    return video
  }, seed)
}

async function checkHistoryPage(page, viewport) {
  const seed = requireSeededCommunity()
  await page.goto(`${frontendBaseUrl}/history`, { waitUntil: "networkidle" })
  await page.waitForSelector(".history-entry-card", { timeout: timeoutMs })
  await page.waitForFunction((title) => document.body.innerText.includes(title), seed.videoTitle, { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "history")
  await verifySharedLayout(page, viewport, "history")

  return await page.evaluate((seeded) => {
    const history = {
      cards: document.querySelectorAll(".history-entry-card").length,
      hasBackendVideo: document.body.innerText.includes(seeded.videoTitle)
    }

    if (history.cards < 1 || !history.hasBackendVideo) {
      throw new Error(`History page did not render account-scoped video history: ${JSON.stringify(history)}`)
    }

    return history
  }, seed)
}

async function checkCollectionsPage(page, viewport) {
  const seed = requireSeededCommunity()
  await page.goto(`${frontendBaseUrl}/collections`, { waitUntil: "networkidle" })
  await page.waitForSelector(".collections-page", { timeout: timeoutMs })
  await page.waitForSelector(".collections-page .video-card", { timeout: timeoutMs })
  await page.waitForFunction((title) => document.body.innerText.includes(title), seed.videoTitle, { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "collections")
  await verifySharedLayout(page, viewport, "collections")

  const favoriteCards = await page.evaluate((seeded) => {
    return {
      cards: document.querySelectorAll(".collections-page .video-card").length,
      hasBackendVideo: document.body.innerText.includes(seeded.videoTitle)
    }
  }, seed)
  if (favoriteCards.cards < 1 || !favoriteCards.hasBackendVideo) {
    throw new Error(`Collections page did not render account-scoped favorites: ${JSON.stringify(favoriteCards)}`)
  }

  await clickVisibleElement(page, ".collections-page .aoi-tabs md-primary-tab", "稍后看|Watch Later|あとで見る|後で見る")
  await page.waitForFunction((title) => document.body.innerText.includes(title), seed.videoTitle, { timeout: timeoutMs })
  const watchLaterCards = await page.evaluate((seeded) => {
    return {
      cards: document.querySelectorAll(".collections-page .video-card").length,
      hasBackendVideo: document.body.innerText.includes(seeded.videoTitle)
    }
  }, seed)
  if (watchLaterCards.cards < 1 || !watchLaterCards.hasBackendVideo) {
    throw new Error(`Collections page did not render account-scoped watch-later items: ${JSON.stringify(watchLaterCards)}`)
  }

  return {
    favoriteCards: favoriteCards.cards,
    watchLaterCards: watchLaterCards.cards
  }
}

async function checkNotificationsPage(page, viewport) {
  await page.goto(`${frontendBaseUrl}/notifications`, { waitUntil: "networkidle" })
  await page.waitForSelector(".notifications-page", { timeout: timeoutMs })
  await page.waitForSelector(".notification-card", { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "notifications")
  await verifySharedLayout(page, viewport, "notifications")

  const beforeRead = await page.evaluate(() => ({
    cards: document.querySelectorAll(".notification-card").length,
    unread: document.querySelectorAll(".notification-card--unread").length
  }))
  if (beforeRead.cards < 1) {
    throw new Error(`Notifications page did not render account-scoped notifications: ${JSON.stringify(beforeRead)}`)
  }

  if (beforeRead.unread > 0) {
    await clickVisibleElement(page, ".notifications-page .aoi-button", "全部已读|Mark all read|すべて既読")
    await page.waitForFunction(() => document.querySelectorAll(".notification-card--unread").length === 0, null, { timeout: timeoutMs })
  }

  return {
    cards: beforeRead.cards,
    unreadAfterRead: await page.evaluate(() => document.querySelectorAll(".notification-card--unread").length)
  }
}

async function checkCreatorPage(page, viewport) {
  const seed = requireSeededCommunity()
  await page.goto(`${frontendBaseUrl}/u/${encodeURIComponent(seed.creatorHandle)}`, { waitUntil: "networkidle" })
  await page.waitForSelector(".creator-profile", { timeout: timeoutMs })
  await page.waitForSelector(".creator-profile__stats", { timeout: timeoutMs })
  await page.waitForSelector(".video-card", { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "creator")
  await verifySharedLayout(page, viewport, "creator")

  return await page.evaluate((seeded) => {
    const text = document.body.innerText
    const creator = {
      hasBackendCreator: text.includes(seeded.creatorName) || text.includes(`@${seeded.creatorHandle}`),
      statCards: document.querySelectorAll(".creator-profile__stats .aoi-stat-grid__item").length,
      tagItems: document.querySelectorAll(".aoi-tag-list a, .aoi-tag-list button").length,
      videoCards: document.querySelectorAll(".creator-page .video-card").length
    }

    if (!creator.hasBackendCreator || creator.statCards < 3 || creator.videoCards < 1) {
      throw new Error(`Creator page did not render backend creator data: ${JSON.stringify(creator)}`)
    }

    return creator
  }, seed)
}

async function checkCreatorAccountFlow(page, viewport) {
  const seed = requireSeededCommunity()
  await page.goto(`${frontendBaseUrl}/u/${encodeURIComponent(seed.creatorHandle)}`, { waitUntil: "networkidle" })
  await page.waitForSelector(".creator-profile", { timeout: timeoutMs })

  await clickVisibleElement(page, ".creator-profile__content .aoi-button, .creator-profile__mobile-actions .aoi-button", "关注|Follow|フォロー")
  await waitForVisibleText(page, ".creator-profile .aoi-button", "已关注|Following|フォロー中")
  await clickVisibleElement(page, ".creator-profile__content .aoi-button, .creator-profile__mobile-actions .aoi-button", "已关注|Following|フォロー中")
  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll(".creator-profile .aoi-button")).some((element) => {
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      const text = element.textContent?.trim() || ""

      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        /^(关注|Follow|フォロー)$/.test(text)
    })
  }, null, { timeout: timeoutMs })
  await clickVisibleElement(page, ".creator-profile__content .aoi-button, .creator-profile__mobile-actions .aoi-button", "关注|Follow|フォロー")
  await waitForVisibleText(page, ".creator-profile .aoi-button", "已关注|Following|フォロー中")

  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "creator-account")
  await verifySharedLayout(page, viewport, "creator-account")

  const accountFollow = await page.evaluate(() => {
    const text = document.body.innerText

    return {
      followed: /已关注|Following|フォロー中/.test(text),
      roundTrip: true
    }
  })

  if (!accountFollow.followed) {
    throw new Error(`Creator account follow flow did not leave the creator followed: ${JSON.stringify(accountFollow)}`)
  }

  return accountFollow
}

async function checkUploadPage(page, viewport) {
  await page.goto(`${frontendBaseUrl}/upload`, { waitUntil: "networkidle" })
  await page.waitForSelector(".upload-page", { timeout: timeoutMs })
  await page.waitForSelector(".upload-drop-zone", { timeout: timeoutMs })
  await page.waitForSelector(".upload-workspace", { timeout: timeoutMs })
  await page.setInputFiles("input[type=file]", {
    buffer: Buffer.alloc(32 * 1024),
    mimeType: "video/mp4",
    name: "aoi-community-draft-with-extra-long-mobile-title-and-readable-boundary.mp4"
  })
  await page.waitForFunction(() => document.body.innerText.includes("aoi-community-draft-with-extra-long-mobile-title"), { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "upload")
  await verifySharedLayout(page, viewport, "upload")

  return await page.evaluate(() => {
    const fileName = document.querySelector(".upload-drop-zone__copy strong")
    const fileNameStyle = fileName ? window.getComputedStyle(fileName) : null
    const upload = {
      fileNameWhiteSpace: fileNameStyle?.whiteSpace || "",
      hasLongFileName: document.body.innerText.includes("aoi-community-draft-with-extra-long-mobile-title"),
      panels: document.querySelectorAll(".upload-panel").length,
      statCards: document.querySelectorAll(".upload-page__stats .aoi-stat-grid__item").length,
      submissionCards: document.querySelectorAll(".upload-submission-list__item").length
    }

    if (!upload.hasLongFileName || upload.panels < 3 || upload.statCards < 4) {
      throw new Error(`Upload page did not render draft workspace and API-backed categories: ${JSON.stringify(upload)}`)
    }
    if (window.innerWidth < 640 && upload.fileNameWhiteSpace === "nowrap") {
      throw new Error(`Upload page long file name is still forced to one line on mobile: ${JSON.stringify(upload)}`)
    }

    return upload
  })
}

async function checkSettingsPage(page, viewport) {
  await page.evaluate(() => {
    window.localStorage.setItem("aoi.appSettings.v1", JSON.stringify({ settingsDisplayDepth: "all" }))
  })
  await page.goto(`${frontendBaseUrl}/settings/advanced`, { waitUntil: "networkidle" })
  await page.waitForURL((url) => new URL(url).pathname === "/settings/advanced", { timeout: timeoutMs })
  await page.waitForSelector(".settings-shell", { timeout: timeoutMs })
  await page.waitForSelector(".settings-page", { timeout: timeoutMs })
  await page.waitForSelector(".settings-endpoint-list code", { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await capturePageScreenshot(page, viewport, "settings")
  await verifySharedLayout(page, viewport, "settings")

  return await page.evaluate(() => {
    const text = document.body.innerText
    const settings = {
      dataCards: document.querySelectorAll(".settings-data-action-card").length,
      endpoints: document.querySelectorAll(".settings-endpoint-list code").length,
      hasGoStatus: text.includes("go"),
      panels: document.querySelectorAll(".settings-panel").length
    }

    if (!settings.hasGoStatus || settings.endpoints < 4 || settings.panels < 4 || settings.dataCards < 4) {
      throw new Error(`Settings advanced page did not render real API status and local data panels: ${JSON.stringify(settings)}`)
    }

    return settings
  })
}

async function setAoiTextFields(page, selector, values) {
  await page.evaluate(({ selector: fieldSelector, values: fieldValues }) => {
    const fields = Array.from(document.querySelectorAll(fieldSelector))
    if (fields.length < fieldValues.length) {
      throw new Error(`Expected at least ${fieldValues.length} text fields for ${fieldSelector}, got ${fields.length}`)
    }

    for (let index = 0; index < fieldValues.length; index++) {
      const field = fields[index]
      const value = fieldValues[index]
      const internalControl = field.shadowRoot?.querySelector("input, textarea")

      field.value = value
      if (internalControl) {
        internalControl.value = value
        internalControl.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
        internalControl.dispatchEvent(new Event("change", { bubbles: true, composed: true }))
      }
      field.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
      field.dispatchEvent(new Event("change", { bubbles: true, composed: true }))
    }
  }, { selector, values })
  await delay(80)
}

async function submitForm(page, selector) {
  const submitted = await page.evaluate((formSelector) => {
    const form = document.querySelector(formSelector)
    if (!form || typeof form.requestSubmit !== "function") {
      return false
    }
    form.requestSubmit()
    return true
  }, selector)
  if (!submitted) {
    throw new Error(`Unable to submit form: ${selector}`)
  }
  await delay(120)
}

async function clickVisibleElement(page, selector, labelPattern = "") {
  const clicked = await page.evaluate(({ selector: targetSelector, labelPattern: targetPattern }) => {
    const pattern = targetPattern ? new RegExp(targetPattern, "i") : null
    const candidates = Array.from(document.querySelectorAll(targetSelector))
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)

        return rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          !element.hasAttribute("disabled") &&
          element.disabled !== true
      })
    const target = candidates.find((element) => {
      if (!pattern) {
        return true
      }
      const label = `${element.textContent || ""} ${element.getAttribute("aria-label") || ""}`

      return pattern.test(label)
    })

    if (!target) {
      return null
    }
    target.click()

    return {
      ariaLabel: target.getAttribute("aria-label") || "",
      text: target.textContent?.trim() || ""
    }
  }, { selector, labelPattern })

  if (!clicked) {
    throw new Error(`No visible clickable element matched ${selector}${labelPattern ? ` / ${labelPattern}` : ""}`)
  }
  await delay(160)
  return clicked
}

async function waitForVisibleText(page, selector, labelPattern) {
  await page.waitForFunction(({ selector: targetSelector, labelPattern: targetPattern }) => {
    const pattern = new RegExp(targetPattern, "i")

    return Array.from(document.querySelectorAll(targetSelector)).some((element) => {
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      const label = `${element.textContent || ""} ${element.getAttribute("aria-label") || ""}`

      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        pattern.test(label)
    })
  }, { selector, labelPattern }, { timeout: timeoutMs })
}

async function verifySharedLayout(page, viewport, pageName) {
  const layout = await page.evaluate(() => {
    const documentElement = document.documentElement
    const body = document.body
    const scrollWidth = Math.max(documentElement.scrollWidth, body.scrollWidth)
    const pageStateTitles = Array.from(document.querySelectorAll(".page-state__title"))
      .map((item) => item.textContent?.trim() || "")
      .filter(Boolean)

    return {
      pageStateTitles,
      scrollWidth,
      viewportWidth: window.innerWidth
    }
  })

  if (layout.scrollWidth > layout.viewportWidth + 2) {
    throw new Error(`${pageName} page has horizontal overflow: ${JSON.stringify(layout)}`)
  }

  const failedState = layout.pageStateTitles.find((title) => /失败|不可用|failed|error/i.test(title))
  if (failedState) {
    throw new Error(`${pageName} page rendered a failure state: ${failedState}`)
  }

  if (viewport.width < 640) {
    await verifyMobileBottomClearance(page, pageName)
  }
}

async function verifyMobileBottomClearance(page, pageName) {
  const originalScrollY = await page.evaluate(() => window.scrollY)

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await delay(100)

  const clearance = await page.evaluate(() => {
    const dock = document.querySelector(".bottom-nav")

    if (!dock) {
      return { skipped: true }
    }

    const dockRect = dock.getBoundingClientRect()
    const candidates = Array.from(document.querySelectorAll([
      ".brand-band",
      ".auth-panel",
      ".auth-session-card",
      ".category-card",
      ".collections-page .aoi-section",
      ".collections-page .aoi-tabs",
      ".collections-page .video-grid",
      ".search-results",
      ".video-watch",
      ".comment-thread",
      ".creator-profile",
      ".creator-page .video-grid",
      ".history-entry-card",
      ".notification-card",
      ".upload-workspace",
      ".upload-panel",
      ".settings-panel"
    ].join(",")))
      .map((element) => {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)

        return {
          bottom: rect.bottom,
          height: rect.height,
          position: style.position,
          top: rect.top
        }
      })
      .filter((item) => item.height > 0 && item.position !== "fixed")

    const lastBottom = candidates.reduce((max, item) => Math.max(max, item.bottom), 0)

    return {
      dockTop: dockRect.top,
      lastBottom,
      skipped: false
    }
  })

  await page.evaluate((scrollY) => window.scrollTo(0, scrollY), originalScrollY)

  if (!clearance.skipped && clearance.lastBottom > clearance.dockTop - 8) {
    throw new Error(`${pageName} page bottom content can sit under the mobile dock: ${JSON.stringify(clearance)}`)
  }
}

async function capturePageScreenshot(page, viewport, pageName) {
  await page.screenshot({
    path: path.join(screenshotsPath, `${pageName}-${viewport.name}.png`),
    fullPage: viewport.width >= 640
  })
}

async function stabilizeScreenshotState(page) {
  await page.addStyleTag({
    content: `
      :root[data-aoi-reveal-motion="disabled"] .aoi-reveal[data-aoi-reveal-ready="true"],
      .aoi-reveal[data-aoi-reveal-ready="true"] {
        opacity: 1 !important;
        transform: none !important;
        transition: none !important;
        will-change: auto !important;
      }
    `
  })
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-aoi-reveal-motion", "disabled")
    document.querySelectorAll(".aoi-reveal").forEach((element) => {
      element.setAttribute("data-aoi-reveal-state", "in")
    })
  })
  await delay(80)
}

function startProcess(command, args, options) {
  const output = fs.createWriteStream(options.logFile, { flags: "w" })
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  })

  child.stdout.pipe(output)
  child.stderr.pipe(output)
  child.on("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM") {
      console.error(`${path.basename(command)} exited with code ${code}`)
    }
  })

  return { child, output, logFile: options.logFile }
}

async function waitForJson(url, validate) {
  const response = await waitForResponse(url)
  const json = await response.json()
  if (!validate(json)) {
    throw new Error(`Unexpected JSON response from ${url}: ${JSON.stringify(json)}`)
  }
  return json
}

async function postJson(url, body, session = null) {
  return requestJson(url, {
    body,
    method: "POST",
    session
  })
}

async function requestJson(url, options = {}) {
  const headers = { ...(options.headers || {}) }
  const init = {
    headers,
    method: options.method || "GET"
  }
  if (options.body !== undefined) {
    headers["content-type"] = headers["content-type"] || "application/json"
    init.body = JSON.stringify(options.body)
  }
  if (options.session) {
    const cookie = cookieHeader(options.session)
    if (cookie) {
      headers.cookie = cookie
    }
  }

  const response = await fetch(url, init)
  if (options.session) {
    mergeSetCookie(options.session, response)
  }
  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch (error) {
    throw new Error(`Unexpected non-JSON response from ${url}: HTTP ${response.status} ${text.slice(0, 300)}`)
  }
  if (!response.ok || !json || json.code !== 0) {
    throw new Error(`Unexpected JSON response from ${url}: HTTP ${response.status} ${JSON.stringify(json)}`)
  }
  return json
}

function createCookieSession() {
  return { cookies: new Map() }
}

function mergeSetCookie(session, response) {
  for (const header of setCookieHeaders(response.headers)) {
    const firstPart = header.split(";")[0]
    const separator = firstPart.indexOf("=")
    if (separator <= 0) {
      continue
    }
    const name = firstPart.slice(0, separator).trim()
    const value = firstPart.slice(separator + 1).trim()
    if (!value || /;\s*max-age=0\b/i.test(header)) {
      session.cookies.delete(name)
      continue
    }
    session.cookies.set(name, value)
  }
}

function setCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie()
  }
  const value = headers.get("set-cookie")
  if (!value) {
    return []
  }
  return value.split(/,(?=\s*[A-Za-z0-9!#$%&'*+.^_`|~-]+=)/)
}

function cookieHeader(session) {
  return Array.from(session.cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ")
}

function csrfToken(session) {
  return session.cookies.get("console_csrf") || ""
}

function csrfHeaders(session) {
  const token = csrfToken(session)
  if (!token) {
    throw new Error("CSRF token cookie was not set")
  }
  return { "X-CSRF-Token": token }
}

async function waitForHtml(url) {
  await waitForResponse(url, (response) => response.ok && String(response.headers.get("content-type") || "").includes("text/html"))
}

async function waitForResponse(url, validate = (response) => response.ok) {
  const startedAt = Date.now()
  let lastError = ""
  while (Date.now() - startedAt < timeoutMs) {
    for (const runtime of [backendProcess, frontendProcess]) {
      if (runtime && runtime.child.exitCode !== null) {
        const log = readTail(runtime.logFile)
        throw new Error(`Process for ${runtime.logFile} exited with ${runtime.child.exitCode}.\n${log}`)
      }
    }
    try {
      const response = await fetch(url)
      if (validate(response)) {
        return response
      }
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error.message
    }
    await delay(500)
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError}`)
}

async function shutdown() {
  for (const runtime of [frontendProcess, backendProcess]) {
    if (!runtime) {
      continue
    }
    if (runtime.child.exitCode === null) {
      runtime.child.kill()
      await Promise.race([
        onceExit(runtime.child),
        delay(5000)
      ])
      if (runtime.child.exitCode === null) {
        runtime.child.kill("SIGKILL")
      }
    }
    runtime.output.end()
  }
}

function cleanupBulkyArtifacts() {
  for (const target of [
    backendBinaryPath,
    path.join(workPath, "app.db"),
    path.join(workPath, "uploads"),
    path.join(workPath, "app.log")
  ]) {
    fs.rmSync(target, { force: true, recursive: true })
  }
}

function onceExit(child) {
  return new Promise((resolve) => {
    child.once("exit", resolve)
  })
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ensurePrerequisites() {
  for (const file of [backendConfigPath, nuxtEntryPath]) {
    if (!fs.existsSync(file)) {
      throw new Error(`Required file not found: ${file}`)
    }
  }
  if (!fs.existsSync(path.join(playwrightModulePath, "index.js"))) {
    throw new Error(`Playwright dependency not found: ${playwrightModulePath}`)
  }
}

function normalizedEnv(extra = {}) {
  const env = { ...process.env, ...extra }
  const pathValue = env.Path || env.PATH || ""
  delete env.PATH
  env.Path = pathValue
  return env
}

function readTail(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8")
    return content.split(/\r?\n/).slice(-80).join("\n")
  } catch {
    return ""
  }
}

function parseArgs(args) {
  const out = {}
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index]
    if (!key.startsWith("--")) {
      continue
    }
    out[key.slice(2)] = args[index + 1]
    index += 1
  }
  return out
}
