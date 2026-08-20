# 测试矩阵

按变更范围从窄到宽运行验证。

## 验证层级

| 层级 | 适用场景 | 最小证据 |
| --- | --- | --- |
| Smoke | 文档、配置、启动、部署脚本或小范围后端变更 | 聚焦 Go 测试、构建、`git diff --check`，必要时本地运行烟测 |
| Standard | 新增模块、HTTP API、前端页面、认证/权限/初始化流程变更 | Smoke + 前端 typecheck/i18n/unit/e2e 或等效 Browser 检查 |
| Release | 发布前、跨层重构、静态托管、部署、可观测性或数据迁移变更 | Standard + 发布前证据模板、回滚/备份记录、可观测性检查 |

如果本地缺少 Docker、Bash、Playwright、pnpm 或浏览器能力，不得写成通过验证；必须记录为环境限制，并给出目标环境的补充命令。

接手仓库或准备发布候选前，可先运行只读本机工具检查，确认必需工具与外部补证工具边界：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
```

## 后端

```powershell
go test ./internal/config -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go test ./internal/app/... ./internal/modules/... -count=1 -mod=readonly
go test ./... -count=1 -mod=readonly
go vet ./...
go build -mod=readonly -o ./tmp/console-server ./cmd/console
```

主系统 HTTP API 变更必须额外运行：

```powershell
go run ./cmd/console api openapi --output docs/api/openapi.yaml
```

涉及 System 可观测性、媒体、探针或错误处理时，优先补跑：

```powershell
go test ./internal/modules/system/... -count=1 -mod=readonly
go test ./internal/app/adapters/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
```

新增业务模块时，至少补跑该模块和 HTTP contract：

```powershell
go test ./internal/modules/<module>/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
```

## 本地运行烟测

部署、启动、WebUI 静态托管或配置示例变更后，至少验证一次真实进程。为避免污染本地 `data/`，可以临时覆盖运行路径：

```powershell
pnpm --dir web/app build
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
```

脚本会自动构建服务二进制、使用临时 SQLite 和临时上传目录启动进程，检查 `/health`、`/ready`、`/openapi.yaml` 和 `/admin`，然后停止进程。脚本说明见 [scripts 目录说明](../../scripts/README.md)。

需要手工排查时，可按以下步骤拆开执行：

```powershell
New-Item -ItemType Directory -Force -Path tmp/ai/startup-smoke | Out-Null
$env:APP_SERVER_PORT="19999"
$env:APP_DB_SQLITE_PATH="./tmp/ai/startup-smoke/app.db"
$env:APP_STORAGE_LOCAL_BASE_PATH="./tmp/ai/startup-smoke/uploads"
$env:APP_LOG_FILE_PATH="./tmp/ai/startup-smoke/app.log"
$env:APP_AUTH_SIGNING_KEY="startup-smoke-signing-key-change-me-32-bytes"
$env:APP_AUTH_REFRESH_TOKEN_PEPPER="startup-smoke-refresh-pepper-32-bytes"
$env:APP_AUTH_MFA_SECRET_KEY="startup-smoke-mfa-secret-key-32-bytes"
go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console
./tmp/console-server.exe server --config=configs/config.example.yaml
```

另开终端检查：

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:19999/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:19999/ready
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:19999/openapi.yaml
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:19999/admin
```

期望结果：`/health` 返回 `status=ok`，`/ready` 返回数据库 `ok`，`/openapi.yaml` 返回 YAML，`/admin` 返回 React Router SPA HTML。

已沉淀的本地运行证据见 [2026-06-22 本地运行烟测](runtime-smoke-2026-06-22.md)。

## Docker 与部署链路

当前机器缺少 Docker CLI 时，不能把容器构建写成已通过。可以先执行静态链路检查，确认 Dockerfile、Compose、CI、部署脚本和发布包脚本仍指向当前入口与静态产物目录：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
$deployLegacyPatterns = @(
  "cmd/" + "ao" + "i",
  "go-" + "scaffold",
  "ao" + "i-" + "admin",
  "Ao" + "i Admin",
  "/admin/server-info",
  "internal/plugin",
  "pkg/plugin",
  "pkg/pluginapi",
  "/api/v1/plugins"
)
rg -n -S @($deployLegacyPatterns | ForEach-Object { "-e"; $_ }) Dockerfile deploy.sh script/install.sh scripts/package.py deploy .github configs --glob "!**/*.sum"
Select-String -Path Dockerfile -Pattern "node:24|golang:1.25.7|cmd/console|console-server|web/app/build/client|build/client/index.html"
Select-String -Path deploy/docker-compose.production.example.yml,deploy.sh,.github/workflows/ci.yml,.github/workflows/deploy-remote.yml,scripts/package.py -Pattern "console-platform|console-server|cmd/console|web/app/build/client|/health|/ready"
```

已沉淀的静态链路证据见 [2026-06-23 Docker 与部署静态链路证明](docker-static-proof-2026-06-23.md)。CI workflow 已配置在 Docker 镜像构建后通过 `scripts/docker-smoke.sh --skip-build` 启动临时容器并检查关键端点；该 workflow 会在 PR、`main` / `master` push 和 `codex/**` 分支 push 时运行。发布前仍需在目标环境或发布候选环境补跑同等容器烟测，或用当前提交的远端 CI artifact 校验证据。

`scripts/check-package-sqlite-boundary.ps1` 只复跑发布包 dry-run 和检查 `package.py` 的包内 README / manifest 字段来源，用于防止默认 `CGO_ENABLED=0` 与 SQLite 不可用边界漂移；它不替代目标平台的 `--cgo` SQLite 运行烟测。

Windows 目标环境：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
```

Linux/macOS/CI 目标环境：

```bash
bash scripts/docker-smoke.sh
bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke
```

这两个脚本都会构建或复用镜像、启动临时容器、检查 `/health`、`/ready`、`/openapi.yaml` 和 `/admin`，并在结束后清理临时容器。若目标环境不能运行 PowerShell，可使用 Bash 脚本；若目标环境不能运行 Bash，则按脚本中的同等步骤手工执行 `docker build`、`docker run` 和 HTTP 检查。

## 前端

```powershell
pnpm --dir web/app theme:check
pnpm --dir web/app lint
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
pnpm --dir web/app test
pnpm --dir web/app test:e2e
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
pnpm --dir web/app build
pnpm --dir web/app format
```

`typecheck`、`test` 和 `build` 会间接触发 theme 或 content 生成检查，但主题包、设计 token、图表颜色、布局模板或后台可视化变更仍应显式运行 `theme:check`，方便在结果中直接留证。

新增后台模块页面时，应增加聚焦 Playwright smoke。当前 Announcements 示例模块的聚焦命令为：

```powershell
pnpm --dir web/app exec playwright test tests/e2e/smoke.spec.ts -g "admin announcements route" --project=desktop --project=mobile
```

IAM 通知队列运维页的聚焦命令为：

```powershell
pnpm --dir web/app exec playwright test tests/e2e/smoke.spec.ts -g "admin notification outbox route" --project=desktop --project=mobile
```

该用例覆盖脱敏列表、状态/类型/收件人/分页筛选、已发送任务禁用重试、失败任务手动重试，以及认证头和 `X-Locale` 传递。

如果当前 PowerShell 找不到 `pnpm`，先尝试：

```powershell
corepack.cmd pnpm --dir web/app typecheck
```

## 可见 UI 与 QA 证据

可见 UI、初始化向导、认证路由、后台关键流程或发布前验收，需要在桌面和窄屏各检查一次：

| 视口 | 用途 |
| --- | --- |
| `1440x900` | 桌面后台工作台、表格、筛选、弹窗和图表 |
| `390x844` | 移动窄屏、导航折叠、表单和按钮触控尺寸 |

检查点：

- 页面标题、主标题和语言属性存在。
- 加载、空状态、错误状态和无权限状态可理解。
- 表格、筛选、分页、弹窗、抽屉、表单校验和提交反馈闭环。
- i18n 文案来自 locale 资源，不在页面散落硬编码。
- 图标优先使用 `lucide-react`，按钮和输入文本不溢出。
- 后端未暴露的能力不得在前端伪造成生产功能。

标准或发布级 QA 证据可以复制 [QA 证据模板](qa-report-template.md)。

需要沉淀通过用例截图时，优先使用根目录脚本：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
```

该脚本会调用 `web/app/playwright.visual.config.ts`，默认覆盖代表性公开页、后台仪表盘、后台公告管理/无权限状态和初始化 owner 流程，并把截图写入 `tmp/qa/visual-qa`。需要扩展页面级视觉证据时，使用 `-Grep` 聚焦具体用例，或使用 `-All` 对 `tests/e2e/smoke.spec.ts` 全量截图；代表性示例见 [2026-06-22 视觉 QA 证据](visual-qa-2026-06-22.md)，页面关键词见 [2026-06-23 页面级视觉 QA 覆盖索引](visual-qa-page-coverage-2026-06-23.md)，通知队列聚焦示例见 [2026-06-23 通知队列视觉 QA](visual-qa-notification-outbox-2026-06-23.md)，全量 smoke 截图基线见 [2026-06-23 全量视觉 QA 基线](visual-qa-full-2026-06-23.md)。

## 可观测性检查

变更日志、错误处理、服务器状态、操作审计、探针或发布脚本后，至少验证以下信号：

| 信号 | 验证方式 |
| --- | --- |
| 存活检查 | `GET /health` 返回 `status=ok` |
| 就绪检查 | `GET /ready` 返回数据库等依赖状态 |
| OpenAPI | `GET /openapi.yaml` 返回当前主系统契约 |
| 后台探针页 | 登录后访问 `/admin/probes`，确认 health/ready 展示可读 |
| 服务器状态 | 登录后访问 `/admin`，确认服务器快照和指标历史不展示后端未返回字段 |
| 流量探针 | 登录后访问 `/admin/traffic-hijack`，确认目标、结果、事件和 SSE/轮询状态可解释 |
| 操作记录 | 受保护后台 API 请求应能进入 operation records，审计失败不得伪装成功 |
| 错误日志 | API/前端请求错误应保留 trace id 或可定位信息 |

## 边界检查

发布前或阶段收口优先运行整合脚本：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-deployment-guardrails.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -SelfTest
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
```

如需手工排查具体残留，再使用下列聚焦命令：

```powershell
rg -n "github\\.com/open-console/console-platform/pkg/" internal/modules internal/middleware internal/transport --glob "*.go" --glob "!**/*_test.go"
rg -n "internal/plugin|pkg/plugin|pkg/pluginapi|/api/v1/plugins" cmd internal pkg types web/app/app web/app/tests configs deploy .github scripts script --glob "!**/README.md" --glob "!**/*_test.go"
@("internal/plugin", "pkg/plugin", "pkg/pluginapi", "_examples/remote-plugins", "docs/api/plugin-protocol") | ForEach-Object { if (Test-Path $_) { $_ } }
$legacyTerms = @(("go-" + "scaffold"), ("go_" + "scaffold"), ("ao" + "i-" + "admin"), ("ao" + "i_" + "admin"), ("Ao" + "i Admin"), ("Ao" + "i\b"))
rg -n -S @($legacyTerms | ForEach-Object { "-e"; $_ }) . --glob "!docs/api/openapi.yaml" --glob "!web/app/build/**" --glob "!web/app/node_modules/**" --glob "!configs/config.local.yaml" --glob "!data/**" --glob "!tmp/**" --glob "!build/**" --glob "!.git/**"
git diff --check
```

`internal/import_boundary_test.go` 固定生产代码的关键边界：业务 service 不直接依赖 `pkg/*`、同模块 repository 或 `internal/ports`，并防止已移除的插件运行时路径重新进入仓库。

## 发布级验证

发布前使用 [发布前检查与证据模板](../release/preflight-checklist.md)，并把本文件中实际执行的命令、浏览器检查、工具缺失和残余风险写入发布证据。

发布候选本地 gate 优先使用：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
```

具备 Docker 的目标环境可继续加上 `-IncludeDocker`，用于把 Docker 容器烟测纳入同一份结果表；涉及可见 UI 的发布候选应额外加上 `-IncludeVisualQA`。

正式发布证据填写完成后，运行 `scripts/check-release-evidence.ps1 -Path <发布证据文件>`，避免迁移、备份、密钥、烟测或回滚记录留空。
