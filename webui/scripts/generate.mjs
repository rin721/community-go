import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { findRepositoryRoot } from "./project-layout.mjs";

const repositoryRoot = findRepositoryRoot();
const tsconfig = spawnSync(process.execPath, ["scripts/generate-tsconfig.mjs", ...(process.argv.includes("--check") ? ["--check"] : [])], {
  cwd: join(repositoryRoot, "webui"),
  stdio: "inherit",
  windowsHide: true,
});
if ((tsconfig.status ?? 1) !== 0) process.exit(tsconfig.status ?? 1);
const result = spawnSync("go", ["run", "./cmd/app", "webui", "generate", ...(process.argv.includes("--check") ? ["--check"] : [])], {
  cwd: repositoryRoot,
  stdio: "inherit",
  windowsHide: true,
});
process.exit(result.status ?? 1);
