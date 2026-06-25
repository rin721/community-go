# Soft Modular Product UI Skill

该仓库是一套中文 UI Design Skill，用于帮助 AI agent 生成柔和、明亮、轻量、模块化的产品界面。它提供设计变量、布局语法、组件配方、交互规则、响应式规则、内容规则、提示词模板、输出模式和质量检查标准。

## 能解决什么问题
- 将模糊的 UI 需求转成可执行的 design spec。
- 为官网首页、landing page、产品介绍页、企业展示页、内容型页面和移动端页面生成一致的视觉语言。
- 为 Button、Navigation、Hero、Section、Card、Form、Modal、Footer、CTA 等组件生成状态完整的规则。
- 为 HTML/CSS、React、Vue、Tailwind 和 Figma prompt 提供技术栈中立的输出约束。

## 适合生成的页面类型
- 产品官网首页
- 落地页
- 企业展示页
- 产品介绍区
- 内容门户页
- 移动端首页
- 组件库规范
- 响应式布局方案

## 如何被 AI agent 使用
1. 从 `SKILL.md` 开始读取任务入口、触发方式、输入参数和执行流程。
2. 按文件读取顺序加载 token、风格、布局、组件、交互、响应式和内容规则。
3. 按用户指定的 `output_mode` 输出 design spec 或代码。
4. 使用 `validation-checklist.md` 检查结果。
5. 使用发布清洁度检查删除不可复用内容。

## 输入参数准备
- `page_type`：页面或组件类型。
- `audience`：目标用户、阅读环境、业务语气。
- `content_outline`：模块、标题、卖点、CTA、数据项。
- `brand_overrides`：主色、辅助色、字体、圆角、密度、动效强度。
- `output_mode`：design spec、HTML/CSS、React、Vue、Tailwind、Figma prompt 等。
- `tech_stack`：未指定时默认输出结构化 UI design spec。

## 输出结果形态
- UI design spec
- HTML / CSS
- React
- Vue
- Tailwind
- Figma prompt
- Wireframe outline
- Component library spec
- Landing page structure
- Responsive layout plan

## 如何扩展或替换风格
- 调整 `design-tokens.json` 中的语义 token。
- 按 `adaptation-rules.md` 同步更新主色、字体、圆角、卡片密度和动效强度。
- 扩展组件时，在 `component-recipes.md` 中新增同样结构的 recipe。
- 修改布局时，在 `layout-patterns.md` 中新增可组合模式，避免固定页面顺序。

## 如何更新 design tokens
1. 修改 token 的 `value`、`usage`、`modifiable` 或 `fallback`。
2. 保持 token 名称语义化，例如 `color.brand.primary`。
3. 不删除已被组件依赖的 token；需要废弃时新增替代 token。
4. 更新后运行 JSON 校验和全文清洁度检查。

## 如何更新 component recipes
1. 每个组件保持相同结构：使用场景、视觉结构、token 依赖、状态规则、响应式规则、可访问性规则、技术实现提示、禁止事项、生成示例。
2. 新组件必须使用已有 token，新增视觉变量时同步更新 `design-tokens.json`。
3. 示例文案保持中性、可替换、非专有。

## 如何运行质量检查
- 检查文件是否齐全。
- 校验 `design-tokens.json` 是否为合法 JSON。
- 使用全文搜索检查不可出现的痕迹、真实网址、具名商业标识、专有素材线索和固定复刻结构。
- 按 `validation-checklist.md` 检查生成结果是否覆盖视觉、布局、组件、状态、响应式、内容和可访问性。
