# Responsive Rules

## Desktop
- 容器最大宽度使用 `container.content` 或 `container.wide`。
- 导航可为 56px 固定侧栏、顶部栏或二者组合。
- 卡片网格默认 3-4 列，最小列宽 240px。
- Section 上下间距使用 `spacing.section.md` 或 `spacing.section.lg`。
- Hero 可使用双栏、顶部横幅或 dashboard preview。

## Tablet
- 容器宽度使用 88-92vw。
- 卡片网格默认 2-3 列。
- 顶部视觉区高度应降低，避免内容被首屏完全推走。
- 导航可保留顶部栏，也可使用简化侧栏。
- 内容密度略高于 desktop，但触控目标保持 44px 以上。

## Mobile
- 顶部工具栏高度 56px。
- 底部主导航高度 56px，入口 3-5 个。
- 内容 gutter 使用 16px。
- 卡片网格默认 2 列；表单、价格卡、长文本和 FAQ 使用 1 列。
- CTA 可全宽，主按钮优先放在次按钮上方。
- 首屏必须快速呈现核心内容，不让装饰占满屏幕。

## 容器宽度
- `container.content`：桌面主内容。
- `container.wide`：宽屏首屏和展示区。
- `container.narrow`：表单、FAQ、说明文。
- 移动端不设置固定像素宽度，使用 `width: 100%` 和 gutter。

## 栅格变化
```css
.grid {
  display: grid;
  gap: var(--grid-gap);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
}
```

- Desktop：3-4 列。
- Tablet：2-3 列。
- Mobile：1-2 列。
- 卡片高度由内容和媒体比例决定，不能依赖图片加载完成。

## 导航变化
- Desktop 侧栏固定，图标按钮垂直排列。
- Desktop 顶部栏适用于营销页，主入口不超过 6 个。
- Mobile 顶部栏放菜单、标识文本、账户或主操作。
- Mobile 底部栏放最高频入口，当前项使用主色和文字。
- 次级操作进入抽屉、popover 或更多菜单。

## 卡片重排
- 媒体卡片 mobile 可双列，但标题最多 2 行。
- 功能卡片 mobile 使用 1 列或 2 列紧凑图标卡。
- 价格卡 mobile 必须 1 列。
- 数据卡 mobile 可 2 列，但每个数字和标签必须可读。

## 字号缩放
- 不使用 viewport width 直接缩放字体。
- H1 desktop 48-72px，mobile 30-40px。
- H2 desktop 24-36px，mobile 22-28px。
- 正文 mobile 不低于 14px。
- 元信息不低于 12px。

## Section Spacing 缩放
- Desktop：72-96px。
- Tablet：56-80px。
- Mobile：40-64px。
- 相邻内容密集时可减少 section 间距，但标题组和内容组之间至少 24px。

## 图片比例
- 媒体封面：16:9。
- 产品界面预览：16:10 或 4:3。
- 头像：1:1。
- 装饰图形不得参与内容高度计算。
- 图片必须定义 `width`、`height` 或 `aspect-ratio`。

## 移动端触控目标尺寸
- 主按钮高度 44-48px。
- 图标按钮 44px。
- 底部导航项高度 56px。
- 标签高度 32-36px，筛选类标签建议 40px。

## 横竖屏注意事项
- 横屏移动端减少 hero 高度，优先展示内容。
- 底部导航在横屏仍需避开安全区。
- 抽屉宽度不超过 88vw。
- 长表单在横屏可使用两列，但 label 与输入框不得分离。

## 长文本折行策略
- 标题设置合理 `max-width`。
- 英文长词使用 `overflow-wrap: anywhere`。
- 卡片标题最多 2-3 行，并提供详情入口。
- 按钮文字过长时改为换行或使用更短文案，不缩小到不可读。
