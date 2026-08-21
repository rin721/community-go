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
      "@webui/contracts": fileURLToPath(new URL("./src/contracts/index.tsx", import.meta.url)),
      "@webui/ui": fileURLToPath(new URL("./src/ui/index.tsx", import.meta.url)),
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
