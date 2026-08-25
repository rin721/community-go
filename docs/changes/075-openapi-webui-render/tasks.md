# 075 openapi 模块：Apifox 风格 API 工作台 — 任务清单

> 依赖：研究门禁通过（R075-004 取代 R075-003）；计划按 design.md 执行，状态为**待确认**（用户第三轮调整后重新确认）。

## 任务

| ID | 任务 | 完成条件 |
| --- | --- | --- |
| OAP-075-A/B/C/D | 快照生成链、模块声明、图标 `book`、`@webui/generated` alias（前两轮完成，55ee70f/9ea2f13） | ✅ 保持不变 |
| OAP-075-E | 移除 swagger-ui-react 依赖与别名（第二轮完成） | ✅ 无残留 |
| OAP-075-W1 | `openapi-data.ts` 扩展：请求构建纯函数（operationTree/参数默认值/路径展开/body 模板/buildRequestOptions）与单测 | 纯函数单测全绿 |
| OAP-075-W2 | 工作台视图：左栏操作树（过滤/搜索/高亮）+ 接口详情（参数可编辑/请求体 JSON 校验/响应 schema/安全徽标）+ 模型视图；search 参数深链 | vitest 渲染 + typecheck/lint 通过 |
| OAP-075-W3 | 执行器：同源 fetch + 认证注入（bearer 内存 token / session Cookie / CSRF+Origin）+ 响应面板（状态/耗时/头/JSON body）；mock 判定禁用执行 | 手动模式 B 三类操作执行验证 + e2e 拦截断言 |
| OAP-075-W4 | locales 补充（工作台/执行/响应/模型文案 en/zh）；mock.ts 保持空表 | locale 覆盖校验通过 |
| OAP-075-W5 | Playwright dev/mock 双 project：操作树/详情/模型/执行面板/禁用提示断言 + 截图 | `pnpm e2e -- --workers=1` 全绿 |
| OAP-075-W6 | 权威文档同步（webui/README、docs/development/webui.md、api/README、module README、075 记录）与 documentation-impact.yaml | 文档影响记录提交 |
| OAP-075-W7 | 全量门禁与提交：Go + WebUI + e2e + 残留检查 + bundle 基线记录 | 符合完成标准，提交完成 |

## 状态记录

- 2026-08-25：研究门禁通过（R075-001/R075-002）；计划建立；用户补充「保持与 webui 同等 UI 组件」。
- 2026-08-25：用户确认，实施提交 `55ee70f`（swagger-ui-react 版本）。
- 2026-08-25：用户确认 R075-003 更新计划，实施完成并提交 `9ea2f13`（平台组件自绘只读参考页；顺带修复平台 DataTable isRowHeader 缺陷）。
- 2026-08-25（当前轮，已完成）：用户再次调整——「要的是如 Apifox 这样、可测试、完整的 API 文档页面，而不是全都放到一个页面、没有完整功能的 Swagger UI」；R075-004 取代 R075-003（单路由工作台 + 执行器 + 模型视图）。确认后实施完成：W1 请求构建纯函数（buildRequest/sampleJSON/executionParameters 等 + 单测）；W2 工作台三视图（树/详情/模型，`?view=&op=` 深链）；W3 同源 fetch 执行器（bearer 内存 token、webuiSession Cookie + CSRF 附加、响应面板、mock 禁用）——e2e 以路由拦截验证 GET 会话执行、POST bearer 头注入与 schemas 深链；W4 locales en/zh；W5 Playwright dev/mock 22/22 全绿 + 截图；W6 权威文档与 impact；W7 门禁全绿（Go test/vet、generate:check、typecheck、lint、vitest 131、build）。bundle：OpenAPIPage chunk 53.14 kB（gzip 8.55 kB）。