# Generation Prompts

以下模板可直接交给 AI agent 使用。替换方括号内参数即可。

## 生成官网首页
```text
使用 Soft Modular Product UI Skill 生成一个官网首页。
page_type: homepage
audience: [目标用户]
content_outline: [模块清单或要点]
brand_overrides: [主色、字体、圆角、密度，可为空]
output_mode: [design-spec / react / vue / html-css / tailwind]

要求：
- 使用 design-tokens.json 的语义 token。
- 使用 layout-patterns.md 中的首页组合。
- 包含 hero、功能卡片、产品预览、可信度模块、CTA 和 footer。
- 覆盖 desktop、tablet、mobile。
- 包含 hover、focus、loading、empty、error、success 状态。
- 输出后运行 validation-checklist.md。
```

## 生成 Landing Page
```text
使用 Soft Modular Product UI Skill 生成一个 landing page。
page_type: landing
audience: [目标用户]
goal: [转化目标]
content_outline: [痛点、价值、功能、方案、FAQ、CTA]
output_mode: [默认 design-spec 或指定技术栈]

要求：
- 首屏使用清晰 H1、短副标题和 1 个主 CTA。
- Section 节奏使用 spacing.section.md/lg。
- 价格或方案卡片必须有响应式和可访问性规则。
- 示例文案保持中性、可替换。
```

## 生成产品介绍区
```text
使用 Soft Modular Product UI Skill 生成一个产品介绍区。
page_type: product-section
content_outline:
- 核心能力：[能力列表]
- 用户任务：[任务列表]
- CTA：[动作]
output_mode: [design-spec / html-css / react / vue]

要求：
- 使用 Feature List、Media Block、CTA 的 component recipes。
- 媒体区使用稳定 aspect-ratio。
- 文案先给结果，再给能力，再给行动。
- 移动端堆叠，CTA 可全宽。
```

## 生成移动端页面
```text
使用 Soft Modular Product UI Skill 生成一个移动端页面。
page_type: mobile
audience: [目标用户]
content_outline: [页面内容]
output_mode: [design-spec / react / vue / html-css]

要求：
- 使用顶部 56px 工具栏和底部 56px 主导航。
- 内容 gutter 使用 16px。
- 卡片可双列，长文本和表单单列。
- 所有触控目标不小于 44x44px。
- 包含空状态、错误状态、loading 状态和 focus-visible。
```

## 生成组件规范
```text
使用 Soft Modular Product UI Skill 生成组件库规范。
page_type: component-library
components: [Button, Navigation, Card, Form, Modal, Footer, CTA]
output_mode: component-spec

要求：
- 每个组件包含用途、结构、token 依赖、variants、states、responsive、accessibility 和 implementation notes。
- 状态至少包含 default、hover、active、focus-visible、disabled、loading、error、success、empty。
- 使用中性占位文案。
```

## 生成 Design Tokens
```text
使用 Soft Modular Product UI Skill 为 [项目类型] 输出 design tokens。
brand_overrides:
- primary: [主色，可为空]
- density: [low / standard / high]
- radius: [sharp / default / soft]
- motion: [quiet / standard / lively]

要求：
- 保留 color、typography、spacing、radius、shadow、border、motion、breakpoint、zIndex、opacity、blur、container、grid。
- 每个 token 包含 name、value、role、usage、confidence、modifiable、fallback。
- 不添加非语义命名。
```

## 生成 React 实现
```text
使用 Soft Modular Product UI Skill 生成 React 实现。
page_type: [homepage / landing / product-section / mobile]
tech_stack: React
output_mode: react
content_outline: [模块与文案]

要求：
- 输出组件拆分、props 类型、状态枚举和 CSS variables。
- 不硬编码主色，使用语义 CSS variables。
- 每个可交互组件有 keyboard、focus-visible 和 reduced motion。
```

## 生成 Vue 实现
```text
使用 Soft Modular Product UI Skill 生成 Vue 实现。
page_type: [页面类型]
tech_stack: Vue
output_mode: vue
content_outline: [模块与文案]

要求：
- 输出 props、slots、computed class 和 scoped CSS variables。
- 组件状态通过 props 或 data-state 表达。
- 包含响应式样式和可访问性属性。
```

## 生成 HTML CSS 实现
```text
使用 Soft Modular Product UI Skill 生成 HTML/CSS。
page_type: [页面类型]
tech_stack: plain
output_mode: html-css

要求：
- HTML 使用语义标签。
- CSS 使用 :root variables 映射 design tokens。
- 包含 desktop、tablet、mobile media queries。
- 包含 hover、active、focus-visible、disabled、loading、error、success 和 empty。
```

## 替换色彩风格
```text
使用 Soft Modular Product UI Skill 调整色彩风格。
current_output: [已有 spec 或代码]
brand_overrides:
- primary: [新主色]
- secondary: [新辅助色，可为空]
tone: [科技感 / 高级感 / 极简感 / 企业感 / 产品感]

要求：
- 同步替换主色变体。
- 检查文本对比度。
- 保持组件状态和布局不失衡。
```

## 替换组件风格
```text
使用 Soft Modular Product UI Skill 调整组件风格。
components: [组件列表]
style_overrides:
- radius: [sharp / default / soft]
- card_style: [media / text / data / enterprise]
- density: [low / standard / high]

要求：
- 保留 token 体系。
- 保留状态和可访问性。
- 输出修改前后的规则差异。
```

## 运行质量检查
```text
使用 Soft Modular Product UI Skill 检查以下 UI 输出。
input: [spec 或代码]

请按 validation-checklist.md 检查：
- 美学风格
- design tokens
- layout grammar
- component recipes
- interaction states
- responsive behavior
- accessibility
- content rules
- 发布清洁度

输出：通过项、需修正项、建议修改。
```
