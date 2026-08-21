# 053 账号、组织与权限体系业务模块需求

## 1. 产品目标

把当前“单个本地 WebUI 用户 + 逗号分隔 scopes”演进为可运营的本地账号、组织目录与 Core RBAC 模块，使 owner 能管理用户、角色、菜单策略、权限、部门和岗位，普通账号只能访问角色明确授予的 operation；认证、授权、Session 和 WebUI 始终由服务端 fail closed。

## 2. 范围

### 2.1 账号与凭据

| ID | 要求 |
| --- | --- |
| `ACC-REQ-001` | `account` 必须拥有账号、Local Credential、Session、角色和关系数据；`auth` 不再拥有本地用户/密码/Session。 |
| `ACC-REQ-002` | 账号即当前本地 User 主体，必须有稳定 ID、规范化 username、display name、可空主 Department、`active/disabled` 状态、`mustChangePassword`、乐观版本和时间戳；username 在三驱动中保持一致的大小写唯一语义。 |
| `ACC-REQ-003` | username 首版限定为 3..64 个 ASCII 小写字母、数字、`.`、`_`、`-`，首字符必须是字母或数字；不把任意 Unicode case folding 交给不同数据库猜测。 |
| `ACC-REQ-004` | 密码继续使用模块内 Argon2id Adapter，长度 15..128 rune；密码 hash、原始密码、setup token、Cookie、CSRF 和完整凭据不得进入 DTO、日志或诊断。 |
| `ACC-REQ-005` | owner 创建账号时设置一次性初始密码，新账号必须 `mustChangePassword=true`；该状态只允许访问当前账号、改密和退出，改密成功撤销全部 Session 并要求重新登录。 |
| `ACC-REQ-006` | 禁用账号必须与撤销其全部 Session 同事务完成；disabled 账号登录对外仍返回统一 `invalid_credentials`，不能枚举账号状态。 |
| `ACC-REQ-007` | 管理员 reset password 必须设置 `mustChangePassword=true`、清除失败锁定并撤销全部 Session；当前账号 change password 必须验证旧密码。 |
| `ACC-REQ-008` | lockout 次数、锁定时长、Session touch/idle/absolute timeout 进入 Account typed Config；配置缺失或非法不得隐藏回退。 |

### 2.2 Core RBAC

| ID | 要求 |
| --- | --- |
| `ACC-REQ-009` | 授权只允许 `Account -> Role -> PermissionKey`；首版禁止账号直授权、角色继承、通配符、显式 deny 和任意 matcher。 |
| `ACC-REQ-010` | Permission Catalog 必须由当前应用已注册 operation policy 构建，去重、排序、不可变；管理 API 只读，拒绝未知或未注册 permission key。 |
| `ACC-REQ-011` | role 必须有稳定 ID、唯一 code、中文可读 name、可选 description、`active/archived` 状态、system 标记、乐观版本和时间戳。 |
| `ACC-REQ-012` | `owner` 是系统角色，始终拥有 Catalog 全部权限；禁止归档、删除、改 code 或替换权限。任何 mutation 不得导致 active owner 数量变成 0。 |
| `ACC-REQ-013` | 账号角色替换、角色权限替换或角色归档必须在同一事务内更新关系并撤销所有受影响账号的 Session；任一步失败整体回滚。 |
| `ACC-REQ-014` | Permission Catalog 与数据库关系不兼容、出现未知 permission 或 owner 权限缺失时，Application Generation 必须在 listener 前失败。 |
| `ACC-REQ-015` | Auth operation/action policy 仍是最终 decision authority；Account 的 `PermissionKey` 只经 composition Adapter 映射为 Auth `Scope`，模块之间禁止互相 import。 |

### 2.3 API、WebUI 与可观察行为

| ID | 要求 |
| --- | --- |
| `ACC-REQ-016` | Account 必须提供模块自有 typed HTTP Contract/Handler，覆盖 setup/login/session/logout/change-password、用户分页与创建/状态/角色/部门/岗位/reset-password、角色分页与创建/编辑/权限/归档、菜单策略、权限目录、部门树和岗位目录。 |
| `ACC-REQ-017` | HTTP Contract 必须正式表达 `none`、`bearer` 与 `webuiSession` security；route binding 按 operation 认证并注入 Principal，不再通过 URL 前缀跳过认证。 |
| `ACC-REQ-018` | WebUI Session 的不安全方法必须同时通过 Origin 与 Session-bound CSRF 校验；setup/login 也必须执行 Origin 校验。 |
| `ACC-REQ-019` | Account operation 使用稳定 permission key：`account:self:read`、`account:self:password:write`、`account:user:read`、`account:user:write`、`account:role:read`、`account:role:write`、`account:permission:read`、`account:menu:read`、`account:menu:write`、`account:department:read`、`account:department:write`、`account:position:read`、`account:position:write`。 |
| `ACC-REQ-020` | WebUI 页面由 `account` 模块拥有，至少包含 setup、login、当前账号安全、用户管理、角色与权限、菜单管理、部门管理和岗位管理；宿主只消费通用 Principal/Access，服务端拒绝不能被菜单隐藏替代。 |
| `ACC-REQ-021` | 列表必须使用受控 filter、稳定排序、offset/limit 和 total；最大 page size 为命名业务策略，不能无界加载全部用户、角色、部门或岗位。 |
| `ACC-REQ-022` | 业务错误必须稳定区分 invalid input、not found、conflict、optimistic conflict、last owner、system role protected、unauthenticated 和 permission denied；未知内部错误不泄漏数据库或凭据细节。 |
| `ACC-REQ-023` | 账号创建/状态/reset-password、角色/角色权限/账号角色、部门/岗位/用户组织关系和菜单策略 mutation 必须记录低敏安全事件；只记录 action、actor ID 摘要、target ID 摘要、outcome 和稳定 error type。 |

### 2.4 Migration 与单轨替换

| ID | 要求 |
| --- | --- |
| `ACC-REQ-024` | Migration module 必须支持多个具名 set、唯一 version table、确定执行顺序、逐 set status/up/completion 和聚合 CLI 输出；任一 set dirty/incompatible 时整体不兼容。Todo 与 Account set 独立，不建立历史数据依赖。 |
| `ACC-REQ-025` | 首发前把 Todo 当前 `000001..000004` 收敛为只表达最终 Todo schema 的三驱动 `000001`，version table 改为 `todo_schema_migrations`；Account 使用 `account_schema_migrations`，从三驱动 `000001` 创建全部 Account schema。当前源码不保留 Todo4 自动升级链。 |
| `ACC-REQ-026` | Migration status/up 检测到退休的 `schema_migrations`、`webui_users` 或 `webui_sessions` 时，必须在任何写入前返回稳定 `pre_release_baseline_reset_required`；不得读取或迁移旧 password hash、Session，不得自动删除、覆盖或重建本地数据库。 |
| `ACC-REQ-027` | 首发 baseline 的源码、配置、WebUI Binding、运行 schema、生成物和当前文档不保留 `webuiauth`、逗号 scopes、Auth-owned local account 或旧 migration 双轨；Git 与历史 `docs/changes` 记录保持原样。 |

### 2.5 部门、岗位与菜单策略

| ID | 要求 |
| --- | --- |
| `ACC-REQ-028` | Department 必须有稳定 ID、唯一 code、name、可空 ParentID、`active/archived`、乐观版本和时间戳；父子关系必须无环且最大深度有命名策略。 |
| `ACC-REQ-029` | 有 active child 或 active user 的 Department 不得归档；移动节点必须原子校验自身、目标 parent、环和深度。 |
| `ACC-REQ-030` | Position 必须有稳定 ID、唯一 code、name、`active/archived`、乐观版本和时间戳；首版为全局目录，不建立岗位层级。 |
| `ACC-REQ-031` | User 拥有一个可空主 Department 和多个 Position assignment；Department/Position 变化只改变组织关系和筛选，不隐式授予或撤销权限。 |
| `ACC-REQ-032` | 有 active User assignment 的 Position 不得归档；用户、部门和岗位列表必须支持受控 filter、稳定排序和分页/树查询。 |
| `ACC-REQ-033` | Menu Definition 的 ID、RouteID、Entry/path、TitleMessageID、IconID 和 ViewOperationID 继续由模块 WebUI Binding/Catalog 拥有；数据库不得创建页面、component path、任意 route 或 remote entry。 |
| `ACC-REQ-034` | Menu Policy 只允许覆盖当前 Catalog 中 NavigationID 的 enabled、ParentID 和 order；引用未知/未交付/未启用 route、形成环或超过深度必须拒绝。 |
| `ACC-REQ-035` | Menu disabled 只影响导航显示，不是授权；已知 URL 仍按 route view operation 和服务端 operation gate 决定 access。 |
| `ACC-REQ-036` | 角色权限管理页面可以把菜单、页面 view operation 和非页面 action permission 投影为一棵管理树，但数据库只保存 Role-Permission，不增加第二套 role-menu 授权关系。 |
| `ACC-REQ-037` | Manifest 必须分别表达静态 Catalog `Revision` 与动态 `NavigationRevision`；前者继续校验生成 registry，后者标识 Menu Policy 快照。Catalog 变化后的未知 Menu Policy 或 permission assignment 必须在 Generation 候选阶段 fail closed，不能静默忽略。 |

## 3. 非功能要求

- 所有数据库 mutation 使用受控 Repository/Transaction，错误保留链；不得把 GORM 类型泄漏到 Account Model/Service。
- 关系替换、最后 owner 检查和 Session 撤销必须在同一事务中执行，并有并发/乐观冲突测试。
- Account 不创建 goroutine、不关闭共享 Database、不缓存跨请求可变权限集合。
- 认证、授权和管理端点必须有成功、失败、取消、超时、disabled、stale version、越权与迁移不兼容测试。
- 注释、Go Doc、测试场景和文档以中文为主；标识符与协议名保留英文。
- 新权限、新 role 规则或安全配置必须有 owner、默认值、验证和当前 authority 说明。

## 4. 验收场景

1. 空数据库 migration 后，setup 原子创建唯一 owner；第二次 setup 返回冲突。
2. owner 创建 `operator` 角色和新账号；账号首次登录只能改密，改密后旧 Session 失效，重新登录获得角色权限。
3. operator 可访问被授予的页面/API；未授予 operation 即使直接请求也返回 403。
4. 禁用账号、替换账号角色、替换角色权限和 reset password 后，受影响的现有 Session 在下一请求返回 401。
5. 不能禁用最后 active owner、移除其 owner role、归档 owner 角色或修改 owner 权限。
6. owner 创建部门树和岗位，给用户分配主部门与多个岗位；环、超深移动、仍被引用的归档操作被拒绝且事务不留下部分状态。
7. owner 对已注册菜单调整启停、父子和排序；不能提交未知 RouteID/component path，disabled menu 仍不能绕过或替代 API 授权。
8. 角色权限页面以菜单/页面/action 树编辑同一份 Role-Permission；菜单权限和非菜单 operation 权限都可核对。
9. JWT/Bearer Todo 调用保持现有行为；Account WebUI Session 不成为普通 API 的隐式万能凭据。
10. fresh 数据库得到独立 Todo/Account version table 和干净 schema；退休的 version 4 本地库在写入前返回 `pre_release_baseline_reset_required`，文件和数据保持不变。
11. SQLite 本地全流程、Postgres/MySQL 配置式 migration tests、Go/生成/WebUI/E2E/视觉/文档门禁通过；未执行项如实报告。

## 5. 非目标

- 不实现注册开放、邮件邀请、忘记密码邮件、手机号或社交登录。
- 不实现 OIDC/OAuth2/LDAP/SAML/SSO、MFA、Passkey 或外部 IAM 同步。
- 不实现多租户、数据域、角色继承、职责分离、ABAC/ReBAC、显式 deny 或用户直授权。
- 不实现部门数据范围（本人/本部门/部门及下级/自定义部门）、组织多租户、汇报线、岗位层级或 HR 工作流。
- 不允许数据库创建任意页面、component path、external link、iframe、远程模块或 runtime plugin。
- 不引入 Casbin、OpenFGA、OPA 或第二个 authorization service。
- 不提供 Todo4、`webui_users/webui_sessions` 或其它首发前本地数据库的自动升级/数据保留承诺。
- 不建立可查询审计业务模块、导出中心、风控设备画像或异常登录检测。
- 不修改 `old-backend/`，不复用其账号/权限代码或数据模型。
