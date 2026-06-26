---
name: aoi-admin-observability-ops
description: "Repository-specific workflow for observability, health/readiness probes, runtime smoke, structured logs, operation audits, server status, release observation evidence, and operational guardrails in this aoi-admin / open console platform repository. Use when changing /health, /ready, probes, logging, trace IDs, audit records, runtime-smoke scripts, operational observation templates, or release evidence."
---

# Aoi Admin Observability Ops

使用本 skill 处理当前仓库的可观测性、运行探针、操作审计、日志、运行烟测和发布后观察证据。它补充 `$aoi-admin-runtime-cli-governance` 与 `$aoi-admin-release-readiness`，不得把未实现的监控系统写成既有能力。

## 开始前

1. 阅读 `AGENTS.md`、`docs/runtime/startup-flow.md`、`docs/testing/test-matrix.md`、`docs/maintenance/testing-deployment-observability-audit-2026-06-23.md`、`docs/release/operational-observation-template.md` 和 `scripts/README.md`。
2. 用 `rg` 查 `/health`、`/ready`、`runtime-smoke`、`operation`、`audit`、`trace`、`logger`、`zap`、`X-Trace`、`server status` 等当前实现。
3. 区分运行时探针、业务审计、错误返回、日志记录、发布证据和目标环境监控；不要把日志当成错误返回，也不要让监控脚本修改默认运行态数据。

## 边界规则

- `/health` 表示进程存活；`/ready` 表示依赖就绪。变更语义时必须同步测试矩阵、发布证据模板和 runtime smoke。
- 探针、运行 smoke 和发布证据必须验证当前协议入口、运行入口和品牌默认值。
- 日志和审计记录不能吞掉错误；业务错误、状态和结果必须继续返回上层处理。
- 审计字段中的产品码、平台、组织、用户、请求 ID 和 trace ID 必须来自配置、route contract、请求上下文或服务层输入，不得写死。
- 本地烟测使用 `tmp/ai/**` 或显式临时目录，不写入默认 `data/`、本地配置或密钥文件。
- Prometheus、OpenTelemetry、外部告警、APM 和生产监控只有在真实代码、配置和部署证据存在时才能写为已支持；否则写入 `docs/backlog/known-gaps.md`。

## 常见任务

### 修改探针或运行烟测

1. 查 HTTP 路由、中间件、运行时装配和 `scripts/runtime-smoke.ps1`。
2. 更新测试矩阵、发布前检查、脚本 README 和相关维护审计。
3. 保持 smoke 可重复执行、自动清理进程，并在失败时输出足够定位的信息。

### 修改日志、trace 或审计

1. 查中间件、handler、service、repository 和 System 操作记录链路。
2. 确认错误仍返回调用方；日志只补充诊断上下文。
3. 检查敏感字段脱敏，避免将 token、密码、密钥、Cookie、CSRF 或个人隐私写入日志、截图、localStorage 或发布证据。

### 补发布观察证据

1. 从 `docs/release/operational-observation-template.md` 或发布证据模板复制结构。
2. 记录真实命令、环境、提交、端点状态、日志摘要、回滚条件和观察窗口。
3. 目标环境未执行的项目写成待补证，不写成通过。

## 验证

按影响范围选择：

```powershell
go test ./internal/transport/http -count=1 -mod=readonly
go test ./internal/modules/system/... -count=1 -mod=readonly
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1 -IncludeRuntimeSmoke
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
git diff --check
```

如果 Docker、端口、浏览器或目标环境不可用，最终说明未验证项、影响范围和补证命令。任务结束且有文件变更时使用 `$git-conventional-commit` 收尾。
