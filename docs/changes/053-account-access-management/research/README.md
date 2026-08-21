# 053 研究索引

本目录记录账号、组织与权限体系方案的当前仓库事实、外部主源和选型推断。研究结论足以形成计划，但不表示源码、配置、迁移或运行操作已获授权。

检索先覆盖 `docs/**/research/**/metadata.yaml` 中的 Auth、WebUI、Account、RBAC、Session、permission 和 module 记录，再从当前 `HEAD a935a68879cfc0042268bf23393a582ac78a25c8` 追踪实际 composition、Auth、HTTP contract、migration、Database Repository 与 WebUI Binding。外部研究只使用 NIST、OWASP 与 Apache Casbin 官方资料。

## 记录

- [R001 当前账号、Auth 与装配边界](R001-current-account-auth-boundary/report.md)：确认现有能力、缺口、迁移 owner、HTTP 单模块限制和可复用基础。
- [R002 Core RBAC、安全语义与策略引擎选择](R002-core-rbac-security-selection/report.md)：确定首版 RBAC 子集、默认拒绝、Session 失效语义，并评估 Casbin 是否适配。
- [R003 组织目录与菜单管理边界](R003-organization-menu-boundary/report.md)：确认当前静态 WebUI Catalog 约束，并把用户、部门、岗位、菜单管理收敛成不穿透模块边界的目标模型。
- [R004 首发前 schema baseline 与 Todo 保留决策](R004-pre-release-baseline/report.md)：确认没有正式 release、区分本地数据与兼容承诺，保留 Todo 示例但取消 Todo4 自动升级链。

## 门禁结论

关键事实已有当前代码、测试、现行 authority、既有 048 研究和外部主源支持；事实、推断、目标设计和非目标已经分离，剩余未知不妨碍形成计划，研究门禁通过。非文档实施仍必须等待用户确认 053 当前方案。
