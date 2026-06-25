# hooks 目录说明

`hooks` 存放跨路由复用的 React hook。这里的 hook 可以读浏览器能力、i18n、TanStack Query 或平台 API，但不能承载完整业务用例。

## 当前 hook

| 文件 | 职责 |
| --- | --- |
| `useDocumentMeta.ts` | 根据 i18n key 和页面参数更新 `title`、description、Open Graph、Twitter Card 和 canonical link。 |
| `useJsonLd.ts` | 向页面注入或移除 JSON-LD 结构化数据，并对 `<` 做转义。 |
| `usePublicSettings.ts` | 读取公开系统设置，提供公开页可用的品牌展示名回退。 |

## 放置规则

- 多个页面共享、且不是业务模块独有的 hook 可以放在这里。
- 单个业务 feature 独有的 hook 放在 `features/<feature>` 内。
- 需要新增 API 请求时必须复用 `app/lib/api` 和 `queryKeys`，不要在 hook 中散落 `/api/v1` 字符串。
- 用户可见文案必须来自 `i18n` key；hook 不直接写展示文本。

## 常见错误

- 不要在 hook 中吞掉请求错误；错误状态应返回给调用方展示。
- 不要在 hook 中写入会话、权限或系统配置的长期策略；这些策略应由 store、feature 或后端 contract 决定。
- 访问 `window`、`document`、`navigator` 时必须考虑渲染时机，避免服务端或测试环境报错。

## 验证

```powershell
pnpm --dir web/app typecheck
pnpm --dir web/app test
```
