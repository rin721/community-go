import { defineConfig } from "@playwright/test";
import { loadWebUIDevConfig } from "./scripts/project-layout.mjs";

const dev = loadWebUIDevConfig();
const baseURL = `https://${dev.host}:${dev.port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm exec vite --host ${dev.host} --port ${dev.port}`,
    url: baseURL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
