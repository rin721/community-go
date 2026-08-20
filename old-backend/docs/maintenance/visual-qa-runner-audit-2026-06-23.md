# 视觉 QA 编排脚本审计：2026-06-23

本文记录第十阶段后续“可见 UI 与发布证据”补证。结论以当前 Playwright 配置、e2e 用例、截图产物和新增脚本为准，不把历史截图报告视为唯一事实来源。

## 当前事实

- React 前端已有 `web/app/playwright.config.ts`，覆盖 `1440x900` 桌面和 `390x844` 移动端。
- `web/app/playwright.visual.config.ts` 基于基础配置开启通过用例截图，并输出到 `tmp/qa/visual-qa`。
- `web/app/tests/e2e/smoke.spec.ts` 是当前唯一 e2e 入口，已覆盖公开页、登录、初始化向导、后台仪表盘、IAM、System、媒体、版本、字典、参数、审计、探针和 Announcements 模块。
- 既有视觉证据记录在 `docs/testing/visual-qa-2026-06-22.md`，但复跑命令较长，发布前容易漏掉代表性页面或截图产物校验。

## 新增脚本

新增 `scripts/visual-qa.ps1`，作为根目录视觉 QA 编排入口：

- 默认运行代表性用例：
  - 公开首页；
  - 公开公告；
  - 后台仪表盘；
  - 后台公告管理与无写权限状态；
  - 初始化 owner 流程。
- 默认同时运行 `desktop` 与 `mobile` 两个 Playwright project。
- 默认清理 `tmp/qa/visual-qa` 后重新生成截图，避免旧截图误判。
- 默认校验至少生成 12 张截图。
- 支持 `-Grep` 聚焦某一组用例，支持 `-All` 对 `smoke.spec.ts` 全量截图。

## 架构影响

本阶段不改变前端运行时、API client、路由或组件结构，只把已有 Playwright 视觉能力从“文档中的长命令”收敛为可重复脚本。发布前 gate 通过 `-IncludeVisualQA` 显式启用视觉 QA，默认 gate 只做脚本语法检查，避免每次本地收口都启动浏览器。

这保持了两个边界：

- 视觉 QA 证明页面可读、可操作和响应式状态，不替代后端 API、权限、持久化或生产部署证据。
- 默认代表性用例不等于全量后台页面视觉验收；新增模块或高风险 UI 仍应使用 `-Grep` 或 `-All` 分批补充截图和 QA 报告。

## 验证结果

已执行：

```powershell
$null = [scriptblock]::Create((Get-Content -LiteralPath 'scripts/visual-qa.ps1' -Raw)); 'visual QA syntax ok'
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1 -All -MinimumScreenshots 120
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -IncludeVisualQA
```

结果：

- 脚本语法检查通过。
- 默认视觉 QA 通过，生成 12 张截图。
- 全量视觉 QA 通过，`smoke.spec.ts` 的 120 条桌面/移动端用例全部通过并生成 120 张截图；证据见 [2026-06-23 全量视觉 QA 基线](../testing/visual-qa-full-2026-06-23.md)。
- 发布前 gate 的 `-IncludeVisualQA` 集成验证通过，实际执行视觉 QA 后继续完成 Docker 脚本语法和空白检查。
- 抽查移动端后台仪表盘、后台公告无写权限状态和初始化 owner 流程截图，页面主内容、导航、表单和动作区均可读；未发现明显文字重叠或首屏被侧栏遮挡。

## 文档更新

本阶段同步更新：

- `scripts/README.md`
- `docs/testing/test-matrix.md`
- `docs/release/preflight-checklist.md`
- `docs/release/release-evidence-template.md`
- `docs/release/deployment.md`
- `docs/maintenance/open-source-readiness.md`
- `docs/maintenance/final-acceptance-gap-audit-2026-06-23.md`
- `docs/maintenance/final-open-source-readiness-audit-2026-06-23.md`
- `docs/maintenance/release-preflight-script-audit-2026-06-23.md`

## 剩余问题

| 问题 | 原因 | 后续动作 |
| --- | --- | --- |
| 全量后台页面截图需要随代码持续刷新 | 当前已为 `smoke.spec.ts` 生成全量截图基线，但截图目录不入库，后续变更会使本地证据过期 | 新增后台模块或发布候选时用 `scripts/visual-qa.ps1 -Grep "<用例名>"` 或 `-All` 重新补证 |
| 视觉证据来自 Playwright mock 链路 | 当前目标是 UI 结构和交互状态检查，不是生产环境数据验收 | 正式发布仍需目标环境 smoke、权限账号和生产数据抽查 |
| Docker 与生产部署视觉未补证 | 当前机器缺少 Docker CLI 和 Bash，且没有目标环境 | 在具备 Docker/目标环境的机器运行 `scripts/docker-smoke.ps1` 或 `scripts/docker-smoke.sh`，并补真实地址视觉抽查 |

## 下一阶段建议

1. 把 `-IncludeVisualQA` 纳入可见 UI 变更的发布前 gate。
2. 新增后台页面时，先补 Playwright smoke，再用 `scripts/visual-qa.ps1 -Grep "<页面用例>"` 生成截图。
3. 发布候选前对 `scripts/visual-qa.ps1 -All` 的耗时和截图数量做一次 CI 或本机基线记录。
