# OpenAPI 模块

本模块承载 WebUI「API 文档」页（`/openapi`）：Apifox 风格、可测试的 API 工作台，基于公开 HTTP 契约 `api/openapi.yaml`。

- 纯 WebUI 模块：无后端 service/repo/migration/operation；契约快照是构建期生成物（`webui generate` 输出 `webui/src/generated/openapi-spec.ts`，075），三态数据源环境（server-hosted / separated / mock）下浏览一致、mock 零请求。
- 工作台（R075-004）：左栏可搜索操作树（按 tag 分组）+ 主区操作详情（可编辑参数/JSON 请求体/响应 schema）与执行面板；模型浏览视图；`?view=&op=` 深链。壳层与页内组件全部来自 `@webui/sdk/ui`；`openapi-data.ts` 为解析与请求构建纯函数层（可单测）；HTTP 方法徽标等无语义平台细节由模块内小组件 + css module 承担。
- 执行语义：同源 fetch（credentials include）——bearerAuth 注入内存 token（不持久化）、webuiSession 自动携带会话 Cookie 并对 CSRF 绑定写操作附加 `Origin`+`X-CSRF-Token`；mock 演示构建执行禁用并提示。
- 路由与菜单：`/openapi` 单路由 + `openapi.docs` 顶级菜单项（无 ViewOperationID，契约本身是公开仓库产物）；接入步骤遵循模块 WebUI 四步（Binding/locale/mock/CSS + 生成链），详见 [WebUI 开发指南](../../../docs/development/webui.md)。