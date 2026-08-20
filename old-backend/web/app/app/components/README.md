# components 目录说明

`components` 存放 React 前端的通用 UI 组件入口。当前生产组件体系位于 `components/console`，用于公开页面、首次安装向导和 `/admin` 控制台。

## 当前结构

- `console`：平台 UI 组件体系，按 `tokens`、`primitives`、`patterns` 分层；详细规则见 `components/console/README.md`。

## 放置规则

- 跨页面复用、无业务 API 依赖的展示组件放在这里。
- 带业务语义、权限判断、路由参数、API 请求或 store 编排的组件优先放入 `features` 或对应 `routes`。
- 新增组件必须说明可访问名称、加载态、禁用态、错误态和移动端表现。
- 用户可见文案由调用方通过 i18n 传入，不在通用组件中硬编码。

## 扩展规范

新增组件前先判断层级：

- 纯基础交互放入 `components/console/primitives`。
- 表单、表格、弹窗、状态块等复用模式放入 `components/console/patterns`。
- 需要业务上下文的组合留在 `features/**`，避免污染通用 UI 层。

## 验证

```powershell
pnpm --dir web/app typecheck
pnpm --dir web/app test
```
