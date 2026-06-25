---
name: aoi-admin-webui-i18n
description: "Repository-specific workflow for React WebUI and i18n work in this aoi-admin / open console platform repository. Use when changing web/app routes, admin pages, public pages, setup flows, API client calls, TanStack Query/Zustand state, locale resources, visible text, permissions-driven UI states, responsive layouts, Playwright screenshots, or frontend build validation."
---

# Aoi Admin WebUI i18n

使用本 skill 修改 `web/app` React 前端、用户可见文案和交互闭环。前端能力必须对应后端 API、权限、配置、持久化和审计边界。

## 开始前

1. 阅读 `AGENTS.md`、`web/app/README.md`、`web/app/AGENTS.md` 和目标目录 README。
2. 查对应后端 API、route contract、权限和 i18n key；不要凭空实现生产能力。
3. 确认页面属于公开页、`/setup` 还是 `/admin`，并复用现有布局和组件体系。

## 实现规则

- API 请求通过 `web/app/app/lib/api` endpoint 表和 API client。
- 服务端数据使用 TanStack Query；认证快照和本地偏好使用 Zustand。
- 用户可见文本、按钮、表格列、状态、错误和 SEO 文案进入 `zh-CN.json` 与 `en-US.json`。
- locale 使用 canonical `zh-CN` / `en-US`，不要恢复前端 `en.json` 或双轨映射。
- 权限不足时同时处理按钮禁用、说明文案、空状态和后端真实 403。
- 表格、筛选、分页、弹窗、加载态、空态、错误态和窄屏布局要形成可用闭环。
- 图标优先使用 `lucide-react`；不要为常见动作手写文本按钮替代图标。

## 视觉与可访问性

- 可见 UI 变更检查 1440x900 和 390x844 视口。
- 保持焦点可见、键盘可操作、触控尺寸合理、文本不溢出。
- 尊重 `prefers-reduced-motion`。
- 后台控制台界面保持信息密度和操作效率，不做营销式首屏。

## 验证

```powershell
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app test
pnpm --dir web/app build
pnpm --dir web/app test:e2e
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
git diff --check
```

聚焦页面时可以用 Playwright `-g` 或 `scripts/visual-qa.ps1 -Grep "<用例名>"`。如果无法运行视觉检查，最终说明缺失的视口、页面和风险。

## 文档同步

- 新增页面或工作流时更新对应 `web/app/app/routes/README.md`、feature README、模块文档或测试矩阵。
- 新增后端能力配套页面时，同时更新 API/权限文档。
- 仅 UI-only 字段必须明确不写入 API payload、URL、日志、localStorage 或 sessionStorage。
