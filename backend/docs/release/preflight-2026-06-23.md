# 发布前验收记录：2026-06-23

本文是当前开源可用性重构工作的发布前验收记录，用于把已经完成的本地验证、静态审查和剩余风险集中归档。它不是生产发布批准，也不表示当前工作区已经可以直接发布到生产环境；正式发布前仍需基于目标环境补齐 Docker、数据库迁移、备份、密钥和回滚证据。

## 基本信息

| 项目 | 内容 |
| --- | --- |
| 日期 | 2026-06-23 |
| 环境 | Windows / PowerShell，本地开发工作区 |
| 分支 | 发布或创建 PR 前以 `git branch --show-current` 现场输出为准 |
| 当前提交 | 发布或创建 PR 前以 `git rev-parse HEAD` 现场输出为准；本文件不手写瞬时提交号，避免提交后立即漂移 |
| 工作区状态 | 发布或创建 PR 前以 `git status --short` 和 `scripts/check-worktree-convergence.ps1` 现场输出为准；本文件不手写瞬时未提交数量 |
| 发布类型 | 开源可用性重构验收候选 |
| 生产部署 | 未执行 |
| Docker 构建 | 本机未执行，当前机器缺少 Docker CLI；main CI run `28029100140` 已完成 Docker image build、Bash 容器烟测和 artifact 上传，并通过 `scripts/check-ci-docker-evidence.ps1` 校验 |

## 变更范围

| 范围 | 当前状态 |
| --- | --- |
| 应用入口 | 后端入口统一为 `cmd/console`，发布二进制名使用 `console-server` |
| 插件系统 | 插件运行时、协议、示例、配置块、路由和前端入口已删除；扩展方式改为模块化新增 |
| 业务模块 | 保留 IAM/System 基础能力，新增 Announcements 作为端到端业务模块示例 |
| 前端 | React WebUI 覆盖公开页、`/setup` 和 `/admin`；补充公告公开入口和后台管理入口 |
| 配置与命名 | 默认产品展示名、产品码、认证、存储、日志和 i18n 通过配置或环境变量覆盖 |
| 文档 | README、AGENTS、目录 README、架构、模块开发、测试、部署和最终验收文档已同步 |
| 验证证据 | 本地运行烟测、可重复 runtime smoke 脚本、发布前 gate 脚本、新开发者路径、视觉 QA、Docker 静态链路和开源可用性审查已归档 |

## 迁移证据

| 项目 | 结论 |
| --- | --- |
| 迁移目录 | `internal/migrations` |
| 本次新增迁移 | `20260622000100_create_announcements.sql` |
| 风险分类 | 新增型：创建 `announcements` 表和状态、创建时间索引 |
| 生产执行 | 未执行 |
| 回滚风险 | `Down` 会删除 `announcements` 表，生产环境不得在没有备份和数据恢复计划时直接执行 |
| 补证要求 | 正式发布前在目标数据库执行 `go run ./cmd/console db migrate status --config=<生产配置路径>`，并记录 `migrate up` 执行结果 |

## 已沉淀证据

| 证据 | 文件 |
| --- | --- |
| 开源最终验收追踪 | [开源可用性审查](../maintenance/open-source-readiness.md) |
| 重构任务计划 | [开源平台化重构任务计划](../maintenance/refactor-roadmap-2026-06-23.md) |
| 最终验收差距审计 | [最终验收差距审计](../maintenance/final-acceptance-gap-audit-2026-06-23.md) |
| 工作区收敛审计 | [工作区收敛审计](../maintenance/worktree-convergence-2026-06-23.md) |
| 新开发者路径 | [新开发者路径演练](../testing/onboarding-smoke-2026-06-23.md) |
| 本地真实进程烟测 | [本地运行烟测](../testing/runtime-smoke-2026-06-22.md) |
| 测试、可观测性、部署与演示环境 | [测试、可观测性、部署与演示环境审计](../maintenance/testing-deployment-observability-audit-2026-06-23.md) |
| 视觉 QA | [视觉 QA 证据](../testing/visual-qa-2026-06-22.md)、[全量视觉 QA 基线](../testing/visual-qa-full-2026-06-23.md)、[视觉 QA 编排脚本审计](../maintenance/visual-qa-runner-audit-2026-06-23.md) |
| Docker 与部署静态链路 | [Docker 静态链路证明](../testing/docker-static-proof-2026-06-23.md) |
| Docker 容器烟测脚本 | [Docker 容器烟测脚本审计](../maintenance/docker-smoke-script-audit-2026-06-23.md)，包含 Windows PowerShell 与 Linux/macOS/CI Bash 双入口 |
| CI Docker 证据校验脚本 | [CI Docker 证据校验脚本审计](../maintenance/ci-docker-evidence-check-audit-2026-06-23.md)，用于校验 GitHub Actions run、提交、artifact 和 `docker-smoke-ci.log` |
| main CI Docker 证据 | CI run `28029100140` 对应提交 `363aebe694703ec1349e5d5e3e427b8a76f02d5b`，已通过 Docker build、容器 smoke、artifact 上传和本地证据校验脚本 |
| 发布前 gate 脚本 | [发布前 gate 脚本审计](../maintenance/release-preflight-script-audit-2026-06-23.md) |
| 发布前模板 | [发布前检查与证据模板](preflight-checklist.md) |

## 已验证命令

以下命令已经在本轮重构验收中形成证据，详见上方证据文件：

```powershell
go test ./internal/config ./internal/transport/http ./internal/modules/system/... ./types/... -count=1 -mod=readonly
go test ./internal/app/... ./internal/modules/... -count=1 -mod=readonly
go test ./pkg/... -count=1 -mod=readonly
go test ./... -count=1 -mod=readonly
go vet ./...
go build -mod=readonly -o ./tmp/console-platform-server.exe ./cmd/console
go run ./cmd/console api openapi --output docs/api/openapi.yaml
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
pnpm --dir web/app lint
pnpm --dir web/app test
pnpm --dir web/app test:e2e
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -All -MinimumScreenshots 120
pnpm --dir web/app build
python scripts/package.py
git diff --check
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -SelfTest
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -RunId 28029100140 -CommitSha 363aebe694703ec1349e5d5e3e427b8a76f02d5b
```

本次记录补充执行并确认：

```powershell
go test ./internal/config ./internal/transport/http ./types/... -count=1 -mod=readonly
pnpm --dir web/app lint:i18n
docker --version
bash --version
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
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
git diff --check
```

结果：

- `go test ./internal/config ./internal/transport/http ./types/... -count=1 -mod=readonly` 通过。
- `pnpm --dir web/app lint:i18n` 通过，前端 i18n 资源对齐。
- `docker --version` 未通过，当前机器未安装 Docker CLI。
- `bash --version` 未通过，当前 Windows 机器未安装 Bash；`scripts/docker-smoke.sh` 由 Linux/macOS/CI 或具备 Bash 的目标环境执行。
- `powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1` 可解析，但同样失败于 Docker CLI 缺失；目标环境可直接用该脚本补真实容器烟测。
- `.github/workflows/ci.yml` 已在 Docker build 后增加 `bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke`，CI 不再只停留在镜像构建。
- `powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -SelfTest` 通过，CI Docker 证据校验器会拒绝不完整 smoke log 和失败 workflow metadata；当前 main run 已使用 `-RunId 28029100140 -CommitSha 363aebe694703ec1349e5d5e3e427b8a76f02d5b` 校验 artifact。
- `powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -RunId 28029100140 -CommitSha 363aebe694703ec1349e5d5e3e427b8a76f02d5b` 通过，main 当前提交的 CI Docker artifact 已证明镜像构建、容器启动和 `/health`、`/ready`、`/openapi.yaml`、`/admin` 端点 smoke。
- `powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1` 通过，检查全部 skill 的基础 front matter，并检查仓库级 skill 的 OpenAI 元数据和默认触发提示。
- `powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1` 通过，检查 81 个关键目录具备非空 README 和 Markdown 标题。
- `powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1` 通过，检查根 README、AGENTS、仓库级 skill、`docs/**`、关键源码 README 和 React 前端文档的相对文件、目录、图片路径和 Markdown 锚点。
- `powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1` 通过，默认 gate 覆盖本机工具检查、入口与品牌收敛、插件移除、错误与结果边界、Agent skill 检查、README 覆盖、文档链接检查、开源 readiness、工作树收敛审计、发布证据模板校验、后台补偿观测模板校验、聚焦 Go 测试、前端 i18n、视觉 QA 脚本语法、Docker PowerShell/Bash 烟测入口静态检查和空白检查。
- `powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1` 通过，Go、Node、pnpm、Python 和 GitHub CLI 可用；Docker 和 Bash 为 optional 缺失，本机容器 smoke 未执行，当前提交已由 main CI artifact 补证。
- `powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1` 通过，检查 4 个显式忽略错误候选，当前 4 个均为已说明的 best-effort 例外。
- `powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1` 通过，检查后台补偿观测模板保留 39 个必要 marker、scheduler、配置项、后台页面、日志关键字和敏感信息脱敏提醒。
- `powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke` 通过，完整非 Docker 本地 gate 覆盖 `go test ./...`、`go vet ./...`、后端构建、前端 i18n、前端 typecheck、前端 build、视觉 QA 脚本语法、发布包 dry run、真实进程 runtime smoke、Docker 烟测脚本语法和空白检查；`/health`、`/ready`、`/openapi.yaml`、`/admin` 均返回 200。
- `powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -IncludeVisualQA` 通过，发布前 gate 能实际执行代表性视觉 QA。
- `powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode` 通过，发布证据模板结构、关键命令、烟测路径和密钥名完整。
- `powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1` 通过，默认 CGO=0 dry-run 提示 SQLite 不可用，`--cgo` dry-run 提示 SQLite 可用，并检查包内 README 与 manifest 字段来源。
- `powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1` 通过，默认代表性链路生成 12 张桌面/移动端截图。
- `powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -All -MinimumScreenshots 120` 通过，`smoke.spec.ts` 全量 120 条桌面/移动端用例生成 120 张截图。
- 部署链路旧入口、旧插件路径和历史品牌词扫描无输出。
- `powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1` 通过，`/health`、`/ready`、`/openapi.yaml` 和 `/admin` 均返回 200，且未遗留 smoke 进程。
- `powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1` 通过，已检查已删除插件路径、替代路径、配置文件和生产交付面文件；扫描数量会随文档、脚本和 skill 增减变化，发布前应以现场输出为准。
- `powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1` 通过，已检查关键路径、应删除路径、品牌扫描文件和插件生产面扫描文件；项目 skill、README 覆盖脚本、文档链接检查脚本、skill 结构检查脚本、本机工具检查、错误与结果边界检查、后台补偿观测模板检查、发布包 SQLite/CGO 边界检查、构建与 CI、CI Docker 证据校验、CLI 工作流、已知缺口和维护指南入口已纳入防漂移检查，根 README 的 Aoi 项目代号和根 `logo.png` 作为受控品牌叙事入口，不参与全局品牌硬编码误判。
- `powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1` 通过，检查入口、Docker、CI、发布包和部署脚本均使用当前中性命名。
- `powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1` 通过；工作树未收敛数量以当次脚本输出为准，且检查未发现 `.env`、本地配置、根级运行态目录、生成目录或测试报告混入交付面或 Git 跟踪文件。
- `git diff --check` 无输出，未发现空白错误。

## 运行态烟测

已通过本地真实进程验证：

| 路径 | 当前证据 |
| --- | --- |
| `/health` | 通过，见本地运行烟测 |
| `/ready` | 通过，见本地运行烟测 |
| `/openapi.yaml` | 通过，见本地运行烟测 |
| `/` | 通过，返回 React WebUI 入口 |
| `/setup` | 通过 Playwright 初始化流程覆盖 |
| `/admin` | 通过 Playwright 后台流程和视觉 QA 覆盖 |

## 可观测性与 UI

- `/health`、`/ready` 和 `/openapi.yaml` 已纳入本地运行烟测。
- 后台仪表盘、公告管理、无写权限状态、公开公告和初始化 owner 流程已生成桌面与移动端视觉证据。
- 移动端后台侧栏占满首屏的问题已通过样式修复，并重新沉淀视觉 QA 结果。
- 操作审计、探针和系统状态作为 System 模块能力已保留在测试矩阵和模块文档中；正式发布时仍需观察目标环境日志与审计记录。

## 未完成的生产级证据

| 项目 | 原因 | 发布前要求 |
| --- | --- | --- |
| Docker 镜像构建 | 当前机器缺少 Docker CLI，无法在本机执行；main CI run `28029100140` 已完成镜像构建并通过 artifact 校验 | 正式发布时仍需记录目标镜像标签、镜像摘要、部署标签和资源限制；如目标环境重新构建镜像，应再执行 `scripts/docker-smoke.ps1` 或 `scripts/docker-smoke.sh` |
| 容器运行烟测 | 当前机器无法运行容器；main CI run `28029100140` 已通过 Bash 容器烟测并校验 `docker-smoke-ci.log` | 发布到目标环境后仍需检查目标地址的 `/health`、`/ready`、`/openapi.yaml`、`/admin`，并记录真实部署 smoke |
| 生产迁移 | 未连接生产数据库 | 执行并记录 `db migrate status` 与 `db migrate up` |
| 备份证据 | 未执行生产发布 | 记录数据库、上传文件、配置和日志备份位置 |
| 密钥注入 | 未进入目标环境 | 确认 `APP_AUTH_SIGNING_KEY`、`APP_AUTH_REFRESH_TOKEN_PEPPER`、`APP_AUTH_MFA_SECRET_KEY` 等由环境或密钥系统注入 |
| 回滚演练 | 当前是本地重构验收 | 记录上一版本镜像或发布包、回滚命令、schema 回滚边界和触发条件 |

## 当前结论

当前工作树已经具备开源后台管理 / 控制台平台的主体交付形态：分层、模块化扩展、核心后台能力、文档入口、Agent 规则、i18n、类型和错误处理规范、前后端验证路径均有对应证据；Docker 镜像构建和容器 smoke 已由 main CI artifact 补证。正式发布前仍不能跳过目标环境部署 smoke、生产迁移、备份、密钥和回滚补证。
