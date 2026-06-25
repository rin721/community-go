# overview 目录说明

`overview` 存放项目定位和整体能力概览。它解释“这个项目是什么”，不承担详细开发教程。

## 当前文档

| 文档 | 职责 |
| --- | --- |
| `project.md` | 说明平台定位、当前能力、扩展方式、运行入口和开源可复用边界。 |

## 维护规则

- 概览文档必须以当前代码能力为边界，不能把未暴露的后端能力写成生产事实。
- 根 README 中受控的项目代号语境可以保留；运行时配置、错误、日志、API 和前端生产文案仍应保持可替换。
- 产品定位变化时，同步根 README、`docs/README.md` 和相关维护审计。

## 常用验证

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-entry-brand-convergence.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-open-source-readiness.ps1
```
