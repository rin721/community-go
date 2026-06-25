import { defineConfig } from "@playwright/test";

import base from "./playwright.config";

export default defineConfig({
  ...base,
  outputDir: "../../tmp/qa/visual-qa",
  use: {
    ...base.use,
    screenshot: "on",
  },
});
