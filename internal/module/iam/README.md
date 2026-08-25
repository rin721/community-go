# IAM 模块

IAM（Identity and Access Management）拥有本地 Account、Credential、Session、Role、AccountRole 与 RolePermission，以及 authorization revision 状态。它实现首次 owner 初始化、登录锁定、首次改密、账号禁用、Session revision 失效和精确 Core RBAC 的授权发布；Department、Position 与 MenuPolicy 不属于本模块。

## 授权 authority 与 evaluator

权限键（PermissionKey）来自 application Permission Catalog，是唯一可分配项 authority；业务角色与账号/角色/角色权限关系由 IAM typed 表存储和管理。Casbin `github.com/casbin/casbin/v3 v3.10.0` 只作为 IAM module-owned evaluator 隐藏在 `internal/module/iam/adapter/casbin`：它从 Repository 的 `PolicySnapshot`（稳定排序、去重、active/未归档过滤并经 Catalog 校验）构造不可变 `SyncedEnforcer`，只执行固定 two-field Core RBAC 求值，不承担 hierarchy、domain、deny、ABAC、ReBAC，也不使用 GORM Adapter、AutoLoad、Watcher 或产物持久化。授权关系 mutation 与 evaluator 发布是同一成功/失败协议：事务内更新关系、受影响账号 `SecurityRevision`/Session、authorization revision，并在 commit 前构造完整候选，commit 后原子发布；不调用 Casbin Management API 改写内存。

系统 `owner` 角色不可归档或改写权限，并始终拥有完整 Catalog；任何账号状态或角色权限变化都在同一事务内更新受影响账号的 `SecurityRevision`，旧 Session 随即失效。`Principal.AuthorizationRevision` 与 evaluator revision 不一致时，DecisionPoint 在调用方 context 下同步刷新；刷新失败、取消或仍不一致一律拒绝，不使用旧 evaluator 放行。

## 动态权限分配

运行时支持创建自定义 Role、给账号分配 Role（AccountRole）与给 Role 分配 Catalog 内 PermissionKey（RolePermission），采用全量集合替换协议：读取返回 entity version、authorization revision 与完整集合快照，写入提交 `expectedVersion` + 期望集合；版本冲突返回稳定 409 且不静默覆盖，no-op 提交不改变版本/revision、不撤销 Session，有效变更返回 added/removed 计数与新版本。WebUI 角色权限页面由 Permission Catalog 按 OwnerModuleID 分组的 checkbox 矩阵生成，系统角色只读；账号角色页面使用 active/non-archived Role checklist。不支持运行时创建任意 PermissionKey、修改 Casbin model、按 URL/菜单生成后端 policy 或账号直授权。

## 账号与角色生命周期（066）

账号资料更新（改名）与账号归档、角色资料更新（名称/描述）与角色归档由 IAM 实现：改名与归档共用 `iam:account:write`/`iam:role:write` 与乐观并发版本协议；账号改名/归档与角色归档均视为安全变更，成功变更在事务内 bump SecurityRevision 并撤销受影响账号 Session（角色归档走完整授权发布链路，归档角色移出可分配与授权规则）；角色名称/描述更新是展示字段变更，不触发 authorization revision、不撤销 Session。归档是终态：归档账号/角色不可登录、不可分配、不产生授权规则；最后一个 active owner 账号与 owner 角色不可归档（`ErrImmutableOwner`/`ErrOwnerInvariant`）。不做物理删除与恢复。

## 影响分析、列表过滤与会话分页（076）

IAM 提供只读影响分析查询：角色→持有账号（`GET /api/v1/iam/roles/{id}/accounts`，`iam:role:read`）与权限键→使用角色（`GET /api/v1/iam/permissions/roles?key=…`，`iam:permission:read`），供角色归档/权限退役前影响分析；不新增权限键、不改变授权状态。账号列表支持 status/archived/roleId typed 过滤（Count/List 同条件）；会话列表支持分页与 status（all/active/revoked，active = 未吊销且未过期）过滤，保持 IDHash 低敏摘要。密码强度策略由 `iam.local.passwordPolicy` 配置（默认 15/128、复杂度开关默认关），在 Service 构造时冻结，只约束新建密码路径，不重验存量哈希。

## 对外边界

IAM 通过窄 facet 对外输出：`Sessions`（Session 解析）、`Authorization`（evaluator 决策/投影）、`Accounts`（可指派账号校验）、`Administration`（owner reconcile/兼容/密码重置）与 `Mutation`（CSRF 校验）；根 composition 不取得 `*service.Service`，Auth 只消费 project `DecisionPoint`，HTTP/Huma 与业务模块不接触 Casbin 类型。composition 的 identity-access 子装配把 IAM `Authorization` facet 适配为 Auth `DecisionPoint`，把 IAM Session 适配为 `iam-rbac` Principal。

## 其他

IAM 通过独立 `iam_schema_migrations` 管理三驱动 schema（含 authorization revision 单例行），通过 `iam.local` 管理 setup、lockout 和 Session budget。密码学由 Go 官方 `x/crypto/argon2` 实现；IAM Adapter 在执行 Argon2id 前严格限制 PHC 版本、参数、salt、digest 与资源预算，Service 只消费项目自有校验结果，并在成功登录事务内把历史参数渐进迁移到当前 policy。IAM 不导入 Auth，也不把数据库、Casbin 或 Argon2id 类型暴露给调用方。