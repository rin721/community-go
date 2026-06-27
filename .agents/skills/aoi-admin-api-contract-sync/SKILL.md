---
name: aoi-admin-api-contract-sync
description: "Repository-specific workflow for changing HTTP APIs and generated contracts in this aoi-admin / open console platform repository. Use when adding or modifying backend routes, request/response DTOs, permissions, system API catalog entries, OpenAPI output, frontend API client endpoints, API docs, route tests, or when investigating API/catalog/permission drift."
---

# Aoi Admin API Contract Sync

使用本 skill 处理主系统 HTTP API、OpenAPI、权限和前端 API client 同步。`internal/transport/http/contracts.go` 是事实来源，不要按 path、method 或目录二次推断权限。

## 开始前

1. 阅读 `AGENTS.md`、`docs/api/README.md`、`docs/api/http-api.md` 和相关模块 README。
2. 查当前 route contract、handler、DTO、前端 endpoint 和测试覆盖。
3. 区分主系统 API、公开运行时端点和前端 SPA fallback；`/openapi.yaml` 不进入 `/api/v1` catalog。

## 修改顺序

1. 在模块内定义稳定请求/响应 DTO，避免普通 API 使用匿名 struct 或随意 `map[string]any`。
2. 更新 handler 和 service，保持 handler 只做输入输出适配。
3. 若发现现有 HTTP handler 依赖静态响应、fixture、硬编码列表或伪造业务状态，先回到对应业务模块补齐真实 model、repository、service、持久化和状态来源，不在后端真实 API 中继续实现 Mock。
4. 在 `internal/transport/http/contracts.go` 增加或修改 route contract：
   - method
   - Gin 风格 path
   - access level
   - product code / scope / permission
   - summary
   - request / response DTO
   - path/query 参数
5. 如影响菜单权限，确认 System 菜单权限能在 API catalog 中找到同 `productCode + scope + permission` 声明。
6. 更新前端 `web/app/app/lib/api` endpoint 表和调用代码。
7. 生成 `docs/api/openapi.yaml`，不要手写生成产物。
8. 同步 API 文档、模块文档、权限矩阵和测试。

## 验证

```powershell
go run ./cmd/console api openapi --output docs/api/openapi.yaml
go test ./internal/transport/http -count=1 -mod=readonly
go test ./internal/modules/system/... -count=1 -mod=readonly
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
git diff --check
```

跨模块、认证、权限或 app 装配时追加：

```powershell
go test ./internal/... -count=1 -mod=readonly
go test ./... -count=1 -mod=readonly
```

## 审查清单

- route contract、真实路由、OpenAPI 和 System API catalog 是否一致。
- Handler 是否只适配真实 service/result；不得用静态响应、fixture 或后端 Mock 伪装生产能力。
- 请求/响应 DTO 是否可被 OpenAPI 可靠引用。
- 权限码是否有对应 scope 和 productCode。
- 前端 endpoint 是否集中维护，没有新增散落 `/api/v1`。
- 用户可见错误是否通过稳定 `messageKey` 和 i18n 资源表达。
- 文档是否描述当前行为，而不是未来愿望。
