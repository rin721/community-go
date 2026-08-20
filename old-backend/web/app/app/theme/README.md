# theme 目录说明

`theme` 是 React 前端的主题包和设计 token 来源。它用于生成平台 UI 的 CSS 变量、主题元数据和模板说明，不是后端运行时主题 API。

## 目录结构

| 路径 | 职责 |
| --- | --- |
| `theme.config.json` | 当前启用的源主题包 ID，默认 `builtin/default`。 |
| `schema.ts` | 主题包结构校验，限制 token、模板、资产和默认设置的安全边界。 |
| `packages/` | 源主题包，包含内置默认包和示例自定义包。新增主题从这里开始。 |
| `generated/` | 由脚本生成的主题模板、主题元数据和派生文件，不应手写维护。 |
| `chart-palette.ts` | 图表颜色取值辅助，必须来自主题 token。 |

## 分层规则

主题系统按 token、primitive、pattern、template 的方向消费：

- token 不依赖组件；
- primitive 使用 token；
- pattern 组合 primitive；
- 页面和 feature 使用组件、模板和主题元数据。

新增颜色、间距、圆角、阴影或运动变量时，应先判断是否具备跨页面语义和真实消费者，避免 token 膨胀。

## 修改流程

1. 修改 `packages/<source>/<theme>/theme.json` 和对应 `templates.tsx`。
2. 运行主题生成脚本。
3. 运行主题表面检查、类型检查和前端测试。
4. 如影响可见 UI，运行视觉 QA。

## 验证命令

```powershell
pnpm --dir web/app theme:generate
pnpm --dir web/app theme:check
pnpm --dir web/app typecheck
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
```

## 禁止事项

- 不要在页面或组件中散落硬编码颜色、阴影、z-index 或主题相关 magic number。
- 不要手写 `generated/` 目录下的生成文件。
- 不要把主题包当作业务配置中心；真实系统配置仍以后端 System 模块和配置结构为准。
