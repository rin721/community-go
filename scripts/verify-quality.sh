#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repository_root}"

unformatted="$(gofmt -l . | grep -v '^old-backend/' || true)"
if [[ -n "${unformatted}" ]]; then
  printf '%s\n' "${unformatted}" | xargs gofmt -d
  exit 1
fi
go mod tidy -diff
go generate ./...
git diff --exit-code -- api/openapi.yaml internal/transport/http/api/operation_inventory.gen.go
go test ./... -count=1
go test -race ./... -count=1
go vet ./...
CGO_ENABLED=0 go build -trimpath -buildvcs=false ./...
bash scripts/verify-artifacts.sh
