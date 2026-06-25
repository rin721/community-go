---
name: aoi-admin-open-source-readiness
description: "Repository-specific workflow for open-source reuse readiness in this aoi-admin / open console platform repository. Use when auditing configurable branding, README entry points, docs consistency, module extensibility, plugin-removal convergence, public demo/onboarding suitability, release evidence, or final acceptance gaps before publishing or PR review."
---

# Aoi Admin Open Source Readiness

使用本 skill 做开源可复用性审查和验收证据收口。它关注项目作为后台管理 / 控制台平台被新开发者理解、运行、二次开发和拆分审查时是否仍有品牌、插件、文档、配置、验证或目标环境证据缺口。

## 开始前

1. 阅读 `README.md`、`AGENTS.md`、`docs/README.md`、`docs/maintenance/open-source-readiness.md`、`docs/maintenance/refactor-roadmap-2026-06-23.md`、`docs/maintenance/final-acceptance-gap-audit-2026-06-23.md` 和 `docs/backlog/known-gaps.md`。
2. 用 `rg` 查目标关键词、旧入口、插件残留、不可复用默认值、README 链接、任务计划入口、发布证据和脚本 gate。
3. 区分受控品牌叙事、运行时可配置品牌、历史审计文档、当前事实和未来缺口；不要把历史证据误改成最新状态，也不要把未补证事项写成已完成。

## 审查口径

- 根 README 的 Aoi 项目代号、徽章、Logo 和标星历史是受控品牌叙事例外；运行时代码、配置默认值、API、日志、错误信息、部署示例和前端生产文案仍应可配置、可替换。
- 插件系统已移除，未来扩展走 `internal/modules` 和模块化注册；不得恢复插件协议、插件配置块、插件 API、插件前端入口或远程插件示例。
- 文档描述当前实现；未来能力、目标环境缺证、生产迁移/备份/回滚/密钥/观察窗口缺口进入 `docs/backlog/known-gaps.md` 或日期化验收审计。
- README、docs、AGENTS、目录 README、skill 和脚本说明必须能让新开发者按真实命令运行、验证和二次开发。
- 开源 readiness 不能只靠文字判断；必须尽量引用脚本、测试、构建、CI artifact、视觉 QA 或目标环境证据。

## 工作流程

1. 先运行或审查基础 gate，确定当前失败来自项目缺陷、环境缺工具还是目标环境未补证。
2. 按问题类型修复：品牌/入口收敛、插件防回潮、文档链接、README 覆盖、错误结果边界、部署防线、release evidence、视觉 QA 或任务计划。
3. 修复后同步相关文档入口，避免 README、docs、AGENTS、skill 和脚本说明出现互相矛盾的状态。
4. 如果只能在 CI 或目标环境补证，记录运行 ID、提交 SHA、artifact 名称、日志摘要和仍缺的手工验证项。
5. 最终输出区分“已本地证明”“已 CI 证明”“需目标环境证明”和“仍在 backlog”。

## 常用验证

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-plugin-removal.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-agent-skills.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-readmes.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-doc-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-error-result-boundaries.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-deployment-guardrails.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
git diff --check
```

Docker、GitHub Actions、发布包、视觉 QA 或生产部署证据按范围追加 `$aoi-admin-build-ci-governance`、`$aoi-admin-release-readiness`、`$aoi-admin-visual-qa-governance` 和目标环境命令。任务结束且有文件变更时使用 `$git-conventional-commit` 收尾。
