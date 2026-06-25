---
name: git-conventional-commit
description: "Use this skill at the end of every repository task that changes files, before the final response, to review the worktree, run scope-appropriate validation, stage only intended files, and create a Conventional Commits git commit. Triggers on task completion, git commit, commit message, Conventional Commits, finishing implementation, documentation changes, refactors, fixes, tests, and project-maintenance work."
---

# Git Conventional Commit

在每次任务收尾时，把已完成变更收敛成一个可审查、可追溯、符合 Conventional Commits 的提交。除非用户明确要求不要提交，任务结束前必须使用本 skill。

## 收尾流程

1. 读取当前状态：
   - `git status --branch --short`
   - `git diff --stat`
   - `git diff --check`
2. 按变更范围运行验证：
   - 仅文档 / Agent 规则 / skill：至少运行 `git diff --check`；涉及发布、入口、插件、品牌或 readiness 文档时追加对应检查脚本。
   - Go 代码：运行受影响包测试；跨配置、HTTP、模块、types 或 app 装配时运行 `go test ./... -count=1 -mod=readonly`。
   - 前端代码：运行 `pnpm --dir web/app typecheck`；用户可见文案追加 `pnpm --dir web/app lint:i18n`；可见 UI 或流程变更按风险追加测试、构建或视觉 QA。
   - 发布候选、阶段收口、大规模重构：运行 `powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1`。
3. 审查 diff，确认没有混入：
   - 用户未要求的文件。
   - `.env`、本地配置、运行态数据、生成目录、测试报告。
   - 未验证的依赖锁文件、构建产物或临时文件。
4. 只暂存本次任务相关文件：
   - 使用显式路径 `git add <path...>`。
   - 不使用 `git add .`，除非本次任务明确覆盖整个工作树且已审查全部 diff。
5. 生成 Conventional Commits 信息并提交。
6. 提交后复查：
   - `git status --branch --short`
   - `git log -1 --oneline`

## 提交信息规则

格式：

```text
<type>(<scope>): <subject>
```

允许的 `type`：

- `feat`：新增用户可见能力、模块、API、页面或脚本能力。
- `fix`：修复缺陷、漂移、错误行为或验证失败。
- `refactor`：不改变外部行为的结构调整。
- `docs`：仅文档、README、AGENTS 或注释说明。
- `test`：新增或调整测试。
- `build`：构建、依赖、CI、发布包或 Docker 相关。
- `chore`：维护性任务、脚本清理、仓库治理。
- `style`：格式化或纯样式调整，不改变行为。

`scope` 使用稳定目录或能力名，例如：

- `docs`
- `agents`
- `skill`
- `api`
- `web`
- `iam`
- `system`
- `announcements`
- `release`
- `config`
- `types`

`subject` 使用英文祈使句，首字母小写，不以句号结尾，长度尽量控制在 72 个字符内。

示例：

```text
docs(release): clarify evidence capture workflow
feat(announcements): add public announcement listing
fix(api): return validation errors with field context
chore(skill): add conventional commit workflow
```

## 自动提交边界

必须自动提交：

- 本次任务修改了文件。
- 验证已按风险范围完成，或无法运行的原因已经明确记录。
- diff 只包含本次任务相关内容。

不得自动提交：

- 用户明确要求不要提交、只查看、只分析或只给方案。
- 工作区存在与本次任务无关的用户改动，且无法可靠分离。
- 验证失败且失败不是已明确接受的环境缺口。
- diff 中包含密钥、本地配置、运行态数据、生成目录或未解释的大型产物。
- 当前处于未完成的合并、rebase、cherry-pick 或冲突状态。

遇到不得自动提交的情况时，停止提交并在最终回复中说明原因、已验证内容和建议的下一步。

## 最终回复要求

完成提交后，最终回复必须包含：

- 提交 hash 与提交信息。
- 主要修改文件。
- 已运行验证命令和结果。
- 如果仍有未提交变更，说明原因。

在 Codex 桌面环境中，成功暂存和提交后按宿主规则输出对应 `::git-stage{...}` 与 `::git-commit{...}` 指令。
