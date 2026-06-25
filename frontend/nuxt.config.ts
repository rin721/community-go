export default defineNuxtConfig({
  compatibilityDate: "2026-06-03",
  devtools: { enabled: false },

  modules: [
    "@nuxt/content",
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
      apiBaseURL: process.env.NUXT_PUBLIC_API_BASE_URL || "/api/mock",
      apiMock: process.env.NUXT_PUBLIC_API_MOCK !== "false"
    }
  },

  routeRules: {
    "/docs": { prerender: true },
    "/docs/**": { prerender: true }
  },

  content: {
    experimental: {
      nativeSqlite: true
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
