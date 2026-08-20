# 部署说明

当前部署能力是生产风格示例，不是发布保证。真实环境使用前必须审查配置、密钥、数据库选择、备份和回滚策略。

## 相关文件

| 路径 | 用途 |
| --- | --- |
| `Dockerfile` | 构建服务镜像 |
| `deploy/config.production.example.yaml` | 生产风格应用配置 |
| `deploy/docker-compose.production.example.yml` | Compose 服务定义 |
| `deploy.sh` | Bash 部署包装脚本 |
| `script/install.sh` | 远程安装入口 |
| `.github/workflows/deploy-remote.yml` | 手动触发的远程部署 |

## Docker Compose 示例

`deploy/config.production.example.yaml` 默认按生产风格使用 PostgreSQL，并要求通过环境变量注入数据库和认证密钥。仅做本地容器烟测时，可以显式切换到 SQLite，避免在没有外部数据库的机器上误判部署链路。

```bash
mkdir -p /opt/console-platform/configs /var/lib/console-platform /var/log/console-platform
cp deploy/config.production.example.yaml /opt/console-platform/configs/config.yaml

export DEPLOY_IMAGE=console-platform:local
export APP_CONTAINER_PORT=9999
export APP_CONTAINER_CPUS=1.0
export APP_CONTAINER_MEMORY_LIMIT=512m
export APP_CONTAINER_PIDS_LIMIT=256
export APP_CONTAINER_STOP_GRACE_PERIOD=30s
export HOST_CONFIG_FILE=/opt/console-platform/configs/config.yaml
export HOST_DATA_DIR=/var/lib/console-platform
export HOST_LOGS_DIR=/var/log/console-platform

# 本地 smoke 可使用 SQLite；生产环境请改为 PostgreSQL/MySQL 并配置备份。
export APP_DB_DRIVER=sqlite
export APP_DB_SQLITE_PATH=/app/data/app.db

export APP_AUTH_SIGNING_KEY=change-me-at-least-32-bytes-long
export APP_AUTH_REFRESH_TOKEN_PEPPER=change-me-refresh-pepper
export APP_AUTH_MFA_SECRET_KEY=change-me-mfa-secret-key-32-bytes
docker compose -f deploy/docker-compose.production.example.yml up -d
```

生产环境最少还应设置 `APP_DB_DRIVER=postgres` 或 `APP_DB_DRIVER=mysql`，并提供对应的 `APP_DB_POSTGRES_*` 或 `APP_DB_MYSQL_*` 变量；不要把 SQLite smoke 配置直接用于正式发布。

检查：

```bash
curl http://127.0.0.1:9999/health
curl http://127.0.0.1:9999/ready
curl http://127.0.0.1:9999/admin
```

如果只是先验证当前工作树的非容器启动链路，可以在仓库根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
pnpm --dir web/app build
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
```

`release-preflight.ps1` 默认执行非破坏性本地 gate；`runtime-smoke.ps1` 使用临时 SQLite 和临时上传目录，不修改本地配置或默认 `data/`。它们不能替代 Docker/Compose 真实容器验证。

具备 Docker CLI 的 Windows 环境应继续运行容器烟测：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke -IncludeVisualQA -IncludeDocker
```

该命令会运行完整本地 gate、代表性视觉 QA，并通过 `scripts/docker-smoke.ps1` 构建 `console-platform:local` 镜像、启动临时容器、检查 `/health`、`/ready`、`/openapi.yaml` 和 `/admin`，结束后清理临时容器。

Linux、macOS 或 CI 环境可运行：

```bash
bash scripts/docker-smoke.sh
bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke
```

生产发布仍应使用真实数据库、备份、密钥注入和回滚计划；脚本中的 SQLite 仅用于容器链路 smoke。

## deploy.sh

`deploy.sh` 可以克隆仓库或使用本地仓库、准备配置、构建或拉取镜像、运行 Compose，并检查健康、就绪和 React WebUI 静态路由。破坏性或类生产操作必须显式传入 `--confirm`。

常用参数：

| 参数 | 说明 |
| --- | --- |
| `--path /opt/console-platform` | 远端运行目录 |
| `--config-dir /opt/console-platform/configs` | 宿主机配置目录 |
| `--data-dir /var/lib/console-platform` | 宿主机数据目录 |
| `--logs-dir /var/log/console-platform` | 宿主机日志目录 |
| `--image console-platform:local` | 运行镜像 |
| `--port 9999` | 宿主机 HTTP 端口 |
| `--server-port 9999` | 容器内 HTTP 端口 |
| `--webui-mount-path /` | Go 静态托管挂载路径 |
| `--webui-check-path /admin` | WebUI 静态路由检查路径 |
| `--brand-product-name "Console Platform"` | 运行时展示产品名 |
| `--brand-product-code console-platform` | 默认产品码和会话产品维度 |
| `--auth-signing-key <secret>` | JWT 签名密钥 |
| `--auth-refresh-token-pepper <secret>` | refresh token / API Token HMAC pepper |
| `--auth-mfa-secret-key <secret>` | MFA secret 加密密钥 |

数据库、缓存、品牌、认证、存储和 i18n 参数必须使用当前配置结构命名。例如 MySQL 使用 `--db-mysql-host`、`--db-mysql-username`、`--db-mysql-database`，Postgres 使用 `--db-postgres-host`、`--db-postgres-username`、`--db-postgres-database`，缓存使用 `--cache-driver`、`--cache-local-*` 与 `--cache-redis-*`，品牌使用 `--brand-product-*`，认证使用 `--auth-*`，存储使用 `--storage-driver` 与 `--storage-local-*`，i18n 使用 `--i18n-default-locale` 与 `--i18n-supported-locales`。不要使用旧的 `DB_HOST`、`REDIS_HOST` 或 `STORAGE_ENABLED` 风格变量。

## GitHub Actions 远程部署

`.github/workflows/deploy-remote.yml` 是手动触发的远程部署入口，它把 GitHub Environment 变量和 secrets 转换为 `script/install.sh` / `deploy.sh` 参数。仓库变量应使用当前配置字段：

- 基础部署：`DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_PATH`、`DEPLOY_REPO`、`DEPLOY_REF`、`DEPLOY_IMAGE`、`DEPLOY_BUILD`、`DEPLOY_PULL`、`APP_PORT`、`DEPLOY_CONTAINER_NAME`。
- 数据库：`DB_DRIVER`、`DB_SQLITE_PATH`、`DB_MYSQL_HOST`、`DB_MYSQL_PORT`、`DB_MYSQL_USERNAME`、`DB_MYSQL_DATABASE`、`DB_POSTGRES_HOST`、`DB_POSTGRES_PORT`、`DB_POSTGRES_USERNAME`、`DB_POSTGRES_DATABASE`。
- 缓存：`CACHE_DRIVER`、`CACHE_REDIS_ADDR`、`CACHE_REDIS_USERNAME`、`CACHE_REDIS_DB`、`CACHE_REDIS_POOL_SIZE`。
- 品牌：`BRAND_PRODUCT_NAME`、`BRAND_PRODUCT_CODE`、`BRAND_VERSION_NAME`。
- 认证非敏感配置：`AUTH_ENABLED`、`AUTH_REGISTRATION_MODE`、`AUTH_ISSUER`、`AUTH_AUDIENCE`、`AUTH_ACCESS_TOKEN_TTL_SECONDS`、`AUTH_REFRESH_TOKEN_TTL_SECONDS`、`AUTH_NOTIFICATION_DRIVER`、`AUTH_NOTIFICATION_RETRY_INTERVAL_SECONDS`、`AUTH_NOTIFICATION_RETRY_BATCH_SIZE`、`AUTH_NOTIFICATION_RETRY_MAX_ATTEMPTS`、`AUTH_SMTP_HOST`、`AUTH_SMTP_PORT`、`AUTH_SMTP_USERNAME`、`AUTH_SMTP_FROM`、`AUTH_SMTP_FROM_NAME`、`AUTH_SMTP_SECURITY`、`AUTH_PASSWORD_*`。
- WebUI 与配置：`WEBUI_ENABLED`、`WEBUI_MOUNT_PATH`、`WEBUI_PUBLIC_BASE_URL`、`WEBUI_API_BASE_URL`、`I18N_DEFAULT_LOCALE`、`I18N_SUPPORTED_LOCALES`、`STORAGE_DRIVER`、`STORAGE_LOCAL_BASE_PATH`。
- secrets：`DEPLOY_SSH_KEY`、`GHCR_TOKEN`、`DB_MYSQL_PASSWORD`、`DB_POSTGRES_PASSWORD`、`CACHE_REDIS_PASSWORD`、`AUTH_SIGNING_KEY`、`AUTH_REFRESH_TOKEN_PEPPER`、`AUTH_MFA_SECRET_KEY`、`AUTH_SMTP_PASSWORD`。

## 发布清单

发布前应先填写 [发布前检查与证据模板](preflight-checklist.md)，再执行真实环境部署。当前开源可用性重构的阶段性记录见 [2026-06-23 发布前验收记录](preflight-2026-06-23.md)。下面清单只保留执行顺序，详细证据、迁移分类、备份、回滚和可观测性记录以模板为准。

正式发布记录可从 [发布证据模板](release-evidence-template.md) 复制，填写后运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -Path <发布证据文件>
```

1. 选择并验证生产数据库驱动。
2. 注入 `APP_AUTH_SIGNING_KEY`、`APP_AUTH_REFRESH_TOKEN_PEPPER`、`APP_AUTH_MFA_SECRET_KEY`。
3. 运行 `db migrate status` 并在维护窗口执行 `db migrate up`。
4. 创建初始管理员或使用 `/setup` 初始化。
5. 审查 CORS origins 和 headers。
6. 验证 `/health`、`/ready`、`/openapi.yaml`、`/`、`/setup` 和 `/admin`。
7. 运行后端测试和前端构建。
8. 在干净环境构建 Docker 镜像。
9. 记录回滚、备份和迁移证据。

Compose 示例默认包含 `healthcheck`、`no-new-privileges`、`init: true`、CPU/内存/PID 限制和停止宽限期。生产环境应根据实例规格覆盖 `APP_CONTAINER_CPUS`、`APP_CONTAINER_MEMORY_LIMIT`、`APP_CONTAINER_PIDS_LIMIT` 和 `APP_CONTAINER_STOP_GRACE_PERIOD`，并在发布证据中记录实际值。

## React WebUI

生产镜像从 `web/app` 构建统一 React WebUI 静态产物，并由 Go 服务从 `/` 托管。手动发布非 Docker 产物时，需要先执行：

```bash
pnpm --dir web/app build
```

再将 `web/app/build/client` 随服务一起部署。
