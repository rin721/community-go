# 075 需求：新增 openapi 模块，WebUI 可视化渲染 API 契约

## 产品目标

在 Admin WebUI 中新增「API 文档」页面，使用成熟第三方 Swagger UI 库，把当前项目公开 HTTP 契约（`api/openapi.yaml`，由模块 Huma 代码声明唯一生成）渲染为可视化、可浏览的交互文档（路径/方法、请求参数与 schema、响应、security profile）。

## 范围

- 新增 WebUI-only 业务模块 `openapi`（`internal/module/openapi/binding/webui/*`），提供：
  - 单页面 `/openapi`（app 布局，懒加载）；
  - 页面壳层与其余 WebUI 页面保持**同等的 UI 组件**（`@webui/sdk/ui` 的 PageHeader/PageSection/Skeleton/InlineAlert 等，不引入第二套页面骨架组件），仅 Swagger UI 交互文档区由第三方库渲染；
  - 全局菜单项（顶级平铺，语义图标，本地化标题）；
  - `webui.openapi` 语言资源（en-US / zh-CN）；
  - 模块 mock 源（空路由表 + 解释注释，页面零请求）；
- 契约数据源：扩展 `webui generate [--check]` 从 `api/openapi.yaml` 生成 `webui/src/generated/openapi-spec.ts`（JSON 对象导出），页面直接 import；`server-hosted` / `separated` / `mock` 三态环境一致、零请求渲染。
- 第三方依赖：`swagger-ui-react`（官方 Swagger UI React 封装），固定版本，仅在 openapi 模块内窄封装使用。
- 平台最小扩展：受控图标目录新增 `book`（Go 与前端双侧同步）；tsconfig/vite 新增 `@webui/generated/openapi-spec` alias；`.scaffold/layout.json` 新增 `webui.specOutput`（默认 `webui/src/generated/openapi-spec.ts`）。
- 测试与验证：Go 全绿、WebUI 门禁全绿（generate:check/typecheck/lint/lint:modules/test/build）、Playwright dev+mock 双 project 覆盖、手动模式 B 验收与截图。

## 非目标（明确不做）

- 不在 Go 服务端暴露可下载的 openapi.yaml/JSON 端点（独立产品决策，本次不做）；
- 不启用 Huma 内置 `/docs`、`/openapi.json`；
- 不为文档页新增 HTTP operation 或权限键（页面公开呈现，与 settings 页一致）；
- 不新增平台 SDK capability、不进入 `@webui/sdk`、不建全项目级 Swagger Wrapper；
- 不做 Strace/深度换肤、不维护第二份手写契约、不引入 YAML 浏览器解析器；
- 不实施 csv/JSON 导出、多契约切换等与当前单契约产物不符的能力。

## 验收标准

1. `go run ./cmd/app webui generate` 同时产出并落盘 `webui/src/generated/webui-registry.ts` 与 `webui/src/generated/openapi-spec.ts`；`--check` 对两文件内容严格校验，任一新模块/契约内容使文件过期时非零退出。
2. `internal/module/openapi/binding/webui` 满足既有生成器与契约校验（Entries ⇒ Locales+MockSource、locale 覆盖 TitleMessageID、Navigation/Routes 合法性、图标在目录内、SDKRequirement 通过）。
3. 模式 B 启动后访问 `/openapi`：页面渲染 Swagger UI，展示契约标题 `go-scaffold-template HTTP API`、全部 operation（Auth/IAM/Organization/Navigation/Todo）与 security 声明；菜单出现「API 文档」项并可导航。
4. `VITE_WEBUI_DATA_SOURCE=mock` 演示构建：同一页面零后端请求渲染相同内容（含“模拟环境”徽标共存）。
5. Playwright dev project（认证态）与 mock project 均断言 `.swagger-ui` 与契约标题渲染成功，截图留存 `webui/test-results/075-*`。
6. 门禁：Go `go test ./...`（含 composition/webui registry/layout 测试）、`go vet`、WebUI `pnpm generate:check / typecheck / lint / lint:modules / test / build` 全绿；`pnpm e2e -- --workers=1` 全绿。
7. 文档同步：`webui/README.md`、`docs/development/webui.md`（新增模块接入小节）、`api/README.md`（WebUI 快照生成物说明）、`internal/module/README.md`（模块清单）、`docs/changes/README.md`（075 记录）更新；提交 `docs/changes/075-openapi-webui-render/documentation-impact.yaml`。
8. 无残留：不保留新旧双轨（无旧 OpenAPI 渲染入口）；旧路径/符号清理检查通过。