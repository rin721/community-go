# 075 openapi 模块：Apifox 复刻 —— 任务清单

> 依赖：研究门禁通过（R075-005 取代 R075-004 的 UI 层结论；复用层结论转移）。状态：**待确认**（用户第四轮要求「与 Apifox 完全一模一样，非最小可用，深度研究学习」后的计划）。

## 里程碑与任务

| ID | 任务 | 完成条件 |
| --- | --- | --- |
| OAP-075-A1 | 设计 token 与五区骨架：HeroUI 控件基座 + 模块 css 承载 Apifox 设计语言（灰阶/主色/间距/字号/方法色/状态色/选中 hover/动效）+ 顶部工具栏/左树/多标签/主区/响应面板布局 | 桌面/窄屏布局就绪，截图可见 Apifox 观感；HeroUI 基座确认（git grep 无第三方 UI 库） |
| OAP-075-A2 | 左侧资源树：tag 分组接口目录（展开/选中/搜索过滤）、数据模型分组、面包屑 | 树交互 e2e 断言 + 截图 |
| OAP-075-A3 | 顶部工具栏：Cmd+K 全局搜索弹层（接口/模型跳转）、环境下拉（BaseURL）、深链/新建呈现入口 | 快捷键与跳转 e2e 断言 |
| OAP-075-A4 | 多标签工作台：接口/模型标签开/关/切换、激活高亮、关闭回退、与深链同步 | 标签行为 vitest/e2e |
| OAP-075-A5 | 接口详情：URL 栏（方法下拉/BaseURL/路径 {param} 高亮/发送 loading）+ 文档/调试双模式 | 模式切换与 URL 栏断言 |
| OAP-075-A6 | 参数表单自动构建：Query/Path 动态表格（增删/启停/值）；Body（JSON 编辑器高亮+样例+校验、form-data 文件上传、urlencoded）；Headers/Auth 分组 | 表单自动构建单测 + e2e |
| OAP-075-A7 | 在线调试与响应面板：run-store 状态机（size/类型组装）、状态码徽标/耗时/大小、JSON 高亮/原始视图、响应头、错误如实呈现；mock 禁用 | 执行链路单测 + e2e（拦截 GET/POST/bearer 头）+ mock 断言 |
| OAP-075-A8 | 模型视图与深链：`?op=&mode=docs\|debug`、`?model=`、popstate 恢复 | 深链 e2e |
| OAP-075-A9 | 细节与动效：加载骨架、交互高亮、Cmd+Enter 发送、空态、reduced-motion 降级 | 视觉清单 e2e/截图 |
| OAP-075-A10 | 依赖：highlight.js 固定版本（实施期 `pnpm view` 核验并回填记录）+ lock | 安装/构建无回归 |
| OAP-075-A11 | 测试与文档：vitest 全绿、Playwright 双 project（076：桌面/移动/亮暗截图 075-apifox-*）、权威文档与 impact 更新 | 门禁全绿 + 文档提交 |
| OAP-075-A12 | 全量门禁与提交；残留检查（`rg -i swagger` 无命中；e4865ca UI 层单轨替换完成） | 提交完成 |

## 状态记录

- 2026-08-25：三轮演进已完成（55ee70f swagger 渲染 → 9ea2f13 平台组件参考页 → e4865ca 可测试工作台；Go/WebUI/e2e 全绿）。
- 2026-08-25（当前轮，实施完成待提交）：用户要求「与 Apifox（骨架、交互、设计）完全一模一样，非最小可用，深度研究学习」+"基于当前后端项目（OpenAPI）开发与 Apifox 完全一致的 API 管理可视化平台（文档查看、接口调试等），像素级视觉还原、商业级 SaaS 前端"；**用户补充：UI 组件依旧使用 HeroUI 组件库**。R075-005 深度研究完成（官方物料 + 产品形态/设计/交互拆解；web_search 与体验版可视化对照不可用，已列刷新触发器）。实施完成 A1..A12：HeroUI 控件基座 + Apifox 设计 token/五区骨架（工具栏/资源树/多标签/文档调试双模式/响应面板）；Cmd+K 搜索、面包屑、深链 `?op=&mode=`/`?model=`；参数表单自动构建（Query/Path、JSON、form-data 文件上传、urlencoded、Auth）；在线调试（run-store 状态机 + highlight.js JSON 高亮 + 状态/耗时/大小/响应头）；mock 执行禁用；vitest 141 / e2e 待确认 / 门禁全绿待提交；OpenAPIPage chunk 103.4 kB（gzip 25.8 kB）。
- 范围外既有事实：`internal/module/settings/README.md` 缺失导致 docs-guard 报错（070–074 遗留）。
- 范围外既有事实：`internal/module/settings/README.md` 缺失导致 docs-guard 报错（070–074 遗留）。