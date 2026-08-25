# 075 研究档案

本任务现有五个研究记录：外部选型（R075-001，已归档）、契约数据源（R075-002）、平台组件呈现（R075-003，已归档）、可测试工作台（R075-004，已归档）、Apifox 产品形态拆解（R075-005，当前有效）。

## 研究范围与检索

- 外部研究：R075-001（swagger-ui-react 证据，历史）；R075-005 抓取 Apifox 官网与帮助文档（2026-08-25）作为官方物料，结合作者产品知识拆解 Apifox 的布局骨架/设计语言/交互/OpenAPI→UI 映射；docs 门户为 SPA 不可服务端爬取、web_search 工具不可用，均已列入局限与刷新触发器。
- 内部研究：`internal/webui/contract.go`（静态路由契约）、`webui/src/api.ts` 与 `webui/src/contracts/index.tsx`（会话/CSRF/数据源）、`internal/composition/webui_spec.go`（快照链）、已提交实现（55ee70f/9ea2f13/e4865ca）的复用层与 UI 层边界。

## 记录索引

| ID | 主题 | 结论 |
| --- | --- | --- |
| [R075-001](R075-001-swagger-ui-library/) | Swagger UI 库选型 | `superseded`，历史证据 |
| [R075-002](R075-002-openapi-spec-data-source/) | 契约快照链（单权威、零漂移） | 有效，与呈现/执行层无关，保持不变 |
| [R075-003](R075-003-platform-component-presentation/) | 页内呈现用平台组件（只读单页） | `superseded`（R075-004 取代） |
| [R075-004](R075-004-apifox-style-api-workspace/) | 可测试工作台（树/详情/执行器/模型） | `superseded`（R075-005 取代）：执行语义与纯函数层继续复用，UI 层升级为 Apifox 复刻 |
| [R075-005](R075-005-apifox-product-research/) | Apifox 产品形态与技术拆解（官方物料 + 产品知识） | 当前有效：模块重做为 Apifox 复刻工作台（四区骨架 + 多标签 + 文档/调试双模式 + 响应面板 + 设计 token + 深链），像素级还原以截图逐轮人工校准为验收路径 |

## 有效性

- 记录均为 snapshot 型（2026-08-25）；Apifox 界面细节在获得可对照的体验版/截图后需按刷新触发器校准设计 token。
- 研究门禁通过只表示证据足以形成计划，不表示计划已确认或代码已授权实施。

## 证据级别说明

- 官方物料：当日抓取的 apifox.com 首页与帮助文档原文（可复核 locator + 快照）。
- 作者产品知识：Apifox 2.x/3.x 界面公认形态（本会话无可视化对照，实施时以截图/录屏逐点修订）。
- 推断：OpenAPI→UI 映射与组件分解的实现方案。