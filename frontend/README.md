# Community Go Frontend

`/frontend` 是与旧 `webui/` 和 `old-frontend/` 完全隔离的新一代统一前端根目录。当前阶段只建设产品基座，不读取后端接口，也不迁移旧页面、DOM、CSS 或组件。

## 快速开始

```powershell
pnpm install
pnpm dev
```

浏览器访问 Vite 输出的本地地址。完整质量门禁：

```powershell
pnpm check
```

## Reference 与 Showcase

当前基座通过可运行场景而不是孤立 Demo 验证契约：

- `/reference`：48 条确定性数据组成的 Dashboard、筛选、Data Table、Master-Detail、Tabs、Drawer、Dialog，以及 Loading、Empty、Partial Error、Offline、Permission 等状态。
- `/reference/form`：React Hook Form、Zod、Select、Combobox、DatePicker、Tabs 与 sticky footer 组成的复杂表单，覆盖错误、Disabled、Pending 与成功反馈。
- `/showcase`：Action、Field、Overlay、嵌套 Panel、长文本、密度、Locale 和窄屏组合实验场。`?overlay=menu|popover|tooltip|date|command|dialog|drawer` 可直接打开指定浮层。

TailAdmin `UI Elements` 是长期外部视觉校准基准，HeroUI 是交互与可访问性基础，项目最终规范由 Semantic Token、UI Adapter 与 `/showcase` 决定。逐页对照矩阵、内部权威范围和强制复核触发器见 [UI 视觉校准基线](docs/ui-visual-calibration.md)。

这些页面只使用本地确定性数据，不代表已接入业务后端。它们的职责是证明 Layout、Token、UI Adapter、状态模型和 Host Port 能承载后续页面迁移。

## 稳定契约

- `apps/web/src/layouts/page-layout.tsx` 定义页面级 Layout Contract：Header、Toolbar、Filter Bar、Section、Split View 与 sticky actions。
- `packages/ui-adapter` 统一交互组件和全部 HeroUI Floating Layer。业务代码不得使用原生 `<select>`，也不得直接导入 HeroUI。
- `packages/reference` 保存 Host-neutral Feature、确定性场景数据和导出 Port；Web 与 Desktop 分别装配平台实现，共享层不出现平台条件分支。
- `packages/design-system` 保存 Light/Dark 语义 Token；页面不得用硬编码颜色修复局部对比度或状态表达。

## 验证与治理

```powershell
# 单元、类型、Lint、构建等完整门禁
pnpm check

# 仅运行浏览器交互、Axe 与视觉回归
pnpm test:browser

# 经人工确认视觉变化后更新基线
pnpm test:visual:update

# 单独检查架构、运行时依赖和产物预算
pnpm architecture:check
pnpm dependency:check
pnpm performance:check
```

视觉基线覆盖 Reference 桌面/超宽屏、Showcase 桌面权威面、移动端、Dark Mode、英文扩张及 Menu、Popover、Tooltip、DatePicker、Command、Dialog、Drawer 打开态。当前 gzip 预算为：首屏 JS 不高于 400 KiB、全部 JS 不高于 430 KiB、CSS 不高于 48 KiB、最大 JS Chunk 不高于 200 KiB。依赖职责与允许边界记录在 `tooling/dependency-policy.json`。

## 架构地图

- `apps/web`：Web Host，拥有浏览器入口、路由、App Shell 和 Web 专属集成。
- `apps/desktop`：Desktop Host 契约边界；在选定 Desktop Runtime 前不伪造可运行壳。
- `packages/core`：与 UI Library、Host 和数据源无关的纯规则。
- `packages/types`：跨模块稳定共享的 TypeScript 类型。
- `packages/schemas`：运行时数据与表单模型校验。
- `packages/design-system`：语义 Design Token 与主题变量。
- `packages/ui-adapter`：业务可依赖的 UI Contract；HeroUI 只允许从这里直接导入。
- `packages/reference`：可由 Web/Desktop Host 共同装配的 Reference Feature、场景数据与平台 Port。
- `tooling`：可执行的依赖、样式和第三方边界门禁。

开发规则与禁止项见 [AGENTS.md](AGENTS.md)。
