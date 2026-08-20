import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [
    react(),
    basicSsl({ name: "community-go-webui", domains: ["127.0.0.1", "localhost"] }),
  ],
  server: {
    fs: { allow: [".."] },
    https: true,
    strictPort: true,
    proxy: {
      "/api/v1": "http://127.0.0.1:8080",
      "/management": { target: "http://127.0.0.1:9090", rewrite: (path) => path.replace(/^\/management/, "") }
    }
  },
  build: { outDir: "dist", sourcemap: false }
});
