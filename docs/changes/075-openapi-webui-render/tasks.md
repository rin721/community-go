# 075 openapi 模块：WebUI 契约渲染 — 任务清单

> 依赖：研究门禁通过（R075-001/R075-002，R075-003 为页内呈现层复核）；计划按 design.md 执行。**当前状态：用户追加要求「页内组件也使用当前 WebUI 组件」，计划已按 R075-003 更新，重新待确认；原 swagger-ui-react 实现（commit 55ee70f）将被单轨替换。**

## 任务

| ID | 任务 | 完成条件 |
| --- | --- | --- |
| OAP-075-A | 布局清单新增 `webui.specOutput`，同步 `projectlayout` 与测试 fixtures | ✅ 已完成（55ee70f），layout 校验/测试全绿 |
| OAP-075-B | 扩展 `webui generate [--check]` 生成 `openapi-spec.ts` 并严格比对 | ✅ 已完成（55ee70f），测试通过 |
| OAP-075-C | 新增 `internal/module/openapi`（binding/locales/mock/README）与 `@webui/generated` alias | ✅ 已完成（55ee70f）；页面呈现按 R075-003 重做（OAP-075-J/K） |
| OAP-075-D | `applicationWebUIModules()` 注册 openapi；图标目录新增 `book`；菜单/路由 | ✅ 已完成（55ee70f） |
| OAP-075-E | （原：安装 swagger-ui-react）→ **改为移除** swagger-ui-react 与 @types/swagger-ui-react 及别名（R075-003 单轨替换） | `package.json`/`pnpm-lock`/tsconfig/vite 无 swagger 引用；`rg -i swagger` 无残留 |
| OAP-075-F | （原：页面 + 窄封装 + 单测）→ **改为页内平台组件自绘**：OpenAPIPage 重写（Operations tag 分组/MethodBadge/展开参数·响应表/Schemas 属性表）+ openapi-data 纯函数 + vitest 真实渲染 | vitest/typecheck/lint 全绿；页面零第三方组件 |
| OAP-075-G | Playwright：dev/mock 双 project 断言迁移到页面自有语义标记；截图留存 | `pnpm e2e -- --workers=1` 全绿；`test-results/075-*` 截图 |
| OAP-075-H | 文档 authority 同步（webui/README、docs/development/webui.md、api/README、internal/module/README、docs/changes/README）与 documentation-impact.yaml 覆盖改动 | 文档影响记录提交；门禁全绿 |
| OAP-075-I | 全量验证与提交：Go + WebUI 门禁 + e2e + 残留检查；手动模式 B/mock 验收 | 符合完成标准，提交完成 |

## 状态记录

- 2026-08-25：研究门禁通过（R075-001 swagger-ui-react 选型；R075-002 数据源与模块机制）；计划建立，用户补充要求「保持与 webui 同等 UI 组件」——已并入（页面壳层同组件）。
- 2026-08-25：用户确认，实施完成并提交 `55ee70f`（swagger-ui-react 页内渲染版本；Go/WebUI/e2e 全绿）。
- 2026-08-25（当前轮）：用户确认 R075-003 更新计划，实施完成并提交 `9ea2f13`——OAP-075-E（swagger-ui-react/@types 与别名移除）、OAP-075-F（OpenAPIPage 平台组件自绘 + openapi-data 纯函数层 + vitest 真实渲染；发现并修复平台 DataTable 客户端渲染缺陷——RAC isRowHeader，含回归测试）、OAP-075-G（e2e 双 project 断言迁移与截图）、OAP-075-H（权威文档与 impact 更新）、OAP-075-I（全量门禁：Go test/vet、WebUI generate:check/typecheck/lint/lint:modules/vitest 122/build、Playwright 22/22，残留检查无 swagger 引用）。bundle 基线：OpenAPIPage chunk 由 1,367.98 kB（gzip 387.11 kB）降至 45.87 kB（gzip 6.03 kB）。
- 范围外既有事实（记录）：`internal/module/settings/README.md` 缺失导致 docs-guard 报错（070–074 遗留，非本任务引入；已在 `webui/scripts/project-layout.test.mjs` 断言中一并补齐 settings 模块发现）。