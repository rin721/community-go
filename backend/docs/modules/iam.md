# IAM 模块

`internal/modules/iam` 提供本地账号、组织租户、角色权限、会话、API Token、邀请、密码重置、TOTP MFA 和审计能力。IAM service 定义自己的密码、token、授权、TOTP、通知和 repository 接口，具体实现由 `internal/app`、`repository` 和 `infrastructure` 注入。

## 能力

| 能力 | 说明 |
| --- | --- |
| 本地账号 | 用户名和邮箱全局唯一，密码由注入的 `PasswordCrypto` 处理 |
| 首次初始化 | 空用户表时创建平台组织和首个 platform owner |
| 自助注册 | 可选公开注册入口，创建租户组织、tenant owner 用户和登录会话 |
| 组织租户 | access token 绑定单个 `orgId`，切换组织会重新签发 token |
| JWT 会话 | access/refresh token 由 app adapter 注入的 token manager 签发 |
| API Token | 按用户和角色签发 Bearer token，服务端只保存 hash 和显示前缀 |
| 权限 | app adapter 注入授权执行器，service 只依赖 `AuthorizerEnforcer` contract；授权重载失败会返回给调用方，并由应用生命周期后台任务继续重试 |
| 邮箱验证 | email verification 注册模式先创建 pending 账号、组织和验证 token；过期 token 会标记为 expired 后返回无效 token 错误 |
| 邀请、重置密码和邮箱验证 | service 依赖 `Notifier`；本地 token、审计和 `iam_notification_outbox` 先在同一事务中写入，成功后立即投递一次；debug/noop 返回调试 token/link，SMTP 由 `internal/app` 适配 `pkg/mail` 投递，投递失败会保留 pending 资源、写回 outbox 重试状态并返回错误；受保护通知队列 API 只返回脱敏状态，并支持平台管理员手动重试 |
| MFA | service 依赖 TOTP contract，密钥加密后存储 |
| 会话撤销 | 登出、refresh 轮换、密码重置和管理员撤销都会更新会话状态；管理员撤销会话与审计写入共事务 |
| 审计 | 关键 IAM 动作写入 `iam_audit_logs`；审计写入或 metadata 序列化失败会返回给调用方，本地管理类写操作会与审计写入共用数据库事务 |

## 依赖边界

- `service` 定义 `Repository`、`TokenManager`、`AuthorizerEnforcer`、`TOTPProvider`、`Notifier` 等最小接口。
- `repository` 实现 IAM repository contract，持有数据库 executor、事务和 not-found 映射。
- `infrastructure/smtp_notifier.go` 实现 IAM 通知适配，只依赖本地 `MailSender` contract；`internal/app` 将 `pkg/mail` sender 适配进来。
- `internal/app/adapters` 把 token、authorization、TOTP、host 等 `pkg` 实现适配成 IAM service 接口。
- IAM service 不直接导入 `pkg/token`、`pkg/authorization`、`pkg/mfa`、`pkg/crypto`、`pkg/database` 或 `net/smtp`。
- `internal/app/adapters.IAMPolicyReloadScheduler` 随应用生命周期按 `auth.casbin_reload_interval_seconds` 重试 `LoadPolicies`，补偿启动期或角色/成员变更后的授权引擎重载失败。
- `internal/app/adapters.IAMNotificationOutboxScheduler` 随应用生命周期按 `auth.notification_retry_interval_seconds` 扫描到期通知任务，每轮最多处理 `auth.notification_retry_batch_size` 条；service 会继续把单条投递失败返回给调度器记录。
- IAM 列表缓存和缓存 epoch 只作为性能优化；读取、写入、刷新或过滤条件 hash 编码失败会写入 warn 日志并回退数据库事实，不阻断组织、用户、角色和权限主流程。

## 表结构

goose 迁移位于 `internal/migrations`，主要表包括：

`iam_organizations`、`iam_users`、`iam_memberships`、`iam_roles`、`iam_permissions`、`iam_sessions`、`iam_api_tokens`、`iam_invitations`、`iam_password_resets`、`iam_email_verifications`、`iam_notification_outbox`、`iam_mfa_factors`、`iam_audit_logs`、`iam_casbin_rules`。

本地默认可以自动迁移；生产应显式执行：

```powershell
go run ./cmd/console db migrate status --config=configs/config.yaml
go run ./cmd/console db migrate up --config=configs/config.yaml
```

## 初始管理员

```powershell
"change-this-local-password" | go run ./cmd/console iam bootstrap-admin --config=configs/config.yaml --org-code=acme --org-name="Acme Corp" --username=admin --email=admin@example.com --password-stdin
```

该命令会初始化平台组织、内置权限、`platform_owner/owner/admin/member` 角色、组织成员关系和 Casbin policy。首次初始化管理员只获得平台组织内的 `platform_owner`；公开注册和普通组织创建只会创建租户组织并授予 tenant `owner`。浏览器首次初始化优先走统一初始化中心 `/api/v1/setup/status` 和 `/api/v1/setup/runs`；`/api/v1/auth/setup/status` 和 `/api/v1/auth/setup/initial-admin` 与统一初始化中心复用同一套初始化编排。

## 路由和权限

| 路由 | 认证 | 用途 |
| --- | --- | --- |
| `GET /api/v1/auth/setup/status` | 否 | 查询是否需要首次初始化 |
| `POST /api/v1/auth/setup/initial-admin` | 否 | 创建首个平台组织 owner |
| `GET /api/v1/setup/status` | 否 | 查询统一初始化状态、步骤和诊断 |
| `POST /api/v1/setup/runs` | 否 | 执行统一初始化流程并在首次 setup 时返回登录令牌 |
| `POST /api/v1/setup/runs/{id}/retry` | 条件 | 重试初始化运行；初始化完成后需 setup token |
| `GET /api/v1/setup/runs/{id}/logs` | 条件 | 查询脱敏后的初始化步骤日志摘要；初始化完成后需 setup token |
| `POST /api/v1/auth/signup` | 否 | 自助注册 |
| `POST /api/v1/auth/email-verifications/{token}/confirm` | 否 | 确认邮箱验证并签发会话 |
| `GET /api/v1/auth/captcha` | 否 | 获取登录验证码 |
| `POST /api/v1/auth/login` | 否 | 登录并签发 token |
| `POST /api/v1/auth/refresh` | 否 | 轮换 refresh token |
| `POST /api/v1/auth/password/forgot` | 否 | 创建重置密码 token |
| `POST /api/v1/auth/password/reset` | 否 | 重置密码并撤销原会话 |
| `POST /api/v1/invitations/{token}/accept` | 否 | 接受邀请 |
| `POST /api/v1/auth/logout` | 是 | 撤销当前会话 |
| `POST /api/v1/auth/switch-org` | 是 | 切换组织 |
| `POST /api/v1/auth/mfa/setup` | 是 | 创建或轮换 TOTP secret |
| `POST /api/v1/auth/mfa/verify` | 是 | 校验并启用 TOTP |
| `GET /api/v1/me`、`GET /api/v1/me/orgs` | 是 | 当前身份和组织 |
| `GET /api/v1/iam/notification-outbox` | `platform notification:read` | 分页查询脱敏后的 IAM 通知投递队列 |
| `POST /api/v1/iam/notification-outbox/{outboxId}/retry` | `platform notification:retry` | 手动重试 pending/failed 通知任务并写入 `notification.retry` 审计 |
| `/api/v1/orgs/*` | 是 | 组织、用户、邀请、角色、权限、API Token、会话、审计管理 |

组织管理接口按 `productCode + scope + obj:act` 权限保护。平台能力使用 `platform` scope，例如系统配置、API catalog、权限同步和组织列表；租户能力使用 `tenant` scope，例如 `user:update`、`role:create`、`api_token:revoke`、`session:revoke`、`audit:read`。当前预留 `product` scope，但尚未提供产品线业务 API。

登录、刷新、切换组织和 `GET /api/v1/me/session` 会返回当前会话的 `permissions` 快照。该快照来自当前组织内的用户角色和角色策略，按当前 `productCode` 过滤并保留 `scope + code`，用于 React 控制台决定页面内按钮、危险操作和空态是否可用。它不能替代后端鉴权；所有生产接口仍必须通过 route contract、IAM middleware 和 service `Authorize` 做最终校验。

自定义角色只允许分配当前产品已登记的租户级权限。`CreateRole` 和 `UpdateRole` 会先校验所有传入权限编码，未知权限、格式错误权限和平台级权限都会返回无效输入错误，不会静默跳过，也不会把平台级权限写成租户策略。`platform_owner`、`owner`、`admin`、`member` 等系统角色仍由初始化流程维护，后台角色页面只编辑非系统角色。

React 角色页会按 `/api/v1/me/session` 权限快照控制写操作：创建自定义角色需要租户级 `role:create`，更新自定义角色名称、描述和权限集合需要租户级 `role:update`。权限选择器只展示后端权限目录返回的租户级权限；平台级权限不会出现在可分配列表中。

用户管理接口只处理普通组织成员的状态和角色集合。`InviteUser` 和 `UpdateUser` 都拒绝授予 `platform_owner`；如果目标成员当前已经拥有 `platform_owner`，普通用户更新接口也会拒绝变更该成员的状态或角色，避免通过租户成员管理入口降级或禁用平台所有者。React 用户页会把 `platform_owner` 从邀请和成员角色下拉框中过滤，并将已有 platform owner 行显示为只读。React 用户页还会按 `/api/v1/me/session` 权限快照控制写操作：邀请和撤销邀请需要租户级 `user:invite`，成员状态和角色更新需要租户级 `user:update`。该限制只用于减少误操作；生产授权仍以 route contract、IAM middleware 和 service 校验为准。

React 组织页会按 `/api/v1/me/session` 权限快照区分平台级和租户级写操作：创建组织需要平台级 `org:create`，更新当前组织名称需要租户级 `org:update`；切换组织仍走 `POST /api/v1/auth/switch-org` 的登录态流程，由后端根据成员关系和会话上下文重新签发 token。

React 通知队列页位于 `/admin/notification-outbox`，读取 `GET /api/v1/iam/notification-outbox` 返回的 `NotificationOutboxView` 脱敏视图。页面支持状态、类型、收件人和分页筛选；响应中不得出现一次性 token、完整链接或 token hash。只有具备平台级 `notification:retry` 权限时才启用手动重试按钮；生产授权仍以 route contract、IAM middleware 和 service 校验为准。手动重试会把任务置为 pending、立即调用当前 `Notifier`，投递失败会以 `ErrNotificationDelivery` 返回并保留 outbox 状态供后续补偿。

## API Token

API Token 用于脚本和外部系统调用受保护接口。创建成功后完整 token 只显示一次；列表只保留 `tokenPrefix`，数据库只保存 hash。

Token 绑定签发时的用户、组织和角色。请求仍走 `Authorization: Bearer <token>`，但不会创建 refresh 会话。如果用户被禁用、成员关系失效、角色关系失效、token 过期或撤销，请求会被拒绝。

机器 token 认证成功后会写入最后使用时间；该写入失败会返回错误，不按 best-effort 放行，避免调用方误判审计和访问状态。

React API Token 页面会读取 `/api/v1/me/session` 返回的权限快照：只有具备租户级 `api_token:create` 时才允许打开签发表单，只有具备租户级 `api_token:revoke` 时才允许撤销已有 token。该限制只用于减少误操作；生产授权仍以 `internal/transport/http/contracts.go` 中的 `api_token:read/create/revoke` route contract、IAM middleware 和 service 校验为准。

`auth.refresh_token_pepper` 同时参与 refresh token 和 API Token hash；轮换该值会让两类 token 一起失效。

## 会话管理

React 会话页会按 `/api/v1/me/session` 权限快照控制撤销操作：只有具备租户级 `session:revoke` 时才允许撤销其他会话。当前会话仍只能通过账号安全页的登出流程撤销，不在会话列表中提供自撤销按钮。后端 `DELETE /api/v1/orgs/{orgId}/sessions/{sessionId}` 仍是最终授权边界，并与审计写入共事务。

## 配置

关键字段：

- `auth.enabled`
- `auth.registration_mode`
- `auth.email_verification_ttl_seconds`
- `auth.invitation_ttl_seconds`
- `auth.signing_key`
- `auth.refresh_token_pepper`
- `auth.mfa_secret_key`
- `auth.access_token_ttl_seconds`
- `auth.refresh_token_ttl_seconds`
- `auth.login_captcha_enabled`
- `auth.login_max_failures`
- `auth.notification_driver`
- `auth.notification_retry_interval_seconds`
- `auth.notification_retry_batch_size`
- `auth.notification_retry_max_attempts`
- `auth.smtp.*`
- `auth.password_policy.*`
- `auth.casbin_reload_interval_seconds`
- `migration.auto_apply`

生产环境必须通过 secrets 注入 `signing_key`、`refresh_token_pepper`、`mfa_secret_key` 和 SMTP 密码。`notification_driver=debug/noop/local` 会把调试 token/link 暴露在 API 响应中，只适合本地；`notification_driver=smtp` 不在响应中暴露 token。邀请、密码重置和邮箱验证会先把一次性 token、审计和 outbox 写入同一数据库事务，审计失败时不会发送通知，也不会留下可用通知任务；邮件投递失败时不会撤销本地 pending 资源，而是保留 outbox 待后台补偿，并向调用方返回通知投递失败错误。

`iam_notification_outbox` 会保存重试投递所需的明文一次性 token 和完整链接。生产环境必须把数据库访问、备份和导出权限按一次性凭据处理；调试响应是否暴露 token 仍只由 `notification_driver=debug/noop/local` 控制。管理端通知队列 API 和 `/admin/notification-outbox` 只展示脱敏状态、收件人、类型、尝试次数、下次尝试时间和最后错误摘要，不暴露可直接完成账号动作的凭据。

`auth.registration_mode` 支持 `disabled`、`direct`、`email_verification` 和 `invite_only`。`direct` 保持注册后立即登录；`email_verification` 会先创建 pending 组织、用户、成员关系和邮箱验证 token，确认链接后才激活并签发会话；`disabled` 与 `invite_only` 会拒绝公开注册，邀请链接流程仍然可用。

邮箱验证注册投递失败时会保留 pending 组织、用户、成员关系、验证 token 和 outbox 任务，由后台调度器继续补偿投递。用户如果重复提交相同组织或邮箱，仍会受到唯一性约束保护；运维应优先修复通知配置或人工处理 pending 数据，而不是让 service 静默删除本地事实。

`auth.casbin_reload_interval_seconds` 控制 IAM policy reload scheduler 的后台重试间隔。角色、成员和初始化权限变更仍会同步调用 `LoadPolicies`；同步重载失败会返回错误，后台任务只用于后续补偿，不替代调用方错误处理。

`auth.notification_retry_interval_seconds` 控制通知 outbox 后台补偿调度间隔，也用于失败任务的下一次重试时间；`auth.notification_retry_batch_size` 控制每轮最多扫描任务数；`auth.notification_retry_max_attempts` 控制单条通知达到上限后转入 failed 状态并停止继续投递原链接。

## 测试入口

```powershell
go test ./internal/modules/iam/... -count=1 -mod=readonly
go test ./internal/app/initapp -count=1 -mod=readonly
```

IAM service 测试通过 `internal/app/testsupport.IAMSQLiteDatabase` 和 `NewIAMDeps` 获取真实 SQLite、迁移、token、RBAC、TOTP 和密码实现。

## 非目标

- 当前不提供 SSO/OIDC/SAML。
- 当前不提供短信 MFA、邮件验证码 MFA 或企业消息网关。
- 当前内置通知只有 debug/noop/local 和 SMTP；外部通知系统应新增 `Notifier` 实现并在 `internal/app` 装配。
