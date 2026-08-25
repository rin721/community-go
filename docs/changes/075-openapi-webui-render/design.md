# 075 设计：API 文档与在线调试（融入后台设计语言）

支撑研究：R075-002（快照链，不变）、R075-004（执行语义与纯函数层，复用）、R075-005（Apifox 业务能力清单，功能参考）、R075-006（设计语言回归，当前有效）。

## 设计前提（R075-006）

- **去掉 Apifox 外壳，保留业务能力**：呈现层 100% 使用平台组件与平台样式语义（`@webui/sdk/ui`：PageHeader/PageSection/Surface/DataTable/Field/Button/InlineAlert/EmptyState/Skeleton；Drawer/ConfirmDialog 等弹层；表单/表格/卡片样式 authority 在 styles.css 的 Shell/页面布局/form-panel/toolbar/page-section 等平台类）；模块 css 只保留同类业务 selector（与 iam/organization 一致），**删除 afx token 自定义体系与自定义壳层（资源树/标签条/命令面板外观/右侧响应栏）**。
- UI 控件基座仍为 HeroUI（经 `@webui/sdk/ui` 透传或直接 `@heroui/react`，符合 068 与上一轮「UI 组件依旧使用 HeroUI」的既定约束）。
- 业务层不重写：`openapi-data`（解析/请求构建/form/bodyType）、`run-store`（状态机/响应组装）、`highlight`（JSON 高亮）、`api.ts`（会话 CSRF）、快照链、mock 空表、`book` 图标、`@webui/generated` alias。

## 页面结构与流程（贴合后台）

```text
/openapi（RouteLayoutApp，单路由）
├─ PageHeader（eyebrow/title/description，含契约标题/版本/来源行）
└─ page-sections
   ├─ PageSection「说明」（legend）
   └─ PageSection「接口列表」
      ├─ 工具栏：搜索 Field + 标签筛选 SelectField（+ 「文档」「调试」计数/分隔）
      ├─ DataTable：方法 Chip | 路径 | 操作 ID | 标签 | 操作（调试 / 文档 按钮）
      └─ 空态 EmptyState
接口详情 ── 平台 Drawer（width≈640-720）承载单个接口：
  ├─ Drawer 头部：方法 Chip + 路径（mono）+ 操作 ID + 关闭
  ├─ 分段切换（平台 Button 分段 / 页内分区）：文档 | 调试
  ├─ 文档分区：说明、参数 DataTable（只读）、请求体/返回示例（高亮 pre）、响应 DataTable
  ├─ 调试分区：
  │   ├─ 参数 Field 行（值编辑）+ Switch 启停 + 必填标记
  │   ├─ Body：类型分段（JSON/form-data/urlencoded 按契约）+ JSON Textarea（样例+校验）/ form 行（Text/文件）+ urlencoded 行
  │   ├─ Headers Field 行；Auth（bearer password Field / session 说明）
  │   └─ 发送 Button（pending Spinner）+ mock 禁用 InlineAlert
  └─ 响应卡片（调试分区底部或 Drawer 底部固定区）：
      状态 Chip（2xx/3xx/4xx 色）+ 耗时 + 大小；正文 JSON 高亮 / 原始切换；响应头折叠（details）
深链：?op=<id>&mode=docs|debug（Drawer 打开定位；popstate/replaceState 同步）
全局搜索：工具栏 Button（⌘K）+ 平台 Modal（列表选择跳转）（推荐保留）
```

- 窄屏：Drawer 全宽覆盖；列表列自适应（路径/操作 ID 可省略显示）。

## 组件映射（保留/重构）

| 9536334 现有 | 本轮 | 说明 |
| --- | --- | --- |
| `ApiTree`（自绘树外观） | 移除 | 能力并入列表区（搜索 + 筛选 + DataTable） |
| `WorkspaceTabs`（自绘标签条） | 移除 | 单页面，详情走 Drawer；不再多标签 |
| `CommandPalette`（自绘外观） | 重构 | 平台 Modal + Field + 列表（保留 Cmd+K 能力） |
| `OperationPane`（afx 样式） | 重构 | 平台 Drawer 内容（文档/调试分区 + 执行） |
| `ResponsePanel`（右栏/afx 样式） | 重构 | 调试分区内响应卡片（平台样式） |
| `ModelPane` | 保留（页面内列表→详情 DataTable 或 Drawer） | 模型浏览并入「模型」PageSection/筛选 |
| `MethodBadge`（css 方法色块） | 保留（平台 Chip 底座/或模块小样式） | 方法标识符合表格语义 |
| `openapi-data`/`run-store`/`highlight`/`api.ts` | 复用（必要小适配） | 不动核心逻辑 |
| `openapi.module.css`（afx token） | 重写 | 仅业务 selector，跟随平台 token（--surface 等） |

## 文件影响

| 区域 | 文件 |
| --- | --- |
| 移除 | `ApiTree.tsx`、`WorkspaceTabs.tsx`（及 afx 观感样式） |
| 重构 | `OpenAPIPage.tsx`（列表页）、`OperationPane.tsx` → `OperationDrawer.tsx`（平台 Drawer）、`ResponsePanel.tsx` → 响应卡片、`CommandPalette.tsx`（平台 Modal）、`MethodBadge.tsx`、`openapi.module.css`（清理 afx token） |
| 保留 | `openapi-data.ts`、`openapi-data.test.ts`、`run-store.ts`（+test）、`highlight.ts`（+test）、`api.ts`、`mock.ts`、`ModelPane.tsx`（按需挂到列表/详情）、locales |
| 测试 | vitest（列表/筛选/Drawer/调试/发送/响应/mock 禁用/深链）、Playwright dev/mock（列表/详情弹层/文档/调试/发送断言 + 截图） |
| 文档 | webui/README、docs/development/webui.md、api/README、module README、075 记录、documentation-impact.yaml |

## 失败语义与降级

- 快照不可用 → 页面 EmptyState/InlineAlert 兜底（保留）；
- Body JSON 非法 → 阻止发送并提示；网络/HTTP 错误 → 响应卡片如实呈现（Problem JSON code/detail 优先）；
- CSRF 会话过期 → 会话快照失败如实提示；drawer 状态/history 异常 → 回退列表浏览；
- mock → 发送禁用 + InlineAlert；高亮失败 → 纯文本 pre（不阻断）。

## 验证与验收

- Playwright dev/mock 双 project：列表渲染/搜索/筛选；打开 Drawer；文档分区（参数/返回示例）；调试分区（参数编辑、JSON 校验、form 控件）；发送（拦截 GET 会话 → 响应卡片 200 + csrf-token；POST bearer 头断言）；mock 禁用；深链直达；Cmd+K（如保留）；截图（075-integrated-*）。
- 视觉对照：以现有 IAM/Navigation 页面为基准人工对照（无第三方主题痕迹）。