#!/usr/bin/env bash
# 托管前构建脚本（bash 运行时，Linux 环境）：
#   1) 业务模块 WebUI 产物生成（registry 与 tsconfig，含 go run ./cmd/app webui generate）；
#   2) webui 依赖安装（pnpm install --frozen-lockfile）；
#   3) 构建打包（pnpm build -> <layout.webuiRoot>/dist）。
# 与 webui/scripts/build-webui.mjs 语义等价，从布局清单解析路径。
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${repository_root}"

node webui/scripts/generate.mjs

webui_root="$(node webui/scripts/project-layout.mjs --field webuiRoot)"
[[ -n "${webui_root}" ]] || { echo "webui build: layout did not provide webui root" >&2; exit 1; }
cd "${webui_root}"

corepack pnpm install --frozen-lockfile
corepack pnpm build

echo "webui build: artifacts are ready at ${webui_root}/dist" >&2