# Community 模块

`internal/modules/community` 为 `frontend/` Nuxt 视频社区提供公开社区数据接口。当前阶段覆盖社区账号注册入口、首页、分类、视频列表、视频详情、弹幕读取与轻量发布、视频评论读取与轻量发布、视频级举报提交、投稿元数据待审核池、搜索、创作者资料、匿名创作者关注、视频点赞 / 收藏 / 稍后看、观看历史、社区动态流查询与轻量发布、关注动态和匿名通知收件箱。

## 职责

- 提供 `/api/v1/public/community/*` 公开 API，供 Nuxt 前端在关闭 mock 后直接接入。
- 提供社区账号注册入口，浏览器提交用户名、显示名、邮箱和密码，响应只暴露社区会话需要的最小字段。
- 维护社区分类、创作者、视频、视频源、标签、弹幕、公开评论、社区动态、匿名关注关系、匿名视频互动关系、匿名观看历史和匿名通知收件箱的持久化模型。
- 支持视频弹幕列表读取和轻量公开发布。
- 支持视频评论列表按 `sort=newest/oldest` 读取和轻量公开发布，并同步视频 `comment_count`。
- 支持视频级轻量举报提交，保存匿名 `clientId`、原因、补充说明和待处理状态。
- 支持投稿元数据提交和查询，保存匿名 `clientId`、作者名、标题、简介、分类、标签、可见性和文件元数据，不保存文件字节。
- 支持以匿名 `clientId` 关注 / 取消关注创作者，并同步创作者 `follower_count`。
- 支持以匿名 `clientId` 点赞、收藏、取消互动、查询互动状态和读取收藏 / 稍后看列表。
- 支持以匿名 `clientId` 记录、查询和清空视频观看历史，保存最近观看时间与播放进度。
- 支持以匿名 `clientId` 查询通知、标记已读，并把评论、弹幕、举报、关注和视频互动写入轻量消息流。
- 支持查询公开社区动态时间线，并以匿名 `clientId` 发布轻量动态；动态可绑定视频并装饰创作者与视频摘要。
- 保持 DTO、筛选条件、错误和仓储 contract 在模块内部，不污染根 `types`。

## 非职责

- 真实文件上传、视频转码、投稿审核发布、登录态用户关系归并、评论 / 弹幕审核、评论编辑删除、举报审核处理、外部通知投递、登录态消息中心和创作者后台管理属于独立能力范围。
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

- `GET /status`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`
- `POST /auth/signup`
- `GET /account/submissions`
- `POST /account/submissions`
- `GET /home`
- `GET /categories`
- `GET /videos`
- `GET /videos/:idOrSlug`
- `GET /videos/:idOrSlug/danmaku`
- `POST /videos/:idOrSlug/danmaku`
- `GET /videos/:idOrSlug/comments`
- `POST /videos/:idOrSlug/comments`
- `GET /videos/:idOrSlug/interaction-state`
- `POST /videos/:idOrSlug/interactions/:kind`
- `DELETE /videos/:idOrSlug/interactions/:kind`
- `POST /videos/:idOrSlug/reports`
- `GET /submissions`
- `POST /submissions`
- `GET /notifications`
- `POST /notifications/read`
- `GET /dynamics`
- `POST /dynamics`
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

## 数据

迁移 `20260626000100_create_community_tables.sql` 创建社区读取表，并写入一组与 Nuxt 现有体验相同的初始内容。迁移 `20260626000200_create_community_video_comments.sql` 追加公开评论表、初始评论和 `comment_count` 收敛。迁移 `20260626000300_create_community_creator_follows.sql` 追加匿名创作者关注关系表。迁移 `20260626000400_create_community_video_interactions.sql` 追加匿名视频点赞、收藏和稍后看关系表。迁移 `20260626000500_create_community_reports.sql` 追加社区举报记录表。迁移 `20260626000600_create_community_notifications.sql` 追加匿名通知表。迁移 `20260626000700_create_community_dynamics.sql` 追加社区动态表和初始时间线内容。迁移 `20260626000800_create_community_submissions.sql` 追加投稿元数据待审核池。迁移 `20260626000900_create_community_video_history.sql` 追加匿名观看历史表。后续若增加真实文件上传、视频转码、审核发布、登录态归并、外部通知投递或登录态消息中心，应追加迁移，不修改历史迁移。

## 验证

```powershell
go test ./internal/modules/community/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
```
