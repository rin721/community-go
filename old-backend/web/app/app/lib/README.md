# lib 目录说明

`lib` 存放 React 前端的可复用库代码。它位于页面、feature 与底层工具之间，不能承载业务页面编排，也不能替代后端 API contract。

## 当前结构

| 路径 | 职责 |
| --- | --- |
| `api` | endpoint 表、API client、请求/响应类型、错误归一化和 query key。 |
| `charts` | 轻量图表渲染类型与辅助能力。 |
| `markdown` | 本地 Markdown 博客内容解析、语法高亮和生成产物读取。 |
| `cn.ts` | CSS class name 拼接小工具。 |

## 放置规则

- 纯工具函数或跨 feature 复用的前端基础能力放在这里。
- 业务模块私有类型、页面状态和表单 schema 不放在 `lib`；应留在 `features` 或 `routes`。
- API 相关能力必须走 `lib/api`，不要在页面或 hook 中直接散落路径、header 和错误解析。
- 工具函数不得吞掉错误；无法处理的状态应返回调用方。

## 扩展规范

新增子目录时应补充 README，说明职责、调用方、禁止放置内容和验证命令。若能力会影响构建、内容生成或 i18n，必须同步 `web/app/README.md` 或相关脚本文档。

## 验证

```powershell
pnpm --dir web/app typecheck
pnpm --dir web/app test
```
