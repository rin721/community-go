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
- CORS 与 WebUI Auth 必须消费同一候选中的 `http.cors.allowedOrigins`；空列表继续拒绝跨域，不能为本地开发建立通配例外。
- 页面菜单和 manifest 访问状态不构成授权；实际 operation 仍由服务端 Auth policy 决定。

模块页面只能依赖宿主公开契约和自身 API，不得导入宿主 Router、菜单、Session Store 或内部全局状态。新增页面时先修改模块 WebUI Binding，再运行生成检查。

## 强制 i18n 契约

WebUI i18n 是所有接入模块必须遵守的规范契约。模块只要贡献页面、菜单或状态，就必须在自身 WebUI Binding 中声明 locale namespace 和资源文件；没有 locale Binding 的模块不得进入生产 registry。locale namespace 的 owner 始终是业务模块，宿主只负责聚合、加载、语言选择、fallback 和缺失资源状态。

模块页面只能通过宿主公开的 `@webui/contracts` 翻译契约（例如 `useWebUITranslation(namespace)`）取得文案，不得自行初始化 i18next、直接操作宿主 singleton、直接依赖 `react-i18next` 内部实例，或在生产 Web 源码中写入用户可见硬编码文本。标签、按钮、字段、帮助、状态、诊断、校验、空态、错误和反馈都属于必须翻译的用户文案；技术 ID、CSS class、协议字段和测试断言不属于用户文案。

后端错误码只能映射到稳定的 message ID，不能直接映射到中文/英文展示文本。正确形态是：

```ts
const setupErrorMessageIDs: Record<string, string> = {
  username_invalid: "webui.auth.errors.usernameInvalid",
};
```

页面再调用翻译契约渲染该 ID。`setupErrorMessages` 这类直接返回“当前 WebUI 地址未被后端允许……”等展示文本的实现违反规范，必须改为 error code -> message ID -> 当前语言文案的链路。Host 自有文案也应进入 host-owned locale resource，不得用宿主 i18n adapter 内联字符串绕过规范。

每次新增或修改模块页面，必须验证：

1. Binding、locale registry 和资源文件完整且 namespace/language 唯一；
2. 页面源码只使用公开翻译契约，用户可见文本没有硬编码；
3. error code 映射只产生 message ID，缺失 key/namespace/language 时 fail closed 或展示低敏诊断；
4. `pnpm generate:check`、`pnpm typecheck`、`pnpm test`、`pnpm lint` 以及 i18n 架构扫描均通过。
