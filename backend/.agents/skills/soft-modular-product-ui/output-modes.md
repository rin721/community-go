# Output Modes

默认输出模式为 `UI design spec`。当用户未指定技术栈时，只输出结构化设计规范；当用户指定技术栈时，再输出对应实现。

## UI Design Spec
### 适用
用户需要设计方案、规则、结构和组件说明。

### 输出内容
- 页面目标
- 信息架构
- token 使用
- layout grammar
- component recipes
- interaction states
- responsive rules
- accessibility
- validation notes

## HTML / CSS
### 适用
用户需要可直接放入静态页面的实现。

### 输出内容
- 语义 HTML
- `:root` CSS variables
- component class
- media queries
- state selectors
- reduced motion

## React
### 适用
用户需要组件化实现。

### 输出内容
- 组件拆分
- props 和状态枚举
- 数据数组
- JSX
- CSS variables 或 CSS modules
- accessibility props

## Vue
### 适用
用户需要 Vue 单文件组件或组件结构。

### 输出内容
- props
- slots
- computed class
- template
- scoped CSS variables
- accessibility props

## Tailwind
### 适用
用户需要 utility-first 实现。

### 输出内容
- token 到 config 的映射
- 组件 class
- responsive variants
- state variants
- 自定义 CSS variables

## Figma Prompt
### 适用
用户需要把规则交给设计工具或生成器。

### 输出内容
- Frame 尺寸
- Auto layout 方向
- token
- component variants
- constraints
- responsive behavior
- accessibility notes

## Wireframe Outline
### 适用
用户需要低保真结构。

### 输出内容
- 页面模块顺序
- 每个模块的内容密度
- 组件占位
- CTA 位置
- responsive sketch

## Component Library Spec
### 适用
用户需要建立组件规范。

### 输出内容
- 组件清单
- variants
- states
- tokens
- keyboard behavior
- responsive behavior
- implementation notes

## Landing Page Structure
### 适用
用户只需要落地页结构和内容节奏。

### 输出内容
- hero
- value points
- feature sections
- proof sections
- pricing or plans
- FAQ
- CTA
- footer

## Responsive Layout Plan
### 适用
用户需要断点策略或移动端改造方案。

### 输出内容
- desktop layout
- tablet layout
- mobile layout
- navigation changes
- card reflow
- type scale
- touch targets
- long text handling
