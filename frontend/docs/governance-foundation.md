# Governance Schema Foundation 与 Schema-Controlled Frontend Authority

本文件是 `/frontend` Governance Schema Foundation 主题的唯一当前 authority。
它描述：`packages/schemas` 作为统一 Schema Contract + Governance API Foundation 的
职责边界；正式 Frontend Authority 如何在自己的 Ownership 内维护 Authority Schema
（Schema-Controlled Authority）；确定性 Governance Composition → Resolved
Governance Model；Development Governance Channel；以及 Declarative Authority 的
Structured Source of Truth + Generator 产物规则。

## 1. 核心原则

1. **Authority owns capability；Authority owns Schema；Schema exposes Authority
   governance API。** 谁拥有能力，谁就拥有该能力对应的治理 Schema。
2. Schema Layer（`packages/schemas`）只能通过**显式导入的 Authority Schema 路径**
   认识一个 Authority（各 package exports `./governance`）；不扫描 Authority 私有
   源码、不解析未知目录结构、不反向猜测 Token、不从组件实现推导 Contract、不硬编码
   某个 Authority 的规则。
3. `packages/schemas` **不拥有任何具体治理事实**：Design Token 值、Product Visual
   Language、Surface Rule、Pattern、Motion、State、Plugin Rule、Dependency Rule、
   Architecture Rule 都不在 schemas 内。它只负责统一契约、runtime validation、
   Capability / Scope / Constraint 公共词汇、Composition 纯规则与跨 Authority 一致
   的数据结构。
4. **Declarative Authority 只有一个 Source of Truth。** 可稳定生成的结构化事实
   （如 Design Token）由 Structured Source 拥有，Generated Artifact（CSS / TS /
   Mapping）由 Generator 产出并禁止人工维护；Generated Artifact 不得反向解析成为
   Source（禁止双向维护）。
5. **Implementation-backed Authority 不被强制代码生成。** UI Adapter、Component
   Contract、Pattern、State Foundation、Plugin Framework 等复杂 Runtime 能力保持
   Existing Implementation + Authority Schema（Schema 负责治理/约束/验证/诊断/API
   暴露）。这不是 Low-code Framework。
6. **Governance Composition 只组合，不重新拥有治理事实。** Resolved Governance
   Model 是当前架构的机器可读治理投影，不是新的 Authority。
7. **Development Governance Channel 只通信和编排**，不是通用 RPC / Event Bus /
   Plugin A↔B 通信 / Host 私有能力逃逸口。
8. **Plugin 只消费治理 Capability**，不依赖 Authority 私有实现。
9. **Project Design 与 User Preference 分离**：User Preference 只允许修改被 Schema
   声明为 `user-customizable` 的能力，经 `state-foundation` runtime persistence，
   绝不写回 Authority Source。
10. **不新增第二套 Schema / Governance Contract / Design System 基础设施。**

## 2. 分层

```text
packages/schemas                        统一 Schema Contract + Governance API Foundation
   ▲ 显式 import（各 package exports ./governance）
Authority Schema                        各 Authority 自己维护（governance.ts）
   │
   ▼ 确定性发现与汇聚
tooling/authority-codegen               package.json exports 含 ./governance 即正式 Authority
   │ composeGovernance（schemas 纯函数）
   ▼
apps/web/src/governance/generated-model.ts   @generated Resolved Governance Model
   │
   ▼ createGovernanceApi（schemas；capability×mutability 门禁）
Development Governance Channel          plugin-framework /governance-channel（Port → Provider → hooks）
   │
   ▼
Governance Plugin（Control Plane UI）   只消费 Channel；不拥有治理事实
```

| 层                             | 归属                                                       | 职责                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Schema Contract Foundation     | `@community-go/schemas`（`./governance`）                  | 契约词汇、Diagnostics、Composition 纯规则、Governance API（inspect/read/validate/diagnose/preview/diff/devOverride）；不含治理事实  |
| Authority Schema               | 各正式 Authority package（`./governance`）                 | Authority identity/reference、Domain/Node、Value type、Constraint、Scope/Mutability、Supported Capability、Preview、关联与 Evidence |
| Governance Composition         | schemas 纯函数 + `tooling/authority-codegen`               | 加载正式 Authority Schema → schema 校验 → identity/namespace/冲突检测 → capability 标准化 → Resolved Model                          |
| Resolved Governance Model      | `apps/web/src/governance/generated-model.ts`（@generated） | 机器可读治理投影；不是 Authority                                                                                                    |
| Development Governance Channel | `plugin-framework /governance-channel`                     | Port 契约 + Provider + hooks；只服务 Governance Control Plane                                                                       |
| Governance Plugin              | `surfaces/plugins/governance`                              | 可视化 Control Plane UI；可整体删除而不影响真实 Authority                                                                           |

## 3. Schema Contract Foundation（packages/schemas）

`@community-go/schemas` 根入口保留 `FoundationSchema` / `SchemaIssue` /
`getSchemaIssues`（表单与运行时校验契约）；`./governance` 子路径提供治理基础：

- **vocabulary**：`GovernanceMutability`（readonly / fixed / project-configurable /
  user-customizable / runtime-policy / diagnostic-only）、`GovernanceScope`
  （universal / surface / host）、`GovernanceCapability`（inspect / read / validate /
  diagnose / preview / draft / diff / dev-override / project-author / user-override）。
  治理能力**不是** `configurable: true/false`；每 Node 由 Authority 声明支持子集，
  Schema API 不能由中央层自行扩大权限。
- **contract**：`GovernanceContribution`（Authority → Domain → Node）与 zod 校验
  Schema；`GovernanceConstraint`（可读、可解释、可机器校验；不内嵌 value schema
  对象——值校验由 Authority 自有工具承担，治理层不复制）。
- **diagnostics**：标准化 `GovernanceDiagnostic`（保留 authorityId/domainId/nodeId
  可追溯）与收集/收敛/格式化纯函数。
- **consistency**：mutability × capability 白名单纯规则（固定只读 Mutability 禁止
  写类操作；`user-override` 需要 `user-customizable` 等），Channel 能力门禁与 UI
  过滤共用单一实现。
- **compose**：`composeGovernance(contributions)` 确定性汇聚；任何 error 级诊断 →
  throw（含格式化文本），绝不静默 drop。
- **draft**：`GovernanceDraft` / `GovernanceDiff` / `GovernanceChange` 与纯规则
  （create/describe/apply，无副作用；Authority Commit 属未来正式能力）。
- **api**：`createGovernanceApi(model, env)` 统一 Governance API——每个操作先做
  capability 门禁，未声明即返回标准化诊断（不抛错、不静默执行）；devOverride 可用
  性由 env（Host 注入 dev-only 环境）决定。

## 4. Authority Schema（谁拥有能力，谁拥有治理 Schema）

每个正式 Authority 在自身 package 内维护 `src/governance.ts`，经 package.json
exports `./governance` 显式暴露，导出 `governanceContribution`。命名与出口遵循
项目既有 subpath exports 规范，不要求机械统一文件名；`exports` 集合由
`tooling/foundation-contracts.json` 门禁强制与 package.json 一致。

当前正式 Authority（各自拥有事实并在 Governance Schema 中描述能力边界）：

| Authority          | package exports `./governance`                | 主要治理 Domain（示例）                                                    |
| ------------------ | --------------------------------------------- | -------------------------------------------------------------------------- |
| Design System      | `@community-go/design-system/governance`      | visual-language、motion-primitive                                          |
| Surface Foundation | `@community-go/surface-foundation/governance` | surface-space、page-pattern、screen-recipe                                 |
| UI Adapter         | `@community-go/ui-adapter/governance`         | component-contract、heroui-isolation、overlay                              |
| State Foundation   | `@community-go/state-foundation/governance`   | store-contract、persistence、storage、namespace、hydration                 |
| Plugin Framework   | `@community-go/plugin-framework/governance`   | plugin-contract、registry、navigation、host-capability、ownership-boundary |

约束：

- Contribution **不复制** Authority 中已有的具体 Token / 组件实现 / store 规则 /
  plugin 规则等事实；以 `source` / `evidence` 定位事实载体（`source` 指向真实文件/
  子路径，evidence 指向测试/文件）。Node evidence 是治理展示信息；顶层文件级
  evidence 存在性由 `foundation-contracts` 门禁校验。
- 不同 Node 只暴露自己真正支持的治理操作：例如 HeroUI Isolation 与 Plugin
  Ownership Boundary 只 `inspect / diagnose`（诊断/边界类）；Semantic Color /
  Radius 等固定 Token 是 `fixed` 只读；Density 带真实用户偏好语义可声明
  `user-customizable`；Motion debug 档位属 `runtime-policy`（由 Host Motion Policy
  决定，dev-override 只是开发期 Inspector 能力）。

## 5. Design System：Declarative Authority 的 Structured Source of Truth

Design System 的 Declarative Token 事实（颜色 / 圆角 / 间距 / 阴影 / z-index /
motion 数值档位 / @theme 语义映射）是**第一批完整 Schema-Controlled 实证**：

```text
packages/design-system/src/token-source/（纯 TS 数据，唯一 Source of Truth）
   ├── semantic-colors.ts    Semantic Color Roles（light/dark）
   ├── theme-scale.ts        radius/spacing/shadow/z-index/font/transition 映射
   ├── motion.ts             motion duration/distance/delay 档位与用途语义
   └── token-source.schema.ts（zod 结构契约：Source 本身可验证）
        │
        ▼ tooling/token-codegen（`pnpm codegen:tokens`）
packages/design-system/src/tokens.css（Generated Artifact）
```

- `tokens.css` 首行固定为 generated header；`pnpm codegen:tokens:check` 纳入
  `pnpm check` 做逐字节 freshness（缺失/漂移/手改即 fail）；`architecture:check`
  亦校验首行 header（人工修改 Generated Artifact 被 Gate 检测）。
- `boundary-policy` 的"`tokens.css` 是唯一硬编码颜色权威"特判路径不变；但该文件
  现在是 Generated Artifact，**不允许人工维护**。修改设计值 = 修改 token-source →
  重新生成。
- `motion.css` 是 Implementation-backed CSS 事实（keyframes/recipe 规则），保持
  人工维护，不做 Schema 生成化（不是所有 Authority 都必须生成代码）。
- 其它 Implementation-backed Authority（UI Adapter / State Foundation / Plugin
  Framework / Surface Foundation）保持 Existing Implementation + Authority Schema，
  不做 Schema → 代码生成。

## 6. Governance Composition 与 Resolved Governance Model

- `tooling/authority-codegen/codegen.mjs` 是确定性 discovery：遍历 `packages/*` 的
  package.json，exports 含 `./governance` 即正式 Authority（排除
  `@community-go/schemas` 自身——它是 Contract Foundation 不是 Authority）；用
  Node type-stripping 加载各 `governance.ts`（type-only import，无副作用）；渲染
  `apps/web/src/governance/generated-model.ts`（generated header + prettier）。
- **无长期手工维护的中央 `governance-registry.ts`**：新增/删除 Authority Schema =
  增删某 package 的 `./governance` 出口，重跑 `pnpm codegen:governance` 即收敛；
  `pnpm codegen:governance:check` 纳入 `pnpm check`（freshness：missing/drift/手改）。
- 完整规则校验（identity/namespace/冲突/capability×mutability）由
  `composeGovernance` 在 `apps/web` 的 generated-model.ts 模块顶层执行——任何
  import 该模块的测试/构建都会 deterministic 暴露违规；authority-codegen 只做
  存在性/导出形状预检，不复制规则。
- Resolved Governance Model 是投影，不是新 Authority；每个 Node 保留
  authorityId/domainId/nodeId 追溯。

## 7. Development Governance Channel

- 数据契约复用 `@community-go/schemas/governance` 类型（不复制）；`plugin-framework
/governance-channel` 提供 `DevelopmentGovernancePort`（inspect/read/validate/
  diagnose/preview/diff/devOverride 的薄封装）、`GovernanceChannelProvider`、
  `useDevelopmentGovernance`（未安装即 throw）。
- 实现由 Host 装配（`apps/web/src/host/governance-channel.tsx` 内部
  `createGovernanceApi(resolvedGovernanceModel, env)`）；装配边界是 `/governance`
  路由组 layout（`apps/web/src/app/governance/layout.tsx`），**不在全局 Root
  Provider 装配**——避免 Governance Model 数据与 zod 校验进入所有页面的生产
  initial bundle（性能预算约束）。能力门禁在 schemas 层执行，Host 不复制规则；
  非治理页面未装配 Channel，`useDevelopmentGovernance` 会 throw（保持失败语义）。
- devOverride 仅 `NODE_ENV !== 'production'` 可用，写 `sessionStorage`
  （`community-go.governance-override`，参照 motion-policy inspector 先例）；
  production 由 schemas 门禁返回 `GOV_DEV_OVERRIDE_UNAVAILABLE`。
- Channel 不是通用 RPC / Event Bus；不暴露 Host store/router/i18n 等私有能力；
  Plugin 无法借此做 Plugin A↔B 隐式通信。

## 8. Governance Plugin（Control Plane UI）

`surfaces/plugins/governance`（mount `/governance`，development group）是治理类
Plugin 的真实消费方：

- 只经 `useDevelopmentGovernance` 消费 Resolved Governance Model；**不拥有任何治理
  事实**；不能成为任何 Authority Owner。
- 本轮实现最小 Dashboard（Authority / Domain / Node、Mutability / Scope /
  Capabilities / Evidence 与诊断概览）；其余 Inspector / Explorer / Appearance /
  Draft Editor / Preview / Diff / Dev Override UI 按真实用例登记未来触发（不虚假
  实现）。
- **删除整个 Governance Plugin 只意味着失去可视化治理入口**：Design System /
  Surface Foundation / UI Adapter / State Foundation / Plugin Framework 仍独立
  工作（依赖扫描与既有测试证明）。

## 9. 门禁与验证

- `pnpm check` 全门禁：foundation / architecture / dependency / codegen:plugins /
  codegen:tokens / codegen:governance / lint / type / test / build / performance /
  browser / docs / format。
- Generated Artifact（tokens.css、generated-model.ts、generated plugin 产物）都带
  fixed generated header 且纳入 freshness；手改被 Gate 检测。
- 治理事实可追溯：任何 Token / Pattern / Rule / Policy / Validation / Diagnostic
  都能经 authorityId 反向追溯到真正拥有该能力的 Authority。

## 10. 边界与未来扩展

- **不新增第二套 Schema / Governance Contract / Design System**；不新增
  `governance-registry.ts` 之类长期手工中央注册。
- Project Authoring / Change Request / Authority Commit、生产态 User Preference
  Override 落地、完整 Inspector/Explorer 全景、以及 Theme / Accessibility /
  Iconography / Responsive / Overlay / Form / Navigation / Persistence / i18n
  Ownership 等未来治理 Domain：只在对应正式 Authority / 真实用例出现后按本文件
  分层扩展，禁止为让 Schema"看起来完整"而虚构 Authority 或 Contract。
