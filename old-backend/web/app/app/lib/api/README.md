# lib/api 目录说明

`lib/api` 是 React 前端访问后端 API 的唯一通用入口。页面、feature 和 store 不应散落请求路径、重复封装 `fetch` 或自行解析后端 `Result`。

## 目录职责

- `endpoints.ts`：集中维护后端 endpoint 表，是前端 `/api/v1` 路径的唯一生产代码来源。
- `client.ts`：统一处理 base URL、`X-Locale`、产品/客户端 header、CSRF、cookie credentials、401 refresh retry、AbortController、错误归一化、空响应和下载。
- `auth.ts`、`iam.ts`、`setup.ts`、`system.ts`、`announcements.ts`：按后端模块组织 API 方法和请求/响应类型。IAM 通知队列、API Token、会话、审计等后台接口都在 `iam.ts` 收敛，页面不得自行拼接 `/api/v1/iam/*` 或 `/api/v1/orgs/*`。
- `query-keys.ts`：集中管理 TanStack Query key，避免页面间缓存 key 漂移。
- `types.ts`：只放 API 层共享的前端契约类型；页面私有表单类型留在页面或 feature 内。

## 错误处理规则

- 后端业务错误统一抛出 `ApiError`，保留 `status`、`code`、`messageKey`、`messageArgs`、`traceId` 和原始 payload。
- 网络错误归一为 `NETWORK_ERROR`，主动取消请求的 `AbortError` 保持原样返回给调用方。
- 页面通过 `features/admin/error-state.ts` 或本地状态区分 401、403、503、业务错误和网络错误，不用日志代替 UI 错误反馈。
- TanStack Query 的 `signal` 必须继续传入 API 方法，避免页面卸载后继续更新状态。

## 例外

SSE、下载或浏览器原生能力无法复用通用 client 时，可以在页面或 feature 中直接使用浏览器 API，但必须自己处理取消、错误态和权限态。目前已知例外是 `routes/admin/traffic-hijack.tsx` 的 SSE 连接。

## 验证

```powershell
pnpm --dir web/app test
pnpm --dir web/app typecheck
```

`app/frontend-boundary.test.ts` 会检查生产源码中 `/api/v1` 字符串和直接 `fetch` 的使用范围。
