# 075 openapi 模块：API 文档与在线调试（融入后台设计语言）— 任务清单

> 依赖：研究门禁通过（R075-006 取代 R075-005 的 UI 结论，业务能力清单继续有效）。状态：**待确认**（用户第五轮要求「去 Apifox 外壳、融入后台视觉、微改造」后的计划）。

## 任务

| ID | 任务 | 完成条件 |
| --- | --- | --- |
| OAP-075-I1 | 页面重构为平台语言：接口列表区（搜索 Field + tag SelectField + DataTable：方法 Chip/路径/操作 ID/标签/行操作）+ 说明 PageSection | 列表渲染/搜索/筛选可用，无 afx 样式残留 |
| OAP-075-I2 | 平台 Drawer 详情：文档分区（说明/参数表/请求体+返回示例高亮/响应表）与调试分区（参数 Field 行+Switch、Body JSON/form(urlencoded)/文件、Headers、Auth、发送 Button pending、mock 禁用） | Drawer 打开/切换/关闭；平台组件占满 |
| OAP-075-I3 | 响应卡片（调试分区内）：状态 Chip/耗时/大小、JSON 高亮/原始切换、响应头折叠、错误如实呈现 | 发送→响应断言（拦截 GET/POST） |
| OAP-075-I4 | 深链与全局搜索：`?op=&mode=` 打开 Drawer；Cmd+K 平台 Modal 列表跳转（推荐保留）；popstate 同步 | 深链/搜索 e2e |
| OAP-075-I5 | 模型浏览并入列表页（PageSection 或筛选 + DataTable/详情） | 模型渲染断言 |
| OAP-075-I6 | 清理：删除 ApiTree/WorkspaceTabs/afx token 与右侧响应栏等外观层；模块 css 收敛业务 selector；复用层（openapi-data/run-store/highlight/api）仅小适配 | `git grep -E "afx-|apifox"` 仅文档/记录命中；`rg -i swagger` 无残留 |
| OAP-075-I7 | 测试与文档：vitest（列表/筛选/Drawer/调试/发送/mock 禁用/深链）、Playwright dev/mock 断言 + 截图（075-integrated-*）、权威文档与 impact 更新 | 门禁全绿 + 文档提交 |
| OAP-075-I8 | 全量门禁与提交（单轨替换 9536334 外观层，业务层保留） | 提交完成 |

## 状态记录

- 2026-08-25：四轮演进（55ee70f → 9ea2f13 → e4865ca → 9536334），第五轮用户要求「停止模仿 Apifox 外壳，提取业务能力，严格遵循后台设计语言（深色导航/蓝色主调/圆角卡片/标准表单表格），微改造而非大换血」。研究 R075-006 完成；requirements/design/tasks 已按「平台组件 + 标准后台流程」重写。**已确认，实施完成待提交**：I1 平台组件列表（搜索/tag 筛选/DataTable/行操作）、I2 OperationDrawer（文档/调试双模式 + 参数/Body/Headers/Auth/发送）、I3 调试区响应卡片（状态/耗时/大小/高亮/响应头）、I4 深链与 Cmd+K（平台 Modal）、I5 模型 Drawer、I6 清理（删 ApiTree/WorkspaceTabs/OperationPane/ResponsePanel 与 afx 外观层，css 收敛业务 selector，`git grep -E "afx-|apifox"` 仅文档命中）、I7 测试与文档、I8 门禁提交；vitest 141 / e2e 22 待最终确认；OpenAPIPage chunk 93.9 kB（gzip 23.1 kB）。
- 范围外既有事实：`internal/module/settings/README.md` 缺失导致 docs-guard 报错（070–074 遗留）。