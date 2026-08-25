# 075 需求：API 文档与在线调试（融入后台设计语言）

## 产品目标

把 `openapi` 模块重构为完全融入 Community Go 后台设计语言的标准模块（R075-006）：深色左侧导航（宿主既有）、蓝色主调、圆角卡片、标准中后台表单/表格/弹窗/折叠面板控件（`@webui/sdk/ui` 平台组件，HeroUI 底座）。**停止模仿 Apifox 的外壳，提取其业务能力**：API 文档查看与在线调试（Try it out），以贴合后台操作习惯的流程呈现（列表 → 详情/弹层 → 表单 → 发送 → 响应）。

## 范围（重构层）

1. **页面形态（平台语言）**：
   - 单路由 `/openapi`（静态路由契约不变），页面遵循现有模块模板：PageHeader + 说明 PageSection；
   - **接口列表区**：搜索（Field）+ 标签筛选（SelectField）+ DataTable 列出全部操作（方法 Chip、路径、操作 ID、标签、行操作「文档 / 调试」），点击行/操作打开详情；
   - **详情与调试**：平台 Drawer 弹层承载单个接口（文档分区 / 调试分区），或页内展开（标准折叠卡片）；不引入右侧响应栏/自定义树/自定义标签条；
   - **响应展示**：调试分区内的标准响应卡片（状态 Chip、耗时、大小、JSON 高亮/原始正文、响应头折叠）；空态/加载/错误用平台 EmptyState/InlineAlert/Skeleton。
2. **业务能力（全部保留）**：
   - 文档查看：接口说明、参数/请求体/响应 schema 表（DataTable）、返回示例（highlight.js 高亮）；
   - 在线调试（Try it out）：Query/Path 参数编辑（Field 行 + Switch 启停）、Body（JSON Textarea 样例 + 校验 / form-data 含文件上传 / urlencoded）、Headers 行、Auth（bearer 内存 token / session 说明）、发送（Button + pending）；
   - 执行语义不变：同源 fetch、credentials include、webuiSession Cookie + CSRF 附加、20s 超时、错误如实呈现（Problem JSON 优先）、mock 演示构建执行禁用并提示；
   - 深链 `?op=<id>&mode=docs|debug` 保留（弹层/展开定位）；Cmd+K 全局搜索保留为平台 Modal 内列表选择（推荐）。
3. **清理（去 Apifox 外壳）**：删除 afx 自定义 token/灰阶/主色体系、自定义资源树/标签条/命令面板外观、右侧响应栏布局；模块 css 收敛为与 iam/organization 同类的业务 selector；控件全部来自平台（HeroUI 底座经 SDK 透传，符合 068 基座约定）。
4. **复用不重做**：`openapi-data`（解析/请求构建/form/bodyType）、`run-store`、`highlight`、`api.ts`、快照生成链、mock 空表、模块/菜单/图标 `book`、`@webui/generated` alias；平台 DataTable 修复延续。

## 非目标（明确不做）

- Apifox 工具类布局与自定义主题；第三方组件观感；
- 团队协作/自动化测试/Mock 服务/导入导出/代码生成（无对应后端能力，候选方向仅记录）；
- 不引入新依赖（highlight.js 已装并复用；不引入 Monaco）。

## 验收标准

1. 页面对话风格与现有模块一致：PageHeader/PageSection/Surface/DataTable/Field/Drawer/ConfirmDialog（如用）/InlineAlert/EmptyState；无 afx token、无 `.afx-*` 样式残留（`git grep -E "afx-|apifox"` 仅文档/记录命中）。
2. 接口列表：搜索/标签筛选、表格列、行操作可用；点击打开详情。
3. 文档查看：说明/参数表/请求体与返回示例（高亮）渲染正确。
4. 在线调试：参数编辑、Body（JSON 校验；form-data 文件控件；urlencoded）、Auth；dev 环境（路由拦截）发送 GET 会话与 POST bearer 头注入断言；响应卡片呈现状态/耗时/大小/高亮 body/响应头；错误如实呈现；mock 环境发送禁用并提示。
5. 深链：`?op=&mode=` 直达对应接口与模式；刷新/弹层恢复。
6. 门禁：Go `go test ./...`/`go vet`、`webui generate --check`、WebUI `generate:check/typecheck/lint/lint:modules/test/build`、`pnpm e2e -- --workers=1` 全绿；`git grep -i swagger` 无残留。
7. 文档与 documentation-impact.yaml 覆盖本轮；9536334 外观层单轨替换（业务层与能力保留）。