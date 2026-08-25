# 081 运维监控可视化（运行状态报表 + 服务器/进程监控）

## 状态

**已确认，实施完成**（用户确认实施，认可自研 SVG 图表与 node-exporter 指引取向）。验证：`go test ./...`、`go vet ./...`、WebUI typecheck/lint 三门禁/generate:check/**Vitest 151**/**Playwright 22（dev 20 + mock 2）**、docs-guard 全部通过；受限项见 [tasks.md](tasks.md)。

## 目标

1. **运行中持久服务状态可视化报表图**：supervisor units（HTTP/management/scheduler/messaging/execution）编入 `/diagnostics.process/units`；Ops Dashboard「监控」分区呈现组件状态卡 + 时序报表图（请求速率/在途/内存/goroutine，前端滚动窗口轮询）。
2. **服务器（进程级）状态监控**：标准库 runtime 进程指标（内存/goroutine/GC/uptime）进 Diagnostics 与 `/metrics`（prometheus Go/Process collector）；OS 级（CPU/磁盘/网络）由宿主机 Prometheus node-exporter 补齐（文档指引，进程内不做跨平台采集）。
3. **自研 SVG 图表原语**：`webui/src/ui` 的 `Sparkline`/`LineChart`（零第三方、可复用、Vitest 覆盖），不引入 echarts/recharts。

## 阅读顺序

1. [研究档案](research/README.md)：R081-001（能力盘点）、R081-002（图表与宿主指标取向）
2. [需求](requirements.md)：REQ-081-001..007
3. [设计](design.md)：方案对比、数据流、待确认决策
4. [任务清单](tasks.md)：任务与验证矩阵（待确认/执行）