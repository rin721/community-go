---
name: aoi-admin-docs-governance
description: "Repository-specific workflow for synchronizing README, AGENTS, docs, roadmap, backlog, release notes, maintenance audits, and AI skill rules in this aoi-admin / open console platform repository. Use when updating documentation from code facts, correcting doc drift, changing project rules, adding task plans, editing docs/maintenance, or adjusting .agents/skills metadata."
---

# Aoi Admin Docs Governance

使用本 skill 处理当前仓库的 README、AGENTS、结构化文档、任务计划、已知缺口、发布证据和 skill 元数据同步。文档必须服务真实代码，不得把未来想法写成既成事实。

## 开始前

1. 读取根 `AGENTS.md`、`docs/README.md`、目标目录 README 和相关专题文档。
2. 用 `rg` / `rg --files` 查真实入口、脚本、配置、路由、测试和已有引用；不要只根据未验证文档改文档。
3. 区分文档类型：
   - 长期项目规则：只进入根 `AGENTS.md` 或局部 `AGENTS.md`。
   - 开发者说明：进入 `README.md`、目录 README 或 `docs/**`。
   - 一次性任务证据：进入 `docs/maintenance`、`docs/testing`、`docs/release` 或被忽略的 `tmp/ai`。
   - 未来能力和缺口：进入 `docs/backlog/known-gaps.md`。
4. 保留根 `README.md` 中受控的 Aoi 项目代号、徽章、Logo 和仓库叙事；不要把该例外扩散到运行时代码、配置默认值、API、日志、错误信息或前端生产文案。

## 同步原则

- 文档描述当前行为；模块边界直接写当前入口、配置来源、API contract、数据来源和验证方式，缺失能力写入 backlog。
- 文档、README、注释和 Agent 规则以中文为主；代码标识符、命令、路径和协议名保持技术栈惯例。
- 新增重要目录、模块、脚本或发布 gate 时，同步目录 README、`docs/README.md`、测试矩阵和维护指南入口。
- 更新 Agent 规则时合并、去重、压缩为长期规则；一次性任务提示词不得写入根 `AGENTS.md`。
- 更新 `.agents/skills` 时保持 `SKILL.md` front matter、`agents/openai.yaml` 和触发描述一致。

## 常见任务

### 修正文档漂移

1. 找到真实代码或脚本事实，例如入口命令、配置字段、route contract、i18n locale、构建产物路径、迁移文件或测试命令。
2. 搜索 README、docs、AGENTS、脚本 README 和 release 文档中与当前代码不一致的说法。
3. 用当前事实改写不一致内容；若能力缺失，写入 `docs/backlog/known-gaps.md`，不要写成已完成。
4. 对阶段证据类文档只在确有必要时更新，并保留其时间语境。

### 新增任务计划

1. 放在 `docs/maintenance`，文件名包含日期和主题。
2. 计划应列出阶段、范围、事实依据、验证命令和剩余风险。
3. 在 `docs/README.md` 的对应入口处挂接，避免用户找不到。

### 更新 Agent 规则或 skill

1. 先判断内容是长期规则、局部规则还是可复用执行流程。
2. 长期规则进入根 `AGENTS.md`；可复用流程进入 `.agents/skills/<skill>/SKILL.md`。
3. 规则入口统一使用根 `AGENTS.md` 与 `.agents/skills`，避免 `docs/ai`、根 `ai` 或 `.ai` 形成分散入口。
4. skill 变更后运行 skill 检查。

## 验证

按变更范围选择：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-worktree-convergence.ps1
git diff --check
```

涉及 API、配置、前端文案、发布或 Docker 的文档变更，应追加对应专项 skill 和验证命令。任务结束且有文件变更时使用 `$git-conventional-commit` 收尾。
