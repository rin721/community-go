# lib/markdown 目录说明

`lib/markdown` 负责 React 前端本地 Markdown 内容的读取、校验和高亮结果消费。当前主要服务公开博客内容。

## 当前结构

| 文件 | 职责 |
| --- | --- |
| `generated-posts.ts` | 由内容生成脚本产出的文章元数据与正文数据，不应手写维护。 |
| `highlight.ts` | 代码块语法高亮辅助。 |
| `posts.ts` | 文章 front matter schema、解析、按语言过滤和 slug 查询。 |
| `posts.test.ts` | 校验文章解析、语言资源和 front matter 约束。 |

## 开发规则

- Markdown 内容源应放在 `web/app/content/blog/<locale>`，不要直接修改 `generated-posts.ts`。
- front matter 必须包含 `author`、`cover`、`date`、`description`、`draft`、`locale`、`slug`、`tags`、`title` 和 `updatedAt`。
- `locale` 必须使用当前前端支持语言：`zh-CN` 或 `en-US`。
- 草稿文章使用 `draft: true`，生产列表只展示非草稿内容。

## 常见错误

- 不要让不同语言版本使用无法对应的 slug，除非页面明确处理语言差异。
- 不要把未清洗的 HTML 直接塞进渲染路径；Markdown 渲染和高亮能力必须继续通过受控管线。
- 不要把生成文件当作手写事实来源；修改内容后运行内容生成或相关测试。

## 验证

```powershell
pnpm --dir web/app typecheck
pnpm --dir web/app test
```
