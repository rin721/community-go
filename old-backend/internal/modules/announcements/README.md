# Announcements 模块

`internal/modules/announcements` 是一个端到端业务示例模块，用于验证业务能力可以通过模块化方式扩展。它同时覆盖后台管理和公开只读产品线入口。

## 职责

- 提供公告列表、详情、创建、编辑、发布、归档和删除能力。
- 演示业务模块如何接入应用装配、HTTP route contract、权限同步、OpenAPI、前端 API client、后台页面和公开页面。
- 公开接口只返回已发布公告，草稿与归档内容在 service 层按不存在处理。
- 保持业务模型、请求 DTO、仓储接口和错误定义在模块内部，不污染根 `types`。

## 分层

| 目录 | 职责 |
| --- | --- |
| `model` | 公告领域模型、分页结果、状态常量和过滤条件 |
| `service` | 公告用例、状态流转、输入校验和本模块最小 repository contract |
| `repository` | 使用数据库端口实现公告持久化，隔离 SQL/ORM 查询细节 |
| `handler` | HTTP 输入输出适配，统一返回 `types/result` 响应 |

## 权限

| 能力 | 权限 |
| --- | --- |
| 查看公告 | `announcement:read` |
| 创建公告 | `announcement:create` |
| 编辑、发布、归档公告 | `announcement:update` |
| 删除公告 | `announcement:delete` |

权限由 `internal/transport/http/contracts.go` 声明，并通过 System API catalog 和权限同步写入 IAM 权限字典。
公开读取接口位于 `GET /api/v1/public/announcements` 和 `GET /api/v1/public/announcements/:announcementId`，不需要 IAM 权限，但只能返回 `PublicAnnouncement` 视图。

## 扩展规则

- 新增字段先改 `model.Announcement`、迁移、service 输入、handler 请求 DTO、OpenAPI 和前端类型。
- 新增状态必须同步 `normalizeAnnouncementStatus`、前端 i18n、筛选项和测试。
- 新增公开字段必须先进入模块内公开 DTO，不要直接把后台完整模型暴露给公开页面。
- repository 必须返回错误给 service，不得吞掉数据库或缺表错误。
- service 必须把仓储不可用、状态流转失败和输入错误返回给 handler，由 handler 统一映射 API 响应。
- handler 不写业务规则；状态流转和必填校验留在 service。

## 验证命令

```powershell
go test ./internal/modules/announcements/... -count=1 -mod=readonly
go test ./internal/transport/http -count=1 -mod=readonly
go run ./cmd/console api openapi --output docs/api/openapi.yaml
pnpm --dir web/app exec playwright test tests/e2e/smoke.spec.ts -g "public announcements route" --project=desktop --project=mobile
```
