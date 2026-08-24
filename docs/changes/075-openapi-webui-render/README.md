# 075 新增 openapi 模块：WebUI 可视化渲染 API 契约

状态：研究门禁已通过（R075-001 / R075-002）；计划已建立，**待确认**。非纯文档实施，须在计划报告后的独立消息中获得确认。

## 背景

`api/openapi.yaml` 是当前公开 HTTP 契约的产物，由 `go generate ./...` 从各模块 `binding/http` 的 Huma 代码声明（code-first）唯一生成，运行时未暴露任何可视化文档入口（Huma 自带 `OpenAPIPath`/`DocsPath` 均被关闭）。用户要求：新增 openapi 模块，在 Admin WebUI 中使用成熟第三方 Swagger UI 库把该契约渲染成可视化页面。

## 方案（摘要）

- 新增 WebUI-only 业务模块 `openapi`：单页面 `/openapi` + 全局菜单项，页面以 `swagger-ui-react`（官方 Swagger UI React 封装，Apache-2.0）渲染契约；
- 契约数据源保持单权威：扩展 `webui generate`（`go run ./cmd/app webui generate [--check]`）从 `api/openapi.yaml` 解析生成 `webui/src/generated/openapi-spec.ts`（JSON 对象），页面直接 import；`server-hosted` / `separated` / `mock` 三态数据源环境零请求一致渲染，不引入运行期 fetch、Vite 代理或 mock 契约复制；
- `webui` 契约、registry 生成、菜单、locale、mock 与受控图标目录按既有模块机制接入，宿主源码零改动；受控图标目录新增 `book`。

## 阅读顺序

1. [研究档案](research/README.md)：R075-001（Swagger UI 库选型）、R075-002（契约数据源与模块机制）
2. [需求](requirements.md)：目标、范围、非目标、验收标准
3. [设计](design.md)：数据流、文件影响、失败语义、验证方案
4. [任务清单](tasks.md)：OAP-075-A..H