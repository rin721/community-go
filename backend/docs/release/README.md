# release 目录说明

`release` 存放部署、发布前检查、发布证据模板和目标环境观测记录。这里用于正式发布或类生产验收，不替代 CI 和目标环境日志。

## 当前文档

| 文档 | 职责 |
| --- | --- |
| `deployment.md` | 部署方式、配置、服务启动、健康检查和回滚说明。 |
| `preflight-checklist.md` | 发布前检查清单和证据要求说明。 |
| `release-evidence-template.md` | 可复制的发布证据模板，由 `scripts/check-release-evidence.ps1` 校验。 |
| `operational-observation-template.md` | IAM、System 和探针后台补偿路径的目标环境观测模板。 |
| `preflight-2026-06-23.md` | 当前日期化发布前验收记录。 |

## 维护规则

- 正式发布证据必须从 `release-evidence-template.md` 复制，不从其他文档拼接旧模板。
- 修改发布 gate、Docker、CI、部署脚本或发布包脚本时，同步 `docs/build`、`scripts/README.md` 和本目录。
- 本机缺少 Docker 或目标环境时，不得写成容器 smoke 已通过；必须记录为待补证据。使用 CI artifact 作为 Docker 证据时，运行 `scripts/check-ci-docker-evidence.ps1` 校验 workflow run、提交、artifact 和日志内容。

## 常用验证

```powershell
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -TemplateMode
powershell -ExecutionPolicy Bypass -File scripts/check-operational-observation-template.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-release-evidence.ps1 -SelfTest
powershell -ExecutionPolicy Bypass -File scripts/check-ci-docker-evidence.ps1 -SelfTest
```
