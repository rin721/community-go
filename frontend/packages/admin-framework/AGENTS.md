# Admin Framework 开发约束

本目录是 `@community-go/admin-framework`：Admin Surface 的契约与纯模型层
（Plugin Contract、Route Target、Registry、Diagnostics、Host Port / Host Capability、Route Context）。

- 本目录只定义类型、纯规则与可独立测试的模型；**不实现 Router、不读取 pathname、
  不维护 history、不复制 Next Route Runtime**。唯一真实 Router 是 Next.js App Router，
  其实现只存在于 Host（`apps/admin-web`）的 Port adapter。
- Plugin 只通过 `@community-go/admin-framework/plugin` 子路径消费 API
  （`route`/`AdminRouteLink`/`useAdminNavigation`/稳定 Page/Layout/Loading/Error props）；
  Route Context 通过 `/route-context` 子路径消费。禁止 Framework 内部深相对导入外泄。
- Registry 统一负责 canonical hierarchy、navigation inheritance、tree/group ordering、
  breadcrumb、command/permission、Route Target resolution 与 ownership/legacy/topology diagnostics；
  Generator（`tooling/admin-codegen`）不生成 resolved model，只产出静态 descriptors/catalog/bridges。
- 具体 Route Catalog 由 Surface generated catalog 提供，**不得生成到本包**；
  本包只定义可扩展 Catalog protocol。
- Host Capability：Static Export Host 对动态 `[param]` Route 返回
  `UNSUPPORTED_DYNAMIC_PLUGIN_ROUTE` 并硬失败，不降级为 warning、不使用
  `generateStaticParams` 枚举业务实体；Framework Contract 合法 ≠ 当前 Host 可部署。
- 错误必须完整向上导出：Registry/Route Target 校验失败保留 code 与消息，不静默回退默认值。
- 允许依赖 Universal（`core`、`types`）与 react（作为 plugin/route-context 的 peer 运行时）；
  禁止依赖 Next、Browser/Desktop API、`admin-foundation` 视觉包或 `apps/*`。
- 修改契约/Registry 前先读 [Admin Framework 与 Surface File Routes](../../docs/admin-framework.md)；
  公共导出登记在 `tooling/foundation-contracts.json`。
