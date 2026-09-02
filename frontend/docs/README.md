# Frontend 文档手册

本文是 `frontend/` 文档体系的唯一入口。阅读顺序固定为：

```text
frontend/README.md → 本文（docs/README.md） → 主题 authority → 局部 README / AGENTS
```

`frontend/README.md` 保留项目定位、三层架构摘要与最短运行入口；本文承接完整说明、
架构脉络、能力 authority、开发约束与维护规则。任务级历史证据在 `docs/changes/`，
研究快照在 `docs/changes/<seq>/research/`；它们用于追溯“为什么这样做”，
**不替代**本文与主题文档的“当前如何做”。

## 1. 架构地图（当前）

```text
Universal Frontend Foundation
  design-system / ui-adapter / form-foundation / i18n / core / schemas / types
        ↓
Admin Product-Surface
  packages/admin-foundation      可复用 Admin 视觉、Layout、Pattern、State、Motion
  packages/admin-framework      Plugin Contract、Route Target、Registry、Host Capability
  surfaces/admin                Admin Surface 插件实现（private workspace，plugins 非公共 API）
        ↓
Application = Product Surface × Runtime Host
  apps/admin-web                Next.js、Browser Runtime、Host Port 实现、Composition Root
```

- Universal 禁止依赖 Surface/Host；Surface 只能依赖 Universal 或同 surface；
  Host 只能装配与其匹配的 Surface。机器可读分类以 `tooling/foundation-policy.json` 为准。
- Product Surface 与 Runtime Host 是正交维度。未来只有真实需求出现时才创建
  `packages/<surface>-foundation` 与 `apps/<surface>-<runtime>`，不预造空 Package 或 Runtime Contract。
- 101 起引入“Framework / Surface 实现 / Codegen”一层：Admin Framework 不读取 pathname、
  不维护 history、不复制 Next Route Runtime；唯一真实 Router 是 Next.js App Router。
  详见 [Admin Framework 与 Surface File Routes](admin-framework.md)。

## 2. 主题 authority 清单

| 文档                                                         | authority 范围                                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [Universal Frontend Foundation](frontend-foundation.md)      | Universal 层 workspace 职责与禁止项                                              |
| [Admin Product-Surface Foundation](admin-foundation.md)      | `admin-foundation` 的 Layout/Shell/Pattern/Collection/Detail/Form/State 能力     |
| [Admin Framework 与 Surface File Routes](admin-framework.md) | Framework 契约、Registry、Surface 私有边界、File Route、Codegen、Host Capability |
| [Foundation 扩展治理](foundation-extension-governance.md)    | 业务请求扩展 Foundation 的顺序与完整环节                                         |
| [UI Element System](ui-element-system.md)                    | UI Element 分类、Form Control、Anchored Overlay、Composition 契约                |
| [UI 视觉校准基线](ui-visual-calibration.md)                  | TailAdmin 外部校准基线、矩阵与复核触发器                                         |
| [Motion Foundation 与语义动效分层](motion-foundation.md)     | Motion Token/Recipe/决策树、Reduced Motion 与中断安全                            |
| [Foundation 质量证据](quality-evidence.md)                   | 当前门禁数字、预算、Playwright/Axe/Visual 证据与历史证据入口                     |

可执行 authority（页面）与文档 authority 互补：`/ui-elements/*`、`/motion`、
`/admin-patterns/*`、`/admin-reference/*`、`/reference-resources` 分别承担
Universal Element、Universal Motion、Admin Pattern、Admin Archetype 与 Surface 插件场景的验收。

## 3. 运行与验证

```powershell
pnpm install
pnpm dev          # http://127.0.0.1:4173
pnpm check        # 完整门禁（含 docs:check）
pnpm docs:check   # 文档结构门禁（入口、链接、索引、必备 authority）
```

如果新增或修改了 Admin Surface 插件/路由，先运行 `pnpm codegen:admin`，再运行
`pnpm codegen:admin:check`（freshness 纳入 `pnpm check`）。

## 4. 文档维护规则

- 一个主题只能有一个当前 authority；主题文档不复制另一篇的完整正文，使用链接。
- 局部 README / AGENTS 说明目录职责、契约、资源所有权与命令，并回链主题 authority。
- 文档必须随真实实现同步演进；实现已替换时不得保留旧设计作为当前说明。
- `docs/changes/` 是任务账本：每个带非文档实现的变更目录含
  `README.md + research/ + requirements/ + design/ + tasks.md`；它只保存历史证据，
  当前有效结论必须落在本文与主题文档。
- 涉及产品范围、兼容、migration、历史数据或模块保留/移除时，先读仓库根
  [repository-scope](../../docs/repository-scope.md) 与前端变更记录，再决定是否新建变更。

## 5. 变更记录导航

任务级研究、需求、设计与实施证据按序号组织，索引见 [变更记录索引](changes/README.md)。
历史变更不再作为当前架构 authority。
