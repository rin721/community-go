# 075 研究档案

本任务采用两个研究记录，覆盖外部技术选型与内部事实/方案验证两个独立问题。

## 研究范围与检索

- 外部研究：没有可直接复用的既有档案命中（`docs/**/research/**/metadata.yaml` 已检索；既有记录聚焦 Go 服务端选型，无 WebUI OpenAPI 渲染记录）。证据来自 npm registry 元数据、官方仓库与 GitHub issue，全部于 2026-08-25 记录。
- 内部研究：从 `api/README.md`、`internal/transport/http/huma.go`、`internal/tools/contract-gen`、`internal/composition/webui_registry.go`、`internal/webui/contract.go`、`internal/composition/http_contracts.go`、`cmd/app/main.go`、`.scaffold/layout.json` 与 `webui/src` 的生成/mock 链路读取代码事实，不引用第二手描述。

## 记录索引

| ID | 主题 | 结论 |
| --- | --- | --- |
| [R075-001](R075-001-swagger-ui-library/) | 成熟第三方 Swagger UI 库选型（React 19 / Vite / StrictMode 适配） | 采用 `swagger-ui-react`（官方封装），固定版本 5.32.14（锁定归属见 tasks），模块内窄封装，不新增平台 SDK |
| [R075-002](R075-002-openapi-spec-data-source/) | WebUI 渲染契约的数据源与接入机制（单权威、零漂移、mock 三态一致） | 扩展 `webui generate` 生成 `webui/src/generated/openapi-spec.ts`；不做运行期 fetch；承载架构（模块化宿主 + 生成 registry）继续合适 |

## 有效性

- 两条记录均为 snapshot 型：版本、peerDependencies、GitHub issue 状态和仓库代码以 2026-08-25 快照为准；实施时若版本/兼容性证据漂移，先刷新记录再继续（刷新触发器见各 metadata）。
- 研究门禁通过只表示证据足以形成计划，不表示计划已确认或代码已授权实施。