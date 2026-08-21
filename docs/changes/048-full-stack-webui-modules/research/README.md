# 048 研究索引

本目录回答三个问题：当前业务模块持有 WebUI 的哪些边界是正确的，为什么页面演进仍会反向修改宿主核心，以及怎样用通用 SDK contract/adapter 让普通新模块在 core 零修改前提下接入。

## 记录

- [R001 当前 WebUI 全栈耦合审计](R001-current-webui-coupling/report.md)：沿 Binding、Composition、codegen、Router、宿主契约、业务页面和 CSS 核对当前依赖方向。
- [R002 静态全栈模块方案比较](R002-static-full-stack-module-model/report.md)：保存“把 web facet 迁入独立前端目录”的历史比较；其页面 owner 结论已由 R003 取代。
- [R003 模块自有 WebUI 与 SDK 适配边界](R003-module-owned-webui-sdk-boundary/report.md)：落实用户修订决策，区分 module-local adapter、host-level SDK capability 和普通模块接入。

## 门禁结论

关键问题已经有可复核证据，R003 已把“模块目录继续持有 WebUI”与“宿主 SDK 通用化”明确分开。剩余未知主要是首批 SDK public surface 的逐符号清单，不妨碍形成计划；该清单必须在实施 Checkpoint A 冻结，因此研究门禁通过。
