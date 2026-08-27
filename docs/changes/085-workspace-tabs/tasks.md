# 085 任务与证据

## 当前门禁

研究门禁已通过；计划已形成并处于**待确认**。本轮只实施纯文档任务，不授权下列源码、配置、生成、启动或测试实现任务。用户在本计划报告之后明确确认 `085` 当前计划后，才能把 `CONFIRM-085-001` 标为完成并开始非文档实施。

## 任务清单

| ID | 依赖 | 工作量 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `RES-085-001` | — | M | 复核当前/旧 Workspace Tabs、route/runtime、持久化与 APG 边界 | R085-001 metadata/report 可复核，事实与推断分离 | 完成 |
| `PLAN-085-001` | RES-085-001 | M | 形成 requirements/design/tasks 与索引 | REQ/DEC/文件影响/失败语义/验证齐全 | 完成 |
| `DOC-085-001` | PLAN-085-001 | S | 提交本轮纯文档研究与计划 | docs guard/diff check 通过，只提交 085 与索引 | 完成 |
| `CONFIRM-085-001` | PLAN-085-001 | — | 用户确认当前 085 计划与 DEC-085-001..005 | 计划报告之后收到明确确认 | 待确认 |
| `CONTRACT-085-001` | CONFIRM-085-001 | M | 增加 WorkspaceTabPolicy、manifest projection 与校验 | 默认 disabled；未知/非法 policy fail fast；Go/TS contract tests | 未开始 |
| `STATE-085-001` | CONTRACT-085-001 | L | 实现 WorkspaceRegistry reducer、identity、cap、pin/close/restore/reconcile | 纯函数测试覆盖 12/10 上限、批量原子性、pinned/dirty 规则 | 未开始 |
| `STORAGE-085-001` | STATE-085-001 | M | 实现版本化低敏 localStorage adapter | principal 隔离、坏数据/storage throw/access drift 安全降级 | 未开始 |
| `ROUTER-085-001` | STATE-085-001 | XL | 建立 mounted WorkspaceOutlet 与普通 route 分流 | 多 panel 状态真实保留；inactive inert；group layout 不复制/漂移 | 未开始 |
| `SDK-085-001` | ROUTER-085-001 | M | 暴露 workspace session 生命周期窄契约 | dirty/beforeClose/active/requestClose typed 且模块不可读全 registry | 未开始 |
| `UI-085-001` | STATE-085-001, SDK-085-001 | L | 实现 42px WorkspaceTabs、菜单、溢出与键盘 | REQ-085-003/004/005/010 的 unit/e2e/a11y 通过 | 未开始 |
| `ADOPT-085-001` | UI-085-001 | M | 首批 production route opt-in | 只按 DEC-085-002 启用；普通 route 全部不生成 tab | 未开始 |
| `CLEAN-085-001` | UI-085-001 | S | 单轨清理旧样式/zone/注释/测试残留 | 搜索旧 dot/refresh/showTabs/visitedRoutes 无无主残留 | 未开始 |
| `QA-085-001` | ADOPT-085-001, CLEAN-085-001 | L | 全量功能、视觉、键盘与回归验证 | requirements §4 与 design §9 全部有命令/截图证据 | 未开始 |
| `DOC-085-002` | QA-085-001 | M | 更新当前 authority、documentation impact 与任务证据 | webui README/development authority 与真实实现一致 | 未开始 |
| `COMMIT-085-001` | DOC-085-002 | S | 审阅、精确暂存并提交确认范围 | Conventional Commit；工作区用户修改未混入 | 未开始 |

## 实施停止条件

- mounted panels 无法在现有 Router/group layout 下保持单一路由声明。
- contextual identity 需要把敏感实体信息、任意 query 或业务草稿交给宿主。
- dirty 只能画标记而不能保住实际工作状态。
- 需要新增状态库、数据库、业务 API、权限键或跨窗口同步。
- 首批 route 资格与 DEC-085-002 不符，或用户调整 12/10 上限、持久化范围和关闭语义。

命中任一项时回到研究/计划并重新确认，不以兼容层、`any` store、隐藏回退或未受控持久化继续实施。

## 本轮文档证据

- 2026-08-28：`git diff --check -- docs/changes/README.md docs/changes/085-workspace-tabs` 通过。
- 2026-08-28：`./scripts/Verify-Docs.ps1 -BaseRef HEAD` 通过，验证当前工作树文档拓扑与链接；不带 `BaseRef` 的 diff-impact 检查会同时读取用户既有 `.gitignore` 修改并要求其所属任务提供 `documentation-impact.yaml`，085 未冒领该范围。
- 本轮没有运行 Go/WebUI 构建测试，因为交付物只有研究、需求、设计、任务与索引文档。
