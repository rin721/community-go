# 075 设计：API 文档与在线调试（层级分类 + 多页面）

支撑研究：R075-002（快照链，不变）、R075-004（执行语义与纯函数层，复用）、R075-005（Apifox 业务能力清单，功能参考）、R075-006（设计语言回归，不变）、R075-007（层级分类与多页面，当前有效）。

## 设计前提（R075-006/007）

- 平台组件与样式语义 100% 来自 `@webui/sdk/ui`（PageHeader/PageSection/Surface/DataTable/Field/Button/InlineAlert/EmptyState/SelectField/SectionNav/ConfirmDialog/Drawer）+ styles.css 平台类；模块 css 只保留业务 selector。
- **多页面层级**：复用 GroupLayout 073（settings 8 分区范式）——4 个静态路由共享 `openapi.layout` 布局；
- UI 控件基座仍为 HeroUI（经 SDK 透传或直接 `@heroui/react`）。
- 业务层不重写：`openapi-data`、`run-store`、`highlight`、`api.ts`、快照链、mock 空表。

## 路由与布局

```text
模块声明（binding.go）
Routes（均 RouteLayoutApp + GroupLayoutID "openapi.layout"）：
  openapi.overview   /openapi            总览（分类卡片）
  openapi.tags       /openapi/tags       分类接口列表（?tag=）
  openapi.operation  /openapi/operation  接口文档/调试（?op=&mode=）
  openapi.models     /openapi/models     数据模型（?model=）
Navigation：openapi.docs（icon book，Order 130，落地 /openapi）
Entries：
  openapi.layout     OpenAPILayout.tsx      布局 entry（GroupLayoutID 引用）
  openapi.overview   OpenAPIOverviewPage.tsx
  openapi.tags       OpenAPITagPage.tsx
  openapi.operation  OpenAPIOperationPage.tsx
  openapi.models     OpenAPIModelsPage.tsx
```

宿主 `renderAppRoutes` 按 groupLayoutId 分组：`OpenAPILayout`（SectionNav + 内容区）作为一族路由的共享布局，`<Outlet/>` 注入当前页面；路由切换布局不卸载，WorkspaceTabs 按 visited route id 建标签（settings 同语义）。

## 页面结构与流程

```text
OpenAPILayout（共享）：
├─ SectionNav：总览 | 各 tag（动态，快照分组） | 数据模型；active 由 pathname+query 推断
└─ 内容区（children / Outlet）

/openapi（总览页）
├─ PageHeader（eyebrow/title/description + 契约标题/版本/来源行）
└─ page-sections
   ├─ PageSection「说明」（legend）
   └─ PageSection「接口分类」
      ├─ 分类卡片（每个 tag：名称 + 操作数 + 方法徽标）→ /openapi/tags?tag=X
      ├─ 模型入口卡片 → /openapi/models
      └─ 空态 EmptyState（快照不可用 / 无 tag）

/openapi/tags（分类接口列表页，?tag= 定位）
├─ PageHeader（当前分类名）
└─ DataTable：方法 Chip | 路径 | 操作 ID | 操作（文档 / 调试）
   → 行操作跳转 /openapi/operation?op=<id>&mode=<docs|debug>
   → 搜索 Field（页内）+ 空态

/openapi/operation（接口文档/调试页，?op=&mode= 定位）
├─ 页头：方法 Chip + 路径（mono）+ 操作 ID + 分段切换（文档 | 调试）
├─ 文档分区：说明、参数 DataTable（只读）、请求体/返回示例（高亮 pre）、响应 DataTable
└─ 调试分区：
   ├─ 参数 Field 行（值编辑）+ 必填标记
   ├─ Body：类型分段（JSON/form-data/urlencoded 按契约）+ JSON Textarea（样例+校验）/ form 行（Text/文件）+ urlencoded
   ├─ Headers Field 行；Auth（bearer password Field / session 说明）
   ├─ 发送 Button（pending Spinner）+ mock 禁用 InlineAlert
   └─ 响应卡片：状态 Chip + 耗时/大小 + JSON 高亮/原始正文 + 响应头折叠

/openapi/models（数据模型页，?model= 定位）
├─ 模型列表（chips/列表，点击 → ?model= 更新 URL）
└─ 选中模型的属性 DataTable（属性名/类型/必填/说明）
```

## 组件映射（保留/重构）

| 72ba96f 现有 | 本轮 | 说明 |
| --- | --- | --- |
| `OpenAPIPage.tsx`（单页堆叠） | 拆分 | → `OpenAPIOverviewPage` + `OpenAPITagPage` + `OpenAPIOperationPage` + `OpenAPIModelsPage`，删除单页壳 |
| `OpenAPILayout`（新增） | 新增 | GroupLayout entry：SectionNav 动态条目 + 内容区 |
| `OperationDrawer.tsx` | 重构 | 移除 Drawer 外壳；文档/调试分区内容复用进 `OpenAPIOperationPage` |
| `ModelDrawer.tsx` | 重构 | 移除 Drawer 外壳；属性表复用进 `OpenAPIModelsPage` |
| `ModelPane.tsx` | 保留 | 模型属性表（页面内使用） |
| `CommandPalette.tsx` | 保留改造 | Cmd+K 平台 Modal；选择后 navigate 到 `/openapi/operation?op=` 或 `/openapi/models?model=` |
| `MethodBadge.tsx` | 保留 | 方法色块 |
| `openapi-data`/`run-store`/`highlight`/`api.ts`/`mock.ts` | 复用 | 不动核心逻辑；`groupedOperations`/`OperationRow.tag` 已具备 |
| `openapi.module.css` | 收敛 | 仅业务 selector（分类卡片、页内导航、编辑区、响应卡片） |

## 深链与导航

- `/openapi/tags?tag=<tag>`、`/openapi/operation?op=<id>&mode=<docs|debug>`、`/openapi/models?model=<name>`；
- 页面挂载时从 `window.location.search` 解析并校验（未知 tag/op/model → 空态 + 返回提示）；
- 页内切换（tag 卡片、行操作、模型选择、Cmd+K）用宿主 `runtime.navigate(path)`（react-router）跨页跳转；
- 刷新/浏览器回退由路由天然恢复（不再手写 popstate/replaceState Drawer 状态）。

## 文件影响

| 区域 | 文件 |
| --- | --- |
| Go 声明 | `internal/module/openapi/binding/webui/binding.go`（4 路由 + 布局 entry + 菜单不变） |
| 新增页面 | `OpenAPILayout.tsx`、`OpenAPIOverviewPage.tsx`、`OpenAPITagPage.tsx`、`OpenAPIOperationPage.tsx`、`OpenAPIModelsPage.tsx` |
| 重构 | `OperationDrawer.tsx`→撤壳、`ModelDrawer.tsx`→撤壳、`CommandPalette.tsx`（navigate 目标）、`openapi.module.css`（分类卡片等业务 selector） |
| 删除 | `OpenAPIPage.tsx`（单页壳） |
| 保留 | `openapi-data.ts`(+test)、`run-store.ts`(+test)、`highlight.ts`(+test)、`api.ts`、`mock.ts`、`MethodBadge.tsx`、`ModelPane.tsx`、locales（增补导航/页面标题/空态 key）、`@webui/generated` alias 等 |
| 测试 | vitest（总览/分类页/接口页/模型页/导航 active/深链/调试发送/mock 禁用）、Playwright dev/mock（层级流转 + 截图 075-hierarchy-*） |
| 文档 | webui/README、docs/development/webui.md、api/README、module README、075 记录、documentation-impact.yaml |

## 失败语义与降级

- 快照不可用 → 总览 EmptyState/InlineAlert 兜底；
- `?tag=`/`?op=`/`?model=` 非法或缺失 → 对应页面空态 + 返回总览提示（不崩溃）；
- Body JSON 非法 → 阻止发送并提示；网络/HTTP 错误 → 响应卡片如实呈现（Problem JSON code/detail 优先）；
- CSRF 会话过期 → 会话快照失败如实提示；
- mock → 发送禁用 + InlineAlert；高亮失败 → 纯文本 pre（不阻断）。

## 验证与验收

- Playwright dev/mock 双 project：总览渲染与分类卡片；进入分类页（`?tag=`）；接口页文档/调试、参数编辑、JSON 校验、form 控件、发送（拦截 GET 会话 → 响应卡片 200 + csrf-token；POST bearer 头断言）；mock 禁用；模型页（`?model=`）；深链直达（op/tag/model）；Cmd+K（如保留）；SectionNav 切换 active；截图（075-hierarchy-*）。
- 视觉对照：以现有 Settings/IAM 页面为基准人工对照（无第三方主题痕迹）。