# routes 目录说明

`routes` 存放 React Router Framework Mode 的页面级路由。页面负责组合 feature、组件、API 查询状态和交互反馈，不应承载可复用业务核心或绕过统一 API client。

## 路由分区

| 目录     | 职责                                                                  |
| -------- | --------------------------------------------------------------------- |
| `public` | 公开站点、公告、博客、条款、隐私和公开布局。                          |
| `auth`   | 登录、注册、邀请、忘记密码、重置密码等认证页面。                      |
| `setup`  | 首次安装向导页面，必须以后端 setup schema/status/run API 为事实来源。 |
| `admin`  | 后台控制台页面，承载 IAM、System、Announcements 和平台运营能力。      |

## 页面规则

- 页面可以组织 TanStack Query、表单提交、弹窗、筛选、分页和状态呈现，但不要直接写 `/api/v1` 字符串。
- 后台页面必须显式处理加载态、空态、错误态、无权限态和提交反馈。`/admin/notification-outbox` 这类平台运维页还必须保证敏感字段脱敏展示，并按 `/api/v1/me/session` 权限快照禁用写操作。
- 新增生产页面前必须确认后端 API、权限、i18n、route contract 和测试闭环已经存在。
- 不要恢复已移除的插件管理路由；新增业务功能通过模块化路由接入。
- 公开页和后台页都应通过 `useDocumentMeta`、i18n 和主题模板保持一致的页面标题与可访问结构。

## 新增后台页面检查清单

- 在 `routes.ts` 注册路由。
- 在 `features/admin/navigation.ts` 或后端菜单能力中确认导航来源。
- 在 `lib/api/endpoints.ts` 和模块 API 文件中维护接口。
- 同步 `zh-CN` 与 `en-US` 文案。
- 补充 Vitest 或 Playwright smoke，至少覆盖桌面与移动端可读性。

## 验证命令

```powershell
pnpm --dir web/app typecheck
pnpm --dir web/app test:e2e
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
```
