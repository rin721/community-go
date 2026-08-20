# 构建、配置与启动链路审计：2026-06-23

本文记录第三阶段“构建、配置、环境变量、脚本与启动链路”的当前审计结果。结论以当前工作树、命令输出和脚本内容为准。

## 审计范围

- `Dockerfile`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-remote.yml`
- `deploy/docker-compose.production.example.yml`
- `deploy/config.production.example.yaml`
- `deploy.sh`
- `script/install.sh`
- `scripts/package.py`
- `.env.example`
- `configs/config.example.yaml` 与 `configs/examples/*.example.yaml`
- `internal/config` 环境变量入口
- `docs/environment`、`docs/release`、`docs/testing` 中的启动与部署说明

## 当前代码事实

| 链路 | 当前事实 |
| --- | --- |
| 后端构建入口 | Docker、CI 和发布包脚本均构建 `./cmd/console` |
| 发布二进制 | Docker 和发布包使用 `console-server` |
| WebUI 静态产物 | Docker 和发布包使用 `web/app/build/client`，Docker 构建阶段检查 `build/client/index.html` |
| 发布包 SQLite 边界 | 默认发布包 `CGO_ENABLED=0`，SQLite 运行态不可用；`--cgo` 计划用于目标平台 SQLite 构建 |
| 生产配置 | Docker 复制 `deploy/config.production.example.yaml` 为 `/app/configs/config.yaml` |
| Compose 配置 | Compose 通过 `APP_*` 环境变量覆盖应用配置，通过 `HOST_*` 变量挂载配置、数据和日志目录 |
| 远程部署 | GitHub Actions 使用无前缀仓库变量，经 `deploy.sh` 参数转换为运行时 `APP_*` 环境变量 |
| 配置文件路径 | CLI 支持 `--config`，代码支持 `APP_CONFIG` 和 `CONFIG_PATH`；`--config` 优先级最高 |
| 普通配置变量 | `internal/config` 以 `APP_*` 为当前默认前缀，并保留无前缀变量作为兼容兜底 |
| 本地配置 | `configs/config.local.yaml` 被 Git 忽略，不作为开源交付事实 |

## 发现的问题

| 类型 | 问题 | 处理 |
| --- | --- | --- |
| 实现缺陷 | CI 的 gofmt 步骤只输出未格式化文件，不会让 CI 失败 | 已修改 `.github/workflows/ci.yml`，发现 gofmt 漂移时直接 `exit 1` |
| 文档漂移风险 | Docker Compose 文档使用生产配置示例，但没有说明默认 PostgreSQL 需要数据库变量；新开发者可能直接运行后卡在数据库配置 | 已在部署说明中补充本地 SQLite smoke 变量，并明确生产环境不得沿用 smoke 配置 |
| 环境限制 | 当前 Windows 环境缺少 Docker 和 Bash，无法执行真实 Docker 构建、Compose 启动和 `deploy.sh --help` | 继续保留为外部补证项，不把容器链路写成已通过 |

## 修复后的启动边界

- 本地 Go 进程开发仍使用 `go run ./cmd/console server --config=configs/config.example.yaml` 或构建后的 `console-server`。
- React WebUI 开发仍使用 `pnpm --dir web/app dev`，生产静态产物仍是 `web/app/build/client`。
- Docker/Compose 发布入口仍使用 `Dockerfile` 和 `deploy/docker-compose.production.example.yml`。
- 生产配置以 `deploy/config.production.example.yaml` 为模板，密钥、数据库、缓存、SMTP 和品牌差异通过环境变量注入。
- 本地 Docker smoke 可显式设置 `APP_DB_DRIVER=sqlite` 和 `APP_DB_SQLITE_PATH=/app/data/app.db`，但生产发布必须选择 PostgreSQL 或 MySQL 并补齐备份、迁移、回滚证据。

## 本轮验证命令

已执行：

```powershell
go run ./cmd/console --help
go run ./cmd/console server --help
go run ./cmd/console db --help
python scripts/package.py --dry-run --target linux/amd64 --version smoke --verbose
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
go test ./internal/config -count=1 -mod=readonly
go test ./internal/app/cliapp/... -count=1 -mod=readonly
$goFiles = git ls-files '*.go' | Where-Object { Test-Path $_ }
gofmt -l $goFiles
```

结果：

- CLI 入口可用，命令树包含 `api`、`db`、`iam`、`init`、`run`、`server` 和 `service`。
- 当前没有独立 `config` 子命令；配置诊断由 `internal/config`、启动链路和 CLI 预检复用。
- `scripts/package.py --dry-run` 能生成 Linux 目标发布计划，计划产物为 `console-server_smoke_linux_amd64.tar.gz`。
- `scripts/check-package-sqlite-boundary.ps1` 通过，确认默认 CGO=0 dry-run 会提示 SQLite 不可用，`--cgo` dry-run 会提示 SQLite 可用，并检查包内 README 与 manifest 字段来源。
- `internal/config` 与 CLI 应用层测试通过。
- 当前实际存在的 Go 文件 gofmt 检查通过。由于工作树仍包含大量已删除但未提交的旧 Go 文件，直接对 `git ls-files '*.go'` 的完整输出运行 gofmt 会命中不存在路径；该现象属于工作区收敛问题，不是格式化问题。

环境限制：

```powershell
docker --version
bash --version
```

两者在当前机器均不可用。因此 `Dockerfile`、Compose 和 Bash 部署脚本仍只有静态一致性与文档级验证，不能声明真实容器运行通过。

## 后续补证

在具备 Docker 与 Bash 的环境中继续执行：

```bash
bash deploy.sh --help
bash script/install.sh --help
docker build -t console-platform:local .
docker run --rm -p 9999:9999 \
  -e APP_DB_DRIVER=sqlite \
  -e APP_DB_SQLITE_PATH=/app/data/app.db \
  -e APP_AUTH_SIGNING_KEY=change-me-at-least-32-bytes-long \
  -e APP_AUTH_REFRESH_TOKEN_PEPPER=change-me-refresh-pepper \
  -e APP_AUTH_MFA_SECRET_KEY=change-me-mfa-secret-key-32-bytes \
  console-platform:local
```

另开终端检查：

```bash
curl -fsS http://127.0.0.1:9999/health
curl -fsS http://127.0.0.1:9999/ready
curl -fsS http://127.0.0.1:9999/openapi.yaml
curl -fsS http://127.0.0.1:9999/admin
```

补证完成后，应更新 [Docker 与部署静态链路证明](../testing/docker-static-proof-2026-06-23.md) 或新增真实容器烟测报告。
