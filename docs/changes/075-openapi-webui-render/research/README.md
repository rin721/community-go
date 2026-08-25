# 075 研究档案

本任务现有四个研究记录：外部选型（R075-001，已被取代）、契约数据源（R075-002）、页内平台组件呈现（R075-003，已被取代）、Apifox 风格工作台（R075-004，当前有效）。

## 研究范围与检索

- 外部研究：R075-001 记录 swagger-ui-react 版本/兼容证据（现已为历史与独立站点场景参考）；R075-004 复核无满足「可嵌入 + 平台组件 + 完整」的成熟工作台库（hoppscotch 等为独立应用）。`docs/**/research/**/metadata.yaml` 已检索，无更早的 API 工作台记录。
- 内部研究：从 `internal/webui/contract.go`（静态路由契约）、`webui/src/api.ts` 与 `webui/src/contracts/index.tsx`（会话/CSRF/数据源）、`internal/composition/webui_spec.go`（生成链）、settings GroupLayout/SectionNav 先例与 075 已提交实现（55ee70f/9ea2f13）读取代码事实。

## 记录索引

| ID | 主题 | 结论 |
| --- | --- | --- |
| [R075-001](R075-001-swagger-ui-library/) | Swagger UI 库选型（React19/Vite/StrictMode） | `superseded`（R075-003 取代），保留选择证据供历史/独立站点参考 |
| [R075-002](R075-002-openapi-spec-data-source/) | 契约数据源与接入机制（单权威、零漂移、mock 三态） | 有效且与呈现/执行层无关，保持不变 |
| [R075-003](R075-003-platform-component-presentation/) | 页内呈现用平台组件（只读参考页） | `superseded`（R075-004 取代）：平台组件呈现要求继续有效，但「只读单页」形态被工作台取代 |
| [R075-004](R075-004-apifox-style-api-workspace/) | Apifox 风格可测试 API 工作台（执行能力与视图结构） | 当前有效：/openapi 单路由承载工作台（操作树 + 详情执行面板 + 模型视图，search 参数深链）；同源 fetch 执行器 + 认证/CSRF 复用；mock 仅浏览；无成熟可嵌入第三方，模块内自建 |

## 有效性

- 四条记录均为 snapshot 型（2026-08-25 快照）；实施时若版本/兼容/会话语义证据漂移，先刷新记录再继续（刷新触发器见各 metadata）。
- 研究门禁通过只表示证据足以形成计划，不表示计划已确认或代码已授权实施。