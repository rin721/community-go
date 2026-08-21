# IAM 模块

IAM（Identity and Access Management）拥有本地 Account、Credential、Session、Role、AccountRole 与 RolePermission。它实现首次 owner 初始化、登录锁定、首次改密、账号禁用、Session revision 失效和精确 Core RBAC；Department、Position 与 MenuPolicy 不属于本模块。

权限键来自 application Permission Catalog。系统 `owner` 角色不可归档或改写权限，并始终拥有完整 Catalog；任何账号状态或角色权限变化都在同一事务内更新受影响账号的 `SecurityRevision`，旧 Session 随即失效。

IAM 通过独立 `iam_schema_migrations` 管理三驱动 schema，通过 `iam.local` 管理 setup、lockout 和 Session budget。composition 只把 IAM `SessionIdentity` 适配成 Auth `Principal`，IAM 不导入 Auth，也不把数据库或 Argon2id 类型暴露给调用方。
