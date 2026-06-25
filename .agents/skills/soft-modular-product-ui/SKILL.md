---
name: soft-modular-product-ui
description: 生成柔和、清爽、模块化的产品界面、官网首页、落地页、内容型页面、企业展示页、移动端页面和组件规范。适用于需要浅色背景、柔和强调色、轻量导航、媒体卡片、低噪声信息层级、可访问状态和响应式布局的 UI 设计与前端实现任务。
---

# Soft Modular Product UI Skill

## Skill 描述
该 skill 提供一套可执行的 UI 设计语言，用于生成柔和、明亮、轻量、模块化的产品界面。生成结果应兼具清晰信息层级、亲和情绪、轻量组件、克制动效和可维护前端结构。

## 适用场景
- 官网首页、landing page、产品介绍页、企业展示页、内容门户页、创作者平台页、移动端页面。
- 需要柔和强调色、白色或浅灰底、轻量卡片、图标导航、紧凑信息流、清爽表单和低干扰 CTA 的界面。
- 需要输出 UI design spec、HTML/CSS、React、Vue、Tailwind、Figma prompt、wireframe outline 或组件库规范。

## 不适用场景
- 需要厚重暗黑、强烈赛博、奢华高对比、密集金融终端、游戏 HUD 或高度拟物风格的界面。
- 需要使用具名商业标识、专有图片、不可复用文案、真实业务数据或不可授权素材的任务。
- 需要完全还原某个既有界面、逐像素复刻或保留固定页面结构的任务。

## 触发短语
- “使用 Soft Modular Product UI Skill 生成……”
- “生成柔和模块化产品官网”
- “生成清爽内容型首页”
- “为产品介绍页输出 design tokens 和组件规范”
- “把这个需求做成轻量粉色强调的响应式 UI”
- “输出移动端产品页面和组件状态”

## 输入参数
- `page_type`：homepage、landing、product-section、content-hub、corporate、mobile、component-library。
- `audience`：目标用户与阅读场景。
- `content_outline`：模块清单、标题、卖点、CTA、数据项，可为空。
- `brand_overrides`：主色、辅助色、字体偏好、圆角强度、密度偏好，可为空。
- `output_mode`：design-spec、html-css、react、vue、tailwind、figma-prompt、wireframe、component-spec、responsive-plan。
- `tech_stack`：plain、React、Vue、Tailwind 或未指定。
- `accessibility_level`：默认 WCAG AA。

## 输出形式
默认输出结构化 UI design spec。若用户指定技术栈，同时输出相应实现代码、组件结构、状态规则与响应式规则。所有输出必须包含 token 使用说明、关键组件状态、移动端策略和质量检查结果。

## Runtime Procedure
1. 判断 `page_type`、`output_mode`、技术栈和内容完整度。
2. 读取 `design-tokens.json`，建立颜色、字体、间距、圆角、阴影、断点和动效变量。
3. 读取 `style-profile.md`，确定视觉气质、密度、情绪和一致性边界。
4. 读取 `layout-patterns.md`，选择 2-4 个可组合布局模块。
5. 读取 `component-recipes.md`，生成所需组件与状态。
6. 读取 `interaction-rules.md` 和 `responsive-rules.md`，补齐 hover、focus、loading、empty、error、success、键盘、触控和断点行为。
7. 读取 `content-rules.md`，调整标题长度、段落密度、CTA 和空状态文案。
8. 若用户要求替换风格，读取 `adaptation-rules.md`。
9. 按 `output-modes.md` 选择交付形态。
10. 运行 `validation-checklist.md` 和发布清洁度检查，修正不合格项。

## Runtime Decision Tree
优先读取 `runtime-decision-tree.md`。快速判断如下：

- 用户只要规则：输出 design spec，包含 token、布局、组件和状态。
- 用户要代码：先输出组件结构，再输出样式变量和实现代码。
- 用户要移动端：优先读取响应式规则，默认顶部工具栏、底部主导航、双列或单列内容流。
- 用户提供主色：替换 `color.brand.primary`，同步生成 hover、focus、pressed、ripple、shadow 变量。
- 用户未提供文案：使用 `content-rules.md` 的中性占位文案。

## 文件读取顺序
1. `design-tokens.json`
2. `style-profile.md`
3. `layout-patterns.md`
4. `component-recipes.md`
5. `interaction-rules.md`
6. `responsive-rules.md`
7. `content-rules.md`
8. `adaptation-rules.md`
9. `output-modes.md`
10. `validation-checklist.md`
11. `examples/` 中与任务最接近的示例

## 核心设计原则
- 以白色、浅灰和半透明表面建立轻盈底色。
- 以柔和粉色或可替换强调色建立识别度，强调色只用于导航选中、CTA、标签、徽标、图标重点和轻量装饰。
- 页面应保持高留白、低噪声、清晰行距和温和圆角。
- 卡片应优先使用媒体比例、标题、元信息和轻量状态，而不是重边框或厚阴影。
- 导航应使用图标与短标签，重要入口保持 40-56px 可点击区域。
- 动效应短促、柔和、可关闭，避免大面积位移和持续循环。

## Design Token 使用规则
- 所有颜色、字号、间距、圆角、阴影、边框、动效和断点必须使用 `design-tokens.json`。
- 不允许在组件中散落硬编码主色；若必须新增颜色，应新增语义 token。
- 主色替换后必须同步生成 hover、focus、pressed、disabled、ripple 和 shadow 变体。
- 文本对比度必须满足 WCAG AA；小字号文本不得低于 12px，正文默认 14-16px。

## 组件生成规则
- 每个组件必须包含使用场景、视觉结构、token 依赖、状态规则、响应式规则、可访问性规则和技术实现提示。
- Button 使用圆形图标按钮、胶囊 CTA 或轻量文本按钮三类形态。
- Navigation 在桌面端可使用左侧固定工具栏或顶部横向栏；移动端默认顶部工具栏加底部主导航。
- Card 以 16:9 媒体、标题、短元信息和轻量状态组成；文本型卡片需保留同等节奏。
- Form 必须包含 label、placeholder、帮助文本、错误文本和 focus-visible。

## 响应式规则
- Desktop：内容容器默认 1040-1120px，固定侧栏可为 56px，卡片 3-4 列。
- Tablet：内容容器缩小到 88-92vw，卡片 2-3 列，横幅装饰保留但降低高度。
- Mobile：顶部 56px 工具栏，底部 56px 主导航，内容 16px gutter，卡片默认 2 列；长文本或表单改为 1 列。
- 触控目标不得小于 44x44px。

## 交互规则
- hover 使用轻微背景叠层、强调色变化或柔光阴影，不使用剧烈缩放。
- active 使用 pressed 色和 1-2px 视觉下沉或透明度变化。
- focus-visible 使用 2-3px 强调色外环，并保持与 hover 可区分。
- loading 使用顶部进度条、骨架屏或按钮内 spinner；不得阻断页面阅读。
- reduced motion 开启时禁用非必要位移与装饰动效。

## 内容规则
- 标题应短、明确、可扫描；H1 建议 8-16 个汉字或 4-9 个英文词。
- 副标题不超过 2 行，正文段落每段 40-90 个汉字或 20-45 个英文词。
- CTA 文案使用 2-6 个汉字或 1-4 个英文词。
- 信息模块应先给价值，再给细节，再给行动。
- 占位文案必须中性、可替换，不使用真实组织、人物、网址或专有业务数据。

## 技术栈映射规则
- Plain HTML/CSS：输出语义 HTML、CSS variables、组件 class 和状态选择器。
- React：输出数据驱动组件、props、状态枚举、CSS modules 或普通 CSS variables。
- Vue：输出 props、slots、computed class、scoped CSS variables。
- Tailwind：输出 token 到 config 的映射，并保留语义 class 注释说明。
- Figma prompt：输出 frame、auto layout、token、component variants 和 responsive behavior。

## 适配与替换规则
- 主色、辅助色、字体、圆角、密度和动效强度可以替换。
- 导航可从侧栏切换为顶部栏，但桌面端必须保留明确主入口与当前状态。
- 卡片可从媒体型改为文本型或数据型，但必须保留轻量边界、标题层级和元信息区。
- 风格替换后必须运行 `adaptation-rules.md` 中的一致性检查。

## 禁止事项
- 不生成逐像素还原结果。
- 不使用具名商业标识、真实网址、专有图片、专有图标、不可授权文案或真实业务数据。
- 不把页面写成单一固定顺序；布局必须可组合、可替换。
- 不用颜色作为唯一信息载体。
- 不牺牲键盘操作、焦点可见性、文本对比度和移动端可读性。
- 不输出只含审美形容词而缺少 token、组件状态和响应式规则的结果。

## 示例调用方式
```text
使用 Soft Modular Product UI Skill，为一个协作工具生成 landing page。
输出 React + CSS variables。
需要 hero、功能卡片、价格区、FAQ、CTA 和移动端布局。
主色使用柔和蓝绿色，整体保持轻盈、亲和、模块化。
```

```text
使用 Soft Modular Product UI Skill，输出移动端产品首页的 design spec。
内容包括顶部工具栏、底部导航、信息提示条、产品卡片网格、空状态和错误状态。
```

## 质量检查清单
- 是否使用 `design-tokens.json` 的语义变量。
- 是否符合柔和、明亮、轻量、模块化的视觉语言。
- 是否包含 hover、active、focus、disabled、loading、error、success、empty 状态。
- 是否覆盖 desktop、tablet、mobile。
- 是否满足文本对比度、focus-visible、键盘、触控、表单 label、alt、语义结构和 reduced motion。
- 是否避免具名商业标识、真实网址、专有素材和不可复用数据。
- 是否可以在独立上下文中直接执行。

## 发布清洁度检查
交付前必须确认所有输出只保留第一方规则、语义 token、中性示例、可替换组件和质量标准。任何可识别商业标识、真实网址、专有文案、过程叙述、不可授权素材或固定复刻结构都必须删除或重写。
