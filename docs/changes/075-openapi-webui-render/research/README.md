# 075 研究档案

本任务采用三个研究记录：外部选型（R075-001，已被 R075-003 取代）、内部契约数据源（R075-002）、页内呈现层决策复核（R075-003，当前有效）。

## 研究范围与检索

- 外部研究：没有可直接复用的既有档案命中（`docs/**/research/**/metadata.yaml` 已检索；既有记录聚焦 Go 服务端选型，无 WebUI OpenAPI 渲染记录）。R075-001 证据来自 npm registry 元数据、官方仓库与 GitHub issue（2026-08-25 快照）；其「在页内使用 swagger-ui-react」结论已被用户要求（页内组件使用当前 WebUI 组件）推翻，由 R075-003 取代，证据保留为历史与独立站点场景参考。
- 内部研究：从 `api/README.md`、`internal/transport/http/huma.go`、`internal/tools/contract-gen`、`internal/composition/webui_registry.go`、`internal/composition/webui_spec.go`、`internal/webui/contract.go`、`cmd/app/main.go`、`.scaffold/layout.json`、`webui/src/ui/index.tsx`、`webui/src` 生成/mock 链路与 075 已提交实现（commit 55ee70f）读取代码事实。

## 记录索引

| ID | 主题 | 结论 |
| --- | --- | --- |
| [R075-001](R075-001-swagger-ui-library/) | 成熟第三方 Swagger UI 库选型（React 19 / Vite / StrictMode） | `superseded`（R075-003 取代）：原采用 `swagger-ui-react` 5.32.14；页内呈现层因用户要求改为平台组件自绘，库及其依赖/别名删除；本记录保留版本/兼容/风险证据 |
| [R075-002](R075-002-openapi-spec-data-source/) | WebUI 渲染契约的数据源与接入机制（单权威、零漂移、mock 三态一致） | 有效：扩展 `webui generate` 生成 `webui/src/generated/openapi-spec.ts`；与渲染库无关，保持不变 |
| [R075-003](R075-003-platform-component-presentation/) | API 页内呈现层改用平台组件（用户要求复核） | 当前有效：页内用 `@webui/sdk/ui` 组件（PageHeader/PageSection/Surface/DataTable/InlineAlert 等）在模块内自绘只读契约参考页；删除 swagger-ui-react；不新增平台 SDK |

## 有效性

- 三条记录均为 snapshot 型：以 2026-08-25 快照为准；实施时若版本/兼容性/用户要求证据漂移，先刷新记录再继续（刷新触发器见各 metadata）。
- 研究门禁通过只表示证据足以形成计划，不表示计划已确认或代码已授权实施。