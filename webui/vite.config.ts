import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    fs: { allow: [".."] },
    https: true,
    proxy: {
      "/api/v1": "http://127.0.0.1:8080",
      "/management": { target: "http://127.0.0.1:9090", rewrite: (path) => path.replace(/^\/management/, "") }
    }
  },
  build: { outDir: "dist", sourcemap: false }
});
