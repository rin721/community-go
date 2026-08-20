# 开源可用性审查

本文记录截至 2026-06-23 的开源后台管理 / 控制台平台验收状态。审查结论以真实代码、目录结构、构建脚本、配置、测试和扫描结果为准，不以历史文档作为唯一依据。

第十阶段机器化补证见 [2026-06-23 最终开源可用性审计](final-open-source-readiness-audit-2026-06-23.md)，其中 `scripts/check-open-source-readiness.ps1` 已把关键 README、任务计划入口、文档相对链接、构建与 CI、CLI 工作流、已知缺口、维护指南入口、本机工具检查入口、错误与结果边界 gate 入口、后台补偿观测模板、插件移除、旧品牌命名、locale 文件和受控配置示例边界纳入可重复检查；`scripts/check-local-tooling.ps1` 已把 Go、Node、pnpm/corepack、Python、GitHub CLI、Docker 和 Bash 可用性纳入只读检查；`scripts/check-doc-readmes.ps1` 已把应用入口、文档、后端分层、工具库、全局类型和 React 前端关键目录的 README 覆盖纳入可重复检查；`scripts/check-doc-links.ps1` 已把根 README、AGENTS、仓库级 skill、`docs/**`、关键源码 README 和 React 前端文档的相对文件、目录、图片路径和 Markdown 锚点纳入可重复检查；`scripts/check-agent-skills.ps1` 已把 `.agents/skills` 的 front matter、仓库级 OpenAI 元数据和默认触发提示纳入可重复检查；`scripts/check-error-result-boundaries.ps1` 已把生产 Go 代码中的显式忽略错误候选和 best-effort allowlist 纳入可重复检查；总任务计划入口见 [2026-06-23 开源平台化重构任务计划](refactor-roadmap-2026-06-23.md)，插件移除独立防回潮检查见 [2026-06-23 插件系统移除收敛审计](plugin-removal-convergence-audit-2026-06-23.md)；发布前本地 gate 见 [2026-06-23 发布前 gate 脚本审计](release-preflight-script-audit-2026-06-23.md)，发布证据结构校验见 [2026-06-23 发布证据校验脚本审计](release-evidence-validator-audit-2026-06-23.md)，部署防线检查见 [2026-06-23 部署防线检查审计](deployment-guardrails-audit-2026-06-23.md)，视觉 QA 复跑入口见 [2026-06-23 视觉 QA 编排脚本审计](visual-qa-runner-audit-2026-06-23.md)。

逐项目标差距和最终不可关闭项见 [2026-06-23 最终验收差距审计](final-acceptance-gap-audit-2026-06-23.md)。入口收敛、旧命名扫描和插件移除的独立取证见 [2026-06-23 入口与插件移除审计](entry-plugin-removal-audit-2026-06-23.md)。模块化扩展与插件移除二次收口见 [2026-06-23 模块化扩展与插件移除二次审计](module-extension-plugin-removal-audit-2026-06-23.md)。i18n、全局类型、错误与结果封装见 [2026-06-23 i18n、类型、错误与结果封装审计](i18n-types-errors-audit-2026-06-23.md)。测试、可观测性、部署和演示环境见 [2026-06-23 测试、可观测性、部署与演示环境审计](testing-deployment-observability-audit-2026-06-23.md)。后端跨模块认证上下文边界见 [2026-06-23 后端分层边界审计](backend-boundary-audit-2026-06-23.md)。后台核心权限闭环见 [2026-06-23 后台核心权限闭环审计](auth-permission-core-audit-2026-06-23.md)。前端 API、UI 组件和交互边界见 [2026-06-23 前端分层与交互边界审计](frontend-boundary-audit-2026-06-23.md)。

## 当前结论

项目已具备作为开源后台管理 / 控制台基础平台继续二次开发的主体结构：

- 后端入口已收敛到 `cmd/console`，应用装配、配置加载、HTTP/RPC、迁移、数据库、缓存、存储、日志和模块注册均由应用层管理。
- 业务功能通过 `internal/modules` 扩展，当前包含 IAM、System 两个基础模块，以及 Announcements 端到端业务示例模块；Announcements 已覆盖后台发布和公开产品线只读入口。
- 插件运行时、插件协议、插件示例和前端插件入口已移除，扩展路线改为模块化新增开发。
- React 前端统一承载公开页面、初始化向导和后台控制台，关键后台链路已通过桌面与移动端 Playwright 验证。
- 前后端 locale 已统一为 `zh-CN`、`en-US`，前端 API client 直接透传 canonical `X-Locale`，不再维护 `en` 到 `en-US` 的映射双轨。
- 当前 main 提交 `363aebe694703ec1349e5d5e3e427b8a76f02d5b` 已通过 CI run `28029100140` 的 Docker image build、Bash 容器 smoke 和 `docker-smoke-evidence` artifact 校验。
- README、AGENTS、关键代码目录 README、分层架构、模块开发蓝图、部署、测试和发布证据文档已经同步到当前代码事实。

## 最终验收追踪

| 验收项 | 当前状态 | 证据 | 未补证或边界 |
| --- | --- | --- | --- |
| 可作为开源后台管理 / 控制台项目直接理解和运行 | 本地 Go/React 运行链路、文档入口、演示环境、新开发者路径和运行烟测已闭环；`scripts/release-preflight.ps1` 可重复编排发布前本地 gate；`scripts/runtime-smoke.ps1` 可重复验证真实进程关键端点；Docker/部署链路已完成静态一致性审查，并新增 `scripts/docker-smoke.ps1` 与 `scripts/docker-smoke.sh` 作为 Windows、Linux/macOS/CI 容器烟测入口；main CI 已证明镜像构建、容器启动和关键端点 smoke | `README.md`、`docs/README.md`、`docs/onboarding/demo-environment.md`、`docs/testing/onboarding-smoke-2026-06-23.md`、`docs/testing/runtime-smoke-2026-06-22.md`、[测试、可观测性、部署与演示环境审计](testing-deployment-observability-audit-2026-06-23.md)、`docs/testing/docker-static-proof-2026-06-23.md`、[发布前 gate 脚本审计](release-preflight-script-audit-2026-06-23.md)、[Docker 容器烟测脚本审计](docker-smoke-script-audit-2026-06-23.md)、[CI Docker 证据校验脚本审计](ci-docker-evidence-check-audit-2026-06-23.md) | 当前 Windows 机器仍无法运行 Docker；生产发布仍需目标环境 smoke、镜像摘要、数据库、密钥和回滚证据 |
| 目录分层清晰 | 应用层、模块层、基础设施层、全局类型层和前端层已有明确边界说明；中间件和非 IAM 模块不再直接依赖 IAM service 认证上下文 | `docs/architecture/layers.md`、`internal/README.md`、`internal/app/README.md`、`internal/modules/README.md`、`pkg/README.md`、`types/README.md`、[后端分层边界审计](backend-boundary-audit-2026-06-23.md)、`web/app/README.md` | 新增模块仍需按模块蓝图持续补文档和测试 |
| 插件系统已移除并迁移为模块化扩展 | 插件运行时、协议、示例、前端入口和配置块已删除；扩展路径固定为模块新增，并有边界测试和独立脚本防止交付配置示例、生产 API、前端入口恢复插件设置 | 本文“插件系统移除验收”、`docs/extension/module-blueprint.md`、[入口与插件移除审计](entry-plugin-removal-audit-2026-06-23.md)、[模块化扩展与插件移除二次审计](module-extension-plugin-removal-audit-2026-06-23.md)、[插件系统移除收敛审计](plugin-removal-convergence-audit-2026-06-23.md)、`scripts/check-plugin-removal.ps1` | 不保留运行期动态模块扫描；未来如需扩展能力应通过显式模块装配 |
| 后台核心能力形成最小闭环 | IAM/System 覆盖后台基础能力，Announcements 覆盖新增业务模块、后台发布和公开读取闭环；IAM 通知投递队列已有脱敏列表、手动重试、菜单权限和聚焦 QA；菜单权限、route contract 和 API catalog 有回归测试约束 | `docs/modules/iam.md`、`docs/modules/system.md`、`docs/modules/announcements.md`、[后台核心权限闭环审计](auth-permission-core-audit-2026-06-23.md)、`docs/modules/permission-matrix.md`、Playwright smoke 和视觉 QA 记录 | 完整通知/消息中心、消息模板、订阅偏好和多渠道编排等更高阶能力仍应进入 backlog，不作为当前最小闭环阻塞项 |
| 不存在明显品牌硬编码 | 历史品牌词和旧脚手架名扫描无输出；产品展示名通过配置和 i18n 管理 | 本文“命名与品牌验收”、2026-06-23 历史品牌扫描无输出 | `configs/config.local.yaml`、`tmp/`、`build/` 等本地/生成目录不作为交付事实 |
| README 和 AGENTS 可指导未来开发 | 根 README、工程文档入口和根 AGENTS 已按当前架构重写；根 README 可保留 Aoi 项目代号和 Logo 作为仓库品牌叙事 | `README.md`、`logo.png`、`docs/README.md`、`AGENTS.md` | 子目录规则只能补充局部约束，不得覆盖根规则 |
| 关键模块和目录有说明文档 | 应用、配置、中间件、迁移、端口、模块、基础设施包、类型和前端入口均已有 README 或专题文档 | `internal/app/README.md`、`internal/config/README.md`、`internal/middleware/README.md`、`internal/migrations/README.md`、`internal/ports/README.md`、`internal/modules/*/README.md`、`pkg/*/README.md`、`types/*/README.md`、`web/app/app/README.md` | 未来新增目录必须同步 README 或模块说明 |
| 中文文档、注释和长期规则完整 | 主要 README、开发文档、AGENTS、测试说明和模块说明均以中文为主 | `AGENTS.md`、`docs/**/*.md`、模块 README | 代码标识符继续按 Go/TypeScript 约定使用英文 |
| 前后端构建、启动、检查流程清晰 | 测试矩阵、发布前模板、发布证据模板、后台补偿观测模板、阶段性发布前验收记录、本机工具检查、发布前 gate 脚本、发布证据校验脚本、运行烟测、Docker 静态链路、Docker smoke 双脚本、main CI 容器 smoke 和视觉 QA 报告/脚本记录了命令与结果 | `docs/testing/test-matrix.md`、`docs/release/preflight-checklist.md`、`docs/release/release-evidence-template.md`、`docs/release/operational-observation-template.md`、`docs/release/preflight-2026-06-23.md`、`scripts/check-local-tooling.ps1`、[发布前 gate 脚本审计](release-preflight-script-audit-2026-06-23.md)、[发布证据校验脚本审计](release-evidence-validator-audit-2026-06-23.md)、`docs/testing/runtime-smoke-2026-06-22.md`、`docs/testing/docker-static-proof-2026-06-23.md`、[Docker 容器烟测脚本审计](docker-smoke-script-audit-2026-06-23.md)、[CI Docker 证据校验脚本审计](ci-docker-evidence-check-audit-2026-06-23.md)、`docs/testing/visual-qa-2026-06-22.md`、`docs/testing/visual-qa-full-2026-06-23.md`、`docs/testing/visual-qa-notification-outbox-2026-06-23.md`、[视觉 QA 编排脚本审计](visual-qa-runner-audit-2026-06-23.md) | Docker CLI 缺失导致容器路径未在本机验证；生产级跨浏览器视觉仍需目标环境补证 |
| 构建、配置和启动链路已按当前入口复核 | Docker、CI workflow、发布包脚本、远程部署脚本、生产配置、Compose 和环境变量入口均已独立取证；main CI 已通过 Bash 容器 smoke 并上传可校验 artifact | [构建配置与启动链路审计](build-config-startup-audit-2026-06-23.md)、`docs/testing/docker-static-proof-2026-06-23.md`、[Docker 容器烟测脚本审计](docker-smoke-script-audit-2026-06-23.md)、[CI Docker 证据校验脚本审计](ci-docker-evidence-check-audit-2026-06-23.md) | 本机 Bash/Docker 不可用；生产部署脚本运行、目标镜像摘要和目标地址 smoke 仍需目标环境补证 |
| 错误处理、结果返回、类型定义具备一致规范 | 根规则和架构文档固定 `types/result`、`types/errors`、`types/constants` 的边界，业务类型保留在模块内；全局错误码已收窄为平台级通用分类；显式忽略错误候选已进入默认发布前 gate | `AGENTS.md`、`docs/architecture/error-result-contracts.md`、`types/README.md`、`types/import_boundary_test.go`、`scripts/check-error-result-boundaries.ps1`、[i18n、类型、错误与结果封装审计](i18n-types-errors-audit-2026-06-23.md) | 后续新增工具库必须继续通过测试证明不吞错误 |
| 新开发者可以快速理解并扩展 | 文档入口、目录地图、模块接入蓝图、权限矩阵和演示环境说明已齐备 | `docs/structure/directory-map.md`、`docs/extension/adding-modules.md`、`docs/extension/module-blueprint.md`、`docs/modules/permission-matrix.md` | 建议发布前再按新开发者路径从空环境演练一次 |
| AI Agent 可长期稳定维护 | 根 `AGENTS.md` 是唯一项目级规则入口，`docs/ai`、根 `ai` 和 `.ai` 规则目录已不存在；仓库级维护、文档治理、构建 CI、配置治理、新开发者入门、模块开发、IAM 治理、API 契约、插件移除、WebUI/i18n、发布验收、CLI/运行时生命周期、可观测性、错误结果契约、数据库迁移数据治理、阶段任务计划、PR 审查、视觉 QA、安全依赖治理和提交规范 skill 已纳入 readiness 关键路径，并有独立结构与触发元数据检查 | `AGENTS.md`、`.agents/skills/aoi-admin-platform-maintenance`、`.agents/skills/aoi-admin-docs-governance`、`.agents/skills/aoi-admin-build-ci-governance`、`.agents/skills/aoi-admin-config-governance`、`.agents/skills/aoi-admin-dev-onboarding`、`.agents/skills/aoi-admin-module-development`、`.agents/skills/aoi-admin-iam-governance`、`.agents/skills/aoi-admin-api-contract-sync`、`.agents/skills/aoi-admin-plugin-removal`、`.agents/skills/aoi-admin-webui-i18n`、`.agents/skills/aoi-admin-release-readiness`、`.agents/skills/aoi-admin-runtime-cli-governance`、`.agents/skills/aoi-admin-observability-ops`、`.agents/skills/aoi-admin-error-result-governance`、`.agents/skills/aoi-admin-data-migration-governance`、`.agents/skills/aoi-admin-task-planning`、`.agents/skills/aoi-admin-pr-review-governance`、`.agents/skills/aoi-admin-visual-qa-governance`、`.agents/skills/aoi-admin-security-dependency-governance`、`.agents/skills/git-conventional-commit`、`scripts/check-agent-skills.ps1`、2026-06-23 `docs/ai` / `ai` / `.ai` 检查结果 | `.agents/skills` 和 `tools/ai` 是工具/技能配置，不作为分散项目规则入口 |
| 最终目标逐项差距已明确 | 已按目标提示词逐项拆分为已证明、部分证明和未补证项，并补充总任务计划入口；当前 main CI Docker 证据已补齐 | `docs/maintenance/refactor-roadmap-2026-06-23.md`、`docs/maintenance/final-acceptance-gap-audit-2026-06-23.md` | 最终生产发布完成仍取决于生产发布、目标环境 smoke、迁移备份、密钥和回滚补证 |

## 架构验收

| 项目 | 当前状态 | 证据 |
| --- | --- | --- |
| 应用入口 | 通过 `cmd/console` 启动和生成 OpenAPI | `go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console`、`go run ./cmd/console api openapi --output docs/api/openapi.yaml` |
| 应用层 | `internal/app` 负责生命周期、装配、初始化和运行时适配 | `internal/app/README.md`、`docs/runtime/startup-flow.md` |
| 模块层 | IAM/System 模块承担后台基础业务能力，Announcements 演示新增业务模块、后台发布和公开产品线读取闭环 | `internal/modules/README.md`、`docs/modules/iam.md`、`docs/modules/system.md`、`docs/modules/announcements.md` |
| 基础设施层 | 数据库、缓存、存储、日志、迁移、HTTP server 等保留在 `pkg` 或模块 infrastructure/repository | `pkg/README.md`、各 `pkg/*/README.md` |
| 全局类型 | `types` 收敛为平台级常量、认证上下文、错误和结果辅助，不承载具体业务类型 | `types/README.md`、`types/auth/README.md`、`types/import_boundary_test.go` |
| 前端分层 | `web/app` 按 routes、features、components、lib/api、stores、theme、i18n 组织，并通过 Vitest 固定 API 和 UI 组件边界 | `web/app/README.md`、`web/app/AGENTS.md`、[前端分层与交互边界审计](frontend-boundary-audit-2026-06-23.md) |
| 关键目录说明 | 进程入口、配置、部署、应用、模块、基础设施、类型和前端组件/feature/路由/store/theme 入口已有说明 | `cmd/README.md`、`cmd/console/README.md`、`configs/README.md`、`deploy/README.md`、`internal/config/README.md`、`internal/middleware/README.md`、`internal/ports/README.md`、`internal/migrations/README.md`、`pkg/mail/README.md`、`types/*/README.md`、`web/app/app/README.md`、`web/app/app/components/console/README.md`、`web/app/app/features/README.md`、`web/app/app/routes/README.md`、`web/app/app/stores/README.md`、`web/app/app/theme/README.md` |

## 插件系统移除验收

插件系统不再作为平台扩展路径。未来新增业务能力必须通过后端模块、route contract、前端路由、i18n 和测试一起扩展。

已删除或迁移的主要内容：

- `internal/plugin`
- `pkg/plugin`
- `pkg/pluginapi`
- `_examples/remote-plugins`
- `docs/api/plugin-protocol`
- `docs/architecture/distributed-plugin-system.md`
- 前端 `/admin/plugins` 路由和插件 API client
- 配置示例中的插件配置块
- 插件注册表迁移

建议每次发布前优先运行整合检查：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
```

如需手工定位插件残留，再运行：

```powershell
rg -n "internal/plugin|pkg/plugin|pkg/pluginapi|/api/v1/plugins" cmd internal pkg types web/app/app web/app/tests configs deploy .github scripts script --glob "!**/README.md" --glob "!**/*_test.go"
@("internal/plugin", "pkg/plugin", "pkg/pluginapi", "_examples/remote-plugins", "docs/api/plugin-protocol") | ForEach-Object { if (Test-Path $_) { $_ } }
```

上述命令应无输出。

## 命名与品牌验收

当前项目面向可复用开源平台，运行时代码、配置默认值、API、日志、错误信息、前端生产文案和模块命名不应继续写死历史脚手架名或不可复用品牌策略。根目录 `README.md` 是项目代号和仓库品牌叙事入口，可以保留 Aoi 代号、徽章、Logo 和仓库链接；该例外不允许恢复旧脚手架、旧入口或旧运行时 header。发布前建议运行：

```powershell
$legacyTerms = @("go-" + "scaffold", "go_" + "scaffold", "aoi-" + "admin", "aoi_" + "admin", "Ao" + "i Admin", "Ao" + "i\b")
rg -n -S @($legacyTerms | ForEach-Object { "-e"; $_ }) . --glob "!README.md" --glob "!docs/api/openapi.yaml" --glob "!web/app/build/**" --glob "!web/app/node_modules/**" --glob "!configs/config.local.yaml" --glob "!data/**" --glob "!tmp/**" --glob "!build/**" --glob "!.git/**"
```

命令应无输出。根 README 的 Aoi 项目代号不作为失败项；产品展示名称、运行时默认值和部署差异仍应通过配置或 i18n 维护，不应写入页面、服务、脚本或错误信息。

本轮同时清理了 `build/`、`tmp/` 下由历史打包、旧二进制和旧截图生成的被忽略产物，并补充运行以下扫描：

```powershell
$root=(Resolve-Path .).Path
$legacyPattern = '(?i)(' + 'ao' + 'i|go-' + 'scaffold)'
Get-ChildItem -LiteralPath build,tmp -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
  $rel=$_.FullName.Substring($root.Length+1)
  if ($rel -match $legacyPattern) { $rel }
}
```

该扫描当前无输出。`configs/config.local.yaml` 是被忽略的本地派生配置，不作为开源交付事实；配置验收以 `configs/*.example.yaml`、`configs/examples/*.example.yaml` 和 `deploy/config.production.example.yaml` 为准。

## 已验证命令

本轮已完成以下验证：

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
pnpm --dir web/app exec playwright test tests/e2e/smoke.spec.ts -g "admin announcements route" --project=desktop --project=mobile
pnpm --dir web/app exec playwright test tests/e2e/smoke.spec.ts -g "admin notification outbox route" --project=desktop --project=mobile
pnpm --dir web/app exec playwright test tests/e2e/smoke.spec.ts -g "public announcements route" --project=desktop --project=mobile
pnpm --dir web/app exec playwright test tests/e2e/smoke.spec.ts -g "public home renders|setup language selection uses canonical locale" --project=desktop --project=mobile
pnpm --dir web/app exec playwright test tests/e2e/smoke.spec.ts -g "admin traffic hijack route" --project=desktop --project=mobile
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -Grep "admin notification outbox route"
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -All -MinimumScreenshots 120
pnpm --dir web/app build
pnpm --dir web/app format
python scripts/package.py
./tmp/console-platform-server.exe server --config=configs/config.example.yaml
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9999/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9999/ready
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9999/openapi.yaml
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9999/
```

结果：

- Go 全量测试、vet 和后端构建通过。
- OpenAPI 生成通过。
- 前端 typecheck、i18n lint、ESLint、Vitest、Playwright、build、Prettier 检查通过。
- `python scripts/package.py` 已在 Windows 环境通过，能够调用 pnpm 构建 React WebUI，并生成 linux/windows/darwin 发布包和 `checksums.txt`。脚本已显式解析 `pnpm.cmd` / `pnpm.exe`，避免 Python `subprocess` 在 Windows 上找不到 bare `pnpm`。
- Playwright 覆盖桌面与移动端关键链路，包括公开页、登录、初始化、IAM、System、媒体、版本、字典、参数、审计和探针；新增 Announcements 后已补跑桌面与移动端聚焦 smoke，覆盖后台列表、创建、编辑、发布、归档、删除和筛选请求契约，并补充公开公告列表/详情读取链路；IAM 通知队列已补跑桌面与移动端聚焦 smoke，覆盖脱敏列表、筛选、禁用态、手动重试和认证/locale 请求上下文。
- 视觉 QA 代表性截图覆盖公开首页、公开公告、后台仪表盘、后台公告管理、后台公告无写权限状态和初始化 owner 流程，见 `docs/testing/visual-qa-2026-06-22.md`；本轮新增 `scripts/visual-qa.ps1` 复跑入口并抽查移动端截图，避免发布前依赖手动拼长命令；通知队列聚焦视觉证据见 `docs/testing/visual-qa-notification-outbox-2026-06-23.md`。
- 2026-06-23 全量视觉 QA 基线见 `docs/testing/visual-qa-full-2026-06-23.md`：`scripts/visual-qa.ps1 -All -MinimumScreenshots 120` 通过，`smoke.spec.ts` 的 120 条桌面/移动端用例生成 120 张截图。
- 2026-06-23 后台核心权限闭环审计见 `docs/maintenance/auth-permission-core-audit-2026-06-23.md`；本轮新增测试确保 System 菜单中每个带权限码的入口都能在 route contract 派生的 API catalog 中找到同 scope/productCode 的权限声明。
- 2026-06-23 复跑插件残留扫描、已删除插件目录检查和历史品牌扫描，命令均无输出；新增 `scripts/check-plugin-removal.ps1` 并接入默认发布前 gate，当前未发现插件运行时路径、插件 API 路径或历史品牌词重新进入交付面。
- 2026-06-23 新开发者路径演练见 `docs/testing/onboarding-smoke-2026-06-23.md`：Go、Node.js、pnpm、CLI help、后端最小测试、临时 OpenAPI 生成、前端 i18n 和 typecheck 均通过；Docker CLI 仍不可用。
- 2026-06-23 Docker 与部署静态链路证明见 `docs/testing/docker-static-proof-2026-06-23.md`：`Dockerfile`、Compose、CI、远程部署、`deploy.sh` 和 `scripts/package.py` 均指向 `./cmd/console`、`console-server`、`web/app/build/client`、`/health`、`/ready` 和中性 `console-platform` 默认值；旧入口、旧插件路径和历史品牌词扫描无输出。
- 2026-06-23 Docker 容器烟测脚本审计见 `docs/maintenance/docker-smoke-script-audit-2026-06-23.md`：新增 `scripts/docker-smoke.ps1` 与 `scripts/docker-smoke.sh`，CI workflow 已配置在 Docker build 后执行 Bash 容器 smoke；当前机器执行 PowerShell smoke 仍失败于 Docker CLI 缺失，Bash smoke 因缺少 Bash/Docker 未在本机执行。
- 2026-06-23 CI Docker 证据校验脚本审计见 `docs/maintenance/ci-docker-evidence-check-audit-2026-06-23.md`：新增 `scripts/check-ci-docker-evidence.ps1`，可在 GitHub Actions 产出 `docker-smoke-evidence` 后校验 workflow run 成功、提交 SHA 一致、artifact 未过期和 `docker-smoke-ci.log` 端点输出；当前 main CI run `28029100140` 已通过该脚本校验。
- 2026-06-23 部署防线检查审计见 `docs/maintenance/deployment-guardrails-audit-2026-06-23.md`：Compose 示例补充 `init: true`、停止宽限期、CPU/内存/PID 限制，`scripts/check-deployment-guardrails.ps1` 已接入发布前 gate 并断言 CI 保留仓库治理 gate，发布证据模板强制记录镜像摘要、部署标签、资源限制和优雅停止验证。
- 2026-06-23 发布前 gate 脚本审计见 `docs/maintenance/release-preflight-script-audit-2026-06-23.md`：新增 `scripts/release-preflight.ps1`，默认 gate 在当前机器通过，并检查本机工具、Agent skill 结构、后台补偿观测模板和 PowerShell/Bash Docker smoke 入口。
- 2026-06-23 发布证据校验脚本审计见 `docs/maintenance/release-evidence-validator-audit-2026-06-23.md`：新增 `scripts/check-release-evidence.ps1` 和 `docs/release/release-evidence-template.md`，模板结构校验和未补证占位自检在当前机器通过。
- 2026-06-23 视觉 QA 编排脚本审计见 `docs/maintenance/visual-qa-runner-audit-2026-06-23.md`：新增 `scripts/visual-qa.ps1`，默认代表性视觉 QA 在当前机器通过并生成 12 张截图。
- 2026-06-23 发布前验收记录见 `docs/release/preflight-2026-06-23.md`：集中记录当前分支、当前提交、工作区未提交状态、迁移风险、已沉淀验证证据、main CI Docker 证据和正式发布前仍需补齐的生产级证据。
- 2026-06-23 开源平台化重构任务计划见 `docs/maintenance/refactor-roadmap-2026-06-23.md`：集中说明十个阶段的当前状态、证据入口、未闭环事项和下一步优先级。
- 2026-06-23 最终验收差距审计见 `docs/maintenance/final-acceptance-gap-audit-2026-06-23.md`：逐项标记目标要求的已证明、部分证明和未补证状态，明确当前不能关闭的验收缺口。
- 2026-06-23 工作区收敛审计见 `docs/maintenance/worktree-convergence-2026-06-23.md`：记录工作区收敛检查口径、删除项分布和建议拆分提交范围；当前未收敛数量以 `scripts/check-worktree-convergence.ps1` 的现场输出为准。
- 2026-06-23 PR 拆分计划见 `docs/maintenance/pr-split-plan-2026-06-23.md`：把平台化重构成果拆为入口命名、插件移除、架构类型、Announcements 示例模块、前端平台化和文档验收证据 6 个可审查包，并为每包列出路径边界、验证命令和阻塞条件。
- 2026-06-23 入口与品牌收敛审计见 `docs/maintenance/entry-brand-convergence-audit-2026-06-23.md`：新增 `scripts/check-entry-brand-convergence.ps1`，把 `cmd/console`、中性 module path、Docker/CI/发布包/部署命名和旧品牌残留检查纳入机器化 gate。
- 本地真实进程烟测见 `docs/testing/runtime-smoke-2026-06-22.md`；本轮补充验证了 `configs/config.example.yaml` 下的 `/health`、`/ready`、`/openapi.yaml` 和根路径 React WebUI 静态入口。
- 前端构建曾存在 Vite 大 chunk 警告；2026-06-23 已将后台图表改为轻量 SVG renderer 并移除大型图表运行时依赖，当前 `pnpm --dir web/app build` 不再输出 500 kB chunk 警告。后续新增 Markdown、图表、编辑器或报表能力时仍需继续观察首屏资源。
- 当前机器缺少 Docker CLI 和 Bash，`docker --version`、`bash --version` 无法执行；当前提交的容器构建和运行态烟测已由 main CI Bash smoke 与 artifact 校验补证，目标环境发布仍需补真实地址 smoke 和部署证据。

## 仍需补证

| 风险 | 说明 | 建议 |
| --- | --- | --- |
| 目标环境部署 smoke 仍需补证 | 当前机器缺少 Docker CLI 和 Bash；main CI run `28029100140` 已证明当前提交的镜像构建与容器 smoke，但正式发布的镜像摘要、资源限制、外部数据库和目标地址仍需单独证明 | 发布候选记录 main CI Docker artifact，或在具备 Docker 的目标环境运行 `powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1` / `bash scripts/docker-smoke.sh`；正式部署后记录 `/health`、`/ready`、`/openapi.yaml`、`/admin` 和回滚准备 |
| 页面级视觉证据仍需随代码刷新 | 已为当前 `smoke.spec.ts` 生成 120 张桌面/移动端截图基线，并新增视觉 QA 复跑脚本；但截图来自 mock 链路且不入库 | 用 `scripts/visual-qa.ps1 -Grep "<用例名>"` 或 `-All` 配合 `docs/testing/qa-report-template.md` 在发布候选或 UI 变更后重新记录截图、空状态、错误状态和可访问性检查 |

## 后续维护规则

- 新增后台能力必须先判断是否属于 IAM/System 基础模块，还是应新增业务模块。
- 新增主系统 HTTP API 必须进入 `internal/transport/http/contracts.go`，再生成 OpenAPI。
- 新增前端生产能力必须有后端 API、权限、配置、持久化和测试支撑，不得只在页面中模拟。
- 新增用户可见文案必须同步 `zh-CN` 和 `en-US` 前端资源；后端/CLI/API 文案必须同步 `configs/locales` 对应命名空间。
- 工具库和基础设施封装不得吞掉错误，错误和状态必须返回上层，由调用方决定业务策略。
- 发布前应使用 `docs/release/preflight-checklist.md` 留存验证证据。
