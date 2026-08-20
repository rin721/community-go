# WebUI 开发指南

WebUI 基线由 `internal/composition` 统一装配，模块只在确有浏览器界面需求时提供 `binding/webui`。Auth 提供首次设置、登录、会话页面和离线密码重置 CLI；Ops 提供真实 management build/probe/diagnostics/metrics 看板；Todo 没有 WebUI Binding。

## 运行与生成

本地启动后端、Vite 与首次设置的完整步骤见 [WebUI 本地启动指南](../getting-started/webui.md)。以下命令用于开发前检查 registry 和前端构建，不替代启动顺序。

在仓库根目录执行：

```powershell
go run ./cmd/app webui generate
cd webui
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm generate:check
```

`webui/` 是独立 React/Vite 宿主，开发服务器使用 HTTPS，并将 `/api/v1` 与 `/management` 代理到 Go 服务。生成 registry 的唯一来源是 `internal/composition` 的 WebUI Catalog；不要直接编辑 `src/generated/webui-registry.ts`。

WebUI 用户密码可通过 `go run ./cmd/app webui reset-password --username <用户名>` 重置；未传 `--password` 时由 CLI 的安全输入接口读取。命令先验证 migration 兼容性，再更新密码并撤销该用户全部 Session。

## 安全边界

- WebUI Session 只用于 WebUI/Auth 和 management；普通 Todo API 仍只接受原有 Bearer 或开发匿名 profile。
- Cookie 名为 `__Host-community-go_webui_session`，固定 `Secure`、`HttpOnly`、`SameSite=Lax`、`Path=/`，不设置 `Domain`。
- Session ID 和 CSRF token 使用 CSPRNG；数据库保存 SHA-256 摘要，浏览器只在内存保留 CSRF token。
- setup、login、logout 的不安全请求必须通过 `Origin` 校验；logout 还要求 `X-CSRF-Token`。
- 页面菜单和 manifest 访问状态不构成授权；实际 operation 仍由服务端 Auth policy 决定。

模块页面只能依赖宿主公开契约和自身 API，不得导入宿主 Router、菜单、Session Store 或内部全局状态。新增页面时先修改模块 WebUI Binding，再运行生成检查。
