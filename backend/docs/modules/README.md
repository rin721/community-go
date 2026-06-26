# modules 目录说明

`modules` 记录当前业务模块、权限矩阵和后台能力闭环。这里面向二次开发者理解模块职责和扩展边界。

## 当前文档

| 文档 | 职责 |
| --- | --- |
| `iam.md` | 账号、组织、用户、角色、权限、会话、API Token、MFA、通知 outbox 和审计相关说明。 |
| `system.md` | 菜单、系统配置、API catalog、操作记录、媒体、版本、参数、字典、探针和维护任务说明。 |
| `announcements.md` | 公告模块端到端示例，覆盖后台管理和公开只读入口。 |
| `community.md` | 视频社区公开模块，覆盖 Nuxt 前端首页、分类、视频、弹幕、评论、互动、动态、通知和创作者资料数据。 |
| `permission-matrix.md` | 后台页面、API contract 和权限点的对应关系。 |

## 维护规则

- 模块文档必须对应 `internal/modules/*`、HTTP contract、前端页面和权限矩阵的真实行为。
- 新增模块时同步模块 README、`docs/extension`、权限矩阵、OpenAPI、前端 i18n 和测试。
- 模块文档只描述 `internal/modules`、应用装配、route contract、前端 API client、页面、i18n、测试和文档同步链路。

## 常用验证

```powershell
go test ./internal/transport/http -count=1 -mod=readonly
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
```
