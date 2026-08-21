import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { loadProjectLayout, resolveLayoutPaths } from "./project-layout.mjs";

const project = loadProjectLayout();
const { webuiRoot, modulesRoot, moduleFacet } = resolveLayoutPaths(project);
const outputPath = resolve(webuiRoot, "tsconfig.layout.generated.json");
const moduleRoot = relative(webuiRoot, modulesRoot).replaceAll("\\", "/");
const generated = {
  extends: "./tsconfig.base.json",
  include: ["src", `${moduleRoot}/*/${moduleFacet}`, "vite.config.ts", "vitest.config.ts"],
};
const content = `${JSON.stringify(generated, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const actual = await readFile(outputPath, "utf8").catch(() => "");
  if (actual !== content) {
    console.error("tsconfig.layout.generated.json is stale; run pnpm generate:tsconfig");
    process.exit(1);
  }
} else {
  await writeFile(outputPath, content, "utf8");
}
