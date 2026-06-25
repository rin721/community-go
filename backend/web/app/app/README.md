# web/app/app 目录说明

`web/app/app` 是 React 应用源码入口，承载公开页面、认证页、首次安装向导和 `/admin` 平台控制台。

## 目录边界

- `root.tsx`、`routes.ts`：应用根组件和路由声明。
- `routes`：页面级路由，只做页面组合、数据加载、表单交互和状态呈现。
- `features`：跨路由业务能力，例如 admin shell、认证守卫、setup 流程、主题设置。
- `components/console`：平台 UI 组件体系，按 tokens、primitives、patterns 分层。
- `hooks`：跨页面复用的 React hook，例如 SEO meta、JSON-LD 和公开设置查询。
- `providers`：应用级 Provider 装配，例如 i18n、TanStack Query、Tooltip、setup gate、认证 bootstrap 和主题同步。
- `lib`：API client、图表、Markdown 内容解析和小型工具函数；其中 `lib/api` 是生产接口访问入口。
- `stores`：Zustand 状态，例如认证快照、偏好和后台工作区状态。
- `i18n`：前端语言配置和资源；默认 `zh-CN`，与 `en-US` 保持 key 对齐。
- `styles`：全局样式、响应式规则和动效降级，样式变量优先来自 `components/console/tokens` 与主题包。
- `theme`：源主题包、schema、生成模板和主题元数据。

## 开发规则

- 页面不散落 `/api/v1` 字符串；新增接口先进入 `lib/api/endpoints.ts` 和对应 API 封装。
- 用户可见文案进入 `i18n/locales/*.json`，不要硬编码在页面、表单 schema、表格列或 SEO helper 中。
- 后台页面必须处理加载态、空态、错误态和权限禁用态。
- 前端不能声明后端未暴露的生产能力；本地预览或 UI-only 字段必须明确不进入 API payload。
- 插件管理页已移除，新增业务页面应通过模块化 route、API、i18n、权限和 Playwright 用例接入。

## 验证命令

```powershell
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app test
pnpm --dir web/app test:e2e
```

`app/frontend-boundary.test.ts` 会随 `pnpm --dir web/app test` 执行，固定 API endpoint、直接 `fetch` 例外、旧插件入口和 UI 组件层级边界。
