# backlog 目录说明

`backlog` 记录当前不能在本地或本阶段完全闭环的已知缺口。这里的内容必须是明确的剩余风险，不得把未来计划写成已经完成。

## 当前文档

| 文档 | 职责 |
| --- | --- |
| `known-gaps.md` | 汇总 IAM 外部副作用、System 后台维护、目标环境视觉 QA、目标环境 Docker 发布证据、包体观察等剩余缺口。 |

## 维护规则

- 只有当前代码、测试或目标环境证据不能证明完成时，才把事项写入这里。
- 一旦缺口被代码、文档和验证证据闭环，应删除或改写对应条目，不保留过期风险。
- 目标环境才能验证的事项必须明确写出需要的证据，例如 Docker smoke、备份恢复、日志窗口或真实账号视觉 QA。

## 常用验证

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/release-preflight.ps1
```
