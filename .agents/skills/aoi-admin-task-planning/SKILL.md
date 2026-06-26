---
name: aoi-admin-task-planning
description: "Repository-specific workflow for staged task plans, refactor roadmaps, progress tracking, acceptance snapshots, handoffs, and PR split plans in this aoi-admin / open console platform repository. Use when the user asks where the task plan is, asks to create or update a plan, requests progress percentage, asks for next-stage guidance, or needs maintenance evidence linked from docs/README.md."
---

# Aoi Admin Task Planning

使用本 skill 维护当前仓库的阶段计划、重构路线图、验收证据索引和交接记录。计划必须帮助开发者找到真实状态，但不能替代代码、配置、脚本和测试结果。

## 开始前

1. 阅读 `AGENTS.md`、`docs/README.md`、`docs/maintenance/README.md`、`docs/maintenance/refactor-roadmap-2026-06-23.md`、`docs/maintenance/pr-split-plan-2026-06-23.md` 和 `docs/maintenance/final-acceptance-gap-audit-2026-06-23.md`。
2. 用 `git status --branch --short`、`rg` 和目标目录 README 确认当前代码事实、已有审计记录和未提交变更。
3. 如果计划涉及扩展边界、发布、WebUI、API、配置、IAM、错误契约或数据迁移，同时使用对应仓库专项 skill。

## 计划原则

- 总计划入口放在 `docs/maintenance/refactor-roadmap-<date>.md` 或更新当前有效路线图。
- 拆分审查或外部 PR 计划放在 `docs/maintenance/pr-split-plan-<date>.md`。
- 阶段审计、验证证据和差距分析放在 `docs/maintenance`、`docs/testing` 或 `docs/release`；不要写入根目录散落文件。
- 新增计划或重要索引时，必须在 `docs/README.md` 和 `docs/maintenance/README.md` 挂接，避免用户找不到。
- 计划状态只能写成“已验证”“部分验证”“待验证”“阻塞”这类可被证据支持的结论；不得把目标或愿望写成已完成。
- 活跃 `/goal`、长期任务或多阶段重构未完全证明完成时，不得宣告最终关闭；只能说明当前阶段完成和下一步。

## 编写流程

1. 定义范围：说明本计划覆盖的阶段、目录、能力和排除项。
2. 收集事实：列出代码入口、脚本、文档、测试、运行证据和已知缺口。
3. 拆阶段：沿用项目十阶段口径，必要时补充子阶段和 PR 拆分边界。
4. 绑定证据：每个阶段至少关联一个代码事实、文档入口、验证命令或风险记录。
5. 标注下一步：给出最小下一步，不把长期大目标伪装成一次性完成项。
6. 同步入口：更新 `docs/README.md`、`docs/maintenance/README.md` 和相关 release/testing 索引。

## 阶段报告

阶段结束时按用户要求输出：

```md
## 当前阶段
## 分析结果
## 变更内容
## 架构影响
## 验证结果
## 文档更新
## 剩余问题
## 下一阶段建议
```

涉及长期目标时，额外说明完成比例、已验证证据、未验证项、阻塞环境和推荐的下一轮切入点。

## 验证

按变更范围选择：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
git diff --check
```

任务结束且有文件变更时使用 `$git-conventional-commit` 收尾。
