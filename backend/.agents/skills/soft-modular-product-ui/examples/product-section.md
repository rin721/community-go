# Product Section Example

## 输入需求
为一个内容管理产品生成产品介绍区。需要展示核心能力、界面预览和行动按钮。输出 React 组件结构。

## 使用到的 Skill 规则
- `component-recipes.md`：Feature List、Media Block、CTA。
- `layout-patterns.md`：Split Narrative、Feature Cluster。
- `content-rules.md`：先给结果，再给能力，再给行动。
- `responsive-rules.md`：双栏转单栏、媒体比例稳定。

## 生成策略
产品介绍区使用左侧文本和 CTA，右侧产品预览卡片。下方补充 3 个功能点。移动端先显示标题和 CTA，再显示预览和功能点。

## 结构草案
```text
ProductSection
- SectionHeader
  - eyebrow
  - h2
  - description
  - actions
- ProductPreview
  - media block
  - status chips
- FeatureList
  - FeatureItem x 3
```

## Token 使用说明
- Section padding：`spacing.section.md`。
- 预览卡片：`radius.card.soft`、`shadow.card.subtle`。
- 功能图标：`color.brand.primary.soft`。
- CTA：`color.brand.primary`。

## 响应式说明
- Desktop：2 列，文本 45%，预览 55%。
- Tablet：2 列变窄，功能点 3 列。
- Mobile：单列，功能点 1 列或 2 列紧凑。

## 可访问性说明
- 产品预览使用 alt。
- CTA 使用可读动作文本。
- 状态 chip 不只使用颜色，附带文本。
- 键盘焦点按标题、CTA、预览、功能点顺序。

## 质量检查要点
- 预览数据是否中性。
- 视觉重心是否在产品价值和 CTA。
- 媒体块是否有固定比例。
- mobile 是否没有横向溢出。
