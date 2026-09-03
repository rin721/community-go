# Foundation 质量证据

`pnpm check` 是完整门禁入口，按顺序执行 Foundation、Architecture、Dependency、Codegen freshness、Lint、Type、Vitest、Next Build、Performance、Playwright/Axe/Visual、Docs 与 Format 检查。

新增 Universal Element 至少证明 Variant/State、DOM Contract、键盘/Focus/ARIA、Dark、Compact、英文扩张与 Overlay 打开态。新增 Admin Pattern 至少证明正常、空、错误、只读、禁用、处理中、部分受限、长文本与窄屏退化。Page Archetype 使用确定性 URL 独立打开，不依赖模拟 API。

当前预算不因新增页面提高：首屏 JS 400 KiB、最大 Route JS 430 KiB、CSS 48 KiB、最大 Chunk 200 KiB（均为 gzip）。阈值变化必须有独立研究和确认，不能用于掩盖回归。

## 当前证据（102 复核 + Sidebar Navigation 重构）

以对应变更执行时的实际命令输出为准：

- Workspace 分类 11 个（Universal 7 + Admin Surface foundation/framework + `surfaces/admin` 实现 + `apps/admin-web` Host）；`tooling/foundation-contracts.json` 登记 10 个 Contract owner。
- Architecture 检查覆盖 230 个源文件（含 `surfaces/`、`generated/` 与 Host 薄入口）。
- Vitest：`admin-foundation` 34、`admin-framework` 20、`core` 16、`form-foundation` 2、`i18n` 2、`schemas` 1、`admin-web` 75、`admin-surface` 18（合计约 168）。
- 静态路由 34 个（`apps/admin-web/dist` 33 个页面 HTML + not-found），含 `/reference-resources` 四条与 `/system-tools`（icons/preferences）三条 Surface 插件路由。
- Playwright e2e：15 个 spec 文件；`reference-resources.spec.ts` 覆盖列表/创建/详情/编辑、Route Target 导航、imperative 导航、Axe WCAG AA、视觉基线与窄屏英文无溢出；`preferences.spec.ts` / `visual.spec.ts` 已指向迁移后的 `/system-tools/preferences`。
- Performance 最新一次输出：initial ≈ 333,164 B、maxRoute ≈ 423,541 B（`/ui-elements/forms`）、CSS ≈ 46,559 B、最大 Chunk ≈ 84,658 B，均在预算内。
- 已知视觉基线漂移（HEAD 同样复现，与本仓库任务无关，未擅自更新）：`universal-motion-desktop`、`ui-elements-family-status-async`、`admin-foundation` 视觉面、`transition` 时序断言。迁移引起的 `preferences-desktop` 基线已随真实 UI 变化更新。

## 文档体系证据

- `docs/README.md` 是前端文档唯一入口；主题 authority 见其清单。
- `pnpm docs:check` 校验：入口存在、必备 authority 文件存在、内部相对 Markdown 链接可解析、变更索引覆盖最新变更。

## 历史证据

各变更的完整最终证据是历史快照，见 [变更记录索引](changes/README.md)；数字只在对应变更当时有效，不作为当前事实。
