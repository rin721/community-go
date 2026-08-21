# 054 IAM 身份与访问管理任务

## 确认状态

研究门禁已通过，实施依赖 053 完成；`IAM-054-001..009` 全部待确认。

| ID | 工作量 | 依赖 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `IAM-054-001` | XL | 053、用户确认 | 冻结 IAM model、permission 和事务不变量 | model/package tests 覆盖 identity/RBAC/owner/revision；无 Organization/Navigation/Auth import | 待确认 |
| `IAM-054-002` | XXL | 001 | 建立 IAM 三驱动 schema 与 Repository | fresh/repeat、unique/FK/replace/rollback/optimistic/checksum 通过 | 待确认 |
| `IAM-054-003` | XXL | 002 | 实现 Account/Credential/Session Service | setup/login/lockout/must-change/change/reset/disable/revision 测试通过 | 待确认 |
| `IAM-054-004` | XL | 002,003 | 实现 Role/Permission/owner Service | Catalog compatibility、role/permission replace、last owner 并发测试通过 | 待确认 |
| `IAM-054-005` | XL | 003,004 | 实现 typed HTTP 与稳定错误 | 全部 IAM operation、security、Origin/CSRF、分页和 401/403/409 通过 | 待确认 |
| `IAM-054-006` | XL | 003..005 | 单轨迁移 Auth、配置、CLI 与 composition | IAM resolver 接管；旧 webuiauth/auth.local/password/WebUI/CLI 无残留；JWT/Todo/management 回归 | 待确认 |
| `IAM-054-007` | XXL | 005,006 | 实现 IAM WebUI | Setup/Login/Security/Accounts/Roles/Permissions 生成、测试与视觉验收通过 | 待确认 |
| `IAM-054-008` | M | 002..007 | 同步 authority 与反向门禁 | IAM/Auth/security/config/API/module/first-use 文档一致，跨边界和旧符号门禁通过 | 待确认 |
| `IAM-054-009` | XL | 002..008 | 全量验证并提交 | Go/WebUI/E2E/视觉/三驱动证据完整，只提交 054 范围 | 待确认 |

## 重新确认触发器

- 053 未按当前契约完成；
- 加入外部 IAM、MFA、多租户、角色继承、deny、账号直授权或数据范围；
- IAM 开始拥有 Department/Position/MenuPolicy；
- 需要保留 Auth local 双轨或自动迁移退休本地账号；
- 默认 `.data/app.db` 需要任何写入或破坏性操作。
