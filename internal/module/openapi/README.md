# OpenAPI 模块

本模块承载 WebUI「API 文档」页（`/openapi`）：**Apifox 风格 API 管理平台**（文档查看 + 在线调试 + 数据模型，R075-005），基于公开 HTTP 契约 `api/openapi.yaml`。

- 纯 WebUI 模块：无后端 service/repo/migration/operation；契约快照是构建期生成物（`webui generate` 输出 `webui/src/generated/openapi-spec.ts`），三态数据源环境（server-hosted / separated / mock）下浏览一致、mock 零请求。
- **UI 控件基座为 HeroUI 组件库**（用户要求）：`@heroui/react` 或经 `@webui/sdk/ui` 透传；模块 css 只承载 Apifox 设计语言（token/布局/方法色/状态色）。工作台 = 顶部工具栏（面包屑 + Cmd/K 搜索）+ 左侧资源树（tag 分组 + 模型）+ 多标签页 + 主区（URL 栏 + 文档/调试双模式）+ 右侧响应面板；`?op=&mode=` / `?model=` 深链。
- 数据与执行：`openapi-data.ts` 解析/请求构建纯函数（参数/表单/body 类型/schema 样例）；`run-store.ts` 执行状态机与响应组装；`OperationPane` 同源 fetch（bearer 内存 token、webuiSession Cookie + CSRF 附加、form-data 文件上传、mock 禁用）；`ResponsePanel` 状态徽标/耗时/大小/JSON 高亮（`highlight.ts`，highlight.js 仅 json 语言）。
- 路由与菜单：`/openapi` 单路由 + `openapi.docs` 顶级菜单项（无 ViewOperationID，契约本身是公开仓库产物）；接入步骤遵循模块 WebUI 四步（Binding/locale/mock/CSS + 生成链），详见 [WebUI 开发指南](../../../docs/development/webui.md)。