# 075 openapi 模块：API 文档与在线调试（层级分类 + 多页面）— 任务清单

> 依赖：研究门禁通过（R075-007 新增，取代单页堆叠结论；R075-006 设计语言结论不变）。状态：**已确认，第六轮实施完成待提交**（用户确认「确认，实施」）。

## 任务

| ID | 任务 | 完成条件 |
| --- | --- | --- |
| OAP-075-J1 | binding.go 改为 GroupLayout 多路由：4 个静态路由（overview/tags/operation/models）+ `openapi.layout` entry；菜单不变（book /openapi） | `go vet`/`webui generate --check` 通过；registry 含 4 路由 + 布局 entry |
| OAP-075-J2 | `OpenAPILayout.tsx`（布局 entry）：SectionNav 动态条目（总览/各 tag/模型）+ 内容区 children；active 由 pathname+query 推断 | 4 个路由共享布局，切换路由布局不卸载（vitest/Playwright） |
| OAP-075-J3 | `OpenAPIOverviewPage.tsx` 总览页：PageHeader + 契约信息 + 分类卡片（tag：名称/操作数/方法徽标）+ 模型入口卡片 + 空态 | 渲染/跳转断言；快照不可用兜底 |
| OAP-075-J4 | `OpenAPITagPage.tsx` 分类接口列表页：`?tag=` 定位；DataTable（方法/路径/操作 ID/操作 文档·调试）+ 页内搜索 + 空态/非法 tag | 过滤/跳转/空态断言 |
| OAP-075-J5 | `OpenAPIOperationPage.tsx` 接口文档/调试页：`?op=&mode=` 定位；文档分区（参数/身体示例/响应）+ 调试分区（参数行/Body JSON·form·urlencoded/Headers/Auth/发送/响应卡片），复用 OperationDrawer 内容区 | 文档渲染、参数编辑、JSON 校验、form 控件、发送（GET 会话 / POST bearer）断言 |
| OAP-075-J6 | `OpenAPIModelsPage.tsx` 模型页：`?model=` 定位；模型列表 + 选中模型属性表（复用 ModelPane） | 列表/定位/属性表断言 |
| OAP-075-J7 | 清理与收敛：删除 `OpenAPIPage.tsx` 单页壳；`OperationDrawer`/`ModelDrawer` 撤壳、内容并入页面；`CommandPalette` 选择后 navigate 到页面；css 仅业务 selector；locales 增补 | `git grep -E "afx-|apifox"` 仅文档/记录命中；`rg -i swagger` 无残留 |
| OAP-075-J8 | 测试与文档：vitest 按新页面重写（总览/分类/接口/模型/导航/深链/发送/mock）、Playwright dev/mock 层级流转 + 截图（075-hierarchy-*）、权威文档与 impact 更新 | 门禁全绿 + 文档提交 |
| OAP-075-J9 | 全量门禁与提交（单轨替换 72ba96f 单页堆叠结构，业务层保留） | 提交完成 |

## 状态记录

- 2026-08-25（第六轮）：用户要求「请做层级分类，不要放到一个页面上」。研究 R075-007 完成（GroupLayout 073 多静态路由 + SectionNav 动态条目 + query 深链；路径参数不可用，动态选择走 query）。requirements/design/tasks 已按多页面层级结构重写。**已实施完成待提交**：J1 binding 4 路由 + openapi.layout（GroupLayout 073）；J2 OpenAPILayout（SectionNav 总览/各 tag/模型动态条目 + Cmd+K 统一持有）；J3 总览页（契约信息 + 分类卡片 + 模型入口）；J4 分类接口列表页（?tag= + 行操作 + 页内搜索 + 空态）；J5 接口文档/调试页（?op=&mode=，撒 Drawer 壳复用 OperationDrawer 内容 + 执行 + 响应卡片）；J6 模型页（?model= + ModelPane）；J7 清理（删 OpenAPIPage/OperationDrawer/ModelDrawer 外壳，CommandPalette navigate 到页面，css 收敛，locales 增补 20 keys en/zh 对等）；J8 测试与文档（vitest 149/149 含新 14 用例、Playwright dev/mock 22/22 含 075-hierarchy-* 截图、权威文档与 impact 更新）；J9 门禁：go test/vet、webui generate --check、typecheck/eslint/i18n/architecture/modules/build 全绿。
- 前五轮已提交：55ee70f（Swagger UI）→ 9ea2f13（平台组件）→ e4865ca（可测试工作台）→ 9536334（Apifox 外壳）→ 72ba96f（设计语言回归）；vitest 141 / e2e 22 全绿（72ba96f 基线）。
- 范围外既有事实：`internal/module/settings/README.md` 缺失导致 docs-guard 报错（070–074 遗留）。