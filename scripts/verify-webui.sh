#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repository_root}"

go run ./cmd/app webui generate --check

node --check webui/scripts/build-webui.mjs

webui_root="$(node webui/scripts/project-layout.mjs --field webuiRoot)"
[[ -n "${webui_root}" ]] || { echo "layout did not provide webui root" >&2; exit 1; }
cd "${webui_root}"
export CI=true
if [[ "$(corepack pnpm --version)" != "10.22.0" ]]; then
  echo "pnpm 10.22.0 is required" >&2
  exit 1
fi
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm lint:modules
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
