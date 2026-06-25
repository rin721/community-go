---
name: aoi-admin-visual-qa-governance
description: "Repository-specific workflow for visual QA, Playwright screenshot evidence, responsive layout checks, accessibility sanity checks, and UI acceptance documentation in this aoi-admin / open console platform repository. Use when changing visible React WebUI pages, admin console workflows, setup/public routes, screenshot scripts, visual QA reports, release visual evidence, or page coverage baselines."
---

# Aoi Admin Visual QA Governance

使用本 skill 处理当前仓库的可见 UI 验收、截图证据、响应式检查和视觉 QA 文档。它补充 `aoi-admin-webui-i18n`，专注于“页面是否能被看懂、能操作、能作为证据复跑”。

## 开始前

1. 阅读 `AGENTS.md`、`web/app/AGENTS.md`、`web/app/README.md`、`scripts/README.md` 和相关页面/feature README。
2. 查清目标页面对应的后端 API、权限、i18n key 和路由；不要用前端假能力掩盖后端缺失。
3. 判断本次是页面实现、视觉复查、截图脚本维护、发布候选验收还是文档补证，并同步使用对应专项 skill。

## 审查重点

- 桌面与移动端至少覆盖 `1440x900` 和 `390x844`。
- 后台页面保持信息密度、表格可扫读、表单可提交、弹窗可关闭、筛选分页可回退。
- 公开页、`/setup` 和 `/admin` 的布局边界清楚，不互相泄漏状态。
- 加载、空状态、错误、403/无权限、只读、禁用和长文本状态都要有可理解表现。
- 焦点可见、键盘可操作、触控尺寸合理、对比度可读，并尊重 `prefers-reduced-motion`。
- 截图证据只能证明可见状态，不能替代 API、权限、持久化或审计验证。

## 执行流程

1. 用 `rg` 找到受影响 route、组件、i18n、API client、Playwright 用例和已有 QA 文档。
2. 先跑轻量检查，再跑截图：i18n、typecheck、聚焦测试或 `scripts/visual-qa.ps1 -Grep "<用例名>"`。
3. 若页面属于发布验收或跨页面流程，运行默认视觉 QA；全量覆盖使用 `scripts/visual-qa.ps1 -All`。
4. 查看截图，不只看命令通过；重点检查遮挡、溢出、错误空白、按钮不可见和移动端断裂。
5. 截图输出默认留在 `tmp/qa/visual-qa`，不要提交临时截图；需要长期留证时整理到 `docs/testing` 并写明视口、路线和残留风险。

## 常用验证

```powershell
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app test
pnpm --dir web/app build
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -Grep "<用例名>" -MinimumScreenshots 4
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -All
git diff --check
```

如果本机浏览器、依赖或服务环境导致视觉 QA 无法运行，最终说明未覆盖的页面、视口、命令、原因和风险，不得写成已通过。

## 文档同步

- 修改截图脚本、视觉覆盖范围或验收证据时，更新 `scripts/README.md`、`docs/testing/test-matrix.md` 或对应 `docs/testing/visual-qa-*.md`。
- 新增页面验收路线时，补充 Playwright 用例或说明为何只做手工截图。
- 发布候选视觉证据变更时，同时检查 `docs/release/preflight-checklist.md` 和发布证据模板。
