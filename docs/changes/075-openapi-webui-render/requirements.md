# 075 需求：Apifox 复刻 —— API 管理可视化平台

## 产品目标

把 `openapi` 模块打造为**与 Apifox 骨架、交互、设计完全一致**（非最小可用）的 API 管理可视化平台，作为商业级 SaaS 前端的模块化形态接入 Admin WebUI：左侧资源管理树、顶部全局搜索与工具栏、中间多标签页工作台（项目/文档/调试）、右侧响应结果面板；对接后端 OpenAPI 数据实现接口目录自动生成与动态渲染、参数表单自动构建（JSON 输入框、文件上传、Query 参数）、JSON 响应高亮；还原加载动画、交互高亮、面包屑、状态码/响应时间可视化与深链路由（R075-005）。

## 范围（复刻层）

1. **骨架（Apifox 视觉语言还原，控件基座为 HeroUI 组件库）**：UI 组件统一使用 `@heroui/react`（用户要求；与平台 068 全量采用一致，含 `@webui/sdk/ui` 透传的 HeroUI 底座组件），模块 css 承载 Apifox 设计 token（灰阶/主色蓝/间距刻度/字号/圆角/边框/方法色/状态色/选中 hover/阴影/加载骨架）与五区布局：
   - 左侧资源树：tag 分组接口目录（可展开折叠、选中高亮、搜索过滤）、模型分组、环境入口（树形控件 HeroUI 无内置，用 HeroUI Button/Unstyled 底座自绘轻量树，纯模块内结构组件）；
   - 顶部工具栏：全局搜索（Cmd/Ctrl+K 弹层跳转）、环境下拉（HeroUI Select）、新建/导入入口（呈现态）、面包屑（项目→分组→接口）、账号区（宿主透传）；
   - 中间多标签页工作台：接口文档/调试标签、模型标签，可打开/关闭/切换（HeroUI Tabs 底座 or 自绘轻量标签，激活高亮、多开）；
   - 右侧响应面板（调试模式）：状态码彩色徽标（HeroUI Chip/Badge 底座）、响应时间 ms、响应大小、响应体多视图（JSON 高亮/原始）、响应头列表；
   - 主区接口详情：URL 输入栏（方法下拉 Select + BaseURL + 路径 + 发送 Button（loading））+「文档/调试」双模式切换（HeroUI Tabs）。
2. **参数表单自动构建**：由 OpenAPI schema 自动生成——Query/Path 参数动态表格（HeroUI Input 行内编辑值、增删行、启用/停用 Switch、必填标记）；Body 面板（HeroUI Textarea JSON 编辑器带样例预填与校验、form-data 文件上传（原生 file input + HeroUI Button 底座，HeroUI 无内置上传件）、x-www-form-urlencoded）；Headers/Cookie/Auth 分组（bearerAuth token 输入、webuiSession 说明）。
3. **在线调试（Try it out）**：发送 → 请求 loading 动画（HeroUI Spinner）→ 响应面板即时渲染；错误/网络失败如实呈现（Problem JSON 优先）；执行语义复用既有（同源 fetch、credentials include、bearer 内存 token、webuiSession Cookie + CSRF 附加、mock 执行禁用并提示）。
4. **文档查看**：接口说明（schema 摘要、参数/请求体/响应表）、返回示例（响应体高亮）；模型浏览（components.schemas 列表 + 属性表）。
5. **体验细节**：加载骨架动画（HeroUI Skeleton）、交互高亮、快捷键（Cmd+K 搜索、Cmd+Enter 发送）、面包屑、状态码/响应时间/响应大小可视化、深链 `?op=<id>&mode=docs|debug`（刷新恢复 + 可分享）。
6. 契约数据源与生成链不变（`webui generate` → `openapi-spec.ts` + `--check`，R075-002）。

## 复用与保留（不重做）

- `openapi-data.ts` 解析/请求构建纯函数层（扩展文件上传/表单构建）；执行器语义（api.ts 会话 CSRF）；mock 空路由表；模块/路由/菜单声明、`book` 图标、alias；平台 DataTable 修复。

## 非目标（明确不做，候选方向仅记录）

- Apifox 的团队/权限协作、自动化测试编排、Mock 服务、CI/CLI、MCP/AI、多环境变量脚本、导入导出、代码生成——需要对应后端/云端能力，本项目无，列为未来候选；
- 不引入 Monaco 级重型编辑器（JSON 高亮用成熟轻量库，候选 highlight.js，实施期核验）；
- 文件上传控件实现能力，但当前后端契约无 multipart 操作（如实标注不可用场景）；
- 不复制 Apifox 私有实现/组件库（不开源）。

## 验收标准

1. **控件基座**：openapi 页内 UI 组件全部来自 HeroUI 组件库（`@heroui/react` 直接使用或经 `@webui/sdk/ui` 透传；`git grep` 确认无第三方 UI 控件库、无自绘通用控件体系）；模块 css 只承载 Apifox 设计语言与布局；五区骨架 + 左侧树搜索/选中/展开、顶部全局搜索（Cmd+K）、面包屑、多标签开/关/切换全部可交互（截图对照）。
2. 接口详情：URL 栏（方法/BaseURL/路径/发送）、文档/调试双模式切换；参数动态表格（增删/启停/值编辑）、JSON 请求体（样例预填+校验）、form-data 上传控件渲染。
3. 在线调试：dev 环境（路由拦截）执行 GET 会话、POST bearer 头注入断言；响应面板呈现状态徽标/耗时/大小/JSON 高亮/响应头；错误如实呈现；mock 环境执行禁用提示。
4. 深链：`?op=&mode=` 直达对应接口标签与模式；刷新恢复。
5. 视觉/交互细节：加载骨架、交互高亮、快捷键、状态码/时间可视化在 Playwright 桌面/移动截图与 e2e 断言中可见。
6. 页内实现：openapi 模块呈现层为「HeroUI 控件基座 + Apifox 设计语言」复刻（正式取代 R075-004 的平台组件工作台约束；宿主与其它模块不受影响）；`git grep -i swagger` 无残留。
7. 门禁：Go `go test ./...`/`go vet`、WebUI `generate:check/typecheck/lint/lint:modules/test/build`、`pnpm e2e -- --workers=1` 全绿。
8. 文档与 documentation-impact.yaml 覆盖本轮；无新旧双轨残留（e4865ca 的 UI 层单轨替换，复用层保留）。