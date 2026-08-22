#!/usr/bin/env node
// 托管前构建脚本（node 运行时）：
//   1) 业务模块 WebUI 产物生成（registry 与 tsconfig，含 go run ./cmd/app webui generate）；
//   2) webui 依赖安装（pnpm install --frozen-lockfile）；
//   3) 构建打包（pnpm build -> <layout.webuiRoot>/dist）。
// 由 `go run ./cmd/app webui build` 或 Service 启动期（development、产物缺失）执行；
// 脚本从布局清单解析路径，不复制路径字面量。
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { loadProjectLayout, resolveLayoutPaths } from "./project-layout.mjs";

function fail(message) {
  console.error(`webui build: ${message}`);
  process.exit(1);
}

function runStep(executable, args, cwd, label) {
  // Windows 需要 shell 才能解析 corepack 等 .cmd 入口；参数全部来自编译期常量，
  // 只有含空白的部分才加引号（不加引号不能工作、全加引号会破坏 cmd 解析）。
  const result =
    process.platform === "win32"
      ? spawnSync(
          [executable, ...args].map((part) => (part.includes(" ") ? `"${part}"` : part)).join(" "),
          { cwd, stdio: "inherit", windowsHide: true, shell: true },
        )
      : spawnSync(executable, args, { cwd, stdio: "inherit", windowsHide: true });
  if (result.error) {
    fail(`cannot start ${label} (${executable}): ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${label} failed with exit code ${result.status}`);
  }
}

const project = loadProjectLayout();
const { repositoryRoot, webuiRoot } = resolveLayoutPaths(project);

runStep(process.execPath, ["scripts/generate.mjs"], webuiRoot, "webui registry generation");
runStep("corepack", ["pnpm", "install", "--frozen-lockfile"], webuiRoot, "webui dependency install");
runStep("corepack", ["pnpm", "build"], webuiRoot, "webui build");

console.error(`webui build: artifacts are ready at ${join(webuiRoot, "dist")}`);