# onboarding 目录说明

`onboarding` 面向新开发者和本地演示，说明如何理解、启动和验证当前项目。

## 当前文档

| 文档 | 职责 |
| --- | --- |
| `getting-started.md` | 新开发者从环境准备到运行检查的入口。 |
| `demo-environment.md` | 本地演示环境、示例数据和 smoke 验证说明。 |
| `server-status-dashboard.md` | 服务器状态面板的开发和验证说明。 |

## 维护规则

- 入门文档必须使用当前命令、当前端口和当前 React 前端入口。
- 不把 Docker 缺失、目标环境缺失或未实现能力写成已完成。
- 本地示例数据和运行态文件不得提交到仓库。

## 常用验证

```powershell
go run ./cmd/console server
pnpm --dir web/app dev --host 127.0.0.1 --port 3002
powershell -ExecutionPolicy Bypass -File scripts/runtime-smoke.ps1
```
