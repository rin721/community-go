import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";
import { loadProjectLayout, resolveLayoutPaths } from "./scripts/project-layout.mjs";

const project = loadProjectLayout();
const { webuiRoot, modulesRoot, moduleFacet } = resolveLayoutPaths(project);
const moduleTests = `${modulesRoot.replaceAll("\\", "/")}/*/${moduleFacet}/**/*.test.{ts,tsx}`;

export default mergeConfig(viteConfig as any, defineConfig({
  test: { include: [`${webuiRoot.replaceAll("\\", "/")}/src/**/*.test.{ts,tsx}`, moduleTests] },
}));
