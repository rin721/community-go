# 工程文档

本文档以真实代码、配置、构建脚本和测试结果为事实来源，说明当前后台管理 / 控制台平台的运行方式与扩展边界。

## 阅读入口

| 主题 | 文档 |
| --- | --- |
| 项目定位 | [项目概览](overview/project.md) |
| 重构计划 | [开源平台化重构任务计划](maintenance/refactor-roadmap-2026-06-23.md)、[PR 拆分计划](maintenance/pr-split-plan-2026-06-23.md)、[最终验收差距审计](maintenance/final-acceptance-gap-audit-2026-06-23.md) |
| 分层边界 | [分层架构](architecture/layers.md)、[错误与结果契约](architecture/error-result-contracts.md)、[目录地图](structure/directory-map.md) |
| 配置与环境变量 | [配置说明](environment/configuration.md) |
| API 契约 | [API 说明](api/README.md)、[HTTP API](api/http-api.md)、[JSON-RPC](api/rpc-api.md) |
| 运行链路 | [启动流程](runtime/startup-flow.md)、[HTTP 流程](runtime/http-flow.md) |
| 构建与 CI | [Docker 与 CI](build/docker-and-ci.md) |
| 模块开发 | [新增模块](extension/adding-modules.md)、[模块接入蓝图](extension/module-blueprint.md)、[后台权限矩阵](modules/permission-matrix.md)、[IAM](modules/iam.md)、[System](modules/system.md)、[Announcements](modules/announcements.md) |
| CLI 工作流 | [IAM CLI 工作流](workflows/iam-cli.md)、[DB CLI 工作流](workflows/db-cli.md) |
| 本地演示 | [本地演示环境与示例数据](onboarding/demo-environment.md) |
| 验证 | [测试矩阵](testing/test-matrix.md)、[新开发者路径演练](testing/onboarding-smoke-2026-06-23.md)、[本地运行烟测](testing/runtime-smoke-2026-06-22.md)、[Docker 静态链路证明](testing/docker-static-proof-2026-06-23.md)、[QA 证据模板](testing/qa-report-template.md)、[视觉 QA 证据](testing/visual-qa-2026-06-22.md)、[全量视觉 QA 基线](testing/visual-qa-full-2026-06-23.md)、[页面级视觉 QA 覆盖索引](testing/visual-qa-page-coverage-2026-06-23.md)、[通知队列视觉 QA](testing/visual-qa-notification-outbox-2026-06-23.md)、[开源可用性审查](maintenance/open-source-readiness.md)、[入口与插件移除审计](maintenance/entry-plugin-removal-audit-2026-06-23.md)、[插件系统移除收敛审计](maintenance/plugin-removal-convergence-audit-2026-06-23.md)、[模块化扩展与插件移除二次审计](maintenance/module-extension-plugin-removal-audit-2026-06-23.md)、[i18n、类型、错误与结果封装审计](maintenance/i18n-types-errors-audit-2026-06-23.md)、[测试、可观测性、部署与演示环境审计](maintenance/testing-deployment-observability-audit-2026-06-23.md)、[构建配置与启动链路审计](maintenance/build-config-startup-audit-2026-06-23.md)、[后端分层边界审计](maintenance/backend-boundary-audit-2026-06-23.md)、[后台核心权限闭环审计](maintenance/auth-permission-core-audit-2026-06-23.md)、[前端分层与交互边界审计](maintenance/frontend-boundary-audit-2026-06-23.md)、[CI Docker 证据校验脚本审计](maintenance/ci-docker-evidence-check-audit-2026-06-23.md)、[发布前 gate 脚本审计](maintenance/release-preflight-script-audit-2026-06-23.md)、[发布包 SQLite/CGO 边界审计](maintenance/package-sqlite-boundary-audit-2026-06-23.md)、[最终验收差距审计](maintenance/final-acceptance-gap-audit-2026-06-23.md)、[工作区收敛审计](maintenance/worktree-convergence-2026-06-23.md) |
| 发布与部署 | [部署说明](release/deployment.md)、[发布前检查与证据模板](release/preflight-checklist.md)、[发布证据模板](release/release-evidence-template.md)、[后台补偿观测记录模板](release/operational-observation-template.md)、[2026-06-23 发布前验收记录](release/preflight-2026-06-23.md) |
| 已知缺口 | [已知缺口](backlog/known-gaps.md) |

第十阶段机器化验收记录见 [最终开源可用性审计](maintenance/final-open-source-readiness-audit-2026-06-23.md)，首次接手仓库或准备发布候选时可运行 `powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1` 检查本机 Go、Node、pnpm/corepack、Python、GitHub CLI、Docker 和 Bash 可用性；发布前可运行 `powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1` 检查关键 README、任务计划入口、构建与 CI、CLI 工作流、已知缺口、维护指南入口、插件移除、错误与结果边界、旧品牌命名和 locale 边界；新增或调整重要目录时运行 `powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1` 检查 README 覆盖；新增或调整 README、`docs/**`、仓库级 skill、任务计划、发布说明、目录索引或关键源码目录说明中的相对链接时运行 `powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1` 检查文件、目录和 Markdown 锚点目标；新增或调整 `.agents/skills` 时运行 `powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1` 检查 skill front matter、仓库级 OpenAI 元数据和默认触发提示；涉及工具库、service、repository、infrastructure、运行态清理或错误返回规则时运行 `powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1` 检查显式忽略错误候选。

Docker 容器烟测脚本和当前机器 Docker/Bash 缺失记录见 [Docker 容器烟测脚本审计](maintenance/docker-smoke-script-audit-2026-06-23.md)，具备 Docker 的目标环境可运行 `powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1` 或 `bash scripts/docker-smoke.sh` 补齐镜像和容器运行证据；GitHub Actions workflow 已配置在镜像构建后执行 Bash 容器 smoke，并可由 PR、`main` / `master` push 或 `codex/**` 分支 push 触发。使用 CI artifact 作为 Docker 证据时，运行 `powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -RunId <workflow-run-id> -CommitSha <commit-sha>` 校验 workflow run、提交、artifact 和 `docker-smoke-ci.log` 内容。

发布候选的本地 gate 可运行 `powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1`；脚本默认执行非破坏性检查，完整模式和 Docker 模式见 [发布前 gate 脚本审计](maintenance/release-preflight-script-audit-2026-06-23.md)。发布包 SQLite/CGO 元数据边界见 [发布包 SQLite/CGO 边界审计](maintenance/package-sqlite-boundary-audit-2026-06-23.md)，目标平台 SQLite 运行态仍需 `--cgo` 发布包 smoke 补证。

生产或类生产发布证据可从 [发布证据模板](release/release-evidence-template.md) 复制，并用 `powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -Path <发布证据文件>` 检查迁移、备份、密钥脱敏、烟测和回滚记录是否完整。

## 当前能力

| 能力 | 状态 |
| --- | --- |
| 后端服务 | Go 进程入口、配置加载、生命周期、数据库、缓存、存储、日志、HTTP/RPC 装配 |
| 初始化 | `/setup` 向导与后端 setup schema/status/run API 打通 |
| IAM | 登录、注册、邀请、组织、用户、角色、权限、API Token、会话、审计 |
| System | 菜单、配置快照、API catalog、权限同步、操作记录、媒体、版本、参数、字典、探针 |
| Announcements | 端到端业务示例模块，覆盖公告列表、创建、编辑、发布、归档、删除、权限、后台页面和公开只读产品线入口 |
| WebUI | React 统一前端，覆盖公开页面、初始化向导和后台控制台 |
| 扩展方式 | 通过 `internal/modules` 新增业务模块；插件系统已移除 |

## 维护原则

- 文档不得描述已删除的插件系统、旧前端入口或未暴露的生产能力。
- 新增主系统 HTTP API 必须先进入 `internal/transport/http/contracts.go`，再生成 `docs/api/openapi.yaml`。
- 新增业务功能应落在模块层，并通过应用装配层注入基础设施能力。
- 用户可见文案应进入 i18n 资源；产品名称和部署差异应进入配置。
