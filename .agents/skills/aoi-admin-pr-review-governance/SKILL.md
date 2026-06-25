---
name: aoi-admin-pr-review-governance
description: "Repository-specific workflow for reviewing local diffs, pull requests, branch changes, merge readiness, risk classification, and verification evidence in this aoi-admin / open console platform repository. Use when the user asks for a review, PR review, pre-merge check, change audit, risk summary, scope split, or validation plan for repository changes."
---

# Aoi Admin PR Review Governance

使用本 skill 审查当前仓库的本地 diff、PR、分支变更和合并前风险。审查时优先找真实缺陷、回归风险、缺失测试和文档漂移；不要把变更摘要放在问题之前。

## 开始前

1. 阅读 `AGENTS.md`、相关目录 README 和变更命中的专项 skill。
2. 获取审查范围：本地 diff 用 `git status --branch --short`、`git diff --stat`、`git diff`；PR 用 GitHub connector 或 `gh pr view`/`gh pr diff`。
3. 确认是否只审查还是允许修复。用户只说“review”时默认只做审查，不修改文件。
4. 不还原用户改动；发现无关改动时隔离说明，审查本次范围内的风险。

## 审查重点

- 架构边界：`internal/app` 装配、`internal/modules` 模块、service-local contract、repository/infrastructure、`pkg` 和 `types` 是否保持依赖方向。
- API 契约：route contract、OpenAPI、权限 catalog、handler DTO、前端 endpoint 表是否同步。
- 配置与品牌：可变策略是否进入配置和示例，根 README 的 Aoi 语境是否没有扩散到运行态硬编码。
- 错误结果：底层是否吞错，handler 是否使用统一响应，前端是否通过 `ApiError` 处理。
- WebUI 与 i18n：可见文案、权限态、空/加载/错误态、桌面/移动端是否闭环。
- 数据与迁移：迁移是否 append-only，GORM 模型、seed/demo 数据、文档和测试是否一致。
- 发布与运维：Docker、CI、runtime smoke、视觉 QA、发布证据是否存在未补证过度声明。

## 输出规则

审查输出按严重度列 findings：

- `P0`：会阻塞启动、构建、数据安全、认证权限或发布。
- `P1`：高概率用户可见回归、权限绕过、数据不一致或契约漂移。
- `P2`：维护风险、测试缺口、文档误导或边界轻微漂移。
- `P3`：低风险改进建议。

每条 finding 包含文件/行号、问题、影响和建议修复。没有发现问题时明确说“未发现阻塞问题”，并说明仍未覆盖的验证。

## 验证建议

按变更范围选择，不为只读 review 自动跑重型命令，除非用户要求或风险很高：

```powershell
git diff --check
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
go test ./... -count=1 -mod=readonly
pnpm --dir web/app typecheck
pnpm --dir web/app lint:i18n
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
```

如果审查后执行了修复并产生文件变更，完成验证后使用 `$git-conventional-commit` 收尾。
