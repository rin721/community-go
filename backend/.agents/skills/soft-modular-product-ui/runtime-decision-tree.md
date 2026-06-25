# Runtime Decision Tree

## 1. 判断用户要生成的页面类型
- `homepage`：读取首页模板、Hero、Feature List、CTA、Footer。
- `landing`：读取 Landing Page 模板、CTA、Pricing、FAQ 相关规则。
- `product-section`：读取 Product Section、Feature List、Media Block、CTA。
- `content-hub`：读取内容门户、媒体卡片、分类标签、信息条。
- `corporate`：读取企业展示页、服务卡片、数据、评价、footer。
- `mobile`：优先读取移动端响应式、顶部工具栏、底部导航。
- `component-library`：优先读取组件配方和状态规则。

## 2. 判断用户是否提供必要输入
- 若提供主色：进入风格替换流程。
- 若未提供主色：使用默认主色。
- 若提供文案：按内容规则修剪和分层。
- 若未提供文案：使用中性占位文案。
- 若提供技术栈：选择对应 output mode。
- 若未指定技术栈：默认输出 UI design spec。

## 3. 读取 design-tokens.json
建立颜色、字体、间距、圆角、阴影、边框、动效、断点、层级、透明度、模糊、容器和栅格变量。生成时不得绕开语义 token。

## 4. 读取 layout-patterns.md
选择页面框架、hero 模式、section 节奏、卡片网格、CTA 和 footer 组合。不得锁定单一顺序。

## 5. 读取 component-recipes.md
为所需组件补齐用途、结构、token、状态、响应式、可访问性和实现提示。

## 6. 读取 interaction-rules.md
补齐 hover、active、focus、disabled、loading、error、success、empty、scroll、transition、micro-interaction、keyboard 和 touch。

## 7. 读取 responsive-rules.md
生成 desktop、tablet、mobile 三套布局策略。移动端必须检查触控目标、长文本、底部导航遮挡和图片比例。

## 8. 读取 content-rules.md
整理标题、副标题、段落、CTA、空状态、表单提示、错误提示和占位文案。

## 9. 根据输出目标选择 output mode
- 未指定：UI design spec。
- 要代码：选择 HTML/CSS、React、Vue 或 Tailwind。
- 要设计工具描述：选择 Figma prompt。
- 要结构：选择 wireframe outline 或 responsive layout plan。
- 要组件：选择 component library spec。

## 10. 生成结果
生成结果必须包含：
- 设计目标。
- Token 使用。
- Layout 选择。
- 组件清单。
- 状态规则。
- 响应式规则。
- 可访问性规则。
- 技术实现提示或代码。

## 11. 运行 validation-checklist
逐项检查视觉、token、布局、组件、状态、响应式、可访问性、内容和清洁度。

## 12. 运行发布清洁度检查
删除或重写以下内容：
- 真实网址。
- 具名商业标识。
- 专有素材线索。
- 不可授权文案。
- 真实人物、组织或业务数据。
- 固定复刻结构。
- 过程叙述。

## 13. 输出最终结果
结果应简洁、可执行，并明确说明已覆盖的组件、状态、断点和检查结果。
