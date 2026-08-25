# 075 设计：Apifox 复刻 —— API 管理可视化平台

支撑研究：R075-002（快照链，不变）、R075-004（执行语义与纯函数层，复用）、R075-005（Apifox 形态拆解，当前有效）。

## 设计前提（技术选型更新，R075-005 + 用户第四轮调整）

- `openapi` 模块呈现层从「平台组件工作台」升级为 **Apifox 复刻**：UI 控件基座统一使用 **HeroUI 组件库**（用户明确要求：`@heroui/react` 直接使用或经 `@webui/sdk/ui` 透传，与平台 068 全量采用一致），模块 css 只承载 Apifox 设计语言（token/布局/密度/方法色/状态色/选中态）——正式取代 R075-004 的「页内全部来自 @webui/sdk/ui」约束（仅限本模块；宿主与其它模块边界不变）。
- HeroUI 覆盖映射：Input/Textarea/Select/Button/Tabs/Dropdown/Tooltip/Kbd/Spinner/Skeleton/Switch/Checkbox/Chip/Badge/Modal/Popover/Avatar/Card/Divider 等覆盖绝大多数控件；**HeroUI 无内置 Tree/Splitter/FileInput**：资源树用 HeroUI 底座（Button/unstyled + 自有折叠状态）自绘轻量树、响应右侧面板用布局分栏（窄屏折叠），均为模块内结构组件，不构成新的通用控件体系；文件上传用原生 `<input type=file>` + HeroUI Button 底座。
- 复用层不重做：快照链（R075-002）、`openapi-data.ts`（解析/请求构建，扩展表单/上传构建）、执行器（api.ts CSRF、同源 fetch 语义）、mock 禁用、`?op=` 深链基线。
- JSON/代码高亮：成熟轻量库候选 `highlight.js`（MIT、按需语言；实施期 `pnpm view` 核验版本/体积并回填记录）；不引入 Monaco。

## 布局骨架（五区，Apifox 复刻）

```text
┌ 顶部工具栏 ─────────────────────────────────────────────┐
│ [Cmd+K 全局搜索]  [环境 ▾]  [+ 新建]  [面包屑…]  [账号]   │
├ 左资源树 ───────┬ 多标签页工作台 ────────────┬ 响应面板 ────┤
│ 搜索框          │ [标签1 ×][标签2 ×]…        │ 状态码徽标    │
│ ▾ 分组(接口)     │ ┌ 接口详情 ──────────────┐ │ 耗时/大小    │
│   GET 接口A      │ │ URL栏: [方法▾][URL][发送]│ │ body 高亮    │
│   POST 接口B     │ │ [文档|调试]            │ │ 响应头       │
│ ▾ 数据模型       │ │ Query/Body/Headers/…  │ │             │
│ 环境管理         │ └───────────────────────┘ │             │
└─────────────────┴───────────────────────────┴─────────────┘
```

- 移动/窄屏（≤920px）：响应面板折叠为标签页内独立 Tab 或底部抽屉（保留能力，骨架优先桌面）。
- 布局用模块 css（grid/flex + design tokens），不使用平台样式 authority（styles.css 的 Shell 分区仍服务于宿主）。

## 设计 token（模块 css 承载 Apifox 观感；主题层经 HeroUI 覆盖）

- 主色联动：`tailwind.config.js` heroui() 插件 primary 调到 Apifox 蓝色域（实施期确认当前 preset 机制怎样叠加；模块内主要用自定义 token + HeroUI className 覆写，不全局改宿主导航色）。
- 颜色：灰阶面板 `--afx-bg/panel/border`（#FFF/#F5F6F7/#E5E6EB 级）、文字三级、主色 ~#3370FF 系、方法色（GET 绿/POST 蓝/PUT 橙/PATCH 紫/DELETE 红 系 Chip 标签）、状态色（2xx 绿/3xx 橙/4xx 红 响应徽标）。
- 字体/间距：正文字号 12-13px、代码 12px monospace、行高 1.5、控件高 28-32px、间距 4/8/12/16、圆角 4-6px、边框 1px 细线。
- 反馈/动效：hover 灰底、选中浅蓝底 + 主色文字、聚焦主色描边、标签激活高亮、80-150ms ease、加载骨架（HeroUI Skeleton）+ 发送 Spinner、响应面板淡入；尊重宿主 `data-motion=reduce`。

## 组件规格（HeroUI 控件基座 + 模块 css 承载 Apifox 观感）

| 组件 | HeroUI 基座与行为 |
| --- | --- |
| `api-tree.tsx` | HeroUI Button/unstyled + 自有折叠状态自绘轻量树：tag→接口节点（Chip 方法色块 + operationId）、数据模型分组；搜索过滤（复用 filterOperationGroups）；展开/折叠箭头；选中高亮；右键菜单基础（仅「复制深链」等无副作用项） |
| `workspace-tabs.tsx` | 自绘轻量标签条（HeroUI Button 底座 + × 关闭 + 激活高亮），每接口/模型一标签（Chip 方法色点 + 标题）；关闭后自动回退；「工作台」固定标签；与深链同步 |
| `request-bar.tsx` | HeroUI Select（方法）+ HeroUI Input（BaseURL 只读/环境选择）+ 路径（只读，`{param}` 高亮）+ HeroUI Button（发送，Spinner loading 态） |
| `doc-view.tsx` | 文档模式：说明、参数只读表、请求/响应 schema 摘要、返回示例（highlight.js 高亮 JSON） |
| `debug-view.tsx` | 调试模式：Query/Path 动态表格（HeroUI Input 行内值、增删、Switch 启停、必填标记）；Body 分区（HeroUI Textarea JSON 编辑 + highlight.js 高亮预览 + 校验；form-data 行（类型/值/原生 file input + Button 底座）；urlencoded）；Headers 表格；Auth（bearer Input / session 说明）；发送 → run-store |
| `response-panel.tsx` | Chip 状态码徽标（2xx/3xx/4xx 色）+ 耗时 ms + 大小；body 视图切换（highlight.js JSON / 原始 pre）；响应头列表；空态/loading（Spinner）/错误态 |
| `command-palette.tsx` | HeroUI Modal + Input + Kbd：Cmd/K 全局搜索弹层（接口/模型跳转，键盘上下 + Enter） |
| `api-breadcrumb.tsx` | 面包屑：工作台 → 分组 → 接口（HeroUI Button 底座跳转树） |
| `run-store.ts`（纯） | 执行状态机（idle/pending/done/error）与响应面板数据组装（大小计算、类型判定），可单测 |

## 数据流与执行

- 数据：`webuiOpenAPISpec`（快照）→ `openapi-data`（树/解析）→ 各视图（纯渲染）。
- 执行：`RequestBar`/`DebugView` → `run-store` → `buildRequest`（复用）+ `fetch`（同源，credentials include，bearer 内存 token、webuiSession Cookie+CSRF 附加，20s 超时）→ 响应数据进入 `response-panel`。
- mock 判定：`readWebUIDataSource() === "mock"` → 发送按钮禁用 + 提示（浏览不受影响）。
- 深链：`?op=<id>&mode=docs|debug` 与 `?model=<name>`；`popstate` + `replaceState` 恢复；标签激活与深链同步。

## 交互清单（深度要求）

语言中枢：树点击开标签并直达；标签可关闭；Cmd/Ctrl+K 搜索跳转；Cmd/Ctrl+Enter 发送；URL 栏 {param} 高亮；参数表格行增删/启停即时生效；发送中按钮 loading + 树节点/标签状态微标注；响应即时渲染（状态/耗时/大小/高亮 body）；错误不吞（Problem JSON code/detail 优先）；所有动效尊重宿主 `data-motion=reduce`。

## 文件影响（新增/重写）

| 区域 | 文件 |
| --- | --- |
| 设计系统 | `web/openapi.module.css` 重写（Apifox token/布局）、HeroUI theme 覆盖（主色/密度，实施期确认不与宿主冲突） |
| 视图 | `web/{OpenAPIPage,ApiTree,WorkspaceTabs,RequestBar,DocView,DebugView,ResponsePanel,CommandPalette,ApiBreadcrumb,SchemasView}.tsx`（重组，HeroUI 基座） |
| 逻辑 | `web/openapi-data.ts`（扩展 form 构建/文件项/大小计算）、`web/run-store.ts`（新，纯状态机）、`web/api.ts`（保持） |
| 依赖 | `webui/package.json` + lock：`highlight.js`（固定版本，实施期核验）；UI 控件基座沿用已装 `@heroui/react`（无新 UI 依赖） |
| 测试 | vitest（state/构建/树/标签/响应面板 + 页面渲染）、Playwright（五区/标签/深链/执行/文档/调试断言 + 桌面移动亮暗截图） |
| 文档 | webui/README、docs/development/webui.md、api/README、module README、075 记录、documentation-impact.yaml |

## 失败语义与降级

- 高亮库加载失败 → 退化为纯文本 pre（不阻断）；
- 快照不可用 → 全工作台 EmptyState/InlineAlert 兜底；
- 标签状态/history 异常 → 回退浏览模式；
- 移动端布局降级（响应面板折叠），核心浏览/调试可用。

## 验证与验收路径（如实说明）

- 本会话无 Apifox 体验版可视化对照；第一版按 R075-005 的公开物料 + 产品知识还原；以 Playwright 截图（075-apifox-*）与 e2e 断言交付，**逐轮 by 用户对照 Apifox 校准**列为验收环节（刷新触发器）。
- 真实后端 mode B 调试联调留待用户运行环境验证。