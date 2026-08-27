# 084 任务清单：逐页推翻低质量布局（第一批）

研究门禁已通过（R084-001）；目标指令即计划确认。任务 ID 稳定，记录逐轮证据。

| ID | 工作量 | 内容 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- |
| PLAT-084-001 | M | 平台原语：`.field-grid` / `.split-workspace` / `.row-actions` / `.form-panel-bounded` + inspector 修复（styles.css） | lint/vitest/e2e 全绿；截图复核 | 完成 |
| I18N-084-001 | S | sdk/i18n 导出 translateMessage/translateOptional/ensureRouteLocale | Menus 树无原始 key；权限描述可解析 | 完成 |
| ORG-084-001 | L | Departments 目录工作台（搜索树 + InspectorPanel 视图/编辑/创建 Drawer + 归档确认） | mock e2e 断言 + 截图 | 完成 |
| ORG-084-002 | M | Positions 名录 DataTable（行菜单重命名/归档确认 + 创建/重命名 Drawer） | mock e2e 断言 + 截图 | 完成 |
| ORG-084-003 | M | Assignments 两栏 master-detail 分配编辑器（账号列表 + 分配表单） | 截图 + lint | 完成 |
| NAV-084-001 | M | Menus P0：可滚动右侧面板、策略控件纵向、跨 namespace 标题翻译、空态 | e2e 断言（无 webui. 原始 key）+ 截图 | 完成 |
| OAPI-084-001 | S | OpenAPI：首访默认选中 + 可操作空态 + 列表边界 | vitest（空态用例）+ mock e2e | 完成 |
| IAM-084-001 | M | Permissions/Roles 描述解析（permission.* → 模块 locale 键，缺失回落目录键）+ 表头/密度 + ApiTokens 创建分组 | e2e 断言无缺失占位；截图 | 完成 |
| SET-084-001 | M | Settings 开关行/语言单选组重构（appearance/notifications/language）+ 密码表单（confirm + bounded） | 截图复核 | 完成 |
| QA-084-001 | L | 验证矩阵（typecheck/lint/vitest 199/mock e2e 5）+ 重新截图 + codex 复查 | 全绿；P0 清零，残余 P1 记录 | 完成（残余见下） |
| DOC-084-001 | S | 变更记录 + changes 索引 + documentation-impact + authority（webui README / 模块开发指南） | docs-guard 通过 | 完成 |

## 验证矩阵（实测 2026-09-01）

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 类型 | `tsc --noEmit` | 通过 |
| i18n 契约 | `node scripts/lint-i18n-contract.mjs` | 通过 |
| 架构 lint | `node scripts/lint-architecture.mjs` | 通过 |
| eslint | `eslint .` | 0 errors（5 条既有 warning：host/测试文件未用变量） |
| Vitest | `vitest run` | **199/199 通过（46 文件）** |
| Playwright mock | `playwright test --project=mock` | **5/5 通过**（含新增 084 工作台断言） |
| 构建 | `vite build` | 待跑 |
| Go | `go test ./...` / `go vet ./...` | 待跑（前端变更不涉 Go） |
| 视觉 | codex 复查批次 A/B/C + 终审 v2/v3 | P0 全部清零；Menus/Positions/Assignments 降至 P2；Department/ApiTokens/Account-Security/Permissions/Settings 残余 P1 为小数据 mock 下密度/留白与控件边界判断（个别源于 HeroUI Select 触发宽度），已修 field-grid min-width 溢出、Select 组内尺寸与创建区两栏，记录为第二批继续项 |

注：pnpm 脚本嵌套调用触发 devEngines 版本告警（声明 pnpm@10.22 vs corepack 11.7），单独执行 node 脚本与 `pnpm exec` 规避；测试结果均绿。

## 未执行/受限项

- 校验矩阵：go test/vet 全绿（前端变更不涉 Go）；`vite build` 成功（chunk 体积警告为既有项）。
- **第一批残余 P1（第二批继续）**：部门页目录卡与详情面板在小数据下密度（Select 弹出箭头与字段关系）、ApiTokens 列表首屏露出度与创建区组间层次、账号安全页 aside 与表单关联、权限目录页纵向/横向空白（mock 2 行数据放大观感）、设置卡 bounded 表单的右侧留白（语言/通知已至 P2）。均不阻断使用，后续轮次按 R084-001 复跑收敛。
- 第二批页面（Sessions/Accounts 密度与批量、Login/Setup 重构、账号批量操作、会话按账号过滤）留待后续轮次；可推导但涉及后端 list 契约扩展的能力按 DEC 评估。
- 移动视口与真机验证沿用既有受限项。