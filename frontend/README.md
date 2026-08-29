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

## 架构地图

- `apps/web`：Web Host，拥有浏览器入口、路由、App Shell 和 Web 专属集成。
- `apps/desktop`：Desktop Host 契约边界；在选定 Desktop Runtime 前不伪造可运行壳。
- `packages/core`：与 UI Library、Host 和数据源无关的纯规则。
- `packages/types`：跨模块稳定共享的 TypeScript 类型。
- `packages/schemas`：运行时数据与表单模型校验。
- `packages/design-system`：语义 Design Token 与主题变量。
- `packages/ui-adapter`：业务可依赖的 UI Contract；HeroUI 只允许从这里直接导入。
- `tooling`：可执行的依赖、样式和第三方边界门禁。

开发规则与禁止项见 [AGENTS.md](AGENTS.md)。
