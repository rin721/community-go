# PR 拆分计划：2026-06-23

本文把当前大规模开源化重构工作树拆成可审查、可验证、可回滚的提交或 PR 边界。它不替代 `git diff` 审查，也不表示这些分组已经提交；正式创建 PR 前仍需在干净分支上按组复跑验证。

## 当前事实

平台化重构曾是一个大变更集，历史规模见 [工作区收敛审计](worktree-convergence-2026-06-23.md)。即使本地已经形成干净提交边界，对外审查时仍建议按本计划组织说明或拆分 PR，避免审查者难以判断插件移除、入口重命名、模块化示例、前端平台化、文档验收和发布脚本之间的因果关系。

拆分原则：

- 每组必须有清晰目标、路径边界和验证命令。
- 上游组未通过时，下游组不得宣称独立可交付。
- 不创建兼容旧入口、旧插件系统或旧品牌命名的临时 PR。
- 每组都必须说明删除内容的替代路径。
- 每组提交后都要运行 `scripts/check-worktree-convergence.ps1`，确认没有本地配置、根级运行态目录或生成目录混入。

## 推荐拆分顺序

| 顺序 | 分组 | 目标 | 是否可单独 PR |
| ---: | --- | --- | --- |
| 1 | 入口与品牌命名收敛 | 统一当前进程入口、模块路径、配置示例和部署命名 | 可以，但必须同时更新根 README、AGENTS 和构建脚本 |
| 2 | 插件系统移除 | 删除插件运行时、协议、配置、示例、文档和前端入口 | 可以，但必须保留模块化扩展文档和防回潮检查 |
| 3 | 架构边界、类型、错误和结果规则 | 固化 `internal`、`pkg`、`types` 的依赖边界和错误返回规范 | 可以，依赖入口命名和插件移除后的目录事实 |
| 4 | Announcements 示例模块 | 提供端到端模块化业务示例，证明未来扩展不走插件 | 可以，依赖 route contract、i18n 和前端 API client 已稳定 |
| 5 | React 前端平台化与视觉 QA | 收敛前端组件命名、locale、主题包、页面和视觉检查 | 可以，但与 Announcements 页面有交叉，需要谨慎拆路径 |
| 6 | 文档、测试、发布和验收证据 | 补齐 README、测试矩阵、发布 gate、运行烟测、最终审计 | 建议最后合并，避免证据引用未合并的代码路径 |

## 分组路径边界

### 1. 入口与品牌命名收敛

建议包含：

- `cmd/console/**`
- 删除 `cmd/aoi/**`
- `go.mod`、`go.sum`
- `README.md`、`AGENTS.md`
- `.env.example`
- `Dockerfile`
- `.github/workflows/**`
- `deploy/**`
- `deploy.sh`
- `script/install.sh`
- `scripts/package.py`
- `cmd/README.md`
- `cmd/console/README.md`
- `configs/README.md`
- `deploy/README.md`

验证命令：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
go test ./cmd/console -count=1 -mod=readonly
go build -mod=readonly -o ./tmp/console-server.exe ./cmd/console
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
git diff --check
```

阻塞条件：

- 仍存在 `cmd/aoi`、旧二进制名或旧模块路径。
- Docker、CI、发布包脚本仍引用旧入口。
- README 或 AGENTS 仍把项目描述为旧品牌或单一脚手架。

说明：`scripts/check-entry-brand-convergence.ps1` 已纳入默认 `scripts/release-preflight.ps1`，第一组单独拆 PR 时仍建议先运行该聚焦脚本，以便快速定位入口或命名回退。

### 2. 插件系统移除

建议包含：

- 删除 `internal/plugin/**`
- 删除 `pkg/plugin/**`
- 删除 `pkg/pluginapi/**`
- 删除 `_examples/remote-plugins/**`
- 删除 `docs/api/plugin-protocol/**`
- 删除 `docs/architecture/distributed-plugin-system.md`
- 删除 `docs/modules/plugins.md`
- 删除 `configs/examples/plugins-remote-rpc.example.yaml`
- 删除 `internal/config/app_plugins.go`
- 删除插件迁移文件
- 删除 `web/app/app/lib/api/plugins.ts`
- 删除 `web/app/app/routes/admin/plugins.tsx`
- 更新 `docs/extension/adding-modules.md`
- 更新 `docs/extension/module-blueprint.md`

验证命令：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
go test ./internal/config ./internal/transport/http ./internal/app/... -count=1 -mod=readonly
go test ./pkg/... -count=1 -mod=readonly
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
```

阻塞条件：

- 生产交付面仍暴露 `/api/v1/plugins` 或 `/plugin-api`。
- 配置示例仍保留 `plugins:` 块。
- 文档仍推荐通过插件扩展业务能力。

说明：`scripts/check-plugin-removal.ps1` 已纳入默认 `scripts/release-preflight.ps1`，第二组单独拆 PR 时仍建议先运行该聚焦脚本，以便快速定位插件运行时、配置或前端入口回退。

### 3. 架构边界、类型、错误和结果规则

建议包含：

- `internal/import_boundary_test.go`
- `types/**`
- `docs/architecture/layers.md`
- `docs/architecture/error-result-contracts.md`
- `internal/README.md`
- `internal/app/README.md`
- `internal/config/README.md`
- `internal/middleware/README.md`
- `internal/modules/README.md`
- `internal/ports/README.md`
- `internal/transport/README.md`
- `pkg/README.md`
- `pkg/*/README.md`

验证命令：

```powershell
go test ./types/... -count=1 -mod=readonly
go test ./internal/... -count=1 -mod=readonly
go test ./pkg/... -count=1 -mod=readonly
go vet ./...
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
```

阻塞条件：

- service 层重新直接依赖 `pkg` 具体实现或同模块 repository。
- 全局 `types` 重新承载业务 DTO、缓存 key 或基础设施常量。
- 文档规则和 `internal/import_boundary_test.go` 不一致。

### 4. Announcements 示例模块

建议包含：

- `internal/modules/announcements/**`
- `internal/migrations/20260622000100_create_announcements.sql`
- `internal/transport/http/contracts.go`
- `docs/api/openapi.yaml`
- `docs/modules/announcements.md`
- `web/app/app/lib/api/announcements.ts`
- `web/app/app/routes/admin/announcements.tsx`
- `web/app/app/routes/public/announcements.tsx`
- `web/app/app/routes/public/announcement-detail.tsx`
- 相关 i18n 资源、Playwright smoke 和模块导航变更

验证命令：

```powershell
go test ./internal/modules/announcements/... ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app test
pnpm --dir web/app test:e2e
```

阻塞条件：

- 后端模块没有 route contract、权限或 OpenAPI 证据。
- 前端页面绕过 API client 或硬编码用户可见文案。
- 模块文档没有说明扩展方式、权限和测试。

### 5. React 前端平台化与视觉 QA

建议包含：

- `web/app/AGENTS.md`
- `web/app/README.md`
- `web/app/app/**`
- `web/app/content/**`
- `web/app/design/**`
- `web/app/scripts/**`
- `web/app/tests/**`
- `web/app/playwright.visual.config.ts`
- `scripts/visual-qa.ps1`
- `docs/testing/visual-qa-*.md`

拆分时需要把 Announcements 专属页面和 API 与第 4 组协调，避免同一文件在两个 PR 中互相覆盖。

验证命令：

```powershell
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app test
pnpm --dir web/app build
pnpm --dir web/app test:e2e
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
```

阻塞条件：

- locale 资源不对齐。
- 页面新增 `/api/v1` 字符串而未通过 API endpoint 表。
- 可见 UI 变更没有桌面和移动端视觉证据。

### 6. 文档、测试、发布和验收证据

建议包含：

- `docs/README.md`
- `docs/maintenance/refactor-roadmap-2026-06-23.md`
- `docs/testing/**`
- `docs/release/**`
- `docs/maintenance/**`
- `docs/onboarding/**`
- `docs/structure/**`
- `scripts/README.md`
- `scripts/check-open-source-readiness.ps1`
- `scripts/check-plugin-removal.ps1`
- `scripts/check-worktree-convergence.ps1`
- `scripts/check-release-evidence.ps1`
- `scripts/release-preflight.ps1`
- `scripts/runtime-smoke.ps1`
- `scripts/docker-smoke.ps1`
- `scripts/docker-smoke.sh`

验证命令：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
git diff --check
```

阻塞条件：

- 文档引用尚未合并的路径或已经删除的旧设计。
- 发布证据写成通过但没有目标环境命令输出。
- Docker、本地运行烟测或视觉 QA 的缺证被描述成已完成。

## 拆分操作建议

1. 先从当前工作树创建备份分支，避免手工拆分时丢失大变更。
2. 按上方顺序创建短生命周期分支，每个分支只保留本组路径。
3. 每组提交前运行 `git status --short` 和 `git diff --stat`，确认没有跨组文件混入。
4. 每组提交前运行该组验证命令，并记录失败或无法运行原因。
5. 最后一组文档/验收证据必须引用已经合并或同 PR 内存在的事实，不能引用未来分支。
6. 所有组完成后，在最终整合分支运行 `scripts/release-preflight.ps1 -Full -IncludePackage -IncludeRuntimeSmoke`；具备 Docker 时追加 `-IncludeDocker`，涉及 UI 时追加 `-IncludeVisualQA`。

## 审计结论

平台化重构成果可以继续推进，但不适合在后续审查中作为一个不分层 PR 解释。推荐使用本文将变更拆成 6 个可审查包，再在每个包内复跑对应验证；这样既保留当前重构成果，也能让后续审查者明确每个删除、迁移和新增能力的业务闭环。
