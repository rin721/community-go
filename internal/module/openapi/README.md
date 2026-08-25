# OpenAPI 模块

本模块承载 WebUI「API 文档」模块（`/openapi`）：**API 文档查看 + 在线调试（Try it out）**，基于公开 HTTP 契约 `api/openapi.yaml`，呈现完全融入 Community Go 后台设计语言（R075-006/007）。

- 纯 WebUI 模块：无后端 service/repo/migration/operation；契约快照是构建期生成物（`webui generate` 输出 `webui/src/generated/openapi-spec.ts`），三态数据源环境（server-hosted / separated / mock）下浏览一致、mock 零请求。
- 呈现（层级分类 + 多页面，R075-007）：沿用 settings 的 GroupLayout（073）范式——共享布局 `OpenAPILayout`（SectionNav：总览 / 各 tag / 数据模型）承载四个静态路由 `/openapi`（总览分类卡片）→ `/openapi/tags`（分类接口列表，`?tag=`）→ `/openapi/operation`（接口文档/调试页，`?op=&mode=`）、`/openapi/models`（数据模型，`?model=`）；平台组件（PageHeader/PageSection/SectionNav/DataTable/Field/InlineAlert/EmptyState）；模块 css 只保留业务 selector；控件基座为 HeroUI（经 `@webui/sdk/ui` 透传）。
- 能力（提取自 Apifox）：文档查看（说明/参数表/请求体与返回示例 JSON 高亮/响应表）；在线调试（参数 Field 行、Body JSON/form-文件/urlencoded、Headers、Auth、发送）；执行语义同源 fetch（bearer 内存 token、webuiSession Cookie + CSRF、mock 禁用）；深链 `?tag=`/`?op=&mode=`/`?model=`；Cmd+K 快速跳转。
- 路由与菜单：四个静态路由共享 `openapi.layout` 分组布局 + `openapi.docs` 顶级菜单项（无 ViewOperationID，契约本身是公开仓库产物）；接入步骤遵循模块 WebUI 四步（Binding/locale/mock/CSS + 生成链），详见 [WebUI 开发指南](../../../docs/development/webui.md)。