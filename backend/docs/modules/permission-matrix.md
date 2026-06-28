# 后台权限矩阵

本文以当前真实代码为依据，汇总后台核心能力的权限边界、前端体验层守卫和测试入口。权限事实来源是 `internal/transport/http/contracts.go`；本文只解释当前状态，不能替代 route contract、IAM middleware 或 service 级校验。

## 事实来源

| 来源 | 作用 |
| --- | --- |
| `internal/transport/http/contracts.go` | 主系统 HTTP 路由、访问级别、权限码、scope、OpenAPI 和 API catalog 的单一事实来源 |
| `internal/modules/system/service/service.go` | 后台菜单 catalog、API catalog、权限同步和 System 默认数据 |
| `internal/modules/iam/service/service.go` | 组织、角色、权限、会话、API Token、审计和会话权限快照 |
| `web/app/app/stores/auth-store.ts` | React 控制台读取 `/api/v1/me/session` 后保存当前会话权限快照 |
| `web/app/tests/e2e/smoke.spec.ts` | 后台关键页面的有权流程和无权禁写回归用例 |
| `docs/api/openapi.yaml` | 由 route contract 生成的机器可读 HTTP 契约，禁止手写维护 |

权限相关改动必须同时检查后端 contract、真实路由、OpenAPI、权限同步、前端 API client、页面按钮状态、i18n 和 E2E。只改其中一处会造成权限漂移。

## Scope 规则

| Scope | 用途 | 示例权限 |
| --- | --- | --- |
| `platform` | 平台级能力，影响全局配置、组织列表、API catalog、系统数据和平台运行状态 | `org:create`、`config:update`、`permission:sync`、`media:upload` |
| `tenant` | 当前组织内能力，影响成员、角色、API Token、会话、审计和业务模块数据 | `user:update`、`role:create`、`api_token:revoke`、`announcement:update` |
| `product` | 预留给未来产品线能力 | 当前主系统尚未提供产品线业务 API |

React 控制台只能使用 `/api/v1/me/session` 返回的 `permissions` 快照禁用按钮、表单和危险动作。该快照只用于减少误操作；生产授权仍以 route contract、middleware、handler 和 service 校验为准。

## IAM 权限

| 能力 | 路由范围 | Scope | 权限 | 前端入口 | 无权状态覆盖 |
| --- | --- | --- | --- | --- | --- |
| 当前身份与组织 | `/api/v1/me*`、`POST /api/v1/auth/switch-org` | 登录态 | 无权限码 | 全局认证、组织切换 | 认证引导和跳转测试 |
| 组织列表 | `GET /api/v1/orgs` | `platform` | `org:read` | `/admin/organizations` | 页面读取依赖后端 403 处理 |
| 创建组织 | `POST /api/v1/orgs` | `platform` | `org:create` | `/admin/organizations` | `admin organizations route disables writes without organization grants` |
| 更新当前组织 | `PATCH /api/v1/orgs/:orgId` | `tenant` | `org:update` | `/admin/organizations` | `admin organizations route disables writes without organization grants` |
| 用户列表 | `GET /api/v1/orgs/:orgId/users` | `tenant` | `user:read` | `/admin/users` | 页面读取依赖后端 403 处理 |
| 邀请用户 / 撤销邀请 | `/api/v1/orgs/:orgId/invitations*` | `tenant` | `user:invite` | `/admin/users` | `admin users route disables writes without user mutation grants` |
| 更新成员状态和角色 | `PATCH /api/v1/orgs/:orgId/users/:userId` | `tenant` | `user:update` | `/admin/users` | `admin users route disables writes without user mutation grants` |
| 角色列表 | `GET /api/v1/orgs/:orgId/roles` | `tenant` | `role:read` | `/admin/roles` | 页面读取依赖后端 403 处理 |
| 创建角色 | `POST /api/v1/orgs/:orgId/roles` | `tenant` | `role:create` | `/admin/roles` | `admin roles route disables writes without role mutation grants` |
| 更新角色 | `PATCH /api/v1/orgs/:orgId/roles/:roleId` | `tenant` | `role:update` | `/admin/roles` | `admin roles route disables writes without role mutation grants` |
| 权限目录 | `GET /api/v1/orgs/:orgId/permissions` | `tenant` | `permission:read` | `/admin/roles` | 页面读取依赖后端 403 处理 |
| API Token 列表 | `GET /api/v1/orgs/:orgId/api-tokens` | `tenant` | `api_token:read` | `/admin/api-tokens` | 页面读取依赖后端 403 处理 |
| 签发 API Token | `POST /api/v1/orgs/:orgId/api-tokens` | `tenant` | `api_token:create` | `/admin/api-tokens` | `admin API tokens route disables writes without API token grants` |
| 撤销 API Token | `DELETE /api/v1/orgs/:orgId/api-tokens/:tokenId` | `tenant` | `api_token:revoke` | `/admin/api-tokens` | `admin API tokens route disables writes without API token grants` |
| 会话列表 | `GET /api/v1/orgs/:orgId/sessions` | `tenant` | `session:read` | `/admin/sessions` | 页面读取依赖后端 403 处理 |
| 撤销会话 | `DELETE /api/v1/orgs/:orgId/sessions/:sessionId` | `tenant` | `session:revoke` | `/admin/sessions` | `admin sessions route disables revocation without session revoke grant` |
| 审计日志 | `GET /api/v1/orgs/:orgId/audit-logs` | `tenant` | `audit:read` | `/admin/audit-logs`、`/admin/login-logs` | 只读页面 |
| 通知队列列表 | `GET /api/v1/iam/notification-outbox` | `platform` | `notification:read` | `/admin/notification-outbox` | 页面读取依赖后端 403 处理 |
| 通知队列手动重试 | `POST /api/v1/iam/notification-outbox/:outboxId/retry` | `platform` | `notification:retry` | `/admin/notification-outbox` | 页面禁用重试按钮并展示无权说明 |

`platform_owner` 是首次初始化平台组织角色；`owner`、`admin`、`moderator`、`operator`、`member` 是租户级角色。普通用户管理和角色编辑不得授予或降级 `platform_owner`。

## 控制台角色矩阵

| 角色 | 是否进入控制台 | 身份来源 | 默认能力 |
| --- | ---: | --- | --- |
| 普通注册用户 | 否 | `community_accounts` | 只使用社区前台，不创建 IAM 用户、组织、角色或控制台会话 |
| 内容创作者 | 通常否 | `community_accounts.role=creator` | 作为社区账号能力 / 标识处理；如需数据面板，后续单独做创作者中心 |
| 版主 / 审核员 | 可以 | IAM `moderator` | `community_submission:review`、`community_report:review` |
| 运营人员 | 可以 | IAM `operator` | `community_account:read`、`community_account:update`、`community_submission:review`、`community_report:review` |
| 管理员 | 可以 | IAM `admin` | 复用现有租户级管理能力 |
| 超级管理员 | 可以 | IAM `platform_owner` | 最高权限，应严格限制和审计 |

`member` 仍只保留基础 `me:read`，不能作为普通社区账号入口。社区注册 / 登录不再复用 IAM `Signup/Login`，因此不会产生 `community-*` 租户组织、`owner` 角色或 `console_*` 控制台会话。

通知队列只展示脱敏后的 IAM 通知投递任务，不返回一次性 token、完整链接或 token hash。手动重试会写入 `notification.retry` 审计；如果当前通知驱动仍不可用，后端会返回通知投递失败并保留 outbox 状态供后台补偿。

## System 权限

| 能力 | 路由范围 | Scope | 权限 | 前端入口 | 无权状态覆盖 |
| --- | --- | --- | --- | --- | --- |
| 公开运行设置 | `GET /api/v1/system/public-settings` | 公开 | 无权限码 | 全局启动、认证页、初始化门禁 | 公共设置 smoke |
| 菜单目录 | `GET /api/v1/system/menus` | 登录态 | 无权限码，后端按菜单权限过滤 | `/admin/menus`、后台导航 | `admin menu catalog route renders backend-filtered menu groups` |
| 配置读取 | `GET /api/v1/system/config` | `platform` | `config:read` | `/admin/system` | 页面读取依赖后端 403 处理 |
| 配置更新 | `PATCH /api/v1/system/config` | `platform` | `config:update` | `/admin/system` | `admin system settings route disables updates without config update grant` |
| 服务器状态 | `/api/v1/system/server-info*`、`/api/v1/system/server-metrics/history` | `platform` | `server:read` | `/admin` | 仪表盘 smoke |
| API catalog 读取 | `GET /api/v1/system/apis` | `platform` | `permission:read` | `/admin/apis` | 页面读取依赖后端 403 处理 |
| API catalog 同步 | `POST /api/v1/system/apis/sync` | `platform` | `permission:sync` | `/admin/apis` | `admin API catalog disables sync actions without platform sync grant` |
| 权限目录同步 | `POST /api/v1/system/apis/permissions/sync` | `platform` | `permission:sync` | `/admin/apis` | `admin API catalog disables sync actions without platform sync grant` |
| 操作记录列表 | `GET /api/v1/system/operation-records` | `platform` | `operation:read` | `/admin/operation-records`、`/admin/error-logs` | 读取和筛选 smoke |
| 删除操作记录 | `DELETE /api/v1/system/operation-records` | `platform` | `operation:delete` | `/admin/operation-records` | `admin operation records route disables delete without operation delete grant` |
| 参数列表和详情 | `GET /api/v1/system/parameters*` | `platform` | `parameter:read` | `/admin/parameters` | 页面读取依赖后端 403 处理 |
| 创建参数 | `POST /api/v1/system/parameters` | `platform` | `parameter:create` | `/admin/parameters` | `admin parameters route disables writes without parameter grants` |
| 更新参数 | `PATCH /api/v1/system/parameters/:parameterId` | `platform` | `parameter:update` | `/admin/parameters` | `admin parameters route disables writes without parameter grants` |
| 删除参数 | `DELETE /api/v1/system/parameters*` | `platform` | `parameter:delete` | `/admin/parameters` | `admin parameters route disables writes without parameter grants` |
| 字典列表 | `GET /api/v1/system/dictionaries` | `platform` | `dictionary:read` | `/admin/dictionaries`、`/admin/community/categories` | 页面读取依赖后端 403 处理；社区分类读取 `community.video.category` item |
| 创建字典 | `POST /api/v1/system/dictionaries` | `platform` | `dictionary:create` | `/admin/dictionaries`、`/admin/community/categories` | `admin dictionaries route disables writes without dictionary grants`；社区分类页只在缺少 `community.video.category` 字典壳时创建该内置 code |
| 更新字典和字典项 | `PATCH /api/v1/system/dictionaries/:dictionaryId`、`POST/PATCH /api/v1/system/*dictionary-items*` | `platform` | `dictionary:update` | `/admin/dictionaries`、`/admin/community/categories` | `admin dictionaries route disables writes without dictionary grants`；社区分类 item 的 `value` 为 slug、`label` 为展示名、`extra` 保存展示元数据 |
| 删除字典和字典项 | `DELETE /api/v1/system/dictionaries*`、`DELETE /api/v1/system/dictionary-items*` | `platform` | `dictionary:delete` | `/admin/dictionaries`、`/admin/community/categories` | `admin dictionaries route disables writes without dictionary grants`；社区分类删除只删除字典 item，不新增社区分类 API |
| 版本列表和来源 | `GET /api/v1/system/versions*` | `platform` | `version:read` | `/admin/versions` | 页面读取依赖后端 403 处理 |
| 创建版本发布包 | `POST /api/v1/system/versions/export` | `platform` | `version:create` | `/admin/versions` | `admin versions route disables package writes without version grants` |
| 导入版本发布包 | `POST /api/v1/system/versions/import` | `platform` | `version:import` | `/admin/versions` | `admin versions route disables package writes without version grants` |
| 删除版本发布包 | `DELETE /api/v1/system/versions*` | `platform` | `version:delete` | `/admin/versions` | `admin versions route disables package writes without version grants` |
| 下载版本发布包 | `GET /api/v1/system/versions/:versionId/download` | `platform` | `version:download` | `/admin/versions` | `admin versions route disables package writes without version grants` |
| 媒体分类和资源列表 | `GET /api/v1/system/media*` | `platform` | `media:read` | `/admin/media` | 页面读取依赖后端 403 处理 |
| 媒体分类维护和资源重命名 | `POST /api/v1/system/media/categories`、`DELETE /api/v1/system/media/categories/:categoryId`、`PATCH /api/v1/system/media/assets/:assetId` | `platform` | `media:update` | `/admin/media` | `admin media route disables writes without media operation grants` |
| 普通上传和断点上传 | `/api/v1/system/media/assets/upload`、`/api/v1/system/media/assets/resumable*` | `platform` | `media:upload` | `/admin/media`、`/admin/media-resumable` | `admin media route disables writes without media operation grants`、`admin media resumable route disables upload workflow without media upload grant` |
| URL 导入 | `POST /api/v1/system/media/assets/import-url` | `platform` | `media:import` | `/admin/media` | `admin media route disables writes without media operation grants` |
| 删除媒体资源 | `DELETE /api/v1/system/media/assets/:assetId` | `platform` | `media:delete` | `/admin/media` | `admin media route disables writes without media operation grants` |
| 认证下载媒体资源 | `GET /api/v1/system/media/assets/:assetId/download` | `platform` | `media:download` | `/admin/media` | `admin media route disables writes without media operation grants` |
| 流量劫持读取和事件流 | `GET /api/v1/system/traffic-hijack*` | `platform` | `traffic_hijack:read` | `/admin/traffic-hijack`、`/admin` | 页面读取依赖后端 403 处理 |
| 流量劫持目标维护、立即探测和事件恢复 | `POST/PATCH /api/v1/system/traffic-hijack*` | `platform` | `traffic_hijack:update` | `/admin/traffic-hijack` | `admin traffic hijack route disables writes without mutation grants` |
| 删除流量劫持目标 | `DELETE /api/v1/system/traffic-hijack/targets/:targetId` | `platform` | `traffic_hijack:delete` | `/admin/traffic-hijack` | `admin traffic hijack route disables writes without mutation grants` |

`GET /openapi.yaml` 是公开运行时契约接口，不进入 `/api/v1` API catalog、权限同步、操作记录或 SPA fallback。

## Announcements 示例模块权限

| 能力 | 路由范围 | Scope | 权限 | 前端入口 | 无权状态覆盖 |
| --- | --- | --- | --- | --- | --- |
| 公开公告列表和详情 | `GET /api/v1/public/announcements*` | `platform` | 公开接口，无 IAM 权限 | `/announcements` | `public announcements route reads published product-line content` |
| 公告列表和详情 | `GET /api/v1/announcements*` | `tenant` | `announcement:read` | `/admin/announcements` | 页面读取依赖后端 403 处理 |
| 创建公告 | `POST /api/v1/announcements` | `tenant` | `announcement:create` | `/admin/announcements` | `admin announcements route disables writes without announcement grants` |
| 更新、发布和归档公告 | `PATCH /api/v1/announcements/:id`、`POST /publish`、`POST /archive` | `tenant` | `announcement:update` | `/admin/announcements` | `admin announcements route disables writes without announcement grants` |
| 删除公告 | `DELETE /api/v1/announcements/:id` | `tenant` | `announcement:delete` | `/admin/announcements` | `admin announcements route disables writes without announcement grants` |

Announcements 是当前模块化扩展示例。后台写入入口通过 IAM 权限保护，公开读取入口只暴露已发布 `PublicAnnouncement` 视图。新增业务模块时应复制这种显式接入链路，并以模块装配和 route contract 作为扩展事实。

## Community 公开社区模块

| 能力 | 路由范围 | Scope | 权限 | 前端入口 | 无权状态覆盖 |
| --- | --- | --- | --- | --- | --- |
| 社区公开读取 | `GET /api/v1/public/community/*` | 公开 | 无权限码 | `frontend/` 首页、分类、搜索、视频页、用户页、关注动态 | 公开读接口不依赖 IAM |
| 社区账号会话 | `/api/v1/public/community/auth/*` | 公开 / 社区会话 | 登出要求社区会话和 CSRF | `frontend/` 登录、注册、账号状态 | 只读写 `community_accounts`、`community_sessions` 和 `community_*` Cookie；响应只暴露社区账号字段：`userId`、`sessionId`、过期时间和 `account.id / account.handle / account.displayName` |
| 社区评论发布 | `POST /api/v1/public/community/videos/:idOrSlug/comments` | 公开 | 无权限码 | `frontend/` 视频页评论输入框 | 以提交作者名写入公开评论，并同步视频评论数 |
| 社区弹幕发布 | `POST /api/v1/public/community/videos/:idOrSlug/danmaku` | 公开 | 无权限码 | `frontend/` 视频播放器弹幕输入框 | 以提交作者名写入视频弹幕，弹幕列表按视频读取 |
| 社区动态 | `GET /api/v1/public/community/dynamics`、`POST /api/v1/public/community/dynamics`、`POST /api/v1/public/community/account/dynamics` | 公开 / 社区会话 | 账号路径要求社区会话和 CSRF | `frontend/` 动态页、关注动态发布框 | 匿名动态使用 `clientId`；社区账号动态使用 `account.displayName` 展示作者名；首页不再展示社区动态区块 |
| 社区关注 | `POST/DELETE /api/v1/public/community/users/:handle/follow`、`POST/DELETE /api/v1/public/community/account/users/:handle/follow` | 公开 / 社区会话 | 账号路径要求社区会话和 CSRF | `frontend/` 创作者卡片、用户页、关注动态 | 匿名和社区账号关注关系分别按 `clientId` 与账号范围保存，关注成功写入对应通知 |
| 社区视频互动 | `GET /api/v1/public/community/videos/:idOrSlug/interaction-state`、`POST/DELETE /api/v1/public/community/videos/:idOrSlug/interactions/:kind`、`GET /api/v1/public/community/library`、`/api/v1/public/community/account/videos/*`、`GET /api/v1/public/community/account/library` | 公开 / 社区会话 | 账号路径要求社区会话和 CSRF | `frontend/` 视频页点赞 / 收藏 / 稍后看、稍后看和收藏列表 | 匿名和社区账号点赞、收藏、稍后看关系分别按 `clientId` 与账号范围保存 |
| 社区观看历史 | `GET/POST /api/v1/public/community/history*`、`GET/POST /api/v1/public/community/account/history*`、`POST /api/v1/public/community/account/videos/:idOrSlug/history` | 公开 / 社区会话 | 账号路径要求社区会话和 CSRF | `frontend/` 观看历史、视频页播放进度 | 保存最近观看时间和播放进度，账号历史响应带 `authenticated=true` 与账号范围 `clientId` |
| 社区投稿 | `GET/POST /api/v1/public/community/submissions`、`GET/POST /api/v1/public/community/account/submissions` | 公开 / 社区会话 | 账号路径要求社区会话和 CSRF | `frontend/` 投稿草稿页 | 保存投稿元数据、分类、标签、可见性和文件描述，不保存文件字节 |
| 社区账号管理 | `GET /api/v1/community/accounts`、`PATCH /api/v1/community/accounts/:accountId` | `tenant` | `community_account:read`、`community_account:update` | `/admin/community/accounts` | 主系统 IAM 权限保护；只管理社区角色 `registered/creator` 和账号状态，不授予控制台 IAM 角色 |
| 社区投稿审核 | `GET /api/v1/community/submissions`、`PATCH /api/v1/community/submissions/:submissionId/review` | `tenant` | `community_submission:review` | `/admin/community/submissions` | 主系统 IAM 权限保护；支持审核队列、`approved` / `rejected` / `published` 状态、审核备注、审核时间和发布视频 ID 回写，不创建媒体文件 |
| 社区视频举报 | `POST /api/v1/public/community/videos/:idOrSlug/reports` | 公开 | 无权限码 | `frontend/` 视频页稿件举报弹窗 | 以匿名 `clientId` 写入待处理举报记录，并写入通知回执 |
| 社区举报处理 | `GET /api/v1/community/reports`、`PATCH /api/v1/community/reports/:reportId` | `tenant` | `community_report:review` | `/admin/community/reports` | 主系统 IAM 权限保护；支持读取举报队列、保存 `resolved` / `rejected` 和处理备注 |
| 社区通知 | `GET/POST /api/v1/public/community/notifications*`、`GET/POST /api/v1/public/community/account/notifications*` | 公开 / 社区会话 | 账号路径要求社区会话和 CSRF | `frontend/` 通知页面、移动端顶部通知入口 | 匿名和社区账号通知分别按 `clientId` 与账号范围读取和标记已读 |

Community 模块提供公开读取、评论 / 弹幕 / 动态发布、创作者关注、视频互动、观看历史、投稿元数据、视频级举报、通知收件箱，以及后台社区分类、社区账号、投稿审核和举报处理。社区分类管理复用 System 字典 API 与 `dictionary:*` 权限，生产分类来源是 `community.video.category` 字典 item，不新增平行分类存储或孤立权限码。匿名流程使用浏览器 `clientId`，社区账号流程使用当前社区会话派生的账号范围 `clientId`；前端在关闭 mock 后通过 `/api/v1/public/community/*` 接入社区前台接口，后台 React WebUI 通过 `/api/v1/community/*` 或系统字典 API 接入受 IAM 保护的真实管理能力。创作者中心、活动配置和批量评论治理尚无后端契约，不在当前控制台伪造页面。

## 新增权限的检查清单

1. 在 `internal/transport/http/contracts.go` 增加或修改 route contract，明确 `Access`、`Permission` 和 `Scope`。
2. 同步真实路由注册，确保 handler 使用 `routeSpecFor` 和 contract 注册。
3. 如果权限会出现在角色配置中，确认 API/权限同步能把它写入 IAM 权限目录。
4. 前端页面通过 `hasSessionPermission` 使用 `/api/v1/me/session` 权限快照禁用写操作入口。
5. 用户可见权限提示写入 `web/app/app/i18n/locales/zh-CN.json` 和 `web/app/app/i18n/locales/en-US.json`。
6. 补充 E2E：有权流程至少覆盖一个完整业务闭环；无权流程必须断言按钮禁用，并断言不会发出对应写请求。
7. 运行：

```powershell
go run ./cmd/console api openapi --output docs/api/openapi.yaml
go test ./internal/transport/http -count=1 -mod=readonly
go test ./internal/modules/system/... -count=1 -mod=readonly
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
pnpm --dir web/app test:e2e -- tests/e2e/smoke.spec.ts --project=desktop -g "<相关后台页面>"
git diff --check
```

如果只是新增只读页面，仍需确认读接口权限、错误态和菜单可见性；如果新增写操作，必须有无权禁写测试。
