#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repository_root}"

go run ./cmd/app webui generate --check

cd "${repository_root}/webui"
pnpm install --frozen-lockfile
pnpm lint
pnpm lint:modules
pnpm typecheck
pnpm test
pnpm build
