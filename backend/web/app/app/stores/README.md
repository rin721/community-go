# stores 目录说明

`stores` 存放前端 Zustand 本地状态。这里用于保存浏览器侧偏好、认证快照和后台工作区状态，不替代后端持久化、权限判断或系统配置。

## 当前 store

| 文件 | 职责 |
| --- | --- |
| `auth-store.ts` | 认证快照、当前用户、组织上下文和会话状态。真实权限仍以后端返回为准。 |
| `admin-workspace-store.ts` | 后台工作区本地 UI 状态，例如折叠菜单、当前工作区偏好等。 |
| `preferences-store.ts` | 本地偏好状态，例如主题模式或界面偏好。 |

## 使用规则

- 服务端数据优先使用 TanStack Query，不要把 API 列表、详情或分页结果长期塞进 Zustand。
- 权限、角色、菜单和组织上下文以 `/api/v1/me/session`、`/api/v1/me`、后端菜单/API 返回为准，store 只缓存前端快照。
- 不要把密码、Token、Cookie、确认密码、一次性验证码或后端未返回的敏感字段写入 localStorage/sessionStorage。
- store 中的用户可见文案应由页面或 feature 从 i18n 注入，不在 store 内硬编码。
- 新增 store 必须有明确生命周期、持久化策略和清理路径。

## 验证命令

```powershell
pnpm --dir web/app test
pnpm --dir web/app typecheck
```
