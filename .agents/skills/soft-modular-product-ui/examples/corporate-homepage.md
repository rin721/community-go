# Corporate Homepage Example

## 输入需求
为一个企业服务团队生成首页，目标是展示服务能力、流程和联系入口。输出 HTML/CSS 结构建议。

## 使用到的 Skill 规则
- `style-profile.md`：明亮、稳定、轻量企业感。
- `layout-patterns.md`：Top Bar + Content、左文右媒体 hero、服务卡片、数据模块、Footer CTA。
- `component-recipes.md`：Navigation、Hero、Section、Card、Stats、Testimonial、CTA、Footer。
- `adaptation-rules.md`：企业感调整。

## 生成策略
企业首页减少活泼装饰，增加留白、服务结构和可信度模块。主色可保持柔和，也可替换为稳定蓝或青色。卡片使用轻边框和少量阴影。

## 结构草案
1. Top Navigation：标识、服务、流程、方案、联系。
2. Hero：服务价值、简短说明、主 CTA、次 CTA、右侧信息面板。
3. Services：4 张服务卡片。
4. Process：3 步流程。
5. Stats：3-4 个中性数据占位。
6. Testimonial：2-3 条中性评价。
7. CTA Panel：联系或预约。
8. Footer：链接组和说明。

## Token 使用说明
- 顶部栏：`color.surface.translucent` + `shadow.navigation.glow`。
- 服务卡片：`radius.card.soft` + `color.border.subtle`。
- 数据数字：`typography.size.2xl` + `color.brand.primary`。
- CTA 面板：`color.brand.primary.soft` 或 `color.surface.muted`。

## 响应式说明
- Desktop：hero 双栏，服务 4 列，流程 3 列。
- Tablet：服务 2 列，流程 3 列或 1 列时间线。
- Mobile：所有模块单列，顶部导航变为菜单按钮，CTA 全宽。

## 可访问性说明
- 导航使用 `aria-current` 标识当前页。
- 数据模块提供文字解释。
- 评价使用 `blockquote`。
- 表单入口有清楚 label 和错误提示。

## 质量检查要点
- 是否避免真实客户、真实数字和真实承诺。
- 企业感是否通过结构和排版体现，而不是厚重暗色。
- 卡片数量是否适中。
- 移动端 CTA 是否易触达。
