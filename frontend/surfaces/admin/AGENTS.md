# Admin Surface 实现约束

本目录是 `@community-go/admin-surface`（private workspace）：只承载 Admin Surface 的
Plugin 业务、shell 模型、taxonomy 与 generated 产物，为 dependency ownership、
module resolution、typecheck 与 test 服务。

- 具体 Plugin 不是 Package，也不是 Surface 公共 API。对 Host 只开放
  `./shell`、`./generated/composition`、`./generated/catalog`、`./generated/routes/*`；
  禁止把 `plugins/*` 加入 exports，禁止通过相对路径绕开 generated bridge 导入 Plugin internals。
- Route Catalog、业务 Route IDs 与 module bridges 全部位于 `generated/`；
  产物带 `// @generated` 头，**禁止手改**——修改后运行 `pnpm codegen:admin` 重新生成，
  并用 `pnpm codegen:admin:check` 复核 freshness。
- Plugin Page 只消费 `@community-go/admin-framework/plugin` 的稳定契约
  （`route`/`AdminRouteLink`/`useAdminNavigation`/稳定 props）；禁止 import `next/*`、
  `generateStaticParams`、`generateMetadata`、Next route config、Browser history 或全局 location。
- 每个 `page.tsx` 必须与同目录 `route.meta.ts` 一一对应；metadata 不声明 path、
  普通 parentRouteId 或 page import；override 必须同 Plugin 并附 rationale。
- 允许依赖 Universal、`admin-foundation` 与 `admin-framework`；禁止依赖 `apps/*`、
  Browser/Desktop API、后端 DTO、请求、Session 或权限实现。
- 新建 File Route 前先读 [Admin Framework 与 Surface File Routes](../../docs/admin-framework.md)。
- 参考插件 `reference-resources` 使用固定路径完成浏览器验证，不引入 `[param]` 动态路由
  （Static Export Host 对动态路由硬失败）。
