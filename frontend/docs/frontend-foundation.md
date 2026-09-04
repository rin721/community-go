# Universal Frontend Foundation

Universal Foundation 只承载跨 Product Surface 成立的契约。

| Workspace         | 当前职责                                                                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design-system`   | Light/Dark、Density、Contrast、Layout 与 Motion Token；跨 Surface Motion Primitive                                                                                                 |
| `ui-adapter`      | UI Element、Overlay、Accessibility、Keyboard、Focus；唯一 HeroUI/React Aria 边界                                                                                                   |
| `form-foundation` | Schema 驱动的 dirty/pending/reset/首错聚焦/字段桥接；唯一 RHF/Resolver 边界                                                                                                        |
| `i18n`            | runtime、Provider、translation hook 与日期/数字/相对时间格式化                                                                                                                     |
| `core`            | 不依赖 React/Host/数据源的纯语义判断                                                                                                                                               |
| `schemas`         | Universal Schema 类型与结构化 issue + Schema Contract & Governance API Foundation（Authority/Domain/Node、Capability、Composition；不保存 Product/Reference 字段、不拥有治理事实） |
| `types`           | 已证明跨 Workspace 稳定的共享类型                                                                                                                                                  |

Universal 禁止出现 Product Page、Product Workspace、Next Router、Browser/Desktop API、后端 DTO、权限计算和业务状态机。UI authority 为 `/ui-elements/*`，Motion authority 为 `/motion`。

Vendor 类型不得穿透公共 Contract；具体 Surface 通过内容、状态、资源和 Port 组合这些能力。

Universal 之下是 [Surface Foundation](surface-foundation.md)（可复用产品视觉/Pattern）、
[Plugin Framework 与 Surface File Routes](plugin-framework.md)（契约/Registry/Host Capability/Codegen）
与 `surfaces` 插件实现；它们与 Universal 的边界由 `tooling/foundation-policy.json`
与 `tooling/foundation-contracts.json` 机器校验。
