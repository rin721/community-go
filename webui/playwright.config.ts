import { defineConfig } from "@playwright/test";
import { loadWebUIDevConfig } from "./scripts/project-layout.mjs";

const dev = loadWebUIDevConfig();
const baseURL = `https://${dev.host}:${dev.port}`;
const mockPort = 5174;
const mockBaseURL = `https://${dev.host}:${mockPort}`;

// 两个 project：
//   dev  —— 常规联调（Vite dev + 拦截路由，既有 webui.spec.ts）；
//   mock —— VITE_WEBUI_DATA_SOURCE=mock 的 Vite dev，零后端验证全 WebUI mock
//           （webui-mock.spec.ts 不做路由拦截，直接消费宿主 mock 传输层）。
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  projects: [
    { name: "dev", use: { baseURL }, testMatch: /webui\.spec\.ts/ },
    { name: "mock", use: { baseURL: mockBaseURL }, testMatch: /webui-mock\.spec\.ts/ },
  ],
  use: {
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `corepack pnpm exec vite --host ${dev.host} --port ${dev.port}`,
      url: baseURL,
      ignoreHTTPSErrors: true,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: `corepack pnpm exec vite --host ${dev.host} --port ${mockPort}`,
      url: mockBaseURL,
      ignoreHTTPSErrors: true,
      reuseExistingServer: true,
      timeout: 30_000,
      env: { VITE_WEBUI_DATA_SOURCE: "mock" },
    },
  ],
});