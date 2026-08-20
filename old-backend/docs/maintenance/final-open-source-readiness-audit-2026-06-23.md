# 最终开源可用性审计：2026-06-23

本文是第十阶段“最终开源可用性审查”的补证记录，范围限定为本地工作树可自动证明的项目可复用性、关键说明文档、插件系统移除、旧品牌命名清理和 i18n 资源归属。本文不替代 Docker、生产部署、数据库备份、密钥注入和全量视觉 QA 的目标环境证据。

## 当前阶段

第十阶段：最终开源可用性审查。

本阶段检查范围：

- 根 README、工程文档入口、长期 Agent 规则和关键目录 README。
- 项目级可复用 skill、`agents/openai.yaml` 元数据和本地结构校验脚本。
- 已删除插件系统路径、插件协议、插件配置示例和前端插件入口。
- 前后端 canonical locale 资源。
- 旧品牌、旧脚手架、旧入口和旧插件交付面命名。
- 发布前可重复运行的检查脚本。

## 分析结果

前面阶段已经补齐了架构、模块化扩展、测试矩阵、运行烟测和最终差距文档，但最终验收仍有一部分依赖人工复制命令：

| 分类 | 发现的问题 | 判断 |
| --- | --- | --- |
| 架构问题 | 插件系统已删除，但防回潮检查分散在文档和 Go 边界测试中 | 需要补一个面向发布前的只读脚本 |
| 文档漂移 | 关键目录 README 曾依赖人工清单，`internal/modules` 与 React 前端内容、设计、脚本、测试目录容易漏补说明 | 以代码目录为准补齐源码目录说明，并用 `scripts/check-doc-readmes.ps1` 固定 README 覆盖 |
| 命名 / 硬编码问题 | 旧品牌扫描有手工命令，但没有整合到单一检查入口 | 需要纳入脚本化扫描 |
| 开源可复用性问题 | 关键路径存在性、已删除路径不存在、locale 文件命名、配置示例无插件块和仓库级 skill 结构未形成完整一键检查 | 需要机器化验收 |

## 变更内容

- 新增 `scripts/check-open-source-readiness.ps1`：
  - 检查根 README、`AGENTS.md`、项目级可复用 skill 及其 `agents/openai.yaml` 元数据、关键架构文档、构建与 CI 文档、CLI 工作流、已知缺口、测试文档、发布文档、检查脚本和源码目录 README 是否存在。
  - 检查 `docs/README.md` 与 `docs/maintenance/README.md` 是否保留总任务计划、PR 拆分计划和最终验收差距审计入口，避免用户只能从聊天上下文寻找阶段计划。
  - 检查维护指南是否继续指向根 `AGENTS.md`、结构化文档、`.agents/skills` 和临时证据目录，而不是恢复已删除的分散 AI 规则入口。
  - 检查 `cmd/aoi`、`internal/plugin`、`pkg/plugin`、`pkg/pluginapi`、插件协议文档、插件配置示例、前端插件路由和旧组件/主题目录是否不存在。
  - 检查前后端 `zh-CN`、`en-US` locale 资源是否存在，且前端旧 `en.json` 不再存在。
  - 扫描交付面旧品牌和旧脚手架命名。
  - 扫描生产代码、配置、脚本和前端生产目录中的插件交付残留。
- 新增 `scripts/check-doc-readmes.ps1`：
  - 检查根入口、`docs`、`internal`、`internal/modules`、`pkg`、`types`、`web/app` 和 React 前端关键目录是否都有非空 README。
  - 要求 README 至少包含 Markdown 标题，避免空壳说明被当成有效文档。
  - 已纳入 `scripts/check-open-source-readiness.ps1` 和默认 `scripts/release-preflight.ps1`。
- 新增 `scripts/check-doc-links.ps1`：
  - 检查根 `README.md`、`AGENTS.md`、仓库级 skill、`docs/**`、关键源码 README 和 React 前端文档中的 Markdown 链接、图片相对路径、目录路径和 Markdown 锚点是否存在。
  - 跳过外部 URL、邮件、电话和代码块中的示例链接，避免本地 gate 依赖网络。
  - 已纳入 `scripts/check-open-source-readiness.ps1` 和默认 `scripts/release-preflight.ps1`。
- 新增 `scripts/check-agent-skills.ps1`：
  - 检查 `.agents/skills/*/SKILL.md` 是否存在可解析 front matter、目录名是否与 `name` 一致、`description` 是否存在。
  - 对仓库级维护、文档治理、构建 CI、配置治理、新开发者入门、模块开发、IAM 治理、API 契约、插件移除、WebUI/i18n、发布验收、CLI/运行时、可观测性、错误结果、数据迁移、阶段任务计划、PR 审查、视觉 QA、安全依赖和提交规范 skill，强制检查 `agents/openai.yaml` 的 `interface`、`display_name`、`short_description` 和带 `$<skill-name>` 的 `default_prompt`。
  - 已纳入默认 `scripts/release-preflight.ps1`、发布证据模板和发布证据校验脚本，避免仓库级 skill 只停留在文件存在性检查。
- 新增 `scripts/check-error-result-boundaries.ps1`：
  - 扫描 `internal`、`pkg` 和 `types` 下生产 Go 文件中的显式 `_ =` 忽略错误候选。
  - 对关闭、删除、写入、同步、发送或停止等高风险忽略行为要求返回错误、记录状态，或进入带原因说明的 allowlist。
  - 已纳入默认 `scripts/release-preflight.ps1`，避免新增工具库、service 或运行时装配绕过错误治理规则。
- 新增 `scripts/check-operational-observation-template.ps1`：
  - 检查后台补偿观测记录模板保留 IAM 授权策略重载、IAM 通知投递队列、System 维护清理和流量探针的目标环境观测项。
  - 检查模板中的 scheduler、配置项、后台页面、日志关键字、审计行为和敏感信息脱敏提醒，防止发布观测入口漂移。
  - 已纳入默认 `scripts/release-preflight.ps1`、发布证据模板和发布证据校验脚本；它只证明模板结构，不替代目标环境真实观测。
- 新增 `scripts/check-package-sqlite-boundary.ps1`：
  - 复跑 `scripts/package.py` 默认 CGO=0 与 `--cgo` 两种 dry-run。
  - 检查默认发布包明确提示 SQLite 不可用，`--cgo` 计划明确提示 SQLite 可用。
  - 检查包内 `README.txt` 和 `manifest.json` 的 CGO/SQLite 字段来源没有漂移。
  - 已纳入默认 `scripts/release-preflight.ps1`、开源 readiness、发布 checklist、发布证据模板和发布包 SQLite/CGO 边界审计；它不替代目标平台 `--cgo` SQLite smoke。
- 新增 `scripts/check-local-tooling.ps1`：
  - 只读检查 `git`、`go`、`node`、`pnpm` / `corepack`、`python`、`gh`、`docker` 和 `bash` 可用性。
  - 默认只要求本地构建与测试必需工具可用，把 Docker、Bash、GitHub CLI 等外部补证工具缺失明确标记为 optional；发布包、CI artifact 或容器补证可通过参数升格为必需。
  - 已纳入默认 `scripts/release-preflight.ps1` 和 `scripts/check-open-source-readiness.ps1`，避免把工具缺失误写成验证通过。
- 新增 `scripts/release-preflight.ps1`：
  - 默认执行本机工具检查、Agent skill 检查、错误与结果边界检查、开源 readiness、聚焦 Go 测试、前端 i18n、视觉 QA 脚本语法、Docker PowerShell/Bash 烟测入口静态检查和空白检查。
  - 通过 `-Full`、`-IncludePackage`、`-IncludeRuntimeSmoke`、`-IncludeVisualQA`、`-IncludeDocker` 显式打开更重的发布候选检查。
- 新增 `scripts/check-worktree-convergence.ps1`：
  - 统计当前工作树总变更、修改、删除、未跟踪文件和顶层目录分布。
  - 拦截 `.env`、本地配置、根级运行态目录、生成目录和测试报告混入交付面。
  - 通过 `git ls-files` 复核这些本地或生成路径没有被版本库跟踪。
  - 默认不要求工作树干净；发布边界可使用 `-FailOnDirty` 强制干净工作树。
- 新增 `scripts/check-entry-brand-convergence.ps1`：
  - 检查 `cmd/console`、Go module path、Dockerfile、CI、发布包脚本、部署脚本和配置示例是否保持当前中性入口。
  - 检查旧入口目录不存在，并扫描入口/部署交付面的旧品牌和旧脚手架残留。
  - 已纳入默认 `scripts/release-preflight.ps1`。
- 新增 `scripts/check-plugin-removal.ps1`：
  - 检查插件运行时、协议、迁移、配置示例、文档和前端入口路径是否保持删除状态。
  - 检查模块化替代路径存在，受控配置示例和生产交付面无插件配置、插件 API 或插件协议残留。
  - 已纳入默认 `scripts/release-preflight.ps1`、发布证据模板和发布证据校验脚本。
- 新增 `docs/maintenance/refactor-roadmap-2026-06-23.md`：
  - 作为总任务计划入口，集中说明十个阶段的当前状态、证据入口、未闭环事项和下一步优先级。
- 新增 `docs/maintenance/entry-brand-convergence-audit-2026-06-23.md`：
  - 记录第一组拆分 PR 的真实入口事实、脚本边界和剩余风险。
- 新增 `docs/maintenance/pr-split-plan-2026-06-23.md`：
  - 将平台化重构成果拆为 6 个可审查提交或 PR 包。
  - 为每个包列出路径边界、验证命令和阻塞条件。
  - 明确文档验收证据应最后合并，避免引用尚未落地的代码事实。
- 新增 `scripts/docker-smoke.sh`：
  - 供 Linux、macOS 和 GitHub Actions 复用已构建镜像执行容器 smoke。
  - CI 在 Docker build 后执行 `bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke`。
- 新增 `scripts/check-release-evidence.ps1` 与 `docs/release/release-evidence-template.md`：
  - 模板独立承载发布证据结构。
  - 脚本在模板模式检查结构，在正式证据模式拒绝空占位、未执行结果和疑似明文密钥。
- 新增 `scripts/visual-qa.ps1`：
  - 默认复跑代表性 Playwright 视觉 QA。
  - 校验 `tmp/qa/visual-qa` 中的截图产物数量，避免发布前只保留历史截图。
- 新增 `cmd/README.md` 与 `cmd/console/README.md`，说明进程入口职责、扩展命令位置和验证方式。
- 新增 `configs/README.md`，说明配置示例、场景配置、后端 i18n 资源和本地配置边界。
- 新增 `deploy/README.md`，说明生产风格配置模板、Compose 示例、容器 smoke 和发布证据边界。
- 新增 `web/app/app/features/README.md`，说明前端 feature 层职责、放置规则和扩展规范。
- 新增 `web/app/app/routes/README.md`，说明公开、认证、初始化和后台路由分区，以及新增页面检查清单。
- 新增 `web/app/app/stores/README.md`，说明 Zustand 本地状态边界、敏感信息禁止项和持久化规则。
- 新增 `web/app/app/theme/README.md`，说明源主题包、生成产物、token 分层和主题验证流程。
- 新增 `web/app/content/README.md`，说明本地 Markdown 内容资源、locale/slug 边界和生成脚本关系。
- 新增 `web/app/design/README.md`，说明前端设计规则和视觉治理入口。
- 新增 `web/app/scripts/README.md`，说明主题、内容、i18n 和构建产物脚本边界。
- 新增 `web/app/tests/README.md`，说明 Playwright e2e、测试初始化和视觉 QA 扩展规则。
- 新增 `internal/modules/iam/README.md`，说明 IAM 模块职责、分层、扩展规则和验证命令。
- 新增 `internal/modules/system/README.md`，说明 System 模块职责、分层、扩展规则和验证命令。

## 架构影响

本阶段没有引入新的运行时抽象，也没有改变启动流程。新增脚本和 README 的作用是把既有架构决策固化为可重复检查：

- 未来业务扩展仍只能通过 `internal/modules` 模块化路线新增。
- 插件系统不再作为扩展机制，生产交付面不能恢复插件运行时、插件协议、插件 API 或插件配置块。
- 关键源码目录必须有说明文档，避免新开发者只从历史文档推断模块职责。
- 旧品牌、旧入口和旧脚手架命名在交付面回潮时会被发布前脚本直接拦住。

## 验证结果

已执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -IncludeVisualQA
powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1 -SelfTest
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -SelfTest
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -SelfTest
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -All -MinimumScreenshots 120
```

结果：

```text
open-source readiness check passed.
required paths checked: 117
removed paths checked: 17
brand files scanned: 679
plugin delivery files scanned: 456
```

`check-doc-readmes.ps1` 通过，确认 81 个关键目录具备非空 README 和 Markdown 标题。

该脚本是只读检查，不会写入 `configs/config.yaml`、`configs/config.local.yaml`、`data/` 或运行态目录。

`check-agent-skills.ps1` 已通过，确认全部 skill 的基础 front matter 可解析，仓库级 skill 的 OpenAI 元数据和默认触发提示一致。`check-local-tooling.ps1` 已通过，确认本机 Go、Node、pnpm、Python、GitHub CLI 可用，同时把 Docker 和 Bash 标记为 optional 缺失。`check-doc-links.ps1` 已通过，确认根 README、AGENTS、仓库级 skill、`docs/**`、关键源码 README 和 React 前端文档中的相对链接、图片路径、目录路径和 Markdown 锚点未断开。`check-entry-brand-convergence.ps1` 已通过，确认入口与部署交付面没有旧入口或旧品牌回退，且根 README 的 Aoi 项目代号作为受控品牌叙事例外处理。`check-plugin-removal.ps1` 已通过，确认插件运行时、插件协议、插件配置示例和前端插件入口没有回潮。`check-error-result-boundaries.ps1` 已通过，确认当前显式忽略错误候选都属于已说明的 best-effort 例外。`check-operational-observation-template.ps1` 已通过，确认后台补偿观测模板保留必要 marker、scheduler、配置项、后台页面、日志关键字和敏感信息脱敏提醒；该检查不替代目标环境真实观测。`check-worktree-convergence.ps1` 已通过，确认工作树收敛检查没有发现 `.env`、本地配置、根级运行态目录、生成目录或测试报告混入交付面或 Git 跟踪文件；发布边界应继续使用 `-FailOnDirty` 证明干净工作树。`release-preflight.ps1` 默认 gate 也已通过，覆盖本机工具检查、入口与品牌收敛、插件移除、错误与结果边界、Agent skill 检查、README 覆盖、文档链接检查、开源 readiness、工作树收敛审计、发布证据模板结构校验、后台补偿观测模板校验、发布证据未补证占位自检、CI Docker 证据校验器自检、聚焦 Go 测试、前端 i18n、视觉 QA 脚本语法、Docker PowerShell/Bash 烟测入口静态检查和 `git diff --check`。`release-preflight.ps1 -IncludeVisualQA` 已证明发布前 gate 能实际编排视觉 QA。`check-release-evidence.ps1 -TemplateMode` 已证明发布证据模板结构完整；`check-release-evidence.ps1 -SelfTest` 已证明正式发布证据会拒绝 `未执行`、`未验证`、`skipped`、`not run` 等未补证占位；`check-ci-docker-evidence.ps1 -SelfTest` 已证明 CI Docker 证据校验器会拒绝不完整 smoke log 和失败 workflow metadata，且 main CI run `28029100140` 已通过 `check-ci-docker-evidence.ps1 -RunId 28029100140 -CommitSha 363aebe694703ec1349e5d5e3e427b8a76f02d5b` 校验。`visual-qa.ps1` 默认代表性链路已通过并生成代表性截图；`visual-qa.ps1 -All` 已为全量 smoke 生成截图基线。

## 文档更新

本阶段同步更新：

- `scripts/README.md`
- `docs/testing/test-matrix.md`
- `docs/build/docker-and-ci.md`
- `docs/release/preflight-checklist.md`
- `docs/release/release-evidence-template.md`
- `docs/release/operational-observation-template.md`
- `docs/release/preflight-2026-06-23.md`
- `docs/maintenance/open-source-readiness.md`
- `docs/maintenance/refactor-roadmap-2026-06-23.md`
- `docs/maintenance/plugin-removal-convergence-audit-2026-06-23.md`
- `docs/maintenance/entry-brand-convergence-audit-2026-06-23.md`
- `docs/maintenance/final-acceptance-gap-audit-2026-06-23.md`
- `docs/maintenance/release-preflight-script-audit-2026-06-23.md`
- `docs/maintenance/release-evidence-validator-audit-2026-06-23.md`
- `docs/maintenance/visual-qa-runner-audit-2026-06-23.md`
- `docs/maintenance/worktree-convergence-2026-06-23.md`
- `docs/maintenance/pr-split-plan-2026-06-23.md`
- `web/app/app/features/README.md`
- `web/app/app/routes/README.md`
- `web/app/app/stores/README.md`
- `web/app/app/theme/README.md`
- `web/app/content/README.md`
- `web/app/design/README.md`
- `web/app/scripts/README.md`
- `web/app/tests/README.md`
- `docs/README.md`
- `AGENTS.md`

## 剩余问题

| 问题 | 原因 | 后续动作 |
| --- | --- | --- |
| 目标环境 Docker 发布证据仍需补齐 | 当前机器缺少 Docker CLI 和 Bash；main CI run `28029100140` 已完成当前提交的 Docker build、容器 smoke 和 artifact 校验 | 发布候选记录 main CI artifact；目标环境发布仍需记录镜像标签、镜像摘要、资源限制、目标地址 `/health`、`/ready`、`/openapi.yaml`、`/admin` smoke 和回滚准备 |
| 生产迁移、备份、密钥注入和回滚演练未补证 | 当前是本地重构验证，不是目标环境发布 | 使用 `docs/release/preflight-checklist.md` 留存目标环境证据 |
| 生产级 / 跨浏览器视觉 QA 未补证 | 当前已有代表性桌面/移动端证据、`scripts/visual-qa.ps1` 复跑入口和全量 smoke 截图基线，但不是目标环境、真实数据或跨浏览器检查 | 发布候选用 `scripts/visual-qa.ps1 -All` 刷新截图，并在目标环境补真实账号、真实数据和跨浏览器抽查 |

## 下一阶段建议

1. 发布候选引用 main CI run `28029100140` 的 Docker artifact；如目标环境重新构建镜像，再在具备 Docker 的机器补跑容器构建和运行烟测。
2. 如需对外审查或合并，基于 [PR 拆分计划](pr-split-plan-2026-06-23.md) 组织 PR 说明或拆分 PR，并按组复跑验证。
3. 使用 `scripts/check-open-source-readiness.ps1` 和 `scripts/check-worktree-convergence.ps1` 作为发布前固定检查项，并用 `scripts/release-preflight.ps1` 编排阶段收口 gate。
4. 用 `scripts/visual-qa.ps1 -All` 刷新全量 smoke 截图基线，并按 QA 模板补目标环境视觉证据。
