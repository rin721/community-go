# Component Recipes

每个组件都必须使用 `design-tokens.json` 的语义 token，并覆盖状态、响应式和可访问性。

## Button
### 使用场景
主 CTA、次 CTA、图标工具、表单提交、筛选切换。

### 视觉结构
- 图标按钮：40-44px 正方形，`radius.button.icon`，图标 20-24px。
- 主按钮：胶囊或 6-12px 圆角，主色背景，白色文本。
- 次按钮：透明或浅色背景，主色文本，轻边框。

### Token 依赖
`color.brand.primary`、`color.brand.primary.soft`、`color.text.inverse`、`radius.button.pill`、`motion.duration.fast`。

### 状态规则
- hover：背景变为 primary hover 或浅色叠层。
- active：使用 pressed 色，允许 1px 下沉。
- focus-visible：2-3px 主色外环。
- disabled：`opacity.disabled`，禁用指针事件。
- loading：保留按钮宽度，显示 spinner 和可读 loading 文案。

### 响应式规则
移动端触控目标不小于 44x44px；主 CTA 可以全宽，图标按钮保持固定尺寸。

### 可访问性规则
图标按钮必须有 `aria-label`；loading 需设置 `aria-busy`；禁用态使用 `disabled` 或 `aria-disabled`。

### 技术实现提示
使用 CSS variables 管理颜色；按钮状态用 data-state 或 class 表达。

### 禁止事项
不使用低对比文本；不让 loading 改变布局宽度；不只用颜色表达选中。

### 生成示例
```html
<button class="btn btn-primary">开始使用</button>
<button class="icon-btn" aria-label="打开菜单"><span aria-hidden="true">☰</span></button>
```

## Navigation
### 使用场景
官网导航、应用工具栏、移动端底部导航、分类切换。

### 视觉结构
- 桌面侧栏：56px 宽，固定定位，图标垂直排列。
- 顶部栏：56-72px 高，半透明表面，柔光阴影。
- 底部导航：移动端固定 56px，高优先级入口 3-5 个。

### Token 依赖
`container.sidebar`、`container.mobileBar`、`color.surface.translucent`、`shadow.navigation.glow`、`color.brand.primary`。

### 状态规则
当前项使用主色、短下划线、圆形底或徽标；hover 使用浅色叠层；focus-visible 使用外环。

### 响应式规则
desktop 可使用侧栏或顶部栏；mobile 使用顶部工具栏 + 底部导航；抽屉用于次级操作。

### 可访问性规则
使用 `nav`、`aria-current="page"`、可读 label；底部导航必须按逻辑顺序聚焦。

### 技术实现提示
将导航项作为数组配置，包含 `label`、`icon`、`href`、`current`。

### 禁止事项
不让移动端导航超过 5 个主入口；不使用只有图标且无 label 的关键入口。

### 生成示例
```html
<nav class="bottom-nav" aria-label="主导航">
  <a aria-current="page" href="#">首页</a>
  <a href="#">分类</a>
  <a href="#">搜索</a>
</nav>
```

## Hero
### 使用场景
首页首屏、landing page、产品介绍页、活动页。

### 视觉结构
标题、短副标题、1-2 个 CTA、可选媒体块或轻图形背景。首屏必须露出下一段内容的顶部。

### Token 依赖
`typography.size.4xl`、`spacing.section.lg`、`color.brand.primary`、`container.wide`。

### 状态规则
CTA 使用 Button 状态；媒体预览可在 hover 时轻微提升阴影。

### 响应式规则
desktop 可双栏；mobile 堆叠，标题使用 `typography.size.2xl`。

### 可访问性规则
仅使用一个 H1；装饰图形 `aria-hidden="true"`；媒体图片必须有 alt。

### 技术实现提示
使用 CSS grid；背景装饰独立绝对定位，不影响文档流。

### 禁止事项
不把 hero 文案放进厚重卡片；不遮挡下一段内容。

### 生成示例
```html
<section class="hero">
  <h1>让团队更轻松地组织内容</h1>
  <p>用清晰的工作区、卡片和状态，把复杂流程放进一个柔和界面。</p>
  <a class="btn btn-primary" href="#">立即开始</a>
</section>
```

## Section
### 使用场景
功能介绍、流程、FAQ、数据、评价、价格。

### 视觉结构
可选 eyebrow、标题、说明、内容区域、可选 CTA。标题组宽度默认 640-760px。

### Token 依赖
`spacing.section.md`、`typography.size.xl`、`color.text.secondary`。

### 状态规则
section 本身不应有复杂状态；内部组件承担状态反馈。

### 响应式规则
移动端缩短上下间距，标题不超过 3 行。

### 可访问性规则
section 必须有可见 heading 或 `aria-labelledby`。

### 技术实现提示
使用 `.section > .section-header + .section-body` 结构。

### 禁止事项
不嵌套多个视觉卡片容器；不让 section 背景过度装饰。

### 生成示例
```html
<section class="section" aria-labelledby="features-title">
  <header class="section-header">
    <h2 id="features-title">清晰组织每一步</h2>
    <p>把任务、素材和进展放进同一套轻量结构。</p>
  </header>
</section>
```

## Card
### 使用场景
媒体内容、功能、服务、价格、文章、数据摘要。

### 视觉结构
媒体或图标区 + 标题 + 描述或元信息 + 可选操作。默认圆角 6px，浅边界或无边框。

### Token 依赖
`radius.card.default`、`shadow.card.subtle`、`spacing.4`、`color.text.primary`。

### 状态规则
hover 可提升阴影或强调标题色；active 使用 pressed；focus-visible 外环。

### 响应式规则
媒体卡片 mobile 可 2 列；文字密集卡片 mobile 改 1 列。

### 可访问性规则
整卡可点击时使用单一链接，不嵌套多个互相竞争的点击目标。

### 技术实现提示
媒体使用 `aspect-ratio`；标题使用 line-clamp，但完整标题需可通过 `title` 或详情页访问。

### 禁止事项
不让图片加载改变卡片高度；不使用过重阴影。

### 生成示例
```html
<article class="card">
  <div class="card-media" aria-hidden="true"></div>
  <h3>统一管理项目素材</h3>
  <p>把链接、文件和进展整理为可扫描卡片。</p>
</article>
```

## Feature List
### 使用场景
产品卖点、服务能力、流程步骤。

### 视觉结构
2-4 列网格；每项包含图标、标题、1-2 行说明。

### Token 依赖
`grid.gap`、`color.brand.primary.soft`、`typography.size.md`。

### 状态规则
可点击项包含 hover 和 focus-visible；静态项不做 hover。

### 响应式规则
desktop 3 列，tablet 2 列，mobile 1 列或 2 列紧凑。

### 可访问性规则
使用 `ul/li` 或语义 article；图标装饰时隐藏给辅助技术。

### 技术实现提示
图标容器固定 40px，避免标题对齐漂移。

### 禁止事项
不让每项说明超过 3 行。

### 生成示例
```html
<ul class="feature-list">
  <li><span class="feature-icon"></span><h3>快速整理</h3><p>用少量字段完成内容归类。</p></li>
</ul>
```

## Tag / Badge
### 使用场景
分类、筛选、计数、状态、版本提示。

### 视觉结构
胶囊或小圆角；选中态使用主色或浅主色背景。

### Token 依赖
`color.brand.primary`、`color.brand.primary.soft`、`radius.button.pill`、`typography.size.xs`。

### 状态规则
checked、hover、focus-visible、disabled 必须可区分。

### 响应式规则
移动端标签可横向滚动；每个标签高度至少 32px。

### 可访问性规则
筛选标签使用 checkbox、radio 或 button 语义；计数徽标需有可读 label。

### 技术实现提示
使用 `aria-pressed` 或 `aria-checked` 表达切换状态。

### 禁止事项
不把标签当作正文装饰大量堆叠。

### 生成示例
```html
<button class="tag" aria-pressed="true">关键词 <span class="badge">3</span></button>
```

## Form
### 使用场景
搜索、注册、订阅、筛选、联系表单。

### 视觉结构
label + input + help/error；搜索框可使用输入框 + 图标按钮组合。

### Token 依赖
`radius.input.default`、`color.border.subtle`、`color.surface.default`、`color.state.danger`。

### 状态规则
focus、filled、error、success、disabled、loading 必须完整。

### 响应式规则
移动端表单单列，按钮可全宽；输入高度 44-48px。

### 可访问性规则
每个输入必须有 label；错误文本用 `aria-describedby` 关联。

### 技术实现提示
避免只依赖 placeholder；校验状态用 `data-invalid`。

### 禁止事项
不隐藏 label；不只用红色表达错误。

### 生成示例
```html
<label for="search">搜索内容</label>
<div class="search-field">
  <input id="search" type="search" placeholder="输入关键词" />
  <button aria-label="提交搜索">⌕</button>
</div>
```

## Modal
### 使用场景
确认操作、登录提示、设置、详情预览。

### 视觉结构
居中面板或移动端底部 sheet；标题、正文、操作区明确。

### Token 依赖
`zIndex.modal`、`color.surface.default`、`radius.card.soft`、`shadow.card.subtle`。

### 状态规则
open、closing、loading、error；关闭动效不超过 `motion.duration.slow`。

### 响应式规则
desktop 最大宽 480-640px；mobile 使用 100% 宽底部 sheet 或 88vw 面板。

### 可访问性规则
使用 `role="dialog"`、`aria-modal="true"`、焦点陷阱、Esc 关闭和返回焦点。

### 技术实现提示
打开时锁定背景滚动；reduced motion 下禁用位移。

### 禁止事项
不在 modal 中放置复杂导航。

### 生成示例
```html
<div role="dialog" aria-modal="true" aria-labelledby="modal-title" class="modal">
  <h2 id="modal-title">确认操作</h2>
  <p>该操作会更新当前配置。</p>
</div>
```

## Footer
### 使用场景
官网、landing page、企业页和产品页收尾。

### 视觉结构
标识文本、短说明、链接组、辅助信息。保持低对比、低高度。

### Token 依赖
`color.surface.muted`、`color.text.secondary`、`spacing.8`。

### 状态规则
链接 hover 使用主色；focus-visible 必须清楚。

### 响应式规则
desktop 3-4 列；mobile 堆叠，链接间距 12px 以上。

### 可访问性规则
使用 `footer`；链接文本必须描述目的。

### 技术实现提示
链接组数据化，避免重复硬编码。

### 禁止事项
不放置过多营销文案；不使用低对比版权文本。

### 生成示例
```html
<footer class="footer">
  <p>为现代团队准备的轻量工作界面。</p>
  <nav aria-label="页脚导航"><a href="#">功能</a><a href="#">支持</a></nav>
</footer>
```

## CTA
### 使用场景
首屏、section 收束、页脚前行动区。

### 视觉结构
标题 + 短说明 + 1 个主按钮 + 可选次按钮。

### Token 依赖
`color.brand.primary`、`color.surface.translucent`、`shadow.card.subtle`。

### 状态规则
按钮遵循 Button；panel hover 不应过强。

### 响应式规则
mobile 按钮全宽或上下堆叠。

### 可访问性规则
CTA 文案必须描述动作结果。

### 技术实现提示
将 CTA 作为可复用 section variant。

### 禁止事项
不同时放置 3 个以上同层级按钮。

### 生成示例
```html
<section class="cta-panel">
  <h2>准备好开始整理内容了吗？</h2>
  <a class="btn btn-primary" href="#">创建工作区</a>
</section>
```

## Testimonial
### 使用场景
企业页、landing page、产品信任模块。

### 视觉结构
短引语、头像占位、称谓、使用场景。使用中性身份，不使用真实人物。

### Token 依赖
`radius.card.soft`、`color.surface.default`、`shadow.card.subtle`。

### 状态规则
轮播可选；默认静态网格更稳定。

### 响应式规则
desktop 2-3 列；mobile 1 列。

### 可访问性规则
引用用 `blockquote`；头像装饰时空 alt。

### 技术实现提示
避免自动轮播；需要轮播时提供暂停控制。

### 禁止事项
不生成真实背书或真实数据。

### 生成示例
```html
<blockquote class="testimonial">“界面足够轻，团队可以快速找到重点。”</blockquote>
```

## Stats
### 使用场景
数据亮点、效率提升、规模说明。

### 视觉结构
数字、单位、短标签、说明。数字可使用主色或深灰。

### Token 依赖
`typography.size.2xl`、`color.brand.primary`、`grid.gap`。

### 状态规则
数字动画可选；reduced motion 下直接显示。

### 响应式规则
desktop 3-4 列；mobile 2 列或 1 列。

### 可访问性规则
不要只用数字表达结论；提供文字说明。

### 技术实现提示
真实数据由用户提供；缺省使用占位范围。

### 禁止事项
不编造真实业务指标。

### 生成示例
```html
<div class="stat"><strong>24%</strong><span>流程耗时减少</span></div>
```

## Media Block
### 使用场景
产品界面预览、视频封面、内容卡片、流程展示。

### 视觉结构
固定比例容器、圆角、可选播放图标或说明标签。

### Token 依赖
`radius.card.default`、`color.surface.muted`、`shadow.card.subtle`。

### 状态规则
hover 可显示轻遮罩和操作图标；focus-visible 保持可见。

### 响应式规则
移动端媒体宽度 100%，高度由 `aspect-ratio` 控制。

### 可访问性规则
图片必须有 alt；视频必须有标题和字幕策略。

### 技术实现提示
使用 `object-fit: cover`；避免布局偏移。

### 禁止事项
不使用不可授权图片。

### 生成示例
```html
<figure class="media-block">
  <img src="placeholder.png" alt="产品界面预览" />
  <figcaption>统一工作区预览</figcaption>
</figure>
```

## Pricing / Plan Block
### 使用场景
价格页、方案对比、订阅选择。

### 视觉结构
方案名、价格占位、功能列表、CTA、推荐标记。推荐卡片使用浅主色边界或徽标。

### Token 依赖
`radius.card.soft`、`color.border.subtle`、`color.brand.primary.soft`、`shadow.card.subtle`。

### 状态规则
hover 轻微提升；选中方案用 `aria-pressed` 或 radio 语义。

### 响应式规则
desktop 3 列；tablet 2 列；mobile 1 列。

### 可访问性规则
价格单位、周期和限制必须文本明确；推荐标记不能只靠颜色。

### 技术实现提示
方案数据数组化，便于替换。

### 禁止事项
不生成真实价格或不可验证承诺。

### 生成示例
```html
<article class="plan-card">
  <h3>基础方案</h3>
  <p><strong>自定义价格</strong></p>
  <ul><li>适合小团队</li><li>包含核心功能</li></ul>
  <a class="btn btn-primary" href="#">选择方案</a>
</article>
```
