# web/app 目录说明

`web/app` 是 React 一体化前端，覆盖公开页面、首次安装向导和 `/admin` 平台控制台。

## 技术栈

- React 19、TypeScript、React Router Framework Mode、Vite。
- Tailwind CSS v4、Radix UI、lucide-react。
- TanStack Query、Zustand、React Hook Form、Zod。
- i18next/react-i18next、Vitest、Playwright、ESLint flat config、Prettier。

## 目录边界

- `app/routes`：页面级路由，公开页、认证页、setup 和 admin 分区。
- `app/features`：跨页面业务特性和页面组合逻辑。
- `app/components/console`：平台 UI 组件体系，按 tokens、primitives、patterns 分层。
- `app/lib/api`：统一 API endpoint 表和 API client，不在页面散落 `/api/v1` 字符串。
- `app/i18n`：前端文案资源，默认 `zh-CN`，同时维护 `en-US`。
- `app/theme`：源主题包、schema 和生成元数据。
- `content`：本地 Markdown 内容资源，当前用于公开站点博客。
- `design`：前端设计规则和视觉治理入口。
- `scripts`：前端主题、内容、i18n 和构建产物检查脚本。
- `tests/e2e`：桌面与移动端关键业务链路烟测。

## 开发规则

- 可见文案进入 i18n，不硬编码在组件、页面、表格列或表单 schema 中。
- 后台生产能力必须来自后端 API；前端不得凭空实现后端未暴露的能力。
- 新增业务页面应先补 endpoint、类型、query key，再实现页面状态、空态、错误态和权限态。
- 页面内写操作、危险操作和批量操作必须优先读取 `useAuthStore.permissions` 中的会话授权快照做显隐或禁用；该判断只服务用户体验，后端 route contract 和 IAM 鉴权仍是最终权限边界。
- 后台主导航优先使用后端 `/api/v1/system/menus` 返回的权限过滤菜单；`app/features/admin/navigation.ts` 中的静态表只作为图标、路由映射和最小安全 fallback。接口未返回可用菜单时只能展示 dashboard，不得把全量静态菜单暴露给当前用户。新增后台入口时必须同步后端 `baseMenus`、系统 locale、前端静态映射和对应测试。
- 插件管理页和 `/api/v1/plugins` 调用已移除，不得恢复；未来扩展走模块和后端 route contract。
- `app/frontend-boundary.test.ts` 固定前端分层边界：生产 API 路径只允许在 `app/lib/api/endpoints.ts` 出现，直接 `fetch` 仅允许通用 API client 和已说明的 SSE 例外，旧插件入口和旧组件路径不得恢复。

## API 错误处理

- `app/lib/api/client.ts` 是唯一通用请求入口，负责统一 `Result` 解包、`ApiError` 构造、401 refresh、CSRF、locale 和产品维度 header。
- 页面和 feature 不直接调用散落的 `fetch`，除非是 SSE、下载或浏览器原生能力无法复用通用 client；例外必须自己处理取消、错误态和权限态。
- `ApiError` 保留 `status`、`code`、`payload`、`endpoint`、`traceId`、`messageKey`、`messageArgs` 和 `serverTime`，页面应按 401、403、业务错误和网络错误分别展示。
- 后台页面统一通过 `app/features/admin/error-state.ts` 把 401、403、503 等 API 错误映射到页面 i18n 文案；不要在每个路由里重复手写 `ApiError` 判断。
- 网络失败会归一为 `status: 0`、`code: "NETWORK_ERROR"`；主动取消请求的 `AbortError` 不包装，页面和 query 可以按取消语义忽略。
- 成功响应如果返回 HTML fallback、非 JSON 或坏 JSON，会由 client 返回 `NON_JSON_RESPONSE` / `INVALID_JSON_RESPONSE`，不要在页面中自行解析兜底。
- TanStack Query 的 `signal` 必须继续透传到 API 方法，避免页面卸载后写入过期状态。

## 验证命令

```powershell
pnpm --dir web/app theme:check
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app test
pnpm --dir web/app test:e2e
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
pnpm --dir web/app build
```

根目录 `scripts/visual-qa.ps1` 使用 `playwright.visual.config.ts`，会为通过用例保存截图到 `tmp/qa/visual-qa`，用于发布前或可见 UI 变更的人工抽查。上述命令默认从仓库根目录运行。
