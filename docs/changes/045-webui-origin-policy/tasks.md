# 045 任务清单

## 状态

- 研究门禁：已通过（`R001`）。
- 计划状态：待确认。
- 当前授权：仅研究、计划文档与导航；不得修改源码、Vite、本地配置或运行进程。
- Git 基线：`HEAD 1cf0595`，工作树干净，`main` 比 `origin/main` 领先 5 个未推送提交。

## 任务

| ID | 依赖 | 任务 | 完成条件 | 状态 |
| --- | --- | --- | --- | --- |
| RES-001 | 无 | 复核 CORS、Auth Origin、Vite 和运行配置 | R001 门禁通过 | 已完成 |
| PLAN-001 | RES-001 | 形成安全单轨修复计划 | 需求、设计、任务可确认 | 已完成 |
| HTTP-001 | 用户确认 | 修正 CORS 同源识别并补测试 | 同源通过、跨域默认拒绝 | 待确认 |
| AUTH-001 | HTTP-001 | 把 HTTP allowlist 注入 WebUI Auth | 两层使用同一候选配置 | 待确认 |
| DEV-001 | AUTH-001 | 固定 Vite 端口并更新样例、指南、本地配置 | 两个本地 HTTPS Origin 精确允许 | 待确认 |
| UI-001 | 用户确认 | 遮罩 Setup Token 输入 | 页面不再明文显示 Token | 待确认 |
| VER-001 | 全部 | 执行 Go/Node/代理运行态/低敏审计 | 所有验收通过且无凭据进入 Git | 待确认 |
| GIT-001 | VER-001 | 精确审查并提交 | 仅 045 实现进入 Conventional Commit | 待确认 |

## 重新确认触发器

- 需要支持任意 Vite 端口、通配 Origin 或生产域名；
- 需要信任 `Forwarded`/`X-Forwarded-*` 或设计生产反向代理；
- 需要修改 Cookie、CSRF Token 或 Session 语义；
- 需要自动修改数据库或保留截图中已经泄露的 Token。
