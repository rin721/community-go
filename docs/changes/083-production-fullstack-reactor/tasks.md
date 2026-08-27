# 083 任务清单：Production-grade 全栈产品重构（WebUI 产品化二期）

## 状态

研究门禁已通过（[R083-001](research/R083-001-proposal-vs-082/report.md)、[R083-002](research/R083-002-style-layout-baseline/report.md)、[R083-003](research/R083-003-baseline-page-audit/report.md)）；**计划已确认（2026-08-28 用户确认「确认，实施」）**，进入实施阶段。方案输入 `docs/changes/temp-new-changes.md` 与 `docs/changes/admin-design-baseline.md`。决策点结论：`DEC-083-001` App Shell 分治（结构保留 + 样式骨架与装配段重写）；`DEC-083-002` 移除 Tab Bar（变更 082 DEC-001，删除 WorkspaceTabs 组件/状态/偏好/测试；Settings 双导航收敛）；`DEC-083-003` 后端仅 sorting 必补（其余按需求评估，审计元数据/User Activity 不补）；`DEC-083-004` 状态组件统一（StatusPill/StatusBadge 归一套）；`DEC-083-005` 启用 RHF+zod 并迁移表单。

## 任务

按「档 1 样式权威 → 档 2 布局骨架 → 档 3 页面产品化与后端补足」三档切片；红线段（组件栈不动、Backend 兼容红线、禁止 fake、lint/单轨）作为全局约束。

### 档 1：样式权威重建（REQ-083-001..003，优先）

| ID | 工作量 | 依赖 | 内容 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `RES-083-001/002/003` | M | — | 研究：差异分析 / 样式布局基线 / 页面对照 | metadata/report 齐全；门禁通过 | 完成 |
| `PLAN-083-001` | S | RES | 计划（requirements/design/tasks/README）+ 决策点 DEC-083-001..005 | 文档齐全；用户确认 | 待确认 |
| `STYLE-083-001` | M | 确认 | lint-architecture.mjs 扩展 CSS 扫描（L1 `:global` 平台类 / L2 平台类私有覆盖 / L3 真全局）+ 反向 fixture | 故意违规失败；lint 全绿 | 待实施 |
| `STYLE-083-002` | M | 确认 | 21 处死代码删除（auth audit-* 9、iam session-* 7、navigation policy-* 5） | grep 无消费方；lint/vitest 全绿 | 待实施 |
| `STYLE-083-003` | L | 确认 | 剩余 116 处 `:global` 收敛（平台类并入 styles.css / 模块局部类；header-zone-action 改受控平台类） | 137→0；lint 新规则通过 | 待实施 |
| `STYLE-083-004` | S | 确认 | 命名唯一：camelCase 变体（pageMeta/formHint 等）统一 kebab-case | lint 断言；无重复语义类 | 待实施 |

### 档 2：布局骨架重写（REQ-083-004..008）

| ID | 工作量 | 依赖 | 内容 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `LAYOUT-083-001` | L | 确认 | 视口与滚动：`100dvh`（app-workspace/app-shell/app-sidebar/app-main）、Sidebar 固定独立滚动、Main Workspace 独立滚动 | class 断言 + mock E2E 页面浏览；移动视口仿真（受限标注） | 待实施 |
| `LAYOUT-083-002` | M | 确认 | 宽度档接线：`--content-max-*` 4 token 消费（data-page-width 语义；Table 全宽/Settings 960/Detail 1200/form 760） | 各宽度 class 断言 | 待实施 |
| `LAYOUT-083-003` | L | 确认（DEC-002） | 移除 WorkspaceTabs（装配点/visitedRoutes/showTabs 偏好）与 Footer（showFooter）；删除组件+测试 | e2e 无残留 selector；单轨无旧文件 | 待实施 |
| `LAYOUT-083-004` | M | 确认 | Settings 双导航收敛（全局入口 + 页内 SectionNav 单形态） | Settings e2e 单导航断言 | 待实施 |

### 档 3：页面产品化与后端补足（REQ-083-009..012）

| ID | 工作量 | 依赖 | 内容 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `PAGE-083-001` | M | STYLE/LAYOUT | P0：全页样式清理 + 宽度档接线扫尾 | lint/vitest 全绿 | 待实施 |
| `PAGE-083-002` | M | 确认 | P1：Audit 分页（offset/limit URL 化）；时间戳格式化（Sessions/Audit/Ops 人类可读+相对时间） | e2e 断言；无 raw ISO 直出 | 待实施 |
| `PAGE-083-003` | M | 确认 | P1：Settings 双导航 + 宽度 640-960 收敛 | Settings e2e | 待实施 |
| `PAGE-083-004` | L | 确认 | P2：FilterBar 接线（Accounts/Sessions 后端 typed filters surface） | filter 参数真实请求 | 待实施 |
| `BACKEND-083-001` | L | 确认（DEC-003） | 后端 sort 参数（iam accounts/roles/sessions/api-tokens list）+ 失败校验 | operation 生成链同步；Go 测试 | 待实施 |
| `PAGE-083-005` | M | BACKEND-001 | 前端 sort URL 契约接线（useListQueryParams → 列表查询） | sort e2e | 待实施 |
| `PAGE-083-006` | M | 确认 | P3：MetricCard/EntityHeader 组件化 + 操作列「1 主操作 + ...折叠 + 危险隔离」（ApiTokens 优先） | 组件 Vitest + 页面采用 | 待实施 |
| `PAGE-083-007` | M | 确认 | P4：危险确认（Accounts/Roles/ApiTokens/Departments archive/revoke → Confirm/DangerZone）+ 空载态规格 | 确认 e2e；Empty/Loading 组件采用 | 待实施 |
| `PAGE-083-008` | M | 确认 | P5：Feature 拆解（EntityHeader/MetricCard/ActivityTimeline/CommandPalette 业务采用按需求） | 对照 R083-003 每页验收 | 待实施 |
| `POL-083-001` | M | 上述 | 状态组件统一（StatusPill/StatusBadge 归一套，DEC-004）+ 视觉校准（主色换基线 #2563EB 系或保留待确认） | 组件单轨；视觉截图复核 | 待实施 |
| `QA-083-001` | M | 上述 | 页面达标率复核（R083-003 105 项重跑，目标 ≥70% 达标或收敛）+ 三层 QA | 达标率提升记录 | 待实施 |
| `DOC-083-001` | M | 上述 | 文档同步：webui 指南（样式权威规则/布局规范/宽度档）、webui README、documentation-impact.yaml、changes 索引 | docs-guard 通过 | 待实施 |
| `VER-083-001` | M | 全部 | 全量验证与提交（go test/vet、Vitest ≥192、Playwright mock ≥3、lint/build/generate） | 无失败；受限项如实标注 | 待实施 |

## 验证矩阵（预期，实施后实测填写）

| 门禁 | 命令/入口 | 预期结果 |
| --- | --- | --- |
| Go | `go test ./...` / `go vet ./...` | 全绿 |
| WebUI | typecheck/lint（modules/i18n/architecture 含新样式规则）/generate:check/Vitest ≥192/Playwright mock ≥3/build | 通过 |
| 文档 | docs-guard | 通过 |

## 未执行/受限项

- 移动视口（`100dvh`）需真机/移动仿真验证，桌面环境仅 class 断言与模拟，如实标注。
- Playwright dev 项目（20 用例）沿用 082 待真实后端联调。
- 后端 detail/batch/counts/org reorder 按 DEC-083-003 确认范围评估，不在默认实施面。
- 审计完整元数据、User Activity、TanStack Table 替换、Command 实体检索：候选，不立项。