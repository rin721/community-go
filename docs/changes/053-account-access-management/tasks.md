# 053 账号、组织与权限体系业务模块任务

## 确认状态

研究门禁已通过；用户确认取消未发布历史的兼容迁移并要求明确根目标语境，计划已据此修订并重新待确认。本轮确认只授权纯文档修订，不授权源码、配置、依赖、migration、生成、启动或数据库状态变更。实施必须等待用户在本计划报告后的后续消息中明确确认「053 当前方案」。

| ID | 工作量 | 依赖 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `ACCOUNT-053-001` | XL | 用户确认 | 冻结 User/Account、Role/Permission、Department、Position、MenuPolicy Model 与不变量 | model tests 覆盖 identity/status/RBAC/tree/reference/menu/owner/must-change；无 Auth/WebUI/第三方 import | 待确认 |
| `ACCOUNT-053-002` | XL | 001 | 建立多 set catalog 与 Todo 干净首发 baseline | Todo/Account 独立 version table、稳定顺序、聚合 status/up/completion；Todo 000001 最终 schema；退休 baseline 写入前拒绝；三驱动 tests | 待确认 |
| `ACCOUNT-053-003` | XXL | 001,002 | 建立 Account 三驱动首发 schema 与 Repository | 用户/凭据/Session/RBAC/部门/岗位/菜单策略 schema；SQLite fresh/repeat；Postgres/MySQL SQL/checksum tests；无旧账号读取/迁移/删除逻辑 | 待确认 |
| `ACCOUNT-053-004` | XL | 001,003 | 实现账号、凭据与 Session Service | last owner、lockout、must-change、reset/change、Session revoke、取消/错误链测试通过 | 待确认 |
| `ACCOUNT-053-005` | XL | 001,003 | 实现 Department、Position 与用户组织关系 Service | 树环/深度、移动、引用归档、岗位 assignment、分页/树查询和事务测试通过 | 待确认 |
| `ACCOUNT-053-006` | XL | 001,003,004 | 实现 Role/Permission 与 MenuPolicy Service | permission catalog、role replace/revoke、导航 policy 引用/无环、静态与动态 revision 分离、last owner 测试通过 | 待确认 |
| `ACCOUNT-053-007` | L | 001 | 泛化 HTTP Contract security 与多模块 dispatcher | none/bearer/webuiSession、per-operation principal、多 module/handler 一一对应、OpenAPI tests 通过 | 待确认 |
| `ACCOUNT-053-008` | XXL | 004,005,006,007 | 实现 Account typed HTTP Contract/Handler 与稳定错误 | 用户/角色/权限/菜单/部门/岗位全部 operation、Origin/CSRF、分页/filter、401/403/409 通过 | 待确认 |
| `ACCOUNT-053-009` | XL | 004,006,007 | 收敛 Auth、配置、CLI 与 Account/Auth/WebUI composition Adapter | 模块零互相 import；JWT/Todo/management 不回归；实时权限与 menu policy projection；旧 local owner 无残留 | 待确认 |
| `ACCOUNT-053-010` | XXL | 008,009 | 建立 Account WebUI Binding 与完整管理页面 | setup/login/security/users/roles-permissions/menus/departments/positions 模块自有；Manifest 双 revision、生成/i18n/style/unit tests 通过 | 待确认 |
| `ACCOUNT-053-011` | L | 002..010 | 增加架构、生成与安全反向门禁 | 拒绝跨模块 import、未知 permission/menu、任意 component、前端越权 import、旧符号和 stale generation | 待确认 |
| `ACCOUNT-053-012` | M | 002..011 | 同步当前 authority 与文档影响记录 | Account/Auth/API/config/migration/security/first-use/module/WebUI menu docs 与真实实现一致 | 待确认 |
| `ACCOUNT-053-013` | XXL | 002..012 | 完成全量、E2E、视觉与三驱动验证并提交 | 验收矩阵逐项有证据；未执行项明确；单一 scoped Conventional Commit | 待确认 |

## 依赖顺序

```text
001
 ├─> 002 ─> 003 ─┬─> 004 ─┐
 │               ├─> 005 ─┼─> 008 ─> 010
 │               └─> 006 ─┘     ^
 └─> 007 ──────────────────┬─> 009
                           └─> 008
008..010 ─> 011 ─> 012 ─> 013
```

## Checkpoint

### Checkpoint A：契约与迁移基础（001–003）

- 冻结 Core RBAC、不变量、permission key 和 schema；
- Todo/Account 多 set 以新首发 checksum 通过 fresh/repeat/dirty 和退休 baseline 拒绝；不提供 Todo4 upgrade；
- 默认 `.data/app.db` 不进入自动化写入范围；若三驱动并发语义无法由当前 Database 契约表达，退回研究，不直接使用 GORM/raw SQL 绕过。

### Checkpoint B：后端闭环（004–009）

- Account identity、组织、RBAC、菜单策略 Service、HTTP Contract、Auth Adapter、配置和 CLI 单轨完成；
- JWT/Todo/management 与 WebUI Session security matrix 通过；
- 删除旧本地账号实现、配置和运行入口，不保留 fallback。

### Checkpoint C：WebUI 与门禁（010–011）

- Account 用户、角色权限、菜单、部门和岗位页面只依赖现有 WebUI SDK；
- E2E 证明菜单 access 与服务端 403 一致；
- 除已计划的 NavigationPolicy/`NavigationRevision` 外，若还必须扩展 SDK public contract，先补独立研究并重新确认。

### Checkpoint D：authority 与交付（012–013）

- 当前文档只描述真实实现；历史变更保留证据边界；
- 完整 diff、生成 clean、Go/WebUI/docs/security/E2E/视觉门禁完成；
- 只暂存并提交 053 相关文件，报告 commit 与未验证环境。

## 重新确认触发器

- 账号模型加入 email/phone、开放注册、邀请或找回密码；
- 加入 OIDC/LDAP/SSO/MFA/Passkey；
- 加入多租户、角色继承、deny、职责分离、ABAC/ReBAC 或用户直授权；
- 加入部门数据范围、组织多租户、汇报线、岗位层级或 HR 工作流；
- 允许数据库创建任意 page/component/external link/remote module；
- 引入 Casbin/OpenFGA/OPA、新外部服务或新 runtime cache/synchronization；
- 需要超出已计划 NavigationPolicy/`NavigationRevision` 新增或破坏性修改 WebUI SDK public interface；
- 要求自动升级或保留退休 `schema_migrations/webui_*` 数据，或要求 Agent 备份、删除、覆盖默认 `.data/app.db`；
- API path、permission key、模块边界或 migration dependency 与当前设计实质不同。

## 当前阻塞与未执行项

- 用户尚未确认修订后的 053 当前计划；
- 未修改任何非文档文件；
- 未运行 Go/WebUI 构建与测试，因为本轮只有计划文档；
- 未运行 migration、生成器、服务、浏览器、数据库或外部系统操作；
- 本轮纯文档修订按门禁例外独立提交；该提交不构成非文档实施确认。
