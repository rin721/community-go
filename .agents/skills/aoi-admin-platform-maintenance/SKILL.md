---
name: aoi-admin-platform-maintenance
description: "Repository-specific maintenance workflow for the aoi-admin / open console platform repository. Use when Codex works in this repo on architecture refactors, extension-boundary governance, module additions, Go backend or React WebUI changes, i18n/config/API contracts, README/AGENTS/docs sync, release/readiness gates, validation, or open-source platform acceptance. Enforces code-first analysis, layered boundaries, module-first extension, Chinese-first documentation, and scope-matched verification."
---

# Aoi Admin Platform Maintenance

使用本 skill 处理当前仓库的架构重构、功能补齐、文档同步、验证和发布前收口。它补充根 `AGENTS.md`，不得覆盖或削弱根规则；如果二者冲突，以根 `AGENTS.md` 和用户最新要求为准。

## 开始前

1. 先读取根 `AGENTS.md`、`docs/README.md` 和与任务相关的目录 README。
2. 用 `git status --branch --short` 确认工作树；不要覆盖用户改动。
3. 以真实代码、配置、路由、脚本、测试和运行结果为事实来源，文档只作辅助证据。
4. 先用 `rg` / `rg --files` 查入口、引用和残留，再决定修改范围。
5. 保留根 README 中受控的 Aoi 项目代号语境；运行时配置、API、日志、错误、前端生产文案和部署默认值必须使用当前品牌、入口和脚手架命名来源。

## 架构边界

- `cmd/console` 是当前 Go 进程入口，命令层保持轻薄。
- `internal/app` 负责应用生命周期、装配、启动、停止、重载和基础设施注入。
- `internal/modules` 是业务扩展位置；新增业务能力走模块化开发。
- 模块内 `model` 承载领域数据，`service` 承载用例和本地接口，`handler` 做传输适配，`repository` / `infrastructure` 隔离 ORM、缓存、外部协议等实现。
- `pkg` 只放可复用基础能力，不能依赖 `internal/app` 或 `internal/modules`。
- `types` 只放平台级生命周期、跨层契约、认证上下文、通用错误和结果辅助；业务 DTO 和模块私有类型留在模块内。
- `web/app` 是当前 React 一体化前端；公开页、`/setup` 和 `/admin` 都在这里维护。

## 修改流程

1. 分析当前阶段涉及的代码、配置、脚本、文档和测试，列出真实实现与漂移点。
2. 给出最小但完整的修复方案；不要一次性做无边界重构。
3. 修改代码前说明将编辑哪些文件和原因。
4. 代码与文档同步修改；README、AGENTS、i18n、OpenAPI、测试矩阵和发布文档必须跟随真实行为。
5. 调整实现时同步更新代码、配置、文档、示例、测试、脚本和运行手册中的相关引用。
6. 按风险运行验证；失败时说明原因、影响范围和下一步。
7. 任务结束且有文件变更时，使用 `$git-conventional-commit` 收尾，除非用户明确要求不要提交。

## 后端规则

- 新增或修改主系统 HTTP API 时，先更新 `internal/transport/http/contracts.go`，再生成 `docs/api/openapi.yaml`。
- Handler 只做输入输出适配；校验、事务、权限语义和领域规则放在 service。
- Service 定义自己需要的最小接口，通过构造函数接收依赖；不要直接初始化数据库、缓存、HTTP client、SMTP、logger 或 config loader。
- 工具库、repository 和 infrastructure 不得吞掉错误；错误、状态和结果要返回上层处理。
- 触及配置项时，同步配置结构、默认值、示例配置、环境变量说明、后端 i18n 标签、文档和测试。

## 前端规则

- 用户可见文案进入 `web/app/app/i18n/locales/zh-CN.json` 和 `en-US.json`；不要在页面、组件、store、表格列或 schema 中硬编码展示文本。
- 后台 API 通过 `web/app/app/lib/api` 的 endpoint 表和 API client；不要散落新的 `/api/v1` 字符串。
- 服务端数据使用 TanStack Query；本地偏好和认证快照使用 Zustand。
- 可见 UI 变更要检查桌面和移动端布局、空/加载/错误状态、权限禁用态、焦点和键盘操作。
- 不要凭空实现后端未暴露的生产能力；页面能力必须对应后端 API、权限、配置、持久化和审计边界。

## 模块化扩展边界

遇到扩展、权限、菜单、路由、配置、文档或发布脚本变更时，确认交付面只描述当前模块化路径：

- `internal/modules`
- `internal/app/initapp`
- `internal/transport/http/contracts.go`
- 后端 API catalog 与权限同步
- 前端 API client、页面、i18n 和测试
- 受控配置示例、部署示例和发布脚本中的当前配置项

推荐验证：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
```

## 常用验证

按影响范围选择最小但足够的验证：

```powershell
go test ./internal/config ./internal/transport/http ./types/... -count=1 -mod=readonly
go test ./... -count=1 -mod=readonly
go vet ./...
go run ./cmd/console api openapi --output docs/api/openapi.yaml
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app test
pnpm --dir web/app build
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-local-tooling.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-package-sqlite-boundary.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
git diff --check
```

可见 UI、发布候选、Docker、部署或安全相关工作需要追加对应脚本、Playwright、视觉 QA、deployment-review 或目标环境证据。当前机器缺少 Docker 时，不要把容器构建/运行写成已通过。

## 阶段输出

阶段性任务按用户要求输出：

```md
## 当前阶段
## 分析结果
## 变更内容
## 架构影响
## 验证结果
## 文档更新
## 剩余问题
## 下一阶段建议
```

说明必须包含事实依据、修改文件、删除或迁移内容、验证命令和残留风险。
