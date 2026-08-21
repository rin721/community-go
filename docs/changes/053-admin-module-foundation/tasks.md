# 053 Admin 多业务模块基础平台任务

## 确认状态

研究门禁已通过，`FOUNDATION-053-001..009` 全部待确认。旧版 `ACCOUNT-053-*` 确认已经因目标和边界变化失效；054–056 也不能共享 053 的未来确认。

当前工作树中的 Account/Todo migration 暂停草稿不属于当前完成证据。本轮只修改文档，不继续、不提交也不擅自回退这些源码。

| ID | 工作量 | 依赖 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `FOUNDATION-053-001` | L | 用户确认 | 冻结分类型模块完成品聚合和依赖边界 | Permission/HTTP/WebUI/Migration owner、ID、显式清单和禁止项有契约测试；不建立万能 Contribution | 待确认 |
| `FOUNDATION-053-002` | XL | 001 | 实现 Permission Definition/Catalog | 当前真实 Todo/Auth operation 接入；稳定排序、重复/通配/未知引用、不可变测试通过；无 Admin 占位 key | 待确认 |
| `FOUNDATION-053-003` | XL | 001 | 实现多 Migration Set Catalog | stable order、set/version table/source 冲突、聚合 status/up/completion、主/清理错误测试通过 | 待确认 |
| `FOUNDATION-053-004` | XL | 003 | 收敛 Todo 干净首发 baseline 与旧库 preflight | `todo_schema_migrations`、最终 Todo 000001、退休标记写入前拒绝、三驱动 SQL/checksum 测试；默认本地库无写入 | 待确认 |
| `FOUNDATION-053-005` | XL | 001,002 | 泛化多 HTTP Module dispatcher 与 typed security | none/bearer/webuiSession、module/operation/handler 一一对应、OpenAPI/operation inventory 测试通过 | 待确认 |
| `FOUNDATION-053-006` | XL | 005 | 建立 Auth 认证来源契约并迁移当前请求链 | 当前 Bearer/WebUI resolver 经 composition 接入，Principal 单次注入；Todo/management/WebUI 回归通过，无 URL skip | 待确认 |
| `FOUNDATION-053-007` | XL | 001,002 | 扩展 NavigationPolicy 与双 revision | 静态等价默认 snapshot、policy 引用/无环/order、access/availability、Catalog/Navigation revision 测试通过 | 待确认 |
| `FOUNDATION-053-008` | M | 002..007 | 建立聚合反向门禁并同步当前 authority | 拒绝扫描/全局 Registry/Kernel 依赖/Admin 占位；Auth/HTTP/WebUI/Migration/module docs 与实现一致 | 待确认 |
| `FOUNDATION-053-009` | XL | 002..008 | 完成全量验证并提交 | Go/WebUI/生成/docs/三驱动矩阵有证据；未执行项明确；只提交 053 确认范围 | 待确认 |

## 依赖顺序

```text
001 ─┬─> 002 ─┬─> 005 ─> 006
     │        └─> 007
     └─> 003 ─> 004

002..007 ─> 008 ─> 009
```

## Checkpoint

### A：不可变 Catalog（001–004）

- 分类型聚合边界冻结；
- Permission 与 Migration Catalog 使用真实现有能力验证；
- Todo baseline 和旧库 preflight 单轨完成；
- 不出现 IAM/Organization/Navigation 业务占位。

### B：请求与 WebUI 契约（005–007）

- 多 HTTP Module 与 typed security 闭环；
- Auth 来源可由 composition 明确替换；
- NavigationPolicy 和双 revision 保持当前静态菜单行为。

### C：门禁与交付（008–009）

- Kernel、Database Resource 和现有模块架构不被扩大；
- 当前 authority、生成物和代码一致；
- 只提交 053 文件，054–056 保持文档计划状态。

## 重新确认触发器

- 把业务 Account/Role/Department/Position/MenuPolicy 实现加入 053；
- 修改 Kernel、Database Resource 生命周期或引入通用 DI/扫描/Registry；
- Permission Catalog 开始存储角色关系或执行授权；
- Migration Catalog 引入跨 set 事务或自动删除/迁移退休本地账号；
- WebUI policy 允许数据库 path/component/Entry/ViewOperationID；
- 引入第三方策略引擎、事件总线、微服务或外部写入；
- 默认 `.data/app.db` 需要备份、移动、覆盖或删除。

## 当前未执行项

- 用户尚未确认当前 053 计划；
- 未实施平台契约、Todo migration 或任何业务功能；
- 未运行 Go/WebUI/生成/migration/浏览器测试；
- 本轮纯文档修订可按门禁例外提交，但不构成 053–056 实施确认。
