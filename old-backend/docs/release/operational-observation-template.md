# 后台补偿观测记录模板

<!-- operational-observation-template:v1 -->

本文档用于目标环境或发布候选环境记录后台补偿路径的观察结果。它不是本地单元测试或 Playwright mock 证据的替代品；只有目标环境日志、后台页面、数据库统计、审计记录和人工观察窗口能证明这些补偿路径在真实部署中可运行。

适用范围：

<!-- operational-section:scope -->

- IAM 授权策略重载补偿：`internal/app/adapters.IAMPolicyReloadScheduler`
- IAM 通知投递补偿：`internal/app/adapters.IAMNotificationOutboxScheduler`
- System 维护清理补偿：`internal/app/adapters.SystemMaintenanceScheduler`
- 流量探针采集与旧结果裁剪：`internal/app/adapters.TrafficProbeScheduler` 与 System 维护清理

## 观测前准备

<!-- operational-section:preparation -->

- 确认发布证据已记录提交 SHA、部署标签、配置文件、数据库迁移、备份、密钥注入和回滚命令。
- 确认日志系统能按时间、级别、消息、trace id 和组件关键字检索。
- 确认可访问 `/admin/notification-outbox`、`/admin/probes`、`/admin/operation-records`、`/admin/error-logs`、`/health` 和 `/ready`。
- 确认 `auth.casbin_reload_interval_seconds`、`auth.notification_retry_interval_seconds`、`auth.notification_retry_batch_size`、`auth.notification_retry_max_attempts`、`system.maintenance_cleanup_interval_seconds` 和 `system.maintenance_cleanup_batch_size` 使用目标环境预期值。

## 记录模板

<!-- operational-section:record-template -->

复制以下内容到发布证据、发布单或目标环境运维记录中。密钥、连接串、Token、Cookie、一次性链接和私有地址必须脱敏。

```md
# 后台补偿观测记录

## 基本信息

- 环境：
- 分支：
- 提交 SHA：
- 部署标签：
- 观察人：
- 观察开始：
- 观察结束：
- 日志检索入口：
- 关联发布证据：

## 配置快照

| 配置项 | 目标环境值 | 证据 |
| --- | --- | --- |
| `auth.casbin_reload_interval_seconds` |  |  |
| `auth.notification_retry_interval_seconds` |  |  |
| `auth.notification_retry_batch_size` |  |  |
| `auth.notification_retry_max_attempts` |  |  |
| `system.maintenance_cleanup_interval_seconds` |  |  |
| `system.maintenance_cleanup_batch_size` |  |  |

## IAM 授权策略重载

<!-- operational-section:iam-policy-reload -->

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 角色、成员或初始化权限变更后，同步 `LoadPolicies` 失败会向调用方返回错误 |  |  |
| 后台 scheduler 能继续重试授权策略重载 |  |  |
| 日志可检索 `iam policy reload retry failed` 或 `iam policy reload retry completed` |  |  |
| `/admin/operation-records` 可定位对应权限变更操作 |  |  |

## IAM 通知投递队列

<!-- operational-section:iam-notification-outbox -->

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| `/admin/notification-outbox` 可访问，且只展示脱敏状态 |  |  |
| `GET /api/v1/iam/notification-outbox` 不返回一次性 token、完整链接或 token hash |  |  |
| failed/pending 任务可按权限手动重试，成功后写入 `notification.retry` 审计 |  |  |
| 后台 scheduler 能扫描到期任务并记录 `iam notification outbox dispatch completed` |  |  |
| 投递失败时可检索 `iam notification outbox dispatch failed`，任务仍保留可观测状态 |  |  |
| 数据库访问、备份和导出权限按一次性凭据处理 |  |  |

## System 维护清理

<!-- operational-section:system-maintenance -->

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 过期 active 断点上传会话会被保存为 `expired` |  |  |
| completed、aborted、expired 会话的 `media/chunks/<session-id>/` 临时分片被清理 |  |  |
| `system_media_upload_chunks` 残留分片记录按批次清理 |  |  |
| 后台 scheduler 可检索 `system maintenance cleanup completed` |  |  |
| 清理失败时可检索 `system maintenance cleanup failed` 或媒体分片清理 warn |  |  |
| 存储目录、对象存储前缀或 volume 没有持续异常增长 |  |  |

## 流量探针与可观测性

<!-- operational-section:traffic-probe -->

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| `/admin/probes` 能展示 health/ready 结果 |  |  |
| `/admin/traffic-hijack` 能展示目标、结果、事件和 SSE/轮询状态 |  |  |
| 旧探针结果裁剪没有导致页面错误或日志噪声 |  |  |
| `/ready` 在观察窗口内持续返回可解释状态 |  |  |
| `/admin/error-logs` 没有新增不可解释 5xx 或补偿任务错误 |  |  |

## 结论

<!-- operational-section:conclusion -->

- 通过项：
- 失败项：
- 残余风险：
- 需要回滚或修复：
- 后续观察窗口：
```

## 观察结论口径

- 如果仅看到本地 mock、单元测试或静态文档，不得把目标环境观测写成通过。
- 如果目标环境暂时没有自然产生的 failed/pending 通知任务，可以记录“无样本”，但必须说明是否通过受控测试账号或预发数据补充验证。
- 如果不允许直接查询数据库，应记录只读报表、审计系统、日志平台或备份系统中的等价证据。
- 如果发现 `iam_notification_outbox` 明文一次性链接进入未授权日志、截图、导出或发布证据，应阻塞发布并轮换相关凭据。
- 如果 System 清理任务持续失败但主流程仍可用，不得写成完全通过；应记录影响范围、存储增长趋势和人工清理计划。
