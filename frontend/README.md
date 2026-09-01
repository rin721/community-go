# Community Go Frontend Product Foundation

`/frontend` 是产品统一前端 Monorepo。当前首要成果不是组件库或模板发行，而是可持续演进的 Product Foundation：普通后台业务只选择既有 Layout、Element、Form、State、Motion 与 Admin Pattern，Feature 负责业务语义、Schema、数据、权限和 i18n。

## 三层架构

```text
Universal Frontend Foundation
        ↓
Product-Surface Foundation（当前：Admin）
        ↓
Application = Product Surface × Runtime Host（当前：admin-web）
```

- Universal：`design-system`、`ui-adapter`、`form-foundation`、`i18n`、`core`、`schemas`、`types`。禁止 Admin、Product 或 Host 特有页面语义。
- Admin Surface：`packages/admin-foundation`，拥有 Admin Layout、Shell Navigation、Collection、Detail/Settings、Form Action、State/Operation 与 Admin Motion Recipe。
- Admin Web Host：`apps/admin-web`，只拥有 Next 启动、Router、Browser API、生命周期、持久化和 Surface 装配。

Product Surface 与 Runtime Host 是正交维度。未来只有真实需求出现时才创建 `packages/<surface>-foundation` 与 `apps/<surface>-<runtime>`，不预造空 Package 或 Runtime Contract。

详细边界见 [Universal Frontend Foundation](docs/frontend-foundation.md)、[Admin Product-Surface Foundation](docs/admin-foundation.md) 与 [Foundation 扩展治理](docs/foundation-extension-governance.md)。

## 运行与验证

```powershell
pnpm install
pnpm dev
pnpm check
```

本地入口为 `http://127.0.0.1:4173`。验证 authority 分层如下：

- `/ui-elements/*`：46 个 Universal UI Element 的 Variant、状态、DOM、键盘与 Overlay 验收。
- `/motion`：Async readiness、Viewport Reveal、Content Swap、Disclosure 与 development Motion Inspector。
- `/admin-patterns/*`：Layout/Navigation、Collections/Data、Forms/Actions、States/Feedback、Detail/Settings。
- `/admin-reference/*`：Overview、Resource List、Detail、Create/Edit、Settings、Master-Detail、Operation 七类完整 Page Archetype。

所有场景使用确定性本地数据，只证明前端语义，不模拟后端业务、API、Session、权限计算或任务状态机。

## Foundation Contract

- UI Element 只通过 `packages/ui-adapter` 直接依赖 HeroUI/React Aria。
- Form 生命周期只通过 `packages/form-foundation` 直接依赖 React Hook Form/Resolver。
- locale runtime 与 `Intl` formatter 只通过 `packages/i18n` 直接依赖 i18next/react-i18next。
- Universal Motion Token/Recipe 位于 `packages/design-system`，公共 readiness/presence/media contract 位于 `packages/ui-adapter`；方向性页面转场、Shell 锚定和 Admin 状态 Recipe 位于 `packages/admin-foundation`，Router/Observer/Policy 生命周期止于 `admin-web` Host。
- Reference 场景归验证 Host，不进入公共 Feature Package。
- 公共 exports、owner、成熟度、authority route 与证据登记在 `tooling/foundation-contracts.json`。

扩展顺序固定为：`Element → Variant → Composition → Pattern → Feature Component`。页面特例不得直接扩展全局 Token、公共 Variant 或组件默认行为。

## 自动门禁

- `foundation:check`：Workspace 分类、Surface × Runtime 命名、层级依赖、Contract registry 与 vendor owner。
- `architecture:check`：HeroUI/Host/CSS/Token/DOM 边界与正反 fixtures。
- `dependency:check`：运行时依赖职责和允许 Workspace。
- `typecheck`、`test`、`build`、`performance:check`、Playwright/Axe/Visual 与 `format:check`：共同构成交付证据。

任务研究、需求、设计和实施证据从 [098 变更记录](docs/changes/098-frontend-product-foundation/README.md) 进入；历史变更不再作为当前架构 authority。
