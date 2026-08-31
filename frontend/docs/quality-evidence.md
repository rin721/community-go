# Foundation 质量证据

`pnpm check` 是完整门禁入口，按顺序执行 Foundation、Architecture、Dependency、Lint、Type、Vitest、Next Build、Performance、Playwright/Axe/Visual 与 Format 检查。

新增 Universal Element 至少证明 Variant/State、DOM Contract、键盘/Focus/ARIA、Dark、Compact、英文扩张与 Overlay 打开态。新增 Admin Pattern 至少证明正常、空、错误、只读、禁用、处理中、部分受限、长文本与窄屏退化。Page Archetype 使用确定性 URL 独立打开，不依赖模拟 API。

当前预算不因新增页面提高：首屏 JS 400 KiB、最大 Route JS 430 KiB、CSS 48 KiB、最大 Chunk 200 KiB（均为 gzip）。阈值变化必须有独立研究和确认，不能用于掩盖回归。

098 最终证据：Foundation registry 覆盖 9 个 workspace、8 个 Contract owner；Architecture 检查覆盖 135 个源文件；29 个 Vitest、29 个静态路由和 41 个 Playwright 用例通过。性能结果为首屏 323,500 B、最大路由 414,676 B、CSS 44,918 B、最大 Chunk 84,883 B，均未调整既有预算。七类 Admin Page Archetype 在 1440、1920、768、390 四档视口完成 overflow 验证，并在桌面与移动档完成 Axe。
