# HTTP API 契约

`api/openapi.yaml` 是公开 HTTP operation、路径、请求/响应 schema、security 与兼容性的产物，由项目自有生成器 **从各模块的代码优先（code-first）契约声明生成**。Go 代码是唯一权威；不再由 openapi.yaml 生成 Go 代码，也不再维护第二份手写路由/DTO 清单。生成器默认从 `.scaffold/layout.json` 读取 OpenAPI 与 operation inventory 输出路径；只有临时外部消费才通过显式 flags 覆盖。

## 权威与生成

1. 每个业务模块分层声明自己的 HTTP 契约与 handler：普通业务模块由顶层 `internal/module/<name>/handler` 实现窄 `Operations`/`Handler`、DTO 映射、错误呈现与主体访问；`internal/module/<name>/binding/http` 以 `pkg/httpx/contract` 的 typed 类型声明 operation（method/path/operationId/policy/security 与 DTO schema）并提供 `RuntimeHandlers` 装箱。IAM 的 Cookie、Origin 与 CSRF 属于其 Session 协议边界，当前由 `internal/module/iam/binding/http` 在同一 typed operation 完成品内集中处理，不进入 Service，也不由宿主按 URL 特判。新增 HTTP 业务模块**除了在 `internal/composition` 装配**，还必须把其契约注册到 `internal/tools/contract-gen/main.go` 的 `registeredModules()`（build-time 生成器注册点、独立于运行图），否则 `go generate` 不会渲染该模块的 `api/openapi.yaml` 与 operation inventory。
2. 在仓库根目录执行：

   ```powershell
   go generate ./...
   ```

   这会运行 `internal/tools/contract-gen`，从所有已注册的模块契约渲染：

   - `api/openapi.yaml` —— 公开契约产物；
   - `internal/transport/http/api/operation_inventory.gen.go` —— operation identity 与 policy inventory。

3. 审阅生成 diff；`go generate` 后必须 clean diff（`git diff --exit-code -- api internal/transport/http/api`）。
4. 生成器输出必须与既有契约语义兼容：CI 用 `oasdiff breaking` 对照上一个已提交 `api/openapi.yaml` 基线，新增公共破坏必须先采用版本/弃用策略并记录决策，不能简单更新一份副本绕过。

## 运行期绑定

`internal/transport/http` 是唯一 route binding owner：它从聚合后的模块契约构建 OpenAPI 校验规范、一次绑定路由、执行 operation gate 与问题呈现。新增业务模块只扩展自身契约声明、runtime handlers 与 `internal/composition` 的聚合，不复制 Router、validator 或 method/path。

- `contract.Module.ID` 是 HTTP 完成品的稳定 owner；composition 的通用 dispatcher 拒绝重复模块、重复 operation、缺失 handler 和未知 handler。
- `none`、`bearerAuth`、`webuiSession` 是有限 security profile。OpenAPI 只声明 scheme，operation gate 从 composition 注入的 Auth 来源认证一次并写入 Principal；transport 不硬编码 URL 前缀、Cookie、Origin 或 CSRF。
- 受保护 operation 的精确 scope 必须存在于 Permission Catalog；菜单隐藏不替代服务端授权。

- 普通业务模块顶层 handler 使用模块自有 DTO（`internal/module/<name>/handler/dto.go`），不依赖全局生成包、不 import `binding/**` 或 `internal/transport/**`。需要直接拥有 Cookie/Header 协议状态的身份边界可以在模块 `binding/http` 内集中实现，但不得把该例外扩散到其他模块或下沉到 Service。
- 底层第三方库（kin-openapi、yaml、jsonschema）只存在于 `pkg/httpx/contract` 内部与 transport/生成器，不泄漏到业务模块。
