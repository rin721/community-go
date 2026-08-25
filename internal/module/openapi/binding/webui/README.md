# OpenAPI WebUI 模块

本模块承载 WebUI「API 文档」页（`/openapi`）：Apifox 风格、可测试的 API 工作台（R075-004）。

- 数据源：`webui/src/generated/openapi-spec.ts`（`webui generate` 从 `api/openapi.yaml` 生成的 JSON 快照，见 [075 变更记录](../../../../../docs/changes/075-openapi-webui-render/README.md)）；页面直接 import，mock 浏览零请求，`mock.ts` 为空路由表。
- 视图：`OpenAPIPage` 工作台（左栏树 + 主区）、`OperationDetail`（编辑 + 执行）、`SchemasView`（模型）；`?view=&op=` 深链；组件全部来自 `@webui/sdk/ui`。
- 执行：`openapi-data.ts` 纯函数 `buildRequest` + `OperationDetail` 的同源 fetch；`api.ts` 提供会话 CSRF 快照（webuiSession mutation 使用）。
- 页面候选键与 locale 覆盖由生成器校验；菜单/路由声明见 `binding.go`。