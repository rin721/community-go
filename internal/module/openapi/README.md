# OpenAPI 模块

本模块承载 WebUI「API 文档」页（`/openapi`）：**API 文档查看 + 在线调试（Try it out）**，基于公开 HTTP 契约 `api/openapi.yaml`，呈现完全融入 Community Go 后台设计语言（R075-006）。

- 纯 WebUI 模块：无后端 service/repo/migration/operation；契约快照是构建期生成物（`webui generate` 输出 `webui/src/generated/openapi-spec.ts`），三态数据源环境（server-hosted / separated / mock）下浏览一致、mock 零请求。
- 呈现（去 Apifox 外壳）：平台组件（PageHeader/PageSection/DataTable/Field/SelectField/Drawer/InlineAlert/EmptyState）+ 后台流程（列表 → 行操作「文档/调试」 → Drawer 详情/调试 → 表单 → 发送 → 响应卡片）；模块 css 只保留业务 selector；控件基座为 HeroUI（经 `@webui/sdk/ui` 透传）。
- 能力（提取自 Apifox）：文档查看（说明/参数表/请求体与返回示例 JSON 高亮/响应表）；在线调试（参数 Field + Switch、Body JSON/form-文件/urlencoded、Headers、Auth、发送）；执行语义同源 fetch（bearer 内存 token、webuiSession Cookie + CSRF、mock 禁用）；深链 `?op=&mode=`/`?model=`；Cmd+K 快速跳转。
- 路由与菜单：`/openapi` 单路由 + `openapi.docs` 顶级菜单项（无 ViewOperationID，契约本身是公开仓库产物）；接入步骤遵循模块 WebUI 四步（Binding/locale/mock/CSS + 生成链），详见 [WebUI 开发指南](../../../docs/development/webui.md)。