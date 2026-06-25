# styles 目录说明

`styles` 存放 React 前端全局样式入口。当前核心文件是 `app.css`，它引入 Tailwind CSS，并定义公共布局、控制台组件 class、响应式规则和动效降级。

## 当前结构

| 文件 | 职责 |
| --- | --- |
| `app.css` | 全局样式、页面布局、公开页、认证页、初始化向导、后台控制台、表格、表单、弹窗和移动端响应式规则。 |

## 样式边界

- 颜色、间距、圆角、阴影和字体应优先使用 `components/console/tokens/tokens.css` 与主题变量。
- 页面私有 class 可以放在 `app.css`，但命名必须保持 `console-*` 前缀和清晰语义。
- 不要在组件内写大段 inline style；组件状态通过 class、data attribute 或 CSS 变量表达。
- 可见 UI 变更必须检查移动端、焦点状态、触控尺寸、对比度和 `prefers-reduced-motion`。

## 常见错误

- 不要引入品牌色硬编码；使用主题 token 或配置派生变量。
- 不要新增会导致横向溢出的固定宽度；表格和工作台需要明确移动端策略。
- 不要删除 `prefers-reduced-motion` 兜底。

## 验证

```powershell
pnpm --dir web/app typecheck
pnpm --dir web/app test:e2e
```
