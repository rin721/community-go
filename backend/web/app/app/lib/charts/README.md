# 图表运行时

`lib/charts` 封装前端图表 option 契约。页面和组件不要直接引入大型图表运行时；当前后台控制台只需要折线图和环形占比图，由 `components/console/patterns/EChart.tsx` 的轻量 SVG renderer 渲染。

## 当前边界

- `types.ts` 只保留当前页面真实使用的 option 子集，不依赖第三方图表运行时。
- React 图表组件直接输出 SVG，避免公开首页、登录页、初始化向导等非图表页面提前拉取大型图表库。
- 新增图表类型时，先确认真实页面需要，再扩展 option 子集和 SVG renderer，并运行 `pnpm --dir web/app build` 检查 chunk 体积。

## 使用方式

类型从本目录导入：

```ts
import type { ConsoleChartOption } from "~/lib/charts/types";
```
