import { spawnSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverWebUIModuleRoots } from "./module-roots.mjs";

const webuiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(webuiRoot, "..");
const eslint = resolve(webuiRoot, "node_modules/eslint/bin/eslint.js");
const moduleRoots = await discoverWebUIModuleRoots(repositoryRoot);
if (moduleRoots.length === 0) {
  console.log("No WebUI module roots found; module ESLint scan skipped");
  process.exit(0);
}
const paths = moduleRoots.map(({ root }) => relative(repositoryRoot, root).replaceAll("\\", "/"));
const result = spawnSync(process.execPath, [eslint, ...paths, "--config", "webui/eslint.config.js"], { cwd: repositoryRoot, stdio: "inherit" });
process.exit(result.status ?? 1);
