# 模块接入蓝图

本文以当前真实代码为依据，说明新增业务模块从后端到前端的最小接入路径。当前仓库已内置 `announcements` 作为端到端业务示例模块；后续新模块应按同一显式装配链路扩展。

## 当前代码事实

当前平台不使用插件运行时，也不做运行期动态模块扫描。模块接入采用显式装配：

| 位置 | 职责 |
| --- | --- |
| `internal/modules/<module>` | 业务模块代码，按 `model`、`service`、`repository`、`handler` 分层 |
| `internal/app/initapp/layers.go` | 在 `Modules` 中声明模块对应用层暴露的服务、处理器和生命周期对象 |
| `internal/app/initapp/modules.go` | 创建模块仓储、服务、处理器和私有基础设施适配 |
| `internal/app/initapp/transport.go` | 把模块 handler/service 传入 HTTP transport |
| `internal/transport/http/contracts.go` | 声明主系统 HTTP API、权限、访问级别、请求/响应 DTO 和 OpenAPI 元数据 |
| `internal/transport/http/router.go` | 注册真实路由，并把已注册 contract 同步给 System API catalog |
| `web/app/app/lib/api` | 维护前端 endpoint、请求封装和共享类型 |
| `web/app/app/routes`、`web/app/app/features` | 页面和功能交互 |
| `web/app/app/i18n/locales` | 用户可见文案 |

这个路径刻意保持显式：新增模块必须能被代码审查、OpenAPI、权限同步、前端路由和测试一起覆盖。

## 内置示例模块

`internal/modules/announcements` 是当前内置的最小业务示例模块，已接入：

- 后端 `model`、`service`、`repository`、`handler` 分层。
- 应用装配层 `internal/app/initapp`。
- HTTP route contract、真实路由、System API catalog、OpenAPI。
- 权限：`announcement:read`、`announcement:create`、`announcement:update`、`announcement:delete`。
- React API client、后台页面 `/admin/announcements`、公开页面 `/announcements`、导航、i18n 和 Playwright smoke。

目录结构如下：

```text
internal/modules/announcements/
  README.md
  model/
    announcement.go
  service/
    service.go
    service_test.go
  repository/
    repository.go
  handler/
    handler.go
    handler_test.go
```

其他新模块可以从该结构开始。如果模块需要邮件、外部 HTTP、对象存储、队列或第三方协议，新增：

```text
internal/modules/announcements/infrastructure/
```

`infrastructure` 只实现本模块 service 定义的最小接口，不把外部库类型泄漏给 service。

## 后端接入步骤

1. 在 `model` 定义领域模型、请求/响应 DTO、分页结果和稳定状态值。业务私有类型留在模块内，不放入根 `types`。
2. 在 `service` 定义 `Service` 接口、用例方法和本模块需要的最小 repository contract。
3. 在 `repository` 实现 service contract。数据库错误需要向上返回或按 service contract 映射，不得记录日志后吞掉。
4. 在 `handler` 只做参数绑定、调用 service、返回 `types/result` 响应；校验、事务、权限语义和领域规则不写在 handler。
5. 如需数据表，新增 append-only 迁移文件到 `internal/migrations`，并补充 repository/service 测试。
6. 在 `internal/app/initapp/layers.go` 中为模块增加结构体和 `Modules` 字段。
7. 在 `internal/app/initapp/modules.go` 中增加 `New<Module>Module`，从 `Core` 和 `Infrastructure` 装配仓储、service、handler 和后台任务。
8. 在 `internal/app/initapp/transport.go` 中把模块 handler/service 传入 `NewHTTPServer` 和 `httptransport.RouterDeps`。
9. 在 `internal/transport/http/contracts.go` 中新增 contract 列表，并从 `mainHTTPContracts()` 追加。
10. 在 `internal/transport/http/router.go` 中新增 `register<Module>Routes`，使用 `routeSpecFor` 和 `registerProtectedRouteSpecs` 注册真实路由。

## Route Contract 规则

新增主系统 API 必须先写 contract，再注册路由。contract 至少说明：

- `ID`：稳定、唯一，推荐 `<module>.<resource>.<action>`。
- `Method` 和 `Path`：以 Gin 风格 path 表达，例如 `:id`。
- `Tag` 和 `Summary`：用于 OpenAPI 和后台 API catalog。
- `Access`：公开、登录态或权限保护。
- `Permission`：权限保护 API 必填，格式为 `object:action`。
- `Scope`：平台级能力使用 `platform`，租户业务能力使用 `tenant`，产品线能力按业务边界选择。
- `RequestType` 和 `ResponseType`：普通业务 API 使用稳定 DTO，不用匿名结构。

完成 contract 后必须运行：

```powershell
go run ./cmd/console api openapi --output docs/api/openapi.yaml
go test ./internal/transport/http -count=1 -mod=readonly
```

如果新增权限保护 API，还需要验证后台 `system.apis` 和权限同步流程：

```powershell
go test ./internal/modules/system/... -count=1 -mod=readonly
```

新增或调整后台权限时，同步更新 [后台权限矩阵](../modules/permission-matrix.md)，并补充前端无权禁写用例。矩阵不是事实来源，但它是代码审查和模块交接时检查 contract、前端守卫、i18n 与 E2E 是否一致的清单。

## 前端接入步骤

1. 在 `web/app/app/lib/api/endpoints.ts` 新增 endpoint，避免页面里散落 `/api/v1` 字符串。
2. 在 `web/app/app/lib/api/types.ts` 增加前端类型，命名与后端 DTO 保持可读一致。
3. 新增 `web/app/app/lib/api/<module>.ts`，统一封装请求、错误透传和查询参数。
4. 在 `web/app/app/lib/api/query-keys.ts` 增加 TanStack Query key。
5. 在 `web/app/app/routes/admin` 或产品线对应路由中新增页面。
6. 在 `web/app/app/features` 中沉淀可复用交互，不把业务流程堆进页面文件。
7. 在 `web/app/app/features/admin/navigation.ts` 增加菜单入口，并与后端菜单/权限语义保持一致。
8. 同步 `web/app/app/i18n/locales/zh-CN.json` 和 `web/app/app/i18n/locales/en-US.json`。
9. 增加 Vitest 或 Playwright 覆盖列表、详情、创建、编辑、删除、空状态和错误状态中至少一个关键闭环。

前端不得先实现后端不存在的生产能力。需要方向性展示时，只能写成文档、待办或静态说明，不能放进可操作的后台生产页面。

## README 与文档要求

每个新模块必须包含 `internal/modules/<module>/README.md`，至少写明：

- 模块职责和非职责。
- 对外 API 和权限边界。
- `model`、`service`、`repository`、`handler` 的分层关系。
- 依赖的基础设施能力及注入位置。
- 数据迁移、默认数据和初始化策略。
- 前端页面、i18n、测试和 OpenAPI 更新方式。

同时更新：

- `docs/modules/<module>.md`，可参考 [Announcements 模块](../modules/announcements.md)
- `docs/extension/adding-modules.md` 或本文档中相关规范
- `docs/api/http-api.md`
- `docs/testing/test-matrix.md`
- `docs/backlog/known-gaps.md` 中已解决或新增的缺口

## 验证清单

按变更范围选择命令，新增完整模块通常至少需要：

```powershell
go test ./internal/modules/<module>/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go test ./internal/app/... ./internal/modules/... -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
pnpm --dir web/app test
pnpm --dir web/app test:e2e
git diff --check
```

涉及可见页面时，还需要按 `docs/testing/test-matrix.md` 执行桌面和移动端视觉检查，并把证据写入 `docs/testing`。

## 禁止事项

- 不得恢复 `internal/plugin`、`pkg/plugin`、`pkg/pluginapi`、远程插件协议或 `/api/v1/plugins`。
- 不得新增“模块动态扫描”来绕过显式装配和代码审查。
- 不得把业务 DTO、权限枚举、缓存 key 或模块状态塞进根 `types`。
- 不得在 service 中直接导入 `pkg` 具体实现、`internal/ports` 或同模块 `repository`。
- 不得让 repository、工具库或基础设施适配吞掉错误。
- 不得在前端页面、表格列、表单 schema 或 store 中硬编码用户可见文案。
