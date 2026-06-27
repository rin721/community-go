const apiMock = process.env.NUXT_PUBLIC_API_MOCK === "true"
const configuredBackendOrigin = process.env.NUXT_BACKEND_ORIGIN || ""
const backendOrigin = (
  configuredBackendOrigin
).trim().replace(/\/+$/, "")
const shouldProxyBackend = !apiMock && backendOrigin.length > 0
const developmentCommunityApiBaseURL = process.env.NODE_ENV === "development"
  ? "http://localhost:9999/api/v1/public/community"
  : "/api/v1/public/community"
const communityApiBaseURL = shouldProxyBackend
  ? "/api/v1/public/community"
  : process.env.NUXT_PUBLIC_API_BASE_URL || developmentCommunityApiBaseURL
const authApiBaseURL = shouldProxyBackend
  ? "/api/v1"
  : process.env.NUXT_PUBLIC_AUTH_API_BASE_URL || communityApiBaseURL.replace(/\/public\/community\/?$/, "")
const csrfCookieName = process.env.NUXT_PUBLIC_AUTH_CSRF_COOKIE_NAME || "console_csrf"
const csrfHeaderName = process.env.NUXT_PUBLIC_AUTH_CSRF_HEADER_NAME || "X-CSRF-Token"
const backendRouteRules = shouldProxyBackend
  ? {
      "/api/v1/**": { proxy: `${backendOrigin}/api/v1/**` },
      "/openapi.yaml": { proxy: `${backendOrigin}/openapi.yaml` },
      "/setup": { proxy: `${backendOrigin}/setup` },
      "/setup/**": { proxy: `${backendOrigin}/setup/**` },
      "/uploads/**": { proxy: `${backendOrigin}/uploads/**` }
    }
  : {}

export default defineNuxtConfig({
  compatibilityDate: "2026-06-03",
  devtools: { enabled: false },

  routeRules: backendRouteRules,

  modules: [
    "@nuxt/icon",
    "@pinia/nuxt",
    "@nuxtjs/i18n"
  ],

  css: [
    "~/assets/css/tokens.css",
    "~/assets/css/main.css"
  ],

  components: [
    {
      path: "~/components",
      pathPrefix: false
    }
  ],

  runtimeConfig: {
    public: {
      apiBaseURL: communityApiBaseURL,
      authApiBaseURL,
      apiMock,
      csrfCookieName,
      csrfHeaderName
    }
  },

  icon: {
    provider: "server",
    fallbackToApi: false,
    serverBundle: {
      collections: ["lucide"]
    },
    clientBundle: {
      scan: true
    }
  },

  i18n: {
    defaultLocale: "zh-CN",
    strategy: "no_prefix",
    detectBrowserLanguage: false,
    locales: [
      { code: "zh-CN", language: "zh-CN", name: "简体中文", file: "zh-CN.json" },
      { code: "en", language: "en-US", name: "English", file: "en.json" },
      { code: "ja", language: "ja-JP", name: "日本語", file: "ja.json" }
    ]
  },

  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith("md-")
    }
  }
})
