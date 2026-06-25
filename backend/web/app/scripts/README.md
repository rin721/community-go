# web/app/scripts 目录说明

`scripts` 存放 React 前端专用工程脚本，用于主题生成、i18n 检查、Markdown 内容生成和构建产物验证。脚本应保持可重复运行，并把错误返回给调用方。

## 当前脚本

- `check-theme-surface.mjs`：检查主题 token 和样式输出边界。
- `generate-blog-posts.mjs`：生成本地博客内容索引。
- `generate-theme.mjs`：根据源主题包生成运行时 CSS token。
- `lint-i18n.mjs`：检查前端 locale key 一致性和缺失文案。
- `verify-build-output.mjs`：验证 React Router/Vite 构建产物是否满足 Go 静态托管要求。

## 扩展规则

- 新脚本失败时必须抛出错误或返回非零退出码，不要只打印警告。
- 不要在脚本中写入本地环境文件、运行态数据、`node_modules` 或构建产物之外的隐式文件。
- 新增脚本后同步更新 `package.json`、本 README、根目录脚本文档或测试矩阵中的入口说明。
- 脚本涉及用户可见文案、主题或 API 产物时，必须同步对应 i18n、主题或契约验证。

## 验证命令

```powershell
pnpm --dir web/app lint:i18n
pnpm --dir web/app theme:check
pnpm --dir web/app build
```
