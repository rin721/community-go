# 075 新增 openapi 模块：Apifox 风格可测试 API 文档工作台

状态：研究门禁通过（R075-001 / R075-002 / R075-003 / R075-004）。用户已确认第三轮方案（可测试 API 工作台）；**已实施完成**（55ee70f → 9ea2f13 → 本轮；Go/WebUI/e2e 全绿，截图留存）。

## 背景

`api/openapi.yaml` 是当前公开 HTTP 契约的产物，由 `go generate ./...` 从各模块 `binding/http` 的 Huma 代码声明（code-first）唯一生成，运行时未暴露可视化文档入口。用户要求 Admin WebUI 内提供 **Apifox 风格**：操作树导航 + 操作详情 + **真实请求执行** + 响应展示 + 模型浏览，视图组织清晰（不单页堆叠），页内组件全部使用当前 WebUI 组件体系。

## 方案（摘要）

- `openapi` 模块单路由 `/openapi` 承载工作台：左栏可搜索操作树（按 tag 分组）+ 主区（接口详情与执行面板 / 模型视图），`?view=&op=` search 参数深链；全部组件来自 `@webui/sdk/ui`；
- **可测试**：同源 fetch 执行器（`credentials: include`）——`bearerAuth` 注入内存 token、`webuiSession` 自动携带会话 Cookie 并对 mutation 附加 `Origin`+`X-CSRF-Token`（复用 `loadSession` 的 csrfToken）；响应呈现状态/耗时/头/JSON body；`mock` 演示构建仅浏览、执行禁用并有明确提示；
- 契约快照生成链（`webui generate` → `openapi-spec.ts` + `--check`）、模块声明、图标 `book`、`@webui/generated` alias、mock 空表保持不变；无成熟可嵌入第三方（hoppscotch 等为独立应用），执行器为模块内自建窄实现（R075-004）。

## 阅读顺序

1. [研究档案](research/README.md)：R075-001/R075-003（已归档）、R075-002（快照链，有效）、R075-004（工作台与执行语义，当前有效）
2. [需求](requirements.md)、[设计](design.md)、[任务清单](tasks.md)：OAP-075-A..E（已完成）+ OAP-075-W1..W7