# 后台核心权限闭环审计：2026-06-23

本文记录第六阶段“权限、认证、菜单、用户、角色、审计等基础后台能力”的代码事实、发现的问题和本轮补强。结论以当前 Go/React 实现和测试结果为准，不以历史文档为唯一依据。

## 审计范围

- `internal/transport/http/contracts.go`
- `internal/transport/http/router.go`
- `internal/transport/http/router_test.go`
- `internal/modules/iam/service/service.go`
- `internal/modules/iam/handler/handler.go`
- `internal/modules/system/service/service.go`
- `internal/modules/system/handler/handler.go`
- `web/app/app/features/admin/navigation.ts`
- `web/app/app/stores/auth-store.ts`
- `docs/modules/iam.md`
- `docs/modules/system.md`
- `docs/modules/permission-matrix.md`

## 真实状态

当前后台核心闭环已经具备以下事实：

- 登录、登出、刷新、切换组织、当前用户和当前会话快照由 IAM 模块提供，`/api/v1/me/session` 返回当前会话权限快照。
- 用户、角色、权限、API Token、会话和审计日志接口都通过 route contract 声明访问级别、权限码和 scope。
- System 菜单接口 `GET /api/v1/system/menus` 只要求登录态，但 handler 会按菜单项的 `permission`、`scope` 和当前 `Principal` 调用 IAM authorizer 过滤菜单。
- API catalog、OpenAPI 和权限同步都从 `internal/transport/http/contracts.go` 派生，不扫描目录或前端路由。
- React 后台导航优先消费后端过滤后的系统菜单；静态导航只提供图标、路由映射和最小 dashboard fallback。
- React 页面内写操作通过 `/api/v1/me/session` 权限快照禁用按钮或表单，但该逻辑只用于体验层，生产授权仍以后端 middleware、handler 和 service 校验为准。

## 发现的问题

| 类型 | 问题 | 处理 |
| --- | --- | --- |
| 可维护性问题 | 既有测试会点名校验部分菜单存在，但没有全量约束“带权限的菜单必须能由 route contract 派生的权限目录承接”。 | 新增 HTTP 层回归测试，遍历 System 菜单和 route contract 派生 API catalog。 |
| 文档漂移 | 权限矩阵中的 System/IAM service 事实源路径仍写成旧的单文件路径。 | 更新为当前真实路径 `internal/modules/*/service/service.go`。 |

## 本轮变更

- 新增 `TestSystemMenuPermissionsAreBackedByRouteContracts`：
  - 通过 `systemservice.New(...).ListMenus` 获取真实内置菜单；
  - 通过 `catalogAPIContracts(mainHTTPContracts())` 获取 route contract 派生 API catalog；
  - 校验每个带权限码的菜单项都有合法 scope；
  - 校验每个带权限码的菜单项都能找到同 `productCode + scope + permission` 的 route contract 权限声明。
- 更新 `docs/modules/permission-matrix.md` 中的事实源路径。

## 架构影响

本轮没有改变运行时代码路径，只补强了权限闭环的可执行约束。未来新增后台菜单时，如果只在 System 菜单里写了权限码，却没有在后端 route contract 中提供同 scope 的 API 权限声明，HTTP 测试会失败。这样可以防止菜单可见性、权限同步和角色权限配置之间再次漂移。

## 验证命令

```powershell
go test ./internal/transport/http -run TestSystemMenuPermissionsAreBackedByRouteContracts -count=1 -mod=readonly
```

结果：通过。

## 后续规则

- 新增后台入口时必须同时检查后端菜单、route contract、权限同步、前端静态映射、i18n 和无权状态测试。
- 菜单项如果配置 `permission`，必须配置合法 `scope`，并且该权限必须能从 route contract 派生的 API catalog 中找到。
- 前端不得从静态导航恢复完整菜单；后端菜单接口为空时只能回退到最小 dashboard 导航。
