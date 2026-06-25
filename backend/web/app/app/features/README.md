# features 目录说明

`features` 存放跨页面复用的前端业务能力。它介于页面路由和通用组件之间：可以组合 API、store、i18n、权限和 UI 模式，但不应成为新的全局工具库。

## 当前 feature

| 目录 | 职责 |
| --- | --- |
| `admin` | `/admin` 控制台 shell、导航、头部、平台标签、错误状态和后台布局辅助。 |
| `auth` | 认证守卫、登录态校验、认证表单 schema 和会话相关前端能力。 |
| `preferences` | 本地偏好与主题模式辅助，不承载后端系统配置。 |
| `setup` | 首次安装向导 gate、步骤进度和后端 setup schema/status 的 UI 编排。 |
| `theme-settings` | 后台主题设置相关 schema、测试和 UI 辅助。 |

## 放置规则

- 多个路由共享、且带有业务语义的逻辑放在 `features`。
- 单个页面独有的组合逻辑留在对应 `routes/**` 文件中，避免提前抽象。
- 纯展示组件放入 `components/console`；纯请求封装放入 `lib/api`；跨页面本地状态放入 `stores`。
- feature 可以消费 `components/console`、`lib/api`、`stores`、`i18n` 和 `theme`，但不要反向被这些底层目录依赖。

## 扩展规范

新增 feature 时至少说明：

- 归属的业务模块或平台能力；
- 使用的 API endpoint 和 query key；
- 需要的权限、加载态、空态、错误态和禁用态；
- 是否有本地 UI-only 字段，且这些字段不得进入 API payload。

用户可见文案必须进入 `app/i18n/locales/*.json`，不要在 feature、schema、表格列或按钮中硬编码。

## 验证命令

```powershell
pnpm --dir web/app typecheck
pnpm --dir web/app test
pnpm --dir web/app lint:i18n
```
