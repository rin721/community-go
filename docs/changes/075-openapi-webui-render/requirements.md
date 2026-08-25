# 075 需求：API 文档与在线调试（层级分类 + 多页面）

> 第六轮（R075-007）：把单页堆叠改为「层级分类、多页面」结构。前五轮需求（平台语言、业务能力、执行语义、清理、复用）继续有效，本文件按第六轮重写页面形态。

## 产品目标

`openapi` 模块呈现为**按分类组织的多页面 API 文档 + 在线调试（Try it out）**，完全融入 Community Go 后台设计语言（R075-006）：深色左侧导航（宿主既有）、蓝色主调、圆角卡片、标准中后台表单/表格/弹窗控件（`@webui/sdk/ui` 平台组件，HeroUI 底座）。**层级分类、不把全部内容堆在一个页面**：总览（分类卡片）→ 分类接口列表 → 接口文档/调试页，数据模型独立成页；共享页内导航（SectionNav）。

## 范围（重组层）

1. **页面形态（平台语言 + GroupLayout 073 多路由）**：
   - 模块声明 4 个静态路由，共享 `GroupLayoutID: openapi.layout`（沿用 settings 8 分区范式）：
     - `/openapi` 总览页：PageHeader + 契约信息 + **分类卡片区**（每个 tag：名称 + 操作数 + 方法徽标）+ 模型入口卡片；
     - `/openapi/tags` 分类接口列表页：`?tag=` 定位分类；该分类下接口 DataTable（方法/路径/操作 ID/操作），行操作「文档 / 调试」；
     - `/openapi/operation` 接口文档/调试页：`?op=<id>&mode=docs|debug` 定位；页内分段（文档 | 调试）：文档分区（说明/参数表/请求体+返回示例高亮/响应表）、调试分区（参数 Field 行、Body JSON/form/urlencoded、Headers、Auth、发送、响应卡片）；
     - `/openapi/models` 数据模型页：`?model=` 定位；模型列表 + 属性表。
   - 共享布局 `OpenAPILayout.tsx`：SectionNav（总览 / 各 tag / 数据模型，动态计算）+ 宿主注入内容区（children）；路由切换布局不卸载。
   - 深链从「同页 Drawer 内 replaceState」升级为「跨页 navigate」：`?tag=`、`?op=&mode=`、`?model=`。
2. **业务能力（全部保留）**：
   - 文档查看：接口说明、参数/请求体/响应 schema 表（DataTable）、返回示例（highlight.js 高亮）；
   - 在线调试（Try it out）：Query/Path 参数编辑、Body（JSON Textarea 样例 + 校验 / form-data 含文件上传 / urlencoded）、Headers 行、Auth（bearer 内存 token / session 说明）、发送（Button + pending）；
   - 执行语义不变：同源 fetch、credentials include、webuiSession Cookie + CSRF 附加、20s 超时、错误如实呈现（Problem JSON 优先）、mock 演示构建执行禁用并提示；
   - Cmd+K 全局搜索保留（平台 Modal 列表选择 → 跳转到对应页面）。
3. **清理与复用**：
   - `OperationDrawer`/`ModelDrawer` 外壳移除，内容区改造为页面分区（文档/调试分区、模型属性表）；
   - `OpenAPIPage.tsx`（单页堆叠）拆分：总览页 + 分类页 + 接口页 + 模型页；
   - 复用不重做：`openapi-data`/`run-store`/`highlight`/`api.ts`/快照链/mock 空表/图标 `book`/`@webui/generated` alias/DataTable 修复；模块 css 仅业务 selector。

## 非目标（明确不做）

- 路径参数路由（`validPath` 拒绝 query/fragment/参数，路由集合编译期冻结）；
- 为每个动态 tag 生成独立路由；自定义树形导航壳（R075-006 已否决）；
- Apifox 工具类布局/自定义主题/第三方组件观感；团队协作/Mock 服务/导入导出/代码生成；
- 不引入新依赖（highlight.js 已装并复用；不引入 Monaco）。

## 验收标准

1. 层级结构：总览 → 分类接口列表 → 接口文档/调试页可逐级进入与返回；SectionNav 在 4 个页面间保持固定并正确高亮当前分类；模型页独立可浏览。
2. 页面风格与现有模块一致：PageHeader/PageSection/Surface/DataTable/Field/SectionNav/Drawer（不再用于详情）/InlineAlert/EmptyState；无 afx token、无 `.afx-*` 样式残留（`git grep -E "afx-|apifox"` 仅文档/记录命中）。
3. 分类页按 `?tag=` 过滤正确；接口页按 `?op=&mode=` 直达对应接口与模式；`?model=` 直达模型；刷新/回退恢复。
4. 文档查看：说明/参数表/请求体与返回示例（高亮）渲染正确。
5. 在线调试：参数编辑、Body（JSON 校验；form-data 文件控件；urlencoded）、Auth；dev 环境（路由拦截）发送 GET 会话与 POST bearer 头注入断言；响应卡片呈现状态/耗时/大小/高亮 body/响应头；错误如实呈现；mock 环境发送禁用并提示。
6. 门禁：Go `go test ./...`/`go vet`、`webui generate --check`、WebUI `generate:check/typecheck/lint/lint:modules/test/build`、`pnpm e2e -- --workers=1` 全绿；`git grep -i swagger` 无残留。
7. 文档与 documentation-impact.yaml 覆盖本轮；单页堆叠实现单轨替换（业务层与能力保留）。
