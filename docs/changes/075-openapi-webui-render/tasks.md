# 075 openapi 模块：WebUI 契约渲染 — 任务清单

> 依赖：研究门禁已通过（R075-001 / R075-002）；计划按 design.md 执行，状态为**待确认**；非纯文档实施，须在计划报告后的独立消息中获得确认后才可实施。

## 任务

| ID | 任务 | 完成条件 |
| --- | --- | --- |
| OAP-075-A | 布局清单新增 `webui.specOutput`（`webui/src/generated/openapi-spec.ts`），同步 `projectlayout` 与测试 fixtures | layout 校验/测试全绿 |
| OAP-075-B | 扩展 `webui generate [--check]`：从 `api/openapi.yaml` 生成 `openapi-spec.ts`（JSON 对象 + 源 sha256），`--check` 严格比对；补 composition 测试 | 生成/check 测试通过；`webui generate` 与 `--check` 行为验证 |
| OAP-075-C | 新增 `internal/module/openapi`（binding.go/页面/测试/mock/locales/README）与 `@webui/generated` alias（tsconfig/vite） | `webui generate` 产物含 openapi 项；typecheck 通过 |
| OAP-075-D | `applicationWebUIModules()` 注册 openapi；受控图标目录双侧新增 `book` | catalog 校验/图标一致性测试通过；菜单出现「API 文档」 |
| OAP-075-E | 安装 `swagger-ui-react`（固定版本，实施期核验 R075-001 证据并回填记录），更新 `pnpm-lock.yaml` | `--frozen-lockfile` 安装成功；build 无 buffer 告警回归 |
| OAP-075-F | 页面壳层与状态用 `@webui/sdk/ui` 同等组件（PageHeader/PageSection/Skeleton/InlineAlert）+ 窄封装 `OpenAPISpecView`；模块 css 少量覆盖与暗色降级 | vitest（mock 第三方）+ typecheck/lint 通过；StrictMode 实测无异常（或有守卫并记录） |
| OAP-075-G | Playwright：dev/mock 双 project 断言 `.swagger-ui` 与契约标题渲染；manifest/menu fixture 增补；截图留存 | `pnpm e2e -- --workers=1` 全绿；`test-results/075-*` 截图 |
| OAP-075-H | 文档 authority 同步（webui/README、docs/development/webui.md、api/README、internal/module/README、docs/changes/README）与 `documentation-impact.yaml`；bundle 基线记录 | 文档影响记录提交；门禁全绿 |
| OAP-075-I | 全量验证与提交：Go 全绿 + WebUI 门禁全绿 + 手动模式 B/mock 验收；清理检查（无旧入口/无残留） | 符合完成标准，提交完成 |

## 状态记录

- 2026-08-25：研究门禁通过（R075-001 swagger-ui-react 选型；R075-002 数据源与模块机制）；计划已建立（requirements/design/tasks），用户补充要求「保持与 webui 同等 UI 组件」——已并入需求与设计（页面壳层使用 `@webui/sdk/ui` 同等组件，仅 Swagger UI 交互区由第三方渲染）。**待确认，未实施。**
- 2026-08-25（实施中）：用户确认计划。OAP-075-A/B 完成（layout `webui.specOutput` + `webui generate` 生成/`--check` 契约快照，含测试）；OAP-075-C/D 完成（openapi 模块 + `@webui/generated` alias + composition 注册 + 图标 `book`；`webui generate` 产物已含 openapi 路由/菜单/mock/locales）；OAP-075-E 依赖安装进行中；OAP-075-F/G 代码完成待门禁验证；OAP-075-H 文档 authority 与 impact 记录完成。
- 范围外既有事实（记录，不在 075 内顺手处理）：`internal/module/settings/README.md` 在 HEAD 已缺失，docs-guard 报 `indexed directory is missing README.md: internal/module/settings`——属 070–074 遗留；075 实施中把该断言同步到 `webui/scripts/project-layout.test.mjs` 的模块发现列表（同一门禁行，与新增 openapi 一并更新）。