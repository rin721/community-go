# IAM 模块

`internal/modules/iam` 承载平台账号、认证、会话、组织、角色、权限、API Token 和登录审计等后台基础能力。它是控制台访问控制的业务模块，不是通用工具库，也不应被其他模块当作全局类型来源。

## 职责

- 维护用户、组织、角色、权限、会话、邀请、注册审核、MFA、API Token 和登录日志等 IAM 领域模型。
- 提供登录、登出、刷新会话、用户与组织管理、角色授权、权限同步和 API Token 管理等用例。
- 从 `internal/transport/http/contracts.go` 派生系统 API 权限，保持菜单权限、API catalog 和 IAM 权限字典一致。
- 通过模块内 `infrastructure` 适配 SMTP、令牌、密码、MFA 等外部或基础设施能力；应用层通过 `IAMPolicyReloadScheduler` 对授权策略重载失败做后台补偿，通过 `IAMNotificationOutboxScheduler` 对通知投递失败做后台补偿，并通过受保护 API 暴露脱敏后的通知队列状态和手动重试入口。

## 分层

| 目录 | 职责 |
| --- | --- |
| `model` | IAM 领域模型、状态、过滤条件和持久化结构 |
| `service` | IAM 用例、权限语义、会话策略、注册审核和模块本地 contract |
| `repository` | 持久化实现，隔离 ORM、事务和查询细节 |
| `handler` | HTTP 输入输出适配，调用 service 并统一映射响应 |
| `infrastructure` | SMTP、令牌、MFA、缓存等模块私有基础设施适配 |

## 扩展规则

- 非 IAM 模块需要当前认证主体时，使用 `types/auth` 中的平台级上下文，不要导入 IAM service 内部类型。
- service 层定义自身需要的最小接口，通过构造函数接收 repository、缓存、token、notifier 等依赖。
- handler 不写权限规则、事务规则或领域状态流转；这些规则必须进入 service。
- 角色、成员或权限策略变更必须同步调用 `LoadPolicies` 并返回失败；后台 scheduler 只负责补偿重试，不得用日志吞掉首次错误。
- 邀请、密码重置、邮箱验证等通知型 token 必须先完成本地记录、审计和 `iam_notification_outbox` 事务，再调用 `Notifier`；审计失败不得触发外部通知，投递失败必须写回 outbox 状态并返回错误，不得撤销或清理仍可重试的 pending 资源。
- `iam_notification_outbox` 会保存重试所需的明文一次性 token 和链接；生产数据库访问、备份和导出权限必须按一次性凭据处理。
- 通知队列管理 API 只能返回 `NotificationOutboxView` 脱敏视图，不得把 token、完整链接或可直接完成账号动作的凭据暴露给前端；手动重试必须写入 `notification.retry` 审计并把底层投递错误返回给调用方。
- 新增主系统 IAM API 必须先补 route contract，再生成 OpenAPI，并同步前端 API endpoint、i18n 和测试。
- 新增可见文案需同步 `configs/locales` 与 `web/app/app/i18n/locales` 中的支持语言。

## 验证命令

```powershell
go test ./internal/modules/iam/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
```
