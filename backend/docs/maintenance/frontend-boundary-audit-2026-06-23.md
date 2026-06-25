# 前端分层与交互边界审计：2026-06-23

本文记录第五阶段“前端架构分层、页面结构与交互闭环”的本轮审计和修复。结论以 `web/app` 当前源码、规则文件、README 和测试结果为准。

## 审计范围

- `web/app/AGENTS.md`
- `web/app/README.md`
- `web/app/app/README.md`
- `web/app/app/routes.ts`
- `web/app/app/routes/**`
- `web/app/app/features/**`
- `web/app/app/components/console/**`
- `web/app/app/lib/api/**`
- `web/app/app/i18n/**`
- `web/app/tests/e2e/smoke.spec.ts`

## 真实状态

- `web/app` 是当前统一 React 前端，覆盖公开页面、认证页、首次安装向导和 `/admin` 控制台。
- 旧品牌组件入口已不存在，当前 UI 组件体系位于 `app/components/console`。
- 插件管理页和旧插件管理 API 调用已从生产源码移除，规则文档明确禁止恢复。
- 后台导航优先消费后端 `/api/v1/system/menus` 返回的权限过滤菜单，静态导航只作为图标、路由映射和安全 fallback。
- 生产 API 调用集中在 `app/lib/api`，页面直接 `fetch` 的生产例外只有 `routes/admin/traffic-hijack.tsx` 的 SSE 连接。
- `zh-CN` 和 `en-US` 前端资源已对齐，前端 canonical locale 与后端保持一致。

## 发现的问题

- `app/components/console` 是当前 UI 组件体系核心目录，但缺少局部 README，新增组件时容易不清楚 tokens、primitives、patterns 的边界。
- `app/lib/api` 是请求、错误归一化、endpoint 表和 API 类型的核心目录，但缺少局部 README，未来页面容易绕开 API client 或散落请求路径。
- 前端规则主要写在文档中，缺少可执行边界测试来阻止旧插件入口、旧组件路径、散落 `/api/v1` 和低层组件反向依赖。

## 修复决策

- 新增 `app/frontend-boundary.test.ts`，把前端分层约束变成 Vitest 可执行检查。
- 新增 `app/components/console/README.md`，说明 UI 组件体系职责、层级和扩展规则。
- 新增 `app/lib/api/README.md`，说明 endpoint、API client、错误策略、SSE 例外和验证命令。
- 同步 `web/app/README.md` 与 `web/app/app/README.md`，让新开发者能从入口文档发现边界测试。

## 新增边界测试

`app/frontend-boundary.test.ts` 固定以下规则：

- 生产源码中 `/api/v1` 字符串只能出现在 `app/lib/api/endpoints.ts`。
- 生产源码中直接 `fetch` 只能出现在 `app/lib/api/client.ts` 和已说明的 SSE 例外 `routes/admin/traffic-hijack.tsx`。
- 不得恢复旧插件管理 API、旧品牌组件入口或旧组件 import 路径。
- `components/console/primitives` 不得导入高层 `patterns`。

## 验证命令

```powershell
pnpm --dir web/app test -- app/frontend-boundary.test.ts
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
$legacyTerms = @("Ao" + "i", "aoi-" + "admin", "go-" + "scaffold", "go_" + "scaffold")
rg -n -S @($legacyTerms | ForEach-Object { "-e"; $_ }) web/app --glob "!build/**" --glob "!node_modules/**" --glob "!test-results/**"
git diff --check
```

## 后续规则

- 新增页面时先补 `app/lib/api/endpoints.ts`、对应 API 方法、query key 和 i18n，再写页面状态。
- 新增可复用 UI 时先判断是 primitive 还是 pattern；需要业务数据或权限上下文的组合应进入 `features` 或页面。
- 直接 `fetch` 必须写入 README 或专题文档说明例外原因，并处理取消、错误态和权限态。
- 可见 UI 变更仍需按 `web/app/AGENTS.md` 执行桌面与移动端检查。
