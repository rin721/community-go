# web/app/content 目录说明

`content` 存放前端本地内容资源，目前主要用于公开站点的 Markdown 博客内容。它服务 React 前端内容系统，不承载后台业务状态，也不替代后端持久化数据。

## 职责边界

- `blog/{locale}`：按语言拆分的本地 Markdown 内容。
- front matter 用于标题、摘要、发布日期、标签和 locale 元数据。
- 内容构建由 `web/app/scripts/generate-blog-posts.mjs` 读取并生成前端可消费的索引。

## 扩展规则

- 新增多语言内容时保持相同 slug，除非 front matter 明确说明语言差异。
- 默认中文内容放在 `zh-CN`，英文内容放在 `en-US`。
- 不要在这里放运行时上传文件、后台配置、用户数据或需要权限控制的数据。
- 内容结构变化后同步更新生成脚本、前端读取逻辑和相关测试。

## 验证命令

```powershell
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
pnpm --dir web/app build
```
