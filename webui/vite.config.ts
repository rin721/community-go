import { defineConfig, loadEnv } from "vite";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import tailwindcss from "@tailwindcss/vite";
import { loadProjectLayout, loadWebUIDevConfig, resolveLayoutPaths } from "./scripts/project-layout.mjs";

const project = loadProjectLayout();
const { webuiRoot, repositoryRoot } = resolveLayoutPaths(project);
const dev = loadWebUIDevConfig({ ...loadEnv(process.env.NODE_ENV ?? "development", webuiRoot, ""), ...process.env });
const sdk = (path: string) => join(webuiRoot, path);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl({ name: "community-go-webui", domains: ["127.0.0.1", "localhost"] }),
  ],
  resolve: {
    alias: {
      "@webui/sdk/runtime": sdk("src/sdk/runtime/index.tsx"),
      "@webui/sdk/http": sdk("src/sdk/http/index.ts"),
      "@webui/sdk/i18n": sdk("src/sdk/i18n/index.ts"),
      "@webui/sdk/query": sdk("src/sdk/query/index.ts"),
      "@webui/sdk/navigation": sdk("src/sdk/navigation/index.ts"),
      "@webui/sdk/feedback": sdk("src/sdk/feedback/index.tsx"),
      "@webui/sdk/ui": sdk("src/sdk/ui/index.tsx"),
      "@webui/sdk/mock": sdk("src/sdk/mock/index.ts"),
      "@webui/sdk/zone": sdk("src/sdk/zone/index.tsx"),
      "@webui/generated/openapi-spec": sdk("src/generated/openapi-spec.ts"),
      react: sdk("node_modules/react"),
      "react-dom": sdk("node_modules/react-dom"),
      "react-i18next": sdk("node_modules/react-i18next"),
      i18next: sdk("node_modules/i18next"),
      "@tanstack/react-query": sdk("node_modules/@tanstack/react-query"),
    },
  },
  server: {
    fs: { allow: [repositoryRoot] },
    https: {},
    host: dev.host,
    port: dev.port,
    strictPort: true,
    proxy: {
      "/api/v1": dev.apiTarget,
      "/management": { target: dev.managementTarget, rewrite: (path) => path.replace(/^\/management/, "") }
    }
  },
  build: { outDir: join(webuiRoot, "dist"), sourcemap: false },
});
