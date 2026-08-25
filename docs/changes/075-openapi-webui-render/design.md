# 075 设计：Apifox 风格可测试 API 文档工作台

支撑研究：R075-001（swagger-ui-react 选型，已归档）、R075-002（契约快照链，不变）、R075-003（平台组件呈现，已归档）、R075-004（工作台与执行语义，当前有效）。

## 总体数据流

```text
模块 binding/http Huma registrations            （唯一代码权威）
        │ go generate ./...（contract-gen）
        ▼
api/openapi.yaml  ├─> CI oasdiff 基线（既有）
        │ go run ./cmd/app webui generate（扩展后，同一命令）
        ▼
webui/src/generated/openapi-spec.ts  ──import──►  OpenAPIWorkspacePage（平台组件工作台）
                                                      ├─ 操作树/过滤（视图）
                                                      ├─ 操作详情 + 执行面板（fetch 同源）
                                                      └─ 模型视图
```

- 快照三态一致（server-hosted / separated / mock），mock 下浏览完整、执行不可用（呈现明确说明）。
- 生成链、`webui.specOutput`、`@webui/generated` alias、图标 `book`、模块声明/menu/mock 空表全部保持不变（R075-002/前两轮）。

## 页面与视图结构（R075-004）

- 单 manifest 路由 `/openapi`（静态路由契约限制，动态详情无法注册为独立路由）→ 模块内工作台组件：
  - **视图状态**：`view = operations | schemas`、`selectedOp = <path>.<method>`（search 参数 `?view=&op=` 深链，监听 `popstate`/search 变化恢复）；
  - **左栏**：关键字过滤输入 + 按 tag 分组的可点击操作树（当前项高亮）；底部「模型」视图切换；
  - **主区·接口视图**：选中操作的详情（参数表含可编辑值输入、请求头摘要、请求体 JSON textarea + 校验、响应 schema 摘要、安全要求徽标）+ **执行面板**；
  - **主区·模型视图**：model 列表（左栏复用或页内切换）+ 选中模型属性表（DataTable）。
- 全部组件来自 `@webui/sdk/ui`（PageHeader/PageSection/Surface/Field/DataTable/Button/StatusPill/InlineAlert/EmptyState/SelectField 等）+ 模块 css；无第三方控件。

## 执行语义（R075-004，模块内自建执行器）

- 构建请求（`openapi-data.ts` 扩展，纯函数）：
  - URL：同源相对路径（`/api/v1/...`，path 参数按输入展开）；`server-hosted`/`separated` 均可（mode A 由 Vite 代理 `/api/v1`）；
  - Headers：`Content-Type: application/json`（有 JSON 请求体时）；`bearerAuth` 注入 `Authorization: Bearer <token>`（页面内存输入）；`webuiSession` mutation 附加 `Origin: 当前 origin` 与 `X-CSRF-Token`（来自 `loadSession()` 的 csrfToken）；
  - Body：JSON（textarea 输入经 `JSON.parse` 校验失败则阻止执行并呈现错误）。
- 执行：`fetch(url, { method, headers, body, credentials: "include" })`；响应呈现 状态码/耗时/响应头/文本（JSON 尝试格式化）。
- mock 判定：`readWebUIDataSource() === "mock"` → 执行面板只读提示「mock 演示构建无后端，执行不可用」。
- 失败语义：网络错误/HTTP 错误均如实展示（Problem JSON 的 code/detail 优先），不吞错、不伪造成功。

## 文件影响

| 区域 | 文件 |
| --- | --- |
| 页面重做 | `internal/module/openapi/binding/webui/web/OpenAPIPage.tsx`（工作台：树/详情/执行/响应/模型） |
| 解析/构建层 | `openapi-data.ts`（新增请求构建：`buildRequestOptions`/`expandPath`/`operationTree`/`parameterDefault` 等）+ 测试扩展 |
| locale | `webui.openapi` en-US/zh-CN 补充工作台/执行/响应/模型文案（键覆盖由生成器校验） |
| mock | `mock.ts` 保持空表（浏览零请求；执行在 mock 下禁用） |
| 平台 | 无新增平台能力；不新增依赖；`@webui/sdk/ui` 既有组件够用（Field/DataTable/Button/StatusPill/SelectField/InlineAlert） |
| e2e | `webui/e2e/webui.spec.ts`（dev：树/详情/执行面板断言；真实后端由 e2e 拦截路由模拟响应）、`webui-mock.spec.ts`（mock 浏览 + 执行禁用提示） |
| vitest | `OpenAPIPage.test.tsx` 重做（jsdom 真实渲染操作树/详情/模型 + 请求构建纯函数测试） |
| 文档 | `webui/README.md`、`docs/development/webui.md`、`api/README.md`、`internal/module/README.md`、模块 README、文档影响记录 |

## 失败语义与降级

- 请求构建错误（body 非法 JSON、缺失必需参数）→ 阻止执行并展示 InlineAlert/字段错误；
- 网络/HTTP 失败 → 响应面板如实呈现（状态、code/detail、耗时）；
- CSRF 缺失 token（会话过期）→ 服务端 400 Problem JSON 如实呈现，提示重新登录；
- mock 环境 → 执行禁用提示；快照不可用 → 整页 InlineAlert 兜底（保留）。

## 验证方案

1. Go：`go test ./...`、`go vet ./...`、`webui generate --check`（生成链不变）。
2. WebUI：`generate:check`/`typecheck`/`lint`/`lint:modules`/`test`（请求构建纯函数 + 工作台 jsdom 渲染）/`build`（记录 bundle）。
3. Playwright dev：操作树过滤/详情切换/模型切换/执行面板渲染（e2e 用路由拦截模拟成功与失败响应，断言状态码/耗时/body 呈现）；mock：浏览完整 + 执行禁用提示；截图留存。
4. 手动验收（模式 B）：真实后端执行 `none`/`bearerAuth`（注入 token）/`webuiSession`（读与 mutation，验证 CSRF 附加）多类操作。
5. 残留检查：`git grep -i swagger`（活动实现）无命中；无新旧并行实现。