# 053 账号、组织与权限体系业务模块设计

## 1. 总体边界

```text
HTTP request
   |
   v
single contract route binding -- security profile --> composition operation gate
   |                                                     |
   |                         +---------------------------+------------------+
   |                         |                                              |
   |                    Bearer/JWT                                     WebUI Session
   |                         |                                              |
   |                    Auth verifier                           Account session resolver
   |                         |                                              |
   +-------------------------+---------------- Principal -------------------+
                                                     |
                                                     v
                                             Auth policy decision
                                                     |
                                                     v
                                              Account/Todo handler
```

- Account：用户/账号、凭据、Session、角色、权限关系、部门、岗位、菜单策略、业务 API、WebUI 和 schema owner。
- Auth：Principal、Bearer/JWT、Policy、operation/action decision 和低敏 authorization audit owner。
- Composition：唯一跨模块映射点；把 Account `SessionIdentity` 映射为 Auth `Principal`，把 Account 的 authorizer port 连接到 Auth。
- Transport：只理解项目 HTTP Contract/security profile，不导入 Account/Auth 具体类型。

Account 与 Auth 不互相 import；第三方 Argon2id 留在 Account Adapter，JWT/jwx 留在 Auth Adapter。

## 2. 领域模型

### 2.1 Account

```text
Account
  ID
  Username              normalized ASCII identity
  DisplayName
  DepartmentID          nullable primary department
  Status                active | disabled
  MustChangePassword
  Version
  CreatedAt / UpdatedAt

LocalCredential
  AccountID
  PasswordHash
  FailedAttempts
  LockedUntil
  PasswordChangedAt
```

账号不硬删除。禁用是明确业务状态并撤销 Session；username 首版不修改，避免身份审计和唯一性语义漂移。管理员 reset 与用户 change password 更新 Credential，不把 hash 暴露到 Account 输出。

### 2.2 Role 与关系

```text
Role
  ID / Code / Name / Description
  Status                active | archived
  System
  Version
  CreatedAt / UpdatedAt

AccountRoleAssignment
  ID / AccountID / RoleID / Assigned / UpdatedAt

RolePermissionAssignment
  ID / RoleID / PermissionKey / Assigned / UpdatedAt
```

当前 `BaseRepository` 没有 hard delete；关系使用稳定 pair 行和 `Assigned` 状态单轨更新，既能在事务内 replace，也不会通过 raw GORM 穿透项目数据库边界。Role archive 前要求没有 active assignment；归档后 code 不复用。

### 2.3 Department、Position 与 Menu Policy

```text
Department
  ID / Code / Name / ParentID?
  Status / Version / CreatedAt / UpdatedAt

Position
  ID / Code / Name
  Status / Version / CreatedAt / UpdatedAt

UserPositionAssignment
  ID / AccountID / PositionID / Assigned / UpdatedAt

MenuPolicy
  NavigationID
  Enabled
  ParentIDOverride?
  OrderOverride?
  Version / UpdatedAt
```

Department 是无环树，Position 是全局平面目录。用户有一个主 Department 和多个 Position；它们是组织资料，不进入首版 Auth decision。

MenuPolicy 只能引用 composition 从当前 WebUI Catalog 投影的稳定 NavigationID。RouteID、Entry、path、title、icon 和 view operation 不进入可写字段。缺少 policy 行表示使用 Binding 的显式默认值；这是一条已声明的 merge 语义，不是失败回退。

### 2.4 Permission Catalog

Catalog 是 immutable value：

```text
Permission {
  Key          account:user:read
  Owner        account
  DescriptionMessageID
}
```

它由 application operation policies 聚合、去重和排序。`RolePermissionAssignment` 只保存 key；Account compatibility 在 listener 前校验：

- 数据库不存在未知 active key；
- `owner` 包含 Catalog 全集；
- 每个 protected Account/WebUI route 引用已注册 operation；
- permission key 与 operation policy 没有空值或冲突。

新增/删除 permission 必须与 Account migration、owner assignment 和文档同轮演进。

## 3. 不变量与事务

### 3.1 首个 owner

setup 在一个事务中：

1. 校验 setup token、username、password；
2. 再次确认 Account count 为 0；
3. 创建 Account 与 LocalCredential；
4. 创建或读取 system `owner` role；
5. 写入 owner 的全部 Catalog permission；
6. 分配 owner role；
7. 创建 Session。

唯一约束处理并发 setup，失败统一映射为 `setup_closed` 或安全错误，不返回数据库细节。

### 3.2 最后 owner

禁用账号、替换账号角色和归档角色前，在同一事务读取 active owner 数并锁定相关关系。实现必须使用当前数据库边界可表达的确定语义；若三驱动无法用现有 Repository 提供并发安全检查，应先为 `pkg/database` 增加窄、项目自有的 row-lock/conditional-mutation 契约并单独验证，禁止直接泄漏 GORM。

结果必须保证：提交后至少一个 active Account 具有 active `owner` assignment。system owner role 的 code、状态和权限集合不可修改。

### 3.3 Session 失效矩阵

| 变更 | 撤销范围 | 结果 |
| --- | --- | --- |
| 当前账号 change password | 该账号全部 Session | 返回成功后进入未登录状态 |
| 管理员 reset password | 目标账号全部 Session | 下次登录只能改密 |
| disable account | 目标账号全部 Session | 立即 401 |
| replace account roles | 目标账号全部 Session | 重新登录取得新权限 |
| replace role permissions | 该角色所有 assigned 账号的全部 Session | 防止旧权限继续生效 |
| archive role | 所有曾受影响 active 账号 Session | 角色不可再用于授权 |

Mutation 和 Session revoke 同事务；任何 revoke 失败必须回滚业务变更。Resolve 每请求读取 Account status、MustChangePassword 和 active role/permission，不把角色快照复制进 Session 表。

`MustChangePassword=true` 时，映射出的 Principal 只包含 `account:self:read`、`account:self:password:write` 和退出所需权限；不能使用 owner/业务角色权限。

## 4. Auth 与 Account 分责

Account 输出项目自有：

```go
type SessionIdentity struct {
    Subject         string
    PermissionKeys  []PermissionKey
    AuthenticatedAt time.Time
    IssuedAt        time.Time
}
```

Composition Adapter 转为：

```text
authmodel.Principal{
  Subject: identity.Subject,
  Kind: ActorAccount,
  Scopes: map PermissionKey -> Scope,
  ...
}
```

Auth 继续执行 `EnforceOperation`/`EnforceAction`。Todo 的 owner subject 使用 Account 稳定 ID；当前本地库没有 Todo 行，首发 baseline 不迁移旧用户或旧 Todo ownership，新建资源从当前 Principal 取得稳定 subject。

Account Service 定义自己需要的 `Authorizer`/`ActorAccess` 窄 port；composition 适配 Auth，Account core 不导入 Auth。

Account 另定义窄 `NavigationCatalog` 输入，只包含 NavigationID、默认 parent/order/enabled、RouteID 和该 route 的 permission projection；composition 从 `webui.Catalog` 映射。Account 不导入 `internal/webui`，WebUI contract 也不导入 Account。

## 5. HTTP Contract 与认证 profile

### 5.1 Transport 收口

将 `contract.Security` 扩展为：

- `none`：setup/login 等公开 operation；
- `bearer`：现有 Todo/JWT operation；
- `webuiSession`：Account 浏览器管理 operation。

`OperationGate.Authenticate` 目标语义改为“接收 request 与 operation security，返回带 Principal 的 request context”。route binding 在 request schema 校验后、authorization 前调用一次认证；移除全局 middleware 的 `/api/v1/webui` 跳过分支和依赖路径猜测。

OpenAPI renderer 为 Bearer 与 WebUI Session Cookie 生成项目声明的 security scheme；Cookie name 从 Account/Application identity authority 注入，不进入通用 `pkg/httpx/contract` 硬编码。

`contractDispatcher` 聚合所有 `contract.Module` 与所有 runtime handler map，校验 module/operation/handler 唯一且一一对应；不再取 `modules[0]` 或固定 Todo 参数。

### 5.2 目标 operation

| 类别 | 方法与路径 | Security | Permission |
| --- | --- | --- | --- |
| setup | `POST /api/v1/webui/auth/setup` | none + Origin | public |
| login | `POST /api/v1/webui/auth/login` | none + Origin | public |
| current session | `GET /api/v1/webui/auth/session` | webuiSession | `account:self:read` |
| logout | `POST /api/v1/webui/auth/logout` | webuiSession + CSRF/Origin | `account:self:read` |
| change password | `POST /api/v1/webui/auth/change-password` | webuiSession + CSRF/Origin | `account:self:password:write` |
| accounts | `GET/POST /api/v1/accounts` | webuiSession | GET：`account:user:read`；POST：`account:user:write` |
| account detail/status | `GET/PATCH /api/v1/accounts/{id}` | webuiSession | GET：`account:user:read`；PATCH：`account:user:write` |
| reset/roles | `POST .../{id}/reset-password`, `PUT .../{id}/roles` | webuiSession | `account:user:write` |
| roles | `GET/POST /api/v1/roles` | webuiSession | GET：`account:role:read`；POST：`account:role:write` |
| role detail/permissions | `GET/PATCH /api/v1/roles/{id}`, `PUT .../{id}/permissions` | webuiSession | GET：`account:role:read`；PATCH/PUT：`account:role:write` |
| permissions | `GET /api/v1/permissions` | webuiSession | `account:permission:read` |
| departments | `GET/POST /api/v1/departments`、`GET/PATCH /api/v1/departments/{id}` | webuiSession | GET：`account:department:read`；POST/PATCH：`account:department:write` |
| positions | `GET/POST /api/v1/positions`、`GET/PATCH /api/v1/positions/{id}` | webuiSession | GET：`account:position:read`；POST/PATCH：`account:position:write` |
| user organization | `PUT /api/v1/accounts/{id}/organization` | webuiSession | `account:user:write` |
| menus | `GET /api/v1/menus`、`PUT /api/v1/menus/policies` | webuiSession | GET：`account:menu:read`；PUT：`account:menu:write` |

Account handler 仍负责 module-owned DTO、输入校验和错误映射。CSRF/Origin 校验由 Account Session boundary 统一执行，页面不能自行决定是否需要。

## 6. Database 与 Migration

### 6.1 多 set catalog

保留 `pkg/database/migrate` 的单 set Runner，把 `internal/module/migration` 提升为 catalog orchestrator：

```text
MigrationCatalog
  todo     -> todo_schema_migrations
  account  -> account_schema_migrations
```

- set name、version table 唯一；执行顺序稳定；Todo 与 Account 没有跨 set 数据依赖；
- `status` 不创建表，返回每个 set 的 current/target/dirty/empty/compatible 和整体 compatible；
- `up` 按 catalog 的稳定顺序执行，每个 Runner 正确关闭；失败保留主错误与 cleanup error；
- completion 归所属 set，全部通过后才整体 compatible；
- Service startup 只读检查全部 set，不自动迁移。

### 6.2 首发前干净 baseline

当前没有正式 release 或已确认外部数据库兼容对象，因此不把 Todo4 当成产品升级起点：

1. Todo 当前 `000001..000004` 单轨收敛为三驱动 `000001`，直接创建最终 `todos` schema，包括非空 `owner_subject`；当前 migration 源码不再保留 expand/backfill 或 Auth 表创建步骤。
2. Account 三驱动 `000001` 创建 `accounts`、`account_local_credentials`、`account_roles`、两类 RBAC assignment、`account_departments`、`account_positions`、用户岗位 assignment、`account_menu_policies` 和 `account_sessions`。
3. fresh 数据库按稳定顺序执行 Todo 与 Account set；完成后等待 setup 创建首个 owner。
4. Catalog 在构造任何 Runner 和执行 SQL 前，只读检测退休标记：`schema_migrations`、`webui_users`、`webui_sessions`。存在任一标记即返回 `pre_release_baseline_reset_required`，不继续 migration。
5. 不读取旧用户、username 或 password hash，不迁移 Session，不删除旧表，不创建兼容 alias，也不猜测数据是否可丢弃。
6. SQLite/Postgres/MySQL SQL 各自显式实现并由新 baseline checksum 锁定；Git 与历史 change 文档保留旧演进证据。

本地 `.data/app.db` 当前属于退休 version 4 baseline，但不在 053 文档修订或自动化测试中重建。实现和 E2E 使用临时数据库；用户以后要切换本地运行库时，必须先对确切文件完成备份/恢复决策并单独授权破坏性操作。

## 7. Account 配置

本地账号配置从 Auth 单轨迁到 Account，例如：

```yaml
account:
  local:
    setupToken: ""
    password:
      minRunes: 15
      maxRunes: 128
    lockout:
      maxFailedAttempts: 5
      duration: 15m
    session:
      idleTimeout: 30m
      absoluteTimeout: 8h
      touchInterval: 1m
```

具体默认保持当前已验证行为，集中声明并测试；allowed origins 继续来自 application HTTP CORS authority，通过 composition 注入 Account，不复制第二份 Origin 配置。`auth` 配置只保留 Bearer/JWT/development profile。

不保留旧 `auth.local` alias。配置迁移影响必须同步 `config init`、`config.example.yaml`、环境变量说明和 reload tests。

## 8. WebUI

目标目录：`internal/module/account/binding/webui/web`，拥有：

- `SetupPage`、`LoginPage`；
- `SecurityPage`：当前账号、改密和 Session 状态；
- `AccountsPage`：filter/table/pagination/create/edit-status/reset/role assignment；
- `RolesPage`：角色列表、编辑与 permission matrix。
- `MenusPage`：只对当前 Catalog 导航节点做启停、层级和排序管理，并同时展示绑定 route/view operation。
- `DepartmentsPage`：部门树、创建、移动、状态和引用冲突。
- `PositionsPage`：岗位目录、创建、编辑、状态和用户引用。

Binding 使用 `account.*` entry/route/navigation ID 和 `webui.account` locale namespace，显式引用对应 view operation。Account 替换 Auth WebUI registration；旧 Auth 页面、locale、CSS 和生成 registry 引用删除，不保留 alias。

页面复用现有 SDK runtime/http/query/i18n/ui、Table/Filter/Pagination/Drawer/Form 能力。角色权限页把 Menu Definition、route view permission 与非页面 operation 组合成展示树，但提交值仍只是 permission keys。当前计划只扩展通用 NavigationPolicy provider 与 `NavigationRevision`；若真实实现还缺少其他 host-level capability，先新增独立 SDK contract task 并重新确认，不得让页面导入 platform internal 或把 Account DTO 放入宿主 core。

### 8.1 Manifest 菜单策略与版本

`webui.Catalog` 增加通用 `NavigationPolicy` 投影输入：

1. 先用构建期 Binding 完成 route/entry/owner/revision 校验；
2. composition 从 Account 读取当前 Catalog revision 对应的 MenuPolicy snapshot；
3. 通用 WebUI contract 校验 policy 引用、父子无环和 order；
4. 再叠加 access/availability，生成最终 ManifestMenu。

Menu disabled 不从 ManifestRoute 删除，也不改变 ViewOperationID。这样通过 URL 访问仍受 route access gate，菜单配置不能成为第二个授权开关。

Manifest 保留两类不可混淆的版本：

- `Revision` 仍只表示构建期 Catalog/生成 registry 版本，前端继续用它拒绝 stale generation；
- `NavigationRevision` 由当前有效 MenuPolicy 快照确定，只用于导航策略缓存与刷新，不参与 generated registry 相等性校验。

Manifest 每次请求读取一致的 MenuPolicy snapshot；菜单 mutation 提交后返回新的 `NavigationRevision`，当前 WebUI 主动刷新 Manifest，其他会话在下次 Manifest 获取时观察到新策略。首版不增加跨实例 watcher、push channel 或 runtime policy cache。Catalog 变化导致 policy 引用未知节点时仍在 Generation candidate 阶段失败；运行期 mutation 只允许当前 Catalog ID，因此不能制造该不兼容状态。

## 9. 错误、日志与审计

目标稳定错误至少包含：

- `account_not_found`、`role_not_found`；
- `username_conflict`、`role_code_conflict`；
- `account_disabled` 仅用于已授权管理 API，login 仍统一 `invalid_credentials`；
- `must_change_password`、`last_owner_required`、`system_role_protected`；
- `permission_unknown`、`optimistic_conflict`；
- 通用 `unauthenticated`、`permission_denied`、`internal_server_error`。

只有 HTTP/CLI/安全决策边界记录结果。日志和 audit 不记录 username、role name、permission 列表、密码、Session ID、Cookie、CSRF、setup token、body 或原始错误文本；ID 交给低敏 sink 摘要化。

## 10. 预期文件影响

- 新增 `internal/module/account/{model,service,repository,adapter,binding,handler,module.go,README.md}`，覆盖用户、RBAC、部门、岗位和菜单策略；
- 单轨收缩 `internal/module/auth`，删除 `webuiauth` 与 password Adapter，更新 model/service/module/middleware tests；
- 泛化 `pkg/httpx/contract`、`internal/transport/http`、`internal/composition` 的 security/dispatcher/Account-Auth wiring；
- 泛化 `internal/module/migration` 与 composition migration catalog；新增 Account 三驱动 SQL/checksum/compatibility；
- 更新 application config、示例配置、生成 OpenAPI/operation inventory/WebUI registry；
- 替换 Auth WebUI Binding/page/locale/style 为 Account owner，并扩展通用 manifest navigation policy；
- 同步 API、configuration、module development、migration、security、first-use、Auth/Account README 和 documentation impact。

实施只允许覆盖任务清单。若需要新外部依赖、第三方 policy engine、超出已计划 NavigationPolicy/`NavigationRevision` 的公共 SDK 变化或新的数据清理策略，必须重新确认。

## 11. 验证设计

| 层级 | 门禁 |
| --- | --- |
| Model/Service | username/role/permission/department/position/menu validation、树环/深度、引用约束、状态机、last owner、must-change、Session revoke、错误链、取消/超时 |
| Repository | 三驱动 schema、关系 replace、transaction rollback、unique/FK/optimistic conflict、无第三方泄漏 |
| Auth | Bearer 与 Account Session profile、逐 operation认证、默认拒绝、resource owner 不回归 |
| Migration | fresh、重复 up、dirty/incompatible、退休 baseline 写入前拒绝、多 set status、三驱动 checksum；不执行 Todo4 自动升级 |
| Contract | 多模块 aggregate、security schemes、handler 完整性、OpenAPI/operation inventory clean |
| WebUI | generated registry、模块 import/i18n/style gate、用户/角色/权限树/菜单树/部门树/岗位页面、403/401/must-change/引用冲突呈现 |
| E2E | setup -> owner -> department/position -> role/menu/permission -> user -> first login/change -> access/deny -> role change session revoke |
| Security | CSRF、Origin、Cookie、login enumeration、lockout、禁用/改密/权限变化失效、低敏日志 |
| Project | Go race/vet/build、WebUI lint/typecheck/test/build、docs guard、diff check、旧符号残留搜索 |

Postgres/MySQL、Playwright、Docker、Linux shell 或远端 CI 未在当前环境执行时必须保留为未验证，不能由 SQLite/静态测试替代。
