# Announcements 模块

`announcements` 是当前仓库内置的最小端到端业务模块，用来证明业务能力可以通过显式模块化方式扩展。当前模块同时提供后台发布工作流和公开只读产品线入口，用于验证“主平台后台发布 + 独立公开前台读取”的最小闭环。

## 模块职责

- 管理公告列表、详情、创建、编辑、发布、归档和删除。
- 演示业务模块如何接入应用装配、HTTP route contract、System API catalog、权限同步、OpenAPI、React API client、后台页面、公开页面和 i18n。
- 通过 `/announcements` 公开页面只展示已发布公告，草稿和归档内容由 service 层按不存在处理。
- 为未来业务模块提供可复制的分层、测试和文档样板。

## 后端结构

| 目录 | 职责 |
| --- | --- |
| `internal/modules/announcements/model` | 公告模型、分页结果、筛选条件和状态常量 |
| `internal/modules/announcements/service` | 输入校验、状态流转、用例编排和最小仓储接口 |
| `internal/modules/announcements/repository` | 数据库持久化实现，隔离 ORM 和缺表错误映射 |
| `internal/modules/announcements/handler` | HTTP 请求绑定、service 调用和统一结果返回 |

迁移文件位于 `internal/migrations/20260622000100_create_announcements.sql`。

## HTTP 与权限

| 能力 | 路径 | 权限 |
| --- | --- | --- |
| 公开列表 | `GET /api/v1/public/announcements` | 公开，只返回已发布公告 |
| 公开详情 | `GET /api/v1/public/announcements/:announcementId` | 公开，只返回已发布公告 |
| 列表 | `GET /api/v1/announcements` | `announcement:read` |
| 创建 | `POST /api/v1/announcements` | `announcement:create` |
| 详情 | `GET /api/v1/announcements/:announcementId` | `announcement:read` |
| 更新 | `PATCH /api/v1/announcements/:announcementId` | `announcement:update` |
| 发布 | `POST /api/v1/announcements/:announcementId/publish` | `announcement:update` |
| 归档 | `POST /api/v1/announcements/:announcementId/archive` | `announcement:update` |
| 删除 | `DELETE /api/v1/announcements/:announcementId` | `announcement:delete` |

这些 contract 由 `internal/transport/http/contracts.go` 维护，并生成 `docs/api/openapi.yaml`。

## 前端入口

- API endpoint：`web/app/app/lib/api/endpoints.ts`
- API client：`web/app/app/lib/api/announcements.ts`
- 类型：`web/app/app/lib/api/types.ts`
- Query key：`web/app/app/lib/api/query-keys.ts`
- 后台页面：`web/app/app/routes/admin/announcements.tsx`
- 公开页面：`web/app/app/routes/public/announcements.tsx`、`web/app/app/routes/public/announcement-detail.tsx`
- 导航：`web/app/app/features/admin/navigation.ts`
- i18n：`web/app/app/i18n/locales/zh-CN.json`、`web/app/app/i18n/locales/en-US.json`

后台页面提供筛选、分页、创建、编辑、发布、归档、删除、加载、错误、无权限和存储不可用状态。公开页面提供已发布公告搜索、分页、详情、加载、错误、空状态和存储不可用状态。

React 页面必须使用 `/api/v1/me/session` 返回的 `permissions` 快照做体验层控制：创建需要 `announcement:create`，编辑、发布和归档需要 `announcement:update`，删除需要 `announcement:delete`。这些前端禁用态只用于减少误操作；后端 route contract、middleware、handler 和 service 仍是生产权限边界。

## 扩展注意

- 新字段必须同步模型、迁移、service 输入、handler DTO、OpenAPI、前端类型、表单和测试。
- 新状态必须同步后端 `normalizeAnnouncementStatus`、前端状态标签、筛选项、i18n 和 e2e。
- 公开页面只能读取 `PublicAnnouncement` / `PublicAnnouncementPage`，不得直接复用后台完整 `Announcement` 视图暴露草稿、归档或后台状态字段。
- repository 不得吞掉数据库错误；缺表等存储不可用状态应向 service 返回，由上层决定降级展示或失败。
- handler 不写业务规则，所有状态流转和必填校验留在 service。

## 验证命令

```powershell
go test ./internal/modules/announcements/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
pnpm --dir web/app exec playwright test tests/e2e/smoke.spec.ts -g "admin announcements route" --project=desktop
pnpm --dir web/app exec playwright test tests/e2e/smoke.spec.ts -g "public announcements route" --project=desktop --project=mobile
```
