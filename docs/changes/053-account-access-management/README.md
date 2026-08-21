# 053 账号、组织与权限体系业务模块

状态：研究门禁已通过；已按首发前项目语境修订 migration 与 Todo 边界，计划重新待确认。本轮只完成研究、根目标语境与方案文档，未实施源码、配置、迁移、生成、启动或外部写入。

## 目标

在不重建现有 Auth 决策引擎、不引入第二套权限 authority 的前提下，新增完整的 `account` 业务模块，单轨接管当前本地 WebUI 用户、密码和 Session，并建立可管理、可审计、默认拒绝的账号、组织与 Core RBAC 体系：

- 账号、Local Credential、状态、锁定、强制改密和 Session；
- 用户档案、所属部门和岗位分配；
- 角色、账号—角色关系、角色—权限关系；
- 由当前应用 operation policy 派生的只读权限目录；
- 部门树、岗位目录和对应的用户组织关系；
- 基于现有 WebUI Binding 的菜单导航策略管理，以及菜单—页面—permission 的安全投影；
- 首次设置、登录、退出、当前账号、改密、用户管理、角色管理、菜单与权限管理、部门和岗位管理；
- 模块自有 HTTP Contract、WebUI Binding、三驱动 migration、locale、样式和测试；
- Account 身份解析到 Auth `Principal` 的 composition Adapter，服务端 operation gate 仍是最终授权 authority。

## 当前结论

- 当前 `internal/module/auth` 同时承担通用 AuthN/AuthZ 与本地 WebUI 用户/Session，账号记录只保存逗号分隔 `Scopes`，没有角色、权限关系、账号状态或多账号管理。
- 当前 `webui_users`、`webui_sessions` 由 Todo migration 000004 创建，真实 owner 与物理迁移 authority 不一致。
- 当前仓库没有正式 tag/release；`origin/main` 是共享开发基线，不是已冻结的首发 migration 兼容基线。
- 当前本地 `.data/app.db` 为 version 4，包含 1 个 WebUI 用户、4 个 Session 和 0 个 Todo；它不是产品级兼容对象，但仍是未经授权不得自动重建的用户本地数据。
- 当前公开 HTTP dispatcher 只装配 Todo，Bearer 认证在全局 middleware 中完成；WebUI Session 路径被特殊跳过，无法直接承载第二个标准业务 HTTP 模块。
- 当前菜单来自各模块构建期 `Binding.Navigation`，runtime manifest 只按 access/availability 过滤；没有持久化菜单策略，也不能安全接受任意数据库 component/path。
- 048 已明确把完整 Account 作为后续独立业务变更：账号模块拥有用户、凭据、角色、权限、Session、安全策略、页面和 API，宿主只消费通用 Principal/Access。
- 首版采用 Core RBAC，不提供角色继承、显式 deny、用户直授权、ABAC、多租户或职责分离；这些需求出现时重新研究。
- 不引入 Casbin。它能执行 RBAC/ABAC，但官方明确不管理用户和角色实体；当前场景还会新增 policy storage、缓存与多实例同步链，和现有精确 operation policy 形成双 authority。

## 核心决策

1. 新增 `account` 业务模块，迁移本地账号、密码、Session 与相关 WebUI 页面；`auth` 保留 Bearer/JWT、Principal、Policy、operation/action 授权和低敏安全审计。
2. 权限键继续与 Auth policy 的精确 `Scope` 对齐；Account 使用自己的 `PermissionKey`，只在 composition 映射为 Auth `Scope`。
3. 权限目录由当前应用已注册 policy 构建，是只读代码契约；管理员不能创建任意权限字符串。
4. `owner` 是不可删除、不可降权的系统角色，始终拥有当前权限目录的全部权限；任何操作都不得导致系统失去最后一个 active owner。
5. 账号禁用、密码改变、角色分配改变或角色权限改变时，事务内撤销受影响 Session；权限变更后必须重新登录。
6. 部门是无环树，岗位是独立目录，用户拥有一个主部门和多个岗位；首版只用于组织管理和筛选，不暗中引入跨业务数据范围授权。
7. 菜单管理只覆盖已编译 `NavigationID/RouteID` 的启停、父子与排序；页面 Entry、路径、标题 message ID、图标和 view operation 继续由模块 Binding 拥有，菜单隐藏不是授权。
8. 当前 WebUI Auth 技术标识、旧源码、旧配置和旧运行 schema 不保留双轨；首发前直接建立 Todo/Account 两个干净 migration baseline，不实现 Todo4 自动升级、旧用户 hash 迁移或旧 Session 迁移。
9. Todo 按当前 copy-owned 产品决策保留为可删除学习示例，只拥有自身业务资产；它不是 Account 依赖。检测到退休的本地 version 4 baseline 时 fail closed 并要求人工备份/重建，不自动删除 `.data/app.db`。

## 阅读顺序

1. [研究索引](research/README.md)
2. [需求规格](requirements.md)
3. [设计方案](design.md)
4. [实施任务与确认状态](tasks.md)

## 实施门禁

这是非纯文档实施计划。用户本轮确认的是方案修订方向，不是修订后计划的非文档实施。只有用户在本计划报告后的后续消息中明确确认「053 当前方案」，才能把任务状态改为“已确认”并开始 `ACCOUNT-053-001..013`。当前方案已包含通用 NavigationPolicy provider 与 `NavigationRevision` 扩展；若实施中发现必须加入 OIDC/MFA、多租户、部门数据范围、角色继承、任意动态页面、Casbin/外部策略服务、旧 baseline 自动升级、默认本地数据库重建，或超出该范围新增/破坏性修改 WebUI SDK 公共能力，必须退回研究和待确认状态。
