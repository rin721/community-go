# Community 模块

`internal/modules/community` 为 `frontend/` Nuxt 视频社区提供公开社区数据接口，并为后台控制台提供社区分类、社区账号、投稿审核、视频处理任务和举报处理管理契约。当前阶段覆盖独立社区账号注册与会话、首页、分类、视频列表、视频详情、弹幕读取与轻量发布、视频评论读取 / 轻量发布 / 本人编辑删除、视频级举报提交与处理、投稿元数据待审核池、主系统审核队列、账号源文件上传、异步转码任务、本地 FFmpeg HLS 发布、通用云 webhook dispatch / callback、发布视频 ID 回写、搜索、创作者资料、创作者关注、视频点赞 / 收藏 / 稍后看、观看历史、社区动态流查询 / 发布 / 本人编辑删除、关注动态和通知收件箱。首页公告来自公告模块的真实已发布公告；没有已发布公告时返回 `announcement=null`；首页不再展示社区动态，动态能力保留给动态页和关注流。

## 职责

- 提供 `/api/v1/public/community/*` 公开 API，供 Nuxt 前端在关闭 mock 后直接接入；`/status` 的 endpoint 清单由真实 route contract 注册结果派生。
- 提供社区账号注册入口，浏览器提交用户名、显示名、邮箱和密码，响应只暴露社区会话和账号展示需要的最小字段；社区认证只读写 `community_accounts`、`community_sessions` 和 `community_*` Cookie，不创建 IAM 用户、`community-*` 组织、`owner` 角色或 `console_*` 控制台会话。
- 通过系统字典 `community.video.category` 读取社区视频分类；字典 item 的 `value` 为分类 slug、`label` 为展示名、`sort` 为排序，`extra` JSON 可保存 `parentSlug`、`description`、`accentColor` 等展示元数据。
- 维护社区创作者、视频、视频分类关联、视频源、标签、弹幕、公开评论、社区动态、关注关系、视频互动关系、观看历史和通知收件箱的持久化模型。
- 支持视频弹幕列表读取和轻量公开发布。
- 支持视频评论列表按 `sort=newest/oldest` 读取、轻量公开发布和本人编辑 / 删除；评论归属来自匿名或账号 `clientId`，列表可返回 `ownedByCurrentClient`，删除后同步视频 `comment_count`。
- 支持视频级轻量举报提交，保存匿名 `clientId`、原因、补充说明和待处理状态。
- 支持投稿元数据提交和查询，保存社区账号或匿名 `clientId`、作者名、标题、简介、分类、标签、可见性和文件元数据，不保存文件字节；投稿列表会批量装饰最新视频任务摘要 `latestVideoJob`，只暴露 `id/status/progress/videoId/failureCode/errorMessage/outputPublicUrl/startedAt/finishedAt/createdAt/updatedAt` 给前台状态时间线。
- 支持主系统权限保护的投稿审核队列和审核状态流转：`community_submission:review` 可读取全部投稿、写入 `approved` / `rejected` / `published` 状态、审核备注、审核时间、受控 `mediaAssetId` 和发布视频 ID；常规主流程在 `approved` 后由 `community_video:transcode` 创建异步转码发布任务，`published` 绑定既有视频 ID 或过渡直发路径仅作为兼容能力保留。
- 支持异步视频处理任务：`community_video:transcode` 创建 queued 任务并立即返回；应用生命周期 worker 从数据库 claim queued job，本地模式复用 FFmpeg / FFprobe 生成 HLS master 与 renditions，云模式向 `community.video.cloud.dispatchUrl` 发送 HMAC 签名 dispatch，并由公开签名回调发布视频。
- 后台控制台提供 `/admin/community` 社区总览入口，复用账号、投稿、举报、视频任务和系统字典 API 展示待审核投稿、处理中 / 失败任务、待处理举报、账号与分类状态；系统菜单缺失时 WebUI 会按当前 `/admin/community/*` 路由补回社区导航上下文。
- 支持主系统权限保护的社区账号管理：`community_account:read` 读取社区账号列表，`community_account:update` 管理社区角色 `registered/creator` 和状态 `active/disabled`，不授予控制台 IAM 角色。
- 支持主系统权限保护的举报处理：`community_report:review` 读取举报队列，并将举报保存为 `resolved` 或 `rejected`。
- 支持社区账号或匿名 `clientId` 关注 / 取消关注创作者，并同步创作者 `follower_count`。
- 支持社区账号或匿名 `clientId` 点赞、收藏、取消互动、查询互动状态和读取收藏 / 稍后看列表。
- 支持社区账号或匿名 `clientId` 记录、查询和清空视频观看历史，保存最近观看时间与播放进度。
- 支持社区账号或匿名 `clientId` 查询通知、标记已读，并把评论、弹幕、举报、关注和视频互动写入轻量消息流。
- 支持查询公开社区动态时间线，并以社区账号或匿名 `clientId` 发布、本人编辑和本人删除轻量动态；动态可绑定视频并装饰创作者与视频摘要，前端只消费 `ownedByCurrentClient` 判断操作入口。
- 保持 DTO、筛选条件、错误和仓储 contract 在模块内部，不污染根 `types`。

社区账号会话面向普通观看与创作者流程，响应字段为 `userId`、`sessionId`、过期时间和 `account.id / account.handle / account.displayName`，前台页面只基于这些社区字段展示账号状态。账号动态和账号投稿使用 `account.displayName` 作为作者展示名，数据范围仍由登录态派生的账号 `clientId` 控制。普通注册用户和内容创作者不进入 `/admin`；版主、审核员、运营、管理员和超级管理员仍通过 IAM 控制台身份进入后台。

## 非职责

- 评论 / 弹幕审核、创作者中心、活动运营、批量评论治理、登录态与匿名关系归并和外部通知投递属于独立能力范围；当前普通投稿创建仍只保存投稿元数据，真实源文件字节通过社区账号上传入口进入受控媒体资产，再由后台审核和异步视频任务发布。
- 生产交付面聚焦 `/api/v1/public/community/*` 与模块化扩展链路。
- Nuxt 页面展示的生产写入能力以当前社区公开 API 为准；评论写入失败必须显式反馈，弹幕写入失败只能降级到浏览器缓存，浏览器本地状态只保存显示名称、匿名 clientId、观看历史和必要降级缓存。

## 分层

| 目录 | 职责 |
| --- | --- |
| `model` | 社区公开 DTO、持久化模型、分页结果和稳定状态值 |
| `service` | 公开社区用例、分类树构造、评论校验、搜索聚合和错误归一 |
| `repository` | 使用数据库端口读取社区表，隔离 SQL/ORM 细节 |
| `handler` | HTTP 输入输出适配，统一返回 `types/result` 响应 |

## API

公开接口统一位于 `/api/v1/public/community`：

`GET /status` 始终可读，响应包含 `setup.required`、`setup.completed`、`setup.currentStep` 和由真实路由契约注册结果派生的 endpoint 清单。社区公开内容、账号接口和社区认证接口在平台初始化未完成时返回 503 result envelope，`messageKey` 为 `api.setup.required`，前端据此显示初始化状态并保留真实数据入口。

- `GET /status`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`
- `POST /auth/signup`
- `POST /account/dynamics`
- `PATCH /account/dynamics/:dynamicId`
- `DELETE /account/dynamics/:dynamicId`
- `GET /account/feed/following`
- `GET /account/history`
- `POST /account/history/clear`
- `GET /account/library`
- `GET /account/notifications`
- `POST /account/notifications/read`
- `GET /account/submissions`
- `POST /account/submissions`
- `POST /account/submissions/upload`
- `GET /account/users/:handle/follow-state`
- `POST /account/users/:handle/follow`
- `DELETE /account/users/:handle/follow`
- `GET /account/videos/:idOrSlug/interaction-state`
- `POST /account/videos/:idOrSlug/interactions/:kind`
- `DELETE /account/videos/:idOrSlug/interactions/:kind`
- `POST /account/videos/:idOrSlug/history`
- `GET /home`
- `GET /categories`
- `GET /videos`
- `GET /videos/:idOrSlug`
- `GET /videos/:idOrSlug/danmaku`
- `POST /videos/:idOrSlug/danmaku`
- `GET /videos/:idOrSlug/comments`
- `POST /videos/:idOrSlug/comments`
- `PATCH /videos/:idOrSlug/comments/:commentId`
- `DELETE /videos/:idOrSlug/comments/:commentId`
- `PATCH /account/videos/:idOrSlug/comments/:commentId`
- `DELETE /account/videos/:idOrSlug/comments/:commentId`
- `GET /videos/:idOrSlug/interaction-state`
- `POST /videos/:idOrSlug/interactions/:kind`
- `DELETE /videos/:idOrSlug/interactions/:kind`
- `POST /videos/:idOrSlug/reports`
- `GET /submissions`
- `POST /submissions`
- `GET /api/v1/community/submissions`（主系统权限 `community_submission:review`）
- `PATCH /api/v1/community/submissions/:submissionId/review`（主系统权限 `community_submission:review`）
- `GET /api/v1/community/accounts`（主系统权限 `community_account:read`）
- `PATCH /api/v1/community/accounts/:accountId`（主系统权限 `community_account:update`）
- `GET /api/v1/community/reports`（主系统权限 `community_report:review`）
- `PATCH /api/v1/community/reports/:reportId`（主系统权限 `community_report:review`）
- `GET /notifications`
- `POST /notifications/read`
- `GET /dynamics`
- `POST /dynamics`
- `PATCH /dynamics/:dynamicId`
- `DELETE /dynamics/:dynamicId`
- `GET /search`
- `GET /users/:handle`
- `GET /users/:handle/follow-state`
- `POST /users/:handle/follow`
- `DELETE /users/:handle/follow`
- `GET /feed/following`
- `GET /library`
- `GET /history`
- `POST /history/clear`
- `POST /videos/:idOrSlug/history`
- `POST /api/v1/community/submissions/:submissionId/transcode`（主系统权限 `community_video:transcode`）
- `GET /api/v1/community/video-jobs`（主系统权限 `community_video:read`）
- `GET /api/v1/community/video-jobs/:jobId`（主系统权限 `community_video:read`）
- `POST /api/v1/community/video-jobs/:jobId/retry`（主系统权限 `community_video:retry`）
- `POST /api/v1/public/community/video-jobs/:jobId/callback`（云端视频处理 HMAC 回调）

## 数据

社区数据表覆盖社区账号、社区会话、创作者、视频、视频分类关联、视频源、标签、弹幕、公开评论、关注关系、视频互动、举报、通知、动态、投稿元数据和观看历史。视频分类不再由独立 `community_categories` 生产表维护，`GET /categories`、视频列表分类筛选、投稿分类校验和审核发布分类装饰统一读取系统字典 `community.video.category`；字典缺失或没有 active item 时分类接口返回空列表，提交投稿必须显式选择存在的分类。平台初始化完成后，公开接口读取真实社区表和系统字典并返回真实社区内容；平台初始化未完成时，`/status` 只返回接口清单和 setup 状态，内容接口保持统一的初始化响应。旧社区迁移不再写入 demo 分类、创作者、视频、动态、评论、弹幕、播放源、标签或相关派生记录，后续 demo 清理迁移保留版本链但为空操作说明；Nuxt mock 继续只在 `NUXT_PUBLIC_API_MOCK=true` 的边界内保留演示内容。`scripts/check-frontend-community-boundary.ps1` 同时扫描后端社区生产 Go / SQL 路径，阻止恢复 `community_categories` 生产分类表、社区 demo seed、生产分类默认值或 mock / fixture / demo 业务分支；后端 `_test.go` 中的中性 fixture 只服务单元测试，不代表生产分类。社区账号与匿名客户端通过 `client_id` 统一区分数据范围；视频评论和社区动态的 `client_id` 用于本人编辑 / 删除。投稿元数据额外保存 `review_note`、`reviewer_id`、`reviewed_at`、`media_asset_id`、`published_video_id` 和 `published_at`，用于主系统审核队列、system media 资产关联和发布状态回写；审核发布生成视频时会写入 `community_videos`、`community_video_sources`、`community_video_categories`、`community_video_tags` 和基于投稿作者名生成的社区创作者资料，不写入演示型 bio 或默认展示名。`20260627000400_create_community_accounts.sql` 还会迁移仅属于 `community-*` 组织的历史错误 IAM 社区用户，撤销其控制台会话并移出 IAM 控制台身份。

视频处理任务由 `community_video_jobs` 和 `community_video_renditions` 承载。`20260628000100_create_community_video_jobs.sql` 创建基础任务与清晰度表，`20260628000200_extend_community_video_jobs_worker.sql` 追加 `attempt`、`max_attempts`、`locked_by`、`locked_at`、`heartbeat_at`、`next_run_at`、`request_payload`、`provider_job_id`、`callback_received_at`、`failure_code` 和 `cancel_requested_at`，用于数据库 lease、失败重试、云 provider 回调和后台任务详情展示。成功任务会发布 HLS source、原始 source 和 renditions；失败任务保留真实错误信息与 failure code，供后台重试。后台视频任务页支持 `?jobId=` 深链打开详情抽屉，优先展示状态、进度、attempt、时间线、HLS master、renditions 和失败信息，worker 锁、provider job 和 request payload 折叠在内部字段中。

## 验证

```powershell
go test ./internal/modules/community/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
```

聚合仓库根目录还提供社区前后端联调烟测：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-frontend-community-api-smoke.ps1
```
