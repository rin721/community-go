# 工作区收敛审计：2026-06-23

本文记录重构工作树的收敛口径、历史变更规模和发布前复核建议。它用于发布前或创建 PR 前审查，不替代 CI、目标环境验证或人工评审。

## 当前状态

入口收敛、旧命名扫描、插件移除和总任务计划的本轮取证见 [2026-06-23 入口与插件移除审计](entry-plugin-removal-audit-2026-06-23.md)、[2026-06-23 插件系统移除收敛审计](plugin-removal-convergence-audit-2026-06-23.md) 和 [2026-06-23 开源平台化重构任务计划](refactor-roadmap-2026-06-23.md)。本文只描述工作区收敛口径、历史删除分布和提交/PR 拆分建议，不替代运行验证。

当前统计必须由 `git status --short` 和 `scripts/check-worktree-convergence.ps1` 现场输出决定。本文不再手写瞬时数量，因为任何后续文档修正都会立即改变 `git status` 结果。需要记录发布或 PR 证据时，应复制当次脚本输出到对应发布记录或 PR 描述中。该脚本同时检查 `git ls-files`，确保 `.env`、本地配置、根级运行态目录、生成目录和测试报告没有被版本库跟踪；源码内明确用于测试的 fixture 目录不属于根运行态目录。

删除项按顶层目录统计：

| 顶层路径 | 删除数量 | 解释 |
| --- | ---: | --- |
| `docs` | 35 | 删除分散 AI 文档、插件协议文档和插件模块说明 |
| `web` | 32 | 删除旧插件页面、旧品牌主题包、旧 `en` locale 与旧组件路径 |
| `pkg` | 30 | 删除插件运行时、插件协议、插件 transport 和插件 API 包 |
| `internal` | 13 | 删除插件装配、插件配置和插件迁移相关实现 |
| `_examples` | 4 | 删除远程插件示例 |
| `types` | 3 | 删除不再属于全局类型层的常量 |
| `cmd` | 2 | 删除旧入口目录 |
| `configs` | 1 | 删除远程插件配置示例 |

发布前必须同时审查 `git status --short`、`git diff --stat -- .` 和 `scripts/check-worktree-convergence.ps1` 输出。`git diff --stat` 不包含未跟踪文件，也不能证明本地或生成路径没有被 Git 跟踪，因此不能单独作为工作树收敛证据。

## 重点替代路径

| 旧方向 | 当前替代 | 当前事实 |
| --- | --- | --- |
| 旧进程入口目录 | `cmd/console` | 旧入口目录不存在，`cmd/console` 存在 |
| 插件运行时目录 | `internal/modules` 显式模块装配 | `internal/plugin`、`pkg/plugin`、`pkg/pluginapi` 均不存在 |
| 远程插件协议文档 | 模块接入蓝图 | `docs/api/plugin-protocol` 不存在，`docs/extension/module-blueprint.md` 存在 |
| 旧前端组件命名空间 | `web/app/app/components/console` | 旧组件目录不存在，`components/console` 存在 |
| 旧英文 locale 文件名 | `web/app/app/i18n/locales/en-US.json` | 旧 `en.json` 不存在，`en-US.json` 存在 |
| 旧品牌内置主题包 | `web/app/app/theme/packages/builtin/default` | 旧主题包目录不存在，`builtin/default` 存在 |

## 历史变更分组建议

平台化重构曾跨越多个边界，不建议在对外审查时只用一个笼统说明概括。若需要拆 PR 或写审查说明，推荐按以下范围呈现：

1. 入口与命名收敛：`cmd/console`、module path、CI、Docker、部署脚本、README、AGENTS。
2. 插件系统移除：`internal/plugin`、`pkg/plugin`、`pkg/pluginapi`、插件迁移、插件协议文档、前端插件入口、插件配置示例。
3. 架构边界与类型层：`internal/import_boundary_test.go`、`types/*`、`docs/architecture/*`、关键目录 README。
4. Announcements 示例模块：后端模块、迁移、HTTP contract、OpenAPI、前端 API、后台/公开页面、i18n、Playwright。
5. 前端平台化与视觉修复：`web/app` 路由、主题包、i18n locale、公开/后台页面、视觉 QA 配置。
6. 文档和验收证据：`docs/README.md`、模块文档、测试矩阵、发布前记录、最终差距审计和工作区收敛审计。

每组的建议路径、验证命令、阻塞条件和拆分顺序见 [2026-06-23 PR 拆分计划](pr-split-plan-2026-06-23.md)。后续创建提交或 PR 时，应以该计划为主，本文只保留规模和分布事实。

## 发布前必须收敛的事项

| 项目 | 当前状态 | 发布前要求 |
| --- | --- | --- |
| 未跟踪文件 | 以 `git status --short` 输出为准 | 审查后按范围加入提交或明确删除 |
| 删除项 | 0 个删除项 | 本轮未新增删除；历史插件删除已在前序提交和审计中说明 |
| 生成或本地文件 | 根级 `tmp/`、`build/`、根级 `data/`、`.env`、`configs/config.yaml`、`configs/config.local.yaml` 当前不作为交付事实 | 发布前保持忽略且不得被 Git 跟踪；由 `scripts/check-worktree-convergence.ps1` 现场检查 |
| Docker | 当前机器无 Docker CLI 和 Bash；CI workflow 已配置 Bash 容器 smoke | 在目标环境补镜像构建和容器烟测，或保留当前提交的 CI 运行通过记录 |
| 全量验证 | 已有多轮本地验证，且本地已形成干净提交边界 | 发布候选或 PR 边界继续重跑完整后端、前端和 Playwright 验证 |

## 建议的收敛命令

发布或创建 PR 前至少执行：

```powershell
git status --short
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
git diff --stat
git diff --check
go test ./... -count=1 -mod=readonly
go vet ./...
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app test
pnpm --dir web/app build
```

如变更包含可见 UI 或后台工作流，还应补跑：

```powershell
pnpm --dir web/app test:e2e
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
```

如具备 Docker：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/docker-smoke.ps1
```

Linux、macOS 或 CI 环境：

```bash
bash scripts/docker-smoke.sh
bash scripts/docker-smoke.sh --skip-build --image console-platform:ci --container console-platform-ci-smoke
```

## 审计结论

当前本地工作区应以 `scripts/check-worktree-convergence.ps1 -FailOnDirty` 的现场输出证明是否干净。下一步应优先在远端 PR/CI 或目标环境中补齐审查、容器和生产级发布证据，并在对应边界复跑发布级验证。
