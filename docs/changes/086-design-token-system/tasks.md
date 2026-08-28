# 086 任务与证据

## 当前门禁

研究门禁已通过（R086-001 完成）；计划已形成并处于**待确认**。本变更属非纯文档实施，
按仓库门禁必须先提交计划报告并获得用户确认后才能进入实施（`CONFIRM-086-001`）。

## 任务清单

| ID | 依赖 | 工作量 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `RES-086-001` | — | M | 现状审计：token 分层/magic values/模块污染/AppShell 分流 | R086-001 metadata/report 可复核 | 完成 |
| `PLAN-086-001` | RES-086-001 | M | 形成 requirements/design/tasks 文档 | REQ/DEC/文件影响/失败语义/验证齐全 | 完成 |
| `DOC-086-001` | PLAN-086-001 | S | 提交纯文档研究与计划（不实施代码） | docs guard/diff 通过，只提交 086 与索引 | 完成 |
| `CONFIRM-086-001` | PLAN-086-001 | — | 用户确认 086 计划与 DEC-086-001..005 | 计划报告后收到明确确认 | 待确认 |
| `TOKEN-086-001` | CONFIRM-086-001 | L | 建立 primitive/semantic/component 三级 token 与 density 推导 | styles.css token 分层；组件只消费 token；lint 通过 | 未开始 |
| `VIEW-086-001` | CONFIRM-086-001 | XL | 新增 ContentViewport 唯一滚动/宽度容器并接入 AppShell/Outlet | fallback 与 panel 共用；data-page-width 有生产端；双 padding 消除 | 未开始 |
| `COMP-086-001` | TOKEN-086-001 | L | Header/Sidebar/WorkspaceTabs/Table/Form 等组件消费组件 token 并清扫裸值 | 组件规则无裸 px/hex/!important | 未开始 |
| `MODULE-086-001` | TOKEN-086-001 | XL | 7 个模块 CSS 迁移到 token；裁决 :global 与裸色值 | 模块不出新平行规格；回归通过 | 未开始 |
| `GUARD-086-001` | COMP-086-001 | M | 扩展 style lint：禁止公共组件规则 !important/裸 px/hex；禁止模块覆盖宿主组件 | 反向 fixture 通过 | 未开始 |
| `QA-086-001` | VIEW/COMP/MODULE/GUARD | L | 全量验证：几何稳定断言 + Go/TS/lint/test/build/E2E/视觉 | 验收标准 1–6 全绿 | 未开始 |
| `DOC-086-002` | QA-086-001 | M | 更新 authority（webui README/development/application-module/documentation-impact/索引） | authority 与实现一致 | 未开始 |
| `COMMIT-086-001` | DOC-086-002 | S | 精确暂存并提交确认范围 | Conventional Commit；不混入用户修改 | 未开始 |

## 停止条件

- ContentViewport 收敛导致模块页滚动/宽度不可恢复的回归（回到研究评估，不倒退为双 padding）。
- HeroUI 组件边界 token 化触发大规模视觉回归且无法无 !important 修正（回到研究）。
- 模块 `:global` 迁移中发现必须新增全局选择器或重定义宿主契约（回到研究并重新确认）。