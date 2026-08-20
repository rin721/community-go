# providers 目录说明

`providers` 存放 React 应用级 Provider 装配。它只负责把全局运行时能力挂到组件树上，不承载页面业务逻辑。

## 当前结构

| 文件 | 职责 |
| --- | --- |
| `AppProviders.tsx` | 装配 `I18nextProvider`、`QueryClientProvider`、`TooltipProvider`、首次安装 gate、认证会话 bootstrap 和主题模式同步。 |

## 依赖边界

- 可以读取 `i18n`、`stores`、`features/setup`、`features/preferences` 和 `lib/api` 做应用级启动。
- 不应导入具体页面路由，也不应承载用户、角色、菜单等业务用例。
- 新增全局 Provider 前必须确认它确实影响整个应用，而不是某个 feature 或页面局部能力。

## 常见错误

- 不要在 Provider 中吞掉认证或初始化错误；需要可见反馈的状态应通过 store、query 或 route 层呈现。
- 不要把后端未暴露的能力写成全局状态。
- 不要创建多个互相独立的 QueryClient 或 i18n 实例。

## 验证

```powershell
pnpm --dir web/app typecheck
pnpm --dir web/app test
```
