# 全量视觉 QA 基线：2026-06-23

本文记录第十阶段后续全量 Playwright 视觉基线。目标是把 `web/app/tests/e2e/smoke.spec.ts` 已覆盖的公开页、认证、初始化向导和后台控制台流程全部生成桌面/移动端截图，作为后续发布候选和模块开发的可复查 UI 证据。

## 基本信息

- 日期：2026-06-23
- 验证层级：Full visual baseline
- 目标环境：本地 Playwright dev server，`http://127.0.0.1:3002`
- 浏览器：Playwright Chromium projects
- 视口：`1440x900`、`390x844`
- 截图输出：`tmp/qa/visual-qa`
- 脚本入口：`scripts/visual-qa.ps1`

## 命令验证

```powershell
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -All -MinimumScreenshots 120
```

结果：

- Playwright 用例：120 passed。
- 截图数量：120。
- 输出目录：`tmp/qa/visual-qa`。

## 覆盖范围

| 范围 | 覆盖内容 |
| --- | --- |
| 公开页 | 首页、公告列表/详情、支持页、博客详情 |
| 认证 | 登录验证码、登录 MFA、密码找回/重置、邀请接受、未登录后台跳转 |
| 初始化向导 | 语言选择、首次公开路由重定向、站点配置、依赖失败阻断、测试修复提示、owner 账号、本地完成后跳转登录 |
| 后台基础 | 仪表盘、IAM 概览、组织、用户、角色、会话、安全设置、API Token |
| 系统能力 | 审计日志、登录日志、探针、API 清单、菜单、系统配置、媒体、断点续传媒体、流量劫持、版本、字典、操作记录、错误日志、通知队列、参数 |
| 业务模块 | Announcements 后台管理、无写权限状态、公开公告读取 |

每个用例均覆盖 `desktop` 和 `mobile` 两个 Playwright project。

## 抽查截图

| 页面或流程 | 视口 | 截图 |
| --- | --- | --- |
| 用户管理筛选与列表 | `390x844` | `tmp/qa/visual-qa/smoke-admin-users-route-ma-a153e-orted-users-and-invitations-mobile/test-finished-1.png` |
| 系统配置编辑状态 | `390x844` | `tmp/qa/visual-qa/smoke-admin-system-setting-791b5-itable-configuration-values-mobile/test-finished-1.png` |
| 媒体 URL 导入与分类 | `390x844` | `tmp/qa/visual-qa/smoke-admin-media-route-ma-5a35c-ugh-backend-media-contracts-mobile/test-finished-1.png` |
| 初始化测试修复提示与环境变量覆盖 | `390x844` | `tmp/qa/visual-qa/smoke-setup-wizard-renders-09803-d-env-managed-save-warnings-mobile/test-finished-1.png` |
| API 清单筛选与同步反馈 | `1440x900` | `tmp/qa/visual-qa/smoke-admin-API-catalog-ro-1e17f--entries-with-local-filters-desktop/test-finished-1.png` |
| 流量劫持监控 | `390x844` | `tmp/qa/visual-qa/smoke-admin-traffic-hijack-5854b-sults-events-and-SSE-status-mobile/test-finished-1.png` |
| 登录 MFA | `390x844` | `tmp/qa/visual-qa/smoke-login-route-submits-backend-MFA-challenge-fields-mobile/test-finished-1.png` |
| degraded readiness 探针 | `390x844` | `tmp/qa/visual-qa/smoke-admin-probes-route-r-c0c32-ss-details-from-503-payload-mobile/test-finished-1.png` |

## 抽查结论

- 移动端后台 shell 能展示导航、组织选择、主题/设置入口和用户入口，主内容没有被侧栏压到首屏之外。
- 用户、系统配置、媒体、探针、流量劫持等长表单或长内容页面在 `390x844` 下可以继续纵向滚动阅读和操作。
- API 清单桌面视图的筛选、统计卡片和同步反馈处于可读布局，没有明显横向挤压。
- 初始化向导能展示依赖失败、测试修复提示和环境变量覆盖警告。
- 部分初始化向导截图中的 `Database`、`Verify` 等英文来自 Playwright mock 返回的后端 setup schema 标题和说明，证明页面按后端 schema 渲染；它不是前端 locale 资源缺失。默认前端资源仍以 `zh-CN` 为主。

## 剩余风险

- 截图来自 Playwright mock 链路，不替代真实后端、真实权限账号、生产数据或 Docker 容器环境验收。
- 本报告生成了全量 `smoke.spec.ts` 通过用例截图，但只人工抽查了高风险代表页面；后续发布候选仍应按变更范围重点复查相关截图。
- 该基线使用 Chromium project，不替代 Safari、Firefox、Edge、Lighthouse、辅助技术或真实移动设备测试。
- `tmp/qa/visual-qa` 是本地证据目录，不进入版本控制；正式发布应将需要留档的截图复制到发布记录或 CI artifact。
