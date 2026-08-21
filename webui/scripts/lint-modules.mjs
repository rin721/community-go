import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webuiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(webuiRoot, "..");
const eslint = resolve(webuiRoot, "node_modules/eslint/bin/eslint.js");
const result = spawnSync(process.execPath, [eslint, "internal/module/auth/binding/webui/web", "internal/module/ops/binding/webui/web", "--config", "webui/eslint.config.js"], { cwd: repositoryRoot, stdio: "inherit" });
process.exit(result.status ?? 1);
