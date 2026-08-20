# 服务器状态工作台

服务器状态工作台位于 `web/app/app/routes/admin/dashboard.tsx`，通过共享 API client 和 TanStack Query 读取健康检查、就绪检查、服务器快照、历史指标、API catalog 和版本记录。

## 开发注意事项

- 不要在页面内新增散落 API path；所有 endpoint 必须进入 `web/app/app/lib/api/endpoints.ts`。
- 不要凭空展示后端未返回的指标。
- 文案必须进入 i18n。
- 控件间距、状态颜色和文本必须使用平台 UI token。
- 窄屏适配依赖响应式布局，不在页面里堆临时断点。

## 验证

- 运行 `pnpm --dir web/app typecheck`。
- 可见 UI 变更需检查 `1440x900` 与 `390x844`。
