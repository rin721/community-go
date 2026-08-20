# 2026-06-22 本地运行烟测

本文记录一次真实后端进程烟测，用于补充“项目可以直接运行”的验证证据。烟测以当前代码和构建产物为准，不使用历史文档作为唯一依据。

## 环境

| 项目 | 值 |
| --- | --- |
| 操作系统 | Windows / PowerShell |
| 后端入口 | `cmd/console` |
| 配置文件 | `configs/config.example.yaml` |
| 临时端口 | `127.0.0.1:19999` |
| 临时 SQLite | `./tmp/ai/runtime-smoke-20260622/app.db` |
| 临时上传目录 | `./tmp/ai/runtime-smoke-20260622/uploads` |
| 日志目录 | `./tmp/ai/runtime-smoke-20260622` |

## 执行命令

```powershell
New-Item -ItemType Directory -Force -Path tmp/ai/runtime-smoke-20260622 | Out-Null
$env:APP_SERVER_PORT="19999"
$env:APP_DB_SQLITE_PATH="./tmp/ai/runtime-smoke-20260622/app.db"
$env:APP_STORAGE_LOCAL_BASE_PATH="./tmp/ai/runtime-smoke-20260622/uploads"
$env:APP_LOG_FILE_PATH="./tmp/ai/runtime-smoke-20260622/app.log"
$env:APP_AUTH_SIGNING_KEY="runtime-smoke-signing-key-change-me-32-bytes"
$env:APP_AUTH_REFRESH_TOKEN_PEPPER="runtime-smoke-refresh-pepper-32-bytes"
$env:APP_AUTH_MFA_SECRET_KEY="runtime-smoke-mfa-secret-key-32-bytes"
$env:AUTH_SIGNING_KEY=$env:APP_AUTH_SIGNING_KEY
$env:AUTH_REFRESH_TOKEN_PEPPER=$env:APP_AUTH_REFRESH_TOKEN_PEPPER
$env:AUTH_MFA_SECRET_KEY=$env:APP_AUTH_MFA_SECRET_KEY

go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console
./tmp/console-server.exe server --config=configs/config.example.yaml
```

另一个 PowerShell 终端执行：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:19999/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:19999/ready
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:19999/openapi.yaml
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:19999/admin
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:19999/api/v1/system/public-settings
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:19999/api/v1/announcements
```

## 结果

| 检查项 | 结果 |
| --- | --- |
| 进程启动 | 通过，日志显示 `application initialized successfully` 和 `starting HTTP server on http://127.0.0.1:19999` |
| `GET /health` | 200，返回 `status=ok` |
| `GET /ready` | 200，返回 `status=ready`，数据库检查为 `ok` |
| `GET /openapi.yaml` | 200，`Content-Type=application/yaml`，UTF-8 解码后包含 `/api/v1/announcements` |
| `GET /admin` | 200，返回 React WebUI HTML，包含 React Router SPA 标记和静态资源引用 |
| `GET /api/v1/system/public-settings` | 200，返回可配置品牌信息，默认 `productName=Console Platform`、`productCode=console-platform` |
| `GET /api/v1/announcements` | 401，未登录访问受保护后台 API 被拒绝，符合权限边界 |
| 标准错误日志 | `server.err.log` 为空 |

启动日志同时显示 Announcements 模块路由已注册：

```text
GET    /api/v1/announcements
POST   /api/v1/announcements
GET    /api/v1/announcements/:announcementId
PATCH  /api/v1/announcements/:announcementId
POST   /api/v1/announcements/:announcementId/publish
POST   /api/v1/announcements/:announcementId/archive
DELETE /api/v1/announcements/:announcementId
```

## 结论

- 后端入口、配置环境变量覆盖、SQLite 自动迁移、模块路由注册、OpenAPI 运行时契约、静态 WebUI 托管和受保护 API 边界在本地真实进程中通过验证。
- 本次烟测使用临时 `tmp/ai/runtime-smoke-20260622`，未污染默认 `data/` 目录。
- 当前机器仍缺少 Docker CLI，容器构建和容器运行态烟测未在本机验证；需要在具备 Docker 的环境补跑 `powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1` 或 `bash scripts/docker-smoke.sh`，由脚本构建镜像、启动临时容器并重复关键端点检查；CI workflow 已配置在镜像构建后执行 Bash 容器 smoke，但当前提交仍需远端 run 或目标环境日志作为证据。
