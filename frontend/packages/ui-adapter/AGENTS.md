# UI Adapter 开发约束

- 本目录是唯一允许直接导入 `@heroui/*` 的 TypeScript/CSS 边界。
- 只封装会被大量业务长期依赖、替换成本高的语义能力；不按 HeroUI 组件清单机械复制 API。
- 导出的 props 必须属于项目语义，禁止 `extends ComponentProps<typeof HeroComponent>` 让 HeroUI props 穿透。
- Adapter 负责第三方 API 映射、Design Token 映射、交互差异和 Accessibility；不得暴露 HeroUI DOM、slot 名或内部 class。
- 新 Variant 必须对应至少一个真实复用场景；单页视觉差异留在 Feature Composition。
- 组合场景优先提供 `embedded`、`inset`、slot 或 primitive 能力，避免成形组件重复叠加边框、圆角、阴影和 padding。
- 禁止在本目录新增业务文案、路由、数据请求、Host API 或领域状态。
