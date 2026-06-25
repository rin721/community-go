# Mobile Page Example

## 输入需求
为一个移动端内容首页生成 design spec。需要顶部工具栏、底部导航、信息提示条、内容卡片、空状态和错误状态。

## 使用到的 Skill 规则
- `responsive-rules.md`：Mobile App Shell。
- `component-recipes.md`：Navigation、Card、Tag、Button、CTA。
- `interaction-rules.md`：touch、focus、loading、empty、error。
- `content-rules.md`：短标题、短提示、可行动错误文案。

## 生成策略
移动端使用顶部工具栏放菜单和标识，底部导航放高频入口。内容区先放信息提示条，再放当前分组标题和双列卡片。列表为空时显示空状态；请求失败时显示错误卡片和重试按钮。

## 结构草案
1. Top Bar：菜单按钮、标识文本、账户入口。
2. Content：信息提示条、分组标题、筛选标签。
3. Card Grid：双列内容卡片。
4. Empty State：图标、标题、说明、主 CTA。
5. Error State：错误说明、重试按钮。
6. Bottom Nav：3-5 个主入口。

## Token 使用说明
- 顶部栏和底部栏：`container.mobileBar`、`color.surface.translucent`、`shadow.navigation.glow`。
- 内容 gutter：`spacing.4`。
- 信息提示条：`radius.card.default`、`shadow.card.subtle`。
- 卡片标题：`typography.size.sm` 或 `typography.size.md`。
- 触控目标：44x44px 以上。

## 响应式说明
- 390px 宽度下卡片双列，每列约 50% 减 gutter。
- 320px 宽度下根据文本长度切换单列。
- 横屏时降低顶部视觉区高度，保留底部导航安全区。

## 可访问性说明
- 菜单按钮必须有 `aria-label`。
- 底部导航使用 `nav` 和 `aria-current`。
- 卡片链接有可读标题。
- 空状态和错误状态提供下一步操作。
- reduced motion 下抽屉无位移或直接淡入。

## 质量检查要点
- 底部导航是否遮挡最后一个卡片。
- 长标题是否正确折行。
- 触控目标是否足够大。
- 错误状态是否可恢复。
- 空状态是否中性、可行动。
