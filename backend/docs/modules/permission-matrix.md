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

`platform_owner` 是首次初始化平台组织角色；`owner`、`admin`、`member` 是租户级角色。普通用户管理和角色编辑不得授予或降级 `platform_owner`。

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
| 字典列表 | `GET /api/v1/system/dictionaries` | `platform` | `dictionary:read` | `/admin/dictionaries` | 页面读取依赖后端 403 处理 |
| 创建字典 | `POST /api/v1/system/dictionaries` | `platform` | `dictionary:create` | `/admin/dictionaries` | `admin dictionaries route disables writes without dictionary grants` |
| 更新字典和字典项 | `PATCH /api/v1/system/dictionaries/:dictionaryId`、`POST/PATCH /api/v1/system/*dictionary-items*` | `platform` | `dictionary:update` | `/admin/dictionaries` | `admin dictionaries route disables writes without dictionary grants` |
| 删除字典和字典项 | `DELETE /api/v1/system/dictionaries*`、`DELETE /api/v1/system/dictionary-items*` | `platform` | `dictionary:delete` | `/admin/dictionaries` | `admin dictionaries route disables writes without dictionary grants` |
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

Announcements 是当前模块化扩展示例。后台写入入口通过 IAM 权限保护，公开读取入口只暴露已发布 `PublicAnnouncement` 视图。新增业务模块时应复制这种显式接入链路，而不是恢复插件系统或运行期动态发现。

## Community 公开社区模块

| 能力 | 路由范围 | Scope | 权限 | 前端入口 | 无权状态覆盖 |
| --- | --- | --- | --- | --- | --- |
| 社区公开读取 | `GET /api/v1/public/community/*` | 公开 | 无权限码 | `frontend/` 首页、分类、搜索、视频页、用户页、关注推荐预览 | 公开读接口不依赖 IAM |
| 社区公开评论发布 | `POST /api/v1/public/community/videos/:idOrSlug/comments` | 公开 | 无权限码 | `frontend/` 视频页评论输入框 | 当前轻量发布不绑定登录态；后续审核、举报、编辑删除需另行设计权限与状态 |

Community 模块当前提供公开读取和轻量公开评论发布，供 Nuxt 视频社区在关闭 mock 后接入。真实投稿、评论审核、关注关系、点赞收藏和创作者后台管理还不是后端生产能力，前端相关互动只能作为浏览器本地体验层或后续任务说明。

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
