import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [
    react(),
    basicSsl({ name: "community-go-webui", domains: ["127.0.0.1", "localhost"] }),
  ],
  resolve: {
    alias: {
      "@webui/sdk/runtime": fileURLToPath(new URL("./src/sdk/runtime/index.tsx", import.meta.url)),
      "@webui/sdk/http": fileURLToPath(new URL("./src/sdk/http/index.ts", import.meta.url)),
      "@webui/sdk/i18n": fileURLToPath(new URL("./src/sdk/i18n/index.ts", import.meta.url)),
      "@webui/sdk/query": fileURLToPath(new URL("./src/sdk/query/index.ts", import.meta.url)),
      "@webui/sdk/navigation": fileURLToPath(new URL("./src/sdk/navigation/index.ts", import.meta.url)),
      "@webui/sdk/feedback": fileURLToPath(new URL("./src/sdk/feedback/index.tsx", import.meta.url)),
      "@webui/sdk/ui": fileURLToPath(new URL("./src/sdk/ui/index.tsx", import.meta.url)),
      react: fileURLToPath(new URL("./node_modules/react", import.meta.url)),
      "react-i18next": fileURLToPath(new URL("./node_modules/react-i18next", import.meta.url)),
      "@tanstack/react-query": fileURLToPath(new URL("./node_modules/@tanstack/react-query", import.meta.url)),
    },
  },
  server: {
    fs: { allow: [".."] },
    https: {},
    strictPort: true,
    proxy: {
      "/api/v1": "http://127.0.0.1:8080",
      "/management": { target: "http://127.0.0.1:9090", rewrite: (path) => path.replace(/^\/management/, "") }
    }
  },
  build: { outDir: "dist", sourcemap: false },
});
