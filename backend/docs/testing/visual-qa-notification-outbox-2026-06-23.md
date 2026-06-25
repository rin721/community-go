# 通知队列视觉 QA 证据：2026-06-23

本文记录 `/admin/notification-outbox` 的聚焦视觉 QA。该页面是 IAM 通知投递队列的运维入口，只展示脱敏任务状态，并通过后端 route contract、IAM 权限和 API client 触发手动重试；它不是完整消息中心或用户站内信系统。

## 基本信息

- 日期：2026-06-23
- 验证层级：Focused visual QA
- 目标环境：本地 Playwright dev server，`http://127.0.0.1:3002`
- 浏览器：Playwright Chromium projects
- 视口：`1440x900`、`390x844`
- 截图输出：`tmp/qa/visual-qa`
- 脚本入口：`scripts/visual-qa.ps1`

## 命令验证

```powershell
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -Grep "admin notification outbox route"
```

结果：

- Playwright 用例：2 passed。
- 截图数量：2。
- 输出目录：`tmp/qa/visual-qa`。

## 截图记录

| 页面或流程 | 视口 | 截图 |
| --- | --- | --- |
| 通知队列列表、筛选和手动重试 | `1440x900` | `tmp/qa/visual-qa/smoke-admin-notification-o-1ee63-d-delivery-tasks-with-retry-desktop/test-finished-1.png` |
| 通知队列列表、筛选和手动重试 | `390x844` | `tmp/qa/visual-qa/smoke-admin-notification-o-1ee63-d-delivery-tasks-with-retry-mobile/test-finished-1.png` |

## 覆盖范围

| 检查点 | 结论 |
| --- | --- |
| 页面可读性 | 桌面和移动端均能展示页面标题、摘要、筛选区、表格、分页和反馈信息。 |
| 脱敏边界 | 测试 fixture 中包含原始一次性 token 和完整链接，页面断言它们不会出现在可见文本中。 |
| 权限与操作 | 已发送任务的重试按钮禁用；失败任务可触发 `POST /api/v1/iam/notification-outbox/:outboxId/retry` 并展示成功反馈。 |
| 查询契约 | 状态、类型、收件人和分页筛选会映射到后端 `GET /api/v1/iam/notification-outbox` 查询参数。 |
| 请求上下文 | 列表和重试请求均携带认证头与 `X-Locale: zh-CN`。 |

## 剩余风险

- 本报告使用 Playwright mock 数据，不替代真实后端、真实通知驱动、生产数据库或目标环境验证。
- 页面只覆盖 IAM 通知投递任务运维，不代表完整通知中心、站内信、消息模板、订阅偏好或多渠道编排能力已经完成。
- 截图目录位于 `tmp/qa/visual-qa`，不进入版本控制；正式发布时应将需要留档的截图复制到发布证据或 CI artifact。
