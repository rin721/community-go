# Docker 与 CI

构建、发布包和 Docker 镜像必须使用同一套当前前端产物：`web/app/build/client`。

## 本地构建

```powershell
go build -mod=readonly -o ./tmp/console-server ./cmd/console
pnpm --dir web/app build
```

React WebUI 构建会运行内容生成、React Router build，并校验 `web/app/build/client/index.html` 存在。

## 发布包

发布包统一使用 `scripts/package.py`：

```powershell
python scripts/package.py
python scripts/package.py --target linux/amd64 --target windows/amd64
python scripts/package.py --output build/releases --skip-web-build
python scripts/package.py --cgo
```

发布包包含服务二进制、生产配置示例、locale、迁移、可选 WebUI 静态产物、空 `data/` 和 `logs/`、`README.txt`、`manifest.json`。

默认发布包使用 `CGO_ENABLED=0`，可以完成交叉编译，但 SQLite 运行态不可用。`scripts/package.py --dry-run`、包内 `README.txt` 和 `manifest.json` 会显式标记 `SQLite runtime: unavailable` / `sqliteRuntimeAvailable: false`；此类发布包应使用 PostgreSQL 或 MySQL。需要 SQLite 时，必须在目标平台或具备对应 C 工具链的环境使用 `python scripts/package.py --cgo ...` 构建，并在目标环境补运行烟测证据。

发布包 SQLite/CGO 边界由只读脚本固定：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
```

该脚本会复跑默认 `CGO_ENABLED=0` 与 `--cgo` 两种 dry-run，并检查包内 README 与 manifest 字段仍由 `scripts/package.py` 明确写出。它只证明发布包计划和元数据不会漂移，不代表跨目标平台 CGO/SQLite 二进制已经完成 smoke。

## Docker

Windows：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
```

Linux、macOS 或 CI：

```bash
bash scripts/docker-smoke.sh
bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke
```

`scripts/docker-smoke.ps1` 和 `scripts/docker-smoke.sh` 都会构建或复用 `console-platform` 镜像、启动临时容器、检查 `/health`、`/ready`、`/openapi.yaml` 和 `/admin`，并在结束后清理临时容器。仅需要验证镜像构建时，可以拆分执行底层命令 `docker build -t console-platform:local .`。

容器 smoke 会显式注入 SQLite、本地存储和 `APP_AUTH_NOTIFICATION_DRIVER=debug`，用于验证镜像、配置覆盖、静态托管和关键端点；生产发布仍应使用 PostgreSQL/MySQL、真实密钥和 SMTP/通知配置。

Dockerfile 包含：

1. `web-build` 阶段在 `web/app` 执行 `pnpm build`。
2. Go build 阶段生成 `/out/console-server`。
3. runtime 镜像复制配置、locale、WebUI 静态产物和服务二进制。
4. runtime 镜像以非 root `app` 用户运行服务。

Compose 生产示例包含 `healthcheck`、`no-new-privileges`、`init: true`、CPU/内存/PID 限制和停止宽限期。变更 Dockerfile、Compose 或 CI 后，应运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-deployment-guardrails.ps1
```

生产配置默认从 `/` 托管统一 SPA，并显式保留 `/api`、`/api/v1`、`/health`、`/ready` 和 `/openapi.yaml` 不进入前端 fallback。

## CI

CI 会在 `pull_request`、`main` / `master` push，以及 `codex/**` 分支 push 时运行。`codex/**` 触发项用于让 Codex 工作分支在不直接推送 `main` 的情况下获取同一套 Docker build、容器 smoke 和 `docker-smoke-evidence` artifact。

CI 至少应覆盖：

- 仓库治理 gate：Agent skill 元数据、README 覆盖、文档链接、入口与品牌收敛、插件移除、部署 guardrail 和开源 readiness。
- Node 24 与 `pnpm@10.22.0`：CI 在 `actions/setup-node` 启用 pnpm cache 之前先通过 Corepack 执行 `corepack prepare pnpm@10.22.0 --activate`，避免 GitHub runner 找不到 `pnpm` 时直接跳过后续验证。
- gofmt drift 检查。
- `go test ./... -count=1 -mod=readonly`。
- 后端服务构建，当前入口为 `./cmd/console`，CI 输出二进制名使用 `console-server`。
- React WebUI `lint:i18n`、`lint`、`typecheck`、`test:unit`、`build`。
- Docker 镜像构建，默认 CI 标签为 `console-platform:ci`。
- Docker 容器烟测，CI 在镜像构建后执行 `bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke`。
- Docker 容器烟测输出会写入 `build/reports/docker-smoke-ci.log`，并以 `docker-smoke-evidence` GitHub Actions artifact 保留 14 天；发布证据可以引用该 artifact、对应 workflow run URL 和提交 SHA。
- 发布前引用 CI Docker 证据时，可运行 `powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -RunId <workflow-run-id> -CommitSha <commit-sha>`，校验 workflow 成功、提交一致、artifact 未过期并下载检查 `docker-smoke-ci.log` 端点输出。
- `git diff --check`。

运行期 secret 必须通过环境变量、CI/CD secrets 或密钥管理服务注入，不得写入镜像或仓库。
