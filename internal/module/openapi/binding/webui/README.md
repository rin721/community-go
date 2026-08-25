# OpenAPI WebUI 模块

本模块承载 WebUI「API 文档」模块（`/openapi`）：**层级分类 + 多页面**的 API 文档与在线调试（R075-007），控件基座 HeroUI，呈现融入后台设计语言。

- 数据源：`webui/src/generated/openapi-spec.ts`（`webui generate` 从 `api/openapi.yaml` 生成的 JSON 快照，见 [075 变更记录](../../../../../docs/changes/075-openapi-webui-render/README.md)）；页面直接 import，mock 浏览零请求，`mock.ts` 为空路由表。
- 页面与路由（GroupLayout 073 范式，共享 `OpenAPILayout`：SectionNav 总览/各 tag/数据模型 + 内容区）：
  - `OpenAPIOverviewPage`（`/openapi` 总览：契约信息 + 分类卡片）；
  - `OpenAPITagPage`（`/openapi/tags?tag=` 分类接口列表 + 行操作）；
  - `OpenAPIOperationPage`（`/openapi/operation?op=&mode=` 接口文档/调试 + 执行 + 响应卡片，撒 Drawer 壳复用 OperationDrawer 内容）；
  - `OpenAPIModelsPage`（`/openapi/models?model=` 模型列表 + 属性表，复用 `ModelPane`）；
  - `CommandPalette`（Cmd+K 平台 Modal，选择后 navigate 到对应页面）；`?tag=`/`?op=&mode=`/`?model=` 深链。
- 逻辑：`openapi-data.ts` 解析与请求构建纯函数（`buildRequest`/`bodyTypeOptions`/`formFieldRows`/`executionParameters`）、`run-store.ts` 执行状态机、`highlight.ts` JSON 高亮（highlight.js）、`api.ts` 会话 CSRF 快照、`command-context.ts` 命令面板触发注入。
- 页面候选键与 locale 覆盖由生成器校验；菜单/路由声明见 `binding.go`。