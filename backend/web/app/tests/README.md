# web/app/tests 目录说明

`tests` 存放 React 前端端到端测试和测试初始化逻辑，覆盖公开页面、首次安装、登录态、后台控制台和权限驱动界面。

## 职责边界

- `e2e`：Playwright 端到端用例，包含桌面与移动端关键链路。
- `setup.ts`：测试环境初始化与全局准备逻辑。
- 单元测试和组件测试优先与源文件就近放置，端到端流程集中放在本目录。

## 扩展规则

- 新增后台页面或关键交互时，应补充对应 Playwright smoke 或聚焦用例。
- 可见 UI 变更需要覆盖桌面和移动端视口，必要时通过 `scripts/visual-qa.ps1` 留存截图。
- 测试 mock 必须对应真实后端 API 契约，不得凭空模拟后端未暴露的生产能力。
- 测试数据不得写入真实配置、运行态数据目录或用户本地环境文件。

## 验证命令

```powershell
pnpm --dir web/app test
pnpm --dir web/app test:e2e
powershell -ExecutionPolicy Bypass -File scripts/visual-qa.ps1
```
