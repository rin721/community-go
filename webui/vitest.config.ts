import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(viteConfig as any, defineConfig({
  test: { include: ["src/**/*.test.ts", "../internal/module/*/binding/webui/web/**/*.test.ts"] },
}));
