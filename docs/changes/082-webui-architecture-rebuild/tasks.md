# 082 任务清单：WebUI 产品架构与 UI 体系重构

## 状态

研究门禁已通过（[R001](research/R001-webui-current-state/report.md)、[R002](research/R002-backend-capability-map/report.md)、[R003](research/R003-proposal-gap-analysis/report.md)，R003 §4.11 含方案新旧编号映射）；**计划已确认（2026-08-27 用户确认「确认 082 方案，实施」）**，进入实施阶段。方案输入 `docs/changes/temp-new-changes.md`（81 章，commit `3b758bd`）。决策点结论：`DEC-082-001` 保留 WorkspaceTabs（导航辅助，不删除）；`DEC-082-002` 正式启用 react-hook-form/zod（迁移表单并评估回归）；`DEC-082-003` DataTable 仅增强列可见性/密度/Sticky/Row menu；`DEC-082-004` IA 归位纳入（audit→Governance、openapi→Developer）；`DEC-082-005` 账号 Directory organization 过滤走前端组合（后端扩展不纳入 082）；`DEC-082-006` Query 统一层平台先建契约、页面迁移逐页接入。

## 任务

任务切片按「平台底座 → 页面迁移 → 打磨验收」三档；来源标注方案新章节与 R003 建议动作。红线段（原则 A/B：兼容 Backend Contract、保留权限/安全语义、禁止虚构数据、Mutation 真实闭环、兼容现有技术栈）不接受拆解或删除，作为全局约束。

### 平台底座（PHASE 4–6，优先）

| ID | 工作量 | 依赖 | 内容（REQ） | 完成条件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `RES-082-001/002/003` | M | — | 研究：WebUI 现状审计 / 后端能力清单 / 方案差异分析（含新旧编号映射） | metadata/report 齐全；门禁通过 | 完成 |
| `PLAN-082-001` | S | RES | 计划并提交确认（requirements/design/tasks/README + 决策点 DEC-082-001..006） | 文档齐全；用户确认 | 待确认 |
| `BASE-082-001` | L | 确认 | DataTable 增强：列可见性/密度/Sticky/Row menu（REQ-082-001） | 组件 Vitest；业务采用（会话批量吊销）；无假批量 | 待实施 |
| `BASE-082-002` | L | 确认 | FilterBar/SearchInput + 列表页 URL 状态同步 hook + Empty/No Results 区分（REQ-082-002） | hook+组件 Vitest；全部列表页 URL 化 e2e | 待实施 |
| `BASE-082-003` | M | 确认 | FormField 规格化 + 表单库决策落地（DEC-082-002）（REQ-082-003） | FormField Vitest；决策结论实现或移除依赖 | 待实施 |
| `BASE-082-004` | M | 确认 | 状态/反馈体系：EmptyState 结构化 / ErrorState 分级 / StatusBadge 全状态集 / DangerZone / Feedback 分层规范（REQ-082-004） | 组件 Vitest + 规范文档同步 | 待实施 |
| `BASE-082-005` | L | 确认 | 语义组件补齐：CodeText/CodeViewer、TreeView+InspectorPanel、DetailDrawer 规格化、LogTable、PermissionMatrix（REQ-082-005） | 组件 Vitest + 业务采用 | 待实施 |
| `BASE-082-006` | M | 确认 | Token 补齐：font.*/control.*/info/success + 页面宽度档（REQ-082-006） | styles.css token；类型/值单测或 lint 守护 | 待实施 |
| `BASE-082-007` | S | 确认 | Command Search 入口常驻化（REQ-082-007） | AppHeader 输入框；e2e 断言 | 待实施 |
| `BASE-082-008` | S | 确认 | Skeleton 分级（Page/Table/Panel/Inline）（REQ-082-008） | 原语 Vitest | 待实施 |
| `BASE-082-009` | L | 确认 | Query/Mutation 统一层：useWebUIQuery/useWebUIMutation 契约 + 列表/表单接入（REQ-082-009；DEC-082-006） | 契约 Vitest；至少两模块接入；lint 约束自写 fetch | 待实施 |
| `BASE-082-010` | M | 确认 | Backend 错误分类呈现：错误码→message ID→文案 + 技术详情可展开（REQ-082-010） | 组件/链路 Vitest；无 500/SQL 直出 | 待实施 |
| `BASE-082-011` | M | 确认 | Frontend Adapter 层：api.ts view-model mapper 规范 + 首个模块落地（REQ-082-011） | 规范写入开发指南；首个 Adapter 落地 | 待实施 |

### 页面模式迁移（PHASE 7–8，逐模块）

| ID | 工作量 | 依赖 | 内容（REQ） | 完成条件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `PAGE-082-001` | L | BASE-001/002 | IAM 账号 Directory：DataTable + Create Drawer（REQ-082-012；org 过滤按 DEC-082-005） | e2e 场景；无 card-grid 残留 | 待实施 |
| `PAGE-082-002` | M | BASE-005 | User Detail（Overview/Roles/Sessions/Security；无 Activity）（REQ-082-013） | Drawer e2e；无 fake Activity | 待实施 |
| `PAGE-082-003` | M | BASE-005 | Role List/Detail（REQ-082-014） | Drawer e2e | 待实施 |
| `PAGE-082-004` | M | BASE-005 | Permission Catalog：DataTable+CodeText+Used by Roles（REQ-082-015） | e2e；影响分析引用真实 | 待实施 |
| `PAGE-082-005` | M | BASE-001/005 | Token 成熟管控：Scope 分组选择 + 创建流程复核（REQ-082-022） | 创建向导 e2e；scopes⊆权限硬约束保持 | 待实施 |
| `PAGE-082-006` | M | BASE-005 | Session 管理完善：真实字段呈现，无 Device 不生成（REQ-082-021） | e2e；字段=真实 API | 待实施 |
| `PAGE-082-007` | M | BASE-005 | Audit Log Explorer 复核 + AuditDetail Drawer（摘要字段 + CodeViewer；无 Request metadata）（REQ-082-016） | LogTable 采用 e2e；无 fake 字段 | 待实施 |
| `PAGE-082-008` | M | — | Ops Dashboard 顶栏 Context + 无数据层级不可用态（REQ-082-017） | e2e（available/degraded/不可用态） | 待实施 |
| `PAGE-082-009` | M | BASE-005 | Organization Tree+Detail（无 DnD/Archive）（REQ-082-018） | Tree 采用 e2e | 待实施 |
| `PAGE-082-010` | M | BASE-005 | Navigation Menus 复核为 Tree+Inspector（DnD 仅真实 reorder）（REQ-082-019） | e2e | 待实施 |
| `PAGE-082-011` | S | 确认 | IA 归位（audit→Governance、openapi→Developer）+ Sidebar Group Label 与宽度 token 收敛（REQ-082-020；DEC-082-004） | 菜单 manifest 归位；Sidebar e2e | 待实施 |
| `PAGE-082-012` | S | DEC-082-001 | WorkspaceTabs 决策落地（保留复核或删除组件与测试）（方案「十二」） | 决策结论一致实现；测试同步 | 待实施 |

### 打磨与验收（PHASE 9–10）

| ID | 工作量 | 依赖 | 内容（REQ） | 完成条件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `POL-082-001` | M | 上述 | 交互态/响应式/a11y 复核 + a11y e2e（REQ-082-023） | 检查单执行；Playwright 新增通过 | 待实施 |
| `POL-082-002` | M | 上述 | 三层 QA：Design/Interaction/Backend Compatibility（REQ-082-024） | QA 清单核对；旧能力零丢失 | 待实施 |
| `POL-082-003` | M | 上述 | 页面五问验收 + 性能/视觉/产品标准复核（REQ-082-025） | 逐页验收记录；截图人工复核；性能不劣化 | 待实施 |
| `DOC-082-001` | M | 上述 | 文档同步：webui 开发指南（样式/语义组件/Query 契约附录）、webui/README、documentation-impact.yaml、changes/README 索引 | docs-guard 通过 | 待实施 |
| `VER-082-001` | M | 全部 | 全量验证与提交（go test/vet、generate:check、typecheck/lint、Vitest ≥151、Playwright ≥22、build） | 无失败；受限项如实标注 | 待实施 |

## 验证矩阵（预期，实施后实测填写）

| 门禁 | 命令/入口 | 预期结果 |
| --- | --- | --- |
| Go 单元/集成 | `go test ./...` | 全绿 |
| Go 静态 | `go vet ./...` | 通过 |
| WebUI | typecheck/lint（含 lint:modules/i18n/architecture）/generate:check/Vitest ≥151/Playwright ≥22/build | 通过 |
| 文档 | docs-guard | 通过 |

## 未执行/受限项

- 后端能力扩展（用户活动明细、审计完整元数据、部门移动/归档、organization 列表过滤）：R003 否决或列为 082 之外（R002 边界）。
- Command 实体检索（方案「五十七」后半）：候选，不立项。
- 多实例/远程模块/复杂图表/无真实需求的 Export-Batch-DnD-Analytics：候选（方案「六十八/六十九」防过度设计）。
- WorkspaceTabs 决策（DEC-082-001）与表单库决策（DEC-082-002）、Query 统一层范围（DEC-082-006）未落地前，相关任务保持「待实施」并在确认后调整测试基线。