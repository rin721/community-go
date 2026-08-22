# 安全响应

## 报告与分级

正式公开 release 前，repository owner 必须配置私密漏洞报告渠道和响应责任人；当前仓库文档不虚构邮箱或 SLA。不要在公开 Issue 中提交凭据、利用细节或生产数据。

收到报告后先固定受影响 tag/commit、可达调用路径和泄露范围，再区分：代码漏洞、依赖漏洞、凭据事件、配置误用和基础设施事件。日志、Problem Details、diagnostics、trace 和 SBOM 都只能作为证据，不能包含 Token、密钥或完整 DSN。

## 修复与传播

1. 在隔离环境复现并建立负向测试。
2. 修复项目自有 contract/Adapter 边界；不要让业务调用方直接接管第三方客户端。
3. 运行 quality、security、DB、container 和 release gates。
4. 发布新版本和安全说明，列出受影响 baseline、修复 commit、迁移步骤、临时缓解和验证命令。
5. copy-owned 消费者人工评估并迁移修复；上游不会自动覆盖副本。

疑似凭据泄露时应先轮换/撤销，再调查使用记录；删除 Git 文件不能撤销已经暴露的 secret。发现 artifact、checksum、SBOM 或签名不一致时停止发布并重新从固定 source commit 构建，不允许覆盖证据继续发布。

## WebUI Session 当前约束

当前本地 WebUI 使用 IAM 服务端有状态 Session。首次设置要求 `APP_IAM__LOCAL__SETUPTOKEN`，密码使用 Go 官方 `x/crypto/argon2` 的 Argon2id（当前目标为 64 MiB、3 次、并行度 2）；存量 PHC 参数先经过受限解析，匹配但偏离当前 policy 时在成功登录事务内自动重哈希，损坏或超预算记录 fail-closed。默认连续 5 次失败锁定 15 分钟；Session 默认空闲 30 分钟、绝对 12 小时。Session 保存签发时的 `SecurityRevision`，账号、密码、AccountRole 或 RolePermission 变化会使旧 Session 失效。Session 不得作为普通业务 API 的 Bearer/JWT 替代凭据。

浏览器请求使用 `__Host-community-go_iam_session` 安全 Cookie；不安全请求必须同时满足同源校验和绑定 Session 的 `X-CSRF-Token`。密码、setup token、Session ID、CSRF token 和 Authorization 不进入日志、Web Storage 或错误详情。

应用入口的 CORS 标准机制由 `rs/cors v1.11.1` 处理，Go 标准库 `http.CrossOriginProtection` 对 unsafe cross-site 请求提供 defense-in-depth。项目只允许配置中的 exact HTTP(S) Origin，空列表默认拒绝；不开放 wildcard、credentials 或 Private Network Access。被拒绝的 unsafe 请求在业务 Handler 前返回低敏 Problem。该入口策略不替代下述 IAM Session Origin/CSRF 守卫：无浏览器来源头的非浏览器请求可能通过标准库检查，但仍不能绕过 IAM mutation token。

IAM 在 composition 提供普通 WebUI 业务 mutation 共用的窄 Origin/CSRF 守卫；Navigation 策略修改使用该守卫，但业务模块不读取 IAM Repository 或 Session 表。菜单隐藏不构成授权，所有 Navigation operation 仍由服务端 `navigation:menu:*` 权限判断。

## 授权决策当前约束

服务端授权只经 Auth `DecisionPoint`：`token-scopes` 来源（Bearer/JWT、CLI/development）按凭据携带的精确 Scope 直判；`iam-rbac` 来源（IAM Session）不携带 Scope，必须由 composition 注入的 IAM RBAC evaluator 判断。Casbin evaluator 只执行固定 exact Core RBAC（账号→角色→精确 PermissionKey），由 `PolicySnapshot` 构造不可变快照，发布后不再改写；任何关系变更都在事务内撤销受影响 Session 并 bump authorization revision。Principal 携带的 revision 与 evaluator 不一致时同步刷新，刷新失败、取消或仍不一致一律拒绝，不使用旧 policy 放行；多实例部署在 revision 协议下可 fail-closed，但尚未作为已验证的分布式承诺。授权审计只记录低基数 operation、结果、reason 与 revision 类别，完整 policy、角色/权限集合、token、Cookie 与 matcher 细节不进入日志或响应。

## 审计持久化与会话管理（064/065）

- 认证/授权审计默认写入持久化低敏表 `auth_audit_events`（Auth module 自有迁移；`auth:audit:read` 权限键只读查询，owner 自动覆盖）。日志记录保留为 debug 级补充，不作为查询 authority。事件只保存脱敏字段（operation/action/actor_kind/subject_hash/resource_type/resource_hash/decision/outcome），查询结果同样脱敏；表默认受控保留上限（超出删除最旧事件，不自动归档）。审计查询不提供删除/篡改接口，支持按 operation/action/resourceType/outcome/actorKind/时间窗过滤。
- **业务操作审计（065）**：IAM、Organization、Navigation 的写操作（创建/变更/替换/启停等）经模块自有窄 port 注入同一低敏审计面，记录「谁在何时对什么资源做了什么、结果如何」；不包含对象内容、before/after、密码、token、权限集合或策略全文。审计写与业务事务解耦：失败低敏上报但不回滚业务结果。
- IAM 提供账号会话集中管理：`iam:session:read`/`iam:session:revoke` 权限键控制列表与批量吊销；列表只暴露 SessionID 摘要（hex）与过期信息，不泄露明文；批量吊销沿用既有安全修订与 owner 不变量语义（当前登录会话是否包含在集合内由调用方决策）。

## 账号与角色生命周期（066）

- 账号/角色资料更新与归档共用 `iam:account:write` / `iam:role:write` 权限键与既有乐观并发（版本 409）语义；账号改名与归档属安全变更，成功变更在事务内 bump SecurityRevision 并撤销该账号全部 Session。
- 归档是终态：归档账号不可登录、不可被组织分配（`RequireAssignableAccount` 拒绝），归档角色移出可分配集合且不再产生授权规则（沿用快照 `archived` 过滤 + `authorizeMutation` 完整发布链路，受影响持有者 Session 撤销）。最后一个 active owner 账号与 owner 角色（`ErrImmutableOwner`）不可归档。不提供物理删除或恢复流程；恢复能力若需要须另行立项。
- 角色名称/描述更新是展示字段变更，不改变授权关系，因此不触发 authorization revision、不撤销 Session；角色归档则视为授权变更，触发完整候选 evaluator 发布。
