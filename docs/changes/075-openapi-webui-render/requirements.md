# 075 需求：Apifox 风格可测试 API 文档工作台

## 产品目标

在 Admin WebUI 中提供「如 Apifox 这样、可测试、完整的 API 文档页面」：操作树导航 + 操作详情 + **真实请求执行** + 响应展示 + 模型浏览，多视图组织（**不单页堆叠**）；页面壳层与页内组件全部使用当前 WebUI 组件体系（`@webui/sdk/ui`），不引入第三方文档控件（R075-004）。

## 范围

- 新增/重做 WebUI-only 模块 `openapi` 的「API 文档工作台」页（单路由 `/openapi`，app 布局，懒加载；模块内视图状态 + search 参数深链）：
  - **操作树/过滤**：左栏按 tag 分组的 operation 树，支持关键字过滤与选择；
  - **操作详情**：路径/查询参数（可编辑值）、请求头、请求体（JSON 文本编辑 + 校验）、响应 schema 摘要、安全要求呈现；
  - **执行面板（Test）**：同源 `fetch`（`credentials: include`）；`bearerAuth` 操作注入内存 token（不持久化）；`webuiSession` 操作自动携带会话 Cookie，mutation 自动附加 `Origin` + `X-CSRF-Token`（复用 `loadSession` 的 csrfToken）；执行后展示状态码/耗时/响应头/格式化 JSON body，错误如实呈现；
  - **模型视图**：`components.schemas` 浏览（列表 + 属性表）；
  - `mock` 数据源声明（`VITE_WEBUI_DATA_SOURCE=mock`）时执行不可用（无后端），页面呈现明确说明，浏览不受影响；
- 契约数据源与生成链不变（`webui generate` → `webui/src/generated/openapi-spec.ts` + `--check`，R075-002）；
- `openapi-data.ts` 扩展：请求构建数据（路径参数展开/默认值、请求体模板、执行 URL/headers 组装）与树结构，保持纯函数可单测；
- 全部用户可见文案经 `webui.openapi` locale（en-US / zh-CN），mock 空表维持；
- 不新增平台 SDK capability、不引入编辑器/测试框架第三方（自建执行器证据见 R075-004）。

## 非目标（明确不做）

- 不在 Go 服务端暴露公开 openapi.yaml/JSON 下载端点；不启用 Huma `/docs`；
- 不为文档页新增 HTTP operation 或权限键；
- 不做 Apifox 高级工作流：多环境/环境变量、断言脚本、导入导出、团队协作；不做请求体富编辑器（JSON 文本足够，Huma 产物全为 JSON/Problem JSON）；
- 不做 token 持久化（内存输入，避免凭据落盘）；
- 执行器不放大权限：执行语义与当前 WebUI 会话权限一致。

## 验收标准

1. `webui generate --check` 与快照（openapi-spec.ts）保持严格一致（不变）。
2. `/openapi` 渲染工作台：左栏操作树（可搜索/过滤、按 tag 分组），点击操作 → 详情视图；模型视图可切换；`?op=<id>`/`?view=schemas` 深链可恢复。
3. **可测试**（真实后端）：模式 B（或分离开发 + 后端可达）下选择操作 → 填入参数/请求体/token → 执行：
   - `none` 与 `bearerAuth`（注入 token）操作返回真实结果（状态/耗时/头/body 呈现）；
   - `webuiSession` 只读操作（如 `iam.session.read`）经会话 Cookie 成功；
   - 受 CSRF 约束的 mutation 经自动附加的 `Origin`+`X-CSRF-Token` 与真实 WebUI 同语义成功；拒绝/校验错误以 Problem JSON 呈现；
4. mock 演示构建：浏览与文档展示完整，执行面板提示「mock 环境无后端，执行不可用」，不发起真实请求。
5. 页内组件均来自 `@webui/sdk/ui`（PageHeader/PageSection/Surface/DataTable/Button/Field/StatusPill/InlineAlert 等）+ 模块 css；`git grep -i swagger` 无残留。
6. 测试：`openapi-data` 请求构建纯函数单测 + 工作台视图 vitest（jsdom 真实组件渲染）+ Playwright dev/mock 双 project（操作树/详情/执行面板/响应断言 + 截图）。
7. 门禁：Go `go test ./...`/`go vet`、WebUI `generate:check/typecheck/lint/lint:modules/test/build`、`pnpm e2e -- --workers=1` 全绿。
8. 文档同步与 documentation-impact.yaml 覆盖本轮调整；无新旧双轨残留。