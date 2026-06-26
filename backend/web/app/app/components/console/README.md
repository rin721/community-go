# components/console 目录说明

`components/console` 是当前 React 前端的平台 UI 组件体系，服务公开页面、初始化向导和 `/admin` 控制台。

## 分层

- `tokens`：设计 token 输出，例如颜色、间距、圆角和阴影变量。该目录由主题生成流程维护，不手写业务样式。
- `primitives`：按钮、徽标、图标按钮、骨架屏、提示等低层组件，只表达基础交互和可访问性。
- `patterns`：表格、表单、弹窗、抽屉、下拉菜单、折叠面板、状态块、步骤向导等可复用业务界面模式。

## 使用规范

- 页面和 feature 优先复用这里的组件，不在路由文件内重复实现按钮、表格、弹窗、表单状态和加载态。
- `primitives` 不得导入 `patterns`；低层组件不能依赖高层业务组合。
- 用户可见文案由调用方通过 i18n 传入，组件内部只保留稳定的无障碍属性或通用技术名称。
- 图标优先使用 `lucide-react`，纯图标按钮必须提供可访问名称。
- 表单组件必须支持 label、help text、error text、disabled、loading、focus state 和 `aria-describedby`。

## 扩展规范

新增组件前先判断是否是低层 primitive 还是组合 pattern。若组件需要读取业务 API、store、路由参数或权限上下文，应放在 `features` 或页面中，而不是放入通用 UI 体系。

## 验证

```powershell
pnpm --dir web/app test
pnpm --dir web/app typecheck
```

`app/frontend-boundary.test.ts` 会检查组件路径和基础层反向依赖，确保 UI 入口与当前组件体系一致。
