# testing 目录说明

`testing` 存放测试矩阵、QA 证据模板、本地 smoke 和视觉 QA 记录。它是验证项目可运行、可用、可审查的主要入口。

## 当前文档类型

| 类型 | 示例 |
| --- | --- |
| 测试矩阵 | `test-matrix.md` |
| 本地 smoke | `runtime-smoke-2026-06-22.md`、`onboarding-smoke-2026-06-23.md` |
| Docker 证据 | `docker-static-proof-2026-06-23.md` |
| 视觉 QA | `visual-qa-2026-06-22.md`、`visual-qa-full-2026-06-23.md`、`visual-qa-page-coverage-2026-06-23.md` |
| QA 模板 | `qa-report-template.md` |

## 维护规则

- 测试记录必须写明命令、环境、范围、结果和残余风险。
- 视觉 QA 必须区分本地 mock、Playwright 截图和真实目标环境截图。
- 新增后台页面、认证流程、初始化流程或可见 UI 时，同步测试矩阵和必要的视觉证据。

## 常用验证

```powershell
pnpm --dir web/app test
pnpm --dir web/app test:e2e
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
git diff --check
```
