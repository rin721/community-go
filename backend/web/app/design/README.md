# web/app/design 目录说明

`design` 存放 React 前端设计约束、组件体系规则和视觉治理说明。它是设计实现的长期规则入口，不是页面原型或临时截图存放区。

## 当前内容

- `rules.md`：前端设计系统、布局、组件、响应式、可访问性和视觉 QA 规则。

## 扩展规则

- 新增设计规则必须描述当前可执行约束，不写一次性任务提示词。
- 规则变更应同步影响到 `web/app/app/components`、`web/app/app/theme`、视觉 QA 文档或测试。
- 不要把品牌宣传文案、产品路线图或未实现功能写成设计事实。
- 可见 UI 变更应结合桌面与移动端截图验证，避免只凭静态代码判断可用性。

## 验证命令

```powershell
pnpm --dir web/app theme:check
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
```
