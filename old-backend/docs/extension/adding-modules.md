# 新增模块

业务扩展统一通过模块新增。

当前项目采用显式模块装配，不做运行期动态发现。完整接入蓝图见 [模块接入蓝图](module-blueprint.md)；内置 `announcements` 模块是当前最小端到端示例。

## 目录约定

```text
internal/modules/<module>/
  model/
  service/
  repository/
  handler/
```

## 开发流程

1. 在 `model` 定义领域模型、输入输出结构和持久化模型。
2. 在 `service` 定义用例、领域规则和 service-local 最小接口。
3. 在 `repository` 或 `infrastructure` 实现数据库、缓存、存储、外部服务适配。
4. 在 `handler` 只做 HTTP 输入输出适配。
5. 在 `internal/app/initapp/layers.go` 声明模块对应用层暴露的 service、handler 和 lifecycle。
6. 在 `internal/app/initapp/modules.go` 装配模块依赖和生命周期资源。
7. 在 `internal/app/initapp/transport.go` 把模块 handler/service 传入传输层。
8. 在 `internal/transport/http/contracts.go` 声明 API contract。
9. 在 `internal/transport/http/router.go` 注册真实路由，并确保 API catalog 能接收新增 contract。
10. 在 `web/app` 增加 endpoint、API client、页面、i18n 和测试。
11. 更新模块 README、API 文档和测试矩阵。

可参考 `internal/modules/announcements`、`web/app/app/lib/api/announcements.ts`、`web/app/app/routes/admin/announcements.tsx`、`web/app/app/routes/public/announcements.tsx` 和 [Announcements 模块文档](../modules/announcements.md)。

## 边界要求

- service 不导入 `pkg` 具体实现，不导入同模块 repository 实现。
- repository 可以使用基础设施，但必须通过 service-local contract 暴露能力。
- handler 不写业务规则、事务编排或权限语义。
- 可变策略、产品码、品牌、缓存 TTL、请求头等进入配置或 contract，不写死在代码中。
- 新增模块必须使用显式装配、route contract 和代码审查可见的注册路径。
