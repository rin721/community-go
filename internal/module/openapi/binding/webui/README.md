# OpenAPI WebUI 模块

本模块承载 WebUI「API 文档」页面（`/openapi`），以平台组件自绘只读契约参考页。

- 数据源：`webui/src/generated/openapi-spec.ts`（`webui generate` 从 `api/openapi.yaml` 生成的 JSON 快照，见 [075 变更记录](../../../../../docs/changes/075-openapi-webui-render/README.md)）；页面直接 import，mock 环境零请求，`mock.ts` 为空路由表（settings 先例）。
- 呈现（R075-003）：壳层与页内组件均来自 `@webui/sdk/ui`；`openapi-data.ts` 是契约解析纯函数层（可单测），`MethodBadge` 等无语义平台细节内联在页面/模块 css 内；不使用第三方文档控件。
- 首页页面候选键与 locale 覆盖由生成器校验；菜单/路由声明见 `binding.go`。