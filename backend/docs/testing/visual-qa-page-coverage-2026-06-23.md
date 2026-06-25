# 页面级视觉 QA 覆盖索引：2026-06-23

本文把 `web/app/tests/e2e/smoke.spec.ts` 中已经可生成桌面与移动端截图的页面级用例整理为索引，方便发布候选、UI 变更或新增模块时快速选择复跑范围。本文依据当前测试文件、`scripts/visual-qa.ps1` 和全量视觉基线整理，不替代真实部署环境、真实数据、跨浏览器或辅助技术验收。

## 事实来源

- 测试文件：`web/app/tests/e2e/smoke.spec.ts`
- 视觉脚本：`scripts/visual-qa.ps1`
- 视觉配置：`web/app/playwright.visual.config.ts`
- 本地全量基线：[2026-06-23 全量视觉 QA 基线](visual-qa-full-2026-06-23.md)
- 截图输出目录：`tmp/qa/visual-qa`

## 复跑方式

默认代表性链路：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
```

全量 smoke 截图：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -All -MinimumScreenshots 120
```

单页面或单流程聚焦截图：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -Grep "<下表中的用例关键词>"
```

`-Grep` 会传给 Playwright，建议使用下表中稳定的英文用例片段，例如 `admin users route`、`setup owner step` 或 `admin notification outbox route`。

## 覆盖索引

| 范围 | 用例关键词 | 主要页面或流程 | 重点检查 |
| --- | --- | --- | --- |
| 公开页 | `public home renders` | `/` 首页 | 首屏信息、导航、公开 CTA、移动端换行 |
| 公开页 | `public announcements route` | `/announcements` 与公告详情 | 列表、搜索、详情、公开只读内容 |
| 公开页 | `public support routes` | 支持页 | 页面结构与 metadata |
| 公开页 | `blog detail uses article metadata` | 博客详情 | front matter 元信息渲染 |
| 认证 | `login route submits backend captcha` | `/login` 验证码登录 | 表单字段、验证码 challenge、提交 payload |
| 认证 | `login route submits backend MFA` | `/login` MFA 分支 | MFA 状态、二次验证码字段、移动端表单 |
| 认证 | `password recovery routes` | 忘记密码与重置密码 | token、密码字段、完成反馈 |
| 认证 | `invitation acceptance` | 邀请接受 | 邀请 token、账号字段、提交反馈 |
| 认证 | `admin route requires an authenticated session` | 未登录访问 `/admin` | 路由守卫与跳转 |
| 后台基础 | `authenticated admin dashboard` | `/admin` 仪表盘 | 服务器信息、指标图表、API catalog、版本摘要 |
| 后台基础 | `admin IAM route` | `/admin/iam` | IAM 概览只读卡片 |
| IAM | `admin organizations route` | `/admin/organizations` | 组织列表、筛选、创建、切换 |
| IAM | `admin users route` | `/admin/users` | 用户、邀请、角色调整、状态切换 |
| IAM | `admin roles route` | `/admin/roles` | 角色创建、编辑、权限选择 |
| IAM | `admin sessions route` | `/admin/sessions` | 会话列表、筛选、撤销 |
| IAM | `admin security route` | `/admin/security` | MFA 生成、启用、登出 |
| IAM | `admin API tokens route` | `/admin/api-tokens` | API Token 颁发、一次性展示、撤销 |
| IAM | `admin notification outbox route` | `/admin/notification-outbox` | 脱敏通知任务、筛选、失败重试 |
| 审计 | `admin audit logs route` | `/admin/audit-logs` | 审计记录筛选 |
| 审计 | `admin login logs route` | `/admin/login-logs` | 登录日志筛选与 IP 本地过滤 |
| System | `admin probes route` | `/admin/probes` | health、ready、degraded readiness |
| System | `admin API catalog route` | `/admin/apis` | API catalog、筛选、同步反馈 |
| System | `admin menu catalog route` | `/admin/menus` | 后端过滤菜单分组 |
| System | `admin system settings route` | `/admin/system` | 配置快照、可编辑字段、secret 状态 |
| System | `admin media route` | `/admin/media` | 资源列表、URL 导入、分类、重命名 |
| System | `admin media resumable route` | `/admin/media/resumable` | 断点上传会话、上传、终止 |
| System | `admin traffic hijack route` | `/admin/traffic-hijack` | 探针目标、结果、事件、SSE 状态 |
| System | `admin versions route` | `/admin/versions` | 版本包导入、导出、下载、删除 |
| System | `admin dictionaries route` | `/admin/dictionaries` | 字典与字典项增删改 |
| System | `admin operation records route` | `/admin/operation-records` | 操作记录筛选、批量删除 |
| System | `admin error logs route` | `/admin/error-logs` | 错误日志与状态筛选 |
| System | `admin parameters route` | `/admin/parameters` | 参数列表、创建、编辑、删除 |
| 本地设计系统 | `admin design system route` | `/admin/design-system` | 本地主题 draft、导入、无后端 theme API |
| 模块示例 | `admin announcements route` | `/admin/announcements` | 公告创建、发布、归档、删除、无写权限状态 |
| 初始化 | `setup route is independent` | `/setup` | 初始化 shell 与公开/后台 shell 隔离 |
| 初始化 | `setup required status redirects` | 公开路由到 setup | 首次安装状态与语言步骤 |
| 初始化 | `setup language selection` | `/setup/language` | canonical locale、后续 `X-Locale` |
| 初始化 | `setup site step` | `/setup/site` | 只提交后端 schema 暴露字段 |
| 初始化 | `setup dependency status` | setup 依赖失败 | 下游步骤阻断和错误反馈 |
| 初始化 | `setup wizard renders backend test repair hints` | setup 测试反馈 | 修复建议、env-managed 覆盖提醒 |
| 初始化 | `setup owner step` | `/setup/owner` | 本地确认密码校验、提交 payload 不含确认字段 |
| 初始化 | `completed setup redirects` | 已完成 setup | setup 路由跳转登录 |

## 无权限状态覆盖

以下页面已有独立无权限或禁用写操作用例，复跑时可使用相同模块关键词聚焦：

| 范围 | 用例关键词 | 检查点 |
| --- | --- | --- |
| 组织 | `admin organizations route disables writes` | 无组织写权限时创建/保存不可用 |
| 用户 | `admin users route disables writes` | 邀请、状态切换和角色更新禁用 |
| 角色 | `admin roles route disables writes` | 创建、编辑和权限写入禁用 |
| 会话 | `admin sessions route disables revocation` | 会话撤销禁用 |
| API Token | `admin API tokens route disables writes` | 颁发和撤销禁用 |
| API catalog | `admin API catalog disables sync` | 同步路由和权限禁用 |
| 系统配置 | `admin system settings route disables updates` | 配置保存禁用 |
| 媒体 | `admin media route disables writes` | 上传、导入、删除等禁用 |
| 断点上传 | `admin media resumable route disables upload` | 上传流程禁用 |
| 流量劫持 | `admin traffic hijack route disables writes` | 目标写入和解析操作禁用 |
| 版本 | `admin versions route disables package writes` | 版本包导入、删除等禁用 |
| 字典 | `admin dictionaries route disables writes` | 字典与字典项写入禁用 |
| 操作记录 | `admin operation records route disables delete` | 批量删除禁用 |
| 参数 | `admin parameters route disables writes` | 参数写入禁用 |
| 公告 | `admin announcements route disables writes` | 公告创建、发布、删除等禁用 |

## 发布候选使用建议

- 新增后台页面：先补 `smoke.spec.ts` 页面用例，再用 `scripts/visual-qa.ps1 -Grep "<页面关键词>"` 生成桌面和移动端截图。
- 修改后台 shell、导航、表格、筛选、弹窗、表单或权限态：优先复跑相关页面关键词和对应无权限关键词。
- 修改全局样式、主题、布局或字体：复跑 `scripts/visual-qa.ps1 -All -MinimumScreenshots 120`，并人工抽查高风险移动端截图。
- 正式发布：从 [QA 证据模板](qa-report-template.md) 复制报告，把截图、命令、目标环境、浏览器、残余风险和人工观察结论写入发布证据。

## 剩余风险

- 该索引只覆盖当前 `smoke.spec.ts` 已建模的页面和流程；未写入 e2e 的新页面不会自动进入视觉基线。
- Playwright mock 数据可以证明布局、交互和契约边界，但不替代真实后端、真实权限账号、生产数据量或目标环境网络条件。
- 当前本地基线使用 Chromium desktop/mobile project；正式发布仍应补目标环境、真实账号、真实数据和跨浏览器抽查。
