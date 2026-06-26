---
name: aoi-admin-module-development
description: "Repository-specific workflow for adding or extending business modules in this aoi-admin / open console platform repository. Use when creating new internal/modules packages, extending IAM/System/Announcements, adding module migrations, permissions, route contracts, React admin/public pages, API client endpoints, i18n resources, tests, README docs, or replacing plugin-style extension with module-first development."
---

# Aoi Admin Module Development

使用本 skill 新增或扩展业务模块。它遵守根 `AGENTS.md` 和 `$aoi-admin-platform-maintenance`，目标是让新功能形成后端、前端、权限、文档和测试的最小闭环。

## 开始前

1. 阅读 `AGENTS.md`、`docs/extension/module-blueprint.md`、`docs/modules/permission-matrix.md` 和目标模块 README。
2. 用 `rg` 查现有模块模式，优先复用 IAM、System、Announcements 的目录和命名习惯。
3. 确认需求属于业务模块，而不是 `pkg` 工具库、全局 `types` 或传输层临时逻辑。
4. 扩展必须通过显式模块装配完成。

## 后端闭环

- 在 `internal/modules/<module>` 内维护 `model`、`service`、`repository`、`handler`，必要时增加 `infrastructure`。
- `service` 定义本模块需要的最小接口，通过构造函数接收依赖；不要直接导入同模块 repository 实现或 `pkg` 具体基础设施。
- 新增持久化模型时补迁移，迁移共享后按 append-only 处理。
- 新增 API 时更新 `internal/transport/http/contracts.go`，声明 method、Gin path、access level、permission、summary、请求/响应 DTO 和参数。
- 新增菜单、权限或 API catalog 影响时，确认 `productCode + scope + permission` 能从 route contract 派生。
- Handler 只做传输适配；校验、事务、审计和领域规则放到 service。

## 前端闭环

- 后台页面放在 `web/app/app/routes/admin*` 或对应 routes 分区，业务逻辑优先沉淀到 `web/app/app/features`。
- API 调用通过 `web/app/app/lib/api` endpoint 表和 client，不散落 `/api/v1` 字符串。
- 服务端数据使用 TanStack Query；本地 UI 偏好用 Zustand。
- 用户可见文案同步 `web/app/app/i18n/locales/zh-CN.json` 和 `en-US.json`。
- 权限态需要同时覆盖可见按钮、禁用态、空状态和后端真实鉴权边界。

## 文档与测试

- 新模块必须补 `internal/modules/<module>/README.md` 和 `docs/modules/<module>.md`。
- 更新 `docs/extension/module-blueprint.md` 或 `docs/modules/permission-matrix.md`，如果新增了可复用步骤或权限矩阵。
- 后端至少跑模块附近测试；跨 route contract 或权限时跑 HTTP / System / IAM 相关测试。
- 前端页面或 i18n 变更至少跑 `pnpm --dir web/app lint:i18n` 和 `pnpm --dir web/app typecheck`；可见流程按风险跑 Playwright 或视觉 QA。

## 常用验证

```powershell
go test ./internal/modules/<module>/... -count=1 -mod=readonly
go test ./internal/transport/http ./internal/modules/system/... -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app test
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
git diff --check
```

## 禁止项

- 不把业务 DTO 放进全局 `types`。
- 不把业务逻辑塞进 `handler`、`pkg` 或前端工具函数。
- 模块不得自建并行业务运行时、独立协议、独立配置块或独立管理入口；共享能力先沉淀到平台 contract 或基础设施。
- 不只改前端模拟生产能力；生产能力必须有后端 API、权限、持久化和审计依据。
