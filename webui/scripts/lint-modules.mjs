import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { discoverWebUIModuleRoots } from "./module-roots.mjs";
import { loadProjectLayout, resolveLayoutPaths } from "./project-layout.mjs";

const project = loadProjectLayout();
const { repositoryRoot, webuiRoot } = resolveLayoutPaths(project);
const eslint = resolve(webuiRoot, "node_modules/eslint/bin/eslint.js");
const moduleRoots = await discoverWebUIModuleRoots(repositoryRoot);
if (moduleRoots.length === 0) {
  console.log("No WebUI module roots found; module ESLint scan skipped");
  process.exit(0);
}
const paths = moduleRoots.map(({ root }) => root);
const result = spawnSync(process.execPath, [eslint, ...paths, "--config", `${webuiRoot}/eslint.config.js`], { cwd: repositoryRoot, stdio: "inherit" });
process.exit(result.status ?? 1);
