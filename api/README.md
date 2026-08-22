# HTTP API 契约

`api/openapi.yaml` 是公开 HTTP operation、路径、请求/响应 schema、security 与兼容性的产物，由项目自有生成器 **从各模块的代码优先（code-first）契约声明生成**。Go 代码是唯一权威；不再由 openapi.yaml 生成 Go 代码，也不再维护第二份手写路由/DTO 清单。生成器默认从 `.scaffold/layout.json` 读取 OpenAPI 与 operation inventory 输出路径；只有临时外部消费才通过显式 flags 覆盖。

## 权威与生成

1. 每个业务模块分层声明自己的 HTTP 契约与 handler：普通业务模块由顶层 `internal/module/<name>/handler` 实现窄 `Operations`/`Handler`、DTO 映射、错误呈现与主体访问；`internal/module/<name>/binding/http` 拥有 Huma typed input/output 与无资源 registration。057 第一片已迁移 `login`、`listTodos`、`organization.departments.update`；现有生成器与其余 operation 暂时仍由 `pkg/httpx/contract` 驱动，以保持公开产物稳定。该过渡路径只允许持续到 `HTTP-057-002`，新增 operation 不得继续扩展旧 DSL。IAM 的 Cookie、Origin 与 CSRF 仍属于其 Session 协议边界，不进入 Service，也不由宿主按 URL 特判。
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

`internal/transport/http` 是唯一 route binding owner：Huma 第一片由模块无资源 registration 生成 schema/校验并绑定 chi route，transport 统一执行 operation gate、Huma 校验错误到项目 Problem 的转换和问题呈现；旧 dispatcher 仅继续承载尚未迁移的 operation。`HTTP-057-002` 将全量切换同一 registration authority 并删除旧 dispatcher、重复 kin-openapi validation 与手工 codec/renderer。新增业务模块不复制 Router、validator 或 method/path。

当前公开契约聚合 IAM、Organization、Navigation 与 Todo。Organization 拥有部门、岗位和账号组织分配 operation，使用 `organization:department:*` 与 `organization:position:*` 精确权限；组织关系只作为目录数据，不进入 Auth decision。Navigation 使用 `navigation:menu:read/write` 管理已注册菜单策略，修改请求使用 `webuiSession`、Origin 与 Session 绑定的 CSRF token；它不提供动态 Route 或第二套角色菜单授权。

- `contract.Module.ID` 是 HTTP 完成品的稳定 owner；composition 的通用 dispatcher 拒绝重复模块、重复 operation、缺失 handler 和未知 handler。
- `none`、`bearerAuth`、`webuiSession` 是有限 security profile。OpenAPI 只声明 scheme，operation gate 从 composition 注入的 Auth 来源认证一次并写入 Principal；transport 不硬编码 URL 前缀、Cookie、Origin 或 CSRF。
- 受保护 operation 的精确 scope 必须存在于 Permission Catalog；菜单隐藏不替代服务端授权。

- 普通业务模块顶层 handler 使用模块自有 DTO（`internal/module/<name>/handler/dto.go`），不依赖全局生成包、不 import `binding/**` 或 `internal/transport/**`。需要直接拥有 Cookie/Header 协议状态的身份边界可以在模块 `binding/http` 内集中实现，但不得把该例外扩散到其他模块或下沉到 Service。
- Huma 核心 typed API 只允许出现在模块 `binding/http` 与 transport 接入边界；Router adapter 只由 `internal/transport/http/humabinding` 拥有，Service、Model 与顶层 handler 不导入 Huma。过渡期的 kin-openapi、yaml、jsonschema 仍只存在于旧 contract、transport 与生成器。
