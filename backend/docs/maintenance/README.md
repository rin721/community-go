# maintenance 目录说明

`maintenance` 存放维护指南、阶段审计、任务计划和长期治理记录。这里的日期化文档是证据链，不是新的唯一事实来源。

## 当前文档类型

| 类型 | 示例 |
| --- | --- |
| 维护入口 | `maintenance-guide.md`、`open-source-readiness.md` |
| 重构计划 | `refactor-roadmap-2026-06-23.md`、`pr-split-plan-2026-06-23.md` |
| 阶段审计 | `backend-boundary-audit-2026-06-23.md`、`frontend-boundary-audit-2026-06-23.md`、`final-acceptance-gap-audit-2026-06-23.md` |
| 发布与验证审计 | `release-preflight-script-audit-2026-06-23.md`、`release-evidence-validator-audit-2026-06-23.md`、`package-sqlite-boundary-audit-2026-06-23.md`、`visual-qa-runner-audit-2026-06-23.md` |

## 维护规则

- 日期化审计记录保留当时语境；若当前代码已变化，应新增记录或更新索引，不随意改写历史证据。
- 长期规则进入根 `AGENTS.md` 或目录 README；一次性任务记录留在本目录。
- 新增维护文档时，在 `docs/README.md` 的相关主题中挂接，避免入口丢失。

## 常用验证

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
git diff --check
```
