# i18n 目录说明

`i18n` 是 React 前端国际化入口，负责语言资源加载、语言偏好识别、存储和类型化 key。

## 当前结构

| 文件或目录 | 职责 |
| --- | --- |
| `i18n.ts` | 创建并初始化 `i18next` 实例，接入 `react-i18next`。 |
| `resources.ts` | 绑定 `zh-CN` 与 `en-US` JSON 资源，并声明默认语言。 |
| `locales.ts` | 维护支持语言、浏览器语言归一化和 `localStorage` 持久化。 |
| `keys.ts` | 从资源结构推导类型化翻译 key。 |
| `locales/*.json` | 用户可见文案资源。当前默认 `zh-CN`，英文资源为 `en-US`。 |

## 开发规则

- 用户可见文案必须进入 `locales/zh-CN.json` 与 `locales/en-US.json`，并保持 key 对齐。
- 页面、组件、store、schema、表格列和 SEO helper 不得硬编码展示文案。
- 新增语言前必须同步 `resources.ts`、`locales.ts`、资源文件、测试和文档。
- 前端语言码当前是 `zh-CN`、`en-US`；若与后端 locale 传递有关，必须通过现有 API client 映射或后端约定处理，不要在页面临时拼接。

## 常见错误

- 不要只改一个语言文件。
- 不要把后端错误码直接当成用户可见文案；应在调用处映射到 i18n key 或展示后端已本地化响应。
- 不要把本地存储 key 改成品牌化名称；当前使用中性 `console-locale`。

## 验证

```powershell
pnpm --dir web/app lint:i18n
pnpm --dir web/app typecheck
```
