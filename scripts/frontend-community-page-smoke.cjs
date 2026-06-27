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

let backendProcess = null
let frontendProcess = null

main().catch(async (error) => {
  console.error(error.stack || error.message || String(error))
  await shutdown()
  cleanupBulkyArtifacts()
  process.exit(1)
})

async function main() {
  ensurePrerequisites()
  fs.mkdirSync(screenshotsPath, { recursive: true })

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
  await waitForJson(`${communityApiBaseUrl}/status`, (json) =>
    json.code === 0 &&
    json.data &&
    json.data.mode === "go" &&
    Array.isArray(json.data.endpoints) &&
    json.data.endpoints.includes("/home")
  )

  frontendProcess = startProcess(process.execPath, [nuxtEntryPath, "dev", "--host", "127.0.0.1", "--port", String(frontendPort)], {
    cwd: frontendPath,
    env: normalizedEnv({
      BROWSER: "none",
      CI: "1",
      NUXT_PUBLIC_API_BASE_URL: communityApiBaseUrl,
      NUXT_PUBLIC_AUTH_API_BASE_URL: `${backendBaseUrl}/api/v1`,
      NUXT_PUBLIC_API_MOCK: "false"
    }),
    logFile: path.join(workPath, "frontend.log")
  })
  await waitForHtml(frontendBaseUrl)

  const { chromium } = require(playwrightModulePath)
  const browser = await chromium.launch({ headless: true })
  try {
    const results = []
    for (const viewport of [
      { name: "desktop", width: 1440, height: 900 },
      { name: "mobile", width: 390, height: 844 }
    ]) {
      const page = await browser.newPage({ viewport })
      const consoleErrors = []
      const failedRequests = []

      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text())
        }
      })
      page.on("requestfailed", (request) => {
        const url = request.url()
        if (!url.includes("/__nuxt") && (url.startsWith(frontendBaseUrl) || url.startsWith(backendBaseUrl))) {
          failedRequests.push(`${request.method()} ${url}: ${request.failure()?.errorText || "failed"}`)
        }
      })

      const home = await checkHomePage(page, viewport)
      const category = await checkCategoryPage(page, viewport)
      const search = await checkSearchPage(page, viewport)
      const video = await checkVideoPage(page, viewport)
      await page.close()

      if (consoleErrors.length > 0) {
        throw new Error(`Browser console errors on ${viewport.name}: ${consoleErrors.join(" | ")}`)
      }
      if (failedRequests.length > 0) {
        throw new Error(`Failed requests on ${viewport.name}: ${failedRequests.join(" | ")}`)
      }

      results.push({ viewport: viewport.name, home, category, search, video })
    }

    for (const result of results) {
      console.log(`[${result.viewport}] home videos=${result.home.videoCards}, dynamics=${result.home.dynamicCards}; category cards=${result.category.categoryCards}, maxCardWidth=${result.category.maxCategoryCardWidth}px; search videos=${result.search.videoCards}, creators=${result.search.creatorCards}; video comments=${result.video.commentItems}, danmaku=${result.video.danmakuItems}`)
    }
    console.log(`Frontend community page smoke passed. Screenshots: ${screenshotsPath}`)
  } finally {
    await browser.close()
    await shutdown()
    cleanupBulkyArtifacts()
  }
}

async function checkHomePage(page, viewport) {
  await page.goto(frontendBaseUrl, { waitUntil: "networkidle" })
  await page.waitForSelector(".brand-band", { timeout: timeoutMs })
  await page.waitForSelector(".video-card", { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await page.screenshot({ path: path.join(screenshotsPath, `home-${viewport.name}.png`), fullPage: true })

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
    if (home.videoCards < 4 || home.dynamicCards < 1) {
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
  await page.screenshot({ path: path.join(screenshotsPath, `category-${viewport.name}.png`), fullPage: true })

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
  await page.goto(`${frontendBaseUrl}/search`, { waitUntil: "networkidle" })
  await page.waitForSelector(".search-toolbar input", { timeout: timeoutMs })
  await page.fill(".search-toolbar input", "Aoi")
  await page.press(".search-toolbar input", "Enter")
  await page.waitForURL((url) => new URL(url).searchParams.get("q") === "Aoi", { timeout: timeoutMs })
  await page.waitForSelector(".search-results .video-card", { timeout: timeoutMs })
  await page.waitForLoadState("networkidle")
  await stabilizeScreenshotState(page)
  await page.screenshot({ path: path.join(screenshotsPath, `search-${viewport.name}.png`), fullPage: true })

  return await page.evaluate(() => {
    const text = document.body.innerText
    const search = {
      categoryCards: document.querySelectorAll(".search-results .category-card").length,
      creatorCards: document.querySelectorAll(".search-results .creator-card").length,
      hasBackendResult: text.includes("Aoi Alpha") || text.includes("清透社区首页"),
      videoCards: document.querySelectorAll(".search-results .video-card").length
    }

    if (document.querySelector(".page-state__title")?.textContent?.includes("失败")) {
      throw new Error("Search page rendered an API failure state")
    }
    if (search.videoCards < 1 || !search.hasBackendResult) {
      throw new Error(`Search page did not render backend search data: ${JSON.stringify(search)}`)
    }

    return search
  })
}

async function checkVideoPage(page, viewport) {
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
  await page.goto(`${frontendBaseUrl}/video/aoi-alpha`, { waitUntil: "networkidle" })
  await page.waitForSelector(".video-watch", { timeout: timeoutMs })
  await page.waitForSelector(".aoi-video-player", { timeout: timeoutMs })
  await page.waitForSelector(".creator-card", { timeout: timeoutMs })
  await page.waitForSelector(".comment-thread", { timeout: timeoutMs })
  await page.waitForSelector(".comment-thread__item", { timeout: timeoutMs })
  await stabilizeScreenshotState(page)
  await page.screenshot({ path: path.join(screenshotsPath, `video-${viewport.name}.png`), fullPage: true })

  return await page.evaluate(() => {
    const text = document.body.innerText
    const playerBox = document.querySelector(".aoi-video-player")?.getBoundingClientRect()
    const video = {
      commentItems: document.querySelectorAll(".comment-thread__item").length,
      creatorCards: document.querySelectorAll(".creator-card").length,
      danmakuItems: document.querySelectorAll(".aoi-danmaku-layer__item").length,
      hasBackendVideo: text.includes("Aoi Alpha") || text.includes("清透社区首页"),
      playerHeight: Math.round(playerBox?.height || 0),
      playerWidth: Math.round(playerBox?.width || 0)
    }

    if (document.querySelector(".page-state__title")?.textContent?.includes("失败")) {
      throw new Error("Video page rendered an API failure state")
    }
    if (!video.hasBackendVideo || video.commentItems < 1 || video.creatorCards < 1) {
      throw new Error(`Video page did not render backend detail data: ${JSON.stringify(video)}`)
    }
    if (video.playerWidth < 280 || video.playerHeight < 150) {
      throw new Error(`Video player surface is not correctly framed: ${JSON.stringify(video)}`)
    }

    return video
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
