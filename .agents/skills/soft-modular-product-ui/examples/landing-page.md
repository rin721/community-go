# Landing Page Example

## 输入需求
为一个团队协作工具生成 landing page，目标是让新用户创建工作区。输出结构化 UI design spec，整体明亮、柔和、模块化。

## 使用到的 Skill 规则
- `design-tokens.json`：主色、浅色表面、section 间距、按钮圆角、导航柔光。
- `layout-patterns.md`：居中紧凑 hero、功能卡片、方案卡片、FAQ、Footer CTA。
- `component-recipes.md`：Button、Hero、Card、Feature List、Pricing、CTA、Footer。
- `interaction-rules.md`：hover、focus-visible、loading、empty。
- `responsive-rules.md`：desktop 3 列、tablet 2 列、mobile 1 列。
- `content-rules.md`：短标题、短 CTA、中性占位文案。

## 生成策略
页面以一个明确转化目标组织内容。首屏使用短标题、1 行说明和主 CTA；第二段展示 3 个功能卡片；第三段展示工作流预览；第四段展示 3 个方案卡片；最后使用 FAQ 和 CTA 收束。

## 结构草案
1. Top Navigation：标识文本、3 个链接、主 CTA。
2. Hero：H1、短副标题、主 CTA、次链接、轻量产品预览。
3. Feature Grid：3 张功能卡片。
4. Workflow Section：左文右媒体块。
5. Plan Block：3 张方案卡片，推荐项使用浅主色徽标。
6. FAQ：窄容器折叠项。
7. Footer CTA：标题、说明、主 CTA。
8. Footer：简短说明和链接组。

## Token 使用说明
- 主 CTA：`color.brand.primary` + `radius.button.pill`。
- 页面背景：`color.surface.default`。
- 功能卡片：`radius.card.soft` + `color.border.subtle`。
- 推荐方案：`color.brand.primary.soft`。
- Section 间距：`spacing.section.md`，首尾使用 `spacing.section.lg`。

## 响应式说明
- Desktop：hero 使用双栏，功能和方案为 3 列。
- Tablet：hero 堆叠，功能 2 列，方案 2 列。
- Mobile：顶部导航收缩，按钮全宽，功能和方案 1 列，FAQ 保持单列。

## 可访问性说明
- 仅使用一个 H1。
- CTA 为真实链接或按钮语义。
- 产品预览图提供 alt。
- FAQ 支持键盘展开和收起。
- 所有可交互元素具备 focus-visible。

## 质量检查要点
- 主色面积是否克制。
- CTA 是否明确。
- 移动端是否不被底部元素遮挡。
- 方案卡片推荐状态是否不只靠颜色表达。
- 示例数据是否中性可替换。
