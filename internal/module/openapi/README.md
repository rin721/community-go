# OpenAPI 模块

本模块承载 WebUI「API 文档」页面（`/openapi`）：把公开 HTTP 契约 `api/openapi.yaml` 渲染为可视化交互参考。

- 纯 WebUI 模块：无后端 service/repo/migration/operation；契约快照是构建期生成物（`webui generate` 输出 `webui/src/generated/openapi-spec.ts`，075），三态数据源环境（server-hosted / separated / mock）下零请求一致渲染。
- 第三方边界：`swagger-ui-react`（官方 Swagger UI React 封装，R075-001）只在 `binding/webui/web/OpenAPIPage.tsx` 的模块内窄封装中使用，不新增平台 SDK capability；页面壳层与其余 WebUI 页面使用同一套 `@webui/sdk/ui` 组件（PageHeader/PageSection/InlineAlert 等）。
- 路由与菜单：`/openapi` 单路由 + `openapi.docs` 顶级菜单项（无 ViewOperationID，契约本身是公开仓库产物）；接入步骤遵循模块 WebUI 四步（Binding/locale/mock/CSS + 生成链），详见 [WebUI 开发指南](../../../docs/development/webui.md)。