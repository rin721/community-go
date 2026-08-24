# 075 需求：新增 openapi 模块，WebUI 可视化渲染 API 契约

## 产品目标

在 Admin WebUI 中新增「API 文档」页面，把当前项目公开 HTTP 契约（`api/openapi.yaml`，由模块 Huma 代码声明唯一生成）渲染为**与其余 WebUI 页面完全同源组件**的可视化、可浏览参考（路径/方法分组、参数/请求/响应与 schema 结构化展示、security 说明）。页面壳层与**页内组件**均使用当前 WebUI 组件体系（`@webui/sdk/ui`），不引入第三方文档控件的原生外观（R075-003）。

## 范围

- 新增 WebUI-only 业务模块 `openapi`（`internal/module/openapi/binding/webui/*`），提供：
  - 单页面 `/openapi`（app 布局，懒加载）；
  - **页面壳层与页内组件均使用 `@webui/sdk/ui` 组件**（PageHeader/PageSection/Surface/DataCard/DataTable/InlineAlert/EmptyState/Button 等）；HTTP method 徽标等无语义平台的细节由模块内小型专用组件 + css module 承担；
  - 全局菜单项（顶级平铺，语义图标 `book`，本地化标题）；
  - `webui.openapi` 语言资源（en-US / zh-CN）；
  - 模块 mock 源（空路由表 + 解释注释，页面零请求）；
- 契约数据源：`webui generate [--check]` 从 `api/openapi.yaml` 生成 `webui/src/generated/openapi-spec.ts`（JSON 对象导出），页面直接 import；`server-hosted` / `separated` / `mock` 三态环境一致、零请求渲染（R075-002，保持不变）。
- 页内内容：按 tag 分组展示 operation（方法徽标、路径、operationId、summary；展开显示参数表/请求体摘要/响应表），schema 模型属性表，security 说明；全部为只读浏览，不实现请求执行器。
- 第三方依赖调整：**移除 `swagger-ui-react` 与 `@types/swagger-ui-react`** 及其 tsconfig/vite 别名（单轨替换，不保留旧实现）。
- 平台最小扩展：受控图标目录新增 `book`（Go 与前端双侧同步）；`@webui/generated/openapi-spec` alias；`.scaffold/layout.json` 的 `webui.specOutput`。
- 测试与验证：Go 全绿、WebUI 门禁全绿、Playwright dev+mock 双 project、手动模式 B 验收与截图。

## 非目标（明确不做）

- 不在 Go 服务端暴露可下载的 openapi.yaml/JSON 端点；
- 不启用 Huma 内置 `/docs`、`/openapi.json`；
- 不为文档页新增 HTTP operation 或权限键；
- 不实现请求执行器（try-it-out/请求构建/导入导出）——页内为只读参考，受保护操作执行本就与 CSRF/Origin 安全边界互斥；
- 不新增平台 SDK capability、不建全项目级渲染框架、不重现 Swagger UI 全量控件；
- 不做深度换肤第三方、不维护第二份手写契约、不引入 YAML 浏览器解析器。

## 验收标准

1. `go run ./cmd/app webui generate` 生成 registry 与 `openapi-spec.ts`；`--check` 严格校验（保持不变）。
2. `internal/module/openapi` 满足契约校验（Entries ⇒ Locales+MockSource、locale 覆盖、图标目录、SDKRequirement）。
3. 模式 B 访问 `/openapi`：页面以平台组件渲染——PageHeader 展示契约标题/版本，operation 按 tag 分组（方法徽标 + 路径 + operationId），展开可见参数/响应表，schema 属性表渲染成功；菜单「API 文档」可导航。
4. **页内组件均为 WebUI 组件体系**：页面不含 swagger-ui-react（依赖已移除、`package.json`/`pnpm-lock`/tsconfig/vite 无残留引用，`rg swagger` 无命中）。
5. `VITE_WEBUI_DATA_SOURCE=mock` 演示构建：同一页面零后端请求渲染相同内容。
6. Playwright dev project（认证态）与 mock project 断言页面自有语义标记与契约内容渲染成功，截图留存 `webui/test-results/075-*`。
7. 门禁：Go `go test ./...`、`go vet`、WebUI `generate:check / typecheck / lint / lint:modules / test / build`、`pnpm e2e -- --workers=1` 全绿。
8. 文档同步与 documentation-impact.yaml 覆盖本次调整（swagger 移除 + 自绘呈现）；无新旧双轨残留。