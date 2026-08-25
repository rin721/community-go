# OpenAPI WebUI 模块

本模块承载 WebUI「API 文档」页（`/openapi`）：Apifox 风格 API 管理平台（R075-005，HeroUI 控件基座）。

- 数据源：`webui/src/generated/openapi-spec.ts`（`webui generate` 从 `api/openapi.yaml` 生成的 JSON 快照，见 [075 变更记录](../../../../../docs/changes/075-openapi-webui-render/README.md)）；页面直接 import，mock 浏览零请求，`mock.ts` 为空路由表。
- 视图：`OpenAPIPage` 工作台壳、`ApiTree` 资源树、`WorkspaceTabs` 多标签、`OperationPane`（URL 栏 + 文档/调试 + 执行）、`ResponsePanel`（高亮响应）、`ModelPane`、`CommandPalette`（Cmd+K 搜索）；`?op=&mode=` / `?model=` 深链；控件基座 `@heroui/react` + `@webui/sdk/ui` 透传，模块 css 承载 Apifox 观感。
- 逻辑：`openapi-data.ts` 解析与请求构建纯函数（`buildRequest`/`bodyTypeOptions`/`formFieldRows`/`executionParameters`）、`run-store.ts` 执行状态机、`highlight.ts` JSON 高亮（highlight.js）、`api.ts` 会话 CSRF 快照。
- 页面候选键与 locale 覆盖由生成器校验；菜单/路由声明见 `binding.go`。