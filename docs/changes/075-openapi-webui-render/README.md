# 075 新增 openapi 模块：WebUI 可视化渲染 API 契约

状态：研究门禁通过（R075-001 / R075-002 / R075-003）；用户已确认更新后的计划（页内呈现改为平台组件自绘、移除 swagger-ui-react）；**已实施完成**（55ee70f → 9ea2f13；Go/WebUI/e2e 全绿，截图留存，DataTable 平台缺陷已修复）。

## 背景

`api/openapi.yaml` 是当前公开 HTTP 契约的产物，由 `go generate ./...` 从各模块 `binding/http` 的 Huma 代码声明（code-first）唯一生成，运行时未暴露任何可视化文档入口（Huma 自带 `OpenAPIPath`/`DocsPath` 均被关闭）。用户要求：新增 openapi 模块，在 Admin WebUI 中把该契约渲染成可视化页面，且**页面壳层与页内组件都使用当前 WebUI 组件体系**（R075-003）。

## 方案（摘要）

- 新增 WebUI-only 业务模块 `openapi`：单页面 `/openapi` + 全局菜单项；页面以 `@webui/sdk/ui` 组件自绘只读契约参考页（Operations tag 分组/方法徽标/参数·响应表、Schemas 属性表、security 说明），**不使用第三方文档控件**；
- 契约数据源保持单权威：`webui generate [--check]` 从 `api/openapi.yaml` 生成 `webui/src/generated/openapi-spec.ts`（JSON 对象），页面直接 import；`server-hosted` / `separated` / `mock` 三态环境零请求一致渲染；
- 移除 `swagger-ui-react` 及其依赖/别名（单轨替换 55ee70f 的第三方渲染版本）；`webui` 契约、registry 生成、菜单、locale、mock 与受控图标目录（`book`）按既有模块机制接入。

## 阅读顺序

1. [研究档案](research/README.md)：R075-001（swagger-ui-react 选型，已被取代）、R075-002（契约数据源）、R075-003（页内呈现层决策复核，当前有效）
2. [需求](requirements.md)：目标、范围、非目标、验收标准
3. [设计](design.md)：数据流、页内呈现、文件影响、失败语义、验证方案
4. [任务清单](tasks.md)：OAP-075-A..I