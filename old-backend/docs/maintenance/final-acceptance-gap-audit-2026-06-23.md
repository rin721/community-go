# 最终验收差距审计：2026-06-23

本文按目标提示词逐项审计当前工作树，不把“已有进展”改写成“全部完成”。结论以当前文件、目录、脚本、测试和命令输出为准；无法在当前机器验证的项目明确标为缺证。

## 总体结论

当前工作树已经满足开源后台管理 / 控制台平台的主体形态：后端入口、模块化扩展、核心后台能力、React WebUI、中文文档、Agent 规则、i18n、类型/错误规范和本地验证链路都有对应证据。

仍不能标记为完整最终完成的原因：

- 当前机器缺少 Docker CLI，镜像构建和容器运行态烟测未在本机执行；当前 main 提交 `363aebe694703ec1349e5d5e3e427b8a76f02d5b` 已通过 CI run `28029100140` 的 Docker build、Bash 容器 smoke 和 `docker-smoke-evidence` artifact 校验，可作为当前提交的容器证据。
- 当前是本地重构验收，不是生产发布；生产迁移、备份、密钥注入和回滚演练未补证。
- 可见 UI 已有代表性 Playwright 视觉 QA，并已为当前 `smoke.spec.ts` 生成全量桌面/移动端截图基线；IAM 通知队列运维页另有聚焦桌面/移动端视觉证据；生产级跨浏览器和真实环境视觉仍需目标环境补证。
- 工作区收敛状态必须以 [2026-06-23 工作区收敛审计](worktree-convergence-2026-06-23.md) 中的现场检查命令为准；当前已经具备本地干净提交边界，正式合并或发布前仍需按 [2026-06-23 PR 拆分计划](pr-split-plan-2026-06-23.md) 形成远端 PR/CI 审查证据，并在目标边界复跑发布级验证。

状态说明：

| 状态 | 含义 |
| --- | --- |
| 已证明 | 当前文件或命令输出足以证明该项在本地工作树成立 |
| 部分证明 | 主体已完成，但存在环境缺证、覆盖不足或发布前仍需补证 |
| 未证明 | 当前没有足够证据，不能声明完成 |

## 目标要求逐项审计

| 要求 | 当前状态 | 证据 | 差距或后续动作 |
| --- | --- | --- | --- |
| 以真实代码为主要依据，而不是只按文档修复 | 已证明 | `docs/maintenance/open-source-readiness.md`、本文件、`docs/release/preflight-2026-06-23.md` 都记录了命令、目录和测试证据 | 继续维护时必须让文档跟随代码事实，不得只改说明 |
| 分阶段推进，不一次性无边界重构 | 已证明 | 当前文档按架构、模块、类型、测试、发布等主题拆分；`docs/testing/*` 和 `docs/release/*` 分别留证 | 后续新增变更仍需在提交/PR 前按范围做分批审查 |
| 修正架构设计偏移和职责边界 | 已证明 | `docs/architecture/layers.md`、`internal/README.md`、`internal/app/README.md`、`internal/modules/README.md`、`pkg/README.md`、`types/README.md`、`internal/import_boundary_test.go` | 未来新增模块仍需继续跑边界测试，防止 service 直接依赖基础设施实现 |
| 移除插件系统并改为模块化扩展 | 已证明 | `internal/plugin`、`pkg/plugin`、`pkg/pluginapi`、`_examples/remote-plugins`、`docs/api/plugin-protocol` 当前目录不存在；插件残留扫描无输出；`AGENTS.md`、`docs/extension/module-blueprint.md`、[入口与插件移除审计](entry-plugin-removal-audit-2026-06-23.md) 和 [模块化扩展与插件移除二次审计](module-extension-plugin-removal-audit-2026-06-23.md) 固定模块化路线；`internal/import_boundary_test.go` 防止插件交付目录和受控配置示例恢复 | 不保留运行期动态插件扫描；如未来需要扩展，只能通过显式模块装配 |
| 形成完整可用的后台管理 / 控制台最小闭环 | 部分证明 | IAM/System/Announcements 文档、OpenAPI、Playwright、运行烟测、视觉 QA 和 main CI Docker artifact 证明本地与 CI 闭环；`docs/modules/*.md` 有模块说明；IAM 通知队列已有脱敏列表、手动重试、菜单权限和聚焦视觉证据 | 生产迁移、真实部署环境和完整消息中心、消息模板、订阅偏好、多渠道编排等更高阶能力未作为当前最小闭环证明 |
| 建立清晰分层架构 | 已证明 | `cmd/console`、`internal/app`、`internal/modules`、`pkg`、`types`、`web/app` 均有 README 或架构文档；`docs/structure/directory-map.md` 说明目录地图 | 新增目录必须同步 README 或专题说明 |
| 每个重要目录或模块有 README/说明文档 | 已证明 | `scripts/check-doc-readmes.ps1` 已检查关键目录的非空 README 与 Markdown 标题，覆盖根入口、`docs`、`internal`、`internal/modules`、`pkg`、`types`、`web/app` 和 React 前端关键目录；`scripts/check-doc-links.ps1` 已检查根 README、AGENTS、仓库级 skill、`docs/**`、关键源码 README 和 React 前端文档中的相对文件、目录、图片路径和 Markdown 锚点；`scripts/check-open-source-readiness.ps1` 已检查关键路径，并把项目 skill、README 覆盖脚本、文档链接检查脚本、skill 结构校验脚本、本机工具检查、错误与结果边界检查、后台补偿观测模板检查、发布包 SQLite/CGO 边界检查、构建与 CI、CI Docker 证据校验、CLI 工作流、已知缺口和维护指南入口纳入防漂移检查 | 发布前继续用脚本检查新增关键目录、模块或 skill 是否缺说明 |
| 中文优先：文档、README、AGENTS、开发说明、i18n | 已证明 | `AGENTS.md`、`docs/**/*.md`、模块 README 以中文为主；`pnpm --dir web/app lint:i18n` 通过 | 代码标识符继续按 Go/TypeScript 惯例使用英文 |
| 禁止明显品牌硬编码和旧脚手架命名 | 已证明 | 历史品牌/旧仓库名扫描无输出；产品名、产品码、issuer、存储等由配置和 i18n 管理 | `configs/config.local.yaml`、`tmp/`、`build/` 等本地/生成目录不作为交付事实 |
| 类型定义归属清晰 | 已证明 | `types/README.md`、`types/auth/README.md`、`types/constants/README.md`、`types/errors/README.md`、`types/result/README.md`、`types/import_boundary_test.go`、[后端分层边界审计](backend-boundary-audit-2026-06-23.md)、[i18n、类型、错误与结果封装审计](i18n-types-errors-audit-2026-06-23.md)，以及 `go test ./types/...` 通过 | 未来业务 DTO 和模块私有错误必须保留在模块内；跨层认证上下文使用 `types/auth`，不能让非 IAM 模块依赖 IAM service |
| 错误、结果、状态不被底层吞掉 | 部分证明 | `AGENTS.md` 与 `docs/architecture/error-result-contracts.md` 固定规则；`types/result`、`types/errors` 测试通过；`scripts/check-error-result-boundaries.ps1` 已把生产 Go 代码中的显式忽略错误候选和 best-effort allowlist 纳入默认发布前 gate；[i18n、类型、错误与结果封装审计](i18n-types-errors-audit-2026-06-23.md) 记录全局错误码收窄和分页 helper 边界；System/IAM 相关测试覆盖关键路径 | 脚本不能形式化证明所有未来工具库都不吞错；新增工具库仍必须补失败路径测试 |
| 前端请求封装、错误处理和 i18n 策略清晰 | 已证明 | `web/app/app/lib/api`、`ApiError`、endpoint 表、i18n 资源、`app/frontend-boundary.test.ts` 和 `lint:i18n` 通过；`AGENTS.md` 禁止页面散落 `/api/v1` 和用户可见硬编码 | 未来新页面必须继续用 API client 和 locale 资源 |
| `/ai/**` 分散规则删除并合并到根 `AGENTS.md` | 已证明 | `docs/ai`、根 `ai`、`.ai` 当前不存在；根 `AGENTS.md` 是项目级唯一入口；`.agents/skills` 和 `tools/ai` 被界定为工具配置；仓库级维护、文档治理、构建 CI、配置治理、新开发者入门、模块开发、IAM 治理、API 契约、插件移除、WebUI/i18n、发布验收、CLI/运行时生命周期、可观测性、错误结果契约、数据库迁移数据治理、阶段任务计划、PR 审查、视觉 QA、安全依赖治理和提交规范 skill 已进入 readiness 关键路径，并由 `scripts/check-agent-skills.ps1` 检查 front matter 与 OpenAI 触发元数据 | 如果未来新增 AI 规则，只能进入根 `AGENTS.md` 或明确的工具/技能配置 |
| 前端视觉可用性审查 | 已证明当前 smoke 范围 | `docs/testing/visual-qa-2026-06-22.md` 记录桌面/移动端代表性视觉用例；`docs/testing/visual-qa-full-2026-06-23.md` 记录全量 smoke 截图基线；`docs/testing/visual-qa-notification-outbox-2026-06-23.md` 记录通知队列聚焦桌面/移动端视觉证据；[前端分层与交互边界审计](frontend-boundary-audit-2026-06-23.md) 固定 API、SSE 例外和 UI 组件边界 | 不替代真实生产数据、Docker 环境、跨浏览器和 Lighthouse/辅助技术审查 |
| 构建、启动、脚本和部署链路可验证 | 部分证明 | Go/React 构建、OpenAPI、package.py、本地运行烟测、新开发者演练、`scripts/check-local-tooling.ps1` 本机工具检查、`scripts/release-preflight.ps1` 发布前 gate、`scripts/check-error-result-boundaries.ps1` 错误边界检查、`scripts/check-operational-observation-template.ps1` 后台补偿观测模板检查、`scripts/check-worktree-convergence.ps1` 工作树收敛审计、`scripts/check-release-evidence.ps1` 发布证据校验、`scripts/runtime-smoke.ps1` 真实进程烟测、Docker 静态链路证明、`scripts/docker-smoke.ps1` / `scripts/docker-smoke.sh` 容器烟测入口、CI Bash 容器 smoke 配置、main CI run `28029100140`、[CI Docker 证据校验脚本审计](ci-docker-evidence-check-audit-2026-06-23.md)、[发布前 gate 脚本审计](release-preflight-script-audit-2026-06-23.md)、[发布证据校验脚本审计](release-evidence-validator-audit-2026-06-23.md)、[构建配置与启动链路审计](build-config-startup-audit-2026-06-23.md) 和 [测试、可观测性、部署与演示环境审计](testing-deployment-observability-audit-2026-06-23.md) 已归档 | Docker 镜像构建与容器运行已由 CI 证明但未在本机执行；生产部署脚本仍需目标环境执行证明 |
| 认证、权限、菜单、用户、角色、审计等基础后台能力 | 已证明 | `docs/modules/iam.md`、`docs/modules/system.md`、`docs/modules/permission-matrix.md`、[后台核心权限闭环审计](auth-permission-core-audit-2026-06-23.md)、OpenAPI、Playwright smoke、模块测试和通知队列聚焦 QA | 完整通知/消息中心等更高阶能力仍可作为 backlog，不阻塞当前最小闭环 |
| 示例业务模块和模块开发规范 | 已证明 | Announcements 模块、迁移、后端 handler/service/repository、前端页面、公开入口、权限、i18n、测试和 `docs/modules/announcements.md` 已补齐；`docs/extension/module-blueprint.md` 描述接入步骤 | 后续新增模块应复制该闭环，而不是只加后端或只加页面 |
| 测试、可观测性、发布和演示环境文档 | 已证明 | `docs/testing/test-matrix.md`、`docs/onboarding/demo-environment.md`、`docs/release/preflight-checklist.md`、`docs/release/release-evidence-template.md`、`docs/release/operational-observation-template.md`、`docs/release/preflight-2026-06-23.md`、`docs/maintenance/refactor-roadmap-2026-06-23.md`、`scripts/release-preflight.ps1`、`scripts/check-plugin-removal.ps1`、`scripts/check-operational-observation-template.ps1`、`scripts/check-worktree-convergence.ps1`、`scripts/check-release-evidence.ps1`、`scripts/runtime-smoke.ps1`、[发布前 gate 脚本审计](release-preflight-script-audit-2026-06-23.md)、[发布证据校验脚本审计](release-evidence-validator-audit-2026-06-23.md)、[测试、可观测性、部署与演示环境审计](testing-deployment-observability-audit-2026-06-23.md)、`docs/maintenance/open-source-readiness.md` | 正式发布前需要目标环境补真实发布证据 |
| 新开发者可以快速理解和扩展 | 部分证明 | `README.md`、`docs/README.md`、目录地图、模块蓝图、新开发者路径演练均存在 | 新开发者路径已在当前机器演练；Docker 路径可引用 main CI artifact，目标环境发布仍需补真实部署 smoke |
| AI Agent 可以长期稳定维护 | 已证明 | 根 `AGENTS.md` 覆盖目标、分层、开发规范、i18n、插件移除、测试和输出要求；`.agents/skills/aoi-admin-platform-maintenance`、`aoi-admin-docs-governance`、`aoi-admin-build-ci-governance`、`aoi-admin-config-governance`、`aoi-admin-dev-onboarding`、`aoi-admin-module-development`、`aoi-admin-iam-governance`、`aoi-admin-api-contract-sync`、`aoi-admin-plugin-removal`、`aoi-admin-webui-i18n`、`aoi-admin-release-readiness`、`aoi-admin-runtime-cli-governance`、`aoi-admin-observability-ops`、`aoi-admin-error-result-governance`、`aoi-admin-data-migration-governance`、`aoi-admin-task-planning`、`aoi-admin-pr-review-governance`、`aoi-admin-visual-qa-governance`、`aoi-admin-security-dependency-governance` 和 `git-conventional-commit` 提供可复用执行流程，并由 `scripts/check-open-source-readiness.ps1` 检查存在性、`scripts/check-agent-skills.ps1` 检查结构和触发元数据 | 子目录规则不得覆盖根规则，后续维护时继续执行 |

## 第十阶段机器化补证

2026-06-23 新增并运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -SelfTest
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -RunId 28029100140 -CommitSha 363aebe694703ec1349e5d5e3e427b8a76f02d5b
```

结果通过：

```text
open-source readiness check passed.
required paths checked: 123
removed paths checked: 17
brand files scanned: 679
plugin delivery files scanned: 456
```

`check-doc-readmes.ps1` 当前输出：

```text
documentation README coverage check passed.
README directories checked: 81
```

`check-doc-links.ps1` 当前输出：

```text
documentation link check passed.
markdown files checked: 180
relative links checked: 202
```

本次脚本化检查补齐了关键 README、README 覆盖 gate、文档链接 gate（覆盖根 README、AGENTS、仓库级 skill、`docs/**`、关键源码 README 和 React 前端文档）、项目 skill、skill front matter 与 OpenAI 触发元数据、发布包 SQLite/CGO 边界检查、构建与 CI、CLI 工作流、已知缺口、维护指南入口、已删除插件路径不存在、受控配置示例无插件块、前后端 locale 文件命名、旧品牌命名、生产交付面插件残留和工作树收敛状态的可重复验收。详细记录见 [2026-06-23 最终开源可用性审计](final-open-source-readiness-audit-2026-06-23.md)、[2026-06-23 发布包 SQLite/CGO 边界审计](package-sqlite-boundary-audit-2026-06-23.md) 与 [2026-06-23 工作区收敛审计](worktree-convergence-2026-06-23.md)。

## 当前不能关闭的验收缺口

| 缺口 | 为什么不能忽略 | 需要的强证据 |
| --- | --- | --- |
| 目标环境部署 smoke | main CI 已证明当前提交的 Docker build 与容器 smoke，但正式发布的镜像摘要、资源限制、外部数据库、对象存储和目标地址仍可能与 CI smoke 不同 | 发布证据记录镜像标签、镜像摘要、资源限制、目标地址 `/health`、`/ready`、`/openapi.yaml`、`/admin` smoke；如目标环境重新构建镜像，再执行 `scripts/docker-smoke.ps1` 或 `scripts/docker-smoke.sh` |
| 生产迁移与备份 | 新增 Announcements 迁移的 `Down` 会删表，生产回滚需要备份策略 | 目标数据库 `db migrate status/up`、备份位置、恢复方案 |
| 密钥注入与部署配置 | 当前文档只证明示例配置和本地变量，不证明目标环境 secret 安全 | 目标环境环境变量或密钥系统配置清单，密钥脱敏记录 |
| 生产级 / 跨浏览器视觉 QA | 当前已生成 `smoke.spec.ts` 全量 120 张桌面/移动端截图基线，但不是目标环境、真实数据或跨浏览器检查 | 发布候选继续用 `scripts/visual-qa.ps1 -All` 留存截图，并在目标环境补 Chrome/Firefox/Edge/Safari 或真实设备抽查 |
| 发布前工作区复核 | 已补 `docs/maintenance/refactor-roadmap-2026-06-23.md` 和 `docs/maintenance/pr-split-plan-2026-06-23.md` 作为任务计划与拆分依据；当前本地已具备干净提交边界，后续状态必须以 `git status --short` 和 `scripts/check-worktree-convergence.ps1` 的现场输出为准 | 远端 PR/CI 结果、最终 `git status --short` 和 `scripts/check-worktree-convergence.ps1 -FailOnDirty` 审查 |

## 发布前最小补证顺序

1. 当前 main CI Docker 证据已由 run `28029100140` 和 `scripts/check-ci-docker-evidence.ps1` 校验通过；发布候选应引用该证据或目标环境重新执行 `scripts/docker-smoke.ps1` / `scripts/docker-smoke.sh`。
2. 基于当前干净提交创建发布候选，复跑 `go test ./...`、`go vet ./...`、前端 `typecheck/lint:i18n/test/build`、Playwright，并保留 CI 结果。
3. 针对目标数据库执行迁移状态检查和备份记录。
4. 补齐生产 secret 注入、回滚命令和观察窗口。
5. 用 `scripts/visual-qa.ps1 -All` 刷新全量 smoke 截图基线，并按发布范围补目标环境视觉抽查。

## 审计结论

当前项目已经大幅接近目标提示词要求的开源后台管理 / 控制台平台形态，当前 main 提交也已有 CI Docker 容器证据，但最终目标不能在本机闭环宣告为生产发布完成。最主要的外部缺口是生产级发布证据，最主要的持续性缺口是目标环境 smoke、目标环境视觉补证、迁移备份和回滚演练。
