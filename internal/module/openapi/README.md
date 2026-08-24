# OpenAPI 模块

本模块承载 WebUI「API 文档」页面（`/openapi`）：把公开 HTTP 契约 `api/openapi.yaml` 渲染为可视化交互参考。

- 纯 WebUI 模块：无后端 service/repo/migration/operation；契约快照是构建期生成物（`webui generate` 输出 `webui/src/generated/openapi-spec.ts`，075），三态数据源环境（server-hosted / separated / mock）下零请求一致渲染。
- 呈现边界（R075-003）：页面壳层与页内组件全部使用 `@webui/sdk/ui` 组件体系（PageHeader/PageSection/Surface/DataTable/InlineAlert/EmptyState 等）自绘只读参考页（operation tag 分组、参数/响应表、schema 属性表）；不引入第三方文档控件；HTTP 方法徽标等平台无语义细节由模块内小型组件 + css module 承担。
- 路由与菜单：`/openapi` 单路由 + `openapi.docs` 顶级菜单项（无 ViewOperationID，契约本身是公开仓库产物）；接入步骤遵循模块 WebUI 四步（Binding/locale/mock/CSS + 生成链），详见 [WebUI 开发指南](../../../docs/development/webui.md)。