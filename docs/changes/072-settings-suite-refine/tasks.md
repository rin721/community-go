# 072 设置套件细化 — 任务清单

> 依赖：研究门禁通过（R072-001/R072-002）；计划按 design.md 第 5 节推荐项执行；非文档实施需用户对计划报告的独立确认。

## 任务总览

| ID | 任务 | 依赖 | 完成条件 |
| --- | --- | --- | --- |
| SET-072-A | IAM：migration 004 资料字段 + UpdateSelfProfile/self-archive 两步端点 + 测试 | 计划确认 | REQ-A1..A3 |
| SET-072-B | runtime HostRuntime.navigate + App 注入 + SettingsNavLayout onSelect（SPA 修复） | A | REQ-B1..B2 |
| SET-072-C | settings 8 分区重组（路由/menu/页面/语言/关于/鸣谢/i18n/mock/图标） | B | REQ-C1..C3 |
| SET-072-D | Go/WebUI/e2e 验证与截图（SPA 切换无 reload、资料/注销/语言/关于/鸣谢） | C | REQ-D1..D2 |
| SET-072-E | 文档（IAM 自服务契约、webui 8 分区与 SPA 导航规范、changelog）与提交 | D | REQ-D3 |

## 状态记录

- 2026-08-26：研究门禁通过（R072-001 现状：IAM 无资料字段/无自服务归档端点、archive 即软注销语义、runtime 无 navigate、语言键已有；R072-002 推荐：updateProfile + self/archive 两步、HostRuntime.navigate SPA 修复、8 分区页内全列/菜单五项）；用户确认全量实施（决策 1–5）。
- SET-072-A（完成）：IAM 后端——migration 004 三方言（nickname/bio/birth_date + checksum 清单 version 4）；model/repo/service（UpdateSelfProfile 乐观锁 + Begin/ConfirmSelfArchive 两步确认进程内存储 TTL）；自服务端点 PATCH /api/v1/iam/self/profile 与 POST /api/v1/iam/self/archive{,/confirm}（permission keys self-profile.write/self-archive、serviceError 映射、huma 唯一 operation ID）；contract-openapi/operation-inventory 生成物同步；新增 Go 测试：资料乐观锁/非法日期、两步软注销（错误确认拒绝、确认后登录拒绝与会话吊销、owner 保护）；`go test ./...` 全绿。
- 待推进：SET-072-B（HostRuntime.navigate + SettingsNavLayout SPA）、SET-072-C（8 分区重组）、SET-072-D/E（验证与文档/提交）。