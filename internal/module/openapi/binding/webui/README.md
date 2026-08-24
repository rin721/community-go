# OpenAPI WebUI 模块

本模块承载 WebUI「API 文档」页面（`/openapi`），用官方 Swagger UI 渲染公开 HTTP 契约。

- 数据源：`webui/src/generated/openapi-spec.ts`（`webui generate` 从 `api/openapi.yaml` 生成的 JSON 快照，见 [075 变更记录](../../../../../docs/changes/075-openapi-webui-render/README.md)）；页面直接 import，mock 环境零请求，`mock.ts` 为空路由表（settings 先例）。
- 呈现：页面壳层使用 `@webui/sdk/ui` 同等组件（PageHeader/PageSection/InlineAlert）；`swagger-ui-react` 仅存在于 `OpenAPISpecView` 窄封装内，CSS 随懒加载 chunk 进入。
- 首页页面候选键与 locale 覆盖由生成器校验；菜单/路由声明见 `binding.go`。