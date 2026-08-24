# 075 设计：openapi 模块与 WebUI 契约渲染

支撑研究：R075-001（swagger-ui-react 选型，**已被 R075-003 取代**）、R075-002（契约数据源与模块接入机制，不变）、R075-003（页内呈现层改用平台组件自绘，当前有效）。

## 总体数据流

```text
模块 binding/http Huma registrations            （唯一代码权威）
        │ go generate ./...（contract-gen）
        ▼
api/openapi.yaml  ├─> CI oasdiff 基线（既有）
        │ go run ./cmd/app webui generate（扩展后，同一命令）
        ▼
webui/src/generated/openapi-spec.ts  ──import──►  OpenAPIPage（平台组件自绘，页内无第三方）
                                                      │
webui/src/generated/webui-registry.ts  ──manifest──►  /openapi 路由 + 菜单（既有机制）
```

- 三态数据源环境（server-hosted / separated / mock）都为“页面 import 同一生成文件”，零请求；mock 模式下页面数据天然一致，模块 `mock.ts` 提供空路由表（settings 先例）并注释说明。
- 契约物理权威仍是 `api/openapi.yaml`；`openapi-spec.ts` 是其 JSON 变换，随 `webui generate` 同命令同 `--check` 纪律，不会静默漂移。

## 生成器扩展（Go，R075-002，已完成并保留）

- `internal/composition/webui_spec.go`：`WriteWebUIOpenAPISpecFromCurrentDirectory(check)` / `WriteWebUIOpenAPISpecAt` / `GenerateWebUIOpenAPISpecForLayout`；`--check` 整文件严格比对；契约缺失/解析失败报错不输出占位。
- 命令装配：`cmd/app/main.go` 的 `webui generate` 分支在 registry 生成后写入 spec。
- 布局清单 `webui.specOutput`：`internal/projectlayout/layout.go`（`WebUILayout.SpecOutput` + 校验）与前端 `project-layout.mjs`/`.d.mts`/测试同步。
- 不做：运行期读取/嵌入、对象进 catalog revision、第二份 YAML 产出。

## 新模块 `openapi`（WebUI-only，settings 同形态：无 module.go 业务层）

目录：

```text
internal/module/openapi/
├── README.md                    （局部包说明，指向权威文档）
└── binding/webui/
    ├── README.md                （模块 WebUI 说明，settings 先例）
    ├── binding.go               （webuicontract.Binding 声明，不变）
    └── web/
        ├── OpenAPIPage.tsx
        ├── OpenAPIPage.test.tsx
        ├── openapi-data.ts      （契约解析纯函数：tag 分组/参数行/响应行/schema 属性行）
        ├── openapi-data.test.ts
        ├── MethodBadge.tsx      （HTTP 方法徽标，模块内小型专用组件）
        ├── openapi.module.css
        ├── mock.ts              （空路由表 + 注释）
        └── locale/en-US.json、locale/zh-CN.json
```

binding.go 要点（不变）：`ModuleID: "openapi"`；Entry `openapi.docs`；Route `/openapi`（无 ViewOperationID）；Navigation `openapi.docs`（IconID `book`，Order 130）；Locales en/zh；MockSource `mock.ts`；Requires runtime/i18n/ui/mock。

### 页内呈现（R075-003：全部使用当前 WebUI 组件）

- **页面壳层**：`module-page` + 模块 css module 根元素、`PageHeader`（eyebrow/title/description 取自契约 `info.title/version` + 本地化文案）、`PageSection` 承载说明与来源行。
- **Operations 区**：按契约 `tags` 分组（descending 保持 Huma 文档顺序）；每个 operation 一行渲染为 `Surface`/`DataCard`：
  - 行首为模块内 `MethodBadge`（GET/POST/PATCH/PUT/DELETE 语义色）+ path 等宽文本 + `operationId` + summary/description；
  - 行内可展开（模块内 `useState`，避免第三方折叠控件）：参数表（`DataTable`：名称/in/必填/类型/说明）、请求体 schema 摘要（类型/required/properties）、响应表（`DataTable`：状态码/描述/schema 引用或内联说明）；`$ref` 递归展示做深度保护（≤3 层 + 循环检测，超限显示引用路径文本）。
- **Schemas 区**：`components.schemas` 每个 model 一张 `DataCard`，属性表用 `DataTable`（名称/类型/必填/说明），嵌套对象递归（同深度保护）。
- **Security 说明**：复用 legend 文案（bearerAuth 注入提示、webuiSession 写操作不可执行、mock 无后端）。
- 空/错状态：spec 不可用 → `InlineAlert`；无 operation → `EmptyState`；加载不适用（同步数据）。
- 全部用户可见文案经 `useWebUITranslation("webui.openapi")`；页面零请求。
- 交互工具：操作行展开折叠用 `Button`（ghost 变体）+ aria-expanded。

### 第三方依赖调整（R075-003）

- 移除 `webui/package.json` 的 `swagger-ui-react` 与 `@types/swagger-ui-react`；`pnpm-lock.yaml` 随之更新；移除 `webui/tsconfig.base.json` 与 `webui/vite.config.ts` 中的 `swagger-ui-react` 别名。
- 保留 `react-dom`/`i18next` 别名（页面/测试的渲染与 i18n 需要，与既有 `react`/`react-i18next` 映射同族）。
- 移除 `import "swagger-ui-react/swagger-ui.css"`；模块 css 只保留自有 selector。
- 不新增平台 SDK capability；自带能力判断：呈现层是模块自有逻辑（解析生成快照 → 平台组件视图），不建全项目级渲染框架（R075-003）。

## 平台最小扩展（不变）

- 图标目录新增 `book`（`internal/webui/icons.go` + `webui/src/icon-catalog.ts` 双侧同步，一致性测试自动守护）。
- alias `@webui/generated/openapi-spec`（tsconfig.base.json + vite.config.ts，保持）。
- composition：`applicationWebUIModules()` 增加 `openapiwebui.Binding()`（保持）。

## 受影响文件清单

| 区域 | 文件 |
| --- | --- |
| 生成器（保留） | `internal/composition/webui_spec.go`、`cmd/app/main.go`、`internal/projectlayout/layout.go` 等（55ee70f 已落） |
| 页面呈现（重写） | `internal/module/openapi/binding/webui/web/{OpenAPIPage.tsx,OpenAPIPage.test.tsx,openapi-data.ts,openapi-data.test.ts,MethodBadge.tsx,openapi.module.css}` |
| 依赖/别名（移除） | `webui/package.json`、`webui/pnpm-lock.yaml`、`webui/tsconfig.base.json`、`webui/vite.config.ts`（swagger 相关） |
| e2e | `webui/e2e/webui.spec.ts`、`webui/e2e/webui-mock.spec.ts`（断言迁移到页面自有语义标记） |
| 文档 | `webui/README.md`、`docs/development/webui.md`、`api/README.md`、`internal/module/README.md`、`docs/changes/README.md`、`docs/changes/075-openapi-webui-render/*` |

## 失败语义与降级

- 契约缺失/解析失败：`webui generate` 失败（不变）；页面侧 spec 非常规形状时走 `InlineAlert` 兜底。
- 递归 schema：深度/循环保护，超限以引用文本呈现（不崩页面）。
- 移除 swagger-ui-react 后无第三方运行时风险（StrictMode/Vite buffer 兼容项随依赖移除而消除，R075-001 的对应风险记录归档）。

## 验证方案

1. Go：`go test ./...`、`go vet ./...`（生成链测试保持）。
2. WebUI：`generate:check`、`typecheck`、`lint`、`lint:modules`、`test`（openapi-data 纯函数测试 + OpenAPIPage 真实渲染测试，jsdom 无需第三方 mock）、`build`（记录新 bundle 基线——swagger chunk 移除后页 chunk 显著变小）。
3. Playwright：dev（认证态 fixture 增补）+ mock 双 project 断言页面自有标记（`data-testid="openapi-operation"`、`MethodBadge` 文本、参数/响应表、schema 卡片）与契约内容；截图留存。
4. 残留检查：`rg -i swagger webui/package.json webui/tsconfig.base.json webui/vite.config.ts internal/module/openapi` 无命中（单轨）。
5. 手动验收（模式 B）与 mock 演示构建浏览验证；截图按仓库惯例人工复核。