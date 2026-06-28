# Community 模块

`backend/internal/modules/community` 为 `frontend/` Nuxt 视频社区提供公开社区数据接口，并为后台控制台提供社区分类、社区账号、投稿审核、视频处理任务和举报处理管理契约。当前模块覆盖独立社区账号注册与会话、首页聚合、分类树、视频列表与详情、弹幕、评论发布与本人编辑删除、搜索、创作者资料、关注动态、动态发布与本人编辑删除、视频互动、收藏 / 稍后看、观看历史、投稿元数据、账号源文件上传、受控审核队列、异步转码任务、本地 FFmpeg HLS 发布、通用云 webhook dispatch / callback、发布视频 ID 回写、举报处理和通知收件箱。

## 当前能力

| 能力 | 路由 | 说明 |
| --- | --- | --- |
| API 状态 | `GET /api/v1/public/community/status` | 始终可读，返回数据源模式、base path、由真实 route contract 注册结果派生的端点清单、响应耗时、更新时间和 `setup.required/completed/currentStep` |
| 社区账号 | `POST /auth/signup`、`POST /auth/login`、`GET /auth/session`、`POST /auth/logout` | 使用独立 `community_accounts` / `community_sessions` 和 `community_*` Cookie，不创建 IAM 用户、`community-*` 组织、`owner` 角色或 `console_*` 会话；只向前端暴露 `userId`、`sessionId`、过期时间和 `account.id/handle/displayName` |
| 首页聚合 | `GET /home` | 返回公告模块中的真实已发布公告、分类树、最新视频和兼容动态数据；没有已发布公告时 `announcement` 为 `null`；Nuxt 首页不再渲染社区动态区块，动态能力保留在动态 / 关注流专门页面 |
| 分类与视频 | `GET /categories`、`GET /videos`、`GET /videos/:idOrSlug` | 分类树由系统字典 `community.video.category` 的 active item 投影生成；视频列表支持分类、关键词、游标和数量限制，视频详情包含播放源、标签和相关推荐 |
| 弹幕 | `GET /videos/:idOrSlug/danmaku`、`POST /videos/:idOrSlug/danmaku` | 读取初始弹幕并支持轻量发布；发布失败时前端可降级到浏览器体验层 |
| 评论 | `GET /videos/:idOrSlug/comments`、`POST /videos/:idOrSlug/comments`、`PATCH/DELETE /videos/:idOrSlug/comments/:commentId`、`PATCH/DELETE /account/videos/:idOrSlug/comments/:commentId` | 支持 `sort=newest/oldest` 与数量限制；发布、本人编辑和本人删除按匿名或账号 `clientId` 归属校验，删除后同步视频评论数；列表可通过 `clientId` 返回 `ownedByCurrentClient` |
| 视频互动 | `GET /videos/:idOrSlug/interaction-state`、`POST/DELETE /videos/:idOrSlug/interactions/:kind` | 匿名 `clientId` 或社区账号范围写入点赞、收藏、稍后看状态 |
| 观看历史 | `GET /history`、`POST /history/clear`、`POST /videos/:idOrSlug/history` | 匿名或社区账号范围记录最近观看时间和播放进度 |
| 资料库 | `GET /library`、`GET /account/library` | 读取收藏和稍后看列表 |
| 投稿元数据 | `GET/POST /submissions`、`GET/POST /account/submissions`、`POST /account/submissions/upload` | 保存作者、标题、简介、分类、标签、可见性和文件元数据；账号源文件上传返回后端真实 DTO：`mediaAssetId/displayName/originalName/url/mimeType/sizeBytes`，投稿创建再映射为 `sourceName/sourceSize/sourceType` |
| 投稿审核 | `GET /api/v1/community/submissions`、`PATCH /api/v1/community/submissions/:submissionId/review` | 主系统 IAM 权限 `community_submission:review` 保护；支持 `approved`、`rejected`、`published` 状态，写入审核备注、审核人、审核时间、受控 `mediaAssetId` 和发布视频 ID；审核通过后由 `community_video:transcode` 创建转码发布任务，保留 `published` 绑定既有视频 ID 的兼容路径，不再让常规审核请求执行长时间转码 |
| 视频处理任务 | `POST /api/v1/community/submissions/:submissionId/transcode`、`GET /api/v1/community/video-jobs`、`GET /api/v1/community/video-jobs/:jobId`、`POST /api/v1/community/video-jobs/:jobId/retry`、`POST /api/v1/public/community/video-jobs/:jobId/callback` | 主系统 IAM 权限 `community_video:transcode/read/retry` 管理任务；创建接口只写入 queued job 并立即返回。生命周期 worker 使用数据库 lease claim 任务，本地模式调用 FFmpeg / FFprobe 生成 HLS master 和 renditions，云模式向 `community.video.cloud.dispatchUrl` 发送 HMAC 签名 dispatch，并由公开签名 callback 补齐视频、source 和 rendition 数据 |
| 社区账号管理 | `GET /api/v1/community/accounts`、`PATCH /api/v1/community/accounts/:accountId` | 主系统 IAM 权限 `community_account:read` / `community_account:update` 保护；后台 `/admin/community/accounts` 只管理社区账号角色 `registered/creator` 与状态 `active/disabled`，不授予控制台角色 |
| 举报 | `POST /videos/:idOrSlug/reports` | 保存匿名 `clientId`、原因、补充说明和待处理状态 |
| 举报处理 | `GET /api/v1/community/reports`、`PATCH /api/v1/community/reports/:reportId` | 主系统 IAM 权限 `community_report:review` 保护；后台 `/admin/community/reports` 可将举报标记为 `resolved` 或 `rejected` 并写入处理备注 |
| 通知 | `GET /notifications`、`POST /notifications/read`、`GET /account/notifications`、`POST /account/notifications/read` | 评论、弹幕、举报、关注和视频互动写入轻量消息流，支持标记已读 |
| 动态流 | `GET /dynamics`、`POST /dynamics`、`PATCH/DELETE /dynamics/:dynamicId`、`POST /account/dynamics`、`PATCH/DELETE /account/dynamics/:dynamicId` | 查询公开动态时间线，匿名或账号发布、本人编辑和本人删除轻量动态，可绑定视频摘要；列表通过 `clientId` 返回 `ownedByCurrentClient` |
| 创作者关注 | `GET /users/:handle`、`GET /users/:handle/follow-state`、`POST/DELETE /users/:handle/follow`、`GET /feed/following` | 匿名或账号关注创作者，并返回关注创作者的视频与动态 |
| 账号范围接口 | `/account/**` | 需要社区账号会话与 CSRF token，数据范围由账号派生的 `clientId` 控制 |

## Setup Gate

- `GET /api/v1/public/community/status` 不受 setup gate 阻断，用于前端判断真实 API 是否可用。
- 平台首次初始化未完成时，社区内容接口、社区账号认证接口和 `/account/**` 接口统一返回 HTTP `503` 的 `types/result` envelope。
- 初始化阻断响应使用稳定 `messageKey=api.setup.required`，`data` 为 `CommunitySetupStatus`，包含 `required`、`completed` 和 `currentStep`。
- 前端必须把该状态展示为“真实后端尚未初始化”的引导态，不得回退成伪造真实数据；Nuxt mock 可以继续提供演示数据，但必须显示为 mock 边界。

## 边界

- 社区公开接口不提供 IAM 权限码，也不写入 `system_apis` 的受保护权限目录；它们仍通过 route contract 生成 OpenAPI。
- 社区账号用于普通观看、创作者互动和投稿流程，不暴露后台组织、角色、权限或控制台身份字段；普通注册用户和内容创作者不能凭社区账号进入 `/admin`。
- 当前评论、弹幕、动态、投稿、视频处理任务和举报是轻量生产接口；评论和动态支持本人编辑 / 删除，投稿支持主系统权限保护的审核状态流转、账号源文件上传、发布视频 ID 回写和异步 HLS 发布。普通社区投稿创建只保存文件元数据，真实源文件由账号上传接口写入社区媒体资产；后台社区 WebUI 当前覆盖社区分类、社区账号、投稿审核、视频任务详情和举报处理。创作者中心、活动运营、批量评论治理、登录态与匿名关系归并、外部通知投递仍属于后续任务，不在当前控制台伪造入口。
- 视频分类是后台可管理系统字典数据，不是后端固定 taxonomy，也不是 Nuxt 页面/store 中的硬编码枚举；后台“社区分类”页面复用字典权限和字典 API 管理 `community.video.category` 的 item。
- `scripts/check-frontend-community-boundary.ps1` 同时守住前端 mock 边界和后端社区生产 Go / SQL 边界；后端生产路径不得恢复 `community_categories` 分类表、社区 demo seed、生产分类默认值或 mock / fixture / demo 业务分支，`_test.go` 中的中性 fixture 不代表生产分类。
- 浏览器本地状态只保存匿名 `clientId`、显示偏好、必要降级缓存和上传草稿文件元数据；不得保存文件字节、后台权限 payload 或不可恢复的大对象。

## 数据与装配

- 迁移 `internal/migrations/20260626000100_create_community_tables.sql` 创建社区创作者、视频、视频分类关联、标签、播放源和弹幕表；不创建 `community_categories` 生产分类表，也不写入 demo 分类、创作者、视频、播放源、标签或弹幕数据。
- 迁移 `internal/migrations/20260626000200_create_community_video_comments.sql` 创建社区视频评论表；不写入演示评论，真实评论来自公开或账号评论接口写入。
- 迁移 `internal/migrations/20260626000300_create_community_creator_follows.sql` 创建匿名创作者关注关系表。
- 迁移 `internal/migrations/20260626000400_create_community_video_interactions.sql` 创建匿名视频点赞、收藏和稍后看关系表。
- 迁移 `internal/migrations/20260626000500_create_community_reports.sql` 创建社区举报记录表。
- 迁移 `internal/migrations/20260626000600_create_community_notifications.sql` 创建匿名通知表。
- 迁移 `internal/migrations/20260626000700_create_community_dynamics.sql` 创建社区动态表；动态表已有 `client_id` 归属列，用于匿名或账号本人编辑 / 删除，不写入演示时间线。
- 迁移 `internal/migrations/20260626000800_create_community_submissions.sql` 创建社区投稿元数据表。
- 迁移 `internal/migrations/20260626000900_create_community_video_history.sql` 创建观看历史表。
- 迁移 `internal/migrations/20260626001000_refine_community_demo_copy.sql` 保留迁移版本链，但在当前真实运行路径中为空操作。
- 迁移 `internal/migrations/20260626001100_add_community_video_comment_client_id.sql` 为视频评论补充 `client_id` 归属列和查询索引，用于本人评论编辑 / 删除；历史种子评论保持空 `client_id`，因此默认只读。
- 迁移 `internal/migrations/20260627000100_add_community_submission_review_state.sql` 为投稿元数据补充审核备注、审核人、审核时间、发布视频 ID 和发布时间，用于主系统审核队列与发布状态回写；审核发布生成视频复用既有 `community_videos`、`community_video_sources`、`community_video_categories` 和 `community_video_tags` 表，不为发布链路新增专门表结构。
- 迁移 `internal/migrations/20260627000200_remove_community_demo_content.sql` 保留迁移版本链，但当前旧迁移已不再写入 demo 内容，因此为空操作说明。
- 迁移 `internal/migrations/20260627000300_add_community_submission_media_asset.sql` 为投稿元数据补充 `media_asset_id`，用于记录审核发布时关联的 `system_media_assets` 资产；社区 service 只读取最小媒体资产投影，不复制 system media 上传逻辑。
- 迁移 `internal/migrations/20260627000400_create_community_accounts.sql` 创建 `community_accounts`、`community_sessions`，补充举报审核字段，并迁移仅属于 `community-*` 组织的历史错误 IAM 社区用户；迁移会撤销这些账号的控制台会话、禁用 IAM 用户并软删除对应 `community-*` 组织关系，保留真正的后台管理员、运营和审核员控制台身份。
- 迁移 `internal/migrations/20260628000100_create_community_video_jobs.sql` 创建 `community_video_jobs` 和 `community_video_renditions`，承载转码任务、播放源发布和清晰度记录。
- 迁移 `internal/migrations/20260628000200_extend_community_video_jobs_worker.sql` 为视频任务补充 `attempt`、`max_attempts`、`locked_by`、`locked_at`、`heartbeat_at`、`next_run_at`、`request_payload`、`provider_job_id`、`callback_received_at`、`failure_code` 和 `cancel_requested_at`，用于数据库 lease、失败重试、云 provider 回调和后台任务详情展示。
- 应用装配位于 `internal/app/initapp`，setup 状态由 `internal/app/initcenter` 适配为社区 `SetupStatus`，首页公告由公告模块已发布列表适配为社区 `Announcement`，HTTP contract 位于 `internal/transport/http/contracts.go`，真实路由注册位于 `internal/transport/http/router.go`。
- 系统模块内置字典 code `community.video.category`，不内置具体分类 item；字典 item 由后台维护，`value` 为 slug、`label` 为展示名、`sort` 为排序，`extra` JSON 支持 `parentSlug`、`description`、`accentColor`。视频摘要装饰只消费持久化的视频分类关联、系统字典 active item 和真实创作者记录；缺失创作者或指向不存在分类的关联会暴露为后端数据一致性错误，不返回 `Unknown` 上传者或按标题猜测分类。
- OpenAPI 由 route contract 生成到 `docs/api/openapi.yaml`，不得手写维护。

## 前后端协作

- 后端新增或修改社区 API 时，先更新 route contract、稳定 DTO、handler/service/repository，再生成 OpenAPI。
- 前端只通过 `frontend/app/composables/useAoiApi.ts`、`frontend/app/composables/useAoiAuthApi.ts` 和 `frontend/shared/types/api.ts` 消费社区契约。
- Mock API 位于 `frontend/server/api/mock`，mock fixture 位于 `frontend/shared/mocks`，只用于演示和调试；真实联调以 `GET /status` 的 `mode=go`、setup 状态、端点清单、系统字典分类和实际接口响应为准，真实 API 模式不得回退展示 mock/demo fixture。

## 验证

```powershell
go test ./internal/modules/community/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
powershell -ExecutionPolicy Bypass -File backend/scripts/visual-qa.ps1 -Grep "admin community routes render backend community management"
```

聚合仓库根目录还提供社区前后端联调烟测：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1
node scripts/frontend-community-page-smoke.cjs
```

`check-frontend-community-api-smoke.ps1` 和 `frontend-community-page-smoke.cjs` 使用账号源文件上传、审核通过、创建视频任务和签名回调发布来覆盖无本机 FFmpeg / FFprobe 环境下的核心闭环；需要验证本地真实转码时，保持 `community.video.worker.enabled=true` 并确保 `ffmpeg` / `ffprobe` 可执行文件在 PATH 或配置路径中。
